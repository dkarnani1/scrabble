'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';
import type { Tile } from '@rules/types';

export type TileChipProps = {
  tile: Tile;
  selected?: boolean | undefined;
  disabled?: boolean | undefined;
  onClick?: (() => void) | undefined;
  size?: 'sm' | 'md' | 'lg' | undefined;
  /**
   * Stable identifier for shared-layout animation when this chip's underlying
   * tile crosses the rack/board boundary. The Tile type itself has no id, so
   * the caller (Rack, BoardCanvas, etc.) is responsible for deriving one from
   * a stable slot/coord context.
   */
  layoutId?: string | undefined;
  /** dnd-kit setNodeRef + listeners + attributes for making this chip draggable. */
  dragRef?: ((el: HTMLButtonElement | null) => void) | undefined;
  dragListeners?: Record<string, unknown> | undefined;
  dragAttributes?: Record<string, unknown> | undefined;
  /** Source of an active drag — render invisible so the DragOverlay is the only visible copy. */
  isDragSource?: boolean | undefined;
  /** Any drag is active in the parent DnD context — non-source rack tiles dim. */
  dimmed?: boolean | undefined;
  /** Override aria-label (default uses tile letter + value). */
  ariaLabel?: string | undefined;
  /** Override aria-roledescription (default 'tile'). */
  ariaRoleDescription?: string | undefined;
  /** Tab order — defaults unset. */
  tabIndex?: number | undefined;
};

export function TileChip({
  tile,
  selected,
  disabled,
  onClick,
  size = 'md',
  layoutId,
  dragRef,
  dragListeners,
  dragAttributes,
  isDragSource,
  dimmed,
  ariaLabel,
  ariaRoleDescription,
  tabIndex,
}: TileChipProps) {
  const reduceMotion = useReducedMotion();
  const letter = letterFor(tile);

  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-lg'
      : size === 'lg'
        ? 'h-14 w-14 text-2xl'
        : // md compresses to 9 below sm so 7 tiles + gaps fit on a single row at
          // 360px; promotes back to 12 at sm+ to keep the desktop strip tactile.
          'h-9 w-9 text-base sm:h-12 sm:w-12 sm:text-xl';

  // Opacity is driven via inline style so it wins over both Tailwind class
  // ordering and motion's animate/whileHover/whileTap inline styles. Without
  // this, the source tile during a drag could remain visible at full opacity
  // because className-based opacity loses to the framework that owns `style`.
  const baseClass = cn(
    'relative flex shrink-0 items-center justify-center rounded-md border border-tile-edge/80 bg-tile-face bg-wood-grain text-tile-ink shadow-tile transition-[box-shadow,filter,opacity] duration-150 ease-out',
    sizeClass,
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-1 focus-visible:ring-offset-board-base',
    !disabled && !isDragSource && 'hover:shadow-tile-lift',
    selected && 'shadow-tile-lift ring-2 ring-tile-edge',
    disabled && 'grayscale-[20%] shadow-none',
    isDragSource && 'pointer-events-none',
  );

  const computedAriaLabel =
    ariaLabel ??
    (tile.kind === 'blank'
      ? `Blank tile${tile.assigned ? ` assigned ${tile.assigned}` : ''}, value 0`
      : `Tile ${tile.letter}, value ${tile.value}`);

  const computedAriaRoleDescription = ariaRoleDescription ?? 'tile';

  const content = (
    <>
      <span className="font-display font-semibold leading-none tabular-nums">{letter}</span>
      {tile.kind === 'letter' && (
        <span className="absolute bottom-0.5 right-1 font-display text-[10px] leading-none text-tile-ink/70 tabular-nums">
          {tile.value}
        </span>
      )}
    </>
  );

  const sharedProps = {
    type: 'button' as const,
    onClick,
    disabled,
    ...(tabIndex !== undefined ? { tabIndex } : {}),
    ...(dragListeners ?? {}),
    ...(dragAttributes ?? {}),
    // Ours wins over dnd-kit's defaults (e.g. roledescription="draggable").
    'aria-label': computedAriaLabel,
    'aria-roledescription': computedAriaRoleDescription,
  };

  // Disabled tiles also dim, but we don't want that dim multiplied by the drag-source
  // hide — disabled wins over dimmed only when no drag is active.
  const baseOpacity = disabled ? 0.4 : 1;
  const finalOpacity = isDragSource ? 0 : dimmed ? 0.6 : baseOpacity;

  if (reduceMotion) {
    return (
      <button
        ref={dragRef}
        {...sharedProps}
        style={{ opacity: finalOpacity }}
        className={cn(baseClass, selected && '-translate-y-1')}
      >
        {content}
      </button>
    );
  }

  return (
    <motion.button
      ref={dragRef}
      {...sharedProps}
      style={{ opacity: finalOpacity }}
      className={baseClass}
      {...(layoutId ? { layoutId } : {})}
      {...(disabled || isDragSource
        ? {}
        : { whileHover: { y: -2 }, whileTap: { y: 1, scale: 0.97 } })}
      animate={selected ? { y: -4 } : { y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      {content}
    </motion.button>
  );
}

function letterFor(tile: Tile): string {
  if (tile.kind === 'blank') return tile.assigned ?? '?';
  return tile.letter;
}
