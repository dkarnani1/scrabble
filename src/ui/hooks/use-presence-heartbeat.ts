'use client';

// Periodic heartbeat that keeps `players.last_seen_at` fresh while the user has the
// game tab open. Pings every 15s and on visibilitychange / focus events. Sends a
// markAbsent on tab close so the opponent sees the disconnect promptly.

import * as React from 'react';
import { markPresent, markAbsent } from '@/app/actions/presence';

const HEARTBEAT_MS = 15_000;

export type UsePresenceHeartbeatArgs = {
  gameId: string;
  enabled: boolean;
};

export function usePresenceHeartbeat({ gameId, enabled }: UsePresenceHeartbeatArgs) {
  React.useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const ping = () => {
      void markPresent({ gameId }).catch(() => {
        // Heartbeat failures are non-fatal; the next tick will retry.
      });
    };

    ping();
    const interval = window.setInterval(() => {
      if (!cancelled) ping();
    }, HEARTBEAT_MS);

    const onVisibility = () => {
      if (!cancelled && document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    const onUnload = () => {
      // Best-effort. Server Actions over HTTPS may not complete during unload, but
      // sendBeacon-style posting isn't available for Server Actions; the next
      // markPresent from another device or the heartbeat staleness threshold will
      // handle the fallback indicator.
      void markAbsent({ gameId }).catch(() => undefined);
    };
    window.addEventListener('pagehide', onUnload);
    window.addEventListener('beforeunload', onUnload);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
      window.removeEventListener('pagehide', onUnload);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, [gameId, enabled]);
}
