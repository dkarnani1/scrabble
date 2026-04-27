import { describe, expect, it } from 'vitest';
import { loadDictionaryFromString } from '@dictionary/load';

describe('loadDictionaryFromString', () => {
  it('parses one word per line into a Set, normalized to uppercase', () => {
    const dict = loadDictionaryFromString('cat\ndog\nbird\n');
    expect(dict.size).toBe(3);
    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('DOG')).toBe(true);
    expect(dict.has('BIRD')).toBe(true);
  });

  it('ignores blank lines, leading/trailing whitespace, and comments starting with #', () => {
    const dict = loadDictionaryFromString(
      '\n  hello  \n# this is a comment\nworld\n\n',
    );
    expect(dict.size).toBe(2);
    expect(dict.has('HELLO')).toBe(true);
    expect(dict.has('WORLD')).toBe(true);
  });

  it('rejects non-letter input by skipping it', () => {
    const dict = loadDictionaryFromString('cat\nh3llo\nworld\n');
    expect(dict.has('CAT')).toBe(true);
    expect(dict.has('H3LLO')).toBe(false);
    expect(dict.has('WORLD')).toBe(true);
    expect(dict.size).toBe(2);
  });

  it('rejects single-letter and over-length words', () => {
    const dict = loadDictionaryFromString('a\nat\nabcdefghijklmnop\n'); // 16 letters
    expect(dict.has('A')).toBe(false);
    expect(dict.has('AT')).toBe(true);
    expect(dict.has('ABCDEFGHIJKLMNOP')).toBe(false);
  });
});
