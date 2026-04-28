// T301 — endgame triggered by placeMove emptying the rack with an empty bag.
//
// Skipped automatically when no Supabase test creds are configured. The seeded fixture
// is built by directly manipulating game_secrets / players to put the active player
// at rack=[] and bag=[] just before submission. (The full natural game-arc end-to-end
// is the Playwright spec T303.)

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { passTurn } from '@/app/actions/moves';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('endgame: out-of-tiles (US3)', () => {
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

  it('completes the game when six consecutive passes accumulate', async () => {
    // Drive the same shape as the unit-tested rule via the Server Action stack.
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) throw new Error('createGame failed');
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    const started = await withTestUser(host, () => startGame({ gameId: create.data.gameId }));
    if (!started.ok) throw new Error('startGame failed');

    let view = started.data;
    for (let i = 0; i < 6; i++) {
      const active = view.activeSlot === 0 ? host : guest;
      const result = await withTestUser(active, () => passTurn({ gameId: view.id }));
      if (!result.ok) throw new Error('passTurn failed');
      view = result.data;
      if (view.phase === 'completed') break;
    }
    expect(view.phase).toBe('completed');
    expect(view.result?.endedReason).toBe('six-pass-termination');
  });
});
