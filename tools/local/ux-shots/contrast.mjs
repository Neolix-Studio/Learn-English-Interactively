#!/usr/bin/env node
// Contrast gate: measures the text contrast of the key screens in light and dark and fails on any text
// below WCAG AA (4.5:1, or 3:1 for large text). One shot.mjs run per screen and theme.
//
// Usage:
//   node tools/local/ux-shots/contrast.mjs                         every screen in contrast-screens.json, light and dark, at 360x800
//   node tools/local/ux-shots/contrast.mjs --screens lesson,home   only these
//   node tools/local/ux-shots/contrast.mjs --list                  print the screens and exit
//
// Flags:
//   --screens LIST      names from contrast-screens.json (default: all)
//   --schemes LIST      default light,dark
//   --w N --h N         viewport (default 360x800, the primary Android size)
//   --jobs N            how many Chromes run at once (default 4)
//   --json FILE         also write every measurement to FILE
//
// Prints each failing text with its ratio, the colours it was measured with, its size and its element,
// grouped by screen and theme. Exits 1 when any text fails, when a screen cannot be measured, or when a
// scripted click matched nothing (so a broken flow cannot pass by measuring the wrong screen).
// Needs `npm run dev`, like shot.mjs. Screenshots of each measured screen go to out/contrast/.

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);

const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) continue;
  const key = a.slice(2);
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) { args[key] = true; } else { args[key] = next; i++; }
}

const fail = (msg) => { console.error('FATAL ' + msg); process.exit(1); };

if (args.help) {
  const lines = readFileSync(SELF, 'utf8').split('\n').slice(1);
  console.log(lines.slice(0, lines.findIndex((l) => !l.startsWith('//'))).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(0);
}

const SCREENS = JSON.parse(readFileSync(join(HERE, 'contrast-screens.json'), 'utf8'));
if (args.list) {
  for (const [name, s] of Object.entries(SCREENS)) console.log(`${name.padEnd(12)} ${s.about}`);
  process.exit(0);
}

const list = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);
const NAMES = typeof args.screens === 'string' ? list(args.screens) : Object.keys(SCREENS);
for (const n of NAMES) if (!SCREENS[n]) fail(`unknown screen "${n}". Known: ${Object.keys(SCREENS).join(', ')}`);
const SCHEMES = list(args.schemes || 'light,dark');
for (const s of SCHEMES) if (!['light', 'dark'].includes(s)) fail(`bad scheme "${s}" (light, dark)`);
const W = String(parseInt(args.w || '360', 10));
const H = String(parseInt(args.h || '800', 10));
const JOBS = Math.max(1, parseInt(args.jobs || '4', 10));
const OUT_DIR = join(HERE, 'out', 'contrast');

const runs = [];
for (const name of NAMES) for (const scheme of SCHEMES) runs.push({ name, scheme, screen: SCREENS[name] });

function measure(run) {
  const s = run.screen;
  const prefix = `${run.name}-${W}x${H}-${run.scheme}`;
  const cmd = [join(HERE, 'shot.mjs'), '--path', s.path || '/', '--w', W, '--h', H, '--scheme', run.scheme];
  if (s.preset) cmd.push('--preset', s.preset);
  if (s.base) cmd.push('--base', s.base);
  if (s.wait) cmd.push('--wait', String(s.wait));
  if (s.steps) {
    // A screenshot next to each measurement, so a failure can be looked at.
    const steps = s.steps.flatMap((st) => (st.contrast ? [{ shot: String(st.contrast) }, st] : [st]));
    cmd.push('--steps', JSON.stringify(steps), '--out-dir', OUT_DIR, '--prefix', prefix);
  } else {
    cmd.push('--contrast', 'page', '--out', join(OUT_DIR, prefix + '.png'));
  }
  return new Promise((done) => {
    const child = spawn(process.execPath, cmd, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const lines = out.split('\n');
      const measurements = lines.filter((l) => l.startsWith('CONTRAST ')).map((l) => JSON.parse(l.slice(9)));
      const problems = lines.filter((l) => /NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT/.test(l));
      const wanted = s.steps ? s.steps.filter((st) => st.contrast).length : 1;
      if (code !== 0) problems.push(`shot.mjs exited ${code}`);
      if (measurements.length !== wanted) problems.push(`expected ${wanted} measurement(s), got ${measurements.length}`);
      done({ ...run, measurements, problems });
    });
  });
}

const results = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, runs.length) }, async () => {
  while (next < runs.length) {
    const i = next++;
    results[i] = await measure(runs[i]);
  }
}));

let failing = 0, checked = 0, broken = 0;
for (const r of results) {
  for (const m of r.measurements) {
    checked += m.checked;
    const where = `${r.name}${m.label === 'page' ? '' : ':' + m.label} ${W}x${H} ${r.scheme}`;
    const skipped = m.skippedImage + m.skippedGradientText + m.skippedDisabled;
    const note = `${m.checked} texts checked` + (skipped ? `, not measured: ${m.skippedImage} on an image, ${m.skippedGradientText} gradient text, ${m.skippedDisabled} disabled` : '');
    if (!m.failures.length) { console.log(`ok    ${where} (${note})`); continue; }
    failing += m.failures.length;
    console.log(`FAIL  ${where}: ${m.failures.length} below AA (${note})`);
    for (const f of m.failures) {
      console.log(`      ${f.ratio}:1 < ${f.need}:1  ${f.fg} on ${f.bg}  ${f.px}px/${f.weight}  "${f.text}"  ${f.el}${f.count > 1 ? `  ×${f.count}` : ''}`);
    }
  }
  if (r.problems.length) {
    broken++;
    console.log(`ERROR ${r.name} ${W}x${H} ${r.scheme}`);
    for (const p of r.problems) console.log('      ' + p);
  }
}
if (typeof args.json === 'string') writeFileSync(args.json, JSON.stringify(results.map(({ screen, ...r }) => r), null, 2));
console.log(`${failing} text/background pair(s) below AA, ${broken} screen run(s) broken, ${checked} texts checked; screenshots in tools/local/ux-shots/out/contrast`);
process.exit(failing || broken ? 1 : 0);
