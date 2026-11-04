import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Video, Music } from 'lucide-react';
import { Track } from '../types/radio';
import { OrangeWaveform } from './OrangeWaveform';

interface PlaybackBarProps {
  currentTrack: Track | null;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  isOnAir: boolean;
}

export const PlaybackBar: React.FC<PlaybackBarProps> = ({
  currentTrack,
  isPlaying,
  onTogglePlay,
  onNext,
  onPrevious,
  currentTime,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  broadcastMode,
  isOnAir,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isMp4 = currentTrack?.mediaType === 'mp4' || currentTrack?.filePath?.toLowerCase().endsWith('.mp4');

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 select-none">
      {/* Animated Flowing Orange Radio Waveform at the bottom */}
      <OrangeWaveform isPlaying={isPlaying} height={22} />

      {/* Main Playback Bar Container */}
      <div className="h-20 bg-[#181818] border-t border-[#303030] px-4 sm:px-6 flex items-center justify-between shadow-2xl relative">
        {/* Left: Track Info & Media Type */}
        <div className="flex items-center space-x-3 w-1/4 min-w-[140px] max-w-xs">
          <div className="w-11 h-11 rounded bg-[#202020] border border-[#303030] flex items-center justify-center shrink-0 text-[#FF7900] relative">
            {isMp4 ? (
              <Video className="w-5 h-5 text-[#FF7900]" />
            ) : (
              <Music className="w-5 h-5 text-[#FF7900]" />
            )}
            {currentTrack && (
              <span className="absolute -top-1 -right-1 px-1 bg-[#FF7900] text-black text-[9px] font-bold rounded">
                {isMp4 ? 'MP4' : 'MP3'}
              </span>
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-bold text-white truncate flex items-center space-x-1.5">
              <span className="truncate">{currentTrack ? currentTrack.title : 'Ready for playout'}</span>
            </div>
            <div className="text-xs text-[#A5A5A5] truncate font-mono">
              {currentTrack ? currentTrack.artist : 'Local disk MP3 & MP4 ready'}
            </div>
          </div>
        </div>

        {/* Center: Controls & Progress Bar */}
        <div className="flex-1 max-w-xl mx-4 flex flex-col items-center">
          {/* Buttons */}
          <div className="flex items-center space-x-4 mb-1">
            <button
              onClick={onPrevious}
              className="text-[#A5A5A5] hover:text-white transition-colors p-1"
              title="Previous track"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={onTogglePlay}
              disabled={!currentTrack}
              className={`w-9 h-9 rounded-full bg-[#FF7900] hover:bg-[#E96800] text-white flex items-center justify-center transition-transform shadow-md ${
                !currentTrack ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={onNext}
              className="text-[#A5A5A5] hover:text-white transition-colors p-1"
              title="Next track"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Progress Bar & Timestamps */}
          <div className="w-full flex items-center space-x-3 text-xs font-mono text-[#A5A5A5]">
            <span className="w-10 text-right">{formatTime(currentTime)}</span>
            <div
              className="flex-1 h-1.5 bg-[#303030] rounded-full overflow-hidden cursor-pointer relative"
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
            <span className="w-10">-{formatTime(Math.max(0, duration - currentTime))}</span>
          </div>
        </div>

        {/* Right: Volume & Mode Indicators */}
        <div className="flex items-center space-x-4 w-1/4 justify-end">
          {/* Operating Mode Indicator */}
          <div className="hidden sm:flex items-center space-x-1.5 text-xs">
            <span className="text-[#A5A5A5]">Mode:</span>
            <span className="font-semibold text-white px-2 py-0.5 bg-[#202020] border border-[#303030] rounded text-[11px]">
              {broadcastMode === 'autodj' ? 'Auto DJ' : 'Manual DJ'}
            </span>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center space-x-2 w-28">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.85)}
              className="text-[#A5A5A5] hover:text-white"
            >
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
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
    </div>
  );
};
