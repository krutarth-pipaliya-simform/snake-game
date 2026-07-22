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

    const handleResize = () => {
      if (containerRef.current && canvas) {
        // Use devicePixelRatio to ensure crisp rendering on high-DPI displays
        const dpr = window.devicePixelRatio || 1;
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Advance client-side visual state (popup fading)
      applyServerState(stateRef.current, { players: Object.values(stateRef.current.players) }, dt);

      // Visual Extrapolation to fix stutter between 20Hz server ticks
      const SPEED = 300;
      Object.values(stateRef.current.players).forEach(player => {
        if (player.alive && player.segments?.length > 0 && !player.inPipeTransit && player.direction) {
          const isActuallyBoosting = player.boosting && player.segments.length > 3;
          const speedMultiplier = isActuallyBoosting ? 1.5 : 1.0;
          const moveDist = SPEED * dt * speedMultiplier;
          
          player.segments[0].x += player.direction.x * moveDist;
          player.segments[0].y += player.direction.y * moveDist;
          
          // Pull body segments visually
          for (let i = 1; i < player.segments.length; i++) {
            const prev = player.segments[i - 1];
            const curr = player.segments[i];
            const dx = prev.x - curr.x;
            const dy = prev.y - curr.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 15) {
               curr.x += (dx / dist) * (dist - 15);
               curr.y += (dy / dist) * (dist - 15);
            }
          }
        }
      });

      // === CSS filter for confusion ===
      const state = stateRef.current;
      const localPlayer = state.players[state.localPlayerId];
      const isConfused = !!(
        state.debuff && 
        localPlayer?.team && 
        state.debuff.teams.includes(localPlayer.team) &&
        !state.debuff.clearedPlayers?.includes(localPlayer.id)
      );

      // (CSS class toggling removed to use native canvas filter for better HUD quality)

      const logicalWidth = canvas.width / (window.devicePixelRatio || 1);
      const logicalHeight = canvas.height / (window.devicePixelRatio || 1);

      // Render
      ctx.fillStyle = '#0B0E14'; // var(--color-bg-base)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      const dpr = window.devicePixelRatio || 1;
      ctx.scale(dpr, dpr);

      // Color distortion removed to fix severe canvas rendering lag

      const head = localPlayer?.segments?.[0] || { x: 2000, y: 2000 };
      const cameraX = logicalWidth / 2 - head.x;
      const cameraY = logicalHeight / 2 - head.y;

      ctx.save();
      ctx.translate(cameraX, cameraY);

      // Draw grid and border
      drawBackground(ctx, cameraX, cameraY, logicalWidth, logicalHeight, isConfused, time);

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
          drawSnake(ctx, player as any, isScrambled, isTeammate, isSelf);
        }
      });

      // Score popups
      drawScorePopups(ctx, state.scorePopups);

      ctx.restore(); // remove camera translation

      // Filter reset removed since we no longer apply it

      // Fog of War overlay (drawn over world, under HUD)
      if (isConfused) {
        drawFogOfWar(ctx, logicalWidth, logicalHeight, time);
      }

      // HUD (screen-space, always on top)
      if (localPlayer) {
        const room = store.getState().room.current;
        const debuffExpiresAt = state.debuff?.expiresAt ?? null;

        drawHUD(
          ctx,
          localPlayer.score,
          localPlayer.segments.length,
          logicalWidth,
          logicalHeight,
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
            drawRespawnCountdown(ctx, secondsLeft, logicalWidth, logicalHeight);
          } else {
            // No respawn — show waiting overlay
            drawWaitingForRound(ctx, localPlayer.score, logicalWidth, logicalHeight);
          }
        }
      }
      ctx.restore(); // remove base dpr scale

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
