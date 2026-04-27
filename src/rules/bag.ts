// Bag operations. All functions are pure: they take an immutable bag in, return a new
// array. Shuffles use a seeded RNG so test playback and sealed games are reproducible.

import { createRng, randInt, type Rng } from './rng';
import { isBlankTile, type Tile } from './types';

/** Fisher-Yates shuffle driven by a seeded RNG. Returns a new array. */
export function shuffleBag(bag: ReadonlyArray<Tile>, seed: string | number): Tile[] {
  const out = bag.slice();
  const rng: Rng = createRng(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

export type DrawResult = { drawn: Tile[]; remaining: Tile[] };

/** Draw up to `count` tiles from the front of the bag. Caps at bag size. */
export function drawTiles(bag: ReadonlyArray<Tile>, count: number): DrawResult {
  const safeCount = Math.min(Math.max(count, 0), bag.length);
  return {
    drawn: bag.slice(0, safeCount),
    remaining: bag.slice(safeCount),
  };
}

/** Return tiles to the bag (e.g. exchange) and reshuffle deterministically. Blanks
 * are reset to unassigned. */
export function returnTiles(
  bag: ReadonlyArray<Tile>,
  returning: ReadonlyArray<Tile>,
  seed: string | number,
): Tile[] {
  const cleansedReturns: Tile[] = returning.map((t) =>
    isBlankTile(t) ? { kind: 'blank', assigned: null, value: 0 } : t,
  );
  return shuffleBag([...bag, ...cleansedReturns], seed);
}
