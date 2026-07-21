// Shared room types — spec Section 2
export interface Pipe { id: string; x: number; y: number; linkedPipeId: string; }
export interface ConfusionOrb { x: number; y: number; active: boolean; }
export interface MapConfig { width: number; height: number; pipes: Pipe[]; confusionOrb: ConfusionOrb | null; }
export interface Debuff { teams: string[]; expiresAt: number; }
export interface Team { leaderId: string; playerIds: string[]; }
export interface RoomSettings {
  roundDurationSeconds: number;
  respawnDelaySeconds: number | null;
  teamCap: number;
  teamCount: number;
}
export type RoomStatus = 'lobby' | 'in_round' | 'round_ended';
export interface Room {
  code: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  teams: Record<string, Team>;
  map: MapConfig;
  debuff: Debuff | null;
}
