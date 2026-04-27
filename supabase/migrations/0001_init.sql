-- 0001_init.sql
-- Extensions, public schema baseline, and the public.profiles projection of auth.users.

create extension if not exists "pgcrypto";

-- Public profile mirror of auth.users. Display name is the only mutable field for v1.
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(display_name) between 2 and 32),
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Anyone authenticated can read display names (needed for opponent labels in the lobby
-- and game UI). Only the owner can write their own row.
create policy profiles_select_authenticated on public.profiles
  for select using (auth.role() = 'authenticated');

create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);

create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
