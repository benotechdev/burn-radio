import { Track, MusicCategory, CuePoints } from '../types/radio';
import { generateWaveform } from '../data/sampleTracks';

// IndexedDB configuration for storing local music library metadata & folder handles
const DB_NAME = 'radioflow_library_db';
const DB_VERSION = 2;
const STORE_NAME = 'tracks_metadata';
const STORE_HANDLES = 'directory_handles';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_HANDLES)) {
        db.createObjectStore(STORE_HANDLES, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// In-memory audio file & handle caches for instant real playout without re-reading disk
export const localAudioFileCache = new Map<string, File>();
export const localFileHandles = new Map<string, any>();
let activeDirectoryHandle: any = null;

// Save / Load Directory Handle in IndexedDB (Chrome / Edge on Windows)
export async function saveDirectoryHandle(handle: any): Promise<void> {
  activeDirectoryHandle = handle;
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_HANDLES, 'readwrite');
    tx.objectStore(STORE_HANDLES).put({ key: 'monitored_music_folder', handle, savedAt: Date.now() });
  } catch (err) {
    console.warn('Could not store directory handle in IndexedDB:', err);
  }
}

export async function getStoredDirectoryHandle(): Promise<any | null> {
  if (activeDirectoryHandle) return activeDirectoryHandle;
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_HANDLES, 'readonly');
      const req = tx.objectStore(STORE_HANDLES).get('monitored_music_folder');
      req.onsuccess = () => {
        if (req.result && req.result.handle) {
          activeDirectoryHandle = req.result.handle;
          resolve(req.result.handle);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function saveTrackMetadataToDB(track: Track): Promise<void> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Strip volatile File and blob URLs before storing metadata
    const record = {
      ...track,
      audioFile: undefined,
      audioBlobUrl: undefined,
    };
    store.put(record);
  } catch (err) {
    console.warn('Could not save track to IndexedDB:', err);
  }
}

export async function removeTrackFromDB(trackId: string): Promise<void> {
  localAudioFileCache.delete(trackId);
  localFileHandles.delete(trackId);
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(trackId);
  } catch (err) {
    console.warn('Could not delete track from IndexedDB:', err);
  }
}

export async function loadTracksFromDB(): Promise<Track[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        resolve(request.result || []);
      };
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ID3 Parser for fast in-browser metadata extraction from local audio files
async function parseId3Header(file: File): Promise<{
  title: string;
  artist: string;
  album: string;
  year?: number;
}> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    // Read first 64KB for ID3v2 header
    const slice = file.slice(0, 65536);

    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      const bytes = new Uint8Array(buffer);

      let title = '';
      let artist = '';
      let album = '';
      let year: number | undefined;

      // Check for 'ID3' magic bytes
      if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
        let i = 10;
        const decoder = new TextDecoder('utf-8');

        while (i < bytes.length - 10) {
          const frameId = String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]);
          const frameSize =
            (bytes[i + 4] << 21) |
            (bytes[i + 5] << 14) |
            (bytes[i + 6] << 7) |
            bytes[i + 7];

          if (frameSize <= 0 || i + 10 + frameSize > bytes.length) break;

          // TIT2 = Title, TPE1 = Artist, TALB = Album, TYER = Year
          if (frameId === 'TIT2' || frameId === 'TT2') {
            title = decoder.decode(bytes.slice(i + 11, i + 10 + frameSize)).replace(/\0/g, '').trim();
          } else if (frameId === 'TPE1' || frameId === 'TP1') {
            artist = decoder.decode(bytes.slice(i + 11, i + 10 + frameSize)).replace(/\0/g, '').trim();
          } else if (frameId === 'TALB' || frameId === 'TAL') {
            album = decoder.decode(bytes.slice(i + 11, i + 10 + frameSize)).replace(/\0/g, '').trim();
          } else if (frameId === 'TYER') {
            const yrStr = decoder.decode(bytes.slice(i + 11, i + 10 + frameSize)).replace(/\0/g, '').trim();
            year = parseInt(yrStr, 10) || undefined;
          }

          i += 10 + frameSize;
        }
      }

      // Fallback: parse filename e.g. "Artist - Title.mp3"
      if (!title || !artist) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        if (cleanName.includes(' - ')) {
          const parts = cleanName.split(' - ');
          if (!artist) artist = parts[0].trim();
          if (!title) title = parts.slice(1).join(' - ').trim();
        } else {
          if (!title) title = cleanName;
          if (!artist) artist = 'Local Artist';
        }
      }

      resolve({
        title: title || file.name,
        artist: artist || 'Local Artist',
        album: album || 'Local Audio Library',
        year,
      });
    };

    reader.onerror = () => {
      resolve({
        title: file.name,
        artist: 'Local Artist',
        album: 'Local Audio Library',
      });
    };

    reader.readAsArrayBuffer(slice);
  });
}

// Estimate audio duration and generate cue points from Audio / Video element
function getAudioMetadataFromBlob(file: File, isMp4 = false): Promise<{ duration: number }> {
  return new Promise((resolve) => {
    const elem = isMp4 ? document.createElement('video') : new Audio();
    const url = URL.createObjectURL(file);
    elem.src = url;

    elem.onloadedmetadata = () => {
      const dur = elem.duration && isFinite(elem.duration) ? elem.duration : 180;
      URL.revokeObjectURL(url);
      resolve({ duration: Math.round(dur) });
    };

    elem.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ duration: 180 });
    };

    setTimeout(() => {
      URL.revokeObjectURL(url);
      resolve({ duration: 180 });
    }, 2500);
  });
}

// Convert a File into a verified RadioFlow Track
export async function processLocalFile(file: File, relativePath?: string, handle?: any): Promise<Track> {
  const isMp4 = file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.m4v');
  const meta = await parseId3Header(file);
  const audioInfo = await getAudioMetadataFromBlob(file, isMp4);

  const duration = audioInfo.duration || 180;
  // Deterministic stable ID based on relative path or file name + size
  const rawId = `${relativePath || file.name}-${file.size}-${file.lastModified}`;
  const id = `local-${btoa(encodeURIComponent(rawId)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 24)}`;

  const cuePoints: CuePoints = {
    cueIn: 0.4,
    rampIntro: 12.0,
    outroFade: Math.max(duration - 6, 1),
    nextTrigger: Math.max(duration - 3.5, 1),
  };

  let category: MusicCategory = 'Power Current';
  const lowerPath = (relativePath || file.name).toLowerCase();
  if (lowerPath.includes('jingle') || lowerPath.includes('sweeper')) {
    category = 'Jingle / Sweeper';
  } else if (lowerPath.includes('id') || lowerPath.includes('station')) {
    category = 'Station ID';
  } else if (lowerPath.includes('promo')) {
    category = 'Promo';
  } else if (lowerPath.includes('gold') || lowerPath.includes('classic') || lowerPath.includes('retro')) {
    category = 'Classic Gold';
  } else if (lowerPath.includes('recurrent')) {
    category = 'Recurrent';
  }

  // Cache File and Handle in memory
  localAudioFileCache.set(id, file);
  if (handle) {
    localFileHandles.set(id, handle);
  }

  const blobUrl = URL.createObjectURL(file);

  const track: Track = {
    id,
    title: meta.title,
    artist: meta.artist,
    album: meta.album,
    duration,
    bpm: Math.floor(115 + (file.size % 25)),
    musicalKey: ['Am', 'Dm', 'Cmaj', 'Gmaj', 'Em', 'F#m'][file.size % 6],
    category,
    filePath: relativePath ? `C:\\RadioMusic\\${relativePath.replace(/\//g, '\\')}` : `C:\\RadioMusic\\${file.name}`,
    fileSize: file.size,
    year: meta.year || 2026,
    energy: 4,
    rating: 5,
    cuePoints,
    waveformPeaks: generateWaveform(file.size % 100),
    audioFile: file,
    mediaType: isMp4 ? 'mp4' : 'mp3',
    audioBlobUrl: blobUrl,
    sourceType: 'local-file',
  };

  saveTrackMetadataToDB(track);
  return track;
}

// Fetch tracks from local companion agent on http://localhost:8901
export async function loadCompanionTracks(): Promise<Track[]> {
  try {
    const res = await fetch('http://localhost:8901/api/tracks');
    if (res.ok) {
      const data = await res.json();
      return data.map((item: any) => ({
        ...item,
        mediaType: item.filePath?.toLowerCase().endsWith('.mp4') ? 'mp4' : 'mp3',
        sourceType: 'companion-agent',
      }));
    }
  } catch {}
  return [];
}

// Check if a track is physically available and can be played right now
export async function verifyTrackAvailability(track: Track): Promise<boolean> {
  if (!track) return false;

  // 1. Companion Agent Track
  if (track.sourceType === 'companion-agent') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(
        `http://localhost:8901/api/stream?path=${encodeURIComponent(track.filePath)}`,
        { method: 'HEAD', signal: controller.signal }
      );
      clearTimeout(timeout);
      return res.status === 200 || res.status === 206;
    } catch {
      return false;
    }
  }

  // 2. In-memory File object
  if (localAudioFileCache.has(track.id)) {
    const file = localAudioFileCache.get(track.id);
    if (file && file.size > 0) return true;
  }

  // 3. File System Handle (can we re-read the file directly from Windows disk?)
  if (localFileHandles.has(track.id)) {
    try {
      const handle = localFileHandles.get(track.id);
      const file = await handle.getFile();
      if (file && file.size > 0) {
        localAudioFileCache.set(track.id, file);
        return true;
      }
    } catch {
      // File removed or renamed on disk
      return false;
    }
  }

  // 4. Stored directory handle lookup
  if (activeDirectoryHandle && track.filePath) {
    try {
      const fileName = track.filePath.split('\\').pop() || track.filePath.split('/').pop() || '';
      if (fileName) {
        const fileHandle = await activeDirectoryHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        if (file && file.size > 0) {
          localAudioFileCache.set(track.id, file);
          localFileHandles.set(track.id, fileHandle);
          return true;
        }
      }
    } catch {
      return false;
    }
  }

  // 5. Existing active Blob URL
  if (track.audioBlobUrl) {
    try {
      const res = await fetch(track.audioBlobUrl, { method: 'HEAD' });
      return res.ok;
    } catch {
      return false;
    }
  }

  return false;
}

// Get playable audio URL for a track (Must be REAL audio only)
export async function getTrackPlayableUrl(track: Track): Promise<string> {
  if (!track) return '';

  // 1. If companion agent is active
  if (track.sourceType === 'companion-agent') {
    return `http://localhost:8901/api/stream?path=${encodeURIComponent(track.filePath)}`;
  }

  // 2. Check memory cache
  const cachedFile = localAudioFileCache.get(track.id);
  if (cachedFile) {
    if (!track.audioBlobUrl) {
      track.audioBlobUrl = URL.createObjectURL(cachedFile);
    }
    return track.audioBlobUrl;
  }

  // 3. Check File Handle
  const fileHandle = localFileHandles.get(track.id);
  if (fileHandle) {
    try {
      const file = await fileHandle.getFile();
      localAudioFileCache.set(track.id, file);
      track.audioBlobUrl = URL.createObjectURL(file);
      return track.audioBlobUrl;
    } catch (e) {
      console.warn('Could not read file from handle:', track.filePath, e);
    }
  }

  // 4. Try active directory handle if available
  if (activeDirectoryHandle && track.filePath) {
    try {
      const fileName = track.filePath.split('\\').pop() || track.filePath.split('/').pop() || '';
      if (fileName) {
        const fh = await activeDirectoryHandle.getFileHandle(fileName);
        const file = await fh.getFile();
        localAudioFileCache.set(track.id, file);
        localFileHandles.set(track.id, fh);
        track.audioBlobUrl = URL.createObjectURL(file);
        return track.audioBlobUrl;
      }
    } catch {}
  }

  // 5. Active blob URL check
  if (track.audioBlobUrl) {
    return track.audioBlobUrl;
  }

  return '';
}

// Browser File System Access API scanner
export async function scanLocalDirectoryWithFileSystemAccess(
  onProgress?: (scanned: number, currentFile: string) => void,
  customHandle?: any
): Promise<Track[]> {
  let dirHandle = customHandle;

  if (!dirHandle) {
    if (!('showDirectoryPicker' in window)) {
      throw new Error('FILE_SYSTEM_API_NOT_SUPPORTED');
    }

    // Open Windows native directory selector
    dirHandle = await (window as any).showDirectoryPicker({
      mode: 'read',
    });
  }

  // Save for session persistence
  await saveDirectoryHandle(dirHandle);

  const tracks: Track[] = [];
  let scannedCount = 0;

  async function scanFolder(folderHandle: any, currentPath = '') {
    for await (const entry of folderHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (
          name.endsWith('.mp3') ||
          name.endsWith('.mp4') ||
          name.endsWith('.m4v') ||
          name.endsWith('.wav') ||
          name.endsWith('.ogg') ||
          name.endsWith('.flac') ||
          name.endsWith('.m4a')
        ) {
          try {
            const file = await entry.getFile();
            const relPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
            if (onProgress) onProgress(++scannedCount, entry.name);
            const track = await processLocalFile(file, relPath, entry);
            tracks.push(track);
          } catch (e) {
            console.warn('Could not read file:', entry.name, e);
          }
        }
      } else if (entry.kind === 'directory') {
        const subPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        await scanFolder(entry, subPath);
      }
    }
  }

  await scanFolder(dirHandle);
  return tracks;
}

// Real-time synchronization: Re-scans the current monitored directory and detects added/removed files
export async function rescanMonitoredDirectory(
  existingTracks: Track[],
  onProgress?: (scanned: number, currentFile: string) => void
): Promise<{ updatedTracks: Track[]; addedCount: number; removedCount: number }> {
  const dirHandle = await getStoredDirectoryHandle();
  if (!dirHandle) {
    return { updatedTracks: existingTracks, addedCount: 0, removedCount: 0 };
  }

  try {
    const freshlyScanned = await scanLocalDirectoryWithFileSystemAccess(onProgress, dirHandle);
    const scannedPaths = new Set(freshlyScanned.map((t) => t.filePath));

    // Identify deleted files
    const remaining = existingTracks.filter((oldTrack) => {
      // Keep companion tracks as-is
      if (oldTrack.sourceType === 'companion-agent') return true;
      return scannedPaths.has(oldTrack.filePath);
    });

    const removedCount = existingTracks.length - remaining.length;

    // Identify newly added files
    const existingPathSet = new Set(existingTracks.map((t) => t.filePath));
    const addedTracks = freshlyScanned.filter((t) => !existingPathSet.has(t.filePath));
    const addedCount = addedTracks.length;

    // Merge: update metadata of existing while keeping newly added
    const updatedTracks = [...remaining, ...addedTracks];

    return { updatedTracks, addedCount, removedCount };
  } catch (err) {
    console.warn('Rescan error:', err);
    return { updatedTracks: existingTracks, addedCount: 0, removedCount: 0 };
  }
}

// Companion Agent health check on http://localhost:8901
export async function checkCompanionAgentStatus(): Promise<{
  connected: boolean;
  version?: string;
  scannedCount?: number;
  folder?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch('http://localhost:8901/api/status', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        connected: true,
        version: data.version || '2.4.0',
        scannedCount: data.tracksCount || 0,
        folder: data.monitoredFolder || 'C:\\RadioAutomation\\Music',
      };
    }
    return { connected: false };
  } catch {
    return { connected: false };
  }
}
