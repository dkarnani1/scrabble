'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@ui/components/ui/dialog';
import { AnimatedScore } from '@ui/components/hud/AnimatedScore';
import { Button } from '@ui/components/primitives';
import { cn } from '@ui/lib/classnames';
import { EndgameConfetti } from './EndgameConfetti';
import { ScoreBreakdownRow } from './ScoreBreakdownRow';

export type EndgamePlayerSummary = {
  name: string;
  score: number;
  movesPlayed: number;
  bingos: number;
  bestWord?: { word: string; score: number } | null;
  endgameAdjustment: number;
};

export type EndgameOverlayProps = {
  outcome: 'win' | 'lose' | 'draw';
  reason?: string;
  you: EndgamePlayerSummary;
  opponent: EndgamePlayerSummary;
  /**
   * Slot under the rematch button. Receives the existing `<RematchButton>`
   * (or null if rematch is unavailable). The button manages its own state
   * internally — we don't try to thread that state through this component.
   */
  rematchSlot?: React.ReactNode;
  /**
   * Bump to re-trigger confetti without re-mounting. The demo route sets this
   * via a "Re-fire confetti" button.
   */
  confettiFireKey?: number | string;
  /** When false, suppresses confetti this mount (used for the de-dup gate). */
  fireConfetti?: boolean;
};

const OUTCOME_HEADLINE: Record<EndgameOverlayProps['outcome'], string> = {
  win: 'You won!',
  lose: 'You lost.',
  draw: 'Draw.',
};

const OUTCOME_TONE: Record<EndgameOverlayProps['outcome'], string> = {
  win: 'text-tile-edge',
  lose: 'text-tile-ink/70',
  draw: 'text-tile-ink',
};

/**
 * Full-screen celebratory endgame overlay. Renders inside a shadcn Dialog
 * pinned `open`; closing happens through the action buttons (rematch / new
 * game / home), not a chrome X. Confetti choreography lives in
 * `<EndgameConfetti>` and respects reduced motion + per-game session de-dup
 * via the parent's `fireConfetti` flag.
 */
export function EndgameOverlay({
  outcome,
  reason,
  you,
  opponent,
  rematchSlot,
  confettiFireKey,
  fireConfetti = true,
}: EndgameOverlayProps) {
  const reduce = useReducedMotion();

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // Override the default narrow modal — we want a full-page experience.
          '!max-w-3xl gap-0 border-none p-0 outline-none',
          'bg-board-felt bg-felt-noise text-tile-ink shadow-board-deep ring-1 ring-tile-ink/10',
        )}
      >
        {/* sr-only title/desc for Radix accessibility — visible content lives below. */}
        <DialogTitle className="sr-only">{OUTCOME_HEADLINE[outcome]}</DialogTitle>
        <DialogDescription className="sr-only">
          Final scores and a rematch option for the completed game.
        </DialogDescription>

        {fireConfetti && (
          <EndgameConfetti
            outcome={outcome}
            {...(confettiFireKey !== undefined ? { fireKey: confettiFireKey } : {})}
          />
        )}

        <div className="flex flex-col gap-6 px-6 py-8 sm:px-10 sm:py-10">
          {/* Headline */}
          <motion.header
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-1 text-center"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-tile-edge/85">
              Game over
            </p>
            <h1
              className={cn(
                'font-display text-4xl font-semibold leading-tight sm:text-5xl',
                OUTCOME_TONE[outcome],
              )}
            >
              {OUTCOME_HEADLINE[outcome]}
            </h1>
            {reason && <p className="pt-1 text-xs italic text-tile-ink/65">{reason}</p>}
          </motion.header>

          {/* Score panel */}
          <div className="grid grid-cols-2 gap-3">
            <PlayerScoreCard
              player={you}
              isYou
              highlight={outcome === 'win' || outcome === 'draw'}
              winner={outcome === 'win'}
            />
            <PlayerScoreCard
              player={opponent}
              isYou={false}
              highlight={outcome === 'lose' || outcome === 'draw'}
              winner={outcome === 'lose'}
            />
          </div>

          {/* Breakdown */}
          <section className="rounded-lg bg-board-base/70 px-4 py-2 ring-1 ring-tile-ink/10 sm:px-6">
            <ScoreBreakdownRow
              label="Total moves"
              youValue={you.movesPlayed}
              opponentValue={opponent.movesPlayed}
              delayMs={400}
            />
            <ScoreBreakdownRow
              label="Bingos"
              youValue={you.bingos}
              opponentValue={opponent.bingos}
              delayMs={520}
            />
            <ScoreBreakdownRow
              label="Best word"
              youText={formatBestWord(you.bestWord)}
              opponentText={formatBestWord(opponent.bestWord)}
              delayMs={640}
            />
            {(you.endgameAdjustment !== 0 || opponent.endgameAdjustment !== 0) && (
              <ScoreBreakdownRow
                label="End-game adjustment"
                youValue={you.endgameAdjustment}
                opponentValue={opponent.endgameAdjustment}
                delayMs={760}
              />
            )}
          </section>

          {/* Actions */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.9 }}
            className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end"
          >
            {rematchSlot && (
              <RematchPulse outcome={outcome}>
                <div className="[&>div]:flex-row [&>div]:items-center [&>div]:gap-2">
                  {rematchSlot}
                </div>
              </RematchPulse>
            )}
            <Button asChild variant="outline">
              <Link href="/games/new">New game</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/home">Home</Link>
            </Button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBestWord(best: EndgamePlayerSummary['bestWord']): string {
  if (!best || !best.word) return '—';
  return `${best.word} (+${best.score})`;
}

function PlayerScoreCard({
  player,
  isYou,
  highlight,
  winner,
}: {
  player: EndgamePlayerSummary;
  isYou: boolean;
  highlight: boolean;
  winner: boolean;
}) {
  const reduce = useReducedMotion();
  const [revealed, setRevealed] = React.useState(false);
  React.useEffect(() => {
    if (reduce) {
      setRevealed(true);
      return;
    }
    const id = window.setTimeout(() => setRevealed(true), 200);
    return () => window.clearTimeout(id);
  }, [reduce]);

  const initials = player.name
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.1 }}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl bg-board-base/80 p-4 text-center shadow-sm ring-1 ring-tile-ink/10',
        highlight && 'ring-2 ring-tile-edge',
      )}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full bg-tile-edge text-sm font-semibold text-board-base shadow-sm',
            !winner && 'opacity-80',
          )}
        >
          {initials || '?'}
        </span>
        <div className="flex flex-col items-start">
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-tile-edge/85">
            {isYou ? 'You' : 'Opponent'}
          </span>
          <span className="text-sm font-medium text-tile-ink">{player.name}</span>
        </div>
      </div>
      <div className="font-display text-5xl font-semibold tabular-nums text-tile-ink sm:text-6xl">
        <AnimatedScore value={revealed ? player.score : 0} durationMs={900} />
      </div>
    </motion.div>
  );
}

function RematchPulse({
  children,
  outcome,
}: {
  children: React.ReactNode;
  outcome: EndgameOverlayProps['outcome'];
}) {
  const reduce = useReducedMotion();
  if (reduce || outcome === 'lose') {
    return <div className="sm:order-last">{children}</div>;
  }
  return (
    <motion.div
      className="relative sm:order-last"
      animate={{ scale: [1, 1.04, 1] }}
      transition={{ duration: 1.1, repeat: 2, ease: 'easeInOut' }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-md bg-tile-edge/25 blur-md"
      />
      <div className="relative">{children}</div>
    </motion.div>
  );
}
