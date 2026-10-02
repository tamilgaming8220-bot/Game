export interface PlayerProfile {
  id: string;
  username: string;
  avatar: string;
  shipColor: string;
  trailStyle: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  rankTitle: string;
  credits: number;
  gamesPlayed: number;
  gamesWon: number;
  winStreak: number;
  totalKills: number;
  totalScore: number;
  createdAt: string;
  isGuest?: boolean;
}

export interface ScoreRecord {
  id: string;
  matchId: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  score: number;
  kills: number;
  deaths: number;
  damageDealt: number;
  accuracy: number;
  highestStreak: number;
  timestamp: string;
  rankInMatch: number;
}

export interface MatchRecord {
  id: string;
  roomCode: string;
  mode: 'deathmatch' | 'energy_rush' | 'survival';
  arena: string;
  winnerId: string;
  winnerName: string;
  duration: number; // in seconds
  players: {
    id: string;
    username: string;
    avatar: string;
    shipColor: string;
    score: number;
    kills: number;
    deaths: number;
    isWinner: boolean;
  }[];
  startedAt: string;
  finishedAt: string;
}

export interface RewardAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'combat' | 'progression' | 'mastery';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  rewardCredits: number;
  rewardXP: number;
  rewardSkin?: string;
  claimed: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  username: string;
  avatar: string;
  shipColor: string;
  level: number;
  rankTitle: string;
  score: number;
  gamesWon: number;
  winRate: number;
  totalKills: number;
}

// In-Game Realtime Physics & Entity types
export interface ShipEntity {
  id: string;
  playerId: string;
  username: string;
  avatar: string;
  shipColor: string;
  trailStyle: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number; // in radians
  targetAngle: number;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  energy: number;
  maxEnergy: number;
  score: number;
  kills: number;
  deaths: number;
  isAlive: boolean;
  respawnTimer: number;
  isBoosting: boolean;
  isFiring: boolean;
  isBot?: boolean;
  lastDamageBy?: string;
  invulnerableTimer: number;
  streak: number;
  buffTripleLaser: number; // duration remaining in ticks
  buffHyperSpeed: number;
}

export interface ProjectileEntity {
  id: string;
  shooterId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  color: string;
  radius: number;
  lifespan: number; // ticks
}

export interface OrbPickup {
  id: string;
  x: number;
  y: number;
  type: 'energy' | 'health' | 'shield' | 'triple_laser' | 'speed_boost' | 'mega_core';
  value: number;
  color: string;
  radius: number;
  pulsateOffset: number;
}

export interface ArenaObstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'barrier' | 'pillar' | 'portal';
}

export interface GameArenaState {
  roomId: string;
  roomCode: string;
  arenaWidth: number;
  arenaHeight: number;
  timeRemaining: number;
  status: 'waiting' | 'starting' | 'active' | 'finished';
  ships: ShipEntity[];
  projectiles: ProjectileEntity[];
  pickups: OrbPickup[];
  obstacles: ArenaObstacle[];
  killFeed: { id: string; killerName: string; victimName: string; time: number }[];
  winner?: { id: string; name: string; score: number };
}

// Room / Lobby Types
export interface RoomParticipant {
  id: string;
  username: string;
  avatar: string;
  shipColor: string;
  isHost: boolean;
  isReady: boolean;
  isBot?: boolean;
  ping?: number;
}

export interface RoomSummary {
  id: string;
  code: string;
  name: string;
  hostName: string;
  mode: 'deathmatch' | 'energy_rush' | 'survival';
  status: 'lobby' | 'countdown' | 'in_game' | 'finished';
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  hasPassword?: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor?: string;
  text: string;
  timestamp: string;
  isSystem?: boolean;
}
