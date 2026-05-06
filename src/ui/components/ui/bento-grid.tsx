'use client';

// Custom bento grid built on Tailwind. The Magic MCP wasn't reachable from this
// session, so this is a hand-rolled equivalent — same path so a future MCP swap
// drops in cleanly. Uses our scrabble-art-direction tokens (board-base,
// tile-ink, shadow-tile-lift, bg-board-felt + bg-felt-noise) instead of the
// generic neutral palette an out-of-the-box bento ships with.

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';

export type BentoGridProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * 4-column grid on desktop, 2-column on mobile. Tiles control their own row/
 * column span via `colSpan` / `rowSpan` on `<BentoTile>`. Children mount with a
 * small staggered fade so the page doesn't feel static; reduced-motion users
 * see them appear without animation.
 */
export function BentoGrid({ children, className }: BentoGridProps) {
  const reduce = useReducedMotion();

  // Wrap each child in a motion.div for the entrance stagger. Children that are
  // already motion components still work — this just adds an outer wrapper.
  const items = React.Children.toArray(children);

  return (
    <motion.div
      className={cn(
        // Auto-rows keep tiles tall enough to hold copy + a CTA without
        // collapsing in awkward shapes. minmax(0,1fr) lets large tiles grow.
        'grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:auto-rows-[minmax(140px,auto)]',
        className,
      )}
      initial={reduce ? false : 'hidden'}
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.05 },
        },
      }}
    >
      {items.map((child, i) => (
        <motion.div
          key={i}
          className="contents"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

export type BentoTileProps = {
  children: React.ReactNode;
  className?: string;
  /** Number of columns the tile spans on the md+ grid (1..4). Always 1 on mobile. */
  colSpan?: 1 | 2 | 3 | 4;
  /** Number of grid-rows the tile spans on md+. */
  rowSpan?: 1 | 2;
  /**
   * When true, the tile spans both columns on the 2-col mobile layout. Useful
   * for the hero / featured tile that should stay prominent on small screens.
   */
  fullOnMobile?: boolean;
  /** Render with the felt-noise gradient (the hero treatment). */
  featured?: boolean;
  /** When provided, the tile renders as an `<a>` and inherits hover lift. */
  href?: string;
  /** Click handler — renders the tile as a `<button>`. */
  onClick?: () => void;
  /** Aria-label override for link/button tiles. */
  ariaLabel?: string;
};

const COL_SPAN: Record<NonNullable<BentoTileProps['colSpan']>, string> = {
  1: 'md:col-span-1',
  2: 'md:col-span-2',
  3: 'md:col-span-3',
  4: 'md:col-span-4',
};

const ROW_SPAN: Record<NonNullable<BentoTileProps['rowSpan']>, string> = {
  1: 'md:row-span-1',
  2: 'md:row-span-2',
};

/**
 * Single bento tile. Renders as a real `<a>` or `<button>` if interactive,
 * otherwise as a styled `<div>`. Never wrap a div tile in a click handler —
 * containers with internal links should be plain divs and let the inner
 * `<a>` / `<button>` carry semantics.
 */
export function BentoTile({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  fullOnMobile,
  featured,
  href,
  onClick,
  ariaLabel,
}: BentoTileProps) {
  const base = cn(
    // Token-aligned card chrome: board-base background, a hairline ring instead
    // of a solid border, and a soft shadow that lifts on hover.
    'group relative flex h-full flex-col overflow-hidden rounded-xl bg-board-base p-5 ring-1 ring-tile-ink/10 shadow-sm',
    'transition-[transform,box-shadow,background-color] duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge focus-visible:ring-offset-2 focus-visible:ring-offset-board-base',
    fullOnMobile ? 'col-span-2' : 'col-span-1',
    COL_SPAN[colSpan],
    ROW_SPAN[rowSpan],
    featured && 'bg-board-felt bg-felt-noise text-tile-ink',
    (href || onClick) && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-tile-lift',
    className,
  );

  if (href) {
    return (
      <a href={href} aria-label={ariaLabel} className={base}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={ariaLabel}
        className={cn(base, 'text-left')}
      >
        {children}
      </button>
    );
  }
  return <div className={base}>{children}</div>;
}

export type BentoTileHeaderProps = {
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  className?: string;
};

/**
 * Standard header treatment for a non-hero tile: optional icon chip, an eyebrow
 * (uppercase tracked label), and a display-font title. Use this directly or
 * compose your own — most tiles call this then drop a paragraph beneath it.
 */
export function BentoTileHeader({ icon, eyebrow, title, className }: BentoTileHeaderProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-tile-edge/10 text-tile-edge ring-1 ring-tile-edge/20">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tile-edge">
            {eyebrow}
          </p>
        )}
        {title && (
          <h2 className="mt-0.5 font-display text-lg font-semibold leading-tight text-tile-ink">
            {title}
          </h2>
        )}
      </div>
    </div>
  );
}
