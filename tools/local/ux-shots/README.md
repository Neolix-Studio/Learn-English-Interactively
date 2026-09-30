# ux-shots — see the app at every Beta viewport

Screenshots of the React app from headless Chrome, driven from the command line. It is the capture
tool from the UX review (`UX_REVIEW.md` §9), kept here so every UI change can be checked the same way:
five viewports, light and dark, Hungarian (and Slovak when asked).

- `shot.mjs` takes one screenshot, or walks a list of steps (click, type, scroll…) and takes several.
- `matrix.mjs` runs `shot.mjs` once per viewport and theme for one route.
- `sound-lesson.mjs` plays a whole sound lesson and checks the grades and the result screen.
- `presets.json`, `seeds/`, `mocks/` are the app states: a new guest, a signed-in learner, zero energy…

## What it touches, and what it never touches

- **It needs only the Vite dev server** (`npm run dev`, port 5173). It does not start it or stop it.
- **It never starts PHP, and no request ever reaches PHP.** Every call to `api.php`, `report_problem.php`,
  `submit_feedback.php`, `upload_avatar.php` and `logout.php` is answered inside Chrome: from a mock file,
  or with the empty `500` that Vite's proxy returns when PHP is not running. So it is safe to use even
  while `php -S 127.0.0.1:8000` is running with a `db_config.php` that points at the live database.
- **It blocks GA4 and Headway** (`googletagmanager.com`, `google-analytics.com`, `headwayapp.co`), so
  captures do not show up in production analytics. The TTS endpoint is blocked and `speechSynthesis`
  is stubbed, so nothing is spoken and nothing is billed.
- Each run uses its own throwaway Chrome profile, so runs are independent and can run in parallel.
- Nothing here ships: `scripts/build_release.js` never copies `tools/`, and `npm run security:php` skips
  `tools/local`.

Needs Node 22 or newer and Google Chrome. The Chrome binary comes from `CHROME_PATH`; the default is
`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.

```bash
CHROME_PATH=/usr/bin/chromium node tools/local/ux-shots/shot.mjs --path / --out /tmp/home.png
```

## Quick start

With `npm run dev` running, from the repo root:

```bash
# one screenshot
node tools/local/ux-shots/shot.mjs --path / --w 360 --h 800 --out tools/local/ux-shots/out/home.png

# the matrix every UI issue asks for: 10 PNGs
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest
```

Output goes to `tools/local/ux-shots/out/` unless you pass `--out` or `--out-dir`; that folder is
git-ignored. **Open and read the PNGs** — the tool reports that a file was written, not that the screen
is right. `--help` on either script prints every flag.

## The matrix

| Viewport | Why |
|---|---|
| 320×568 | smallest phone still in use |
| 360×800 | the primary Android size |
| 390×844 | current iPhones |
| 768×1024 | tablet, portrait |
| 1280×800 | laptop |

Each one is captured in light and in dark, so one route gives **10 PNGs** named
`<name>-<W>x<H>-<scheme>.png`. Widths under 768 are captured as a phone (mobile user agent, touch).

```bash
# Slovak as well: 20 PNGs, the second ten named <name>-sk-… and opened with ?lang=sk
node tools/local/ux-shots/matrix.mjs --path / --lang hu,sk

# lesson screens also need the two tablet sizes 1024×768 and 800×1280: 14 cells
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest --lesson \
  --wait 2500 --name lesson \
  --steps '[{"click":".roadmap-node.current","after":800},{"click":".tooltip-start-btn","after":1500},{"shot":"q1"},{"click":".interactive-submit-btn","after":700},{"shot":"q1-feedback"}]'

# any other size: laptop heights, landscape
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset signed-in --extra 1366x657,844x390
```

With `--steps`, each cell writes one PNG per `shot` step: `<name>-<W>x<H>-<scheme>-<shot>.png`.
The runner exits 1 if any cell fails or writes nothing, and lists under each cell the clicks that
matched nothing (`NOT FOUND`) and the native dialogs that opened (`DIALOG`). `--jobs N` sets how many
Chromes run at once (default 4); ten cells take about 20 seconds.

`?lang=sk` today still shows Hungarian on most screens. That is finding C59 in `UX_REVIEW.md`, not a
fault in the tool: `--lang sk` does reach the app (`guest_base_language` becomes `sk`).

## Two hosts

| Base | Behaviour |
|---|---|
| `http://localhost:5173` (default) | Dev mode: auth guards are off and Home shows a "Localhost teszt mód" panel instead of the real buttons. With no mock the app runs as a **guest** (progress in `localStorage`). |
| `http://app.localhost:5173` | Behaves like production: the real Home buttons and the real auth guards. Use it with a mock to be a **logged-in learner**. Chrome resolves `*.localhost` by itself; nothing to set up. |

This tool always answers the backend from a mock. To click through the app against the real PHP
backend instead, in an ordinary browser, start `../testing/local_stack.sh up` (see `../README.md`).

## Presets

`--preset NAME` picks the host, the `localStorage` seed and the backend mock in one go
(`--list-presets` prints them). `--base`, `--ls` and `--mock` override the preset.

| Preset | State | Where to look |
|---|---|---|
| `new-guest` | nothing stored | `/` ; `/dashboard` redirects to `/welcome/start` |
| `returning-guest` | guest, 245 XP, streak 4, node 1 done, one lesson of node 2 done, energy 3 | `/dashboard`, lessons |
| `signed-in` | KovacsAnna, 1,240 XP, streak 12, 180 bones, energy 4; leaderboard and friends filled | `/dashboard`, `/leaderboard`, `/friends`, `/profile` |
| `zero-energy` | `signed-in` with energy 0 | `/dashboard`, then start a lesson: the refill survey opens |
| `zero-energy-guest` | `returning-guest` with energy 0 | same; the survey's submit fails for a guest |
| `league-reward` | `signed-in` with one unclaimed weekly reward (1st place: 75 treats, 1 shield, a title) | `/dashboard`: the popup opens by itself |
| `weak-words` | `signed-in` with five failed exercises | `/practice`, steps below |

```bash
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset league-reward --wait 2500

node tools/local/ux-shots/matrix.mjs --path /practice --preset weak-words --wait 2500 \
  --steps '[{"clickText":"Hibák","tag":"h3"},{"clickText":"Kezdés","tag":"button","after":1500},{"shot":"q1"}]'
```

Two things the app itself does on every load, which you will see in the pictures: the streak shows one
more than the preset says (13, not 12), and the three daily quests are picked at random. Both are
finding C27; the presets are left as the review used them so that finding can still be reproduced.
The `signed-in` tour key is set; pass `--ls '{}'` to see the product tour.

### Making a variant

A seed or mock file can start from another one and change only what differs. Objects are merged,
everything else (arrays, numbers, `null`) replaces:

```json
{ "__extends": "loggedin.json", "get_session": { "session": { "progress": { "energy": 0 } } } }
```

The same works inline, with paths looked up from the current folder and then from this folder:

```bash
# the server answers 500
--mock '{"__extends":"mocks/loggedin.json","get_leaderboard":{"__status":500,"__body":{"error":"Database error"}}}'

# the session arrives four seconds late (loading states)
--mock '{"__extends":"mocks/loggedin.json","get_session":{"__delay":4000}}'

# the session has expired by the time the lesson is saved
--mock '{"__extends":"mocks/loggedin.json","save_progress":{"__status":401,"__body":{"error":"Munkamenet lejárt! Kérjük, jelentkezz be újra."}}}'

# zero energy inside the survey's one-hour cooldown: a native alert instead of the survey
--ls '{"__extends":"seeds/zero-energy-guest.json","last_feedback_refill":"__NOW_MS__"}'
```

- A mock maps an `api.php` action (or a PHP file name such as `report_problem.php`) to its JSON reply.
- `{"__status": N, "__body": …}` sets the HTTP status; `{"__delay": ms, "__body": …}` answers late.
  Without `"__body"` the rest of the value is the reply, so `{"__delay": 4000}` on top of an inherited
  entry sends that same reply late.
- An action with no entry gets `__get_default` (default `{"error":"mock: unmocked"}`) or, for a POST,
  `__post_default` (default `{"success":true}`). Every mocked call is printed as a `MOCK …` line, with
  the start of the POST body, so you can see what the app tried to save.
- `"__NOW_ISO__"`, `"__NOW_MS__"` and `"__TODAY__"` become the current time. `loggedin.json` uses
  this for `last_energy_refill`: with a fixed date the app would refill the energy to 5 on load.
- Reply shapes come from the handlers in `api.php`: `handleGetSession`, `handleGetLeaderboard`,
  `handleGetFriends`, `handleGetWeakWords`, `handleGetPendingRewards`, `handleSaveProgress`.

## Routes and selectors

`/`, `/gateway`, `/?login=true`, `/?invite=LEXI-TEST-0001`, `/welcome/start` → `hear-about-us` →
`why-learning` → `experience` → `placement`, `/lesson/ftue`, `/dashboard`, `/profile`, `/friends`,
`/practice`, `/characters`, `/leaderboard`, `/lesson/characters/<id>` (the ids are the file names in
`data/hu/characters/`, e.g. `cons_s_z`), `/contact`, `/privacy-policy`, `/terms`, `/impressum`; any
other path is the 404 page.

**Starting a lesson** from `/dashboard`:

1. `{"click":".roadmap-node.current"}` opens the node's tooltip.
2. `{"click":".tooltip-start-btn"}` (INDÍTÁS) starts the lesson.
3. `{"click":".interactive-submit-btn"}` is the footer button: ELLENŐRZÉS, then TOVÁBB. Pressing it
   with nothing selected counts as a wrong answer, which is the quick way to the feedback banner.

To land on a particular exercise type, seed `scores.node_state` so the sub-lesson you want is next
(node ids are the file names under `data/hu/A1/Module_*/`). Stories start from `/practice`. The phone
bottom bar reads Szintek / Tananyag / Bolt / Statisztika / Profil.

## Playing a whole sound lesson

`sound-lesson.mjs` plays one level of a sound lesson (`/lesson/characters/<id>`) from the first item to
the result screen and checks what the player says. It reads the items from `data/hu/characters/<id>.json`,
builds the steps and runs them through `shot.mjs`, or through `matrix.mjs` with `--matrix`. It is the
regression check for the sound drills until there is a test runner (WP-H1).

```bash
# a perfect run: every item right, the result screen must say 100%
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z

# level 2, a PNG of items 1 to 7 before and after CHECK, at every lesson viewport, light and dark
node tools/local/ux-shots/sound-lesson.mjs --id vowels_o_ow --level 2 --shots 1,2,3,4,5,6,7 --matrix --lesson

# items 1 and 4 answered wrongly: +13 XP and 77% (7 of 9), and the two log_failed_exercise requests are printed
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --wrong 1,4

# three wrong pairings on match item 2: it still finishes, and counts as one mistake
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --mispair 2

# as the returning guest, with the two accuracy quests active: 'flawless' and the quests must not move
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --guest --wrong 4
```

It exits 1 when a check fails: a compare option that is no longer selected one second after the tap,
a match tile left unmatched, an item graded differently from what was tapped, a wrong XP or percentage
on the result screen, saved points that differ from the XP shown, or a `log_failed_exercise` request
too many or too few. `--help` lists the flags.

## Steps

`--steps` takes a JSON array, inline or in a file. Each step waits 250 ms afterwards, or `"after": ms`.

| Step | Does |
|---|---|
| `{"shot":"name"}` | screenshot to `<prefix>-name.png`; add `"full":true` for the whole page |
| `{"click":"css"}` | click the first **visible** match; `"nth":1` for the next one |
| `{"clickText":"Text"}` | click the smallest visible element containing the text; `"tag":"button"` narrows it |
| `{"tap":[x,y]}` | click at a point |
| `{"type":"text"}`, `{"key":"Enter"}` | type into the focused field; press a key |
| `{"wait":ms}`, `{"scroll":px}`, `{"scrollTo":"css"}` | wait; scroll |
| `{"navigate":"/path"}` | open another route (a full page load) |
| `{"viewport":[w,h]}`, `{"scheme":"dark"}` | change size or theme mid-run |
| `{"eval":"js"}` | run JavaScript in the page and print the result |
| `{"text":true}` | print the visible text |
| `{"measureTargets":true}` | print every visible control smaller than 44×44 px |

Other useful flags: `--text` (print the page text), `--console` (print console errors and warnings),
`--reduced` (reduced motion), `--full` (whole page), `--dpr 2` (sharper images).

Native `alert()` and `confirm()` boxes are printed as `DIALOG …` and accepted, so they cannot hang a run.

## Limits

This is Chrome emulating a phone, not a phone: no Android WebView, no iOS, no notch or gesture-bar
insets, no real audio, and the backend is a mock. Anything that depends on those still needs a real
device or the local API suite in `tools/local/testing/`.
