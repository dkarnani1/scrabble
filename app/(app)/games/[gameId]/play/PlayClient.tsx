'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BoardCanvas } from '@ui/components/board/BoardCanvas';
import { Rack } from '@ui/components/rack/Rack';
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
import { PresenceIndicator } from '@ui/components/play/PresenceIndicator';
import { TurnBanner } from '@ui/components/play/TurnBanner';
import { TimerDisplay } from '@ui/components/timer/TimerDisplay';
import { ChallengeWindow } from '@ui/components/challenge/ChallengeWindow';
import { ChallengeOutcomeBanner } from '@ui/components/challenge/ChallengeOutcomeBanner';
import { placeMove, passTurn, exchangeTiles } from '@/app/actions/moves';
import { raiseChallenge } from '@/app/actions/challenges';
import { getGameView } from '@/app/actions/games';
import type { GameView } from '@/app/actions/types';
import type { ChallengeOutcome, Letter, PlayerSlot } from '@rules/types';
import { Button } from '@ui/components/primitives';

export type PlayClientProps = {
  initialView: GameView;
  myUserId: string;
};

export function PlayClient({ initialView, myUserId }: PlayClientProps) {
  const router = useRouter();
  const [view, setView] = React.useState<GameView>(initialView);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const [exchangeOpen, setExchangeOpen] = React.useState(false);
  const [blankPickerForRackIndex, setBlankPickerForRackIndex] = React.useState<number | null>(null);
  const [selectedRackIndex, setSelectedRackIndex] = React.useState<number | null>(null);

  const tentative = useTentativeBoard({ rack: view.myRack ?? [] });

  // Navigate to the result screen as soon as the live view flips to a terminal phase.
  React.useEffect(() => {
    if (view.phase === 'completed' || view.phase === 'abandoned') {
      router.replace(`/games/${view.id}/result`);
    }
  }, [view.phase, view.id, router]);

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

  usePresenceHeartbeat({
    gameId: view.id,
    enabled: view.phase === 'playing' || view.phase === 'challenge-window',
  });

  const me = view.players.find((p) => p.userId === myUserId);
  const opponent = view.players.find((p) => p.userId !== myUserId);
  const mySlot = (me?.slot ?? null) as PlayerSlot | null;
  const isMyTurn = mySlot !== null && view.activeSlot === mySlot && view.phase === 'playing';

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

  const onSquareClick = (coord: { r: number; c: number }) => {
    if (selectedRackIndex === null || !isMyTurn) return;
    // Cannot place on a square that already has a committed tile.
    if (view.board.cells[coord.r]?.[coord.c]) return;
    // Cannot place onto a square that already has a tentative placement.
    const occupiedTentatively = tentative.pendingPlacements.some(
      (p) => p.coord.r === coord.r && p.coord.c === coord.c,
    );
    if (occupiedTentatively) return;

    const slot = tentative.slots.find((s) => s.rackIndex === selectedRackIndex);
    if (!slot) return;
    if (slot.tile.kind === 'blank' && slot.assignedLetter === null) {
      setBlankPickerForRackIndex(selectedRackIndex);
      return;
    }
    tentative.placeTile(selectedRackIndex, coord);
    setSelectedRackIndex(null);
  };

  const onSubmit = () => {
    setError(null);
    if (tentative.pendingPlacements.length === 0) {
      setError('Place at least one tile before submitting.');
      return;
    }
    startTransition(async () => {
      const result = await placeMove({
        gameId: view.id,
        tiles: tentative.pendingPlacements,
      });
      if (!result.ok) {
        if (result.error.code === 'rule-violation') setError(reasonToMessage(result.error.reason));
        else if (result.error.code === 'state-conflict')
          setError(reasonToMessage(result.error.reason));
        else if (result.error.code === 'invalid-input')
          setError(result.error.issues[0]?.message ?? 'Invalid move.');
        else setError('Move rejected.');
        return;
      }
      setView(result.data);
    });
  };

  const onPass = () => {
    setError(null);
    startTransition(async () => {
      const result = await passTurn({ gameId: view.id });
      if (!result.ok) {
        setError('Pass rejected.');
        return;
      }
      setView(result.data);
    });
  };

  const onChallenge = () => {
    if (!lastMove || lastMove.move.kind !== 'place') return;
    setError(null);
    startTransition(async () => {
      const result = await raiseChallenge({
        gameId: view.id,
        moveSeq: lastMove.move.seq,
      });
      if (!result.ok) {
        setError('Challenge could not be raised.');
        return;
      }
      setView(result.data);
    });
  };

  const onExchange = (indices: number[]) => {
    setError(null);
    startTransition(async () => {
      const result = await exchangeTiles({ gameId: view.id, tileIndices: indices });
      if (!result.ok) {
        setError('Exchange rejected.');
        return;
      }
      setExchangeOpen(false);
      setView(result.data);
    });
  };

  const displayNameBySlot: Partial<Record<PlayerSlot, string>> = {};
  for (const p of view.players) displayNameBySlot[p.slot] = p.displayName;

  return (
    <div className="grid gap-6 py-2 pb-28 md:grid-cols-[minmax(0,1fr)_320px] sm:pb-2">
      <section className="min-w-0 space-y-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">
              {me?.displayName ?? 'You'} vs {opponent?.displayName ?? 'Opponent'}
            </h1>
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
        </header>

        {placedAt && (
          <ChallengeWindow
            placedAt={placedAt}
            serverNow={view.serverNow}
            canChallenge={canChallenge}
            pending={pending}
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
                ? (view.players.find((p) => p.slot === recentOutcome.challengerSlot)?.displayName ??
                  'Challenger')
                : 'Challenger'
            }
            onDismiss={() => setRecentOutcome(null)}
          />
        )}

        <BoardCanvas
          board={view.board}
          tentativePlacements={tentative.pendingPlacements}
          lastMoveCells={lastMoveCells}
          onSquareClick={onSquareClick}
        />

        <Rack
          slots={tentative.slots}
          selectedRackIndex={selectedRackIndex}
          onSelectTile={setSelectedRackIndex}
          disabled={!isMyTurn || pending}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <RackControls
            onShuffle={tentative.shuffleRack}
            onRecallAll={tentative.recallAll}
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
    </div>
  );
}
