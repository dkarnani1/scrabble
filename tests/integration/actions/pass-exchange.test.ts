// T206 — passTurn + exchangeTiles integration tests.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { createGame, joinGame, startGame } from '@/app/actions/games';
import { passTurn, exchangeTiles } from '@/app/actions/moves';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('passTurn + exchangeTiles (US2)', () => {
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

  it('passTurn advances to the opponent and increments consecutive-scoreless', async () => {
    const { gameId, view } = await startedGame();
    const active = view.activeSlot === 0 ? host : guest;
    const before = view.activeSlot;
    const result = await withTestUser(active, () => passTurn({ gameId }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.activeSlot).not.toBe(before);
    expect(result.data.consecutiveScoreless).toBeGreaterThanOrEqual(1);
    const last = result.data.history.at(-1)!;
    expect(last.move.kind).toBe('pass');
  });

  it('exchangeTiles returns selected indices to the bag and refills the rack', async () => {
    const { gameId, view } = await startedGame();
    const active = view.activeSlot === 0 ? host : guest;
    const result = await withTestUser(active, () => exchangeTiles({ gameId, tileIndices: [0, 1] }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const last = result.data.history.at(-1)!;
    expect(last.move.kind).toBe('exchange');
    if (last.move.kind === 'exchange') expect(last.move.count).toBe(2);
    // Rack remains 7 after exchange.
    const me = result.data.players.find((p) => p.userId === active.id);
    expect(me?.rackCount).toBe(7);
  });

  it('rejects passTurn from the non-active player', async () => {
    const { gameId, view } = await startedGame();
    const inactive = view.activeSlot === 0 ? guest : host;
    const result = await withTestUser(inactive, () => passTurn({ gameId }));
    expect(result.ok).toBe(false);
  });
});
