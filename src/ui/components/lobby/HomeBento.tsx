'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  CalendarClock,
  Gamepad2,
  KeyRound,
  ListChecks,
  Trophy,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BentoGrid, BentoTile, BentoTileHeader } from '@ui/components/ui/bento-grid';
import { Button, Input } from '@ui/components/primitives';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ui/components/ui/dialog';
import { AnimatedScore } from '@ui/components/hud/AnimatedScore';
import { NewGameForm } from '@/app/(app)/games/new/NewGameForm';
import { joinGame } from '@/app/actions/games';
import type { GameView } from '@/app/actions/types';

export type HomeBentoProps = {
  myUserId: string;
  games: GameView[];
  /**
   * Last completed game summary if available. The current `listMyGames` action
   * hasn't been wired for `recent` yet (returns []), so this is null in
   * production and only populated by the dev demo escape hatch.
   */
  lastPlayed: LastPlayedSummary | null;
  /**
   * Aggregate stats. Same caveat as `lastPlayed` — not yet computed
   * server-side; treat null as "Coming soon".
   */
  stats: PlayerStats | null;
};

export type LastPlayedSummary = {
  gameId: string;
  opponentName: string;
  yourScore: number;
  theirScore: number;
  endedAt: string;
};

export type PlayerStats = {
  played: number;
  wins: number;
  bestWord: string | null;
  bestWordScore: number | null;
};

export function HomeBento({ myUserId, games, lastPlayed, stats }: HomeBentoProps) {
  const myTurnGames = React.useMemo(
    () => games.filter((g) => isYourTurn(g, myUserId)),
    [games, myUserId],
  );
  const isEmpty = games.length === 0;

  if (isEmpty) {
    return <EmptyHero />;
  }

  return (
    <BentoGrid>
      <BentoTile colSpan={2} rowSpan={2} fullOnMobile featured className="!p-6">
        <YourTurnCarousel games={myTurnGames} myUserId={myUserId} />
      </BentoTile>

      <NewGameTile />
      <JoinByCodeTile />

      <BentoTile colSpan={2}>
        <AllGamesTile games={games} myUserId={myUserId} />
      </BentoTile>

      <StatsTile stats={stats} />
      <LastPlayedTile last={lastPlayed} />
    </BentoGrid>
  );
}

// ----- Hero (your turn) -----------------------------------------------------------

function YourTurnCarousel({ games, myUserId }: { games: GameView[]; myUserId: string }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (reduce || paused || games.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % games.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [reduce, paused, games.length]);

  if (games.length === 0) {
    return (
      <div className="flex h-full flex-col justify-between gap-3">
        <BentoTileHeader
          icon={<CalendarClock className="h-4 w-4" aria-hidden />}
          eyebrow="Your turn"
          title="No turns waiting"
        />
        <p className="text-sm text-tile-ink/75">
          Nothing on the clock for you right now. Start a new game to keep the streak.
        </p>
        <div>
          <Button asChild>
            <Link href="/games/new">Start a new game</Link>
          </Button>
        </div>
      </div>
    );
  }

  const game = games[index]!;
  const opponent = game.players.find((p) => p.userId !== myUserId);
  const me = game.players.find((p) => p.userId === myUserId);
  const lastPlace = [...game.history].reverse().find((h) => h.move.kind === 'place');
  const lastWord =
    lastPlace && lastPlace.move.kind === 'place' ? (lastPlace.move.words[0] ?? null) : null;
  const lastScore = lastPlace && lastPlace.move.kind === 'place' ? lastPlace.move.score : null;

  return (
    <div
      className="flex h-full flex-col gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <BentoTileHeader
        icon={<CalendarClock className="h-4 w-4" aria-hidden />}
        eyebrow={`Your turn (${games.length})`}
        title="Pick up where you left off"
      />
      <div className="relative min-h-[160px] flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={game.id}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col justify-between gap-4 rounded-lg border border-board-line/60 bg-board-base/70 p-4"
          >
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-tile-edge/85">
                vs {opponent?.displayName ?? 'Opponent'}
              </p>
              <h3 className="font-display text-lg text-tile-ink">
                {lastWord ? (
                  <>
                    Last word: <span className="font-semibold tracking-wide">{lastWord}</span>
                  </>
                ) : (
                  'Opening move'
                )}
              </h3>
              <div className="flex items-baseline gap-3 text-sm text-tile-ink/75">
                <span>
                  <span className="font-mono font-semibold text-tile-ink">{me?.score ?? 0}</span> –{' '}
                  <span className="font-mono">{opponent?.score ?? 0}</span>
                </span>
                {lastScore !== null && (
                  <span className="rounded-full bg-tile-edge/10 px-2 py-0.5 text-xs text-tile-edge">
                    +<AnimatedScore value={lastScore} className="inline" />
                  </span>
                )}
              </div>
            </div>
            <div>
              <Button asChild size="sm">
                <Link href={`/games/${game.id}/play`}>Play now</Link>
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      {games.length > 1 && (
        <div className="flex items-center justify-between">
          <CarouselDots count={games.length} index={index} onSelect={setIndex} />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous game"
              onClick={() => setIndex((i) => (i - 1 + games.length) % games.length)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-tile-ink/70 ring-1 ring-tile-ink/15 hover:bg-tile-edge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next game"
              onClick={() => setIndex((i) => (i + 1) % games.length)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-tile-ink/70 ring-1 ring-tile-ink/15 hover:bg-tile-edge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CarouselDots({
  count,
  index,
  onSelect,
}: {
  count: number;
  index: number;
  onSelect: (i: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <button
            type="button"
            aria-label={`Show game ${i + 1} of ${count}`}
            aria-current={i === index}
            onClick={() => onSelect(i)}
            className={
              i === index
                ? 'h-1.5 w-4 rounded-full bg-tile-edge transition-all'
                : 'h-1.5 w-1.5 rounded-full bg-tile-ink/25 transition-all hover:bg-tile-ink/40'
            }
          />
        </li>
      ))}
    </ol>
  );
}

// ----- New game tile --------------------------------------------------------------

function NewGameTile() {
  const [open, setOpen] = React.useState(false);
  return (
    <BentoTile>
      <BentoTileHeader
        icon={<Gamepad2 className="h-4 w-4" aria-hidden />}
        eyebrow="Start"
        title="New game"
      />
      <p className="mt-3 text-sm text-tile-ink/75">
        Pick a timer, share an invite, dunk on your friends.
      </p>
      <div className="mt-auto pt-3">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">Create game</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create a new game</DialogTitle>
              <DialogDescription>
                Choose a timer and share the invite link with your opponent.
              </DialogDescription>
            </DialogHeader>
            <NewGameForm />
          </DialogContent>
        </Dialog>
      </div>
    </BentoTile>
  );
}

// ----- Join by code tile ----------------------------------------------------------

function JoinByCodeTile() {
  const router = useRouter();
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError('Enter a valid code.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await joinGame({ inviteCode: trimmed });
      if (!res.ok) {
        setError(formatJoinError(res.error));
        return;
      }
      router.push(`/games/${res.data.id}/lobby`);
    });
  };

  return (
    <BentoTile>
      <BentoTileHeader
        icon={<KeyRound className="h-4 w-4" aria-hidden />}
        eyebrow="Join"
        title="With a code"
      />
      <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-2">
        <Input
          name="code"
          placeholder="ABCD-1234"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          aria-label="Invite code"
          className="font-mono tracking-[0.18em] uppercase"
        />
        {error && (
          <p role="alert" className="text-xs text-premium-tw">
            {error}
          </p>
        )}
        <Button type="submit" size="sm" disabled={pending} className="self-start">
          {pending ? 'Joining…' : 'Join'}
        </Button>
      </form>
    </BentoTile>
  );
}

function formatJoinError(error: { code: string; reason?: string }): string {
  if (error.code === 'forbidden' && error.reason === 'lobby-full') return 'Game is full.';
  if (error.code === 'forbidden' && error.reason === 'already-joined')
    return "You're already in this game.";
  if (error.code === 'not-found') return 'Invite not found or expired.';
  if (error.code === 'state-conflict') return 'Game has already started.';
  return 'Could not join.';
}

// ----- All games tile -------------------------------------------------------------

function AllGamesTile({ games, myUserId }: { games: GameView[]; myUserId: string }) {
  return (
    <div className="flex h-full flex-col gap-3">
      <BentoTileHeader
        icon={<ListChecks className="h-4 w-4" aria-hidden />}
        eyebrow={`All games (${games.length})`}
        title="In progress"
      />
      <ul className="flex-1 space-y-1.5 overflow-y-auto">
        {games.slice(0, 6).map((g) => {
          const opponent = g.players.find((p) => p.userId !== myUserId);
          const status = statusFor(g, myUserId);
          const target = g.phase === 'lobby' ? `/games/${g.id}/lobby` : `/games/${g.id}/play`;
          return (
            <li key={g.id}>
              <Link
                href={target}
                className="flex items-center justify-between gap-3 rounded-md border border-board-line/60 bg-board-base/60 px-3 py-2 text-sm transition-colors hover:bg-tile-edge/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tile-edge"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />
                  <span className="truncate font-medium">
                    vs {opponent?.displayName ?? 'waiting…'}
                  </span>
                </span>
                <span className={`shrink-0 text-xs ${status.text}`}>{status.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function statusFor(g: GameView, myUserId: string): { dot: string; text: string; label: string } {
  const me = g.players.find((p) => p.userId === myUserId);
  if (g.phase === 'lobby') {
    return { dot: 'bg-tile-ink/30', text: 'text-tile-ink/65', label: 'Waiting' };
  }
  if (g.phase === 'completed' || g.phase === 'abandoned') {
    return { dot: 'bg-tile-ink/30', text: 'text-tile-ink/75', label: 'Ended' };
  }
  if (g.activeSlot != null && me?.slot === g.activeSlot) {
    return { dot: 'bg-tile-edge', text: 'text-tile-edge', label: 'Your turn' };
  }
  return { dot: 'bg-premium-tl/70', text: 'text-tile-ink/65', label: 'Their turn' };
}

function isYourTurn(g: GameView, myUserId: string): boolean {
  if (g.phase !== 'playing') return false;
  const me = g.players.find((p) => p.userId === myUserId);
  return g.activeSlot != null && me?.slot === g.activeSlot;
}

// ----- Stats tile -----------------------------------------------------------------

function StatsTile({ stats }: { stats: PlayerStats | null }) {
  return (
    <BentoTile>
      <BentoTileHeader
        icon={<Trophy className="h-4 w-4" aria-hidden />}
        eyebrow="Stats"
        title="Your record"
      />
      {stats ? (
        <dl className="mt-3 grid grid-cols-2 gap-y-2 text-sm">
          <dt className="text-tile-ink/70">Played</dt>
          <dd className="text-right font-mono font-semibold">{stats.played}</dd>
          <dt className="text-tile-ink/70">Wins</dt>
          <dd className="text-right font-mono font-semibold">{stats.wins}</dd>
          <dt className="text-tile-ink/70">Best word</dt>
          <dd className="text-right font-mono">
            {stats.bestWord ? (
              <span>
                {stats.bestWord}
                {stats.bestWordScore !== null && (
                  <span className="ml-1 text-tile-edge">+{stats.bestWordScore}</span>
                )}
              </span>
            ) : (
              '—'
            )}
          </dd>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-tile-ink/65">
          Tracking is in progress. Win-rate and best-word will land alongside completed-game
          history.
        </p>
      )}
    </BentoTile>
  );
}

// ----- Last played tile -----------------------------------------------------------

function LastPlayedTile({ last }: { last: LastPlayedSummary | null }) {
  if (!last) {
    return (
      <BentoTile>
        <BentoTileHeader eyebrow="Last played" title="Nothing yet" />
        <p className="mt-3 text-sm text-tile-ink/65">
          Once you finish a game it&apos;ll show up here with the final score.
        </p>
      </BentoTile>
    );
  }
  const youWon = last.yourScore > last.theirScore;
  const tied = last.yourScore === last.theirScore;
  return (
    <BentoTile href={`/games/${last.gameId}/result`} ariaLabel="View last game result">
      <BentoTileHeader eyebrow="Last played" title={`vs ${last.opponentName}`} />
      <div className="mt-3 flex items-baseline gap-2 font-mono text-2xl">
        <span className={youWon ? 'font-bold text-tile-edge' : 'text-tile-ink/85'}>
          {last.yourScore}
        </span>
        <span className="text-sm text-tile-ink/40">–</span>
        <span className={tied || !youWon ? 'text-tile-ink/85' : 'text-tile-ink/75'}>
          {last.theirScore}
        </span>
        <span className="ml-2 text-xs uppercase tracking-wide text-tile-ink/75">
          {youWon ? 'won' : tied ? 'tie' : 'lost'}
        </span>
      </div>
    </BentoTile>
  );
}

// ----- Empty hero -----------------------------------------------------------------

function EmptyHero() {
  return (
    <BentoGrid>
      <BentoTile colSpan={4} rowSpan={2} fullOnMobile featured className="!p-8">
        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tile-edge">
            Welcome
          </p>
          <h2 className="font-display text-3xl font-semibold text-tile-ink sm:text-4xl">
            Start your first game.
          </h2>
          <p className="max-w-md text-sm text-tile-ink/75">
            Spin up an invite, send the link, and the rack is ready. We&apos;ll keep score, watch
            the clock, and stream every move.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild>
              <Link href="/games/new">Create game</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/demo-board">See the board</Link>
            </Button>
          </div>
        </div>
      </BentoTile>
    </BentoGrid>
  );
}
