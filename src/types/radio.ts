export type MusicCategory =
  | 'Power Current'
  | 'Recurrent'
  | 'Classic Gold'
  | 'Jingle / Sweeper'
  | 'Station ID'
  | 'Promo'
  | 'Ad Spot'
  | 'News / Weather';

export interface CuePoints {
  cueIn: number;       // Seconds where audio starts (skips initial silence)
  rampIntro: number;   // Seconds from cueIn where singing/voice begins (DJ talk ramp)
  outroFade: number;   // Seconds where music starts fading
  nextTrigger: number; // Seconds where next track should fire (AutoDJ segue point)
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  bpm: number;
  musicalKey?: string;
  category: MusicCategory;
  filePath: string; // e.g. C:\RadioMusic\Hits\track01.mp3
  fileSize?: number;
  year?: number;
  energy?: number; // 1 to 5
  rating?: number;
  cuePoints: CuePoints;
  waveformPeaks?: number[]; // Normalized 0-1 peak array for fast rendering
  audioBlobUrl?: string; // Direct browser object URL when loaded via File System Access
  audioFile?: File;      // Native file reference
  mediaType?: 'mp3' | 'mp4'; // Supports MP3 audio and MP4 video/audio songs
  sourceType: 'local-file' | 'companion-agent' | 'station-embedded';
}

export interface DeckState {
  deckId: 'A' | 'B';
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0 to 1
  pitch: number;  // -16 to +16 percent
  eqHigh: number; // -12dB to +12dB
  eqMid: number;  // -12dB to +12dB
  eqLow: number;  // -12dB to +12dB
  isCueing: boolean;
  isLooping: boolean;
  vuLevelL: number; // 0 to 1
  vuLevelR: number; // 0 to 1
  peakL: number;
  peakR: number;
}

export interface CartPad {
  id: string;
  slot: number;
  label: string;
  sublabel: string;
  color: string;
  category: MusicCategory;
  hotkey: string;
  track: Track | null;
  playMode: 'trigger' | 'loop' | 'stutter';
  isPlaying: boolean;
  volume: number;
}

export interface AutoDJSettings {
  enabled: boolean;
  mode: 'manual' | 'autodj' | 'assisted';
  crossfadeDuration: number; // seconds (default 3.5s)
  crossfadeCurve: 'broadcast-dip' | 'constant-power' | 'linear';
  silenceThresholdDb: number;
  artistSeparationMinutes: number;
  autoCuePips: boolean;
  hourlyIdEnabled: boolean;
  gaplessPlayout: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  tracks: Track[];
  createdAt: string;
}

export interface PlaylistItem {
  queueId: string;
  track: Track;
  assignedDeck?: 'A' | 'B';
  scheduledTime?: string;
}

export interface ScheduleEvent {
  id: string;
  day: string; // Monday, Tuesday, etc.
  start: string; // "14:00"
  end: string; // "16:00"
  name: string;
  host: string;
  mode: 'manual' | 'autodj' | 'assisted';
  category: string;
  color: string;
  description: string;
}

export interface BroadcastLogItem {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  playedAt: string;
  source: 'deckA' | 'deckB' | 'autodj' | 'cart';
}

export interface StationStats {
  listenersCount: number;
  peakToday: number;
  uptimeSeconds: number;
  currentBitrate: number;
  streamStatus: 'online' | 'standby' | 'error';
  mountPoint: string;
  serverUrl: string;
}

export interface SessionRecording {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number; // in seconds
  createdAt: string; // ISO string
  fileSize: number; // in bytes
  format: string; // 'audio/webm' or 'audio/wav'
  extension: string; // 'webm' or 'wav'
}

