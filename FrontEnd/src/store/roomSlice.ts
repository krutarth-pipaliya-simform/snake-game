// Phase 0 — Room slice with initial state matching spec Section 2
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Room, RoomStatus, RoomSettings } from '../types/room';

interface ResultsPayload {
  winner: string | null;
  teamResults: Record<string, { score: number; kills: number }>;
  playerResults: Record<string, { score: number; kills: number }>;
}

interface RoomState {
  /** Current room data — null when not in a room */
  current: Room | null;
  roundResults: ResultsPayload | null;
  matchResults: ResultsPayload | null;
}

const initialState: RoomState = {
  current: null,
  roundResults: null,
  matchResults: null,
};

export const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRoom(state, action: PayloadAction<Room>) {
      state.current = action.payload;
    },
    updateStatus(state, action: PayloadAction<RoomStatus>) {
      if (state.current) {
        state.current.status = action.payload;
      }
    },
    updateSettings(state, action: PayloadAction<Partial<RoomSettings>>) {
      if (state.current) {
        state.current.settings = { ...state.current.settings, ...action.payload };
      }
    },
    clearRoom(state) {
      state.current = null;
      state.roundResults = null;
      state.matchResults = null;
    },
    setRoundResults(state, action: PayloadAction<{ roundResults: ResultsPayload; matchResults: ResultsPayload }>) {
      state.roundResults = action.payload.roundResults;
      state.matchResults = action.payload.matchResults;
    }
  },
});

export const { setRoom, updateStatus, updateSettings, clearRoom, setRoundResults } = roomSlice.actions;
export default roomSlice.reducer;
