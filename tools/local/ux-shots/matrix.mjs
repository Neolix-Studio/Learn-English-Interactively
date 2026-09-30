#!/usr/bin/env node
// Screenshot matrix for one route: the five Beta viewports in light and dark, one shot.mjs run per cell.
//
// Usage:
//   node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest
//   node tools/local/ux-shots/matrix.mjs --path / --lang hu,sk                  (20 PNGs: HU, then ?lang=sk)
//   node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest --lesson --steps steps.json
//
// Flags:
//   --path P            route to open (default /)
//   --name N            file-name prefix (default: made from the path; "home" for /)
//   --out-dir DIR       default tools/local/ux-shots/out/<name> (git-ignored)
//   --lang LIST         hu (default; no URL parameter), sk (?lang=sk), or hu,sk for both sets
//   --lesson            add the two tablet viewports that lesson screens need: 1024x768 and 800x1280
//   --extra LIST        add viewports, e.g. --extra 1366x657,844x390
//   --viewports LIST    replace the default five
//   --schemes LIST      default light,dark
//   --jobs N            how many Chromes run at once (default 4)
//   --verbose           print each cell's full shot.mjs output
//   Every other flag goes to shot.mjs unchanged: --preset --base --ls --mock --steps --wait --full --reduced --dpr --mobile --console --text
//
// Files: <name>[-sk]-<W>x<H>-<scheme>.png. With --steps there is one per "shot" step: …-<scheme>-<shot>.png.
// Exits 1 when a cell fails or writes no PNG. Clicks that matched nothing and native dialogs are listed under the cell.

import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);

const DEFAULT_VIEWPORTS = '320x568,360x800,390x844,768x1024,1280x800';
const LESSON_VIEWPORTS = '1024x768,800x1280';
const OWN_FLAGS = new Set(['path', 'name', 'out-dir', 'lang', 'lesson', 'extra', 'viewports', 'schemes', 'jobs', 'verbose', 'help']);
// shot.mjs flags the matrix sets itself, once per cell.
const PER_CELL_FLAGS = new Set(['w', 'h', 'scheme', 'out', 'prefix']);

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
for (const k of Object.keys(args)) if (PER_CELL_FLAGS.has(k)) fail(`--${k} is set by the matrix for every cell; use shot.mjs for a single capture.`);

const list = (v) => String(v).split(',').map((x) => x.trim()).filter(Boolean);
const PATH = typeof args.path === 'string' ? args.path : '/';
const NAME = typeof args.name === 'string' ? args.name : (PATH.split(/[?#]/)[0].replace(/^\/+|\/+$/g, '').replace(/[^\w.-]+/g, '-') || 'home');
const OUT_DIR = typeof args['out-dir'] === 'string' ? args['out-dir'] : join(HERE, 'out', NAME);
const LANGS = list(args.lang || 'hu');
const SCHEMES = list(args.schemes || 'light,dark');
const JOBS = Math.max(1, parseInt(args.jobs || '4', 10));
const VIEWPORTS = [...new Set([
  ...list(typeof args.viewports === 'string' ? args.viewports : DEFAULT_VIEWPORTS),
  ...(args.lesson ? list(LESSON_VIEWPORTS) : []),
  ...(typeof args.extra === 'string' ? list(args.extra) : []),
])];

for (const v of VIEWPORTS) if (!/^\d+x\d+$/.test(v)) fail(`bad viewport "${v}" (expected WIDTHxHEIGHT, e.g. 360x800)`);
for (const l of LANGS) if (!['hu', 'sk'].includes(l)) fail(`bad --lang "${l}" (hu, sk or hu,sk)`);
for (const s of SCHEMES) if (!['light', 'dark'].includes(s)) fail(`bad scheme "${s}" (light, dark)`);

const passThrough = [];
for (const [k, v] of Object.entries(args)) {
  if (OWN_FLAGS.has(k)) continue;
  passThrough.push('--' + k);
  if (v !== true) passThrough.push(v);
}

const cells = [];
for (const lang of LANGS) for (const vp of VIEWPORTS) for (const scheme of SCHEMES) {
  cells.push({ lang, vp, scheme, name: `${NAME}${lang === 'hu' ? '' : '-' + lang}-${vp}-${scheme}` });
}

mkdirSync(OUT_DIR, { recursive: true });
const shown = (p) => { const rel = relative(process.cwd(), p) || '.'; return rel.startsWith('..') ? p : rel; };

function runCell(cell) {
  const [w, h] = cell.vp.split('x');
  const cmd = [join(HERE, 'shot.mjs'), '--path', PATH, '--w', w, '--h', h, '--scheme', cell.scheme, ...passThrough];
  // hu is the app's default on localhost, so it gets no parameter and is captured as a learner would reach it.
  if (cell.lang !== 'hu') cmd.push('--lang', cell.lang);
  if (args.steps) cmd.push('--out-dir', OUT_DIR, '--prefix', cell.name);
  else cmd.push('--out', join(OUT_DIR, cell.name + '.png'));
  return new Promise((done) => {
    const child = spawn(process.execPath, cmd, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('close', (code) => {
      const lines = out.split('\n');
      const files = lines.filter((l) => l.startsWith('SHOT ')).map((l) => l.slice(5)).filter((f) => existsSync(f) && statSync(f).size > 0);
      const notes = lines.filter((l) => /NOT FOUND|^STEP \d+ ERROR|^DIALOG |^FATAL |^TIMEOUT|^MOCK fulfil error/.test(l));
      done({ ...cell, ok: code === 0 && files.length > 0, code, files, notes, out });
    });
  });
}

const results = [];
let next = 0;
await Promise.all(Array.from({ length: Math.min(JOBS, cells.length) }, async () => {
  while (next < cells.length) {
    const i = next++;
    results[i] = await runCell(cells[i]);
  }
}));

let pngs = 0;
for (const r of results) {
  pngs += r.files.length;
  if (r.ok) for (const f of r.files) console.log('ok    ' + shown(f));
  else console.log(`FAIL  ${r.name} (exit ${r.code}, ${r.files.length} PNG)`);
  for (const n of r.notes) console.log('      ' + n);
  if (args.verbose) console.log(r.out.trimEnd().split('\n').map((l) => '      | ' + l).join('\n'));
}
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} captures ok, ${pngs} PNG in ${shown(OUT_DIR)}`);
process.exit(failed.length ? 1 : 0);
