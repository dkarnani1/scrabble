// Repository for the append-only `moves` log. Inserts are sequenced 1-based and the
// repo is optimistic-concurrency-aware: callers pass the expected `nextSeq`, and the
// insert relies on the `(game_id, seq)` primary key to fail if another writer has
// already taken that seq.

import { getSupabaseAdminClient } from './supabase-admin';
import type { MoveRow } from './dto';
import type { CommittedMove, PlayerSlot } from '@rules/types';

export type InsertMoveInput = {
  gameId: string;
  expectedNextSeq: number;
  playerSlot: PlayerSlot;
  move: CommittedMove['move'];
};

export type InsertMoveResult =
  | { ok: true; row: MoveRow }
  | { ok: false; reason: 'seq-conflict' | 'unknown'; cause?: unknown };

export async function insertMove(input: InsertMoveInput): Promise<InsertMoveResult> {
  const sb = getSupabaseAdminClient();

  const payload = buildPayload(input.move);
  const passReason = input.move.kind === 'pass' ? input.move.reason : null;
  const score = input.move.kind === 'place' ? input.move.score : 0;
  const words = input.move.kind === 'place' ? input.move.words : [];
  const isBingo = input.move.kind === 'place' ? input.move.isBingo : false;

  const { data, error } = await sb
    .from('moves')
    .insert({
      game_id: input.gameId,
      seq: input.expectedNextSeq,
      player_slot: input.playerSlot,
      kind: input.move.kind,
      payload,
      score,
      words,
      is_bingo: isBingo,
      pass_reason: passReason,
      challenge_outcome: { kind: 'unchallenged' },
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') return { ok: false, reason: 'seq-conflict', cause: error };
    return { ok: false, reason: 'unknown', cause: error };
  }
  return { ok: true, row: data as MoveRow };
}

export async function listMoves(gameId: string): Promise<MoveRow[]> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('moves')
    .select('*')
    .eq('game_id', gameId)
    .order('seq', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MoveRow[];
}

export async function getNextSeq(gameId: string): Promise<number> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('moves')
    .select('seq')
    .eq('game_id', gameId)
    .order('seq', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const max = (data?.seq as number | undefined) ?? 0;
  return max + 1;
}

export async function updateChallengeOutcome(
  gameId: string,
  seq: number,
  outcome: CommittedMove['challenge'],
): Promise<void> {
  const sb = getSupabaseAdminClient();
  const { error } = await sb
    .from('moves')
    .update({ challenge_outcome: outcome })
    .eq('game_id', gameId)
    .eq('seq', seq);
  if (error) throw error;
}

function buildPayload(move: CommittedMove['move']): unknown {
  if (move.kind === 'place') return { tiles: move.tiles };
  if (move.kind === 'pass') return { reason: move.reason };
  return { count: move.count };
}
