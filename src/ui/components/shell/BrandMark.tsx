import * as React from 'react';
import { cn } from '@ui/lib/classnames';

export type BrandMarkProps = {
  /** Smaller variant for compact slots (header on mobile). */
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * Inline tile-glyph wordmark. The square with the centered "S" mimics a
 * Scrabble tile (token-aligned `tile-face`/`tile-edge`/`tile-ink`) without
 * shipping a raster asset, so it scales cleanly inside the sticky header.
 */
export function BrandMark({ size = 'md', className }: BrandMarkProps) {
  const dim = size === 'sm' ? 22 : 26;
  const text = size === 'sm' ? 'text-sm' : 'text-base';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 font-display font-bold tracking-tight',
        className,
      )}
    >
      <svg
        aria-hidden
        width={dim}
        height={dim}
        viewBox="0 0 26 26"
        className="shrink-0"
        role="presentation"
      >
        <rect
          x="1.5"
          y="1.5"
          width="23"
          height="23"
          rx="4"
          fill="var(--color-tile-face, #f6e2b3)"
          stroke="var(--color-tile-edge, #a07a3b)"
          strokeWidth="1.5"
        />
        <text
          x="13"
          y="17.2"
          textAnchor="middle"
          fontFamily="var(--font-display, var(--font-sans))"
          fontWeight="700"
          fontSize="14"
          fill="var(--color-tile-ink, #2c1f0e)"
        >
          S
        </text>
        <text
          x="20"
          y="22"
          textAnchor="middle"
          fontFamily="var(--font-display, var(--font-sans))"
          fontWeight="600"
          fontSize="6"
          fill="var(--color-tile-ink, #2c1f0e)"
          opacity="0.7"
        >
          1
        </text>
      </svg>
      <span className={cn(text, 'text-tile-ink')}>Scrabble</span>
    </span>
  );
}
