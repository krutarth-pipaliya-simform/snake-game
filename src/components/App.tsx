// Phase 0 — Root App component with Redux Provider and Realtime connection test
import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ConnectionTest } from './ConnectionTest';

export function App() {
  return (
    <Provider store={store}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo / Title */}
          <div className="space-y-3">
            <h1 className="text-5xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-r from-game-accent to-game-accent-glow bg-clip-text text-transparent">
                Team Snake
              </span>
              <span className="text-gray-100"> Battle</span>
            </h1>
            <p className="text-lg text-gray-400">
              Real-time multiplayer team snake game
            </p>
          </div>

          {/* Connection Status */}
          <ConnectionTest />

          {/* Stack info */}
          <div className="rounded-xl border border-game-border bg-game-surface/50 p-6 backdrop-blur-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Tech Stack
            </h2>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {['React', 'Redux Toolkit', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Canvas'].map(
                (tech) => (
                  <span
                    key={tech}
                    className="rounded-full border border-game-border bg-game-bg px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-game-accent hover:text-game-accent"
                  >
                    {tech}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </Provider>
  );
}
