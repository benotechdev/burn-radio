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
import { Track, Playlist, PlaylistItem, AutoDJSettings, DeckState } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { StudioConsole } from './StudioConsole';

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
  allTracks: Track[];
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
  allTracks,
}) => {
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>(
    playlists[0]?.id || ''
  );
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(true);

  // Deck A & B state for the Pro Two-Deck Scratch Console
  const [deckA, setDeckA] = useState<DeckState>({
    deckId: 'A',
    track: currentTrack,
    isPlaying: isPlaying,
    currentTime: currentTime,
    duration: duration,
    volume: volume,
    pitch: 0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    isCueing: false,
    isLooping: false,
    vuLevelL: 0.6,
    vuLevelR: 0.6,
    peakL: 0.8,
    peakR: 0.8,
  });

  const [deckB, setDeckB] = useState<DeckState>({
    deckId: 'B',
    track: allTracks[1] || null,
    isPlaying: false,
    currentTime: 0,
    duration: 180,
    volume: 0.85,
    pitch: 0,
    eqHigh: 0,
    eqMid: 0,
    eqLow: 0,
    isCueing: false,
    isLooping: false,
    vuLevelL: 0.0,
    vuLevelR: 0.0,
    peakL: 0.0,
    peakR: 0.0,
  });

  const [crossfaderPos, setCrossfaderPos] = useState<number>(0);
  const [isMicLive, setIsMicLive] = useState<boolean>(false);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleTrackFinished = (deckId: 'A' | 'B') => {
    onNext();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Mode Selector Tabs */}
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
          <span>PRO TWO-DECK SCRATCH CONSOLE</span>
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

      {/* ==================== 1. MANUAL DJ MODE (PRO TWO-DECK CONSOLE) ==================== */}
      {broadcastMode === 'manual' && (
        <StudioConsole
          deckA={deckA}
          setDeckA={setDeckA}
          deckB={deckB}
          setDeckB={setDeckB}
          crossfaderPos={crossfaderPos}
          setCrossfaderPos={setCrossfaderPos}
          crossfadeCurve="broadcast-dip"
          broadcastMode={broadcastMode}
          isMicLive={isMicLive}
          onToggleMic={() => setIsMicLive(!isMicLive)}
          queue={queue}
          setQueue={setQueue}
          allTracks={allTracks}
          onTrackFinished={handleTrackFinished}
        />
      )}

      {/* ==================== 2. AUTO DJ MODE ==================== */}
      {broadcastMode === 'autodj' && (
        <div className="bg-[#202020] border border-[#303030] rounded-lg p-6 space-y-6 max-w-3xl mx-auto">
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
              <span>Repeat Playlist: {isRepeat ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
