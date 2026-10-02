import React, { useState } from 'react';
import { RoomSummary, RoomParticipant, ChatMessage, PlayerProfile } from '../types/game';
import {
  Users,
  Plus,
  Play,
  Copy,
  Check,
  Bot,
  Send,
  LogOut,
  Sparkles,
  Swords,
  Radio,
  Flame,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';

interface LobbyViewProps {
  player: PlayerProfile | null;
  rooms: RoomSummary[];
  currentRoom: {
    id: string;
    code: string;
    name: string;
    hostId: string;
    mode: 'deathmatch' | 'energy_rush' | 'survival';
    status: 'lobby' | 'countdown' | 'in_game' | 'finished';
    maxPlayers: number;
    isPrivate: boolean;
    participants: RoomParticipant[];
    messages: ChatMessage[];
  } | null;
  countdown: number | null;
  onQuickMatch: () => void;
  onCreateRoom: (params: { name: string; code: string; mode: 'deathmatch' | 'energy_rush'; maxPlayers: number }) => void;
  onJoinRoom: (roomId?: string, roomCode?: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onAddBot: () => void;
  onRemoveBot: () => void;
  onStartGame: () => void;
  onSendMessage: (text: string) => void;
  playClick: () => void;
  onOpenAuth: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  player,
  rooms,
  currentRoom,
  countdown,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onAddBot,
  onRemoveBot,
  onStartGame,
  onSendMessage,
  playClick,
  onOpenAuth,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomMode, setRoomMode] = useState<'deathmatch' | 'energy_rush'>('deathmatch');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = (code: string) => {
    playClick();
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    playClick();
    const code = Math.random().toString(36).substring(2, 6).toUpperCase();
    onCreateRoom({
      name: roomName.trim() || `${player?.username || 'Pilot'}'s Arena`,
      code,
      mode: roomMode,
      maxPlayers,
    });
    setShowCreateModal(false);
    setRoomName('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendMessage(chatInput.trim());
    setChatInput('');
  };

  // If inside a room: show Room Staging Lobby
  if (currentRoom) {
    const isHost = player?.id === currentRoom.hostId;
    const myParticipant = currentRoom.participants.find((p) => p.id === player?.id);
    const allReady =
      currentRoom.participants.length >= 2 &&
      currentRoom.participants.every((p) => p.isReady);

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 animate-in fade-in duration-300">
        {/* Countdown Overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md">
            <div className="text-center">
              <p className="text-sm font-bold uppercase tracking-widest text-cyan-400 mb-2">
                Engaging Neural Link
              </p>
              <div className="text-8xl font-black bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300 bg-clip-text text-transparent animate-ping">
                {countdown}
              </div>
              <p className="text-xs text-slate-400 mt-4">Calibrating Thrusters & Weapon Nodes...</p>
            </div>
          </div>
        )}

        {/* Room Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-[#0d1627] via-[#090e1a] to-[#160d27] p-5 sm:p-6 mb-6 shadow-[0_0_30px_rgba(0,246,255,0.15)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-cyan-950 text-cyan-300 border border-cyan-800 uppercase">
                  {currentRoom.mode === 'deathmatch' ? 'Deathmatch Arena' : 'Energy Rush'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                  Lobby Open
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white">
                {currentRoom.name}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Share this Room Code with opponents to duel across tabs or devices.
              </p>
            </div>

            {/* Room Code Badge */}
            <div className="flex items-center gap-3">
              <div
                onClick={() => handleCopyCode(currentRoom.code)}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 transition cursor-pointer shadow-[0_0_15px_rgba(0,246,255,0.2)]"
                title="Click to copy Room Code"
              >
                <div className="text-left leading-tight">
                  <span className="block text-[9px] font-semibold text-slate-400 uppercase">
                    Room Code
                  </span>
                  <span className="text-base font-black tracking-widest font-mono text-cyan-200">
                    {currentRoom.code}
                  </span>
                </div>
                {copiedCode ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-cyan-400" />
                )}
              </div>

              <button
                onClick={() => {
                  playClick();
                  onLeaveRoom();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Grid: Participants & Chat */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Participants Slots */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>
                  Pilots Staging ({currentRoom.participants.length}/{currentRoom.maxPlayers})
                </span>
              </h2>

              {/* Host Bot Controls */}
              {isHost && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      playClick();
                      onAddBot();
                    }}
                    disabled={currentRoom.participants.length >= currentRoom.maxPlayers}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-semibold text-slate-300 hover:text-cyan-300 transition disabled:opacity-40 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+ Add Combat Bot</span>
                  </button>
                  {currentRoom.participants.some((p) => p.isBot) && (
                    <button
                      onClick={() => {
                        playClick();
                        onRemoveBot();
                      }}
                      className="px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-red-400 text-xs font-semibold text-slate-400 hover:text-red-300 transition cursor-pointer"
                    >
                      Remove Bot
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Pilot Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentRoom.participants.map((p) => {
                const isMe = p.id === player?.id;
                return (
                  <div
                    key={p.id}
                    className={`relative p-4 rounded-xl border transition-all ${
                      p.isReady
                        ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_15px_rgba(0,246,255,0.15)]'
                        : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-md"
                          style={{ backgroundColor: p.shipColor, color: '#090d16' }}
                        >
                          {p.isBot ? (
                            <Bot className="w-5 h-5 text-slate-950" />
                          ) : (
                            p.username.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate max-w-[140px]">
                              {p.username}
                            </span>
                            {isMe && (
                              <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-500/30 text-cyan-300 font-semibold">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                            {p.isHost && (
                              <span className="text-amber-400 font-semibold flex items-center gap-1">
                                👑 Host
                              </span>
                            )}
                            {p.isBot && <span className="text-purple-400 font-medium">AI Drone</span>}
                            <span>Ping: {p.ping || 18}ms</span>
                          </div>
                        </div>
                      </div>

                      {/* Ready Badge */}
                      <div>
                        {p.isReady ? (
                          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-1 rounded-lg text-xs font-bold">
                            <Check className="w-3.5 h-3.5" />
                            <span>READY</span>
                          </div>
                        ) : (
                          <div className="text-slate-500 bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg text-xs font-semibold">
                            PREPARING
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: currentRoom.maxPlayers - currentRoom.participants.length }).map(
                (_, idx) => (
                  <div
                    key={`empty-${idx}`}
                    className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 flex items-center justify-center text-slate-500 text-xs font-semibold"
                  >
                    <span>Waiting for Pilot slot {currentRoom.participants.length + idx + 1}...</span>
                  </div>
                )
              )}
            </div>

            {/* Ready / Start Battle Buttons */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
              <div className="text-xs text-slate-400">
                {isHost
                  ? 'As Room Host, you can deploy combat bots and launch when ready.'
                  : 'Toggle your status to READY so the Host can launch the match.'}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => {
                    playClick();
                    onToggleReady();
                  }}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition cursor-pointer ${
                    myParticipant?.isReady
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                  }`}
                >
                  {myParticipant?.isReady ? 'Cancel Ready' : 'Ready to Battle'}
                </button>

                {isHost && (
                  <button
                    onClick={() => {
                      playClick();
                      onStartGame();
                    }}
                    disabled={currentRoom.participants.length < 2}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 hover:from-cyan-300 hover:to-pink-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,246,255,0.4)] transition cursor-pointer disabled:opacity-40"
                    title={
                      currentRoom.participants.length < 2
                        ? 'Add at least one combat bot or wait for another pilot'
                        : 'Launch Match Now'
                    }
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Launch Match</span>
                  </button>
                )}
              </div>
            </div>

            {/* Quick Controls Guide */}
            <div className="p-4 rounded-xl bg-[#0a101d] border border-cyan-950/60 text-xs text-slate-300">
              <h4 className="font-bold text-cyan-400 mb-2 flex items-center gap-1.5 uppercase text-[11px] tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                Flight & Combat Controls
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-400">
                <div>
                  <strong className="text-white">WASD / Arrows:</strong> Thrusters
                </div>
                <div>
                  <strong className="text-white">Mouse / Aim:</strong> Turret Angle
                </div>
                <div>
                  <strong className="text-white">Space / Left Click:</strong> Fire Pulse
                </div>
                <div>
                  <strong className="text-white">Shift / Boost:</strong> Overdrive
                </div>
              </div>
            </div>
          </div>

          {/* Right: Realtime Room Chat */}
          <div className="flex flex-col h-[460px] rounded-2xl bg-slate-900/60 border border-slate-800 overflow-hidden">
            <div className="p-3 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Comms Channel
              </span>
              <span className="text-[10px] text-slate-400">Encrypted</span>
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 text-xs">
              {currentRoom.messages.map((m) => (
                <div
                  key={m.id}
                  className={`p-2 rounded-lg leading-relaxed ${
                    m.isSystem
                      ? 'bg-cyan-950/30 border border-cyan-900/40 text-cyan-300 text-[11px] italic'
                      : 'bg-slate-950/60 border border-slate-800/80 text-slate-200'
                  }`}
                >
                  {!m.isSystem && (
                    <div className="flex items-center gap-1.5 mb-1 font-bold text-[11px]">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: m.senderColor || '#00f6ff' }}
                      />
                      <span className="text-slate-300">{m.senderName}</span>
                    </div>
                  )}
                  <span>{m.text}</span>
                </div>
              ))}
            </div>

            {/* Quick Emote / Reaction buttons */}
            <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-1 overflow-x-auto">
              {['⚔️ Ready!', '🔥 Let’s go!', '⚡ GG', '🛡️ Defend', '🚀 Max Speed'].map((quick) => (
                <button
                  key={quick}
                  onClick={() => {
                    playClick();
                    onSendMessage(quick);
                  }}
                  className="px-2 py-1 rounded bg-slate-800/80 hover:bg-cyan-900/50 hover:text-cyan-300 text-[10px] font-semibold text-slate-400 whitespace-nowrap transition cursor-pointer"
                >
                  {quick}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSendChat} className="p-2.5 border-t border-slate-800 bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast to room..."
                maxLength={120}
                className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition cursor-pointer"
                title="Send Message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Lobby View (Room Browser & Quick Match)
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Hero Banner with Quick Actions */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1424] via-[#090d16] to-[#1a0f2e] p-6 sm:p-10 mb-8 shadow-[0_0_50px_rgba(0,246,255,0.12)]">
        {/* Glow orb */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Server-Authoritative Realtime Multiplayer Arena</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            DOMINATE THE <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-500 bg-clip-text text-transparent">NEON GRID</span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Pilot agility cyber-ships in fast-paced real-time combat. Out-maneuver rival players, harvest energy cores, and climb the global leaderboards.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                playClick();
                if (!player) {
                  onOpenAuth();
                } else {
                  onQuickMatch();
                }
              }}
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(0,246,255,0.45)] transition transform active:scale-95 cursor-pointer"
            >
              <Swords className="w-4 h-4 text-slate-950" />
              <span>Instant Quick Match</span>
            </button>

            <button
              onClick={() => {
                playClick();
                if (!player) {
                  onOpenAuth();
                } else {
                  setShowCreateModal(true);
                }
              }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400/60 text-slate-200 text-sm font-bold tracking-wider transition cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>Create Custom Room</span>
            </button>
          </div>
        </div>
      </div>

      {/* Join by Code Bar */}
      <div className="mb-8 p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Join Battle via Room Code</h3>
            <p className="text-xs text-slate-400">Have a match code from a friend or stream?</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
            placeholder="CODE (e.g. NEON-1)"
            maxLength={10}
            className="w-full sm:w-44 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono uppercase text-sm tracking-wider focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={() => {
              if (!joinCodeInput.trim()) return;
              playClick();
              if (!player) {
                onOpenAuth();
              } else {
                onJoinRoom(undefined, joinCodeInput.trim());
              }
            }}
            disabled={!joinCodeInput.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            <span>Enter</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Public Rooms Browser */}
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-400" />
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-200">
              Active Battle Arenas
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              {rooms.length} Active
            </span>
          </div>

          <button
            onClick={() => {
              playClick();
              if (!player) {
                onOpenAuth();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Host New Room</span>
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400">
            <Users className="w-8 h-8 mx-auto mb-2 text-slate-500" />
            <p className="text-sm font-bold text-slate-300">No open arenas right now.</p>
            <p className="text-xs text-slate-500 mt-1">
              Be the first to host or click Quick Match!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const isFull = room.playerCount >= room.maxPlayers;
              return (
                <div
                  key={room.id}
                  className="p-5 rounded-2xl border border-slate-800 hover:border-cyan-500/40 bg-slate-900/60 hover:bg-slate-900/90 transition-all shadow-md group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300">
                        {room.mode === 'deathmatch' ? 'Deathmatch' : 'Energy Rush'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          room.status === 'in_game'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {room.status === 'in_game' ? 'In Battle' : 'Lobby'}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition truncate">
                      {room.name}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span>Host: <strong className="text-slate-300">{room.hostName}</strong></span>
                      <span>·</span>
                      <span className="font-mono text-cyan-400 font-semibold">{room.code}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>
                        {room.playerCount} / {room.maxPlayers} Pilots
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        playClick();
                        if (!player) {
                          onOpenAuth();
                        } else {
                          onJoinRoom(room.id);
                        }
                      }}
                      disabled={isFull}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer ${
                        isFull
                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(0,246,255,0.3)]'
                      }`}
                    >
                      {isFull ? 'Full' : 'Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1527] p-6 shadow-[0_0_40px_rgba(0,246,255,0.25)] text-slate-100">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-100 mb-1">
              Host Custom Arena
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Configure battle parameters and invite other pilots.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Arena Name
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder={`${player?.username || 'Pilot'}'s Arena`}
                  maxLength={30}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Game Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setRoomMode('deathmatch');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      roomMode === 'deathmatch'
                        ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-cyan-300">Deathmatch</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">High kill score wins</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playClick();
                      setRoomMode('energy_rush');
                    }}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      roomMode === 'energy_rush'
                        ? 'border-cyan-400 bg-cyan-500/20 text-white font-bold'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <div className="font-bold text-sm text-pink-300">Energy Rush</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Orb & core harvesting</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Max Pilots: <span className="text-cyan-400 font-bold">{maxPlayers}</span>
                </label>
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>2 Duel</span>
                  <span>4 Standard</span>
                  <span>6 Chaos</span>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,246,255,0.4)] cursor-pointer"
                >
                  Create & Enter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
