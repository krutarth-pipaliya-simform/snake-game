// Phase 1 — Snake body rendering
import type { Player } from '../types/player';

const HEAD_R = 15;      // matches COLLISION_RADIUS in engine

export function drawSnake(
  ctx: CanvasRenderingContext2D,
  player: Player,
  time: number,
  isScrambled: boolean = false
) {
  const segs = player.segments;
  const total = segs.length;
  if (total === 0) return;

  const displayColor = isScrambled ? `hsl(${(time / 5) % 360}, 100%, 50%)` : player.color;

  // Add subtle glow to the entire snake
  ctx.save();
  ctx.shadowBlur = 4;
  ctx.shadowColor = displayColor;

  ctx.fillStyle = displayColor;
  ctx.strokeStyle = isScrambled ? '#ff0000' : '#1e3a8a';
  ctx.lineWidth = 2;

  // Ghost Jitter
  let jitterX = 0;
  let jitterY = 0;
  if (isScrambled) {
    jitterX = (Math.random() - 0.5) * 20;
    jitterY = (Math.random() - 0.5) * 20;
    ctx.translate(jitterX, jitterY);
    ctx.globalAlpha = 0.5; // glitchy transparency
  }

  // Draw body segments (tail up to neck)
  for (let i = total - 1; i >= 1; i--) {
    const seg = segs[i];
    ctx.beginPath();
    ctx.arc(seg.x, seg.y, HEAD_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw Head
  _drawHead(ctx, player, displayColor);

  ctx.restore();
}

function _drawHead(ctx: CanvasRenderingContext2D, player: Player, displayColor: string) {
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
  
  // Inherit stroke from parent context (set in drawSnake)
  ctx.stroke();

  // Draw sleek, minimalist glowing eyes
  const eyeOffsetX = r * 0.35;
  const eyeOffsetY = r * 0.45;
  
  // Bright white eyes with a strong glow
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#ffffff';
  ctx.fillStyle = '#ffffff';

  for (const ySign of [-1, 1]) {
    const ex = eyeOffsetX;
    const ey = ySign * eyeOffsetY;
    
    ctx.beginPath();
    // Sleek slanted oval eyes
    // x, y, radiusX, radiusY, rotation, startAngle, endAngle
    ctx.ellipse(ex, ey, r * 0.25, r * 0.12, ySign * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
