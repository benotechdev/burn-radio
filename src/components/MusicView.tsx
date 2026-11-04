import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  RefreshCw,
  Search,
  Play,
  Plus,
  Trash2,
  HardDrive,
  Music,
  Video,
  UploadCloud,
  CheckCircle2
} from 'lucide-react';
import { Track, Playlist } from '../types/radio';
import {
  scanLocalDirectoryWithFileSystemAccess,
  rescanMonitoredDirectory,
  processLocalFile,
  getStoredDirectoryHandle,
} from '../services/localFileManager';

interface MusicViewProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  playlists: Playlist[];
  onPlayTrack: (track: Track) => void;
  onAddToPlaylist: (track: Track, playlistId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

export const MusicView: React.FC<MusicViewProps> = ({
  tracks,
  setTracks,
  playlists,
  onPlayTrack,
  onAddToPlaylist,
  onRemoveTrack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'mp3' | 'mp4'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [showArchInfo, setShowArchInfo] = useState(false);
  const [selectedTrackForPlaylist, setSelectedTrackForPlaylist] = useState<Track | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const mp3Count = tracks.filter(
    (t) => t.mediaType === 'mp3' || !t.filePath?.toLowerCase().endsWith('.mp4')
  ).length;

  const mp4Count = tracks.filter(
    (t) => t.mediaType === 'mp4' || t.filePath?.toLowerCase().endsWith('.mp4')
  ).length;

  const filteredTracks = tracks.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.title.toLowerCase().includes(term) ||
      t.artist.toLowerCase().includes(term) ||
      t.album.toLowerCase().includes(term) ||
      t.filePath.toLowerCase().includes(term);

    const isMp4 = t.mediaType === 'mp4' || t.filePath?.toLowerCase().endsWith('.mp4');
    const matchesMedia =
      mediaFilter === 'all' ||
      (mediaFilter === 'mp3' && !isMp4) ||
      (mediaFilter === 'mp4' && isMp4);

    return matchesSearch && matchesMedia;
  });

  const handleSelectFolder = async () => {
    setIsScanning(true);
    setStatusMessage('Accessing local Windows PC disk...');
    try {
      const scanned = await scanLocalDirectoryWithFileSystemAccess((count, name) => {
        setStatusMessage(`Scanning PC files: ${count} verified MP3 & MP4 songs found (${name})`);
      });

      if (scanned.length > 0) {
        setTracks((prev) => {
          const existingPaths = new Set(prev.map((t) => t.filePath));
          const newOnly = scanned.filter((t) => !existingPaths.has(t.filePath));
          return [...prev, ...newOnly];
        });
      }
      setStatusMessage(`Scan complete! Verified and loaded ${scanned.length} physical songs from your PC.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        fileInputRef.current?.click();
      }
      setStatusMessage('');
    } finally {
      setIsScanning(false);
    }
  };

  // Real-time synchronization: Re-scans disk for added, removed, or renamed files
  const handleRescanLocalDisk = async () => {
    setIsScanning(true);
    setStatusMessage('Synchronizing with Windows disk: verifying files...');
    try {
      const storedHandle = await getStoredDirectoryHandle();
      if (!storedHandle) {
        // If no folder stored yet, prompt folder selection
        await handleSelectFolder();
        return;
      }

      const { updatedTracks, addedCount, removedCount } = await rescanMonitoredDirectory(
        tracks,
        (count, name) => {
          setStatusMessage(`Checking local files: ${count} verified (${name})`);
        }
      );

      setTracks(updatedTracks);
      setStatusMessage(
        `Sync complete: ${updatedTracks.length} verified tracks on disk (+${addedCount} added, -${removedCount} removed/renamed).`
      );
    } catch (e: any) {
      console.warn('Rescan notice:', e);
      // Fallback to folder selection if handle permissions expired
      await handleSelectFolder();
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setStatusMessage(`Indexing ${files.length} selected local files from disk...`);

    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'mp4', 'm4v', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
        const relPath = file.webkitRelativePath || file.name;
        const track = await processLocalFile(file, relPath);
        newTracks.push(track);
      }
    }

    setTracks((prev) => {
      const paths = new Set(prev.map((t) => t.filePath));
      const freshOnly = newTracks.filter((t) => !paths.has(t.filePath));
      return [...prev, ...freshOnly];
    });
    setIsScanning(false);
    setStatusMessage(`Loaded ${newTracks.length} verified MP3 and MP4 files from your local disk.`);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setStatusMessage(`Importing ${files.length} local files directly from PC...`);
    const newTracks: Track[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'mp4', 'm4v', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
        const track = await processLocalFile(file, file.name);
        newTracks.push(track);
      }
    }

    setTracks((prev) => {
      const paths = new Set(prev.map((t) => t.filePath));
      const freshOnly = newTracks.filter((t) => !paths.has(t.filePath));
      return [...prev, ...freshOnly];
    });
    setIsScanning(false);
    setStatusMessage(`Imported ${newTracks.length} local files.`);
  };

  return (
    <div
      className="max-w-6xl mx-auto space-y-5"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Fallback hidden file picker */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        multiple
        accept=".mp3,.mp4,.m4v,.wav,.ogg,.flac,.m4a"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        className="hidden"
      />

      {/* Header Controls: Folder select, Scan, and Search */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">Music & Local Media Library</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#181818] text-[#FF7900] border border-[#303030]">
                ZERO CLOUD STORAGE
              </span>
            </div>
            <p className="text-xs text-[#A5A5A5] mt-0.5">
              Instantly detects and displays MP3 and MP4 files directly from your computer's local disk.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleSelectFolder}
              disabled={isScanning}
              className="px-4 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow-sm flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Select Music Folder'}</span>
            </button>

            <button
              onClick={handleRescanLocalDisk}
              disabled={isScanning}
              className="px-3.5 py-2 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-semibold text-xs rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="Rescan PC disk for added, removed or renamed files"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>Sync Disk</span>
            </button>

            <button
              onClick={() => setShowArchInfo(!showArchInfo)}
              className="px-3 py-2 bg-[#181818] hover:bg-[#282828] text-[#A5A5A5] hover:text-white border border-[#303030] font-semibold text-xs rounded-md transition-colors"
              title="How Local PC connection works"
            >
              How It Works
            </button>
          </div>
        </div>

        {/* Informational Zero-Cloud Architecture Explanation Panel */}
        {showArchInfo && (
          <div className="p-4 rounded-md bg-[#181818] border border-[#FF7900]/40 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-[#303030] pb-2">
              <span className="font-bold text-[#FF7900] uppercase tracking-wider text-[11px]">
                RADIOFLOW Zero-Cloud Local Connection Architecture
              </span>
              <button
                onClick={() => setShowArchInfo(false)}
                className="text-[#A5A5A5] hover:text-white text-xs"
              >
                ✕ Close
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-300">
              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <div className="font-bold text-white mb-1">1. Direct PC Disk Access</div>
                <p className="text-[11px] text-[#A5A5A5]">
                  Audio files are accessed straight from your Windows drive via the W3C File System Access API or local companion daemon. Zero cloud upload.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <div className="font-bold text-white mb-1">2. Physical File Verification</div>
                <p className="text-[11px] text-[#A5A5A5]">
                  Before every song plays, RADIOFLOW verifies the file physically exists on disk. Deleted or renamed files are skipped automatically to prevent dead air.
                </p>
              </div>
              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <div className="font-bold text-white mb-1">3. Real Low-Latency Playout</div>
                <p className="text-[11px] text-[#A5A5A5]">
                  Controls connect to HTML5 and Web Audio playback engines with native crossfading, cue points, and Auto DJ continuous automation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone Banner */}
        <div
          className={`p-3 rounded-md border border-dashed transition-all text-xs flex items-center justify-between ${
            isDragOver
              ? 'border-[#FF7900] bg-[#FF7900]/10 text-white'
              : 'border-[#303030] bg-[#181818] text-[#A5A5A5]'
          }`}
        >
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-[#FF7900]" />

            <span>
              {isDragOver
                ? 'Drop your local MP3 or MP4 songs here to import instantly'
                : 'Drag & drop MP3 and MP4 files or folders from Windows Explorer directly here'}
            </span>
          </div>
          <span className="text-[11px] text-[#A5A5A5] font-mono hidden sm:inline">
            Direct Local Playback
          </span>
        </div>

        {/* Scan status feedback */}
        {statusMessage && (
          <div className="text-xs text-[#FF7900] bg-[#181818] p-2.5 rounded border border-[#303030] flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Search Input & Format Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#A5A5A5]" />
            <input
              type="text"
              placeholder="Search MP3 & MP4 songs by title, artist, or local path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded-md pl-9 pr-4 py-2 text-xs text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          {/* Format Filter Pills */}
          <div className="flex items-center space-x-1.5 text-xs">
            <button
              onClick={() => setMediaFilter('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                mediaFilter === 'all'
                  ? 'bg-[#FF7900] text-white'
                  : 'bg-[#181818] text-[#A5A5A5] hover:text-white border border-[#303030]'
              }`}
            >
              All Media ({tracks.length})
            </button>
            <button
              onClick={() => setMediaFilter('mp3')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                mediaFilter === 'mp3'
                  ? 'bg-[#FF7900] text-white'
                  : 'bg-[#181818] text-[#A5A5A5] hover:text-white border border-[#303030]'
              }`}
            >
              MP3 Audio ({mp3Count})
            </button>
            <button
              onClick={() => setMediaFilter('mp4')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                mediaFilter === 'mp4'
                  ? 'bg-[#FF7900] text-white'
                  : 'bg-[#181818] text-[#A5A5A5] hover:text-white border border-[#303030]'
              }`}
            >
              MP4 Songs & Videos ({mp4Count})
            </button>
          </div>
        </div>
      </div>

      {/* Simple Music Table (Display only: Song title, Artist, Duration, Action) */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg overflow-hidden">
        <div className="px-5 py-3 border-b border-[#303030] flex items-center justify-between">
          <span className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
            Local Disk Files ({filteredTracks.length})
          </span>
          <span className="text-xs text-[#A5A5A5] font-mono">
            {mp3Count} MP3 • {mp4Count} MP4
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#181818] text-[#A5A5A5] border-b border-[#303030] uppercase text-[11px] font-semibold">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Song Title</th>
                <th className="py-2.5 px-4">Artist</th>
                <th className="py-2.5 px-4 w-28">Duration</th>
                <th className="py-2.5 px-4 w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303030] text-white">
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#A5A5A5]">
                    {tracks.length === 0
                      ? "No physical music files loaded yet. Click 'Select Music Folder' above or drag & drop MP3/MP4 files from your Windows PC to start broadcasting."
                      : "No tracks found matching your search filter."}
                  </td>
                </tr>
              ) : (
                filteredTracks.map((track, idx) => {
                  const isMp4 =
                    track.mediaType === 'mp4' ||
                    track.filePath.toLowerCase().endsWith('.mp4');

                  return (
                    <tr key={track.id} className="hover:bg-[#282828] transition-colors group">
                      <td className="py-3 px-4 text-center text-[#A5A5A5] font-mono">
                        {idx + 1}
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              isMp4
                                ? 'bg-[#FF7900] text-black'
                                : 'bg-[#181818] text-[#FF7900] border border-[#303030]'
                            }`}
                          >
                            {isMp4 ? 'MP4' : 'MP3'}
                          </span>
                          <span className="truncate max-w-sm">{track.title}</span>
                        </div>
                        <div className="text-[10px] text-[#A5A5A5] font-mono truncate max-w-md mt-0.5">
                          {track.filePath}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-[#A5A5A5]">
                        <div className="truncate max-w-xs">{track.artist}</div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#A5A5A5]">
                        {formatTime(track.duration)}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Play Action */}
                          <button
                            onClick={() => onPlayTrack(track)}
                            className="px-2.5 py-1 bg-[#FF7900] hover:bg-[#E96800] text-white rounded text-[11px] font-bold flex items-center space-x-1 transition-colors"
                            title="Play now"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                          </button>

                          {/* Add to Playlist Action */}
                          <button
                            onClick={() => setSelectedTrackForPlaylist(track)}
                            className="px-2 py-1 bg-[#181818] hover:bg-[#303030] text-[#A5A5A5] hover:text-white rounded border border-[#303030] text-[11px] font-medium transition-colors"
                            title="Add to playlist"
                          >
                            + Playlist
                          </button>

                          {/* Remove Action */}
                          <button
                            onClick={() => onRemoveTrack(track.id)}
                            className="p-1 text-[#A5A5A5] hover:text-white transition-colors"
                            title="Remove from library"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add to Playlist Selection Modal */}
      {selectedTrackForPlaylist && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-white">
              Add "{selectedTrackForPlaylist.title}" to Playlist
            </h3>

            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {playlists.length === 0 ? (
                <p className="text-xs text-[#A5A5A5] py-4 text-center">
                  No playlists created yet. Create one in the Playlists section.
                </p>
              ) : (
                playlists.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => {
                      onAddToPlaylist(selectedTrackForPlaylist, pl.id);
                      setSelectedTrackForPlaylist(null);
                    }}
                    className="w-full text-left p-2.5 rounded bg-[#181818] hover:bg-[#282828] border border-[#303030] text-xs font-semibold text-white flex justify-between items-center transition-colors"
                  >
                    <span>{pl.name}</span>
                    <span className="text-[10px] text-[#A5A5A5] font-mono">
                      {pl.tracks.length} tracks
                    </span>
                  </button>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTrackForPlaylist(null)}
                className="px-3 py-1.5 rounded bg-[#181818] text-[#A5A5A5] hover:text-white text-xs border border-[#303030]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
