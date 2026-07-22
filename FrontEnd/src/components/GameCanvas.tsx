// Phase 1 — Game Canvas implementation
// Phase 9 — Confusion CSS filter toggling
import { useEffect, useRef } from 'react';
import { createInitialState, applyServerState } from '../game/engine';
import type { GameState } from '../game/engine';
import { drawPotion } from '../game/drawPotion';
import { POTION_CONFIGS } from '../game/potionConfig';
import { drawSnake } from '../game/drawSnake';
import { drawBackground, drawPipes, drawConfusionOrb, drawFogOfWar } from '../game/drawBackground';
import { drawHUD, drawScorePopups, drawRespawnCountdown, drawWaitingForRound } from '../game/drawHUD';
import { socket } from '../realtime/socketClient';
import { store } from '../store/store';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);
  const currentDirRef = useRef({ x: 1, y: 0 });
  const needsDirSyncRef = useRef(true);
  const wasConfusedRef = useRef(false);

  const roomStatus = useSelector((state: RootState) => state.room.current?.status);

  // Reset direction sync flag when a round starts
  useEffect(() => {
    if (roomStatus === 'in_round') {
      needsDirSyncRef.current = true;
    }
  }, [roomStatus]);

  // Tick state handler — reconcile server state with client view
  useEffect(() => {
    stateRef.current.localPlayerId = `player-${socket.id}`;

    const handleTick = (serverState: any) => {
      const localId = stateRef.current.localPlayerId;
      const oldPlayer = stateRef.current.players[localId];
      const wasAlive = oldPlayer?.alive;

      applyServerState(stateRef.current, serverState, 0);

      const newPlayer = stateRef.current.players[localId];
      if (newPlayer) {
        // Trigger direction sync if player just respawned
        if (!wasAlive && newPlayer.alive) {
          needsDirSyncRef.current = true;
        }
        if (needsDirSyncRef.current && newPlayer.direction) {
          currentDirRef.current = { ...newPlayer.direction };
          needsDirSyncRef.current = false;
        }
      }
    };

    socket.on('tick:state', handleTick);
    return () => { socket.off('tick:state', handleTick); };
  }, []);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = stateRef.current.players[stateRef.current.localPlayerId];
      if (!p || !p.alive) return;

      const currentDir = currentDirRef.current;
      const dir = { ...currentDir };
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup':
          if (currentDir.y !== 1) { dir.x = 0; dir.y = -1; } break;
        case 's': case 'arrowdown':
          if (currentDir.y !== -1) { dir.x = 0; dir.y = 1; } break;
        case 'a': case 'arrowleft':
          if (currentDir.x !== 1) { dir.x = -1; dir.y = 0; } break;
        case 'd': case 'arrowright':
          if (currentDir.x !== -1) { dir.x = 1; dir.y = 0; } break;
        case ' ':
          socket.emit('input:boost', { boosting: true }); break;
      }
      if (dir.x !== currentDir.x || dir.y !== currentDir.y) {
        currentDirRef.current = dir;
        socket.emit('input:direction', dir);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') socket.emit('input:boost', { boosting: false });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop (rendering only)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Advance client-side visual state (popup fading)
      applyServerState(stateRef.current, { players: Object.values(stateRef.current.players) }, dt);

      // === CSS filter for confusion ===
      const state = stateRef.current;
      const localPlayer = state.players[state.localPlayerId];
      const isConfused = !!(
        state.debuff && 
        localPlayer?.team && 
        state.debuff.teams.includes(localPlayer.team) &&
        !state.debuff.clearedPlayers?.includes(localPlayer.id)
      );

      if (containerRef.current) {
        if (isConfused && !wasConfusedRef.current) {
          console.log(`[Effect Activation] Confusion effect ACTIVATED for local player on team ${localPlayer?.team}`);
          containerRef.current.classList.add('confused-canvas');
          wasConfusedRef.current = true;
        } else if (!isConfused && wasConfusedRef.current) {
          console.log(`[Effect Activation] Confusion effect DEACTIVATED for local player`);
          containerRef.current.classList.remove('confused-canvas');
          wasConfusedRef.current = false;
        }
      }

      // Render
      ctx.fillStyle = '#0f1117';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const head = localPlayer?.segments?.[0] || { x: 2000, y: 2000 };
      const cameraX = canvas.width / 2 - head.x;
      const cameraY = canvas.height / 2 - head.y;

      ctx.save();
      ctx.translate(cameraX, cameraY);

      // Draw grid and border
      drawBackground(ctx, cameraX, cameraY, canvas.width, canvas.height, isConfused, time);

      // Draw pipes
      drawPipes(ctx, state.map.pipes, time);

      // Draw Confusion Orb
      if (state.map.confusionOrb) {
        drawConfusionOrb(ctx, state.map.confusionOrb, time);
      }

      // Draw potions/pellets
      state.pellets.forEach(pellet => {
        const cfg = POTION_CONFIGS[pellet.tier];
        if (cfg) drawPotion(ctx, pellet.x, pellet.y, cfg, time);
      });

      // Draw all players
      Object.values(state.players).forEach(player => {
        if (player.alive) {
          const isTeammate = player.team === localPlayer?.team;
          const isSelf = player.id === localPlayer?.id;
          const isScrambled = isConfused && !isSelf;
          drawSnake(ctx, player as any, time, isScrambled, isTeammate, isSelf);
        }
      });

      // Fog of War overlay (drawn over world, under HUD)
      if (isConfused) {
        ctx.restore();
        drawFogOfWar(ctx, canvas.width, canvas.height, time);
        ctx.save();
        ctx.translate(cameraX, cameraY);
      }

      // Score popups
      drawScorePopups(ctx, state.scorePopups);

      ctx.restore();

      // HUD (screen-space, always on top)
      if (localPlayer) {
        const room = store.getState().room.current;
        const debuffExpiresAt = state.debuff?.expiresAt ?? null;

        drawHUD(
          ctx,
          localPlayer.score,
          localPlayer.segments.length,
          canvas.width,
          canvas.height,
          state.map.width,
          state.map.height,
          state.players,
          localPlayer,
          isConfused,
          debuffExpiresAt,
          state.map.pipes,
          state.map.confusionOrb
        );

        const isRoundActive = room?.status !== 'round_ended' && room?.status !== 'match_ended';
        if (isRoundActive && !localPlayer.alive) {
          const respawnDelay = room?.settings.respawnDelaySeconds ?? null;
          if (respawnDelay !== null && localPlayer.diedAt) {
            // Compute how many seconds left on the respawn timer
            const elapsed = (Date.now() - localPlayer.diedAt) / 1000;
            const secondsLeft = Math.max(0, respawnDelay - elapsed);
            drawRespawnCountdown(ctx, secondsLeft, canvas.width, canvas.height);
          } else {
            // No respawn — show waiting overlay
            drawWaitingForRound(ctx, localPlayer.score, canvas.width, canvas.height);
          }
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div ref={containerRef} className="canvas-wrapper">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="block"
      />
    </div>
  );
}
