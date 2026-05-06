# Axe accessibility audit

Generated against http://localhost:3001 on 2026-05-06T15:16:10.731Z.

## Summary

| Impact   | Distinct rules |
| -------- | -------------- |
| critical | 1              |
| serious  | 3              |
| moderate | 1              |
| minor    | 0              |

Total distinct rule violations across all pages: **5**

## Per-page totals

| Page                        | Violations |
| --------------------------- | ---------- |
| Marketing landing           | 0          |
| Home (populated)            | 0          |
| Home (empty)                | 0          |
| Demo board                  | 5          |
| Demo board with endgame win | 2          |

## Violations (deduped, ranked by impact)

### aria-required-children (critical)

**Certain ARIA roles must contain particular children** — Ensure elements with an ARIA role that require child roles contain them

Pages: `Demo board`

Total node count: 1.

Targets:

- `.grid-cols-15`

[axe rule docs](https://dequeuniversity.com/rules/axe/4.11/aria-required-children?application=playwright)

### aria-prohibited-attr (serious)

**Elements must only use permitted ARIA attributes** — Ensure ARIA attributes are not prohibited for an element's role

Pages: `Demo board`

Total node count: 4.

Targets:

- `.flex-1.min-w-0:nth-child(1) > .ring-tile-edge\/70.shadow-\[0_0_24px_rgba\(160\,122\,59\,0\.25\)\].bg-board-base\/90 > .min-w-0.flex-col > .font-medium.text-sm.gap-1\.5 > .h-2.w-2[aria-label="Alex online"]`
- `.flex-1.justify-end.min-w-0 > .text-right.px-3[data-active="false"] > .items-end.min-w-0.flex-col > .flex-row-reverse.font-medium.text-sm > .h-2.w-2[aria-label="Jordan online"]`
- `.border-dashed.bg-board-base\/30[aria-label="placed on board"]:nth-child(4)`
- `.border-dashed.bg-board-base\/30[aria-label="placed on board"]:nth-child(5)`

[axe rule docs](https://dequeuniversity.com/rules/axe/4.11/aria-prohibited-attr?application=playwright)

### color-contrast (serious)

**Elements must meet minimum color contrast ratio thresholds** — Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds

Pages: `Demo board`, `Demo board with endgame win`

Total node count: 42.

Targets:

- `.mt-2`
- `code`
- `.flex-1.min-w-0:nth-child(1) > .ring-tile-edge\/70.shadow-\[0_0_24px_rgba\(160\,122\,59\,0\.25\)\].bg-board-base\/90 > .min-w-0.flex-col > .font-medium.text-sm.gap-1\.5 > .font-normal.text-tile-ink\/55.text-\[11px\]`
- `.gap-2.flex-col > .gap-2 > .text-\[12px\][data-testid="bag-indicator"][data-state="closed"] > .text-tile-ink\/55`
- `button[aria-label="Square row 2 column 2"] > .text-tile-ink\/80.tracking-tight.sm\:text-\[12px\]`
- `button[aria-label="Square row 2 column 14"] > .text-tile-ink\/80.tracking-tight.sm\:text-\[12px\]`
- `button[aria-label="Square row 3 column 3"] > .text-tile-ink\/80.tracking-tight.sm\:text-\[12px\]`
- `button[aria-label="Square row 3 column 13"] > .text-tile-ink\/80.tracking-tight.sm\:text-\[12px\]`
- _…and 15 more_

[axe rule docs](https://dequeuniversity.com/rules/axe/4.11/color-contrast?application=playwright)

### nested-interactive (serious)

**Interactive controls must not be nested** — Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies

Pages: `Demo board`

Total node count: 2.

Targets:

- `button[aria-label="Square row 11 column 8"]`
- `button[aria-label="Square row 12 column 8"]`

[axe rule docs](https://dequeuniversity.com/rules/axe/4.11/nested-interactive?application=playwright)

### region (moderate)

**All page content should be contained by landmarks** — Ensure all page content is contained by landmarks

Pages: `Demo board`, `Demo board with endgame win`

Total node count: 2.

Targets:

- `nextjs-portal,span`
- `canvas`

[axe rule docs](https://dequeuniversity.com/rules/axe/4.11/region?application=playwright)
