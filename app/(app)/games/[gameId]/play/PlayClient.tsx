'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { RackControls } from '@ui/components/rack/RackControls';
import { BlankTileDialog } from '@ui/components/rack/BlankTileDialog';
import { SubmitButton } from '@ui/components/controls/SubmitButton';
import { PassButton } from '@ui/components/controls/PassButton';
import { ExchangeDialog } from '@ui/components/controls/ExchangeDialog';
import { MoveHistoryList } from '@ui/components/moves/MoveHistoryList';
import { RejectionInline, reasonToMessage } from '@ui/components/feedback/RejectionInline';
import { useTentativeBoard } from '@ui/hooks/use-tentative-board';
import { useGameChannel } from '@ui/hooks/use-game-channel';
import { usePresenceHeartbeat } from '@ui/hooks/use-presence-heartbeat';
import { useServerTimer } from '@ui/hooks/use-server-timer';
import { useMediaQuery } from '@ui/hooks/use-media-query';
import { PresenceIndicator } from '@ui/components/play/PresenceIndicator';
import { TurnBanner } from '@ui/components/play/TurnBanner';
import { TimerDisplay } from '@ui/components/timer/TimerDisplay';
import { MatchHud } from '@ui/components/hud';
import { ChallengeWindow } from '@ui/components/challenge/ChallengeWindow';
import { ChallengeOutcomeBanner } from '@ui/components/challenge/ChallengeOutcomeBanner';
import { useGameSound } from '@ui/sound/use-game-sound';
import { useAppShellHeader } from '@ui/components/shell/AppShell';
import { useRegisterCommands } from '@ui/components/shell/CommandPaletteProvider';
import type { CommandEntry } from '@ui/components/shell/CommandPalette';
import { Shuffle, RotateCcw, SkipForward, Repeat, Flag } from 'lucide-react';
import { placeMove, passTurn, exchangeTiles } from '@/app/actions/moves';
import { raiseChallenge } from '@/app/actions/challenges';
import { getGameView } from '@/app/actions/games';
import type { GameView } from '@/app/actions/types';
import type { ChallengeOutcome, Letter, PlayerSlot, Tile, TimerSetting } from '@rules/types';
import { Button } from '@ui/components/primitives';

const TIMER_TOTAL_SECONDS: Record<TimerSetting, number> = {
  none: 0,
  '30s': 30,
  '1m': 60,
  '2m': 120,
};

type ActiveDrag =
  | { kind: 'rack'; rackIndex: number; tile: Tile }
  | { kind: 'tentative'; rackIndex: number; tile: Tile; fromCoord: { r: number; c: number } };

export type PlayClientProps = {
  initialView: GameView;
  myUserId: string;
};

export function PlayClient({ initialView, myUserId }: PlayClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showLegacyHud = searchParams?.get('legacy') === '1';
  const [view, setView] = React.useState<GameView>(initialView);
  const [error, setError] = React.useState<string | null>(null);
  // Manual pending flags instead of useTransition. Polling fires urgent
  // setView every 500–1500ms, which preempts the low-priority transition
  // commit and leaves `pending` latched true — disabling the rack and
  // action buttons mid-turn until something unrelated forces a commit.
  // Plain useState updates are urgent priority and clear deterministically.
  const [pending, setPending] = React.useState(false);
  const [challengePending, setChallengePending] = React.useState(false);
  const [exchangeOpen, setExchangeOpen] = React.useState(false);
  const [blankPickerForRackIndex, setBlankPickerForRackIndex] = React.useState<number | null>(null);
  const [selectedRackIndex, setSelectedRackIndex] = React.useState<number | null>(null);
  const [activeDrag, setActiveDrag] = React.useState<ActiveDrag | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = React.useState<string>('');

  const tentative = useTentativeBoard({ rack: view.myRack ?? [] });
  const isMobile = useMediaQuery('(max-width: 640px)');

  // Sound hooks — fire-and-forget. Each returns a no-op when sound is disabled
  // or the asset is missing, so call sites can play unconditionally.
  const playPickup = useGameSound('tile-pickup');
  const playPlace = useGameSound('tile-place');
  const playRecall = useGameSound('tile-recall');
  const playShuffle = useGameSound('rack-shuffle');
  const playCommitSuccess = useGameSound('commit-success');
  const playCommitInvalid = useGameSound('commit-invalid');
  const playOpponentMove = useGameSound('opponent-move');
  const playBingo = useGameSound('bingo');
  const playTurnStart = useGameSound('turn-start');
  const playTimerWarning = useGameSound('timer-warning');
  const playWin = useGameSound('win');
  const playLose = useGameSound('lose');
  const playDraw = useGameSound('draw');

  React.useEffect(() => {
    if (view.phase === 'completed' || view.phase === 'abandoned') {
      router.replace(`/games/${view.id}/result`);
    }
  }, [view.phase, view.id, router]);

  // The win / lose / draw effect lives below `me` because it reads me.score —
  // see "Terminal phase sound" further down in this file.
  const prevPhaseRef = React.useRef(view.phase);

  const refetch = React.useCallback(() => {
    void (async () => {
      const fresh = await getGameView({ gameId: view.id });
      if (fresh.ok) setView(fresh.data);
    })();
  }, [view.id]);

  useGameChannel({
    gameId: view.id,
    currentSeq: view.history.length,
    onRefetch: refetch,
  });

  // Polling backstop. The realtime channel above SHOULD deliver opponent moves
  // and phase transitions instantly, but websocket drops + RLS-filtered UPDATE
  // events can leave the view stale until the user manually refreshes. The
  // interval is faster during challenge-window (the opponent has a small
  // budget to react) and otherwise paced to keep DB load reasonable.
  React.useEffect(() => {
    if (view.phase === 'completed' || view.phase === 'abandoned') return;
    const intervalMs = view.phase === 'challenge-window' ? 500 : 1500;
    const id = window.setInterval(refetch, intervalMs);
    return () => window.clearInterval(id);
  }, [refetch, view.phase]);

  usePresenceHeartbeat({
    gameId: view.id,
    enabled: view.phase === 'playing' || view.phase === 'challenge-window',
  });

  const me = view.players.find((p) => p.userId === myUserId);
  const opponent = view.players.find((p) => p.userId !== myUserId);
  const mySlot = (me?.slot ?? null) as PlayerSlot | null;
  const isMyTurn = mySlot !== null && view.activeSlot === mySlot && view.phase === 'playing';

  // Terminal phase sound — fires once on phase transition into completed /
  // abandoned. Compares the local player's score to the others; an exact tie
  // at the top counts as a draw.
  React.useEffect(() => {
    const prev = prevPhaseRef.current;
    const isTerminalNow = view.phase === 'completed' || view.phase === 'abandoned';
    const wasTerminal = prev === 'completed' || prev === 'abandoned';
    if (isTerminalNow && !wasTerminal) {
      const myScore = me?.score ?? 0;
      const top = view.players.reduce((best, p) => Math.max(best, p.score), -Infinity);
      const tiedAtTop = view.players.filter((p) => p.score === top).length > 1;
      if (myScore === top && !tiedAtTop) playWin();
      else if (tiedAtTop && myScore === top) playDraw();
      else playLose();
    }
    prevPhaseRef.current = view.phase;
  }, [view.phase, view.players, me?.score, playWin, playLose, playDraw]);

  const lastMove = view.history.at(-1);
  const inChallengeWindow = view.phase === 'challenge-window';
  const placerSlot = lastMove && lastMove.move.kind === 'place' ? lastMove.move.playerSlot : null;
  const canChallenge =
    inChallengeWindow && placerSlot !== null && mySlot !== null && mySlot !== placerSlot;
  const placedAt =
    inChallengeWindow && lastMove && lastMove.move.kind === 'place'
      ? lastMove.move.createdAt
      : null;

  const [recentOutcome, setRecentOutcome] = React.useState<ChallengeOutcome | null>(null);
  React.useEffect(() => {
    const c = lastMove?.challenge;
    if (c && (c.kind === 'challenged-invalid' || c.kind === 'challenged-valid')) {
      setRecentOutcome(c);
    }
  }, [lastMove]);

  const lastMoveCells = React.useMemo(() => {
    const last = view.history.at(-1);
    if (!last || last.move.kind !== 'place') return [];
    return last.move.tiles.map((t) => t.coord);
  }, [view.history]);

  // Opponent-move sound — fires when history grows by an entry whose playerSlot
  // is not ours. We track history.length via a ref so a single new entry plays
  // exactly once even if other state in `view` causes a re-render.
  const prevHistoryLenRef = React.useRef(view.history.length);
  React.useEffect(() => {
    const prev = prevHistoryLenRef.current;
    const curr = view.history.length;
    if (curr > prev) {
      const newest = view.history[curr - 1];
      if (newest && 'playerSlot' in newest.move && newest.move.playerSlot !== mySlot) {
        playOpponentMove();
      }
    }
    prevHistoryLenRef.current = curr;
  }, [view.history.length, mySlot, playOpponentMove, view.history]);

  // Turn-start sound — fires when isMyTurn flips false → true. Doesn't fire on
  // initial mount when it's already our turn (silence beats a confusing chime).
  const prevIsMyTurnRef = React.useRef<boolean | null>(null);
  React.useEffect(() => {
    const prev = prevIsMyTurnRef.current;
    if (prev === false && isMyTurn === true) playTurnStart();
    prevIsMyTurnRef.current = isMyTurn;
  }, [isMyTurn, playTurnStart]);

  const hudTimer = useServerTimer({
    deadlineAt: view.phase === 'playing' ? view.turnDeadlineAt : null,
    serverNow: view.serverNow,
  });
  const hudSecondsTotal = TIMER_TOTAL_SECONDS[view.timerSetting];
  const hudTimerActive =
    view.phase === 'playing' && view.turnDeadlineAt !== null && hudSecondsTotal > 0;
  const hudSecondsRemaining = hudTimer.remainingSeconds ?? 0;

  // Timer warning — single chime when remaining time crosses below 10 seconds
  // on the local player's turn. Resets whenever the turn ends or seconds rise
  // back above the threshold (e.g. fresh turn started).
  const timerWarningFiredRef = React.useRef(false);
  React.useEffect(() => {
    if (!hudTimerActive || !isMyTurn) {
      timerWarningFiredRef.current = false;
      return;
    }
    if (hudSecondsRemaining > 10) {
      timerWarningFiredRef.current = false;
      return;
    }
    if (hudSecondsRemaining > 0 && !timerWarningFiredRef.current) {
      timerWarningFiredRef.current = true;
      playTimerWarning();
    }
  }, [hudSecondsRemaining, hudTimerActive, isMyTurn, playTimerWarning]);

  const lastPlace = lastMove && lastMove.move.kind === 'place' ? lastMove.move : null;
  const myLastDelta = lastPlace && me?.slot === lastPlace.playerSlot ? lastPlace.score : undefined;
  const opponentLastDelta =
    lastPlace && opponent?.slot === lastPlace.playerSlot ? lastPlace.score : undefined;

  const tentativePlacementsForBoard = React.useMemo(
    () =>
      tentative.slots
        .filter((s): s is typeof s & { placedAt: { r: number; c: number } } => s.placedAt !== null)
        .map((s) => ({ coord: s.placedAt, tile: s.tile, rackIndex: s.rackIndex })),
    [tentative.slots],
  );

  const placeFromRack = React.useCallback(
    (rackIndex: number, coord: { r: number; c: number }) => {
      if (!isMyTurn) return false;
      if (view.board.cells[coord.r]?.[coord.c]) return false;
      const occupied = tentative.pendingPlacements.some(
        (p) =>
          p.coord.r === coord.r &&
          p.coord.c === coord.c &&
          // Allow moving an already-tentative tile onto its own square (no-op).
          tentative.slots.find((s) => s.placedAt?.r === coord.r && s.placedAt?.c === coord.c)
            ?.rackIndex !== rackIndex,
      );
      if (occupied) return false;
      const slot = tentative.slots.find((s) => s.rackIndex === rackIndex);
      if (!slot) return false;
      if (slot.tile.kind === 'blank' && slot.assignedLetter === null) {
        setBlankPickerForRackIndex(rackIndex);
        return true;
      }
      tentative.placeTile(rackIndex, coord);
      playPlace();
      return true;
    },
    [isMyTurn, view.board.cells, tentative, playPlace],
  );

  const onSquareClick = (coord: { r: number; c: number }) => {
    if (selectedRackIndex === null) return;
    const placed = placeFromRack(selectedRackIndex, coord);
    if (placed) setSelectedRackIndex(null);
  };

  const onSubmit = () => {
    if (pending) return;
    setError(null);
    if (tentative.pendingPlacements.length === 0) {
      setError('Place at least one tile before submitting.');
      return;
    }
    const placedCount = tentative.pendingPlacements.length;
    setPending(true);
    void (async () => {
      try {
        const result = await placeMove({
          gameId: view.id,
          tiles: tentative.pendingPlacements,
        });
        if (!result.ok) {
          playCommitInvalid();
          if (result.error.code === 'rule-violation')
            setError(reasonToMessage(result.error.reason));
          else if (result.error.code === 'state-conflict')
            setError(reasonToMessage(result.error.reason));
          else if (result.error.code === 'invalid-input')
            setError(result.error.issues[0]?.message ?? 'Invalid move.');
          else setError('Move rejected.');
          return;
        }
        // Bingo plays *instead* of commit-success when all 7 rack tiles were used.
        // We use the local placement count rather than reading the freshly committed
        // server move to keep the play instantaneous; the server flag (`isBingo`) is
        // confirmed in the next render via the history entry.
        if (placedCount === 7) playBingo();
        else playCommitSuccess();
        setView(result.data);
      } catch (e) {
        console.error('placeMove failed', e);
        setError('Move rejected.');
      } finally {
        setPending(false);
      }
    })();
  };

  const onPass = () => {
    if (pending) return;
    setError(null);
    setPending(true);
    void (async () => {
      try {
        const result = await passTurn({ gameId: view.id });
        if (!result.ok) {
          setError('Pass rejected.');
          return;
        }
        setView(result.data);
      } catch (e) {
        console.error('passTurn failed', e);
        setError('Pass rejected.');
      } finally {
        setPending(false);
      }
    })();
  };

  const onChallenge = () => {
    if (!lastMove || lastMove.move.kind !== 'place') return;
    if (challengePending) return;
    setError(null);
    setChallengePending(true);
    void (async () => {
      try {
        const result = await raiseChallenge({
          gameId: view.id,
          moveSeq: lastMove.move.seq,
        });
        if (!result.ok) {
          setError('Challenge could not be raised.');
          return;
        }
        setView(result.data);
      } catch (e) {
        console.error('raiseChallenge failed', e);
        setError('Challenge could not be raised.');
      } finally {
        setChallengePending(false);
      }
    })();
  };

  const onExchange = (indices: number[]) => {
    if (pending) return;
    setError(null);
    setPending(true);
    void (async () => {
      try {
        const result = await exchangeTiles({ gameId: view.id, tileIndices: indices });
        if (!result.ok) {
          setError('Exchange rejected.');
          return;
        }
        setExchangeOpen(false);
        setView(result.data);
      } catch (e) {
        console.error('exchangeTiles failed', e);
        setError('Exchange rejected.');
      } finally {
        setPending(false);
      }
    })();
  };

  const displayNameBySlot: Partial<Record<PlayerSlot, string>> = {};
  for (const p of view.players) displayNameBySlot[p.slot] = p.displayName;

  // Push presence + felt-seam + breadcrumb into the AppShell header.
  const shell = useAppShellHeader();
  React.useEffect(() => {
    shell.setPresence(
      view.players.map((p) => ({
        name: p.displayName,
        isYou: p.userId === myUserId,
        isPresent: p.connected,
      })),
    );
    shell.setCenterLabel(opponent ? `Game vs ${opponent.displayName}` : null);
    shell.setFeltSeam(true);
    return () => {
      shell.setPresence([]);
      shell.setCenterLabel(null);
      shell.setFeltSeam(false);
    };
    // shell setters are stable; depend on the data that drives the values.
  }, [view.players, myUserId, opponent?.displayName]);

  // Register game commands with the global Cmd-K palette. Each command reuses
  // the same handler the in-page button calls; gating mirrors the button's
  // `disabled` attribute so the palette can't fire forbidden actions.
  const gameCommands = React.useMemo<ReadonlyArray<CommandEntry>>(() => {
    const canShuffle = isMyTurn && !pending;
    const hasTentative = tentative.pendingPlacements.length > 0;
    return [
      {
        id: 'game.shuffle',
        label: 'Shuffle rack',
        section: 'game',
        icon: Shuffle,
        disabled: !canShuffle,
        keywords: 'rack,reorder',
        perform: () => {
          tentative.shuffleRack();
          playShuffle();
        },
      },
      {
        id: 'game.recall',
        label: 'Recall all tiles',
        section: 'game',
        icon: RotateCcw,
        disabled: !canShuffle || !hasTentative,
        keywords: 'undo,clear',
        perform: () => {
          if (hasTentative) playRecall();
          tentative.recallAll();
        },
      },
      {
        id: 'game.pass',
        label: 'Pass turn',
        section: 'game',
        icon: SkipForward,
        disabled: !isMyTurn || pending,
        keywords: 'skip',
        perform: onPass,
      },
      {
        id: 'game.exchange',
        label: 'Open exchange dialog',
        section: 'game',
        icon: Repeat,
        disabled: !isMyTurn || pending,
        keywords: 'swap,trade',
        perform: () => setExchangeOpen(true),
      },
      {
        id: 'game.resign',
        label: 'Resign game',
        section: 'game',
        icon: Flag,
        disabled: true,
        keywords: 'forfeit,quit',
        perform: () => {
          // Resign is not yet exposed as a server action — leave disabled
          // until the orchestration layer surfaces a handler. The command
          // shows in the palette so users discover the gap rather than
          // wondering whether it exists.
        },
      },
    ];
  }, [isMyTurn, pending, tentative.pendingPlacements.length]);
  useRegisterCommands('play-page', gameCommands, [gameCommands]);

  // Sensors: pointer needs distance to disambiguate click vs drag, touch needs a delay
  // so vertical scrolling/sheet drag don't trigger tile drag, keyboard for a11y.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    if (id.startsWith('rack-')) {
      const rackIndex = Number(id.slice('rack-'.length));
      const slot = tentative.slots.find((s) => s.rackIndex === rackIndex);
      if (!slot) return;
      setActiveDrag({ kind: 'rack', rackIndex, tile: slot.tile });
      setLiveAnnouncement(announceTile('Picking up', slot.tile));
      playPickup();
      return;
    }
    if (id.startsWith('tent-')) {
      const [, rs, cs] = id.split('-');
      const r = Number(rs);
      const c = Number(cs);
      const slot = tentative.slots.find(
        (s) => s.placedAt && s.placedAt.r === r && s.placedAt.c === c,
      );
      if (!slot) return;
      setActiveDrag({
        kind: 'tentative',
        rackIndex: slot.rackIndex,
        tile: slot.tile,
        fromCoord: { r, c },
      });
      setLiveAnnouncement(announceTile('Picking up', slot.tile));
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    const drag = activeDrag;
    setActiveDrag(null);
    if (!drag) return;
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) {
      setLiveAnnouncement(announceTile('Cancelled', drag.tile));
      return;
    }
    if (overId === 'rack') {
      if (drag.kind === 'tentative') {
        tentative.recallTile(drag.rackIndex);
        playRecall();
        setLiveAnnouncement(announceTile('Returned', drag.tile, 'to rack'));
      } else {
        // Rack-to-rack drop: ignore (no reorder behavior).
        setLiveAnnouncement(announceTile('Cancelled', drag.tile));
      }
      return;
    }
    if (overId.startsWith('sq-')) {
      const [, rs, cs] = overId.split('-');
      const r = Number(rs);
      const c = Number(cs);
      const ok = placeFromRack(drag.rackIndex, { r, c });
      if (ok) {
        // If we dropped a tentative tile somewhere new, the placeTile call above already
        // moved it (placeTile sets placedAt, which is the tentative coord).
        setLiveAnnouncement(announceTile('Placed', drag.tile, `at row ${r + 1} column ${c + 1}`));
      } else {
        setLiveAnnouncement(announceTile('Cannot place', drag.tile));
      }
    }
  };

  const board = (
    <BoardCanvas
      board={view.board}
      tentativePlacements={tentativePlacementsForBoard}
      lastMoveCells={lastMoveCells}
      onSquareClick={onSquareClick}
      dndEnabled={isMyTurn && !pending}
    />
  );

  const rackProps = {
    slots: tentative.slots,
    selectedRackIndex,
    onSelectTile: setSelectedRackIndex,
    disabled: !isMyTurn || pending,
    activeDragRackIndex: activeDrag ? activeDrag.rackIndex : null,
    onPickupSelect: playPickup,
  };

  return (
    <DndContext
      sensors={sensors}
      modifiers={[restrictToWindowEdges]}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="grid gap-6 py-2 pb-28 md:grid-cols-[minmax(0,1fr)_320px] sm:pb-2">
        <section className="min-w-0 space-y-4">
          <header className="space-y-2">
            <h1 className="text-xl font-semibold">
              {me?.displayName ?? 'You'} vs {opponent?.displayName ?? 'Opponent'}
            </h1>
            {showLegacyHud && (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <TurnBanner
                    state={
                      view.phase === 'completed' || view.phase === 'abandoned'
                        ? 'completed'
                        : view.phase === 'challenge-window' || view.phase === 'resolving-challenge'
                          ? 'window'
                          : isMyTurn
                            ? 'mine'
                            : 'theirs'
                    }
                    opponentName={opponent?.displayName ?? 'Opponent'}
                  />
                  {opponent && (
                    <PresenceIndicator
                      displayName={opponent.displayName}
                      lastSeenAt={opponent.lastSeenAt}
                      connected={opponent.connected}
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <TimerDisplay
                    deadlineAt={view.phase === 'playing' ? view.turnDeadlineAt : null}
                    serverNow={view.serverNow}
                  />
                  <span className="font-mono">
                    {me?.score ?? 0} – {opponent?.score ?? 0}
                  </span>
                  <span className="text-xs text-tile-ink/60">{view.bagRemaining} in bag</span>
                </div>
              </div>
            )}
          </header>

          {!showLegacyHud && (
            <MatchHud
              you={{
                name: me?.displayName ?? 'You',
                score: me?.score ?? 0,
                isPresent: me?.connected ?? true,
                isActive: isMyTurn,
                ...(myLastDelta !== undefined ? { lastDelta: myLastDelta } : {}),
              }}
              opponent={{
                name: opponent?.displayName ?? 'Opponent',
                score: opponent?.score ?? 0,
                isPresent: opponent?.connected ?? false,
                isActive:
                  opponent !== undefined &&
                  view.activeSlot === opponent.slot &&
                  view.phase === 'playing',
                ...(opponentLastDelta !== undefined ? { lastDelta: opponentLastDelta } : {}),
              }}
              timer={{
                secondsRemaining: hudSecondsRemaining,
                secondsTotal: hudSecondsTotal,
                active: hudTimerActive,
              }}
              tilesInBag={view.bagRemaining}
            />
          )}

          {placedAt && (
            <ChallengeWindow
              placedAt={placedAt}
              serverNow={view.serverNow}
              canChallenge={canChallenge}
              pending={challengePending}
              onChallenge={onChallenge}
            />
          )}

          {recentOutcome && (
            <ChallengeOutcomeBanner
              outcome={recentOutcome}
              placerName={
                placerSlot !== null
                  ? (view.players.find((p) => p.slot === placerSlot)?.displayName ?? 'Placer')
                  : 'Placer'
              }
              challengerName={
                recentOutcome.kind !== 'unchallenged'
                  ? (view.players.find((p) => p.slot === recentOutcome.challengerSlot)
                      ?.displayName ?? 'Challenger')
                  : 'Challenger'
              }
              onDismiss={() => setRecentOutcome(null)}
            />
          )}

          {board}

          {!isMobile && <Rack {...rackProps} />}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <RackControls
              onShuffle={() => {
                tentative.shuffleRack();
                playShuffle();
              }}
              onRecallAll={() => {
                if (tentative.pendingPlacements.length > 0) playRecall();
                tentative.recallAll();
              }}
              hasTentativePlacements={tentative.pendingPlacements.length > 0}
              disabled={!isMyTurn || pending}
            />
            <div className="flex flex-wrap items-center gap-2">
              <SubmitButton
                onSubmit={onSubmit}
                disabled={!isMyTurn || tentative.pendingPlacements.length === 0}
                pending={pending}
                rejectionReason={null}
              />
              <PassButton onConfirm={onPass} disabled={!isMyTurn} pending={pending} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setExchangeOpen(true)}
                disabled={!isMyTurn || pending}
              >
                Exchange
              </Button>
            </div>
          </div>

          <RejectionInline message={error} />
        </section>

        <aside className="space-y-4">
          <MoveHistoryList history={view.history} displayNameBySlot={displayNameBySlot} />
        </aside>

        {isMobile && <RackSheet {...rackProps} />}

        <BlankTileDialog
          open={blankPickerForRackIndex !== null}
          onClose={() => setBlankPickerForRackIndex(null)}
          onAssign={(letter: Letter) => {
            if (blankPickerForRackIndex === null) return;
            tentative.assignBlank(blankPickerForRackIndex, letter);
            setSelectedRackIndex(blankPickerForRackIndex);
            setBlankPickerForRackIndex(null);
          }}
        />

        <ExchangeDialog
          open={exchangeOpen}
          rack={view.myRack ?? []}
          bagRemaining={view.bagRemaining}
          pending={pending}
          onClose={() => setExchangeOpen(false)}
          onConfirm={onExchange}
        />

        <div role="status" aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeDrag ? <TileChip tile={activeDrag.tile} size="lg" /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function announceTile(prefix: string, tile: Tile, suffix?: string): string {
  const letter = tile.kind === 'blank' ? (tile.assigned ?? 'blank') : tile.letter;
  const value = tile.value;
  const tail = suffix ? ` ${suffix}` : '';
  return `${prefix} ${letter}, value ${value}${tail}`;
}
