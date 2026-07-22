// Phase 0 — Root App component with Redux Provider and Realtime connection test
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { selectRoomStatus } from '../store/selectors';
import { GameCanvas } from './GameCanvas';
import { MainMenu } from './MainMenu';
import { Lobby } from './Lobby';
import { TimerDisplay } from './TimerDisplay';
import { RoundEndOverlay } from './RoundEndOverlay';
import { useRoomSync } from '../hooks/useRoomSync';

function AppContent() {
  useRoomSync(); // Keep socket listeners active globally!
  const roomStatus = useSelector(selectRoomStatus);

  if (roomStatus === 'lobby') {
    return <Lobby />;
  }
  
  if (roomStatus === 'in_round') {
    return (
      <div className="w-full max-w-5xl space-y-4 text-center">
        <div className="relative overflow-hidden rounded-xl border border-game-border bg-black shadow-2xl shadow-game-accent/5">
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/5 z-20" />
          <TimerDisplay />
          <GameCanvas />
        </div>
      </div>
    );
  }

  if (roomStatus === 'round_ended' || roomStatus === 'match_ended') {
    return <RoundEndOverlay />;
  }

  return <MainMenu />;
}

export function App() {
  return (
    <Provider store={store}>
      <div className="flex min-h-screen flex-col items-center justify-center bg-game-bg p-8">
        <AppContent />
      </div>
    </Provider>
  );
}
