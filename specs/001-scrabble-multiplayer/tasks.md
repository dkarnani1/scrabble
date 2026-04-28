---
description: 'Task list for online multiplayer Scrabble-style web game'
---

# Tasks: Online Multiplayer Scrabble-Style Web Game

**Input**: Design documents from `/specs/001-scrabble-multiplayer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Tests are MANDATORY for this project per Constitution Principle VI (Test-First
for Core Rules) and per the user's explicit request for unit/integration/Playwright
coverage. Rules-engine tests MUST be written and observed failing before the
corresponding implementation lands.

**Organization**: Tasks are grouped by user story to enable independent implementation
and testing of each story. Each P1 story is part of the MVP; P2 and P3 stories add
fidelity, robustness, and polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1..US7)
- File paths are exact; multiple tasks touching the same file are sequential

## Path Conventions

- Next.js App Router: `app/` (UI + Server Actions + route handlers)
- Internal layered modules: `src/{rules,orchestration,persistence,auth,realtime,dictionary,ui}/`
- Tests: `tests/{unit,integration,e2e,fixtures,helpers}/`
- Database: `supabase/migrations/`, `supabase/seed.sql`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, tooling, and repo hygiene baseline.

- [x] T001 Initialize Next.js 15 + TypeScript project at repo root (`package.json`, `tsconfig.json`, `next.config.ts`)
- [x] T002 [P] Configure Tailwind CSS 4 in `app/globals.css` and `tailwind.config.ts`
- [x] T003 [P] Install runtime deps (`@supabase/supabase-js`, `@supabase/ssr`, `zod`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`) and dev deps (`vitest`, `@vitest/ui`, `playwright`, `@playwright/test`, `@axe-core/playwright`, `eslint-plugin-import`, `prettier`, `husky`, `lint-staged`) in `package.json`
- [x] T004 [P] Configure ESLint with layer-boundary rules in `eslint.config.mjs` (forbid `react`, `next/*`, `@supabase/*` imports inside `src/rules/**`)
- [x] T005 [P] Configure Prettier in `.prettierrc` and `.prettierignore`
- [x] T006 [P] Configure Vitest projects (unit + integration) in `vitest.config.ts`
- [x] T007 [P] Configure Playwright (two browser contexts, screenshot on every step, base URL via env) in `playwright.config.ts`
- [x] T008 Create `.env.example` at repo root listing every documented env var with safe placeholder values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`)
- [x] T009 [P] Update `.gitignore` to exclude `.env*.local`, `.env.production*`, `playwright-report/`, `test-results/`, `.vercel/`, `node_modules/`, `.next/`
- [x] T010 [P] Add Husky pre-commit hook in `.husky/pre-commit` running `lint-staged` + `gitleaks`
- [x] T011 [P] Configure secret scanning in `.gitleaks.toml`
- [x] T012 [P] Add npm scripts (`dev`, `build`, `lint`, `typecheck`, `test:unit`, `test:integration`, `test:e2e`, `test:e2e:update-snapshots`, `dictionary:prepare`, `dictionary:verify`) in `package.json`
- [x] T013 [P] Create base `app/layout.tsx` with font setup and global providers
- [x] T014 [P] Create `app/globals.css` with Tailwind directives and base tokens
- [x] T015 [P] Create `app/(marketing)/page.tsx` skeleton landing page
- [x] T016 [P] Add `vercel.json` with cron schedule for `/api/cron/timer-tick` (`*/1 * * * *`) and function timeouts
- [x] T017 [P] Create public-safe `README.md` at repo root pointing to `specs/001-scrabble-multiplayer/quickstart.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, RLS, rules-engine scaffold, dictionary, persistence, auth — everything every user story depends on.

**⚠️ CRITICAL**: No user-story work can begin until this phase is complete.

### Database schema and migrations

- [x] T020 Write migration `supabase/migrations/0001_init.sql` (extensions, `public.profiles` table, profiles RLS policies)
- [x] T021 Write migration `supabase/migrations/0002_games.sql` (`games`, `game_secrets` tables; `game_secrets` deliberately has no RLS SELECT policies)
- [x] T022 Write migration `supabase/migrations/0003_moves.sql` (`moves` table with append-only convention)
- [x] T023 Write migration `supabase/migrations/0004_invites.sql` (`invites` table)
- [x] T024 Write migration `supabase/migrations/0005_rls.sql` (RLS policies: participant-only SELECT on `games`, `players`, `moves`; authenticated-only on `invites`, `dictionaries`)
- [x] T025 Write migration `supabase/migrations/0006_realtime.sql` (publication on `games`, `moves`, `players`; `game_secrets` deliberately excluded)
- [x] T026 Write migration `supabase/migrations/0007_dictionaries.sql` (`dictionaries` table + seed `enable-default` row)
- [x] T027 Write `supabase/seed.sql` with local-dev seed (no real secrets)

### Rules-engine scaffold (test-first)

- [x] T030 [P] Define core domain types in `src/rules/types.ts` (`Tile`, `Letter`, `Rack`, `Coord`, `Board`, `PlacedTile`, `PremiumKind`, `Move`, `CommittedMove`, `ChallengeOutcome`, `GamePhase`, `TimerSetting`, `GameState`, `PlayerState`, `PendingChallenge`, `GameResult`)
- [x] T031 [P] Write unit tests for seedable RNG in `tests/unit/rules/rng.test.ts`
- [x] T032 [P] Implement seedable RNG (mulberry32) in `src/rules/rng.ts`
- [x] T033 [P] Write unit tests for tile distribution in `tests/unit/rules/distribution.test.ts`
- [x] T034 [P] Implement standard 100-tile English distribution in `src/rules/distribution.ts`
- [x] T035 [P] Write unit tests for board layout (premiums, center) in `tests/unit/rules/board.test.ts`
- [x] T036 [P] Implement board factory and premium-square map in `src/rules/board.ts`
- [x] T037 [P] Write unit tests for bag operations (shuffle/draw/return determinism) in `tests/unit/rules/bag.test.ts`
- [x] T038 [P] Implement bag operations in `src/rules/bag.ts`
- [x] T039 [P] Add ESLint test that proves layer-boundary rule fires on a forbidden import in `tests/unit/rules/boundary.test.ts`

### Dictionary infrastructure

- [x] T040 Implement deterministic dictionary builder in `scripts/dictionary-prepare.ts` producing `src/dictionary/default-list.txt`
- [x] T041 Implement hash verifier in `scripts/dictionary-verify.ts`
- [x] T042 [P] Write unit tests for dictionary loader in `tests/unit/dictionary/load.test.ts`
- [x] T043 [P] Implement memoized loader in `src/dictionary/load.ts`
- [x] T044 [P] Write unit tests for case-insensitive lookup in `tests/unit/dictionary/lookup.test.ts`
- [x] T045 [P] Implement lookup in `src/dictionary/lookup.ts`

### Persistence and auth scaffolding

- [x] T050 [P] Implement cookies-based server Supabase client in `src/persistence/supabase-server.ts`
- [x] T051 [P] Implement publishable-key browser client in `src/persistence/supabase-browser.ts`
- [x] T052 [P] Implement service-role admin client (server-only guard) in `src/persistence/supabase-admin.ts`
- [x] T053 [P] Implement DTO adapters (DB rows ↔ domain types) in `src/persistence/dto.ts`
- [x] T054 [P] Implement `getCurrentUser` / `requireUser` in `src/auth/server.ts`
- [x] T055 [P] Implement Next.js auth middleware in `src/auth/middleware.ts` and wire `middleware.ts` at repo root

### Test infrastructure

- [x] T060 [P] Implement deterministic clock helper in `tests/helpers/fake-clock.ts`
- [x] T061 [P] Implement per-test Supabase reset helper in `tests/helpers/seed-supabase.ts`
- [x] T062 [P] Implement game-state fixtures in `tests/fixtures/games.ts`
- [x] T063 [P] Implement board fixtures in `tests/fixtures/boards.ts`
- [x] T064 [P] Implement deterministic bag fixtures in `tests/fixtures/bags.ts`
- [x] T065 [P] Implement tiny seeded test dictionaries in `tests/fixtures/dictionaries.ts`
- [x] T066 [P] Implement two-context Playwright auth helper in `tests/helpers/playwright-setup.ts`

### UI shell

- [x] T070 [P] Bootstrap shadcn/ui (Button, Dialog, Input, Toast) into `src/ui/components/primitives/` via the shadcn CLI
- [x] T071 [P] Implement shared header and signed-in shell in `src/ui/components/shell/AppShell.tsx`

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Sign up, create a game, and invite a friend (Priority: P1) 🎯 MVP

**Goal**: Two friends sign in (or sign up), one creates a game, the other joins via invite, host starts the match.

**Independent Test**: Two browser contexts, two fresh accounts, one invite link → both reach a "ready to start" lobby and see each other; host can start.

### Tests for User Story 1 ⚠️

- [x] T100 [P] [US1] Integration test create→join→start happy path in `tests/integration/actions/create-and-join.test.ts`
- [x] T101 [P] [US1] Integration test lobby edge cases (invite reuse, full lobby, host-only-start, lobby-not-full) in `tests/integration/actions/lobby-edge-cases.test.ts`
- [x] T102 [P] [US1] Integration test profile.setDisplayName in `tests/integration/actions/profile.test.ts`
- [x] T103 [P] [US1] Playwright spec: sign-in flow with screenshot in `tests/e2e/auth.spec.ts`
- [x] T104 [P] [US1] Playwright spec: create + join lobby in two contexts with screenshots in `tests/e2e/lobby.spec.ts`

### Implementation for User Story 1

- [x] T110 [P] [US1] Implement `src/persistence/games.repo.ts` (insert, fetch by id, update phase/active_slot)
- [x] T111 [P] [US1] Implement `src/persistence/players.repo.ts` (insert slot, fetch by game, update score/rack_count/connected)
- [x] T112 [P] [US1] Implement `src/persistence/invites.repo.ts` (generate URL-safe code, consume single-use)
- [x] T113 [P] [US1] Implement `src/persistence/profiles.repo.ts` (read/update display name)
- [x] T114 [US1] Implement `createGame` Server Action with Zod schema in `app/actions/games.ts`
- [x] T115 [US1] Implement `joinGame` Server Action in `app/actions/games.ts`
- [x] T116 [US1] Implement `startGame` Server Action (deals racks via `game_secrets`, picks first slot, sets `turn_started_at` + `turn_deadline_at`) in `app/actions/games.ts`
- [x] T117 [US1] Implement `leaveLobby` Server Action in `app/actions/games.ts`
- [x] T118 [US1] Implement `listMyGames` Server Action in `app/actions/games.ts`
- [x] T119 [US1] Implement `setDisplayName` Server Action in `app/actions/profile.ts`
- [x] T120 [P] [US1] Implement magic-link sign-in form at `app/(auth)/sign-in/page.tsx`
- [x] T121 [P] [US1] Implement Supabase auth callback at `app/auth/callback/route.ts` (deviation from plan: route group dropped so the URL matches middleware allow-list `/auth/*`)
- [x] T122 [P] [US1] Implement signed-in home with "Your games" + "New game" CTA at `app/(app)/home/page.tsx`
- [x] T123 [US1] Implement game creation form (timer + dictionary + visibility=invite-only) at `app/(app)/games/new/page.tsx`
- [x] T124 [US1] Implement lobby view at `app/(app)/games/[gameId]/lobby/page.tsx`
- [x] T125 [US1] Implement join-via-invite at `app/(app)/games/join/[invite]/page.tsx`
- [x] T126 [P] [US1] Implement `src/ui/components/lobby/InviteCodeBox.tsx` (copyable invite + link)
- [x] T127 [P] [US1] Implement `src/ui/components/lobby/LobbyView.tsx` (player list, host badge, start gated on full lobby)
- [x] T128 [P] [US1] Implement first-time display-name prompt component in `src/ui/components/auth/DisplayNamePrompt.tsx`

**Checkpoint**: US1 is fully functional and testable independently — two players reach a started game.

---

## Phase 4: User Story 2 - Play a turn end-to-end (Priority: P1) 🎯 MVP

**Goal**: The active player places tiles (drag/tap/keyboard), rearranges, recalls, shuffles, then submits. Server validates, scores, refills the rack, and passes turn. Pass and exchange are also supported.

**Independent Test**: From a started game, the active player completes one place-and-submit turn that lands a valid scoring word; opponent sees update within 2s; pass and exchange exercisable.

### Tests for User Story 2 ⚠️ (test-first per Principle VI)

- [x] T200 [P] [US2] Unit test placement validation in `tests/unit/rules/placement.test.ts` (center, single line, contiguity, connection, blank-assigned)
- [x] T201 [P] [US2] Unit test word identification in `tests/unit/rules/words.test.ts` (main word + cross-words)
- [x] T202 [P] [US2] Unit test scoring in `tests/unit/rules/scoring.test.ts` (letter/word premiums, premium-only-on-first-use, bingo bonus)
- [x] T203 [P] [US2] Unit test exchange validation in `tests/unit/rules/exchange.test.ts` (1–7, bag ≥ 7, tile-on-rack)
- [x] T204 [P] [US2] Unit test `applyMove` orchestration in `tests/unit/rules/apply.test.ts` (rack mutation, refill, seq increment, deterministic result)
- [x] T205 [P] [US2] Integration test `placeMove` happy + invalid + concurrency in `tests/integration/actions/place-move.test.ts`
- [x] T206 [P] [US2] Integration test `passTurn` and `exchangeTiles` in `tests/integration/actions/pass-exchange.test.ts`
- [x] T207 [P] [US2] Playwright spec: full place-submit-history flow with screenshots in `tests/e2e/play-turn.spec.ts`

### Rules implementation for User Story 2

- [x] T210 [P] [US2] Implement placement validator in `src/rules/placement.ts`
- [x] T211 [P] [US2] Implement word identifier in `src/rules/words.ts`
- [x] T212 [P] [US2] Implement scoring in `src/rules/scoring.ts`
- [x] T213 [P] [US2] Implement exchange validator in `src/rules/exchange.ts`
- [x] T214 [US2] Implement `applyMove` in `src/rules/apply.ts` (depends on T210–T213)

### Persistence and orchestration for User Story 2

- [x] T220 [P] [US2] Implement `src/persistence/moves.repo.ts` (insert with `seq = max+1`, optimistic-concurrency-aware)
- [x] T221 [US2] Implement `src/orchestration/game-engine.ts` (load full state → applyMove → persist atomically)
- [x] T222 [US2] Implement optimistic-concurrency helpers in `src/orchestration/conflict.ts`
- [x] T223 [US2] Implement phase transitions in `src/orchestration/transitions.ts` (`playing → playing` after pass/exchange)

### Server Actions for User Story 2

- [x] T230 [US2] Implement `placeMove` Server Action in `app/actions/moves.ts` (depends on T214, T221)
- [x] T231 [US2] Implement `passTurn` Server Action in `app/actions/moves.ts`
- [x] T232 [US2] Implement `exchangeTiles` Server Action in `app/actions/moves.ts`

### Realtime read path

- [x] T240 [P] [US2] Implement subscription wiring in `src/realtime/game-channel.ts`
- [x] T241 [P] [US2] Implement `src/ui/hooks/use-game-channel.ts` (subscribe + reconcile + seq-gap refetch)

### UI for User Story 2

- [x] T250 [P] [US2] Implement board grid in `src/ui/components/board/BoardCanvas.tsx`
- [x] T251 [P] [US2] Implement single square (with premium label) in `src/ui/components/board/Square.tsx`
- [x] T252 [P] [US2] Implement rack with dnd-kit + tap fallback in `src/ui/components/rack/Rack.tsx` (deviation: tap-to-select-then-tap-square interaction model for v1; dnd-kit drag/drop deferred to US7 polish)
- [x] T253 [P] [US2] Implement tile chip in `src/ui/components/rack/TileChip.tsx`
- [x] T254 [P] [US2] Implement rack controls (shuffle, recall) in `src/ui/components/rack/RackControls.tsx`
- [x] T255 [P] [US2] Implement submit button with inline rejection reason in `src/ui/components/controls/SubmitButton.tsx`
- [x] T256 [P] [US2] Implement pass button with confirm dialog in `src/ui/components/controls/PassButton.tsx`
- [x] T257 [P] [US2] Implement exchange dialog (1–7 tiles, disabled when bag < 7) in `src/ui/components/controls/ExchangeDialog.tsx`
- [x] T258 [P] [US2] Implement blank-tile assignment dialog in `src/ui/components/rack/BlankTileDialog.tsx`
- [x] T259 [P] [US2] Implement move history list in `src/ui/components/moves/MoveHistoryList.tsx`
- [x] T260 [P] [US2] Implement move row in `src/ui/components/moves/MoveRow.tsx`
- [x] T261 [P] [US2] Implement tentative-board hook in `src/ui/hooks/use-tentative-board.ts`
- [x] T262 [P] [US2] Implement inline rejection feedback in `src/ui/components/feedback/RejectionInline.tsx`
- [x] T263 [US2] Implement in-game page composing board + rack + controls + history at `app/(app)/games/[gameId]/play/page.tsx`

**Checkpoint**: US2 — full move loop works (place, submit, score, refill, sync to opponent within 2s).

---

## Phase 5: User Story 3 - Endgame and final scoring (Priority: P1) 🎯 MVP

**Goal**: Game ends correctly via out-of-tiles or 6-pass termination; final scores include unplayed-tile penalties + last-tile bonus; both players see endgame screen.

**Independent Test**: Drive a game (or seed a near-terminal state) to each terminal condition; verify scoring per Scrabble-style rules and endgame screen.

### Tests for User Story 3 ⚠️

- [x] T300 [P] [US3] Unit test endgame in `tests/unit/rules/endgame.test.ts` (out-of-tiles bonus transfer, six-pass no-transfer, tie, single-pass-not-terminal)
- [x] T301 [P] [US3] Integration test endgame triggered by `placeMove` emptying rack in `tests/integration/actions/endgame-out-of-tiles.test.ts`
- [x] T302 [P] [US3] Integration test endgame triggered by 6 consecutive scoreless turns in `tests/integration/actions/endgame-six-pass.test.ts`
- [x] T303 [P] [US3] Playwright spec: game-to-end with endgame-screen screenshot in `tests/e2e/endgame.spec.ts`

### Implementation for User Story 3

- [x] T310 [US3] Implement endgame detector + final scorer in `src/rules/endgame.ts`
- [x] T311 [US3] Wire endgame check into `src/rules/apply.ts` (return `phase: 'completed'` + `result` when triggered)
- [x] T312 [US3] Update `src/orchestration/game-engine.ts` to set `games.ended_at`, `result`, clear `active_slot` and timers on completion
- [x] T313 [P] [US3] Implement endgame screen at `app/(app)/games/[gameId]/result/page.tsx`
- [x] T314 [P] [US3] Implement endgame banner in `src/ui/components/feedback/EndgameBanner.tsx`
- [x] T315 [US3] Implement `rematch` Server Action (creates new game with same settings, fresh single-use invite) in `app/actions/games.ts`
- [x] T316 [P] [US3] Implement Rematch button on result page (host-only) in `src/ui/components/result/RematchButton.tsx`
- [x] T317 [P] [US3] Disable in-game actions when phase is `completed` (PlayClient redirects to /result on completion; the play page also redirects on initial load when phase is completed/abandoned, so the in-game controls are unreachable.)

**Checkpoint**: US3 — full match completable end-to-end (US1 + US2 + US3 = playable MVP).

---

## Phase 6: User Story 4 - Per-turn timers (Priority: P2)

**Goal**: 30s / 1m / 2m configurable per-turn timer with synchronized countdown and forced-pass on expiry.

**Independent Test**: Set timer 30s, do not act, observe both clients tick to zero in sync (±0.5s) and a forced pass recorded.

### Tests for User Story 4 ⚠️

- [x] T400 [P] [US4] Unit test timer math in `tests/unit/orchestration/timers.test.ts` (`remainingMs`, `resolveIfExpired`, fake-clock)
- [x] T401 [P] [US4] Integration test forced-pass on expiry in `tests/integration/actions/timer-expiry.test.ts`
- [x] T402 [P] [US4] Integration test cron-driven sweep with no client active in `tests/integration/actions/cron-timer-tick.test.ts`
- [x] T403 [P] [US4] Playwright spec: 30s timer expires → forced pass with urgent + expired screenshots in `tests/e2e/timer-expiry.spec.ts`

### Implementation for User Story 4

- [x] T410 [US4] Implement deadline math in `src/orchestration/timers.ts` (`remainingMs(state, now)`, `resolveIfExpired(gameId, now)`)
- [x] T411 [US4] Wire `resolveDueDeadlines` preflight into every Server Action in `app/actions/*.ts` (idempotent, runs before per-action work)
- [x] T412 [US4] Implement Vercel Cron route at `app/api/cron/timer-tick/route.ts` (CRON_SECRET-protected; sweeps `games` with `turn_deadline_at < now()`)
- [x] T413 [P] [US4] Implement `src/ui/hooks/use-server-timer.ts` (clock-skew correction on each push)
- [x] T414 [P] [US4] Implement `src/ui/components/timer/TimerDisplay.tsx`
- [x] T415 [P] [US4] Implement `src/ui/components/timer/UrgencyBadge.tsx` (visual <5s treatment)
- [x] T416 [US4] Wire timer-setting selector (30s/1m/2m/none) into `app/(app)/games/new/page.tsx` (already shipped in Phase 3 NewGameForm)
- [x] T417 [P] [US4] Add server-time freshness route at `app/api/server-time/route.ts` (returns `{ now: ISO }`)

**Checkpoint**: US4 — timed games work; cron sweep guarantees forward progress.

---

## Phase 7: User Story 5 - Challenge window (Priority: P2)

**Goal**: 3-second window after `place` move where opponent can challenge. Success reverses move; failure forfeits challenger's next turn.

**Independent Test**: Place a real word — opponent challenges → "valid; challenger forfeits next". Place a fake word — opponent challenges → "invalid; move reversed; turn lost".

### Tests for User Story 5 ⚠️

- [ ] T500 [P] [US5] Unit test challenge resolution in `tests/unit/rules/challenge.test.ts` (success reverses board/score/rack/bag deterministically; failure marks `forfeit_next`)
- [ ] T501 [P] [US5] Integration test `raiseChallenge` happy + failure in `tests/integration/actions/challenge.test.ts`
- [ ] T502 [P] [US5] Integration test challenge-window expiration moves on without challenge in `tests/integration/actions/challenge-window-expiry.test.ts`
- [ ] T503 [P] [US5] Playwright spec: both challenge outcomes with screenshots in `tests/e2e/challenge.spec.ts`

### Implementation for User Story 5

- [ ] T510 [US5] Update `src/rules/apply.ts` to expose enough information for reversal (rack delta + drawn-refill indices)
- [ ] T511 [US5] Implement challenge resolver in `src/rules/challenge.ts` (success path = reverse move; failure path = forfeit-next)
- [ ] T512 [US5] Add `challenge-window` and `resolving-challenge` transitions to `src/orchestration/transitions.ts`
- [ ] T513 [US5] Update `placeMove` to enter `challenge-window` phase + write `pending_challenge: null` and stop turn timer in `app/actions/moves.ts`
- [ ] T514 [US5] Implement `raiseChallenge` Server Action in `app/actions/challenges.ts`
- [ ] T515 [US5] Update `app/api/cron/timer-tick/route.ts` to also expire challenge windows
- [ ] T516 [P] [US5] Implement `src/ui/components/challenge/ChallengeWindow.tsx` (opponent-only Challenge button + 3s indicator)
- [ ] T517 [P] [US5] Implement `src/ui/components/challenge/ChallengeOutcomeBanner.tsx`
- [ ] T518 [P] [US5] Update `src/ui/components/moves/MoveRow.tsx` to surface `challenge_outcome` with disputed words

**Checkpoint**: US5 — authentic challenge flow with clear UI.

---

## Phase 8: User Story 6 - Reconnection and resume (Priority: P2)

**Goal**: Players can disconnect (close tab, lose Wi-Fi, switch device) and return to find the game intact.

**Independent Test**: Mid-turn close active player's tab; reopen within 60s; verify exact restoration of board, scores, own rack, remaining timer, history.

### Tests for User Story 6 ⚠️

- [ ] T600 [P] [US6] Integration test full state restoration after fresh load in `tests/integration/actions/reconnect.test.ts`
- [ ] T601 [P] [US6] Playwright spec: tab close → reopen mid-turn restores state in `tests/e2e/reconnect.spec.ts`
- [ ] T602 [P] [US6] Playwright spec: opponent-disconnected indicator after >5s in `tests/e2e/disconnect-indicator.spec.ts`
- [ ] T603 [P] [US6] Playwright spec: same-account second-device kicks first in `tests/e2e/multi-device.spec.ts`

### Implementation for User Story 6

- [ ] T610 [US6] Implement `getMyRack` Server Action (reads only the caller's rack via service-role client) in `app/actions/games.ts`
- [ ] T611 [US6] Implement presence join/leave handlers in `src/realtime/game-channel.ts`
- [ ] T612 [US6] Implement heartbeat (15s) updating `players.last_seen_at` via tiny Server Action `markPresent(gameId)` in `app/actions/presence.ts`
- [ ] T613 [P] [US6] Implement opponent-disconnected indicator in `src/ui/components/play/PresenceIndicator.tsx`
- [ ] T614 [US6] Implement reconcile-on-reconnect (full refetch of `games`/`moves`/`players`) in `src/ui/hooks/use-game-channel.ts`
- [ ] T615 [P] [US6] Surface "in-progress games" resume CTA on home in `src/ui/components/home/InProgressList.tsx`
- [ ] T616 [US6] Handle same-account multi-device session takeover in `src/auth/middleware.ts` (older session marked stale via `players.connected = false` for that user_id on new sign-in)

**Checkpoint**: US6 — disconnects no longer end games.

---

## Phase 9: User Story 7 - Polished feedback and visual quality (Priority: P3)

**Goal**: Clear, modern visual feedback for turn ownership, timer urgency, last move, challenge state, invalid-move reasons. Desktop fully usable; mobile ≥360px usable.

**Independent Test**: Desktop and mobile-viewport walkthrough confirms turn ownership, timer urgency, last-move highlight, and challenge state are unambiguous within 1 second of glance.

### Tests for User Story 7 ⚠️

- [ ] T700 [P] [US7] Playwright visual test: last-move highlight persists ≥3s in `tests/e2e/last-move-highlight.spec.ts`
- [ ] T701 [P] [US7] Playwright a11y test: keyboard-only flow places + submits a tile in `tests/e2e/a11y-keyboard.spec.ts`
- [ ] T702 [P] [US7] Playwright responsive test: 360px viewport reaches all primary actions without horizontal scroll in `tests/e2e/mobile-responsive.spec.ts`
- [ ] T703 [P] [US7] Playwright a11y audit (axe-core) on key pages in `tests/e2e/a11y-audit.spec.ts`

### Implementation for User Story 7

- [ ] T710 [P] [US7] Implement last-move highlight overlay in `src/ui/components/board/Square.tsx` (animated overlay, 3s+ persistence)
- [ ] T711 [P] [US7] Implement keyboard sensors + cursor navigation in `src/ui/components/board/BoardCanvas.tsx`
- [ ] T712 [P] [US7] Implement turn-ownership hero indicator in `src/ui/components/play/TurnBanner.tsx`
- [ ] T713 [P] [US7] Polish premium-square color accents and theme tokens in `tailwind.config.ts` (trademark-safe)
- [ ] T714 [P] [US7] Implement responsive bottom-sheet rack and viewport-aware layout in `src/ui/components/rack/Rack.tsx` and `app/(app)/games/[gameId]/play/page.tsx`
- [ ] T715 [P] [US7] Implement smooth tile place/recall transitions (≤200ms) in `src/ui/components/rack/TileChip.tsx`
- [ ] T716 [P] [US7] Audit and polish all rejection messages — every `rule-violation` reason maps to a plain-language string per SC-009 — in `src/ui/components/feedback/RejectionInline.tsx`
- [ ] T717 [P] [US7] Polish endgame animations and result presentation in `app/(app)/games/[gameId]/result/page.tsx`

**Checkpoint**: US7 — UI quality matches "polished, modern, intuitive" bar.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting hardening, CI, and validation against measurable success criteria.

- [ ] T800 [P] Set up CI workflow at `.github/workflows/ci.yml` (lint, typecheck, unit, integration on every PR)
- [ ] T801 [P] Set up Playwright CI workflow at `.github/workflows/e2e.yml` with artifact upload (`playwright-report/`, screenshots)
- [ ] T802 [P] Add `gitleaks` scan to CI in `.github/workflows/security.yml` (verifies SC-007 — zero secrets in history)
- [ ] T803 [P] Add `dictionary:verify` step to CI to catch drift in `.github/workflows/ci.yml`
- [ ] T804 [P] Add Playwright performance assertion: opponent state ≤2s p95 (SC-003) in `tests/e2e/perf-sync-latency.spec.ts`
- [ ] T805 [P] Add Playwright assertion: timer skew ≤0.5s steady state (SC-004) in `tests/e2e/perf-timer-skew.spec.ts`
- [ ] T806 Run full quickstart validation against a clean clone; record actual time-to-lobby and verify ≤30 minutes (SC-008) — record results in `specs/001-scrabble-multiplayer/runbook.md`
- [ ] T807 [P] Ensure `playwright-report/` and `test-results/` directories are written to gitignored paths only (no accidental screenshot leaks of real-looking data) — verified via test in `tests/integration/repo-hygiene.test.ts`
- [ ] T808 [P] Add operational runbook (cron behavior, abandoned-game policy, dictionary swap procedure) at `specs/001-scrabble-multiplayer/runbook.md`
- [ ] T809 Final pass: confirm every functional requirement (FR-001..FR-102) has at least one corresponding test or acceptance scenario; checklist file at `specs/001-scrabble-multiplayer/checklists/coverage.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user-story work.
- **US1 (Phase 3, P1)**: Depends on Foundational. No story dependencies.
- **US2 (Phase 4, P1)**: Depends on Foundational. Conceptually independent of US1, but a started game (US1 output) is required to manually exercise US2 end-to-end. Tests can be unit-/fixture-driven without US1.
- **US3 (Phase 5, P1)**: Depends on US2 (`applyMove` extension point). Tests can be fixture-driven.
- **US4 (Phase 6, P2)**: Depends on US2 (`placeMove` is the timer-touching action).
- **US5 (Phase 7, P2)**: Depends on US2 (`placeMove` enters `challenge-window`) and US4 (timer infra to expire windows).
- **US6 (Phase 8, P2)**: Depends on US1 + US2 (something to reconnect to).
- **US7 (Phase 9, P3)**: Depends on US1–US6 components existing to polish.
- **Polish (Phase 10)**: Depends on all desired stories being complete.

### Within each user story

- Tests are written and observed failing BEFORE implementation (Principle VI for rules; convention for the rest).
- Repos before Server Actions; Server Actions before pages; UI primitives before composing pages.
- Story complete (all acceptance scenarios green) before moving to next priority.

### Parallel opportunities

- All `[P]` tasks within Setup (T002–T017 except those touching `package.json` or root config).
- All rules-engine scaffold tasks in Foundational (T030–T038) run in parallel after migrations land.
- Persistence + auth scaffolding (T050–T055) run in parallel.
- Within each user story: all UI components in different files run in parallel; Server Actions targeting the same file are sequential.
- Independent stories (e.g., US2 and US1 logically) can be parallelized by different developers, with only T1xx vs T2xx dependencies.

---

## Parallel Example: User Story 2 rules-engine implementation

```bash
# After foundational tests are observed failing, four implementation tasks run in parallel:
Task: "Implement placement validator in src/rules/placement.ts"          # T210 [P]
Task: "Implement word identifier in src/rules/words.ts"                   # T211 [P]
Task: "Implement scoring in src/rules/scoring.ts"                          # T212 [P]
Task: "Implement exchange validator in src/rules/exchange.ts"             # T213 [P]
# Then sequentially:
Task: "Implement applyMove in src/rules/apply.ts (composes the four)"     # T214
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Setup (Phase 1) → all tooling green.
2. Foundational (Phase 2) → schema applied, rules-engine scaffold tested, dictionary built.
3. US1 (Phase 3) → two players reach a started game.
4. US2 (Phase 4) → real moves, real scoring, real sync.
5. US3 (Phase 5) → games actually end.
6. **STOP & VALIDATE**: a complete two-player game can be played start to finish. Deploy a preview to Vercel and play one with a friend.

### Incremental Delivery

- After MVP, add US4 (timers) — game gets pace.
- After US4, add US5 (challenges) — game gets authentic.
- After US5, add US6 (reconnect) — game survives the real internet.
- After US6, add US7 (polish) — game feels production-quality.

### Notes

- `[P]` = different files, no dependencies on incomplete tasks.
- `[US#]` = traceability to user-story acceptance criteria in `spec.md`.
- Tests for the rules engine MUST be written and observed failing before the corresponding implementation lands.
- Commit after each task or logical group; never bypass hooks (Constitution governance).
- Stop at any checkpoint to validate the story independently.
- Avoid: vague tasks, same-file conflicts marked `[P]`, cross-story coupling that breaks independence.
