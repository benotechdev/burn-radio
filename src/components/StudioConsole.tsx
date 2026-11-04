import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Zap,
  Volume2,
  Mic,
  Disc,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Music,
  Radio,
  Clock,
  Layers,
  ArrowDownUp,
  Flame,
  VolumeX,
  Plus
} from 'lucide-react';
import { Track, DeckState, CartPad, PlaylistItem, MusicCategory } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { getTrackPlayableUrl } from '../services/localFileManager';

interface StudioConsoleProps {
  deckA: DeckState;
  setDeckA: React.Dispatch<React.SetStateAction<DeckState>>;
  deckB: DeckState;
  setDeckB: React.Dispatch<React.SetStateAction<DeckState>>;
  crossfaderPos: number; // -1 to 1
  setCrossfaderPos: (pos: number) => void;
  crossfadeCurve: 'broadcast-dip' | 'constant-power' | 'linear';
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  isMicLive: boolean;
  onToggleMic: () => void;
  queue: PlaylistItem[];
  setQueue: React.Dispatch<React.SetStateAction<PlaylistItem[]>>;
  allTracks: Track[];
  onTrackFinished: (deckId: 'A' | 'B') => void;
}

export const StudioConsole: React.FC<StudioConsoleProps> = ({
  deckA,
  setDeckA,
  deckB,
  setDeckB,
  crossfaderPos,
  setCrossfaderPos,
  crossfadeCurve,
  broadcastMode,
  isMicLive,
  onToggleMic,
  queue,
  setQueue,
  allTracks,
  onTrackFinished,
}) => {
  // Master VU levels updated via requestAnimationFrame
  const [masterLevels, setMasterLevels] = useState<{ level: number; peak: number }>({ level: 0, peak: 0 });
  const [micLevel, setMicLevel] = useState<number>(0);

  // VirtualDJ Pro Mixing Features State
  const [hotCuesA, setHotCuesA] = useState<{ [key: number]: number }>({});
  const [hotCuesB, setHotCuesB] = useState<{ [key: number]: number }>({});
  const [pitchA, setPitchA] = useState<number>(0);
  const [pitchB, setPitchB] = useState<number>(0);
  const [loopA, setLoopA] = useState<boolean>(false);
  const [loopB, setLoopB] = useState<boolean>(false);
  const [effectA, setEffectA] = useState<string>('none');
  const [effectB, setEffectB] = useState<string>('none');

  const handleHotCue = (deck: 'A' | 'B', index: number) => {
    const currentDeck = deck === 'A' ? deckA : deckB;
    const cues = deck === 'A' ? hotCuesA : hotCuesB;
    const setCues = deck === 'A' ? setHotCuesA : setHotCuesB;

    if (cues[index] !== undefined && cues[index] > 0) {
      audioEngine.seek(deck, cues[index]);
      if (deck === 'A') {
        setDeckA(prev => ({ ...prev, currentTime: cues[index] }));
      } else {
        setDeckB(prev => ({ ...prev, currentTime: cues[index] }));
      }
    } else {
      setCues(prev => ({ ...prev, [index]: currentDeck.currentTime }));
    }
  };

  const handlePitchChangeVal = (deck: 'A' | 'B', val: number) => {
    if (deck === 'A') {
      setPitchA(val);
      audioEngine.setPitch('A', val);
      setDeckA(prev => ({ ...prev, pitch: val }));
    } else {
      setPitchB(val);
      audioEngine.setPitch('B', val);
      setDeckB(prev => ({ ...prev, pitch: val }));
    }
  };

  // Professional Scratch & Vinyl Brake State
  const [scratchingDeck, setScratchingDeck] = useState<'A' | 'B' | null>(null);
  const lastMouseXRef = useRef<number>(0);

  const handleScratchStart = (deck: 'A' | 'B', e: React.MouseEvent | React.TouchEvent) => {
    setScratchingDeck(deck);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    lastMouseXRef.current = clientX;
  };

  const handleScratchMove = (deck: 'A' | 'B', e: React.MouseEvent | React.TouchEvent) => {
    if (scratchingDeck !== deck) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const deltaX = clientX - lastMouseXRef.current;
    lastMouseXRef.current = clientX;

    const currentDeck = deck === 'A' ? deckA : deckB;
    const newTime = Math.max(0, currentDeck.currentTime + deltaX * 0.04);
    audioEngine.seek(deck, newTime);
    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, currentTime: newTime }));
    } else {
      setDeckB(prev => ({ ...prev, currentTime: newTime }));
    }
  };

  const handleScratchEnd = () => {
    setScratchingDeck(null);
  };

  const handleVinylBrake = (deck: 'A' | 'B') => {
    let rate = 1.0;
    const interval = setInterval(() => {
      rate -= 0.15;
      if (rate <= 0.1) {
        clearInterval(interval);
        if (deck === 'A') {
          audioEngine.pause('A');
          setDeckA(prev => ({ ...prev, isPlaying: false }));
        } else {
          audioEngine.pause('B');
          setDeckB(prev => ({ ...prev, isPlaying: false }));
        }
        audioEngine.setPitch(deck, 0);
      } else {
        audioEngine.setPitch(deck, (rate - 1) * 100);
      }
    }, 120);
  };

  // Cart Wall state (12 instant broadcast pads)
  const [carts, setCarts] = useState<CartPad[]>([
    { id: 'cart-1', slot: 1, label: 'RADIOFLOW ID', sublabel: 'Station Chime', color: 'bg-rose-600', category: 'Station ID', hotkey: '1', track: allTracks[5] || null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-2', slot: 2, label: 'LASER SWEEP', sublabel: 'FM Sweeper', color: 'bg-amber-600', category: 'Jingle / Sweeper', hotkey: '2', track: allTracks[6] || null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-3', slot: 3, label: 'SUB DROP 808', sublabel: 'Boom Impact', color: 'bg-purple-600', category: 'Jingle / Sweeper', hotkey: '3', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-4', slot: 4, label: 'WEEKEND PROMO', sublabel: '30s Promo', color: 'bg-emerald-600', category: 'Promo', hotkey: '4', track: allTracks[7] || null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-5', slot: 5, label: 'TOP OF HOUR', sublabel: '1kHz Pips', color: 'bg-blue-600', category: 'Station ID', hotkey: '5', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-6', slot: 6, label: 'NEWS STINGER', sublabel: 'Breaking Alert', color: 'bg-red-700', category: 'News / Weather', hotkey: '6', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-7', slot: 7, label: 'WEATHER BED', sublabel: 'Acoustic Loop', color: 'bg-teal-600', category: 'Ad Spot', hotkey: '7', track: null, playMode: 'loop', isPlaying: false, volume: 0.8 },
    { id: 'cart-8', slot: 8, label: 'PHONE DROP', sublabel: 'Caller Intro', color: 'bg-yellow-600', category: 'Jingle / Sweeper', hotkey: '8', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-9', slot: 9, label: 'APPLAUSE FX', sublabel: 'Live Crowd', color: 'bg-indigo-600', category: 'Jingle / Sweeper', hotkey: '9', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-10', slot: 10, label: 'TALK BED CHILL', sublabel: '110 BPM Synth', color: 'bg-cyan-700', category: 'Promo', hotkey: 'Q', track: null, playMode: 'loop', isPlaying: false, volume: 0.7 },
    { id: 'cart-11', slot: 11, label: 'VINYL SCRATCH', sublabel: 'Backspin', color: 'bg-fuchsia-600', category: 'Jingle / Sweeper', hotkey: 'W', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
    { id: 'cart-12', slot: 12, label: 'EMERGENCY ID', sublabel: 'Legal Station ID', color: 'bg-zinc-700', category: 'Station ID', hotkey: 'E', track: null, playMode: 'trigger', isPlaying: false, volume: 1.0 },
  ]);

  // Sync keyboard shortcuts for cart wall
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const key = e.key.toUpperCase();
      const pad = carts.find((c) => c.hotkey === key);
      if (pad) {
        handleFireCart(pad.id);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [carts]);

  // Audio animation frame loop for VU meters & playback times
  useEffect(() => {
    let animId: number;
    const updateVUMeters = () => {
      const mLevels = audioEngine.getLevels('master');
      const aLevels = audioEngine.getLevels('A');
      const bLevels = audioEngine.getLevels('B');
      const micLevels = audioEngine.getLevels('mic');

      setMasterLevels(mLevels);
      setMicLevel(micLevels.level);

      // Update Deck A time if playing
      const audioA = audioEngine.getAudioElement('A');
      if (audioA && deckA.isPlaying) {
        setDeckA((prev) => ({
          ...prev,
          currentTime: audioA.currentTime,
          duration: audioA.duration || prev.duration,
          vuLevelL: aLevels.level,
          vuLevelR: aLevels.level * 0.95,
          peakL: aLevels.peak,
          peakR: aLevels.peak * 0.95,
        }));

        // Check if next trigger reached in AutoDJ or Assisted mode
        if (
          (broadcastMode === 'autodj' || broadcastMode === 'assisted') &&
          deckA.track &&
          audioA.currentTime >= deckA.track.cuePoints.nextTrigger
        ) {
          // Trigger next deck
          onTrackFinished('A');
        }
      }

      // Update Deck B time if playing
      const audioB = audioEngine.getAudioElement('B');
      if (audioB && deckB.isPlaying) {
        setDeckB((prev) => ({
          ...prev,
          currentTime: audioB.currentTime,
          duration: audioB.duration || prev.duration,
          vuLevelL: bLevels.level,
          vuLevelR: bLevels.level * 0.95,
          peakL: bLevels.peak,
          peakR: bLevels.peak * 0.95,
        }));

        if (
          (broadcastMode === 'autodj' || broadcastMode === 'assisted') &&
          deckB.track &&
          audioB.currentTime >= deckB.track.cuePoints.nextTrigger
        ) {
          onTrackFinished('B');
        }
      }

      animId = requestAnimationFrame(updateVUMeters);
    };

    animId = requestAnimationFrame(updateVUMeters);
    return () => cancelAnimationFrame(animId);
  }, [deckA.isPlaying, deckB.isPlaying, broadcastMode, deckA.track, deckB.track]);

  // Auto crossfade animation helper
  const autoFadeTo = (targetPos: number, durationMs = 3500) => {
    const startPos = crossfaderPos;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // Smooth sinusoidal ease
      const ease = (1 - Math.cos(progress * Math.PI)) / 2;
      const newPos = startPos + (targetPos - startPos) * ease;
      setCrossfaderPos(newPos);
      audioEngine.setCrossfader(newPos, crossfadeCurve);

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  const handlePlayDeck = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;

    if (!deck.track) return;

    if (deck.isPlaying) {
      audioEngine.pause(deckId);
      setDeck((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audioEngine.play(deckId);
      setDeck((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  const handleCueDeck = (deckId: 'A' | 'B') => {
    const deck = deckId === 'A' ? deckA : deckB;
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;

    if (!deck.track) return;
    const cuePoint = deck.track.cuePoints.cueIn || 0;
    audioEngine.seek(deckId, cuePoint);
    audioEngine.pause(deckId);
    setDeck((prev) => ({ ...prev, currentTime: cuePoint, isPlaying: false, isCueing: true }));
  };

  const handlePitchChange = (deckId: 'A' | 'B', pitch: number) => {
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;
    audioEngine.setPitch(deckId, pitch);
    setDeck((prev) => ({ ...prev, pitch }));
  };

  const handleEqChange = (deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', val: number) => {
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;
    audioEngine.setEq(deckId, band, val);
    setDeck((prev) => ({
      ...prev,
      [band === 'low' ? 'eqLow' : band === 'mid' ? 'eqMid' : 'eqHigh']: val,
    }));
  };

  const handleVolumeChange = (deckId: 'A' | 'B', vol: number) => {
    const setDeck = deckId === 'A' ? setDeckA : setDeckB;
    audioEngine.setVolume(deckId, vol);
    setDeck((prev) => ({ ...prev, volume: vol }));
  };

  const handleFireCart = (cartId: string) => {
    const cart = carts.find((c) => c.id === cartId);
    if (!cart) return;

    // Trigger visual pulse
    setCarts((prev) =>
      prev.map((c) => (c.id === cartId ? { ...c, isPlaying: true } : c))
    );

    // Procedural fallback tones if cart has no local file
    if (cart.slot === 5 || cart.label.includes('TOP OF HOUR')) {
      audioEngine.playProceduralTone('toh-pips');
    } else if (cart.slot === 2 || cart.label.includes('SWEEP')) {
      audioEngine.playProceduralTone('sweeper');
    } else if (cart.slot === 3 || cart.label.includes('808')) {
      audioEngine.playProceduralTone('sub-drop');
    } else {
      audioEngine.playProceduralTone('stager');
    }

    setTimeout(() => {
      setCarts((prev) =>
        prev.map((c) => (c.id === cartId ? { ...c, isPlaying: false } : c))
      );
    }, 2500);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) seconds = 0;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Render VU meter LED bars
  const renderVUMeter = (level: number, peak: number, height = 90) => {
    const numBars = 16;
    const activeBars = Math.round(level * numBars);
    const peakBar = Math.round(peak * numBars);

    return (
      <div className="flex flex-col-reverse gap-0.5 h-full w-2.5 bg-slate-950 p-0.5 rounded border border-slate-800">
        {Array.from({ length: numBars }).map((_, idx) => {
          const isGreen = idx < 10;
          const isYellow = idx >= 10 && idx < 13;
          const isRed = idx >= 13;
          const isActive = idx < activeBars;
          const isPeak = idx === peakBar - 1;

          let colorClass = 'bg-slate-800';
          if (isActive) {
            colorClass = isRed ? 'bg-red-500 shadow-sm shadow-red-500' : isYellow ? 'bg-amber-400' : 'bg-emerald-500';
          } else if (isPeak) {
            colorClass = isRed ? 'bg-red-400' : isYellow ? 'bg-amber-300' : 'bg-emerald-400';
          }

          return (
            <div
              key={idx}
              className={`w-full h-1 rounded-xs transition-colors duration-75 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Studio Decks & Master Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* ==================== DECK A (Amber Theme) ==================== */}
        <div className="lg:col-span-5 bg-[#0f141f] border-2 border-amber-500/40 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
          {/* Deck Header Badge */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded bg-amber-500 text-black font-extrabold flex items-center justify-center text-sm shadow">
                A
              </span>
              <div>
                <span className="text-xs font-bold tracking-wider text-amber-400 uppercase">
                  Broadcast Deck A
                </span>
                <span className="text-[10px] text-slate-400 ml-2">
                  {deckA.track ? deckA.track.category : 'No Track Loaded'}
                </span>
              </div>
            </div>

            {deckA.track && (
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                  {deckA.track.bpm} BPM
                </span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                  KEY {deckA.track.musicalKey || 'Am'}
                </span>
              </div>
            )}
          </div>

          {/* Track Details & Digital Displays */}
          <div className="space-y-2 mb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                {deckA.track ? deckA.track.title : 'Deck Empty – Load track from library'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {deckA.track ? `${deckA.track.artist} • ${deckA.track.album}` : 'Ready for playout'}
              </p>
            </div>

            {/* LED Time Displays */}
            <div className="grid grid-cols-3 gap-2 bg-[#090d14] p-2 rounded-lg border border-slate-800">
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">
                  Elapsed
                </span>
                <span className="text-sm sm:text-lg font-bold font-mono text-slate-200">
                  {formatTime(deckA.currentTime)}
                </span>
              </div>
              <div className="text-center border-x border-slate-800">
                <span className="text-[9px] uppercase tracking-wider text-amber-400 block font-mono">
                  Remaining
                </span>
                <span className="text-sm sm:text-lg font-bold font-mono text-amber-400">
                  -{formatTime(Math.max(0, deckA.duration - deckA.currentTime))}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-wider text-purple-400 block font-mono">
                  Vocal Ramp
                </span>
                <span className="text-xs sm:text-sm font-semibold font-mono text-purple-300">
                  {deckA.track && deckA.currentTime < deckA.track.cuePoints.rampIntro
                    ? `${(deckA.track.cuePoints.rampIntro - deckA.currentTime).toFixed(1)}s`
                    : 'PASS'}
                </span>
              </div>
            </div>
          </div>

          {/* Waveform Visualizer & Scrub Bar */}
          <div className="bg-[#090c13] border border-slate-800 rounded-lg p-2 mb-3 relative">
            <div
              className="h-16 flex items-end justify-between gap-[2px] cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const seekSec = pos * (deckA.duration || 180);
                audioEngine.seek('A', seekSec);
                setDeckA((prev) => ({ ...prev, currentTime: seekSec }));
              }}
            >
              {/* Peaks display */}
              {(deckA.track?.waveformPeaks || Array.from({ length: 60 }).map(() => 0.3)).map(
                (peak, idx, arr) => {
                  const progress = (deckA.currentTime / (deckA.duration || 1)) * arr.length;
                  const isPlayed = idx <= progress;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(10, peak * 100)}%` }}
                      className={`flex-1 rounded-t-xs transition-colors ${
                        isPlayed ? 'bg-amber-400 shadow-sm shadow-amber-400/50' : 'bg-slate-700/60'
                      }`}
                    />
                  );
                }
              )}

              {/* Playhead Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md shadow-white pointer-events-none"
                style={{
                  left: `${(deckA.currentTime / (deckA.duration || 180)) * 100}%`,
                }}
              />
            </div>

            {/* Cue Markers labels */}
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1">
              <span className="text-emerald-400">CUE: {deckA.track?.cuePoints.cueIn || 0}s</span>
              <span className="text-purple-400">RAMP: {deckA.track?.cuePoints.rampIntro || 0}s</span>
              <span className="text-rose-400">FADE: {deckA.track?.cuePoints.outroFade || 0}s</span>
            </div>
          </div>

          {/* Deck Controls & Mixer Channel */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
            {/* Play & Cue buttons */}
            <div className="col-span-5 flex items-center space-x-2">
              <button
                onClick={() => handleCueDeck('A')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg border border-slate-700 shadow flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CUE</span>
              </button>

              <button
                onClick={() => handlePlayDeck('A')}
                disabled={!deckA.track}
                className={`flex-2 py-3 font-bold text-xs rounded-lg shadow-lg flex items-center justify-center space-x-1.5 transition-all ${
                  deckA.isPlaying
                    ? 'bg-amber-500 text-black shadow-amber-500/40 hover:bg-amber-400'
                    : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                }`}
              >
                {deckA.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>PLAY</span>
                  </>
                )}
              </button>
            </div>

            {/* 3-Band Parametric EQ Knobs / Sliders */}
            <div className="col-span-4 grid grid-cols-3 gap-1 bg-[#090d14] p-1.5 rounded-lg border border-slate-800 text-center">
              <div>
                <span className="text-[8px] font-mono text-slate-400">HI</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckA.eqHigh}
                  onChange={(e) => handleEqChange('A', 'high', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('A', 'high', deckA.eqHigh === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckA.eqHigh === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>

              <div>
                <span className="text-[8px] font-mono text-slate-400">MID</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckA.eqMid}
                  onChange={(e) => handleEqChange('A', 'mid', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('A', 'mid', deckA.eqMid === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckA.eqMid === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>

              <div>
                <span className="text-[8px] font-mono text-slate-400">LOW</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckA.eqLow}
                  onChange={(e) => handleEqChange('A', 'low', parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('A', 'low', deckA.eqLow === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckA.eqLow === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>
            </div>

            {/* Deck Volume & VU meters */}
            <div className="col-span-3 flex items-center justify-end space-x-2">
              {renderVUMeter(deckA.vuLevelL, deckA.peakL)}
              {renderVUMeter(deckA.vuLevelR, deckA.peakR)}

              <div className="flex flex-col items-center">
                <span className="text-[8px] font-mono text-slate-400">FADER</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={deckA.volume}
                  onChange={(e) => handleVolumeChange('A', parseFloat(e.target.value))}
                  className="h-16 w-2 accent-amber-500 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================== MASTER MIXER & BROADCAST CONTROLS (Center) ==================== */}
        <div className="lg:col-span-2 bg-[#090d15] border border-slate-800 rounded-xl p-3 flex flex-col justify-between shadow-xl">
          <div className="text-center border-b border-slate-800/80 pb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
              Master Console
            </span>
          </div>

          {/* Master Output VU Meter */}
          <div className="flex justify-center items-center space-x-2 my-2 py-2 bg-[#05070a] rounded-lg border border-slate-800">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-slate-500">PGM L</span>
              <div className="h-24">
                {renderVUMeter(masterLevels.level, masterLevels.peak)}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-mono text-slate-500">PGM R</span>
              <div className="h-24">
                {renderVUMeter(masterLevels.level * 0.96, masterLevels.peak * 0.96)}
              </div>
            </div>
          </div>

          {/* Live DJ Mic Button with Auto-Ducking */}
          <div className="space-y-1 mb-2">
            <button
              onClick={onToggleMic}
              className={`w-full py-2.5 rounded-lg font-bold text-xs flex items-center justify-center space-x-1.5 transition-all shadow-md ${
                isMicLive
                  ? 'bg-red-600 text-white shadow-red-600/50 mic-live-blink border border-red-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              <Mic className="w-4 h-4" />
              <span>{isMicLive ? 'MIC ACTIVE (DUCKED)' : 'TALK / MIC OVER'}</span>
            </button>
            {isMicLive && (
              <p className="text-[9px] text-amber-400 text-center font-mono">
                Decks ducked -15dB automatically
              </p>
            )}
          </div>

          {/* Crossfader Section */}
          <div className="bg-[#0f141f] p-2 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-amber-400">DECK A</span>
              <span className="text-slate-400">X-FADE</span>
              <span className="text-cyan-400">DECK B</span>
            </div>

            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={crossfaderPos}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setCrossfaderPos(val);
                audioEngine.setCrossfader(val, crossfadeCurve);
              }}
              className="w-full dj-fader h-5"
            />

            {/* Auto-Crossfade Action Triggers */}
            <div className="grid grid-cols-2 gap-1 pt-1">
              <button
                onClick={() => autoFadeTo(-1)}
                className="py-1 px-1 bg-amber-950/40 text-amber-300 border border-amber-800/60 rounded text-[10px] font-semibold hover:bg-amber-900/40"
              >
                &lt; FADE A
              </button>
              <button
                onClick={() => autoFadeTo(1)}
                className="py-1 px-1 bg-cyan-950/40 text-cyan-300 border border-cyan-800/60 rounded text-[10px] font-semibold hover:bg-cyan-900/40"
              >
                FADE B &gt;
              </button>
            </div>
          </div>

          {/* Instant Sweeper & TOH Chimes */}
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            <button
              onClick={() => audioEngine.playProceduralTone('toh-pips')}
              className="py-1.5 bg-blue-900/30 text-blue-300 border border-blue-700/50 rounded text-[10px] font-semibold flex items-center justify-center space-x-1 hover:bg-blue-800/30"
              title="BBC/NPR 1kHz Top of Hour Time Signal"
            >
              <Clock className="w-3 h-3" />
              <span>TOH Pips</span>
            </button>
            <button
              onClick={() => audioEngine.playProceduralTone('sweeper')}
              className="py-1.5 bg-purple-900/30 text-purple-300 border border-purple-700/50 rounded text-[10px] font-semibold flex items-center justify-center space-x-1 hover:bg-purple-800/30"
              title="FM Radio Laser Sweeper Stinger"
            >
              <Sparkles className="w-3 h-3" />
              <span>Sweeper</span>
            </button>
          </div>
        </div>

        {/* ==================== DECK B (Cyan Theme) ==================== */}
        <div className="lg:col-span-5 bg-[#0f141f] border-2 border-cyan-500/40 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between relative overflow-hidden">
          {/* Deck Header Badge */}
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <span className="w-7 h-7 rounded bg-cyan-500 text-black font-extrabold flex items-center justify-center text-sm shadow">
                B
              </span>
              <div>
                <span className="text-xs font-bold tracking-wider text-cyan-400 uppercase">
                  Broadcast Deck B
                </span>
                <span className="text-[10px] text-slate-400 ml-2">
                  {deckB.track ? deckB.track.category : 'No Track Loaded'}
                </span>
              </div>
            </div>

            {deckB.track && (
              <div className="flex items-center space-x-2 text-[11px] font-mono">
                <span className="px-1.5 py-0.5 bg-slate-800 text-cyan-300 rounded border border-slate-700">
                  {deckB.track.bpm} BPM
                </span>
                <span className="px-1.5 py-0.5 bg-slate-800 text-amber-300 rounded border border-slate-700">
                  KEY {deckB.track.musicalKey || 'Dm'}
                </span>
              </div>
            )}
          </div>

          {/* Track Details & Digital Displays */}
          <div className="space-y-2 mb-3">
            <div>
              <h3 className="font-bold text-sm sm:text-base text-slate-100 truncate">
                {deckB.track ? deckB.track.title : 'Deck Empty – Load track from library'}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {deckB.track ? `${deckB.track.artist} • ${deckB.track.album}` : 'Ready for playout'}
              </p>
            </div>

            {/* LED Time Displays */}
            <div className="grid grid-cols-3 gap-2 bg-[#090d14] p-2 rounded-lg border border-slate-800">
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-mono">
                  Elapsed
                </span>
                <span className="text-sm sm:text-lg font-bold font-mono text-slate-200">
                  {formatTime(deckB.currentTime)}
                </span>
              </div>
              <div className="text-center border-x border-slate-800">
                <span className="text-[9px] uppercase tracking-wider text-cyan-400 block font-mono">
                  Remaining
                </span>
                <span className="text-sm sm:text-lg font-bold font-mono text-cyan-400">
                  -{formatTime(Math.max(0, deckB.duration - deckB.currentTime))}
                </span>
              </div>
              <div className="text-center">
                <span className="text-[9px] uppercase tracking-wider text-purple-400 block font-mono">
                  Vocal Ramp
                </span>
                <span className="text-xs sm:text-sm font-semibold font-mono text-purple-300">
                  {deckB.track && deckB.currentTime < deckB.track.cuePoints.rampIntro
                    ? `${(deckB.track.cuePoints.rampIntro - deckB.currentTime).toFixed(1)}s`
                    : 'PASS'}
                </span>
              </div>
            </div>
          </div>

          {/* Waveform Visualizer & Scrub Bar */}
          <div className="bg-[#090c13] border border-slate-800 rounded-lg p-2 mb-3 relative">
            <div
              className="h-16 flex items-end justify-between gap-[2px] cursor-pointer relative"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = (e.clientX - rect.left) / rect.width;
                const seekSec = pos * (deckB.duration || 180);
                audioEngine.seek('B', seekSec);
                setDeckB((prev) => ({ ...prev, currentTime: seekSec }));
              }}
            >
              {/* Peaks display */}
              {(deckB.track?.waveformPeaks || Array.from({ length: 60 }).map(() => 0.3)).map(
                (peak, idx, arr) => {
                  const progress = (deckB.currentTime / (deckB.duration || 1)) * arr.length;
                  const isPlayed = idx <= progress;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(10, peak * 100)}%` }}
                      className={`flex-1 rounded-t-xs transition-colors ${
                        isPlayed ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50' : 'bg-slate-700/60'
                      }`}
                    />
                  );
                }
              )}

              {/* Playhead Indicator */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md shadow-white pointer-events-none"
                style={{
                  left: `${(deckB.currentTime / (deckB.duration || 180)) * 100}%`,
                }}
              />
            </div>

            {/* Cue Markers labels */}
            <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 mt-1">
              <span className="text-emerald-400">CUE: {deckB.track?.cuePoints.cueIn || 0}s</span>
              <span className="text-purple-400">RAMP: {deckB.track?.cuePoints.rampIntro || 0}s</span>
              <span className="text-rose-400">FADE: {deckB.track?.cuePoints.outroFade || 0}s</span>
            </div>
          </div>

          {/* Deck Controls & Mixer Channel */}
          <div className="grid grid-cols-12 gap-2 sm:gap-3 items-center">
            {/* Play & Cue buttons */}
            <div className="col-span-5 flex items-center space-x-2">
              <button
                onClick={() => handleCueDeck('B')}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs rounded-lg border border-slate-700 shadow flex items-center justify-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>CUE</span>
              </button>

              <button
                onClick={() => handlePlayDeck('B')}
                disabled={!deckB.track}
                className={`flex-2 py-3 font-bold text-xs rounded-lg shadow-lg flex items-center justify-center space-x-1.5 transition-all ${
                  deckB.isPlaying
                    ? 'bg-cyan-500 text-black shadow-cyan-500/40 hover:bg-cyan-400'
                    : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-500'
                }`}
              >
                {deckB.isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>PAUSE</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>PLAY</span>
                  </>
                )}
              </button>
            </div>

            {/* 3-Band Parametric EQ Knobs / Sliders */}
            <div className="col-span-4 grid grid-cols-3 gap-1 bg-[#090d14] p-1.5 rounded-lg border border-slate-800 text-center">
              <div>
                <span className="text-[8px] font-mono text-slate-400">HI</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckB.eqHigh}
                  onChange={(e) => handleEqChange('B', 'high', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('B', 'high', deckB.eqHigh === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckB.eqHigh === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>

              <div>
                <span className="text-[8px] font-mono text-slate-400">MID</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckB.eqMid}
                  onChange={(e) => handleEqChange('B', 'mid', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('B', 'mid', deckB.eqMid === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckB.eqMid === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>

              <div>
                <span className="text-[8px] font-mono text-slate-400">LOW</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  value={deckB.eqLow}
                  onChange={(e) => handleEqChange('B', 'low', parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 h-1 cursor-pointer"
                />
                <button
                  onClick={() => handleEqChange('B', 'low', deckB.eqLow === -12 ? 0 : -12)}
                  className={`text-[8px] px-1 rounded mt-0.5 ${
                    deckB.eqLow === -12 ? 'bg-red-600 text-white font-bold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  KILL
                </button>
              </div>
            </div>

            {/* Deck Volume & VU meters */}
            <div className="col-span-3 flex items-center justify-end space-x-2">
              {renderVUMeter(deckB.vuLevelL, deckB.peakL)}
              {renderVUMeter(deckB.vuLevelR, deckB.peakR)}

              <div className="flex flex-col items-center">
                <span className="text-[8px] font-mono text-slate-400">FADER</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={deckB.volume}
                  onChange={(e) => handleVolumeChange('B', parseFloat(e.target.value))}
                  className="h-16 w-2 accent-cyan-500 cursor-pointer"
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Wall / Instant Jingles Soundboard & Playout Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* ==================== CART WALL (Instant Soundboard) ==================== */}
        <div className="lg:col-span-8 bg-[#0f141f] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Instant Cart Wall (Hotkeys 1-9, Q, W, E)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Zero-latency broadcast cartridges
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {carts.map((cart) => (
              <button
                key={cart.id}
                onClick={() => handleFireCart(cart.id)}
                className={`relative p-2.5 rounded-lg border text-left transition-all duration-150 flex flex-col justify-between h-20 shadow select-none ${
                  cart.isPlaying
                    ? 'ring-2 ring-white scale-[1.02] shadow-lg ' + cart.color
                    : 'bg-[#090d14] border-slate-800 hover:border-slate-600 hover:bg-[#141b29]'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={`text-[9px] font-mono px-1 py-0.5 rounded font-bold ${
                      cart.isPlaying ? 'bg-black/60 text-white' : 'bg-slate-800 text-amber-300'
                    }`}
                  >
                    [{cart.hotkey}]
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cart.isPlaying ? 'bg-white animate-ping' : 'bg-slate-600'
                    }`}
                  />
                </div>

                <div>
                  <div
                    className={`font-bold text-xs leading-tight truncate ${
                      cart.isPlaying ? 'text-white' : 'text-slate-200'
                    }`}
                  >
                    {cart.label}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">{cart.sublabel}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ==================== UP NEXT PLAYOUT QUEUE ==================== */}
        <div className="lg:col-span-4 bg-[#0f141f] border border-slate-800 rounded-xl p-3 sm:p-4 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Playout Queue ({queue.length})
              </h4>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono uppercase">
              {broadcastMode === 'autodj' ? 'Auto-Rotating' : 'Manual Queue'}
            </span>
          </div>

          {/* Queue items */}
          <div className="space-y-1.5 overflow-y-auto max-h-48 pr-1">
            {queue.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs">
                Queue is empty. Songs from the local library will auto-populate.
              </div>
            ) : (
              queue.slice(0, 6).map((item, index) => (
                <div
                  key={item.queueId}
                  className="flex items-center justify-between p-2 bg-[#090d14] border border-slate-800/80 rounded-lg hover:border-slate-700 text-xs transition-colors"
                >
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <span className="w-4 text-[10px] text-slate-500 font-mono text-center">
                      {index + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-slate-200 truncate">{item.track.title}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {item.track.artist} • {formatTime(item.track.duration)}
                      </p>
                    </div>
                  </div>

                  {/* Move to Deck quick action */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={async () => {
                        const url = await getTrackPlayableUrl(item.track);
                        if (!url) return;
                        audioEngine.loadTrack('A', url);
                        setDeckA((prev) => ({
                          ...prev,
                          track: item.track,
                          currentTime: item.track.cuePoints.cueIn,
                          duration: item.track.duration,
                          isPlaying: false,
                        }));
                      }}
                      title="Load to Deck A"
                      className="px-1.5 py-0.5 bg-amber-950/40 text-amber-300 border border-amber-800/60 rounded text-[9px] hover:bg-amber-900/50"
                    >
                      &gt; A
                    </button>
                    <button
                      onClick={async () => {
                        const url = await getTrackPlayableUrl(item.track);
                        if (!url) return;
                        audioEngine.loadTrack('B', url);
                        setDeckB((prev) => ({
                          ...prev,
                          track: item.track,
                          currentTime: item.track.cuePoints.cueIn,
                          duration: item.track.duration,
                          isPlaying: false,
                        }));
                      }}
                      title="Load to Deck B"
                      className="px-1.5 py-0.5 bg-cyan-950/40 text-cyan-300 border border-cyan-800/60 rounded text-[9px] hover:bg-cyan-900/50"
                    >
                      &gt; B
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-800/80 mt-2 flex justify-between items-center text-[10px] text-slate-400">
            <span>Next Segue: AutoDJ Crossfade 3.5s</span>
            <button
              onClick={() => {
                if (allTracks.length > 0) {
                  const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
                  setQueue((prev) => [
                    ...prev,
                    { queueId: `q-${Date.now()}`, track: randomTrack },
                  ]);
                }
              }}
              className="text-amber-400 hover:text-amber-300 font-semibold flex items-center space-x-1"
            >
              <Plus className="w-3 h-3" />
              <span>Add Track</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
