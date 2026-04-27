# Phase 0 Research — Online Multiplayer Scrabble-Style Web Game

**Feature**: 001-scrabble-multiplayer  **Date**: 2026-04-27

This document resolves all architectural unknowns surfaced during Technical Context
filling. Every decision is justified, alternatives considered are recorded, and each
decision is traceable into the plan and contracts.

---

## R1 — Real-time multiplayer channel on Vercel + Supabase

**Decision**: Use **Supabase Realtime** (Postgres Changes + Broadcast) as the live
channel. Server-state mutations occur in **Next.js Server Actions** that write to Postgres;
all clients subscribed to a per-game channel receive the updated state via Realtime.

**Rationale**:

- Vercel serverless functions are stateless and cannot host long-lived WebSocket
  connections directly; pushing live updates from a Vercel function is not the model.
  Supabase Realtime exists for this exact purpose.
- Server Actions provide the atomic write path with auth context. RLS enforces who can
  read changes from a given game. This satisfies FR-040, FR-041, FR-100.
- One channel per game (`game:<gameId>`) gives natural isolation and cleanup.

**Alternatives considered**:

- **Custom WebSocket service** — adds operational surface area, second hosting target,
  out of scope for v1.
- **Polling** — wastes resources, fails the 2s p95 freshness goal at scale.
- **Vercel Edge Runtime + Durable Objects-like** — not native to Vercel and would force a
  different platform.

**Plan reference**: `src/realtime/game-channel.ts` subscribes to Postgres Changes on the
`games` row and Broadcast events on `game:<gameId>` for ephemeral signals (challenge
opened, presence). Server Actions are the only writers.

---

## R2 — Sync granularity (what the opponent sees during a turn)

**Decision**: **Commit-only sync** as the v1 baseline. The opponent does not see tentative
placements. The server writes a new row to `moves` (and updates `games`) only when a move
is committed; that triggers the realtime push. A lightweight presence indicator
("opponent is making a move") MAY be added later as a Broadcast-only signal — not bound to
moves.

**Rationale**:

- Aligns with the user's directive "prefer robust turn consistency over flashy real-time
  animations".
- Mirrors physical Scrabble; simplifies state model.
- Keeps Realtime traffic to one event per turn — well under quota concerns.
- Tentative placements stay client-local — no risk of leaking partial intent to the
  opponent (FR-042 for racks; same hygiene applied to in-flight placements).

**Alternatives considered**:

- **Real-time tile streaming** — explicitly excluded per user directive; multiplies
  realtime bandwidth and consistency surface.
- **Hybrid presence indicator** — possible later; not required for v1.

**Plan reference**: `src/ui/hooks/use-tentative-board.ts` is browser-only state.
`src/realtime/game-channel.ts` reconciles only on committed `moves` changes.

---

## R3 — Authoritative timer enforcement on a serverless platform

**Decision**: **Server-anchored deadline + lazy enforcement on read/write + Vercel Cron
fallback.** Each turn stores `turn_started_at` (server timestamp) and the per-turn
duration. Authoritative remaining time = `started_at + duration − now()` computed
server-side. On any Server Action targeting an expired turn, the server resolves the
expiry first (records a forced-pass move) before processing the requested action. A
**Vercel Cron job** at e.g. 1-minute cadence sweeps games whose deadline has passed and
resolves them server-side, so a turn cannot stall indefinitely if no client is listening.

**Rationale**:

- Vercel functions cannot run a setTimeout to fire at the deadline; they're stateless.
- Lazy enforcement covers the common case (someone takes the next action).
- The cron sweep covers the cold case (both players idle / disconnected).
- Server-anchored time satisfies FR-050, FR-051, R-004; clients render countdowns from a
  server reference plus local clock delta (clock-skew correction at every state push).

**Alternatives considered**:

- **Client-driven expiry** — fails authority requirement; cheatable.
- **Edge function with Durable scheduling** — not natively supported on Vercel.
- **Long-lived Node worker** — outside Vercel's model; adds infrastructure.

**Plan reference**: `src/orchestration/timers.ts` exposes `remainingMs(game, now)` and
`resolveIfExpired(gameId)`. `app/api/cron/timer-tick/route.ts` is the cron entrypoint,
configured in `vercel.json`.

---

## R4 — Authentication: Supabase Auth with email magic link

**Decision**: Use **Supabase Auth** with **email magic link** as the default sign-in
method, integrated via `@supabase/ssr` for Next.js App Router. Sessions are stored in
`httpOnly` cookies; Server Actions use the cookies-based server client; the browser uses a
publishable-key-only client.

**Rationale**:

- Lowest friction for "two friends playing online" — no password to remember (A-001).
- Supabase Auth integrates natively with RLS via `auth.uid()` in policies.
- `@supabase/ssr` is the documented pattern for cookie-based auth in Next.js App Router.
- Optional Google OAuth can be enabled later by toggling the provider in Supabase, no
  schema change.

**Alternatives considered**:

- **Email + password** — extra UX (forgot-password flow), more attack surface; not needed.
- **NextAuth/Auth.js with custom adapter** — duplicates what Supabase Auth gives natively
  and complicates RLS integration.
- **Clerk / WorkOS** — third managed service; out of scope.

**Plan reference**: `src/auth/server.ts`, `src/auth/middleware.ts`, `app/(auth)/sign-in/`,
`app/(auth)/callback/route.ts`.

---

## R5 — Layer enforcement: keeping the rules engine framework-free

**Decision**: Enforce the layer boundaries declared in Constitution Principle III via
**ESLint** rules using `eslint-plugin-import` `no-restricted-paths` + a small custom
boundary check. `src/rules/**` MUST NOT import from `react`, `next/*`, `@supabase/*`, or
any sibling layer except `src/rules` itself.

**Rationale**:

- A pure rules engine is asserted in spec and constitution; lint catches accidental
  cross-layer imports at PR time, not just at review time.
- Costs zero runtime overhead; the boundary is mechanically verifiable.

**Alternatives considered**:

- **Separate package** (`packages/rules-engine` in a monorepo) — most rigorous but adds
  workspace overhead before it's earning its keep. Defer until layer 1 stabilizes; the
  source layout in `src/rules` already supports a future extraction.
- **Verbal convention only** — fails the "mechanically verifiable" bar.

**Plan reference**: ESLint config in repo root; rule wired into `npm run lint` and CI.

---

## R6 — Dictionary source (license-safe substitute)

**Decision**: Package the **ENABLE word list (public domain)** as the default dictionary,
with structure that allows the operator to add additional dictionaries via configuration.
The default file is built at install time by `scripts/dictionary-prepare.ts` from a
verified source; the resulting file is checked into `src/dictionary/default-list.txt` so
deployment is hermetic. Dictionary lookups are case-insensitive ASCII letters only.

**Rationale**:

- TWL and SOWPODS (Collins) are proprietary; bundling them risks legal action (R-001).
- ENABLE is widely used in computer Scrabble research, public domain, and ~172k entries
  is comparable in shape to TWL.
- Configurability satisfies FR-070, FR-071: an operator with a license to TWL can drop
  it in via env var pointing to a file path or a Supabase Storage bucket.
- Lookup is `Set<string>`-backed; ~172k entries × ~7 bytes ≈ 1.2 MB in memory — trivial
  on Node.

**Alternatives considered**:

- **TWL bundled** — license risk.
- **Online dictionary API** — adds latency to challenge resolution and a runtime dep we
  don't control.
- **Trie / DAWG** — lower memory but premature optimization; revisit only if the in-memory
  Set becomes a problem.

**Plan reference**: `src/dictionary/load.ts`, `src/dictionary/lookup.ts`,
`src/dictionary/default-list.txt`, `scripts/dictionary-prepare.ts`. README documents the
licensing context and how to swap in another list.

---

## R7 — Tile placement input model (drag, tap, keyboard)

**Decision**: Implement **dnd-kit** for pointer drag-and-drop on desktop and mobile,
**plus a tap-to-place fallback** (tap a rack tile to select, tap a board square to place)
that works identically on touch and mouse, **plus minimum keyboard support**: rack tiles
focusable with Tab, Enter selects a tile, arrow keys move the board cursor, letter key
places the focused rack tile, Backspace recalls.

**Rationale**:

- Drag is the expected primary mode (FR-026, R-008).
- Tap-to-place removes drag fragility on small touchscreens (R-008 mitigation).
- Keyboard support is a minimum a11y bar — users with motor or vision differences cannot
  drag; tap-only also fails them.
- dnd-kit explicitly supports keyboard sensors and touch sensors out of the box, so all
  three modes share one component model.

**Alternatives considered**:

- **HTML5 native drag/drop** — broken on mobile and worse a11y story than dnd-kit.
- **react-dnd** — heavier and less actively maintained than dnd-kit for this use case.
- **Drag-only (no a11y)** — fails the "acceptable mobile usability" goal and broad a11y
  expectations; explicitly rejected.

**Plan reference**: `src/ui/components/rack/`, `src/ui/components/board/`, plus a shared
`useTilePlacement()` hook that abstracts over the three input modes.

---

## R8 — Database schema strategy and RLS

**Decision**: Schema is owned by **versioned SQL migration files** in `supabase/migrations/`.
RLS is on for every row-bearing table from migration 1. Policies grant SELECT/UPDATE only
to authenticated users who are participants of the game (via a `players` join). The bag
column and other-player rack column are NEVER readable by clients — those columns live in
a server-only `game_secrets` row that only the service-role key can read; clients receive
only the bag count via a derived view.

**Rationale**:

- RLS is the natural enforcement primitive in Supabase; doing it from migration 1 prevents
  accidental data exposure.
- Splitting secret state into a separate row keeps the per-game read API simple while
  guaranteeing FR-042: the publishable-key client physically cannot SELECT the bag or
  another player's rack.
- Migrations as files (not the Supabase Studio GUI) keep the schema auditable in the
  public repo.

**Alternatives considered**:

- **All state in one row, masked at the application layer** — one bug exposes secrets;
  rejected.
- **Serverless ORM with declarative schema (e.g., Prisma)** — adds dependency and
  generation step; SQL migrations are sufficient and Vercel/Supabase-native.

**Plan reference**: See `data-model.md` for tables, columns, and policies.

---

## R9 — Validation, types, and contract surface

**Decision**: All Server Action inputs validated with **Zod** schemas; the schema is the
contract. Domain types in `src/rules/types.ts` are the canonical TS shapes; persistence
adapters in `src/persistence/dto.ts` translate DB rows to/from domain types.

**Rationale**:

- Zod gives runtime + TS type inference — no drift between the validator and the type.
- Server Actions are the only public mutation surface; centralizing validation there
  closes the input-trust boundary cleanly.
- Domain types decoupled from DB rows lets the rules engine stay framework-free.

**Alternatives considered**:

- **`io-ts`** — older API and worse DX than Zod for this use case.
- **No runtime validation, types only** — TypeScript types are erased at runtime; trusting
  client payloads would violate FR-043, FR-100.

**Plan reference**: `app/actions/*.ts` import schemas; persistence layer maps DTOs.

---

## R10 — Testing strategy concretized

**Decision**:

- **Unit (Vitest)** — rules engine, written test-first per Principle VI. Fixtures use a
  seeded RNG so bag draws and shuffles are deterministic.
- **Integration (Vitest)** — Server Actions exercised against a local Supabase project (or
  a per-test transactional sandbox). Auth simulated by injecting a session.
- **E2E (Playwright)** — full flows in a real browser against a deploy preview or
  `vercel dev` + Supabase test project, with two browser contexts (Player A, Player B).
  Screenshots captured at: sign-in, lobby created, lobby joined, first move placed, move
  committed, challenge open, challenge resolved (both outcomes), timer urgent, timer
  expired, endgame.
- **Deterministic timer tests** — `tests/helpers/fake-clock.ts` injects a server-time
  source so timer-expiry tests do not race a real clock.

**Rationale**:

- Aligns to Constitution Principle VI exactly.
- Two-browser-context Playwright is the only way to exercise multiplayer end to end.

**Alternatives considered**:

- **Stubbing the network in Playwright** — defeats the point of E2E; rejected.
- **Single-browser E2E** — cannot validate sync; rejected.

**Plan reference**: `tests/{unit,integration,e2e,fixtures,helpers}/`, `playwright.config.ts`.

---

## R11 — Repo hygiene & secret containment

**Decision**:

- `.env.example` lists every env var with a placeholder; checked in.
- `.env.local`, `.env*.local`, `.env.production*`, and Playwright artifact directories
  (`playwright-report/`, `test-results/`) are gitignored.
- A pre-commit hook (Husky + lint-staged) runs `npm run lint` and a secret-scan
  (`gitleaks` or simple regex set) on staged files.
- All secrets sourced from `process.env` only. `NEXT_PUBLIC_*` are reviewed for "is this
  truly safe to ship to the browser" at PR time.

**Rationale**: Satisfies Principle II + FR-090..094 mechanically rather than by review
diligence alone.

**Alternatives considered**:

- **No pre-commit scan, rely on review** — one missed `.env` rotates everything; the
  cost of a missed leak is too high.

**Plan reference**: `.husky/pre-commit`, `.gitignore`, `.gitleaks.toml`, `.env.example`.

---

## R12 — Rematch flow

**Decision**: Endgame screen exposes a **"Rematch" button** (host-only). Pressing it
creates a new game with the same settings and the same opponent pre-seeded as participant,
and presents a fresh invite to the opponent (one-click join). Score history across
rematches is **not** tracked in v1 (no series scoreboard).

**Rationale**: User explicitly asked to support rematch. Reusing the existing
create-and-join flow keeps the data model unchanged. Series tracking is deferred (A-008
extension).

**Alternatives considered**:

- **Best-of-N series** — adds a `match` entity above `game`; out of scope for v1.

**Plan reference**: `app/actions/games.ts` exposes `rematch(gameId)`; UI on
`app/(app)/games/[gameId]/result/page.tsx`.

---

## Resolved NEEDS CLARIFICATION items

| Source                     | Item                                          | Resolution |
|----------------------------|-----------------------------------------------|------------|
| Technical Context — sync   | What does opponent see during your turn?      | R2: commit-only |
| Technical Context — timer  | How is the timer enforced on serverless?      | R3: anchored deadline + cron sweep |
| Technical Context — auth   | What auth method?                              | R4: Supabase magic link |
| Technical Context — dict   | Default dictionary?                            | R6: ENABLE list, swap-able |
| Technical Context — input  | Drag vs keyboard?                              | R7: dnd-kit + tap + keyboard |
| Technical Context — schema | Migration ownership?                           | R8: SQL migration files w/ RLS day 1 |
| Technical Context — tests  | Concrete test layers?                          | R10: Vitest + Playwright + fake clock |
| Spec A-008 — rematch       | What does rematch mean?                        | R12: same-settings new game, host-initiated |

All items resolved; no `NEEDS CLARIFICATION` remain in `plan.md`'s Technical Context.
