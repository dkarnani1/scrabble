'use client';

// Tiny non-interactive 5x5 board used in the marketing hero. A "ghost" tile
// places, slides, and recalls in a 6-second loop. Pointer events are off so
// nothing is accidentally interactive.

import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';

type Cell = { letter: string; value: number; premium?: 'DL' | 'TL' | 'DW' | 'TW' | 'CENTER' };

// 5x5 grid. Center row spells WORD; column 1 spells CAT crossing on the 'A'.
// Premium squares scattered for visual interest.
const GRID: ReadonlyArray<ReadonlyArray<Cell | null>> = [
  [
    { letter: '', value: 0, premium: 'TW' },
    null,
    { letter: '', value: 0, premium: 'DL' },
    null,
    { letter: '', value: 0, premium: 'TW' },
  ],
  [null, { letter: '', value: 0, premium: 'DW' }, null, null, null],
  [
    { letter: 'W', value: 4 },
    { letter: 'O', value: 1 },
    { letter: 'R', value: 1 },
    { letter: 'D', value: 2 },
    null,
  ],
  [null, null, { letter: 'C', value: 3 }, null, null],
  [
    { letter: '', value: 0, premium: 'TW' },
    null,
    { letter: 'A', value: 1 },
    null,
    { letter: '', value: 0, premium: 'DL' },
  ],
];

const PREMIUM_BG: Record<NonNullable<Cell['premium']>, string> = {
  DL: 'bg-premium-dl',
  TL: 'bg-premium-tl',
  DW: 'bg-premium-dw',
  TW: 'bg-premium-tw',
  CENTER: 'bg-premium-center',
};

const PREMIUM_LABEL: Record<NonNullable<Cell['premium']>, string> = {
  DL: 'DL',
  TL: 'TL',
  DW: 'DW',
  TW: 'TW',
  CENTER: '★',
};

// Per-premium label color so dark labels don't sit on dark TW/TL fills (axe
// color-contrast). Mirrors `Square.tsx`'s treatment so the mini-board reads
// like a real square.
const PREMIUM_LABEL_CLASS: Record<NonNullable<Cell['premium']>, string> = {
  DL: 'text-tile-ink/85',
  TL: 'text-board-base drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]',
  DW: 'text-tile-ink/85',
  TW: 'text-board-base drop-shadow-[0_1px_0_rgba(0,0,0,0.2)]',
  CENTER: 'text-tile-ink/75',
};

// Where the ghost T tile loops in/out of the board: completes the word "CAT"
// vertically by landing on the bottom row.
const GHOST = { row: 3, col: 2, letter: 'T', value: 1 };

export function MiniBoardDemo({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  // Phase: 'idle' (rack) → 'placed' (on board) → 'idle' …
  const [placed, setPlaced] = React.useState(false);

  React.useEffect(() => {
    if (reduce) {
      setPlaced(true);
      return;
    }
    let mounted = true;
    const cycle = () => {
      if (!mounted) return;
      setPlaced(true);
      window.setTimeout(() => {
        if (!mounted) return;
        setPlaced(false);
        window.setTimeout(cycle, 1500);
      }, 3500);
    };
    const id = window.setTimeout(cycle, 600);
    return () => {
      mounted = false;
      window.clearTimeout(id);
    };
  }, [reduce]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none relative select-none rounded-xl bg-board-felt bg-felt-noise p-3 shadow-board-deep ring-1 ring-tile-ink/10',
        className,
      )}
    >
      <div
        className="grid w-full gap-[3px] bg-tile-ink/15"
        style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
      >
        {GRID.flatMap((row, r) =>
          row.map((cell, c) => {
            const key = `${r}-${c}`;
            const isGhost = r === GHOST.row && c === GHOST.col;
            const premiumBg = cell?.premium ? PREMIUM_BG[cell.premium] : 'bg-board-base/40';
            const showLetter = cell && cell.letter;
            return (
              <div
                key={key}
                className={cn(
                  'relative flex aspect-square items-center justify-center text-[10px] font-semibold sm:text-xs',
                  premiumBg,
                  'shadow-square-inset-soft',
                )}
              >
                {!showLetter && cell?.premium && (
                  <span
                    className={cn('font-display tracking-tight', PREMIUM_LABEL_CLASS[cell.premium])}
                  >
                    {PREMIUM_LABEL[cell.premium]}
                  </span>
                )}
                {showLetter && (
                  <span className="flex h-[88%] w-[88%] flex-col items-center justify-center rounded-sm border border-tile-edge/60 bg-tile-face bg-wood-grain shadow-tile">
                    <Glyph letter={cell.letter} value={cell.value} />
                  </span>
                )}
                {isGhost && placed && (
                  <motion.span
                    layoutId="ghost-tile"
                    initial={reduce ? false : { y: -10, opacity: 0, scale: 1.05 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                    className={cn(
                      'absolute inset-1 flex items-center justify-center rounded-sm border border-tile-edge/60 bg-tile-face-tentative bg-wood-grain shadow-tile-tentative',
                      "after:content-[''] after:absolute after:top-1 after:right-1 after:h-1.5 after:w-1.5 after:rounded-full after:bg-tile-edge",
                    )}
                  >
                    <Glyph letter={GHOST.letter} value={GHOST.value} />
                  </motion.span>
                )}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

function Glyph({ letter, value }: { letter: string; value: number }) {
  return (
    <span className="relative flex h-full w-full items-center justify-center">
      <span className="font-display text-[13px] font-semibold leading-none text-tile-ink sm:text-base">
        {letter}
      </span>
      {value > 0 && (
        <span className="absolute bottom-0.5 right-1 font-display text-[8px] leading-none text-tile-ink/70 sm:text-[9px]">
          {value}
        </span>
      )}
    </span>
  );
}
