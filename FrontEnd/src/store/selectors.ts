// Phase 0 — Selectors for accessing Redux state
// Selectors will be added here as slices grow across phases.
// See CODING_CONVENTIONS.md — selectors go here, not inline in components.

import type { RootState } from './store';

/** Select the current room or null if not in a room */
export const selectRoom = (state: RootState) => state.room.current;

/** Select the current room status */
export const selectRoomStatus = (state: RootState) => state.room.current?.status ?? null;

/** Select the local player state */
export const selectLocalPlayer = (state: RootState) => state.localPlayer;
