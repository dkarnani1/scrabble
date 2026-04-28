// Server-side Supabase client bound to the request's auth cookies. Used by Server
// Actions and route handlers. Subject to RLS — the policy decides what the user can see.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        // In Server Actions and route handlers, set the response cookies. In RSC reads
        // the cookie store is read-only and setAll is a no-op — the framework will
        // refresh the session on the next mutation.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // RSC read-only context; safe to ignore.
        }
      },
    },
  });
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}
