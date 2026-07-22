// Phase 1 — HUD rendering
// Phase 9 — Confusion banner + respawn countdown

import type { Player } from '../types/player';

const TIER_COLORS: Record<number, string> = {
  10: '#4ade80',   // small — green
  30: '#60a5fa',   // medium — blue
  75: '#c084fc',   // large — purple
};

export function drawHUD(
  ctx: CanvasRenderingContext2D,
  score: number,
  length: number,
  canvasW: number,
  canvasH: number,
  mapW: number,
  mapH: number,
  players: Record<string, Player>,
  localPlayer: Player,
  isConfused: boolean,
  debuffExpiresAt: number | null,
  pipes: { id: string; x: number; y: number; linkedPipeId?: string }[] = [],
  confusionOrb?: { x: number; y: number; active: boolean; spawnsAt?: number | null } | null
) {
  // Glassmorphism pill: top-left
  const panel = { x: 16, y: 16, w: 220, h: 80, r: 14 };

  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = '#0a0e17';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Border glow — purple when confused
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.7)' : 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = isConfused ? 2 : 1.5;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.stroke();

  // Score
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', panel.x + 18, panel.y + 26);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Inter, sans-serif';
  ctx.fillText(score.toLocaleString(), panel.x + 18, panel.y + 52);

  // Length badge
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('LENGTH', panel.x + panel.w - 18, panel.y + 26);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Inter, sans-serif';
  ctx.fillText(String(length), panel.x + panel.w - 18, panel.y + 52);

  // Controls hint
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD / ↑↓←→ move  |  SPACE boost', canvasW - 14, panel.y + 24);

  ctx.restore();

  // Confusion active banner
  if (isConfused && debuffExpiresAt) {
    drawConfusionBanner(ctx, canvasW, debuffExpiresAt);
  }

  // Minimap (bottom-left)
  drawMinimap(ctx, canvasH, mapW, mapH, players, localPlayer, isConfused, pipes, confusionOrb);

  // Confusion Orb Countdown
  drawOrbCountdown(ctx, canvasH, confusionOrb);
}

function drawConfusionBanner(
  ctx: CanvasRenderingContext2D,
  canvasW: number,
  expiresAt: number
) {
  const secondsLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  const t = Date.now() / 1000;
  const pulse = (Math.sin(t * 3) + 1) / 2;

  ctx.save();

  const bw = 320, bh = 36, bx = (canvasW - bw) / 2, by = 108;

  // Banner background
  ctx.globalAlpha = 0.85 + pulse * 0.1;
  ctx.fillStyle = `rgb(${Math.round(80 + pulse * 40)}, 0, ${Math.round(100 + pulse * 40)})`;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Glowing border
  ctx.shadowBlur = 12 + pulse * 12;
  ctx.shadowColor = '#EC4899';
  ctx.strokeStyle = `rgba(236, 72, 153, ${0.7 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 14px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`⚠ CONFUSION ACTIVE — ${secondsLeft}s`, canvasW / 2, by + 23);

  ctx.restore();
}

export function drawRespawnCountdown(
  ctx: CanvasRenderingContext2D,
  secondsLeft: number,
  canvasW: number,
  canvasH: number
) {
  const t = Date.now() / 1000;
  const pulse = (Math.sin(t * 4) + 1) / 2;

  // Dimmed overlay
  ctx.fillStyle = 'rgba(10, 14, 23, 0.75)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Card
  const cw = 340, ch = 200, cx = (canvasW - cw) / 2, cy = (canvasH - ch) / 2;
  ctx.fillStyle = '#111827';
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.fill();

  ctx.shadowBlur = 20 + pulse * 20;
  ctx.shadowColor = '#8B5CF6';
  ctx.strokeStyle = `rgba(139, 92, 246, ${0.6 + pulse * 0.4})`;
  ctx.lineWidth = 2;
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // "YOU DIED" text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText('YOU DIED', canvasW / 2, cy + 54);

  // Big countdown number
  ctx.fillStyle = `hsl(${260 + pulse * 30}, 80%, ${60 + pulse * 15}%)`;
  ctx.font = `bold ${52 + pulse * 6}px Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(secondsLeft)), canvasW / 2, cy + 126);

  // Label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('Respawning...', canvasW / 2, cy + 160);
}

export function drawWaitingForRound(
  ctx: CanvasRenderingContext2D,
  score: number,
  canvasW: number,
  canvasH: number
) {
  ctx.fillStyle = 'rgba(10, 14, 23, 0.82)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  const cw = 340, ch = 190, cx = (canvasW - cw) / 2, cy = (canvasH - ch) / 2;
  ctx.fillStyle = '#111827';
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.fill();

  ctx.strokeStyle = '#6b7280';
  ctx.lineWidth = 2;
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText('YOU DIED', canvasW / 2, cy + 58);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(`Score: ${score.toLocaleString()}`, canvasW / 2, cy + 96);

  ctx.fillStyle = '#475569';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('Waiting for round to end...', canvasW / 2, cy + 142);
}

export function drawScorePopups(
  ctx: CanvasRenderingContext2D,
  popups: { x: number; y: number; value: number; age: number }[],
) {
  popups.forEach(popup => {
    const progress = popup.age / 800;
    const alpha = Math.max(0, 1 - progress);
    const rise = 30 * progress;
    const color = TIER_COLORS[popup.value] ?? 'white';
    ctx.fillStyle = `rgba(${hexToRgb(color)}, ${alpha})`;
    ctx.strokeStyle = `rgba(0,0,0,${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.font = `bold 18px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText(`+${popup.value}`, popup.x, popup.y - 24 - rise);
    ctx.fillText(`+${popup.value}`, popup.x, popup.y - 24 - rise);
  });
}

// Helper — draw a rounded rect path without filling
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hexToRgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 0xff},${(n >> 8) & 0xff},${n & 0xff}`;
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  canvasH: number,
  mapW: number,
  mapH: number,
  players: Record<string, Player>,
  localPlayer: Player,
  isConfused: boolean,
  pipes: { id: string; x: number; y: number; linkedPipeId?: string }[] = [],
  confusionOrb?: { x: number; y: number; active: boolean; spawnsAt?: number | null } | null
) {
  const mapSize = 140;
  const padding = 16;
  const x = padding;
  const y = canvasH - padding - mapSize;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0a0e17';
  roundRect(ctx, x, y, mapSize, mapSize, 8);
  ctx.fill();

  // Border — purple when confused
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.6)' : 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 1;
  ctx.stroke();

  // Label
  ctx.fillStyle = isConfused ? 'rgba(139, 92, 246, 0.7)' : 'rgba(148, 163, 184, 0.5)';
  ctx.font = '9px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(isConfused ? '⚠ SCRAMBLED' : 'MINIMAP', x + 6, y + 12);

  // Draw dots for players
  const scaleX = mapSize / mapW;
  const scaleY = mapSize / mapH;

  // Draw pipe connections on minimap
  if (!isConfused && pipes.length > 0) {
    const drawnLinks = new Set<string>();
    
    for (const pipe of pipes) {
      if (!pipe.linkedPipeId) continue;
      const linked = pipes.find(p => p.id === pipe.linkedPipeId);
      if (!linked) continue;

      const linkKey = [pipe.id, linked.id].sort().join('_');
      if (drawnLinks.has(linkKey)) continue;
      drawnLinks.add(linkKey);

      const x1 = pipe.x * scaleX;
      const y1 = pipe.y * scaleY;
      const x2 = linked.x * scaleX;
      const y2 = linked.y * scaleY;
      
      const isVerticalFirst = (pipe.id > linked.id); 
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const radius = Math.min(4, dx / 2, dy / 2);

      ctx.beginPath();
      ctx.moveTo(x + x1, y + y1);
      if (isVerticalFirst) {
        const yMid = (y1 + y2) / 2;
        ctx.arcTo(x + x1, y + yMid, x + x2, y + yMid, radius);
        ctx.arcTo(x + x2, y + yMid, x + x2, y + y2, radius);
      } else {
        const xMid = (x1 + x2) / 2;
        ctx.arcTo(x + xMid, y + y1, x + xMid, y + y2, radius);
        ctx.arcTo(x + xMid, y + y2, x + x2, y + y2, radius);
      }
      ctx.lineTo(x + x2, y + y2);
      
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.stroke();
    }
    
    // Draw pipe dots
    for (const pipe of pipes) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
      ctx.beginPath();
      ctx.arc(x + pipe.x * scaleX, y + pipe.y * scaleY, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  Object.values(players).forEach(p => {
    if (!p.alive || p.segments.length === 0) return;
    const head = p.segments[0];

    let dotColor = '#6b7280'; // neutral gray when confused
    let dotSize = 3;
    if (!isConfused) {
      if (p.id === localPlayer.id) {
        dotColor = '#3b82f6';
        dotSize = 4.5; // self is bigger
      } else if (p.team === localPlayer.team) {
        dotColor = '#22c55e';
      } else {
        dotColor = '#ef4444';
      }
    }

    // Self: draw a pulsing dot
    if (p.id === localPlayer.id && !isConfused) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
      ctx.beginPath();
      ctx.arc(x + head.x * scaleX, y + head.y * scaleY, dotSize + 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(x + head.x * scaleX, y + head.y * scaleY, dotSize, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Confusion Orb on minimap
  if (confusionOrb && confusionOrb.active && !isConfused) {
    const orbX = x + confusionOrb.x * scaleX;
    const orbY = y + confusionOrb.y * scaleY;
    const t = Date.now() / 1000;
    const pulse = (Math.sin(t * 5) + 1) / 2;

    ctx.fillStyle = `rgba(236, 72, 153, ${0.4 + pulse * 0.4})`;
    ctx.beginPath();
    ctx.arc(orbX, orbY, 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(orbX, orbY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawOrbCountdown(
  ctx: CanvasRenderingContext2D,
  canvasH: number,
  confusionOrb?: { x: number; y: number; active: boolean; spawnsAt?: number | null } | null
) {
  if (!confusionOrb) return;

  const mapSize = 140;
  const padding = 16;
  const x = padding;
  const y = canvasH - padding - mapSize - 32;

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0a0e17';
  roundRect(ctx, x, y, mapSize, 24, 6);
  ctx.fill();

  ctx.strokeStyle = 'rgba(236, 72, 153, 0.4)';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, mapSize, 24, 6);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px Inter, sans-serif';

  if (confusionOrb.active) {
    ctx.fillStyle = '#ec4899';
    ctx.fillText('Orb Active!', x + mapSize / 2, y + 16);
  } else if (confusionOrb.spawnsAt) {
    const secondsLeft = Math.max(0, Math.ceil((confusionOrb.spawnsAt - Date.now()) / 1000));
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Next Orb: ${secondsLeft}s`, x + mapSize / 2, y + 16);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Orb Spawning...', x + mapSize / 2, y + 16);
  }

  ctx.restore();
}
