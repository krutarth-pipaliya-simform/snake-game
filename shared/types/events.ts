import type { Room } from './room';

// Client → Server events
export interface ClientEvents {
  'room:create': (payload: { hostName: string }) => void;
  'room:join': (payload: { roomCode: string; playerName: string }) => void;
  'team:join': (payload: { teamId: string }) => void;
  'team:kick': (payload: { targetPlayerId: string }) => void;
  'settings:update': (settings: Partial<{
    roundDurationSeconds: number;
    respawnDelaySeconds: number | null;
    teamCap: number;
    teamCount: number;
    roundsPerMatch: number;
  }>) => void;
  'player:ready': (payload: { isReady: boolean }) => void;
  'round:start': (payload: {}) => void;
  'round:voteEnd': (payload: {}) => void;
  'input:direction': (payload: { x: number; y: number }) => void;
  'input:boost': (payload: { boosting: boolean }) => void;
}

// Server → Client events
export interface ServerEvents {
  'room:state': (room: Room) => void;
  'tick:state': (state: any) => void; // Will refine later
  'round:ended': (state: any) => void; // Will refine later
  'error': (error: { message: string }) => void;
}
