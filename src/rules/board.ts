// 15x15 board geometry and the canonical premium-square layout. The layout matches
// the official English Scrabble-style board (eight TW squares at corners + edge midpoints,
// 17 DL, 12 TL, 16 DW, with the center marked CENTER as a special DW that also
// satisfies the first-move-on-center rule).

import type { Board, Coord, PlacedTile, PremiumKind } from './types';

export const BOARD_SIZE = 15 as const;
export const CENTER: Coord = Object.freeze({ r: 7, c: 7 });

// Build the layout once at module load. Symmetric across both axes by construction.
export const PREMIUM_LAYOUT: ReadonlyArray<ReadonlyArray<PremiumKind>> = (() => {
  const grid: PremiumKind[][] = Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => 'none' as PremiumKind),
  );

  const set = (r: number, c: number, kind: PremiumKind) => {
    if (grid[r] !== undefined) grid[r][c] = kind;
  };

  // Triple-Word: corners + edge midpoints.
  const twCoords: Array<[number, number]> = [
    [0, 0], [0, 7], [0, 14],
    [7, 0],          [7, 14],
    [14, 0], [14, 7], [14, 14],
  ];
  for (const [r, c] of twCoords) set(r, c, 'TW');

  // Double-Word: the X across the board (radii 1..4 from center on each diagonal),
  // plus rows/columns 3 and 11.
  for (let i = 1; i <= 4; i++) {
    set(i, i, 'DW');
    set(i, BOARD_SIZE - 1 - i, 'DW');
    set(BOARD_SIZE - 1 - i, i, 'DW');
    set(BOARD_SIZE - 1 - i, BOARD_SIZE - 1 - i, 'DW');
  }

  // Triple-Letter: the 12 standard squares.
  const tlCoords: Array<[number, number]> = [
    [1, 5], [1, 9],
    [5, 1], [5, 5], [5, 9], [5, 13],
    [9, 1], [9, 5], [9, 9], [9, 13],
    [13, 5], [13, 9],
  ];
  for (const [r, c] of tlCoords) set(r, c, 'TL');

  // Double-Letter: the 24 standard squares.
  const dlCoords: Array<[number, number]> = [
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
  for (const [r, c] of dlCoords) set(r, c, 'DL');

  // Center is a DW with a star marker.
  set(CENTER.r, CENTER.c, 'CENTER');

  // Freeze the rows and the outer array so the layout cannot be mutated at runtime.
  return Object.freeze(grid.map((row) => Object.freeze(row.slice())));
})();

export function premiumAt(coord: Coord): PremiumKind {
  if (!isOnBoard(coord)) return 'none';
  return PREMIUM_LAYOUT[coord.r]![coord.c]!;
}

export function isOnBoard(coord: Coord): boolean {
  return coord.r >= 0 && coord.r < BOARD_SIZE && coord.c >= 0 && coord.c < BOARD_SIZE;
}

export function createEmptyBoard(): Board {
  const cells: ReadonlyArray<ReadonlyArray<PlacedTile | null>> = Array.from(
    { length: BOARD_SIZE },
    () => Array.from({ length: BOARD_SIZE }, () => null as PlacedTile | null),
  );
  return { cells, premiums: PREMIUM_LAYOUT };
}
