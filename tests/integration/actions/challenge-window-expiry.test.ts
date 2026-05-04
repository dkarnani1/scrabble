// T502 — challenge-window expiration moves on without challenge.
//
// Skipped automatically when no Supabase test creds are configured.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { resolveChallengeWindowIfExpired } from '@orchestration/timers';
import { getGameById } from '@persistence/games.repo';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('challenge-window expiry (US5)', () => {
  let host: { id: string; email: string };
  let guest: { id: string; email: string };

  beforeAll(async () => {
    host = await createTestUser({ displayName: 'Host Eve' });
    guest = await createTestUser({ displayName: 'Guest Finn' });
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await ensureTestProfile(host.id, 'Host Eve');
    await ensureTestProfile(guest.id, 'Guest Finn');
  });

  afterAll(async () => {
    await resetTestDatabase();
  });

  it('resolveChallengeWindowIfExpired no-ops when phase is playing', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    await withTestUser(host, () => startGame({ gameId: create.data.gameId }));

    const result = await resolveChallengeWindowIfExpired(create.data.gameId, new Date());
    expect(result.kind).toBe('no-op');

    const after = await getGameById(create.data.gameId);
    expect(after?.phase).toBe('playing');
  });
});
