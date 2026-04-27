// Auth helpers for server-side code (Server Actions, route handlers, RSC). Wraps the
// cookies-bound Supabase client to expose a small typed API for "who is this request".

import { createSupabaseServerClient } from '@persistence/supabase-server';

export type SessionUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<SessionUser | null> {
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
