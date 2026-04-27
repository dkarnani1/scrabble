// Per-test Supabase reset helper. Targets a TEST Supabase project (NEVER production).
// The intended workflow:
//   - Operator runs migrations against the test project once (or via CI bootstrap).
//   - Each integration test that touches Supabase calls resetTestDatabase() in
//     beforeEach to delete domain rows in dependency order. Auth users are kept across
//     tests for speed; tests that need fresh users seed them on demand.
//
// Guard rails:
//   - Refuses to run unless NODE_ENV !== 'production'.
//   - Refuses to run unless the URL contains 'localhost' OR an env var
//     SUPABASE_TEST_PROJECT_OK is explicitly set to 'yes'. This is the safety net that
//     prevents an accidental wipe of a real environment.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const TABLES_IN_DELETE_ORDER = [
  'invites',
  'moves',
  'players',
  'game_secrets',
  'games',
  'profiles',
] as const;

let cached: SupabaseClient | null = null;

export function getTestSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Integration tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
        'pointing at a TEST Supabase project. Set these in .env.test.local.',
    );
  }
  assertSafeTarget(url);
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

export async function resetTestDatabase(): Promise<void> {
  const supabase = getTestSupabase();
  for (const table of TABLES_IN_DELETE_ORDER) {
    // Delete every row. The neq trick matches all uuids/text since they're never null.
    const { error } = await supabase.from(table).delete().not('created_at', 'is', null);
    // profiles uses 'created_at' too; no special-case needed. If a table doesn't have
    // created_at, fall back to a less-specific filter.
    if (error && error.code === '42703') {
      const fallback = await supabase.from(table).delete().not('game_id', 'is', null);
      if (fallback.error) throw fallback.error;
      continue;
    }
    if (error) throw error;
  }
}

function assertSafeTarget(url: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed/reset Supabase in NODE_ENV=production.');
  }
  const looksLocal = /localhost|127\.0\.0\.1/.test(url);
  const explicitlyOk = process.env.SUPABASE_TEST_PROJECT_OK === 'yes';
  if (!looksLocal && !explicitlyOk) {
    throw new Error(
      `Refusing to wipe a non-localhost Supabase project (${url}). ` +
        'If this really is your test project, set SUPABASE_TEST_PROJECT_OK=yes.',
    );
  }
}
