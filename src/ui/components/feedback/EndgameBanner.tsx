'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import type { GameResult, PlayerSlot } from '@rules/types';

export type EndgameBannerProps = {
  result: GameResult;
  mySlot: PlayerSlot | null;
  displayNameBySlot: Partial<Record<PlayerSlot, string>>;
  className?: string;
};

const REASON_LABEL: Record<GameResult['endedReason'], string> = {
  'out-of-tiles': 'No tiles left',
  'six-pass-termination': 'Six consecutive passes',
  abandoned: 'Game abandoned',
};

export function EndgameBanner({
  result,
  mySlot,
  displayNameBySlot,
  className,
}: EndgameBannerProps) {
  const isTie = result.winnerSlot === 'tie';
  const youWon = !isTie && mySlot !== null && result.winnerSlot === mySlot;
  const winnerSlot = isTie ? null : (result.winnerSlot as PlayerSlot);
  const winnerName =
    winnerSlot === null ? null : (displayNameBySlot[winnerSlot] ?? `Player ${winnerSlot + 1}`);

  return (
    <section
      className={cn(
        'rounded-lg border p-5 shadow-sm',
        isTie
          ? 'border-board-line bg-board-base/70'
          : youWon
            ? 'border-tile-edge bg-tile-edge/10'
            : 'border-board-line bg-board-base/70',
        className,
      )}
      data-testid="endgame-banner"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-tile-edge">Game over</p>
      <h2 className="mt-1 text-2xl font-semibold">
        {isTie ? 'It’s a tie.' : youWon ? 'You won!' : `${winnerName} wins`}
      </h2>
      <p className="mt-1 text-sm text-tile-ink/70">{REASON_LABEL[result.endedReason]}</p>
    </section>
  );
}
