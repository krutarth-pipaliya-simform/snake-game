// Phase 1 — Game Canvas implementation
import { useEffect, useRef } from 'react';
import { createInitialState, updateGameState } from '../game/engine';
import type { GameState } from '../game/engine';
import { drawPotion } from '../game/drawPotion';
import { POTION_CONFIGS } from '../game/potionConfig';
import { drawSnake } from '../game/drawSnake';
import { drawBackground } from '../game/drawBackground';
import { drawHUD, drawScorePopups, drawGameOver } from '../game/drawHUD';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState>(createInitialState());
  const lastTimeRef = useRef<number>(0);
  const requestRef = useRef<number>(0);

  // Keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const p = stateRef.current.player;
      if (!p.alive) {
        // Reset on any key if dead
        stateRef.current = createInitialState();
        return;
      }

      const dir = { ...p.direction };
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          if (dir.y !== 1) { dir.x = 0; dir.y = -1; }
          break;
        case 's':
        case 'arrowdown':
          if (dir.y !== -1) { dir.x = 0; dir.y = 1; }
          break;
        case 'a':
        case 'arrowleft':
          if (dir.x !== 1) { dir.x = -1; dir.y = 0; }
          break;
        case 'd':
        case 'arrowright':
          if (dir.x !== -1) { dir.x = 1; dir.y = 0; }
          break;
      }
      p.direction = dir;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      // Update state
      updateGameState(stateRef.current, dt);

      // Render
      // 1. Clear canvas
      ctx.fillStyle = '#1a1a2e'; // dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const state = stateRef.current;
      const head = state.player.segments[0];

      // Camera: center on player head
      ctx.save();
      ctx.translate(canvas.width / 2 - head.x, canvas.height / 2 - head.y);

      // Draw grid and border
      drawBackground(ctx, canvas.width / 2 - head.x, canvas.height / 2 - head.y, canvas.width, canvas.height);

      // Draw potions — Phase 1 potion visual
      state.pellets.forEach(pellet => {
        const cfg = POTION_CONFIGS[pellet.tier];
        drawPotion(ctx, pellet.x, pellet.y, cfg, time);
      });

      // Draw player snake
      if (state.player.alive) {
        drawSnake(ctx, state.player, time);
      }

      // Draw score popups
      drawScorePopups(ctx, state.scorePopups);

      ctx.restore();

      // UI overlay
      drawHUD(ctx, state.player.score, state.player.segments.length, canvas.width);
      if (!state.player.alive) {
        drawGameOver(ctx, state.player.score, canvas.width, canvas.height);
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
