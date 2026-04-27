// scripts/dictionary-prepare.ts
//
// Build the default dictionary asset deterministically from a public-domain source.
// The output is checked into src/dictionary/default-list.txt so deployment is hermetic
// (the build does not depend on a network fetch).
//
// Run with: `npm run dictionary:prepare`. Requires Node 20+.
//
// Source: ENABLE word list (public domain). The canonical mirror is dolph/dictionary
// on GitHub. Set DICTIONARY_SOURCE_URL to override (e.g. for an air-gapped build).

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const DEFAULT_SOURCE_URL =
  'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt';
const OUT_PATH = resolve(process.cwd(), 'src/dictionary/default-list.txt');
const HASH_PATH = resolve(process.cwd(), 'src/dictionary/default-list.sha256');

async function fetchSource(url: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to fetch dictionary from ${url}: ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

function normalize(raw: string): string {
  // ENABLE is one lowercase word per line; we store uppercase, ASCII letters only,
  // length 2..15. The output is sorted to make the file diff-stable.
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const word = line.trim().toUpperCase();
    if (word.length < 2 || word.length > 15) continue;
    if (!/^[A-Z]+$/.test(word)) continue;
    seen.add(word);
  }
  return [...seen].sort().join('\n') + '\n';
}

async function main() {
  const url = process.env.DICTIONARY_SOURCE_URL ?? DEFAULT_SOURCE_URL;
  process.stderr.write(`Fetching dictionary from ${url}\n`);
  const raw = await fetchSource(url);
  const normalized = normalize(raw);
  const hash = createHash('sha256').update(normalized).digest('hex');

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, normalized, 'utf8');
  writeFileSync(HASH_PATH, `${hash}\n`, 'utf8');

  const wordCount = normalized.split('\n').filter(Boolean).length;
  process.stderr.write(`Wrote ${wordCount} words to ${OUT_PATH}\n`);
  process.stderr.write(`SHA-256: ${hash}\n`);
}

main().catch((err) => {
  process.stderr.write(`dictionary:prepare failed: ${err instanceof Error ? err.message : err}\n`);
  process.exit(1);
});
