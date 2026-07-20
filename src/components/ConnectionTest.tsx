// Phase 0 — Connection test component showing Supabase Realtime status
import { useRealtimeTest, type ConnectionStatus } from '../realtime/useRealtimeTest';

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; dotClass: string; textClass: string }> = {
  connecting: {
    label: 'Connecting to Supabase Realtime…',
    dotClass: 'bg-game-warning animate-pulse',
    textClass: 'text-game-warning',
  },
  connected: {
    label: 'Supabase Realtime connected',
    dotClass: 'bg-game-success',
    textClass: 'text-game-success',
  },
  error: {
    label: 'Connection failed — check .env credentials',
    dotClass: 'bg-game-danger',
    textClass: 'text-game-danger',
  },
};

export function ConnectionTest() {
  const status = useRealtimeTest();
  const config = STATUS_CONFIG[status];

  return (
    <div className="flex items-center justify-center gap-3 rounded-lg border border-game-border bg-game-surface/50 px-5 py-4 backdrop-blur-sm">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${config.dotClass}`} />
      <span className={`text-sm font-medium ${config.textClass}`}>
        {config.label}
      </span>
    </div>
  );
}
