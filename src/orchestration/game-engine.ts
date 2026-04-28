// Game engine. Loads a full game state from persistence, runs the pure rules engine
// (`applyMove`), and persists the resulting deltas atomically (or as close as Supabase
// allows from a single Server Action). It is the only module allowed to compose
// rules + persistence.
//
// Atomicity strategy:
//   1. Read games + game_secrets + players.
//   2. Compose the in-memory state (caller's view, with the active player's rack).
//   3. Run `applyMove`.
//   4. Insert the new `moves` row with seq = N+1 — the (game_id, seq) PK is the optimistic
//      concurrency guard. A duplicate-key error means a concurrent writer beat us.
//   5. Update games + game_secrets + players in sequence. If the moves insert succeeded
//      but a later write fails, the system can re-derive state from the moves log
//      because `moves` is authoritative.

import { applyMove, type ApplyAction } from '@rules/apply';
import { shuffleBag } from '@rules/bag';
import { rowToBoard } from '@persistence/dto';
import { getGameById, getGameSecrets, updateGameSecrets } from '@persistence/games.repo';
import { listMoves, insertMove, getNextSeq } from '@persistence/moves.repo';
import { listPlayers, updatePlayer } from '@persistence/players.repo';
import { getProfilesByIds } from '@persistence/profiles.repo';
import { getSupabaseAdminClient } from '@persistence/supabase-admin';
import { loadDictionaryById } from '@dictionary/load';
import { rowsToCommittedMove } from '@persistence/dto';
import type { GamePhase, GameState, PlayerSlot, PlayerState, Rack, Tile } from '@rules/types';
import { nextDeadline } from './transitions';

export type EngineError =
  | { kind: 'not-found' }
  | { kind: 'state-conflict'; reason: 'not-your-turn' | 'wrong-game-phase' | 'seq-conflict' }
  | { kind: 'rule-violation'; reason: string };

export type EngineResult<T> = { ok: true; data: T } | { ok: false; error: EngineError };

export async function loadGameStateForCaller(
  gameId: string,
  callerUserId: string,
): Promise<{ state: GameState; callerSlot: PlayerSlot | null } | null> {
  const game = await getGameById(gameId);
  if (!game) return null;

  const players = await listPlayers(gameId);
  const profiles = await getProfilesByIds(players.map((p) => p.user_id));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const moves = await listMoves(gameId);
  const secrets = await getGameSecrets(gameId);
  if (!secrets) return null;

  const callerSlot = (players.find((p) => p.user_id === callerUserId)?.slot ??
    null) as PlayerSlot | null;

  const playerStates: PlayerState[] = players
    .slice()
    .sort((a, b) => a.slot - b.slot)
    .map((p): PlayerState => {
      const profile = profileById.get(p.user_id);
      const baseRack: Rack | undefined =
        p.slot === 0
          ? secrets.rack_slot_0
          : p.slot === 1
            ? secrets.rack_slot_1
            : p.slot === 2
              ? (secrets.rack_slot_2 ?? undefined)
              : (secrets.rack_slot_3 ?? undefined);
      return {
        slot: p.slot,
        userId: p.user_id,
        displayName: profile?.display_name ?? 'Unknown',
        score: p.score,
        rackSize: p.rack_count,
        ...(baseRack ? { rack: baseRack } : {}),
        isHost: p.is_host,
        hasForfeitedNextTurn: p.forfeit_next,
        connected: p.connected,
        lastSeenAt: p.last_seen_at,
      };
    });

  const state: GameState = {
    id: game.id,
    phase: game.phase,
    players: playerStates,
    activeSlot: game.active_slot,
    turnStartedAt: game.turn_started_at,
    turnDeadlineAt: game.turn_deadline_at,
    timerSetting: game.timer_setting,
    bagRemaining: game.bag_count,
    board: rowToBoard(game.board_state),
    history: moves.map(rowsToCommittedMove),
    consecutiveScorelessTurns: game.consecutive_scoreless,
    pendingChallenge: game.pending_challenge,
    dictionaryId: game.dictionary_id,
    rngSeed: game.rng_seed,
    createdAt: game.created_at,
    endedAt: game.ended_at,
    result: game.result,
  };
  return { state, callerSlot };
}

/** Run a player action through the rules engine and persist the result. */
export async function commitAction(args: {
  gameId: string;
  callerUserId: string;
  action: ApplyAction;
}): Promise<EngineResult<{ newPhase: GamePhase }>> {
  const loaded = await loadGameStateForCaller(args.gameId, args.callerUserId);
  if (!loaded) return { ok: false, error: { kind: 'not-found' } };
  const { state, callerSlot } = loaded;
  if (callerSlot === null) {
    return { ok: false, error: { kind: 'state-conflict', reason: 'not-your-turn' } };
  }

  const dict = loadDictionaryById(state.dictionaryId);

  // Bag for refill draws. Fetch the current bag from secrets and reshuffle for an
  // exchange (returned tiles need a fresh shuffle).
  const secrets = await getGameSecrets(args.gameId);
  if (!secrets) return { ok: false, error: { kind: 'not-found' } };

  const result = applyMove({
    state,
    bag: secrets.bag,
    dictionary: dict,
    action: args.action,
  });

  if (!result.ok) {
    if (result.error.kind === 'state-conflict') {
      return { ok: false, error: { kind: 'state-conflict', reason: result.error.reason } };
    }
    return { ok: false, error: { kind: 'rule-violation', reason: result.error.reason } };
  }

  // Persist the resulting move row first — its (game_id, seq) PK is the optimistic
  // concurrency guard. A duplicate-key failure means another writer landed first.
  const expectedNextSeq = await getNextSeq(args.gameId);
  const newMove = result.state.history.at(-1)!.move;
  const insert = await insertMove({
    gameId: args.gameId,
    expectedNextSeq,
    playerSlot: args.action.playerSlot,
    move: newMove,
  });
  if (!insert.ok) {
    if (insert.reason === 'seq-conflict') {
      return { ok: false, error: { kind: 'state-conflict', reason: 'seq-conflict' } };
    }
    throw insert.cause;
  }

  // For exchange moves, reshuffle the bag (returned tiles + remaining draws) using the
  // game's seed advanced by the move number.
  let bagToPersist: Tile[] = result.bagAfter.slice();
  if (args.action.kind === 'exchange') {
    bagToPersist = shuffleBag(bagToPersist, `${state.rngSeed}:${expectedNextSeq}`);
  }

  // Update game_secrets: write the active player's new rack and the new bag.
  const rackKey =
    args.action.playerSlot === 0
      ? 'rack_slot_0'
      : args.action.playerSlot === 1
        ? 'rack_slot_1'
        : args.action.playerSlot === 2
          ? 'rack_slot_2'
          : 'rack_slot_3';

  const newRack = result.state.players.find((p) => p.slot === args.action.playerSlot)?.rack ?? [];
  await updateGameSecrets(args.gameId, {
    bag: bagToPersist,
    [rackKey]: newRack,
  } as Parameters<typeof updateGameSecrets>[1]);

  // Update the active player's score + rack_count.
  const me = result.state.players.find((p) => p.slot === args.action.playerSlot)!;
  await updatePlayer(args.gameId, args.action.playerSlot, {
    score: me.score,
    rack_count: me.rackSize,
  });

  // Compute the next deadline based on the (already advanced) active slot.
  const now = new Date();
  const newDeadline = nextDeadline(now, state.timerSetting);
  const newPhase: GamePhase =
    args.action.kind === 'place' ? 'challenge-window' : result.state.phase;

  // Update games row with the new board, phase, active_slot, etc.
  const sb = getSupabaseAdminClient();
  const patch: Record<string, unknown> = {
    phase: newPhase,
    active_slot: result.state.activeSlot,
    bag_count: bagToPersist.length,
    consecutive_scoreless: result.state.consecutiveScorelessTurns,
    turn_started_at: now.toISOString(),
    turn_deadline_at:
      newPhase === 'challenge-window' ? null : newDeadline ? newDeadline.toISOString() : null,
    board_state: result.state.board.cells,
  };
  const { error: gameUpdateError } = await sb.from('games').update(patch).eq('id', args.gameId);
  if (gameUpdateError) throw gameUpdateError;

  return { ok: true, data: { newPhase } };
}
