// Phase 1 — Background rendering: grid + border
export function drawBackground(
  ctx: CanvasRenderingContext2D,
  cameraOffsetX: number,
  cameraOffsetY: number,
  canvasW: number,
  canvasH: number,
  isConfused: boolean = false,
  time: number = 0
) {
  const MAP_SIZE = 4000;
  const GRID = 100;

  // Line grid — matches original canvas aesthetic
  ctx.strokeStyle = '#2a2a3e';
  ctx.lineWidth = 1;
  const startX = Math.floor(-cameraOffsetX / GRID) * GRID;
  const startY = Math.floor(-cameraOffsetY / GRID) * GRID;
  
  // Wavy grid distortion if confused
  const waveAmplitude = isConfused ? 15 : 0;
  const waveFrequency = 0.005;

  for (let x = startX; x < startX + canvasW + GRID; x += GRID) {
    ctx.beginPath();
    for (let y = 0; y <= MAP_SIZE; y += 50) {
      const xOffset = Math.sin(y * waveFrequency + time / 200) * waveAmplitude;
      if (y === 0) ctx.moveTo(x + xOffset, y);
      else ctx.lineTo(x + xOffset, y);
    }
    ctx.stroke();
  }
  for (let y = startY; y < startY + canvasH + GRID; y += GRID) {
    ctx.beginPath();
    for (let x = 0; x <= MAP_SIZE; x += 50) {
      const yOffset = Math.cos(x * waveFrequency + time / 200) * waveAmplitude;
      if (x === 0) ctx.moveTo(x, y + yOffset);
      else ctx.lineTo(x, y + yOffset);
    }
    ctx.stroke();
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

export function drawPipes(ctx: CanvasRenderingContext2D, pipes: { id: string; x: number; y: number }[], time: number) {
  for (const pipe of pipes) {
    ctx.save();
    ctx.translate(pipe.x, pipe.y);
    
    // Portal swirling effect
    ctx.rotate(time / 500);
    
    // Outer glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#8B5CF6'; // purple glow
    
    // Outer ring
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8B5CF6';
    ctx.stroke();

    // Inner pulsing ring
    const pulse = (Math.sin(time / 200) + 1) / 2; // 0 to 1
    ctx.beginPath();
    ctx.arc(0, 0, 20 + 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(139, 92, 246, ${0.3 + 0.3 * pulse})`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#A78BFA';
    ctx.stroke();

    ctx.restore();
  }
}

export function drawConfusionOrb(ctx: CanvasRenderingContext2D, orb: { x: number, y: number, active: boolean }, time: number) {
  if (!orb.active) return;
  
  ctx.save();
  ctx.translate(orb.x, orb.y);
  
  // Floating orb with dark energy
  ctx.shadowBlur = 25;
  ctx.shadowColor = '#000000';
  
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#111827';
  ctx.fill();
  
  // Swirling purple/black energy inside
  ctx.rotate(-time / 300);
  ctx.beginPath();
  ctx.arc(10, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#8B5CF6';
  ctx.fill();
  
  ctx.beginPath();
  ctx.arc(-10, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#EC4899';
  ctx.fill();

  ctx.restore();
}

export function drawFogOfWar(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, time: number) {
  // Smoky dark-grey overlay with transparent hole in the middle
  const holeRadius = 250 + Math.sin(time / 200) * 10; // Pulsing vision radius
  
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  
  const cx = canvasW / 2;
  const cy = canvasH / 2;

  const gradient = ctx.createRadialGradient(cx, cy, holeRadius * 0.5, cx, cy, holeRadius);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0)');    // transparent center
  gradient.addColorStop(1, 'rgba(17, 24, 39, 0.95)'); // almost opaque grey-black

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);
  
  ctx.restore();
}
