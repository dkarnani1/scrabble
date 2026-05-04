'use client';

// Hero indicator that makes turn ownership unambiguous within 1 second of glance.
// Three states:
//   - 'mine'      → "Your turn" with a strong accent
//   - 'theirs'    → "{name}'s turn" with a calmer treatment
//   - 'window'    → "Challenge window" while phase = 'challenge-window'

import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type TurnBannerProps = {
  state: 'mine' | 'theirs' | 'window' | 'completed';
  opponentName: string;
};

export function TurnBanner({ state, opponentName }: TurnBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
        state === 'mine' && 'bg-tile-edge text-tile-face shadow-sm',
        state === 'theirs' && 'bg-board-base/80 text-tile-ink/80',
        state === 'window' && 'bg-premium-tw/10 text-premium-tw',
        state === 'completed' && 'bg-board-base/60 text-tile-ink/60',
      )}
      data-testid="turn-banner"
      data-turn-state={state}
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          state === 'mine' && 'bg-tile-face animate-pulse',
          state === 'theirs' && 'bg-tile-ink/40',
          state === 'window' && 'bg-premium-tw',
          state === 'completed' && 'bg-tile-ink/30',
        )}
      />
      {state === 'mine' && 'Your turn'}
      {state === 'theirs' && `${opponentName}’s turn`}
      {state === 'window' && 'Challenge window — 3 seconds'}
      {state === 'completed' && 'Game over'}
    </div>
  );
}
