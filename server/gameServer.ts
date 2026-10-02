import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import {
  GameArenaState,
  ShipEntity,
  ProjectileEntity,
  OrbPickup,
  ArenaObstacle,
  RoomSummary,
  RoomParticipant,
  ChatMessage,
  MatchRecord,
  ScoreRecord,
} from '../src/types/game.js';
import { db } from './db.js';

interface ClientConnection {
  ws: WebSocket;
  playerId: string;
  username: string;
  avatar: string;
  shipColor: string;
  roomId: string | null;
  lastPing: number;
}

interface GameRoom {
  id: string;
  code: string;
  name: string;
  hostId: string;
  mode: 'deathmatch' | 'energy_rush' | 'survival';
  status: 'lobby' | 'countdown' | 'in_game' | 'finished';
  maxPlayers: number;
  isPrivate: boolean;
  participants: Map<string, RoomParticipant>;
  messages: ChatMessage[];
  gameState: GameArenaState | null;
  gameLoopTimer: NodeJS.Timeout | null;
  countdownTimer: NodeJS.Timeout | null;
  durationSeconds: number;
  matchStartTime: number;
  shotsFired: Map<string, number>;
  shotsHit: Map<string, number>;
  damageDealt: Map<string, number>;
  highestStreak: Map<string, number>;
}

export class RealtimeGameServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private rooms: Map<string, GameRoom> = new Map();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ noServer: true });
    
    server.on('upgrade', (request, socket, head) => {
      try {
        const url = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`);
        if (url.pathname === '/ws') {
          this.wss.handleUpgrade(request, socket, head, (ws) => {
            this.wss.emit('connection', ws, request);
          });
        }
      } catch (err) {
        socket.destroy();
      }
    });

    this.setupWebSocket();
    this.seedDefaultRooms();
  }

  private seedDefaultRooms() {
    // Seed a couple public lobby rooms so users can immediately join active games
    this.createRoom({
      code: 'NEON-1',
      name: 'Cyber Colosseum [Public]',
      hostId: 'system',
      hostName: 'Arena Core',
      mode: 'deathmatch',
      maxPlayers: 6,
      isPrivate: false,
    });

    this.createRoom({
      code: 'RUSH-2',
      name: 'Energy Overload 24/7',
      hostId: 'system',
      hostName: 'Grid Master',
      mode: 'energy_rush',
      maxPlayers: 4,
      isPrivate: false,
    });
  }

  private setupWebSocket() {
    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = {
        ws,
        playerId: '',
        username: 'Guest Pilot',
        avatar: 'neon-falcon',
        shipColor: '#00f6ff',
        roomId: null,
        lastPing: Date.now(),
      };
      this.clients.set(ws, client);

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch (e) {
          console.error('[WS] Failed to parse message', e);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(client);
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('[WS] Client socket error:', err);
      });

      // Send initial welcome & room list
      this.sendToClient(client, {
        type: 'connected',
        serverTime: Date.now(),
        rooms: this.getPublicRoomsList(),
      });
    });
  }

  private sendToClient(client: ClientConnection, data: any) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  private broadcastToRoom(room: GameRoom, data: any) {
    const raw = JSON.stringify(data);
    for (const [ws, client] of this.clients.entries()) {
      if (client.roomId === room.id && ws.readyState === WebSocket.OPEN) {
        ws.send(raw);
      }
    }
  }

  private broadcastRoomsList() {
    const roomsList = this.getPublicRoomsList();
    const payload = JSON.stringify({ type: 'lobby:rooms_update', rooms: roomsList });
    for (const [ws, client] of this.clients.entries()) {
      // Send to players who are in the main lobby (not in an active game)
      if (ws.readyState === WebSocket.OPEN && !client.roomId) {
        ws.send(payload);
      }
    }
  }

  private getPublicRoomsList(): RoomSummary[] {
    const list: RoomSummary[] = [];
    for (const r of this.rooms.values()) {
      const hostPart = r.participants.get(r.hostId);
      list.push({
        id: r.id,
        code: r.code,
        name: r.name,
        hostName: hostPart ? hostPart.username : 'Unknown',
        mode: r.mode,
        status: r.status,
        playerCount: r.participants.size,
        maxPlayers: r.maxPlayers,
        isPrivate: r.isPrivate,
      });
    }
    return list;
  }

  private handleClientMessage(client: ClientConnection, msg: any) {
    switch (msg.type) {
      case 'ping': {
        this.sendToClient(client, { type: 'pong', clientTime: msg.clientTime, serverTime: Date.now() });
        break;
      }

      case 'auth:identify': {
        client.playerId = msg.playerId;
        client.username = msg.username || 'Pilot';
        client.avatar = msg.avatar || 'neon-falcon';
        client.shipColor = msg.shipColor || '#00f6ff';
        this.sendToClient(client, {
          type: 'auth:confirmed',
          playerId: client.playerId,
          rooms: this.getPublicRoomsList(),
        });
        break;
      }

      case 'lobby:get_rooms': {
        this.sendToClient(client, {
          type: 'lobby:rooms_update',
          rooms: this.getPublicRoomsList(),
        });
        break;
      }

      case 'lobby:create_room': {
        const code = (msg.code || Math.random().toString(36).substring(2, 6)).toUpperCase();
        const room = this.createRoom({
          code,
          name: msg.name || `${client.username}'s Arena`,
          hostId: client.playerId,
          hostName: client.username,
          mode: msg.mode || 'deathmatch',
          maxPlayers: msg.maxPlayers || 4,
          isPrivate: !!msg.isPrivate,
        });

        this.joinRoom(client, room);
        this.broadcastRoomsList();
        break;
      }

      case 'lobby:join_room': {
        const room =
          this.rooms.get(msg.roomId) ||
          Array.from(this.rooms.values()).find(
            (r) => r.code.toUpperCase() === (msg.roomCode || '').toUpperCase()
          );

        if (!room) {
          this.sendToClient(client, { type: 'lobby:error', message: 'Room not found' });
          return;
        }

        if (room.participants.size >= room.maxPlayers) {
          this.sendToClient(client, { type: 'lobby:error', message: 'Room is full' });
          return;
        }

        this.joinRoom(client, room);
        this.broadcastRoomsList();
        break;
      }

      case 'lobby:quick_match': {
        // Find suitable public room or create one
        let target = Array.from(this.rooms.values()).find(
          (r) => !r.isPrivate && r.status === 'lobby' && r.participants.size < r.maxPlayers
        );

        if (!target) {
          const code = `QM-${Math.floor(100 + Math.random() * 900)}`;
          target = this.createRoom({
            code,
            name: `Quick Arena ${code}`,
            hostId: client.playerId,
            hostName: client.username,
            mode: 'deathmatch',
            maxPlayers: 4,
            isPrivate: false,
          });
        }

        this.joinRoom(client, target);
        this.broadcastRoomsList();
        break;
      }

      case 'lobby:leave_room': {
        this.leaveCurrentRoom(client);
        this.broadcastRoomsList();
        break;
      }

      case 'lobby:toggle_ready': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room) return;

        const part = room.participants.get(client.playerId);
        if (part) {
          part.isReady = !part.isReady;
          this.broadcastRoomState(room);
        }
        break;
      }

      case 'lobby:add_bot': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId) return;

        if (room.participants.size >= room.maxPlayers) {
          this.sendToClient(client, { type: 'lobby:error', message: 'Room is full' });
          return;
        }

        const botNames = ['CyberViper', 'NeonPulse', 'VortexAI', 'ApexDrone', 'ShadowDrift'];
        const botAvatars = ['cyber-blade', 'plasma-ghost', 'solar-fury', 'quantum-wraith'];
        const botColors = ['#ff007a', '#39ff14', '#ffaa00', '#b026ff', '#00f6ff'];

        const botId = `bot-${Date.now().toString(36)}-${Math.floor(Math.random() * 100)}`;
        const botIndex = room.participants.size % botNames.length;

        room.participants.set(botId, {
          id: botId,
          username: `BOT [${botNames[botIndex]}]`,
          avatar: botAvatars[botIndex % botAvatars.length],
          shipColor: botColors[botIndex % botColors.length],
          isHost: false,
          isReady: true,
          isBot: true,
          ping: 5,
        });

        this.broadcastRoomState(room);
        this.broadcastRoomsList();
        break;
      }

      case 'lobby:remove_bot': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId) return;

        const bot = Array.from(room.participants.values()).find((p) => p.isBot);
        if (bot) {
          room.participants.delete(bot.id);
          this.broadcastRoomState(room);
          this.broadcastRoomsList();
        }
        break;
      }

      case 'lobby:chat': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room) return;

        const chatMsg: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random()}`,
          senderId: client.playerId,
          senderName: client.username,
          senderColor: client.shipColor,
          text: (msg.text || '').slice(0, 150),
          timestamp: new Date().toISOString(),
        };

        room.messages.push(chatMsg);
        if (room.messages.length > 40) room.messages.shift();

        this.broadcastToRoom(room, {
          type: 'room:chat_message',
          message: chatMsg,
        });
        break;
      }

      case 'lobby:start_game': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room || room.hostId !== client.playerId) return;

        this.startGameCountdown(room);
        break;
      }

      // IN-GAME INPUTS
      case 'game:input': {
        if (!client.roomId) return;
        const room = this.rooms.get(client.roomId);
        if (!room || !room.gameState || room.gameState.status !== 'active') return;

        const ship = room.gameState.ships.find((s) => s.playerId === client.playerId);
        if (!ship || !ship.isAlive) return;

        // Process client inputs (movement thrust, rotation target, firing, boosting)
        if (typeof msg.targetAngle === 'number') {
          ship.targetAngle = msg.targetAngle;
        }

        if (typeof msg.thrustX === 'number' && typeof msg.thrustY === 'number') {
          const maxThrust = ship.buffHyperSpeed > 0 ? 0.75 : 0.45;
          const boostMult = ship.isBoosting && ship.energy > 5 ? 1.6 : 1.0;

          ship.vx += msg.thrustX * maxThrust * boostMult;
          ship.vy += msg.thrustY * maxThrust * boostMult;
        }

        if (typeof msg.isBoosting === 'boolean') {
          ship.isBoosting = msg.isBoosting && ship.energy > 5;
        }

        if (msg.fire) {
          this.fireWeapon(room, ship);
        }

        if (msg.empBlast) {
          this.triggerEMP(room, ship);
        }

        break;
      }
    }
  }

  private createRoom(params: {
    code: string;
    name: string;
    hostId: string;
    hostName: string;
    mode: 'deathmatch' | 'energy_rush' | 'survival';
    maxPlayers: number;
    isPrivate: boolean;
  }): GameRoom {
    const id = `room-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const room: GameRoom = {
      id,
      code: params.code,
      name: params.name,
      hostId: params.hostId,
      mode: params.mode,
      status: 'lobby',
      maxPlayers: params.maxPlayers,
      isPrivate: params.isPrivate,
      participants: new Map(),
      messages: [
        {
          id: 'welcome',
          senderId: 'system',
          senderName: 'System',
          text: `Welcome to ${params.name}! Prepare for high-octane neon combat.`,
          timestamp: new Date().toISOString(),
          isSystem: true,
        },
      ],
      gameState: null,
      gameLoopTimer: null,
      countdownTimer: null,
      durationSeconds: 75,
      matchStartTime: 0,
      shotsFired: new Map(),
      shotsHit: new Map(),
      damageDealt: new Map(),
      highestStreak: new Map(),
    };

    this.rooms.set(id, room);
    return room;
  }

  private joinRoom(client: ClientConnection, room: GameRoom) {
    if (client.roomId) {
      this.leaveCurrentRoom(client);
    }

    client.roomId = room.id;

    // Check if host needs reassignment
    if (room.hostId === 'system' || !room.participants.has(room.hostId)) {
      room.hostId = client.playerId;
    }

    room.participants.set(client.playerId, {
      id: client.playerId,
      username: client.username,
      avatar: client.avatar,
      shipColor: client.shipColor,
      isHost: room.hostId === client.playerId,
      isReady: room.hostId === client.playerId,
      isBot: false,
      ping: 25,
    });

    this.sendToClient(client, {
      type: 'room:joined',
      room: this.serializeRoom(room),
    });

    this.broadcastRoomState(room);
  }

  private leaveCurrentRoom(client: ClientConnection) {
    if (!client.roomId) return;
    const room = this.rooms.get(client.roomId);
    if (!room) {
      client.roomId = null;
      return;
    }

    room.participants.delete(client.playerId);

    if (room.gameState) {
      // Remove ship
      room.gameState.ships = room.gameState.ships.filter((s) => s.playerId !== client.playerId);
    }

    // If host left, elect new host
    if (room.hostId === client.playerId) {
      const remainingHuman = Array.from(room.participants.values()).find((p) => !p.isBot);
      if (remainingHuman) {
        room.hostId = remainingHuman.id;
        remainingHuman.isHost = true;
      }
    }

    // Clean up empty room unless it's a permanent seeded system room
    if (room.participants.size === 0 && !room.code.startsWith('NEON-1') && !room.code.startsWith('RUSH-2')) {
      if (room.gameLoopTimer) clearInterval(room.gameLoopTimer);
      if (room.countdownTimer) clearInterval(room.countdownTimer);
      this.rooms.delete(room.id);
    } else {
      this.broadcastRoomState(room);
    }

    client.roomId = null;
    this.sendToClient(client, { type: 'room:left' });
  }

  private handleDisconnect(client: ClientConnection) {
    this.leaveCurrentRoom(client);
    this.broadcastRoomsList();
  }

  private serializeRoom(room: GameRoom) {
    return {
      id: room.id,
      code: room.code,
      name: room.name,
      hostId: room.hostId,
      mode: room.mode,
      status: room.status,
      maxPlayers: room.maxPlayers,
      isPrivate: room.isPrivate,
      participants: Array.from(room.participants.values()),
      messages: room.messages,
      gameState: room.gameState,
    };
  }

  private broadcastRoomState(room: GameRoom) {
    this.broadcastToRoom(room, {
      type: 'room:state_update',
      room: this.serializeRoom(room),
    });
  }

  private startGameCountdown(room: GameRoom) {
    room.status = 'countdown';
    this.broadcastRoomState(room);

    let count = 3;
    this.broadcastToRoom(room, { type: 'game:countdown', count });

    room.countdownTimer = setInterval(() => {
      count -= 1;
      if (count > 0) {
        this.broadcastToRoom(room, { type: 'game:countdown', count });
      } else {
        if (room.countdownTimer) clearInterval(room.countdownTimer);
        room.countdownTimer = null;
        this.launchGame(room);
      }
    }, 1000);
  }

  private launchGame(room: GameRoom) {
    room.status = 'in_game';
    room.matchStartTime = Date.now();
    room.shotsFired.clear();
    room.shotsHit.clear();
    room.damageDealt.clear();
    room.highestStreak.clear();

    const arenaWidth = 1400;
    const arenaHeight = 900;

    // Obstacles
    const obstacles: ArenaObstacle[] = [
      { id: 'ob-1', x: 450, y: 300, width: 60, height: 180, type: 'pillar' },
      { id: 'ob-2', x: 890, y: 420, width: 60, height: 180, type: 'pillar' },
      { id: 'ob-3', x: 670, y: 200, width: 140, height: 40, type: 'barrier' },
      { id: 'ob-4', x: 670, y: 660, width: 140, height: 40, type: 'barrier' },
    ];

    // Initial pickups
    const pickups: OrbPickup[] = [];
    for (let i = 0; i < 8; i++) {
      pickups.push(this.createRandomPickup(arenaWidth, arenaHeight, obstacles));
    }

    // Ships initialization
    const ships: ShipEntity[] = [];
    const participantsList = Array.from(room.participants.values());

    const spawnPoints = [
      { x: 180, y: 180 },
      { x: 1220, y: 720 },
      { x: 1220, y: 180 },
      { x: 180, y: 720 },
      { x: 700, y: 120 },
      { x: 700, y: 780 },
    ];

    participantsList.forEach((p, idx) => {
      const spawn = spawnPoints[idx % spawnPoints.length];
      ships.push({
        id: `ship-${p.id}`,
        playerId: p.id,
        username: p.username,
        avatar: p.avatar,
        shipColor: p.shipColor,
        trailStyle: 'cyan_plasma',
        x: spawn.x,
        y: spawn.y,
        vx: 0,
        vy: 0,
        angle: 0,
        targetAngle: 0,
        health: 100,
        maxHealth: 100,
        shield: 50,
        maxShield: 50,
        energy: 100,
        maxEnergy: 100,
        score: 0,
        kills: 0,
        deaths: 0,
        isAlive: true,
        respawnTimer: 0,
        isBoosting: false,
        isFiring: false,
        isBot: p.isBot,
        invulnerableTimer: 60, // 2 seconds of spawn protection
        streak: 0,
        buffTripleLaser: 0,
        buffHyperSpeed: 0,
      });

      room.shotsFired.set(p.id, 0);
      room.shotsHit.set(p.id, 0);
      room.damageDealt.set(p.id, 0);
      room.highestStreak.set(p.id, 0);
    });

    room.gameState = {
      roomId: room.id,
      roomCode: room.code,
      arenaWidth,
      arenaHeight,
      timeRemaining: room.durationSeconds,
      status: 'active',
      ships,
      projectiles: [],
      pickups,
      obstacles,
      killFeed: [],
    };

    this.broadcastToRoom(room, {
      type: 'game:started',
      gameState: room.gameState,
    });

    // Start 30Hz Authoritative Loop
    let tickCount = 0;
    room.gameLoopTimer = setInterval(() => {
      tickCount += 1;
      this.tickGame(room, tickCount);
    }, 33); // ~30Hz
  }

  private createRandomPickup(
    arenaW: number,
    arenaH: number,
    obstacles: ArenaObstacle[]
  ): OrbPickup {
    const types: OrbPickup['type'][] = [
      'energy',
      'energy',
      'health',
      'shield',
      'triple_laser',
      'speed_boost',
      'mega_core',
    ];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    let color = '#00f6ff';
    let value = 50;
    let radius = 12;

    switch (chosenType) {
      case 'energy':
        color = '#00f6ff';
        value = 60;
        radius = 11;
        break;
      case 'health':
        color = '#39ff14';
        value = 35;
        radius = 12;
        break;
      case 'shield':
        color = '#b026ff';
        value = 40;
        radius = 12;
        break;
      case 'triple_laser':
        color = '#ff007a';
        value = 100;
        radius = 14;
        break;
      case 'speed_boost':
        color = '#ffaa00';
        value = 80;
        radius = 12;
        break;
      case 'mega_core':
        color = '#fef08a';
        value = 250;
        radius = 16;
        break;
    }

    // Find non-colliding location
    let x = 100 + Math.random() * (arenaW - 200);
    let y = 100 + Math.random() * (arenaH - 200);

    return {
      id: `orb-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      x,
      y,
      type: chosenType,
      value,
      color,
      radius,
      pulsateOffset: Math.random() * Math.PI * 2,
    };
  }

  private fireWeapon(room: GameRoom, ship: ShipEntity) {
    if (!room.gameState || !ship.isAlive) return;

    const cost = 12;
    if (ship.energy < cost) return;
    ship.energy -= cost;

    const count = room.shotsFired.get(ship.playerId) || 0;
    room.shotsFired.set(ship.playerId, count + (ship.buffTripleLaser > 0 ? 3 : 1));

    const speed = 15;
    const angles =
      ship.buffTripleLaser > 0
        ? [ship.angle - 0.22, ship.angle, ship.angle + 0.22]
        : [ship.angle];

    for (const ang of angles) {
      const projId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
      const spawnDist = 26;
      const px = ship.x + Math.cos(ang) * spawnDist;
      const py = ship.y + Math.sin(ang) * spawnDist;

      room.gameState.projectiles.push({
        id: projId,
        shooterId: ship.playerId,
        x: px,
        y: py,
        vx: Math.cos(ang) * speed + ship.vx * 0.2,
        vy: Math.sin(ang) * speed + ship.vy * 0.2,
        damage: 28,
        color: ship.shipColor,
        radius: 4,
        lifespan: 45, // ticks
      });
    }
  }

  private triggerEMP(room: GameRoom, ship: ShipEntity) {
    if (!room.gameState || !ship.isAlive) return;
    if (ship.energy < 45) return;
    ship.energy -= 45;

    // Shockwave pushes surrounding enemy ships
    const empRadius = 180;
    for (const other of room.gameState.ships) {
      if (other.playerId === ship.playerId || !other.isAlive) continue;

      const dx = other.x - ship.x;
      const dy = other.y - ship.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < empRadius && dist > 0) {
        const force = (1 - dist / empRadius) * 14;
        other.vx += (dx / dist) * force;
        other.vy += (dy / dist) * force;
        // Drain opponent energy
        other.energy = Math.max(0, other.energy - 30);
      }
    }
  }

  private tickGame(room: GameRoom, tickCount: number) {
    const gs = room.gameState;
    if (!gs || gs.status !== 'active') return;

    // 1. Tick Time (Every 30 ticks = ~1 second)
    if (tickCount % 30 === 0) {
      gs.timeRemaining -= 1;
      if (gs.timeRemaining <= 0) {
        this.finishMatch(room);
        return;
      }
    }

    // 2. Bot AI updates
    this.updateBots(room, gs);

    // 3. Update Ships Physics & Buffs
    for (const ship of gs.ships) {
      if (!ship.isAlive) {
        ship.respawnTimer -= 1;
        if (ship.respawnTimer <= 0) {
          this.respawnShip(ship, gs);
        }
        continue;
      }

      // Invulnerability tick
      if (ship.invulnerableTimer > 0) ship.invulnerableTimer -= 1;
      if (ship.buffTripleLaser > 0) ship.buffTripleLaser -= 1;
      if (ship.buffHyperSpeed > 0) ship.buffHyperSpeed -= 1;

      // Energy regeneration
      const energyRegen = ship.isBoosting ? -0.4 : 0.6;
      ship.energy = Math.max(0, Math.min(ship.maxEnergy, ship.energy + energyRegen));
      if (ship.energy <= 0) ship.isBoosting = false;

      // Shield regeneration (when not damaged recently)
      if (ship.shield < ship.maxShield && tickCount % 5 === 0) {
        ship.shield = Math.min(ship.maxShield, ship.shield + 0.8);
      }

      // Smooth turning towards target angle
      let diff = ship.targetAngle - ship.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      ship.angle += diff * 0.25;

      // Inertia drag
      const drag = 0.94;
      ship.vx *= drag;
      ship.vy *= drag;

      // Update positions
      ship.x += ship.vx;
      ship.y += ship.vy;

      // Arena Boundary Bouncing
      const pad = 24;
      if (ship.x < pad) {
        ship.x = pad;
        ship.vx = Math.abs(ship.vx) * 0.7;
      } else if (ship.x > gs.arenaWidth - pad) {
        ship.x = gs.arenaWidth - pad;
        ship.vx = -Math.abs(ship.vx) * 0.7;
      }

      if (ship.y < pad) {
        ship.y = pad;
        ship.vy = Math.abs(ship.vy) * 0.7;
      } else if (ship.y > gs.arenaHeight - pad) {
        ship.y = gs.arenaHeight - pad;
        ship.vy = -Math.abs(ship.vy) * 0.7;
      }

      // Obstacle collision
      for (const ob of gs.obstacles) {
        if (
          ship.x > ob.x - pad &&
          ship.x < ob.x + ob.width + pad &&
          ship.y > ob.y - pad &&
          ship.y < ob.y + ob.height + pad
        ) {
          // Push back
          const cx = ob.x + ob.width / 2;
          const cy = ob.y + ob.height / 2;
          const dx = ship.x - cx;
          const dy = ship.y - cy;
          ship.vx = (dx > 0 ? 1 : -1) * 3;
          ship.vy = (dy > 0 ? 1 : -1) * 3;
        }
      }

      // Pickup collisions
      for (let i = gs.pickups.length - 1; i >= 0; i--) {
        const p = gs.pickups[i];
        const distSq = (ship.x - p.x) ** 2 + (ship.y - p.y) ** 2;
        if (distSq < (p.radius + 20) ** 2) {
          // Collect pickup
          this.applyPickupToShip(ship, p);
          gs.pickups.splice(i, 1);
        }
      }
    }

    // Maintain minimum pickups
    if (gs.pickups.length < 8 && Math.random() < 0.08) {
      gs.pickups.push(this.createRandomPickup(gs.arenaWidth, gs.arenaHeight, gs.obstacles));
    }

    // 4. Update Projectiles
    for (let i = gs.projectiles.length - 1; i >= 0; i--) {
      const proj = gs.projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;
      proj.lifespan -= 1;

      // Boundary check
      if (
        proj.lifespan <= 0 ||
        proj.x < 0 ||
        proj.x > gs.arenaWidth ||
        proj.y < 0 ||
        proj.y > gs.arenaHeight
      ) {
        gs.projectiles.splice(i, 1);
        continue;
      }

      // Obstacle check
      let hitObstacle = false;
      for (const ob of gs.obstacles) {
        if (
          proj.x >= ob.x &&
          proj.x <= ob.x + ob.width &&
          proj.y >= ob.y &&
          proj.y <= ob.y + ob.height
        ) {
          hitObstacle = true;
          break;
        }
      }
      if (hitObstacle) {
        gs.projectiles.splice(i, 1);
        continue;
      }

      // Ship hits
      let projDestroyed = false;
      for (const target of gs.ships) {
        if (target.playerId === proj.shooterId || !target.isAlive || target.invulnerableTimer > 0) {
          continue;
        }

        const distSq = (target.x - proj.x) ** 2 + (target.y - proj.y) ** 2;
        if (distSq < (target.shield > 0 ? 28 : 22) ** 2) {
          this.handleHit(room, gs, proj, target);
          projDestroyed = true;
          break;
        }
      }

      if (projDestroyed) {
        gs.projectiles.splice(i, 1);
      }
    }

    // Broadcast authoritative state delta to all clients in room
    this.broadcastToRoom(room, {
      type: 'game:tick',
      gameState: gs,
    });
  }

  private applyPickupToShip(ship: ShipEntity, pickup: OrbPickup) {
    ship.score += pickup.value;

    switch (pickup.type) {
      case 'energy':
        ship.energy = Math.min(ship.maxEnergy, ship.energy + 45);
        break;
      case 'health':
        ship.health = Math.min(ship.maxHealth, ship.health + 40);
        break;
      case 'shield':
        ship.shield = Math.min(ship.maxShield, ship.shield + 35);
        break;
      case 'triple_laser':
        ship.buffTripleLaser = 240; // 8 seconds
        break;
      case 'speed_boost':
        ship.buffHyperSpeed = 240; // 8 seconds
        break;
      case 'mega_core':
        ship.health = ship.maxHealth;
        ship.shield = ship.maxShield;
        ship.energy = ship.maxEnergy;
        break;
    }
  }

  private handleHit(
    room: GameRoom,
    gs: GameArenaState,
    proj: ProjectileEntity,
    target: ShipEntity
  ) {
    const shooter = gs.ships.find((s) => s.playerId === proj.shooterId);

    // Track accuracy & damage
    if (shooter) {
      const hits = (room.shotsHit.get(shooter.playerId) || 0) + 1;
      room.shotsHit.set(shooter.playerId, hits);

      const curDmg = (room.damageDealt.get(shooter.playerId) || 0) + proj.damage;
      room.damageDealt.set(shooter.playerId, curDmg);

      shooter.score += 25; // hit reward
    }

    // Apply damage to shield first
    let remainingDmg = proj.damage;
    if (target.shield > 0) {
      if (target.shield >= remainingDmg) {
        target.shield -= remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= target.shield;
        target.shield = 0;
      }
    }

    if (remainingDmg > 0) {
      target.health = Math.max(0, target.health - remainingDmg);
    }

    target.lastDamageBy = proj.shooterId;

    // Check elimination
    if (target.health <= 0) {
      target.isAlive = false;
      target.deaths += 1;
      target.respawnTimer = 90; // 3 seconds at 30Hz
      target.streak = 0;

      if (shooter) {
        shooter.kills += 1;
        shooter.streak += 1;
        shooter.score += 150 + shooter.streak * 25;

        const maxStreak = Math.max(
          room.highestStreak.get(shooter.playerId) || 0,
          shooter.streak
        );
        room.highestStreak.set(shooter.playerId, maxStreak);

        gs.killFeed.unshift({
          id: `kill-${Date.now()}-${Math.random()}`,
          killerName: shooter.username,
          victimName: target.username,
          time: Date.now(),
        });
        if (gs.killFeed.length > 5) gs.killFeed.pop();
      }
    }
  }

  private respawnShip(ship: ShipEntity, gs: GameArenaState) {
    ship.isAlive = true;
    ship.health = ship.maxHealth;
    ship.shield = ship.maxShield;
    ship.energy = ship.maxEnergy;
    ship.invulnerableTimer = 60; // 2s protection
    ship.x = 200 + Math.random() * (gs.arenaWidth - 400);
    ship.y = 200 + Math.random() * (gs.arenaHeight - 400);
    ship.vx = 0;
    ship.vy = 0;
  }

  private updateBots(room: GameRoom, gs: GameArenaState) {
    for (const bot of gs.ships) {
      if (!bot.isBot || !bot.isAlive) continue;

      // Find nearest living opponent or pickup
      let nearestEnemy: ShipEntity | null = null;
      let minEnemyDist = Infinity;

      for (const enemy of gs.ships) {
        if (enemy.playerId === bot.playerId || !enemy.isAlive) continue;
        const dist = Math.hypot(enemy.x - bot.x, enemy.y - bot.y);
        if (dist < minEnemyDist) {
          minEnemyDist = dist;
          nearestEnemy = enemy;
        }
      }

      if (nearestEnemy && minEnemyDist < 600) {
        // Aim and steer towards enemy
        const angleToEnemy = Math.atan2(nearestEnemy.y - bot.y, nearestEnemy.x - bot.x);
        bot.targetAngle = angleToEnemy;

        // Thrust towards enemy if far, or circle
        if (minEnemyDist > 220) {
          bot.vx += Math.cos(angleToEnemy) * 0.35;
          bot.vy += Math.sin(angleToEnemy) * 0.35;
        }

        // Fire occasionally
        if (Math.random() < 0.12 && bot.energy > 20) {
          this.fireWeapon(room, bot);
        }
      } else if (gs.pickups.length > 0) {
        // Seek nearest pickup
        const p = gs.pickups[0];
        const ang = Math.atan2(p.y - bot.y, p.x - bot.x);
        bot.targetAngle = ang;
        bot.vx += Math.cos(ang) * 0.3;
        bot.vy += Math.sin(ang) * 0.3;
      }
    }
  }

  private finishMatch(room: GameRoom) {
    if (room.gameLoopTimer) {
      clearInterval(room.gameLoopTimer);
      room.gameLoopTimer = null;
    }

    room.status = 'finished';
    const gs = room.gameState;
    if (!gs) return;

    gs.status = 'finished';

    // Rank players by score
    const rankedShips = [...gs.ships].sort((a, b) => b.score - a.score || b.kills - a.kills);
    const winner = rankedShips[0];

    if (winner) {
      gs.winner = {
        id: winner.playerId,
        name: winner.username,
        score: winner.score,
      };
    }

    const duration = Math.round((Date.now() - room.matchStartTime) / 1000);

    // Build Match Record
    const matchRecord: MatchRecord = {
      id: `match-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      roomCode: room.code,
      mode: room.mode,
      arena: 'Neon Colosseum',
      winnerId: winner ? winner.playerId : '',
      winnerName: winner ? winner.username : 'None',
      duration,
      players: rankedShips.map((s) => ({
        id: s.playerId,
        username: s.username,
        avatar: s.avatar,
        shipColor: s.shipColor,
        score: s.score,
        kills: s.kills,
        deaths: s.deaths,
        isWinner: winner ? s.playerId === winner.playerId : false,
      })),
      startedAt: new Date(room.matchStartTime).toISOString(),
      finishedAt: new Date().toISOString(),
    };

    // Build Scores
    const scoreRecords: ScoreRecord[] = rankedShips.map((s, idx) => {
      const fired = room.shotsFired.get(s.playerId) || 1;
      const hits = room.shotsHit.get(s.playerId) || 0;
      const accuracy = Math.min(100, Math.round((hits / Math.max(1, fired)) * 100));

      return {
        id: `score-${Date.now().toString(36)}-${s.playerId.substring(0, 6)}`,
        matchId: matchRecord.id,
        playerId: s.playerId,
        playerName: s.username,
        playerAvatar: s.avatar,
        score: s.score,
        kills: s.kills,
        deaths: s.deaths,
        damageDealt: room.damageDealt.get(s.playerId) || 0,
        accuracy,
        highestStreak: room.highestStreak.get(s.playerId) || s.kills,
        timestamp: new Date().toISOString(),
        rankInMatch: idx + 1,
      };
    });

    // Record to database!
    db.recordMatch(matchRecord, scoreRecords);

    // Broadcast Game Finished Event
    this.broadcastToRoom(room, {
      type: 'game:finished',
      match: matchRecord,
      scores: scoreRecords,
      winner: winner
        ? {
            id: winner.playerId,
            username: winner.username,
            avatar: winner.avatar,
            score: winner.score,
            kills: winner.kills,
          }
        : null,
    });

    this.broadcastRoomsList();
  }
}
