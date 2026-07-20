// Phase 0 — Core player types matching spec Section 2

/** A single point on the grid (used for snake segments) */
export interface Segment {
  x: number;
  y: number;
}

/** Unit vector for movement direction */
export interface Direction {
  x: number;
  y: number;
}

/** Pipe transit state — null when not in a pipe */
export interface PipeTransit {
  pipeId: string;
  /** Progress from 0.0 (entry) to 1.0 (exit) */
  progress: number;
}

/** Full player object — see spec Section 2 */
export interface Player {
  id: string;
  name: string;
  /** Team ID string ("team-1", "team-2", etc.) */
  team: string;
  alive: boolean;
  /** Individual player color (hex), independent of team highlight */
  color: string;
  /** segments[0] is always the head */
  segments: Segment[];
  direction: Direction;
  boosting: boolean;
  score: number;
  kills: number;
  /** null when not in pipe transit — see Phase 8 */
  inPipeTransit: PipeTransit | null;
}
