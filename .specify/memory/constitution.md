<!--
SYNC IMPACT REPORT
Version change: (template, unversioned) → 1.0.0
Bump rationale: MAJOR — initial ratification; concrete principles replace template placeholders.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Production-First & Vercel-Native
  - [PRINCIPLE_2_NAME] → II. Security-First & Public-Repo Safety (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Layered Architecture & Rule-Engine Separation
  - [PRINCIPLE_4_NAME] → IV. Authentic Scrabble Gameplay
  - [PRINCIPLE_5_NAME] → V. Multiplayer-First Design
  - (added)            → VI. Test-First for Core Rules (NON-NEGOTIABLE)
  - (added)            → VII. UI/UX Quality

Added sections:
  - Security & Operations Constraints (replaces [SECTION_2_NAME])
  - Development Workflow & Quality Gates (replaces [SECTION_3_NAME])

Removed sections: none

Templates requiring updates:
  - ✅ .specify/memory/constitution.md (this file)
  - ⚠ .specify/templates/plan-template.md — Constitution Check section is a placeholder ("[Gates determined based on constitution file]"); recommend populating with concrete gates derived from Principles I–VII before next /speckit-plan run.
  - ✅ .specify/templates/spec-template.md — no changes required; existing structure is compatible.
  - ✅ .specify/templates/tasks-template.md — no changes required; testing tasks are optional in template, and per-feature tasks must reflect Principle VI when core-rule work is involved.
  - ⚠ README.md / docs/quickstart.md — not yet present; create when project scaffolding lands so they reflect Principles I, II, V.

Deferred TODOs: none.
-->

# Scrabble Web Game Constitution

## Core Principles

### I. Production-First & Vercel-Native

The project targets Vercel as its sole deployment target from day one. Every architectural,
runtime, and dependency decision MUST be compatible with Vercel's hosting model (serverless
functions, edge runtime where applicable, managed databases, and supported real-time
primitives). Local development MUST mirror the Vercel runtime contract closely enough that
"works locally" implies "works on Vercel". Features that cannot run on Vercel within the
user's Pro plan are out of scope unless explicitly approved as an exception in this
Constitution.

**Rationale**: Avoids late-stage rewrites and ensures the live, public-facing build is
always the source of truth, not a local-only happy path.

### II. Security-First & Public-Repo Safety (NON-NEGOTIABLE)

The repository is public. No secret value (API key, database URL with credentials, signing
key, OAuth client secret, session secret, etc.) MAY be committed at any time. All secrets
MUST be supplied via environment variables, with names — not values — referenced in code
and documentation. `.env*` files MUST be gitignored except for `.env.example`, which MUST
list every required variable with safe placeholder values. Public-safe variables (those
prefixed for client exposure, e.g. `NEXT_PUBLIC_*`) MUST be visually and structurally
separated from server-only secrets in code, documentation, and example files. Any commit
that introduces a real secret is a P0 incident: the secret MUST be rotated immediately and
the commit history scrubbed.

**Rationale**: A public repo plus production credentials is the single highest-risk
failure mode for this project. This rule is bright-line, not advisory.

### III. Layered Architecture & Rule-Engine Separation

The codebase MUST maintain clear boundaries between five layers, with dependencies flowing
inward only:

1. **Core rules engine** — board state, tile placement validation, scoring, dictionary
   lookup, challenge resolution, timers, turn handling, endgame rules. MUST be pure,
   deterministic, framework-free, and have no dependency on UI, network, persistence, or
   auth. Same input → same output, always.
2. **Multiplayer game orchestration** — turn synchronization, reconnection, lobby/game
   lifecycle, real-time eventing.
3. **Persistence** — durable game state, user accounts, match history.
4. **Authentication** — identity, session, authorization checks.
5. **UI** — rendering, input, animations, accessibility.

The rules engine MUST be importable and testable without booting any server, browser, or
database. Cross-layer shortcuts (e.g. UI reading the database directly, rules engine
calling a network API) are violations and MUST be rejected in review.

Architecture SHOULD remain as simple as the requirements allow. Concurrent online games
MUST be supported, but premature scaling abstractions (sharding, microservices, custom
queues) are violations until justified by measured need.

**Rationale**: The rules engine is the asset that must outlive every framework choice;
isolating it makes it testable, portable, and trustworthy.

### IV. Authentic Scrabble Gameplay

Gameplay MUST match official Scrabble-style rules and the Xbox Scrabble-style play
experience as closely as is legally practical. This includes: tile distribution and bag
behavior, blank tile handling, turn-based play with valid pass/exchange/play actions,
official scoring (letter values, premium squares, bingo bonus), word validation against a
configured dictionary, the challenge window and challenge resolution flow, per-turn and
per-game timers, and proper endgame scoring (unplayed tile penalties, last-tile bonus).
Trademarked names, branded artwork, and copyrighted dictionaries MUST NOT be used; only
licensed or public-domain equivalents are permitted.

**Rationale**: "Scrabble-like" without rule fidelity is a different game; players will
notice and the product will lose credibility.

### V. Multiplayer-First Design

Online multiplayer is a baseline architectural assumption, not a later feature. The system
MUST support: multiple authenticated users, creating games, joining games (by invite or
matchmaking), reconnecting to ongoing matches after disconnects without losing turn state,
and clean turn synchronization across clients. Single-player or hot-seat modes, if added,
MUST be implemented as degenerate cases of the multiplayer flow — not as a separate
parallel codepath.

**Rationale**: Retrofitting multiplayer onto a single-player core is the standard way
these projects fail; making it the foundation prevents that.

### VI. Test-First for Core Rules (NON-NEGOTIABLE)

For the core rules engine (Principle III, layer 1), tests MUST be written before
implementation. Each rule, edge case, and scoring scenario MUST have a failing test before
the corresponding code is written. The full test pyramid is required for the project as a
whole:

- **Unit tests**: rules and scoring — exhaustive, fast, deterministic.
- **Integration tests**: server endpoints, persistence, and multiplayer turn flows.
- **End-to-end tests (Playwright)**: full gameplay scenarios across two or more
  simulated clients. E2E tests MUST capture screenshots at key checkpoints (game
  creation, first move, challenge flow, endgame) so visual regressions and broken flows
  are diagnosable from CI artifacts alone.

Every implemented feature MUST ship with explicit acceptance criteria and validation
steps documented alongside it. Tests in non-rules layers (multiplayer, UI, persistence)
SHOULD be written before or alongside implementation but are not bound by the strict
test-first discipline that applies to the rules engine.

**Rationale**: Rule bugs in a board game are uniquely corrosive — players lose trust
instantly and permanently. Strict TDD on the rules engine is cheap insurance.

### VII. UI/UX Quality

The UI MUST be polished, modern, and intuitive. Gameplay interactions (tile drag/drop,
move confirmation, challenge prompts, timer display, turn indication, score updates)
MUST provide smooth animation and clear, immediate feedback. The interface MUST
communicate game state — whose turn it is, time remaining, last move played, score
delta, dictionary/challenge results — without requiring the user to hunt for it. Visual
polish is treated as a functional requirement, not decoration.

**Rationale**: For a game, the interface IS the product; a correct rules engine behind a
clumsy UI still feels broken.

## Security & Operations Constraints

- **Environment variables**: All secrets MUST be referenced by env var name in source and
  docs. A `.env.example` file MUST exist at the repo root listing every required variable
  with placeholder values; it MUST be kept in sync with actual code reads.
- **gitignore**: `.env`, `.env.local`, `.env.*.local`, and any equivalent files MUST be
  gitignored. `.env.example` MUST NOT be ignored.
- **Public vs. server variables**: Variables exposed to the browser (e.g. `NEXT_PUBLIC_*`
  or platform equivalents) MUST be limited to non-sensitive values and MUST be documented
  as client-visible. Server-only secrets MUST never appear in client bundles.
- **Authentication**: Account auth MUST use a production-grade provider or library
  (managed auth service, vetted library) with secure session handling. Hand-rolled
  password storage is prohibited.
- **Database & real-time**: Persistence and turn-sync infrastructure MUST be production-
  appropriate (managed Postgres, managed real-time service, or equivalent) and MUST run
  inside Vercel-compatible providers. Authorization MUST be enforced server-side on every
  state-changing call; client trust is not sufficient.
- **Logging & errors**: Server logs MUST NOT include secrets, full session tokens, or
  raw user passwords. User-facing error messages MUST NOT leak stack traces or internal
  identifiers in production builds.

## Development Workflow & Quality Gates

- **Specs and plans**: Non-trivial features MUST go through the Spec Kit flow
  (`/speckit-specify` → `/speckit-clarify` (when needed) → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`). Acceptance criteria from the spec MUST be the
  basis for the feature's tests.
- **Constitution Check gate**: Before Phase 0 of any plan, the plan MUST verify
  compliance with Principles I–VII. Violations MUST be either resolved or recorded in the
  plan's Complexity Tracking section with an explicit justification and a rejected
  simpler alternative; unjustified violations MUST block the plan.
- **Test gates**: Core-rules changes MUST land with new or updated unit tests in the
  same change. Multiplayer or server-flow changes MUST land with integration test
  coverage. User-visible gameplay changes MUST be exercised by at least one Playwright
  scenario with screenshot checkpoints.
- **Public-safe repo gate**: Reviewers MUST verify no real secret values are added,
  `.env.example` is current, and any new env var read in code is documented.
- **Vercel deployability gate**: Reviewers MUST confirm the change runs on Vercel —
  no Node-only APIs in edge contexts, no filesystem writes at runtime in serverless
  contexts, and any new dependency is compatible with the deployed runtime.
- **Documentation**: Setup docs (README + quickstart) MUST give a new contributor a
  working local environment using only `.env.example` and public information; no
  out-of-band secret sharing should be required to run the app locally.

## Governance

This Constitution supersedes ad-hoc conventions and prior practices. All pull requests,
code reviews, and plans MUST verify compliance with the Core Principles and the
Security & Operations and Development Workflow sections. Reviewers MUST treat
NON-NEGOTIABLE principles (II and VI) as bright-line rules: violations block merge.

**Amendment procedure**: Changes to this Constitution are made via the
`/speckit-constitution` workflow, which updates this document, runs the consistency
propagation checklist against `.specify/templates/*` and project docs, and emits a Sync
Impact Report. Amendments MUST be reviewed before merge.

**Versioning policy**: Semantic versioning applies.

- **MAJOR**: Backward-incompatible governance changes, or removal/redefinition of an
  existing principle.
- **MINOR**: A new principle or section is added, or guidance is materially expanded.
- **PATCH**: Clarifications, wording fixes, or non-semantic refinements that do not
  change what is required of contributors.

**Compliance review**: Each plan's Constitution Check is the routine compliance review
point. Standalone audits MAY be performed at any time; findings MUST be tracked as
issues until resolved.

**Version**: 1.0.0 | **Ratified**: 2026-04-27 | **Last Amended**: 2026-04-27
