// Server-time freshness endpoint. The browser calls this on `window.focus` to
// re-anchor its clock-skew correction. Cheap, public, and read-only — no auth needed.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { now: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
