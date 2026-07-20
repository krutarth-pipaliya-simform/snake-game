// Phase 1 — Background rendering: grid + border
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cameraOffsetX: number,
  cameraOffsetY: number,
  canvasW: number,
  canvasH: number,
) {
  const MAP_SIZE = 4000;
  const GRID = 100;

  // Line grid — matches original canvas aesthetic
  ctx.strokeStyle = '#2a2a3e';
  ctx.lineWidth = 1;
  const startX = Math.floor(-cameraOffsetX / GRID) * GRID;
  const startY = Math.floor(-cameraOffsetY / GRID) * GRID;
  for (let x = startX; x < startX + canvasW + GRID; x += GRID) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, MAP_SIZE); ctx.stroke();
  }
  for (let y = startY; y < startY + canvasH + GRID; y += GRID) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(MAP_SIZE, y); ctx.stroke();
  }

  // Glowing map border (gradient stroke)
  const grd = ctx.createLinearGradient(0, 0, MAP_SIZE, MAP_SIZE);
  grd.addColorStop(0, '#ef4444');
  grd.addColorStop(0.5, '#f97316');
  grd.addColorStop(1, '#ef4444');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 6;
  ctx.shadowBlur = 20;
  ctx.shadowColor = '#ef444499';
  ctx.strokeRect(0, 0, MAP_SIZE, MAP_SIZE);
  ctx.shadowBlur = 0;
}
