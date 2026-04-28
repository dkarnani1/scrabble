// Pre-built board fixtures. Tests compose one of these as the "starting position"
// instead of re-deriving the same setup every time.

import { createEmptyBoard, BOARD_SIZE } from '@rules/board';
import { LETTER_VALUES } from '@rules/distribution';
import type { Board, Letter, PlacedTile } from '@rules/types';

export function emptyBoard(): Board {
  return createEmptyBoard();
}

/** Build a board where a single horizontal word has already been placed centered on
 * the star. Tiles get the standard English letter values (C=3, A=1, etc.) so scoring
 * tests reflect real arithmetic.
 *   word: e.g. 'HELLO' (uppercase letters only)
 *   moveSeq: which committed-move seq to attribute the placed tiles to
 */
export function boardWithCenterWord(word: string, moveSeq: number = 1): Board {
  const upper = word.toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) throw new Error(`boardWithCenterWord: invalid word "${word}"`);

  const center = Math.floor(BOARD_SIZE / 2);
  const start = center - Math.floor(upper.length / 2);
  if (start < 0 || start + upper.length > BOARD_SIZE) {
    throw new Error(`boardWithCenterWord: word "${word}" does not fit centered on the board`);
  }

  const base = createEmptyBoard();
  const cells: (PlacedTile | null)[][] = base.cells.map(
    (row) => row.slice() as (PlacedTile | null)[],
  );

  for (let i = 0; i < upper.length; i++) {
    const letter = upper[i] as Letter;
    cells[center]![start + i] = {
      tile: { kind: 'letter', letter, value: LETTER_VALUES[letter] },
      placedInMoveSeq: moveSeq,
    };
  }

  return { ...base, cells };
}
