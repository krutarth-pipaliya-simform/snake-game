// Phase 0 — Root App component with Redux Provider and Realtime connection test
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { GameCanvas } from './GameCanvas';

export function App() {
  return (
    <Provider store={store}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-8">
        <div className="w-full max-w-5xl space-y-8 text-center">
          {/* Logo / Title */}
          <div className="space-y-3">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-game-accent to-game-accent-glow bg-clip-text text-transparent">
                Team Snake
              </span>
              <span className="text-gray-100"> Battle</span>
            </h1>
            <p className="text-lg text-gray-400">
              Phase 1 — Single-Player Snake Core
            </p>
          </div>

          <GameCanvas />
        </div>
      </div>
    </Provider>
  );
}
