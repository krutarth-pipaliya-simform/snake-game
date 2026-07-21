// Phase 0 — Room slice with initial state matching spec Section 2
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Room, RoomStatus, RoomSettings } from '../types/room';

interface RoomState {
  /** Current room data — null when not in a room */
  current: Room | null;
}

const initialState: RoomState = {
  current: null,
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
    },
  },
});

export const { setRoom, updateStatus, updateSettings, clearRoom } = roomSlice.actions;
export default roomSlice.reducer;
