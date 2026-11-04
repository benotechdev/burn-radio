// Web Audio API Broadcast Playout Engine with Dual Decks, 3-Band EQ, Auto-Ducker, Master Limiter, and Cart Wall

class BroadcastAudioEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Master bus
  private masterGain: GainNode | null = null;
  private masterLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private duckerGain: GainNode | null = null;

  // Deck A nodes
  private deckAElem: HTMLAudioElement | null = null;
  private deckASource: MediaElementAudioSourceNode | null = null;
  private deckAGain: GainNode | null = null;
  private deckACrossGain: GainNode | null = null;
  private deckAEqLow: BiquadFilterNode | null = null;
  private deckAEqMid: BiquadFilterNode | null = null;
  private deckAEqHigh: BiquadFilterNode | null = null;
  private deckAAnalyser: AnalyserNode | null = null;

  // Deck B nodes
  private deckBElem: HTMLAudioElement | null = null;
  private deckBSource: MediaElementAudioSourceNode | null = null;
  private deckBGain: GainNode | null = null;
  private deckBCrossGain: GainNode | null = null;
  private deckBEqLow: BiquadFilterNode | null = null;
  private deckBEqMid: BiquadFilterNode | null = null;
  private deckBEqHigh: BiquadFilterNode | null = null;
  private deckBAnalyser: AnalyserNode | null = null;

  // Microphone
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private micGain: GainNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private isMicLive = false;

  // Procedural Synth Tone generators for embedded playback
  private synthNodes: { [key: string]: { osc: OscillatorNode; gain: GainNode }[] } = {};

  // Cart Wall audio elements cache
  private cartAudioMap = new Map<string, HTMLAudioElement>();

  public init() {
    if (this.isInitialized) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master processing
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;

    // Omnia/Orban-style Broadcast Limiter / Multiband compressor emulation
    this.masterLimiter = this.ctx.createDynamicsCompressor();
    this.masterLimiter.threshold.value = -6;
    this.masterLimiter.knee.value = 8;
    this.masterLimiter.ratio.value = 8;
    this.masterLimiter.attack.value = 0.003;
    this.masterLimiter.release.value = 0.25;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;
    this.masterAnalyser.smoothingTimeConstant = 0.8;

    // Auto-ducker gain (ducks decks when DJ speaks)
    this.duckerGain = this.ctx.createGain();
    this.duckerGain.gain.value = 1.0;

    // Connect Ducker -> Master Gain -> Limiter -> Analyser -> Speakers
    this.duckerGain.connect(this.masterGain);
    this.masterGain.connect(this.masterLimiter);
    this.masterLimiter.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Setup Deck A audio element & DSP chain
    this.setupDeckA();
    // Setup Deck B audio element & DSP chain
    this.setupDeckB();

    this.isInitialized = true;
  }

  public ensureContext() {
    if (!this.ctx) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupDeckA() {
    if (!this.ctx || !this.duckerGain) return;
    this.deckAElem = new Audio();
    this.deckAElem.crossOrigin = 'anonymous';
    this.deckAElem.preload = 'auto';

    this.deckASource = this.ctx.createMediaElementSource(this.deckAElem);
    this.deckAEqLow = this.ctx.createBiquadFilter();
    this.deckAEqLow.type = 'lowshelf';
    this.deckAEqLow.frequency.value = 250;

    this.deckAEqMid = this.ctx.createBiquadFilter();
    this.deckAEqMid.type = 'peaking';
    this.deckAEqMid.frequency.value = 1500;
    this.deckAEqMid.Q.value = 1.0;

    this.deckAEqHigh = this.ctx.createBiquadFilter();
    this.deckAEqHigh.type = 'highshelf';
    this.deckAEqHigh.frequency.value = 6500;

    this.deckAGain = this.ctx.createGain();
    this.deckAGain.gain.value = 1.0;

    this.deckACrossGain = this.ctx.createGain();
    this.deckACrossGain.gain.value = 1.0;

    this.deckAAnalyser = this.ctx.createAnalyser();
    this.deckAAnalyser.fftSize = 128;

    // Chain: Source -> Low EQ -> Mid EQ -> High EQ -> Channel Gain -> Crossfade Gain -> Analyser -> Ducker Gain
    this.deckASource
      .connect(this.deckAEqLow)
      .connect(this.deckAEqMid)
      .connect(this.deckAEqHigh)
      .connect(this.deckAGain)
      .connect(this.deckACrossGain)
      .connect(this.deckAAnalyser);

    this.deckACrossGain.connect(this.duckerGain);
  }

  private setupDeckB() {
    if (!this.ctx || !this.duckerGain) return;
    this.deckBElem = new Audio();
    this.deckBElem.crossOrigin = 'anonymous';
    this.deckBElem.preload = 'auto';

    this.deckBSource = this.ctx.createMediaElementSource(this.deckBElem);
    this.deckBEqLow = this.ctx.createBiquadFilter();
    this.deckBEqLow.type = 'lowshelf';
    this.deckBEqLow.frequency.value = 250;

    this.deckBEqMid = this.ctx.createBiquadFilter();
    this.deckBEqMid.type = 'peaking';
    this.deckBEqMid.frequency.value = 1500;
    this.deckBEqMid.Q.value = 1.0;

    this.deckBEqHigh = this.ctx.createBiquadFilter();
    this.deckBEqHigh.type = 'highshelf';
    this.deckBEqHigh.frequency.value = 6500;

    this.deckBGain = this.ctx.createGain();
    this.deckBGain.gain.value = 1.0;

    this.deckBCrossGain = this.ctx.createGain();
    this.deckBCrossGain.gain.value = 1.0;

    this.deckBAnalyser = this.ctx.createAnalyser();
    this.deckBAnalyser.fftSize = 128;

    // Chain: Source -> Low EQ -> Mid EQ -> High EQ -> Channel Gain -> Crossfade Gain -> Analyser -> Ducker Gain
    this.deckBSource
      .connect(this.deckBEqLow)
      .connect(this.deckBEqMid)
      .connect(this.deckBEqHigh)
      .connect(this.deckBGain)
      .connect(this.deckBCrossGain)
      .connect(this.deckBAnalyser);

    this.deckBCrossGain.connect(this.duckerGain);
  }

  // Load track into deck
  public loadTrack(deckId: 'A' | 'B', urlOrBlob: string) {
    this.ensureContext();
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (!elem) return;
    elem.src = urlOrBlob;
    elem.load();
  }

  public play(deckId: 'A' | 'B') {
    this.ensureContext();
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (!elem) return;
    elem.play().catch((err) => {
      console.warn(`Deck ${deckId} playback notice:`, err.message);
    });
  }

  public pause(deckId: 'A' | 'B') {
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (elem) elem.pause();
  }

  public stop(deckId: 'A' | 'B') {
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (elem) {
      elem.pause();
      elem.currentTime = 0;
    }
  }

  public seek(deckId: 'A' | 'B', timeInSeconds: number) {
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (elem && isFinite(timeInSeconds)) {
      elem.currentTime = Math.max(0, timeInSeconds);
    }
  }

  public setVolume(deckId: 'A' | 'B', vol: number) {
    const gainNode = deckId === 'A' ? this.deckAGain : this.deckBGain;
    if (gainNode && this.ctx) {
      gainNode.gain.setTargetAtTime(Math.max(0, Math.min(1.2, vol)), this.ctx.currentTime, 0.05);
    }
  }

  public setPitch(deckId: 'A' | 'B', pitchPercent: number) {
    const elem = deckId === 'A' ? this.deckAElem : this.deckBElem;
    if (elem) {
      // e.g. pitchPercent = +8 -> rate = 1.08
      const rate = 1 + pitchPercent / 100;
      elem.playbackRate = Math.max(0.5, Math.min(2.0, rate));
    }
  }

  public setEq(deckId: 'A' | 'B', band: 'low' | 'mid' | 'high', valueDb: number) {
    const eq =
      deckId === 'A'
        ? band === 'low'
          ? this.deckAEqLow
          : band === 'mid'
          ? this.deckAEqMid
          : this.deckAEqHigh
        : band === 'low'
        ? this.deckBEqLow
        : band === 'mid'
        ? this.deckBEqMid
        : this.deckBEqHigh;

    if (eq && this.ctx) {
      eq.gain.setTargetAtTime(Math.max(-24, Math.min(12, valueDb)), this.ctx.currentTime, 0.05);
    }
  }

  // Crossfader position: -1.0 (Full A) to 0.0 (Center) to +1.0 (Full B)
  public setCrossfader(
    pos: number,
    curve: 'broadcast-dip' | 'constant-power' | 'linear' = 'broadcast-dip'
  ) {
    if (!this.deckACrossGain || !this.deckBCrossGain || !this.ctx) return;
    // Map -1..1 to 0..1
    const x = (pos + 1) / 2;
    let gainA = 1;
    let gainB = 1;

    if (curve === 'linear') {
      gainA = 1 - x;
      gainB = x;
    } else if (curve === 'constant-power') {
      // Equal power curve
      gainA = Math.cos((x * Math.PI) / 2);
      gainB = Math.sin((x * Math.PI) / 2);
    } else {
      // Broadcast dip (-3dB dip in center for radio voice clarity)
      gainA = x <= 0.5 ? 1 : Math.cos(((x - 0.5) * Math.PI));
      gainB = x >= 0.5 ? 1 : Math.sin((x * Math.PI));
    }

    const t = this.ctx.currentTime;
    this.deckACrossGain.gain.setTargetAtTime(Math.max(0, Math.min(1, gainA)), t, 0.04);
    this.deckBCrossGain.gain.setTargetAtTime(Math.max(0, Math.min(1, gainB)), t, 0.04);
  }

  // Auto-Ducker Microphone handling
  public async toggleMicrophone(enable?: boolean): Promise<boolean> {
    this.ensureContext();
    const shouldEnable = enable !== undefined ? enable : !this.isMicLive;

    if (shouldEnable) {
      try {
        if (!this.micStream) {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        }

        if (this.ctx && !this.micSource && this.micStream) {
          this.micSource = this.ctx.createMediaStreamSource(this.micStream);
          this.micGain = this.ctx.createGain();
          this.micGain.gain.value = 1.0;

          // Low-cut rumble filter for broadcaster mic (<80Hz)
          const micFilter = this.ctx.createBiquadFilter();
          micFilter.type = 'highpass';
          micFilter.frequency.value = 80;

          this.micAnalyser = this.ctx.createAnalyser();
          this.micAnalyser.fftSize = 128;

          this.micSource
            .connect(micFilter)
            .connect(this.micGain)
            .connect(this.micAnalyser);

          // Direct mic to master bus (not through ducker so mic is loud and clear!)
          if (this.masterGain) {
            this.micGain.connect(this.masterGain);
          }
        }

        // Apply smooth Ducking to decks (-15dB = ~0.18 gain)
        if (this.duckerGain && this.ctx) {
          this.duckerGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 0.15);
        }

        this.isMicLive = true;
        return true;
      } catch (err) {
        console.error('Microphone access failed:', err);
        this.isMicLive = false;
        return false;
      }
    } else {
      // Un-duck decks smoothly
      if (this.duckerGain && this.ctx) {
        this.duckerGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.35);
      }
      this.isMicLive = false;
      return false;
    }
  }

  public getMicState(): boolean {
    return this.isMicLive;
  }

  // Real-time audio VU levels (RMS & Peak)
  public getLevels(deckId: 'A' | 'B' | 'master' | 'mic'): { level: number; peak: number } {
    let analyser: AnalyserNode | null = null;
    if (deckId === 'A') analyser = this.deckAAnalyser;
    else if (deckId === 'B') analyser = this.deckBAnalyser;
    else if (deckId === 'master') analyser = this.masterAnalyser;
    else if (deckId === 'mic') analyser = this.micAnalyser;

    if (!analyser) return { level: 0, peak: 0 };

    const buffer = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buffer);

    let sumSquares = 0;
    let peak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const normalized = (buffer[i] - 128) / 128;
      const absVal = Math.abs(normalized);
      if (absVal > peak) peak = absVal;
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / buffer.length);
    return {
      level: Math.min(1, rms * 2.5),
      peak: Math.min(1, peak * 1.2),
    };
  }

  // Audio elements getters for event listeners (timeupdate, ended, loadedmetadata)
  public getAudioElement(deckId: 'A' | 'B'): HTMLAudioElement | null {
    return deckId === 'A' ? this.deckAElem : this.deckBElem;
  }

  // Procedural Station Synthesizer for Jingles, Pips, and Sweepers
  public playProceduralTone(type: 'toh-pips' | 'sweeper' | 'stager' | 'sub-drop') {
    this.ensureContext();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;

    if (type === 'toh-pips') {
      // BBC/NPR style Greenwich Time Signal: 5 short 100ms pips (1000Hz) + 1 long 500ms pip on the hour
      for (let i = 0; i < 5; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.value = 1000;
        osc.type = 'sine';
        const start = now + i * 1.0;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.4, start + 0.01);
        gain.gain.setValueAtTime(0.4, start + 0.1);
        gain.gain.linearRampToValueAtTime(0, start + 0.11);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 0.12);
      }
      // 6th final chime
      const finalOsc = this.ctx.createOscillator();
      const finalGain = this.ctx.createGain();
      finalOsc.frequency.value = 1000;
      finalOsc.type = 'sine';
      const finalStart = now + 5.0;
      finalGain.gain.setValueAtTime(0, finalStart);
      finalGain.gain.linearRampToValueAtTime(0.5, finalStart + 0.01);
      finalGain.gain.setValueAtTime(0.5, finalStart + 0.5);
      finalGain.gain.linearRampToValueAtTime(0, finalStart + 0.6);
      finalOsc.connect(finalGain);
      finalGain.connect(this.masterGain);
      finalOsc.start(finalStart);
      finalOsc.stop(finalStart + 0.65);
    } else if (type === 'sweeper') {
      // FM Radio laser whoosh sweeper
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 1.2);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2000, now);
      filter.frequency.exponentialRampToValueAtTime(300, now + 1.2);
      filter.Q.value = 4.0;

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc.connect(filter).connect(gain).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.25);
    } else if (type === 'stager') {
      // 3-note broadcast harmonic station stager (A4 - C#5 - E5)
      const freqs = [440, 554.37, 659.25];
      freqs.forEach((f, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const start = now + idx * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 1.8);
        osc.connect(gain).connect(this.masterGain);
        osc.start(start);
        osc.stop(start + 1.85);
      });
    } else if (type === 'sub-drop') {
      // 808 Sub drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 1.5);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain).connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 1.55);
    }
  }

  // Procedural full audio track generator for instant studio playback
  public generateProceduralTrackBuffer(durationSec: number = 60, seedBpm: number = 120): string {
    this.ensureContext();
    if (!this.ctx) return '';

    // Create an offline audio context to synthesize an actual playable audio file
    const sampleRate = 44100;
    const offlineCtx = new (window.OfflineAudioContext || (window as any).webkitOfflineAudioContext)(
      2,
      sampleRate * durationSec,
      sampleRate
    );

    const beatInterval = 60 / seedBpm;
    const totalBeats = Math.floor(durationSec / beatInterval);

    // Kick drum & bass line synthesis
    for (let b = 0; b < totalBeats; b++) {
      const beatTime = b * beatInterval;

      // Kick on every beat
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.frequency.setValueAtTime(140, beatTime);
      kickOsc.frequency.exponentialRampToValueAtTime(42, beatTime + 0.12);
      kickGain.gain.setValueAtTime(0.8, beatTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.18);
      kickOsc.connect(kickGain).connect(offlineCtx.destination);
      kickOsc.start(beatTime);
      kickOsc.stop(beatTime + 0.2);

      // Snare / clap on beats 2 and 4
      if (b % 2 === 1) {
        const snareNoise = offlineCtx.createBufferSource();
        const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * 0.15, sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        snareNoise.buffer = noiseBuffer;
        const snareGain = offlineCtx.createGain();
        snareGain.gain.setValueAtTime(0.35, beatTime);
        snareGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.15);
        snareNoise.connect(snareGain).connect(offlineCtx.destination);
        snareNoise.start(beatTime);
        snareNoise.stop(beatTime + 0.16);
      }

      // Synth chords progression
      if (b % 4 === 0) {
        const chordRoots = [220, 261.63, 196, 174.61]; // Am, C, G, F
        const root = chordRoots[(b / 4) % chordRoots.length];
        [root, root * 1.25, root * 1.5].forEach((f) => {
          const osc = offlineCtx.createOscillator();
          const g = offlineCtx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.value = f;
          g.gain.setValueAtTime(0.12, beatTime);
          g.gain.exponentialRampToValueAtTime(0.005, beatTime + beatInterval * 3.8);
          osc.connect(g).connect(offlineCtx.destination);
          osc.start(beatTime);
          osc.stop(beatTime + beatInterval * 3.9);
        });
      }
    }

    // Convert rendered buffer to WAV blob URL
    // We will render asynchronously, but return empty or promise
    return '';
  }

  // Quick WAV builder for immediate Audio element playback
  public createSynthTrackUrl(durationSec = 90, bpm = 124, keyNote = 220): string {
    const sampleRate = 22050; // Lower rate for instant synchronous render
    const numSamples = sampleRate * durationSec;
    const buffer = new ArrayBuffer(44 + numSamples * 2);
    const view = new DataView(buffer);

    // WAV header
    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + numSamples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, numSamples * 2, true);

    const beatLen = sampleRate * (60 / bpm);
    let offset = 44;

    for (let i = 0; i < numSamples; i++) {
      const beatPos = i % beatLen;
      const beatNum = Math.floor(i / beatLen);
      let sample = 0;

      // Kick drum on 1, 2, 3, 4
      if (beatPos < sampleRate * 0.15) {
        const t = beatPos / sampleRate;
        const kickFreq = 130 * Math.exp(-t * 22);
        const kickEnv = Math.exp(-t * 20);
        sample += Math.sin(2 * Math.PI * kickFreq * t) * kickEnv * 0.45;
      }

      // Snare on 2 and 4
      if (beatNum % 2 === 1 && beatPos < sampleRate * 0.12) {
        const t = beatPos / sampleRate;
        const noise = (Math.random() * 2 - 1) * Math.exp(-t * 25) * 0.25;
        sample += noise;
      }

      // Melodic bass / pad
      const chords = [keyNote, keyNote * 1.2, keyNote * 0.9, keyNote * 0.8];
      const curRoot = chords[Math.floor(beatNum / 4) % chords.length];
      const t = i / sampleRate;
      sample += Math.sin(2 * Math.PI * curRoot * t) * 0.15;
      sample += Math.sin(2 * Math.PI * (curRoot * 1.5) * t) * 0.08;

      // Clamp 16-bit PCM
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }
}

export const audioEngine = new BroadcastAudioEngine();
