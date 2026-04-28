'use client';

import * as React from 'react';
import { cn } from '@ui/lib/classnames';
import type { Tile } from '@rules/types';

export type TileChipProps = {
  tile: Tile;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
  size?: 'sm' | 'md' | undefined;
};

export function TileChip({ tile, selected, disabled, onClick, size = 'md' }: TileChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center rounded-md border border-tile-edge bg-tile-face shadow-sm transition',
        size === 'sm' ? 'h-9 w-9 text-sm' : 'h-12 w-12 text-base',
        selected && 'ring-2 ring-tile-edge translate-y-[-2px]',
        disabled && 'opacity-40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge',
        'hover:translate-y-[-1px]',
      )}
    >
      <span className="font-semibold text-tile-ink">{letterFor(tile)}</span>
      {tile.kind === 'letter' && <span className="text-[9px] text-tile-ink/70">{tile.value}</span>}
    </button>
  );
}

function letterFor(tile: Tile): string {
  if (tile.kind === 'blank') return tile.assigned ?? '?';
  return tile.letter;
}
