'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import { Sparkles, Globe2, Code2, BookOpen, LogIn } from 'lucide-react';
import { Button } from '@ui/components/primitives';
import { BentoGrid, BentoTile, BentoTileHeader } from '@ui/components/ui/bento-grid';
import { MiniBoardDemo } from './MiniBoardDemo';

export function LandingBento() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-board-base">
      {/* Mesh-gradient backdrop: a soft drifting orb behind the hero so the page
          breathes without a busy texture. Pointer events off — it's pure decor. */}
      <BackdropOrb />
      <div className="bg-board-felt bg-felt-noise">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:py-14">
          <header className="space-y-2 text-center sm:text-left">
            <p className="text-xs uppercase tracking-[0.2em] text-tile-edge">
              Scrabble-style, online
            </p>
            <h1 className="font-display text-3xl font-semibold leading-tight text-tile-ink sm:text-4xl">
              Two friends. One real board.
            </h1>
            <p className="mx-auto max-w-2xl text-base text-tile-ink/75 sm:mx-0 sm:text-lg">
              Authentic rules, server-authoritative state, and real-time multiplayer — built to be
              played, not just demoed.
            </p>
          </header>

          <BentoGrid>
            {/* Hero — 2x2. Mini board on the left, copy + CTA on the right. */}
            <BentoTile colSpan={2} rowSpan={2} fullOnMobile featured className="!p-6">
              <div className="grid h-full gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <div className="order-2 sm:order-1">
                  <MiniBoardDemo className="aspect-square w-full max-w-[260px]" />
                </div>
                <div className="order-1 flex min-w-0 flex-col justify-center gap-4 sm:order-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-tile-edge">
                    Live demo
                  </p>
                  <h2 className="font-display text-2xl font-semibold leading-tight text-tile-ink sm:text-3xl">
                    Play with friends online.
                  </h2>
                  <p className="text-sm text-tile-ink/75">
                    Drag tiles, chase bingos, race the clock. Every move is committed server-side
                    and streamed to your opponent in real time.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href="/sign-in?next=/home">Start a game</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/demo-board">See the board</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </BentoTile>

            <BentoTile>
              <BentoTileHeader
                icon={<Globe2 className="h-4 w-4" aria-hidden />}
                eyebrow="Live"
                title="Real-time multiplayer"
              />
              <p className="mt-3 text-sm text-tile-ink/75">
                Postgres replication keeps both racks honest while Supabase channels deliver moves
                the moment they land.
              </p>
            </BentoTile>

            <BentoTile>
              <BentoTileHeader
                icon={<Sparkles className="h-4 w-4" aria-hidden />}
                eyebrow="Rules"
                title="Tournament-grade"
              />
              <p className="mt-3 text-sm text-tile-ink/75">
                ENABLE-derived word list, premium squares, blank assignment, challenge windows —
                built to match the SOWPODS / TWL feel.
              </p>
            </BentoTile>

            <BentoTile colSpan={2}>
              <div className="flex h-full flex-col justify-between gap-3">
                <BentoTileHeader
                  icon={<Code2 className="h-4 w-4" aria-hidden />}
                  eyebrow="Stack"
                  title="Built for the web"
                />
                <p className="text-sm text-tile-ink/75">
                  Next.js 15 App Router, Supabase for auth + realtime, shadcn primitives,
                  motion-driven feedback. No Electron, no APK — just a URL.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Next.js 15', 'Supabase', 'shadcn/ui', 'motion', 'dnd-kit', 'Tailwind v4'].map(
                    (t) => (
                      <span
                        key={t}
                        className="rounded-full border border-board-line bg-board-base/70 px-2.5 py-0.5 text-[11px] font-medium text-tile-ink/85"
                      >
                        {t}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </BentoTile>

            <BentoTile href="/demo-board" ariaLabel="See how to play with the board demo">
              <BentoTileHeader
                icon={<BookOpen className="h-4 w-4" aria-hidden />}
                eyebrow="Learn"
                title="How to play"
              />
              <p className="mt-3 text-sm text-tile-ink/75">
                Walk the demo board: tile drag, premium squares, blank assignment.
              </p>
              <span className="mt-auto pt-3 text-xs font-medium text-tile-edge">Open demo →</span>
            </BentoTile>

            <BentoTile href="/sign-in?next=/home" ariaLabel="Sign in to start playing">
              <BentoTileHeader
                icon={<LogIn className="h-4 w-4" aria-hidden />}
                eyebrow="Account"
                title="Sign in"
              />
              <p className="mt-3 text-sm text-tile-ink/75">
                Magic-link login. We&apos;ll remember your display name across devices.
              </p>
              <span className="mt-auto pt-3 text-xs font-medium text-tile-edge">Continue →</span>
            </BentoTile>
          </BentoGrid>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-board-line/60 pt-4 text-xs text-tile-ink/60">
            <p>Built with Next.js · Supabase · shadcn · motion</p>
            <a
              href="https://github.com/anthropics/claude-code"
              className="text-tile-edge hover:underline"
            >
              GitHub
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}

function BackdropOrb() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute -top-32 right-[-10%] -z-10 h-[460px] w-[460px] rounded-full opacity-60 blur-3xl"
      style={{
        background:
          'radial-gradient(closest-side, color-mix(in oklab, var(--color-tile-edge) 35%, transparent), transparent 70%)',
      }}
      animate={{ x: [0, 40, -20, 0], y: [0, 30, -10, 0] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}
