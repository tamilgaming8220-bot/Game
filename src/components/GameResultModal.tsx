import React from 'react';
import { MatchRecord, ScoreRecord, PlayerProfile } from '../types/game';
import {
  Trophy,
  Award,
  Zap,
  Target,
  Crosshair,
  Coins,
  ArrowRight,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface GameResultModalProps {
  isOpen: boolean;
  match: MatchRecord | null;
  scores: ScoreRecord[];
  winner: { id: string; username: string; score: number } | null;
  player: PlayerProfile | null;
  onReturnToLobby: () => void;
  onRematch: () => void;
  playClick: () => void;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  isOpen,
  match,
  scores,
  winner,
  player,
  onReturnToLobby,
  onRematch,
  playClick,
}) => {
  if (!isOpen || !match) return null;

  const isWinner = winner?.id === player?.id;
  const myScore = scores.find((s) => s.playerId === player?.id);

  // Calculate rewards gained
  const xpEarned = myScore
    ? Math.floor(myScore.score * 0.4 + myScore.kills * 75 + (isWinner ? 300 : 100))
    : 150;
  const creditsEarned = myScore
    ? Math.floor(myScore.score * 0.15 + (isWinner ? 150 : 50))
    : 50;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-[#0e182a] to-[#070b14] p-6 sm:p-8 shadow-[0_0_60px_rgba(0,246,255,0.25)] text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Glow ambient */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-32 bg-cyan-500/10 blur-3xl pointer-events-none" />

        {/* Title / Banner */}
        <div className="text-center relative z-10">
          <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 mb-3 shadow-[0_0_20px_rgba(0,246,255,0.3)]">
            <Trophy className="w-8 h-8 text-cyan-300" />
          </div>

          <h1
            className={`text-3xl sm:text-4xl font-black uppercase tracking-tight ${
              isWinner
                ? 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent'
                : 'text-white'
            }`}
          >
            {isWinner ? 'Arena Victory' : 'Battle Concluded'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Arena: <span className="text-cyan-300 font-semibold">{match.arena}</span> · Mode:{' '}
            <span className="text-pink-300 font-semibold uppercase">{match.mode}</span> · Duration:{' '}
            <span className="text-slate-200">{match.duration}s</span>
          </p>
        </div>

        {/* MVP / Winner Highlight */}
        <div className="mt-6 p-4 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-black text-lg flex items-center justify-center shadow-[0_0_12px_rgba(251,191,36,0.4)]">
              👑
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-amber-400 block">
                Match Champion
              </span>
              <span className="text-base font-black text-white">{match.winnerName}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
              Top Score
            </span>
            <span className="font-mono text-lg font-black text-amber-300">
              {scores[0]?.score || 0} PTS
            </span>
          </div>
        </div>

        {/* Player Spoils of War / Rewards */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 rounded-xl bg-slate-950/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Rank
            </span>
            <span className="text-lg font-black text-white font-mono">
              #{myScore?.rankInMatch || '-'}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">
              Score
            </span>
            <span className="text-lg font-black text-cyan-300 font-mono">
              {myScore?.score || 0}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> XP Earned
            </span>
            <span className="text-lg font-black text-cyan-300 font-mono">
              +{xpEarned}
            </span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/50">
            <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center justify-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" /> Credits
            </span>
            <span className="text-lg font-black text-amber-400 font-mono">
              +{creditsEarned}
            </span>
          </div>
        </div>

        {/* Scores Table */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Match Combat Breakdown
          </h3>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Rank</th>
                  <th className="py-2.5 px-3 font-semibold">Pilot</th>
                  <th className="py-2.5 px-3 font-semibold text-center">K / D</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Accuracy</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {scores.map((s) => {
                  const isMe = s.playerId === player?.id;
                  return (
                    <tr
                      key={s.id}
                      className={isMe ? 'bg-cyan-950/30 font-bold text-cyan-200' : 'text-slate-300'}
                    >
                      <td className="py-2.5 px-3 font-mono font-bold">
                        {s.rankInMatch === 1 ? '🥇' : s.rankInMatch === 2 ? '🥈' : s.rankInMatch === 3 ? '🥉' : `#${s.rankInMatch}`}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="truncate max-w-[120px] inline-block align-middle">
                          {s.playerName}
                        </span>
                        {isMe && (
                          <span className="ml-1.5 px-1 py-0.2 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-semibold">
                            YOU
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {s.kills} / {s.deaths}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {s.accuracy}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                        {s.score}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={() => {
              playClick();
              onReturnToLobby();
            }}
            className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-bold uppercase tracking-wider text-slate-200 transition cursor-pointer"
          >
            Return to Lobby
          </button>

          <button
            onClick={() => {
              playClick();
              onRematch();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-pink-500 hover:from-cyan-300 hover:to-pink-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(0,246,255,0.4)] transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rematch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
