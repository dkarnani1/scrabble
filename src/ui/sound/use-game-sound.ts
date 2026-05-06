'use client';

import * as React from 'react';
import useSound from 'use-sound';
import { SOUND_MAP, type SoundEvent } from './sound-events';
import { useSoundContext } from './SoundProvider';

/**
 * Returns a stable `play()` for a given sound event. The function is a no-op
 * when:
 *   - sounds are disabled in context,
 *   - the asset failed to load (404 / decode error),
 *   - reducedMotion is true and this event is non-essential,
 *   - we're on the server.
 *
 * Loading is deferred (`preload: false`) so missing assets don't 404 on mount —
 * they're only fetched when the event is first dispatched, and a single
 * `onloaderror` trip permanently disables that event for the session. No
 * uncaught exception is ever surfaced.
 */
export function useGameSound(event: SoundEvent): () => void {
  const { enabled, volume: globalVolume, reducedMotion } = useSoundContext();
  const config = SOUND_MAP[event];
  const [loadFailed, setLoadFailed] = React.useState(false);

  const [play] = useSound(config.src, {
    volume: config.volume * globalVolume,
    interrupt: config.interruptible,
    soundEnabled: enabled && !loadFailed,
    // The two options below are forwarded to Howler via use-sound's `...delegated`
    // pass-through. `preload: false` keeps the network request out of the mount
    // path; `onloaderror` traps a 404 / decode error and trips the local flag so
    // we never try the same broken asset twice.
    preload: false,
    onloaderror: () => {
      setLoadFailed(true);
    },
  });

  return React.useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!enabled) return;
    if (loadFailed) return;
    if (reducedMotion && !config.essential) return;
    try {
      play();
    } catch {
      // Howler can throw if the AudioContext isn't unlocked yet (pre-gesture).
      // Silently ignore — the next user gesture re-arms it.
    }
  }, [play, enabled, loadFailed, reducedMotion, config.essential]);
}
