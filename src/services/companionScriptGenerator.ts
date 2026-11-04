export interface CompanionConfig {
  stationName: string;
  musicDirectory: string;
  companionPort: number;
  icecastHost: string;
  icecastPort: number;
  icecastMount: string;
  icecastPassword: string;
  bitrate: number;
  crossfadeDuration: number;
}

export function generateCompanionAgentScript(config: CompanionConfig): string {
  return `/**
 * =========================================================================
 * RADIOFLOW - LOCAL RADIO COMPANION SERVICE (Windows / Mac / Linux)
 * =========================================================================
 * This lightweight local background daemon runs directly on your PC.
 * It indexes your local music files, reads audio tags, and serves streams
 * securely to your RADIOFLOW Studio interface without uploading to any cloud!
 *
 * Requirements: Node.js 18+ (https://nodejs.org)
 * Usage: node radioflow-agent.js
 * =========================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = ${config.companionPort || 8901};
const MUSIC_DIR = process.env.RADIOFLOW_DIR || "${config.musicDirectory.replace(/\\/g, '\\\\')}";

let indexedTracks = [];

console.log('\\x1b[36m%s\\x1b[0m', '================================================');
console.log('\\x1b[32m%s\\x1b[0m', '  RADIOFLOW - LOCAL COMPANION AGENT v2.4');
console.log('\\x1b[36m%s\\x1b[0m', '================================================');
console.log('Station: ${config.stationName}');
console.log('Monitored Folder: ' + MUSIC_DIR);
console.log('Agent Service Port: ' + PORT);

// Scan directory recursively
function scanDirectory(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    console.warn('\\x1b[33mWarning: Directory does not exist yet: ' + dir + '\\x1b[0m');
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log('Created folder: ' + dir);
    } catch (e) {}
    return fileList;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, fileList);
    } else {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.mp3', '.mp4', '.m4v', '.wav', '.flac', '.ogg', '.m4a'].includes(ext)) {
        const stat = fs.statSync(fullPath);
        const nameWithoutExt = path.basename(entry.name, ext);
        let artist = 'Local Artist';
        let title = nameWithoutExt;

        if (nameWithoutExt.includes(' - ')) {
          const parts = nameWithoutExt.split(' - ');
          artist = parts[0].trim();
          title = parts.slice(1).join(' - ').trim();
        }

        const isMp4 = ext === '.mp4' || ext === '.m4v';

        fileList.push({
          id: 'agent-' + Buffer.from(fullPath).toString('base64').substring(0, 16),
          title: title,
          artist: artist,
          album: path.basename(path.dirname(fullPath)),
          duration: 180, // estimated
          filePath: fullPath,
          fileSize: stat.size,
          category: fullPath.toLowerCase().includes('jingle') ? 'Jingle / Sweeper' : 'Power Current',
          mediaType: isMp4 ? 'mp4' : 'mp3',
          sourceType: 'companion-agent',
          cuePoints: {
            cueIn: 0.5,
            rampIntro: 12.0,
            outroFade: 174.0,
            nextTrigger: 177.0
          }
        });
      }
    }
  }
  return fileList;
}

// Initial Scan
try {
  indexedTracks = scanDirectory(MUSIC_DIR);
  console.log('\\x1b[32mSuccessfully indexed ' + indexedTracks.length + ' audio files.\\x1b[0m');
} catch (err) {
  console.error('Scan error:', err.message);
}

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS Headers for Studio Interface
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Status ping
  if (parsedUrl.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      version: '2.4.0',
      monitoredFolder: MUSIC_DIR,
      tracksCount: indexedTracks.length,
      platform: process.platform,
      uptime: process.uptime()
    }));
    return;
  }

  // Get Tracks List
  if (parsedUrl.pathname === '/api/tracks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(indexedTracks));
    return;
  }

  // Rescan Trigger
  if (parsedUrl.pathname === '/api/rescan') {
    indexedTracks = scanDirectory(MUSIC_DIR);
    console.log('Rescan completed: ' + indexedTracks.length + ' tracks found.');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, count: indexedTracks.length }));
    return;
  }

  // Stream local audio file with HTTP Range support for scrub & decks
  if (parsedUrl.pathname === '/api/stream') {
    const filePath = parsedUrl.query.path;
    if (!filePath || !fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found: ' + filePath);
      return;
    }

    const stat = fs.statSync(filePath);
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, { start, end });

      res.writeHead(206, {
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': filePath.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'
      });
      fs.createReadStream(filePath).pipe(res);
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('RADIOFLOW Agent Endpoint Not Found');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('\\x1b[32mRADIOFLOW Local Companion ready at http://localhost:' + PORT + '\\x1b[0m');
  console.log('Open RADIOFLOW in your browser to start mixing and broadcasting.');
});
`;
}

export function generateWindowsBatchScript(): string {
  return `@echo off
title RADIOFLOW Local Companion Service
color 0B
cls
echo ===============================================================
echo       RADIOFLOW - LOCAL COMPANION RUNNER (WINDOWS)
echo ===============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed on this computer!
    echo Please download and install Node.js (LTS version) from:
    echo https://nodejs.org
    echo.
    pause
    exit /b
)

echo [OK] Node.js detected.
echo.
echo Starting RADIOFLOW Companion Agent...
echo The agent will index your local music folders and serve streams.
echo Leave this command window open while running your radio station.
echo.
node radioflow-agent.js
pause
`;
}

export function generateLiquidsoapScript(config: CompanionConfig): string {
  const cleanDir = config.musicDirectory.replace(/\\/g, '/');
  return `#!/usr/bin/liquidsoap
# =========================================================================
# RADIOFLOW - PRODUCTION LIQUIDSOAP BROADCAST CONFIGURATION
# Station: ${config.stationName}
# =========================================================================

# Logging setup
set("log.file.path", "/var/log/radioflow.log")
set("log.stdout", true)
set("log.level", 3)

# Music directory rotation sources
music_power     = playlist.safe("${cleanDir}/Power")
music_recurrent = playlist.safe("${cleanDir}/Recurrent")
music_gold      = playlist.safe("${cleanDir}/Gold")
station_jingles = playlist.safe("${cleanDir}/Jingles")
top_of_hour_id  = single("${cleanDir}/Jingles/TOH_ID.mp3")

# Rotation Clock: 3 Power Currents, 1 Gold, 1 Jingle, 2 Recurrents
autodj_stream = rotate(weights = [3, 1, 1, 2], [
  music_power,
  music_gold,
  station_jingles,
  music_recurrent
])

# Smooth Crossfade Transitions (${config.crossfadeDuration} seconds)
def radioflow_crossfade(a, b)
  add(normalize=false, [
    fade.out(duration=${(config.crossfadeDuration * 0.6).toFixed(1)}, type="sin", a),
    fade.in(duration=${(config.crossfadeDuration * 0.4).toFixed(1)}, type="sin", b)
  ])
end

autodj_mixed = cross(radioflow_crossfade, autodj_stream)

# Top of the hour precise chime trigger
timed_radio = switch([
  ({ 0m0s }, top_of_hour_id),
  ({ true }, autodj_mixed)
])

# Live DJ Input via Harbor (allows live DJ takeover with seamless fallback)
live_dj = input.harbor(
  "live_studio",
  port = 8005,
  password = "radioflow_dj_secret",
  user = "dj"
)

# Broadcast Hierarchy: Live DJ overrides AutoDJ, AutoDJ overrides Silence
broadcast = fallback(
  track_sensitive = false,
  transitions = [
    fun(a, b) -> sequence([fade.out(duration=2.0, a), b]),
    fun(a, b) -> sequence([fade.out(duration=2.0, a), b])
  ],
  [live_dj, timed_radio, blank(duration=5.0)]
)

# Output stream to Icecast 2 Server
output.icecast(
  %mp3(bitrate = ${config.bitrate || 320}, samplerate = 44100),
  host = "${config.icecastHost}",
  port = ${config.icecastPort},
  password = "${config.icecastPassword}",
  mount = "${config.icecastMount}",
  name = "${config.stationName}",
  description = "Broadcast Stream Powered by RADIOFLOW",
  genre = "Electronic / Pop / Variety",
  url = "https://radioflow.fm",
  public = true,
  broadcast
)
`;
}

export function generateIcecastXml(config: CompanionConfig): string {
  return `<icecast>
    <location>Radio Studio Broadcast Master</location>
    <admin>admin@radioflow.fm</admin>
    <hostname>${config.icecastHost}</hostname>

    <limits>
        <clients>2500</clients>
        <sources>10</sources>
        <queue-size>524288</queue-size>
        <client-timeout>30</client-timeout>
        <header-timeout>15</header-timeout>
        <source-timeout>10</source-timeout>
        <burst-on-connect>1</burst-on-connect>
        <burst-size>65536</burst-size>
    </limits>

    <authentication>
        <source-password>${config.icecastPassword}</source-password>
        <relay-password>${config.icecastPassword}</relay-password>
        <admin-user>admin</admin-user>
        <admin-password>${config.icecastPassword}_admin</admin-password>
    </authentication>

    <listen-socket>
        <port>${config.icecastPort}</port>
        <bind-address>0.0.0.0</bind-address>
    </listen-socket>

    <!-- Mount point for RADIOFLOW Live Broadcast -->
    <mount type="normal">
        <mount-name>${config.icecastMount}</mount-name>
        <password>${config.icecastPassword}</password>
        <max-listeners>2500</max-listeners>
        <dump-file>/var/log/icecast2/live_dump.mp3</dump-file>
        <burst-size>65536</burst-size>
        <fallback-mount>/backup</fallback-mount>
        <fallback-override>1</fallback-override>
        <hidden>0</hidden>
    </mount>

    <fileserve>1</fileserve>
    <paths>
        <basedir>/usr/share/icecast2</basedir>
        <logdir>/var/log/icecast2</logdir>
        <webroot>/usr/share/icecast2/web</webroot>
        <adminroot>/usr/share/icecast2/admin</adminroot>
    </paths>

    <logging>
        <accesslog>access.log</accesslog>
        <errorlog>error.log</errorlog>
        <loglevel>3</loglevel>
    </logging>
</icecast>
`;
}

export function generateDockerCompose(): string {
  return `version: '3.8'

services:
  icecast:
    image: infiniteproject/icecast:latest
    container_name: radioflow_icecast
    restart: always
    ports:
      - "8000:8000"
    environment:
      - ICECAST_SOURCE_PASSWORD=hackme
      - ICECAST_ADMIN_PASSWORD=hackme_admin
      - ICECAST_PASSWORD=hackme
    volumes:
      - ./icecast.xml:/etc/icecast2/icecast.xml:ro

  liquidsoap:
    image: savonet/liquidsoap:v2.2.4
    container_name: radioflow_liquidsoap
    restart: always
    depends_on:
      - icecast
    ports:
      - "8005:8005" # Harbor live DJ stream port
    volumes:
      - ./radioflow.liq:/etc/liquidsoap/script.liq:ro
      - /c/RadioAutomation/Music:/music:ro
    command: ["liquidsoap", "/etc/liquidsoap/script.liq"]
`;
}
