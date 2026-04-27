// Standard 100-tile English Scrabble-style distribution and per-letter point values.
// Source: published English Scrabble rules — values and counts are the same in TWL,
// SOWPODS, and the public-domain ENABLE-derived ruleset we ship with.

import type { Letter, Tile } from './types';

export const LETTER_VALUES: Readonly<Record<Letter, number>> = Object.freeze({
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
});

export type DistributionEntry =
  | { kind: 'letter'; letter: Letter; count: number }
  | { kind: 'blank'; count: number };

export const STANDARD_DISTRIBUTION: ReadonlyArray<DistributionEntry> = Object.freeze([
  { kind: 'letter', letter: 'A', count: 9 },
  { kind: 'letter', letter: 'B', count: 2 },
  { kind: 'letter', letter: 'C', count: 2 },
  { kind: 'letter', letter: 'D', count: 4 },
  { kind: 'letter', letter: 'E', count: 12 },
  { kind: 'letter', letter: 'F', count: 2 },
  { kind: 'letter', letter: 'G', count: 3 },
  { kind: 'letter', letter: 'H', count: 2 },
  { kind: 'letter', letter: 'I', count: 9 },
  { kind: 'letter', letter: 'J', count: 1 },
  { kind: 'letter', letter: 'K', count: 1 },
  { kind: 'letter', letter: 'L', count: 4 },
  { kind: 'letter', letter: 'M', count: 2 },
  { kind: 'letter', letter: 'N', count: 6 },
  { kind: 'letter', letter: 'O', count: 8 },
  { kind: 'letter', letter: 'P', count: 2 },
  { kind: 'letter', letter: 'Q', count: 1 },
  { kind: 'letter', letter: 'R', count: 6 },
  { kind: 'letter', letter: 'S', count: 4 },
  { kind: 'letter', letter: 'T', count: 6 },
  { kind: 'letter', letter: 'U', count: 4 },
  { kind: 'letter', letter: 'V', count: 2 },
  { kind: 'letter', letter: 'W', count: 2 },
  { kind: 'letter', letter: 'X', count: 1 },
  { kind: 'letter', letter: 'Y', count: 2 },
  { kind: 'letter', letter: 'Z', count: 1 },
  { kind: 'blank', count: 2 },
]);

/** Materialize the standard distribution as an array of Tile values, in canonical order
 * (alphabetical letters, blanks last). The bag module shuffles this via a seeded RNG. */
export function makeStandardBag(): Tile[] {
  const bag: Tile[] = [];
  for (const entry of STANDARD_DISTRIBUTION) {
    if (entry.kind === 'letter') {
      const value = LETTER_VALUES[entry.letter];
      for (let i = 0; i < entry.count; i++) {
        bag.push({ kind: 'letter', letter: entry.letter, value });
      }
    } else {
      for (let i = 0; i < entry.count; i++) {
        bag.push({ kind: 'blank', assigned: null, value: 0 });
      }
    }
  }
  return bag;
}
