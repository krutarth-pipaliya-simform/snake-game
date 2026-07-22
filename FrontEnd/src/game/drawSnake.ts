// Phase 1 — Snake body rendering
// Phase 9 — Confusion ghost outlines
import type { Player } from '../types/player';

const HEAD_R = 15;      // matches COLLISION_RADIUS in engine

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isScrambled: boolean = false,
  isTeammate: boolean = false,
  isSelf: boolean = false
) {
  const segs = player.segments;
  const total = segs.length;
  if (total === 0) return;

  let displayColor: string;
  let strokeColor: string;

  if (isSelf) {
    displayColor = '#5ea3ff'; // My snake — pre-brightened blue (replaces ctx.filter)
    strokeColor = '#2b5fb3';
  } else if (isScrambled) {
    displayColor = '#ef4444'; // All others red in confusion
    strokeColor = '#7f1d1d';
  } else if (isTeammate) {
    displayColor = '#22c55e'; // Team green
    strokeColor = '#14532d';
  } else {
    displayColor = '#ef4444'; // Opponents red
    strokeColor = '#7f1d1d';
  }

  // === PHASE 9: Ghost outline rendering for scrambled enemies ===
  if (isScrambled) {
    const ghostOffsets = [
      { dx: 22, dy: -8 },
      { dx: -18, dy: 12 },
    ];
    for (const off of ghostOffsets) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.translate(off.dx, off.dy);
      ctx.fillStyle = '#ef4444';
      for (let i = total - 1; i >= 0; i--) {
        const seg = segs[i];
        ctx.beginPath();
        ctx.arc(seg.x, seg.y, HEAD_R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Add glow to the entire snake
  ctx.save();

  // brightness/saturate filter removed — pre-computed bright color used instead

  ctx.fillStyle = displayColor;
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 3;

  // Ghost Jitter for scrambled snakes
  if (isScrambled) {
    const jitterX = (Math.random() - 0.5) * 14;
    const jitterY = (Math.random() - 0.5) * 14;
    ctx.translate(jitterX, jitterY);
    ctx.globalAlpha = 0.7;
  }

  // Draw body segments (tail up to neck)
  for (let i = total - 1; i >= 1; i--) {
    const seg = segs[i];
    // Slight taper toward the tail
    const r = HEAD_R * (0.65 + 0.35 * ((total - i) / total));
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Add glow to the head
  ctx.shadowBlur = isScrambled ? 12 : 16;
  ctx.shadowColor = displayColor;

  // Draw Head
  _drawHead(ctx, player, displayColor, isScrambled);

  ctx.restore();

  // Name label — hidden during scramble per spec
  if (!isScrambled && player.name) {
    ctx.save();
    const badgeColor = displayColor;
    
    ctx.font = '11px Inter, sans-serif';
    const textW = ctx.measureText(player.name).width;
    const textH = 16;
    const px = segs[0].x;
    const py = segs[0].y - HEAD_R - 14;

    // Background pill for readability
    ctx.fillStyle = 'rgba(19, 24, 36, 0.7)'; // --bg-panel (131824) at 70%
    ctx.beginPath();
    ctx.roundRect(px - textW/2 - 8, py - textH/2 - 4, textW + 16, textH + 4, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#F2F4F8'; // --text-primary
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.name, px, py);
    ctx.restore();
  }
}

function _drawHead(
  ctx: CanvasRenderingContext2D,
  player: Player,
  displayColor: string,
  isScrambled: boolean
) {
  const head = player.segments[0];
  const r = HEAD_R;
  const angle = Math.atan2(player.direction.y, player.direction.x);

  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(angle);

  // Draw head base
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = displayColor;
  ctx.fill();
  ctx.stroke();

  // Eyes — spin randomly when scrambled
  const eyeOffsetX = r * 0.35;
  const eyeOffsetY = r * 0.45;

  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = isScrambled ? '#ef4444' : '#ffffff';

  for (const ySign of [-1, 1]) {
    const ex = eyeOffsetX;
    const ey = ySign * eyeOffsetY;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.25, r * 0.12, ySign * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
