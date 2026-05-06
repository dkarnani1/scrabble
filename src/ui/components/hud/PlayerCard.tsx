'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '@ui/lib/classnames';
import { AnimatedScore } from './AnimatedScore';

export type PlayerCardProps = {
  name: string;
  score: number;
  isYou: boolean;
  isActive: boolean;
  isPresent: boolean;
  lastDelta?: number;
  align?: 'left' | 'right';
};

const AVATAR_PALETTE = [
  ['bg-tile-edge', 'text-tile-face'],
  ['bg-premium-tl', 'text-board-base'],
  ['bg-premium-tw', 'text-board-base'],
  ['bg-board-star', 'text-tile-ink'],
  ['bg-tile-ink', 'text-tile-face'],
  ['bg-premium-dl', 'text-tile-ink'],
] as const;

function hashToPalette(name: string): readonly [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length]!;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function PlayerCard({
  name,
  score,
  isYou,
  isActive,
  isPresent,
  lastDelta,
  align = 'left',
}: PlayerCardProps) {
  const reduceMotion = useReducedMotion();
  const [paletteBg, paletteText] = hashToPalette(name);
  const isRight = align === 'right';

  const [deltaToken, setDeltaToken] = React.useState<{ id: number; value: number } | null>(null);
  const lastDeltaRef = React.useRef<number | undefined>(lastDelta);
  const tokenIdRef = React.useRef(0);

  React.useEffect(() => {
    if (lastDelta === undefined) return;
    if (lastDelta === lastDeltaRef.current) return;
    lastDeltaRef.current = lastDelta;
    tokenIdRef.current += 1;
    const id = tokenIdRef.current;
    setDeltaToken({ id, value: lastDelta });
    const t = window.setTimeout(() => {
      setDeltaToken((cur) => (cur && cur.id === id ? null : cur));
    }, 1800);
    return () => window.clearTimeout(t);
  }, [lastDelta]);

  return (
    <div
      data-testid="player-card"
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        'relative flex items-center gap-3 rounded-lg px-3 py-2 transition-shadow duration-300',
        'bg-board-base/70 ring-1 ring-tile-ink/10',
        isActive &&
          'ring-2 ring-tile-edge/70 shadow-[0_0_24px_rgba(160,122,59,0.25)] bg-board-base/90',
        isRight && 'flex-row-reverse text-right',
      )}
    >
      {isActive && !reduceMotion && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-lg bg-tile-edge/15 blur-xl"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      <div
        aria-hidden
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold tabular-nums shadow-tile',
          paletteBg,
          paletteText,
        )}
      >
        {initials(name)}
      </div>

      <div className={cn('flex min-w-0 flex-col', isRight && 'items-end')}>
        <div
          className={cn(
            'flex items-center gap-1.5 text-sm font-medium text-tile-ink',
            isRight && 'flex-row-reverse',
          )}
        >
          <span className="truncate max-w-[8rem]" title={name}>
            {name}
          </span>
          {isYou && <span className="text-[11px] font-normal text-tile-ink/55">(you)</span>}
          <span
            aria-label={isPresent ? `${name} online` : `${name} offline`}
            title={isPresent ? 'Online' : 'Disconnected'}
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              isPresent ? 'bg-tile-edge' : 'bg-tile-ink/30',
            )}
          />
        </div>
        <div className="relative flex items-baseline gap-1.5">
          <AnimatedScore value={score} className="text-2xl leading-none" />
          <AnimatePresence>
            {deltaToken && (
              <motion.span
                key={deltaToken.id}
                initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className={cn(
                  'absolute -top-4 whitespace-nowrap rounded-full bg-tile-edge/15 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-tile-edge',
                  isRight ? 'right-0' : 'left-12',
                )}
              >
                +{deltaToken.value}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default PlayerCard;
