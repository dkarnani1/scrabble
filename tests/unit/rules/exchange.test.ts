// T203 — exchange validator unit tests.

import { describe, expect, it } from 'vitest';
import { validateExchange } from '@rules/exchange';
import type { Letter, Rack, Tile } from '@rules/types';

function letter(l: Letter): Tile {
  return { kind: 'letter', letter: l, value: 1 };
}

describe('validateExchange', () => {
  it('accepts an exchange of 1 to 7 tiles when bag has at least 7', () => {
    const rack: Rack = [letter('A'), letter('B'), letter('C')];
    const result = validateExchange({ rack, bagCount: 50, indices: [0, 1] });
    expect(result.ok).toBe(true);
  });

  it('rejects an empty exchange', () => {
    const rack: Rack = [letter('A')];
    const result = validateExchange({ rack, bagCount: 50, indices: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no-tiles-placed');
  });

  it('rejects an exchange when the bag has fewer than 7 tiles', () => {
    const rack: Rack = [letter('A'), letter('B')];
    const result = validateExchange({ rack, bagCount: 6, indices: [0] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('exchange-bag-too-small');
  });

  it('rejects exchanging an index that does not exist on the rack', () => {
    const rack: Rack = [letter('A'), letter('B')];
    const result = validateExchange({ rack, bagCount: 30, indices: [5] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('tile-not-on-rack');
  });

  it('rejects exchanging more than 7 tiles', () => {
    const rack: Rack = [letter('A'), letter('B'), letter('C')];
    // Indices contain duplicates / out-of-range to push count > 7. Use a contrived rack
    // of 8 (impossible in production, but the validator must still reject it).
    const eight: Rack = Array.from({ length: 8 }, () => letter('A'));
    const result = validateExchange({
      rack: eight,
      bagCount: 30,
      indices: [0, 1, 2, 3, 4, 5, 6, 7],
    });
    expect(result.ok).toBe(false);
  });
});
