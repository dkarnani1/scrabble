// Repository for invite codes. Codes are short (10 chars), URL-safe, and high-entropy
// (>= 50 bits). Single-use: `consumed_at` and `consumed_by` are set on first successful
// join.

import { getSupabaseAdminClient } from './supabase-admin';
import { randomBytes } from 'node:crypto';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Base32-ish; no I/O/0/1.
const CODE_LENGTH = 10;

export type InviteRow = {
  code: string;
  game_id: string;
  created_by: string;
  created_at: string;
  consumed_at: string | null;
  consumed_by: string | null;
};

export function generateInviteCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

export async function insertInvite(gameId: string, createdBy: string): Promise<InviteRow> {
  const sb = getSupabaseAdminClient();
  // Retry on the rare collision (effectively never for a 50-bit code).
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await sb
      .from('invites')
      .insert({ code, game_id: gameId, created_by: createdBy })
      .select('*')
      .single();
    if (!error && data) return data as InviteRow;
    if (error && error.code !== '23505') throw error;
  }
  throw new Error('insertInvite: failed after retries');
}

export async function findInviteByCode(code: string): Promise<InviteRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('invites').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return (data as InviteRow | null) ?? null;
}

/** Atomically mark the invite consumed. Fails if already consumed by someone. */
export async function consumeInvite(code: string, consumedBy: string): Promise<InviteRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('invites')
    .update({ consumed_at: new Date().toISOString(), consumed_by: consumedBy })
    .eq('code', code)
    .is('consumed_at', null)
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return (data as InviteRow | null) ?? null;
}
