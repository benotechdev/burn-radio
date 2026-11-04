import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Shuffle,
  Repeat,
  Sliders,
  ChevronDown,
  ChevronUp,
  Radio,
  Clock,
  Layers,
  Trash2,
  Check
} from 'lucide-react';
import { Track, Playlist, PlaylistItem, AutoDJSettings } from '../types/radio';
import { audioEngine } from '../services/audioEngine';

interface DjAndAutoDjViewProps {
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  setBroadcastMode: (mode: 'manual' | 'autodj' | 'assisted') => void;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  queue: PlaylistItem[];
  setQueue: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
  playlists: Playlist[];
  autoDJSettings: AutoDJSettings;
  setAutoDJSettings: React.Dispatch<React.SetStateAction<AutoDJSettings>>;
  onStartAutoDj: (playlistId: string) => void;
  onStopAutoDj: () => void;
}

export const DjAndAutoDjView: React.FC<DjAndAutoDjViewProps> = ({
  broadcastMode,
  setBroadcastMode,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  volume,
  onVolumeChange,
  queue,
  setQueue,
  playlists,
  autoDJSettings,
  setAutoDJSettings,
  onStartAutoDj,
  onStopAutoDj,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id || ''
  );
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);
  const [showAdvancedMixer, setShowAdvancedMixer] = useState(false);
  const [crossfaderVal, setCrossfaderVal] = useState(0);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleRemoveFromQueue = (queueId: string) => {
    setQueue((prev) => prev.filter((item) => item.queueId !== queueId));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Mode Selector Tabs with Obvious Orange Selected-State Indicator */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-1.5 flex items-center">
        <button
          onClick={() => setBroadcastMode('manual')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center space-x-2 ${
            broadcastMode === 'manual'
              ? 'bg-[#FF7900] text-white shadow-sm'
              : 'text-[#A5A5A5] hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>MANUAL DJ</span>
        </button>

        <button
          onClick={() => setBroadcastMode('autodj')}
          className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-md transition-all flex items-center justify-center space-x-2 ${
            broadcastMode === 'autodj'
              ? 'bg-[#FF7900] text-white shadow-sm'
              : 'text-[#A5A5A5] hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>AUTO DJ</span>
        </button>
      </div>

      {/* ==================== 1. MANUAL DJ MODE ==================== */}
      {broadcastMode === 'manual' && (
        <div className="space-y-6">
          {/* Current Track & Playback Card */}
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[#303030] pb-3">
              <span className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
                Manual DJ Playout Deck
              </span>
              <span className="text-xs font-bold text-[#FF7900] bg-[#181818] border border-[#303030] px-2.5 py-1 rounded">
                Live Console
              </span>
            </div>

            {/* Track Info */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded bg-[#181818] border border-[#303030] flex items-center justify-center text-[#FF7900] shrink-0 relative">
                <Radio className="w-8 h-8" />
                {currentTrack && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF7900] text-black">
                    {currentTrack.mediaType === 'mp4' || currentTrack.filePath?.toLowerCase().endsWith('.mp4') ? 'MP4' : 'MP3'}
                  </span>
                )}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-xl font-bold text-white truncate">
                  {currentTrack ? currentTrack.title : 'No Track Loaded'}
                </h3>
                <p className="text-sm text-[#A5A5A5] truncate mt-0.5">
                  {currentTrack ? currentTrack.artist : 'Select a track from the library or queue'}
                </p>
                {currentTrack && (
                  <div className="text-xs font-mono text-[#A5A5A5] mt-1 truncate">
                    <span className="text-[#FF7900] mr-1">Local PC File:</span>
                    <span>{currentTrack.filePath}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Seek Bar */}
            <div className="space-y-1.5">
              <div
                className="w-full h-2 bg-[#181818] border border-[#303030] rounded-full overflow-hidden cursor-pointer"
                onClick={(e) => {
                  if (duration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickPos = (e.clientX - rect.left) / rect.width;
                  onSeek(clickPos * duration);
                }}
              >
                <div
                  className="h-full bg-[#FF7900] transition-all duration-100"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono text-[#A5A5A5]">
                <span>{formatTime(currentTime)}</span>
                <span>-{formatTime(Math.max(0, duration - currentTime))}</span>
              </div>
            </div>

            {/* Primary Manual DJ Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onPrevious}
                  className="p-3 rounded-md bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] transition-colors"
                  title="Previous"
                >
                  <SkipBack className="w-5 h-5" />
                </button>

                <button
                  onClick={onTogglePlay}
                  disabled={!currentTrack}
                  className="px-6 py-3 rounded-md bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-sm flex items-center space-x-2 transition-all shadow-md disabled:opacity-50"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-5 h-5 fill-current" />
                      <span>Pause Playout</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                      <span>Start Playout</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onNext}
                  className="p-3 rounded-md bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] transition-colors"
                  title="Next"
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center space-x-3 w-full sm:w-56 bg-[#181818] p-2.5 rounded-md border border-[#303030]">
                <Volume2 className="w-4 h-4 text-[#A5A5A5] shrink-0" />
                <span className="text-xs text-[#A5A5A5] w-12 shrink-0">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Upcoming Queue */}
          <div className="bg-[#202020] border border-[#303030] rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#303030] pb-2">
              <span className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
                Upcoming Playout Queue ({queue.length})
              </span>
              <span className="text-xs text-[#A5A5A5]">Next tracks in rotation</span>
            </div>

            <div className="divide-y divide-[#303030]">
              {queue.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#A5A5A5]">
                  Queue is empty. Add songs from the Music section.
                </div>
              ) : (
                queue.map((item, idx) => (
                  <div
                    key={item.queueId}
                    className="py-2.5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <span className="w-5 font-mono text-[#A5A5A5] text-center font-bold">
                        {idx + 1}
                      </span>
                      <div className="truncate">
                        <div className="font-semibold text-white truncate">
                          {item.track.title}
                        </div>
                        <div className="text-[11px] text-[#A5A5A5] truncate">
                          {item.track.artist}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0">
                      <span className="font-mono text-[#A5A5A5]">
                        {formatTime(item.track.duration)}
                      </span>
                      <button
                        onClick={() => handleRemoveFromQueue(item.queueId)}
                        className="p-1 text-[#A5A5A5] hover:text-white"
                        title="Remove from queue"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Optional Advanced Mixing Controls Accordion */}
          <div className="bg-[#202020] border border-[#303030] rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAdvancedMixer(!showAdvancedMixer)}
              className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-[#A5A5A5] hover:text-white transition-colors"
            >
              <span>ADVANCED MIXING CONTROLS (OPTIONAL)</span>
              {showAdvancedMixer ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvancedMixer && (
              <div className="p-5 border-t border-[#303030] bg-[#181818] space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-xs mb-1 text-[#A5A5A5]">
                    <span>Deck A / Deck B Crossfader</span>
                    <span className="font-mono text-white">Center</span>
                  </div>
                  <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={crossfaderVal}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      setCrossfaderVal(v);
                      audioEngine.setCrossfader(v);
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] text-[#A5A5A5] font-mono mt-1">
                    <span>Deck A</span>
                    <span>Deck B</span>
                  </div>
                </div>

                <div className="pt-2 text-xs text-[#A5A5A5]">
                  Professional hardware crossfade curve set to standard commercial broadcast dip (-3dB).
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== 2. AUTO DJ MODE ==================== */}
      {broadcastMode === 'autodj' && (
        <div className="bg-[#202020] border border-[#303030] rounded-lg p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#303030] pb-3">
            <div>
              <h3 className="text-base font-bold text-white">Auto DJ Automation</h3>
              <p className="text-xs text-[#A5A5A5] mt-0.5">
                Automatically rotates and crossfades music non-stop without human operation.
              </p>
            </div>
            <span className="px-2.5 py-1 bg-[#FF7900] text-white font-bold text-xs rounded">
              Active Mode
            </span>
          </div>

          {/* Select Playlist */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider block">
              Rotation Playlist
            </label>
            <select
              value={selectedPlaylistId}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded-md p-2.5 text-xs text-white focus:outline-none focus:border-[#FF7900]"
            >
              {playlists.map((pl) => (
                <option key={pl.id} value={pl.id}>
                  {pl.name} ({pl.tracks.length} songs)
                </option>
              ))}
            </select>
          </div>

          {/* Start / Stop Auto DJ Button */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onStartAutoDj(selectedPlaylistId)}
              className="px-6 py-3 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-sm rounded-md shadow flex items-center space-x-2 transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Auto DJ</span>
            </button>

            <button
              onClick={onStopAutoDj}
              className="px-5 py-3 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-semibold text-sm rounded-md transition-colors"
            >
              Stop Auto DJ
            </button>
          </div>

          {/* Shuffle & Repeat Toggles */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => setIsShuffle(!isShuffle)}
              className={`p-3 rounded-md border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                isShuffle
                  ? 'bg-[#FF7900] text-white border-[#FF7900]'
                  : 'bg-[#181818] text-[#A5A5A5] border-[#303030] hover:text-white'
              }`}
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle Playback: {isShuffle ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => setIsRepeat(!isRepeat)}
              className={`p-3 rounded-md border text-xs font-bold flex items-center justify-center space-x-2 transition-colors ${
                isRepeat
                  ? 'bg-[#FF7900] text-white border-[#FF7900]'
                  : 'bg-[#181818] text-[#A5A5A5] border-[#303030] hover:text-white'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Loop Playlist: {isRepeat ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Crossfade Setting Slider */}
          <div className="space-y-2 pt-2 border-t border-[#303030]">
            <div className="flex justify-between text-xs text-[#A5A5A5]">
              <span className="font-semibold text-white">Crossfade Transition Duration</span>
              <span className="font-mono text-[#FF7900] font-bold">
                {autoDJSettings.crossfadeDuration} seconds
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="0.5"
              value={autoDJSettings.crossfadeDuration}
              onChange={(e) =>
                setAutoDJSettings((prev) => ({
                  ...prev,
                  crossfadeDuration: parseFloat(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex justify-between text-[11px] text-[#A5A5A5] font-mono">
              <span>1.0s (Tight)</span>
              <span>3.5s (Standard Radio)</span>
              <span>8.0s (Smooth Club)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
