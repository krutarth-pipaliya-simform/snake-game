import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRoom } from '../store/selectors';

export function TimerDisplay() {
  const room = useSelector(selectRoom);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!room || !room.roundStartedAt || room.status !== 'in_round') {
      setTimeLeft(null);
      return;
    }

    const duration = room.settings.roundDurationSeconds;

    const interval = setInterval(() => {
      const elapsed = (Date.now() - room.roundStartedAt!) / 1000;
      const remaining = Math.max(0, Math.ceil(duration - elapsed));
      setTimeLeft(remaining);
    }, 100); // 100ms for smooth updates

    return () => clearInterval(interval);
  }, [room?.roundStartedAt, room?.settings.roundDurationSeconds, room?.status]);

  if (timeLeft === null) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const duration = room?.settings?.roundDurationSeconds || 60;
  const isWarning = timeLeft <= duration * 0.15; // red text in the final ~15%

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className={`
        flex items-center gap-3 px-6 py-2 rounded-full
        bg-[var(--color-bg-panel)] border border-[var(--color-border-default)] shadow-lg
        transition-colors duration-300
        ${isWarning ? 'animate-pulse text-[var(--color-danger-alert)] border-[var(--color-danger-alert)]' : 'text-[var(--color-text-primary)]'}
      `}>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        <span className="font-display text-2xl font-bold tracking-wider">{timeString}</span>
      </div>
    </div>
  );
}
