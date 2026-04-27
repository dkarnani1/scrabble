# Contract — Server Actions

**Feature**: 001-scrabble-multiplayer  **Date**: 2026-04-27

This document is the source of truth for the server-side mutation surface of the
application. Every public action is a Next.js Server Action exported from
`app/actions/*.ts`. Each action:

- Authenticates the caller via the cookies-based Supabase server client.
- Validates input with a Zod schema.
- Authorizes the caller against the target game (RLS + explicit `auth.uid()` checks in
  the action body).
- Executes a single transaction or a careful read-validate-write sequence with
  optimistic concurrency.
- Returns either a domain projection (the caller's view of the new state) or an `ActionError`.

The shapes below are TypeScript-style for readability and map 1-to-1 to Zod schemas in
the code.

---

## Common types

```ts
type ActionError =
  | { code: 'unauthenticated' }
  | { code: 'forbidden';      reason: string }
  | { code: 'not-found';      entity: 'game' | 'invite' }
  | { code: 'invalid-input';  issues: { path: string; message: string }[] }
  | { code: 'rule-violation'; reason:
      | 'first-move-must-cover-center'
      | 'tiles-not-in-single-line'
      | 'tiles-not-contiguous'
      | 'not-connected-to-existing-tiles'
      | 'no-tiles-placed'
      | 'tile-not-on-rack'
      | 'blank-not-assigned'
      | 'square-already-occupied'
      | 'exchange-bag-too-small'
      | 'word-shorter-than-two'
    }
  | { code: 'state-conflict'; reason:
      | 'not-your-turn'
      | 'wrong-game-phase'
      | 'challenge-window-closed'
      | 'challenge-already-raised'
      | 'turn-already-resolved'
      | 'game-completed'
    }
  | { code: 'rate-limited' };

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError };
```

`GameView` is the caller's projection of game state:

```ts
type GameView = {
  id: string;
  phase: GamePhase;
  timerSetting: TimerSetting;
  dictionaryId: string;
  activeSlot: 0 | 1 | 2 | 3 | null;
  turnStartedAt: string | null;
  turnDeadlineAt: string | null;
  serverNow: string;                            // for clock-skew correction
  bagRemaining: number;
  consecutiveScoreless: number;
  pendingChallenge: PendingChallenge | null;
  board: Board;                                  // 15×15 cells
  history: CommittedMove[];
  players: Array<{
    slot: 0 | 1 | 2 | 3;
    userId: string;
    displayName: string;
    score: number;
    rackCount: number;
    isHost: boolean;
    forfeitNext: boolean;
    connected: boolean;
  }>;
  myRack: Rack | null;                           // present only for the calling user
  result: GameResult | null;
};
```

---

## `app/actions/games.ts`

### `createGame(input) → ActionResult<{ gameId: string; inviteCode: string }>`

Creates a new game in `lobby` phase with the calling user as host.

**Input**

```ts
{
  timerSetting: 'none' | '30s' | '1m' | '2m';
  dictionaryId: string;     // must exist in public.dictionaries
}
```

**Authorization**: any authenticated user.

**Side effects**

- Insert into `games`, `players (slot 0, host)`, `game_secrets` (server-shuffled bag,
  empty rack — racks are dealt at startGame).
- Generate a fresh `invites` row with a random URL-safe code.
- Subscribe path: `game:<gameId>` Realtime channel becomes valid.

**Errors**: `unauthenticated`, `invalid-input`, `not-found{dictionary}`.

---

### `joinGame(input) → ActionResult<GameView>`

Join an existing game by invite code. Allocates the next free slot (slot 1 in v1).

**Input**

```ts
{ inviteCode: string }
```

**Authorization**: authenticated; not already a participant; invite valid; game in `lobby`.

**Side effects**

- Mark `invites.consumed_at`, `consumed_by`.
- Insert into `players (slot 1)`.

**Errors**: `unauthenticated`, `not-found{invite}`, `state-conflict{wrong-game-phase}`,
`forbidden{already-joined-or-full}`.

---

### `startGame(input) → ActionResult<GameView>`

Host starts the match. Deals 7 tiles to each seated player from the bag, randomly
chooses the first turn slot, sets `turn_started_at` and `turn_deadline_at`, transitions
phase to `playing`.

**Input**

```ts
{ gameId: string }
```

**Authorization**: caller must be host (`players.is_host = true`); both slots must be
filled; phase must be `lobby`.

**Side effects**

- `games.phase = 'playing'`, `active_slot`, `turn_started_at`, `turn_deadline_at` set.
- `game_secrets.rack_slot_0`, `rack_slot_1` populated.
- `players.rack_count = 7` for each slot.
- Realtime push: `games` row updates fire; clients receive the new state.

**Errors**: `unauthenticated`, `forbidden{not-host}`, `state-conflict{wrong-game-phase}`,
`forbidden{lobby-not-full}`.

---

### `leaveLobby(input) → ActionResult<{ ok: true }>`

While in `lobby`, a participant may leave. If host leaves, the game transitions to
`abandoned`.

**Input**

```ts
{ gameId: string }
```

---

### `rematch(input) → ActionResult<{ gameId: string; inviteCode: string }>`

After a completed game, the host may create a fresh game with the same settings. The
opponent receives a fresh single-use invite. Score history is not carried over.

**Input**

```ts
{ priorGameId: string }
```

**Authorization**: caller must be host of `priorGameId`; that game must be in `completed`
phase.

---

### `listMyGames() → ActionResult<{ active: GameView[]; recent: GameSummary[] }>`

Returns the calling user's in-progress games and their last N completed games.

```ts
type GameSummary = {
  id: string;
  endedAt: string;
  result: GameResult;
  opponents: Array<{ userId: string; displayName: string; score: number }>;
};
```

---

## `app/actions/moves.ts`

### `placeMove(input) → ActionResult<GameView>`

Commit a tile placement. Single Server Action transaction.

**Input**

```ts
{
  gameId: string;
  tiles: Array<{
    coord: { r: number; c: number };
    tile: Tile;                          // letter or blank with assigned letter
  }>;
}
```

**Validation order** (each maps to an `ActionError`):

1. Game found and caller is a participant. (`not-found` / `forbidden`)
2. Phase is `playing` and `active_slot` matches caller. (`state-conflict`)
3. Turn deadline not yet expired (deadline check handled before per-action work — see
   "Timer enforcement" below).
4. Rules engine `applyMove(state, action, dictionary)` returns ok with score breakdown.
   (`rule-violation`)
5. Optimistic-concurrency UPDATE on `games` succeeds (no concurrent commit between read
   and write). (`state-conflict`)
6. Insert `moves (seq = N+1, kind='place', payload, score, words, is_bingo)` and update
   `game_secrets.rack_slot_X` (consume placed tiles + draw refills) and update
   `games.board_state`, `games.bag_count`, `games.consecutive_scoreless = 0`,
   `games.phase = 'challenge-window'`, `games.turn_deadline_at = NULL` (challenge window
   timer is independent).
7. Realtime push of the updated `games` row + new `moves` row triggers opponent
   re-render.

**Side effect — challenge window**: the move enters a 3-second challenge window. The
window deadline is `created_at + 3s`. Server-side enforcement of the window happens
either when the opponent calls `raiseChallenge` or when the timer-tick cron transitions
the game out of `challenge-window`.

---

### `passTurn(input) → ActionResult<GameView>`

Voluntary pass. Records a `kind='pass'` move (reason='voluntary'), increments
`consecutive_scoreless`, advances `active_slot`, resets the turn deadline. No challenge
window opens.

**Input**

```ts
{ gameId: string }
```

**Side effect**: if `consecutive_scoreless` reaches 6, transition to `completed` and
populate `result`.

---

### `exchangeTiles(input) → ActionResult<GameView>`

Exchange tiles. Records a `kind='exchange'` move with `count = N`. Increments
`consecutive_scoreless`. No challenge window opens. Bag is reshuffled deterministically
using the current `rng_seed` advanced from the prior state.

**Input**

```ts
{ gameId: string; tileIndices: number[] }    // indices into caller's rack
```

**Errors**: `rule-violation{exchange-bag-too-small}` if `bag_count < 7` at action time.

---

## `app/actions/challenges.ts`

### `raiseChallenge(input) → ActionResult<GameView>`

Opponent of the most recent `place` move asks the server to validate the played words.

**Input**

```ts
{ gameId: string; moveSeq: number }
```

**Validation**:

1. Game phase is `challenge-window` and `moves.seq = moveSeq` is the latest.
2. Caller is the opponent of the player who placed the move.
3. Challenge window has not expired (`now() < move.created_at + 3s`).
4. No prior pending challenge.

**Side effect**:

- Set `phase = 'resolving-challenge'`, write `pending_challenge` to `games`.
- Validate every word in `moves.words` against the configured dictionary (in-process Set).
- If any word missing:
  - Roll back the move's effects: subtract `score`, revert `board_state`, return placed
    tiles to placing player's rack (undo the refill draws via `rng_seed` reversal — see
    Reversibility below).
  - Update the move's `challenge_outcome = { kind: 'challenged-invalid', invalidWords }`
    and `kind = 'pass'` SEMANTICS: keep the row but mark it; the placing player's score
    does not increase, the placing player's turn ended (no rewind of turn ownership —
    play proceeds to the opponent). `consecutive_scoreless` is incremented.
- Else (valid):
  - Move stands. Set `challenge_outcome = { kind: 'challenged-valid', challengerSlot }`.
  - Mark challenger's `forfeit_next = true`.
- Transition `phase = 'playing'`, advance `active_slot` (skipping the forfeited turn if
  applicable), reset turn deadline.

**Reversibility note**: because rack refill draws happen *before* the challenge window
opens (FR-022 timing simplifies normal play), reversing a challenged-invalid move means
returning the played tiles to the rack AND returning the drawn refill tiles to the bag.
The rules engine's `applyMove` returns enough information (the exact rack mutation and
the bag-draw indices) to make this reversal deterministic.

---

## Timer enforcement

Two timer surfaces:

- **Turn timer** — when `phase = 'playing'`, expires at `turn_deadline_at`.
- **Challenge window timer** — when `phase = 'challenge-window'`, expires at
  `last_move.created_at + 3s`.

Enforcement strategy (per R3):

1. **Lazy** — every Server Action that observes the game first calls
   `resolveDueDeadlines(gameId)`, which:
   - If turn deadline expired and phase is `playing`: insert a forced-pass move,
     advance `active_slot`, increment `consecutive_scoreless`.
   - If challenge window expired and phase is `challenge-window`: transition to
     `playing`, advance `active_slot` (move stands), reset turn deadline.
2. **Cron sweep** — `app/api/cron/timer-tick/route.ts` runs every 60s, calls
   `resolveDueDeadlines` for every game where `turn_deadline_at < now()` (or where
   challenge window has expired). This guarantees forward progress when neither client is
   acting.

Cron auth: protected by `CRON_SECRET` (server-only env var) checked against the
`Authorization` header per Vercel Cron's signed-request convention.

---

## Profile

### `app/actions/profile.ts` — `setDisplayName(input) → ActionResult<{ displayName: string }>`

```ts
{ displayName: string }    // 2..32 chars, letters/digits/space/_-.
```

Caller can only update their own row.

---

## Read path

The primary read path is **not** a Server Action — clients read from Supabase tables
directly via the publishable-key browser client, with RLS enforcing scope. The
`GameView` projection is built browser-side from the rows the user is allowed to read.
This minimizes round-trips and lets Realtime updates flow without an action call.

The per-call `serverNow` field, however, requires a server response — included in any
action result and refreshed on `window.focus` via a tiny `app/api/server-time/route.ts`
GET endpoint that returns `{ now: ISO }`.

---

## Concurrency & idempotency

- All actions that mutate `games`/`moves` use the optimistic UPDATE described in
  data-model.md.
- `placeMove`, `passTurn`, `exchangeTiles`, and `raiseChallenge` are made idempotent at
  the network layer by including a client-generated `requestId`; the server records the
  `(gameId, requestId)` pair in `moves.payload.requestId` and rejects retries with the
  prior result. (Not strictly required for correctness but useful for flaky-network
  retries.)

---

## Surface visibility

Every action above is the only public mutation surface. Direct `INSERT`/`UPDATE`/`DELETE`
from the browser is denied by RLS for all relevant tables. Reads are open to participants
only. Server Actions execute under the cookies-bound auth context (RLS applies); a
service-role client is used only for `game_secrets` operations (where no policy permits
public access by design) — limited to `src/persistence/supabase-admin.ts` and called
exclusively from the orchestration layer.
