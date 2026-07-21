// Phase 1 — Game Canvas implementation
import { useEffect, useRef } from 'react';
import { createInitialState, applyServerState } from '../game/engine';
import type { GameState } from '../game/engine';
import { drawPotion } from '../game/drawPotion';
import { POTION_CONFIGS } from '../game/potionConfig';
import { drawSnake } from '../game/drawSnake';
import { drawBackground } from '../game/drawBackground';
import { drawHUD, drawScorePopups, drawGameOver } from '../game/drawHUD';
import { socket } from '../realtime/socketClient';
import { store } from '../store/store';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  useEffect(() => {
    stateRef.current.localPlayerId = `player-${socket.id}`;
    
    const handleTick = (serverState: any) => {
      applyServerState(stateRef.current, serverState, 0); // Note: dt handling simplified here
    };

    socket.on('tick:state', handleTick);
    return () => {
      socket.off('tick:state', handleTick);
    };
  }, []);

  // Keyboard input
  const currentDirRef = useRef({ x: 1, y: 0 });
  
  // Sync initial direction from server when we first get the player
  useEffect(() => {
    const p = stateRef.current.players[stateRef.current.localPlayerId];
    if (p) {
      currentDirRef.current = { ...p.direction };
    }
  }, [stateRef.current.localPlayerId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = stateRef.current.players[stateRef.current.localPlayerId];
      if (!p || !p.alive) return;

      const currentDir = currentDirRef.current;
      const dir = { ...currentDir };
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          if (currentDir.y !== 1) { dir.x = 0; dir.y = -1; }
          break;
        case 's':
        case 'arrowdown':
          if (currentDir.y !== -1) { dir.x = 0; dir.y = 1; }
          break;
        case 'a':
        case 'arrowleft':
          if (currentDir.x !== 1) { dir.x = -1; dir.y = 0; }
          break;
        case 'd':
        case 'arrowright':
          if (currentDir.x !== -1) { dir.x = 1; dir.y = 0; }
          break;
        case ' ': // spacebar for boost
          socket.emit('input:boost', { boosting: true });
          break;
      }
      
      if (dir.x !== currentDir.x || dir.y !== currentDir.y) {
        currentDirRef.current = dir;
        socket.emit('input:direction', dir);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        socket.emit('input:boost', { boosting: false });
      }
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

      // Update purely visual client-side state like popup fading
      applyServerState(stateRef.current, { players: Object.values(stateRef.current.players) }, dt);

      // Render
      ctx.fillStyle = '#1a1a2e'; // dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const state = stateRef.current;
      const localPlayer = state.players[state.localPlayerId];
      
      // If no local player yet, just center on 2000, 2000
      const head = localPlayer?.segments?.[0] || { x: 2000, y: 2000 };

      ctx.save();
      ctx.translate(canvas.width / 2 - head.x, canvas.height / 2 - head.y);

      // Draw grid and border
      drawBackground(ctx, canvas.width / 2 - head.x, canvas.height / 2 - head.y, canvas.width, canvas.height);

      // Draw potions
      state.pellets.forEach(pellet => {
        const cfg = POTION_CONFIGS[pellet.tier];
        if (cfg) drawPotion(ctx, pellet.x, pellet.y, cfg, time);
      });

      // Draw all players
      Object.values(state.players).forEach(player => {
        if (player.alive) {
          drawSnake(ctx, player as any, time);
        }
      });

      // Draw score popups
      drawScorePopups(ctx, state.scorePopups);

      ctx.restore();

      // UI overlay
      if (localPlayer) {
        drawHUD(ctx, localPlayer.score, localPlayer.segments.length, canvas.width);
        
        const room = store.getState().room.current;
        if (room?.status === 'round_ended') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 48px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Round ${room.currentRound} Ended`, canvas.width / 2, canvas.height / 2 - 20);
          ctx.font = '24px sans-serif';
          ctx.fillText('Next round starting...', canvas.width / 2, canvas.height / 2 + 30);
        } else if (room?.status === 'match_ended') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#fde047'; // yellow
          ctx.font = 'bold 56px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('Match Complete!', canvas.width / 2, canvas.height / 2 - 20);
          ctx.fillStyle = '#fff';
          ctx.font = '24px sans-serif';
          ctx.fillText('Returning to Lobby...', canvas.width / 2, canvas.height / 2 + 40);
        } else if (!localPlayer.alive) {
          drawGameOver(ctx, localPlayer.score, canvas.width, canvas.height);
        }
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="block"
    />
  );
}
