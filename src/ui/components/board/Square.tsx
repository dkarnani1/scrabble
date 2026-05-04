'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import type { PremiumKind, Tile } from '@rules/types';

export type SquareProps = {
  premium: PremiumKind;
  committedTile: Tile | null;
  tentativeTile: Tile | null;
  isLastMoveCell?: boolean | undefined;
  onClick?: (() => void) | undefined;
  ariaLabel: string;
  tabIndex?: number;
  /** Coordinates encoded for keyboard cursor focus lookups. */
  cursorKey?: string;
};

const PREMIUM_LABEL: Record<PremiumKind, string> = {
  none: '',
  DL: 'DL',
  TL: 'TL',
  DW: 'DW',
  TW: 'TW',
  CENTER: '★',
};

const PREMIUM_COLOR: Record<PremiumKind, string> = {
  none: 'bg-board-base',
  DL: 'bg-premium-dl/40',
  TL: 'bg-premium-tl/30',
  DW: 'bg-premium-dw/40',
  TW: 'bg-premium-tw/30',
  CENTER: 'bg-board-star/30',
};

export function Square({
  premium,
  committedTile,
  tentativeTile,
  isLastMoveCell,
  onClick,
  ariaLabel,
  tabIndex,
  cursorKey,
}: SquareProps) {
  const tile = committedTile ?? tentativeTile;
  const isTentative = tile && committedTile === null && tentativeTile !== null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-board-cursor={cursorKey}
      className={cn(
        'relative flex aspect-square w-full items-center justify-center border border-board-line/60 text-xs font-semibold transition-[transform,background-color] duration-200',
        PREMIUM_COLOR[premium],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge',
      )}
      data-last-move={isLastMoveCell ? 'true' : undefined}
    >
      {/* Animated last-move overlay. Persists as long as `isLastMoveCell` is true,
          which the parent keeps set until the next move arrives — naturally ≥ 3s in
          live play. The ping animation gently calls attention without strobing. */}
      {isLastMoveCell && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-tile-edge/80 animate-[pulse_1.6s_ease-in-out_infinite]"
        />
      )}
      {!tile && (
        <span className="select-none text-[10px] font-medium uppercase tracking-tight text-tile-ink/50">
          {PREMIUM_LABEL[premium]}
        </span>
      )}
      {tile && (
        <span
          className={cn(
            'flex h-[88%] w-[88%] flex-col items-center justify-center rounded-sm shadow-sm transition-transform duration-150',
            isTentative ? 'bg-tile-face/80 ring-1 ring-tile-edge -translate-y-0.5' : 'bg-tile-face',
          )}
        >
          <span className="text-base text-tile-ink">{letterFor(tile)}</span>
          {tile.kind === 'letter' && (
            <span className="text-[8px] text-tile-ink/70">{tile.value}</span>
          )}
        </span>
      )}
    </button>
  );
}

function letterFor(tile: Tile): string {
  if (tile.kind === 'blank') return tile.assigned ?? '?';
  return tile.letter;
}
