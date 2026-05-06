'use client';

import * as React from 'react';

const ENABLED_KEY = 'scrabble:sounds-enabled';
const VOLUME_KEY = 'scrabble:sound-volume';

export type SoundContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  volume: number;
  setVolume: (next: number) => void;
  /**
   * True when the user has opted in to *non-essential* feedback. Reflects
   * `prefers-reduced-motion` — when true, decorative tile-place/pickup sounds
   * are suppressed even if the master toggle is on.
   */
  reducedMotion: boolean;
};

const SoundContext = React.createContext<SoundContextValue | null>(null);

function readBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return fallback;
    return v === '1' || v === 'true';
  } catch {
    return fallback;
  }
}

function readNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return fallback;
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(0, Math.min(1, n));
  } catch {
    return fallback;
  }
}

function detectMediaQuery(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(query).matches;
}

export function SoundProvider({ children }: { children: React.ReactNode }) {
  // SSR-safe: always start with defaults so server and client render the same
  // tree. Real user preferences hydrate in the effect below.
  const [enabled, setEnabledState] = React.useState<boolean>(true);
  const [volume, setVolumeState] = React.useState<number>(0.7);
  const [reducedMotion, setReducedMotion] = React.useState<boolean>(false);

  React.useEffect(() => {
    const motion = detectMediaQuery('(prefers-reduced-motion: reduce)');
    const data = detectMediaQuery('(prefers-reduced-data: reduce)');
    setReducedMotion(motion);

    // If the user hasn't explicitly chosen, honor the OS hint by defaulting
    // sounds off when motion or data savings are requested.
    const hasStored =
      typeof window !== 'undefined' && window.localStorage.getItem(ENABLED_KEY) !== null;
    if (!hasStored && (motion || data)) {
      setEnabledState(false);
    } else {
      setEnabledState(readBoolean(ENABLED_KEY, true));
    }
    setVolumeState(readNumber(VOLUME_KEY, 0.7));

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    return undefined;
  }, []);

  const setEnabled = React.useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(ENABLED_KEY, next ? '1' : '0');
    } catch {
      // Storage may be unavailable in private mode; failing here is non-fatal.
    }
  }, []);

  const setVolume = React.useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    try {
      if (typeof window !== 'undefined') window.localStorage.setItem(VOLUME_KEY, String(clamped));
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo<SoundContextValue>(
    () => ({ enabled, setEnabled, volume, setVolume, reducedMotion }),
    [enabled, setEnabled, volume, setVolume, reducedMotion],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSoundContext(): SoundContextValue {
  const ctx = React.useContext(SoundContext);
  if (!ctx) {
    // Be lenient — components may render outside the provider in tests or
    // legacy demos. Return a sensible no-op shape rather than crashing.
    return {
      enabled: false,
      setEnabled: () => {},
      volume: 0,
      setVolume: () => {},
      reducedMotion: false,
    };
  }
  return ctx;
}
