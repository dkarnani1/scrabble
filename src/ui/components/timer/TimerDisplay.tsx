'use client';

import { cn } from '@ui/lib/classnames';
import { UrgencyBadge } from './UrgencyBadge';
import { useServerTimer } from '@ui/hooks/use-server-timer';

export type TimerDisplayProps = {
  deadlineAt: string | null;
  serverNow: string;
  className?: string;
};

export function TimerDisplay({ deadlineAt, serverNow, className }: TimerDisplayProps) {
  const timer = useServerTimer({ deadlineAt, serverNow });

  if (timer.remainingSeconds === null) {
    return (
      <span className={cn('text-xs text-tile-ink/60', className)} aria-label="Untimed game">
        no timer
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-mono text-sm',
        timer.isUrgent && 'text-premium-tw',
        className,
      )}
      aria-live="polite"
    >
      <span data-testid="timer-seconds">{formatSeconds(timer.remainingSeconds)}</span>
      {timer.isUrgent && <UrgencyBadge />}
    </span>
  );
}

function formatSeconds(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
