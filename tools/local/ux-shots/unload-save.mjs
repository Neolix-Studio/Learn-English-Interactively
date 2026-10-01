#!/usr/bin/env node
// Checks that progress survives leaving the page, and that a refused save is retried (B4b, #384).
// Unlike the other tools here it talks to the REAL PHP backend: run it against the local stack only.
//
//   ./tools/local/testing/local_stack.sh up && npm run dev
//   node tools/local/ux-shots/unload-save.mjs
//
// Flags:
//   --base URL       default http://app.localhost:5173 (the local stack's UI; never point it at a live site)
//   --only LIST      run some of the scenarios: close-lesson,close-wait,logout,throttle (default all)
//   --email E        default anna@lexipaws.test, the local stack's returning learner
//   --password P     default Teszt-1234
//
// Scenarios, each in a fresh tab of one signed-in Chrome; exits 1 when one fails:
//   close-lesson  play a sound lesson, close the tab 300 ms after the last CHECK; reopened, the lesson is saved
//   close-wait    change the theme (saved after a 1.5 s wait), close the tab 200 ms later; reopened, it is saved
//   logout        play a lesson, leave the result screen, change the theme and log out 100 ms later;
//                 signed in again, both the lesson and the theme are saved
//   throttle      use up save_progress's 45 requests a minute, then change the theme: the 429 shows the
//                 Hungarian "not saved" notice (no alert()), and the automatic retry saves it and hides the notice

import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const args = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[argv[i].slice(2)] = true;
  else { args[argv[i].slice(2)] = next; i++; }
}

const BASE = args.base || 'http://app.localhost:5173';
if (!/^http:\/\/(app\.)?localhost(:\d+)?$/.test(BASE)) {
  console.error('FATAL --base must be a localhost address: this script writes to the database behind it.');
  process.exit(1);
}
const EMAIL = args.email || 'anna@lexipaws.test';
const PASSWORD = args.password || 'Teszt-1234';
const ONLY = typeof args.only === 'string' ? new Set(args.only.split(',')) : null;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SAVE_FAILED_TEXT = JSON.parse(readFileSync(join(HERE, '../../../src/locales/hu.json'), 'utf8')).errors.save_failed;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (ok, message) => { results.push({ ok, message }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`); };

// ------------------------------------------------------------------ Chrome over CDP
const profile = mkdtempSync(join(tmpdir(), 'lxunload-'));
const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio', '--disable-gpu', 'about:blank'],
{ stdio: ['ignore', 'ignore', 'pipe'] });
const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on('exit', cleanup);
setTimeout(() => { console.error('TIMEOUT: run exceeded 420 s'); process.exit(2); }, 420000).unref();

const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
  chrome.on('error', reject);
  setTimeout(() => reject(new Error('Chrome did not start')), 20000);
});
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let msgId = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) listeners.forEach((l) => l(msg));
};
const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++msgId; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});

// Every save_progress request the browser sends, from any tab, with its HTTP status once known.
const saves = new Map();
const dialogs = [];
listeners.push((m) => {
  if (m.method === 'Network.requestWillBeSent' && m.params.request.url.includes('action=save_progress')) {
    saves.set(m.params.requestId, { at: Date.now(), status: null });
  }
  if (m.method === 'Network.responseReceived' && saves.has(m.params.requestId)) saves.get(m.params.requestId).status = m.params.response.status;
  if (m.method === 'Page.javascriptDialogOpening') {
    dialogs.push(m.params.message);
    cdp('Page.handleJavaScriptDialog', { accept: true }, m.sessionId).catch(() => {});
  }
});

// The app speaks words through speechSynthesis when tts.php fails; record them so a match item can be paired by ear.
const RECORD_SPEECH = `window.__lxSpoken = []; if (window.speechSynthesis) window.speechSynthesis.speak = function (u) { window.__lxSpoken.push(u.text); setTimeout(() => u.onend && u.onend(new Event('end')), 10); };`;

async function openTab(path) {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  for (const m of ['Page.enable', 'Runtime.enable', 'Network.enable']) await cdp(m, {}, sessionId);
  await cdp('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*', '*headwayapp.co*', '*/api/tts.php*'] }, sessionId);
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: RECORD_SPEECH }, sessionId);
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
  const tab = { targetId, sessionId };
  await go(tab, path);
  return tab;
}
async function go(tab, path) {
  await cdp('Page.navigate', { url: BASE + path }, tab.sessionId);
  await sleep(3000);
}
async function evalIn(tab, expression) {
  const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, tab.sessionId);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const closeTab = (tab) => cdp('Target.closeTarget', { targetId: tab.targetId });

// ------------------------------------------------------------------ backend helpers (run inside a tab)
const LOGIN = `(async () => {
  const t = await (await fetch('/api.php?action=csrf_token', { credentials: 'same-origin' })).json();
  const r = await fetch('/api.php?action=login', { method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t.csrf_token },
    body: JSON.stringify({ email: ${JSON.stringify(EMAIL)}, password: ${JSON.stringify(PASSWORD)} }) });
  return r.status;
})()`;
const SESSION = `(async () => {
  const s = (await (await fetch('/api.php?action=get_session', { credentials: 'same-origin' })).json()).session;
  if (!s) return null;
  const p = s.progress || {};
  const parse = (v) => typeof v === 'string' ? JSON.parse(v) : (v || {});
  return { points: p.points, scores: parse(p.scores), completed: parse(p.completed), quest_progress: parse(p.quest_progress), completed_quests_today: parse(p.completed_quests_today) };
})()`;

// Sets the sidebar's theme select the way a learner does: updateProgress without saveNow, so it waits 1.5 s.
const SET_THEME = (theme) => `(() => {
  if (!document.querySelector('.sidebar-settings-select')) document.querySelector('#settings-toggle-btn').click();
  return new Promise((r) => setTimeout(() => {
    const select = document.querySelector('.sidebar-settings-select');
    if (!select) return r('no theme select');
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(select, '${theme}');
    select.dispatchEvent(new Event('change', { bubbles: true }));
    r('theme ${theme}');
  }, 300));
})()`;

// Plays one level of a sound lesson by its data file, answering every item correctly. With stopAfterLastCheck
// it returns right after the last CHECK, which is when the lesson is saved (#372).
function playLevel(id) {
  const lesson = JSON.parse(readFileSync(join(HERE, '../../../data/hu/characters', id + '.json'), 'utf8'));
  const level = lesson.lessons[0];
  const items = level.items.map((it) => ({ type: it.type,
    pick: it.type === 'phonics_listen_choose' ? it.options.findIndex((o) => o.correct) : it.type === 'phonics_compare' ? (it.isSame ? 0 : 1) : null }));
  const nodeId = lesson.id || `char_lesson_${id}`;
  const script = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const items = ${JSON.stringify(items)};
    const submit = () => document.querySelector('.interactive-submit-btn').click();
    for (let n = 0; n < items.length; n++) {
      const it = items[n];
      for (let w = 0; w < 25 && !document.querySelector('.interactive-submit-btn'); w++) await sleep(200);
      if (!document.querySelector('.interactive-submit-btn')) return 'item ' + (n + 1) + ': no lesson on ' + location.pathname + ': ' + document.body.innerText.slice(0, 200).replace(/\\n+/g, ' | ');
      if (it.pick !== null) {
        const options = document.querySelectorAll('[data-option-state]');
        if (!options[it.pick]) return 'item ' + (n + 1) + ' (' + it.type + '): ' + options.length + ' options: ' + document.querySelector('.interactive-main')?.innerText.slice(0, 200).replace(/\\n+/g, ' | ');
        options[it.pick].click();
        await sleep(400);
      } else if (it.type === 'phonics_speak') {
        const findSpeak = () => Array.from(document.querySelectorAll('button')).find((b) => b.textContent.includes('Kattints a beszédhez') && !b.disabled);
        for (let w = 0; w < 25 && !findSpeak(); w++) await sleep(200);
        const speak = findSpeak();
        if (!speak) return 'item ' + (n + 1) + ' (speak): buttons ' + Array.from(document.querySelectorAll('button')).map((b) => b.innerText.trim()).join(' / ');
        speak.click();
        await sleep(2300);
      } else if (it.type === 'phonics_match') {
        const tiles = Array.from(document.querySelectorAll('.interactive-main button'));
        const textTiles = tiles.filter((b) => b.innerText.trim());
        for (const tile of tiles.filter((b) => !b.innerText.trim())) {
          window.__lxSpoken.length = 0;
          tile.click();
          await sleep(300);
          const word = window.__lxSpoken[window.__lxSpoken.length - 1];
          const partner = textTiles.find((b) => b.innerText.trim() === word && b.style.pointerEvents !== 'none');
          if (!partner) return 'item ' + (n + 1) + ': no tile for "' + word + '"';
          partner.click();
          await sleep(300);
        }
      }
      submit();
      await sleep(500);
      const state = document.querySelector('.interactive-footer')?.dataset.state;
      if (state !== 'correct') return 'item ' + (n + 1) + ' graded ' + state;
      if (n === items.length - 1) return 'answered ' + items.length + ' items';
      submit();
      await sleep(600);
    }
  })()`;
  return { script, nodeId, levelId: level.id };
}
const lessonSaved = (s, nodeId, levelId) => !!s && (s.scores.node_state?.[nodeId]?.completedLessons || []).includes(levelId);

// ------------------------------------------------------------------ scenarios
const tab0 = await openTab('/');
const loginStatus = await evalIn(tab0, LOGIN);
if (loginStatus !== 200) { console.error(`FATAL login answered ${loginStatus}: is the local stack up (local_stack.sh up)?`); process.exit(1); }
await closeTab(tab0);

const run = (name) => !ONLY || ONLY.has(name);

if (run('close-lesson')) {
  console.log('\n# close-lesson: close the tab 300 ms after the last answer');
  const { script, nodeId, levelId } = playLevel('cons_s_z');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  await go(tab, '/lesson/characters/cons_s_z');
  const played = await evalIn(tab, script);
  await sleep(300);
  await closeTab(tab);
  check(played.startsWith('answered'), `lesson played: ${played}`);
  await sleep(2000);
  const again = await openTab('/dashboard');
  const after = await evalIn(again, SESSION);
  check(lessonSaved(after, nodeId, levelId) && after.points > before.points,
    `reopened: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  await closeTab(again);
}

if (run('close-wait')) {
  console.log('\n# close-wait: close the tab 200 ms after a change that waits 1.5 s to save');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const theme = before.scores.active_theme === 'dark' ? 'light' : 'dark';
  console.log('     ' + await evalIn(tab, SET_THEME(theme)));
  await sleep(200);
  // The 1.5 s timer dies with the tab, so only the pagehide flush can have sent this.
  await closeTab(tab);
  await sleep(2000);
  const again = await openTab('/dashboard');
  const after = await evalIn(again, SESSION);
  check(after?.scores.active_theme === theme, `reopened: stored scores.active_theme ${before.scores.active_theme} -> ${after?.scores.active_theme} (wanted ${theme})`);
  await closeTab(again);
}

if (run('logout')) {
  console.log('\n# logout: a lesson, then a change and a logout 100 ms later');
  const { script, nodeId, levelId } = playLevel('cons_p_b');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const theme = before.scores.active_theme === 'light' ? 'dark' : 'light';
  await go(tab, '/lesson/characters/cons_p_b');
  const played = await evalIn(tab, script);
  check(played.startsWith('answered'), `lesson played: ${played}`);
  await sleep(2500);
  await evalIn(tab, `document.querySelector('.post-lesson-next-wrap .btn')?.click()`);
  await sleep(1500);
  if (!(await evalIn(tab, `!!document.querySelector('#logout-btn')`))) await go(tab, '/dashboard');
  console.log('     ' + await evalIn(tab, SET_THEME(theme)));
  await sleep(100);
  await evalIn(tab, `document.querySelector('#logout-btn').click()`);
  await sleep(3000);
  const out = await evalIn(tab, SESSION);
  check(out === null, `logged out: get_session ${out === null ? 'has no session' : 'still has a session'}`);
  await evalIn(tab, LOGIN);
  const after = await evalIn(tab, SESSION);
  check(lessonSaved(after, nodeId, levelId) && after.points > before.points,
    `signed in again: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  check(after?.scores.active_theme === theme, `signed in again: scores.active_theme ${after?.scores.active_theme} (wanted ${theme})`);
  await closeTab(tab);
}

if (run('throttle')) {
  console.log('\n# throttle: a save refused with 429 shows the notice and is retried until it lands');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const theme = before.scores.active_theme === 'dark' ? 'light' : 'dark';
  // 45 honest saves of what is stored already use up the minute.
  const burned = await evalIn(tab, `(async () => {
    const t = await (await fetch('/api.php?action=csrf_token', { credentials: 'same-origin' })).json();
    const s = await ${SESSION};
    const body = JSON.stringify({ points: s.points, completed: s.completed, scores: s.scores, quest_progress: s.quest_progress, completed_quests_today: s.completed_quests_today });
    const codes = [];
    for (let i = 0; i < 46; i++) {
      const r = await fetch('/api.php?action=save_progress', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': t.csrf_token }, body });
      codes.push(r.status);
    }
    return codes.filter((c) => c === 429).length;
  })()`);
  check(burned >= 1, `throttle reached: ${burned} of 46 direct saves answered 429`);
  const start = Date.now();
  const dialogsBefore = dialogs.length;
  console.log('     ' + await evalIn(tab, SET_THEME(theme)));
  await sleep(3000);
  const notice = await evalIn(tab, `document.querySelector('.save-error-notice')?.innerText || ''`);
  check(notice.includes(SAVE_FAILED_TEXT), `notice after the 429: ${JSON.stringify(notice.split('\n')[0])}`);
  const statuses = () => [...saves.values()].filter((s) => s.at >= start).map((s) => s.status);
  let gone = false;
  while (Date.now() - start < 150000) {
    await sleep(2000);
    if (!(await evalIn(tab, `!!document.querySelector('.save-error-notice')`))) { gone = true; break; }
  }
  const after = await evalIn(tab, SESSION);
  check(gone && after?.scores.active_theme === theme,
    `retried on its own: notice ${gone ? 'gone' : 'still up'} after ${Math.round((Date.now() - start) / 1000)} s, save_progress answers ${statuses().join(',')}, stored theme ${after?.scores.active_theme}`);
  check(dialogs.length === dialogsBefore, `no alert() or confirm(): ${dialogs.length - dialogsBefore} dialog(s)`);
  await closeTab(tab);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? 'FAILED' : 'PASSED'}: ${results.length - failed.length} of ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
