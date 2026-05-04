'use client';

// Banner shown briefly after a challenge resolves. Two states: upheld (move stands,
// challenger forfeits next turn) and rejected (move reversed; placer's turn ended).

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import type { ChallengeOutcome } from '@rules/types';

export type ChallengeOutcomeBannerProps = {
  outcome: ChallengeOutcome;
  challengerName: string;
  placerName: string;
  /** Auto-dismiss after this many ms; pass null to keep it open. */
  dismissAfterMs?: number | null;
  onDismiss?: () => void;
};

export function ChallengeOutcomeBanner({
  outcome,
  challengerName,
  placerName,
  dismissAfterMs = 4000,
  onDismiss,
}: ChallengeOutcomeBannerProps) {
  React.useEffect(() => {
    if (dismissAfterMs == null || !onDismiss) return;
    const id = window.setTimeout(onDismiss, dismissAfterMs);
    return () => window.clearTimeout(id);
  }, [dismissAfterMs, onDismiss]);

  if (outcome.kind === 'unchallenged') return null;

  if (outcome.kind === 'challenged-invalid') {
    const words = outcome.invalidWords.join(', ');
    return (
      <div
        role="status"
        className={cn(
          'rounded-md border border-premium-tw/50 bg-premium-tw/10 px-3 py-2 text-sm text-premium-tw',
        )}
      >
        <p className="font-semibold">Challenge upheld</p>
        <p className="text-xs">
          {challengerName} challenged {placerName}.{' '}
          {words ? `"${words}" not in dictionary.` : 'Move reversed.'} {placerName} loses the turn.
        </p>
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cn(
        'rounded-md border border-tile-edge/40 bg-tile-face px-3 py-2 text-sm text-tile-ink',
      )}
    >
      <p className="font-semibold">Challenge rejected</p>
      <p className="text-xs">
        {challengerName}&rsquo;s challenge failed; {placerName}&rsquo;s move stands.{' '}
        {challengerName} forfeits their next turn.
      </p>
    </div>
  );
}
