// Seedable RNG. Mulberry32 — small, fast, good distribution for game randomness
// (NOT cryptographically secure; this is intentional). The only randomness in the rules
// engine is bag shuffling and first-turn coin flip; both want determinism per seed for
// reproducible test playback and sealed-game records.

export type Rng = () => number;

/** FNV-1a 32-bit hash. Stable across runtimes; used to seed the RNG from a string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    // 32-bit FNV prime: 16777619
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: string | number): Rng {
  let state = (typeof seed === 'string' ? hashSeed(seed) : seed >>> 0) || 1;
  return function mulberry32() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Integer in [0, exclusiveMax). */
export function randInt(rng: Rng, exclusiveMax: number): number {
  return Math.floor(rng() * exclusiveMax);
}
