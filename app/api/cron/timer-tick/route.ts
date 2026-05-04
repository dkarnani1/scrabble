// Vercel Cron entry point. Runs every minute (see vercel.json) and forces a pass on
// every game whose `turn_deadline_at` has elapsed. Idempotent — re-running the sweep is
// always safe; games that have already been advanced will simply no-op.
//
// Auth: protected by the `CRON_SECRET` env var. Vercel Cron sends the secret in the
// `Authorization: Bearer <CRON_SECRET>` header. Returning 401 to anyone without the
// secret prevents external triggering.

import { NextResponse } from 'next/server';
import { sweepDueDeadlines, sweepDueChallengeWindows } from '@orchestration/timers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  const auth = request.headers.get('authorization') ?? '';
  const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : auth;
  if (provided !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const turnsSwept = await sweepDueDeadlines(now);
  const challengesSwept = await sweepDueChallengeWindows(now);
  return NextResponse.json({
    ok: true,
    resolved: turnsSwept.resolved,
    challengeWindowsClosed: challengesSwept.resolved,
  });
}
