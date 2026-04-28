// T201 — word identification unit tests.
//
// `identifyWords` takes the (already-validated) placement and the prior board state and
// returns the main word + every cross-word that the placement formed. Words are returned
// as plain strings (uppercased letters; blanks rendered as their assigned letter).

import { describe, expect, it } from 'vitest';
import { identifyWords } from '@rules/words';
import { emptyBoard, boardWithCenterWord } from '@tests/fixtures/boards';
import type { Letter, PlacementCell, Tile } from '@rules/types';

function letter(l: Letter): Tile {
  return { kind: 'letter', letter: l, value: 1 };
}
function blank(assigned: Letter | null): Tile {
  return { kind: 'blank', assigned, value: 0 };
}
function cell(r: number, c: number, t: Tile): PlacementCell {
  return { coord: { r, c }, tile: t };
}

describe('identifyWords', () => {
  it('identifies the single main word formed by a horizontal first move', () => {
    const board = emptyBoard();
    const placement = [cell(7, 6, letter('C')), cell(7, 7, letter('A')), cell(7, 8, letter('T'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('CAT');
    expect(result.crossWords).toEqual([]);
  });

  it('extends an existing word and reports the full new word', () => {
    const board = boardWithCenterWord('CAT');
    const placement = [cell(7, 9, letter('S'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('CATS');
  });

  it('reports cross-words formed perpendicular to the main word', () => {
    // CAT at row 7 cols 6-8. Place vertical 'AR' below the 'A' at row 8 (col 7) and 'R'
    // at row 9 col 7 → vertical word "AAR"? No: existing A at (7,7), placed A at (8,7),
    // placed R at (9,7) → word "AAR". Cross-words: only the vertical word (since there
    // are no other horizontal words formed).
    //
    // Use a cleaner case: place vertical 'O' and 'X' below the 'A' at (8,7),(9,7):
    // vertical word "AOX" (A from board + new O + new X). The main word axis is
    // vertical and there are no cross-words.
    const board = boardWithCenterWord('CAT');
    const placement = [cell(8, 7, letter('O')), cell(9, 7, letter('X'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('AOX');
    expect(result.crossWords).toEqual([]);
  });

  it('reports a cross-word when a placed tile sits adjacent to an existing tile', () => {
    // CAT at row 7 cols 6-8. Now place 'B','I','T' at row 8 cols 5,6,7. The main word
    // (horizontal) is "BIT". Placed tile at (8,6) sits adjacent to 'A' at (7,6)? No —
    // 'A' is at (7,7). Placed 'I' at (8,6) sits below 'C' at (7,6) → cross-word "CI".
    // Placed 'T' at (8,7) sits below 'A' at (7,7) → cross-word "AT".
    const board = boardWithCenterWord('CAT');
    const placement = [cell(8, 5, letter('B')), cell(8, 6, letter('I')), cell(8, 7, letter('T'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('BIT');
    // Cross-words come from any placed cell whose perpendicular run is length ≥ 2.
    expect(result.crossWords.sort()).toEqual(['AT', 'CI'].sort());
  });

  it('uses the assigned letter for blank tiles when forming words', () => {
    const board = emptyBoard();
    const placement = [cell(7, 6, letter('C')), cell(7, 7, blank('A')), cell(7, 8, letter('T'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('CAT');
  });

  it('handles a single-tile placement that extends in both directions', () => {
    // Custom: build a board with vertical "BA" at col 7, rows 6-7, then place 'T' at
    // (7,8) → main word horizontal "AT" (using existing A and new T), cross-word
    // vertical at col 8 is just "T" (length 1, ignored).
    const base = boardWithCenterWord('A'); // single 'A' at (7,7)
    // Add a 'B' at (6,7) manually.
    const cells = base.cells.map((row) => row.slice());
    cells[6]![7] = { tile: { kind: 'letter', letter: 'B', value: 3 }, placedInMoveSeq: 1 };
    const board = { ...base, cells };

    const placement = [cell(7, 8, letter('T'))];
    const result = identifyWords(board, placement);
    expect(result.mainWord).toBe('AT');
  });
});
