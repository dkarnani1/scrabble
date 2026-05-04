'use client';

import * as React from 'react';
import { TileChip } from './TileChip';
import type { RackTileSlot } from '@ui/hooks/use-tentative-board';

export type RackProps = {
  slots: ReadonlyArray<RackTileSlot>;
  selectedRackIndex: number | null;
  onSelectTile: (rackIndex: number | null) => void;
  disabled?: boolean;
};

export function Rack({ slots, selectedRackIndex, onSelectTile, disabled }: RackProps) {
  return (
    <div
      className={[
        // On small screens stick the rack to the bottom of the viewport like a sheet
        // so the player's tiles are always reachable with one thumb. md+ collapses to
        // an inline strip beneath the board.
        'flex flex-wrap items-center justify-center gap-2 rounded-md border border-board-line bg-board-base/80 p-3 backdrop-blur-sm',
        'sm:static sm:max-w-full',
        'fixed inset-x-2 bottom-2 z-20 shadow-lg sm:relative sm:inset-auto sm:bottom-auto sm:shadow-none',
      ].join(' ')}
      role="group"
      aria-label="Your tile rack"
    >
      {slots.length === 0 && <span className="text-sm text-tile-ink/60">Rack empty</span>}
      {slots.map((slot) =>
        slot.placedAt !== null ? (
          <div
            key={slot.rackIndex}
            className="h-11 w-11 rounded-md border border-dashed border-board-line bg-board-base/30 sm:h-12 sm:w-12"
            aria-label="placed on board"
          />
        ) : (
          <TileChip
            key={slot.rackIndex}
            tile={slot.tile}
            selected={selectedRackIndex === slot.rackIndex}
            disabled={disabled}
            onClick={() =>
              onSelectTile(selectedRackIndex === slot.rackIndex ? null : slot.rackIndex)
            }
          />
        ),
      )}
    </div>
  );
}
