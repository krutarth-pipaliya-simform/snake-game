// Phase 1 — Snake body rendering
// Phase 9 — Confusion ghost outlines
import type { Player } from '../types/player';

const HEAD_R = 15;      // matches COLLISION_RADIUS in engine

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number,
  isScrambled: boolean = false,
  isTeammate: boolean = false,
  isSelf: boolean = false
) {
  const segs = player.segments;
  const total = segs.length;
  if (total === 0) return;

  let displayColor = player.color;
  let strokeColor = '#1e3a8a';

  if (isScrambled) {
    displayColor = `hsl(${(time / 5) % 360}, 100%, 50%)`;
    strokeColor = '#ff0000';
  } else {
    if (isSelf) {
      displayColor = '#3b82f6'; // Bright blue
      strokeColor = '#1e3a8a';  // Darker blue
    } else if (isTeammate) {
      displayColor = '#22c55e'; // Bright green
      strokeColor = '#14532d';  // Darker green
    } else {
      displayColor = '#ef4444'; // Bright red
      strokeColor = '#7f1d1d';  // Darker red
    }
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
      ctx.fillStyle = `hsl(${(time / 5 + 120) % 360}, 100%, 60%)`;
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
  ctx.shadowBlur = isScrambled ? 12 : 6;
  ctx.shadowColor = displayColor;

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

  // Draw Head
  _drawHead(ctx, player, displayColor, isScrambled, time);

  ctx.restore();

  // Name label — hidden during scramble per spec
  if (!isScrambled && player.name) {
    ctx.save();
    // Team-colored name badge
    const badgeColor = isSelf ? '#3b82f6' : (isTeammate ? '#22c55e' : '#ef4444');
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1;
    ctx.fillText(player.name, segs[0].x, segs[0].y - HEAD_R - 8);
    ctx.restore();
  }
}

function _drawHead(
  ctx: CanvasRenderingContext2D,
  player: Player,
  displayColor: string,
  isScrambled: boolean,
  time: number
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
  ctx.fillStyle = isScrambled ? `hsl(${(time / 3) % 360}, 100%, 70%)` : '#ffffff';

  for (const ySign of [-1, 1]) {
    const ex = eyeOffsetX;
    const ey = ySign * eyeOffsetY;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.25, r * 0.12, ySign * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
