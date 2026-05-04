# Runbook — 001-scrabble-multiplayer

Operator-facing notes for keeping the game online and recovering from incidents.

---

## Cron behavior

- **Route**: `app/api/cron/timer-tick/route.ts` (`*/1 * * * *`, Vercel Cron).
- **Auth**: `Authorization: Bearer <CRON_SECRET>`. Without the env var the route
  returns 500; with the wrong secret it returns 401. Vercel signs the request.
- **Sweeps**:
  1. `sweepDueDeadlines(now)` — every game with `phase = 'playing'` and
     `turn_deadline_at < now()` gets a forced-pass move via the engine
     (`reason: 'forced-timeout'`). Idempotent.
  2. `sweepDueChallengeWindows(now)` — every game with `phase = 'challenge-window'`
     whose latest place move's `created_at + 3s` has elapsed transitions back to
     `phase = 'playing'` and resets the turn deadline.
- **Lazy fallback**: every Server Action observes the same two resolvers as
  preflight, so the cron is a guarantee of forward progress when no client is
  acting — not the only enforcement path. Re-running the sweep is always safe.

## Abandoned-game policy

- A `games` row with no completion and no activity for 7+ days (max
  `moves.created_at`) is a candidate for abandonment.
- v1 does NOT auto-transition these to `phase = 'abandoned'`; this is a manual
  cleanup. Hosts can call `leaveLobby` while still in lobby; once a game is
  in `playing`, it stays put until completion or operator intervention.
- Future work: extend the cron sweep with an abandonment scan that flips eligible
  rows. Keep `game_secrets` joined for cleanup so deletes cascade.

## Dictionary swap procedure

The default dictionary lives at `src/dictionary/default-list.txt` (ENABLE-derived,
public domain). Swapping it for an alternative is a 4-step process:

1. **Add the new file** under a stable id (e.g. `enable-2026-04` or
   `sowpods-2026`). Any path is fine — production uses
   `DICTIONARY_PATH_<ID>` env vars (e.g. `DICTIONARY_PATH_SOWPODS_2026`) to
   point at it.
2. **Insert a row** into `public.dictionaries` with the same `id` and a friendly
   `display_name`. The `dictionaries` table is the source for the New Game
   form's selector.
3. **Verify hash drift**: `npm run dictionary:verify` recomputes the SHA-256
   of the bundled list and compares it to the lockfile. CI fails if they
   diverge unexpectedly. Regenerate via `npm run dictionary:prepare`.
4. **Test**: kick off a game with the new id and exercise both the standard
   move loop and the challenge resolver to confirm word lookups behave.

In-flight games stay pinned to the dictionary id chosen at game creation —
swapping the default does not retroactively change validation for ongoing
matches.

## Quickstart sanity check (SC-008)

`npm run typecheck && npm run test:unit` should pass on a clean clone. With
Supabase test creds wired up, `npm run test:integration` and `npm run test:e2e`
are the next two gates. The full quickstart from clone-to-playable-lobby is
documented in `specs/001-scrabble-multiplayer/quickstart.md`; record observed
times below.

| Run    | Date   | Time-to-lobby | Notes                                              |
| ------ | ------ | ------------- | -------------------------------------------------- |
| t.b.d. | t.b.d. | t.b.d.        | (Run on a fresh clone with .env.local pre-staged.) |

## Multi-device session takeover (T616)

v1 implements best-effort handoff: `app/auth/callback/route.ts` flips
`players.connected = false` for the user_id on every successful sign-in. The
older device sees the change via realtime and the PresenceIndicator shows
"disconnected" until the older client either heartbeats again (re-claiming
the slot) or the user closes that tab. Strict single-session enforcement is
deferred to a future iteration.
