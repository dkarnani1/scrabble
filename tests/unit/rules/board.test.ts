import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  CENTER,
  createEmptyBoard,
  premiumAt,
  PREMIUM_LAYOUT,
} from '@rules/board';

describe('board layout', () => {
  it('is a 15x15 grid', () => {
    expect(BOARD_SIZE).toBe(15);
    expect(PREMIUM_LAYOUT).toHaveLength(15);
    for (const row of PREMIUM_LAYOUT) {
      expect(row).toHaveLength(15);
    }
  });

  it('places the center star at (7, 7)', () => {
    expect(CENTER).toEqual({ r: 7, c: 7 });
    expect(premiumAt({ r: 7, c: 7 })).toBe('CENTER');
  });

  it('matches the canonical Scrabble premium-square layout', () => {
    // Triple-Word at the four corners and at center of each edge.
    const tw: Array<[number, number]> = [
      [0, 0], [0, 7], [0, 14],
      [7, 0],         [7, 14],
      [14, 0], [14, 7], [14, 14],
    ];
    for (const [r, c] of tw) {
      expect(premiumAt({ r, c }), `TW at (${r},${c})`).toBe('TW');
    }

    // Double-Letter sample squares from official board.
    const dl: Array<[number, number]> = [
      [0, 3], [0, 11],
      [2, 6], [2, 8],
      [3, 0], [3, 7], [3, 14],
      [6, 2], [6, 6], [6, 8], [6, 12],
      [7, 3], [7, 11],
      [8, 2], [8, 6], [8, 8], [8, 12],
      [11, 0], [11, 7], [11, 14],
      [12, 6], [12, 8],
      [14, 3], [14, 11],
    ];
    for (const [r, c] of dl) {
      expect(premiumAt({ r, c }), `DL at (${r},${c})`).toBe('DL');
    }

    // Triple-Letter sample squares.
    const tl: Array<[number, number]> = [
      [1, 5], [1, 9],
      [5, 1], [5, 5], [5, 9], [5, 13],
      [9, 1], [9, 5], [9, 9], [9, 13],
      [13, 5], [13, 9],
    ];
    for (const [r, c] of tl) {
      expect(premiumAt({ r, c }), `TL at (${r},${c})`).toBe('TL');
    }
  });

  it('layout is symmetric across both axes', () => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const a = premiumAt({ r, c });
        const horizontal = premiumAt({ r, c: BOARD_SIZE - 1 - c });
        const vertical = premiumAt({ r: BOARD_SIZE - 1 - r, c });
        expect(a, `H mirror at (${r},${c})`).toBe(horizontal);
        expect(a, `V mirror at (${r},${c})`).toBe(vertical);
      }
    }
  });
});

describe('createEmptyBoard', () => {
  it('returns a 15x15 grid of nulls', () => {
    const board = createEmptyBoard();
    expect(board.cells).toHaveLength(15);
    for (const row of board.cells) {
      expect(row).toHaveLength(15);
      for (const cell of row) {
        expect(cell).toBeNull();
      }
    }
  });

  it('embeds the canonical premium layout by reference value', () => {
    const board = createEmptyBoard();
    expect(board.premiums[7]?.[7]).toBe('CENTER');
    expect(board.premiums[0]?.[0]).toBe('TW');
  });
});
