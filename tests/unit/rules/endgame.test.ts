// T300 — endgame detection + final scoring unit tests.
//
// Two terminal conditions:
//   1. Out-of-tiles: bag is empty AND a player has just emptied their rack via a place
//      move. Final scoring transfers the OTHER players' unplayed-tile values to the
//      player who went out, doubled (sum-of-others * 2 added to the going-out player;
//      each other player's score is reduced by their own unplayed values).
//   2. Six-pass termination: six consecutive scoreless turns. NO transfer; each player's
//      score is reduced by their own unplayed-rack value.
//
// `evaluateEndgame` is pure: takes (state, lastEvent) and returns either {ok: false}
// (no termination) or {ok: true, result: GameResult, finalScores}.

import { describe, expect, it } from 'vitest';
import { evaluateEndgame, finalizeScores } from '@rules/endgame';
import { buildPlayingGame, makePlayer } from '@tests/fixtures/games';
import type { Letter, Tile } from '@rules/types';

function letter(l: Letter, value: number): Tile {
  return { kind: 'letter', letter: l, value };
}

describe('evaluateEndgame: out-of-tiles', () => {
  it('triggers termination when active player just emptied rack and bag is empty', () => {
    const players = [
      makePlayer(0, { rack: [], rackSize: 0, score: 100 }),
      makePlayer(1, { rack: [letter('Q', 10), letter('Z', 10)], rackSize: 2, score: 80 }),
    ];
    const state = buildPlayingGame({ players, bagRemaining: 0 });
    const result = evaluateEndgame(state, { lastEvent: 'place' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.endedReason).toBe('out-of-tiles');
    // Going-out bonus: opponent's unplayed sum (20) added to slot 0.
    expect(result.finalScores[0]).toBe(100 + 20);
    // Each other player loses their own unplayed sum.
    expect(result.finalScores[1]).toBe(80 - 20);
    expect(result.result.winnerSlot).toBe(0);
  });

  it('does not trigger if rack is empty but bag still has tiles', () => {
    const players = [
      makePlayer(0, { rack: [], rackSize: 0, score: 50 }),
      makePlayer(1, { rack: [letter('A', 1)], rackSize: 1, score: 40 }),
    ];
    const state = buildPlayingGame({ players, bagRemaining: 5 });
    const result = evaluateEndgame(state, { lastEvent: 'place' });
    expect(result.ok).toBe(false);
  });

  it('declares a tie when final scores match', () => {
    const players = [
      makePlayer(0, { rack: [], rackSize: 0, score: 100 }),
      makePlayer(1, { rack: [letter('A', 1)], rackSize: 1, score: 100 + 1 - 1 }),
      // After transfer: slot 0 = 100 + 1 = 101, slot 1 = 101 - 1 = 100. Tweak so equal.
    ];
    // Recompute manually: we need 100 + opponent_unplayed == opponent_score - opponent_unplayed
    // 100 + x == y - x → y = 100 + 2x. With x=1 → y=102.
    const balanced = [
      makePlayer(0, { rack: [], rackSize: 0, score: 100 }),
      makePlayer(1, { rack: [letter('A', 1)], rackSize: 1, score: 102 }),
    ];
    const state = buildPlayingGame({ players: balanced, bagRemaining: 0 });
    const result = evaluateEndgame(state, { lastEvent: 'place' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.finalScores[0]).toBe(101);
    expect(result.finalScores[1]).toBe(101);
    expect(result.result.winnerSlot).toBe('tie');
  });
});

describe('evaluateEndgame: six-pass termination', () => {
  it('triggers when consecutiveScorelessTurns reaches 6 (no rack transfer)', () => {
    const players = [
      makePlayer(0, { rack: [letter('A', 1), letter('B', 3)], rackSize: 2, score: 50 }),
      makePlayer(1, { rack: [letter('Q', 10)], rackSize: 1, score: 60 }),
    ];
    const state = buildPlayingGame({
      players,
      consecutiveScorelessTurns: 6,
      bagRemaining: 30,
    });
    const result = evaluateEndgame(state, { lastEvent: 'pass' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.endedReason).toBe('six-pass-termination');
    // No transfer; each player loses their own unplayed sum.
    expect(result.finalScores[0]).toBe(50 - 4);
    expect(result.finalScores[1]).toBe(60 - 10);
    expect(result.result.winnerSlot).toBe(1); // 50 - 4 = 46; 60 - 10 = 50
  });

  it('does NOT trigger on a single pass (consecutiveScorelessTurns < 6)', () => {
    const players = [
      makePlayer(0, { rack: [letter('A', 1)], rackSize: 1, score: 10 }),
      makePlayer(1, { rack: [letter('B', 3)], rackSize: 1, score: 20 }),
    ];
    const state = buildPlayingGame({ players, consecutiveScorelessTurns: 1 });
    const result = evaluateEndgame(state, { lastEvent: 'pass' });
    expect(result.ok).toBe(false);
  });
});

describe('finalizeScores: pure helper used by both paths', () => {
  it("subtracts each player's own unplayed values when no transfer occurs", () => {
    const players = [
      makePlayer(0, { rack: [letter('A', 1), letter('B', 3)], rackSize: 2, score: 30 }),
      makePlayer(1, { rack: [letter('C', 3)], rackSize: 1, score: 40 }),
    ];
    const finals = finalizeScores(players, { transferToSlot: null });
    expect(finals[0]).toBe(30 - 4);
    expect(finals[1]).toBe(40 - 3);
  });

  it("transfers other players' unplayed values to the going-out slot", () => {
    const players = [
      makePlayer(0, { rack: [], rackSize: 0, score: 10 }),
      makePlayer(1, { rack: [letter('Z', 10)], rackSize: 1, score: 20 }),
    ];
    const finals = finalizeScores(players, { transferToSlot: 0 });
    expect(finals[0]).toBe(10 + 10);
    expect(finals[1]).toBe(20 - 10);
  });

  it('treats blanks as zero in unplayed-tile penalty', () => {
    const players = [
      makePlayer(0, { rack: [{ kind: 'blank', assigned: null, value: 0 }], rackSize: 1, score: 5 }),
      makePlayer(1, { rack: [letter('A', 1)], rackSize: 1, score: 5 }),
    ];
    const finals = finalizeScores(players, { transferToSlot: null });
    expect(finals[0]).toBe(5);
    expect(finals[1]).toBe(4);
  });
});
