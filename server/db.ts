import fs from 'fs';
import path from 'path';
import {
  PlayerProfile,
  ScoreRecord,
  MatchRecord,
  RewardAchievement,
  LeaderboardEntry,
} from '../src/types/game.js';

interface DatabaseSchema {
  players: Record<string, PlayerProfile>;
  scores: ScoreRecord[];
  matches: MatchRecord[];
  rewards: Record<string, RewardAchievement[]>; // playerId -> list of achievements
  leaderboards: LeaderboardEntry[];
}

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'game_db.json');

const INITIAL_ACHIEVEMENTS_TEMPLATE: Omit<RewardAchievement, 'progress' | 'unlocked' | 'claimed'>[] = [
  {
    id: 'first_blood',
    title: 'First Blood',
    description: 'Eliminate your first opponent in the Neon Arena',
    icon: 'Crosshair',
    category: 'combat',
    maxProgress: 1,
    rewardCredits: 150,
    rewardXP: 250,
  },
  {
    id: 'rampage_fury',
    title: 'Neon Rampage',
    description: 'Score 5 eliminations in a single match',
    icon: 'Zap',
    category: 'combat',
    maxProgress: 5,
    rewardCredits: 300,
    rewardXP: 500,
  },
  {
    id: 'orbital_victor',
    title: 'Arena Champion',
    description: 'Win 3 multiplayer matches',
    icon: 'Trophy',
    category: 'progression',
    maxProgress: 3,
    rewardCredits: 500,
    rewardXP: 1000,
  },
  {
    id: 'energy_collector',
    title: 'Energy Harvester',
    description: 'Collect 50 energy orbs across all battles',
    icon: 'Radio',
    category: 'mastery',
    maxProgress: 50,
    rewardCredits: 250,
    rewardXP: 400,
  },
  {
    id: 'sharpshooter',
    title: 'Laser Perfection',
    description: 'Accumulate an overall score of 2,500 points',
    icon: 'Target',
    category: 'mastery',
    maxProgress: 2500,
    rewardCredits: 600,
    rewardXP: 1200,
  },
  {
    id: 'survivor_elite',
    title: 'Grid Veteran',
    description: 'Reach Level 5 Pilot license',
    icon: 'Shield',
    category: 'progression',
    maxProgress: 5,
    rewardCredits: 1000,
    rewardXP: 2000,
  },
];

class GameDatabase {
  private data: DatabaseSchema;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.data = {
      players: {},
      scores: [],
      matches: [],
      rewards: {},
      leaderboards: [],
    };
    this.init();
  }

  private init() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        console.log('[Database] Loaded existing database from disk.');
      } catch (err) {
        console.error('[Database] Failed to read database, seeding default data.', err);
        this.seedDefaultData();
      }
    } else {
      this.seedDefaultData();
    }
  }

  private seedDefaultData() {
    console.log('[Database] Seeding initial database data...');

    const defaultPlayers: PlayerProfile[] = [
      {
        id: 'pilot-apex-01',
        username: 'Valkyrie_X',
        avatar: 'neon-falcon',
        shipColor: '#00f6ff',
        trailStyle: 'cyan_plasma',
        level: 18,
        xp: 14200,
        nextLevelXp: 18000,
        rankTitle: 'Apex Legend',
        credits: 4250,
        gamesPlayed: 142,
        gamesWon: 98,
        winStreak: 7,
        totalKills: 512,
        totalScore: 128400,
        createdAt: '2026-08-14T10:00:00.000Z',
      },
      {
        id: 'pilot-cyber-02',
        username: 'CyberGhost',
        avatar: 'plasma-ghost',
        shipColor: '#ff007a',
        trailStyle: 'magenta_laser',
        level: 14,
        xp: 10500,
        nextLevelXp: 14000,
        rankTitle: 'Diamond Master',
        credits: 2800,
        gamesPlayed: 110,
        gamesWon: 68,
        winStreak: 4,
        totalKills: 380,
        totalScore: 89600,
        createdAt: '2026-08-20T12:00:00.000Z',
      },
      {
        id: 'pilot-pulse-03',
        username: 'QuantumStriker',
        avatar: 'quantum-wraith',
        shipColor: '#39ff14',
        trailStyle: 'toxic_neon',
        level: 11,
        xp: 7900,
        nextLevelXp: 11000,
        rankTitle: 'Platinum Ace',
        credits: 1950,
        gamesPlayed: 85,
        gamesWon: 49,
        winStreak: 2,
        totalKills: 260,
        totalScore: 61200,
        createdAt: '2026-09-01T15:30:00.000Z',
      },
      {
        id: 'pilot-solar-04',
        username: 'SolarFlare',
        avatar: 'solar-fury',
        shipColor: '#ffaa00',
        trailStyle: 'amber_flame',
        level: 8,
        xp: 4300,
        nextLevelXp: 8000,
        rankTitle: 'Gold Guardian',
        credits: 1200,
        gamesPlayed: 52,
        gamesWon: 27,
        winStreak: 1,
        totalKills: 144,
        totalScore: 34100,
        createdAt: '2026-09-10T18:00:00.000Z',
      },
    ];

    for (const p of defaultPlayers) {
      this.data.players[p.id] = p;
      this.ensurePlayerRewards(p.id);
    }

    // Seed recent matches
    this.data.matches = [
      {
        id: 'match-hist-101',
        roomCode: 'NEON-889',
        mode: 'deathmatch',
        arena: 'Neon Colosseum',
        winnerId: 'pilot-apex-01',
        winnerName: 'Valkyrie_X',
        duration: 90,
        players: [
          {
            id: 'pilot-apex-01',
            username: 'Valkyrie_X',
            avatar: 'neon-falcon',
            shipColor: '#00f6ff',
            score: 1850,
            kills: 7,
            deaths: 1,
            isWinner: true,
          },
          {
            id: 'pilot-cyber-02',
            username: 'CyberGhost',
            avatar: 'plasma-ghost',
            shipColor: '#ff007a',
            score: 1320,
            kills: 5,
            deaths: 3,
            isWinner: false,
          },
          {
            id: 'pilot-pulse-03',
            username: 'QuantumStriker',
            avatar: 'quantum-wraith',
            shipColor: '#39ff14',
            score: 950,
            kills: 3,
            deaths: 4,
            isWinner: false,
          },
        ],
        startedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        finishedAt: new Date(Date.now() - 3600000 * 2 + 90000).toISOString(),
      },
    ];

    // Seed recent scores
    this.data.scores = [
      {
        id: 'score-101',
        matchId: 'match-hist-101',
        playerId: 'pilot-apex-01',
        playerName: 'Valkyrie_X',
        playerAvatar: 'neon-falcon',
        score: 1850,
        kills: 7,
        deaths: 1,
        damageDealt: 1200,
        accuracy: 78,
        highestStreak: 5,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        rankInMatch: 1,
      },
      {
        id: 'score-102',
        matchId: 'match-hist-101',
        playerId: 'pilot-cyber-02',
        playerName: 'CyberGhost',
        playerAvatar: 'plasma-ghost',
        score: 1320,
        kills: 5,
        deaths: 3,
        damageDealt: 850,
        accuracy: 64,
        highestStreak: 3,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        rankInMatch: 2,
      },
    ];

    this.recalculateLeaderboard();
    this.persistSync();
  }

  private queueSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      this.persistSync();
    }, 400);
  }

  private persistSync() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[Database] Failed to write database file', e);
    }
  }

  // PLAYER PROFILE
  getPlayer(id: string): PlayerProfile | undefined {
    return this.data.players[id];
  }

  getPlayerByUsername(username: string): PlayerProfile | undefined {
    const lower = username.toLowerCase().trim();
    return Object.values(this.data.players).find(
      (p) => p.username.toLowerCase() === lower
    );
  }

  createPlayer(params: {
    username: string;
    avatar?: string;
    shipColor?: string;
    isGuest?: boolean;
  }): PlayerProfile {
    const id = params.isGuest
      ? `guest-${Math.random().toString(36).substring(2, 9)}`
      : `pilot-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newProfile: PlayerProfile = {
      id,
      username: params.username.trim(),
      avatar: params.avatar || 'neon-falcon',
      shipColor: params.shipColor || '#00f6ff',
      trailStyle: 'cyan_plasma',
      level: 1,
      xp: 0,
      nextLevelXp: 1000,
      rankTitle: 'Rookie Pilot',
      credits: 200,
      gamesPlayed: 0,
      gamesWon: 0,
      winStreak: 0,
      totalKills: 0,
      totalScore: 0,
      createdAt: new Date().toISOString(),
      isGuest: !!params.isGuest,
    };

    this.data.players[id] = newProfile;
    this.ensurePlayerRewards(id);
    this.recalculateLeaderboard();
    this.queueSave();
    return newProfile;
  }

  updateProfile(id: string, updates: Partial<PlayerProfile>): PlayerProfile | null {
    const player = this.data.players[id];
    if (!player) return null;

    Object.assign(player, updates);
    this.recalculateLeaderboard();
    this.queueSave();
    return player;
  }

  // REWARDS & ACHIEVEMENTS
  ensurePlayerRewards(playerId: string): RewardAchievement[] {
    if (!this.data.rewards[playerId]) {
      this.data.rewards[playerId] = INITIAL_ACHIEVEMENTS_TEMPLATE.map((tpl) => ({
        ...tpl,
        progress: 0,
        unlocked: false,
        claimed: false,
      }));
    }
    return this.data.rewards[playerId];
  }

  getPlayerRewards(playerId: string): RewardAchievement[] {
    return this.ensurePlayerRewards(playerId);
  }

  claimReward(playerId: string, rewardId: string): { success: boolean; reward?: RewardAchievement } {
    const list = this.ensurePlayerRewards(playerId);
    const item = list.find((r) => r.id === rewardId);
    if (!item || !item.unlocked || item.claimed) {
      return { success: false };
    }

    item.claimed = true;
    const player = this.data.players[playerId];
    if (player) {
      player.credits += item.rewardCredits;
      this.addPlayerXP(player, item.rewardXP);
    }
    this.queueSave();
    return { success: true, reward: item };
  }

  updatePlayerAchievementProgress(
    playerId: string,
    achievementId: string,
    increment: number
  ): boolean {
    const list = this.ensurePlayerRewards(playerId);
    const item = list.find((r) => r.id === achievementId);
    if (!item || item.unlocked) return false;

    item.progress = Math.min(item.maxProgress, item.progress + increment);
    if (item.progress >= item.maxProgress) {
      item.unlocked = true;
      this.queueSave();
      return true; // newly unlocked
    }
    this.queueSave();
    return false;
  }

  private addPlayerXP(player: PlayerProfile, xpAmount: number) {
    player.xp += xpAmount;
    while (player.xp >= player.nextLevelXp) {
      player.level += 1;
      player.nextLevelXp = Math.floor(player.nextLevelXp * 1.35 + 500);
      player.credits += player.level * 100;

      // Update rank title based on level
      if (player.level >= 20) player.rankTitle = 'Apex Legend';
      else if (player.level >= 15) player.rankTitle = 'Diamond Master';
      else if (player.level >= 10) player.rankTitle = 'Platinum Ace';
      else if (player.level >= 6) player.rankTitle = 'Gold Guardian';
      else if (player.level >= 3) player.rankTitle = 'Silver Striker';
      else player.rankTitle = 'Bronze Cadet';
    }
  }

  // MATCHES & SCORES
  recordMatch(match: MatchRecord, scores: ScoreRecord[]) {
    this.data.matches.unshift(match);
    if (this.data.matches.length > 50) {
      this.data.matches = this.data.matches.slice(0, 50);
    }

    for (const s of scores) {
      this.data.scores.unshift(s);

      // Update persistent player stats
      const player = this.data.players[s.playerId];
      if (player) {
        player.gamesPlayed += 1;
        player.totalScore += s.score;
        player.totalKills += s.kills;

        const isWin = s.playerId === match.winnerId;
        if (isWin) {
          player.gamesWon += 1;
          player.winStreak += 1;
          this.updatePlayerAchievementProgress(player.id, 'orbital_victor', 1);
        } else {
          player.winStreak = 0;
        }

        if (s.kills > 0) {
          this.updatePlayerAchievementProgress(player.id, 'first_blood', 1);
        }
        if (s.kills >= 5) {
          this.updatePlayerAchievementProgress(player.id, 'rampage_fury', s.kills);
        }
        this.updatePlayerAchievementProgress(player.id, 'sharpshooter', s.score);
        this.updatePlayerAchievementProgress(player.id, 'survivor_elite', player.level);

        // Award match XP and credits
        const earnedXP = Math.floor(s.score * 0.4 + s.kills * 75 + (isWin ? 300 : 100));
        const earnedCredits = Math.floor(s.score * 0.15 + (isWin ? 150 : 50));
        player.credits += earnedCredits;
        this.addPlayerXP(player, earnedXP);
      }
    }

    if (this.data.scores.length > 150) {
      this.data.scores = this.data.scores.slice(0, 150);
    }

    this.recalculateLeaderboard();
    this.queueSave();
  }

  getRecentMatches(limit = 15): MatchRecord[] {
    return this.data.matches.slice(0, limit);
  }

  getPlayerScores(playerId: string, limit = 10): ScoreRecord[] {
    return this.data.scores.filter((s) => s.playerId === playerId).slice(0, limit);
  }

  // LEADERBOARD
  recalculateLeaderboard() {
    const list = Object.values(this.data.players).map((p) => {
      const winRate = p.gamesPlayed > 0 ? Math.round((p.gamesWon / p.gamesPlayed) * 100) : 0;
      return {
        rank: 0,
        playerId: p.id,
        username: p.username,
        avatar: p.avatar,
        shipColor: p.shipColor,
        level: p.level,
        rankTitle: p.rankTitle,
        score: p.totalScore,
        gamesWon: p.gamesWon,
        winRate,
        totalKills: p.totalKills,
      };
    });

    // Sort primarily by Score descending, then wins descending
    list.sort((a, b) => b.score - a.score || b.gamesWon - a.gamesWon);

    this.data.leaderboards = list.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));
  }

  getLeaderboard(category: 'score' | 'wins' | 'kills' | 'level' = 'score', limit = 25): LeaderboardEntry[] {
    const copy = [...this.data.leaderboards];
    if (category === 'wins') {
      copy.sort((a, b) => b.gamesWon - a.gamesWon || b.score - a.score);
    } else if (category === 'kills') {
      copy.sort((a, b) => b.totalKills - a.totalKills || b.score - a.score);
    } else if (category === 'level') {
      copy.sort((a, b) => b.level - a.level || b.score - a.score);
    } else {
      copy.sort((a, b) => b.score - a.score);
    }

    return copy.slice(0, limit).map((e, idx) => ({
      ...e,
      rank: idx + 1,
    }));
  }

  getStatsSummary() {
    return {
      totalPlayers: Object.keys(this.data.players).length,
      totalMatches: this.data.matches.length,
      totalScores: this.data.scores.length,
    };
  }
}

export const db = new GameDatabase();
