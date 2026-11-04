/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, NavSection } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { PlaybackBar } from './components/PlaybackBar';
import { DashboardView } from './components/DashboardView';
import { MusicView } from './components/MusicView';
import { PlaylistsView } from './components/PlaylistsView';
import { DjAndAutoDjView } from './components/DjAndAutoDjView';
import { ScheduleView } from './components/ScheduleView';
import { BroadcastView } from './components/BroadcastView';
import { SettingsView } from './components/SettingsView';
import { MicrophoneRecordingConsole } from './components/MicrophoneRecordingConsole';
import { Track, Playlist, PlaylistItem, AutoDJSettings, BroadcastLogItem, SessionRecording } from './types/radio';
import { audioEngine } from './services/audioEngine';
import {
  loadTracksFromDB,
  getTrackPlayableUrl,
  verifyTrackAvailability,
  checkCompanionAgentStatus,
  getStoredDirectoryHandle,
  scanLocalDirectoryWithFileSystemAccess,
} from './services/localFileManager';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [stationName, setStationName] = useState('BURN RADIO 104.5 HD');
  const [isOnAir, setIsOnAir] = useState(true);
  const [broadcastMode, setBroadcastMode] = useState<'manual' | 'autodj' | 'assisted'>('autodj');
  const [isCompanionOnline, setIsCompanionOnline] = useState(false);

  // Music & Playlists State - Starts with 0 demo songs (Verified local files only)
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([
    {
      id: 'pl-1',
      name: 'Power Currents & High Energy',
      tracks: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pl-2',
      name: 'Classic Gold Hits',
      tracks: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'pl-3',
      name: 'Station IDs & Sweepers',
      tracks: [],
      createdAt: new Date().toISOString(),
    },
  ]);

  // Playout & Playback Engine State
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(180);
  const [volume, setVolume] = useState(0.85);
  const [queue, setQueue] = useState<PlaylistItem[]>([]);

  // Auto DJ settings
  const [autoDJSettings, setAutoDJSettings] = useState<AutoDJSettings>({
    enabled: true,
    mode: 'autodj',
    crossfadeDuration: 3.5,
    crossfadeCurve: 'broadcast-dip',
    silenceThresholdDb: -45,
    artistSeparationMinutes: 45,
    autoCuePips: true,
    hourlyIdEnabled: true,
    gaplessPlayout: true,
  });

  // Recently played history (Real-time playback logs)
  const [recentlyPlayed, setRecentlyPlayed] = useState<BroadcastLogItem[]>([]);

  // Debounce ref to prevent duplicate AutoDJ transition triggers
  const isTransitioningRef = React.useRef(false);

  // Load verified local tracks from IndexedDB & companion agent on startup
  useEffect(() => {
    let isSubscribed = true;

    async function initLibrary() {
      // 1. Load cached verified metadata from IndexedDB
      const cached = await loadTracksFromDB();
      if (isSubscribed && cached && cached.length > 0) {
        setTracks(cached);
        if (!currentTrack) {
          setCurrentTrack(cached[0]);
          setDuration(cached[0].duration);
        }
      }

      // 2. Check for stored Windows directory handle and re-verify files
      const dirHandle = await getStoredDirectoryHandle();
      if (dirHandle) {
        try {
          const fresh = await scanLocalDirectoryWithFileSystemAccess(undefined, dirHandle);
          if (isSubscribed && fresh.length > 0) {
            setTracks(fresh);
            if (!currentTrack) {
              setCurrentTrack(fresh[0]);
              setDuration(fresh[0].duration);
            }
          }
        } catch (e) {
          console.log('Handle permissions need re-confirmation by user');
        }
      }

      // 3. Check local companion daemon on http://localhost:8901
      const status = await checkCompanionAgentStatus();
      if (isSubscribed) {
        setIsCompanionOnline(status.connected);
      }
      if (status.connected) {
        const { loadCompanionTracks } = await import('./services/localFileManager');
        const agentTracks = await loadCompanionTracks();
        if (isSubscribed && agentTracks.length > 0) {
          setTracks((prev) => {
            const paths = new Set(prev.map((t) => t.filePath));
            const newOnly = agentTracks.filter((t) => !paths.has(t.filePath));
            return [...prev, ...newOnly];
          });
          if (!currentTrack && agentTracks.length > 0) {
            setCurrentTrack(agentTracks[0]);
            setDuration(agentTracks[0].duration);
          }
        }
      }
    }

    initLibrary();

    const agentInterval = setInterval(async () => {
      const status = await checkCompanionAgentStatus();
      setIsCompanionOnline(status.connected);
    }, 8000);

    // Global Drag & drop listener for local MP3 and MP4 files from Windows Explorer
    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      const { processLocalFile } = await import('./services/localFileManager');
      const newItems: Track[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split('.').pop()?.toLowerCase();
        if (['mp3', 'mp4', 'm4v', 'wav', 'ogg', 'flac', 'm4a'].includes(ext || '')) {
          const trk = await processLocalFile(f, f.name);
          newItems.push(trk);
        }
      }
      if (newItems.length > 0) {
        setTracks((prev) => {
          const paths = new Set(prev.map((t) => t.filePath));
          const additions = newItems.filter((t) => !paths.has(t.filePath));
          return [...prev, ...additions];
        });
        playSpecificTrack(newItems[0]);
      }
    };

    const handleDragOver = (e: DragEvent) => e.preventDefault();

    window.addEventListener('drop', handleGlobalDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      isSubscribed = false;
      clearInterval(agentInterval);
      window.removeEventListener('drop', handleGlobalDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  // Hook up real HTML5 audio events (ended, timeupdate, error) for rock-solid playback & Auto DJ
  useEffect(() => {
    const audio = audioEngine.getAudioElement('A');
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }

      // Auto DJ Segue check (crossfade near track end)
      if (
        broadcastMode === 'autodj' &&
        audio.duration > 6 &&
        audio.currentTime >= audio.duration - autoDJSettings.crossfadeDuration &&
        !isTransitioningRef.current
      ) {
        isTransitioningRef.current = true;
        handleNext();
        setTimeout(() => {
          isTransitioningRef.current = false;
        }, 3000);
      }
    };

    const onEnded = () => {
      if (broadcastMode === 'autodj' || queue.length > 0) {
        handleNext();
      } else {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    const onError = (e: any) => {
      console.warn('Physical audio playback error, skipping to next track:', e);
      if (broadcastMode === 'autodj' || queue.length > 0) {
        handleNext();
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, [broadcastMode, queue, tracks, currentTrack, autoDJSettings.crossfadeDuration]);

  // Audio Playback Handlers
  const handleTogglePlay = async () => {
    audioEngine.ensureContext();
    if (!currentTrack) {
      if (queue.length > 0) {
        const next = queue[0];
        setQueue((prev) => prev.slice(1));
        await playSpecificTrack(next.track);
      } else if (tracks.length > 0) {
        await playSpecificTrack(tracks[0]);
      }
      return;
    }

    if (isPlaying) {
      audioEngine.pause('A');
      setIsPlaying(false);
    } else {
      const isAvailable = await verifyTrackAvailability(currentTrack);
      if (!isAvailable) {
        console.warn(`File for ${currentTrack.title} is not available on disk. Skipping.`);
        await handleNext();
        return;
      }
      const playableUrl = await getTrackPlayableUrl(currentTrack);
      if (!playableUrl) {
        await handleNext();
        return;
      }
      audioEngine.loadTrack('A', playableUrl);
      audioEngine.seek('A', currentTime);
      audioEngine.play('A');
      setIsPlaying(true);
    }
  };

  const playSpecificTrack = async (track: Track, autoStart = true) => {
    if (!track) return;
    audioEngine.ensureContext();

    // 1. Verify file availability physically exists on PC
    const isAvailable = await verifyTrackAvailability(track);
    if (!isAvailable) {
      console.warn(`Physical audio file missing: ${track.filePath}. Skipping.`);
      // If AutoDJ or Queue, move directly to next
      if (broadcastMode === 'autodj' || queue.length > 0) {
        await handleNext();
      }
      return;
    }

    // 2. Obtain real playable URL (blob or companion streaming)
    const playableUrl = await getTrackPlayableUrl(track);
    if (!playableUrl) {
      console.warn(`Could not read audio stream for ${track.title}. Skipping.`);
      if (broadcastMode === 'autodj') {
        await handleNext();
      }
      return;
    }

    setCurrentTrack(track);
    setCurrentTime(0);
    setDuration(track.duration);

    audioEngine.loadTrack('A', playableUrl);
    if (autoStart) {
      audioEngine.play('A');
      setIsPlaying(true);
    }

    // Record in history log
    const newLog: BroadcastLogItem = {
      id: `log-${Date.now()}`,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      playedAt: new Date().toISOString(),
      source: broadcastMode === 'autodj' ? 'autodj' : 'deckA',
    };
    setRecentlyPlayed((prev) => [newLog, ...prev.slice(0, 49)]);
  };

  const handleNext = async () => {
    if (queue.length > 0) {
      const nextItem = queue[0];
      setQueue((prev) => prev.slice(1));
      await playSpecificTrack(nextItem.track);
    } else if (tracks.length > 0) {
      const curIdx = tracks.findIndex((t) => t.id === currentTrack?.id);
      const nextIdx = (curIdx + 1) % tracks.length;
      await playSpecificTrack(tracks[nextIdx]);
    } else {
      audioEngine.stop('A');
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handlePrevious = async () => {
    if (currentTime > 3) {
      handleSeek(0);
    } else if (tracks.length > 0) {
      const prevIdx =
        (tracks.findIndex((t) => t.id === currentTrack?.id) - 1 + tracks.length) % tracks.length;
      await playSpecificTrack(tracks[prevIdx]);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    audioEngine.seek('A', time);
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    audioEngine.setVolume('A', vol);
  };

  const handlePlayPlaylist = async (playlist: Playlist) => {
    if (playlist.tracks.length === 0) return;
    const first = playlist.tracks[0];
    const rest = playlist.tracks.slice(1).map((t, i) => ({
      queueId: `q-${Date.now()}-${i}`,
      track: t,
    }));
    setQueue(rest);
    await playSpecificTrack(first);
  };

  const handleAddToPlaylist = (track: Track, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, tracks: [...pl.tracks, track] };
        }
        return pl;
      })
    );
  };

  const handleRemoveTrack = (trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    setPlaylists((prev) =>
      prev.map((pl) => ({
        ...pl,
        tracks: pl.tracks.filter((t) => t.id !== trackId),
      }))
    );
  };

  const handleStartAutoDj = (playlistId: string) => {
    setBroadcastMode('autodj');
    const pl = playlists.find((p) => p.id === playlistId) || playlists[0];
    if (pl && pl.tracks.length > 0) {
      handlePlayPlaylist(pl);
    } else {
      handleTogglePlay();
    }
  };

  const handleStopAutoDj = () => {
    setBroadcastMode('manual');
  };

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-[2px] text-white flex flex-col font-sans select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        currentSection={currentSection}
        setCurrentSection={setCurrentSection}
        isOpenMobile={isMobileMenuOpen}
        setIsOpenMobile={setIsMobileMenuOpen}
        isOnAir={isOnAir}
      />

      {/* Main Layout Area (offset for desktop sidebar) */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top Header Bar */}
        <TopBar
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          stationName={stationName}
          isCompanionOnline={isCompanionOnline}
        />

        {/* Primary Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-32">
          {currentSection === 'dashboard' && (
            <DashboardView
              isOnAir={isOnAir}
              broadcastMode={broadcastMode}
              isCompanionOnline={isCompanionOnline}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onSeek={handleSeek}
              recentlyPlayed={recentlyPlayed}
              onNavigate={(sec) => setCurrentSection(sec)}
              onToggleAutoDj={() =>
                broadcastMode === 'autodj' ? handleStopAutoDj() : handleStartAutoDj(playlists[0]?.id || '')
              }
            />
          )}

          {currentSection === 'recording' && (
            <div className="max-w-6xl mx-auto space-y-6">
              <MicrophoneRecordingConsole
                onRecordingSavedToDisk={(rec) => {
                  const newTrack: Track = {
                    id: `local-rec-${Date.now()}`,
                    title: rec.name.replace(/\.[^/.]+$/, ''),
                    artist: 'Studio Recording',
                    album: 'RadioFlow Voice Tracks',
                    duration: Math.round(rec.duration),
                    bpm: 120,
                    category: 'Station ID',
                    filePath: `C:\\RadioRecordings\\${rec.name}`,
                    fileSize: rec.fileSize,
                    cuePoints: {
                      cueIn: 0,
                      rampIntro: 0,
                      outroFade: Math.max(0, rec.duration - 1),
                      nextTrigger: Math.max(0, rec.duration - 0.5),
                    },
                    audioBlobUrl: rec.url,
                    sourceType: 'local-file',
                    mediaType: rec.extension === 'mp4' ? 'mp4' : 'mp3',
                  };
                  setTracks((prev) => [newTrack, ...prev]);
                }}
              />
            </div>
          )}

          {currentSection === 'music' && (
            <MusicView
              tracks={tracks}
              setTracks={setTracks}
              playlists={playlists}
              onPlayTrack={playSpecificTrack}
              onAddToPlaylist={handleAddToPlaylist}
              onRemoveTrack={handleRemoveTrack}
            />
          )}

          {currentSection === 'playlists' && (
            <PlaylistsView
              playlists={playlists}
              setPlaylists={setPlaylists}
              allTracks={tracks}
              onPlayPlaylist={handlePlayPlaylist}
              onPlayTrack={playSpecificTrack}
            />
          )}

          {currentSection === 'dj' && (
            <DjAndAutoDjView
              broadcastMode={broadcastMode}
              setBroadcastMode={setBroadcastMode}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onTogglePlay={handleTogglePlay}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onSeek={handleSeek}
              volume={volume}
              onVolumeChange={handleVolumeChange}
              queue={queue}
              setQueue={setQueue}
              playlists={playlists}
              autoDJSettings={autoDJSettings}
              setAutoDJSettings={setAutoDJSettings}
              onStartAutoDj={handleStartAutoDj}
              onStopAutoDj={handleStopAutoDj}
            />
          )}

          {currentSection === 'schedule' && (
            <ScheduleView playlists={playlists} />
          )}

          {currentSection === 'broadcast' && (
            <BroadcastView isOnAir={isOnAir} setIsOnAir={setIsOnAir} />
          )}

          {currentSection === 'settings' && (
            <SettingsView
              stationName={stationName}
              setStationName={setStationName}
              isCompanionOnline={isCompanionOnline}
            />
          )}
        </main>
      </div>

      {/* Fixed Compact Bottom Playback Bar */}
      <PlaybackBar
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onNext={handleNext}
        onPrevious={handlePrevious}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        broadcastMode={broadcastMode}
        isOnAir={isOnAir}
      />
    </div>
  );
}
