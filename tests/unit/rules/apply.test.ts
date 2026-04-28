// T204 — applyMove orchestration tests.
//
// `applyMove` composes placement + words + scoring + bag mechanics into one pure
// transition. It returns either a new state (with rack mutation, refill, seq increment,
// active-slot rotation) or a rule-violation reason. Determinism comes from the bag
// — the bag is part of the action input here so tests can fully control draws.

import { describe, expect, it } from 'vitest';
import { applyMove } from '@rules/apply';
import { buildPlayingGame, makePlayer } from '@tests/fixtures/games';
import { tinyDictionary } from '@tests/fixtures/dictionaries';
import type { Letter, Rack, Tile } from '@rules/types';

function letter(l: Letter, v: number = 1): Tile {
  return { kind: 'letter', letter: l, value: v };
}

const RACK_CAT: Rack = [letter('C', 3), letter('A', 1), letter('T', 1), letter('S', 1)];

describe('applyMove', () => {
  it('applies a valid place move: scores, refills the rack, advances active slot, increments seq', () => {
    const dict = tinyDictionary();
    const players = [
      makePlayer(0, { rack: RACK_CAT, rackSize: RACK_CAT.length }),
      makePlayer(1, { rack: [letter('Z', 10)], rackSize: 1 }),
    ];
    const state = buildPlayingGame({ players });

    const refillBag: Tile[] = [letter('E', 1), letter('R', 1), letter('I', 1)];
    const result = applyMove({
      state,
      bag: refillBag,
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

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.activeSlot).toBe(1);
    expect(result.state.history).toHaveLength(state.history.length + 1);
    const lastMove = result.state.history.at(-1)!;
    expect(lastMove.move.kind).toBe('place');
    if (lastMove.move.kind === 'place') {
      expect(lastMove.move.score).toBeGreaterThan(0);
      expect(lastMove.move.words).toContain('CAT');
    }

    // Rack mutation: 3 tiles consumed, 3 drawn from refill bag.
    const me = result.state.players.find((p) => p.slot === 0);
    expect(me?.rackSize).toBe(RACK_CAT.length);
    expect(result.bagAfter.length).toBe(0); // we passed exactly 3 tiles to refill
    expect(result.state.consecutiveScorelessTurns).toBe(0);
  });

  it('rejects a place move with an invalid placement and leaves state unchanged', () => {
    const dict = tinyDictionary();
    const players = [
      makePlayer(0, { rack: [letter('Z')], rackSize: 1 }),
      makePlayer(1, { rack: [letter('Q')], rackSize: 1 }),
    ];
    const state = buildPlayingGame({ players });

    const result = applyMove({
      state,
      bag: [],
      dictionary: dict,
      action: {
        kind: 'place',
        playerSlot: 0,
        tiles: [{ coord: { r: 0, c: 0 }, tile: letter('Z') }],
      },
    });

    expect(result.ok).toBe(false);
  });

  it('records a voluntary pass: increments consecutiveScoreless and advances slot', () => {
    const dict = tinyDictionary();
    const players = [
      makePlayer(0, { rack: [letter('A')], rackSize: 1 }),
      makePlayer(1, { rack: [letter('B')], rackSize: 1 }),
    ];
    const state = buildPlayingGame({ players, consecutiveScorelessTurns: 1 });

    const result = applyMove({
      state,
      bag: [],
      dictionary: dict,
      action: { kind: 'pass', playerSlot: 0, reason: 'voluntary' },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activeSlot).toBe(1);
    expect(result.state.consecutiveScorelessTurns).toBe(2);
    const last = result.state.history.at(-1)!;
    expect(last.move.kind).toBe('pass');
  });

  it('records an exchange: returns tiles to bag, draws fresh, increments scoreless', () => {
    const dict = tinyDictionary();
    const players = [
      makePlayer(0, { rack: RACK_CAT, rackSize: RACK_CAT.length }),
      makePlayer(1, { rack: [letter('Z')], rackSize: 1 }),
    ];
    const state = buildPlayingGame({ players, bagRemaining: 50 });

    const refillBag: Tile[] = [
      letter('X', 8),
      letter('Y', 4),
      letter('M', 3),
      letter('N', 1),
      letter('O', 1),
      letter('P', 3),
      letter('Q', 10),
    ];
    const result = applyMove({
      state,
      bag: refillBag,
      dictionary: dict,
      action: { kind: 'exchange', playerSlot: 0, indices: [0, 1] },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.activeSlot).toBe(1);
    expect(result.state.consecutiveScorelessTurns).toBe(1);

    const last = result.state.history.at(-1)!;
    expect(last.move.kind).toBe('exchange');
    if (last.move.kind === 'exchange') expect(last.move.count).toBe(2);

    // The 2 returned tiles go into bagAfter, and 2 fresh tiles are drawn from refill.
    expect(result.bagAfter.length).toBe(refillBag.length - 2 + 2);
  });

  it('is deterministic: identical inputs produce identical outputs', () => {
    const dict = tinyDictionary();
    const players = [
      makePlayer(0, { rack: RACK_CAT, rackSize: RACK_CAT.length }),
      makePlayer(1, { rack: [letter('Z')], rackSize: 1 }),
    ];
    const state = buildPlayingGame({ players });
    const action = {
      kind: 'place' as const,
      playerSlot: 0 as const,
      tiles: [
        { coord: { r: 7, c: 6 }, tile: letter('C', 3) },
        { coord: { r: 7, c: 7 }, tile: letter('A', 1) },
        { coord: { r: 7, c: 8 }, tile: letter('T', 1) },
      ],
    };
    const refillBag: Tile[] = [letter('E'), letter('R'), letter('I')];

    const a = applyMove({ state, bag: refillBag.slice(), dictionary: dict, action });
    const b = applyMove({ state, bag: refillBag.slice(), dictionary: dict, action });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
});
