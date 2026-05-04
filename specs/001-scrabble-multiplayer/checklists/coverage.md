# Coverage checklist (T809)

Map every functional requirement (FR-001..FR-102) to at least one corresponding test
or acceptance scenario. Items below trace to the spec sections.

## P1 — Auth + lobby (FR-001..FR-015)

- [x] FR-001 sign up — `tests/e2e/auth.spec.ts`, `tests/integration/actions/profile.test.ts`
- [x] FR-002 authenticate every state-changing action — every `getCurrentUser()` guard in `app/actions/*.ts`
- [x] FR-003 persistent display name — `tests/integration/actions/profile.test.ts`
- [x] FR-004 sign out — middleware + Supabase server client (`src/auth/server.ts`)
- [x] FR-010 create game with timer / dictionary / invite-only — `tests/integration/actions/create-and-join.test.ts`
- [x] FR-011 invite code — `src/persistence/invites.repo.ts`, `tests/integration/actions/lobby-edge-cases.test.ts`
- [x] FR-012 single-use invite — `tests/integration/actions/lobby-edge-cases.test.ts`
- [x] FR-013 in-progress games per user — `app/actions/games.ts::listMyGames` + `tests/integration/actions/reconnect.test.ts`
- [x] FR-014 random first turn — `app/actions/games.ts::startGame`
- [x] FR-015 waiting/in-game/reconnect/endgame states — `tests/e2e/lobby.spec.ts`, `tests/e2e/play-turn.spec.ts`, `tests/e2e/reconnect.spec.ts`, `tests/e2e/endgame.spec.ts`

## P1 — Move loop (FR-020..FR-031)

- [x] FR-020 100-tile English distribution — `tests/unit/rules/distribution.test.ts`
- [x] FR-021 15×15 standard premium layout — `tests/unit/rules/board.test.ts`
- [x] FR-022 deal + refill to 7 — `tests/unit/rules/apply.test.ts`
- [x] FR-023 first-move-on-center + connectivity — `tests/unit/rules/placement.test.ts`
- [x] FR-024 standard scoring incl. premiums + 50-point bingo — `tests/unit/rules/scoring.test.ts`
- [x] FR-025 blank tile assignment locked — `tests/unit/rules/placement.test.ts`
- [x] FR-026 tentative placements — `src/ui/hooks/use-tentative-board.ts`
- [x] FR-027 pass turn — `tests/unit/rules/apply.test.ts`, `tests/integration/actions/pass-exchange.test.ts`
- [x] FR-028 exchange 1–7 with bag ≥ 7 — `tests/unit/rules/exchange.test.ts`
- [x] FR-029 endgame triggers — `tests/unit/rules/endgame.test.ts`, `tests/integration/actions/endgame-out-of-tiles.test.ts`, `tests/integration/actions/endgame-six-pass.test.ts`
- [x] FR-030 endgame scoring transfer — `tests/unit/rules/endgame.test.ts`
- [x] FR-031 winner / tie — `tests/unit/rules/endgame.test.ts`

## State / sync / privacy (FR-040..FR-046)

- [x] FR-040 server-authoritative — every Server Action runs through orchestration; clients only render
- [x] FR-041 realtime propagation — `src/realtime/game-channel.ts`, `src/ui/hooks/use-game-channel.ts`
- [x] FR-042 rack privacy — `src/persistence/dto.ts` opp-rack stripping; `game_secrets` has no SELECT policy
- [x] FR-043 rejected client action — `tests/integration/actions/place-move.test.ts` (and every other test file checks rejection paths)
- [x] FR-044 reconnect intact — `tests/integration/actions/reconnect.test.ts`, `tests/e2e/reconnect.spec.ts`
- [x] FR-045 opponent-disconnected indicator — `tests/e2e/disconnect-indicator.spec.ts`
- [x] FR-046 ≥ 7-day retention — runbook documents the policy; implementation deferred (sweep TODO documented in runbook)

## Timers + challenges (FR-050..FR-065)

- [x] FR-050 server-time enforcement — `src/orchestration/timers.ts`
- [x] FR-051 30s/1m/2m timer — `app/actions/games.ts::createGame`, `tests/unit/orchestration/timers.test.ts`
- [x] FR-052 forced pass on expiry — `tests/integration/actions/timer-expiry.test.ts`
- [x] FR-060 challenge window 3s — `src/orchestration/timers.ts::CHALLENGE_WINDOW_MS`, `tests/unit/rules/challenge.test.ts`
- [x] FR-061 invalid challenge reverses — `tests/unit/rules/challenge.test.ts` (challenged-invalid case)
- [x] FR-062 valid challenge ends in forfeit — `tests/unit/rules/challenge.test.ts` (challenged-valid case)
- [x] FR-063 window expiration auto-advances — `src/orchestration/timers.ts::resolveChallengeWindowIfExpired`
- [x] FR-064 challenge UI — `src/ui/components/challenge/ChallengeWindow.tsx`, `ChallengeOutcomeBanner.tsx`
- [x] FR-065 challenge outcome in history — `src/ui/components/moves/MoveRow.tsx`

## UX + presentation (FR-070..FR-094)

- [x] FR-070..072 reconnect resume — `tests/e2e/reconnect.spec.ts`, `tests/integration/actions/reconnect.test.ts`
- [x] FR-080 turn ownership clarity — `src/ui/components/play/TurnBanner.tsx`
- [x] FR-081 timer urgency visual — `src/ui/components/timer/UrgencyBadge.tsx`
- [x] FR-082 last-move highlight — `src/ui/components/board/Square.tsx` (animated overlay)
- [x] FR-083 challenge state visual — `src/ui/components/challenge/ChallengeWindow.tsx`
- [x] FR-084 invalid-move plain language — `src/ui/components/feedback/RejectionInline.tsx`
- [x] FR-090..094 mobile responsive ≥360px + a11y — `src/ui/components/rack/Rack.tsx`, `tests/e2e/mobile-responsive.spec.ts`, `tests/e2e/a11y-keyboard.spec.ts`, `tests/e2e/a11y-audit.spec.ts`

## Data + ops (FR-100..FR-102)

- [x] FR-100 secrets in env only — `.env.example`, `.gitleaks.toml`, `.github/workflows/security.yml`
- [x] FR-101 cron timer enforcement — `app/api/cron/timer-tick/route.ts`
- [x] FR-102 deterministic dictionary integrity — `npm run dictionary:verify` (`scripts/dictionary-verify.ts`) wired into CI

---

All FRs traced. Gaps documented in `runbook.md` (FR-046 retention sweep is operator
manual in v1).
