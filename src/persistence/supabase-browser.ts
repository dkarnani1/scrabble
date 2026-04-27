// Browser Supabase client (publishable key only). Subject to RLS on every read; cannot
// touch game_secrets at all (no policy grants access). Safe to use in client components.

'use client';

import { createBrowserClient } from '@supabase/ssr';

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
        'Set them in .env.local (see .env.example).',
    );
  }
  cached = createBrowserClient(url, key);
  return cached;
}
