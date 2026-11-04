import React, { useState } from 'react';
import {
  Activity,
  Clock,
  Sliders,
  ShieldCheck,
  Zap,
  RotateCw,
  Check,
  PieChart,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { AutoDJSettings, MusicCategory } from '../types/radio';

interface AutoDJManagerProps {
  settings: AutoDJSettings;
  setSettings: React.Dispatch<React.SetStateAction<AutoDJSettings>>;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  setBroadcastMode: (mode: 'manual' | 'autodj' | 'assisted') => void;
}

export const AutoDJManager: React.FC<AutoDJManagerProps> = ({
  settings,
  setSettings,
  broadcastMode,
  setBroadcastMode,
}) => {
  const [activePreset, setActivePreset] = useState<'hot-ac' | 'dance-electronic' | 'indie-rock' | 'chillout'>('hot-ac');

  // Category rotation weights
  const [weights, setWeights] = useState<{ [key in MusicCategory]?: number }>({
    'Power Current': 40,
    'Recurrent': 25,
    'Classic Gold': 15,
    'Jingle / Sweeper': 10,
    'Station ID': 5,
    'Promo': 5,
  });

  const clockSegments = [
    { start: '00:00', end: '00:15', label: 'Top of Hour Legal ID', color: 'bg-rose-500', cat: 'Station ID' },
    { start: '00:15', end: '03:45', label: 'Power Current #1', color: 'bg-amber-500', cat: 'Power Current' },
    { start: '03:45', end: '07:15', label: 'Power Current #2', color: 'bg-amber-500', cat: 'Power Current' },
    { start: '07:15', end: '07:30', label: 'Station Sweeper', color: 'bg-purple-500', cat: 'Jingle / Sweeper' },
    { start: '07:30', end: '11:00', label: 'Recurrent Hit', color: 'bg-cyan-500', cat: 'Recurrent' },
    { start: '11:00', end: '15:00', label: 'Classic Gold', color: 'bg-emerald-500', cat: 'Classic Gold' },
    { start: '15:00', end: '15:15', label: 'Mid-Hour Station ID', color: 'bg-rose-500', cat: 'Station ID' },
    { start: '15:15', end: '19:00', label: 'Power Current #3', color: 'bg-amber-500', cat: 'Power Current' },
    { start: '19:00', end: '22:30', label: 'High Energy Recurrent', color: 'bg-cyan-500', cat: 'Recurrent' },
    { start: '22:30', end: '23:00', label: 'Weekly Event Promo', color: 'bg-blue-500', cat: 'Promo' },
    { start: '23:00', end: '27:00', label: 'Power Current #4', color: 'bg-amber-500', cat: 'Power Current' },
    { start: '27:00', end: '30:00', label: 'Bottom-of-Hour Sweeper', color: 'bg-purple-500', cat: 'Jingle / Sweeper' },
  ];

  const applyPreset = (preset: 'hot-ac' | 'dance-electronic' | 'indie-rock' | 'chillout') => {
    setActivePreset(preset);
    if (preset === 'dance-electronic') {
      setWeights({
        'Power Current': 55,
        'Recurrent': 20,
        'Classic Gold': 5,
        'Jingle / Sweeper': 12,
        'Station ID': 5,
        'Promo': 3,
      });
      setSettings((prev) => ({
        ...prev,
        crossfadeDuration: 4.5,
        crossfadeCurve: 'constant-power',
        artistSeparationMinutes: 60,
      }));
    } else if (preset === 'hot-ac') {
      setWeights({
        'Power Current': 40,
        'Recurrent': 25,
        'Classic Gold': 15,
        'Jingle / Sweeper': 10,
        'Station ID': 5,
        'Promo': 5,
      });
      setSettings((prev) => ({
        ...prev,
        crossfadeDuration: 3.5,
        crossfadeCurve: 'broadcast-dip',
        artistSeparationMinutes: 45,
      }));
    } else if (preset === 'chillout') {
      setWeights({
        'Power Current': 30,
        'Recurrent': 20,
        'Classic Gold': 35,
        'Jingle / Sweeper': 5,
        'Station ID': 5,
        'Promo': 5,
      });
      setSettings((prev) => ({
        ...prev,
        crossfadeDuration: 5.5,
        crossfadeCurve: 'linear',
        artistSeparationMinutes: 90,
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Banner & Mode Handover */}
      <div className="bg-[#0f141f] border border-cyan-500/30 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  AutoDJ Non-Stop Playout Engine
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    broadcastMode === 'autodj'
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-600'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {broadcastMode === 'autodj' ? 'ACTIVE & ROTATING' : 'STANDBY (MANUAL MODE)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculates seamless segues, artist repeat rules, top-of-hour legal IDs, and category clock rotation 24/7 without dead air.
              </p>
            </div>
          </div>

          {/* Quick Activation Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() =>
                setBroadcastMode(broadcastMode === 'autodj' ? 'manual' : 'autodj')
              }
              className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center space-x-2 transition-all shadow-md ${
                broadcastMode === 'autodj'
                  ? 'bg-cyan-500 text-black hover:bg-cyan-400'
                  : 'bg-gradient-to-r from-amber-600 to-amber-500 text-black hover:from-amber-500'
              }`}
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>{broadcastMode === 'autodj' ? 'Handover to Manual DJ' : 'Engage 24/7 AutoDJ'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Preset Format Selectors */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          onClick={() => applyPreset('hot-ac')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activePreset === 'hot-ac'
              ? 'bg-[#141b29] border-amber-500 shadow-lg text-amber-300'
              : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs">Hot AC / Top 40</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tight 3.5s dip crossfades, 40% currents</div>
        </button>

        <button
          onClick={() => applyPreset('dance-electronic')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activePreset === 'dance-electronic'
              ? 'bg-[#141b29] border-cyan-500 shadow-lg text-cyan-300'
              : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs">Dance & Club Flow</div>
          <div className="text-[10px] text-slate-500 mt-0.5">4.5s equal power mix, high energy</div>
        </button>

        <button
          onClick={() => applyPreset('indie-rock')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activePreset === 'indie-rock'
              ? 'bg-[#141b29] border-purple-500 shadow-lg text-purple-300'
              : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs">Indie & Alternative</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Balanced currents & classic rock tracks</div>
        </button>

        <button
          onClick={() => applyPreset('chillout')}
          className={`p-3 rounded-xl border text-left transition-all ${
            activePreset === 'chillout'
              ? 'bg-[#141b29] border-emerald-500 shadow-lg text-emerald-300'
              : 'bg-[#0f141f] border-slate-800 text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="font-bold text-xs">Late Night Chill</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Long 5.5s crossfades, ambient gold</div>
        </button>
      </div>

      {/* Grid: 60-Minute Broadcast Clock Wheel & Transition DSP Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ==================== 60-MINUTE CLOCK WHEEL ==================== */}
        <div className="lg:col-span-7 bg-[#0f141f] border border-slate-800 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Hourly Broadcast Clock Wheel (60 Mins)
              </h4>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Format: Hot AC Prime</span>
          </div>

          <p className="text-xs text-slate-400">
            Automated rotation wheel guarantees high-energy pacing, legal top-of-hour station identification, and recurrent variety without manual human intervention.
          </p>

          {/* Visual Timeline Bar */}
          <div className="h-6 w-full rounded-lg bg-slate-900 border border-slate-800 flex overflow-hidden shadow-inner">
            {clockSegments.map((seg, idx) => (
              <div
                key={idx}
                title={`${seg.start} - ${seg.label}`}
                className={`h-full flex-1 hover:brightness-125 transition-all cursor-pointer ${seg.color}`}
              />
            ))}
          </div>

          {/* Segment Details List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {clockSegments.map((seg, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-[#090d14] rounded-lg border border-slate-800/80 text-xs hover:border-slate-700"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="font-mono text-slate-400 font-bold text-[11px]">
                    :{seg.start}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${seg.color}`} />
                  <span className="text-slate-200 font-semibold">{seg.label}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono px-2 py-0.5 bg-slate-800 rounded">
                  {seg.cat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ==================== TRANSITION CURVES & ROTATION RULES ==================== */}
        <div className="lg:col-span-5 bg-[#0f141f] border border-slate-800 rounded-xl p-4 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              Crossfade & DSP Transition Curves
            </h4>
          </div>

          {/* Crossfade Duration */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Crossfade Overlap Duration</span>
              <span className="font-mono text-cyan-400 font-bold">
                {settings.crossfadeDuration.toFixed(1)} seconds
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.5"
              value={settings.crossfadeDuration}
              onChange={(e) =>
                setSettings({ ...settings, crossfadeDuration: parseFloat(e.target.value) })
              }
              className="w-full accent-cyan-500 h-1.5 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
              <span>1.0s (Tight CHR)</span>
              <span>3.5s (Radio Standard)</span>
              <span>8.0s (Smooth Club)</span>
            </div>
          </div>

          {/* Crossfade Curve Selection */}
          <div>
            <span className="text-xs text-slate-300 font-medium block mb-1.5">
              Crossfade Mathematical Curve
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-xs">
              <button
                onClick={() => setSettings({ ...settings, crossfadeCurve: 'broadcast-dip' })}
                className={`p-2 rounded border text-center transition-colors ${
                  settings.crossfadeCurve === 'broadcast-dip'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-[#090d14] border-slate-800 text-slate-400'
                }`}
              >
                Broadcast Dip (-3dB)
              </button>
              <button
                onClick={() => setSettings({ ...settings, crossfadeCurve: 'constant-power' })}
                className={`p-2 rounded border text-center transition-colors ${
                  settings.crossfadeCurve === 'constant-power'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-[#090d14] border-slate-800 text-slate-400'
                }`}
              >
                Equal Power
              </button>
              <button
                onClick={() => setSettings({ ...settings, crossfadeCurve: 'linear' })}
                className={`p-2 rounded border text-center transition-colors ${
                  settings.crossfadeCurve === 'linear'
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 font-bold'
                    : 'bg-[#090d14] border-slate-800 text-slate-400'
                }`}
              >
                Linear Fade
              </button>
            </div>
          </div>

          {/* Protection Rules */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
              Automated Licensing & Music Protection
            </span>

            {/* Artist Separation */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Same Artist Separation</span>
                <span className="font-mono text-amber-400 font-bold">
                  {settings.artistSeparationMinutes} mins
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="5"
                value={settings.artistSeparationMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    artistSeparationMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full accent-amber-500 h-1.5 cursor-pointer"
              />
            </div>

            {/* Checkbox rules */}
            <div className="space-y-2 text-xs">
              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hourlyIdEnabled}
                  onChange={(e) =>
                    setSettings({ ...settings, hourlyIdEnabled: e.target.checked })
                  }
                  className="rounded accent-amber-500"
                />
                <span>Mandatory Top-of-the-Hour Station ID at :00</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.gaplessPlayout}
                  onChange={(e) =>
                    setSettings({ ...settings, gaplessPlayout: e.target.checked })
                  }
                  className="rounded accent-amber-500"
                />
                <span>Auto-trim leading & trailing track silence (&lt; -45dB)</span>
              </label>

              <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoCuePips}
                  onChange={(e) =>
                    setSettings({ ...settings, autoCuePips: e.target.checked })
                  }
                  className="rounded accent-amber-500"
                />
                <span>Audible 1kHz Pips trigger before hourly news</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
