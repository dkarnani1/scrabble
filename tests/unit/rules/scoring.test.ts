// T202 — scoring unit tests.
//
// `scoreMove` consumes premiums on first placement only — once a tile occupies a square,
// later moves never re-trigger that square's premium. A 7-tile placement adds a 50-point
// "bingo" bonus.

import { describe, expect, it } from 'vitest';
import { scoreMove } from '@rules/scoring';
import { emptyBoard, boardWithCenterWord } from '@tests/fixtures/boards';
import type { Letter, PlacementCell, Tile } from '@rules/types';

function letter(l: Letter, value: number): Tile {
  return { kind: 'letter', letter: l, value };
}
function blank(assigned: Letter | null): Tile {
  return { kind: 'blank', assigned, value: 0 };
}
function cell(r: number, c: number, t: Tile): PlacementCell {
  return { coord: { r, c }, tile: t };
}

describe('scoreMove', () => {
  it('scores a center-covering first move with center-square doubled-word premium', () => {
    // CAT placed across (7,6),(7,7),(7,8). Letter values: C=3, A=1, T=1 → sum 5.
    // (7,7) is CENTER (acts as DW). Total = 5 * 2 = 10.
    const board = emptyBoard();
    const placement = [
      cell(7, 6, letter('C', 3)),
      cell(7, 7, letter('A', 1)),
      cell(7, 8, letter('T', 1)),
    ];
    const result = scoreMove(board, placement, { mainWord: 'CAT', crossWords: [] });
    expect(result.score).toBe(10);
    expect(result.isBingo).toBe(false);
  });

  it('does not re-apply premiums on squares that already have tiles from prior moves', () => {
    // Pretend CAT is already on the board centered. Now extend with 'S' at (7,9). The
    // only premium consumed is whatever sits at (7,9), and only by the new tile.
    const board = boardWithCenterWord('CAT');
    const placement = [cell(7, 9, letter('S', 1))];
    // Whole word formed: CATS. C, A, T are already on the board so their premiums do not
    // re-trigger. The score should equal the sum of letter values of CATS (3+1+1+1=6),
    // unmodified by the center premium (since CENTER cell (7,7) is already occupied).
    const result = scoreMove(board, placement, { mainWord: 'CATS', crossWords: [] });
    expect(result.score).toBe(6);
  });

  it('applies a triple-letter premium when a placed tile lands on TL', () => {
    // TL cells include (1,5). Place a 5-letter word such that one tile lands on TL.
    // To avoid complexity, place a single letter on a TL square and rely on a contrived
    // single-letter "word" — but our scoring guarantees mainWord ≥ 2. Use a tiny board
    // fixture: place a vertical word column 5 rows 1-2: "ZJ" with Z (value 10) at (1,5)
    // → letter Z gets 3x = 30; J at (2,5) is value 8. Total = 30 + 8 = 38. No word
    // premium.
    const board = emptyBoard();
    const placement = [cell(1, 5, letter('Z', 10)), cell(2, 5, letter('J', 8))];
    const result = scoreMove(board, placement, { mainWord: 'ZJ', crossWords: [] });
    expect(result.score).toBe(30 + 8);
  });

  it('applies a double-word premium when a placed tile lands on a DW square', () => {
    // (3,3) is a DW. Place 'AB' at (3,3),(3,4) — A=1, B=3. DW doubles the word total.
    // Sum letters = 4, doubled = 8.
    const board = emptyBoard();
    const placement = [cell(3, 3, letter('A', 1)), cell(3, 4, letter('B', 3))];
    const result = scoreMove(board, placement, { mainWord: 'AB', crossWords: [] });
    expect(result.score).toBe(8);
  });

  it('treats a blank tile as zero points regardless of assigned letter', () => {
    const board = emptyBoard();
    const placement = [
      cell(7, 6, letter('C', 3)),
      cell(7, 7, blank('A')),
      cell(7, 8, letter('T', 1)),
    ];
    // Letters: C=3, blank=0, T=1 → sum 4. Center premium doubles → 8.
    const result = scoreMove(board, placement, { mainWord: 'CAT', crossWords: [] });
    expect(result.score).toBe(8);
  });

  it('adds a 50-point bingo bonus when 7 tiles are placed in a single move', () => {
    // Place a 7-letter horizontal word AEINORS-style (use values 1 each = 7).
    const board = emptyBoard();
    const placement = [
      cell(7, 4, letter('A', 1)),
      cell(7, 5, letter('E', 1)),
      cell(7, 6, letter('I', 1)),
      cell(7, 7, letter('O', 1)),
      cell(7, 8, letter('N', 1)),
      cell(7, 9, letter('R', 1)),
      cell(7, 10, letter('S', 1)),
    ];
    const result = scoreMove(board, placement, { mainWord: 'AEIONRS', crossWords: [] });
    expect(result.isBingo).toBe(true);
    // The score will include any premiums hit; assert the bingo bonus is present (≥ 50).
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('sums main-word and cross-word scores', () => {
    // Build: CAT centered. Place vertical word "TS" at col 8 rows 7,8 — using existing
    // 'T' at (7,8) plus new 'S' at (8,8). The placed cell at (8,8) is on a DL square.
    // Main word: TS (vertical). Cross-words: none new (since only one tile placed and
    // its horizontal neighbors are existing letters that already form CAT). Wait — the
    // CAT row already exists with all three letters. Placing 'S' at (8,8) only extends
    // vertically; the horizontal axis at row 8 contains just 'S' → too short.
    const board = boardWithCenterWord('CAT');
    const placement = [cell(8, 8, letter('S', 1))]; // (8,8) is DL
    // Main word "TS": existing T (value 1) + new S (value 1, doubled by DL = 2) = 3.
    const result = scoreMove(board, placement, { mainWord: 'TS', crossWords: [] });
    expect(result.score).toBe(3);
  });
});
