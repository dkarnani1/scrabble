// Dictionary lookup. Pure function over a DictionarySet. Case-insensitive; rejects
// non-letter input and single-letter words by definition.

import type { DictionarySet } from './load';

export function has(dict: DictionarySet, word: string): boolean {
  if (word.length < 2) return false;
  const upper = word.toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) return false;
  return dict.has(upper);
}
