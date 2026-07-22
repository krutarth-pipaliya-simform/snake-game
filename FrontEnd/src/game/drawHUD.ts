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
  confusionOrb?: { x: number; y: number; active: boolean; spawnsAt?: number | null } | null,
  pingMs: number = -1,
) {
  // Local player team color for HUD accents
  let teamColor = '#3b82f6'; // Default blue
  if (localPlayer?.team === 'team-1') teamColor = '#3b82f6';
  else if (localPlayer?.team === 'team-2') teamColor = '#ef4444';
  else if (localPlayer?.team === 'team-3') teamColor = '#22c55e';
  else if (localPlayer?.team === 'team-4') teamColor = '#f59e0b';
  // If team color maps are passed or we want dynamic, we can just use localPlayer.color, but usually we map teams to specific colors.
  // Actually, we can just use localPlayer.color!
  teamColor = localPlayer?.color || '#3b82f6';

  // Glassmorphism pill: top-left
  const panel = { x: 16, y: 16, w: 220, h: 80, r: 14 };

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#131824'; // --bg-panel
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();

  // Border glow — purple when confused, team color otherwise
  const borderAlpha = isConfused ? 0.7 : 1;
  ctx.strokeStyle = isConfused ? `rgba(139, 92, 246, ${borderAlpha})` : teamColor;
  ctx.lineWidth = isConfused ? 2 : 2;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.stroke();

  // Score
  ctx.fillStyle = '#5C6678'; // --text-muted
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', panel.x + 18, panel.y + 26);
  ctx.fillStyle = '#F2F4F8'; // --text-primary
  ctx.font = 'bold 26px Orbitron, sans-serif';
  ctx.fillText(score.toLocaleString(), panel.x + 18, panel.y + 54);

  // Length badge
  ctx.fillStyle = '#5C6678';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('LENGTH', panel.x + panel.w - 18, panel.y + 26);
  ctx.fillStyle = '#F2F4F8';
  ctx.font = 'bold 26px Orbitron, sans-serif';
  ctx.fillText(String(length), panel.x + panel.w - 18, panel.y + 54);

  // Controls hint (top right) - inside a pill
  const hintText = 'WASD / ↑↓←→ move  |  SPACE boost';
  ctx.font = '11px Orbitron, sans-serif';
  const hintW = ctx.measureText(hintText).width + 24;
  const hintH = 28;
  const hintX = canvasW - hintW - 16;
  const hintY = 16;
  
  ctx.fillStyle = 'rgba(11, 14, 20, 0.5)';
  roundRect(ctx, hintX, hintY, hintW, hintH, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.textAlign = 'center';
  ctx.fillText(hintText, hintX + hintW / 2, hintY + 18);

  // Ping badge — sits below the controls hint
  _drawPingBadge(ctx, canvasW, hintX, hintY + hintH + 6, hintW, pingMs);

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
  ctx.font = 'bold 14px Orbitron, sans-serif';
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
  ctx.fillStyle = 'rgba(11, 14, 20, 0.75)'; // --bg-base
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Card
  const cw = 340, ch = 200, cx = (canvasW - cw) / 2, cy = (canvasH - ch) / 2;
  ctx.fillStyle = '#131824'; // --bg-panel
  roundRect(ctx, cx, cy, cw, ch, 16); // --radius-lg
  ctx.fill();

  ctx.shadowBlur = 20 + pulse * 20;
  ctx.shadowColor = '#3B82F6'; // Default glow, could be team color but we don't pass it yet
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.6 + pulse * 0.4})`; // Accent system
  ctx.lineWidth = 2;
  roundRect(ctx, cx, cy, cw, ch, 16);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // "YOU DIED" text
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.fillText('YOU DIED', canvasW / 2, cy + 54);

  // Big countdown number
  ctx.fillStyle = `hsl(${260 + pulse * 30}, 80%, ${60 + pulse * 15}%)`;
  ctx.font = `bold ${52 + pulse * 6}px Orbitron, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.ceil(secondsLeft)), canvasW / 2, cy + 126);

  // Label
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px Orbitron, sans-serif';
  ctx.fillText('Respawning...', canvasW / 2, cy + 160);
}

export function drawWaitingForRound(
  ctx: CanvasRenderingContext2D,
  score: number,
  canvasW: number,
  canvasH: number
) {
  ctx.fillStyle = 'rgba(11, 14, 20, 0.82)'; // --bg-base
  ctx.fillRect(0, 0, canvasW, canvasH);

  const cw = 340, ch = 190, cx = (canvasW - cw) / 2, cy = (canvasH - ch) / 2;
  ctx.fillStyle = '#131824'; // --bg-panel
  roundRect(ctx, cx, cy, cw, ch, 16);
  ctx.fill();

  ctx.strokeStyle = '#3D4A63'; // --border-strong
  ctx.lineWidth = 2;
  roundRect(ctx, cx, cy, cw, ch, 16);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 28px Orbitron, sans-serif';
  ctx.fillText('YOU DIED', canvasW / 2, cy + 58);

  ctx.fillStyle = '#64748b';
  ctx.font = '16px Orbitron, sans-serif';
  ctx.fillText(`Score: ${score.toLocaleString()}`, canvasW / 2, cy + 96);

  ctx.fillStyle = '#475569';
  ctx.font = '14px Orbitron, sans-serif';
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

function _drawPingBadge(
  ctx: CanvasRenderingContext2D,
  _canvasW: number,
  x: number,
  y: number,
  w: number,
  pingMs: number,
) {
  const h = 24;
  const r = 12;

  // Colour scale
  let dotColor: string;
  let label: string;
  if (pingMs < 0) {
    dotColor = '#64748b'; // grey — not yet measured
    label = 'Connecting\u2026';
  } else if (pingMs === 9999) {
    dotColor = '#ef4444'; // red — no response from server
    label = 'No response';
  } else if (pingMs <= 80) {
    dotColor = '#22c55e'; // green — excellent
    label = `${pingMs} ms`;
  } else if (pingMs <= 150) {
    dotColor = '#eab308'; // yellow — good
    label = `${pingMs} ms`;
  } else if (pingMs <= 300) {
    dotColor = '#f97316'; // orange — fair
    label = `${pingMs} ms`;
  } else {
    dotColor = '#ef4444'; // red — poor
    label = `${pingMs} ms`;
  }

  ctx.save();
  ctx.globalAlpha = 0.9;

  // Pill background
  ctx.fillStyle = 'rgba(11, 14, 20, 0.55)';
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  // Pill border (same colour as dot, subtle)
  ctx.strokeStyle = pingMs < 0 ? 'rgba(255,255,255,0.08)' : `${dotColor}55`;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();

  ctx.globalAlpha = 1;

  // Coloured status dot
  const dotR = 4;
  const dotX = x + 14;
  const dotY = y + h / 2;
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
  ctx.fill();

  // Label text
  ctx.fillStyle = pingMs < 0 ? '#64748b' : '#e2e8f0';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2 + 4, dotY + 4);

  ctx.restore();
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
  const mapSize = 130; // square side length
  const cornerRadius = 8;
  const padding = 16;
  // Top-left corner of the square minimap
  const mx = padding;
  const my = canvasH - padding - mapSize;

  ctx.save();

  // Background fill
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = '#131824';
  roundRect(ctx, mx, my, mapSize, mapSize, cornerRadius);
  ctx.fill();

  // Border
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.7)' : 'rgba(42, 51, 69, 1)';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 1;
  roundRect(ctx, mx, my, mapSize, mapSize, cornerRadius);
  ctx.stroke();

  // Clip to the rounded square — full map visible
  roundRect(ctx, mx, my, mapSize, mapSize, cornerRadius);
  ctx.clip();

  // Subtle map grid lines
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 0.5;
  const gridStep = mapSize / 4;
  ctx.beginPath();
  for (let i = 1; i < 4; i++) {
    ctx.moveTo(mx + i * gridStep, my);
    ctx.lineTo(mx + i * gridStep, my + mapSize);
    ctx.moveTo(mx, my + i * gridStep);
    ctx.lineTo(mx + mapSize, my + i * gridStep);
  }
  ctx.stroke();

  // Label
  ctx.fillStyle = isConfused ? 'rgba(139, 92, 246, 0.8)' : 'rgba(92, 102, 120, 0.9)';
  ctx.font = 'bold 8px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(isConfused ? 'SCRAMBLED' : 'MINIMAP', mx + mapSize / 2, my + 11);

  // Map border outline inside minimap
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.25)' : 'rgba(239, 68, 68, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(mx + 1, my + 1, mapSize - 2, mapSize - 2);

  // Coordinate helpers — map world coords to minimap pixel coords
  const scaleX = mapSize / mapW;
  const scaleY = mapSize / mapH;
  const drawX = (px: number) => mx + px * scaleX;
  const drawY = (py: number) => my + py * scaleY;

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

      const x1 = drawX(pipe.x);
      const y1 = drawY(pipe.y);
      const x2 = drawX(linked.x);
      const y2 = drawY(linked.y);

      const isVerticalFirst = (pipe.id > linked.id);
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      const radius = Math.min(4, dx / 2, dy / 2);

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      if (isVerticalFirst) {
        const yMid = (y1 + y2) / 2;
        ctx.arcTo(x1, yMid, x2, yMid, radius);
        ctx.arcTo(x2, yMid, x2, y2, radius);
      } else {
        const xMid = (x1 + x2) / 2;
        ctx.arcTo(xMid, y1, xMid, y2, radius);
        ctx.arcTo(xMid, y2, x2, y2, radius);
      }
      ctx.lineTo(x2, y2);

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.stroke();
    }

    // Draw pipe dots
    for (const pipe of pipes) {
      ctx.fillStyle = 'rgba(139, 92, 246, 0.8)';
      ctx.beginPath();
      ctx.arc(drawX(pipe.x), drawY(pipe.y), 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw player dots
  Object.values(players).forEach(p => {
    if (!p.alive || p.segments.length === 0) return;
    const head = p.segments[0];

    let dotColor: string;
    let dotSize = 3;

    if (p.id === localPlayer.id) {
      dotColor = '#5ea3ff'; // self bright blue
      dotSize = 4.5;
    } else if (isConfused) {
      dotColor = '#ef4444';
    } else if (p.team === localPlayer.team) {
      dotColor = '#22c55e';
    } else {
      dotColor = '#ef4444';
    }

    // Self: pulsing halo
    if (p.id === localPlayer.id && !isConfused) {
      ctx.fillStyle = 'rgba(94, 163, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(drawX(head.x), drawY(head.y), dotSize + 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(drawX(head.x), drawY(head.y), dotSize, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw Confusion Orb on minimap
  if (confusionOrb && confusionOrb.active && !isConfused) {
    const orbX = drawX(confusionOrb.x);
    const orbY = drawY(confusionOrb.y);
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

  const mapSize = 130; // matches square minimap size
  const padding = 16;
  const x = padding;
  const y = canvasH - padding - mapSize - 40; // Above minimap

  ctx.save();
  
  // Outer glow and pulsing for orb alert
  const t = Date.now() / 1000;
  const pulse = (Math.sin(t * 6) + 1) / 2;
  
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0B0E14';
  roundRect(ctx, x, y, mapSize, 28, 14);
  ctx.fill();

  if (confusionOrb.active) {
    ctx.strokeStyle = `rgba(236, 72, 153, ${0.4 + pulse * 0.6})`;
    ctx.shadowBlur = 10 + pulse * 15;
    ctx.shadowColor = '#EC4899';
    ctx.lineWidth = 1.5 + pulse;
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
  }
  
  roundRect(ctx, x, y, mapSize, 28, 14);
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.font = 'bold 11px Orbitron, sans-serif';

  if (confusionOrb.active) {
    ctx.fillStyle = '#f9a8d4'; // bright pink text
    ctx.fillText('⚠ ORB ACTIVE!', x + mapSize / 2, y + 18);
  } else if (confusionOrb.spawnsAt) {
    const secondsLeft = Math.max(0, Math.ceil((confusionOrb.spawnsAt - Date.now()) / 1000));
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`NEXT ORB: ${secondsLeft}s`, x + mapSize / 2, y + 18);
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('ORB SPAWNING...', x + mapSize / 2, y + 18);
  }

  ctx.restore();
}
