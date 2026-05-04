// Supabase auth callback. Exchanges the magic-link `code` query param for a session
// and sets the session cookies on the response, then redirects to `next` (or /home).
//
// On successful sign-in we ALSO mark every existing players row for this user as
// `connected = false`. That tells any older browser tab still watching the live
// channel that this user has handed off — prompts the older tab's PresenceIndicator
// to flip to "disconnected" until the new tab's heartbeat (or the older tab's, if
// kept open) writes back. This is the v1 best-effort multi-device session handoff
// (T616 / FR-076).

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@persistence/supabase-server';
import { getSupabaseAdminClient } from '@persistence/supabase-admin';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/home';

  if (!code) {
    url.pathname = '/sign-in';
    url.searchParams.set('error', 'missing-code');
    return NextResponse.redirect(url);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = '/sign-in';
    url.searchParams.set('error', error.message);
    url.searchParams.delete('code');
    return NextResponse.redirect(url);
  }

  // Multi-device handoff: drop the connected flag on every existing players row
  // for this user. The new device will set it back via the heartbeat as soon as
  // the play page mounts. This is best-effort; failures are logged and ignored.
  const userId = data.user?.id;
  if (userId) {
    try {
      const admin = getSupabaseAdminClient();
      await admin.from('players').update({ connected: false }).eq('user_id', userId);
    } catch {
      // Non-fatal — handoff signalling is a UX nicety, not a correctness invariant.
    }
  }

  const redirect = url.clone();
  redirect.pathname = next.startsWith('/') ? next : '/home';
  redirect.search = '';
  return NextResponse.redirect(redirect);
}
