// Phase 1 — HUD rendering (glassmorphism panels + game-over overlay)

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
) {
  // Glassmorphism pill: top-left
  const panel = { x: 16, y: 16, w: 200, h: 80, r: 14 };

  ctx.save();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = '#0a0e17';
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Border glow
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, panel.x, panel.y, panel.w, panel.h, panel.r);
  ctx.stroke();

  // Score
  ctx.fillStyle = '#94a3b8';   // slate-400
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE', panel.x + 18, panel.y + 26);
  ctx.fillStyle = '#f8fafc';   // white
  ctx.font = 'bold 26px Inter, sans-serif';
  ctx.fillText(score.toLocaleString(), panel.x + 18, panel.y + 52);

  // Length badge — top-right of panel
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('LENGTH', panel.x + panel.w - 18, panel.y + 26);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px Inter, sans-serif';
  ctx.fillText(String(length), panel.x + panel.w - 18, panel.y + 52);

  // Controls hint (bottom-right, tiny)
  ctx.fillStyle = 'rgba(148,163,184,0.5)';
  ctx.font = '11px Inter, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('WASD / ↑↓←→ to move', canvasW - 14, panel.y + 24);

  ctx.restore();
}

export function drawScorePopups(
  ctx: CanvasRenderingContext2D,
  popups: { x: number; y: number; value: number; age: number }[],
) {
  // These live inside the world, so must be called within the camera ctx.save()
  popups.forEach(popup => {
    const progress = popup.age / 800;                       // 0 → 1
    const alpha = Math.max(0, 1 - progress);               // fade out
    const rise = 30 * progress;                            // float upward
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

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  canvasW: number,
  canvasH: number,
) {
  // Dark overlay
  ctx.fillStyle = 'rgba(10, 14, 23, 0.82)';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Centred card
  const cw = 340, ch = 190, cx = (canvasW - cw) / 2, cy = (canvasH - ch) / 2;
  ctx.fillStyle = '#111827';
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.fill();

  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  roundRect(ctx, cx, cy, cw, ch, 20);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 32px Inter, sans-serif';
  ctx.fillText('GAME OVER', canvasW / 2, cy + 58);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px Inter, sans-serif';
  ctx.fillText(`Final score: ${score.toLocaleString()}`, canvasW / 2, cy + 96);

  ctx.fillStyle = '#60a5fa';
  ctx.font = '14px Inter, sans-serif';
  ctx.fillText('Press any key to play again', canvasW / 2, cy + 142);
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
