'use client';

import * as React from 'react';
import confetti from 'canvas-confetti';
import { useReducedMotion } from 'motion/react';

// Hex values mirror the tokens in tailwind.config.ts (no Tailwind class layer
// here — canvas-confetti needs raw hex). If the palette shifts, mirror it back.
const WIN_COLORS = [
  '#a07a3b', // tile-edge
  '#b88a4a', // board-star
  '#356f9d', // premium-tl
  '#b83f3f', // premium-tw
  '#fbeec2', // tile-face (lighter accent)
  '#f6e2b3', // tile-face
];
const DRAW_COLORS = ['#a07a3b', '#d6cdb6', '#f6e2b3'];

export type EndgameConfettiProps = {
  outcome: 'win' | 'lose' | 'draw';
  /**
   * Bumps the effect to fire again — used by the demo "Re-fire confetti"
   * button. Production wires this to a one-shot once per game per session.
   */
  fireKey?: number | string;
};

/**
 * Choreographed confetti for the endgame overlay. Mounts a sequence of bursts
 * sized to the outcome. Returns null entirely under reduced motion or for a
 * loss (silence is the dignified treatment). Cleans up on unmount via
 * `confetti.reset()` so route navigation doesn't leave particles in flight.
 */
export function EndgameConfetti({ outcome, fireKey }: EndgameConfettiProps) {
  const reduce = useReducedMotion();

  React.useEffect(() => {
    if (reduce) return;
    if (outcome === 'lose') return;

    let cancelled = false;
    const timeouts: number[] = [];
    const intervals: number[] = [];

    const enqueue = (delay: number, fn: () => void) => {
      const id = window.setTimeout(() => {
        if (!cancelled) fn();
      }, delay);
      timeouts.push(id);
    };

    if (outcome === 'win') {
      // Burst 1: medium spread from bottom-center.
      enqueue(0, () => {
        confetti({
          particleCount: 80,
          spread: 70,
          startVelocity: 45,
          origin: { x: 0.5, y: 0.85 },
          colors: WIN_COLORS,
          ticks: 220,
        });
      });
      // Burst 2: side cannons.
      enqueue(250, () => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          startVelocity: 50,
          origin: { x: 0, y: 0.7 },
          colors: WIN_COLORS,
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          startVelocity: 50,
          origin: { x: 1, y: 0.7 },
          colors: WIN_COLORS,
        });
      });
      // Burst 3: gentle continuous fall for ~1.5s.
      enqueue(600, () => {
        const end = Date.now() + 1500;
        const id = window.setInterval(() => {
          if (cancelled || Date.now() > end) {
            window.clearInterval(id);
            return;
          }
          confetti({
            particleCount: 4,
            spread: 100,
            startVelocity: 18,
            gravity: 0.7,
            ticks: 180,
            origin: { x: Math.random(), y: -0.05 },
            colors: WIN_COLORS,
            disableForReducedMotion: true,
          });
        }, 80);
        intervals.push(id);
      });
    } else if (outcome === 'draw') {
      enqueue(0, () => {
        confetti({
          particleCount: 30,
          spread: 60,
          startVelocity: 32,
          origin: { x: 0.5, y: 0.75 },
          colors: DRAW_COLORS,
          ticks: 160,
        });
      });
    }

    return () => {
      cancelled = true;
      for (const t of timeouts) window.clearTimeout(t);
      for (const i of intervals) window.clearInterval(i);
      confetti.reset();
    };
  }, [outcome, reduce, fireKey]);

  return null;
}
