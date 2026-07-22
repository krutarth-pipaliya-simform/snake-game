// Phase 0 — Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import roomReducer from './roomSlice';
import localPlayerReducer from './localPlayerSlice';

export const store = configureStore({
  reducer: {
    room: roomReducer,
    localPlayer: localPlayerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
