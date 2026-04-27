# Implementation Plan: Online Multiplayer Scrabble-Style Web Game

**Branch**: `001-scrabble-multiplayer` | **Date**: 2026-04-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-scrabble-multiplayer/spec.md`

## Summary

Build a production-ready, public-repo, Vercel-hosted multiplayer Scrabble-style web game.
Two authenticated players play a full match in a browser with server-authoritative state,
official Scrabble-style rules, configurable per-turn timers (30s / 1m / 2m), a 3-second
challenge window, and reconnection support. The technical approach pairs Next.js
(App Router, TypeScript) on Vercel with Supabase (Auth + Postgres + Realtime), with the
core rules engine as a pure, framework-free TypeScript module that is unit-tested
independently of any UI, server, or database.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20 (Vercel runtime) and modern browsers
**Primary Dependencies**: Next.js 15+ (App Router, React Server Components, Server Actions),
React 19, Tailwind CSS 4, shadcn/ui, dnd-kit (tile drag/drop with keyboard fallback), Zod
(input validation), `@supabase/supabase-js` + `@supabase/ssr` (auth + DB + realtime client),
Vitest (unit + integration), Playwright (E2E with screenshots)
**Storage**: Supabase-managed Postgres with Row-Level Security; tile bag, racks, and
challenge state stored server-side only; move log is append-only and authoritative
**Testing**: Vitest for the rules engine (TDD, deterministic, framework-free) and for
server-action integration tests; Playwright for end-to-end with screenshot capture at
critical checkpoints; deterministic gameplay fixtures via a seedable RNG and seeded
dictionary subsets
**Target Platform**: Vercel for web hosting (Edge / Node functions), Supabase (US/EU
region operator's choice) for Postgres + Realtime + Auth; modern browsers — desktop primary
(Chrome/Edge/Safari/Firefox latest two), mobile responsive (Chrome/Safari latest two)
**Project Type**: Full-stack web application — Next.js App Router with Server Actions and
route handlers; single deployable artifact
**Performance Goals**: Opponent state visible within 2s p95 after move commit (FR-041);
turn-timer display skew ≤ 0.5s steady-state (FR-051, SC-004); first-game time-to-start <
3 minutes for two new users (SC-001); LCP < 2.5s on desktop broadband
**Constraints**: Public repository (zero secrets in source — FR-090..094); Vercel
serverless functions are stateless (no in-memory game state — Postgres + Realtime is the
only durable channel); server is the sole authority for tiles, racks, scores, and timers
(FR-040, FR-100); opponent racks MUST never be sent to a client (FR-042); per-game RLS
enforces participant-only access; trademark- and license-safe gameplay surface only
(R-001, R-002)
**Scale/Scope**: v1 supports two-player matches with the schema and state machine ready
for 3–4 players (A-004); operator-grade target ≈ 10²–10³ concurrent active games on a
single Supabase project; game retention ≥ 7 days from last activity (FR-046); ~12–18
core screens (sign-in, home, new game, lobby, in-game, endgame, profile/history)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Mapping each principle to a concrete gate for this plan:

| # | Principle | Gate for this plan | Status |
|---|-----------|--------------------|--------|
| I | Production-First & Vercel-Native | Stack chosen is Vercel-native (Next.js + Server Actions, Supabase Realtime). No long-lived sockets in serverless functions; live channel is Supabase Realtime. Local dev mirrors deployed runtime. | ✅ Pass |
| II | Security-First & Public-Repo Safety (NON-NEGOTIABLE) | `.env.example` enumerates env vars; `.env*.local` and `.env.production*` gitignored. All secrets read from `process.env`. Server-only secrets isolated from `NEXT_PUBLIC_*`. RLS denies cross-game access. | ✅ Pass |
| III | Layered Architecture & Rule-Engine Separation | Rules engine in `src/rules/*` is pure TS, no React/Next/Supabase imports. Orchestration in `src/orchestration/*` consumes rules. Persistence in `src/persistence/*`. Auth in `src/auth/*`. UI in `app/*` and `src/ui/*`. Cross-layer shortcuts forbidden. | ✅ Pass |
| IV | Authentic Scrabble Gameplay | Rules engine implements 100-tile bag, 15×15 board with standard premium squares, blank-tile rules, contiguous-line + center-star + crossword scoring, 50-pt bingo, exchange-bag-≥7 rule, both endgame triggers with proper unplayed-tile handling. Trademark- and asset-safe (no Hasbro/Mattel/Xbox imagery). | ✅ Pass |
| V | Multiplayer-First Design | Schema includes `games`, `players`, `moves`, `invites`. Server actions enforce turn ownership; Supabase Realtime broadcasts state changes; reconnection is a first-class UX (US6). Single-player not built; rematch reuses the same lobby flow. | ✅ Pass |
| VI | Test-First for Core Rules (NON-NEGOTIABLE) | Vitest covers placement validation, scoring (incl. cross-words & bingo), challenge resolution, exchange constraints, and both endgame paths — written before each rule implementation. Integration tests cover server actions; Playwright covers E2E flows with screenshots at sign-in, lobby, first move, challenge, timer expiry, endgame. | ✅ Pass |
| VII | UI/UX Quality | Polished UI with shadcn/ui + Tailwind; tile drag with dnd-kit + keyboard/tap fallback; clear last-move highlight, urgent-timer treatment, named submission rejection reasons; mobile-responsive ≥360px with ≥40×40 tap targets. | ✅ Pass |

**Initial check**: PASS — no violations. No entries needed in Complexity Tracking.

**Post-Phase-1 re-check (2026-04-27)**: PASS. The Phase 1 design did not introduce new
violations:

- Principle II (public-repo safety) is now enforced mechanically by `game_secrets`
  (no RLS SELECT policy + excluded from realtime publication), gitleaks pre-commit
  scan, and a strict env-var contract in `.env.example`.
- Principle III (layer separation) gains a lint-enforced boundary
  (`eslint-plugin-import` `no-restricted-paths`) on `src/rules/**`.
- Principle VI (test-first) is concretized with Vitest unit/integration suites and
  Playwright two-context E2E with screenshot capture at sign-in / lobby / first
  move / challenge / timer expiry / endgame.

No principles relaxed; no exceptions added.

## Project Structure

### Documentation (this feature)

```text
specs/001-scrabble-multiplayer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── server-actions.md
│   └── realtime-channels.md
├── checklists/
│   └── requirements.md  # Spec-quality checklist (created by /speckit-specify)
└── tasks.md             # Phase 2 output (created by /speckit-tasks)
```

### Source Code (repository root)

```text
app/                                  # Next.js App Router (UI + server actions + routes)
├── (marketing)/
│   └── page.tsx                      # Public landing
├── (auth)/
│   ├── sign-in/page.tsx
│   └── callback/route.ts             # Supabase auth callback
├── (app)/
│   ├── home/page.tsx                 # Signed-in home: your games + new game
│   ├── games/
│   │   ├── new/page.tsx              # Game creation form
│   │   ├── join/[invite]/page.tsx    # Join via invite code/link
│   │   └── [gameId]/
│   │       ├── lobby/page.tsx        # Pre-start lobby
│   │       ├── play/page.tsx         # In-game view
│   │       └── result/page.tsx       # Endgame screen
│   └── profile/page.tsx
├── actions/                          # Server Actions (the contract surface)
│   ├── games.ts                      # createGame, joinGame, startGame, leaveLobby, rematch
│   ├── moves.ts                      # placeMove, passTurn, exchangeTiles
│   ├── challenges.ts                 # raiseChallenge
│   └── timer.ts                      # forceTimeoutTick (cron / on-read enforcement)
├── api/
│   └── cron/timer-tick/route.ts      # Optional Vercel Cron fallback for timer enforcement
├── layout.tsx
└── globals.css

src/
├── rules/                            # Pure rules engine — framework-free
│   ├── types.ts                      # Tile, Board, Bag, GameState, Move, ChallengeOutcome
│   ├── distribution.ts               # Standard 100-tile English distribution + values
│   ├── board.ts                      # 15×15 board, premium squares, center star
│   ├── bag.ts                        # Seedable Fisher-Yates shuffle, draw, return
│   ├── rng.ts                        # Mulberry32 / xoshiro seedable RNG
│   ├── placement.ts                  # Validate placement (line, contiguity, center, connect)
│   ├── words.ts                      # Identify all formed words from a placement
│   ├── scoring.ts                    # Per-move score with premium squares + bingo bonus
│   ├── exchange.ts                   # Validate exchange (bag ≥7, tile ownership)
│   ├── challenge.ts                  # Apply success/failure outcomes
│   ├── endgame.ts                    # Bag-out and 6-pass termination + final scoring
│   └── apply.ts                      # applyMove(state, action, dictionary?) → newState | error
├── orchestration/                    # Multiplayer/session orchestration (no UI)
│   ├── game-engine.ts                # Wraps rules engine for server-side use
│   ├── transitions.ts                # Phase machine (lobby → playing → resolving-challenge → playing → ended)
│   ├── timers.ts                     # Server-time deadline math
│   └── conflict.ts                   # Optimistic-concurrency helpers (move sequence numbers)
├── persistence/                      # Data access — Supabase Postgres
│   ├── supabase-server.ts            # Server-side client (cookies-based auth)
│   ├── supabase-browser.ts           # Browser client (publishable key)
│   ├── supabase-admin.ts             # Service-role client (privileged ops only)
│   ├── games.repo.ts
│   ├── players.repo.ts
│   ├── moves.repo.ts
│   ├── invites.repo.ts
│   └── dto.ts                        # DB row → domain type adapters
├── auth/
│   ├── server.ts                     # getCurrentUser(), requireUser()
│   └── middleware.ts                 # Next.js middleware: route guards
├── realtime/
│   └── game-channel.ts               # Subscribe to per-game broadcast channel
├── dictionary/
│   ├── default-list.txt              # Packaged open word list (e.g., ENABLE-derived)
│   ├── load.ts                       # Load + memoize Set<string>
│   └── lookup.ts                     # has(word): boolean (case-insensitive)
└── ui/                               # Reusable UI primitives & feature components
    ├── components/
    │   ├── board/                    # BoardCanvas, Square, PremiumLabel
    │   ├── rack/                     # Rack, TileChip, RackControls (shuffle/recall)
    │   ├── controls/                 # SubmitButton, PassButton, ExchangeDialog
    │   ├── timer/                    # TimerDisplay, UrgencyBadge
    │   ├── challenge/                # ChallengeWindow, ChallengeOutcomeBanner
    │   ├── lobby/                    # LobbyView, InviteCodeBox
    │   ├── moves/                    # MoveHistoryList, MoveRow
    │   └── feedback/                 # Toast, RejectionInline
    ├── hooks/
    │   ├── use-game-channel.ts       # Subscribe + reconcile snapshots
    │   ├── use-server-timer.ts       # Render countdown from server reference
    │   └── use-tentative-board.ts    # Local-only tentative placement state
    └── lib/
        └── classnames.ts

tests/
├── unit/                             # Vitest — rules engine (test-first per Principle VI)
│   └── rules/
│       ├── placement.test.ts
│       ├── scoring.test.ts
│       ├── challenge.test.ts
│       ├── exchange.test.ts
│       ├── endgame.test.ts
│       └── bag.test.ts
├── integration/                      # Vitest — orchestration + persistence + actions
│   ├── actions/
│   │   ├── create-and-join.test.ts
│   │   ├── place-move.test.ts
│   │   ├── challenge.test.ts
│   │   └── timer-expiry.test.ts
│   └── persistence/
│       └── games.repo.test.ts
├── e2e/                              # Playwright (with screenshots)
│   ├── auth.spec.ts                  # sign-in screenshot
│   ├── lobby.spec.ts                 # create + join screenshots
│   ├── play-turn.spec.ts             # placement + commit + history screenshots
│   ├── challenge.spec.ts             # success + failure outcome screenshots
│   ├── timer-expiry.spec.ts          # urgent + forced-pass screenshots
│   └── endgame.spec.ts               # endgame screen screenshot
├── fixtures/
│   ├── boards.ts                     # Pre-built mid-game positions
│   ├── bags.ts                       # Deterministic bag seeds
│   ├── dictionaries.ts               # Tiny seeded dictionaries for tests
│   └── games.ts                      # Builder for full GameState
└── helpers/
    ├── seed-supabase.ts              # Per-test reset of test Supabase project
    ├── fake-clock.ts                 # Server-time injection for timer tests
    └── playwright-setup.ts           # Shared auth + screenshot helpers

supabase/
├── migrations/                       # Versioned SQL migrations (timestamp-prefixed)
│   ├── 0001_init.sql
│   ├── 0002_games.sql
│   ├── 0003_moves.sql
│   ├── 0004_invites.sql
│   ├── 0005_rls.sql
│   └── 0006_realtime.sql
├── policies/                         # RLS policy SQL (sourced into migrations)
└── seed.sql                          # Local-dev seed only

scripts/
├── dictionary-prepare.ts             # Build packaged dictionary asset (deterministic)
├── seed-dev.ts                       # Local dev: seed two demo accounts (no real secrets)
└── reset-test-db.ts                  # Reset test Supabase project between Playwright runs

public/
└── (game assets — original artwork only)

.env.example                          # Documented placeholders only — committed
.gitignore                            # Excludes .env*.local, .env.production*, screenshots dir, etc.
package.json
playwright.config.ts
vitest.config.ts
next.config.ts
tsconfig.json
README.md                             # Public-safe setup
```

**Structure Decision**: Single Next.js application with internal layered modules under
`src/`, server-side actions/routes under `app/actions/` and `app/api/`, and infrastructure
SQL under `supabase/`. This single-deployable layout maps directly onto Vercel's project
model (one project, one deployment) and onto Constitution Principle III's five layers
without splitting the repo into services. The rules engine lives at `src/rules/` and is
imported by orchestration but never imports from React, Next, or Supabase — enforced by
ESLint boundaries (research item R5).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations to justify. Constitution Check passed without exceptions.
