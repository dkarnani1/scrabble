-- seed.sql
-- Local-development seed only. NEVER load this against a production database.
-- Contains no real secrets; uses placeholder UUIDs for two demo users that the
-- developer is expected to create via Supabase Auth UI before running this file.
--
-- Populate the two UUIDs below with real auth.users.id values from your local Supabase
-- project, then run:  psql "$SUPABASE_DATABASE_URL" -f supabase/seed.sql
--
-- This file is committed safe — the UUIDs are the all-zero sentinel pattern and will
-- harmlessly fail the foreign key check until you swap them for real ones.

-- \set demo_user_a '00000000-0000-0000-0000-000000000001'
-- \set demo_user_b '00000000-0000-0000-0000-000000000002'

-- insert into public.profiles (id, display_name) values
--   (:'demo_user_a', 'Player A'),
--   (:'demo_user_b', 'Player B')
-- on conflict (id) do nothing;
