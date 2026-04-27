# Feature Specification: Online Multiplayer Scrabble-Style Web Game

**Feature Branch**: `001-scrabble-multiplayer`
**Created**: 2026-04-27
**Status**: Draft
**Input**: User description: "Build an online multiplayer Scrabble-style web game with polished UI that I can play with my friend over the internet… recreate the feel, rules, and play flow of the Xbox Scrabble game as closely as practical in a modern browser-based experience."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign up, create a game, and invite a friend (Priority: P1)

A new user creates an account, signs in, creates a game with chosen settings, gets a shareable
invite, and waits in a lobby for their friend. The friend signs in (or creates an account),
opens the invite, and joins the same game. Both players see each other in the lobby and the
host can start the match.

**Why this priority**: Without this flow, two friends cannot find each other in the product.
This is the literal entry point to gameplay.

**Independent Test**: Two browsers, two fresh accounts, one invite link. Verify both reach a
"ready to start" lobby and see each other's display name. No gameplay required.

**Acceptance Scenarios**:

1. **Given** a visitor on the home page, **When** they choose "Create account" and complete
   the simple sign-up flow, **Then** they land in a signed-in state with their display name
   visible.
2. **Given** a signed-in user, **When** they click "New game" and confirm settings (timer
   choice, dictionary choice, visibility = invite-only), **Then** a game lobby is created
   and a shareable invite link is presented.
3. **Given** a second user follows the invite link while signed out, **When** they sign in
   (or sign up), **Then** they are taken directly to the lobby and listed as a participant.
4. **Given** both players are in the lobby and ready, **When** the host clicks "Start game",
   **Then** both players' screens transition to the in-game view within 2 seconds and the
   first turn is assigned to a randomly selected player.
5. **Given** a user attempts to join a lobby that is already full or already started,
   **When** they open the invite, **Then** they see a clear "this game is no longer
   joinable" message with a "Back to home" action.

---

### User Story 2 - Play a turn end-to-end (Priority: P1)

The active player drags tiles from their rack onto the board, rearranges and recalls
tentative placements freely, can shuffle their rack, then submits the move. The system
validates the placement, computes the score, refills the rack from the bag, and passes the
turn to the opponent. Pass and exchange actions are also supported.

**Why this priority**: Turn-taking with real moves is the core gameplay loop. Without it the
product has no game; with only this story implemented, two players can already play a full
match by alternating turns.

**Independent Test**: From a started game, the active player completes one place-and-submit
turn that lands a valid scoring word; the score updates for both players and the turn passes
to the opponent. Pass and exchange are also exercisable.

**Acceptance Scenarios**:

1. **Given** the active player has a rack of 7 tiles, **When** they drag tiles onto valid
   board squares, **Then** tentative placements are visually distinct from committed tiles
   and can be moved or removed without limit before submission.
2. **Given** a tentative placement that does not satisfy placement rules (not connected on
   the first move's center square; not contiguous; not in a single line; not connected to
   existing tiles after the first move), **When** the player attempts to submit,
   **Then** the submission is blocked and a clear, plain-language reason is shown.
3. **Given** a valid tentative placement forming one or more legal words, **When** the
   player submits, **Then** the move is committed, the score for the move is added to the
   player's total, used tiles are replaced from the bag (up to a rack of 7), and the turn
   passes to the opponent.
4. **Given** the active player wants to pass, **When** they confirm "Pass turn",
   **Then** their turn ends without changing the rack or score and a pass is recorded in
   the move history.
5. **Given** the active player wants to exchange tiles and the bag holds at least 7 tiles,
   **When** they select 1–7 tiles to exchange and confirm, **Then** those tiles are
   returned to the bag, the bag is reshuffled, the player draws an equal number of new
   tiles, and the turn ends.
6. **Given** the bag holds fewer than 7 tiles, **When** the player opens the exchange
   action, **Then** the exchange action is disabled with an explanation that exchange
   requires a full bag.
7. **Given** the active player has used a blank tile, **When** they place it,
   **Then** they are prompted to choose which letter the blank represents before the move
   can be submitted; that assignment is locked for the rest of the game.
8. **Given** the opponent is viewing the game, **When** the active player commits a move,
   **Then** the opponent's view updates with the played tiles, the move's score, and the
   move history entry within 2 seconds.

---

### User Story 3 - Endgame and final scoring (Priority: P1)

A game ends correctly: when the bag is empty and a player plays their last tile, or when both
players consecutively pass the configured number of times. Final scores are computed
including unplayed-tile penalties and the last-tile bonus. Both players see a clear endgame
screen with winner, final scores, and a move history.

**Why this priority**: Without endgame, a "game" never finishes — it cannot be celebrated,
saved as a result, or replayed. P1 is incomplete until results are real.

**Independent Test**: Play a contrived game to its terminal condition (or seed an in-progress
state near termination); verify the system applies endgame scoring per Scrabble-style rules
and shows the result screen.

**Acceptance Scenarios**:

1. **Given** the bag is empty and the active player plays their last tile,
   **When** the move is committed, **Then** the game ends; remaining opponent rack tile
   values are subtracted from the opponent's score and added to the player who went out
   (last-tile bonus), and an endgame screen appears for both players.
2. **Given** both players pass or exchange (without successfully playing) for 6 consecutive
   half-turns (3 each), **When** the 6th consecutive scoreless turn occurs, **Then** the
   game ends; each player has the value of their remaining rack tiles subtracted from their
   score (no transfer), and the endgame screen appears.
3. **Given** the game has ended, **When** either player views the endgame screen,
   **Then** they see: winner (or tie), each player's final score, move-by-move history,
   game duration, and a "Back to home" / "Rematch" affordance.
4. **Given** the game has ended, **When** either player tries to take any in-game action
   (place tile, submit, pass, exchange, challenge), **Then** the action is disabled.

---

### User Story 4 - Per-turn timers (Priority: P2)

The match host chooses a per-turn timer at game creation: 30 seconds, 1 minute, or 2 minutes.
Both players see a synchronized countdown for the active player's turn. When the timer
expires the turn is automatically forfeited as a pass.

**Why this priority**: Adds competitive pacing and matches the Xbox Scrabble feel. Without
it the game still functions (untimed); with it, games stay lively.

**Independent Test**: Set timer to 30s, start a game, do not act on a turn, observe both
clients tick down to zero in sync (within ±0.5s) and a forced pass recorded.

**Acceptance Scenarios**:

1. **Given** a game is created with a 30s/1min/2min timer setting, **When** play starts,
   **Then** every turn's countdown begins at the configured value and is displayed on both
   clients.
2. **Given** an active turn timer, **When** more than 0.5s of skew develops between the two
   clients' displays, **Then** the system corrects display to within 0.5s of authoritative
   server time at the next sync.
3. **Given** the active player's timer reaches zero with no submitted move, **When** the
   timer expires, **Then** the system automatically records the turn as a pass, refills
   nothing, and passes the turn to the opponent.
4. **Given** the timer is approaching expiration, **When** less than 5 seconds remain,
   **Then** the timer adopts an "urgent" visual treatment (color/animation) on both
   clients.
5. **Given** the active player submits a move before the timer expires, **When** the move
   is committed, **Then** the timer for the next turn resets to the configured value for
   the next player.

---

### User Story 5 - Challenge window (3-second window) (Priority: P2)

After the active player submits a move, the opponent has a 3-second window to challenge.
If challenged, the disputed word(s) are validated against the configured dictionary. If any
challenged word is invalid, the move is fully reversed and the player who played loses their
turn. If all challenged words are valid, the challenger loses their next turn (penalty for
losing the challenge). Both players see the challenge state and outcome clearly.

**Why this priority**: Authentic Xbox Scrabble feel; without it the game is still playable
but not faithful.

**Independent Test**: Player A submits a real word; opponent presses "Challenge" within 3s;
opponent presses "Challenge" on a fake word; verify both outcomes resolve per rules and the
UI clearly explains what happened.

**Acceptance Scenarios**:

1. **Given** the active player has just submitted a move, **When** the opponent's view
   updates, **Then** a "Challenge" button appears with a 3-second countdown indicator,
   and turn progression is paused until the window closes or a challenge is resolved.
2. **Given** the 3-second window elapses with no challenge, **When** time expires,
   **Then** the move is locked as final and play proceeds to the opponent's turn.
3. **Given** the opponent presses "Challenge" within the window and at least one played
   word is not in the dictionary, **When** the challenge resolves, **Then** the played
   tiles return to the player's rack, the score for the move is reverted, the player loses
   that turn, and the move history shows the move with a "challenged — invalid" label.
4. **Given** the opponent presses "Challenge" and all played words are in the dictionary,
   **When** the challenge resolves, **Then** the move stands and is locked, the move
   history shows the move with a "challenged — valid" label, and the challenger forfeits
   their next turn.
5. **Given** a challenge is in progress, **When** either player views the game,
   **Then** the challenge state, the words being checked, and (after resolution) the
   outcome with reasoning are visible and accessible from move history.

---

### User Story 6 - Reconnection and resume (Priority: P2)

A player can lose their connection (close the tab, lose Wi-Fi, switch networks) and return
to find their game intact. Reconnection restores board state, racks (their own only), score,
turn, timer remaining, and any pending challenge. The other player sees a "opponent
disconnected" indicator while it lasts.

**Why this priority**: Real internet is unreliable. Without resume, a momentary blip ends a
game; this protects the experience but the game can ship with limited tolerance first.

**Independent Test**: Start a game, mid-turn close the active player's browser tab, reopen
within 60 seconds, verify exact restoration of state including remaining timer.

**Acceptance Scenarios**:

1. **Given** a player is signed in and was in an in-progress game, **When** they revisit
   the site (any device, any session), **Then** the home view shows their in-progress
   games and they can rejoin with one click.
2. **Given** a player rejoins an in-progress game, **When** the game view loads,
   **Then** the board, both players' scores, the active player's timer (with correct
   remaining time), the move history, and the player's own rack are all restored.
3. **Given** Player A is disconnected while it is their turn, **When** the disconnection
   exceeds 5 seconds, **Then** Player B's view shows "Opponent disconnected — turn timer
   continues" and the turn timer continues to count down.
4. **Given** Player A disconnects mid-tentative-placement (uncommitted tile placement),
   **When** they reconnect within their turn, **Then** their tentative placements are
   either restored or cleared (clearing is acceptable) — but committed game state is never
   lost.
5. **Given** a player disconnects during a challenge window, **When** they reconnect,
   **Then** the challenge window state and remaining time are correctly restored on their
   client.

---

### User Story 7 - Polished feedback and visual quality (Priority: P3)

The interface communicates whose turn it is, time pressure, last move played, score deltas,
challenge outcomes, invalid-move reasons, and game-state transitions through clear, modern
visual feedback. Desktop is fully usable; mobile is acceptably usable (touch-friendly,
readable).

**Why this priority**: The product can technically run with minimal styling, but the user
specifically wants polish and Xbox-Scrabble-feel. This story groups UI quality work that
spans all earlier stories.

**Independent Test**: Heuristic walkthrough on desktop and on a mid-size mobile viewport
confirms turn ownership, timer urgency, last move highlight, and challenge state are all
unambiguous within 1 second of glance.

**Acceptance Scenarios**:

1. **Given** the game is in progress, **When** a player views the screen,
   **Then** within 1 second they can identify whose turn it is and how much time remains.
2. **Given** the most recent move was just committed, **When** either player views the
   board, **Then** the tiles played in the last move are visually highlighted for at least
   3 seconds after commit (or until the next move).
3. **Given** the active player attempts an invalid placement, **When** they try to submit,
   **Then** the rejection message names the specific reason (e.g., "Tiles must form a
   single connected line", "First word must cover the center star", "ZZQX is not in the
   dictionary") and the offending tiles are visually marked.
4. **Given** a challenge is resolved, **When** the result is shown,
   **Then** the outcome ("invalid — move reversed" / "valid — challenger loses next
   turn") is shown with the disputed word(s) highlighted in the move history.
5. **Given** a user opens the game on a phone-sized viewport (≥360px wide),
   **When** they interact with the board and rack, **Then** all primary actions (place,
   submit, recall, shuffle, pass, exchange, challenge) are reachable without horizontal
   scrolling and tap targets are at least 40×40 px.

---

### Edge Cases

- **First move not on center star**: blocked with explicit message before submission.
- **Placement not in a single straight line**: blocked.
- **Placement leaves gaps without connecting through existing tiles**: blocked.
- **Placement disconnected from existing tiles after the first move**: blocked.
- **Move forms a non-dictionary word**: not blocked at submission time (Scrabble allows
  it, it is the opponent's job to challenge); resolved only via challenge.
- **Blank tile assignment never made**: submission blocked.
- **Multiple words formed by single move**: all are scored; all are subject to challenge.
- **Bingo (all 7 rack tiles played in one move)**: 50-point bonus added.
- **Bag has 0–6 tiles**: exchange disabled.
- **Bag empties during a move's refill**: rack is partially refilled with whatever
  remains.
- **Both players consecutively pass enough times**: game ends with no-transfer penalty
  scoring.
- **Player attempts to challenge after the 3-second window**: button is disabled / no-op.
- **Two challenges raced**: only one can be active; first received wins; the other shows
  a "challenge already resolved" state.
- **Active player closes tab during their own turn**: their timer continues; on expiry
  the forced pass applies.
- **Both players disconnect simultaneously**: game persists; the active player's timer
  continues per A-010 (timer-continues policy).
- **Opponent never returns**: an abandoned-game policy applies (see FR-046).
- **Same account signed in on two devices**: the latest device takes the active session;
  earlier device sees "you're now signed in elsewhere" and is read-only or signed out.
- **Invite link reused after a game has started**: rejected with clear message.
- **Public game discovery / random matchmaking**: out of scope for v1 (invite-only only).
- **Dictionary file missing or unreadable at runtime**: server returns a clear error and
  blocks new game creation that depends on the missing dictionary; existing games
  continue.
- **Network adversary tampers with timer / move payloads**: server is authoritative;
  client cannot fabricate moves, scores, or timer state.
- **Player's clock is wrong**: timer countdowns are server-driven; client clock is not
  trusted.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & Accounts

- **FR-001**: System MUST allow a visitor to create an account using a low-friction
  method (email magic link by default — see Assumptions A-001).
- **FR-002**: System MUST authenticate users for every state-changing action; no game
  action MAY succeed without a valid authenticated session.
- **FR-003**: Users MUST have a persistent display name visible to opponents.
- **FR-004**: System MUST allow a user to sign out, ending all in-flight sessions for
  that account on that device.

#### Game lifecycle

- **FR-010**: System MUST allow an authenticated user to create a new game with these
  settings: per-turn timer (30s | 1min | 2min | none), dictionary source (default |
  choose from configured list), visibility (invite-only).
- **FR-011**: System MUST generate a shareable invite link/code per created game.
- **FR-012**: System MUST allow a second authenticated user to join a game via invite,
  but MUST reject joins to games that are full, started, or completed.
- **FR-013**: System MUST persist a list of in-progress games per user and allow them to
  rejoin from a "your games" view.
- **FR-014**: System MUST randomly determine first turn at game start.
- **FR-015**: System MUST surface waiting/lobby, in-game, reconnect, and endgame states
  with distinct UI treatments.

#### Core gameplay rules

- **FR-020**: System MUST initialize each game with the standard 100-tile English letter
  distribution and standard letter point values (default — overridable per dictionary
  configuration).
- **FR-021**: System MUST initialize a 15×15 board with the standard premium-square
  layout (DL/TL/DW/TW + center star).
- **FR-022**: System MUST deal 7 tiles to each player at game start and refill each
  player's rack to 7 after every move that consumes tiles, drawing from the bag.
- **FR-023**: System MUST enforce that the first move covers the center star and that
  all subsequent moves form a single contiguous line connecting to existing tiles.
- **FR-024**: System MUST score each submitted move per Scrabble-style rules, including
  letter values, premium squares (only on first use), all newly formed cross-words, and
  a 50-point bonus for playing all 7 rack tiles in a single move.
- **FR-025**: System MUST require blank tiles to be assigned a letter at placement time
  and lock that assignment for the remainder of the game.
- **FR-026**: System MUST allow the active player to place tiles tentatively, recall any
  tentative tile, rearrange tentative placements, and shuffle the rack — all without
  ending the turn.
- **FR-027**: System MUST allow the active player to pass the turn.
- **FR-028**: System MUST allow the active player to exchange 1–7 of their tiles for new
  tiles, but only when the bag holds at least 7 tiles; exchange ends the turn.
- **FR-029**: System MUST end the game when (a) the bag is empty and a player plays out
  their rack, or (b) 6 consecutive scoreless turns (pass or exchange) occur.
- **FR-030**: System MUST apply endgame scoring: in case (a), each opponent's remaining
  rack value is subtracted from their score and added to the player who went out; in
  case (b), each player's remaining rack value is subtracted from their own score (no
  transfer).
- **FR-031**: System MUST treat the player with the higher final score as the winner;
  equal scores produce a tie.

#### Multiplayer synchronization

- **FR-040**: System MUST treat the server as the authoritative source for board state,
  scores, racks (per-player), bag contents, turn ownership, timer remaining, challenge
  state, and game phase.
- **FR-041**: System MUST propagate every committed state change to all connected
  clients in under 2 seconds at the 95th percentile.
- **FR-042**: System MUST never expose one player's rack tiles to the other player or
  to any unauthenticated viewer.
- **FR-043**: System MUST reject any client-submitted action that violates rules, turn
  ownership, or game phase, with a clear error.
- **FR-044**: System MUST allow a player to disconnect and reconnect at any time
  without loss of committed state, restoring board, scores, own rack, timer remaining,
  move history, and challenge state on reconnect.
- **FR-045**: System MUST display "opponent disconnected" status to the other player
  when a peer's connection has been lost for more than 5 seconds.
- **FR-046**: System MUST retain in-progress games for at least 7 days from last
  activity; abandoned games beyond 7 days MAY be auto-closed with a forfeit by the
  inactive party. *(Default — overridable.)*

#### Timers

- **FR-050**: System MUST enforce per-turn timers using server-authoritative time.
- **FR-051**: System MUST display the active turn's remaining time on both clients with
  display-skew not exceeding 0.5 seconds at steady state.
- **FR-052**: System MUST automatically pass the active player's turn when their timer
  reaches zero, recording it as a forced pass in the move history.
- **FR-053**: System MUST reset the timer to the configured per-turn value at the start
  of each new turn.

#### Challenge flow

- **FR-060**: System MUST open a 3-second challenge window after every committed move,
  during which the opponent (and only the opponent) MAY challenge.
- **FR-061**: System MUST pause turn progression during the challenge window and during
  challenge resolution.
- **FR-062**: System MUST validate every word formed by the challenged move against the
  game's configured dictionary.
- **FR-063**: System MUST, on a successful challenge (any formed word invalid), revert
  all effects of the challenged move (tiles, score, rack refill) and end the player's
  turn with no score for the move.
- **FR-064**: System MUST, on a failed challenge (all formed words valid), keep the
  move intact and forfeit the challenger's next turn.
- **FR-065**: System MUST visually communicate challenge state — open window, in
  progress, outcome — to both players, and record the outcome with disputed word(s) in
  the move history.

#### Dictionary

- **FR-070**: System MUST validate words against a configurable word list; a default
  word list MUST be packaged with the application and MUST be free of trademarked or
  proprietary content. *(See Assumptions A-003 on substitute dictionary.)*
- **FR-071**: System MUST allow the dictionary source to be selected at game creation
  from a configured list of available dictionaries.
- **FR-072**: System MUST treat dictionary lookups as case-insensitive and ASCII-letter
  based.

#### UI/UX

- **FR-080**: System MUST display, at all times during gameplay: the board, both
  players' scores, both players' display names, the active player indicator, the active
  timer (if enabled), the local player's rack, and the move history.
- **FR-081**: System MUST visually distinguish tentative placements from committed
  tiles.
- **FR-082**: System MUST highlight tiles played in the most recent committed move for
  at least 3 seconds after commit (or until the next move).
- **FR-083**: System MUST provide explicit, plain-language reasons when a submission is
  blocked.
- **FR-084**: System MUST be usable on desktop (≥1024px) at full functionality and on
  mobile (≥360px) with all primary actions reachable without horizontal scrolling and
  tap targets ≥40×40 px.

#### Public-repo & secret hygiene

- **FR-090**: No secret value MUST appear in source control at any time. All secrets
  MUST be supplied via environment variables.
- **FR-091**: A `.env.example` file MUST list every required environment variable with
  safe placeholder values, and MUST be kept in sync with code.
- **FR-092**: Public-safe environment variables (those exposed to the browser) MUST be
  visually and structurally separated from server-only secrets in code and docs.
- **FR-093**: Setup documentation MUST allow a new contributor to run the app locally
  using only the public repo and their own externally-provisioned credentials (no
  out-of-band secret sharing required).
- **FR-094**: Deployment configuration MUST target Vercel, with database, auth, and
  realtime provisioned via Supabase. Setup docs MUST cover the GitHub → Vercel →
  Supabase path.

#### Security & authorization

- **FR-100**: All game state mutations MUST be authorized server-side against the
  acting user's identity and the game's participant list.
- **FR-101**: Server logs MUST NOT include secret values, raw session tokens, or
  player rack contents.
- **FR-102**: User-facing error messages MUST NOT leak internal identifiers, stack
  traces, or schema details in production.

### Key Entities

- **User Account**: a uniquely identified, authenticated player. Holds display name,
  authentication identity, and references to games they participate in.
- **Game**: a single match instance. Holds settings (timer, dictionary, visibility),
  participant list, current phase (lobby / in-progress / completed / abandoned), board
  state, bag contents, current turn, and challenge state.
- **Player Slot**: per-game per-user binding. Holds that player's rack, score, and
  per-game role (host vs. joiner).
- **Move**: an immutable record of a committed action (place, pass, exchange, forced
  pass, challenged-invalid, challenged-valid). Holds tiles played, score awarded,
  resulting board diff, and challenge outcome (if any).
- **Bag**: server-only collection of remaining tiles for the game; never exposed to
  clients except as a remaining-count.
- **Dictionary**: a named, versioned word list. Multiple dictionaries can be configured;
  one is selected per game.
- **Invite**: a shareable token tied to a game's lobby state, single-use to the second
  player slot.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two friends can go from the home page to a started game in under 3 minutes
  (combined account creation + lobby + start), measured end-to-end on a typical broadband
  connection.
- **SC-002**: Two players can complete a full match end-to-end (sign-in, full game,
  endgame screen) without manual intervention, page reload, or external coordination, on
  desktop and on a phone-sized viewport.
- **SC-003**: After a committed move, the opponent's view reflects the new state within
  2 seconds at the 95th percentile.
- **SC-004**: Per-turn timer displays on the two clients agree to within 0.5 seconds at
  steady state.
- **SC-005**: A player who closes their browser tab during a game and returns within
  10 minutes finds the game restored exactly — board, scores, own rack, remaining timer,
  move history — in 100% of trials.
- **SC-006**: Challenge resolution (window open → result shown) completes within
  5 seconds total in 95% of trials.
- **SC-007**: 0 secrets appear in repository history at any commit (verifiable by an
  automated secret-scan baseline).
- **SC-008**: A new contributor with no prior context can clone the public repo, follow
  setup docs, and reach a locally running game lobby in under 30 minutes using only their
  own provisioned credentials.
- **SC-009**: 95% of submission rejections name a specific, plain-language reason
  ("first word must cover the center star", "tiles must form a single line",
  "no tiles placed", "blank not assigned", etc.) — measured by a curated set of
  invalid-move test cases.
- **SC-010**: Game endings (out-of-tiles win and 6-consecutive-pass termination) are
  scored correctly per Scrabble-style endgame rules in 100% of test scenarios.

## Risks

- **R-001 — Dictionary licensing**: TWL and SOWPODS are proprietary. Using them risks
  takedowns. *Mitigation*: ship with a permissively licensed default word list and make
  the dictionary source configurable; document the legal context in setup docs.
- **R-002 — Trademark / look-and-feel**: "Scrabble" is trademarked; the standard board's
  premium-square layout is a long-established design but visual identity must avoid
  Hasbro/Mattel/Xbox-specific assets. *Mitigation*: original visual identity, rule
  language ("Scrabble-style" not "Scrabble"), no copying of artwork.
- **R-003 — Real-time on Vercel**: Vercel serverless does not natively host long-lived
  sockets. *Mitigation*: use Supabase Realtime (or equivalent) channel for state push;
  treat the function tier as stateless and the realtime tier as the live channel.
- **R-004 — Timer drift / authority**: Trusting client clocks lets cheaters extend
  turns. *Mitigation*: server is authoritative; clients only render projections of
  server time.
- **R-005 — Public-repo secret leak**: A single accidental commit of a `.env` rotates
  the entire deployment. *Mitigation*: pre-commit secret scan, `.gitignore` covers all
  `.env*`, mandatory `.env.example`, and FR-090 enforced in review.
- **R-006 — Cheating via DOM inspection of opponent rack**: If the opponent's rack is
  ever sent to the client, browser tools can reveal it. *Mitigation*: server never
  sends another player's rack to a client (FR-042).
- **R-007 — Reconnection edge cases**: Mid-challenge or mid-tentative-placement
  reconnects are easy to get wrong. *Mitigation*: explicit acceptance scenarios in US6;
  integration tests for these paths.
- **R-008 — Mobile usability**: Tile drag on small touchscreens is a known UX pitfall.
  *Mitigation*: mobile-specific tap-to-place fallback in addition to drag.

## Assumptions

- **A-001 — Authentication method**: The product uses email magic link via Supabase
  Auth as the default sign-up/sign-in method, with optional Google OAuth as a future
  addition. Rationale: lowest friction for non-technical friends; well-supported on
  Vercel + Supabase.
- **A-002 — Tile distribution & values**: Standard English Scrabble distribution
  (100 tiles, 2 blanks, standard letter point values) is used as the default and is
  packaged with the dictionary configuration.
- **A-003 — Default dictionary**: A permissively licensed open word list (e.g., a
  derivative of the public-domain ENABLE list, or another freely-redistributable list)
  is packaged as the default. The actual dictionary file is configurable so the
  operator can swap in any word list they have rights to use.
- **A-004 — Player count**: v1 supports two-player matches only. The data model and
  state machine MUST accommodate 3–4 player matches without requiring schema changes;
  exposing 3–4 player matches in the UI is out of scope for v1.
- **A-005 — Game visibility**: v1 supports only invite-only (private) games. Public
  matchmaking and lobby browse are out of scope for v1.
- **A-006 — Spectators**: Out of scope for v1.
- **A-007 — Chat**: Out of scope for v1.
- **A-008 — Rematch / game series**: A "rematch" button on the endgame screen is a
  nice-to-have but the rematch lobby flow is out of scope for v1.
- **A-009 — Endgame — consecutive-pass threshold**: 6 consecutive scoreless half-turns
  (3 by each player) end the game. This matches standard Scrabble tournament rules.
- **A-010 — Disconnection — timer policy**: Timers continue counting during
  disconnects. This prevents stalling-as-strategy and matches the Xbox Scrabble feel.
- **A-011 — Same-account multi-device**: Latest signed-in device wins; earlier session
  becomes read-only/signed-out.
- **A-012 — Dictionary lookup correctness**: Words are validated as a strict membership
  check against the active dictionary. Definitions, etymology, and cross-references are
  out of scope.
- **A-013 — Browser support**: Latest two major versions of Chrome, Edge, Safari, and
  Firefox on desktop; latest two of mobile Safari and Chrome on mobile.
- **A-014 — Internationalization**: English only for v1.
- **A-015 — Hosting & data residency**: Vercel for the web tier, Supabase for auth +
  Postgres + realtime. Region selection is operator's choice; no data-residency
  guarantees are made in v1.

## Out of Scope (v1)

- Public matchmaking / random opponent
- Spectators
- In-game chat
- Three- and four-player matches in the UI
- Internationalization beyond English
- Mobile native apps (web only)
- Tournaments / brackets / leaderboards
- AI / single-player vs. computer
