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
//   node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --mispair 2 --guest
//
// Flags:
//   --id ID        file name in data/hu/characters, without .json (required)
//   --level N      which of the lesson's levels to play (default 1); the levels before it are mocked as done
//   --wrong LIST   item numbers (from 1) to answer wrongly; only listen-choose and compare items can be wrong
//   --mispair LIST match items (numbers from 1) to pair wrongly three times before every pair is matched
//   --guest        play as the returning guest with the two accuracy quests active, instead of the signed-in learner
//   --shots [LIST] a PNG of every item (or only of the listed item numbers) before it is answered and
//                  after CHECK, of a compare item one second after the tap, and of the result screen
//   --matrix       run through matrix.mjs (every viewport, light and dark) instead of one shot.mjs run
//   Every other flag goes to shot.mjs / matrix.mjs unchanged: --w --h --scheme --wait --out-dir --viewports --lesson --jobs …
//
// It checks, and exits 1 when one of them fails:
//   - one second after a tap on a compare option, that option is still selected and CHECK is enabled
//   - every match tile ends up matched
//   - CHECK grades each item as expected (correct, or incorrect for the --wrong items)
//   - a match item with wrong pairings can still be finished, and is graded incorrect once (#371)
//   - the result screen shows correct ÷ answered as the accuracy and max(5, 15 − mistakes) as the XP (#371)
//   - the XP that is saved is the XP that was shown: the points in save_progress, or in the guest's localStorage
//   - signed in: a perfect run posts no log_failed_exercise; a wrong item posts one, and its exercise_id is printed
//   - --guest: 'flawless', q_acc_100 and q_acc_90 move only when the accuracy earns them

import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const HERE = dirname(SELF);
const OWN_FLAGS = new Set(['id', 'level', 'wrong', 'mispair', 'guest', 'shots', 'matrix', 'help']);

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
const mispair = numbers(args.mispair);
const GUEST = !!args.guest;
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

// Three wrong pairings, each left to clear (the tiles reset after 800 ms) before the next one.
const MISPAIR_THRICE = `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const tiles = Array.from(document.querySelectorAll('.interactive-main button'));
  const audioTile = tiles.find((b) => !b.innerText.trim());
  const textTiles = tiles.filter((b) => b.innerText.trim());
  for (let i = 0; i < 3; i++) {
    window.__lxSpoken.length = 0;
    audioTile.click();
    await sleep(150);
    const word = window.__lxSpoken[window.__lxSpoken.length - 1];
    const other = textTiles.find((b) => b.innerText.trim() !== word);
    if (!other) return 'ASSERT FAIL: mispair: no wrong text tile for "' + word + '"';
    other.click();
    await sleep(1000);
  }
  const matched = tiles.filter((b) => b.style.pointerEvents === 'none').length;
  const disabled = document.querySelector('${SUBMIT}').getAttribute('aria-disabled');
  return ${check(`matched === 0 && disabled === 'true'`, `'mispair: 3 wrong pairings, ' + matched + ' tiles matched, CHECK aria-disabled=' + disabled`)};
})()`;

const steps = [{ eval: RECORD_SPEECH }];
let asserts = 0;

level.items.forEach((item, index) => {
  const n = index + 1;
  const isWrong = wrong.has(n) || mispair.has(n);
  if (mispair.has(n) && item.type !== 'phonics_match') fail(`item ${n} is not a match item; --mispair is for match items`);
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
    if (wrong.has(n)) fail(`item ${n} is a match item; use --mispair ${n}`);
    if (mispair.has(n)) { steps.push({ eval: MISPAIR_THRICE }); asserts++; }
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

// Every item here is answered, so the mistakes are the wrong items and the rest are correct.
const mistakes = wrong.size + mispair.size;
const accuracy = Math.floor(((level.items.length - mistakes) / level.items.length) * 100);
const xp = Math.max(5, 15 - mistakes);
const tone = accuracy < 60 ? 'neutral' : 'success';
steps.push({ wait: 2500 });
steps.push({ eval: `(() => { const values = Array.from(document.querySelectorAll('.post-lesson-metric-value')).map((e) => e.innerText.trim()); const tone = document.querySelector('.post-lesson-metric-card[data-tone]')?.dataset.tone; return ${check(`values[0] === '+${xp}' && values[1] === '${accuracy}%' && tone === '${tone}'`, `'result screen: ' + values.join(' / ') + ', accuracy card ' + tone`)}; })()` });
asserts++;
// matrix.mjs fails a cell that writes no PNG, so a matrix run always captures the result screen.
if (args.shots || args.matrix) steps.push({ shot: 'result' });

// The lesson was saved on its last answer (#372). Leave the result screen and compare what was saved with what was shown.
const START_POINTS = GUEST ? 245 : 1240;
steps.push({ click: '.post-lesson-next-wrap .btn', after: 600 });
if (GUEST) {
  const flawless = mistakes === 0;
  const expected = `points ${START_POINTS + xp}, flawless ${flawless}, q_acc_100 ${flawless ? 1 : 0}, q_acc_90 ${accuracy >= 90 ? 1 : 0}`;
  steps.push({ eval: `(() => { const p = JSON.parse(localStorage.getItem('neolix_guest_progress')); const seen = 'points ' + p.points + ', flawless ' + (p.scores.achievements || []).includes('flawless') + ', q_acc_100 ' + p.quest_progress.q_acc_100 + ', q_acc_90 ' + p.quest_progress.q_acc_90; return ${check(`seen === '${expected}'`, `'saved for the guest: ' + seen`)}; })()` });
  asserts++;
} else {
  // shot.mjs prints the save as a MOCK POST save_progress line.
  steps.push({ wait: 1000 });
}

const done = levels.slice(0, LEVEL - 1).map((l) => l.id);
// CharacterLesson spreads the file over its own `char_lesson_<id>`, so the file's id is the node id.
const nodeId = lesson.id || `char_lesson_${args.id}`;
const mock = { __extends: 'mocks/loggedin.json', get_session: { session: { progress: { scores: { node_state: { [nodeId]: { completedLessons: done } } } } } } };
// Today's quests are seeded so the app does not draw three at random: the two accuracy quests and a neutral one.
const guestSeed = { __extends: 'seeds/returning.json', neolix_guest_progress: {
  daily_quests_date: '__TODAY__',
  active_quests: [
    { id: 'q_acc_100', description: 'Érj el 100% pontosságot', target: 1, reward: 2 },
    { id: 'q_acc_90', description: 'Érj el 90% feletti pontosságot 2 alkalommal', target: 2, reward: 1 },
    { id: 'q_tasks_5', description: 'Végezz el 5 feladatot', target: 5, reward: 2 }
  ],
  quest_progress: { q_acc_100: 0, q_acc_90: 0, q_tasks_5: 0 },
  completed_quests_today: [],
  scores: { node_state: { [nodeId]: { completedLessons: done } } }
} };

const cmd = [join(HERE, args.matrix ? 'matrix.mjs' : 'shot.mjs'), '--path', `/lesson/characters/${args.id}`,
  ...(GUEST ? ['--preset', 'returning-guest', '--ls', JSON.stringify(guestSeed)] : ['--preset', 'signed-in', '--mock', JSON.stringify(mock)]),
  '--steps', JSON.stringify(steps), '--wait', '3500'];
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
const saves = lines.filter((l) => l.startsWith('MOCK POST save_progress'));
// A cell is one Chrome run: shot.mjs is one, matrix.mjs one per viewport and theme ("14/14 captures ok").
const cells = args.matrix ? parseInt((out.match(/\d+\/(\d+) captures ok/) || [])[1] || '0', 10) : 1;

// One run prints every check; a matrix prints only what went wrong, and its own summary line.
const shown = args.matrix
  ? /ASSERT FAIL|NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT|^FAIL |captures ok/
  : /^EVAL \d+ "ASSERT|^MOCK POST (log_failed_exercise|save_progress)|NOT FOUND|^STEP \d+ ERROR|^FATAL |^TIMEOUT|^SHOT /;
for (const l of lines) if (shown.test(l)) console.log(l);

const problems = [...bad];
if (run.status !== 0) problems.push(`${args.matrix ? 'matrix.mjs' : 'shot.mjs'} exited ${run.status}`);
if (ok.length !== asserts * cells) problems.push(`expected ${asserts * cells} passed checks (${asserts} per run, ${cells} run(s)), saw ${ok.length}`);
// A guest's mistakes are not logged and a guest's lesson is not posted; both live in localStorage.
const expectedLogs = GUEST ? 0 : mistakes * cells;
if (logged.length !== expectedLogs) problems.push(`expected ${expectedLogs} log_failed_exercise request(s), saw ${logged.length}`);
if (!GUEST) {
  const savedPoints = saves.map((l) => (l.match(/"points":(\d+)/) || [])[1]);
  if (saves.length !== cells) problems.push(`expected ${cells} save_progress request(s), saw ${saves.length}`);
  if (savedPoints.some((p) => p !== String(START_POINTS + xp))) problems.push(`the result screen showed +${xp} XP, so save_progress should carry points ${START_POINTS + xp}; saw ${savedPoints.join(', ')}`);
}

const wrongItems = [...wrong, ...mispair].sort((a, b) => a - b);
const what = `${args.id} level ${LEVEL}${GUEST ? ' as a guest' : ''} (${level.items.length} items${mistakes ? `, items ${wrongItems.join(', ')} answered wrongly` : ', all answered correctly'})`;
if (problems.length > 0) {
  console.error(`FAILED ${what}: ${problems.length} problem(s)`);
  problems.forEach((p) => console.error('  ' + p));
  process.exit(1);
}
console.log(`PASSED ${what}: ${ok.length} checks in ${cells} run(s), result +${xp} XP and ${accuracy}%, saved as ${START_POINTS + xp} points, ${logged.length} log_failed_exercise request(s).`);
