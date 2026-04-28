// Repository for the public.profiles projection of auth.users. Reads use the service
// role for action-internal lookups; writes only ever touch the caller's own row, which
// matches the RLS policy on the table.

import { getSupabaseAdminClient } from './supabase-admin';
import type { ProfileRow } from './dto';

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw error;
  return (data as ProfileRow | null) ?? null;
}

export async function getProfilesByIds(userIds: string[]): Promise<ProfileRow[]> {
  if (userIds.length === 0) return [];
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb.from('profiles').select('*').in('id', userIds);
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

export async function upsertDisplayName(userId: string, displayName: string): Promise<ProfileRow> {
  const sb = getSupabaseAdminClient();
  const { data, error } = await sb
    .from('profiles')
    .upsert({ id: userId, display_name: displayName }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error || !data) throw error ?? new Error('upsertDisplayName: no row returned');
  return data as ProfileRow;
}
