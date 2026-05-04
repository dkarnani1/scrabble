'use client';

// 3-second challenge-window indicator. Shown to the OPPONENT of the player who just
// placed a move. Renders a countdown ring + a Challenge button. The placer sees the
// same component but in read-only mode (no button).
//
// The deadline is the place move's `created_at + 3s`. The component derives `remaining`
// from `serverNow` to keep clocks in sync (FR-046 / SC-004).

import * as React from 'react';
import { Button } from '@ui/components/primitives';
import { cn } from '@ui/lib/classnames';

const WINDOW_MS = 3_000;

export type ChallengeWindowProps = {
  /** ISO timestamp the place move was committed at — the window starts here. */
  placedAt: string;
  /** Server "now" returned with the GameView; we drift the local clock to match. */
  serverNow: string;
  /** True if the calling user is the opponent of the placer; only they see the button. */
  canChallenge: boolean;
  pending: boolean;
  onChallenge: () => void;
  onSkip?: () => void;
};

export function ChallengeWindow({
  placedAt,
  serverNow,
  canChallenge,
  pending,
  onChallenge,
}: ChallengeWindowProps) {
  // Compute how much wall time has passed locally since the GameView was loaded; add
  // that to the server clock to estimate the current server-time. Then the window is
  // (placedAt + WINDOW_MS) - serverNowEstimate.
  const [tickMs, setTickMs] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setTickMs(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const skewMs = React.useMemo(() => {
    // serverNow when the page rendered + (now - mount) ≈ current server time.
    const serverAtMount = new Date(serverNow).getTime();
    const localAtMount = mountTime();
    return serverAtMount - localAtMount;
  }, [serverNow]);

  const placedMs = new Date(placedAt).getTime();
  const serverEstimate = tickMs + skewMs;
  const elapsed = serverEstimate - placedMs;
  const remainingMs = Math.max(0, WINDOW_MS - elapsed);
  const fraction = Math.max(0, Math.min(1, remainingMs / WINDOW_MS));

  return (
    <div
      role="region"
      aria-label="Challenge window"
      className={cn(
        'flex items-center gap-3 rounded-md border border-tile-edge/40 bg-tile-face px-3 py-2',
        'shadow-sm',
      )}
    >
      <div className="relative h-10 w-10 shrink-0">
        <svg viewBox="0 0 36 36" className="h-10 w-10 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeOpacity="0.15"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 16}`}
            strokeDashoffset={`${2 * Math.PI * 16 * (1 - fraction)}`}
            className="text-tile-edge transition-[stroke-dashoffset] duration-100 ease-linear"
          />
        </svg>
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-xs">
          {Math.ceil(remainingMs / 1000)}
        </span>
      </div>
      <div className="flex-1 text-sm">
        <p className="font-medium">Challenge window</p>
        <p className="text-xs text-tile-ink/70">
          {canChallenge
            ? 'Tap Challenge to dispute the played words.'
            : 'Opponent has 3 seconds to challenge.'}
        </p>
      </div>
      {canChallenge && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onChallenge}
          disabled={pending || remainingMs <= 0}
        >
          {pending ? 'Challenging…' : 'Challenge'}
        </Button>
      )}
    </div>
  );
}

let _mount: number | null = null;
function mountTime(): number {
  if (_mount === null) _mount = Date.now();
  return _mount;
}
