// Root Next.js middleware. Delegates to src/auth/middleware so the auth wiring lives
// in the auth layer rather than at the repo root.

import type { NextRequest } from 'next/server';
import { updateSession } from '@auth/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on everything except static assets and image optimization. Auth checks happen
  // inside updateSession against the path; assets always pass through.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
