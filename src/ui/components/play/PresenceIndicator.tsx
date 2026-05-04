'use client';

// Opponent-disconnected indicator. Reads the opponent's last_seen_at and shows a small
// dot + label when more than `disconnectedThresholdMs` have elapsed since their last
// heartbeat (default 5s, per FR-074).

import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type PresenceIndicatorProps = {
  displayName: string;
  /** ISO timestamp of the opponent's most recent heartbeat. Null = never seen. */
  lastSeenAt: string | null;
  connected: boolean;
  /** Threshold beyond which we treat a missed heartbeat as a disconnection. */
  disconnectedThresholdMs?: number;
};

const DEFAULT_THRESHOLD_MS = 5_000;

export function PresenceIndicator({
  displayName,
  lastSeenAt,
  connected,
  disconnectedThresholdMs = DEFAULT_THRESHOLD_MS,
}: PresenceIndicatorProps) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const lastSeenMs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
  const elapsed = now - lastSeenMs;
  const isDisconnected = !connected || elapsed > disconnectedThresholdMs;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
        isDisconnected ? 'bg-premium-tw/15 text-premium-tw' : 'bg-tile-edge/15 text-tile-edge',
      )}
      title={lastSeenAt ? `Last seen ${new Date(lastSeenAt).toLocaleTimeString()}` : 'Not yet seen'}
    >
      <span
        aria-hidden
        className={cn('h-2 w-2 rounded-full', isDisconnected ? 'bg-premium-tw' : 'bg-tile-edge')}
      />
      {isDisconnected ? `${displayName} disconnected` : `${displayName} online`}
    </span>
  );
}
