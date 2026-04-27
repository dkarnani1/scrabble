-- 0003_moves.sql
-- Append-only move log. Update is reserved for attaching challenge_outcome to a
-- previously written 'place' move.

create table public.moves (
  game_id           uuid not null references public.games(id) on delete restrict,
  seq               int  not null check (seq >= 1),
  player_slot       int  not null check (player_slot in (0,1,2,3)),
  kind              text not null check (kind in ('place','pass','exchange')),
  payload           jsonb not null,
  score             int  not null default 0,
  words             text[] not null default '{}',
  is_bingo          boolean not null default false,
  pass_reason       text null check (pass_reason in (null,'voluntary','forced-timeout')),
  challenge_outcome jsonb not null default '{"kind":"unchallenged"}'::jsonb,
  created_at        timestamptz not null default now(),
  primary key (game_id, seq)
);

alter table public.moves enable row level security;
