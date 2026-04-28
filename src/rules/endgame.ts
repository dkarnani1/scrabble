// Endgame detection + final scoring. Pure: takes a (post-move) GameState and the kind
// of event that just happened, and returns either {ok: false} (no termination) or
// {ok: true, result, finalScores} with the final scores already adjusted for unplayed
// tiles.
//
// Two terminal conditions, per Scrabble-style rules:
//
//   1. Out-of-tiles: bag is empty AND a player has just emptied their rack via a
//      `place` move. Final scoring transfers the OTHER players' unplayed-tile values
//      to the player who went out (going-out bonus = sum of others' unplayed values),
//      and each other player's score is reduced by their own unplayed values.
//
//   2. Six-pass termination: `consecutiveScorelessTurns` reaches 6. NO transfer; each
//      player's score is reduced by their own unplayed-rack value.

import {
  isBlankTile,
  type GameResult,
  type GameState,
  type PlayerSlot,
  type PlayerState,
  type Rack,
} from './types';

export type EndgameEvent = { lastEvent: 'place' | 'pass' | 'exchange' };

export type EndgameOk = {
  ok: true;
  result: GameResult;
  finalScores: Partial<Record<PlayerSlot, number>>;
};

export type EndgameResult = EndgameOk | { ok: false };

export function evaluateEndgame(state: GameState, event: EndgameEvent): EndgameResult {
  // Out-of-tiles: only relevant after a `place` move.
  if (event.lastEvent === 'place' && state.bagRemaining === 0) {
    const goingOut = state.players.find((p) => p.rack !== undefined && p.rack.length === 0);
    if (goingOut) {
      const finalScores = finalizeScores(state.players, { transferToSlot: goingOut.slot });
      return {
        ok: true,
        result: {
          winnerSlot: pickWinner(finalScores),
          finalScores,
          endedReason: 'out-of-tiles',
        },
        finalScores,
      };
    }
  }

  // Six-pass termination: only relevant after a `pass` move.
  if (event.lastEvent === 'pass' && state.consecutiveScorelessTurns >= 6) {
    const finalScores = finalizeScores(state.players, { transferToSlot: null });
    return {
      ok: true,
      result: {
        winnerSlot: pickWinner(finalScores),
        finalScores,
        endedReason: 'six-pass-termination',
      },
      finalScores,
    };
  }

  return { ok: false };
}

// --- helpers -----------------------------------------------------------------

export function finalizeScores(
  players: ReadonlyArray<PlayerState>,
  opts: { transferToSlot: PlayerSlot | null },
): Partial<Record<PlayerSlot, number>> {
  const out: Partial<Record<PlayerSlot, number>> = {};
  let transferredSum = 0;
  for (const p of players) {
    const unplayed = sumRackValues(p.rack ?? []);
    if (opts.transferToSlot !== null && p.slot === opts.transferToSlot) {
      out[p.slot] = p.score; // going-out player keeps their score; bonus added below
    } else {
      out[p.slot] = p.score - unplayed;
      if (opts.transferToSlot !== null) transferredSum += unplayed;
    }
  }
  if (opts.transferToSlot !== null) {
    out[opts.transferToSlot] = (out[opts.transferToSlot] ?? 0) + transferredSum;
  }
  return out;
}

function sumRackValues(rack: Rack): number {
  let sum = 0;
  for (const t of rack) {
    sum += isBlankTile(t) ? 0 : t.value;
  }
  return sum;
}

function pickWinner(finalScores: Partial<Record<PlayerSlot, number>>): PlayerSlot | 'tie' {
  let best = -Infinity;
  let winner: PlayerSlot | 'tie' = 'tie';
  let tied = false;
  for (const [slotKey, score] of Object.entries(finalScores)) {
    const slot = Number(slotKey) as PlayerSlot;
    if (score === undefined) continue;
    if (score > best) {
      best = score;
      winner = slot;
      tied = false;
    } else if (score === best) {
      tied = true;
    }
  }
  return tied ? 'tie' : winner;
}
