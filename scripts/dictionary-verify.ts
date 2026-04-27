// scripts/dictionary-verify.ts
//
// Confirm the committed default-list.txt matches the recorded SHA-256 hash. Run in CI
// to detect tampering or accidental corruption.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT_PATH = resolve(process.cwd(), 'src/dictionary/default-list.txt');
const HASH_PATH = resolve(process.cwd(), 'src/dictionary/default-list.sha256');

function fail(msg: string): never {
  process.stderr.write(`dictionary:verify failed: ${msg}\n`);
  process.exit(1);
}

if (!existsSync(OUT_PATH)) fail(`missing ${OUT_PATH}; run npm run dictionary:prepare`);
if (!existsSync(HASH_PATH)) {
  process.stderr.write(`note: no recorded hash at ${HASH_PATH}; skipping integrity check.\n`);
  process.exit(0);
}

const content = readFileSync(OUT_PATH, 'utf8');
const recordedHash = readFileSync(HASH_PATH, 'utf8').trim();
const actualHash = createHash('sha256').update(content).digest('hex');

if (recordedHash !== actualHash) {
  fail(`hash mismatch: file=${actualHash} recorded=${recordedHash}`);
}

process.stderr.write(`dictionary:verify ok (${actualHash.slice(0, 12)}…)\n`);
