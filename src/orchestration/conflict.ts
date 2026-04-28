// Optimistic-concurrency helpers. The orchestration layer reads a game row, computes
// a transition, then writes it under a guard that the row hasn't been touched by a
// concurrent action in the meantime. The typical guard is `(phase, active_slot)`
// matching the pre-image; here we encode the helpers callers use to translate a guard
// failure into a `state-conflict` error.

import { getSupabaseAdminClient } from '@persistence/supabase-admin';
import type { GamePhase, PlayerSlot } from '@rules/types';

export type ConcurrencyGuard = {
  expectedPhase: GamePhase;
  expectedActiveSlot: PlayerSlot | null;
};

/** Update the game row only if the (phase, active_slot) matches the pre-image. Returns
 * `true` if the update applied, `false` if a concurrent writer changed the row. */
export async function guardedUpdateGame(
  gameId: string,
  guard: ConcurrencyGuard,
  patch: Record<string, unknown>,
): Promise<boolean> {
  const sb = getSupabaseAdminClient();
  let q = sb.from('games').update(patch).eq('id', gameId).eq('phase', guard.expectedPhase);
  q =
    guard.expectedActiveSlot === null
      ? q.is('active_slot', null)
      : q.eq('active_slot', guard.expectedActiveSlot);
  const { data, error } = await q.select('id').maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
