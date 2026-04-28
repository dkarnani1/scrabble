// Repository for the `games` and `game_secrets` tables. All writes go through the
// service-role client because RLS denies INSERT/UPDATE/DELETE from publishable-key
// clients on these tables. The orchestration layer is responsible for layering its own
// authorization (the action checked the caller is host, etc.) before calling these
// methods.

import { getSupabaseAdminClient } from './supabase-admin';
import type { GameRow, PlayerRow } from './dto';
import type { GamePhase, PlayerSlot, TimerSetting, Tile } from '@rules/types';

export type CreateGameInput = {
  hostUserId: string;
  timerSetting: TimerSetting;
  dictionaryId: string;
  bag: Tile[];
  rngSeed: string;
  emptyBoardJson: GameRow['board_state'];
};

export type CreateGameResult = { game: GameRow; player: PlayerRow };

export async function createGameRow(input: CreateGameInput): Promise<CreateGameResult> {
  const sb = getSupabaseAdminClient();

  const { data: gameRow, error: gameError } = await sb
    .from('games')
    .insert({
      phase: 'lobby' as GamePhase,
      host_user_id: input.hostUserId,
      timer_setting: input.timerSetting,
      dictionary_id: input.dictionaryId,
      board_state: input.emptyBoardJson,
      bag_count: input.bag.length,
      active_slot: null,
      turn_started_at: null,
      turn_deadline_at: null,
      consecutive_scoreless: 0,
      pending_challenge: null,
      rng_seed: input.rngSeed,
    })
    .select('*')
    .single();
  if (gameError || !gameRow) throw gameError ?? new Error('createGameRow: no row returned');

  const { error: secretError } = await sb.from('game_secrets').insert({
    game_id: gameRow.id,
    bag: input.bag,
    rack_slot_0: [],
    rack_slot_1: [],
    rack_slot_2: null,
    rack_slot_3: null,
  });
  if (secretError) throw secretError;

  const { data: playerRow, error: playerError } = await sb
    .from('players')
    .insert({
      game_id: gameRow.id,
      slot: 0,
      user_id: input.hostUserId,
      is_host: true,
      score: 0,
      rack_count: 0,
      forfeit_next: false,
      connected: false,
    })
    .select('*')
    .single();
  if (playerError || !playerRow) throw playerError ?? new Error('createGameRow: host row failed');

  return { game: gameRow as GameRow, player: playerRow as PlayerRow };
}

export async function getGameById(gameId: string): Promise<GameRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('games').select('*').eq('id', gameId).maybeSingle();
  if (error) throw error;
  return (data as GameRow | null) ?? null;
}

export type StartGamePatch = {
  active_slot: PlayerSlot;
  turn_started_at: string;
  turn_deadline_at: string | null;
  bag_count: number;
};

export async function startGameRow(
  gameId: string,
  patch: StartGamePatch,
  expectedPhase: GamePhase = 'lobby',
): Promise<GameRow> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('games')
    .update({
      phase: 'playing' as GamePhase,
      active_slot: patch.active_slot,
      turn_started_at: patch.turn_started_at,
      turn_deadline_at: patch.turn_deadline_at,
      bag_count: patch.bag_count,
    })
    .eq('id', gameId)
    .eq('phase', expectedPhase)
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('startGameRow: optimistic update missed');
  return data as GameRow;
}

export async function setGamePhase(
  gameId: string,
  nextPhase: GamePhase,
  expectedPhase?: GamePhase,
): Promise<GameRow> {
  const sb = getSupabaseAdminClient();
  let q = sb.from('games').update({ phase: nextPhase }).eq('id', gameId);
  if (expectedPhase) q = q.eq('phase', expectedPhase);
  const { data, error } = await q.select('*').single();
  if (error || !data) throw error ?? new Error('setGamePhase: optimistic update missed');
  return data as GameRow;
}

export type GameSecretsRow = {
  game_id: string;
  bag: Tile[];
  rack_slot_0: Tile[];
  rack_slot_1: Tile[];
  rack_slot_2: Tile[] | null;
  rack_slot_3: Tile[] | null;
};

export async function getGameSecrets(gameId: string): Promise<GameSecretsRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('game_secrets')
    .select('*')
    .eq('game_id', gameId)
    .maybeSingle();
  if (error) throw error;
  return (data as GameSecretsRow | null) ?? null;
}

export async function updateGameSecrets(
  gameId: string,
  patch: Partial<Omit<GameSecretsRow, 'game_id'>>,
): Promise<void> {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from('game_secrets').update(patch).eq('game_id', gameId);
  if (error) throw error;
}

export async function listActiveGamesForUser(userId: string): Promise<GameRow[]> {
  const sb = getSupabaseAdminClient();
  // Fetch the games where `userId` is in `players` and the game is not completed/abandoned.
  const { data, error } = await sb
    .from('players')
    .select('game_id, games:game_id(*)')
    .eq('user_id', userId);
  if (error) throw error;
  type Joined = { games: GameRow | null };
  const rows = ((data ?? []) as unknown as Joined[])
    .map((r) => r.games)
    .filter((g): g is GameRow => g !== null)
    .filter((g) => g.phase !== 'completed' && g.phase !== 'abandoned');
  return rows;
}
