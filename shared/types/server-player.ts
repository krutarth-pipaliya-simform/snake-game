import type { Player } from './player';

export interface ServerPlayer extends Player {
  socketId: string;
  lastInputAt: number;
  isReady: boolean;
  diedAt: number | null;
}
