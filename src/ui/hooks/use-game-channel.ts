'use client';

// React hook that subscribes to a game's realtime channel and reconciles snapshots.
// On every change it invokes the supplied `refetch()` so the page re-renders from the
// authoritative server view. The hook also detects seq gaps (when a move arrives whose
// seq is not exactly history.length + 1) and forces a refetch — that is the simplest
// correct behavior for v1; later phases can pursue a delta-merge optimization.

import * as React from 'react';
import { subscribeToGame, type GameChangeEvent } from '@realtime/game-channel';

export type UseGameChannelArgs = {
  gameId: string;
  currentSeq: number;
  onRefetch: () => void;
};

export function useGameChannel({ gameId, currentSeq, onRefetch }: UseGameChannelArgs) {
  const seqRef = React.useRef(currentSeq);
  React.useEffect(() => {
    seqRef.current = currentSeq;
  }, [currentSeq]);

  const refetch = React.useCallback(() => {
    onRefetch();
  }, [onRefetch]);

  React.useEffect(() => {
    let cancelled = false;
    const onChange = (event: GameChangeEvent) => {
      if (cancelled) return;
      if (event.kind === 'move-inserted') {
        const seq = (event.row['seq'] as number) ?? 0;
        // If the new seq is exactly seqRef.current + 1, the local state will catch up
        // when refetch lands. If there is a gap, force a refetch as well — same call,
        // but logged so we can tell the difference in CI.
        if (seq > seqRef.current + 1) {
          console.warn(`[game-channel] seq gap: have ${seqRef.current}, got ${seq}`);
        }
      }
      refetch();
    };
    const unsubscribe = subscribeToGame({
      gameId,
      onChange,
      onStatusChange: (status) => {
        // On (re)subscribe, force a full refetch so any state we missed while the
        // socket was down lands immediately. This is the reconnect-reconciliation path
        // for FR-070..072 (US6).
        if (status === 'subscribed' && !cancelled) refetch();
      },
    });
    return () => {
      cancelled = true;
      void unsubscribe();
    };
  }, [gameId, refetch]);
}
