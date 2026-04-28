// Next.js middleware: refreshes the Supabase session cookie on each request and gates
// the (app) routes behind authentication. Public routes — landing page, sign-in,
// auth callback — pass through unauthenticated.

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATH_PREFIXES = ['/_next', '/api/server-time', '/auth', '/sign-in'];
const PUBLIC_EXACT = new Set(['/', '/favicon.ico', '/robots.txt']);

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Treat missing env as "no auth wired up yet" — let the request through; the page
    // will show its own error. This is what we want during early dev / missing .env.local.
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (isPublic(path)) return response;

  if (!data.user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/sign-in';
    signInUrl.searchParams.set('next', path);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}

function isPublic(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}
