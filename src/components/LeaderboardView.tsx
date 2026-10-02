import React, { useEffect, useState } from 'react';
import { LeaderboardEntry } from '../types/game';
import { Trophy, Medal, Award, Flame, Search, RefreshCw, Zap } from 'lucide-react';

interface LeaderboardViewProps {
  playClick: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ playClick }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [category, setCategory] = useState<'score' | 'wins' | 'kills' | 'level'>('score');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLeaderboard = async (cat: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/leaderboard?category=${cat}`);
      const data = await res.json();
      if (data.leaderboard) {
        setEntries(data.leaderboard);
      }
    } catch (e) {
      console.error('Failed to fetch leaderboard', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard(category);
  }, [category]);

  const filteredEntries = entries.filter((e) =>
    e.username.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.5)]">
          1
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-400 text-slate-950 font-black text-xs flex items-center justify-center">
          2
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 font-black text-xs flex items-center justify-center">
          3
        </span>
      );
    }
    return <span className="font-mono text-sm text-slate-400 font-bold">#{rank}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
              Global Pilot Leaderboards
            </h1>
            <p className="text-xs text-slate-400">
              Top aces across all NeonGrid arena combat divisions.
            </p>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
          {[
            { id: 'score', label: 'Score' },
            { id: 'wins', label: 'Victories' },
            { id: 'kills', label: 'Kills' },
            { id: 'level', label: 'Pilot Level' },
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

      {/* Filter / Search Bar */}
      <div className="my-5 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pilot by callsign..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition"
          />
        </div>

        <button
          onClick={() => {
            playClick();
            fetchLeaderboard(category);
          }}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
          title="Refresh Standings"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Leaderboard Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 font-semibold text-center w-16">Rank</th>
              <th className="py-3 px-4 font-semibold">Pilot</th>
              <th className="py-3 px-4 font-semibold">Tier Rank</th>
              <th className="py-3 px-4 font-semibold text-center">Wins</th>
              <th className="py-3 px-4 font-semibold text-center">Win %</th>
              <th className="py-3 px-4 font-semibold text-center">Kills</th>
              <th className="py-3 px-4 font-semibold text-right">Combat Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredEntries.map((e) => (
              <tr
                key={e.playerId}
                className="hover:bg-slate-800/40 transition group text-slate-200"
              >
                <td className="py-3 px-4 text-center font-bold">
                  <div className="flex justify-center">{getRankBadge(e.rank)}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                      style={{ backgroundColor: e.shipColor || '#00f6ff', color: '#090d16' }}
                    >
                      {e.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white group-hover:text-cyan-300 transition">
                        {e.username}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">Lv.{e.level}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-cyan-300">
                    {e.rankTitle}
                  </span>
                </td>
                <td className="py-3 px-4 text-center font-mono font-bold text-amber-400">
                  {e.gamesWon}
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-400">
                  {e.winRate}%
                </td>
                <td className="py-3 px-4 text-center font-mono text-pink-400">
                  {e.totalKills}
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-cyan-400 text-sm">
                  {e.score.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
