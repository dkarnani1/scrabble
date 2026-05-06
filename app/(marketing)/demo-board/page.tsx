'use client';

// Dev-only demo route used to smoke-test the board/tile visual rewrite.
// Returns 404 in production so it never ships to real users.

import * as React from 'react';
import { notFound } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import { BoardCanvas } from '@ui/components/board/BoardCanvas';
import { Rack } from '@ui/components/rack/Rack';
import { RackSheet } from '@ui/components/rack/RackSheet';
import { TileChip } from '@ui/components/rack/TileChip';
import { MatchHud } from '@ui/components/hud';
import { Button } from '@ui/components/primitives';
import { useMediaQuery } from '@ui/hooks/use-media-query';
import { SOUND_EVENTS, type SoundEvent } from '@ui/sound/sound-events';
import { useGameSound } from '@ui/sound/use-game-sound';
import { EndgameOverlay } from '@ui/components/result/EndgameOverlay';
import { createEmptyBoard } from '@rules/board';
import type { PlacedTile, Tile } from '@rules/types';
import type { RackTileSlot } from '@ui/hooks/use-tentative-board';

const TIMER_TOTAL = 90;

export default function DemoBoardPage() {
  if (process.env.NODE_ENV === 'production') notFound();

  const board = createEmptyBoard();

  const cells = board.cells.map((row) => row.slice()) as (PlacedTile | null)[][];
  const placeCommitted = (r: number, c: number, t: Tile, seq: number) => {
    cells[r]![c] = { tile: t, placedInMoveSeq: seq };
  };

  placeCommitted(7, 5, { kind: 'letter', letter: 'H', value: 4 }, 1);
  placeCommitted(7, 6, { kind: 'letter', letter: 'E', value: 1 }, 1);
  placeCommitted(7, 7, { kind: 'letter', letter: 'L', value: 1 }, 1);
  placeCommitted(7, 8, { kind: 'letter', letter: 'L', value: 1 }, 1);
  placeCommitted(7, 9, { kind: 'letter', letter: 'O', value: 1 }, 1);
  placeCommitted(8, 7, { kind: 'letter', letter: 'I', value: 1 }, 2);
  placeCommitted(9, 7, { kind: 'letter', letter: 'P', value: 3 }, 2);

  const demoBoard = { ...board, cells };
  const lastMoveCells = [
    { r: 7, c: 5 },
    { r: 7, c: 6 },
    { r: 7, c: 7 },
    { r: 7, c: 8 },
    { r: 7, c: 9 },
  ];

  const [rackSlots, setRackSlots] = React.useState<RackTileSlot[]>(() => [
    {
      tile: { kind: 'letter', letter: 'Q', value: 10 },
      rackIndex: 0,
      placedAt: null,
      assignedLetter: null,
    },
    {
      tile: { kind: 'letter', letter: 'R', value: 1 },
      rackIndex: 1,
      placedAt: null,
      assignedLetter: null,
    },
    {
      tile: { kind: 'blank', assigned: null, value: 0 },
      rackIndex: 2,
      placedAt: null,
      assignedLetter: null,
    },
    {
      tile: { kind: 'letter', letter: 'A', value: 1 },
      rackIndex: 3,
      placedAt: { r: 10, c: 7 },
      assignedLetter: null,
    },
    {
      tile: { kind: 'letter', letter: 'T', value: 1 },
      rackIndex: 4,
      placedAt: { r: 11, c: 7 },
      assignedLetter: null,
    },
    {
      tile: { kind: 'letter', letter: 'Z', value: 10 },
      rackIndex: 5,
      placedAt: null,
      assignedLetter: null,
    },
    {
      tile: { kind: 'letter', letter: 'E', value: 1 },
      rackIndex: 6,
      placedAt: null,
      assignedLetter: null,
    },
  ]);

  const [selectedRackIndex, setSelectedRackIndex] = React.useState<number | null>(0);
  const [activeDrag, setActiveDrag] = React.useState<{ rackIndex: number; tile: Tile } | null>(
    null,
  );

  const tentativePlacements = React.useMemo(
    () =>
      rackSlots
        .filter((s): s is typeof s & { placedAt: { r: number; c: number } } => s.placedAt !== null)
        .map((s) => ({ coord: s.placedAt, tile: s.tile, rackIndex: s.rackIndex })),
    [rackSlots],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('rack-')) {
      const rackIndex = Number(id.slice('rack-'.length));
      const slot = rackSlots.find((s) => s.rackIndex === rackIndex);
      if (slot) setActiveDrag({ rackIndex, tile: slot.tile });
    } else if (id.startsWith('tent-')) {
      const [, rs, cs] = id.split('-');
      const r = Number(rs);
      const c = Number(cs);
      const slot = rackSlots.find((s) => s.placedAt?.r === r && s.placedAt?.c === c);
      if (slot) setActiveDrag({ rackIndex: slot.rackIndex, tile: slot.tile });
    }
    console.log('demo onDragStart', e.active.id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const drag = activeDrag;
    setActiveDrag(null);
    console.log('demo onDragEnd', { active: e.active.id, over: e.over?.id ?? null });
    if (!drag) return;
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    if (overId === 'rack') {
      setRackSlots((prev) =>
        prev.map((s) => (s.rackIndex === drag.rackIndex ? { ...s, placedAt: null } : s)),
      );
      return;
    }
    if (overId.startsWith('sq-')) {
      const [, rs, cs] = overId.split('-');
      const r = Number(rs);
      const c = Number(cs);
      if (cells[r]?.[c]) return;
      if (
        rackSlots.some(
          (s) => s.rackIndex !== drag.rackIndex && s.placedAt?.r === r && s.placedAt?.c === c,
        )
      )
        return;
      setRackSlots((prev) =>
        prev.map((s) => (s.rackIndex === drag.rackIndex ? { ...s, placedAt: { r, c } } : s)),
      );
    }
  };

  const [youScore, setYouScore] = React.useState(184);
  const [oppScore, setOppScore] = React.useState(167);
  const [youDelta, setYouDelta] = React.useState<number | undefined>(26);
  const [oppDelta, setOppDelta] = React.useState<number | undefined>(undefined);
  const [secondsRemaining, setSecondsRemaining] = React.useState(47);
  const [tilesInBag, setTilesInBag] = React.useState(23);
  const [simulating, setSimulating] = React.useState(false);

  const isMobile = useMediaQuery('(max-width: 640px)');

  React.useEffect(() => {
    if (!simulating) return;

    const tickTimer = window.setInterval(() => {
      setSecondsRemaining((s) => (s > 0 ? s - 1 : TIMER_TOTAL));
    }, 1000);

    let toggle = 0;
    const tickScores = window.setInterval(() => {
      const delta = 8 + Math.floor(Math.random() * 30);
      if (toggle % 2 === 0) {
        setYouScore((s) => s + delta);
        setYouDelta(delta);
        setOppDelta(undefined);
      } else {
        setOppScore((s) => s + delta);
        setOppDelta(delta);
        setYouDelta(undefined);
      }
      setTilesInBag((b) => Math.max(0, b - Math.floor(Math.random() * 3)));
      toggle += 1;
    }, 2000);

    return () => {
      window.clearInterval(tickTimer);
      window.clearInterval(tickScores);
    };
  }, [simulating]);

  const rackProps = {
    slots: rackSlots,
    selectedRackIndex,
    onSelectTile: setSelectedRackIndex,
    activeDragRackIndex: activeDrag?.rackIndex ?? null,
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <ViewportIndicator />
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-tile-edge">Dev only</p>
          <h1 className="font-display text-2xl font-semibold text-tile-ink">Board visual demo</h1>
        </header>

        <SoundTestPanel />

        <EndgameDemoPanel />

        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant={simulating ? 'default' : 'outline'}
            onClick={() => setSimulating((s) => !s)}
          >
            {simulating ? 'Stop simulation' : 'Simulate live game'}
          </Button>
        </div>

        <MatchHud
          you={{
            name: 'Alex',
            score: youScore,
            isPresent: true,
            isActive: true,
            ...(youDelta !== undefined ? { lastDelta: youDelta } : {}),
          }}
          opponent={{
            name: 'Jordan',
            score: oppScore,
            isPresent: true,
            isActive: false,
            ...(oppDelta !== undefined ? { lastDelta: oppDelta } : {}),
          }}
          timer={{
            secondsRemaining,
            secondsTotal: TIMER_TOTAL,
            active: true,
          }}
          tilesInBag={tilesInBag}
        />

        <BoardCanvas
          board={demoBoard}
          tentativePlacements={tentativePlacements}
          lastMoveCells={lastMoveCells}
          dndEnabled
        />
        {!isMobile && <Rack {...rackProps} />}
        {isMobile && <RackSheet {...rackProps} />}
      </main>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? <TileChip tile={activeDrag.tile} size="lg" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function SoundTestPanel() {
  return (
    <section
      aria-label="Sound test"
      className="rounded-lg border border-board-line bg-board-base/70 p-3 text-xs"
    >
      <h2 className="mb-2 font-semibold uppercase tracking-wide text-tile-ink/80">
        Sound test (dev)
      </h2>
      <div className="flex flex-wrap gap-1.5">
        {SOUND_EVENTS.map((ev) => (
          <SoundTestButton key={ev} event={ev} />
        ))}
      </div>
      <p className="mt-2 text-[10px] text-tile-ink/60">
        Drop matching .mp3 files into <code>public/sounds/</code> — see that folder&apos;s README
        for filenames. Missing files play silence.
      </p>
    </section>
  );
}

function SoundTestButton({ event }: { event: SoundEvent }) {
  const play = useGameSound(event);
  return (
    <button
      type="button"
      onClick={play}
      className="rounded-full border border-board-line bg-board-base px-2.5 py-1 font-mono text-[11px] text-tile-ink/90 transition-colors hover:bg-tile-edge/10"
    >
      {event}
    </button>
  );
}

function EndgameDemoPanel() {
  // ?endgame=win|lose|draw auto-opens the overlay so the axe audit + screenshot
  // scripts have a deterministic deep-link.
  const initialFromQuery: 'win' | 'lose' | 'draw' | null = (() => {
    if (typeof window === 'undefined') return null;
    const v = new URLSearchParams(window.location.search).get('endgame');
    return v === 'win' || v === 'lose' || v === 'draw' ? v : null;
  })();
  const [outcome, setOutcome] = React.useState<'win' | 'lose' | 'draw' | null>(initialFromQuery);
  const [fireKey, setFireKey] = React.useState(0);
  return (
    <section
      aria-label="Endgame overlay test"
      className="rounded-lg border border-board-line bg-board-base/70 p-3 text-xs"
    >
      <h2 className="mb-2 font-semibold uppercase tracking-wide text-tile-ink/80">
        Endgame overlay (dev)
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <fieldset className="flex flex-wrap items-center gap-2" aria-label="Outcome">
          {(['win', 'lose', 'draw'] as const).map((o) => (
            <label
              key={o}
              className={`cursor-pointer rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
                outcome === o
                  ? 'border-tile-edge bg-tile-edge text-board-base'
                  : 'border-board-line bg-board-base text-tile-ink/85 hover:bg-tile-edge/10'
              }`}
            >
              <input
                type="radio"
                name="endgame-outcome"
                value={o}
                className="sr-only"
                checked={outcome === o}
                onChange={() => {
                  setOutcome(o);
                  setFireKey((k) => k + 1);
                }}
              />
              {o}
            </label>
          ))}
        </fieldset>
        {outcome && (
          <>
            <button
              type="button"
              onClick={() => setFireKey((k) => k + 1)}
              className="rounded-full border border-board-line bg-board-base px-2.5 py-1 font-mono text-[11px] text-tile-ink/90 transition-colors hover:bg-tile-edge/10"
            >
              Re-fire confetti
            </button>
            <button
              type="button"
              onClick={() => setOutcome(null)}
              className="rounded-full border border-board-line bg-board-base px-2.5 py-1 font-mono text-[11px] text-tile-ink/90 transition-colors hover:bg-tile-edge/10"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
      {outcome && (
        <EndgameOverlay
          outcome={outcome}
          reason="Demo run — no tiles left in the bag."
          you={{
            name: 'Alex',
            score: 312,
            movesPlayed: 8,
            bingos: 1,
            bestWord: { word: 'QUARTZY', score: 78 },
            endgameAdjustment: 4,
          }}
          opponent={{
            name: 'Jordan',
            score: 289,
            movesPlayed: 9,
            bingos: 0,
            bestWord: { word: 'PHRASE', score: 42 },
            endgameAdjustment: -4,
          }}
          rematchSlot={
            <Button type="button" disabled aria-label="Rematch (demo)">
              Rematch
            </Button>
          }
          confettiFireKey={fireKey}
          fireConfetti
        />
      )}
    </section>
  );
}

function ViewportIndicator() {
  const [size, setSize] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    const tick = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    tick();
    window.addEventListener('resize', tick);
    return () => window.removeEventListener('resize', tick);
  }, []);
  if (!size) return null;
  return (
    <div
      aria-hidden
      className="fixed right-2 top-2 z-50 rounded-full bg-tile-ink/85 px-2.5 py-0.5 font-mono text-[11px] text-board-base shadow-md"
    >
      {size.w}×{size.h}
    </div>
  );
}
