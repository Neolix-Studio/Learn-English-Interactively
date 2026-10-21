#!/usr/bin/env node
// Checks that progress survives leaving the page, and that a refused save is retried (B4b, #384),
// and that an expired session loses nothing (UX3-1b, #399).
// Unlike the other tools here it talks to the REAL PHP backend: run it against the local stack only.
//
//   ./tools/local/testing/local_stack.sh up && npm run dev
//   node tools/local/ux-shots/unload-save.mjs
//
// Flags:
//   --base URL       default http://app.localhost:5173 (the local stack's UI; never point it at a live site)
//   --only LIST      run some of the scenarios: close-lesson,close-wait,logout,expired,expired-reload,
//                    other-account,offline,throttle (default all)
//   --email E        default anna@lexipaws.test, the local stack's returning learner
//   --other-email E  default uj@lexipaws.test, the local stack's new learner (same password)
//   --password P     default Teszt-1234
//   --sessions DIR   the stack's PHP session files (default $LEXIPAWS_STACK_DIR/sessions, else /tmp/lexipaws-local-stack/sessions)
//
// Scenarios, each in a fresh tab of one signed-in Chrome; exits 1 when one fails:
//   close-lesson  play a sound lesson, close the tab 300 ms after the last CHECK; reopened, the lesson is saved
//   close-wait    change the theme (saved after a 1.5 s wait), close the tab 200 ms later; reopened, it is saved
//   logout        play a lesson, leave the result screen, change the theme and log out 100 ms later;
//                 signed in again, both the lesson and the theme are saved
//   expired       delete the session file before a lesson's last answer: finishing opens the sign-in sheet over
//                 the result screen with the e-mail filled in and the password focused, the progress waits in the
//                 outbox, and signing in there saves the lesson without a reload
//   expired-reload the same, then reload before signing in: the page says the session ran out (not the marketing
//                 page), the sheet opens again, Escape and its button work, and signing in saves the lesson
//   other-account the same, then sign in on the sheet as the other learner: the page reloads as them, nothing of
//                 the first learner's lesson reaches their account, and the outbox waits until the first signs in
//   offline       a change saved while signed out is in the outbox; a launch with every api.php request failing
//                 shows "can't reach the server" and that the progress is kept, then signing in saves it
//   throttle      use up save_progress's 45 requests a minute, then change the theme: the 429 shows the
//                 Hungarian "not saved" notice (no alert()), keeps the change in the outbox, and the automatic
//                 retry saves it, hides the notice and empties the outbox

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, unlinkSync } from 'node:fs';
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
const OTHER_EMAIL = args['other-email'] || 'uj@lexipaws.test';
const PASSWORD = args.password || 'Teszt-1234';
const SESSIONS = args.sessions || join(process.env.LEXIPAWS_STACK_DIR || '/tmp/lexipaws-local-stack', 'sessions');
const ONLY = typeof args.only === 'string' ? new Set(args.only.split(',')) : null;
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HU = JSON.parse(readFileSync(join(HERE, '../../../src/locales/hu.json'), 'utf8'));
const SAVE_FAILED_TEXT = HU.errors.save_failed;
const OUTBOX_KEY = 'lexipaws_progress_outbox';
const ACCOUNT_KEY = 'lexipaws_account';

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
setTimeout(() => { console.error('TIMEOUT: run exceeded 720 s'); process.exit(2); }, 720000).unref();

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
    saves.set(m.params.requestId, { at: Date.now(), status: null, body: m.params.request.postData || '' });
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

// Ends the session on the server the way an expiry does: its file is gone, the browser still sends the cookie.
async function killSession(tab) {
  const { cookies } = await cdp('Network.getCookies', { urls: [BASE] }, tab.sessionId);
  const id = cookies.find((c) => c.name === 'PHPSESSID')?.value;
  const file = join(SESSIONS, `sess_${id}`);
  if (!id || !existsSync(file)) return false;
  unlinkSync(file);
  return true;
}

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
  return { email: s.user.email, points: p.points, scores: parse(p.scores), completed: parse(p.completed), quest_progress: parse(p.quest_progress), completed_quests_today: parse(p.completed_quests_today) };
})()`;
const LOCAL = (key) => `JSON.parse(localStorage.getItem('${key}') || 'null')`;

// What the expired-session UI shows: the sign-in sheet, the page under it, and the save notice.
const RELOGIN_STATE = `(() => {
  const sheet = document.querySelector('dialog[open]');
  return {
    sheet: !!sheet?.querySelector('#relogin-title'),
    sheetName: sheet ? document.getElementById(sheet.getAttribute('aria-labelledby'))?.innerText : null,
    reason: document.querySelector('#relogin-reason')?.innerText || '',
    email: sheet?.querySelector('#auth-email')?.value ?? null,
    focused: document.activeElement?.id || document.activeElement?.tagName,
    screen: document.querySelector('main.connection-error')?.innerText || '',
    notice: !!document.querySelector('.save-error-notice'),
    marketing: !!document.querySelector('#levels'),
    path: location.pathname,
    marker: window.__lxMarker || null
  };
})()`;
// Types into the sheet's controlled inputs the way React expects, then submits.
const SIGN_IN_ON_SHEET = (email) => `(() => {
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
  const sheet = document.querySelector('dialog[open]');
  if (!sheet) return 'no sheet';
  ${email ? `set(sheet.querySelector('#auth-email'), ${JSON.stringify(email)});` : ''}
  set(sheet.querySelector('#auth-password'), ${JSON.stringify(PASSWORD)});
  sheet.querySelector('.btn-submit-auth').click();
  return 'submitted';
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

// Plays one level of a sound lesson by its data file, answering every item correctly, and returns right after
// the last CHECK, which is when the lesson is saved (#372). With `from` and `to` it plays items [from, to) and
// stops on the next one, so something can happen before the last answer.
function playLevel(id, { from = 0, to } = {}) {
  const lesson = JSON.parse(readFileSync(join(HERE, '../../../data/hu/characters', id + '.json'), 'utf8'));
  const level = lesson.lessons[0];
  const items = level.items.map((it) => ({ type: it.type,
    pick: it.type === 'phonics_listen_choose' ? it.options.findIndex((o) => o.correct) : it.type === 'phonics_compare' ? (it.isSame ? 0 : 1) : null }));
  const nodeId = lesson.id || `char_lesson_${id}`;
  const script = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const items = ${JSON.stringify(items)};
    const submit = () => document.querySelector('.interactive-submit-btn').click();
    for (let n = ${from}; n < ${to ?? items.length}; n++) {
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
    return 'paused before item ' + (${to ?? items.length} + 1);
  })()`;
  return { script, nodeId, levelId: level.id, count: items.length };
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
  const remembered = await evalIn(tab, LOCAL(ACCOUNT_KEY));
  console.log('     ' + await evalIn(tab, SET_THEME(theme)));
  await sleep(100);
  await evalIn(tab, `document.querySelector('#logout-btn').click()`);
  await sleep(3000);
  const out = await evalIn(tab, SESSION);
  check(out === null, `logged out: get_session ${out === null ? 'has no session' : 'still has a session'}`);
  const left = await evalIn(tab, `[${LOCAL(ACCOUNT_KEY)}, ${LOCAL(OUTBOX_KEY)}]`);
  check(remembered?.email === EMAIL && left[0] === null && left[1] === null,
    `the device remembered ${remembered?.email} while signed in; after the logout: account ${JSON.stringify(left[0])}, outbox ${JSON.stringify(left[1])}`);
  await evalIn(tab, LOGIN);
  const after = await evalIn(tab, SESSION);
  check(lessonSaved(after, nodeId, levelId) && after.points > before.points,
    `signed in again: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  check(after?.scores.active_theme === theme, `signed in again: scores.active_theme ${after?.scores.active_theme} (wanted ${theme})`);
  await closeTab(tab);
}

// Plays a level up to its last item, ends the session, then answers the last item: the save of the finished
// lesson meets an expired session (UX3-1b, #399).
async function finishLessonAfterExpiry(tab, id) {
  const level = playLevel(id);
  await go(tab, `/lesson/characters/${id}`);
  const played = await evalIn(tab, playLevel(id, { to: level.count - 1 }).script);
  const killed = await killSession(tab);
  const finished = await evalIn(tab, playLevel(id, { from: level.count - 1 }).script);
  check(played.startsWith('paused') && killed && finished.startsWith('answered'),
    `${id}: ${played}; session file deleted: ${killed}; then ${finished}`);
  await sleep(2000);
  return level;
}
const savesSince = (start) => [...saves.values()].filter((s) => s.at >= start);
const sentLesson = (list) => list.some((s) => s.status === 200 && s.body.includes('"lesson_completed":true'));
const outboxHolds = (outbox, nodeId, levelId) => (outbox?.progress?.scores?.node_state?.[nodeId]?.completedLessons || []).includes(levelId);
const pressEscape = async (tab) => {
  for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }, tab.sessionId);
};

if (run('expired')) {
  console.log("\n# expired: the session ends before a lesson's last answer");
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const account = await evalIn(tab, LOCAL(ACCOUNT_KEY));
  check(account?.email === EMAIL && !!account?.id, `signed in: the device remembers ${account?.email} (id ${account?.id})`);
  const { nodeId, levelId } = await finishLessonAfterExpiry(tab, 'cons_t_d');
  const state = await evalIn(tab, RELOGIN_STATE);
  check(state.sheet && state.sheetName === HU.auth.relogin_title && state.path === '/lesson/characters/cons_t_d',
    `the sheet is open over ${state.path}: "${state.sheetName}"`);
  check(state.email === EMAIL && state.focused === 'auth-password', `e-mail filled in: ${state.email}; focus on #${state.focused}`);
  check(state.reason.includes(HU.auth.relogin_reason) && state.reason.includes(HU.auth.relogin_kept), `reason: ${JSON.stringify(state.reason)}`);
  check(!state.notice, `the save notice waits behind the sheet: ${state.notice ? 'shown' : 'not shown'}`);
  const outbox = await evalIn(tab, LOCAL(OUTBOX_KEY));
  check(outbox?.owner === account?.id && outbox?.lesson === true && outboxHolds(outbox, nodeId, levelId),
    `outbox: owner ${outbox?.owner}, lesson ${outbox?.lesson}, holds ${levelId}: ${outboxHolds(outbox, nodeId, levelId)}`);
  await evalIn(tab, `window.__lxMarker = 'same page'`);
  const start = Date.now();
  console.log('     ' + await evalIn(tab, SIGN_IN_ON_SHEET()));
  await sleep(4000);
  const signedIn = await evalIn(tab, RELOGIN_STATE);
  check(!signedIn.sheet && signedIn.marker === 'same page' && signedIn.path === '/lesson/characters/cons_t_d' && !signedIn.notice,
    `signed in on the sheet: sheet ${signedIn.sheet ? 'still open' : 'closed'}, ${signedIn.marker ? 'no reload' : 'the page reloaded'}, still on ${signedIn.path}, notice ${signedIn.notice}`);
  const flush = savesSince(start);
  check(sentLesson(flush), `the outbox was sent: save_progress ${flush.map((s) => s.status).join(',')}, with lesson_completed: ${sentLesson(flush)}`);
  const after = await evalIn(tab, SESSION);
  check(lessonSaved(after, nodeId, levelId) && after.points > before.points,
    `get_session: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  check((await evalIn(tab, LOCAL(OUTBOX_KEY))) === null, 'the outbox is empty');
  await closeTab(tab);
}

if (run('expired-reload')) {
  console.log("\n# expired-reload: the session ends before a lesson's last answer, and the page reloads before signing in");
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const { nodeId, levelId } = await finishLessonAfterExpiry(tab, 'cons_k_g');
  check((await evalIn(tab, RELOGIN_STATE)).sheet, 'the sheet opened over the result screen');
  await go(tab, '/dashboard');
  const state = await evalIn(tab, RELOGIN_STATE);
  check(state.path === '/dashboard' && !state.marketing && state.screen.includes(HU.errors.expired_title) && state.screen.includes(HU.errors.progress_kept),
    `reloaded: on ${state.path}, marketing page ${state.marketing}, the page says ${JSON.stringify(state.screen.replace(/\n+/g, ' | '))}`);
  check(state.sheet && state.email === EMAIL && state.focused === 'auth-password', `the sheet opened again: e-mail ${state.email}, focus on #${state.focused}`);
  check(outboxHolds(await evalIn(tab, LOCAL(OUTBOX_KEY)), nodeId, levelId), `the outbox kept ${levelId} across the reload`);
  await pressEscape(tab);
  await sleep(600);
  const closed = await evalIn(tab, RELOGIN_STATE);
  await evalIn(tab, `document.querySelector('main.connection-error button').click()`);
  await sleep(600);
  const reopened = await evalIn(tab, RELOGIN_STATE);
  check(!closed.sheet && closed.screen.includes(HU.errors.expired_title) && reopened.sheet,
    `Escape closed the sheet (${!closed.sheet}) and left the reason on screen; its ${HU.errors.sign_in} button opened it again (${reopened.sheet})`);
  const start = Date.now();
  console.log('     ' + await evalIn(tab, SIGN_IN_ON_SHEET()));
  await sleep(4500);
  const signedIn = await evalIn(tab, `({ path: location.pathname, nodes: document.querySelectorAll('.roadmap-node').length, sheet: !!document.querySelector('dialog[open]') })`);
  check(signedIn.nodes > 0 && !signedIn.sheet, `signed in: the path shows ${signedIn.nodes} nodes on ${signedIn.path}`);
  const flush = savesSince(start);
  check(sentLesson(flush), `the outbox was sent: save_progress ${flush.map((s) => s.status).join(',')}, with lesson_completed: ${sentLesson(flush)}`);
  const after = await evalIn(tab, SESSION);
  check(lessonSaved(after, nodeId, levelId) && after.points > before.points,
    `get_session: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  check((await evalIn(tab, LOCAL(OUTBOX_KEY))) === null, 'the outbox is empty');
  await closeTab(tab);
}

if (run('other-account')) {
  console.log('\n# other-account: someone else signs in on the sheet');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const owner = (await evalIn(tab, LOCAL(ACCOUNT_KEY)))?.id;
  const { nodeId, levelId } = await finishLessonAfterExpiry(tab, 'cons_l_r');
  await evalIn(tab, `window.__lxMarker = 'same page'`);
  console.log('     ' + await evalIn(tab, SIGN_IN_ON_SHEET(OTHER_EMAIL)));
  await sleep(5000);
  const marker = await evalIn(tab, `window.__lxMarker || null`);
  const other = await evalIn(tab, SESSION);
  check(other?.email === OTHER_EMAIL && marker === null, `signed in as ${other?.email}; the page ${marker ? 'did not reload' : 'reloaded'}`);
  check(!lessonSaved(other, nodeId, levelId) && !JSON.stringify(other?.completed || {}).includes(nodeId),
    `${OTHER_EMAIL} got nothing of it: ${levelId} ${lessonSaved(other, nodeId, levelId) ? 'saved' : 'not saved'}, points ${other?.points}`);
  const kept = await evalIn(tab, LOCAL(OUTBOX_KEY));
  check(kept?.owner === owner && outboxHolds(kept, nodeId, levelId), `the outbox waits for its owner: owner ${kept?.owner} (wanted ${owner})`);
  await evalIn(tab, LOGIN);
  const start = Date.now();
  await go(tab, '/dashboard');
  const after = await evalIn(tab, SESSION);
  check(after?.email === EMAIL && lessonSaved(after, nodeId, levelId) && after.points > before.points && sentLesson(savesSince(start)),
    `${after?.email} signed in again: ${levelId} saved ${lessonSaved(after, nodeId, levelId)}, points ${before.points} -> ${after?.points}`);
  check((await evalIn(tab, LOCAL(OUTBOX_KEY))) === null, 'the outbox is empty');
  await closeTab(tab);
}

if (run('offline')) {
  console.log('\n# offline: a launch with no connection says so, and the unsaved change waits');
  const tab = await openTab('/dashboard');
  const before = await evalIn(tab, SESSION);
  const theme = before.scores.active_theme === 'dark' ? 'light' : 'dark';
  check(await killSession(tab), 'session file deleted');
  console.log('     ' + await evalIn(tab, SET_THEME(theme)));
  await sleep(3000);
  const outbox = await evalIn(tab, LOCAL(OUTBOX_KEY));
  check(outbox?.progress?.scores?.active_theme === theme, `the change is in the outbox: theme ${outbox?.progress?.scores?.active_theme}`);
  // Every api.php request fails the way it does with no network.
  const failer = (m) => {
    if (m.method === 'Fetch.requestPaused' && m.sessionId === tab.sessionId) {
      cdp('Fetch.failRequest', { requestId: m.params.requestId, errorReason: 'InternetDisconnected' }, tab.sessionId).catch(() => {});
    }
  };
  listeners.push(failer);
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*api.php*', requestStage: 'Request' }] }, tab.sessionId);
  await go(tab, '/dashboard');
  await sleep(6000);
  const state = await evalIn(tab, RELOGIN_STATE);
  check(state.path === '/dashboard' && !state.marketing && state.screen.includes(HU.errors.connection_title) && state.screen.includes(HU.errors.progress_kept),
    `offline launch: on ${state.path}, marketing page ${state.marketing}, the page says ${JSON.stringify(state.screen.replace(/\n+/g, ' | '))}`);
  await cdp('Fetch.disable', {}, tab.sessionId);
  listeners.splice(listeners.indexOf(failer), 1);
  await evalIn(tab, `document.querySelector('main.connection-error button').click()`);
  await sleep(3000);
  const online = await evalIn(tab, RELOGIN_STATE);
  check(online.screen.includes(HU.errors.expired_title) && online.sheet, `back online the session has run out: ${JSON.stringify(online.screen.split('\n')[0])}, sheet ${online.sheet}`);
  console.log('     ' + await evalIn(tab, SIGN_IN_ON_SHEET()));
  await sleep(4500);
  const after = await evalIn(tab, SESSION);
  const left = await evalIn(tab, LOCAL(OUTBOX_KEY));
  check(after?.scores.active_theme === theme && left === null, `signed in: stored theme ${after?.scores.active_theme} (wanted ${theme}), outbox ${left === null ? 'empty' : 'still there'}`);
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
  const waiting = await evalIn(tab, LOCAL(OUTBOX_KEY));
  check(waiting?.progress?.scores?.active_theme === theme, `the refused change is in the outbox: theme ${waiting?.progress?.scores?.active_theme}`);
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
  check((await evalIn(tab, LOCAL(OUTBOX_KEY))) === null, 'the outbox is empty once the retry landed');
  await closeTab(tab);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? 'FAILED' : 'PASSED'}: ${results.length - failed.length} of ${results.length} checks`);
process.exit(failed.length ? 1 : 0);
