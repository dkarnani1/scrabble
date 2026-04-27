-- 0004_invites.sql
-- Single-use invites that grant one additional player slot to a game in lobby phase.

create table public.invites (
  code        text primary key check (length(code) between 6 and 32),
  game_id     uuid not null references public.games(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  consumed_at timestamptz null,
  consumed_by uuid null references auth.users(id)
);

alter table public.invites enable row level security;

create index invites_game_idx on public.invites (game_id);
