import React, { useState } from 'react';
import { PlayerProfile } from '../types/game';
import {
  User,
  Shield,
  Zap,
  Trophy,
  Flame,
  Crosshair,
  Award,
  Coins,
  Palette,
  LogOut,
  Save,
  Check,
} from 'lucide-react';

interface ProfileViewProps {
  player: PlayerProfile | null;
  onUpdatePlayer: (updated: PlayerProfile) => void;
  onLogout: () => void;
  playClick: () => void;
  onOpenAuth: () => void;
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

export const ProfileView: React.FC<ProfileViewProps> = ({
  player,
  onUpdatePlayer,
  onLogout,
  playClick,
  onOpenAuth,
}) => {
  const [selectedAvatar, setSelectedAvatar] = useState(player?.avatar || 'neon-falcon');
  const [selectedColor, setSelectedColor] = useState(player?.shipColor || '#00f6ff');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!player) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <User className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-white">No Pilot Profile Connected</h2>
        <p className="text-xs text-slate-400 mt-1 mb-4">
          Authenticate your callsign to view combat stats and equip custom ship aesthetics.
        </p>
        <button
          onClick={() => {
            playClick();
            onOpenAuth();
          }}
          className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
        >
          Initialize Pilot Link
        </button>
      </div>
    );
  }

  const handleSaveCustomization = async () => {
    playClick();
    setSaving(true);
    try {
      const res = await fetch(`/api/player/${player.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: selectedAvatar,
          shipColor: selectedColor,
        }),
      });
      const data = await res.json();
      if (data.success && data.player) {
        onUpdatePlayer(data.player);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (e) {
      console.error('Failed to update player', e);
    } finally {
      setSaving(false);
    }
  };

  const winRate =
    player.gamesPlayed > 0 ? Math.round((player.gamesWon / player.gamesPlayed) * 100) : 0;
  const xpPercent = Math.min(100, Math.round((player.xp / Math.max(1, player.nextLevelXp)) * 100));

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-r from-[#0d1627] via-[#090d16] to-[#1a0f28] p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Box with Glowing Border */}
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center font-black text-3xl shadow-[0_0_30px_rgba(0,246,255,0.3)] transition-transform duration-300"
            style={{ backgroundColor: selectedColor, color: '#090d16' }}
          >
            {player.username.charAt(0).toUpperCase()}
          </div>

          {/* Pilot Info */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide">
                {player.username}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                Lv.{player.level}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                {player.rankTitle}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Pilot Registered: {new Date(player.createdAt).toLocaleDateString()}
            </p>

            {/* XP Bar */}
            <div className="mt-4 max-w-md">
              <div className="flex justify-between text-[11px] font-semibold text-slate-400 mb-1">
                <span>XP Progress to Level {player.level + 1}</span>
                <span>
                  {player.xp} / {player.nextLevelXp} XP ({xpPercent}%)
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-300"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Credits Balance Card */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-center min-w-[140px]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Credits Stash
            </span>
            <div className="flex items-center justify-center gap-1.5 text-xl font-black text-amber-400 font-mono">
              <Coins className="w-5 h-5" />
              <span>{player.credits}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Combat Metrics Grid */}
      <div className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <Award className="w-4 h-4 text-cyan-400" />
          Combat Performance Metrics
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Battles Engaged
            </span>
            <span className="text-2xl font-black text-white font-mono mt-1 block">
              {player.gamesPlayed}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Victories Won
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono mt-1 block">
              {player.gamesWon}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Win Rate
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
              {winRate}%
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Total Eliminations
            </span>
            <span className="text-2xl font-black text-pink-400 font-mono mt-1 block">
              {player.totalKills}
            </span>
          </div>
        </div>
      </div>

      {/* Ship Customization Workbench */}
      <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              Vessel Customization Workbench
            </h2>
          </div>

          <button
            onClick={handleSaveCustomization}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer shadow-[0_0_15px_rgba(0,246,255,0.3)] disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-950" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Apply Ship Spec'}</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-6">
          {/* Avatar choice */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Combat Insignia
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  onClick={() => {
                    playClick();
                    setSelectedAvatar(av.id);
                  }}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                    selectedAvatar === av.id
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(0,246,255,0.3)] text-white'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl">{av.icon}</span>
                  <span className="text-xs font-semibold">{av.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Ship Neon Signature Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Hull Neon Signature Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {COLORS.map((col) => (
                <button
                  key={col.hex}
                  onClick={() => {
                    playClick();
                    setSelectedColor(col.hex);
                  }}
                  className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                    selectedColor === col.hex
                      ? 'border-white bg-slate-800 shadow-[0_0_15px]'
                      : 'border-slate-800 bg-slate-950/60 opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    boxShadow: selectedColor === col.hex ? `0 0 16px ${col.hex}60` : 'none',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full shadow-sm"
                    style={{ backgroundColor: col.hex }}
                  />
                  <span className="text-xs font-semibold text-slate-200">{col.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Logout button */}
      <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
        <button
          onClick={() => {
            playClick();
            onLogout();
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Switch Callsign / Disconnect</span>
        </button>
      </div>
    </div>
  );
};
