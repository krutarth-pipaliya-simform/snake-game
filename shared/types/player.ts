// Shared player types — spec Section 2
export interface Segment { x: number; y: number; }
export interface Direction { x: number; y: number; }
export interface PipeTransit { pipeId: string; progress: number; }

export interface Player {
  id: string;
  name: string;
  team: string;
  alive: boolean;
  color: string;
  segments: Segment[];
  direction: Direction;
  boosting: boolean;
  score: number;
  kills: number;
  inPipeTransit: PipeTransit | null;
}
