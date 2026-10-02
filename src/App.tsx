/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PlayerProfile,
  RoomSummary,
  RoomParticipant,
  ChatMessage,
  GameArenaState,
  MatchRecord,
  ScoreRecord,
} from './types/game';
import { Navbar } from './components/Navbar';
import { LobbyView } from './components/LobbyView';
import { GameArena } from './components/GameArena';
import { GameResultModal } from './components/GameResultModal';
import { LeaderboardView } from './components/LeaderboardView';
import { MatchesView } from './components/MatchesView';
import { RewardsView } from './components/RewardsView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useSound } from './hooks/useSound';

export default function App() {
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<
    'lobby' | 'leaderboard' | 'matches' | 'rewards' | 'profile'
  >('lobby');
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // WebSocket connection & latency
  const [connected, setConnected] = useState(false);
  const [ping, setPing] = useState(20);
  const wsRef = useRef<WebSocket | null>(null);

  // Lobby & Room States
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<{
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
  } | null>(null);

  // Game Engine State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameArenaState | null>(null);
  const [gameResult, setGameResult] = useState<{
    match: MatchRecord;
    scores: ScoreRecord[];
    winner: { id: string; username: string; score: number } | null;
  } | null>(null);

  // Audio Hook
  const sound = useSound();
  const [unclaimedRewardsCount, setUnclaimedRewardsCount] = useState(0);

  // Check saved player credentials from localStorage or create guest
  useEffect(() => {
    const savedId = localStorage.getItem('neongrid_player_id');
    if (savedId) {
      fetch(`/api/player/${savedId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.player) {
            setPlayer(data.player);
          } else {
            // If not found, open auth modal
            setAuthModalOpen(true);
          }
        })
        .catch(() => setAuthModalOpen(true));
    } else {
      // Prompt sign in / guest play on first visit
      setAuthModalOpen(true);
    }
  }, []);

  // Fetch unclaimed rewards badge count
  const checkUnclaimedRewards = useCallback((playerId: string) => {
    fetch(`/api/rewards/${playerId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.rewards) {
          const count = data.rewards.filter((r: any) => r.unlocked && !r.claimed).length;
          setUnclaimedRewardsCount(count);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (player) {
      checkUnclaimedRewards(player.id);
    }
  }, [player, checkUnclaimedRewards]);

  // Connect to Realtime WebSocket Server
  const connectWebSocket = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      if (player) {
        ws.send(
          JSON.stringify({
            type: 'auth:identify',
            playerId: player.id,
            username: player.username,
            avatar: player.avatar,
            shipColor: player.shipColor,
          })
        );
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleServerMessage(msg);
      } catch {
        // silent parse error guard
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // Auto-reconnect after 2 seconds
      setTimeout(() => {
        connectWebSocket();
      }, 2000);
    };

    ws.onerror = () => {
      // Gracefully handle network reconnects without throwing console.error
    };
  }, [player]);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  // Periodic Ping for latency measurement
  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'ping',
            clientTime: Date.now(),
          })
        );
      }
    }, 4000);

    return () => clearInterval(pingInterval);
  }, []);

  // Update identification if player profile changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && player) {
      wsRef.current.send(
        JSON.stringify({
          type: 'auth:identify',
          playerId: player.id,
          username: player.username,
          avatar: player.avatar,
          shipColor: player.shipColor,
        })
      );
    }
  }, [player]);

  const handleServerMessage = (msg: any) => {
    switch (msg.type) {
      case 'pong': {
        const rtt = Date.now() - msg.clientTime;
        setPing(Math.max(8, Math.round(rtt)));
        break;
      }

      case 'connected':
      case 'lobby:rooms_update': {
        if (msg.rooms) setRooms(msg.rooms);
        break;
      }

      case 'room:joined': {
        setCurrentRoom(msg.room);
        setActiveTab('lobby');
        sound.playClick();
        break;
      }

      case 'room:state_update': {
        setCurrentRoom(msg.room);
        break;
      }

      case 'room:left': {
        setCurrentRoom(null);
        setGameState(null);
        setCountdown(null);
        break;
      }

      case 'room:chat_message': {
        if (currentRoom) {
          setCurrentRoom((prev) =>
            prev ? { ...prev, messages: [...prev.messages, msg.message] } : null
          );
        }
        break;
      }

      case 'game:countdown': {
        setCountdown(msg.count);
        sound.playClick();
        break;
      }

      case 'game:started': {
        setCountdown(null);
        setGameState(msg.gameState);
        setGameResult(null);
        sound.playVictory();
        break;
      }

      case 'game:tick': {
        setGameState(msg.gameState);
        break;
      }

      case 'game:finished': {
        setGameState(null);
        setGameResult({
          match: msg.match,
          scores: msg.scores,
          winner: msg.winner,
        });

        // Play victory/defeat audio
        if (msg.winner?.id === player?.id) {
          sound.playVictory();
        } else {
          sound.playHit();
        }

        // Refresh player profile from backend to get updated XP, Level, Credits
        if (player) {
          fetch(`/api/player/${player.id}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.player) setPlayer(d.player);
            });
          checkUnclaimedRewards(player.id);
        }
        break;
      }

      case 'lobby:error': {
        alert(msg.message || 'Lobby error');
        break;
      }
    }
  };

  const sendWs = (data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  // Lobby actions
  const handleQuickMatch = () => {
    sendWs({ type: 'lobby:quick_match' });
  };

  const handleCreateRoom = (params: {
    name: string;
    code: string;
    mode: 'deathmatch' | 'energy_rush';
    maxPlayers: number;
  }) => {
    sendWs({
      type: 'lobby:create_room',
      ...params,
    });
  };

  const handleJoinRoom = (roomId?: string, roomCode?: string) => {
    sendWs({
      type: 'lobby:join_room',
      roomId,
      roomCode,
    });
  };

  const handleLeaveRoom = () => {
    sendWs({ type: 'lobby:leave_room' });
    setCurrentRoom(null);
    setGameState(null);
  };

  const handleToggleReady = () => {
    sendWs({ type: 'lobby:toggle_ready' });
  };

  const handleAddBot = () => {
    sendWs({ type: 'lobby:add_bot' });
  };

  const handleRemoveBot = () => {
    sendWs({ type: 'lobby:remove_bot' });
  };

  const handleStartGame = () => {
    sendWs({ type: 'lobby:start_game' });
  };

  const handleSendMessage = (text: string) => {
    sendWs({ type: 'lobby:chat', text });
  };

  const handleSendInput = (input: any) => {
    sendWs({ type: 'game:input', ...input });
  };

  const handleRematch = () => {
    setGameResult(null);
    if (currentRoom) {
      handleToggleReady();
    } else {
      handleQuickMatch();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('neongrid_player_id');
    setPlayer(null);
    setCurrentRoom(null);
    setGameState(null);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col font-sans">
      {/* Offline Toast Indicator */}
      <OfflineIndicator />

      {/* Navigation Bar */}
      <Navbar
        player={player}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
        unclaimedRewardsCount={unclaimedRewardsCount}
        ping={ping}
        connected={connected}
        sound={sound}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {/* If in active battle, render GameArena immediately */}
        {gameState && gameState.status === 'active' ? (
          <GameArena
            player={player}
            gameState={gameState}
            onSendInput={handleSendInput}
            onLeaveMatch={handleLeaveRoom}
            sound={sound}
          />
        ) : (
          <>
            {activeTab === 'lobby' && (
              <LobbyView
                player={player}
                rooms={rooms}
                currentRoom={currentRoom}
                countdown={countdown}
                onQuickMatch={handleQuickMatch}
                onCreateRoom={handleCreateRoom}
                onJoinRoom={handleJoinRoom}
                onLeaveRoom={handleLeaveRoom}
                onToggleReady={handleToggleReady}
                onAddBot={handleAddBot}
                onRemoveBot={handleRemoveBot}
                onStartGame={handleStartGame}
                onSendMessage={handleSendMessage}
                playClick={sound.playClick}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            {activeTab === 'leaderboard' && (
              <LeaderboardView playClick={sound.playClick} />
            )}

            {activeTab === 'matches' && (
              <MatchesView playClick={sound.playClick} />
            )}

            {activeTab === 'rewards' && (
              <RewardsView
                player={player}
                onRewardClaimed={(updated) => {
                  setPlayer(updated);
                  checkUnclaimedRewards(updated.id);
                }}
                playClick={sound.playClick}
                playVictory={sound.playVictory}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                player={player}
                onUpdatePlayer={(updated) => setPlayer(updated)}
                onLogout={handleLogout}
                playClick={sound.playClick}
                onOpenAuth={() => setAuthModalOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Post-Match Game Result Modal */}
      <GameResultModal
        isOpen={!!gameResult}
        match={gameResult?.match || null}
        scores={gameResult?.scores || []}
        winner={gameResult?.winner || null}
        player={player}
        onReturnToLobby={() => setGameResult(null)}
        onRematch={handleRematch}
        playClick={sound.playClick}
      />

      {/* Player Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onAuthenticated={(p) => {
          setPlayer(p);
          checkUnclaimedRewards(p.id);
        }}
        playClick={sound.playClick}
      />
    </div>
  );
}
