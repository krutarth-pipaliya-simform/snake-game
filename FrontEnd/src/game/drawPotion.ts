// Phase 1 — Potion drawing helper (optimized with sprite cache)
import type { PotionConfig } from '../types/pellet';

const spriteCache = new Map<string, HTMLCanvasElement>();

function getOrCreateSprite(cfg: PotionConfig): HTMLCanvasElement {
  const key = `${cfg.radius}-${cfg.color}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const padding = 24; // room for shadow blur spread
  const size = (cfg.radius + padding) * 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const r = cfg.radius;

  // Glow (rendered once into the sprite)
  const glowScale = r / 10;
  ctx.shadowBlur = 8 + glowScale * 12;
  ctx.shadowColor = cfg.glowColor;

  // Body (radial gradient — allocated once)
  const grad = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.1, cx, cy, r);
  grad.addColorStop(0, 'rgba(255,255,255,0.8)');
  grad.addColorStop(0.4, cfg.color);
  grad.addColorStop(1, cfg.glowColor);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Core highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.4, 0, Math.PI * 2);
  ctx.fill();

  spriteCache.set(key, canvas);
  return canvas;
}

export function drawPotion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cfg: PotionConfig,
  time: number,   // used for shimmer animation
) {
  const sprite = getOrCreateSprite(cfg);
  const pulseAlpha = 0.82 + 0.18 * Math.sin(time / 400 + cfg.radius);
  ctx.globalAlpha = pulseAlpha;
  ctx.drawImage(sprite, x - sprite.width / 2, y - sprite.height / 2);
  ctx.globalAlpha = 1;
}
