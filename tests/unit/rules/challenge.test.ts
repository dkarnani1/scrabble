// T500 — challenge resolution unit tests.
//
// `resolveChallenge` is the pure function that takes a state immediately after a
// `place` move (phase='challenge-window'), the challenger's slot, and a dictionary,
// and returns either a successful reversal (board / score / rack / bag) or a
// failure outcome that marks the challenger with forfeit_next.

import { describe, expect, it } from 'vitest';
import { resolveChallenge } from '@rules/challenge';
import { applyMove } from '@rules/apply';
import { buildPlayingGame, makePlayer } from '@tests/fixtures/games';
import { tinyDictionary } from '@tests/fixtures/dictionaries';
import { loadDictionaryFromString } from '@dictionary/load';
import type { Letter, Rack, Tile } from '@rules/types';

function letter(l: Letter, v: number = 1): Tile {
  return { kind: 'letter', letter: l, value: v };
}

const RACK_CAT: Rack = [letter('C', 3), letter('A', 1), letter('T', 1), letter('S', 1)];

function placeCAT() {
  const dict = tinyDictionary();
  const players = [
    makePlayer(0, { rack: RACK_CAT, rackSize: RACK_CAT.length, score: 0 }),
    makePlayer(1, { rack: [letter('Z', 10)], rackSize: 1 }),
  ];
  const state = buildPlayingGame({ players });
  const refill: Tile[] = [letter('E', 1), letter('R', 1), letter('I', 1)];
  const result = applyMove({
    state,
    bag: refill,
    dictionary: dict,
    action: {
      kind: 'place',
      playerSlot: 0,
      tiles: [
        { coord: { r: 7, c: 6 }, tile: letter('C', 3) },
        { coord: { r: 7, c: 7 }, tile: letter('A', 1) },
        { coord: { r: 7, c: 8 }, tile: letter('T', 1) },
      ],
    },
  });
  if (!result.ok) throw new Error('placeCAT setup failed');
  return { result, refill };
}

describe('resolveChallenge', () => {
  it('challenged-invalid: reverses board, score, rack, bag deterministically', () => {
    // Use a dictionary that does NOT contain CAT to simulate an invalid word.
    const noCatDict = loadDictionaryFromString(['DOG', 'TREE'].join('\n'));
    const { result, refill } = placeCAT();
    const placerScoreBefore =
      result.state.history.at(-1)!.move.kind === 'place' ? result.state.history.at(-1)! : null;
    expect(placerScoreBefore).not.toBeNull();

    const reversed = resolveChallenge({
      state: result.state,
      bagAfter: result.bagAfter,
      lastMovePlacedTiles: result.placedTiles,
      lastMoveRefillDraws: result.refillDraws,
      lastMoveScore:
        result.state.history.at(-1)!.move.kind === 'place'
          ? (result.state.history.at(-1)!.move as { score: number }).score
          : 0,
      challengerSlot: 1,
      dictionary: noCatDict,
    });

    expect(reversed.outcome.kind).toBe('challenged-invalid');
    if (reversed.outcome.kind !== 'challenged-invalid') return;
    expect(reversed.outcome.invalidWords).toContain('CAT');

    // Board reverted: the placed cells should be null again.
    for (const c of result.placedTiles) {
      expect(reversed.state.board.cells[c.coord.r]?.[c.coord.c]).toBeNull();
    }

    // Score reverted to 0.
    const placer = reversed.state.players.find((p) => p.slot === 0)!;
    expect(placer.score).toBe(0);

    // Rack restored: the original C, A, T, S tiles are back; the refill (E, R, I) gone.
    expect(placer.rack?.map((t) => (t.kind === 'letter' ? t.letter : '?')).sort()).toEqual(
      ['A', 'C', 'S', 'T'].sort(),
    );

    // Bag receives the refill back at the front.
    expect(reversed.bagAfter.slice(0, refill.length)).toEqual(refill);

    // consecutive_scoreless incremented (the move now counts as a scoreless turn).
    expect(reversed.state.consecutiveScorelessTurns).toBe(
      result.state.consecutiveScorelessTurns + 1,
    );

    // Move's challenge_outcome updated.
    const lastMove = reversed.state.history.at(-1)!;
    expect(lastMove.challenge.kind).toBe('challenged-invalid');

    // Active slot stays with the opponent (challenger). Phase transitions to playing.
    expect(reversed.state.phase).toBe('playing');
    expect(reversed.state.activeSlot).toBe(1);
  });

  it('challenged-valid: move stands, challenger forfeits next turn', () => {
    const dict = tinyDictionary(); // CAT is in this dict.
    const { result } = placeCAT();

    const resolved = resolveChallenge({
      state: result.state,
      bagAfter: result.bagAfter,
      lastMovePlacedTiles: result.placedTiles,
      lastMoveRefillDraws: result.refillDraws,
      lastMoveScore:
        result.state.history.at(-1)!.move.kind === 'place'
          ? (result.state.history.at(-1)!.move as { score: number }).score
          : 0,
      challengerSlot: 1,
      dictionary: dict,
    });

    expect(resolved.outcome.kind).toBe('challenged-valid');
    if (resolved.outcome.kind !== 'challenged-valid') return;
    expect(resolved.outcome.challengerSlot).toBe(1);

    // Move stands.
    const placer = resolved.state.players.find((p) => p.slot === 0)!;
    expect(placer.score).toBeGreaterThan(0);
    expect(resolved.state.board.cells[7]?.[7]).not.toBeNull();

    // Active slot returns to the placer (challenger's turn skipped).
    expect(resolved.state.activeSlot).toBe(0);
    expect(resolved.state.phase).toBe('playing');

    // Challenge outcome attached to the last move.
    expect(resolved.state.history.at(-1)!.challenge.kind).toBe('challenged-valid');
  });
});
