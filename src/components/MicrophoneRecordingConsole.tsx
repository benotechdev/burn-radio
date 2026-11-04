import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Circle,
  Square,
  Pause,
  Play,
  Download,
  Headphones,
  Volume2,
  VolumeX,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  HardDrive,
  Trash2,
  Clock,
  Radio,
  FileAudio,
  ShieldCheck,
  FolderDown,
  Info
} from 'lucide-react';
import {
  microphoneService,
  AudioDeviceOption,
  MeterLevels,
  RecordingResult
} from '../services/microphoneService';
import { SessionRecording } from '../types/radio';

interface MicrophoneRecordingConsoleProps {
  onRecordingSavedToDisk?: (recording: SessionRecording) => void;
  compact?: boolean; // If embedded on dashboard vs full page
}

export const MicrophoneRecordingConsole: React.FC<MicrophoneRecordingConsoleProps> = ({
  onRecordingSavedToDisk,
  compact = false,
}) => {
  // Device & Stream States
  const [devices, setDevices] = useState<AudioDeviceOption[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(100); // 0 - 150%
  const [isMonitoring, setIsMonitoring] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Meter & Signal States
  const [meterLevels, setMeterLevels] = useState<MeterLevels>({
    rms: 0,
    peak: 0,
    peakDecibels: -96,
    isClipping: false,
    isLowSignal: false,
  });

  // Recording State Machine: 'idle' | 'recording' | 'paused' | 'stopped'
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'stopped'>('idle');
  const [recordTimerSec, setRecordTimerSec] = useState<number>(0);

  // Active Preview Item (Latest or Selected)
  const [activePreview, setActivePreview] = useState<SessionRecording | null>(null);
  const [proposedFilename, setProposedFilename] = useState<string>('');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewProgress, setPreviewProgress] = useState<number>(0);
  const [previewDuration, setPreviewDuration] = useState<number>(0);
  const [downloadSuccessNotice, setDownloadSuccessNotice] = useState<string | null>(null);

  // Session Library
  const [sessionRecordings, setSessionRecordings] = useState<SessionRecording[]>([]);

  // Audio preview element ref
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // 1. Initial Device Listing
  const refreshDevices = async () => {
    const list = await microphoneService.getAudioInputDevices();
    setDevices(list);
    if (list.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(list[0].deviceId);
    }
  };

  useEffect(() => {
    refreshDevices();

    // Listen for device change events (e.g. plugging/unplugging USB mic)
    const handleDeviceChange = () => {
      refreshDevices();
    };
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // 2. Subscribe to Level Meter Updates
  useEffect(() => {
    const unsubscribe = microphoneService.onLevelUpdate((levels) => {
      setMeterLevels(levels);
    });
    return () => unsubscribe();
  }, []);

  // 3. Enable / Connect Microphone
  const handleToggleMic = async () => {
    if (isMicActive) {
      // If currently recording, warn or stop
      if (recordingState === 'recording' || recordingState === 'paused') {
        if (!confirm('Stopping the microphone will also stop the current recording. Continue?')) {
          return;
        }
        await handleStopRecording();
      }
      microphoneService.cleanupStream();
      setIsMicActive(false);
      setIsMuted(false);
      setIsMonitoring(false);
    } else {
      setPermissionError(null);
      const res = await microphoneService.initializeMicrophone(selectedDeviceId || undefined);
      if (res.success) {
        setIsMicActive(true);
        setIsMuted(false);
        microphoneService.setVolume(micVolume / 100);
        // Refresh device labels once permission is granted
        refreshDevices();
      } else {
        setPermissionError(res.error || 'Could not connect to microphone.');
      }
    }
  };

  // 4. Switch Input Device
  const handleDeviceSelect = async (newDeviceId: string) => {
    setSelectedDeviceId(newDeviceId);
    if (isMicActive) {
      // Re-initialize stream with new device
      const res = await microphoneService.initializeMicrophone(newDeviceId);
      if (!res.success) {
        setPermissionError(res.error || 'Failed to switch microphone.');
      } else {
        setPermissionError(null);
      }
    }
  };

  // 5. Volume Slider Change
  const handleVolumeChange = (newVal: number) => {
    setMicVolume(newVal);
    microphoneService.setVolume(newVal / 100);
  };

  // 6. Mute Toggle
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    microphoneService.setMute(nextMute);
  };

  // 7. Monitoring (Sidetone) Toggle
  const handleToggleMonitoring = () => {
    const next = !isMonitoring;
    setIsMonitoring(next);
    microphoneService.setMonitoring(next);
  };

  // 8. Recording Controls
  const handleStartRecording = async () => {
    // If mic not yet active, connect first
    if (!isMicActive) {
      const res = await microphoneService.initializeMicrophone(selectedDeviceId || undefined);
      if (!res.success) {
        setPermissionError(res.error || 'Microphone activation required to record.');
        return;
      }
      setIsMicActive(true);
      refreshDevices();
    }

    setPermissionError(null);
    setDownloadSuccessNotice(null);

    const startRes = microphoneService.startRecording();
    if (startRes.success) {
      setRecordingState('recording');
      setRecordTimerSec(0);

      // Start duration tick
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordTimerSec((prev) => prev + 1);
      }, 1000);
    } else {
      setPermissionError(startRes.error || 'Failed to start recording.');
    }
  };

  const handlePauseRecording = () => {
    microphoneService.pauseRecording();
    setRecordingState('paused');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
  };

  const handleResumeRecording = () => {
    microphoneService.resumeRecording();
    setRecordingState('recording');
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordTimerSec((prev) => prev + 1);
    }, 1000);
  };

  const handleStopRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const result = await microphoneService.stopRecording();
    setRecordingState('stopped');

    if (result) {
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const defaultName = `RADIOFLOW_Recording_${dateStr}.${result.extension}`;
      const newRec: SessionRecording = {
        id: `rec-${Date.now()}`,
        name: defaultName,
        blob: result.blob,
        url: result.url,
        duration: result.duration,
        createdAt: new Date().toISOString(),
        fileSize: result.sizeBytes,
        format: result.mimeType,
        extension: result.extension,
      };

      setSessionRecordings((prev) => [newRec, ...prev]);
      setActivePreview(newRec);
      setProposedFilename(defaultName);
    }
  };

  // 9. Format helpers
  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = Math.floor(totalSeconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 10. Preview Player Controls
  const handleTogglePreviewPlay = () => {
    if (!previewAudioRef.current || !activePreview) return;
    if (isPreviewPlaying) {
      previewAudioRef.current.pause();
      setIsPreviewPlaying(false);
    } else {
      previewAudioRef.current.play().then(() => {
        setIsPreviewPlaying(true);
      }).catch((e) => console.warn('Preview play notice:', e));
    }
  };

  const handlePreviewSeek = (targetSec: number) => {
    if (!previewAudioRef.current) return;
    previewAudioRef.current.currentTime = targetSec;
    setPreviewProgress(targetSec);
  };

  // 11. Download Recording Direct to Computer
  const handleDownload = async (rec: SessionRecording, customName?: string) => {
    const filenameToUse = (customName || proposedFilename || rec.name).trim();
    // Ensure proper extension
    const cleanName = filenameToUse.endsWith(`.${rec.extension}`)
      ? filenameToUse
      : `${filenameToUse}.${rec.extension}`;

    const downloaded = await microphoneService.downloadRecordingToDisk(rec.blob, cleanName);
    if (downloaded) {
      setDownloadSuccessNotice(`"${cleanName}" saved directly to your computer.`);
      if (onRecordingSavedToDisk) {
        onRecordingSavedToDisk({ ...rec, name: cleanName });
      }
      setTimeout(() => setDownloadSuccessNotice(null), 7000);
    }
  };

  // 12. Delete Recording from Session List
  const handleDeleteRecording = (id: string) => {
    setSessionRecordings((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target?.url) URL.revokeObjectURL(target.url);
      return prev.filter((r) => r.id !== id);
    });
    if (activePreview?.id === id) {
      setActivePreview(null);
      setIsPreviewPlaying(false);
    }
  };

  // 13. VU Meter Segmented Bars (24 discrete broadcast segments)
  const TOTAL_SEGMENTS = 24;
  const activeSegments = Math.min(
    TOTAL_SEGMENTS,
    Math.round((meterLevels.peak / 1.0) * TOTAL_SEGMENTS)
  );

  return (
    <div className="bg-[#181818] border border-[#303030] rounded-xl overflow-hidden shadow-2xl text-white">
      {/* Top Header & Brand Bar */}
      <div className="bg-[#202020] border-b border-[#303030] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-[#FF7900] flex items-center justify-center text-white shrink-0 shadow-sm">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                MICROPHONE & RECORDING CONSOLE
              </h2>
              {/* Recording Status Badge */}
              {recordingState === 'recording' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/40 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span>RECORDING ON AIR</span>
                </span>
              )}
              {recordingState === 'paused' && (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-600/20 text-amber-400 border border-amber-500/40">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>PAUSED</span>
                </span>
              )}
              {recordingState === 'idle' && (
                <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-[#111111] text-[#A5A5A5] border border-[#303030]">
                  STANDBY
                </span>
              )}
            </div>
            <p className="text-xs text-[#A5A5A5] mt-0.5">
              Live broadcast voice console with zero-latency software gain and direct PC disk capture
            </p>
          </div>
        </div>

        {/* Global Privacy / Direct PC Storage Guarantee */}
        <div className="flex items-center space-x-2 text-[11px] bg-[#111111] border border-[#303030] px-3 py-1.5 rounded-md text-[#A5A5A5]">
          <ShieldCheck className="w-4 h-4 text-[#FF7900] shrink-0" />
          <span>Direct-to-PC: No voice audio is sent to cloud servers</span>
        </div>
      </div>

      {/* Permission Error Banner */}
      {permissionError && (
        <div className="bg-red-950/40 border-b border-red-600/50 px-4 sm:px-6 py-3 flex items-start space-x-3 text-red-200 text-xs">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Microphone Notice: </span>
            <span>{permissionError}</span>
          </div>
          <button
            onClick={() => setPermissionError(null)}
            className="text-red-400 hover:text-white font-bold ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Download Success Banner */}
      {downloadSuccessNotice && (
        <div className="bg-emerald-950/40 border-b border-emerald-600/50 px-4 sm:px-6 py-3 flex items-center justify-between text-emerald-200 text-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{downloadSuccessNotice}</span>
          </div>
          <span className="text-[11px] text-emerald-400/80">Saved to Local Drive</span>
        </div>
      )}

      {/* Main Console Grid */}
      <div className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ==================== 1. MICROPHONE INPUT & GAIN (5 COLS) ==================== */}
          <div className="lg:col-span-5 bg-[#202020] border border-[#303030] rounded-xl p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#303030] pb-3">
              <div className="flex items-center space-x-2">
                <Mic className="w-4 h-4 text-[#FF7900]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Microphone Input
                </span>
              </div>
              <button
                onClick={refreshDevices}
                className="text-xs text-[#A5A5A5] hover:text-white flex items-center space-x-1 p-1 rounded hover:bg-[#282828] transition-colors"
                title="Refresh connected devices"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[11px]">Rescan</span>
              </button>
            </div>

            {/* Device Selector */}
            <div className="space-y-1.5">
              <label className="text-xs text-[#A5A5A5] font-semibold flex items-center justify-between">
                <span>Input Device</span>
                <span className="text-[10px] text-[#A5A5A5] font-mono">
                  {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
                </span>
              </label>
              <select
                value={selectedDeviceId}
                onChange={(e) => handleDeviceSelect(e.target.value)}
                className="w-full bg-[#111111] border border-[#303030] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF7900] transition-colors cursor-pointer"
              >
                {devices.length === 0 ? (
                  <option value="">Default Microphone (Allow browser permission)</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Audio Input ${d.deviceId.slice(0, 6)}...`}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Mic Activation & Mute Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={handleToggleMic}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  isMicActive
                    ? 'bg-[#FF7900] text-white hover:bg-[#E96800] shadow-md'
                    : 'bg-[#111111] text-[#A5A5A5] hover:text-white hover:bg-[#282828] border border-[#303030]'
                }`}
              >
                {isMicActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    <span>MIC LIVE (ON)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 text-[#FF7900]" />
                    <span>ENABLE MIC</span>
                  </>
                )}
              </button>

              <button
                onClick={handleToggleMute}
                disabled={!isMicActive}
                className={`py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                  !isMicActive
                    ? 'bg-[#111111] text-[#555555] border border-[#303030] cursor-not-allowed'
                    : isMuted
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-[#111111] text-white hover:bg-[#282828] border border-[#303030]'
                }`}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span>MUTED</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-[#A5A5A5]" />
                    <span>MUTE MIC</span>
                  </>
                )}
              </button>
            </div>

            {/* Volume / Software Gain Fader (0% - 150%) */}
            <div className="bg-[#111111] border border-[#303030] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#A5A5A5] font-semibold flex items-center space-x-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#FF7900]" />
                  <span>Input Gain / Volume</span>
                </span>
                <span className="font-mono font-bold text-white bg-[#202020] px-2 py-0.5 rounded border border-[#303030]">
                  {micVolume}%{' '}
                  <span className="text-[#A5A5A5] text-[10px]">
                    ({micVolume === 0 ? '-∞' : micVolume === 100 ? '0.0' : ((micVolume - 100) / 20).toFixed(1)} dB)
                  </span>
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="150"
                step="1"
                value={micVolume}
                disabled={!isMicActive}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full accent-[#FF7900] bg-[#303030] h-2 rounded-lg cursor-pointer disabled:opacity-40"
              />

              <div className="flex justify-between text-[10px] font-mono text-[#A5A5A5]">
                <span>0% (-∞)</span>
                <span className="text-[#FF7900] font-semibold">100% (Unity 0dB)</span>
                <span>150% (+6dB Boost)</span>
              </div>
            </div>

            {/* Headphone Monitoring (Sidetone) Toggle */}
            <div className="bg-[#111111] border border-[#303030] rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Headphones className={`w-4 h-4 ${isMonitoring ? 'text-[#FF7900]' : 'text-[#A5A5A5]'}`} />
                <div>
                  <div className="text-xs font-bold text-white">Headphone Monitoring</div>
                  <div className="text-[10px] text-[#A5A5A5]">Hear your mic in real time (use headphones)</div>
                </div>
              </div>
              <button
                onClick={handleToggleMonitoring}
                disabled={!isMicActive}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  !isMicActive
                    ? 'opacity-40 cursor-not-allowed bg-[#202020] text-[#A5A5A5]'
                    : isMonitoring
                    ? 'bg-[#FF7900] text-white shadow-sm'
                    : 'bg-[#202020] text-[#A5A5A5] hover:text-white border border-[#303030]'
                }`}
              >
                {isMonitoring ? 'MONITOR ON' : 'MONITOR OFF'}
              </button>
            </div>
          </div>

          {/* ==================== 2. LIVE LEVEL METER & RECORDING TRANSPORT (7 COLS) ==================== */}
          <div className="lg:col-span-7 bg-[#202020] border border-[#303030] rounded-xl p-5 space-y-5 flex flex-col justify-between">
            {/* Header with Level Meter Metrics */}
            <div className="flex items-center justify-between border-b border-[#303030] pb-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[#FF7900]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Live Level Meter & Signal Health
                </span>
              </div>

              {/* dBFS Readout */}
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="text-[#A5A5A5] text-[11px]">PEAK:</span>
                <span
                  className={`px-2 py-0.5 rounded font-bold ${
                    meterLevels.isClipping
                      ? 'bg-red-600 text-white animate-pulse'
                      : meterLevels.peakDecibels > -6
                      ? 'bg-amber-600/30 text-amber-300'
                      : 'bg-[#111111] text-[#FF7900] border border-[#303030]'
                  }`}
                >
                  {isMicActive && !isMuted ? `${meterLevels.peakDecibels.toFixed(1)} dBFS` : '-∞ dBFS'}
                </span>
              </div>
            </div>

            {/* Broadcast Multi-Segment LED Level Meter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-[#A5A5A5] px-1">
                <span>-48 dB</span>
                <span>-36 dB</span>
                <span>-24 dB</span>
                <span>-12 dB</span>
                <span className="text-amber-400 font-bold">-6 dB</span>
                <span className="text-red-400 font-bold">0 dB</span>
              </div>

              {/* Segmented VU Bars */}
              <div className="bg-[#111111] border border-[#303030] rounded-lg p-2.5 flex items-center space-x-1 h-9">
                {Array.from({ length: TOTAL_SEGMENTS }).map((_, idx) => {
                  const isLit = idx < activeSegments && isMicActive && !isMuted;
                  // Color coding:
                  // 0..15: Green (-48 to -12dB)
                  // 16..20: Amber (-12 to -3dB)
                  // 21..23: Red (-3 to 0dB)
                  let litColor = 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]';
                  let dimColor = 'bg-emerald-950/30';
                  if (idx >= 16 && idx <= 20) {
                    litColor = 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]';
                    dimColor = 'bg-amber-950/30';
                  } else if (idx >= 21) {
                    litColor = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]';
                    dimColor = 'bg-red-950/30';
                  }

                  return (
                    <div
                      key={idx}
                      className={`flex-1 h-full rounded-xs transition-colors duration-75 ${
                        isLit ? litColor : dimColor
                      }`}
                    />
                  );
                })}
              </div>

              {/* Signal Health Warning / Status Badge */}
              <div className="min-h-[26px] flex items-center justify-between text-xs pt-1 px-1">
                {!isMicActive ? (
                  <span className="text-[#A5A5A5] text-[11px] flex items-center space-x-1">
                    <Info className="w-3.5 h-3.5" />
                    <span>Microphone is in standby. Click Enable Mic to begin.</span>
                  </span>
                ) : isMuted ? (
                  <span className="text-red-400 font-semibold text-[11px] flex items-center space-x-1">
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Microphone is Muted. No audio signal is passing to meters.</span>
                  </span>
                ) : meterLevels.isClipping ? (
                  <span className="text-red-400 font-bold text-[11px] flex items-center space-x-1 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                    <span>CLIPPING WARNING — Peak is exceeding 0 dBFS. Lower the gain slider to avoid digital distortion.</span>
                  </span>
                ) : meterLevels.isLowSignal && recordingState === 'recording' ? (
                  <span className="text-amber-400 font-medium text-[11px] flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>LOW SIGNAL — Speak closer to your microphone or increase the input gain.</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-semibold text-[11px] flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Optimal Broadcast Level (-18 to -6 dBFS headroom)</span>
                  </span>
                )}

                {/* Audio Format Info */}
                <span className="text-[10px] text-[#A5A5A5] font-mono hidden sm:inline">
                  Broadcast Opus / 192 kbps
                </span>
              </div>
            </div>

            {/* Recording Controls & Timer Box */}
            <div className="bg-[#111111] border border-[#303030] rounded-xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Timer Display */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#A5A5A5] tracking-wider">
                    Recording Duration
                  </div>
                  <div className="text-3xl font-mono font-black tracking-tight text-white flex items-center space-x-2">
                    <Clock className="w-6 h-6 text-[#FF7900]" />
                    <span className={recordingState === 'recording' ? 'text-red-400' : 'text-white'}>
                      {formatTimer(recordTimerSec)}
                    </span>
                  </div>
                </div>

                {/* Transport Buttons */}
                <div className="flex items-center space-x-2 flex-wrap">
                  {recordingState === 'idle' || recordingState === 'stopped' ? (
                    <button
                      onClick={handleStartRecording}
                      className="px-5 py-3 rounded-lg font-bold text-sm bg-[#FF7900] hover:bg-[#E96800] text-white flex items-center space-x-2 shadow-lg transition-transform active:scale-95"
                    >
                      <Circle className="w-4 h-4 fill-red-500 text-red-500" />
                      <span>START RECORDING</span>
                    </button>
                  ) : (
                    <>
                      {recordingState === 'recording' ? (
                        <button
                          onClick={handlePauseRecording}
                          className="px-4 py-2.5 rounded-lg font-bold text-xs bg-[#202020] hover:bg-[#282828] text-white border border-[#303030] flex items-center space-x-1.5 transition-colors"
                        >
                          <Pause className="w-4 h-4 text-amber-400" />
                          <span>PAUSE</span>
                        </button>
                      ) : (
                        <button
                          onClick={handleResumeRecording}
                          className="px-4 py-2.5 rounded-lg font-bold text-xs bg-[#202020] hover:bg-[#282828] text-white border border-[#303030] flex items-center space-x-1.5 transition-colors"
                        >
                          <Play className="w-4 h-4 text-emerald-400 fill-current" />
                          <span>RESUME</span>
                        </button>
                      )}

                      <button
                        onClick={handleStopRecording}
                        className="px-4 py-2.5 rounded-lg font-bold text-xs bg-red-600 hover:bg-red-700 text-white flex items-center space-x-1.5 shadow-md transition-colors"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>STOP & PREVIEW</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {recordingState === 'recording' && (
                <div className="text-[11px] text-red-300/90 bg-red-950/40 border border-red-800/40 px-3 py-1.5 rounded-md flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
                  <span>Capturing microphone audio in high-fidelity broadcast format. Press Stop when finished to preview and download directly to your PC.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================== 3. RECORDED PREVIEW & DOWNLOAD CARD ==================== */}
        {activePreview && (
          <div className="bg-[#202020] border-2 border-[#FF7900]/70 rounded-xl p-5 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#303030] pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#FF7900] text-black flex items-center justify-center font-bold">
                  <FileAudio className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">RECORDING READY FOR DOWNLOAD</h3>
                  <p className="text-[11px] text-[#A5A5A5]">
                    Listen to preview, name your file, and save directly to your Windows hard drive
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 font-mono text-xs text-[#A5A5A5]">
                <span className="bg-[#111111] px-2 py-1 rounded border border-[#303030]">
                  Duration: {formatTimer(activePreview.duration)}
                </span>
                <span className="bg-[#111111] px-2 py-1 rounded border border-[#303030]">
                  Size: {formatFileSize(activePreview.fileSize)}
                </span>
              </div>
            </div>

            {/* Hidden HTML5 Audio Element for Preview */}
            <audio
              ref={previewAudioRef}
              src={activePreview.url}
              onTimeUpdate={(e) => setPreviewProgress(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setPreviewDuration(e.currentTarget.duration || activePreview.duration)}
              onEnded={() => {
                setIsPreviewPlaying(false);
                setPreviewProgress(0);
              }}
            />

            {/* Audio Timeline & Player Bar */}
            <div className="bg-[#111111] border border-[#303030] rounded-lg p-3.5 space-y-3">
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleTogglePreviewPlay}
                  className="w-10 h-10 rounded-full bg-[#FF7900] hover:bg-[#E96800] text-white flex items-center justify-center shrink-0 shadow-md transition-transform active:scale-95"
                >
                  {isPreviewPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Scrubber */}
                <div className="flex-1 space-y-1">
                  <input
                    type="range"
                    min="0"
                    max={previewDuration || activePreview.duration || 1}
                    step="0.05"
                    value={previewProgress}
                    onChange={(e) => handlePreviewSeek(Number(e.target.value))}
                    className="w-full accent-[#FF7900] bg-[#303030] h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#A5A5A5]">
                    <span>{formatTimer(previewProgress)}</span>
                    <span>{formatTimer(previewDuration || activePreview.duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filename Input & Direct PC Download Action */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-[11px] font-semibold text-[#A5A5A5] uppercase">
                  Recording Filename (Saved to PC)
                </label>
                <input
                  type="text"
                  value={proposedFilename}
                  onChange={(e) => setProposedFilename(e.target.value)}
                  placeholder="Enter file name (e.g. Morning_Show_VoiceTrack.webm)"
                  className="w-full bg-[#111111] border border-[#303030] rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#FF7900]"
                />
              </div>

              <div className="md:pt-5 shrink-0 flex items-center space-x-2">
                <button
                  onClick={() => handleDownload(activePreview, proposedFilename)}
                  className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-[#FF7900] hover:bg-[#E96800] text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg transition-transform active:scale-95"
                >
                  <FolderDown className="w-4 h-4" />
                  <span>DOWNLOAD RECORDING TO PC</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-[#A5A5A5] flex items-center space-x-2 bg-[#111111] border border-[#303030] p-2.5 rounded-lg">
              <HardDrive className="w-4 h-4 text-[#FF7900] shrink-0" />
              <span>
                Recordings are downloaded directly to your local computer disk. You can select your preferred Windows directory using your browser's download prompt or native save dialog.
              </span>
            </div>
          </div>
        )}

        {/* ==================== 4. RECORDING LIBRARY (SESSION HISTORY) ==================== */}
        <div className="bg-[#202020] border border-[#303030] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#303030] pb-3">
            <div className="flex items-center space-x-2">
              <FileAudio className="w-4 h-4 text-[#FF7900]" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Session Recording Library
              </span>
            </div>

            <span className="text-xs font-mono text-[#A5A5A5]">
              {sessionRecordings.length} {sessionRecordings.length === 1 ? 'Take' : 'Takes'} Recorded
            </span>
          </div>

          {sessionRecordings.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#A5A5A5] space-y-1">
              <Mic className="w-8 h-8 text-[#444444] mx-auto mb-2" />
              <p className="font-semibold text-white">No recordings captured in this session yet.</p>
              <p>Click "Start Recording" above to capture live voice tracks, station IDs, or radio interviews.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#303030]">
              {sessionRecordings.map((rec) => {
                const isSelected = activePreview?.id === rec.id;
                return (
                  <div
                    key={rec.id}
                    className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      isSelected ? 'bg-[#252525] -mx-2 px-2 rounded-lg' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-3 overflow-hidden">
                      <div className="w-9 h-9 rounded bg-[#111111] border border-[#303030] flex items-center justify-center text-[#FF7900] shrink-0">
                        <FileAudio className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-white text-xs truncate">{rec.name}</div>
                        <div className="text-[11px] text-[#A5A5A5] font-mono flex items-center space-x-2 mt-0.5">
                          <span>{formatTimer(rec.duration)}</span>
                          <span>•</span>
                          <span>{formatFileSize(rec.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(rec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setActivePreview(rec);
                          setProposedFilename(rec.name);
                          if (previewAudioRef.current) {
                            previewAudioRef.current.src = rec.url;
                            previewAudioRef.current.play().then(() => setIsPreviewPlaying(true)).catch(() => {});
                          }
                        }}
                        className="px-3 py-1.5 rounded bg-[#111111] hover:bg-[#282828] text-white border border-[#303030] text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 text-[#FF7900] fill-current" />
                        <span>Play</span>
                      </button>

                      <button
                        onClick={() => handleDownload(rec, rec.name)}
                        className="px-3 py-1.5 rounded bg-[#FF7900] hover:bg-[#E96800] text-white text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                        title="Download to computer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Save to PC</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRecording(rec.id)}
                        className="p-1.5 rounded hover:bg-red-950/40 text-[#A5A5A5] hover:text-red-400 border border-transparent hover:border-red-800/40 transition-colors"
                        title="Remove from session list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cloud Storage Disclaimer Reminder */}
          <div className="text-[11px] text-[#888888] pt-2 border-t border-[#303030]">
            * Note: RadioFlow records audio directly within your web browser environment. Recordings are held in temporary memory during your session and saved permanently only when downloaded to your local computer disk.
          </div>
        </div>
      </div>
    </div>
  );
};
