
import type { Pellet } from '../types/pellet';
import type { Room } from '../../../shared/types/room';
import type { ServerPlayer } from '../../../shared/types/server-player';

export interface ScorePopup {
  x: number;
  y: number;
  value: number;
  age: number;
}

export interface GameState {
  players: Record<string, ServerPlayer>;
  pellets: Pellet[];
  scorePopups: ScorePopup[];
  map: Room['map'];
  debuff: Room['debuff'];
  localPlayerId: string;
}

export function createInitialState(): GameState {
  return {
    players: {},
    pellets: [],
    scorePopups: [],
    map: { width: 4000, height: 4000, pipes: [], confusionOrb: null, pellets: [] },
    debuff: null,
    localPlayerId: '',
  };
}

export function applyServerState(state: GameState, serverState: any, _dt: number) {
  // Update players in-place to reduce GC pressure
  const serverPlayers = serverState.players as ServerPlayer[];
  const seen = new Set<string>();
  for (const p of serverPlayers) {
    seen.add(p.id);
    const existing = state.players[p.id];
    if (existing) {
      // Update in-place — preserves object identity, reduces allocations
      Object.assign(existing, p);
    } else {
      state.players[p.id] = p;
    }
  }
  // Remove disconnected players
  for (const id of Object.keys(state.players)) {
    if (!seen.has(id)) delete state.players[id];
  }
  
  if (serverState.map) {
    state.map = { ...state.map, ...serverState.map };
    state.pellets = serverState.map.pellets || [];
  }
  
  if (serverState.debuff !== undefined) {
    if (serverState.debuff && !state.debuff) {
      console.log('[Frontend Event Reception] Received new Confusion effect from server:', serverState.debuff);
    } else if (!serverState.debuff && state.debuff) {
      console.log('[Frontend Event Reception] Confusion effect cleared by server.');
    }
    state.debuff = serverState.debuff;
  }
}

/** Age score popups — purely client-side visual, called from rAF loop */
export function agePopups(state: GameState, dt: number) {
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    state.scorePopups[i].age += dt * 1000;
    if (state.scorePopups[i].age > 800) {
      state.scorePopups.splice(i, 1);
    }
  }
}
