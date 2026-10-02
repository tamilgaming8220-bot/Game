import React, { useEffect, useState } from 'react';
import { RewardAchievement, PlayerProfile } from '../types/game';
import {
  Gift,
  Crosshair,
  Zap,
  Trophy,
  Radio,
  Target,
  Shield,
  Check,
  Coins,
  Sparkles,
} from 'lucide-react';

interface RewardsViewProps {
  player: PlayerProfile | null;
  onRewardClaimed: (updatedPlayer: PlayerProfile) => void;
  playClick: () => void;
  playVictory: () => void;
  onOpenAuth: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  player,
  onRewardClaimed,
  playClick,
  playVictory,
  onOpenAuth,
}) => {
  const [rewards, setRewards] = useState<RewardAchievement[]>([]);
  const [category, setCategory] = useState<'all' | 'combat' | 'progression' | 'mastery'>('all');
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchRewards = async () => {
    if (!player) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/rewards/${player.id}`);
      const data = await res.json();
      if (data.rewards) {
        setRewards(data.rewards);
      }
    } catch (e) {
      console.error('Failed to fetch rewards', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [player?.id]);

  const handleClaim = async (rewardId: string) => {
    if (!player) return;
    playClick();
    setClaimingId(rewardId);

    try {
      const res = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id, rewardId }),
      });
      const data = await res.json();
      if (data.success && data.player) {
        playVictory();
        onRewardClaimed(data.player);
        setRewards((prev) =>
          prev.map((r) => (r.id === rewardId ? { ...r, claimed: true } : r))
        );
      }
    } catch (e) {
      console.error('Failed to claim reward', e);
    } finally {
      setClaimingId(null);
    }
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Crosshair':
        return <Crosshair className="w-5 h-5 text-red-400" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-cyan-400" />;
      case 'Trophy':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'Radio':
        return <Radio className="w-5 h-5 text-pink-400" />;
      case 'Target':
        return <Target className="w-5 h-5 text-emerald-400" />;
      case 'Shield':
      default:
        return <Shield className="w-5 h-5 text-purple-400" />;
    }
  };

  const filtered = rewards.filter((r) => category === 'all' || r.category === category);
  const unclaimedCount = rewards.filter((r) => r.unlocked && !r.claimed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-pink-500/10 border border-pink-500/30 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
                Rewards & Quests
              </h1>
              {unclaimedCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-500 text-white animate-pulse">
                  {unclaimedCount} READY TO CLAIM
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Complete battle feats in the arena to unlock credits, XP, and prestige.
            </p>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Quests' },
            { id: 'combat', label: 'Combat' },
            { id: 'progression', label: 'Progression' },
            { id: 'mastery', label: 'Mastery' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                playClick();
                setCategory(tab.id as any);
              }}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                category === tab.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,246,255,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {!player ? (
        <div className="text-center py-16 rounded-2xl border border-slate-800 bg-slate-900/50 mt-6">
          <Gift className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">Pilot Login Required</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Sign in or play as Guest to track combat achievements and collect rewards.
          </p>
          <button
            onClick={() => {
              playClick();
              onOpenAuth();
            }}
            className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition cursor-pointer"
          >
            Authenticate Pilot
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Loading achievements...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {filtered.map((item) => {
            const progressPercent = Math.min(100, Math.round((item.progress / item.maxProgress) * 100));
            const isReadyToClaim = item.unlocked && !item.claimed;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isReadyToClaim
                    ? 'bg-gradient-to-br from-pink-950/30 to-cyan-950/30 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]'
                    : item.claimed
                    ? 'bg-slate-900/40 border-slate-800/80 opacity-80'
                    : 'bg-slate-900/70 border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                        {getIcon(item.icon)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{item.title}</span>
                          {item.claimed && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                              CLAIMED
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                      <span>Progress</span>
                      <span>
                        {item.progress} / {item.maxProgress} ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          item.unlocked
                            ? 'bg-gradient-to-r from-emerald-400 to-cyan-400'
                            : 'bg-gradient-to-r from-cyan-500 to-pink-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer with Reward payout & Claim button */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 font-bold text-amber-400">
                      <Coins className="w-3.5 h-3.5" /> +{item.rewardCredits}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-cyan-300">
                      <Zap className="w-3.5 h-3.5" /> +{item.rewardXP} XP
                    </span>
                  </div>

                  <div>
                    {item.claimed ? (
                      <div className="flex items-center gap-1 text-emerald-400 text-xs font-bold">
                        <Check className="w-4 h-4" />
                        <span>Completed</span>
                      </div>
                    ) : isReadyToClaim ? (
                      <button
                        onClick={() => handleClaim(item.id)}
                        disabled={claimingId === item.id}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-cyan-400 hover:from-pink-400 hover:to-cyan-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(236,72,153,0.4)] transition cursor-pointer animate-bounce"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{claimingId === item.id ? 'Claiming...' : 'Claim Bounty'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500">
                        In Progress
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
