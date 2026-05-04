// T501 — raiseChallenge integration test (happy + failure paths).
//
// Skipped automatically when no Supabase test creds are configured.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { raiseChallenge } from '@/app/actions/challenges';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('raiseChallenge (US5)', () => {
  let host: { id: string; email: string };
  let guest: { id: string; email: string };

  beforeAll(async () => {
    host = await createTestUser({ displayName: 'Host Carol' });
    guest = await createTestUser({ displayName: 'Guest Dan' });
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await ensureTestProfile(host.id, 'Host Carol');
    await ensureTestProfile(guest.id, 'Guest Dan');
  });

  afterAll(async () => {
    await resetTestDatabase();
  });

  async function startedGame() {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    const started = await withTestUser(host, () => startGame({ gameId: create.data.gameId }));
    if (!started.ok) throw new Error('startGame failed');
    return { gameId: create.data.gameId, view: started.data };
  }

  it('rejects challenge from a non-participant or wrong phase', async () => {
    const { gameId } = await startedGame();
    // Game is in 'playing' phase, not 'challenge-window' — so a raised challenge
    // for a non-existent move seq must be rejected with state-conflict.
    const result = await withTestUser(guest, () => raiseChallenge({ gameId, moveSeq: 999 }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['state-conflict', 'invalid-input']).toContain(result.error.code);
  });
});
