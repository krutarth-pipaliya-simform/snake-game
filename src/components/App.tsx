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

          <div className="relative overflow-hidden rounded-xl border border-game-border bg-black shadow-2xl shadow-game-accent/5">
            <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5" />
            <GameCanvas />
          </div>
          
          {/* Potion legend */}
          <div className="flex justify-center gap-6 text-sm text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#4ade80] shadow-[0_0_6px_#4ade80]" />
              Minor (+10)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-[#60a5fa] shadow-[0_0_6px_#60a5fa]" />
              Greater (+30)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-4 w-4 rounded-full bg-[#c084fc] shadow-[0_0_8px_#c084fc]" />
              Grand (+75)
            </span>
          </div>
        </div>
      </div>
    </Provider>
  );
}
