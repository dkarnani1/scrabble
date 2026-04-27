# Phase 1 — Data Model

**Feature**: 001-scrabble-multiplayer  **Date**: 2026-04-27

This document defines the persistent and in-memory data model for the multiplayer
Scrabble-style game. It is the source of truth for the SQL migrations under
`supabase/migrations/` and for the domain types under `src/rules/types.ts`.

Two layers exist:

- **Domain (in-memory) types** — what the rules engine and orchestration manipulate.
  Pure, framework-free.
- **Database tables** — what Supabase Postgres persists. RLS-protected; secrets isolated.

The mapping between them lives in `src/persistence/dto.ts`.

---

## Conventions

- All timestamps are `timestamptz` and stored in UTC; `now()` is server time.
- All primary keys are `uuid` (`gen_random_uuid()` default).
- All `*_at` audit columns default to `now()` on insert.
- Foreign keys use `on delete cascade` only where the child cannot exist without the
  parent (e.g. `players` requires `games`); references to immutable history (e.g. `moves`)
  use `on delete restrict`.
- All row-bearing tables have RLS enabled from the migration that creates them.
- Strings constrained by domain are stored as `text` with `check` constraints rather than
  Postgres ENUMs (easier evolution, no migration locks).

---

## Domain types (in `src/rules/types.ts`)

```ts
// Tile and bag

export type Letter =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
  | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
  | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

export type Tile =
  | { kind: 'letter'; letter: Letter; value: number }                   // physical letter tile
  | { kind: 'blank';  assigned: Letter | null; value: 0 };              // blank tile

export type Rack = readonly Tile[];     // ≤ 7

// Board

export type Coord = { r: number; c: number };                          // 0-indexed, 15×15

export type PremiumKind = 'none' | 'DL' | 'TL' | 'DW' | 'TW' | 'CENTER';

export type PlacedTile = {
  tile: Tile;                                                          // letter or blank-with-assignment
  placedInMoveSeq: number;                                             // which committed move placed it
};

export type Board = {
  cells: ReadonlyArray<ReadonlyArray<PlacedTile | null>>;              // 15×15
  premiums: ReadonlyArray<ReadonlyArray<PremiumKind>>;                 // 15×15, immutable
};

// Moves

export type PlacementCell = { coord: Coord; tile: Tile };              // tile placed on this turn

export type Move =
  | { kind: 'place';    seq: number; playerSlot: 0 | 1 | 2 | 3; tiles: PlacementCell[]; score: number; words: string[]; isBingo: boolean; createdAt: string }
  | { kind: 'pass';     seq: number; playerSlot: 0 | 1 | 2 | 3; createdAt: string; reason: 'voluntary' | 'forced-timeout' }
  | { kind: 'exchange'; seq: number; playerSlot: 0 | 1 | 2 | 3; count: number; createdAt: string };

export type ChallengeOutcome =
  | { kind: 'unchallenged' }
  | { kind: 'challenged-invalid'; challengerSlot: 0 | 1 | 2 | 3; invalidWords: string[] }
  | { kind: 'challenged-valid';   challengerSlot: 0 | 1 | 2 | 3 };

export type CommittedMove = { move: Move; challenge: ChallengeOutcome };

// Game

export type GamePhase =
  | 'lobby'             // waiting for players to join / host to start
  | 'playing'           // a player's turn is active
  | 'challenge-window'  // 3-second window after a 'place' move
  | 'resolving-challenge' // dictionary lookup in flight
  | 'completed'
  | 'abandoned';

export type TimerSetting = 'none' | '30s' | '1m' | '2m';

export type GameState = {
  id: string;
  phase: GamePhase;
  players: ReadonlyArray<PlayerState>;                                  // length 2 in v1
  activeSlot: 0 | 1 | 2 | 3 | null;                                     // null when lobby/completed
  turnStartedAt: string | null;                                         // server time, ISO
  turnDeadlineAt: string | null;                                        // computed at turn start
  timerSetting: TimerSetting;
  bagRemaining: number;                                                 // count only — actual tiles server-only
  board: Board;
  history: ReadonlyArray<CommittedMove>;                                // append-only, ordered by seq
  consecutiveScorelessTurns: number;                                    // for 6-pass termination
  pendingChallenge: PendingChallenge | null;
  dictionaryId: string;
  rngSeed: string;                                                      // exposed for testing only
  createdAt: string;
  endedAt: string | null;
  result: GameResult | null;
};

export type PlayerState = {
  slot: 0 | 1 | 2 | 3;
  userId: string;
  displayName: string;
  score: number;
  rackSize: number;          // visible to opponent — count only
  rack?: Rack;               // present only on the owning player's view
  isHost: boolean;
  hasForfeitedNextTurn: boolean;  // set when this player lost a challenge
  connected: boolean;
  lastSeenAt: string | null;
};

export type PendingChallenge = {
  moveSeq: number;
  challengerSlot: 0 | 1 | 2 | 3;
  raisedAt: string;
};

export type GameResult = {
  winnerSlot: 0 | 1 | 2 | 3 | 'tie';
  finalScores: Record<0 | 1, number>;
  endedReason: 'out-of-tiles' | 'six-pass-termination' | 'abandoned';
};
```

Notes:

- `PlayerState.rack` is present **only** when the consumer of the type is the owning
  player's view. Server projections to opponent clients strip it; persistence stores it
  in a server-only column (see DB schema below). This is the in-memory enforcement of
  FR-042.
- `bagRemaining` is a count, never the contents.
- `rngSeed` is exposed in domain only for deterministic test playback. Production never
  surfaces it through any contract.

---

## Database schema (Supabase Postgres)

### `users`

Supabase Auth provides `auth.users` automatically. We add a public projection:

```sql
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null check (length(display_name) between 2 and 32),
  created_at    timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- Anyone authenticated can read display names; only the owner can update.
create policy profiles_select_authenticated on public.profiles
  for select using (auth.role() = 'authenticated');
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy profiles_insert_self on public.profiles
  for insert with check (auth.uid() = id);
```

### `games`

```sql
create table public.games (
  id                  uuid primary key default gen_random_uuid(),
  phase               text not null check (phase in
                        ('lobby','playing','challenge-window','resolving-challenge',
                         'completed','abandoned')),
  host_user_id        uuid not null references auth.users(id),
  timer_setting       text not null check (timer_setting in ('none','30s','1m','2m')),
  dictionary_id       text not null,
  board_state         jsonb not null,                -- 15×15 cells (PlacedTile | null)
  bag_count           int  not null check (bag_count >= 0),
  active_slot         int  null check (active_slot in (0,1,2,3)),
  turn_started_at     timestamptz null,
  turn_deadline_at    timestamptz null,
  consecutive_scoreless int not null default 0,
  pending_challenge   jsonb null,                    -- PendingChallenge | null
  rng_seed            text not null,                 -- server-only via RLS, see below
  created_at          timestamptz not null default now(),
  ended_at            timestamptz null,
  result              jsonb null                      -- GameResult | null
);
alter table public.games enable row level security;
```

### `game_secrets` (server-role only)

Secret state that no client ever reads:

```sql
create table public.game_secrets (
  game_id     uuid primary key references public.games(id) on delete cascade,
  bag         jsonb not null,                          -- Tile[] remaining in bag
  -- per-slot rack
  rack_slot_0 jsonb not null,                          -- Tile[]
  rack_slot_1 jsonb not null,                          -- Tile[]
  rack_slot_2 jsonb null,
  rack_slot_3 jsonb null
);
alter table public.game_secrets enable row level security;
-- No SELECT policy. Service role bypasses RLS; publishable-key clients cannot read this
-- table at all. Even a successful auth session has no policy granting access here.
```

This is the bright-line enforcement for FR-042 (no client ever sees the bag or another
player's rack). The browser client uses the publishable key and is therefore subject to
RLS on every table including this one — and there are zero policies, so all reads are
denied.

### `players`

```sql
create table public.players (
  game_id        uuid not null references public.games(id) on delete cascade,
  slot           int  not null check (slot in (0,1,2,3)),
  user_id        uuid not null references auth.users(id),
  is_host        boolean not null default false,
  score          int  not null default 0,
  rack_count     int  not null default 0 check (rack_count between 0 and 7),
  forfeit_next   boolean not null default false,
  connected      boolean not null default false,
  last_seen_at   timestamptz null,
  joined_at      timestamptz not null default now(),
  primary key (game_id, slot),
  unique (game_id, user_id)
);
alter table public.players enable row level security;

-- A row in players is readable by any participant of the same game.
create policy players_select_participant on public.players
  for select using (
    exists (
      select 1 from public.players p
      where p.game_id = players.game_id and p.user_id = auth.uid()
    )
  );

-- Only system writes via service role; clients cannot insert/update/delete.
```

### `moves`

```sql
create table public.moves (
  game_id           uuid not null references public.games(id) on delete restrict,
  seq               int  not null,                              -- 1-based, contiguous
  player_slot       int  not null check (player_slot in (0,1,2,3)),
  kind              text not null check (kind in ('place','pass','exchange')),
  payload           jsonb not null,                              -- PlacementCell[] / count / etc.
  score             int  not null default 0,
  words             text[] not null default '{}',
  is_bingo          boolean not null default false,
  pass_reason       text null check (pass_reason in (null, 'voluntary','forced-timeout')),
  challenge_outcome jsonb not null default '{"kind":"unchallenged"}'::jsonb,
  created_at        timestamptz not null default now(),
  primary key (game_id, seq)
);
alter table public.moves enable row level security;

create policy moves_select_participant on public.moves
  for select using (
    exists (
      select 1 from public.players p
      where p.game_id = moves.game_id and p.user_id = auth.uid()
    )
  );
-- Inserts/updates only via service role through Server Actions.
```

`moves` is append-only by convention — there is no DELETE policy; UPDATE is reserved for
attaching `challenge_outcome` to a previously written `place` move when the challenge
window resolves.

### `invites`

```sql
create table public.invites (
  code        text primary key,                                -- short, URL-safe (e.g. base32, 8 chars)
  game_id     uuid not null references public.games(id) on delete cascade,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  consumed_at timestamptz null,
  consumed_by uuid null references auth.users(id)
);
alter table public.invites enable row level security;

-- Anyone authenticated can SELECT by code (so they can resolve an invite link),
-- but only see whether it's still valid:
create policy invites_select_authenticated on public.invites
  for select using (auth.role() = 'authenticated');
```

The `consumed_at` column makes invites single-use to the second-player slot (FR-012). The
short `code` is also the URL token — generated by the server with sufficient entropy
(≥ 40 bits) to make guessing impractical.

### `dictionaries`

```sql
create table public.dictionaries (
  id           text primary key,                       -- e.g. 'enable-2026-04'
  display_name text not null,
  source_url   text null,
  added_at     timestamptz not null default now()
);
-- Read-only configuration table; populated via migration seed. RLS enables SELECT for
-- authenticated users.
alter table public.dictionaries enable row level security;
create policy dictionaries_select_authenticated on public.dictionaries
  for select using (auth.role() = 'authenticated');
```

The dictionary file itself lives on the server — `src/dictionary/default-list.txt` is
checked in for the default; alternative dictionaries live as files referenced by env var
or as Supabase Storage objects, not as Postgres rows.

---

## Realtime configuration

Realtime is enabled on `public.games` and `public.moves` (Postgres Changes). Clients
subscribe to changes scoped by `game_id`. The `game_secrets`, `invites`, and
`dictionaries` tables are NOT in the realtime publication.

Per-game Broadcast channel (`game:<gameId>`) is used for ephemeral signals only —
presence ("opponent is online"), challenge-window-opened, challenge-resolved — none of
which carry secret state.

---

## State transitions

Phase machine for `games.phase`:

```
lobby ──(host calls startGame, both seated)──▶ playing
playing ──(active player commits 'place')──▶ challenge-window
challenge-window ──(3s elapses, no challenge)──▶ playing  (next turn)
challenge-window ──(opponent raises challenge)──▶ resolving-challenge
resolving-challenge ──(challenge succeeds)──▶ playing  (challenged player loses turn)
resolving-challenge ──(challenge fails)──▶ playing      (challenger forfeits next)
playing ──(active player passes / exchanges)──▶ playing  (no challenge window)
playing ──(termination condition met)──▶ completed
* ──(game retention exceeded, no participants returned)──▶ abandoned
```

Termination conditions (transition `playing` → `completed`):

1. Bag empty AND active player's rack becomes empty after a `place` move (out-of-tiles).
2. `consecutive_scoreless` reaches 6 (six-pass termination).

In both cases `result` and `ended_at` are populated; `active_slot` and timers are cleared.

---

## Validation rules (enforced server-side)

Move-level (per `applyMove`):

- `place.tiles` non-empty and a subset of the placing player's rack.
- All placement coords inside the 15×15 board and unoccupied.
- Tiles form a single line (all same row OR all same column).
- Resulting played-tile run is contiguous through any pre-existing tiles.
- First move of game covers the center square (7,7).
- After first move, played tiles connect to at least one pre-existing tile.
- Every blank tile has an assigned letter.
- Every newly formed word ≥ 2 letters.

Exchange-level:

- `exchange.count` between 1 and 7 inclusive and a subset of rack.
- `bag_count >= 7` at start of action.

Concurrency:

- Each Server Action reads `games.phase`, `active_slot`, and the current `seq` and writes
  optimistically: `update games set ... where id = $1 and active_slot = $2 and phase =
  $3` — non-zero rows means the action is still valid.
- New `moves` row is inserted with `seq = max(seq) + 1` in the same transaction.

These rules are validated in `src/rules/*` and re-validated by the server at write time.

---

## Indexes

- `players (user_id)` — for "your games" listings.
- `games (host_user_id, created_at desc)` — same.
- `moves (game_id, seq)` — naturally covered by primary key.
- `invites (game_id)` — for invite housekeeping.
- `games (turn_deadline_at) where phase = 'playing'` — for the cron sweep.

---

## Retention & abandonment

`games` rows beyond 7 days of `last_active_at` (computed from `moves.created_at` max) and
not yet completed are eligible for `abandoned` transition. The cron route
`app/api/cron/timer-tick/route.ts` performs both timer enforcement and abandoned-game
sweep in one pass.

`game_secrets` rows are deleted with their parent `games` row when retention finally
expires (operator policy; not in v1 scope).
