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
    <div className="flex items-center justify-center gap-2 rounded-md border border-board-line bg-board-base/60 p-3">
      {slots.length === 0 && <span className="text-sm text-tile-ink/60">Rack empty</span>}
      {slots.map((slot) =>
        slot.placedAt !== null ? (
          // Placed slots show a faded placeholder so the rack keeps its 7-tile layout.
          <div
            key={slot.rackIndex}
            className="h-12 w-12 rounded-md border border-dashed border-board-line bg-board-base/30"
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
