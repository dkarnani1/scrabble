'use client';

import * as React from 'react';
import { EndgameOverlay, type EndgameOverlayProps } from './EndgameOverlay';

export type EndgameOverlayMountProps = EndgameOverlayProps & {
  /**
   * Stable game id used as the key for the per-game sessionStorage de-dup.
   * Confetti fires once per game per browser session — refreshing the result
   * page replays the score animation but skips confetti.
   */
  gameId: string;
};

const STORAGE_PREFIX = 'endgame-confetti:';

/**
 * Thin client-side wrapper around `<EndgameOverlay>` that handles the
 * "fire confetti only once per game per session" rule. Reading
 * sessionStorage in a useEffect (not a useState initializer) keeps the
 * server-rendered HTML stable, which avoids a hydration mismatch.
 */
export function EndgameOverlayMount({ gameId, ...rest }: EndgameOverlayMountProps) {
  const [shouldFire, setShouldFire] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_PREFIX}${gameId}`;
    try {
      if (window.sessionStorage.getItem(key)) {
        setShouldFire(false);
        return;
      }
      window.sessionStorage.setItem(key, '1');
    } catch {
      // Private mode or storage disabled — fire anyway, fail open.
    }
    setShouldFire(true);
  }, [gameId]);

  return <EndgameOverlay {...rest} fireConfetti={shouldFire} />;
}
