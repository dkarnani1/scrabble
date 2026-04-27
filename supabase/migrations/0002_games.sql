-- 0002_games.sql
-- Games + per-game secret state. RLS enabled here; participant policies land in 0005_rls.

create table public.games (
  id                    uuid primary key default gen_random_uuid(),
  phase                 text not null check (phase in
                          ('lobby','playing','challenge-window','resolving-challenge',
                           'completed','abandoned')),
  host_user_id          uuid not null references auth.users(id),
  timer_setting         text not null check (timer_setting in ('none','30s','1m','2m')),
  dictionary_id         text not null,
  board_state           jsonb not null,                       -- 15x15 PlacedTile|null
  bag_count             int  not null check (bag_count >= 0),
  active_slot           int  null check (active_slot in (0,1,2,3)),
  turn_started_at       timestamptz null,
  turn_deadline_at      timestamptz null,
  consecutive_scoreless int  not null default 0,
  pending_challenge     jsonb null,
  rng_seed              text not null,
  created_at            timestamptz not null default now(),
  ended_at              timestamptz null,
  result                jsonb null
);

alter table public.games enable row level security;

create index games_host_created_idx on public.games (host_user_id, created_at desc);
create index games_deadline_idx
  on public.games (turn_deadline_at)
  where phase in ('playing','challenge-window');

-- Players: a row per (game, slot). Constraint guards against the same user occupying
-- two slots in the same game.
create table public.players (
  game_id      uuid not null references public.games(id) on delete cascade,
  slot         int  not null check (slot in (0,1,2,3)),
  user_id      uuid not null references auth.users(id),
  is_host      boolean not null default false,
  score        int  not null default 0,
  rack_count   int  not null default 0 check (rack_count between 0 and 7),
  forfeit_next boolean not null default false,
  connected    boolean not null default false,
  last_seen_at timestamptz null,
  joined_at    timestamptz not null default now(),
  primary key (game_id, slot),
  unique (game_id, user_id)
);

alter table public.players enable row level security;

create index players_user_idx on public.players (user_id);

-- Server-only secret state. game_secrets has RLS enabled but ZERO policies, so the
-- publishable-key client cannot read any row. Service role bypasses RLS and is the
-- only path that touches this table.
create table public.game_secrets (
  game_id     uuid primary key references public.games(id) on delete cascade,
  bag         jsonb not null,
  rack_slot_0 jsonb not null,
  rack_slot_1 jsonb not null,
  rack_slot_2 jsonb null,
  rack_slot_3 jsonb null
);

alter table public.game_secrets enable row level security;
-- Intentionally NO policies on game_secrets. Reads/writes happen only via service role.
