// Phase 9 — Confusion Orb visual improvements + Phase 1 background
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

  // Line grid — brighter per request
  ctx.strokeStyle = isConfused ? 'rgba(139, 92, 246, 0.35)' : 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  const startX = Math.floor(-cameraOffsetX / GRID) * GRID;
  const startY = Math.floor(-cameraOffsetY / GRID) * GRID;

  // Wavy grid distortion if confused
  const waveAmplitude = isConfused ? 18 : 0;
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

  // Radial Vignette
  const sx = -cameraOffsetX;
  const sy = -cameraOffsetY;
  const radius = Math.max(canvasW, canvasH) * 0.7;
  const vignetteGrad = ctx.createRadialGradient(sx + canvasW/2, sy + canvasH/2, radius * 0.3, sx + canvasW/2, sy + canvasH/2, radius);
  vignetteGrad.addColorStop(0, 'rgba(11, 14, 20, 0)');
  vignetteGrad.addColorStop(1, 'rgba(11, 14, 20, 0.8)'); // --bg-base
  ctx.fillStyle = vignetteGrad;
  ctx.fillRect(sx, sy, canvasW, canvasH);

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

export function drawPipes(ctx: CanvasRenderingContext2D, pipes: { id: string; x: number; y: number; linkedPipeId?: string }[], time: number) {
  // 1. Draw connections first so they render under the pipes
  const drawnLinks = new Set<string>();
  
  for (const pipe of pipes) {
    if (!pipe.linkedPipeId) continue;
    const linked = pipes.find(p => p.id === pipe.linkedPipeId);
    if (!linked) continue;

    const linkKey = [pipe.id, linked.id].sort().join('_');
    if (drawnLinks.has(linkKey)) continue;
    drawnLinks.add(linkKey);

    const x1 = pipe.x;
    const y1 = pipe.y;
    const x2 = linked.x;
    const y2 = linked.y;
    
    // Choose horizontal or vertical first based on IDs so it's consistent for this pair
    const isVerticalFirst = (pipe.id > linked.id); 

    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const radius = Math.min(50, dx / 2, dy / 2);

    const buildPath = () => {
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
    };

    ctx.save();
    
    // Base tunnel path (very subtle, muted)
    buildPath();
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(25, 20, 35, 0.06)'; // Muted dark background, very faint
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Animated energy streams (subtle)
    const dashSpeed = time / 45;
    const pulseOpacity = 0.05 + (Math.sin(time / 200) + 1) / 2 * 0.05; // 0.05 to 0.10 opacity

    // Stream 1 (forward)
    ctx.save();
    buildPath();
    ctx.setLineDash([12, 60]);
    ctx.lineDashOffset = -dashSpeed;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulseOpacity})`; // white
    ctx.shadowBlur = 2; // Barely any glow
    ctx.shadowColor = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    // Stream 2 (reverse)
    ctx.save();
    buildPath();
    ctx.setLineDash([12, 60]);
    ctx.lineDashOffset = dashSpeed;
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 255, 255, ${pulseOpacity})`;
    ctx.shadowBlur = 2;
    ctx.shadowColor = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // 2. Draw the pipes themselves on top of the connections
  for (const pipe of pipes) {
    ctx.save();
    ctx.translate(pipe.x, pipe.y);

    // Outer glow (reduced)
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)'; // white

    // Vortex rings (subtler)
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((time / (300 + i * 100)) * (i % 2 === 0 ? 1 : -1));
      ctx.beginPath();
      ctx.arc(0, 0, 35 - i * 8, 0, Math.PI * 1.5);
      ctx.lineWidth = 1 + i;
      ctx.strokeStyle = i === 0 ? 'rgba(255, 255, 255, 0.35)' : (i === 1 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)');
      ctx.stroke();
      ctx.restore();
    }

    // Deep center
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // More transparent center
    ctx.fill();

    // Inner pulsing energy
    const pulse = (Math.sin(time / 150) + 1) / 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10 + 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + 0.15 * pulse})`;
    ctx.fill();

    ctx.restore();
  }
}

export function drawConfusionOrb(ctx: CanvasRenderingContext2D, orb: { x: number, y: number, active: boolean }, time: number) {
  if (!orb.active) return;

  ctx.save();
  ctx.translate(orb.x, orb.y);

  const outerPulse = (Math.sin(time / 300) + 1) / 2;
  const innerPulse = (Math.sin(time / 150) + 1) / 2;

  // Large outer warning ring
  ctx.beginPath();
  ctx.arc(0, 0, 45 + outerPulse * 8, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(236, 72, 153, ${0.15 + outerPulse * 0.25})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Mid ring — spinning
  ctx.save();
  ctx.rotate(time / 400);
  ctx.beginPath();
  ctx.arc(0, 0, 33, 0, Math.PI * 1.6);
  ctx.strokeStyle = `rgba(139, 92, 246, ${0.5 + outerPulse * 0.3})`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Outer glow
  ctx.shadowBlur = 35 + outerPulse * 20;
  ctx.shadowColor = '#EC4899';

  // Main orb body
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
  grad.addColorStop(0, '#EC4899');
  grad.addColorStop(0.5, '#8B5CF6');
  grad.addColorStop(1, '#1e1035');
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Swirling energy blobs
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.rotate(-time / 300);
  ctx.globalAlpha = 0.6 + innerPulse * 0.3;
  ctx.beginPath();
  ctx.arc(10, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#C4B5FD';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-10, 0, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#F9A8D4';
  ctx.fill();
  ctx.restore();

  // Central bright core
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 5 + innerPulse * 3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fill();

  ctx.restore();
}

export function drawFogOfWar(ctx: CanvasRenderingContext2D, canvasW: number, canvasH: number, time: number) {
  // Smoky dark-grey overlay with transparent hole in the middle — reduced visibility per spec
  const holeRadius = 200 + Math.sin(time / 200) * 15; // Pulsing, smaller than normal

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const cx = canvasW / 2;
  const cy = canvasH / 2;

  const gradient = ctx.createRadialGradient(cx, cy, holeRadius * 0.4, cx, cy, holeRadius);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0)');      // transparent center
  gradient.addColorStop(0.7, 'rgba(17, 24, 39, 0.7)');  // soft edge
  gradient.addColorStop(1, 'rgba(17, 24, 39, 0.97)');   // almost opaque

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasW, canvasH);

  ctx.restore();
}
