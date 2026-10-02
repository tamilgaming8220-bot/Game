import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameArenaState, ShipEntity, PlayerProfile } from '../types/game';
import {
  Shield,
  Zap,
  Heart,
  Crosshair,
  Flame,
  Award,
  Radio,
  Sparkles,
} from 'lucide-react';

interface GameArenaProps {
  player: PlayerProfile | null;
  gameState: GameArenaState;
  onSendInput: (input: {
    thrustX?: number;
    thrustY?: number;
    targetAngle?: number;
    isBoosting?: boolean;
    fire?: boolean;
    empBlast?: boolean;
  }) => void;
  onLeaveMatch: () => void;
  sound: {
    playLaser: () => void;
    playHit: () => void;
    playExplosion: () => void;
    playPickup: () => void;
    playClick: () => void;
  };
}

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  vy: number;
}

export const GameArena: React.FC<GameArenaProps> = ({
  player,
  gameState,
  onSendInput,
  onLeaveMatch,
  sound,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Input states
  const keysDownRef = useRef<{ [key: string]: boolean }>({});
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);
  const lastFireTimeRef = useRef(0);

  // Mobile virtual joystick state
  const joystickCenterRef = useRef<{ x: number; y: number } | null>(null);
  const joystickTouchIdRef = useRef<number | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number } | null>(null);
  const isBoostingTouchRef = useRef(false);

  // Screen shake & particles
  const screenShakeRef = useRef(0);
  const particlesRef = useRef<VisualParticle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const lastStateRef = useRef<GameArenaState>(gameState);
  const myShipPrevHealthRef = useRef(100);

  // Current client's ship
  const myShip = gameState.ships.find((s) => s.playerId === player?.id);

  // Monitor damage taken or kills to trigger sound and screen shake
  useEffect(() => {
    if (myShip) {
      if (myShip.health < myShipPrevHealthRef.current) {
        sound.playHit();
        screenShakeRef.current = 8;
        // Spawn damage particles
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2;
          const spd = 2 + Math.random() * 4;
          particlesRef.current.push({
            x: myShip.x,
            y: myShip.y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            color: '#ff007a',
            size: 2 + Math.random() * 3,
            alpha: 1,
            life: 0,
            maxLife: 20,
          });
        }
      }
      myShipPrevHealthRef.current = myShip.health;
    }
  }, [myShip?.health, sound]);

  // Monitor kills in killfeed
  useEffect(() => {
    if (gameState.killFeed.length > lastStateRef.current.killFeed.length) {
      const latest = gameState.killFeed[0];
      if (latest && latest.killerName === player?.username) {
        sound.playExplosion();
        screenShakeRef.current = 14;
        addFloatingText(myShip?.x || 500, (myShip?.y || 400) - 40, '+150 ELIMINATION!', '#39ff14');
      } else {
        sound.playExplosion();
      }
    }
    lastStateRef.current = gameState;
  }, [gameState.killFeed, player?.username, sound]);

  const addFloatingText = (x: number, y: number, text: string, color: string) => {
    floatingTextsRef.current.push({
      id: Math.random().toString(),
      x,
      y,
      text,
      color,
      alpha: 1,
      vy: -1.5,
    });
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = true;
      if (e.code === 'KeyE') {
        onSendInput({ empBlast: true });
        addFloatingText(myShip?.x || 500, myShip?.y || 400, 'EMP PULSE!', '#00f6ff');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onSendInput, myShip?.x, myShip?.y]);

  // Input Polling Loop (sends thrust & aim to server at 30Hz)
  useEffect(() => {
    const inputInterval = setInterval(() => {
      const keys = keysDownRef.current;
      let tx = 0;
      let ty = 0;

      // WASD / Arrow Keys
      if (keys['KeyW'] || keys['ArrowUp']) ty -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) ty += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) tx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) tx += 1;

      // Mobile Joystick Override
      if (joystickPos) {
        tx = joystickPos.x;
        ty = joystickPos.y;
      }

      // Normalize diagonal vector
      const len = Math.hypot(tx, ty);
      if (len > 1) {
        tx /= len;
        ty /= len;
      }

      const isBoosting =
        keys['ShiftLeft'] ||
        keys['ShiftRight'] ||
        keys['Space'] ||
        isBoostingTouchRef.current;

      // Calculate Target Angle from Ship to Mouse (or direction of joystick)
      let targetAngle: number | undefined;
      const canvas = canvasRef.current;
      if (canvas && myShip) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const canvasMouseX = (mousePosRef.current.x - rect.left) * scaleX;
        const canvasMouseY = (mousePosRef.current.y - rect.top) * scaleY;

        if (joystickPos && (joystickPos.x !== 0 || joystickPos.y !== 0)) {
          targetAngle = Math.atan2(joystickPos.y, joystickPos.x);
        } else {
          targetAngle = Math.atan2(canvasMouseY - myShip.y, canvasMouseX - myShip.x);
        }
      }

      // Check auto fire if mouse is down
      const now = Date.now();
      let fire = false;
      if ((isMouseDownRef.current || keys['Space']) && now - lastFireTimeRef.current > 140) {
        fire = true;
        lastFireTimeRef.current = now;
        sound.playLaser();
      }

      onSendInput({
        thrustX: tx,
        thrustY: ty,
        targetAngle,
        isBoosting,
        fire,
      });
    }, 33);

    return () => clearInterval(inputInterval);
  }, [onSendInput, myShip, joystickPos, sound]);

  // Touch handlers for mobile joystick
  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    joystickTouchIdRef.current = touch.identifier;
    joystickCenterRef.current = { x: touch.clientX, y: touch.clientY };
    setJoystickPos({ x: 0, y: 0 });
  };

  const handleJoystickTouchMove = (e: React.TouchEvent) => {
    if (!joystickCenterRef.current) return;
    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      if (touch.identifier === joystickTouchIdRef.current) {
        const dx = touch.clientX - joystickCenterRef.current.x;
        const dy = touch.clientY - joystickCenterRef.current.y;
        const dist = Math.hypot(dx, dy);
        const maxRadius = 45;
        const clampedDist = Math.min(dist, maxRadius);
        const ang = Math.atan2(dy, dx);

        setJoystickPos({
          x: (Math.cos(ang) * clampedDist) / maxRadius,
          y: (Math.sin(ang) * clampedDist) / maxRadius,
        });
        break;
      }
    }
  };

  const handleJoystickTouchEnd = () => {
    joystickCenterRef.current = null;
    joystickTouchIdRef.current = null;
    setJoystickPos(null);
  };

  // Main 60fps Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;

      // Screen Shake
      ctx.save();
      if (screenShakeRef.current > 0) {
        const shakeX = (Math.random() - 0.5) * screenShakeRef.current;
        const shakeY = (Math.random() - 0.5) * screenShakeRef.current;
        ctx.translate(shakeX, shakeY);
        screenShakeRef.current *= 0.88;
        if (screenShakeRef.current < 0.2) screenShakeRef.current = 0;
      }

      // Background
      ctx.fillStyle = '#060912';
      ctx.fillRect(0, 0, width, height);

      // Cyber Grid Lines
      ctx.strokeStyle = 'rgba(0, 246, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 50;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Arena Outer Neon Boundary
      ctx.strokeStyle = '#00f6ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f6ff';
      ctx.shadowBlur = 12;
      ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.shadowBlur = 0;

      // Obstacles
      for (const ob of gameState.obstacles) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fillRect(ob.x, ob.y, ob.width, ob.height);
        ctx.strokeRect(ob.x, ob.y, ob.width, ob.height);
        ctx.shadowBlur = 0;

        // Diagonal hazard stripes on obstacle
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = -ob.height; i < ob.width; i += 16) {
          ctx.beginPath();
          ctx.moveTo(ob.x + Math.max(0, i), ob.y);
          ctx.lineTo(ob.x + Math.min(ob.width, i + ob.height), ob.y + ob.height);
          ctx.stroke();
        }
      }

      // Pickups & Orbs
      const time = performance.now() * 0.003;
      for (const p of gameState.pickups) {
        const pulse = Math.sin(time + p.pulsateOffset) * 3;
        const r = p.radius + pulse;

        ctx.shadowColor = p.color;
        ctx.shadowBlur = 16;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Orbiting halo ring
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Update & Draw Particles (engine trails & explosions)
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life += 1;
        pt.alpha = 1 - pt.life / pt.maxLife;

        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;

        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(i, 1);
        }
      }

      // Projectiles
      for (const proj of gameState.projectiles) {
        ctx.shadowColor = proj.color;
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffffff';

        // Laser bolt
        const boltLength = 14;
        const boltAngle = Math.atan2(proj.vy, proj.vx);

        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(boltAngle);

        ctx.fillStyle = proj.color;
        ctx.fillRect(-boltLength, -2.5, boltLength, 5);

        // Core white line
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-boltLength * 0.8, -1, boltLength * 0.8, 2);

        ctx.restore();
        ctx.shadowBlur = 0;
      }

      // Ships
      for (const ship of gameState.ships) {
        if (!ship.isAlive) continue;

        // Engine thruster particles
        if (Math.abs(ship.vx) > 0.5 || Math.abs(ship.vy) > 0.5 || ship.isBoosting) {
          const rearDist = 20;
          const rearX = ship.x - Math.cos(ship.angle) * rearDist;
          const rearY = ship.y - Math.sin(ship.angle) * rearDist;
          const particleCount = ship.isBoosting ? 3 : 1;

          for (let p = 0; p < particleCount; p++) {
            const spread = (Math.random() - 0.5) * 0.4;
            const speed = -(ship.isBoosting ? 4 : 2);
            particlesRef.current.push({
              x: rearX,
              y: rearY,
              vx: Math.cos(ship.angle + spread) * speed + ship.vx * 0.2,
              vy: Math.sin(ship.angle + spread) * speed + ship.vy * 0.2,
              color: ship.isBoosting ? '#ff007a' : ship.shipColor,
              size: ship.isBoosting ? 3.5 : 2,
              alpha: 1,
              life: 0,
              maxLife: ship.isBoosting ? 20 : 12,
            });
          }
        }

        ctx.save();
        ctx.translate(ship.x, ship.y);

        // Spawn protection / invulnerability shield glow
        if (ship.invulnerableTimer > 0) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(0, 0, 32, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Shield Bubble
        if (ship.shield > 0) {
          ctx.strokeStyle = 'rgba(0, 246, 255, 0.4)';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00f6ff';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Rotate to ship heading
        ctx.rotate(ship.angle);

        // Draw High-Tech Neon Ship Poly
        ctx.shadowColor = ship.shipColor;
        ctx.shadowBlur = 14;

        // Outer hull
        ctx.beginPath();
        ctx.moveTo(22, 0); // Front tip
        ctx.lineTo(-14, -15); // Left wing
        ctx.lineTo(-8, 0); // Center cockpit indent
        ctx.lineTo(-14, 15); // Right wing
        ctx.closePath();

        ctx.fillStyle = '#0c1220';
        ctx.fill();

        ctx.strokeStyle = ship.shipColor;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Cockpit canopy glow
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(2, 0, 6, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();

        // Draw Player Username & Health/Shield bars above ship
        const barW = 44;
        const barH = 4;
        const barY = ship.y - 32;

        // Username
        ctx.fillStyle = ship.playerId === player?.id ? '#38bdf8' : '#e2e8f0';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          ship.username + (ship.isBot ? ' [BOT]' : ''),
          ship.x,
          barY - 6
        );

        // Health bar background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(ship.x - barW / 2, barY, barW, barH);

        // Health fill
        const hpPercent = Math.max(0, ship.health / ship.maxHealth);
        ctx.fillStyle = hpPercent > 0.3 ? '#22c55e' : '#ef4444';
        ctx.fillRect(ship.x - barW / 2, barY, barW * hpPercent, barH);

        // Shield bar (if present)
        if (ship.shield > 0) {
          const spPercent = Math.min(1, ship.shield / ship.maxShield);
          ctx.fillStyle = '#00f6ff';
          ctx.fillRect(ship.x - barW / 2, barY + barH + 1, barW * spPercent, 2);
        }
      }

      // Draw Floating Combat Texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy;
        ft.alpha -= 0.025;

        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = 'black 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.globalAlpha = 1.0;

        if (ft.alpha <= 0) {
          floatingTextsRef.current.splice(i, 1);
        }
      }

      ctx.restore();
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState, player?.id]);

  // Mouse aim event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isMouseDownRef.current = true;
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      isMouseDownRef.current = false;
    }
  };

  // Sorted leader ranking in match
  const rankedShips = [...gameState.ships].sort((a, b) => b.score - a.score);
  const myRank = rankedShips.findIndex((s) => s.playerId === player?.id) + 1;

  // Format time remaining
  const minutes = Math.floor(gameState.timeRemaining / 60);
  const seconds = gameState.timeRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-65px)] bg-slate-950 flex flex-col items-center justify-center overflow-hidden select-none"
    >
      {/* HUD Header Bar */}
      <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Match Timer & Mode */}
        <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-cyan-500/30 shadow-[0_0_15px_rgba(0,246,255,0.2)] pointer-events-auto">
          <div>
            <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              Time Remaining
            </span>
            <span className="font-mono text-xl font-black text-cyan-300">
              {timeFormatted}
            </span>
          </div>
          <div className="h-7 w-[1px] bg-slate-700" />
          <div>
            <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold">
              Match Standings
            </span>
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" />
              {myRank > 0 ? `#${myRank} of ${rankedShips.length}` : '-'}
            </span>
          </div>
        </div>

        {/* Top Right: Match Leaderboard Strip & Leave Button */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-semibold">1st:</span>
            <span className="font-bold text-white truncate max-w-[100px]">
              {rankedShips[0]?.username || 'N/A'}
            </span>
            <span className="text-cyan-400 font-mono font-bold">
              {rankedShips[0]?.score || 0} pts
            </span>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onLeaveMatch();
            }}
            className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 text-xs font-bold transition cursor-pointer"
          >
            Leave
          </button>
        </div>
      </div>

      {/* Kill Feed (Top Right) */}
      <div className="absolute top-16 right-4 z-20 flex flex-col gap-1.5 pointer-events-none">
        {gameState.killFeed.map((kf) => (
          <div
            key={kf.id}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-900/90 border border-cyan-900/60 text-xs shadow-md animate-in slide-in-from-right duration-200"
          >
            <span className="font-bold text-cyan-300">{kf.killerName}</span>
            <Crosshair className="w-3 h-3 text-red-400" />
            <span className="text-slate-400">{kf.victimName}</span>
          </div>
        ))}
      </div>

      {/* Responsive Canvas */}
      <canvas
        ref={canvasRef}
        width={gameState.arenaWidth}
        height={gameState.arenaHeight}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="w-full h-full object-contain cursor-crosshair"
      />

      {/* Player Status HUD (Bottom Center) */}
      {myShip && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
          {/* Active Buffs Banner */}
          {(myShip.buffTripleLaser > 0 || myShip.buffHyperSpeed > 0) && (
            <div className="flex items-center gap-2 mb-1">
              {myShip.buffTripleLaser > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white shadow-[0_0_10px_#ff007a] animate-pulse">
                  ⚡ TRIPLE LASER ({Math.ceil(myShip.buffTripleLaser / 30)}s)
                </span>
              )}
              {myShip.buffHyperSpeed > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 shadow-[0_0_10px_#ffaa00] animate-pulse">
                  🚀 OVERDRIVE ({Math.ceil(myShip.buffHyperSpeed / 30)}s)
                </span>
              )}
            </div>
          )}

          {/* Vitals Container */}
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-900/90 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,246,255,0.25)] backdrop-blur-md">
            {/* Health Bar */}
            <div className="w-28 sm:w-36">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-300">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Heart className="w-3 h-3 fill-emerald-400" /> HULL
                </span>
                <span>{Math.round(myShip.health)}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-100"
                  style={{ width: `${(myShip.health / myShip.maxHealth) * 100}%` }}
                />
              </div>
            </div>

            {/* Shield Bar */}
            <div className="w-28 sm:w-36">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-300">
                <span className="flex items-center gap-1 text-cyan-400">
                  <Shield className="w-3 h-3 fill-cyan-400" /> SHIELD
                </span>
                <span>{Math.round(myShip.shield)}/50</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-cyan-400 shadow-[0_0_8px_#00f6ff] transition-all duration-100"
                  style={{ width: `${(myShip.shield / myShip.maxShield) * 100}%` }}
                />
              </div>
            </div>

            {/* Energy / Boost Bar */}
            <div className="w-28 sm:w-36">
              <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-slate-300">
                <span className="flex items-center gap-1 text-amber-400">
                  <Zap className="w-3 h-3 fill-amber-400" /> ENERGY
                </span>
                <span>{Math.round(myShip.energy)}/100</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-pink-500 transition-all duration-100"
                  style={{ width: `${(myShip.energy / myShip.maxEnergy) * 100}%` }}
                />
              </div>
            </div>

            {/* Personal Score */}
            <div className="pl-2 border-l border-slate-700 text-right leading-none">
              <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                SCORE
              </span>
              <span className="font-mono text-base font-black text-cyan-300">
                {myShip.score}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Respawn Countdown Overlay when eliminated */}
      {myShip && !myShip.isAlive && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="text-center p-6 rounded-3xl bg-slate-900 border border-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
            <h3 className="text-lg font-black uppercase tracking-wider text-red-400">
              Hull Compromised
            </h3>
            <p className="text-xs text-slate-400 mt-1">Rebuilding vessel nanites...</p>
            <div className="text-5xl font-black font-mono text-white mt-3 animate-pulse">
              {Math.ceil(myShip.respawnTimer / 30)}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Touch Controls (Virtual Joystick & Action Buttons) */}
      <div className="md:hidden absolute inset-x-0 bottom-0 top-0 pointer-events-none z-30 flex justify-between items-end p-6">
        {/* Virtual Joystick (Left) */}
        <div
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleJoystickTouchMove}
          onTouchEnd={handleJoystickTouchEnd}
          className="w-32 h-32 rounded-full border-2 border-cyan-500/40 bg-slate-950/60 backdrop-blur pointer-events-auto relative flex items-center justify-center shadow-lg"
        >
          <div
            className="w-12 h-12 rounded-full bg-cyan-400 shadow-[0_0_12px_#00f6ff] transition-transform duration-75"
            style={{
              transform: joystickPos
                ? `translate(${joystickPos.x * 35}px, ${joystickPos.y * 35}px)`
                : 'translate(0px, 0px)',
            }}
          />
        </div>

        {/* Action Buttons (Right) */}
        <div className="flex flex-col gap-3 pointer-events-auto">
          {/* EMP Blast */}
          <button
            onTouchStart={() => {
              onSendInput({ empBlast: true });
            }}
            className="w-14 h-14 rounded-full bg-purple-600/80 active:bg-purple-500 border border-purple-400 text-white font-bold text-xs flex flex-col items-center justify-center shadow-lg"
          >
            <Radio className="w-5 h-5" />
            <span className="text-[9px]">EMP</span>
          </button>

          {/* Overdrive Boost */}
          <button
            onTouchStart={() => {
              isBoostingTouchRef.current = true;
            }}
            onTouchEnd={() => {
              isBoostingTouchRef.current = false;
            }}
            className="w-14 h-14 rounded-full bg-amber-500/80 active:bg-amber-400 border border-amber-300 text-slate-950 font-bold text-xs flex flex-col items-center justify-center shadow-lg"
          >
            <Flame className="w-5 h-5" />
            <span className="text-[9px]">BOOST</span>
          </button>

          {/* Fire Laser Button */}
          <button
            onTouchStart={() => {
              isMouseDownRef.current = true;
            }}
            onTouchEnd={() => {
              isMouseDownRef.current = false;
            }}
            className="w-16 h-16 rounded-full bg-cyan-500 active:bg-cyan-400 text-slate-950 font-black text-xs flex flex-col items-center justify-center shadow-[0_0_18px_#00f6ff]"
          >
            <Crosshair className="w-7 h-7" />
            <span className="text-[9px] uppercase tracking-wider font-extrabold">FIRE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
