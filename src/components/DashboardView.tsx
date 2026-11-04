import React from 'react';
import {
  Play,
  Pause,
  SkipForward,
  FolderOpen,
  ListPlus,
  Radio,
  Wifi,
  Clock,
  Music,
  CheckCircle2,
  AlertCircle,
  Mic
} from 'lucide-react';
import { Track, BroadcastLogItem } from '../types/radio';
import { MicrophoneRecordingConsole } from './MicrophoneRecordingConsole';

interface DashboardViewProps {
  isOnAir: boolean;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  isCompanionOnline: boolean;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  recentlyPlayed: BroadcastLogItem[];
  onNavigate: (section: 'music' | 'playlists' | 'dj' | 'broadcast' | 'recording') => void;
  onToggleAutoDj: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  isOnAir,
  broadcastMode,
  isCompanionOnline,
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onNext,
  onSeek,
  recentlyPlayed,
  onNavigate,
  onToggleAutoDj,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ==================== A. STATION STATUS ==================== */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div
              className={`px-3 py-1.5 rounded-md text-xs font-bold tracking-wider uppercase flex items-center space-x-2 ${
                isOnAir
                  ? 'bg-[#FF7900] text-white shadow-sm'
                  : 'bg-[#181818] text-[#A5A5A5] border border-[#303030]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnAir ? 'bg-white' : 'bg-[#A5A5A5]'
                }`}
              />
              <span>{isOnAir ? 'ON AIR' : 'OFFLINE'}</span>
            </div>

            <div>
              <div className="text-xs text-[#A5A5A5] uppercase font-semibold">
                Operating Mode
              </div>
              <div className="text-sm font-bold text-white capitalize">
                {broadcastMode === 'autodj' ? 'Auto DJ (Continuous Rotation)' : 'Manual DJ Playout'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs text-[#A5A5A5]">
            <span className="w-2 h-2 rounded-full bg-[#FF7900]" />
            <span>
              {isCompanionOnline
                ? 'Windows Companion Service Connected'
                : 'Local Audio Engine Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== B. NOW PLAYING ==================== */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-6">
        <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider mb-4">
          Now Playing
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Song Info */}
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-lg bg-[#181818] border border-[#303030] flex items-center justify-center text-[#FF7900] shrink-0 relative">
              <Music className="w-8 h-8" />
              {currentTrack && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FF7900] text-black">
                  {currentTrack.mediaType === 'mp4' || currentTrack.filePath?.toLowerCase().endsWith('.mp4') ? 'MP4' : 'MP3'}
                </span>
              )}
            </div>

            <div className="overflow-hidden">
              <h2 className="text-xl font-bold text-white leading-tight truncate">
                {currentTrack ? currentTrack.title : 'No track loaded'}
              </h2>
              <p className="text-sm text-[#A5A5A5] mt-0.5 truncate">
                {currentTrack ? currentTrack.artist : 'Select a track from Music or start Auto DJ'}
              </p>
              {currentTrack && (
                <div className="text-xs text-[#A5A5A5] mt-1 font-mono truncate">
                  <span className="text-[#FF7900] mr-1.5">Local PC Disk:</span>
                  <span>{currentTrack.filePath}</span>
                </div>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className={`px-5 py-2.5 rounded-md font-bold text-sm flex items-center space-x-2 transition-all ${
                isPlaying
                  ? 'bg-[#FF7900] text-white hover:bg-[#E96800]'
                  : 'bg-[#FF7900] text-white hover:bg-[#E96800]'
              } ${!currentTrack ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={onNext}
              className="px-4 py-2.5 rounded-md bg-[#181818] text-white hover:bg-[#282828] border border-[#303030] font-semibold text-sm flex items-center space-x-1.5 transition-colors"
              title="Skip to next track"
            >
              <SkipForward className="w-4 h-4" />
              <span>Next Track</span>
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 space-y-2">
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
            <span>Duration: {formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {/* ==================== C. QUICK ACTIONS ==================== */}
      <div>
        <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider mb-3">
          Quick Actions
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <button
            onClick={() => onNavigate('music')}
            className="p-4 bg-[#202020] hover:bg-[#282828] border border-[#303030] rounded-lg text-left transition-colors flex flex-col justify-between h-24"
          >
            <FolderOpen className="w-5 h-5 text-[#FF7900]" />
            <div>
              <div className="text-sm font-bold text-white">Open Music</div>
              <div className="text-[11px] text-[#A5A5A5]">Browse local PC tracks</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('playlists')}
            className="p-4 bg-[#202020] hover:bg-[#282828] border border-[#303030] rounded-lg text-left transition-colors flex flex-col justify-between h-24"
          >
            <ListPlus className="w-5 h-5 text-[#FF7900]" />
            <div>
              <div className="text-sm font-bold text-white">Create Playlist</div>
              <div className="text-[11px] text-[#A5A5A5]">Manage song rotations</div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('recording')}
            className="p-4 bg-[#202020] hover:bg-[#282828] border border-[#FF7900]/40 rounded-lg text-left transition-colors flex flex-col justify-between h-24 group"
          >
            <Mic className="w-5 h-5 text-[#FF7900] group-hover:scale-110 transition-transform" />
            <div>
              <div className="text-sm font-bold text-white">Mic & Record</div>
              <div className="text-[11px] text-[#A5A5A5]">Voice studio & save to PC</div>
            </div>
          </button>

          <button
            onClick={onToggleAutoDj}
            className="p-4 bg-[#202020] hover:bg-[#282828] border border-[#303030] rounded-lg text-left transition-colors flex flex-col justify-between h-24"
          >
            <Radio className="w-5 h-5 text-[#FF7900]" />
            <div>
              <div className="text-sm font-bold text-white">
                {broadcastMode === 'autodj' ? 'Stop Auto DJ' : 'Start Auto DJ'}
              </div>
              <div className="text-[11px] text-[#A5A5A5]">
                {broadcastMode === 'autodj' ? 'Switch to manual' : 'Non-stop automation'}
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate('broadcast')}
            className="p-4 bg-[#202020] hover:bg-[#282828] border border-[#303030] rounded-lg text-left transition-colors flex flex-col justify-between h-24"
          >
            <Wifi className="w-5 h-5 text-[#FF7900]" />
            <div>
              <div className="text-sm font-bold text-white">Manage Broadcast</div>
              <div className="text-[11px] text-[#A5A5A5]">Streaming server controls</div>
            </div>
          </button>
        </div>
      </div>

      {/* ==================== D. MICROPHONE & RECORDING CONSOLE ==================== */}
      <MicrophoneRecordingConsole />

      {/* ==================== E. RECENTLY PLAYED ==================== */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
            Recently Played
          </div>
          <span className="text-xs text-[#A5A5A5] font-mono">
            {recentlyPlayed.length} Tracks Recorded
          </span>
        </div>

        <div className="divide-y divide-[#303030]">
          {recentlyPlayed.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#A5A5A5]">
              No recently played tracks yet.
            </div>
          ) : (
            recentlyPlayed.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className="py-3 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-8 h-8 rounded bg-[#181818] border border-[#303030] flex items-center justify-center shrink-0 text-[#A5A5A5]">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="font-bold text-white truncate">{log.title}</div>
                    <div className="text-[#A5A5A5] truncate">{log.artist}</div>
                  </div>
                </div>

                <div className="text-right shrink-0 font-mono text-[#A5A5A5]">
                  <div>{formatTime(log.duration)}</div>
                  <div className="text-[10px]">
                    {new Date(log.playedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
