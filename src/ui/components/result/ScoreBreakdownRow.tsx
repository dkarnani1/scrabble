'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { AnimatedScore } from '@ui/components/hud/AnimatedScore';
import { cn } from '@ui/lib/classnames';

export type ScoreBreakdownRowProps = {
  label: string;
  /** Per-side numeric value. Pass null/undefined to render an em dash on that side. */
  youValue?: number | null;
  opponentValue?: number | null;
  /** Static text override per side (for non-numeric rows like "best word"). When set,
   * it takes precedence over the corresponding *Value field. */
  youText?: string;
  opponentText?: string;
  /** Stagger reveal — row fades up after this delay. */
  delayMs?: number;
  className?: string;
};

/**
 * One line in the endgame breakdown: a centered label flanked by per-player
 * values that count up from 0. Used inside `EndgameOverlay` for total moves,
 * bingos played, and the inferred end-game adjustment. For non-numeric data
 * (best word string), pass `youText` / `opponentText` instead.
 */
export function ScoreBreakdownRow({
  label,
  youValue,
  opponentValue,
  youText,
  opponentText,
  delayMs = 0,
  className,
}: ScoreBreakdownRowProps) {
  const reduce = useReducedMotion();

  // Defer the actual values so AnimatedScore animates from 0 → final on mount.
  // Without this, AnimatedScore's first-render branch snaps to the value
  // instantly and you lose the count-up feeling.
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    if (reduce) {
      setRevealed(true);
      return;
    }
    const id = window.setTimeout(() => setRevealed(true), delayMs + 80);
    return () => window.clearTimeout(id);
  }, [delayMs, reduce]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut', delay: delayMs / 1000 }}
      className={cn(
        'grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-board-line/40 py-2 text-sm last:border-b-0',
        className,
      )}
    >
      <Cell value={youValue} text={youText} revealed={revealed} align="right" />
      <span
        aria-hidden
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tile-ink/55"
      >
        {label}
      </span>
      <Cell value={opponentValue} text={opponentText} revealed={revealed} align="left" />
    </motion.div>
  );
}

function Cell({
  value,
  text,
  revealed,
  align,
}: {
  value?: number | null | undefined;
  text?: string | undefined;
  revealed: boolean;
  align: 'left' | 'right';
}) {
  const justify = align === 'right' ? 'justify-end' : 'justify-start';
  if (text !== undefined) {
    return (
      <div className={cn('flex items-baseline gap-1', justify)}>
        <span className="font-display text-base font-semibold text-tile-ink">{text}</span>
      </div>
    );
  }
  if (value === null || value === undefined) {
    return (
      <div className={cn('flex items-baseline gap-1 text-tile-ink/40', justify)}>
        <span className="font-display text-base">—</span>
      </div>
    );
  }
  // Sign for adjustment-style rows: render +N or -N with appropriate color.
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  const colorClass = value > 0 ? 'text-tile-edge' : value < 0 ? 'text-premium-tw' : 'text-tile-ink';
  return (
    <div className={cn('flex items-baseline gap-1', justify)}>
      {sign && (
        <span className={cn('font-display text-base font-semibold', colorClass)}>{sign}</span>
      )}
      <AnimatedScore
        value={revealed ? Math.abs(value) : 0}
        className={cn('text-base', colorClass)}
        durationMs={650}
      />
    </div>
  );
}
