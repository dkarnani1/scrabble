import { describe, expect, it } from 'vitest';
import { STANDARD_DISTRIBUTION, makeStandardBag, LETTER_VALUES } from '@rules/distribution';
import { isBlankTile, isLetterTile, type Tile } from '@rules/types';

describe('standard English Scrabble-style distribution', () => {
  it('totals 100 tiles', () => {
    const total = STANDARD_DISTRIBUTION.reduce((acc, e) => acc + e.count, 0);
    expect(total).toBe(100);
  });

  it('contains 2 blank tiles', () => {
    const blanks = STANDARD_DISTRIBUTION.find((e) => e.kind === 'blank');
    expect(blanks?.count).toBe(2);
  });

  it('matches every official letter count', () => {
    const expected: Record<string, number> = {
      A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9, J: 1,
      K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6, S: 4, T: 6,
      U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1,
    };
    for (const [letter, count] of Object.entries(expected)) {
      const entry = STANDARD_DISTRIBUTION.find((e) => e.kind === 'letter' && e.letter === letter);
      expect(entry?.count, `count for ${letter}`).toBe(count);
    }
  });

  it('matches every official letter value', () => {
    const expected: Record<string, number> = {
      A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
      K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
      U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
    };
    for (const [letter, value] of Object.entries(expected)) {
      expect(LETTER_VALUES[letter as keyof typeof LETTER_VALUES], `value of ${letter}`).toBe(value);
    }
  });
});

describe('makeStandardBag', () => {
  const bag: Tile[] = makeStandardBag();

  it('returns exactly 100 tiles', () => {
    expect(bag).toHaveLength(100);
  });

  it('contains 2 blanks worth 0 points', () => {
    const blanks = bag.filter(isBlankTile);
    expect(blanks).toHaveLength(2);
    for (const b of blanks) {
      expect(b.value).toBe(0);
      expect(b.assigned).toBeNull();
    }
  });

  it('every letter tile carries its official point value', () => {
    for (const t of bag.filter(isLetterTile)) {
      expect(t.value).toBe(LETTER_VALUES[t.letter]);
    }
  });
});
