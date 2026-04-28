// Phase machine. Maps a current `GamePhase` + an event to the next phase. Encoded as
// a small lookup so it is exhaustive at the type level and easy to audit.

import type { GamePhase, TimerSetting } from '@rules/types';

export type TurnEvent =
  | { kind: 'place-committed' }
  | { kind: 'pass-committed' }
  | { kind: 'exchange-committed' }
  | { kind: 'challenge-window-expired' }
  | { kind: 'challenge-raised' }
  | { kind: 'challenge-resolved' }
  | { kind: 'turn-deadline-expired' }
  | { kind: 'game-completed' }
  | { kind: 'lobby-abandoned' };

export function nextPhase(current: GamePhase, event: TurnEvent): GamePhase {
  switch (current) {
    case 'lobby':
      if (event.kind === 'lobby-abandoned') return 'abandoned';
      return 'lobby';
    case 'playing':
      if (event.kind === 'place-committed') return 'challenge-window';
      if (event.kind === 'pass-committed' || event.kind === 'exchange-committed') return 'playing';
      if (event.kind === 'turn-deadline-expired') return 'playing'; // forced-pass keeps phase
      if (event.kind === 'game-completed') return 'completed';
      return current;
    case 'challenge-window':
      if (event.kind === 'challenge-window-expired') return 'playing';
      if (event.kind === 'challenge-raised') return 'resolving-challenge';
      if (event.kind === 'game-completed') return 'completed';
      return current;
    case 'resolving-challenge':
      if (event.kind === 'challenge-resolved') return 'playing';
      if (event.kind === 'game-completed') return 'completed';
      return current;
    case 'completed':
    case 'abandoned':
      return current;
  }
}

export function timerMilliseconds(setting: TimerSetting): number | null {
  switch (setting) {
    case 'none':
      return null;
    case '30s':
      return 30_000;
    case '1m':
      return 60_000;
    case '2m':
      return 120_000;
  }
}

export function nextDeadline(now: Date, setting: TimerSetting): Date | null {
  const ms = timerMilliseconds(setting);
  if (ms === null) return null;
  return new Date(now.getTime() + ms);
}
