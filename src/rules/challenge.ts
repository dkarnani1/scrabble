// Challenge resolver. Pure: given the post-place state plus the deltas needed to
// reverse the move (placed tiles, refill draws, score), decide whether the played
// words are all in the dictionary and return either:
//   - challenged-invalid: a fully reversed state (board, score, rack, bag) plus
//     consecutive_scoreless++ and the move's challenge_outcome attached.
//   - challenged-valid: the original state with the challenger's forfeit_next set
//     and the active slot advanced past them.
//
// The orchestration layer is responsible for persisting the result; this function
// only computes the new state.

import { isBlankTile } from './types';
import type {
  Board,
  ChallengeOutcome,
  CommittedMove,
  GameState,
  PlacedTile,
  PlacementCell,
  PlayerSlot,
  PlayerState,
  Rack,
  Tile,
} from './types';
import type { DictionarySet } from '@dictionary/load';

export type ChallengeInput = {
  /** Game state immediately after the place move (phase='challenge-window'). */
  state: GameState;
  /** Bag state immediately after the place refill draws were taken. */
  bagAfter: ReadonlyArray<Tile>;
  /** Tiles placed by the move under challenge. */
  lastMovePlacedTiles: ReadonlyArray<PlacementCell>;
  /** Tiles drawn from the bag to refill the placer's rack after the place. */
  lastMoveRefillDraws: ReadonlyArray<Tile>;
  /** Score awarded by the move (reversed on challenged-invalid). */
  lastMoveScore: number;
  /** Slot of the player raising the challenge (must be the opponent of the placer). */
  challengerSlot: PlayerSlot;
  /** Dictionary to validate the placed words against. */
  dictionary: DictionarySet;
};

export type ChallengeResolution = {
  outcome: ChallengeOutcome;
  state: GameState;
  bagAfter: Tile[];
};

export function resolveChallenge(input: ChallengeInput): ChallengeResolution {
  const lastCommitted = input.state.history.at(-1);
  if (!lastCommitted || lastCommitted.move.kind !== 'place') {
    throw new Error('resolveChallenge: last move must be a place move');
  }
  const placeMove = lastCommitted.move;
  const placerSlot = placeMove.playerSlot;

  const invalidWords = placeMove.words.filter((w) => !input.dictionary.has(w.toUpperCase()));

  if (invalidWords.length > 0) {
    // ---- Challenged-invalid: reverse the move's effects --------------------
    const outcome: ChallengeOutcome = {
      kind: 'challenged-invalid',
      challengerSlot: input.challengerSlot,
      invalidWords,
    };

    // Revert the board: drop the cells whose placedInMoveSeq matches this move's seq.
    const revertedCells: (PlacedTile | null)[][] = input.state.board.cells.map((row) =>
      row.map((cell) => (cell && cell.placedInMoveSeq === placeMove.seq ? null : cell)),
    );
    const revertedBoard: Board = {
      cells: revertedCells,
      premiums: input.state.board.premiums,
    };

    // Revert the placer's rack: drop the refill draws (last N tiles), restore the
    // played tiles (resetting blanks to unassigned).
    const players = input.state.players.map((p) => {
      if (p.slot !== placerSlot) return p;
      const rack: Rack = p.rack ?? [];
      const drawCount = input.lastMoveRefillDraws.length;
      const withoutRefill = rack.slice(0, Math.max(0, rack.length - drawCount));
      const restored: Tile[] = [
        ...withoutRefill,
        ...input.lastMovePlacedTiles.map((c) =>
          isBlankTile(c.tile) ? ({ kind: 'blank', assigned: null, value: 0 } as Tile) : c.tile,
        ),
      ];
      return {
        ...p,
        rack: restored,
        rackSize: restored.length,
        score: p.score - input.lastMoveScore,
      } satisfies PlayerState;
    });

    // Refill draws (cleansed of blank-assignment) returned to the FRONT of the bag —
    // exact reverse of how applyMove drew them off the front.
    const refillReturned: Tile[] = input.lastMoveRefillDraws.map((t) =>
      isBlankTile(t) ? { kind: 'blank', assigned: null, value: 0 } : t,
    );
    const newBag: Tile[] = [...refillReturned, ...input.bagAfter];

    const updatedHistory: CommittedMove[] = input.state.history.map((m, idx) =>
      idx === input.state.history.length - 1 ? { move: m.move, challenge: outcome } : m,
    );

    const reverted: GameState = {
      ...input.state,
      phase: 'playing',
      board: revertedBoard,
      players,
      history: updatedHistory,
      bagRemaining: newBag.length,
      consecutiveScorelessTurns: input.state.consecutiveScorelessTurns + 1,
      pendingChallenge: null,
      // active_slot stays — opponent (challenger) plays next, since the placer's turn
      // ended when they committed the (now-reversed) move. The contract calls this
      // "no rewind of turn ownership".
    };

    return { outcome, state: reverted, bagAfter: newBag };
  }

  // ---- Challenged-valid: move stands; challenger forfeits next turn ----------
  const outcome: ChallengeOutcome = {
    kind: 'challenged-valid',
    challengerSlot: input.challengerSlot,
  };

  // Mark forfeit on the challenger AND skip them: advance active_slot back to the
  // placer (challenger forfeits this turn). In a 2-player game this is exactly the
  // placer's slot. We keep `hasForfeitedNextTurn` cleared because the skip already
  // consumed the forfeit.
  const players = input.state.players.map((p) => {
    if (p.slot !== input.challengerSlot) return p;
    return { ...p, hasForfeitedNextTurn: false } satisfies PlayerState;
  });

  const updatedHistory: CommittedMove[] = input.state.history.map((m, idx) =>
    idx === input.state.history.length - 1 ? { move: m.move, challenge: outcome } : m,
  );

  // Pick the next active slot by skipping the challenger.
  const slots = input.state.players
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => p.slot);
  const challengerIdx = slots.indexOf(input.challengerSlot);
  const nextSlot = slots[(challengerIdx + 1) % slots.length] as PlayerSlot;

  const upheld: GameState = {
    ...input.state,
    phase: 'playing',
    players,
    history: updatedHistory,
    activeSlot: nextSlot,
    pendingChallenge: null,
  };

  return { outcome, state: upheld, bagAfter: input.bagAfter.slice() };
}
