// Static check of CSS custom properties in src/ and index.html (C1a, #364).
// Fails when
//   1. a var(--x) points at a property that nothing defines, or
//   2. --glass-border, a border shorthand, is used as anything but a whole border value.
// A property counts as defined when a stylesheet declares it, or a component sets it
// through an inline style key ('--x': …) or style.setProperty('--x', …).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHORTHAND = '--glass-border';
const BORDER_PROP = /^border(-(top|right|bottom|left|block|inline)(-(start|end))?)?$/;
const BORDER_KEY = /^\s*border(Top|Right|Bottom|Left)?\s*:/;

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(css|tsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// Blank out comments but keep the line breaks, so line numbers stay true.
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
}

// A stylesheet that no module imports is not in the bundle: what it defines does not count.
const sources = [...walk(path.join(root, 'src')), path.join(root, 'index.html')];
const imported = new Set();
for (const file of sources.filter((f) => !f.endsWith('.css'))) {
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/import\s+['"]([^'"]+\.css)['"]/g)) {
    imported.add(path.resolve(path.dirname(file), m[1]));
  }
}
const files = sources.filter((f) => !f.endsWith('.css') || imported.has(f));
const skipped = sources.filter((f) => !files.includes(f)).map((f) => path.relative(root, f));
if (skipped.length > 0) console.log(`Not imported by any module, skipped: ${skipped.join(', ')}`);

const defined = new Set();
const uses = [];
const misuses = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const isCss = file.endsWith('.css');
  const lines = stripComments(fs.readFileSync(file, 'utf8')).split('\n');

  lines.forEach((line, index) => {
    const at = `${rel}:${index + 1}`;

    for (const m of line.matchAll(/(?:^|[\s;{])(--[\w-]+)\s*:/g)) defined.add(m[1]);
    for (const m of line.matchAll(/['"`](--[\w-]+)['"`]\s*:/g)) defined.add(m[1]);
    for (const m of line.matchAll(/setProperty\(\s*['"`](--[\w-]+)['"`]/g)) defined.add(m[1]);

    for (const m of line.matchAll(/var\(\s*(--[\w-]+)/g)) uses.push({ name: m[1], at });

    if (!line.includes(`var(${SHORTHAND})`)) return;

    if (isCss) {
      for (const m of line.matchAll(/([\w-]+)\s*:\s*([^;{}]*)/g)) {
        if (!m[2].includes(`var(${SHORTHAND})`)) continue;
        const value = m[2].replace(/\s*!important\s*$/, '').trim();
        if (!BORDER_PROP.test(m[1]) || value !== `var(${SHORTHAND})`) misuses.push({ at, text: m[0].trim() });
      }
      return;
    }

    // TS/TSX: the token has to be a whole string literal, the value of a border key.
    for (const m of line.matchAll(/'[^']*'|"[^"]*"|`[^`]*`/g)) {
      if (!m[0].includes(`var(${SHORTHAND})`)) continue;
      const before = line.slice(0, m.index);
      const key = before.slice(Math.max(before.lastIndexOf(','), before.lastIndexOf('{')) + 1);
      if (m[0].slice(1, -1) !== `var(${SHORTHAND})` || !BORDER_KEY.test(key)) {
        misuses.push({ at, text: m[0].length > 90 ? `${m[0].slice(0, 90)}…` : m[0] });
      }
    }
  });
}

const undefinedUses = uses.filter((use) => !defined.has(use.name));

for (const use of undefinedUses) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${use.at}: var(${use.name}) is not defined anywhere`);
}
for (const misuse of misuses) {
  console.error(`\x1b[31m[ERROR]\x1b[0m ${misuse.at}: ${SHORTHAND} is a border shorthand, use var(--color-border) for a colour: ${misuse.text}`);
}

const names = new Set(uses.map((use) => use.name));
console.log(`${files.length} files, ${uses.length} var() references to ${names.size} custom properties, ${defined.size} defined.`);

if (undefinedUses.length > 0 || misuses.length > 0) {
  console.error(`\x1b[31m[FAIL]\x1b[0m ${undefinedUses.length} undefined reference(s), ${misuses.length} ${SHORTHAND} misuse(s).`);
  process.exit(1);
}
console.log('\x1b[32m[PASS]\x1b[0m Every var() reference is defined and --glass-border is only used as a border.');
