import React, { useState, useEffect } from 'react';
import {
  Radio,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Activity,
  Wifi,
  Headphones,
  Sliders,
  FolderOpen,
  Calendar,
  Share2,
  FileText,
  Smartphone,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { audioEngine } from '../services/audioEngine';
import { checkCompanionAgentStatus } from '../services/localFileManager';

interface HeaderProps {
  currentTab: 'studio' | 'library' | 'autodj' | 'schedule' | 'transmitters' | 'logs' | 'remote';
  setCurrentTab: (tab: 'studio' | 'library' | 'autodj' | 'schedule' | 'transmitters' | 'logs' | 'remote') => void;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  setBroadcastMode: (mode: 'manual' | 'autodj' | 'assisted') => void;
  isOnAir: boolean;
  setIsOnAir: (onAir: boolean) => void;
  isMicLive: boolean;
  setIsMicLive: (live: boolean) => void;
  listenerCount: number;
  openListenerModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  broadcastMode,
  setBroadcastMode,
  isOnAir,
  setIsOnAir,
  isMicLive,
  setIsMicLive,
  listenerCount,
  openListenerModal,
}) => {
  const [stationTime, setStationTime] = useState<string>('');
  const [utcTime, setUtcTime] = useState<string>('');
  const [companionOnline, setCompanionOnline] = useState<boolean>(false);
  const [audioStarted, setAudioStarted] = useState<boolean>(false);

  // Precision broadcast clock with milliseconds indicator
  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const hours = pad(now.getHours());
      const minutes = pad(now.getMinutes());
      const seconds = pad(now.getSeconds());
      const tenths = Math.floor(now.getMilliseconds() / 100);
      setStationTime(`${hours}:${minutes}:${seconds}.${tenths}`);

      const uHours = pad(now.getUTCHours());
      const uMinutes = pad(now.getUTCMinutes());
      const uSeconds = pad(now.getUTCSeconds());
      setUtcTime(`${uHours}:${uMinutes}:${uSeconds} UTC`);
    };

    updateClocks();
    const interval = setInterval(updateClocks, 100);
    return () => clearInterval(interval);
  }, []);

  // Check companion agent status periodically
  useEffect(() => {
    const checkAgent = async () => {
      const status = await checkCompanionAgentStatus();
      setCompanionOnline(status.connected);
    };
    checkAgent();
    const agentInterval = setInterval(checkAgent, 8000);
    return () => clearInterval(agentInterval);
  }, []);

  const handleToggleMic = async () => {
    audioEngine.ensureContext();
    setAudioStarted(true);
    const newState = await audioEngine.toggleMicrophone(!isMicLive);
    setIsMicLive(newState);
  };

  const handleStartAudio = () => {
    audioEngine.ensureContext();
    setAudioStarted(true);
  };

  return (
    <header className="bg-[#0f141e] border-b border-slate-800 text-slate-100 select-none sticky top-0 z-40">
      {/* Top Studio Control Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Tally Lights */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-600 via-rose-600 to-cyan-500 p-0.5 shadow-lg shadow-rose-950/40">
              <div className="w-full h-full bg-[#090d14] rounded-[7px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-wider text-base sm:text-lg bg-gradient-to-r from-amber-400 via-rose-400 to-cyan-400 bg-clip-text text-transparent font-broadcast">
                  RADIOFLOW
                </span>
                <span className="text-[10px] font-semibold tracking-wider px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded border border-slate-700">
                  PRO 2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Professional Radio Automation & Live Playout
              </p>
            </div>
          </div>

          {/* Master ON-AIR Light */}
          <button
            onClick={() => {
              handleStartAudio();
              setIsOnAir(!isOnAir);
            }}
            title="Click to toggle master broadcast stream status"
            className={`px-3 py-1.5 rounded font-bold text-xs tracking-widest flex items-center space-x-2 transition-all ${
              isOnAir
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 on-air-active border border-red-400'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${isOnAir ? 'bg-white animate-ping' : 'bg-slate-500'}`} />
            <span>{isOnAir ? 'ON AIR' : 'OFF AIR'}</span>
          </button>

          {/* MIC LIVE Tally */}
          <button
            onClick={handleToggleMic}
            title="Live DJ Talkover with Auto-Ducking (music drops -15dB)"
            className={`px-3 py-1.5 rounded font-bold text-xs tracking-wider flex items-center space-x-1.5 transition-all ${
              isMicLive
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/50 mic-live-blink border border-amber-300'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            {isMicLive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{isMicLive ? 'MIC LIVE' : 'MIC OFF'}</span>
          </button>
        </div>

        {/* Master Studio Precision Clock */}
        <div className="flex items-center space-x-4">
          <div className="bg-[#070a0f] border border-slate-800 px-3 py-1 rounded-md text-center shadow-inner">
            <div className="text-[10px] text-slate-400 font-mono tracking-widest flex items-center justify-center space-x-1">
              <span>STATION MASTER</span>
              <span className="text-slate-500">|</span>
              <span className="text-cyan-400">{utcTime}</span>
            </div>
            <div className="text-base sm:text-xl font-bold font-mono tracking-wider text-amber-400">
              {stationTime || '00:00:00.0'}
            </div>
          </div>

          {/* Broadcast Mode Selector Switch */}
          <div className="bg-[#090d14] p-1 rounded-lg border border-slate-800 flex items-center space-x-1">
            <button
              onClick={() => setBroadcastMode('manual')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                broadcastMode === 'manual'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MANUAL DJ
            </button>
            <button
              onClick={() => setBroadcastMode('autodj')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                broadcastMode === 'autodj'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              AUTO-DJ
            </button>
            <button
              onClick={() => setBroadcastMode('assisted')}
              className={`px-2.5 py-1 text-xs font-semibold rounded transition-all ${
                broadcastMode === 'assisted'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ASSISTED
            </button>
          </div>
        </div>

        {/* Stream Metrics & Quick Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Audio Engine Initializer Prompt */}
          {!audioStarted && (
            <button
              onClick={handleStartAudio}
              className="px-2.5 py-1 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 rounded text-xs flex items-center space-x-1.5 animate-pulse hover:bg-emerald-600/30"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Enable Audio</span>
            </button>
          )}

          {/* Local Companion Status Indicator */}
          <div
            title={
              companionOnline
                ? 'Windows Local Companion Agent is Connected (Serving local files)'
                : 'Browser Direct Storage Active (Using local HTML5 File System API)'
            }
            className="flex items-center space-x-1.5 px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                companionOnline ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'
              }`}
            />
            <span className="text-[11px] text-slate-300 hidden md:inline">
              {companionOnline ? 'Agent Connected' : 'Local PC Mode'}
            </span>
          </div>

          {/* Listener Count & Public Player Modal trigger */}
          <button
            onClick={openListenerModal}
            title="Open Public Web Stream Player"
            className="flex items-center space-x-1.5 px-2.5 py-1 bg-cyan-950/40 border border-cyan-800/60 rounded text-xs text-cyan-300 hover:bg-cyan-900/40 transition-colors"
          >
            <Headphones className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">{listenerCount}</span>
            <span className="hidden sm:inline text-cyan-400/80">Listeners</span>
          </button>
        </div>
      </div>

      {/* Primary Studio Navigation Bar */}
      <nav className="bg-[#0b0e16] border-t border-slate-800/80 px-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center space-x-1 overflow-x-auto py-1">
          <button
            onClick={() => setCurrentTab('studio')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'studio'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Live Studio & Decks</span>
          </button>

          <button
            onClick={() => setCurrentTab('library')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'library'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Music Library (Local PC)</span>
          </button>

          <button
            onClick={() => setCurrentTab('autodj')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'autodj'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>AutoDJ & Rotation Clocks</span>
          </button>

          <button
            onClick={() => setCurrentTab('schedule')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'schedule'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Programme Schedule (24/7)</span>
          </button>

          <button
            onClick={() => setCurrentTab('transmitters')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'transmitters'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Broadcasting (Liquidsoap & Icecast)</span>
          </button>

          <button
            onClick={() => setCurrentTab('logs')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'logs'
                ? 'bg-slate-800 text-amber-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Station Logs & Licensing</span>
          </button>

          <button
            onClick={() => setCurrentTab('remote')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
              currentTab === 'remote'
                ? 'bg-slate-800 text-cyan-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Remote Smartphone App</span>
          </button>
        </div>
      </nav>
    </header>
  );
};
