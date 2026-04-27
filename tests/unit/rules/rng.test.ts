import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from '@rules/rng';

describe('createRng (mulberry32)', () => {
  it('produces the same sequence for the same seed', () => {
    const a = createRng('hello-world');
    const b = createRng('hello-world');
    const seqA = Array.from({ length: 16 }, () => a());
    const seqB = Array.from({ length: 16 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng('seed-a');
    const b = createRng('seed-b');
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('returns floats in [0, 1)', () => {
    const rng = createRng('range-check');
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('is deterministic', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'));
  });

  it('differs for differing input', () => {
    expect(hashSeed('abc')).not.toBe(hashSeed('abd'));
  });

  it('handles the empty string without throwing', () => {
    expect(typeof hashSeed('')).toBe('number');
  });
});
