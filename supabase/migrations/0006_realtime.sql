-- 0006_realtime.sql
-- Realtime publication. game_secrets, invites, dictionaries are deliberately excluded:
-- the bag and racks must never be pushed to a client.

-- Drop the default publication if it exists to recreate with our explicit table list.
drop publication if exists supabase_realtime;

create publication supabase_realtime
  for table public.games, public.moves, public.players;
