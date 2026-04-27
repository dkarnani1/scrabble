# Quickstart — Local Development & Deployment

**Feature**: 001-scrabble-multiplayer  **Date**: 2026-04-27

This guide gets a new contributor from a fresh clone to a running game lobby in under
30 minutes (Success Criterion SC-008). It assumes the contributor has their own GitHub
account, can sign up for a free Supabase project, and has a Vercel account (free tier
is fine for development; the production deployment uses the operator's Pro account).

> Public-repo reminder: this guide MUST work without any out-of-band secret sharing.
> Every value below is either the contributor's own credential or a placeholder.

---

## Prerequisites

- Node.js 20.x and npm (or pnpm) installed.
- Git installed; you can clone `https://github.com/dkarnani1/scrabble.git` (read-only is
  fine — set up a fork if you want to push changes).
- A Supabase account with permission to create one new project on the free tier.
- A Vercel account linked to your GitHub.
- Optional: the [Supabase CLI](https://supabase.com/docs/guides/cli) for running
  migrations locally against your project.

---

## 1. Clone and install

```bash
git clone https://github.com/dkarnani1/scrabble.git
cd scrabble
npm install
```

---

## 2. Create your Supabase project

1. In the Supabase dashboard, **New project**. Pick any region; pick a strong DB
   password (it goes in your local env, not the repo).
2. Once provisioned, open **Project Settings → API** and copy:
   - `Project URL` → goes into `NEXT_PUBLIC_SUPABASE_URL`
   - `Publishable key` (the new `sb_publishable_...` key, not the legacy `anon` key) →
     goes into `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `Secret key` (or service-role key) → goes into `SUPABASE_SERVICE_ROLE_KEY`
3. Open **Project Settings → Database** and copy the **Connection string** (use the
   "Session" or "Pooler" connection per your preference) → goes into
   `SUPABASE_DATABASE_URL`.
4. Open **Authentication → Providers → Email** and ensure **Email** auth is enabled.
   Magic link is on by default.
5. Open **Authentication → URL Configuration** and add:
   - Site URL: `http://localhost:3000`
   - Additional Redirect URLs: `http://localhost:3000/auth/callback` (and the eventual
     Vercel preview/production URLs once you have them).

---

## 3. Configure local environment

```bash
cp .env.example .env.local
# then open .env.local in your editor
```

Fill in:

```dotenv
# Public — sent to the browser. Safe to expose.
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxx

# Server-only secrets — never sent to the browser, never committed.
SUPABASE_DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Cron protection (any random string ≥ 32 chars).
CRON_SECRET=$(openssl rand -hex 32)
```

> `.env.local` is gitignored. **Do not** check it in. The pre-commit hook runs a secret
> scan to catch accidents.

---

## 4. Apply database migrations

Using the Supabase CLI (recommended):

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Or run the migrations manually against your DB:

```bash
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0001_init.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0002_games.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0003_moves.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0004_invites.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0005_rls.sql
psql "$SUPABASE_DATABASE_URL" -f supabase/migrations/0006_realtime.sql
```

Then enable Realtime on the relevant tables in **Database → Replication** in the
Supabase dashboard (the migration `0006_realtime.sql` does this in code; verify in the
UI).

---

## 5. Build the dictionary asset (one time per machine)

The default dictionary is built deterministically from a public-domain source (R6 in
`research.md`). The committed file in `src/dictionary/default-list.txt` is the
authoritative built artifact; rebuilding is only needed if you're updating the source.

```bash
npm run dictionary:prepare
```

Verify:

```bash
npm run dictionary:verify    # confirms the file matches the expected hash
```

---

## 6. Run the app

```bash
npm run dev
```

Open `http://localhost:3000` in two different browsers (or one normal + one private
window). Sign in with two different email addresses. From browser A, create a game and
copy the invite link. Paste it in browser B and sign in with the second account. Both
should reach the lobby.

---

## 7. Run the tests

```bash
# Rules-engine unit tests (fastest; should be your inner loop)
npm run test:unit

# Server-action / persistence integration tests
npm run test:integration

# Playwright end-to-end with screenshot capture
# (requires the dev server to be runnable; the playwright config will start it)
npm run test:e2e
```

Playwright artifacts are written to `playwright-report/` and `test-results/`, which are
gitignored. Screenshots for documented checkpoints are captured under
`tests/e2e/__screenshots__/` (committed) — use `npm run test:e2e:update-snapshots` to
refresh them intentionally.

---

## 8. Deploying to Vercel

1. Push your fork (or the canonical repo) to GitHub.
2. In Vercel, **Add New → Project** and import the GitHub repository.
3. Set environment variables in **Project Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` (Production, Preview, Development)
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Production, Preview, Development)
   - `SUPABASE_DATABASE_URL` (Production, Preview)
   - `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview) — **server-only**, never exposed
   - `CRON_SECRET` (Production, Preview)
4. Configure Vercel Cron in `vercel.json` (committed) — schedule
   `/api/cron/timer-tick` at `*/1 * * * *` (every minute) for the timer sweep.
5. Deploy.
6. Back in Supabase **Authentication → URL Configuration**, add the production and
   preview URLs to the allowed redirect URLs.

---

## Repo hygiene checklist (run before every PR)

- [ ] No real secret in any committed file (the pre-commit hook will catch most).
- [ ] `.env.example` lists every var your code reads from `process.env`.
- [ ] `npm run lint` passes (includes layer-boundary rules — `src/rules/**` cannot
      import from `react`, `next/*`, `@supabase/*`).
- [ ] `npm run typecheck` passes.
- [ ] `npm run test:unit` passes.
- [ ] If you touched gameplay rules, you added or updated rules-engine unit tests.
- [ ] If you touched a user-visible flow, you added or updated a Playwright spec with
      screenshot coverage.

---

## Troubleshooting

- **"Auth callback redirects to localhost in production"** — you forgot to add the
  production URL to Supabase **Auth → URL Configuration**.
- **"Game updates don't push to the opponent"** — Realtime not enabled on `games` /
  `moves` / `players`. Re-run migration `0006_realtime.sql` and verify in
  Supabase **Database → Replication**.
- **"My move was rejected with `state-conflict{not-your-turn}`"** — your client and
  server disagree about whose turn it is, usually because a Realtime event was missed.
  Hard-reload the page; the durable state is the source of truth.
- **"Timers drift between two browsers"** — confirm your machines have NTP on. The
  client renders countdowns from the server reference, but a wildly wrong local clock
  can still bias display by a fraction of a second; the server is always right at next
  state push.
- **"`gitleaks` flagged a false positive in a fixture"** — add the file to
  `.gitleaks.toml`'s allowlist with a specific regex; do not blanket-disable.

---

## What's next

- For day-to-day work: `/speckit-tasks` will turn the spec + plan into an executable
  task list under `specs/001-scrabble-multiplayer/tasks.md`.
- For longer-term: see the project Constitution at `.specify/memory/constitution.md`
  for the principles that shape every PR review.
