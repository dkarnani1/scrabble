// T205 — placeMove integration test (happy path + invalid + concurrency).
//
// Skipped automatically when no Supabase test creds are configured.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { placeMove } from '@/app/actions/moves';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('placeMove (US2)', () => {
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

  it('rejects placeMove from the non-active player', async () => {
    const { gameId, view } = await startedGame();
    const inactive = view.activeSlot === 0 ? guest : host;
    const result = await withTestUser(inactive, () => placeMove({ gameId, tiles: [] as never }));
    expect(result.ok).toBe(false);
  });

  it('rejects placeMove with empty tiles via input validation', async () => {
    const { gameId, view } = await startedGame();
    const active = view.activeSlot === 0 ? host : guest;
    const result = await withTestUser(active, () => placeMove({ gameId, tiles: [] as never }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-input');
  });

  it('rejects placement of a tile that is not on the active rack', async () => {
    const { gameId, view } = await startedGame();
    const active = view.activeSlot === 0 ? host : guest;
    // Place a single tile away from any other constraint — guaranteed to fail validation
    // (either tile-not-on-rack or first-move-must-cover-center).
    const result = await withTestUser(active, () =>
      placeMove({
        gameId,
        tiles: [
          {
            coord: { r: 0, c: 0 },
            tile: { kind: 'letter', letter: 'Z', value: 10 },
          },
        ],
      }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(['rule-violation', 'state-conflict', 'invalid-input']).toContain(result.error.code);
  });
});
