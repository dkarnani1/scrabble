// Service-role Supabase client. Bypasses RLS. Server-only — importing this file from a
// client component will throw at module load. Use ONLY for the operations that must
// touch game_secrets or other privileged paths from inside src/orchestration.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

if (typeof window !== 'undefined') {
  throw new Error(
    'src/persistence/supabase-admin.ts was imported in a browser context. ' +
      'This module uses the service-role key and MUST NOT be loaded client-side.',
  );
}

let cached: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Service role is required for server-only privileged operations.',
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
