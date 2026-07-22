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

  ctx.save();
  ctx.translate(x, y);

  // Glow scales with size
  const glowScale = r / 10;
  ctx.shadowBlur = 8 + glowScale * 12;
  ctx.shadowColor = cfg.glowColor;

  // Body (circle)
  const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.4, cfg.color);
  grad.addColorStop(1, cfg.glowColor);
  
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Core pulse
  const pulseAlpha = 0.4 + 0.3 * Math.sin(time / 400 + r);
  ctx.fillStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
