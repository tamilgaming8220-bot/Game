import React, { useEffect, useState } from 'react';
import { MatchRecord } from '../types/game';
import { History, Swords, Trophy, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface MatchesViewProps {
  playClick: () => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({ playClick }) => {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/matches?limit=20');
      const data = await res.json();
      if (data.matches) {
        setMatches(data.matches);
      }
    } catch (e) {
      console.error('Failed to fetch matches', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    playClick();
    setExpandedMatchId(expandedMatchId === id ? null : id);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 pb-6 mb-6 border-b border-slate-800">
        <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_20px_rgba(0,246,255,0.2)]">
          <History className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-white">
            Arena Match Log
          </h1>
          <p className="text-xs text-slate-400">
            Realtime records of all completed combat engagements in the database.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          Loading battle archives...
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-slate-800 bg-slate-900/40 text-slate-400 text-xs">
          No matches recorded yet. Jump into an arena to start history!
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => {
            const isExpanded = expandedMatchId === m.id;
            return (
              <div
                key={m.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition overflow-hidden"
              >
                <div
                  onClick={() => toggleExpand(m.id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/30 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{m.arena}</span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-cyan-300">
                          {m.mode}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{m.roomCode}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Trophy className="w-3 h-3" /> Winner: {m.winnerName}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {m.duration}s
                        </span>
                        <span>·</span>
                        <span>{new Date(m.finishedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between sm:justify-end">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{m.players.length} Pilots</span>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-white">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-950/70 border-t border-slate-800/80 animate-in fade-in duration-200">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Pilots Standings
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {m.players.map((p, idx) => (
                        <div
                          key={p.id}
                          className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                            p.isWinner
                              ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                              : 'bg-slate-900/60 border-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-500">#{idx + 1}</span>
                            <div
                              className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px]"
                              style={{ backgroundColor: p.shipColor, color: '#090d16' }}
                            >
                              {p.username.charAt(0)}
                            </div>
                            <span className="font-semibold truncate max-w-[100px]">{p.username}</span>
                          </div>

                          <div className="flex items-center gap-3 text-right">
                            <span className="font-mono text-slate-400 text-[11px]">
                              {p.kills}K / {p.deaths}D
                            </span>
                            <span className="font-mono font-black text-cyan-300">
                              {p.score} pts
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
