// Exchange validator. Pure: checks rack indices, count bounds, and bag size.

import type { Rack, Tile } from './types';

export type ExchangeError = 'no-tiles-placed' | 'tile-not-on-rack' | 'exchange-bag-too-small';

export type ExchangeValidation =
  | { ok: true; tilesToReturn: Rack }
  | { ok: false; reason: ExchangeError };

export function validateExchange(args: {
  rack: Rack;
  bagCount: number;
  indices: ReadonlyArray<number>;
}): ExchangeValidation {
  const { rack, bagCount, indices } = args;
  if (indices.length === 0) return { ok: false, reason: 'no-tiles-placed' };
  if (indices.length > 7 || indices.length > rack.length) {
    return { ok: false, reason: 'tile-not-on-rack' };
  }
  if (bagCount < 7) return { ok: false, reason: 'exchange-bag-too-small' };

  const seen = new Set<number>();
  const tiles: Tile[] = [];
  for (const i of indices) {
    if (i < 0 || i >= rack.length || seen.has(i)) {
      return { ok: false, reason: 'tile-not-on-rack' };
    }
    seen.add(i);
    tiles.push(rack[i]!);
  }

  return { ok: true, tilesToReturn: tiles };
}
