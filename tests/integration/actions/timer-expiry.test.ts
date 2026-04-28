// T401 — forced-pass on timer expiry, exercised via Server Actions.
//
// We don't actually wait 30 real seconds — we manipulate the games row directly via the
// service-role client to push `turn_deadline_at` into the past, then issue a Server
// Action and assert that `resolveDueDeadlines` records a forced pass before doing any
// per-action work.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase, getTestSupabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame, getGameView } from '@/app/actions/games';
import { passTurn } from '@/app/actions/moves';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('timer expiry forces a pass (US4)', () => {
  let host: { id: string; email: string };
  let guest: { id: string; email: string };

  beforeAll(async () => {
    host = await createTestUser({ displayName: 'Host Alice' });
    guest = await createTestUser({ displayName: 'Guest Bob' });
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await ensureTestProfile(host.id, 'Host Alice');
    await ensureTestProfile(guest.id, 'Guest Bob');
  });

  afterAll(async () => {
    await resetTestDatabase();
  });

  it("records a forced-pass move when the active player's deadline has passed", async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: '30s', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    const started = await withTestUser(host, () => startGame({ gameId: create.data.gameId }));
    if (!started.ok) throw new Error('startGame failed');

    // Force the deadline into the past.
    const sb = getTestSupabase();
    const past = new Date(Date.now() - 60_000).toISOString();
    await sb.from('games').update({ turn_deadline_at: past }).eq('id', create.data.gameId);

    // Any read by either participant should trip the resolveDueDeadlines preflight.
    // We ask for the view as the inactive player, which is also fine since the preflight
    // does not depend on whose turn it is.
    const view = await withTestUser(host, () => getGameView({ gameId: create.data.gameId }));
    expect(view.ok).toBe(true);
    if (!view.ok) return;

    const last = view.data.history.at(-1);
    expect(last?.move.kind).toBe('pass');
    if (last?.move.kind === 'pass') expect(last.move.reason).toBe('forced-timeout');
    // After forced pass, active slot has rotated and the new deadline is in the future.
    expect(view.data.activeSlot).not.toBe(started.data.activeSlot);
  });
});
