// Tiny seeded dictionaries for tests. Avoids loading the full ENABLE list (172k words,
// ~1.2MB) when a test only needs a handful of valid words.

import { loadDictionaryFromString, registerDictionary, type DictionarySet } from '@dictionary/load';

export const TINY_WORDS = [
  'AT', 'TO', 'IT', 'IN', 'IS', 'AS', 'AN', 'ON', 'OR', 'OF',
  'CAT', 'CATS', 'DOG', 'DOGS', 'TAR', 'BAR', 'CAR', 'CARS',
  'HELLO', 'WORLD', 'QUEEN', 'PLAY', 'GAME', 'WORD', 'TILE',
];

export function tinyDictionary(): DictionarySet {
  return loadDictionaryFromString(TINY_WORDS.join('\n'));
}

/** Register a tiny dictionary under a known id so production-shaped lookup paths can
 * resolve it without hitting the filesystem. */
export function installTinyDictionary(id: string = 'test-tiny'): { id: string; dict: DictionarySet } {
  const dict = tinyDictionary();
  registerDictionary(id, dict);
  return { id, dict };
}
