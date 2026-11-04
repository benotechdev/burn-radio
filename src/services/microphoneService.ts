// Professional Web Audio & MediaRecorder Service for RADIOFLOW

export interface AudioDeviceOption {
  deviceId: string;
  label: string;
  groupId?: string;
}

export interface MeterLevels {
  rms: number;      // 0 to 1
  peak: number;     // 0 to 1
  peakDecibels: number; // dBFS (-Infinity to 0)
  isClipping: boolean;  // peak > 0.95 (~ -0.4 dBFS)
  isLowSignal: boolean; // rms < 0.03 (~ -30 dBFS) when unmuted
}

export interface RecordingResult {
  blob: Blob;
  url: string;
  duration: number; // seconds
  mimeType: string;
  extension: string;
  sizeBytes: number;
}

class MicrophoneService {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private monitorGainNode: GainNode | null = null;

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingStartTime = 0;
  private recordingElapsedMs = 0;
  private pauseStartTime = 0;
  private isPaused = false;
  private isRecording = false;

  private currentDeviceId: string = '';
  private isMuted: boolean = false;
  private currentGainValue: number = 1.0; // 1.0 = 100%
  private isMonitoring: boolean = false;

  private levelListeners: Set<(levels: MeterLevels) => void> = new Set();
  private animFrameId: number | null = null;
  private lastPeak = 0;

  // Initialize or ensure audio context
  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Get available audio input devices
  public async getAudioInputDevices(): Promise<AudioDeviceOption[]> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        return [];
      }
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${index + 1}`,
          groupId: d.groupId,
        }));
      return audioInputs;
    } catch (err) {
      console.warn('Failed to enumerate audio devices:', err);
      return [];
    }
  }

  // Request microphone permission and initialize audio pipeline
  public async initializeMicrophone(deviceId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const ctx = this.ensureContext();

      // Clean up previous stream if open
      this.cleanupStream();

      const constraints: MediaStreamConstraints = {
        audio: deviceId
          ? {
              deviceId: { exact: deviceId },
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false, // Let user have manual gain control
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: false,
            },
        video: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.micStream = stream;
      if (deviceId) {
        this.currentDeviceId = deviceId;
      } else {
        const track = stream.getAudioTracks()[0];
        this.currentDeviceId = track?.getSettings()?.deviceId || 'default';
      }

      // Build Web Audio pipeline:
      // MediaStream -> SourceNode -> GainNode -> AnalyserNode
      //                              GainNode -> DestinationNode (for MediaRecorder)
      //                              GainNode -> MonitorGainNode -> ctx.destination (for headphone monitoring)
      this.sourceNode = ctx.createMediaStreamSource(stream);

      this.gainNode = ctx.createGain();
      this.gainNode.gain.value = this.isMuted ? 0 : this.currentGainValue;

      this.analyserNode = ctx.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.65;

      this.destinationNode = ctx.createMediaStreamDestination();

      this.monitorGainNode = ctx.createGain();
      this.monitorGainNode.gain.value = this.isMonitoring ? 0.9 : 0.0;

      // Connect nodes
      this.sourceNode.connect(this.gainNode);
      this.gainNode.connect(this.analyserNode);
      this.gainNode.connect(this.destinationNode);
      this.gainNode.connect(this.monitorGainNode);
      this.monitorGainNode.connect(ctx.destination);

      // Listen for unexpected track end (e.g., unplugged mic)
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.onended = () => {
          this.cleanupStream();
        };
      }

      // Start level meter loop
      this.startLevelMeter();

      return { success: true };
    } catch (err: any) {
      console.error('Error starting microphone:', err);
      let errorMsg = 'Failed to access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Permission denied. Please grant microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device was detected on your computer.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Microphone is already in use by another Windows application.';
      }
      return { success: false, error: errorMsg };
    }
  }

  // Adjust volume / amplitude (0.0 to 2.0)
  public setVolume(volumeNorm: number) {
    this.currentGainValue = Math.max(0, Math.min(2.0, volumeNorm));
    if (this.gainNode && this.audioCtx) {
      if (!this.isMuted) {
        this.gainNode.gain.setTargetAtTime(this.currentGainValue, this.audioCtx.currentTime, 0.03);
      }
    }
  }

  // Toggle Mute
  public setMute(mute: boolean) {
    this.isMuted = mute;
    if (this.gainNode && this.audioCtx) {
      const target = mute ? 0 : this.currentGainValue;
      this.gainNode.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.03);
    }
    // Also disable track for privacy
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((t) => (t.enabled = !mute));
    }
  }

  // Headphone monitoring (sidetone)
  public setMonitoring(enable: boolean) {
    this.isMonitoring = enable;
    if (this.monitorGainNode && this.audioCtx) {
      const target = enable ? 0.9 : 0.0;
      this.monitorGainNode.gain.setTargetAtTime(target, this.audioCtx.currentTime, 0.05);
    }
  }

  // Subscribe to live audio meter levels
  public onLevelUpdate(callback: (levels: MeterLevels) => void): () => void {
    this.levelListeners.add(callback);
    return () => {
      this.levelListeners.delete(callback);
    };
  }

  // Start continuous level meter calculation loop
  private startLevelMeter() {
    if (this.animFrameId !== null) return;

    const buffer = new Float32Array(this.analyserNode?.fftSize || 256);

    const checkLevel = () => {
      if (this.analyserNode && !this.isMuted) {
        this.analyserNode.getFloatTimeDomainData(buffer);

        let sumSquares = 0;
        let peak = 0;
        for (let i = 0; i < buffer.length; i++) {
          const val = buffer[i];
          const absVal = Math.abs(val);
          if (absVal > peak) peak = absVal;
          sumSquares += val * val;
        }

        const rms = Math.sqrt(sumSquares / buffer.length);

        // Smooth peak decay
        if (peak > this.lastPeak) {
          this.lastPeak = peak;
        } else {
          this.lastPeak = Math.max(0, this.lastPeak - 0.03);
        }

        const peakDecibels = this.lastPeak > 0.0001 ? 20 * Math.log10(this.lastPeak) : -96;

        const isClipping = this.lastPeak >= 0.95; // > -0.45 dBFS
        const isLowSignal = this.lastPeak < 0.03;  // < -30 dBFS

        const levels: MeterLevels = {
          rms,
          peak: this.lastPeak,
          peakDecibels: Math.max(-96, Math.min(0, peakDecibels)),
          isClipping,
          isLowSignal,
        };

        this.levelListeners.forEach((fn) => fn(levels));
      } else {
        const mutedLevels: MeterLevels = {
          rms: 0,
          peak: 0,
          peakDecibels: -96,
          isClipping: false,
          isLowSignal: false,
        };
        this.levelListeners.forEach((fn) => fn(mutedLevels));
      }

      this.animFrameId = requestAnimationFrame(checkLevel);
    };

    this.animFrameId = requestAnimationFrame(checkLevel);
  }

  // Pick best supported MIME type
  public getBestSupportedMimeType(): { mimeType: string; extension: string } {
    const types = [
      { mime: 'audio/webm;codecs=opus', ext: 'webm' },
      { mime: 'audio/webm', ext: 'webm' },
      { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
      { mime: 'audio/mp4', ext: 'mp4' },
      { mime: 'audio/wav', ext: 'wav' },
    ];

    for (const t of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t.mime)) {
        return { mimeType: t.mime, extension: t.ext };
      }
    }
    return { mimeType: 'audio/webm', extension: 'webm' };
  }

  // Start recording
  public startRecording(): { success: boolean; error?: string } {
    if (!this.micStream || !this.destinationNode) {
      return { success: false, error: 'Microphone stream is not active. Please enable microphone first.' };
    }

    try {
      this.ensureContext();
      this.recordedChunks = [];

      const { mimeType } = this.getBestSupportedMimeType();
      const options: MediaRecorderOptions = {
        audioBitsPerSecond: 192000, // 192 kbps broadcast quality
      };
      if (MediaRecorder.isTypeSupported(mimeType)) {
        options.mimeType = mimeType;
      }

      // Record from the post-gain destination node (captures volume slider & mute accurately)
      this.mediaRecorder = new MediaRecorder(this.destinationNode.stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(250); // Emit chunk every 250ms
      this.recordingStartTime = performance.now();
      this.recordingElapsedMs = 0;
      this.isRecording = true;
      this.isPaused = false;

      return { success: true };
    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      return { success: false, error: err.message || 'Could not start recording engine.' };
    }
  }

  // Pause recording
  public pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseStartTime = performance.now();
      this.recordingElapsedMs += this.pauseStartTime - this.recordingStartTime;
      this.isPaused = true;
    }
  }

  // Resume recording
  public resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
      this.recordingStartTime = performance.now();
      this.isPaused = false;
    }
  }

  // Stop recording and return final audio result
  public async stopRecording(): Promise<RecordingResult | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
      return null;
    }

    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      // Compute total elapsed time
      if (!this.isPaused) {
        this.recordingElapsedMs += performance.now() - this.recordingStartTime;
      }
      const durationSeconds = Math.max(0.5, this.recordingElapsedMs / 1000);

      this.mediaRecorder.onstop = () => {
        const { mimeType, extension } = this.getBestSupportedMimeType();
        const recordedBlob = new Blob(this.recordedChunks, { type: mimeType });
        const objectUrl = URL.createObjectURL(recordedBlob);

        const result: RecordingResult = {
          blob: recordedBlob,
          url: objectUrl,
          duration: durationSeconds,
          mimeType,
          extension,
          sizeBytes: recordedBlob.size,
        };

        this.isRecording = false;
        this.isPaused = false;
        this.recordedChunks = [];
        resolve(result);
      };

      this.mediaRecorder.stop();
    });
  }

  // Save audio blob directly to user's computer
  public async downloadRecordingToDisk(blob: Blob, proposedFilename: string): Promise<boolean> {
    // 1. Try modern Native File System Access API (allows picking folder directly on Windows)
    if ('showSaveFilePicker' in window) {
      try {
        const ext = proposedFilename.split('.').pop() || 'webm';
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: proposedFilename,
          types: [
            {
              description: 'Audio Recording File',
              accept: {
                [blob.type || 'audio/webm']: [`.${ext}`],
              },
            },
          ],
        });
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();
        return true;
      } catch (err: any) {
        // User aborted picker, or fallback required
        if (err.name === 'AbortError') {
          return false;
        }
        console.warn('showSaveFilePicker failed or was rejected, falling back to standard download:', err);
      }
    }

    // 2. Standard browser download fallback
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = proposedFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
      return true;
    } catch (err) {
      console.error('Standard download failed:', err);
      return false;
    }
  }

  // Clean up all resources
  public cleanupStream() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  // Getters
  public getIsRecording(): boolean {
    return this.isRecording;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getIsLive(): boolean {
    return !!this.micStream && !this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getCurrentDeviceId(): string {
    return this.currentDeviceId;
  }
}

export const microphoneService = new MicrophoneService();
