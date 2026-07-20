// Phase 1 — Game Canvas implementation
import { useEffect, useRef } from 'react';
import { createInitialState, updateGameState, COLLISION_RADIUS, PELLET_RADIUS } from '../game/engine';
import type { GameState } from '../game/engine';

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

      // Draw grid (optional, for sense of movement)
      ctx.strokeStyle = '#2a2a3e';
      ctx.lineWidth = 1;
      const gridSize = 100;
      const startX = Math.floor((head.x - canvas.width / 2) / gridSize) * gridSize;
      const startY = Math.floor((head.y - canvas.height / 2) / gridSize) * gridSize;
      for (let x = startX; x < startX + canvas.width + gridSize; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 4000); ctx.stroke();
      }
      for (let y = startY; y < startY + canvas.height + gridSize; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(4000, y); ctx.stroke();
      }

      // Draw border
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, 4000, 4000);

      // Draw pellets
      ctx.fillStyle = '#fcd34d';
      state.pellets.forEach(pellet => {
        ctx.beginPath();
        ctx.arc(pellet.x, pellet.y, PELLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw player snake
      if (state.player.alive) {
        ctx.fillStyle = state.player.color;
        ctx.strokeStyle = '#1e3a8a';
        ctx.lineWidth = 2;
        
        // Draw segments in reverse so head is on top
        for (let i = state.player.segments.length - 1; i >= 0; i--) {
          const seg = state.player.segments[i];
          ctx.beginPath();
          ctx.arc(seg.x, seg.y, COLLISION_RADIUS, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        // Draw dead text
        ctx.fillStyle = '#ef4444';
        ctx.font = '48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DIED! Press any key to reset', head.x, head.y);
      }

      ctx.restore();

      // UI overlay
      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Score: ${state.player.score}`, 20, 40);
      ctx.fillText(`Length: ${state.player.segments.length}`, 20, 70);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl border border-game-border bg-black">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="block"
      />
    </div>
  );
}
