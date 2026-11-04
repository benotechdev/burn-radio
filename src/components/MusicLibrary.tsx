import React, { useState, useRef } from 'react';
import {
  FolderOpen,
  HardDrive,
  RefreshCw,
  Search,
  Filter,
  Play,
  Sliders,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  Plus,
  Trash2,
  Tag,
  Radio,
  Clock,
  Sparkles,
  Download,
  Terminal
} from 'lucide-react';
import { Track, MusicCategory, DeckState, PlaylistItem } from '../types/radio';
import {
  scanLocalDirectoryWithFileSystemAccess,
  processLocalFile,
  checkCompanionAgentStatus,
  getTrackPlayableUrl,
  saveTrackMetadataToDB,
} from '../services/localFileManager';
import { audioEngine } from '../services/audioEngine';

interface MusicLibraryProps {
  tracks: Track[];
  setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  setDeckA: React.Dispatch<React.SetStateAction<DeckState>>;
  setDeckB: React.Dispatch<React.SetStateAction<DeckState>>;
  setQueue: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
}

export const MusicLibrary: React.FC<MusicLibraryProps> = ({
  tracks,
  setTracks,
  setDeckA,
  setDeckB,
  setQueue,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusText, setScanStatusText] = useState('');
  const [editingTrack, setEditingTrack] = useState<Track | null>(null);
  const [companionStatus, setCompanionStatus] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter tracks
  const filteredTracks = tracks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.filePath.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === 'all' || t.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Direct Browser Native Directory Scanner (Chrome, Edge, Opera on Windows)
  const handleSelectLocalFolder = async () => {
    setIsScanning(true);
    setScanStatusText('Requesting folder access from Windows...');
    try {
      const scanned = await scanLocalDirectoryWithFileSystemAccess(
        (count, currentFile) => {
          setScanStatusText(`Scanning local drive: ${count} audio files found (${currentFile})`);
        }
      );

      if (scanned.length > 0) {
        setTracks((prev) => {
          // Merge without duplicates by filePath
          const existingPaths = new Set(prev.map((t) => t.filePath));
          const newOnly = scanned.filter((t) => !existingPaths.has(t.filePath));
          return [...prev, ...newOnly];
        });
      }
      setScanStatusText(`Scan complete! ${scanned.length} local files indexed.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('File System Picker fallback trigger:', err);
        // Fallback to directory input
        fileInputRef.current?.click();
      }
      setScanStatusText('');
    } finally {
      setIsScanning(false);
    }
  };

  // Fallback for browsers: Standard HTML5 webkitdirectory file input
  const handleFolderInputFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    setScanStatusText(`Reading ${files.length} selected files from PC...`);

    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
        const relPath = file.webkitRelativePath || file.name;
        const track = await processLocalFile(file, relPath);
        newTracks.push(track);
      }
    }

    setTracks((prev) => [...prev, ...newTracks]);
    setIsScanning(false);
    setScanStatusText(`Loaded ${newTracks.length} files from your PC folder.`);
  };

  // Refresh Companion Agent status on http://localhost:8901
  const handleCheckCompanion = async () => {
    const status = await checkCompanionAgentStatus();
    setCompanionStatus(status);
  };

  const loadToDeck = async (deckId: 'A' | 'B', track: Track) => {
    const playableUrl = await getTrackPlayableUrl(track);
    if (!playableUrl) {
      console.warn(`File for ${track.title} is not available on disk.`);
      return;
    }

    audioEngine.loadTrack(deckId, playableUrl);
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;
    setDeck((prev) => ({
      ...prev,
      track,
      currentTime: track.cuePoints.cueIn,
      duration: track.duration,
      isPlaying: false,
    }));
  };

  const addToQueue = (track: Track) => {
    setQueue((prev) => [
      ...prev,
      { queueId: `q-${Date.now()}-${Math.random().toString(36).substring(7)}`, track },
    ]);
  };

  const handleSaveTrackCues = () => {
    if (!editingTrack) return;
    saveTrackMetadataToDB(editingTrack);
    setTracks((prev) =>
      prev.map((t) => (t.id === editingTrack.id ? editingTrack : t))
    );
    setEditingTrack(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const categories: MusicCategory[] = [
    'Power Current',
    'Recurrent',
    'Classic Gold',
    'Jingle / Sweeper',
    'Station ID',
    'Promo',
    'Ad Spot',
    'News / Weather',
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Local Storage Banner */}
      <div className="bg-[#0f141f] border border-cyan-500/30 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <HardDrive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Local PC Storage Paradigm (Zero Cloud Audio Uploads)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-700/50">
                  100% PRIVATE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Music files stay directly on your computer's hard drive. Browse folders like{' '}
                <code className="text-amber-300 font-mono text-[11px] bg-slate-900 px-1 py-0.5 rounded">
                  C:\RadioAutomation\Music
                </code>
                . Only track cues and tags are cached.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Fallback hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFolderInputFallback}
              multiple
              // @ts-ignore
              webkitdirectory=""
              directory=""
              className="hidden"
            />

            <button
              onClick={handleSelectLocalFolder}
              disabled={isScanning}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold text-xs rounded-lg shadow-md flex items-center space-x-2 transition-all"
            >
              <FolderOpen className="w-4 h-4" />
              <span>{isScanning ? 'Scanning...' : 'Select Local Music Folder'}</span>
            </button>

            <button
              onClick={handleCheckCompanion}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>Companion Check</span>
            </button>
          </div>
        </div>

        {/* Scan Status progress feedback */}
        {scanStatusText && (
          <div className="mt-3 p-2 bg-slate-900/80 rounded border border-slate-800 text-xs text-amber-300 flex items-center space-x-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>{scanStatusText}</span>
          </div>
        )}

        {/* Companion Agent Alert if detected */}
        {companionStatus && (
          <div className="mt-3 p-2.5 bg-cyan-950/30 rounded border border-cyan-800/60 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">
                Companion Agent ({companionStatus.connected ? 'Online' : 'Not Running'} on port 8901)
                {companionStatus.connected && ` • Folder: ${companionStatus.folder}`}
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">
              {companionStatus.connected ? `${companionStatus.scannedCount} tracks served` : 'Run start-radioflow.bat'}
            </span>
          </div>
        )}
      </div>

      {/* Library Controls: Search & Category Filter */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search title, artist, album, path..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#090d14] border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Track counter metrics */}
          <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
            <span>
              <strong className="text-amber-400">{filteredTracks.length}</strong> Tracks
            </span>
            <span>
              Total:{' '}
              <strong className="text-cyan-400">
                {Math.round(filteredTracks.reduce((sum, t) => sum + t.duration, 0) / 60)} mins
              </strong>
            </span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-amber-500 text-black font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Tracks ({tracks.length})
          </button>
          {categories.map((cat) => {
            const count = tracks.filter((t) => t.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Tracks Table */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#090d14] border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase">
              <tr>
                <th className="py-2.5 px-3">Title & Artist</th>
                <th className="py-2.5 px-3 hidden sm:table-cell">Category</th>
                <th className="py-2.5 px-3 hidden md:table-cell">BPM / Key</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3 hidden lg:table-cell">Local File Path</th>
                <th className="py-2.5 px-3 text-right">Playout Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No tracks found matching your query. Click "Select Local Music Folder" to load tracks.
                  </td>
                </tr>
              ) : (
                filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-[#141b29] transition-colors">
                    <td className="py-2 px-3">
                      <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                        <FileAudio className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate max-w-xs">{track.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {track.artist} {track.album ? `• ${track.album}` : ''}
                      </div>
                    </td>

                    <td className="py-2 px-3 hidden sm:table-cell">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-amber-300 border border-slate-700">
                        {track.category}
                      </span>
                    </td>

                    <td className="py-2 px-3 hidden md:table-cell font-mono text-slate-400">
                      <span>{track.bpm} BPM</span>
                      {track.musicalKey && (
                        <span className="text-cyan-400 ml-1.5">({track.musicalKey})</span>
                      )}
                    </td>

                    <td className="py-2 px-3 font-mono font-semibold text-slate-200">
                      {formatTime(track.duration)}
                    </td>

                    <td className="py-2 px-3 hidden lg:table-cell font-mono text-[10px] text-slate-500 truncate max-w-xs">
                      {track.filePath}
                    </td>

                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => loadToDeck('A', track)}
                          className="px-2 py-1 bg-amber-950/50 text-amber-300 border border-amber-800/70 rounded hover:bg-amber-900/60 font-bold text-[10px]"
                          title="Load to Broadcast Deck A"
                        >
                          Deck A
                        </button>
                        <button
                          onClick={() => loadToDeck('B', track)}
                          className="px-2 py-1 bg-cyan-950/50 text-cyan-300 border border-cyan-800/70 rounded hover:bg-cyan-900/60 font-bold text-[10px]"
                          title="Load to Broadcast Deck B"
                        >
                          Deck B
                        </button>
                        <button
                          onClick={() => addToQueue(track)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded font-medium text-[10px]"
                          title="Append to Playout Queue"
                        >
                          + Queue
                        </button>
                        <button
                          onClick={() => setEditingTrack(track)}
                          className="p-1 text-slate-400 hover:text-slate-200"
                          title="Edit Cue Points & Metadata"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CUE POINT & METADATA EDITOR MODAL ==================== */}
      {editingTrack && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f141f] border border-amber-500/50 rounded-xl p-5 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-sm">
                  Broadcast Cue & Metadata Editor
                </h3>
              </div>
              <button
                onClick={() => setEditingTrack(null)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono"
              >
                ✕
              </button>
            </div>

            {/* Track Info */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Track Title</label>
                <input
                  type="text"
                  value={editingTrack.title}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, title: e.target.value })
                  }
                  className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Artist</label>
                <input
                  type="text"
                  value={editingTrack.artist}
                  onChange={(e) =>
                    setEditingTrack({ ...editingTrack, artist: e.target.value })
                  }
                  className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Format Category</label>
                <select
                  value={editingTrack.category}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      category: e.target.value as MusicCategory,
                    })
                  }
                  className="w-full bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">BPM & Musical Key</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={editingTrack.bpm}
                    onChange={(e) =>
                      setEditingTrack({
                        ...editingTrack,
                        bpm: parseInt(e.target.value, 10) || 120,
                      })
                    }
                    className="w-1/2 bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                  <input
                    type="text"
                    value={editingTrack.musicalKey || 'Am'}
                    onChange={(e) =>
                      setEditingTrack({ ...editingTrack, musicalKey: e.target.value })
                    }
                    className="w-1/2 bg-[#090d14] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Broadcast Cue Points Sliders */}
            <div className="bg-[#090d14] p-3 rounded-lg border border-slate-800 space-y-3">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                Radio Automation Cue Markers
              </span>

              {/* Cue In */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-400 font-semibold">Cue In (Trim Silence)</span>
                  <span className="font-mono text-slate-300">
                    {editingTrack.cuePoints.cueIn.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.1"
                  value={editingTrack.cuePoints.cueIn}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      cuePoints: {
                        ...editingTrack.cuePoints,
                        cueIn: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-emerald-500 h-1.5 cursor-pointer"
                />
              </div>

              {/* Ramp / Intro */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-purple-400 font-semibold">Vocal Ramp (DJ Talk Window)</span>
                  <span className="font-mono text-slate-300">
                    {editingTrack.cuePoints.rampIntro.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="0.5"
                  value={editingTrack.cuePoints.rampIntro}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      cuePoints: {
                        ...editingTrack.cuePoints,
                        rampIntro: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-purple-500 h-1.5 cursor-pointer"
                />
              </div>

              {/* Outro Fade */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-amber-400 font-semibold">Outro Fade Start</span>
                  <span className="font-mono text-slate-300">
                    {editingTrack.cuePoints.outroFade.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.max(0, editingTrack.duration - 30)}
                  max={editingTrack.duration}
                  step="0.5"
                  value={editingTrack.cuePoints.outroFade}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      cuePoints: {
                        ...editingTrack.cuePoints,
                        outroFade: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-amber-500 h-1.5 cursor-pointer"
                />
              </div>

              {/* Next Track Trigger */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-rose-400 font-semibold">Next Track Trigger (AutoDJ Segue)</span>
                  <span className="font-mono text-slate-300">
                    {editingTrack.cuePoints.nextTrigger.toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min={Math.max(0, editingTrack.duration - 20)}
                  max={editingTrack.duration}
                  step="0.5"
                  value={editingTrack.cuePoints.nextTrigger}
                  onChange={(e) =>
                    setEditingTrack({
                      ...editingTrack,
                      cuePoints: {
                        ...editingTrack.cuePoints,
                        nextTrigger: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-rose-500 h-1.5 cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setEditingTrack(null)}
                className="px-3 py-1.5 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrackCues}
                className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 shadow"
              >
                Save Cue Points
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
