import { describe, expect, it } from 'vitest';
import { drawTiles, returnTiles, shuffleBag } from '@rules/bag';
import { makeStandardBag } from '@rules/distribution';
import { isBlankTile, isLetterTile } from '@rules/types';

describe('shuffleBag', () => {
  it('is deterministic given the same seed', () => {
    const a = shuffleBag(makeStandardBag(), 'seed-x');
    const b = shuffleBag(makeStandardBag(), 'seed-x');
    expect(a.map(stamp)).toEqual(b.map(stamp));
  });

  it('produces a different order for different seeds', () => {
    const a = shuffleBag(makeStandardBag(), 'seed-x');
    const b = shuffleBag(makeStandardBag(), 'seed-y');
    expect(a.map(stamp)).not.toEqual(b.map(stamp));
  });

  it('preserves the multiset of tiles', () => {
    const original = makeStandardBag();
    const shuffled = shuffleBag(original, 'preserve');
    expect(shuffled).toHaveLength(original.length);
    const histo = (tiles: typeof original) =>
      tiles
        .map((t) => (t.kind === 'letter' ? t.letter : '_'))
        .sort()
        .join('');
    expect(histo(shuffled)).toEqual(histo(original));
  });

  it('does not mutate the input array', () => {
    const original = makeStandardBag();
    const snapshot = original.map(stamp);
    shuffleBag(original, 'no-mutate');
    expect(original.map(stamp)).toEqual(snapshot);
  });
});

describe('drawTiles', () => {
  it('returns the requested count from the front of the bag and leaves the remainder', () => {
    const bag = makeStandardBag();
    const { drawn, remaining } = drawTiles(bag, 7);
    expect(drawn).toHaveLength(7);
    expect(remaining).toHaveLength(bag.length - 7);
    expect([...drawn, ...remaining].map(stamp)).toEqual(bag.map(stamp));
  });

  it('caps the draw at bag size when too many are requested', () => {
    const bag = makeStandardBag().slice(0, 3);
    const { drawn, remaining } = drawTiles(bag, 7);
    expect(drawn).toHaveLength(3);
    expect(remaining).toHaveLength(0);
  });

  it('handles a count of 0 cleanly', () => {
    const bag = makeStandardBag();
    const { drawn, remaining } = drawTiles(bag, 0);
    expect(drawn).toEqual([]);
    expect(remaining).toEqual(bag);
  });

  it('does not mutate the input', () => {
    const bag = makeStandardBag();
    const snapshot = bag.map(stamp);
    drawTiles(bag, 7);
    expect(bag.map(stamp)).toEqual(snapshot);
  });
});

describe('returnTiles', () => {
  it('appends returned tiles, then reshuffles deterministically', () => {
    const bag = makeStandardBag().slice(0, 50);
    const returning = bag.slice(0, 3);
    const reshuffled = returnTiles(bag.slice(3), returning, 'return-seed');
    expect(reshuffled).toHaveLength(50);

    const reshuffled2 = returnTiles(bag.slice(3), returning, 'return-seed');
    expect(reshuffled.map(stamp)).toEqual(reshuffled2.map(stamp));
  });

  it('blanks returned to the bag are wiped of any prior assignment', () => {
    const bag = makeStandardBag();
    const usedBlank = { kind: 'blank', assigned: 'Q', value: 0 } as const;
    const reshuffled = returnTiles(bag, [usedBlank], 'wipe');
    const blanks = reshuffled.filter(isBlankTile);
    for (const b of blanks) expect(b.assigned).toBeNull();
    // Letter count is unchanged.
    expect(reshuffled.filter(isLetterTile)).toHaveLength(bag.filter(isLetterTile).length);
  });
});

function stamp(t: { kind: string }): string {
  if (t.kind === 'letter') {
    return `L:${(t as unknown as { letter: string }).letter}`;
  }
  return 'B';
}
