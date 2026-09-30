#!/usr/bin/env node
// Plays one sound lesson from start to finish and checks what the player says (#362, C13).
// There is no test runner until WP-H1; this is the regression check for the sound drills.
// It builds a step list from data/hu/characters/<id>.json and hands it to shot.mjs (or matrix.mjs),
// as the signed-in mock learner. Needs only `npm run dev`; no request reaches PHP.
//
// Usage:
//   node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z
//   node tools/local/ux-shots/sound-lesson.mjs --id vowels_o_ow --level 2 --shots --matrix --lesson
//   node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --wrong 3,5
//
// Flags:
//   --id ID        file name in data/hu/characters, without .json (required)
//   --level N      which of the lesson's levels to play (default 1); the levels before it are mocked as done
//   --wrong LIST   item numbers (from 1) to answer wrongly; only listen-choose and compare items can be wrong
//   --shots [LIST] a PNG of every item (or only of the listed item numbers) before it is answered and
//                  after CHECK, of a compare item one second after the tap, and of the result screen
//   --matrix       run through matrix.mjs (every viewport, light and dark) instead of one shot.mjs run
//   Every other flag goes to shot.mjs / matrix.mjs unchanged: --w --h --scheme --wait --out-dir --viewports --lesson --jobs …
//
// It checks, and exits 1 when one of them fails:
//   - one second after a tap on a compare option, that option is still selected and CHECK is enabled
//   - every match tile ends up matched
//   - CHECK grades each item as expected (correct, or incorrect for the --wrong items)
//   - the result screen shows 100 % minus 20 points per wrong item
//   - a perfect run posts no log_failed_exercise; a wrong item posts one, and its exercise_id is printed

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);
const OWN_FLAGS = new Set(['id', 'level', 'wrong', 'shots', 'matrix', 'help']);

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

if (typeof args.id !== 'string') fail('--id is required, e.g. --id cons_s_z');
const file = join(HERE, '../../../data/hu/characters', args.id + '.json');
if (!existsSync(file)) fail(`no such lesson file: ${file}`);
const lesson = JSON.parse(readFileSync(file, 'utf8'));
const levels = lesson.lessons || [];
const LEVEL = parseInt(args.level || '1', 10);
const level = levels[LEVEL - 1];
if (!level) fail(`${args.id} has ${levels.length} levels; --level ${args.level} is not one of them`);
const numbers = (v) => new Set(String(v || '').split(',').filter(Boolean).map((n) => parseInt(n, 10)));
const wrong = numbers(args.wrong);
const shotItems = typeof args.shots === 'string' ? numbers(args.shots) : null;
const wantShot = (n) => !!args.shots && (!shotItems || shotItems.has(n));

const SUBMIT = '.interactive-submit-btn';
const OPTION = '[data-option-state]';
const check = (condition, message) => `((${condition}) ? 'ASSERT ok: ' : 'ASSERT FAIL: ') + ${message}`;

// shot.mjs silences speechSynthesis; this also records what would have been spoken, so the
// match step can tell which word an audio tile plays, the way a learner hears it.
const RECORD_SPEECH = `(() => { const speak = window.speechSynthesis.speak; window.__lxSpoken = []; window.speechSynthesis.speak = function (u) { window.__lxSpoken.push(u.text); return speak.call(this, u); }; return 'recording speech'; })()`;

const MATCH_ALL = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tiles = Array.from(document.querySelectorAll('.interactive-main button'));
  const audioTiles = tiles.filter((b) => !b.innerText.trim());
  const textTiles = tiles.filter((b) => b.innerText.trim());
  for (const tile of audioTiles) {
    window.__lxSpoken.length = 0;
    tile.click();
    await sleep(150);
    const word = window.__lxSpoken[window.__lxSpoken.length - 1];
    const partner = textTiles.find((b) => b.innerText.trim() === word && b.style.pointerEvents !== 'none');
    if (!partner) return 'ASSERT FAIL: match: no free text tile for "' + word + '"';
    partner.click();
    await sleep(150);
  }
  const matched = tiles.filter((b) => b.style.pointerEvents === 'none').length;
  return ${check('matched === tiles.length && tiles.length > 0', `'match: ' + matched + ' of ' + tiles.length + ' tiles matched'`)};
})()`;

const steps = [{ eval: RECORD_SPEECH }];
let asserts = 0;

level.items.forEach((item, index) => {
  const n = index + 1;
  const isWrong = wrong.has(n);
  const kind = item.type.replace('phonics_', '');
  if (wantShot(n)) steps.push({ shot: `q${n}-${kind}` });

  if (item.type === 'phonics_listen_choose') {
    const right = item.options.findIndex((option) => option.correct);
    const pick = isWrong ? item.options.findIndex((option) => !option.correct) : right;
    steps.push({ click: OPTION, nth: pick });
  } else if (item.type === 'phonics_compare') {
    const right = item.isSame ? 0 : 1;
    const pick = isWrong ? 1 - right : right;
    const expected = pick === 0 ? 'selected,idle' : 'idle,selected';
    steps.push({ click: OPTION, nth: pick, after: 1000 });
    steps.push({ eval: `(() => { const states = Array.from(document.querySelectorAll('${OPTION}')).map((b) => b.dataset.optionState).join(','); const disabled = document.querySelector('${SUBMIT}').getAttribute('aria-disabled'); return ${check(`states === '${expected}' && disabled !== 'true'`, `'item ${n} compare, 1 s after the tap: options ' + states + ', CHECK aria-disabled=' + disabled`)}; })()` });
    asserts++;
    if (wantShot(n)) steps.push({ shot: `q${n}-${kind}-picked` });
  } else if (item.type === 'phonics_match') {
    if (isWrong) fail(`item ${n} is a match item; it cannot be answered wrongly`);
    steps.push({ eval: MATCH_ALL });
    asserts++;
  } else if (item.type === 'phonics_speak') {
    if (isWrong) fail(`item ${n} is a speak item; it cannot be answered wrongly`);
    steps.push({ clickText: 'Kattints a beszédhez', tag: 'button', after: 2300 });
  } else {
    fail(`item ${n} has type ${item.type}; this script knows the four sound types only`);
  }

  const grade = isWrong ? 'incorrect' : 'correct';
  steps.push({ click: SUBMIT, after: 500 });
  steps.push({ eval: `(() => { const state = document.querySelector('.interactive-footer').dataset.state; return ${check(`state === '${grade}'`, `'item ${n} ${kind} graded ' + state`)}; })()` });
  asserts++;
  if (wantShot(n)) steps.push({ shot: `q${n}-${kind}-checked` });
  steps.push({ click: SUBMIT, after: 500 });
});

const accuracy = Math.max(0, 100 - wrong.size * 20);
steps.push({ wait: 2500 });
steps.push({ eval: `(() => { const values = Array.from(document.querySelectorAll('.post-lesson-metric-value')).map((e) => e.innerText.trim()); return ${check(`values[1] === '${accuracy}%'`, `'result screen: ' + values.join(' / ')`)}; })()` });
asserts++;
// matrix.mjs fails a cell that writes no PNG, so a matrix run always captures the result screen.
if (args.shots || args.matrix) steps.push({ shot: 'result' });

const done = levels.slice(0, LEVEL - 1).map((l) => l.id);
// CharacterLesson spreads the file over its own `char_lesson_<id>`, so the file's id is the node id.
const nodeId = lesson.id || `char_lesson_${args.id}`;
const mock = { __extends: 'mocks/loggedin.json', get_session: { session: { progress: { scores: { node_state: { [nodeId]: { completedLessons: done } } } } } } };

const cmd = [join(HERE, args.matrix ? 'matrix.mjs' : 'shot.mjs'), '--preset', 'signed-in', '--path', `/lesson/characters/${args.id}`,
  '--mock', JSON.stringify(mock), '--steps', JSON.stringify(steps), '--wait', '3500'];
if (args.matrix) cmd.push('--verbose', '--name', `${args.id}-l${LEVEL}`);
else if (args.shots) cmd.push('--prefix', `${args.id}-l${LEVEL}`);
for (const [k, v] of Object.entries(args)) {
  if (OWN_FLAGS.has(k)) continue;
  if (k === 'wait') cmd.splice(cmd.indexOf('--wait'), 2);
  cmd.push('--' + k);
  if (v !== true) cmd.push(v);
}

const run = spawnSync(process.execPath, cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const out = (run.stdout || '') + (run.stderr || '');
const lines = out.split('\n').map((l) => l.replace(/^\s+\| /, ''));

const ok = lines.filter((l) => l.includes('ASSERT ok'));
const bad = lines.filter((l) => /ASSERT FAIL|NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT/.test(l));
const logged = lines.filter((l) => l.startsWith('MOCK POST log_failed_exercise'));
// A cell is one Chrome run: shot.mjs is one, matrix.mjs one per viewport and theme ("14/14 captures ok").
const cells = args.matrix ? parseInt((out.match(/\d+\/(\d+) captures ok/) || [])[1] || '0', 10) : 1;

// One run prints every check; a matrix prints only what went wrong, and its own summary line.
const shown = args.matrix
  ? /ASSERT FAIL|NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT|^FAIL |captures ok/
  : /^EVAL \d+ "ASSERT|^MOCK POST log_failed_exercise|NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT|^SHOT /;
for (const l of lines) if (shown.test(l)) console.log(l);

const problems = [...bad];
if (run.status !== 0) problems.push(`${args.matrix ? 'matrix.mjs' : 'shot.mjs'} exited ${run.status}`);
if (ok.length !== asserts * cells) problems.push(`expected ${asserts * cells} passed checks (${asserts} per run, ${cells} run(s)), saw ${ok.length}`);
if (logged.length !== wrong.size * cells) problems.push(`expected ${wrong.size * cells} log_failed_exercise request(s), saw ${logged.length}`);

const what = `${args.id} level ${LEVEL} (${level.items.length} items${wrong.size ? `, items ${[...wrong].join(', ')} answered wrongly` : ', all answered correctly'})`;
if (problems.length > 0) {
  console.error(`FAILED ${what}: ${problems.length} problem(s)`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`PASSED ${what}: ${ok.length} checks in ${cells} run(s), result ${accuracy}%, ${logged.length} log_failed_exercise request(s).`);
