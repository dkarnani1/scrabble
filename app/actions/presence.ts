'use server';

// Tiny heartbeat Server Action. The play page calls this every 15s while the user
// has the tab in focus; it updates the player's `last_seen_at` and `connected = true`
// in the `players` row. Opponents derive a "disconnected" indicator from this column.

import { z } from 'zod';
import { getCurrentUser } from '@auth/server';
import { findPlayerByUser, updatePlayer } from '@persistence/players.repo';
import { err, ok, type ActionResult } from './types';

const markPresentSchema = z.object({ gameId: z.string().uuid() });

export async function markPresent(
  input: z.input<typeof markPresentSchema>,
): Promise<ActionResult<{ ok: true }>> {
  const parsed = markPresentSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'invalid-input',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const me = await findPlayerByUser(parsed.data.gameId, user.id);
  if (!me) return err({ code: 'forbidden', reason: 'not-a-participant' });

  await updatePlayer(parsed.data.gameId, me.slot, {
    connected: true,
    last_seen_at: new Date().toISOString(),
  });

  return ok({ ok: true });
}

const markAbsentSchema = z.object({ gameId: z.string().uuid() });

/** Best-effort: called on tab close / unload to drop the connected flag. RLS ensures
 * the caller can only update their own row. */
export async function markAbsent(
  input: z.input<typeof markAbsentSchema>,
): Promise<ActionResult<{ ok: true }>> {
  const parsed = markAbsentSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'invalid-input',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const me = await findPlayerByUser(parsed.data.gameId, user.id);
  if (!me) return err({ code: 'forbidden', reason: 'not-a-participant' });

  await updatePlayer(parsed.data.gameId, me.slot, {
    connected: false,
    last_seen_at: new Date().toISOString(),
  });

  return ok({ ok: true });
}
