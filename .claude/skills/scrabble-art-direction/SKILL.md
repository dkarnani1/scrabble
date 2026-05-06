---
name: scrabble-art-direction
description: Load whenever generating, restyling, or installing UI components for the Scrabble game. Pins the visual identity (palette, typography, motion, materials) so generated code matches the existing design system.
---

# Scrabble Art Direction

This skill is the source of truth for the visual identity of the Scrabble game. Any UI work — generating new components (via Magic MCP, shadcn registry, hand-written), restyling existing components, or installing third-party UI — MUST conform to the rules below.

## Palette

Pulled verbatim from `tailwind.config.ts`. **All new components MUST use these tokens.** Do not introduce raw hex values, do not import shadcn defaults like `slate`/`zinc`/`stone`, and do not invent new color families without first proposing them in this file.

### Board (felt)

| Token        | Hex       | Use                                                |
| ------------ | --------- | -------------------------------------------------- |
| `board-base` | `#f5efe1` | Empty squares; default page background underlay    |
| `board-line` | `#d6cdb6` | Grid lines, default borders, neutral resting fills |
| `board-star` | `#b88a4a` | Center star; subtle ornamental accents             |

### Tile (wood)

| Token       | Hex       | Use                                            |
| ----------- | --------- | ---------------------------------------------- |
| `tile-face` | `#f6e2b3` | Tile body fill; "warm neutral" surfaces        |
| `tile-edge` | `#a07a3b` | Tile bevel/border; primary brand accent        |
| `tile-ink`  | `#2c1f0e` | Tile letter; primary text color on light fills |

### Premium squares

These are tuned for ≥ 4.5:1 contrast against their labels and are deliberately trademark-safe (no commercial Scrabble palette). Double = warm, triple = cool — this shape recognition is load-bearing for players, do not invert.

| Token        | Hex       | Meaning             |
| ------------ | --------- | ------------------- |
| `premium-dl` | `#9fc2dc` | Double letter score |
| `premium-tl` | `#356f9d` | Triple letter score |
| `premium-dw` | `#e9a8a8` | Double word score   |
| `premium-tw` | `#b83f3f` | Triple word score   |

## Typography

- Default sans: `var(--font-sans)` (set in `app/layout.tsx`). Do not override per-component.
- Score numbers and headings should reserve a **future display font** — for now, fall back to `font-semibold` with tighter tracking (`tracking-tight`) on the sans family. When a display font is wired up, it will be exposed as `font-display`; design components with that future class in mind so swaps are zero-effort.
- Body copy: 14–16 px. Avoid sub-12 px text outside the move-history meta row.

## Materials

- **Tiles look like beveled wood.** Warm gradient (lighter `tile-face` at top fading to a slightly darker shade), subtle inset highlight at the top edge, soft drop shadow when tentative or being dragged. Picked-up tiles read as physical objects, not flat chips.
- **Board looks like felt.** Slightly textured `board-base`, recessed grid lines (`board-line`), no harsh strokes.
- **Premium squares are inset, not flat.** Use a soft inner shadow + slightly darkened underlay to suggest the square is recessed and the tile sits on top of it. Premium _labels_ (DL / TL / DW / TW) appear only when the square is empty.

## Motion

- Use `motion` (Framer Motion). Already in the dependency tree; do not introduce a competing animation library.
- **Interactive feedback:** 150–250 ms `ease-out`. Hover, tap, focus.
- **Tile drops:** `spring` with moderate damping (~ 18) and stiffness (~ 220). Spring on commit, on rack reordering, and on board landings — never on layout reflow alone.
- **Layout transitions:** `LayoutGroup` + `motion.div` with `layout` for rack rearrangement and history-list growth.
- **Hard cap:** No animation longer than 600 ms. Single exception: endgame celebration in `app/(app)/games/[gameId]/result/`, where a longer choreographed sequence (≤ 2 s) is acceptable.
- Respect `prefers-reduced-motion`: collapse animations to instant cuts, keep state changes (still need to feel "settled," not jarring).

## Accessibility

These are non-negotiable. Verify before declaring any UI task complete.

- Keep all current ARIA roles in `src/ui/components/board/`, `rack/`, `controls/`, `feedback/`, `challenge/`, `play/`, `lobby/`, `moves/`, `timer/`.
- Keep the keyboard cursor in `src/ui/components/board/BoardCanvas.tsx` — arrow-key navigation across squares and the `data-board-cursor` attr on the focused cell. Generated alternatives must preserve that contract.
- Keep ≥ 4.5:1 contrast on premium squares against their labels and against any tile placed on top.
- Keep ≥ 40 × 40 px tap targets on mobile (≥ 360 px viewport).
- Keep `focus-visible` rings on every interactive element — never `outline: none` without a replacement.

## Files NOT to touch without confirmation

UI work is restricted to:

- `src/ui/`
- `app/(app)/`
- `app/(auth)/`
- `app/(marketing)/`

The following are off-limits unless the user explicitly authorizes the change:

- `src/rules/` — pure rules engine, layer-isolated
- `src/orchestration/` — server-side game engine, transitions, timers
- `src/persistence/` — Supabase repos and DTOs
- `src/realtime/` — Supabase Realtime channel wiring
- `src/dictionary/` — dictionary loader and packaged word list
- `app/actions/` — Server Actions (the contract surface)
- `app/api/` — route handlers (cron, server-time)
- Any `*.test.ts` or `*.test.tsx` file

If a UI task seems to require touching one of the off-limits areas (e.g. "this needs a new server action"), STOP, surface the proposal, and wait for explicit approval before editing.
