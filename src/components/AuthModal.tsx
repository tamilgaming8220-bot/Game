import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import { X, User, Zap, Shield, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: (player: PlayerProfile) => void;
  playClick: () => void;
}

const AVATARS = [
  { id: 'neon-falcon', name: 'Neon Falcon', icon: '🦅' },
  { id: 'cyber-blade', name: 'Cyber Blade', icon: '⚔️' },
  { id: 'plasma-ghost', name: 'Plasma Ghost', icon: '👻' },
  { id: 'vortex-core', name: 'Vortex Core', icon: '🌀' },
  { id: 'solar-fury', name: 'Solar Fury', icon: '☀️' },
];

const COLORS = [
  { hex: '#00f6ff', name: 'Cyber Cyan' },
  { hex: '#ff007a', name: 'Neon Magenta' },
  { hex: '#39ff14', name: 'Toxic Lime' },
  { hex: '#ffaa00', name: 'Solar Amber' },
  { hex: '#b026ff', name: 'Ultraviolet' },
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  playClick,
}) => {
  const [mode, setMode] = useState<'guest' | 'login' | 'register'>('guest');
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].id);
  const [selectedColor, setSelectedColor] = useState(COLORS[0].hex);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGuestPlay = async () => {
    playClick();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success && data.player) {
        localStorage.setItem('neongrid_player_id', data.player.id);
        onAuthenticated(data.player);
        onClose();
      } else {
        setError(data.error || 'Failed to start guest session');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please choose a pilot callsign');
      return;
    }
    playClick();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          avatar: selectedAvatar,
          shipColor: selectedColor,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('neongrid_player_id', data.player.id);
        onAuthenticated(data.player);
        onClose();
      } else {
        setError(data.error || 'Failed to register account');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Please enter your callsign');
      return;
    }
    playClick();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('neongrid_player_id', data.player.id);
        onAuthenticated(data.player);
        onClose();
      } else {
        setError(data.error || 'Callsign not found. Try registering!');
      }
    } catch (e) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/30 bg-[#0d1527] p-6 shadow-[0_0_40px_rgba(0,246,255,0.25)] text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold uppercase tracking-wider text-slate-100">
                Pilot Authentication
              </h2>
              <p className="text-xs text-slate-400">Initialize your neural link to the arena</p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 my-4 text-xs font-semibold">
          <button
            onClick={() => {
              playClick();
              setMode('guest');
              setError(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'guest'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,246,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Quick Guest
          </button>
          <button
            onClick={() => {
              playClick();
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'register'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,246,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            New Pilot
          </button>
          <button
            onClick={() => {
              playClick();
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-lg transition cursor-pointer ${
              mode === 'login'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,246,255,0.4)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            {error}
          </div>
        )}

        {/* Guest Mode */}
        {mode === 'guest' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
              <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2 animate-pulse" />
              <h3 className="text-sm font-bold text-slate-200">Instant Battle Deployment</h3>
              <p className="text-xs text-slate-400 mt-1">
                Jump right into the multiplayer arena with an auto-generated callsign and combat ship. Your progress and rewards are automatically saved on this device.
              </p>
            </div>

            <button
              onClick={handleGuestPlay}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,246,255,0.4)] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Connecting Neural Link...' : 'Launch Quick Play'}
            </button>
          </div>
        )}

        {/* Register Mode */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pilot Callsign (Username)
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. NeonViper, PulseRider"
                maxLength={18}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                required
              />
            </div>

            {/* Avatar Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Avatar Insignia
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATARS.map((av) => (
                  <button
                    key={av.id}
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedAvatar(av.id);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                      selectedAvatar === av.id
                        ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_12px_rgba(0,246,255,0.3)]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xl">{av.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ship Neon Color */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Ship Neon Signature
              </label>
              <div className="flex items-center gap-2.5">
                {COLORS.map((col) => (
                  <button
                    key={col.hex}
                    type="button"
                    onClick={() => {
                      playClick();
                      setSelectedColor(col.hex);
                    }}
                    className={`w-8 h-8 rounded-full transition-transform cursor-pointer flex items-center justify-center ${
                      selectedColor === col.hex
                        ? 'scale-125 ring-2 ring-white shadow-[0_0_12px]'
                        : 'hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: col.hex,
                      boxShadow: selectedColor === col.hex ? `0 0 14px ${col.hex}` : 'none',
                    }}
                    title={col.name}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,246,255,0.4)] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Registering Pilot...' : 'Create Pilot Profile'}
            </button>
          </form>
        )}

        {/* Login Mode */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter Existing Callsign
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Valkyrie_X, CyberGhost"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400">
              Tip: You can login as existing demo pilots like <code className="text-cyan-300">Valkyrie_X</code> or <code className="text-pink-300">CyberGhost</code> to test high-rank profiles.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(0,246,255,0.4)] transition cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Grid'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
