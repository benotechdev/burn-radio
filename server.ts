import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isHttps = Boolean(process.env.APP_URL && process.env.APP_URL.startsWith('https://'));
const isHmrDisabled = process.env.DISABLE_HMR === 'true';

app.use(cors());
app.use(express.json());

// In-memory / mock persistent store for station state and synchronized settings
interface StationConfig {
  stationName: string;
  tagline: string;
  genre: string;
  broadcastMode: 'manual' | 'autodj' | 'assisted';
  currentShow: string;
  icecast: {
    server: string;
    port: number;
    mount: string;
    bitrate: number;
    format: string;
    password?: string;
  };
  companion: {
    host: string;
    port: number;
    status: 'connected' | 'disconnected' | 'browser-direct';
    lastSync: string;
    folderPath: string;
  };
}

let stationConfig: StationConfig = {
  stationName: 'RADIOFLOW 104.5 HD',
  tagline: 'Pure Sound. Total Automation.',
  genre: 'Electronic / Top 40 / Indie',
  broadcastMode: 'autodj',
  currentShow: 'AutoDJ Non-Stop Rotation',
  icecast: {
    server: 'stream.radioflow.fm',
    port: 8000,
    mount: '/live',
    bitrate: 320,
    format: 'MP3',
  },
  companion: {
    host: 'localhost',
    port: 8901,
    status: 'browser-direct',
    lastSync: new Date().toISOString(),
    folderPath: 'C:\\RadioAutomation\\Music',
  },
};

// Play history log for licensing and station compliance
let playLogs: Array<{
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  playedAt: string;
  source: 'deckA' | 'deckB' | 'autodj' | 'cart';
}> = [
  {
    id: 'log-1',
    title: 'Neon Horizon',
    artist: 'Solaris Beats',
    album: 'Cyber Radiance',
    duration: 214,
    playedAt: new Date(Date.now() - 360000).toISOString(),
    source: 'autodj',
  },
  {
    id: 'log-2',
    title: 'RadioFlow Top of Hour ID',
    artist: 'Station Imaging',
    album: 'Sweeper Package 2026',
    duration: 12,
    playedAt: new Date(Date.now() - 146000).toISOString(),
    source: 'cart',
  },
  {
    id: 'log-3',
    title: 'Midnight Resonance',
    artist: 'Aura Nova',
    album: 'Broadcast Frequency',
    duration: 198,
    playedAt: new Date(Date.now() - 134000).toISOString(),
    source: 'autodj',
  },
];

// Scheduled radio shows
let schedule = [
  { id: 'sch-1', day: 'Monday', start: '06:00', end: '10:00', name: 'The Morning Voltage Live', host: 'DJ Marcus & Maya', mode: 'manual', category: 'Power Currents' },
  { id: 'sch-2', day: 'Monday', start: '10:00', end: '14:00', name: 'Non-Stop Workday Flow', host: 'Automated RadioFlow', mode: 'autodj', category: 'Gold & Recurrents' },
  { id: 'sch-3', day: 'Monday', start: '14:00', end: '18:00', name: 'Afternoon Drive Express', host: 'Elena Cruz', mode: 'assisted', category: 'Top 40 & Currents' },
  { id: 'sch-4', day: 'Monday', start: '18:00', end: '22:00', name: 'Club Velocity Sessions', host: 'Guest DJ Residency', mode: 'manual', category: 'Electronic & Dance' },
  { id: 'sch-5', day: 'Monday', start: '22:00', end: '06:00', name: 'Midnight Chill Lounge', host: 'Automated RadioFlow', mode: 'autodj', category: 'Ambient & Deep' },
];

// Remote control command queue
let pendingRemoteCommands: Array<{
  id: string;
  action: string;
  payload?: any;
  timestamp: string;
}> = [];

// REST API Endpoints
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    app: 'RADIOFLOW Broadcast Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/station', (req: Request, res: Response) => {
  res.json(stationConfig);
});

app.post('/api/station', (req: Request, res: Response) => {
  stationConfig = { ...stationConfig, ...req.body };
  res.json({ success: true, station: stationConfig });
});

app.get('/api/logs', (req: Request, res: Response) => {
  res.json(playLogs);
});

app.post('/api/logs', (req: Request, res: Response) => {
  const newLog = {
    id: `log-${Date.now()}`,
    title: req.body.title || 'Unknown Title',
    artist: req.body.artist || 'Unknown Artist',
    album: req.body.album || 'Broadcast',
    duration: req.body.duration || 180,
    playedAt: new Date().toISOString(),
    source: req.body.source || 'autodj',
  };
  playLogs.unshift(newLog);
  if (playLogs.length > 200) playLogs.pop();
  res.json({ success: true, log: newLog });
});

app.get('/api/schedule', (req: Request, res: Response) => {
  res.json(schedule);
});

app.post('/api/schedule', (req: Request, res: Response) => {
  if (Array.isArray(req.body)) {
    schedule = req.body;
  } else if (req.body && req.body.id) {
    const idx = schedule.findIndex((s) => s.id === req.body.id);
    if (idx >= 0) {
      schedule[idx] = req.body;
    } else {
      schedule.push(req.body);
    }
  }
  res.json({ success: true, schedule });
});

// Remote broadcast command dispatcher (for smartphone / remote management)
app.post('/api/remote/command', (req: Request, res: Response) => {
  const cmd = {
    id: `cmd-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    action: req.body.action,
    payload: req.body.payload || null,
    timestamp: new Date().toISOString(),
  };
  pendingRemoteCommands.push(cmd);
  if (pendingRemoteCommands.length > 50) pendingRemoteCommands.shift();
  res.json({ success: true, command: cmd });
});

app.get('/api/remote/commands', (req: Request, res: Response) => {
  const since = req.query.since as string;
  if (!since) {
    res.json(pendingRemoteCommands.slice(-10));
    return;
  }
  const filtered = pendingRemoteCommands.filter(
    (c) => new Date(c.timestamp).getTime() > parseInt(since, 10)
  );
  res.json(filtered);
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        allowedHosts: true as const,
        cors: true,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
              protocol: isHttps ? 'wss' : undefined,
              clientPort: isHttps ? 443 : undefined,
              port: isHttps ? 443 : undefined,
            },
        ws: isHmrDisabled
          ? (false as const)
          : {
              server: httpServer,
              protocol: isHttps ? 'wss' : undefined,
              clientPort: isHttps ? 443 : undefined,
              port: isHttps ? 443 : undefined,
            },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[RADIOFLOW] Studio Server online at http://0.0.0.0:${PORT}`);
  });
}

startServer();
