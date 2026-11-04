import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Radio,
  Play,
  Pause,
  SkipForward,
  Mic,
  MicOff,
  Volume2,
  Sparkles,
  Clock,
  Headphones,
  Layers,
  Zap,
  CheckCircle2,
  Share2,
  QrCode
} from 'lucide-react';
import { Track, DeckState } from '../types/radio';
import { audioEngine } from '../services/audioEngine';

interface RemoteAndListenerPlayerProps {
  currentTrack: Track | null;
  deckA: DeckState;
  deckB: DeckState;
  isOnAir: boolean;
  setIsOnAir: (onAir: boolean) => void;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  setBroadcastMode: (mode: 'manual' | 'autodj' | 'assisted') => void;
  isMicLive: boolean;
  onToggleMic: () => void;
  onSkipNext: () => void;
  listenerCount: number;
}

export const RemoteAndListenerPlayer: React.FC<RemoteAndListenerPlayerProps> = ({
  currentTrack,
  deckA,
  deckB,
  isOnAir,
  setIsOnAir,
  broadcastMode,
  setBroadcastMode,
  isMicLive,
  onToggleMic,
  onSkipNext,
  listenerCount,
}) => {
  const [listenerPlaying, setListenerPlaying] = useState<boolean>(true);
  const [streamBitrate, setStreamBitrate] = useState<number>(320);
  const [listenerVol, setListenerVol] = useState<number>(0.85);

  const activeDeck = deckA.isPlaying ? deckA : deckB.isPlaying ? deckB : null;
  const nowPlaying = activeDeck?.track || currentTrack;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-6">
      {/* Remote Smartphone Management Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ==================== REMOTE SMARTPHONE CONSOLE ==================== */}
        <div className="lg:col-span-7 bg-[#0f141f] border border-cyan-500/40 rounded-xl p-4 sm:p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center">
                <Smartphone className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">
                  Remote Mobile Command Center
                </h3>
                <p className="text-[11px] text-slate-400">
                  Control broadcast playout from your smartphone or tablet
                </p>
              </div>
            </div>

            {/* Mobile On-Air status */}
            <div
              className={`px-3 py-1 rounded text-xs font-bold font-mono tracking-wider ${
                isOnAir
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isOnAir ? 'LIVE ON AIR' : 'STATION OFF-AIR'}
            </div>
          </div>

          {/* Currently Broadcasting Card */}
          <div className="bg-[#090d14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">
                NOW BROADCASTING ON AIR
              </span>
              <span className="text-xs font-mono text-cyan-400">
                {activeDeck ? `DECK ${activeDeck.deckId}` : 'ROTATION STANDBY'}
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-tr from-amber-600 to-rose-600 flex items-center justify-center text-white shadow-md">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-base text-slate-100 truncate">
                  {nowPlaying ? nowPlaying.title : 'RadioFlow Automation Standby'}
                </h4>
                <p className="text-xs text-slate-400 truncate">
                  {nowPlaying ? `${nowPlaying.artist} • ${nowPlaying.album}` : 'Station ID Cycling'}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            {activeDeck && (
              <div className="space-y-1">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-cyan-400 transition-all duration-300"
                    style={{
                      width: `${(activeDeck.currentTime / (activeDeck.duration || 1)) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>{Math.floor(activeDeck.currentTime)}s</span>
                  <span className="text-amber-400">
                    -{Math.max(0, Math.floor(activeDeck.duration - activeDeck.currentTime))}s remaining
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Remote Touch Controls (Big Tactile Mobile Buttons) */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              onClick={onSkipNext}
              className="py-4 bg-[#141b29] hover:bg-[#1a2336] border border-slate-700 rounded-xl font-bold text-xs text-slate-200 flex flex-col items-center justify-center space-y-1.5 shadow active:scale-95 transition-all"
            >
              <SkipForward className="w-5 h-5 text-amber-400" />
              <span>Next Track / Segue</span>
            </button>

            <button
              onClick={onToggleMic}
              className={`py-4 border rounded-xl font-bold text-xs flex flex-col items-center justify-center space-y-1.5 shadow active:scale-95 transition-all ${
                isMicLive
                  ? 'bg-red-600 border-red-400 text-white shadow-red-600/50 mic-live-blink'
                  : 'bg-[#141b29] hover:bg-[#1a2336] border-slate-700 text-slate-200'
              }`}
            >
              {isMicLive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5 text-slate-400" />}
              <span>{isMicLive ? 'TALK OVER LIVE' : 'Toggle Mic'}</span>
            </button>

            <button
              onClick={() =>
                setBroadcastMode(broadcastMode === 'autodj' ? 'manual' : 'autodj')
              }
              className="py-4 bg-[#141b29] hover:bg-[#1a2336] border border-slate-700 rounded-xl font-bold text-xs text-slate-200 flex flex-col items-center justify-center space-y-1.5 shadow active:scale-95 transition-all"
            >
              <Zap className="w-5 h-5 text-cyan-400" />
              <span>
                {broadcastMode === 'autodj' ? 'Switch to Manual DJ' : 'Engage AutoDJ'}
              </span>
            </button>

            <button
              onClick={() => audioEngine.playProceduralTone('toh-pips')}
              className="py-4 bg-[#141b29] hover:bg-[#1a2336] border border-slate-700 rounded-xl font-bold text-xs text-slate-200 flex flex-col items-center justify-center space-y-1.5 shadow active:scale-95 transition-all"
            >
              <Clock className="w-5 h-5 text-blue-400" />
              <span>Drop TOH Station ID</span>
            </button>
          </div>

          <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded-lg text-xs text-cyan-300 flex items-center justify-between">
            <span>Smartphone Access URL</span>
            <code className="bg-slate-900 px-2 py-0.5 rounded font-mono text-[11px] text-amber-300">
              http://[Your-PC-IP]:3000
            </code>
          </div>
        </div>

        {/* ==================== PUBLIC WEB LISTENER PLAYER PREVIEW ==================== */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#131b2b] to-[#0a0e17] border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Headphones className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Public Listener Web Player
              </h4>
            </div>
            <span className="px-2 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 rounded text-[10px] font-mono">
              Live Stream Preview
            </span>
          </div>

          {/* Player Vinyl & Art */}
          <div className="flex flex-col items-center text-center space-y-3 py-2">
            <div className="relative w-36 h-36">
              {/* Spinning Vinyl Record */}
              <div
                className={`w-full h-full rounded-full bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 border-4 border-slate-800 shadow-2xl flex items-center justify-center ${
                  listenerPlaying && isOnAir ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '4s' }}
              >
                {/* Vinyl Grooves */}
                <div className="w-28 h-28 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full border border-slate-700/60 flex items-center justify-center">
                    {/* Vinyl Center Label */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-inner">
                      <Radio className="w-5 h-5 text-black" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-base text-slate-100">
                {nowPlaying ? nowPlaying.title : 'RADIOFLOW 104.5 HD'}
              </h3>
              <p className="text-xs text-slate-400">
                {nowPlaying ? nowPlaying.artist : 'Pure Sound. Total Automation.'}
              </p>
            </div>

            {/* Listener Audio Waveform Graphic */}
            <div className="flex items-end justify-center space-x-1 h-8 w-48">
              {Array.from({ length: 24 }).map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-cyan-400 rounded-full transition-all duration-150"
                  style={{
                    height: listenerPlaying && isOnAir ? `${Math.max(15, (Math.sin(i * 0.5 + Date.now() * 0.005) * 0.5 + 0.5) * 100)}%` : '15%',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Listener Stream Controls */}
          <div className="bg-[#090d14] p-3 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setListenerPlaying(!listenerPlaying)}
                className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all shadow ${
                  listenerPlaying
                    ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500'
                }`}
              >
                {listenerPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Listening Live</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Stream</span>
                  </>
                )}
              </button>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-semibold text-slate-200">{listenerCount}</span>
                <span>listening</span>
              </div>
            </div>

            {/* Bitrate Selector */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">Audio Quality:</span>
              <div className="flex space-x-1">
                {[320, 128, 64].map((br) => (
                  <button
                    key={br}
                    onClick={() => setStreamBitrate(br)}
                    className={`px-2 py-0.5 rounded font-mono ${
                      streamBitrate === br
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {br}k
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
