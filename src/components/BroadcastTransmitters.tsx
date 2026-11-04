import React, { useState } from 'react';
import {
  Radio,
  Server,
  Download,
  Copy,
  Check,
  Terminal,
  Activity,
  Cpu,
  Layers,
  Settings,
  Shield,
  HelpCircle,
  ExternalLink,
  Volume2
} from 'lucide-react';
import {
  CompanionConfig,
  generateCompanionAgentScript,
  generateWindowsBatchScript,
  generateLiquidsoapScript,
  generateIcecastXml,
  generateDockerCompose,
} from '../services/companionScriptGenerator';

interface BroadcastTransmittersProps {
  isOnAir: boolean;
  listenerCount: number;
}

export const BroadcastTransmitters: React.FC<BroadcastTransmittersProps> = ({
  isOnAir,
  listenerCount,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'liquidsoap' | 'icecast' | 'agent' | 'docker'>('liquidsoap');

  const [config, setConfig] = useState<CompanionConfig>({
    stationName: 'RADIOFLOW 104.5 HD',
    musicDirectory: 'C:\\RadioAutomation\\Music',
    companionPort: 8901,
    icecastHost: '127.0.0.1',
    icecastPort: 8000,
    icecastMount: '/live',
    icecastPassword: 'hackme_broadcast',
    bitrate: 320,
    crossfadeDuration: 3.5,
  });

  const liquidsoapCode = generateLiquidsoapScript(config);
  const icecastXmlCode = generateIcecastXml(config);
  const agentScriptCode = generateCompanionAgentScript(config);
  const batchScriptCode = generateWindowsBatchScript();
  const dockerComposeCode = generateDockerCompose();

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

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Broadcast Server Status Card */}
      <div className="bg-[#0f141f] border border-cyan-500/30 rounded-xl p-4 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                  Broadcasting Pipeline: Icecast 2 & Liquidsoap 2.4
                </h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    isOnAir
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-600'
                  }`}
                >
                  {isOnAir ? 'ENCODER STREAMING (ON AIR)' : 'STANDBY MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Icecast HTTP MP3/AAC audio streaming server paired with Liquidsoap sound mixing engine and Windows local companion daemon.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-mono block">BROADCAST QUALITY</span>
              <span className="text-xs font-mono font-bold text-amber-400">
                MP3 320 kbps • 44.1 kHz Joint Stereo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 Architecture Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Block 1: Local Companion Agent */}
        <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-amber-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              1. Local Companion Agent
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Node.js background daemon for your Windows PC. Scans local music folders without cloud uploads and serves audio ranges to the studio.
          </p>
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handleDownload('radioflow-agent.js', agentScriptCode)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Agent.js</span>
            </button>
            <button
              onClick={() => handleDownload('start-radioflow.bat', batchScriptCode)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-lg border border-slate-700 flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>start.bat</span>
            </button>
          </div>
        </div>

        {/* Block 2: Liquidsoap Automation */}
        <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              2. Liquidsoap 2.x Engine
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Professional broadcast audio mixing script. Manages rotation clock, smooth transitions, TOH time pips, and Harbor live DJ stream fallback.
          </p>
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handleDownload('radioflow.liq', liquidsoapCode)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download radioflow.liq</span>
            </button>
          </div>
        </div>

        {/* Block 3: Icecast 2 Server */}
        <div className="bg-[#0f141f] border border-slate-800 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400" />
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">
              3. Icecast 2 Streaming
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Industry standard internet radio streaming server. Distributes low-latency audio to thousands of online listeners worldwide.
          </p>
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handleDownload('icecast.xml', icecastXmlCode)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download icecast.xml</span>
            </button>
          </div>
        </div>
      </div>

      {/* Code / Configuration Inspector */}
      <div className="bg-[#0f141f] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        {/* Code Tabs */}
        <div className="bg-[#090d14] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveCodeTab('liquidsoap')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeCodeTab === 'liquidsoap'
                  ? 'bg-slate-800 text-cyan-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              radioflow.liq (Liquidsoap)
            </button>
            <button
              onClick={() => setActiveCodeTab('icecast')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeCodeTab === 'icecast'
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              icecast.xml
            </button>
            <button
              onClick={() => setActiveCodeTab('agent')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeCodeTab === 'agent'
                  ? 'bg-slate-800 text-amber-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              radioflow-agent.js (Windows Companion)
            </button>
            <button
              onClick={() => setActiveCodeTab('docker')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                activeCodeTab === 'docker'
                  ? 'bg-slate-800 text-purple-400 border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              docker-compose.yml
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                const code =
                  activeCodeTab === 'liquidsoap'
                    ? liquidsoapCode
                    : activeCodeTab === 'icecast'
                    ? icecastXmlCode
                    : activeCodeTab === 'agent'
                    ? agentScriptCode
                    : dockerComposeCode;
                handleCopy(code, activeCodeTab);
              }}
              className="px-2.5 py-1 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs rounded border border-slate-700 flex items-center space-x-1"
            >
              {copiedKey === activeCodeTab ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-[#05080e] overflow-x-auto max-h-96">
          <pre className="font-mono text-xs text-slate-300 leading-relaxed">
            {activeCodeTab === 'liquidsoap' && liquidsoapCode}
            {activeCodeTab === 'icecast' && icecastXmlCode}
            {activeCodeTab === 'agent' && agentScriptCode}
            {activeCodeTab === 'docker' && dockerComposeCode}
          </pre>
        </div>
      </div>

      {/* Installation & Windows Instructions */}
      <div className="bg-[#090d14] border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
        <h4 className="font-bold text-slate-200 text-sm flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-amber-400" />
          <span>Quick Setup Guide for Windows Radio Automation</span>
        </h4>
        <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-2">
          <li>
            <strong className="text-slate-200">Step 1:</strong> Store your music files in a local folder like{' '}
            <code className="text-amber-300 font-mono">C:\RadioAutomation\Music\Power</code> and{' '}
            <code className="text-amber-300 font-mono">C:\RadioAutomation\Music\Gold</code>.
          </li>
          <li>
            <strong className="text-slate-200">Step 2:</strong> Download{' '}
            <span className="text-amber-400 font-semibold">radioflow-agent.js</span> and{' '}
            <span className="text-cyan-400 font-semibold">start-radioflow.bat</span> to that folder.
          </li>
          <li>
            <strong className="text-slate-200">Step 3:</strong> Double click{' '}
            <code className="text-cyan-300 font-mono">start-radioflow.bat</code>. Node.js will index your songs instantly.
          </li>
          <li>
            <strong className="text-slate-200">Step 4:</strong> Open RADIOFLOW in your browser (or on your phone). Your station is live!
          </li>
        </ol>
      </div>
    </div>
  );
};
