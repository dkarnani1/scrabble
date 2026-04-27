# Contract — Realtime Channels & Client Read Path

**Feature**: 001-scrabble-multiplayer  **Date**: 2026-04-27

This document specifies the Supabase Realtime surface and the browser read path. The
Server Actions (see `server-actions.md`) are the **write** surface; this document
defines the **push** surface.

---

## Channel types

### Postgres Changes (table-driven)

These are wired by a Supabase publication on the relevant tables. Clients subscribe with
filters scoped to a single game.

| Source             | Events            | Filter                       | Carries              |
|--------------------|-------------------|------------------------------|----------------------|
| `public.games`     | UPDATE            | `id = eq.<gameId>`           | full row (RLS)       |
| `public.moves`     | INSERT, UPDATE    | `game_id = eq.<gameId>`      | full row (RLS)       |
| `public.players`   | UPDATE            | `game_id = eq.<gameId>`      | full row (RLS)       |

RLS on each table strips columns / rows the client cannot see. In particular:

- `game_secrets` is **not** in the publication. No client ever receives bag or rack
  contents.
- `moves` rows are visible to participants of the same game only.

### Broadcast (ephemeral, server-published)

A per-game broadcast channel `game:<gameId>` is used for ephemeral signals that don't
warrant persistence:

| Event                      | Payload                                         | Sender | Purpose |
|---------------------------|--------------------------------------------------|--------|---------|
| `presence:join`            | `{ slot, userId, displayName }`                  | client | "I'm here" presence |
| `presence:leave`           | `{ slot, userId }`                               | client | tab closed / offline detection |
| `challenge:opened`         | `{ moveSeq, openedAt, expiresAt }`               | server | redundancy with games row UPDATE — prompts the opponent to render the 3s indicator without waiting for full row push |
| `challenge:resolved`       | `{ moveSeq, outcome }`                           | server | redundancy; final state also reflected in moves row UPDATE |
| `timer:warning`            | `{ slot, remainingMs }`                          | server | optional pre-expiry nudge for "urgent" UI |

Broadcast events are **never** the source of truth; they are convenience nudges to
reduce perceived latency. The Postgres-table state is authoritative.

---

## Subscription lifecycle (browser)

```ts
// src/realtime/game-channel.ts
const channel = supabase
  .channel(`game:${gameId}`, { config: { presence: { key: userId } } })
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
      onGameUpdate)
  .on('postgres_changes',
      { event: '*', schema: 'public', table: 'moves', filter: `game_id=eq.${gameId}` },
      onMoveUpdate)
  .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'players', filter: `game_id=eq.${gameId}` },
      onPlayerUpdate)
  .on('broadcast', { event: 'challenge:opened' },   onChallengeOpened)
  .on('broadcast', { event: 'challenge:resolved' }, onChallengeResolved)
  .subscribe();
```

On reconnect, the client:

1. Performs a fresh full read of `games`, `moves`, `players` for the game (idempotent;
   reconciles any missed events).
2. Re-subscribes to the channel.
3. Re-emits `presence:join`.

This is the implementation of FR-044 (state restoration on reconnect): the durable rows
are the source of truth, so a fresh read after reconnect reconstructs the full
`GameView`.

---

## Client read path (initial load)

For a given game URL `/games/:gameId/play`:

1. Browser server-renders the page using a server-side Supabase client. RLS enforces
   participant-only access.
2. Server fetches in parallel:
   - `games` row (one)
   - `players` rows (two in v1)
   - `moves` rows (history, ordered by `seq`)
   - Caller's rack via Server Action `getMyRack(gameId)` (small dedicated read that goes
     through the service-role client server-side and returns only the caller's rack;
     never returns another player's rack).
   - `serverNow` from `Date.now()` on the server.
3. Initial `GameView` is rendered.
4. Client subscribes to the realtime channel for incremental updates.

---

## Reconciliation rules

When a Postgres Changes event arrives:

- `games` UPDATE → replace top-level fields. If `phase` changed to `challenge-window`,
  start a 3-second client-side countdown (server is still authoritative; this is
  display only). If `phase` changed to `playing`, recompute remaining turn time from
  `turn_deadline_at`.
- `moves` INSERT → append to history; if the inserting player is the caller, ignore
  (already optimistic-rendered). If the new move is `kind=place`, highlight the placed
  tiles for ≥ 3 seconds (FR-082). Refetch `myRack` (the caller might have lost or gained
  tiles via challenge-induced reversal even when not the placer).
- `moves` UPDATE → typically the `challenge_outcome` field changing; update history row
  in place; surface the outcome banner (FR-065).
- `players` UPDATE → replace the corresponding player slot's score, rack count,
  `forfeit_next`, `connected`, `last_seen_at`.

If the client detects a `seq` gap (e.g., next inserted seq != lastKnownSeq + 1), it
performs a full refetch of `moves` (defensive against missed events).

---

## Backpressure & quotas

- One Realtime channel per active game per browser tab. Tabs out of focus keep the
  subscription open so timer expirations are observable on return.
- The publication is filtered: only the three tables mentioned. No row from
  `game_secrets`, `dictionaries`, or `invites` is ever delivered.
- Heartbeats use Realtime's defaults (≤ 30s). On any disconnection, the client retries
  with exponential backoff capped at 30s, and re-fetches durable state on success.

---

## Security considerations recap

- **Rack secrecy**: `game_secrets` is excluded from the publication AND has zero RLS
  SELECT policies. Even a misconfigured client cannot subscribe to it.
- **Cross-game leakage**: filters on `game_id` are advisory (clients can craft any
  filter); RLS is the enforcement boundary. RLS denies any row from a game the user is
  not a participant in.
- **Broadcast spoofing**: client-sent broadcast events are limited to presence (no
  authoritative state). Server-sent broadcast events are signed by the service-role key
  on send; clients do not act on broadcast events as authoritative — they're cosmetic
  only.
