// Auth helpers for server-side code (Server Actions, route handlers, RSC). Wraps the
// cookies-bound Supabase client to expose a small typed API for "who is this request".

import { createSupabaseServerClient } from '@persistence/supabase-server';

export type SessionUser = {
  id: string;
  email: string | null;
};

// ---- Test override --------------------------------------------------------------
// Integration tests run Server Actions outside a real HTTP request and therefore have no
// auth cookies. They install an override via `__setTestUserOverride`; production code
// never imports the setter (it's available but only meaningful when set). The override
// is consulted only when NODE_ENV !== 'production' to keep production safe even if a
// caller tried to misuse it.
let testUserOverride: SessionUser | null = null;
export function __setTestUserOverride(user: SessionUser | null): void {
  if (process.env.NODE_ENV === 'production') return;
  testUserOverride = user;
}
export function __getTestUserOverride(): SessionUser | null {
  return testUserOverride;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (process.env.NODE_ENV !== 'production' && testUserOverride) {
    return testUserOverride;
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Throws if the request is unauthenticated. Server Actions call this at the top. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new UnauthenticatedError();
  }
  return user;
}

export class UnauthenticatedError extends Error {
  constructor() {
    super('Unauthenticated');
    this.name = 'UnauthenticatedError';
  }
}
