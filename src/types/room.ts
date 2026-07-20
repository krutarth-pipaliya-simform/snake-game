// Phase 0 — Core room types matching spec Section 2

/** Single teleport pipe endpoint on the map */
export interface Pipe {
  id: string;
  x: number;
  y: number;
  linkedPipeId: string;
}

/** Confusion orb state — null when not currently on the map */
export interface ConfusionOrb {
  x: number;
  y: number;
  active: boolean;
}

/** Map configuration for a room */
export interface MapConfig {
  width: number;
  height: number;
  pipes: Pipe[];
  confusionOrb: ConfusionOrb | null;
}

/** Active debuff state — null when no debuff is active */
export interface Debuff {
  /** Array of team IDs affected by the debuff (every team except the eater's) */
  teams: string[];
  /** Unix timestamp (ms) when the debuff expires */
  expiresAt: number;
}

/** Team within a room */
export interface Team {
  leaderId: string;
  playerIds: string[];
}

/** Host-configurable room settings */
export interface RoomSettings {
  roundDurationSeconds: number;
  /** null means "no respawn" — never store Infinity */
  respawnDelaySeconds: number | null;
  /** Max players allowed on ONE team */
  teamCap: number;
  /** Number of teams for this room (2, 3, 4...) */
  teamCount: number;
}

/** Room status — the three valid states */
export type RoomStatus = 'lobby' | 'in_round' | 'round_ended';

/** Full room object — see spec Section 2 */
export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  /** Keyed by team ID string ("team-1", "team-2", etc.) */
  teams: Record<string, Team>;
  map: MapConfig;
  /** null when no debuff is active */
  debuff: Debuff | null;
}
