import React, { useState, useRef } from 'react';
import {
  ListPlus,
  Play,
  Pause,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Music,
  Plus,
  Clock,
  Check,
  Upload,
  Radio,
  Volume2,
  Sparkles,
  Tag,
  FolderOpen
} from 'lucide-react';
import { Playlist, Track, CartPad, MusicCategory } from '../types/radio';
import { audioEngine } from '../services/audioEngine';

interface PlaylistsViewProps {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  allTracks: Track[];
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track) => void;
}

export const PlaylistsView: React.FC<PlaylistsViewProps> = ({
  playlists,
  setPlaylists,
  allTracks,
  onPlayPlaylist,
  onPlayTrack,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id || ''
  );
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isAddingTracksOpen, setIsAddingTracksOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);

  // Jingle & Advert Cart State
  const [jingleCarts, setJingleCarts] = useState<CartPad[]>([
    {
      id: 'jingle-1',
      slot: 1,
      label: 'BURN RADIO 104.5 ID',
      sublabel: 'Station Chime',
      color: 'bg-orange-600',
      category: 'Station ID',
      hotkey: '1',
      track: null,
      playMode: 'trigger',
      isPlaying: false,
      volume: 1.0,
    },
    {
      id: 'jingle-2',
      slot: 2,
      label: 'MORNING DRIVE INTRO',
      sublabel: 'Presenter Jingle',
      color: 'bg-amber-600',
      category: 'Promo',
      hotkey: '2',
      track: null,
      playMode: 'trigger',
      isPlaying: false,
      volume: 1.0,
    },
    {
      id: 'jingle-3',
      slot: 3,
      label: 'COMMERCIAL BREAK 30S',
      sublabel: 'Advertisement',
      color: 'bg-rose-600',
      category: 'Ad Spot',
      hotkey: '3',
      track: null,
      playMode: 'trigger',
      isPlaying: false,
      volume: 1.0,
    },
    {
      id: 'jingle-4',
      slot: 4,
      label: 'NEWS & WEATHER INTRO',
      sublabel: 'News / Weather',
      color: 'bg-blue-600',
      category: 'News / Weather',
      hotkey: '4',
      track: null,
      playMode: 'trigger',
      isPlaying: false,
      volume: 1.0,
    },
  ]);

  const [playingCartId, setPlayingCartId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCartAudioRef = useRef<HTMLAudioElement | null>(null);

  const selectedPlaylist =
    playlists.find((p) => p.id === selectedPlaylistId) || playlists[0] || null;

  const formatDuration = (secs: number) => {
    if (isNaN(secs) || secs <= 0) return '0 min';
    const mins = Math.round(secs / 60);
    return `${mins} mins`;
  };

  const formatTrackTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return;
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: newPlaylistName.trim(),
      tracks: [],
      createdAt: new Date().toISOString(),
    };
    setPlaylists((prev) => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setNewPlaylistName('');
    setIsCreating(false);
  };

  const handleRenamePlaylist = (id: string) => {
    if (!editName.trim()) return;
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p))
    );
    setEditingPlaylistId(null);
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
    if (selectedPlaylistId === id) {
      const remaining = playlists.filter((p) => p.id !== id);
      setSelectedPlaylistId(remaining[0]?.id || '');
    }
  };

  const handleRemoveTrackFromPlaylist = (trackId: string) => {
    if (!selectedPlaylist) return;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === selectedPlaylist.id) {
          return {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackId),
          };
        }
        return p;
      })
    );
  };

  const handleMoveTrack = (index: number, direction: 'up' | 'down') => {
    if (!selectedPlaylist) return;
    const newTracks = [...selectedPlaylist.tracks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newTracks.length) return;

    const temp = newTracks[index];
    newTracks[index] = newTracks[targetIdx];
    newTracks[targetIdx] = temp;

    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === selectedPlaylist.id ? { ...p, tracks: newTracks } : p
      )
    );
  };

  const handleAddTrackToCurrent = (track: Track) => {
    if (!selectedPlaylist) return;
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === selectedPlaylist.id) {
          return {
            ...p,
            tracks: [...p.tracks, track],
          };
        }
        return p;
      })
    );
  };

  // Jingle Cart File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const newCart: CartPad = {
        id: `cart-${Date.now()}-${idx}`,
        slot: jingleCarts.length + 1,
        label: file.name.replace(/\.[^/.]+$/, '').toUpperCase(),
        sublabel: 'Custom Upload',
        color: 'bg-amber-600',
        category: 'Jingle / Sweeper',
        hotkey: String((jingleCarts.length + 1) % 10),
        track: {
          id: `track-cart-${Date.now()}-${idx}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          artist: 'Burn Radio Production',
          album: 'Jingles & Adverts',
          duration: 15,
          bpm: 120,
          category: 'Jingle / Sweeper',
          filePath: file.name,
          cuePoints: { cueIn: 0, rampIntro: 0, outroFade: 14, nextTrigger: 14.5 },
          audioBlobUrl: url,
          sourceType: 'local-file',
        },
        playMode: 'trigger',
        isPlaying: false,
        volume: 1.0,
      };

      setJingleCarts((prev) => [...prev, newCart]);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlayCart = (cart: CartPad) => {
    if (activeCartAudioRef.current) {
      activeCartAudioRef.current.pause();
      activeCartAudioRef.current = null;
    }

    if (playingCartId === cart.id) {
      setPlayingCartId(null);
      return;
    }

    const audioUrl = cart.track?.audioBlobUrl;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      activeCartAudioRef.current = audio;
      audio.volume = cart.volume;
      setPlayingCartId(cart.id);
      audio.play().catch((err) => console.log('Cart playback:', err));
      audio.onended = () => {
        setPlayingCartId(null);
        activeCartAudioRef.current = null;
      };
    } else {
      audioEngine.playProceduralTone('sweeper');
      setPlayingCartId(cart.id);
      setTimeout(() => setPlayingCartId(null), 2500);
    }
  };

  const handleDeleteCart = (id: string) => {
    if (playingCartId === id && activeCartAudioRef.current) {
      activeCartAudioRef.current.pause();
      activeCartAudioRef.current = null;
      setPlayingCartId(null);
    }
    setJingleCarts((prev) => prev.filter((c) => c.id !== id));
  };

  const filteredTracks = allTracks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.filePath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Professional Automation & Jingle Cart</h2>
          <p className="text-xs text-[#A5A5A5] mt-0.5">
            Manage music rotation sets on the left and instant jingles, IDs, and adverts on the right.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            multiple
            accept="audio/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow-sm flex items-center space-x-2 transition-colors shrink-0"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Jingle / Ad</span>
          </button>

          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-bold text-xs rounded-md shadow-sm flex items-center space-x-2 transition-colors shrink-0"
          >
            <ListPlus className="w-4 h-4 text-[#FF7900]" />
            <span>New Playlist</span>
          </button>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ==================== LEFT SIDE: MUSIC LIBRARY & PLAYLIST ==================== */}
        <div className="lg:col-span-7 bg-[#202020] border border-[#303030] rounded-lg p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Playlist Selection & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#303030] pb-3">
              <div className="flex items-center space-x-2">
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="bg-[#181818] border border-[#303030] rounded-md px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-[#FF7900]"
                >
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.name} ({pl.tracks.length} tracks)
                    </option>
                  ))}
                </select>

                {selectedPlaylist && (
                  <button
                    onClick={() => onPlayPlaylist(selectedPlaylist)}
                    disabled={selectedPlaylist.tracks.length === 0}
                    className="px-3 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Search music..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#181818] border border-[#303030] rounded-md px-3 py-1.5 text-xs text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#FF7900] w-40 sm:w-48"
                />
                <button
                  onClick={() => setIsAddingTracksOpen(true)}
                  className="p-2 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] rounded-md"
                  title="Add tracks to playlist"
                >
                  <Plus className="w-4 h-4 text-[#FF7900]" />
                </button>
              </div>
            </div>

            {/* Active Playlist Header & Stats */}
            {selectedPlaylist && (
              <div className="flex justify-between items-center text-xs text-[#A5A5A5] font-mono bg-[#181818] p-2.5 rounded border border-[#303030]">
                <span>Active Rotation: <strong className="text-white">{selectedPlaylist.name}</strong></span>
                <span>{selectedPlaylist.tracks.length} Songs • Total: {formatDuration(selectedPlaylist.tracks.reduce((sum, t) => sum + t.duration, 0))}</span>
              </div>
            )}

            {/* Playlist Tracks Table */}
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#181818] text-[#A5A5A5] border-b border-[#303030] uppercase text-[10px] font-semibold sticky top-0">
                  <tr>
                    <th className="py-2 px-3 w-8 text-center">#</th>
                    <th className="py-2 px-3">Title</th>
                    <th className="py-2 px-3">Artist</th>
                    <th className="py-2 px-3 w-16">BPM</th>
                    <th className="py-2 px-3 w-16">Time</th>
                    <th className="py-2 px-3 w-24 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#303030] text-white">
                  {!selectedPlaylist || selectedPlaylist.tracks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-[#A5A5A5]">
                        Playlist is empty. Click <span className="text-[#FF7900]">+ Add</span> above to add local PC tracks.
                      </td>
                    </tr>
                  ) : (
                    selectedPlaylist.tracks.map((track, idx) => (
                      <tr key={track.id + idx} className="hover:bg-[#282828] transition-colors group">
                        <td className="py-2.5 px-3 text-center text-[#A5A5A5] font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white truncate max-w-[140px]">
                          {track.title}
                        </td>
                        <td className="py-2.5 px-3 text-[#A5A5A5] truncate max-w-[120px]">
                          {track.artist}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-amber-400">
                          {track.bpm}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#A5A5A5]">
                          {formatTrackTime(track.duration)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => onPlayTrack(track)}
                              className="p-1 bg-[#FF7900] text-white rounded hover:bg-[#E96800]"
                              title="Play Now"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                            <button
                              onClick={() => handleMoveTrack(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-20"
                              title="Move up"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveTrack(idx, 'down')}
                              disabled={idx === selectedPlaylist.tracks.length - 1}
                              className="p-1 text-[#A5A5A5] hover:text-white disabled:opacity-20"
                              title="Move down"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleRemoveTrackFromPlaylist(track.id)}
                              className="p-1 text-[#A5A5A5] hover:text-red-400"
                              title="Remove"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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

          {/* Shuffle & Repeat Controls at bottom of left panel */}
          <div className="pt-3 border-t border-[#303030] flex items-center justify-between text-xs text-[#A5A5A5]">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`px-3 py-1.5 rounded border font-bold transition-colors ${
                  isShuffle ? 'bg-[#FF7900] text-white border-[#FF7900]' : 'bg-[#181818] border-[#303030] hover:text-white'
                }`}
              >
                Shuffle: {isShuffle ? 'ON' : 'OFF'}
              </button>
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`px-3 py-1.5 rounded border font-bold transition-colors ${
                  isRepeat ? 'bg-[#FF7900] text-white border-[#FF7900]' : 'bg-[#181818] border-[#303030] hover:text-white'
                }`}
              >
                Repeat: {isRepeat ? 'ON' : 'OFF'}
              </button>
            </div>
            <span className="font-mono text-[11px]">Local PC Storage Active</span>
          </div>
        </div>

        {/* ==================== RIGHT SIDE: JINGLE & ADVERT CART ==================== */}
        <div className="lg:col-span-5 bg-[#202020] border border-[#303030] rounded-lg p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[#303030] pb-2">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#FF7900]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Jingle & Advert Cart ({jingleCarts.length})
                </h3>
              </div>
              <span className="text-[10px] text-[#A5A5A5] font-mono">Instant Fire</span>
            </div>

            <p className="text-[11px] text-[#A5A5A5]">
              Click any jingle or advertisement button below to fire instantly over the broadcast.
            </p>

            {/* Vertical Cart Buttons List */}
            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {jingleCarts.map((cart) => {
                const isPlaying = playingCartId === cart.id;
                return (
                  <div
                    key={cart.id}
                    className={`p-3 rounded-lg border flex items-center justify-between transition-all ${
                      isPlaying
                        ? 'bg-[#FF7900]/20 border-[#FF7900] shadow-md shadow-[#FF7900]/20'
                        : 'bg-[#181818] border-[#303030] hover:border-[#444444]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <button
                        onClick={() => handlePlayCart(cart)}
                        className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 shadow transition-transform active:scale-95 ${
                          isPlaying ? 'bg-[#FF7900] text-black animate-pulse' : 'bg-[#252525] text-[#FF7900] hover:bg-[#303030]'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                      </button>

                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-white truncate flex items-center space-x-1.5">
                          <span className="truncate">{cart.label}</span>
                          {isPlaying && (
                            <span className="px-1 py-0.5 bg-[#FF7900] text-black text-[9px] font-bold rounded animate-pulse">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A5A5A5] flex items-center space-x-2 font-mono mt-0.5">
                          <span className="text-[#FF7900]">{cart.category}</span>
                          <span>•</span>
                          <span>{cart.sublabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => handleDeleteCart(cart.id)}
                        className="p-1.5 text-[#A5A5A5] hover:text-red-400 transition-colors"
                        title="Delete cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Upload Prompt for Carts */}
          <div className="pt-3 border-t border-[#303030]">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 bg-[#181818] hover:bg-[#282828] border border-dashed border-[#FF7900]/60 hover:border-[#FF7900] text-[#FF7900] font-bold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Upload New Jingle / Ad (.MP3 / .WAV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Playlist</h3>
            <div>
              <label className="text-xs text-[#A5A5A5] block mb-1">Playlist Name</label>
              <input
                type="text"
                placeholder="e.g. Morning Drive Rotation"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                className="w-full bg-[#181818] border border-[#303030] rounded p-2 text-xs text-white placeholder-[#A5A5A5] focus:outline-none focus:border-[#FF7900]"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsCreating(false)}
                className="px-3 py-1.5 rounded bg-[#181818] text-[#A5A5A5] hover:text-white text-xs border border-[#303030]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="px-4 py-1.5 rounded bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Music to Playlist Modal */}
      {isAddingTracksOpen && selectedPlaylist && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 max-w-lg w-full space-y-4">
            <div className="flex justify-between items-center border-b border-[#303030] pb-2">
              <h3 className="text-sm font-bold text-white">
                Add Tracks to "{selectedPlaylist.name}"
              </h3>
              <button
                onClick={() => setIsAddingTracksOpen(false)}
                className="text-xs text-[#A5A5A5] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-[#303030]">
              {filteredTracks.length === 0 ? (
                <p className="text-xs text-[#A5A5A5] py-6 text-center">
                  No matching tracks found in library.
                </p>
              ) : (
                filteredTracks.map((trk) => {
                  const alreadyIn = selectedPlaylist.tracks.some((t) => t.id === trk.id);
                  return (
                    <div
                      key={trk.id}
                      className="py-2 px-1 flex items-center justify-between text-xs hover:bg-[#181818] rounded"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate">{trk.title}</div>
                        <div className="text-[11px] text-[#A5A5A5] truncate">{trk.artist} • {trk.bpm} BPM</div>
                      </div>

                      <button
                        onClick={() => handleAddTrackToCurrent(trk)}
                        disabled={alreadyIn}
                        className={`px-3 py-1 rounded text-[11px] font-bold ${
                          alreadyIn
                            ? 'bg-[#181818] text-[#A5A5A5] cursor-not-allowed'
                            : 'bg-[#FF7900] hover:bg-[#E96800] text-white'
                        }`}
                      >
                        {alreadyIn ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAddingTracksOpen(false)}
                className="px-4 py-1.5 rounded bg-[#FF7900] text-white font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
