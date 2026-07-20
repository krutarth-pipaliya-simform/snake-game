// Phase 1 — Game update and logic functions
import type { Player, Segment } from '../types/player';

export const SPEED = 300; // pixels per second
export const COLLISION_RADIUS = 15;
export const PELLET_RADIUS = 5;
export const SEGMENT_DISTANCE = 15;

export interface GameState {
  player: Player;
  pellets: Segment[];
  pathHistory: { x: number; y: number; dist: number }[];
  totalDist: number;
}

export function createInitialState(): GameState {
  return {
    player: {
      id: 'local',
      name: 'Player',
      team: 'team-1',
      alive: true,
      color: '#3B82F6',
      segments: [
        { x: 2000, y: 2000 },
        { x: 1985, y: 2000 },
        { x: 1970, y: 2000 },
        { x: 1955, y: 2000 },
        { x: 1940, y: 2000 },
      ],
      direction: { x: 1, y: 0 },
      boosting: false,
      score: 0,
      kills: 0,
      inPipeTransit: null,
    },
    pellets: Array.from({ length: 100 }).map(() => ({
      x: Math.random() * 4000,
      y: Math.random() * 4000,
    })),
    pathHistory: [
      { x: 2000, y: 2000, dist: 60 },
      { x: 1985, y: 2000, dist: 45 },
      { x: 1970, y: 2000, dist: 30 },
      { x: 1955, y: 2000, dist: 15 },
      { x: 1940, y: 2000, dist: 0 },
    ],
    totalDist: 60,
  };
}

// Distance between two points
export function distance(a: Segment, b: Segment) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function updateGameState(state: GameState, dt: number) {
  if (!state.player.alive) return;

  const p = state.player;
  const moveDist = SPEED * dt;

  // Move head
  const head = { ...p.segments[0] };
  head.x += p.direction.x * moveDist;
  head.y += p.direction.y * moveDist;

  // Clamp to map boundaries
  head.x = Math.max(0, Math.min(4000, head.x));
  head.y = Math.max(0, Math.min(4000, head.y));

  state.totalDist += moveDist;
  state.pathHistory.unshift({ x: head.x, y: head.y, dist: state.totalDist });

  // Keep history manageable (need enough to position all segments)
  const maxRequiredDist = state.totalDist - (p.segments.length * SEGMENT_DISTANCE);
  while (state.pathHistory.length > 2 && state.pathHistory[state.pathHistory.length - 1].dist < maxRequiredDist - SEGMENT_DISTANCE) {
    state.pathHistory.pop();
  }

  // Update segments based on history
  const newSegments: Segment[] = [head];
  for (let i = 1; i < p.segments.length; i++) {
    const targetDist = state.totalDist - (i * SEGMENT_DISTANCE);
    
    // Find points in history that bound this distance
    let prev = state.pathHistory[0];
    for (let j = 1; j < state.pathHistory.length; j++) {
      const curr = state.pathHistory[j];
      if (curr.dist <= targetDist) {
        // Interpolate between prev and curr
        const t = (prev.dist - targetDist) / (prev.dist - curr.dist || 1);
        newSegments.push({
          x: prev.x + (curr.x - prev.x) * t,
          y: prev.y + (curr.y - prev.y) * t,
        });
        break;
      }
      prev = curr;
    }
    // Fallback if history ran out
    if (newSegments.length <= i) {
      newSegments.push({ ...p.segments[i] });
    }
  }
  p.segments = newSegments;

  // Check pellet eating
  for (let i = state.pellets.length - 1; i >= 0; i--) {
    if (distance(head, state.pellets[i]) < COLLISION_RADIUS + PELLET_RADIUS) {
      state.pellets.splice(i, 1);
      p.score += 10;
      // Add a segment at the end
      p.segments.push({ ...p.segments[p.segments.length - 1] });
      // Spawn new pellet
      state.pellets.push({
        x: Math.random() * 4000,
        y: Math.random() * 4000,
      });
    }
  }

  // Self-collision check
  for (let i = 2; i < p.segments.length; i++) {
    // Only check segments far enough down the body to avoid instant collision due to overlap
    if (distance(head, p.segments[i]) < COLLISION_RADIUS) {
      p.alive = false;
      break;
    }
  }
}
