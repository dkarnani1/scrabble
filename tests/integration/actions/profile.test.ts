// Integration test: profile.setDisplayName. T102.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { resetTestDatabase } from '@tests/helpers/seed-supabase';
import { createTestUser, ensureTestProfile, withTestUser } from '@tests/helpers/auth-context';
import { setDisplayName } from '@/app/actions/profile';

const SHOULD_RUN = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const d = SHOULD_RUN ? describe : describe.skip;

d('setDisplayName (US1)', () => {
  let user: { id: string; email: string };

  beforeAll(async () => {
    user = await createTestUser({ displayName: 'Initial Name' });
  });

  beforeEach(async () => {
    await resetTestDatabase();
    await ensureTestProfile(user.id, 'Initial Name');
  });

  afterAll(async () => {
    await resetTestDatabase();
  });

  it('updates the caller display name when valid', async () => {
    const result = await withTestUser(user, () => setDisplayName({ displayName: 'New Name' }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.displayName).toBe('New Name');
  });

  it('rejects display names shorter than 2 characters', async () => {
    const result = await withTestUser(user, () => setDisplayName({ displayName: 'A' }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('invalid-input');
  });

  it('rejects display names longer than 32 characters', async () => {
    const result = await withTestUser(user, () => setDisplayName({ displayName: 'A'.repeat(40) }));
    expect(result.ok).toBe(false);
  });

  it('returns unauthenticated when there is no caller', async () => {
    const result = await setDisplayName({ displayName: 'Hello' });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('unauthenticated');
  });
});
