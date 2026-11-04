import React, { useState, useRef } from 'react';
import {
  Wifi,
  Radio,
  Server,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Terminal,
  Cpu,
  HelpCircle
} from 'lucide-react';
import {
  CompanionConfig,
  generateCompanionAgentScript,
  generateWindowsBatchScript,
  generateLiquidsoapScript,
  generateIcecastXml,
} from '../services/companionScriptGenerator';

interface BroadcastViewProps {
  isOnAir: boolean;
  setIsOnAir: (onAir: boolean) => void;
}

export const BroadcastView: React.FC<BroadcastViewProps> = ({
  isOnAir,
  setIsOnAir,
}) => {
  const [serverAddress, setServerAddress] = useState('127.0.0.1');
  const [serverPort, setServerPort] = useState('8000');
  const [mountPoint, setMountPoint] = useState('/live');
  const [bitrate, setBitrate] = useState('320');
  const [password, setPassword] = useState('hackme_broadcast');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // BURN RADIO State
  const [burnStatus, setBurnStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'LIVE' | 'CONNECTION ERROR'>('DISCONNECTED');
  const [burnCode, setBurnCode] = useState('burnradio');

  const companionConfig: CompanionConfig = {
    stationName: 'RADIOFLOW 104.5 HD',
    musicDirectory: 'C:\\RadioAutomation\\Music',
    companionPort: 8901,
    icecastHost: serverAddress,
    icecastPort: parseInt(serverPort, 10) || 8000,
    icecastMount: mountPoint,
    icecastPassword: password,
    bitrate: parseInt(bitrate, 10) || 320,
    crossfadeDuration: 3.5,
  };

  const liquidsoapScript = generateLiquidsoapScript(companionConfig);
  const icecastXml = generateIcecastXml(companionConfig);
  const agentScript = generateCompanionAgentScript(companionConfig);
  const batchScript = generateWindowsBatchScript();

  const [stationArtwork, setStationArtwork] = useState<string | null>(null);
  const artworkInputRef = useRef<HTMLInputElement>(null);

  const handleArtworkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setStationArtwork(url);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleBurnConnect = () => {
    if (burnCode !== 'burnradio') {
      setBurnStatus('CONNECTION ERROR');
      return;
    }
    setBurnStatus('CONNECTING');
    setTimeout(() => setBurnStatus('CONNECTED'), 1500);
  };

  const handleBurnGoLive = () => {
    setBurnStatus('LIVE');
    setIsOnAir(true);
  };

  const handleBurnStop = () => {
    setBurnStatus('CONNECTED');
    setIsOnAir(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* BURN RADIO Connection Panel */}
      <div className="bg-[#202020] border border-[#FF7900]/40 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Radio className="w-5 h-5 text-[#FF7900]" />
            <span>BURN RADIO – LISTENER CONNECTION</span>
          </h2>
          <div className={`px-3 py-1 rounded text-xs font-bold ${burnStatus === 'LIVE' ? 'bg-red-600 text-white animate-pulse' : 'bg-[#181818] text-[#A5A5A5]'}`}>
            {burnStatus}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={burnCode}
            onChange={(e) => setBurnCode(e.target.value)}
            className="bg-[#181818] border border-[#303030] rounded p-2 text-xs text-white focus:border-[#FF7900] outline-none"
            placeholder="Station Code"
          />
          <button onClick={handleBurnConnect} className="px-4 py-2 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs rounded-md">CONNECT</button>
          <button onClick={handleBurnGoLive} disabled={burnStatus !== 'CONNECTED'} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-md">GO LIVE</button>
          <button onClick={handleBurnStop} disabled={burnStatus !== 'LIVE'} className="px-4 py-2 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs rounded-md">STOP</button>
          <button onClick={() => setBurnStatus('DISCONNECTED')} className="px-4 py-2 bg-[#181818] border border-[#303030] text-white font-bold text-xs rounded-md">DISCONNECT</button>
        </div>

        {/* Station Artwork Upload */}
        <div className="flex items-center gap-4 pt-2 border-t border-[#303030]">
          <div className="w-16 h-16 bg-[#181818] border border-[#303030] rounded flex items-center justify-center overflow-hidden">
            {stationArtwork ? (
              <img src={stationArtwork} alt="Station Art" className="w-full h-full object-cover" />
            ) : (
              <span className="text-[#A5A5A5] text-[10px]">No Art</span>
            )}
          </div>
          <input type="file" ref={artworkInputRef} onChange={handleArtworkUpload} accept="image/*" className="hidden" />
          <button
            onClick={() => artworkInputRef.current?.click()}
            className="px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-bold text-xs rounded-md"
          >
            Upload Station Art
          </button>
        </div>
      </div>

      {/* Top Banner */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5">
        <h2 className="text-lg font-bold text-white">Broadcast Server Settings</h2>
        <p className="text-xs text-[#A5A5A5] mt-0.5">
          Connect your station to an Icecast 2 streaming server or local broadcast engine.
        </p>
      </div>

      {/* Main Broadcast Control Card */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-6 space-y-5">
        {/* Stream Status Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-[#303030] gap-3">
          <div>
            <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider">
              Streaming Server Connection
            </div>
            <div className="text-sm font-bold text-white mt-1">
              Icecast 2 / Liquidsoap Audio Pipeline
            </div>
          </div>

          {/* Strict Rule: Never display ON AIR unless actual connection is confirmed/toggled */}
          <div className="flex items-center space-x-3">
            <span
              className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                isOnAir
                  ? 'bg-[#FF7900] text-white'
                  : 'bg-[#181818] text-[#A5A5A5] border border-[#303030]'
              }`}
            >
              {isOnAir ? 'CONNECTED (ON AIR)' : 'DISCONNECTED (OFFLINE)'}
            </span>

            <button
              onClick={() => setIsOnAir(!isOnAir)}
              className={`px-5 py-2 rounded-md font-bold text-xs transition-colors shadow ${
                isOnAir
                  ? 'bg-[#181818] hover:bg-[#282828] text-white border border-[#303030]'
                  : 'bg-[#FF7900] hover:bg-[#E96800] text-white'
              }`}
            >
              {isOnAir ? 'Disconnect Broadcast' : 'Connect Broadcast'}
            </button>
          </div>
        </div>

        {/* Server Connection Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">
              Server Address (Host)
            </label>
            <input
              type="text"
              value={serverAddress}
              onChange={(e) => setServerAddress(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white font-mono focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">Port</label>
            <input
              type="text"
              value={serverPort}
              onChange={(e) => setServerPort(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white font-mono focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">Mount Point</label>
            <input
              type="text"
              value={mountPoint}
              onChange={(e) => setMountPoint(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white font-mono focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">Audio Bitrate</label>
            <select
              value={bitrate}
              onChange={(e) => setBitrate(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white focus:outline-none focus:border-[#FF7900]"
            >
              <option value="320">320 kbps (High Fidelity MP3)</option>
              <option value="192">192 kbps (Standard Radio MP3)</option>
              <option value="128">128 kbps (Mobile Optimized MP3)</option>
              <option value="64">64 kbps (Low Bandwidth AAC+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Optional Advanced Configuration Section */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 text-left flex items-center justify-between text-xs font-bold text-[#A5A5A5] hover:text-white transition-colors"
        >
          <span>ADVANCED CONFIGURATION (LIQUIDSOAP & LOCAL COMPANION DAEMON)</span>
          {showAdvanced ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {showAdvanced && (
          <div className="p-6 border-t border-[#303030] space-y-6 text-xs bg-[#181818]">
            <p className="text-[#A5A5A5]">
              RADIOFLOW integrates with free open-source broadcast servers. Download the generated files below to run 24/7 standalone automation.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Local Companion Agent */}
              <div className="p-4 rounded-md bg-[#202020] border border-[#303030] space-y-2">
                <div className="font-bold text-white text-sm">
                  1. Windows Companion Agent
                </div>
                <p className="text-[#A5A5A5] text-[11px]">
                  Scans Windows folders like <code className="text-[#FF7900]">C:\RadioAutomation\Music</code> and serves audio locally.
                </p>
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => handleDownload('radioflow-agent.js', agentScript)}
                    className="px-3 py-1.5 bg-[#FF7900] hover:bg-[#E96800] text-white font-bold rounded text-xs flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Agent</span>
                  </button>
                  <button
                    onClick={() => handleDownload('start-radioflow.bat', batchScript)}
                    className="px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] rounded text-xs"
                  >
                    start.bat
                  </button>
                </div>
              </div>

              {/* Liquidsoap Script */}
              <div className="p-4 rounded-md bg-[#202020] border border-[#303030] space-y-2">
                <div className="font-bold text-white text-sm">
                  2. Liquidsoap Playout Script
                </div>
                <p className="text-[#A5A5A5] text-[11px]">
                  Production script with crossfades, fallback emergency audio, and Icecast stream generation.
                </p>
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => handleDownload('radioflow.liq', liquidsoapScript)}
                    className="px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] font-bold rounded text-xs flex items-center space-x-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .liq</span>
                  </button>
                  <button
                    onClick={() => handleCopy(liquidsoapScript, 'liq')}
                    className="px-3 py-1.5 bg-[#181818] hover:bg-[#282828] text-white border border-[#303030] rounded text-xs"
                  >
                    {copiedKey === 'liq' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
