// Server-time deadline math + the lazy expiry resolver.
//
// `remainingMs(state, now)` is the pure projection used by both the rules engine
// and the UI to render the countdown. `resolveIfExpired(gameId, now)` is the
// idempotent cleanup the orchestration layer runs before every Server Action AND on
// every cron sweep — if the active player's deadline has passed, it inserts a
// forced-timeout pass move and rotates the active slot.

import { commitAction, loadGameStateForCaller } from './game-engine';
import { getGameById } from '@persistence/games.repo';
import { listMoves } from '@persistence/moves.repo';
import { listPlayers } from '@persistence/players.repo';
import { nextDeadline } from './transitions';
import type { GameState } from '@rules/types';

/** Challenge windows are exactly 3 seconds long, per FR-040 / data-model.md. */
export const CHALLENGE_WINDOW_MS = 3_000 as const;

export function remainingMs(state: Pick<GameState, 'turnDeadlineAt'>, now: Date): number | null {
  if (!state.turnDeadlineAt) return null;
  const deadlineMs = new Date(state.turnDeadlineAt).getTime();
  const nowMs = now.getTime();
  return Math.max(0, deadlineMs - nowMs);
}

export function isExpired(state: Pick<GameState, 'turnDeadlineAt'>, now: Date): boolean {
  if (!state.turnDeadlineAt) return false;
  return now.getTime() >= new Date(state.turnDeadlineAt).getTime();
}

/** Result of a single sweep call. */
export type ResolveResult =
  | { kind: 'no-op' }
  | { kind: 'forced-pass'; gameId: string }
  | { kind: 'not-found' };

/** Idempotent: if `gameId` is in `playing` phase with an expired turn deadline, inserts
 * a forced-timeout pass move (using the active player's identity), advancing the turn.
 * Otherwise no-op. Safe to call from every action and from the cron sweep. */
export async function resolveIfExpired(gameId: string, now: Date): Promise<ResolveResult> {
  const game = await getGameById(gameId);
  if (!game) return { kind: 'not-found' };
  if (game.phase !== 'playing') return { kind: 'no-op' };
  if (!game.turn_deadline_at) return { kind: 'no-op' };
  if (now.getTime() < new Date(game.turn_deadline_at).getTime()) return { kind: 'no-op' };

  const players = await listPlayers(gameId);
  const activeSlot = game.active_slot;
  if (activeSlot === null) return { kind: 'no-op' };
  const activePlayer = players.find((p) => p.slot === activeSlot);
  if (!activePlayer) return { kind: 'no-op' };

  // Reuse the engine commit path so all the same persistence + transition rules apply,
  // including endgame detection (six consecutive scoreless turns).
  const commit = await commitAction({
    gameId,
    callerUserId: activePlayer.user_id,
    action: { kind: 'pass', playerSlot: activeSlot, reason: 'forced-timeout' },
  });
  if (!commit.ok) {
    if (commit.error.kind === 'state-conflict' && commit.error.reason === 'seq-conflict') {
      // Concurrent commit; safe to ignore — the other writer already advanced the game.
      return { kind: 'no-op' };
    }
    return { kind: 'no-op' };
  }
  return { kind: 'forced-pass', gameId };
}

/** Bulk sweep: pass deadline-expired games through `resolveIfExpired`. The cron route
 * uses this; per-action preflight uses the single-game form above. */
export async function sweepDueDeadlines(now: Date): Promise<{ resolved: string[] }> {
  // Lazy import the admin client to avoid module-load-time env reads in tests.
  const { getSupabaseAdminClient } = await import('@persistence/supabase-admin');
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('games')
    .select('id')
    .eq('phase', 'playing')
    .lt('turn_deadline_at', now.toISOString());
  if (error) throw error;
  const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  const resolved: string[] = [];
  for (const id of ids) {
    const result = await resolveIfExpired(id, now);
    if (result.kind === 'forced-pass') resolved.push(id);
  }
  return { resolved };
}

export type ChallengeWindowResolveResult =
  | { kind: 'no-op' }
  | { kind: 'window-closed'; gameId: string };

/** Idempotent: if `gameId` is in `challenge-window` phase and the latest place move's
 * created_at + CHALLENGE_WINDOW_MS has passed, transition phase to 'playing' and reset
 * the turn deadline. Safe to call from every action and from the cron sweep. */
export async function resolveChallengeWindowIfExpired(
  gameId: string,
  now: Date,
): Promise<ChallengeWindowResolveResult> {
  const game = await getGameById(gameId);
  if (!game) return { kind: 'no-op' };
  if (game.phase !== 'challenge-window') return { kind: 'no-op' };

  const moves = await listMoves(gameId);
  const lastMove = moves.at(-1);
  if (!lastMove) return { kind: 'no-op' };
  const lastCreated = new Date(lastMove.created_at).getTime();
  if (now.getTime() < lastCreated + CHALLENGE_WINDOW_MS) return { kind: 'no-op' };

  const { getSupabaseAdminClient } = await import('@persistence/supabase-admin');
  const sb = getSupabaseAdminClient();
  const newDeadline = nextDeadline(now, game.timer_setting);
  const { error } = await sb
    .from('games')
    .update({
      phase: 'playing',
      pending_challenge: null,
      turn_started_at: now.toISOString(),
      turn_deadline_at: newDeadline ? newDeadline.toISOString() : null,
    })
    .eq('id', gameId)
    .eq('phase', 'challenge-window');
  if (error) throw error;
  return { kind: 'window-closed', gameId };
}

/** Bulk sweep for expired challenge windows. */
export async function sweepDueChallengeWindows(now: Date): Promise<{ resolved: string[] }> {
  const { getSupabaseAdminClient } = await import('@persistence/supabase-admin');
  const sb = getSupabaseAdminClient();
  // Find games still in challenge-window phase. We could narrow this with a
  // generated column in Postgres, but for v1 the count of in-flight games is small
  // and the per-row check below handles 3-second precision.
  const { data, error } = await sb.from('games').select('id').eq('phase', 'challenge-window');
  if (error) throw error;
  const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
  const resolved: string[] = [];
  for (const id of ids) {
    const result = await resolveChallengeWindowIfExpired(id, now);
    if (result.kind === 'window-closed') resolved.push(id);
  }
  return { resolved };
}

// Re-export the loader so action preflight can chain `resolveIfExpired` then `loadGameStateForCaller`.
export { loadGameStateForCaller };
