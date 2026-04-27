// Dictionary loader. Memoizes per dictionary id so the in-process Set is built once.
// Reads from disk in Node (server context). Browser callers must not import this file —
// dictionary lookups happen server-side during move validation and challenge resolution.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type DictionarySet = ReadonlySet<string>;

const cache = new Map<string, DictionarySet>();

export function loadDictionaryFromString(content: string): DictionarySet {
  const out = new Set<string>();
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith('#')) continue;
    const word = line.toUpperCase();
    if (word.length < 2 || word.length > 15) continue;
    if (!/^[A-Z]+$/.test(word)) continue;
    out.add(word);
  }
  return out;
}

/** Load the default dictionary (ENABLE-derived, public domain). Memoized. */
export function loadDefaultDictionary(): DictionarySet {
  return loadDictionaryById('enable-default');
}

export function loadDictionaryById(id: string): DictionarySet {
  const cached = cache.get(id);
  if (cached) return cached;
  const path = pathForDictionary(id);
  const content = readFileSync(path, 'utf8');
  const dict = loadDictionaryFromString(content);
  cache.set(id, dict);
  return dict;
}

/** For tests: bypass disk and inject a synthetic dictionary under a known id. */
export function registerDictionary(id: string, dict: DictionarySet): void {
  cache.set(id, dict);
}

export function clearDictionaryCache(): void {
  cache.clear();
}

function pathForDictionary(id: string): string {
  // v1 has only the bundled default. Operator-supplied dictionaries are supported by
  // pointing DICTIONARY_PATH_<ID> at an absolute path (env-driven, no client trust).
  if (id === 'enable-default') {
    return join(process.cwd(), 'src/dictionary/default-list.txt');
  }
  const envName = `DICTIONARY_PATH_${id.replace(/-/g, '_').toUpperCase()}`;
  const fromEnv = process.env[envName];
  if (!fromEnv) {
    throw new Error(
      `Unknown dictionary id "${id}" and no ${envName} env var configured. ` +
        'Add the file path to that env var or use "enable-default".',
    );
  }
  return fromEnv;
}
