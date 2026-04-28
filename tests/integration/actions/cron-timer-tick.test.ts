// T402 — cron-driven sweep: hits the route handler with a CRON_SECRET-authorized
// request and asserts that all games with a past deadline get a forced-pass recorded.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase, getTestSupabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { GET as cronGet } from '@/app/api/cron/timer-tick/route';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('cron timer-tick sweep (US4)', () => {
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

  it('forces a pass on every game whose deadline is in the past', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: '30s', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    const started = await withTestUser(host, () => startGame({ gameId: create.data.gameId }));
    if (!started.ok) throw new Error('startGame failed');

    const sb = getTestSupabase();
    const past = new Date(Date.now() - 60_000).toISOString();
    await sb.from('games').update({ turn_deadline_at: past }).eq('id', create.data.gameId);

    process.env.CRON_SECRET = process.env.CRON_SECRET ?? 'integration-test-secret';
    const request = new Request('http://localhost/api/cron/timer-tick', {
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    const response = await cronGet(request as unknown as Request);
    expect(response.status).toBe(200);

    const { data: moves } = await sb
      .from('moves')
      .select('*')
      .eq('game_id', create.data.gameId)
      .order('seq', { ascending: false })
      .limit(1);
    expect(moves?.[0]?.kind).toBe('pass');
    expect(moves?.[0]?.pass_reason).toBe('forced-timeout');
  });

  it('rejects unauthorized requests with 401', async () => {
    process.env.CRON_SECRET = 'expected-secret';
    const request = new Request('http://localhost/api/cron/timer-tick', {
      headers: { Authorization: 'Bearer wrong-secret' },
    });
    const response = await cronGet(request as unknown as Request);
    expect(response.status).toBe(401);
  });
});
