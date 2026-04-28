// Repository for the `players` table. Service-role writes; reads either via service role
// (for action-internal flows) or via RLS for participant clients.

import { getSupabaseAdminClient } from './supabase-admin';
import type { PlayerRow } from './dto';
import type { PlayerSlot } from '@rules/types';

export async function listPlayers(gameId: string): Promise<PlayerRow[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('players').select('*').eq('game_id', gameId);
  if (error) throw error;
  return (data ?? []) as PlayerRow[];
}

export async function findPlayerByUser(gameId: string, userId: string): Promise<PlayerRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as PlayerRow | null) ?? null;
}

export type InsertPlayerInput = {
  gameId: string;
  slot: PlayerSlot;
  userId: string;
  isHost: boolean;
};

export async function insertPlayer(input: InsertPlayerInput): Promise<PlayerRow> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('players')
    .insert({
      game_id: input.gameId,
      slot: input.slot,
      user_id: input.userId,
      is_host: input.isHost,
      score: 0,
      rack_count: 0,
      forfeit_next: false,
      connected: false,
    })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('insertPlayer: no row returned');
  return data as PlayerRow;
}

export type PlayerPatch = Partial<{
  score: number;
  rack_count: number;
  forfeit_next: boolean;
  connected: boolean;
  last_seen_at: string;
}>;

export async function updatePlayer(
  gameId: string,
  slot: PlayerSlot,
  patch: PlayerPatch,
): Promise<void> {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from('players').update(patch).eq('game_id', gameId).eq('slot', slot);
  if (error) throw error;
}

export async function deletePlayer(gameId: string, slot: PlayerSlot): Promise<void> {
  const sb = getSupabaseAdminClient();
  const { error } = await sb.from('players').delete().eq('game_id', gameId).eq('slot', slot);
  if (error) throw error;
}
