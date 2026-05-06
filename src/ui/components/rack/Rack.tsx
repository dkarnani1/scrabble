'use client';

import * as React from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { TileChip } from './TileChip';
import { cn } from '@ui/lib/classnames';
import type { RackTileSlot } from '@ui/hooks/use-tentative-board';

export type RackProps = {
  slots: ReadonlyArray<RackTileSlot>;
  selectedRackIndex: number | null;
  onSelectTile: (rackIndex: number | null) => void;
  disabled?: boolean;
  /** rackIndex of the currently dragging rack tile, if any. */
  activeDragRackIndex?: number | null;
  /** Embed mode — drop the outer chrome (used inside RackSheet). */
  unstyled?: boolean;
  /**
   * Fired when a rack tile is click-selected (not deselected). Lets the parent
   * play the pickup sound without having to thread a sound hook through the
   * rack tree.
   */
  onPickupSelect?: () => void;
};

export function Rack({
  slots,
  selectedRackIndex,
  onSelectTile,
  disabled,
  activeDragRackIndex = null,
  unstyled = false,
  onPickupSelect,
}: RackProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: 'rack' });

  // flex-nowrap so the rack stays a single row at every breakpoint; with the
  // compressed tile size below sm (see TileChip) all 7 tiles + gaps fit at 360
  // px. overflow-x-auto is the safety belt for narrower / future widths.
  const containerClass = unstyled
    ? cn(
        'flex flex-nowrap items-center justify-center gap-1 overflow-x-auto p-2 transition-colors duration-150',
        'sm:gap-2 sm:p-3',
        isOver && 'bg-tile-edge/10',
      )
    : cn(
        'flex flex-nowrap items-center justify-center gap-1 overflow-x-auto rounded-md border border-board-line bg-board-base/80 p-2 backdrop-blur-sm transition-colors duration-150',
        'sm:static sm:max-w-full sm:gap-2 sm:p-3',
        'fixed inset-x-2 bottom-2 z-20 shadow-lg sm:relative sm:inset-auto sm:bottom-auto sm:shadow-none',
        isOver && 'bg-tile-edge/10 ring-2 ring-tile-edge',
      );

  return (
    <div ref={setDropRef} className={containerClass} role="group" aria-label="Your tile rack">
      {slots.length === 0 && <span className="text-sm text-tile-ink/60">Rack empty</span>}
      {slots.map((slot) => {
        if (slot.placedAt !== null) {
          // Even when the tile is currently on the board, the rack still owns this slot
          // visually as a dashed empty space. When the rack is hovered as a drop target,
          // outline this gap so the user sees where the tile will land on recall.
          return (
            <div
              key={slot.rackIndex}
              className={cn(
                // Match the active tile's footprint per breakpoint so the rack
                // doesn't reflow as tiles move on/off the board.
                'h-9 w-9 shrink-0 rounded-md border border-dashed border-board-line bg-board-base/30 transition-colors sm:h-12 sm:w-12',
                isOver && 'border-tile-edge bg-tile-edge/10',
              )}
              aria-label="placed on board"
            />
          );
        }

        return (
          <DraggableRackTile
            key={slot.rackIndex}
            slot={slot}
            disabled={disabled}
            selected={selectedRackIndex === slot.rackIndex}
            onClick={() => {
              const willSelect = selectedRackIndex !== slot.rackIndex;
              onSelectTile(willSelect ? slot.rackIndex : null);
              if (willSelect && onPickupSelect) onPickupSelect();
            }}
            isDragSource={activeDragRackIndex === slot.rackIndex}
            dimmed={activeDragRackIndex !== null && activeDragRackIndex !== slot.rackIndex}
          />
        );
      })}
    </div>
  );
}

type DraggableRackTileProps = {
  slot: RackTileSlot;
  disabled?: boolean | undefined;
  selected: boolean;
  onClick: () => void;
  isDragSource: boolean;
  dimmed: boolean;
};

function DraggableRackTile({
  slot,
  disabled,
  selected,
  onClick,
  isDragSource,
  dimmed,
}: DraggableRackTileProps) {
  const { setNodeRef, listeners, attributes } = useDraggable({
    id: `rack-${slot.rackIndex}`,
    disabled: disabled ?? false,
    data: { kind: 'rack', rackIndex: slot.rackIndex },
  });

  return (
    <TileChip
      tile={slot.tile}
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      layoutId={`rack-tile-${slot.rackIndex}`}
      dragRef={setNodeRef}
      dragListeners={listeners as unknown as Record<string, unknown>}
      dragAttributes={attributes as unknown as Record<string, unknown>}
      isDragSource={isDragSource}
      dimmed={dimmed}
      ariaRoleDescription="draggable tile"
    />
  );
}
