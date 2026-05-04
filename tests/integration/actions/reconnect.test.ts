// T600 — full state restoration after a fresh load (US6).
//
// Skipped automatically when no Supabase test creds are configured.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame, getGameView, getMyRack } from '@/app/actions/games';
import { markPresent } from '@/app/actions/presence';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('reconnect / resume (US6)', () => {
  let host: { id: string; email: string };
  let guest: { id: string; email: string };

  beforeAll(async () => {
    host = await createTestUser({ displayName: 'Host Hank' });
    guest = await createTestUser({ displayName: 'Guest Iris' });
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await ensureTestProfile(host.id, 'Host Hank');
    await ensureTestProfile(guest.id, 'Guest Iris');
  });

  afterAll(async () => {
    await resetTestDatabase();
  });

  it('getGameView restores a started game with myRack populated', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    await withTestUser(host, () => startGame({ gameId: create.data.gameId }));

    // Simulate a "fresh load" by calling getGameView again.
    const fresh = await withTestUser(host, () => getGameView({ gameId: create.data.gameId }));
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    expect(fresh.data.phase).toBe('playing');
    expect(fresh.data.myRack).not.toBeNull();
    expect(fresh.data.myRack?.length).toBe(7);
    expect(fresh.data.history.length).toBe(0);
  });

  it('getMyRack returns the caller-only rack', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    await withTestUser(host, () => startGame({ gameId: create.data.gameId }));

    const myRack = await withTestUser(host, () => getMyRack({ gameId: create.data.gameId }));
    expect(myRack.ok).toBe(true);
    if (!myRack.ok) return;
    expect(myRack.data.rack?.length).toBe(7);
  });

  it('markPresent updates last_seen_at without errors', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');

    const result = await withTestUser(host, () => markPresent({ gameId: create.data.gameId }));
    expect(result.ok).toBe(true);
  });
});
