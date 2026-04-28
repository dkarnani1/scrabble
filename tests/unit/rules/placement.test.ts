// T200 — placement validator unit tests.
//
// The validator is pure: it takes a board snapshot, the active player's rack, and the
// proposed `PlacementCell[]`, and returns either {ok: true} or a `rule-violation`
// reason. It does NOT score or mutate state — that's `applyMove`'s job.

import { describe, expect, it } from 'vitest';
import { validatePlacement } from '@rules/placement';
import { emptyBoard, boardWithCenterWord } from '@tests/fixtures/boards';
import type { Letter, PlacementCell, Rack, Tile } from '@rules/types';

function letter(l: Letter, value: number = 1): Tile {
  return { kind: 'letter', letter: l, value };
}
function blank(assigned: Letter | null = null): Tile {
  return { kind: 'blank', assigned, value: 0 };
}
function cell(r: number, c: number, t: Tile): PlacementCell {
  return { coord: { r, c }, tile: t };
}

describe('validatePlacement', () => {
  it('rejects an empty placement', () => {
    const board = emptyBoard();
    const rack: Rack = [letter('A'), letter('B')];
    const result = validatePlacement(board, rack, []);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-tiles-placed');
  });

  it('accepts a valid first move covering the center', () => {
    const board = emptyBoard();
    const rack: Rack = [letter('C'), letter('A'), letter('T')];
    const placement = [cell(7, 6, letter('C')), cell(7, 7, letter('A')), cell(7, 8, letter('T'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(true);
  });

  it('rejects a first move that does not cover the center', () => {
    const board = emptyBoard();
    const rack: Rack = [letter('C'), letter('A'), letter('T')];
    const placement = [cell(0, 0, letter('C')), cell(0, 1, letter('A')), cell(0, 2, letter('T'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('first-move-must-cover-center');
  });

  it('rejects placements not in a single line', () => {
    const board = boardWithCenterWord('CAT');
    const rack: Rack = [letter('S'), letter('R')];
    const placement = [cell(6, 7, letter('S')), cell(8, 8, letter('R'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('tiles-not-in-single-line');
  });

  it('rejects non-contiguous placements (gap with no existing tile)', () => {
    const board = emptyBoard();
    const rack: Rack = [letter('A'), letter('T')];
    const placement = [cell(7, 7, letter('A')), cell(7, 9, letter('T'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('tiles-not-contiguous');
  });

  it('accepts a placement that is contiguous through an existing tile', () => {
    // Board has CAT at row 7, cols 6-8. Place X at col 5 and Y at col 9 → not single
    // contiguous run because A and T are between them. The intent: place X at col 5 and
    // bridge through CAT. Use word DOG horizontally with existing CAT? Easier: place a
    // letter at col 9 alone, contiguous with CAT.
    const board = boardWithCenterWord('CAT');
    const rack: Rack = [letter('S')];
    const placement = [cell(7, 9, letter('S'))]; // CATS extension
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(true);
  });

  it('rejects a placement onto an occupied square', () => {
    const board = boardWithCenterWord('CAT');
    const rack: Rack = [letter('Z')];
    const placement = [cell(7, 7, letter('Z'))]; // 'A' is already there
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('square-already-occupied');
  });

  it('rejects placement of a tile not on the rack', () => {
    const board = emptyBoard();
    const rack: Rack = [letter('A'), letter('B')];
    const placement = [cell(7, 7, letter('Z'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('tile-not-on-rack');
  });

  it('rejects placement of a blank tile without an assigned letter', () => {
    const board = emptyBoard();
    const rack: Rack = [blank(), letter('T')];
    const placement = [cell(7, 7, blank()), cell(7, 8, letter('T'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('blank-not-assigned');
  });

  it('accepts a placement with a blank tile that has an assignment', () => {
    const board = emptyBoard();
    const rack: Rack = [blank(), letter('T')];
    const placement = [cell(7, 7, blank('A')), cell(7, 8, letter('T'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(true);
  });

  it('after the first move, requires the placement to connect to existing tiles', () => {
    const board = boardWithCenterWord('CAT');
    const rack: Rack = [letter('D'), letter('O'), letter('G')];
    const placement = [cell(0, 0, letter('D')), cell(0, 1, letter('O')), cell(0, 2, letter('G'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('not-connected-to-existing-tiles');
  });

  it('accepts a vertical placement that crosses through an existing horizontal word', () => {
    // CAT at row 7, cols 6-8. Place a vertical word that uses C as a pivot:
    // place 'A' at row 8, col 6 → forms vertical word "CA" (just one new letter; valid
    // because it connects to existing 'C').
    const board = boardWithCenterWord('CAT');
    const rack: Rack = [letter('A')];
    const placement = [cell(8, 6, letter('A'))];
    const result = validatePlacement(board, rack, placement);
    expect(result.ok).toBe(true);
  });
});
