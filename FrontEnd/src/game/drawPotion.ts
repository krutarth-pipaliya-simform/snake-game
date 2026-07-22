// Phase 1 — Potion drawing helper
import type { PotionConfig } from '../types/pellet';

export function drawPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cfg: PotionConfig,
  time: number,   // used for shimmer animation
) {
  const r = cfg.radius;
  const neckW = r * 0.5;
  const neckH = r * 0.7;
  const bodyR = r;

  ctx.save();
  ctx.translate(x, y);

  // Glow
  ctx.shadowBlur = 14;
  ctx.shadowColor = cfg.glowColor;

  // Body (circle)
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.4, cfg.color);
  grad.addColorStop(1, cfg.glowColor.replace('0.7', '0.9').replace('0.8', '0.9'));
  ctx.beginPath();
  ctx.arc(0, r * 0.3, bodyR, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Neck
  ctx.shadowBlur = 0;
  ctx.fillStyle = cfg.color;
  ctx.beginPath();
  ctx.roundRect(-neckW / 2, -r * 0.5, neckW, neckH, 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Cork / cap
  ctx.fillStyle = '#a16207'; // amber cork
  ctx.beginPath();
  ctx.roundRect(-neckW / 2 - 1, -r * 0.55, neckW + 2, r * 0.18, 2);
  ctx.fill();

  // Shimmer (animated) — pulses every ~2s
  const shimmerAlpha = 0.15 + 0.1 * Math.sin(time / 800);
  ctx.fillStyle = `rgba(255,255,255,${shimmerAlpha})`;
  ctx.beginPath();
  ctx.ellipse(-r * 0.25, r * 0.05, r * 0.2, r * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
