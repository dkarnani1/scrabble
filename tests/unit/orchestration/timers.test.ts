// T400 — orchestration timer math unit tests.
//
// `remainingMs(state, now)` returns the remaining milliseconds before the active
// player's turn deadline expires (or null when there is no deadline). `isExpired`
// is the boolean flip on top of that.

import { describe, expect, it } from 'vitest';
import { remainingMs, isExpired } from '@orchestration/timers';
import { buildPlayingGame } from '@tests/fixtures/games';
import { FakeClock } from '@tests/helpers/fake-clock';

describe('remainingMs', () => {
  it('returns null when the game has no deadline', () => {
    const state = buildPlayingGame({ turnDeadlineAt: null, timerSetting: 'none' });
    expect(remainingMs(state, new Date('2026-04-28T12:00:00.000Z'))).toBeNull();
  });

  it('returns the gap between now and turn_deadline_at when in the future', () => {
    const clock = new FakeClock('2026-04-28T12:00:00.000Z');
    const state = buildPlayingGame({
      turnDeadlineAt: '2026-04-28T12:00:30.000Z',
      timerSetting: '30s',
    });
    expect(remainingMs(state, clock.now())).toBe(30_000);
  });

  it('returns 0 when the deadline equals now', () => {
    const state = buildPlayingGame({
      turnDeadlineAt: '2026-04-28T12:00:00.000Z',
      timerSetting: '30s',
    });
    expect(remainingMs(state, new Date('2026-04-28T12:00:00.000Z'))).toBe(0);
  });

  it('returns 0 (clamped, never negative) when the deadline has already passed', () => {
    const state = buildPlayingGame({
      turnDeadlineAt: '2026-04-28T12:00:00.000Z',
      timerSetting: '30s',
    });
    expect(remainingMs(state, new Date('2026-04-28T12:00:05.000Z'))).toBe(0);
  });
});

describe('isExpired', () => {
  it('is false when no deadline is set', () => {
    const state = buildPlayingGame({ turnDeadlineAt: null, timerSetting: 'none' });
    expect(isExpired(state, new Date())).toBe(false);
  });

  it('is false while remaining > 0', () => {
    const state = buildPlayingGame({
      turnDeadlineAt: '2026-04-28T12:00:30.000Z',
      timerSetting: '30s',
    });
    expect(isExpired(state, new Date('2026-04-28T12:00:00.000Z'))).toBe(false);
  });

  it('is true once now >= deadline', () => {
    const state = buildPlayingGame({
      turnDeadlineAt: '2026-04-28T12:00:00.000Z',
      timerSetting: '30s',
    });
    expect(isExpired(state, new Date('2026-04-28T12:00:00.000Z'))).toBe(true);
    expect(isExpired(state, new Date('2026-04-28T12:00:01.000Z'))).toBe(true);
  });
});
