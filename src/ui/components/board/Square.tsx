'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { cn } from '@ui/lib/classnames';
import type { PremiumKind, Tile } from '@rules/types';

export type SquareProps = {
  premium: PremiumKind;
  committedTile: Tile | null;
  tentativeTile: Tile | null;
  /** rackIndex of the tentative tile (if any) — needed so dnd-kit can identify the drag source. */
  tentativeRackIndex?: number | null;
  isLastMoveCell?: boolean | undefined;
  onClick?: (() => void) | undefined;
  ariaLabel: string;
  tabIndex?: number;
  /** Coordinates encoded for keyboard cursor focus lookups. */
  cursorKey?: string;
  /** Row and column — used to derive droppable + draggable ids. */
  r: number;
  c: number;
  /** When false, this square is not a valid drop target (committed or already tentatively occupied by another). */
  canAcceptDrop?: boolean;
  /** When false (e.g. not your turn), drag-and-drop interactions are inert. */
  dndEnabled?: boolean;
};

const PREMIUM_LABEL: Record<PremiumKind, string> = {
  none: '',
  DL: 'DL',
  TL: 'TL',
  DW: 'DW',
  TW: 'TW',
  CENTER: '★',
};

const PREMIUM_BG: Record<PremiumKind, string> = {
  none: 'bg-board-base/40',
  DL: 'bg-premium-dl',
  TL: 'bg-premium-tl',
  DW: 'bg-premium-dw',
  TW: 'bg-premium-tw',
  CENTER: 'bg-premium-center',
};

const PREMIUM_LABEL_CLASS: Record<PremiumKind, string> = {
  none: 'hidden',
  DL: 'text-tile-ink/80',
  TL: 'text-board-base drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]',
  DW: 'text-tile-ink/80',
  TW: 'text-board-base drop-shadow-[0_1px_0_rgba(0,0,0,0.15)]',
  CENTER: 'text-tile-ink/65',
};

const PREMIUM_INSET: Record<PremiumKind, string> = {
  none: 'shadow-square-inset',
  DL: 'shadow-square-inset-soft',
  TL: 'shadow-square-inset-soft',
  DW: 'shadow-square-inset-soft',
  TW: 'shadow-square-inset-soft',
  CENTER: 'shadow-square-inset-soft',
};

export function Square({
  premium,
  committedTile,
  tentativeTile,
  tentativeRackIndex = null,
  isLastMoveCell,
  onClick,
  ariaLabel,
  tabIndex,
  cursorKey,
  r,
  c,
  canAcceptDrop = true,
  dndEnabled = true,
}: SquareProps) {
  const reduceMotion = useReducedMotion();
  const tile = committedTile ?? tentativeTile;
  const isTentative = tile && committedTile === null && tentativeTile !== null;
  const tentativeKey =
    isTentative && tile ? `tent-${letterFor(tile)}-${cursorKey ?? ''}` : undefined;

  // Droppable wraps the whole square. Disabled when not dnd-enabled or square can't accept a tile.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `sq-${r}-${c}`,
    disabled: !dndEnabled || !canAcceptDrop,
  });

  // Draggable for the tentative tile (if any). Hooks must run unconditionally —
  // when no tentative tile exists we just don't apply the listeners.
  const draggableId = tentativeRackIndex !== null ? `tent-${r}-${c}` : `tent-disabled-${r}-${c}`;
  const tentDraggable = useDraggable({
    id: draggableId,
    disabled: tentativeRackIndex === null || !dndEnabled,
    data: { kind: 'tentative', rackIndex: tentativeRackIndex, fromCoord: { r, c } },
  });

  const showDropHighlight = isOver && canAcceptDrop && dndEnabled;

  return (
    <button
      ref={setDropRef}
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      data-board-cursor={cursorKey}
      className={cn(
        'relative flex aspect-square w-full items-center justify-center text-xs font-semibold transition-[background-color,transform,box-shadow] duration-150',
        PREMIUM_BG[premium],
        PREMIUM_INSET[premium],
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-1 focus-visible:ring-offset-board-base',
        showDropHighlight && 'ring-2 ring-tile-edge bg-tile-edge/10',
        showDropHighlight && !reduceMotion && 'scale-[1.04]',
      )}
      data-last-move={isLastMoveCell ? 'true' : undefined}
    >
      {isLastMoveCell && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-sm ring-2 ring-tile-edge/60 animate-square-pulse"
        />
      )}
      {!tile && (
        <span
          className={cn(
            'select-none font-display text-[11px] font-semibold uppercase tracking-tight sm:text-[12px]',
            PREMIUM_LABEL_CLASS[premium],
          )}
        >
          {PREMIUM_LABEL[premium]}
        </span>
      )}
      {tile && !isTentative && (
        <span
          className={cn(
            'flex h-[88%] w-[88%] flex-col items-center justify-center rounded-sm border border-tile-edge/60 bg-tile-face bg-wood-grain shadow-tile',
          )}
        >
          <TileGlyph tile={tile} />
        </span>
      )}
      {tile &&
        isTentative &&
        (reduceMotion ? (
          <span
            ref={tentDraggable.setNodeRef as unknown as React.Ref<HTMLSpanElement>}
            {...(tentDraggable.listeners ?? {})}
            {...(tentDraggable.attributes ?? {})}
            aria-roledescription="draggable tile"
            className={cn(
              'relative flex h-[88%] w-[88%] flex-col items-center justify-center rounded-sm bg-tile-face-tentative bg-wood-grain shadow-tile-tentative -translate-y-1',
              "after:content-[''] after:absolute after:top-1 after:right-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-tile-edge",
              tentDraggable.isDragging && 'opacity-0',
            )}
          >
            <TileGlyph tile={tile} />
          </span>
        ) : (
          <motion.span
            key={tentativeKey}
            ref={tentDraggable.setNodeRef as unknown as React.Ref<HTMLSpanElement>}
            {...(tentDraggable.listeners ?? {})}
            {...(tentDraggable.attributes ?? {})}
            aria-roledescription="draggable tile"
            {...(tentativeKey ? { layoutId: tentativeKey } : {})}
            initial={{ y: -8, scale: 1.08, opacity: 0 }}
            animate={{ y: -4, scale: 1, opacity: tentDraggable.isDragging ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 28 }}
            className={cn(
              'relative flex h-[88%] w-[88%] flex-col items-center justify-center rounded-sm bg-tile-face-tentative bg-wood-grain shadow-tile-tentative',
              "after:content-[''] after:absolute after:top-1 after:right-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-tile-edge",
            )}
          >
            <TileGlyph tile={tile} />
          </motion.span>
        ))}
    </button>
  );
}

function TileGlyph({ tile }: { tile: Tile }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span className="font-display text-base font-semibold leading-none text-tile-ink tabular-nums">
        {letterFor(tile)}
      </span>
      {tile.kind === 'letter' && (
        <span className="absolute bottom-0.5 right-1 font-display text-[9px] leading-none text-tile-ink/70 tabular-nums">
          {tile.value}
        </span>
      )}
    </span>
  );
}

function letterFor(tile: Tile): string {
  if (tile.kind === 'blank') return tile.assigned ?? '?';
  return tile.letter;
}
