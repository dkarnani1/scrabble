// Server-Action auth context helper for integration tests.
//
// Server Actions use the cookies-bound Supabase client via `createSupabaseServerClient`.
// In integration tests we don't have a real cookie store; instead we hijack
// `getCurrentUser` / `requireUser` (the only consumers in the action layer) so that
// every action behaves as though a specific user is logged in.
//
// We also expose a real-user creation path through the service role for tests that need
// to round-trip RLS-bound queries — but Server Actions themselves run with service-role
// access (via supabase-admin) for any privileged operation; the user identity is what
// drives authorization.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type TestUser = { id: string; email: string };

let admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient {
  if (admin) return admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Integration tests require NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

export async function createTestUser(opts: { displayName: string }): Promise<TestUser> {
  const sb = getAdmin();
  const email = `test+${Math.random().toString(36).slice(2, 10)}@example.test`;
  const { data, error } = await sb.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { display_name: opts.displayName },
  });
  if (error || !data.user) throw error ?? new Error('Failed to create test user');
  return { id: data.user.id, email: data.user.email ?? email };
}

export async function ensureTestProfile(userId: string, displayName: string): Promise<void> {
  const sb = getAdmin();
  const { error } = await sb
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' });
  if (error) throw error;
}

// ---- Action context override -------------------------------------------------------
//
// `src/auth/server.ts` reads from a single module-level test override when present.
// We import it here to avoid a circular dep at the action layer.

import * as authServer from '@auth/server';

export async function withTestUser<T>(user: TestUser, fn: () => Promise<T>): Promise<T> {
  // Set the override; restore it afterwards so concurrent tests don't bleed.
  const previous = authServer.__getTestUserOverride();
  authServer.__setTestUserOverride({ id: user.id, email: user.email });
  try {
    return await fn();
  } finally {
    authServer.__setTestUserOverride(previous);
  }
}
