import { describe, expect, it } from 'vitest';
import { has } from '@dictionary/lookup';
import { loadDictionaryFromString } from '@dictionary/load';

const dict = loadDictionaryFromString('cat\ndog\nQUEEN\n');

describe('has', () => {
  it('matches case-insensitively', () => {
    expect(has(dict, 'cat')).toBe(true);
    expect(has(dict, 'CAT')).toBe(true);
    expect(has(dict, 'Cat')).toBe(true);
    expect(has(dict, 'queen')).toBe(true);
  });

  it('returns false for words not in the set', () => {
    expect(has(dict, 'cats')).toBe(false);
    expect(has(dict, 'xyzzy')).toBe(false);
  });

  it('returns false for input shorter than 2 letters or with non-letters', () => {
    expect(has(dict, 'a')).toBe(false);
    expect(has(dict, '')).toBe(false);
    expect(has(dict, 'cat!')).toBe(false);
  });
});
