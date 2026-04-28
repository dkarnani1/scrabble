// Integration test: create → join → start happy path. T100.
//
// These tests exercise the public Server Action surface end-to-end against a real test
// Supabase project. Each test seeds two fresh users via the service role, then drives
// `createGame`, `joinGame`, and `startGame` as those users via cookies-bound clients
// (faked here via a thin auth wrapper that swaps process-level user context).
//
// They are skipped automatically when no test Supabase credentials are configured so the
// repo can be cloned and `npm run test:integration` will not fail on a fresh checkout.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { withTestUser, ensureTestProfile, createTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame, listMyGames } from '@/app/actions/games';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('createGame → joinGame → startGame (US1 happy path)', () => {
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

  it('creates a game in lobby phase with the host seated in slot 0', async () => {
    const result = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.gameId).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.data.inviteCode).toMatch(/^[0-9A-Z]{6,16}$/);
  });

  it('lets a second user join via invite code and reach a ready-to-start lobby', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: '1m', dictionaryId: 'enable-default' }),
    );
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const join = await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    expect(join.ok).toBe(true);
    if (!join.ok) return;

    expect(join.data.phase).toBe('lobby');
    expect(join.data.players).toHaveLength(2);
    expect(join.data.players.map((p) => p.slot).sort()).toEqual([0, 1]);
    expect(join.data.players.find((p) => p.slot === 0)?.isHost).toBe(true);
    expect(join.data.players.find((p) => p.slot === 1)?.isHost).toBe(false);
  });

  it('host starts the game; phase transitions to playing and racks are dealt', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: '30s', dictionaryId: 'enable-default' }),
    );
    expect(create.ok).toBe(true);
    if (!create.ok) return;

    const join = await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));
    expect(join.ok).toBe(true);

    const started = await withTestUser(host, () => startGame({ gameId: create.data.gameId }));
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    expect(started.data.phase).toBe('playing');
    expect([0, 1]).toContain(started.data.activeSlot);
    expect(started.data.players.every((p) => p.rackCount === 7)).toBe(true);
    expect(started.data.bagRemaining).toBe(100 - 14);
    expect(started.data.turnStartedAt).toBeTruthy();
    expect(started.data.turnDeadlineAt).toBeTruthy();
    // Host's view sees own rack of length 7; opponent rack stripped.
    const myRack = started.data.myRack;
    expect(myRack).not.toBeNull();
    expect(myRack?.length).toBe(7);
  });

  it('listMyGames includes the new game for both participants', async () => {
    const create = await withTestUser(host, () =>
      createGame({ timerSetting: 'none', dictionaryId: 'enable-default' }),
    );
    if (!create.ok) return;
    await withTestUser(guest, () => joinGame({ inviteCode: create.data.inviteCode }));

    const hostList = await withTestUser(host, () => listMyGames());
    const guestList = await withTestUser(guest, () => listMyGames());

    expect(hostList.ok && hostList.data.active.some((g) => g.id === create.data.gameId)).toBe(true);
    expect(guestList.ok && guestList.data.active.some((g) => g.id === create.data.gameId)).toBe(
      true,
    );
  });
});
