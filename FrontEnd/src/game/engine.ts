
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

export function applyServerState(state: GameState, serverState: any, dt: number) {
  // Update state from server
  const serverPlayers = serverState.players as ServerPlayer[];
  state.players = {};
  for (const p of serverPlayers) {
    state.players[p.id] = p;
  }
  
  if (serverState.map) {
    state.map = serverState.map;
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

  // Update score popups age (fade out after ~800ms) - purely client-side visual
  for (let i = state.scorePopups.length - 1; i >= 0; i--) {
    state.scorePopups[i].age += dt * 1000;
    if (state.scorePopups[i].age > 800) {
      state.scorePopups.splice(i, 1);
    }
  }
}

