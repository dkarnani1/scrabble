'use server';

// Server Action: raiseChallenge. The opponent of the most recent place move asks
// the server to validate the played words. Success reverses the move; failure
// marks the challenger's next turn forfeit. See contracts/server-actions.md.

import { z } from 'zod';
import { getCurrentUser } from '@auth/server';
import { getGameById, getGameSecrets, updateGameSecrets } from '@persistence/games.repo';
import { listMoves, updateChallengeOutcome } from '@persistence/moves.repo';
import { listPlayers, updatePlayer } from '@persistence/players.repo';
import { getSupabaseAdminClient } from '@persistence/supabase-admin';
import { loadGameStateForCaller } from '@orchestration/game-engine';
import {
  CHALLENGE_WINDOW_MS,
  resolveChallengeWindowIfExpired,
  resolveIfExpired,
} from '@orchestration/timers';
import { nextDeadline } from '@orchestration/transitions';
import { resolveChallenge } from '@rules/challenge';
import { loadDictionaryById } from '@dictionary/load';
import { rowsToCommittedMove } from '@persistence/dto';
import { err, ok, type ActionResult, type GameView } from './types';
import { loadGameView } from './_helpers';
import type { PlacementCell, PlayerSlot, Tile } from '@rules/types';

const raiseChallengeSchema = z.object({
  gameId: z.string().uuid(),
  moveSeq: z.number().int().min(1),
});

export async function raiseChallenge(
  input: z.input<typeof raiseChallengeSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = raiseChallengeSchema.safeParse(input);
  if (!parsed.success) {
    return err({
      code: 'invalid-input',
      issues: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  // Preflight: lapse any expired turn or challenge-window timers before doing per-action
  // work. Either may flip the phase out from under us.
  const now = new Date();
  await resolveIfExpired(parsed.data.gameId, now);
  await resolveChallengeWindowIfExpired(parsed.data.gameId, now);

  const loaded = await loadGameStateForCaller(parsed.data.gameId, user.id);
  if (!loaded) return err({ code: 'not-found', entity: 'game' });
  if (loaded.callerSlot === null) {
    return err({ code: 'forbidden', reason: 'not-a-participant' });
  }
  const state = loaded.state;

  if (state.phase !== 'challenge-window') {
    return err({ code: 'state-conflict', reason: 'challenge-window-closed' });
  }

  const lastCommitted = state.history.at(-1);
  if (!lastCommitted || lastCommitted.move.kind !== 'place') {
    return err({ code: 'state-conflict', reason: 'wrong-game-phase' });
  }
  if (lastCommitted.move.seq !== parsed.data.moveSeq) {
    return err({ code: 'state-conflict', reason: 'turn-already-resolved' });
  }
  if (lastCommitted.move.playerSlot === loaded.callerSlot) {
    return err({ code: 'forbidden', reason: 'cannot-challenge-own-move' });
  }
  if (state.pendingChallenge !== null) {
    return err({ code: 'state-conflict', reason: 'challenge-already-raised' });
  }

  // Window expiry check (cheap second look).
  const placeCreatedAt = new Date(lastCommitted.move.createdAt).getTime();
  if (now.getTime() > placeCreatedAt + CHALLENGE_WINDOW_MS) {
    return err({ code: 'state-conflict', reason: 'challenge-window-closed' });
  }

  // Read current bag and the placer's rack from game_secrets.
  const secrets = await getGameSecrets(parsed.data.gameId);
  if (!secrets) return err({ code: 'internal-error', message: 'missing game_secrets' });

  const placerSlot = lastCommitted.move.playerSlot;
  const placerRack: Tile[] | null =
    placerSlot === 0
      ? secrets.rack_slot_0
      : placerSlot === 1
        ? secrets.rack_slot_1
        : placerSlot === 2
          ? (secrets.rack_slot_2 ?? null)
          : (secrets.rack_slot_3 ?? null);
  if (!placerRack) {
    return err({ code: 'internal-error', message: 'missing placer rack' });
  }

  // Read refillCount from the move payload (written by insertMove).
  const moveRows = await listMoves(parsed.data.gameId);
  const lastRow = moveRows.find((r) => r.seq === parsed.data.moveSeq);
  if (!lastRow) {
    return err({ code: 'state-conflict', reason: 'turn-already-resolved' });
  }
  const payload = (lastRow.payload as { refillCount?: number; tiles?: PlacementCell[] }) ?? {};
  const placedTiles: PlacementCell[] = payload.tiles ?? lastCommitted.move.tiles;
  const refillCount = Math.max(
    0,
    Math.min(placerRack.length, payload.refillCount ?? placedTiles.length),
  );
  const refillDraws = placerRack.slice(placerRack.length - refillCount);

  // Optimistically advance phase to 'resolving-challenge' with the pending_challenge.
  const sb = getSupabaseAdminClient();
  const challengerSlot = loaded.callerSlot as PlayerSlot;
  const pending = {
    moveSeq: parsed.data.moveSeq,
    challengerSlot,
    raisedAt: now.toISOString(),
  };
  const { error: phaseError, data: phaseData } = await sb
    .from('games')
    .update({ phase: 'resolving-challenge', pending_challenge: pending })
    .eq('id', parsed.data.gameId)
    .eq('phase', 'challenge-window')
    .select('id')
    .maybeSingle();
  if (phaseError) throw phaseError;
  if (!phaseData) {
    return err({ code: 'state-conflict', reason: 'challenge-window-closed' });
  }

  // Run the pure resolver.
  const dict = loadDictionaryById(state.dictionaryId);
  const resolution = resolveChallenge({
    state,
    bagAfter: secrets.bag,
    lastMovePlacedTiles: placedTiles,
    lastMoveRefillDraws: refillDraws,
    lastMoveScore: lastCommitted.move.score,
    challengerSlot,
    dictionary: dict,
  });

  // Persist the outcome on the moves row.
  await updateChallengeOutcome(parsed.data.gameId, parsed.data.moveSeq, resolution.outcome);

  // Persist the resolved state.
  if (resolution.outcome.kind === 'challenged-invalid') {
    // Bag receives the refill back; placer's rack restored; placer's score reverted.
    const rackKey =
      placerSlot === 0
        ? 'rack_slot_0'
        : placerSlot === 1
          ? 'rack_slot_1'
          : placerSlot === 2
            ? 'rack_slot_2'
            : 'rack_slot_3';
    await updateGameSecrets(parsed.data.gameId, {
      bag: resolution.bagAfter,
      [rackKey]: resolution.state.players.find((p) => p.slot === placerSlot)?.rack ?? [],
    } as Parameters<typeof updateGameSecrets>[1]);

    for (const p of resolution.state.players) {
      await updatePlayer(parsed.data.gameId, p.slot, {
        score: p.score,
        rack_count: p.rackSize,
      });
    }

    const newDeadline = nextDeadline(now, state.timerSetting);
    const { error: gameError } = await sb
      .from('games')
      .update({
        phase: 'playing',
        active_slot: resolution.state.activeSlot,
        board_state: resolution.state.board.cells,
        bag_count: resolution.bagAfter.length,
        consecutive_scoreless: resolution.state.consecutiveScorelessTurns,
        pending_challenge: null,
        turn_started_at: now.toISOString(),
        turn_deadline_at: newDeadline ? newDeadline.toISOString() : null,
      })
      .eq('id', parsed.data.gameId);
    if (gameError) throw gameError;
  } else {
    // Challenge upheld — move stands. Skip the challenger.
    const newDeadline = nextDeadline(now, state.timerSetting);
    const { error: gameError } = await sb
      .from('games')
      .update({
        phase: 'playing',
        active_slot: resolution.state.activeSlot,
        pending_challenge: null,
        turn_started_at: now.toISOString(),
        turn_deadline_at: newDeadline ? newDeadline.toISOString() : null,
      })
      .eq('id', parsed.data.gameId);
    if (gameError) throw gameError;
  }

  const view = await loadGameView({ gameId: parsed.data.gameId, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// Re-exported for tests to inspect the post-resolve view without re-loading.
export { rowsToCommittedMove };
// Direct repo helpers used by some tests; harmless to expose since they require a
// service-role connection to function and are guarded by the admin client.
export { listMoves, listPlayers, getGameById };
