-- 0008_realtime_replica_identity.sql
-- Supabase Realtime needs REPLICA IDENTITY FULL on RLS-protected tables so that
-- the WAL emits the full old row alongside the new one. Without this, UPDATE
-- events are silently dropped for clients whose RLS check needs old-row columns
-- (e.g. game_id on players UPDATEs). INSERTs technically work without it, but
-- making the publication uniform avoids subtle "sometimes fires" behavior.

alter table public.games replica identity full;
alter table public.players replica identity full;
alter table public.moves replica identity full;
