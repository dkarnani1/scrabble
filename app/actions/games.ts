'use server';

// Server Actions for game lifecycle: createGame, joinGame, startGame, leaveLobby,
// listMyGames. The contract is documented in
// `specs/001-scrabble-multiplayer/contracts/server-actions.md`.

import { z } from 'zod';
import { getCurrentUser } from '@auth/server';
import { createEmptyBoard } from '@rules/board';
import { makeStandardBag } from '@rules/distribution';
import { shuffleBag, drawTiles } from '@rules/bag';
import type { PlayerSlot, TimerSetting } from '@rules/types';
import {
  createGameRow,
  getGameById,
  startGameRow,
  setGamePhase,
  listActiveGamesForUser,
  getGameSecrets,
  updateGameSecrets,
} from '@persistence/games.repo';
import {
  findPlayerByUser,
  insertPlayer,
  listPlayers,
  updatePlayer,
  deletePlayer,
} from '@persistence/players.repo';
import { consumeInvite, findInviteByCode, insertInvite } from '@persistence/invites.repo';
import { getProfilesByIds } from '@persistence/profiles.repo';
import { err, ok, type ActionResult, type GameSummary, type GameView } from './types';
import { loadGameView } from './_helpers';

const TIMER_VALUES: TimerSetting[] = ['none', '30s', '1m', '2m'];

// ---- createGame ------------------------------------------------------------------

const createGameSchema = z.object({
  timerSetting: z.enum(TIMER_VALUES as [TimerSetting, ...TimerSetting[]]),
  dictionaryId: z.string().min(1).max(64),
});

export async function createGame(
  input: z.input<typeof createGameSchema>,
): Promise<ActionResult<{ gameId: string; inviteCode: string }>> {
  const parsed = createGameSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const rngSeed = `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  const bag = shuffleBag(makeStandardBag(), rngSeed);
  const board = createEmptyBoard();

  const created = await createGameRow({
    hostUserId: user.id,
    timerSetting: parsed.data.timerSetting,
    dictionaryId: parsed.data.dictionaryId,
    bag,
    rngSeed,
    emptyBoardJson: board.cells,
  });

  const invite = await insertInvite(created.game.id, user.id);

  return ok({ gameId: created.game.id, inviteCode: invite.code });
}

// ---- joinGame --------------------------------------------------------------------

const joinGameSchema = z.object({
  inviteCode: z.string().min(4).max(32),
});

export async function joinGame(
  input: z.input<typeof joinGameSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = joinGameSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const invite = await findInviteByCode(parsed.data.inviteCode);
  if (!invite) return err({ code: 'not-found', entity: 'invite' });
  if (invite.consumed_at) {
    return err({ code: 'forbidden', reason: 'invite-already-consumed' });
  }

  const game = await getGameById(invite.game_id);
  if (!game) return err({ code: 'not-found', entity: 'game' });
  if (game.phase !== 'lobby') {
    return err({ code: 'state-conflict', reason: 'wrong-game-phase' });
  }

  const existingPlayers = await listPlayers(game.id);
  if (existingPlayers.some((p) => p.user_id === user.id)) {
    return err({ code: 'forbidden', reason: 'already-joined' });
  }
  if (existingPlayers.length >= 2) {
    return err({ code: 'forbidden', reason: 'lobby-full' });
  }

  const usedSlots = new Set(existingPlayers.map((p) => p.slot));
  const nextSlot: PlayerSlot = ([0, 1, 2, 3] as PlayerSlot[]).find((s) => !usedSlots.has(s)) ?? 1;

  // Atomic single-use guard.
  const consumed = await consumeInvite(invite.code, user.id);
  if (!consumed) {
    return err({ code: 'forbidden', reason: 'invite-already-consumed' });
  }

  await insertPlayer({
    gameId: game.id,
    slot: nextSlot,
    userId: user.id,
    isHost: false,
  });

  const view = await loadGameView({ gameId: game.id, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// ---- startGame -------------------------------------------------------------------

const startGameSchema = z.object({
  gameId: z.string().uuid(),
});

export async function startGame(
  input: z.input<typeof startGameSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = startGameSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const game = await getGameById(parsed.data.gameId);
  if (!game) return err({ code: 'not-found', entity: 'game' });
  if (game.phase !== 'lobby') {
    return err({ code: 'state-conflict', reason: 'wrong-game-phase' });
  }

  const me = await findPlayerByUser(game.id, user.id);
  if (!me) return err({ code: 'forbidden', reason: 'not-a-participant' });
  if (!me.is_host) return err({ code: 'forbidden', reason: 'not-host' });

  const players = await listPlayers(game.id);
  if (players.length < 2) {
    return err({ code: 'forbidden', reason: 'lobby-not-full' });
  }

  const secrets = await getGameSecrets(game.id);
  if (!secrets) return err({ code: 'internal-error', message: 'missing game_secrets' });

  // Deal racks: 7 tiles per seated player, in slot order, off the front of the bag.
  const seatedSlots = players.map((p) => p.slot).sort((a, b) => a - b);
  let bag = secrets.bag.slice();
  const racksBySlot: Partial<Record<PlayerSlot, ReturnType<typeof drawTiles>['drawn']>> = {};
  for (const slot of seatedSlots) {
    const drawn = drawTiles(bag, 7);
    racksBySlot[slot] = drawn.drawn;
    bag = drawn.remaining;
  }

  // Coin-flip first turn from the seated slots (deterministic-ish per game seed for
  // reproducibility; production randomness is fine for v1).
  const firstSlot = seatedSlots[Math.floor(Math.random() * seatedSlots.length)] as PlayerSlot;

  const turnStartedAt = new Date();
  const deadline = computeDeadline(turnStartedAt, game.timer_setting);

  const updatedSecrets: Parameters<typeof updateGameSecrets>[1] = {
    bag,
    rack_slot_0: racksBySlot[0] ?? [],
    rack_slot_1: racksBySlot[1] ?? [],
    rack_slot_2: racksBySlot[2] ?? null,
    rack_slot_3: racksBySlot[3] ?? null,
  };
  await updateGameSecrets(game.id, updatedSecrets);

  for (const slot of seatedSlots) {
    await updatePlayer(game.id, slot, { rack_count: 7, connected: true });
  }

  await startGameRow(
    game.id,
    {
      active_slot: firstSlot,
      turn_started_at: turnStartedAt.toISOString(),
      turn_deadline_at: deadline ? deadline.toISOString() : null,
      bag_count: bag.length,
    },
    'lobby',
  );

  const view = await loadGameView({ gameId: game.id, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}

// ---- leaveLobby ------------------------------------------------------------------

const leaveLobbySchema = z.object({ gameId: z.string().uuid() });

export async function leaveLobby(
  input: z.input<typeof leaveLobbySchema>,
): Promise<ActionResult<{ ok: true }>> {
  const parsed = leaveLobbySchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const game = await getGameById(parsed.data.gameId);
  if (!game) return err({ code: 'not-found', entity: 'game' });
  if (game.phase !== 'lobby') {
    return err({ code: 'state-conflict', reason: 'wrong-game-phase' });
  }

  const me = await findPlayerByUser(game.id, user.id);
  if (!me) return err({ code: 'forbidden', reason: 'not-a-participant' });

  if (me.is_host) {
    // Host abandons the game; this also lets the schema's cascade clean up players.
    await setGamePhase(game.id, 'abandoned', 'lobby');
  } else {
    await deletePlayer(game.id, me.slot);
  }

  return ok({ ok: true });
}

// ---- listMyGames -----------------------------------------------------------------

export async function listMyGames(): Promise<
  ActionResult<{ active: GameView[]; recent: GameSummary[] }>
> {
  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const rows = await listActiveGamesForUser(user.id);
  const active: GameView[] = [];
  for (const row of rows) {
    const v = await loadGameView({ gameId: row.id, callerUserId: user.id });
    if (v) active.push(v);
  }

  // `recent` (completed history) is best surfaced once US3 lands. Until then return [].
  // The shape is locked by the contract so future work just populates it.
  const recent: GameSummary[] = [];
  return ok({ active, recent });
}

// ---- helpers ---------------------------------------------------------------------

function computeDeadline(start: Date, timer: TimerSetting): Date | null {
  const ms = timer === '30s' ? 30_000 : timer === '1m' ? 60_000 : timer === '2m' ? 120_000 : null;
  if (ms === null) return null;
  return new Date(start.getTime() + ms);
}

function zodToError(error: z.ZodError): {
  code: 'invalid-input';
  issues: { path: string; message: string }[];
} {
  return {
    code: 'invalid-input',
    issues: error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
  };
}

// Re-export the profile lookup used by the home page so the import surface stays small.
export { getProfilesByIds };

// ---- getMyRack -------------------------------------------------------------------

const getMyRackSchema = z.object({ gameId: z.string().uuid() });

export async function getMyRack(
  input: z.input<typeof getMyRackSchema>,
): Promise<ActionResult<{ rack: import('@rules/types').Rack | null }>> {
  const parsed = getMyRackSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const me = await findPlayerByUser(parsed.data.gameId, user.id);
  if (!me) return err({ code: 'forbidden', reason: 'not-a-participant' });

  const secrets = await getGameSecrets(parsed.data.gameId);
  if (!secrets) return err({ code: 'not-found', entity: 'game' });

  const rack: import('@rules/types').Rack | null =
    me.slot === 0
      ? secrets.rack_slot_0
      : me.slot === 1
        ? secrets.rack_slot_1
        : me.slot === 2
          ? (secrets.rack_slot_2 ?? null)
          : (secrets.rack_slot_3 ?? null);

  return ok({ rack });
}

// ---- rematch ---------------------------------------------------------------------

const rematchSchema = z.object({ priorGameId: z.string().uuid() });

export async function rematch(
  input: z.input<typeof rematchSchema>,
): Promise<ActionResult<{ gameId: string; inviteCode: string }>> {
  const parsed = rematchSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  const prior = await getGameById(parsed.data.priorGameId);
  if (!prior) return err({ code: 'not-found', entity: 'game' });
  if (prior.phase !== 'completed') {
    return err({ code: 'state-conflict', reason: 'wrong-game-phase' });
  }
  if (prior.host_user_id !== user.id) {
    return err({ code: 'forbidden', reason: 'not-host' });
  }

  // Same settings, fresh seed + bag + invite code.
  return createGame({
    timerSetting: prior.timer_setting,
    dictionaryId: prior.dictionary_id,
  });
}

// ---- getGameView -----------------------------------------------------------------

const getGameViewSchema = z.object({ gameId: z.string().uuid() });

export async function getGameView(
  input: z.input<typeof getGameViewSchema>,
): Promise<ActionResult<GameView>> {
  const parsed = getGameViewSchema.safeParse(input);
  if (!parsed.success) return err(zodToError(parsed.error));

  const user = await getCurrentUser();
  if (!user) return err({ code: 'unauthenticated' });

  // Preflight: resolve any expired turn deadline AND challenge window so reads reflect
  // the corrected state. This is where the lazy timer enforcement runs for the play
  // page's initial render and for every refetch the realtime channel triggers.
  const { resolveIfExpired, resolveChallengeWindowIfExpired } =
    await import('@orchestration/timers');
  const now = new Date();
  await resolveIfExpired(parsed.data.gameId, now);
  await resolveChallengeWindowIfExpired(parsed.data.gameId, now);

  const view = await loadGameView({ gameId: parsed.data.gameId, callerUserId: user.id });
  if (!view) return err({ code: 'not-found', entity: 'game' });
  return ok(view);
}
