#!/usr/bin/env node
// Headless-Chrome capture tool for Lexipaws UI work (it came out of the UX review; see README.md).
// Each invocation launches its own isolated Chrome (own profile dir), so parallel runs are safe.
// It needs the Vite dev server (`npm run dev`) and nothing else: it never starts PHP, and every
// backend request is answered inside Chrome (from --mock, or as "backend down"), so none reaches it.
//
// Usage:
//   node tools/local/ux-shots/shot.mjs --path /dashboard --w 390 --h 844 --scheme light --out <dir>/name.png
//   node tools/local/ux-shots/shot.mjs --path / --steps steps.json --out-dir <dir> --prefix home
//   node tools/local/ux-shots/shot.mjs --preset signed-in --path /leaderboard --out <dir>/board.png
//
// Flags:
//   --base URL          default http://localhost:5173 (or the preset's host)
//   --path P            route to open (default /)
//   --lang sk|hu        add ?lang=… to every URL the tool opens
//   --w N --h N         viewport (default 390x844)
//   --dpr N             device scale factor (default 1)
//   --scheme light|dark prefers-color-scheme (default light)
//   --reduced           emulate prefers-reduced-motion: reduce
//   --mobile            mobile UA + touch emulation (default on when w < 768)
//   --full              capture full scrollable page instead of viewport
//   --preset NAME       a named state from presets.json (host + seed + mock); --base/--ls/--mock override it
//   --list-presets      print the presets and exit
//   --ls JSON|FILE      localStorage entries to seed BEFORE app scripts run
//   --wait MS           wait after load before first action (default 1500)
//   --out FILE          single screenshot path (when no --steps)
//   --steps FILE|JSON   JSON array of steps (see below); screenshots go to --out-dir with --prefix
//   --out-dir DIR       default: the folder of --out, else tools/local/ux-shots/out (git-ignored)
//   --text              print visible page text (innerText) after load / at end
//   --console           print console errors/warnings captured during the run
//   --contrast [LABEL]  after the screenshot, print one CONTRAST line: every on-screen text below WCAG AA (contrast.mjs reads it)
//   --mock FILE|JSON    mock the PHP backend: {"<action>": <json response>, "__post_default": {...}, "__get_default": {...}}
//                       Intercepts /api.php?action=..., report_problem.php, submit_feedback.php, upload_avatar.php, logout.php.
//                       A value may be {"__status": 500, "__body": ...} or {"__delay": ms, "__body": ...};
//                       without "__body" the rest of the value is the body, so {"__delay": 4000} on top of
//                       an inherited reply sends that reply late.
//                       Unmocked GET -> __get_default (default {"error":"mock: unmocked"}); POST -> __post_default (default {"success":true}).
//                       A mock file may start from another one: {"__extends": "loggedin.json", ...} (objects merge, the rest replaces).
//                       Without --mock every backend request gets an empty 500, which is what Vite's proxy returns when PHP is not running.
//
// FILE is looked up from the current folder first, then from this folder (so `--ls seeds/returning.json` works anywhere).
// In seed and mock values, "__NOW_ISO__", "__NOW_MS__" and "__TODAY__" become the current time / UTC date.
//
// Steps: {"shot":"name"[,"full":true]} {"click":"css"[,"nth":0]} (first VISIBLE match) {"clickText":"Text"[,"tag":"button"]}
//        {"tap":[x,y]} {"type":"text"} {"key":"Enter"} {"wait":ms} {"scroll":px} {"scrollTo":"css"} {"eval":"js"}
//        {"navigate":"/path"} {"viewport":[w,h]} {"scheme":"dark"} {"text":true} {"measureTargets":true} {"contrast":"label"}
//        Each step waits 250 ms after, or "after": ms.
//
// Native alert()/confirm() dialogs are logged as `DIALOG …` and accepted, so they cannot hang a run.
// Blocks GA4 / Headway so captures do not pollute production analytics, and the TTS endpoint.
// Chrome comes from CHROME_PATH (default: the macOS Google Chrome app). Needs Node 22+.

import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
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

const presets = JSON.parse(readFileSync(join(HERE, 'presets.json'), 'utf8'));
if (args['list-presets']) {
  for (const [name, p] of Object.entries(presets)) console.log(`${name.padEnd(18)} ${p.about}`);
  process.exit(0);
}
if (args.preset && !presets[args.preset]) fail(`unknown preset "${args.preset}". Known: ${Object.keys(presets).join(', ')}`);
const preset = args.preset ? presets[args.preset] : {};

const BASE = args.base || preset.base || 'http://localhost:5173';
const PATH = args.path || '/';
const LANG = typeof args.lang === 'string' ? args.lang : null;
let W = parseInt(args.w || '390', 10);
let H = parseInt(args.h || '844', 10);
const DPR = parseFloat(args.dpr || '1');
let SCHEME = args.scheme || 'light';
const REDUCED = !!args.reduced;
const MOBILE = args.mobile !== undefined ? args.mobile !== 'false' : W < 768;
const WAIT = parseInt(args.wait || '1500', 10);
const OUT_DIR = args['out-dir'] || (args.out ? dirname(args.out) : join(HERE, 'out'));
const PREFIX = args.prefix || 'shot';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
if (CHROME.includes(sep) && !existsSync(CHROME)) fail(`Chrome not found at "${CHROME}". Set CHROME_PATH to a Chrome or Chromium binary.`);

const findFile = (v) => [resolve(v), join(HERE, v)].find((p) => existsSync(p) && statSync(p).isFile());
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const deepMerge = (a, b) => {
  if (!isObj(a) || !isObj(b)) return b;
  const out = { ...a };
  for (const k of Object.keys(b)) out[k] = deepMerge(a[k], b[k]);
  return out;
};
const fillTokens = (v) => {
  if (typeof v === 'string') {
    const now = new Date();
    return { __NOW_ISO__: now.toISOString(), __NOW_MS__: String(now.getTime()), __TODAY__: now.toISOString().split('T')[0] }[v] ?? v;
  }
  if (Array.isArray(v)) return v.map(fillTokens);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fillTokens(x)]));
  return v;
};
// A flag value is a JSON file (cwd first, then this folder) or inline JSON.
function readJsonArg(v, flag) {
  const file = findFile(v);
  if (!file && !/^\s*[[{]/.test(v)) fail(`${flag}: no such file "${v}" (looked in the current folder and in ${HERE})`);
  let data;
  try { data = JSON.parse(file ? readFileSync(file, 'utf8') : v); } catch (e) { fail(`${flag}: invalid JSON in ${file || 'the inline value'}: ${e.message}`); }
  if (isObj(data) && data.__extends) {
    const { __extends, ...own } = data;
    const parent = file && existsSync(join(dirname(file), __extends)) ? join(dirname(file), __extends) : __extends;
    data = deepMerge(readJsonArg(parent, flag), own);
  }
  return data;
}
const jsonArg = (flag) => {
  const v = args[flag] ?? preset[flag];
  return v ? fillTokens(readJsonArg(v, '--' + flag)) : null;
};
const steps = jsonArg('steps');
const lsSeed = jsonArg('ls');
const mockMap = jsonArg('mock');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync(OUT_DIR, { recursive: true });

const profile = mkdtempSync(join(tmpdir(), 'lxshot-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions',
  '--hide-scrollbars', '--mute-audio', '--disable-gpu', 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let cleanedUp = false;
function cleanup() {
  if (cleanedUp) return; cleanedUp = true;
  try { chrome.kill('SIGKILL'); } catch {}
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
process.on('exit', cleanup);
const hardTimeout = setTimeout(() => { console.error('TIMEOUT: run exceeded 180s'); cleanup(); process.exit(2); }, 180000);

const wsBrowser = await new Promise((resolve, reject) => {
  let buf = '';
  chrome.stderr.on('data', (d) => {
    buf += d.toString();
    const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) resolve(m[1]);
  });
  chrome.on('error', (e) => reject(new Error(`cannot start Chrome ("${CHROME}"): ${e.message}. Set CHROME_PATH.`)));
  chrome.on('exit', (c) => reject(new Error('chrome exited ' + c + '\n' + buf)));
  setTimeout(() => reject(new Error('chrome did not start\n' + buf)), 20000);
}).catch((e) => fail(e.message));
const port = new URL(wsBrowser).port;
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });

let msgId = 0;
const pending = new Map();
const consoleLog = [];
const listeners = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : ev.data.toString());
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method) {
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
      consoleLog.push(`[console.${msg.params.type}] ` + msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 300));
    }
    if (msg.method === 'Page.javascriptDialogOpening') {
      console.log(`DIALOG ${msg.params.type} ${JSON.stringify(msg.params.message.slice(0, 300))}`);
      send('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleLog.push('[exception] ' + (msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text).slice(0, 300));
    }
    listeners.forEach((l) => l(msg));
  }
};
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++msgId; pending.set(id, { resolve, reject });
  ws.send(JSON.stringify({ id, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');
await send('Network.enable');

// The PHP backend is never contacted: every request to it is answered here.
await send('Fetch.enable', { patterns: ['api.php', 'report_problem.php', 'submit_feedback.php', 'upload_avatar.php', 'logout.php']
  .map((f) => ({ urlPattern: `*/${f}*`, requestStage: 'Request' })) });
listeners.push(async (m) => {
  if (m.method !== 'Fetch.requestPaused') return;
  const { requestId, request } = m.params;
  try {
    if (!mockMap) {
      // What Vite's proxy answers when PHP is not running; the app then falls back to guest mode.
      await send('Fetch.fulfillRequest', { requestId, responseCode: 500, responseHeaders: [{ name: 'Content-Type', value: 'text/plain' }], body: '' });
      return;
    }
    const u = new URL(request.url);
    const action = u.searchParams.get('action') || u.pathname.split('/').pop();
    const method = request.method;
    let entry = mockMap[action];
    if (entry === undefined) entry = method === 'POST' ? (mockMap.__post_default ?? { success: true }) : (mockMap.__get_default ?? { error: 'mock: unmocked' });
    let status = 200, body = entry, delay = 0;
    if (isObj(entry) && ('__body' in entry || '__status' in entry || '__delay' in entry)) {
      const { __status, __delay, __body, ...rest } = entry;
      status = __status || 200; delay = __delay || 0; body = __body ?? rest;
    }
    console.log(`MOCK ${method} ${action}${request.postData ? ' body=' + request.postData.slice(0, 160) : ''}`);
    if (delay) await sleep(delay);
    await send('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(body)).toString('base64') });
  } catch (e) { console.log('MOCK fulfil error ' + e.message); }
});

await send('Network.setBlockedURLs', { urls: ['*googletagmanager.com*', '*google-analytics.com*', '*headwayapp.co*', '*/api/tts.php*'] });

async function setViewport() {
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: MOBILE });
  await send('Emulation.setTouchEmulationEnabled', { enabled: MOBILE, maxTouchPoints: MOBILE ? 5 : 1 });
}
async function setMedia() {
  await send('Emulation.setEmulatedMedia', { features: [
    { name: 'prefers-color-scheme', value: SCHEME },
    { name: 'prefers-reduced-motion', value: REDUCED ? 'reduce' : 'no-preference' },
  ] });
}
await setViewport();
await setMedia();
if (MOBILE) {
  await send('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
}
if (lsSeed) {
  const src = `try{const s=${JSON.stringify(lsSeed)};if(!sessionStorage.getItem('__lxseeded')){for(const k in s){localStorage.setItem(k, typeof s[k]==='string'?s[k]:JSON.stringify(s[k]));}sessionStorage.setItem('__lxseeded','1');}}catch(e){}`;
  await send('Page.addScriptToEvaluateOnNewDocument', { source: src });
}
// Silence speechSynthesis so the TTS fallback does not hang anything.
await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{window.speechSynthesis && (window.speechSynthesis.speak = function(u){ setTimeout(()=>{ try{u.onend && u.onend(new Event('end'))}catch(e){} }, 50); });}catch(e){}` });

async function navigate(path) {
  const loaded = new Promise((r) => {
    const l = (m) => { if (m.method === 'Page.loadEventFired') { listeners.splice(listeners.indexOf(l), 1); r(); } };
    listeners.push(l);
  });
  const url = BASE + (LANG ? path + (path.includes('?') ? '&' : '?') + 'lang=' + LANG : path);
  const res = await send('Page.navigate', { url });
  if (res.errorText) throw new Error(`cannot open ${url} (${res.errorText}). Is \`npm run dev\` running?`);
  await Promise.race([loaded, sleep(15000)]);
}

async function evaluate(expr) {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error('eval error: ' + (res.exceptionDetails.exception?.description || res.exceptionDetails.text));
  return res.result.value;
}

async function screenshot(file, full) {
  const params = { format: 'png', captureBeyondViewport: !!full };
  if (full) {
    const m = await send('Page.getLayoutMetrics');
    const cs = m.cssContentSize || m.contentSize;
    params.clip = { x: 0, y: 0, width: Math.max(W, Math.ceil(cs.width)), height: Math.min(Math.ceil(cs.height), 12000), scale: 1 };
  }
  const { data } = await send('Page.captureScreenshot', params);
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log('SHOT ' + file);
}

async function clickAt(x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
}

async function centreOf(expr) {
  return evaluate(`(() => { const el = ${expr}; if (!el) return null; el.scrollIntoView({block:'center', inline:'center', behavior:'instant'}); const r = el.getBoundingClientRect(); return {x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height}; })()`);
}

const VIS = `const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false; let n = e; while (n && n.nodeType === 1) { const s = getComputedStyle(n); if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false; n = n.parentElement; } return true; };`;
const visibleQS = (sel, nth) => `(() => { ${VIS} const all = Array.from(document.querySelectorAll(${JSON.stringify(sel)})).filter(vis); return all[${nth || 0}] || null; })()`;
const findByText = (text, tag) => `(() => { ${VIS} const want = ${JSON.stringify(text)}.toLowerCase(); const els = Array.from(document.querySelectorAll(${JSON.stringify(tag || 'button, a, [role=button], div, span, li, label, p, h1, h2, h3')})); let best = null; for (const e of els) { const t = (e.innerText || e.textContent || '').trim().toLowerCase(); if (t && t.includes(want) && vis(e)) { if (!best || (e.innerText||'').length < (best.innerText||'').length) best = e; } } return best; })()`;
// WCAG text contrast of every element on screen that holds text of its own. Runs inside the page.
// Foreground: computed color (its alpha composited onto the background). Background: the element's
// and its ancestors' background-color layers, composited down to the first opaque one; a gradient
// counts as each of its colour stops and the worst stop wins. Text over a url() image, gradient-filled
// text (-webkit-text-fill-color: transparent) and disabled controls are not measured but counted.
// Large text (>= 24 px, or >= 18.66 px at weight 700+) needs 3:1, the rest 4.5:1.
function contrastProbe() {
  const parse = (s) => {
    const m = String(s).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (top, under) => {
    const a = top.a + under.a * (1 - top.a);
    if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
    const mix = (k) => (top[k] * top.a + under[k] * under.a * (1 - top.a)) / a;
    return { r: mix('r'), g: mix('g'), b: mix('b'), a };
  };
  const lum = (c) => {
    const ch = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };

  // The possible backgrounds behind el: a list of opaque colours (one per gradient stop), or null for an image.
  const backgrounds = (el) => {
    let layers = [[]]; // each candidate is a list of translucent layers, top first
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      const img = s.backgroundImage;
      if (img && img !== 'none') {
        if (/url\(/.test(img)) return null;
        const stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
        if (stops.length) {
          layers = layers.flatMap((l) => stops.map((st) => [...l, st]));
          if (stops.every((st) => st.a >= 1)) return layers;
        }
      }
      const bg = parse(s.backgroundColor);
      if (bg && bg.a > 0) {
        layers = layers.map((l) => [...l, bg]);
        if (bg.a >= 1) return layers;
      }
    }
    return layers.map((l) => [...l, WHITE]); // the canvas
  };
  const flatten = (l) => l.slice().reverse().reduce((under, top) => over(top, under));

  const disabled = (el) => !!el.closest('[disabled], [aria-disabled="true"]');
  // On screen and on top: the centre of its box is in the viewport and hit-tests to it (or inside it),
  // so the page under a dialog or a full-screen lesson is not measured.
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
    const hit = document.elementFromPoint(x, y);
    if (!hit || !(el.contains(hit) || hit.contains(el))) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) return false;
    }
    return true;
  };
  const describe = (el) => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');

  const failures = new Map();
  let checked = 0, skippedImage = 0, skippedGradientText = 0, skippedDisabled = 0;
  for (const el of document.body.querySelectorAll('*')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || el.closest('svg')) continue;
    const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (!own || !/[\p{L}\p{N}]/u.test(own) || !visible(el)) continue;
    if (disabled(el)) { skippedDisabled++; continue; }
    const s = getComputedStyle(el);
    const fill = s.webkitTextFillColor || s.color;
    const fg = parse(fill);
    if (!fg || fg.a === 0) { skippedGradientText++; continue; }
    const bgs = backgrounds(el);
    if (!bgs) { skippedImage++; continue; }
    checked++;
    const size = parseFloat(s.fontSize);
    const weight = parseInt(s.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    let worst = null;
    for (const l of bgs) {
      const bg = flatten(l);
      const text = over(fg, bg);
      const r = ratio(text, bg);
      if (!worst || r < worst.ratio) worst = { ratio: r, fg: hex(text), bg: hex(bg) };
    }
    if (worst.ratio + 1e-9 >= need) continue;
    // Rounded as contrast checkers do, but never up to the bar it failed (4.497 prints 4.49, not 4.50).
    const ratioText = (Math.min(Math.round(worst.ratio * 100), need * 100 - 1) / 100).toFixed(2);
    const key = [own.slice(0, 40), worst.fg, worst.bg, ratioText].join('|');
    const seen = failures.get(key);
    if (seen) { seen.count++; continue; }
    failures.set(key, { text: own.slice(0, 40), ratio: ratioText, need, fg: worst.fg, bg: worst.bg, fgCss: fill, px: Math.round(size * 10) / 10, weight, el: describe(el), count: 1 });
  }
  return { checked, skippedImage, skippedGradientText, skippedDisabled, failures: [...failures.values()].sort((a, b) => a.ratio - b.ratio) };
}

const textDump = `(() => document.body.innerText.replace(/\\n{3,}/g, '\\n\\n').slice(0, 6000))()`;
const measureTargets = `(() => { const sel = 'a, button, input, select, textarea, [role=button], [onclick], label[for]'; const out = []; document.querySelectorAll(sel).forEach((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); if (r.width === 0 || r.height === 0 || s.visibility === 'hidden' || s.display === 'none') return; if (r.bottom < 0 || r.top > innerHeight) return; if (r.width < 44 || r.height < 44) { out.push({ tag: e.tagName.toLowerCase(), cls: (e.className && e.className.baseVal === undefined ? e.className : '').toString().slice(0, 60), text: (e.innerText || e.getAttribute('aria-label') || e.value || '').trim().slice(0, 40), w: Math.round(r.width), h: Math.round(r.height) }); } }); return out; })()`;

// One CONTRAST line of JSON per measurement; contrast.mjs reads them.
async function printContrast(label) {
  const res = await evaluate(`(${contrastProbe})()`);
  console.log('CONTRAST ' + JSON.stringify({ label: label === true ? 'page' : String(label), w: W, h: H, scheme: SCHEME, ...res }));
}

async function run() {
  await navigate(PATH);
  await sleep(WAIT);
  if (!steps) {
    const file = args.out || join(OUT_DIR, `${PREFIX}.png`);
    await screenshot(file, !!args.full);
    if (args.contrast) await printContrast(args.contrast);
    if (args.text) console.log('TEXT>>>\n' + (await evaluate(textDump)) + '\n<<<TEXT');
    return;
  }
  for (const [i, s] of steps.entries()) {
    try {
      if (s.shot) await screenshot(join(OUT_DIR, `${PREFIX}-${s.shot}.png`), !!s.full);
      else if (s.click) {
        const c = await centreOf(visibleQS(s.click, s.nth));
        if (!c) { console.log(`STEP ${i} click: NOT FOUND ${s.click}`); continue; }
        await sleep(400); const c2 = await centreOf(visibleQS(s.click, s.nth)); await clickAt(c2.x, c2.y);
        console.log(`STEP ${i} click ${s.click} @${Math.round(c2.x)},${Math.round(c2.y)} (${Math.round(c2.w)}x${Math.round(c2.h)})`);
      } else if (s.clickText) {
        const c = await centreOf(findByText(s.clickText, s.tag));
        if (!c) { console.log(`STEP ${i} clickText: NOT FOUND "${s.clickText}"`); continue; }
        await sleep(400); const c2 = await centreOf(findByText(s.clickText, s.tag)); await clickAt(c2.x, c2.y);
        console.log(`STEP ${i} clickText "${s.clickText}" @${Math.round(c2.x)},${Math.round(c2.y)} (${Math.round(c2.w)}x${Math.round(c2.h)})`);
      } else if (s.tap) { await clickAt(s.tap[0], s.tap[1]); console.log(`STEP ${i} tap ${s.tap}`); }
      else if (s.type !== undefined) { await send('Input.insertText', { text: s.type }); console.log(`STEP ${i} type`); }
      else if (s.key) {
        const map = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, ArrowDown: 40, ArrowUp: 38, ArrowLeft: 37, ArrowRight: 39, ' ': 32 };
        const code = map[s.key] || 0;
        await send('Input.dispatchKeyEvent', { type: 'keyDown', key: s.key, code: s.key, windowsVirtualKeyCode: code, text: s.key === 'Enter' ? '\r' : undefined });
        await send('Input.dispatchKeyEvent', { type: 'keyUp', key: s.key, code: s.key, windowsVirtualKeyCode: code });
      } else if (s.wait) await sleep(s.wait);
      else if (s.scroll) await evaluate(`window.scrollBy(0, ${s.scroll})`);
      else if (s.scrollTo) await evaluate(`document.querySelector(${JSON.stringify(s.scrollTo)})?.scrollIntoView({block:'start', behavior:'instant'})`);
      else if (s.eval) console.log(`EVAL ${i} ` + JSON.stringify(await evaluate(s.eval)));
      else if (s.navigate) { await navigate(s.navigate); await sleep(WAIT); }
      else if (s.viewport) { W = s.viewport[0]; H = s.viewport[1]; await setViewport(); await sleep(400); }
      else if (s.scheme) { SCHEME = s.scheme; await setMedia(); await sleep(300); }
      else if (s.text) console.log(`TEXT ${i}>>>\n` + (await evaluate(textDump)) + '\n<<<TEXT');
      else if (s.measureTargets) console.log(`TARGETS<44 ${i} ` + JSON.stringify(await evaluate(measureTargets)));
      else if (s.contrast) await printContrast(s.contrast);
      await sleep(s.after || 250);
    } catch (e) {
      console.log(`STEP ${i} ERROR ${e.message}`);
    }
  }
  if (args.text) console.log('TEXT>>>\n' + (await evaluate(textDump)) + '\n<<<TEXT');
}

try {
  await run();
  if (args.console) console.log('CONSOLE>>>\n' + consoleLog.slice(0, 40).join('\n') + '\n<<<CONSOLE');
} catch (e) {
  console.error('FATAL ' + e.message);
  process.exitCode = 1;
} finally {
  clearTimeout(hardTimeout);
  try { ws.close(); } catch {}
  cleanup();
  process.exit(process.exitCode || 0);
}
