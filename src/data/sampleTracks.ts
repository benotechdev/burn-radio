import { Track } from '../types/radio';

// Generate synthetic waveform peaks for visualizer representation
export function generateWaveform(seed: number, count = 80): number[] {
  const peaks: number[] = [];
  let val = 0.4;
  for (let i = 0; i < count; i++) {
    const noise = Math.sin(i * 0.2 + seed) * 0.35 + Math.cos(i * 0.08 + seed * 2) * 0.25;
    val = Math.min(0.98, Math.max(0.12, Math.abs(val * 0.3 + noise * 0.7 + (Math.sin(i * 1.5) * 0.2))));
    peaks.push(parseFloat(val.toFixed(2)));
  }
  return peaks;
}

export const INITIAL_STATION_TRACKS: Track[] = [];

