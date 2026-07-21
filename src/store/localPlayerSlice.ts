import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface LocalPlayerState {
  id: string;
  name: string;
  isReady: boolean;
}

// Generate a random ID for the player on load
const generateId = () => {
  return 'player-' + Math.random().toString(36).substring(2, 9);
};

const initialState: LocalPlayerState = {
  id: generateId(),
  name: 'Player',
  isReady: false,
};

export const localPlayerSlice = createSlice({
  name: 'localPlayer',
  initialState,
  reducers: {
    setName(state, action: PayloadAction<string>) {
      state.name = action.payload;
    },
    setReady(state, action: PayloadAction<boolean>) {
      state.isReady = action.payload;
    },
    resetPlayer(state) {
      state.isReady = false;
      // Keep name and id
    }
  },
});

export const { setName, setReady, resetPlayer } = localPlayerSlice.actions;
export default localPlayerSlice.reducer;
