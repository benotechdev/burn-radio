import React, { useState } from 'react';
import { Settings, Save, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { checkCompanionAgentStatus } from '../services/localFileManager';

interface SettingsViewProps {
  stationName: string;
  setStationName: (name: string) => void;
  isCompanionOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  stationName,
  setStationName,
  isCompanionOnline,
}) => {
  const [nameInput, setNameInput] = useState(stationName);
  const [tagline, setTagline] = useState('Pure Sound. Total Automation.');
  const [localFolder, setLocalFolder] = useState('C:\\RadioAutomation\\Music');
  const [companionCheck, setCompanionCheck] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    setStationName(nameInput);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleCheckCompanion = async () => {
    setIsChecking(true);
    const status = await checkCompanionAgentStatus();
    setCompanionCheck(status);
    setIsChecking(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-5">
        <h2 className="text-lg font-bold text-white">Station Settings</h2>
        <p className="text-xs text-[#A5A5A5] mt-0.5">
          General station preferences, local storage folders, and system configuration.
        </p>
      </div>

      {/* Main Settings Form */}
      <div className="bg-[#202020] border border-[#303030] rounded-lg p-6 space-y-5 text-xs">
        {/* Station Identity */}
        <div className="space-y-4">
          <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider pb-2 border-b border-[#303030]">
            Station Identity
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">Station Name</label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white focus:outline-none focus:border-[#FF7900]"
            />
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">Tagline / Slogan</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white focus:outline-none focus:border-[#FF7900]"
            />
          </div>
        </div>

        {/* Local PC Storage */}
        <div className="space-y-4 pt-3">
          <div className="text-xs font-bold text-[#A5A5A5] uppercase tracking-wider pb-2 border-b border-[#303030]">
            Local Storage Settings
          </div>

          <div>
            <label className="text-[#A5A5A5] block mb-1 font-semibold">
              Default Monitored Music Folder (Windows)
            </label>
            <input
              type="text"
              value={localFolder}
              onChange={(e) => setLocalFolder(e.target.value)}
              className="w-full bg-[#181818] border border-[#303030] rounded p-2.5 text-white font-mono focus:outline-none focus:border-[#FF7900]"
            />
            <p className="text-[11px] text-[#A5A5A5] mt-1">
              Music files are kept solely on this local hard drive path. Zero cloud storage is used.
            </p>
          </div>

          <div className="p-4 rounded-md bg-[#181818] border border-[#303030] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-white">
                Windows Companion Agent Service (Port 8901)
              </div>
              <div className="text-[11px] text-[#A5A5A5] mt-0.5">
                {companionCheck
                  ? companionCheck.connected
                    ? `Connected: v${companionCheck.version} (${companionCheck.scannedCount} tracks)`
                    : 'Not running locally (Browser Direct Storage active)'
                  : isCompanionOnline
                  ? 'Agent Connected on localhost:8901'
                  : 'Browser Direct Storage active (Using local browser storage)'}
              </div>
            </div>

            <button
              onClick={handleCheckCompanion}
              disabled={isChecking}
              className="px-3.5 py-1.5 rounded bg-[#202020] hover:bg-[#282828] text-white border border-[#303030] font-semibold text-xs flex items-center space-x-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>Check Connection</span>
            </button>
          </div>

          {/* Local Connection Architecture Guide */}
          <div className="p-4 rounded-md bg-[#181818] border border-[#303030] space-y-3">
            <div className="font-bold text-white text-xs uppercase tracking-wider text-[#FF7900]">
              How RADIOFLOW Connects to Your Windows PC & Real Local Storage
            </div>

            <div className="space-y-2 text-[11px] text-[#A5A5A5]">
              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <strong className="text-white block mb-0.5">Method 1 — Native Browser Direct (Zero Install)</strong>
                RADIOFLOW uses the modern W3C File System Access API (Chrome, Edge on Windows). When you click "Select Music Folder", Windows gives RADIOFLOW read-only streaming access to your local folder (e.g. <code className="text-[#FF7900] font-mono">C:\RadioAutomation\Music</code>). Files are read on-the-fly directly from your hard drive into the HTML5 playback engine.
              </div>

              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <strong className="text-white block mb-0.5">Method 2 — Background Companion Agent (24/7 Automation)</strong>
                For dedicated radio machines, run the local companion agent on <code className="text-[#FF7900] font-mono">localhost:8901</code>. It watches your local folder continuously with file-system watchers and streams audio directly to the studio interface.
              </div>

              <div className="p-2.5 rounded bg-[#202020] border border-[#303030]">
                <strong className="text-white block mb-0.5">Real-Time Verification & Missing File Protection</strong>
                Before any song starts (in Manual DJ or Auto DJ mode), RADIOFLOW checks the physical file on your disk. If a file was renamed or deleted from Windows Explorer, Auto DJ skips it immediately without stopping the broadcast.
              </div>
            </div>

            {/* Companion Download Buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={async () => {
                  const { generateCompanionAgentScript } = await import('../services/companionScriptGenerator');
                  const code = generateCompanionAgentScript({
                    stationName,
                    musicDirectory: localFolder,
                    companionPort: 8901,
                    icecastHost: 'localhost',
                    icecastPort: 8000,
                    icecastMount: '/live',
                    icecastPassword: 'hackme',
                    bitrate: 320,
                    crossfadeDuration: 3.5,
                  });
                  const blob = new Blob([code], { type: 'application/javascript' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'radioflow-agent.js';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 bg-[#202020] hover:bg-[#282828] text-white border border-[#303030] rounded text-xs font-semibold"
              >
                Download radioflow-agent.js
              </button>

              <button
                onClick={async () => {
                  const { generateWindowsBatchScript } = await import('../services/companionScriptGenerator');
                  const code = generateWindowsBatchScript();
                  const blob = new Blob([code], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'start-companion.bat';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-3 py-1.5 bg-[#202020] hover:bg-[#282828] text-white border border-[#303030] rounded text-xs font-semibold"
              >
                Download start-companion.bat
              </button>
            </div>
          </div>
        </div>

        {/* Save Actions */}
        <div className="pt-4 border-t border-[#303030] flex items-center justify-between">
          <div>
            {isSaved && (
              <span className="text-[#FF7900] font-bold text-xs flex items-center space-x-1">
                <CheckCircle2 className="w-4 h-4" />
                <span>Settings saved successfully.</span>
              </span>
            )}
          </div>

          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-md bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs shadow flex items-center space-x-2 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

