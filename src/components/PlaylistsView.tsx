import React, { useState } from 'react';
import {
  ListPlus,
  Play,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Music,
  Plus,
  Clock,
  Check
} from 'lucide-react';
import { Playlist, Track } from '../types/radio';

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

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Top Banner */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white">Playlists</h2>
          <p className="text-xs text-[#A5A5A5] mt-0.5">
            Organize tracks into rotation sets for Manual DJ playout and Auto DJ scheduling.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="px-4 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow-sm flex items-center space-x-2 transition-colors shrink-0"
        >
          <ListPlus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Main 2-Column Layout: Left Playlists List, Right Playlist Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Column: Playlists List */}
        <div className="md:col-span-4 bg-[#202020] border border-[#303030] rounded-lg p-4 space-y-3">
          <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
            All Playlists ({playlists.length})
          </div>

          <div className="space-y-1.5">
            {playlists.length === 0 ? (
              <div className="text-xs text-[#A5A5A5] py-8 text-center">
                No playlists yet. Click "Create Playlist" above.
              </div>
            ) : (
              playlists.map((pl) => {
                const isSelected = selectedPlaylist?.id === pl.id;
                const totalSecs = pl.tracks.reduce((sum, t) => sum + t.duration, 0);

                return (
                  <div
                    key={pl.id}
                    onClick={() => setSelectedPlaylistId(pl.id)}
                    className={`p-3 rounded-md border text-left cursor-pointer transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#181818] border-[#FF7900]'
                        : 'bg-[#181818] border-[#303030] hover:border-[#444444]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      {editingPlaylistId === pl.id ? (
                        <div
                          className="flex items-center space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="bg-[#202020] border border-[#303030] text-white px-2 py-1 text-xs rounded"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRenamePlaylist(pl.id)}
                            className="p-1 text-[#FF7900]"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="text-xs font-bold text-white truncate">
                            {pl.name}
                          </div>
                          <div className="text-[11px] text-[#A5A5A5] mt-0.5 font-mono">
                            {pl.tracks.length} songs • {formatDuration(totalSecs)}
                          </div>
                        </>
                      )}
                    </div>

                    <div
                      className="flex items-center space-x-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setEditingPlaylistId(pl.id);
                          setEditName(pl.name);
                        }}
                        className="p-1 text-[#A5A5A5] hover:text-white"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePlaylist(pl.id)}
                        className="p-1 text-[#A5A5A5] hover:text-white"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Playlist Tracks Management */}
        <div className="md:col-span-8 bg-[#202020] border border-[#303030] rounded-lg p-5 space-y-4">
          {selectedPlaylist ? (
            <>
              {/* Playlist Details Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#303030] gap-3">
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedPlaylist.name}
                  </h3>
                  <div className="text-xs text-[#A5A5A5] font-mono mt-0.5">
                    {selectedPlaylist.tracks.length} Songs • Total Duration:{' '}
                    {formatDuration(
                      selectedPlaylist.tracks.reduce((sum, t) => sum + t.duration, 0)
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onPlayPlaylist(selectedPlaylist)}
                    disabled={selectedPlaylist.tracks.length === 0}
                    className="px-3.5 py-1.5 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md shadow-sm flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play All</span>
                  </button>

                  <button
                    onClick={() => setIsAddingTracksOpen(true)}
                    className="px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-semibold text-xs rounded-md flex items-center space-x-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Music</span>
                  </button>
                </div>
              </div>

              {/* Tracks Table in Playlist */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#181818] text-[#A5A5A5] border-b border-[#303030] uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">#</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Artist</th>
                      <th className="py-2 px-3 w-20">Duration</th>
                      <th className="py-2 px-3 w-28 text-right">Order / Remove</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#303030] text-white">
                    {selectedPlaylist.tracks.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#A5A5A5]">
                          This playlist is empty. Click "Add Music" to add tracks from your library.
                        </td>
                      </tr>
                    ) : (
                      selectedPlaylist.tracks.map((track, idx) => (
                        <tr key={track.id + idx} className="hover:bg-[#282828] transition-colors">
                          <td className="py-2.5 px-3 text-center text-[#A5A5A5] font-mono">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white truncate max-w-xs">
                            {track.title}
                          </td>
                          <td className="py-2.5 px-3 text-[#A5A5A5] truncate max-w-xs">
                            {track.artist}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[#A5A5A5]">
                            {formatTrackTime(track.duration)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1">
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
                                className="p-1 text-[#A5A5A5] hover:text-white ml-1"
                                title="Remove from playlist"
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
            </>
          ) : (
            <div className="py-12 text-center text-xs text-[#A5A5A5]">
              Select a playlist from the left or create a new one.
            </div>
          )}
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
                placeholder="e.g. Afternoon Drive Rotation"
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
              {allTracks.length === 0 ? (
                <p className="text-xs text-[#A5A5A5] py-6 text-center">
                  No tracks available in library.
                </p>
              ) : (
                allTracks.map((trk) => {
                  const alreadyIn = selectedPlaylist.tracks.some((t) => t.id === trk.id);
                  return (
                    <div
                      key={trk.id}
                      className="py-2 px-1 flex items-center justify-between text-xs"
                    >
                      <div className="truncate pr-2">
                        <div className="font-semibold text-white truncate">{trk.title}</div>
                        <div className="text-[11px] text-[#A5A5A5] truncate">{trk.artist}</div>
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
