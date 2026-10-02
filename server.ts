import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { RealtimeGameServer } from './server/gameServer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = 3000;

app.use(express.json());

// API Endpoints

// 1. Authentication
app.post('/api/auth/register', (req, res) => {
  const { username, avatar, shipColor } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ error: 'Username is required' });
  }

  const existing = db.getPlayerByUsername(username);
  if (existing) {
    return res.status(409).json({ error: 'Username already taken. Please choose another.' });
  }

  const profile = db.createPlayer({
    username: username.trim(),
    avatar: avatar || 'neon-falcon',
    shipColor: shipColor || '#00f6ff',
    isGuest: false,
  });

  return res.status(201).json({ success: true, player: profile });
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username is required' });
  }

  const player = db.getPlayerByUsername(username);
  if (!player) {
    return res.status(404).json({ error: 'Pilot not found. Create a new callsign!' });
  }

  return res.json({ success: true, player });
});

app.post('/api/auth/guest', (req, res) => {
  const callsignSuffix = Math.floor(100 + Math.random() * 900);
  const avatars = ['neon-falcon', 'cyber-blade', 'plasma-ghost', 'vortex-core', 'solar-fury'];
  const colors = ['#00f6ff', '#ff007a', '#39ff14', '#ffaa00', '#b026ff'];

  const profile = db.createPlayer({
    username: `Rookie_${callsignSuffix}`,
    avatar: avatars[Math.floor(Math.random() * avatars.length)],
    shipColor: colors[Math.floor(Math.random() * colors.length)],
    isGuest: true,
  });

  return res.json({ success: true, player: profile });
});

// 2. Player Profile & Customization
app.get('/api/player/:id', (req, res) => {
  const player = db.getPlayer(req.params.id);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }
  return res.json({ player });
});

app.patch('/api/player/:id', (req, res) => {
  const { avatar, shipColor, trailStyle } = req.body;
  const updated = db.updateProfile(req.params.id, {
    ...(avatar && { avatar }),
    ...(shipColor && { shipColor }),
    ...(trailStyle && { trailStyle }),
  });

  if (!updated) {
    return res.status(404).json({ error: 'Player not found' });
  }

  return res.json({ success: true, player: updated });
});

// 3. Rewards & Achievements
app.get('/api/rewards/:playerId', (req, res) => {
  const rewards = db.getPlayerRewards(req.params.playerId);
  return res.json({ rewards });
});

app.post('/api/rewards/claim', (req, res) => {
  const { playerId, rewardId } = req.body;
  if (!playerId || !rewardId) {
    return res.status(400).json({ error: 'Missing playerId or rewardId' });
  }

  const result = db.claimReward(playerId, rewardId);
  if (!result.success) {
    return res.status(400).json({ error: 'Reward cannot be claimed or is not unlocked' });
  }

  const player = db.getPlayer(playerId);
  return res.json({ success: true, reward: result.reward, player });
});

// 4. Matches & Scores
app.get('/api/matches', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 15;
  const matches = db.getRecentMatches(limit);
  return res.json({ matches });
});

app.get('/api/scores/:playerId', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const scores = db.getPlayerScores(req.params.playerId, limit);
  return res.json({ scores });
});

// 5. Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const category = (req.query.category as 'score' | 'wins' | 'kills' | 'level') || 'score';
  const limit = parseInt(req.query.limit as string) || 25;
  const leaderboard = db.getLeaderboard(category, limit);
  return res.json({ leaderboard });
});

// 6. System & Server Stats
app.get('/api/stats', (req, res) => {
  const summary = db.getStatsSummary();
  return res.json({
    status: 'online',
    serverTime: new Date().toISOString(),
    ...summary,
  });
});

// Attach WebSocket Realtime Game Server
new RealtimeGameServer(server);

// Vite or Static Production middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[NeonGrid Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[NeonGrid Server] Failed to start server:', err);
  process.exit(1);
});
