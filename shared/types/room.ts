// Shared room types — spec Section 2
export interface Pipe { id: string; x: number; y: number; linkedPipeId: string; }
export interface ConfusionOrb { x: number; y: number; active: boolean; spawnsAt?: number | null; }
export interface MapConfig { width: number; height: number; pipes: Pipe[]; confusionOrb: ConfusionOrb | null; pellets: any[]; }
export interface Debuff { teams: string[]; expiresAt: number; clearedPlayers?: string[]; }
export interface Team { leaderId: string; playerIds: string[]; }
export interface RoomSettings {
  roundDurationSeconds: number;
  respawnDelaySeconds: number | null;
  teamCap: number;
  teamCount: number;
  roundsPerMatch: number;
}
export type RoomStatus = 'lobby' | 'in_round' | 'round_ended' | 'match_ended';

/** Lightweight player info broadcast to all clients during lobby/round */
export interface RoomPlayer {
  id: string;
  name: string;
  team: string | null;
  isReady: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  currentRound: number;
  settings: RoomSettings;
  teams: Record<string, Team>;
  map: MapConfig;
  debuff: Debuff | null;
  /** All connected players — keyed by player ID. Used by lobby UI. */
  players: Record<string, RoomPlayer>;
  roundStartedAt: number | null;
}
