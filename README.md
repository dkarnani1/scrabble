# Scrabble

Online multiplayer Scrabble-style web game. Two authenticated players, full official-style
rules, server-authoritative state, configurable per-turn timers, 3-second challenge
window, and reconnection support. Built on Next.js 15 (App Router) + Supabase
(Auth + Postgres + Realtime), deployed on Vercel.

This repository is **public**. No real secret values are committed. See
`.env.example` for the full list of environment variables and use placeholder values
during development.

## Local development MCP setup

This repo ships a project-scoped `.mcp.json` that wires three MCP servers into Claude
Code: **shadcn** (registry browsing/install), **21st.dev Magic** (component generation),
and **Playwright** (browser screenshots against the running dev server).

The Magic MCP requires an API key. Get one from <https://21st.dev>, then export it in
your shell **before launching Claude Code** so the spawned MCP process can read it:

```powershell
# PowerShell — current session
$env:TWENTYFIRST_API_KEY = "your-key-here"

# Persist across sessions (Windows User scope)
[System.Environment]::SetEnvironmentVariable("TWENTYFIRST_API_KEY", "your-key-here", "User")
```

```bash
# bash / zsh
export TWENTYFIRST_API_KEY="your-key-here"
```

The other two servers need no configuration. After exporting the key, restart Claude Code
and approve the project-scoped servers when prompted. `.mcp.json` is committed because
the key is read from the environment, never hardcoded.

## Quick start

Full instructions, including Supabase project setup, env wiring, migrations, dictionary
build, and Vercel deployment:

[`specs/001-scrabble-multiplayer/quickstart.md`](specs/001-scrabble-multiplayer/quickstart.md)

## Project documentation

- Specification: [`specs/001-scrabble-multiplayer/spec.md`](specs/001-scrabble-multiplayer/spec.md)
- Plan: [`specs/001-scrabble-multiplayer/plan.md`](specs/001-scrabble-multiplayer/plan.md)
- Data model: [`specs/001-scrabble-multiplayer/data-model.md`](specs/001-scrabble-multiplayer/data-model.md)
- Contracts: [`specs/001-scrabble-multiplayer/contracts/`](specs/001-scrabble-multiplayer/contracts/)
- Constitution (governing principles): [`.specify/memory/constitution.md`](.specify/memory/constitution.md)

## Licensing

The project ships with a **public-domain** dictionary (ENABLE-derived) by default. Do
not commit proprietary word lists (TWL, SOWPODS / Collins) — these are licensed and would
make the public repository non-compliant. See `research.md` (R6) for how to drop in a
licensed dictionary at deploy time.

No trademarked names, branded artwork, or copyrighted assets associated with the
commercial Scrabble product appear in this codebase or its rendered UI.

## License

MIT. See `LICENSE` (TBD).
