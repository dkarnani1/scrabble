'use client';

// Renders a per-second countdown to a server-set deadline, correcting for clock skew
// between the browser and the server. The skew anchor is established each time we
// receive a fresh `serverNow` (every Server Action result includes one), and is
// re-anchored on `window.focus` via the `/api/server-time` route.

import * as React from 'react';

export type ServerTimerArgs = {
  /** ISO timestamp of the deadline, or null if there is no deadline. */
  deadlineAt: string | null;
  /** ISO timestamp of "now according to the server", typically the freshly returned
   * GameView.serverNow. Used as the skew anchor. */
  serverNow: string;
};

export type ServerTimerView = {
  remainingMs: number | null;
  remainingSeconds: number | null;
  isUrgent: boolean; // true when remaining ≤ 5 seconds and > 0
  isExpired: boolean; // remaining ≤ 0
};

const URGENT_THRESHOLD_MS = 5_000;

export function useServerTimer({ deadlineAt, serverNow }: ServerTimerArgs): ServerTimerView {
  // Skew = serverNow - localNow. Add to local clock to estimate server clock.
  const skewRef = React.useRef(0);
  React.useEffect(() => {
    skewRef.current = new Date(serverNow).getTime() - Date.now();
  }, [serverNow]);

  // Re-anchor on focus. Cheap GET to /api/server-time.
  React.useEffect(() => {
    const onFocus = () => {
      void (async () => {
        try {
          const res = await fetch('/api/server-time', { cache: 'no-store' });
          if (!res.ok) return;
          const body = (await res.json()) as { now?: string };
          if (body.now) skewRef.current = new Date(body.now).getTime() - Date.now();
        } catch {
          // Network failures are non-fatal — we keep the existing skew anchor.
        }
      })();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Tick once per second. We compute the value rather than store it to avoid drift.
  const [, force] = React.useReducer((x: number) => x + 1, 0);
  React.useEffect(() => {
    if (!deadlineAt) return;
    const id = window.setInterval(() => force(), 250);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  if (!deadlineAt) {
    return { remainingMs: null, remainingSeconds: null, isUrgent: false, isExpired: false };
  }

  const estimatedServerNow = Date.now() + skewRef.current;
  const remaining = Math.max(0, new Date(deadlineAt).getTime() - estimatedServerNow);
  return {
    remainingMs: remaining,
    remainingSeconds: Math.ceil(remaining / 1000),
    isUrgent: remaining > 0 && remaining <= URGENT_THRESHOLD_MS,
    isExpired: remaining <= 0,
  };
}
