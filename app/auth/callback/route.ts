// Supabase auth callback. Exchanges the magic-link `code` query param for a session
// and sets the session cookies on the response, then redirects to `next` (or /home).

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@persistence/supabase-server';

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
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    url.pathname = '/sign-in';
    url.searchParams.set('error', error.message);
    url.searchParams.delete('code');
    return NextResponse.redirect(url);
  }

  const redirect = url.clone();
  redirect.pathname = next.startsWith('/') ? next : '/home';
  redirect.search = '';
  return NextResponse.redirect(redirect);
}
