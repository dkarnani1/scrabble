// applyMove — the pure transition function. Composes placement validation, word
// identification, scoring, rack mutation, refill draws, and active-slot rotation into
// one deterministic step. Returns either a new state + an updated bag, or a
// rule-violation reason.
//
// Determinism note: bag manipulation (drawing refills, returning exchanged tiles) is
// driven by the bag passed in. Callers (orchestration) seed and shuffle the bag using
// the game's `rng_seed` so the same inputs always produce the same outputs.

import { drawTiles } from './bag';
import { validateExchange } from './exchange';
import { validatePlacement, type PlacementError } from './placement';
import { rebuildBoardCells } from './words';
import { scoreMove } from './scoring';
import { evaluateEndgame } from './endgame';
import type { DictionarySet } from '@dictionary/load';
import type {
  Board,
  CommittedMove,
  GameState,
  PlacementCell,
  PlayerSlot,
  PlayerState,
  Rack,
  Tile,
} from './types';
import { isBlankTile } from './types';

export type ApplyAction =
  | {
      kind: 'place';
      playerSlot: PlayerSlot;
      tiles: ReadonlyArray<PlacementCell>;
    }
  | {
      kind: 'pass';
      playerSlot: PlayerSlot;
      reason: 'voluntary' | 'forced-timeout';
    }
  | {
      kind: 'exchange';
      playerSlot: PlayerSlot;
      indices: ReadonlyArray<number>;
    };

export type ApplyError =
  | {
      kind: 'rule-violation';
      reason: PlacementError | 'word-not-in-dictionary' | 'exchange-bag-too-small';
    }
  | { kind: 'state-conflict'; reason: 'not-your-turn' | 'wrong-game-phase' };

export type ApplyResult =
  | {
      ok: true;
      state: GameState;
      bagAfter: Tile[];
      refillDraws: Tile[]; // tiles drawn to refill the active player's rack
      placedTiles: ReadonlyArray<PlacementCell>;
    }
  | { ok: false; error: ApplyError };

export function applyMove(args: {
  state: GameState;
  bag: ReadonlyArray<Tile>;
  dictionary: DictionarySet;
  action: ApplyAction;
  /** Optional override for `now`. Used by deterministic tests; defaults to system time. */
  now?: () => Date;
}): ApplyResult {
  const { state, action } = args;
  const bag = args.bag.slice();
  const nowIso = (args.now?.() ?? new Date()).toISOString();

  if (state.phase !== 'playing') {
    return { ok: false, error: { kind: 'state-conflict', reason: 'wrong-game-phase' } };
  }
  if (state.activeSlot !== action.playerSlot) {
    return { ok: false, error: { kind: 'state-conflict', reason: 'not-your-turn' } };
  }

  const me = state.players.find((p) => p.slot === action.playerSlot);
  if (!me || !me.rack) {
    return { ok: false, error: { kind: 'state-conflict', reason: 'not-your-turn' } };
  }

  const newSeq = state.history.length + 1;
  const otherSlot = nextSlot(state, action.playerSlot);

  if (action.kind === 'place') {
    const validation = validatePlacement(state.board, me.rack, action.tiles);
    if (!validation.ok) {
      return { ok: false, error: { kind: 'rule-violation', reason: validation.reason } };
    }

    const score = scoreMove(state.board, action.tiles);
    // Intentionally NOT dictionary-checking here. The challenge mechanic is the
    // dictionary-enforcement path: placers may bluff with non-words, and the
    // opponent's 3-second window is the only check. resolveChallenge does the
    // lookup and reverses the move if the words aren't valid.

    // Mutate rack: consume placed tiles.
    const newRack = consumeTilesFromRack(
      me.rack,
      action.tiles.map((c) => c.tile),
    );
    // Refill draw.
    const draw = drawTiles(bag, action.tiles.length);
    const filledRack: Rack = [...newRack, ...draw.drawn];
    const bagAfter = draw.remaining;

    const newBoardCells = rebuildBoardCells(state.board, action.tiles, newSeq);
    const newBoard: Board = { cells: newBoardCells, premiums: state.board.premiums };

    const newPlayers = state.players.map((p) =>
      p.slot === action.playerSlot
        ? { ...p, rack: filledRack, rackSize: filledRack.length, score: p.score + score.score }
        : p,
    );

    const newCommittedMove: CommittedMove = {
      move: {
        kind: 'place',
        seq: newSeq,
        playerSlot: action.playerSlot,
        tiles: action.tiles.slice(),
        score: score.score,
        words: [score.mainWord, ...score.crossWords],
        isBingo: score.isBingo,
        createdAt: nowIso,
      },
      challenge: { kind: 'unchallenged' },
    };

    const intermediateState: GameState = {
      ...state,
      board: newBoard,
      players: newPlayers,
      history: [...state.history, newCommittedMove],
      activeSlot: otherSlot,
      bagRemaining: bagAfter.length,
      consecutiveScorelessTurns: 0,
      turnStartedAt: nowIso,
      turnDeadlineAt: state.turnDeadlineAt,
    };
    const finalized = finalizeIfTerminal(intermediateState, 'place');
    return {
      ok: true,
      state: finalized,
      bagAfter,
      refillDraws: draw.drawn,
      placedTiles: action.tiles,
    };
  }

  if (action.kind === 'pass') {
    const newPlayers = state.players;
    const newCommittedMove: CommittedMove = {
      move: {
        kind: 'pass',
        seq: newSeq,
        playerSlot: action.playerSlot,
        reason: action.reason,
        createdAt: nowIso,
      },
      challenge: { kind: 'unchallenged' },
    };
    const intermediateState: GameState = {
      ...state,
      players: newPlayers,
      history: [...state.history, newCommittedMove],
      activeSlot: otherSlot,
      consecutiveScorelessTurns: state.consecutiveScorelessTurns + 1,
      turnStartedAt: nowIso,
    };
    const finalized = finalizeIfTerminal(intermediateState, 'pass');
    return {
      ok: true,
      state: finalized,
      bagAfter: bag,
      refillDraws: [],
      placedTiles: [],
    };
  }

  // exchange
  const exchangeValidation = validateExchange({
    rack: me.rack,
    bagCount: state.bagRemaining,
    indices: action.indices,
  });
  if (!exchangeValidation.ok) {
    return { ok: false, error: { kind: 'rule-violation', reason: exchangeValidation.reason } };
  }

  // Remove tiles at the given indices from the rack.
  const remaining: Tile[] = [];
  const returned: Tile[] = [];
  const idxSet = new Set(action.indices);
  me.rack.forEach((t, i) => (idxSet.has(i) ? returned.push(t) : remaining.push(t)));

  // Draw fresh tiles, then put returned tiles back into the bag (shuffle determinism is
  // managed by the orchestration layer — here we keep the order the bag arrived in for
  // tests, and append returned tiles at the end). The orchestration layer reshuffles the
  // bag as a separate step using the next rng_seed.
  const draw = drawTiles(bag, returned.length);
  const filledRack: Rack = [...remaining, ...draw.drawn];
  const bagAfter = [...draw.remaining, ...returned];

  const newPlayers = state.players.map((p) =>
    p.slot === action.playerSlot ? { ...p, rack: filledRack, rackSize: filledRack.length } : p,
  );

  const newCommittedMove: CommittedMove = {
    move: {
      kind: 'exchange',
      seq: newSeq,
      playerSlot: action.playerSlot,
      count: returned.length,
      createdAt: nowIso,
    },
    challenge: { kind: 'unchallenged' },
  };

  const intermediateState: GameState = {
    ...state,
    players: newPlayers,
    history: [...state.history, newCommittedMove],
    activeSlot: otherSlot,
    consecutiveScorelessTurns: state.consecutiveScorelessTurns + 1,
    bagRemaining: bagAfter.length,
    turnStartedAt: nowIso,
  };
  const finalized = finalizeIfTerminal(intermediateState, 'exchange');
  return {
    ok: true,
    state: finalized,
    bagAfter,
    refillDraws: draw.drawn,
    placedTiles: [],
  };
}

// --- helpers -----------------------------------------------------------------

function finalizeIfTerminal(state: GameState, lastEvent: 'place' | 'pass' | 'exchange'): GameState {
  const verdict = evaluateEndgame(state, { lastEvent });
  if (!verdict.ok) return state;

  // Apply final-score adjustments to each player.
  const finalized: GameState = {
    ...state,
    phase: 'completed',
    activeSlot: null,
    turnStartedAt: null,
    turnDeadlineAt: null,
    endedAt: new Date().toISOString(),
    result: verdict.result,
    players: state.players.map((p) => ({
      ...p,
      score: verdict.finalScores[p.slot] ?? p.score,
    })),
  };
  return finalized;
}

function consumeTilesFromRack(rack: Rack, placed: ReadonlyArray<Tile>): Rack {
  const out = rack.slice();
  for (const t of placed) {
    const idx = out.findIndex((r) =>
      isBlankTile(r) ? isBlankTile(t) : !isBlankTile(t) && r.letter === t.letter,
    );
    if (idx === -1) {
      throw new Error(
        'consumeTilesFromRack: tile missing on rack (validation should have caught this)',
      );
    }
    out.splice(idx, 1);
  }
  return out;
}

function nextSlot(state: GameState, current: PlayerSlot): PlayerSlot {
  const slots = state.players
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p) => p.slot);
  const idx = slots.indexOf(current);
  return slots[(idx + 1) % slots.length] as PlayerSlot;
}

// Re-export helper for orchestration / persistence / UI consumers that build their own
// "post-placement board" without going through applyMove.
export { rebuildBoardCells } from './words';
export { type PlayerState };
