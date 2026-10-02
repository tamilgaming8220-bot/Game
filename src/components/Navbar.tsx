import React from 'react';
import { PlayerProfile } from '../types/game';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Gamepad2,
  Trophy,
  History,
  Gift,
  User,
  Volume2,
  VolumeX,
  Coins,
  Radio,
  Zap,
} from 'lucide-react';

interface NavbarProps {
  player: PlayerProfile | null;
  activeTab: 'lobby' | 'leaderboard' | 'matches' | 'rewards' | 'profile';
  setActiveTab: (tab: 'lobby' | 'leaderboard' | 'matches' | 'rewards' | 'profile') => void;
  onOpenAuth: () => void;
  unclaimedRewardsCount: number;
  ping: number;
  connected: boolean;
  sound: {
    muted: boolean;
    setMuted: (m: boolean) => void;
    playClick: () => void;
  };
}

export const Navbar: React.FC<NavbarProps> = ({
  player,
  activeTab,
  setActiveTab,
  onOpenAuth,
  unclaimedRewardsCount,
  ping,
  connected,
  sound,
}) => {
  interface TabItem {
    id: 'lobby' | 'leaderboard' | 'matches' | 'rewards' | 'profile';
    label: string;
    icon: React.ElementType;
    badge?: number;
  }

  const tabs: TabItem[] = [
    { id: 'lobby', label: 'Arena Lobby', icon: Gamepad2 },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'matches', label: 'Matches', icon: History },
    { id: 'rewards', label: 'Rewards', icon: Gift, badge: unclaimedRewardsCount },
    { id: 'profile', label: 'Pilot Profile', icon: User },
  ];

  const xpPercent = player
    ? Math.min(100, Math.round((player.xp / Math.max(1, player.nextLevelXp)) * 100))
    : 0;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-950/80 bg-[#090d16]/90 backdrop-blur-md px-3 sm:px-6 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand / Logo */}
        <div
          onClick={() => {
            sound.playClick();
            setActiveTab('lobby');
          }}
          className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
        >
          <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-600 p-[1.5px] shadow-[0_0_15px_rgba(0,246,255,0.4)] group-hover:shadow-[0_0_22px_rgba(0,246,255,0.7)] transition-all">
            <div className="w-full h-full bg-[#090d16] rounded-[7px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-cyan-400 fill-cyan-400/20 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-cyan-400 via-sky-300 to-pink-500 bg-clip-text text-transparent">
                NEONGRID
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-widest bg-cyan-950 text-cyan-400 border border-cyan-800/60 uppercase">
                PWA
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connected ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'
                }`}
              />
              <span>{connected ? `Online · ${ping}ms` : 'Connecting...'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Desktop & Tablet) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id);
                }}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(0,246,255,0.2)]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {!!tab.badge && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-pink-500 text-white animate-bounce">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side: Player status, PWA, sound, auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Sound Toggle */}
          <button
            onClick={() => {
              sound.setMuted(!sound.muted);
              if (sound.muted) sound.playClick();
            }}
            className="p-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title={sound.muted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {sound.muted ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            )}
          </button>

          {/* Player Info Card */}
          {player ? (
            <div
              onClick={() => {
                sound.playClick();
                setActiveTab('profile');
              }}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 transition cursor-pointer group"
            >
              {/* Avatar circle with glow */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shadow-[0_0_8px_rgba(0,246,255,0.3)]"
                style={{ backgroundColor: player.shipColor, color: '#090d16' }}
              >
                {player.username.charAt(0).toUpperCase()}
              </div>

              <div className="text-left">
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition truncate max-w-[90px] sm:max-w-[120px]">
                    {player.username}
                  </span>
                  <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                    Lv.{player.level}
                  </span>
                </div>
                {/* XP bar & Credits */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-12 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 transition-all duration-300"
                      style={{ width: `${xpPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-0.5 text-[10px] text-amber-400 font-semibold">
                    <Coins className="w-2.5 h-2.5" />
                    <span>{player.credits}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                onOpenAuth();
              }}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition shadow-[0_0_15px_rgba(0,246,255,0.4)] cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation bar at bottom of header */}
      <div className="md:hidden flex items-center justify-around gap-1 pt-2 mt-2 border-t border-slate-900">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveTab(tab.id);
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg text-[10px] font-medium transition cursor-pointer ${
                isActive ? 'text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                {!!tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-2 px-1 rounded-full text-[8px] font-bold bg-pink-500 text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span>{tab.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
