import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/(--[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]),
);
function luminance(hex) {
  const c = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function ratio(a, b) {
  const x = luminance(tokens[a]),
    y = luminance(tokens[b]);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
const pairs = [];
const add = (label, foreground, background, minimum = 4.5) =>
  pairs.push({ label, foreground, background, minimum });
for (const surface of ['--bg-surface', '--bg-canvas']) {
  add('Primary text', '--text-primary', surface);
  add('Secondary text', '--text-secondary', surface);
  add('Link text', '--primary-hover', surface);
  add('Accent text', '--brand-accent-text', surface);
  add('Control boundary', '--border-control', surface, 3);
  add('Focus outline', '--focus-ring', surface, 3);
  for (const status of ['compliant', 'partial', 'noncompliant', 'insufficient', 'na'])
    add('Chart graphic', `--status-${status}`, surface, 3);
  for (const kind of ['policy', 'requirement', 'system', 'evidence', 'decision'])
    add('Lineage graphic', `--lineage-${kind}`, surface, 3);
}
for (const color of ['--primary', '--primary-hover', '--status-noncompliant'])
  add('Action text', '--text-inverse', color);
for (const surface of ['--bg-sidebar', '--bg-sidebar-hover', '--bg-sidebar-active']) {
  add('Sidebar text', '--text-inverse', surface);
  add('Sidebar metadata', '--text-sidebar-muted', surface);
  add('Sidebar focus', '--text-inverse', surface, 3);
}
for (const status of ['compliant', 'partial', 'noncompliant', 'insufficient', 'na'])
  add('Status text', `--status-${status}`, `--status-${status}-bg`);
add('Selected policy metadata', '--status-na', '--status-insufficient-bg');
add('External scrollbar thumb', '--border-control', '--bg-canvas', 3);
add('External scrollbar hover', '--text-secondary', '--bg-canvas', 3);
for (const token of [
  '--status-compliant',
  '--status-insufficient',
  '--status-partial',
  '--status-noncompliant',
  '--status-na',
  '--status-na',
])
  add('Connection state dot', token, '--bg-surface', 3);
add('Decision activity bars', '--primary', '--bg-surface', 3);
add('Decision activity bars', '--primary', '--bg-canvas', 3);
const checks = pairs.map((p) => ({
  ...p,
  ratio: Number(ratio(p.foreground, p.background).toFixed(3)),
  pass: ratio(p.foreground, p.background) >= p.minimum,
}));
const report = {
  scope:
    'Static design-token pairs; does not verify rendered CSS, focus geometry, or WCAG certification.',
  checks,
  total: checks.length,
  passed: checks.filter((c) => c.pass).length,
};
writeFileSync(
  resolve('../docs/frontend/contrast-results.json'),
  JSON.stringify(report, null, 2) + '\n',
);
const failed = checks.filter((c) => !c.pass);
console.log(`${report.passed}/${checks.length} contrast pairs passed.`);
for (const c of failed)
  console.error(
    `${c.label}: ${c.foreground} on ${c.background} = ${c.ratio}, requires ${c.minimum}`,
  );
if (failed.length) process.exitCode = 1;
