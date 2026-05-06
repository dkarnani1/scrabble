// Accessibility audit using @axe-core/playwright. Walks the project's key
// canonical pages, runs axe (WCAG 2.1 AA + best-practice), aggregates
// violations across pages, and writes a readable markdown report plus a JSON
// dump. Exits non-zero only when a critical or serious violation is present —
// moderate / minor are reported but don't block the run.
//
// Usage: node scripts/audit-axe.mjs (with `npm run dev` already serving 3000)

import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env.SCRABBLE_BASE ?? 'http://localhost:3000';
const PAGES = [
  { id: 'landing', label: 'Marketing landing', url: '/' },
  { id: 'home', label: 'Home (populated)', url: '/home?demo=1' },
  { id: 'home-empty', label: 'Home (empty)', url: '/home?demo=empty' },
  { id: 'demo-board', label: 'Demo board', url: '/demo-board' },
  { id: 'demo-board-endgame-win', label: 'Demo board with endgame win', url: '/demo-board?endgame=win' },
];

async function auditPage(page, pageInfo) {
  await page.goto(`${BASE}${pageInfo.url}`, { waitUntil: 'networkidle' });
  // Let any client-side mounts settle (overlay animations, sound provider).
  await page.waitForTimeout(800);
  const builder = new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'])
    // Skip color-contrast on dev-only chrome elements that are obviously
    // intentional decoration (the dev overlay's red toast is sonner, etc).
    .disableRules([]);
  return builder.analyze();
}

function impactRank(i) {
  return { critical: 4, serious: 3, moderate: 2, minor: 1 }[i ?? 'minor'] ?? 0;
}

function aggregate(reports) {
  // dedupe by rule id; collect per-page-source list and merge nodes.
  const byRule = new Map();
  for (const { pageId, pageLabel, result } of reports) {
    for (const v of result.violations) {
      const existing = byRule.get(v.id);
      if (existing) {
        existing.pages.add(pageLabel);
        existing.totalNodes += v.nodes.length;
        for (const node of v.nodes) {
          existing.targets.add(node.target.join(' '));
        }
      } else {
        byRule.set(v.id, {
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          description: v.description,
          tags: v.tags,
          pages: new Set([pageLabel]),
          totalNodes: v.nodes.length,
          targets: new Set(v.nodes.map((n) => n.target.join(' '))),
        });
      }
    }
  }
  return Array.from(byRule.values()).sort(
    (a, b) => impactRank(b.impact) - impactRank(a.impact),
  );
}

function fmtMd(violations, perPage) {
  const lines = [];
  lines.push('# Axe accessibility audit', '');
  lines.push(`Generated against ${BASE} on ${new Date().toISOString()}.`, '');
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) counts[v.impact ?? 'minor'] += 1;
  lines.push('## Summary', '');
  lines.push('| Impact | Distinct rules |');
  lines.push('|---|---|');
  for (const k of ['critical', 'serious', 'moderate', 'minor']) {
    lines.push(`| ${k} | ${counts[k]} |`);
  }
  lines.push('', `Total distinct rule violations across all pages: **${violations.length}**`, '');

  lines.push('## Per-page totals', '');
  lines.push('| Page | Violations |');
  lines.push('|---|---|');
  for (const p of perPage) lines.push(`| ${p.label} | ${p.violations} |`);
  lines.push('');

  lines.push('## Violations (deduped, ranked by impact)', '');
  for (const v of violations) {
    lines.push(`### ${v.id} (${v.impact ?? 'minor'})`, '');
    lines.push(`**${v.help}** — ${v.description}`, '');
    lines.push(`Pages: ${[...v.pages].map((p) => `\`${p}\``).join(', ')}`, '');
    lines.push(`Total node count: ${v.totalNodes}.`, '');
    lines.push(`Targets:`);
    for (const t of [...v.targets].slice(0, 8)) lines.push(`- \`${t}\``);
    if (v.targets.size > 8) lines.push(`- _…and ${v.targets.size - 8} more_`);
    lines.push('', `[axe rule docs](${v.helpUrl})`, '');
  }
  return lines.join('\n');
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const reports = [];
const perPage = [];
try {
  for (const p of PAGES) {
    const result = await auditPage(page, p);
    reports.push({ pageId: p.id, pageLabel: p.label, result });
    perPage.push({ id: p.id, label: p.label, violations: result.violations.length });
    console.log(
      `${p.label.padEnd(32)} → ${result.violations.length} violations` +
        (result.incomplete?.length ? ` (${result.incomplete.length} incomplete)` : ''),
    );
  }
} finally {
  await browser.close();
}

const aggregated = aggregate(reports);
const md = fmtMd(aggregated, perPage);

const root = path.resolve('.');
await fs.writeFile(path.join(root, 'AXE_REPORT.md'), md, 'utf8');
await fs.writeFile(
  path.join(root, 'axe-report.json'),
  JSON.stringify(
    {
      base: BASE,
      generatedAt: new Date().toISOString(),
      perPage,
      violations: aggregated.map((v) => ({
        ...v,
        pages: [...v.pages],
        targets: [...v.targets],
      })),
    },
    null,
    2,
  ),
  'utf8',
);

const blocking = aggregated.filter(
  (v) => v.impact === 'critical' || v.impact === 'serious',
);

console.log('---');
console.log(`distinct rules: ${aggregated.length}`);
console.log(`blocking (critical|serious): ${blocking.length}`);
for (const v of blocking) {
  console.log(`  ${v.impact.padEnd(8)} ${v.id}  on: ${[...v.pages].join(', ')}`);
}

if (blocking.length > 0) process.exit(2);
