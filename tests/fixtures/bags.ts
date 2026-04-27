// Deterministic bag fixtures. Real games use a per-game rng_seed and shuffle the
// standard distribution; tests use the same path so behavior is identical, but with a
// known seed so the tile order is predictable.

import { shuffleBag } from '@rules/bag';
import { makeStandardBag } from '@rules/distribution';
import type { Tile } from '@rules/types';

export const FIXED_TEST_SEED = 'test-seed-001';

export function deterministicBag(seed: string = FIXED_TEST_SEED): Tile[] {
  return shuffleBag(makeStandardBag(), seed);
}

/** Bag of arbitrary letters in order, useful when a test needs a specific opening rack. */
export function bagOf(letters: string): Tile[] {
  const upper = letters.toUpperCase();
  return [...upper].map((ch) => {
    if (ch === ' ' || ch === '_') {
      return { kind: 'blank', assigned: null, value: 0 } as const;
    }
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) {
      throw new Error(`bagOf: unsupported character "${ch}"`);
    }
    return { kind: 'letter', letter: ch as Tile extends { letter: infer L } ? L : never, value: 1 } as Tile;
  });
}
