# Lexipaws — Source of Truth

> **What this is.** A single, verified reference for how this codebase actually works today — as opposed to how `docs/` says it works. Most documents in `docs/` describe a vanilla-JS app that was deleted during the React migration. This file was written by reading the code, not the docs.
>
> **Audited:** 2026-08-28 · **Against commit:** `7b2a8f2` (2026-07-27) · **Branch:** `codex/mobile-ui-audit`
> **Method:** 13 parallel subsystem readers + an adversarial verification pass. Every claim below carries a `file:line`. Claims that survived adversarial re-checking are unmarked; anything softer is labelled ⚠️ *unverified*.

---

## Table of contents

1. [The one-page truth](#1-the-one-page-truth)
2. [Product & business context](#2-product--business-context)
3. [Stack, repo map, and toolchain](#3-stack-repo-map-and-toolchain)
4. [Running it locally](#4-running-it-locally)
5. [Frontend architecture](#5-frontend-architecture)
6. [The learning loop](#6-the-learning-loop)
7. [Curriculum data model](#7-curriculum-data-model)
8. [Gamification & economy](#8-gamification--economy)
9. [Internationalization (HU / SK)](#9-internationalization-hu--sk)
10. [Backend API](#10-backend-api)
11. [Database](#11-database)
12. [Design system: documented vs. actual](#12-design-system-documented-vs-actual)
13. [Art, assets, and the mascot](#13-art-assets-and-the-mascot)
14. [Build, deploy, CI, and tests](#14-build-deploy-ci-and-tests)
15. [**The critical trace: node click → XP in MySQL**](#15-the-critical-trace-node-click--xp-in-mysql)
16. [Known-broken inventory, ranked](#16-known-broken-inventory-ranked)
17. [Dead code & dead data](#17-dead-code--dead-data)
18. [Cross-cutting: a11y, privacy, errors, offline](#18-cross-cutting-a11y-privacy-errors-offline)
19. [Which docs to trust](#19-which-docs-to-trust)
20. [Beta readiness, honestly](#20-beta-readiness-honestly)
21. [Open questions for the owner](#21-open-questions-for-the-owner)
22. [Keeping this file honest](#22-keeping-this-file-honest)

---

## 1. The one-page truth

**Lexipaws is a well-built shell around a learning loop that does not persist correctly, wrapped in a design system that diverged from its own documentation, shipping art that mostly never reaches the screen.**

The good news first, because it is real:

- The build is green. `tsc -b && vite build` exits 0. Lint exits 0. No secrets have ever been committed (full history checked).
- The curriculum is substantial: 29 A1 nodes × 4 sub-lessons, 1,552 exercise items, 21 stories, 21 phonics lessons, 172-word dictionary with a hand-drawn SVG for **every** one of the 560 image-choice options.
- The backend is careful in the places that matter most: `password_hash`, hashed reset tokens with 1-hour expiry, hashed beta-invite codes with a `SELECT … FOR UPDATE`, and an avatar upload path that validates MIME two ways and writes random filenames.
- The mobile UI audit in `MOBILE_UI_AUDIT.md` is genuine, honest work — its six findings are all really implemented in `7b2a8f2`.

Now the four things that matter more than everything else combined:

| # | What | Where | Effect |
|---|---|---|---|
| **1** | **Every autosave wipes 11 database columns.** The client sends 5 of 17 fields; the server substitutes hardcoded defaults for the rest and `ON DUPLICATE KEY UPDATE`s all 17. | `UserContext.tsx:366-372` → `api.php:966-985` → `api.php:1059-1085` | Streak, energy, active theme, daily quests, level and shields are destroyed on every save. Cascades into ~8 other "bugs" that are really this one. |
| **2** | **The economy is client-authoritative and mintable.** Reward math runs in the browser; the only server defence is per-request delta caps, and `save_progress` / `update_progress` have **no rate limit**. | `api.php:1007-1041`, no `security_rate_limit` call on either action | +100 XP and +100 bones per request, indefinitely. The leaderboard — a headline Beta feature — is fully forgeable. Guest-migration at signup bypasses even the caps (`api.php:667-696` merges with `max()`, uncapped). |
| **3** | **The Slovak product does not exist.** `data/sk/` is a copy of `data/hu/` (one node file differs, 17 stories missing). The base-language field inside both trees is literally named `"hu"`. `roadmapLoader` defaults to `'hu'` and both callers omit the argument. | `roadmapLoader.ts:28` + `Roadmap.tsx:20`, `FTUELesson.tsx:10`; `LessonPlayer.tsx:23` hard-imports `data/hu/vocabulary.json` | `lexipaws.sk` advertises *"Učte sa anglicky po slovensky"* and serves a Hungarian course. A Slovak beginner cannot complete one exercise. |
| **4** | **`lexipaws.eu/` may be a 404 in production and staging cannot reveal it.** `.htaccess:4-5` rewrites the apex to `gateway.html`, which exists nowhere in the repo, `public/`, `dist/`, or `release/`. | `.htaccess:4-5` (verified target missing) | Works today only if Apache's rewrite loop falls through to the SPA rule. The condition is scoped to `lexipaws.eu`, so `dev.lexipaws.eu` never exercises it. **Check this by hand before anything else.** |

Two more that are cheap to fix and disproportionately visible:

- **`BETA_INVITES_ENABLED` fails *open*.** `api.php:260-262` returns a pass when the flag is unset, and `write_db_config.js:4-6` turns any missing GitHub secret into `''`. One forgotten secret and public registration is wide open. The client-side gate (`AuthModal.tsx:40`) only hides a tab.
- **`npm audit --omit=dev` reports 2 HIGH advisories** — `react-router` / `react-router-dom` 7.12.0–7.18.1 (GHSA-qwww-vcr4-c8h2). `package.json:36` pins `^7.18.1`. There is no `dependabot.yml`.

**Beta readiness in one sentence:** the target date in `docs/BETA_READINESS.md` is 2026-09-01, that is four days from this audit, the last commit was a month ago, and Gates 2 and 7 are self-reported as unaudited and not started. The date is not reachable; see [§20](#20-beta-readiness-honestly) for what a realistic version looks like.

---

## 2. Product & business context

**Lexipaws** teaches English to **Hungarian and Slovak** native speakers, gamified. Hard Alpha, working toward a first Beta.

**Mascot:** a cartoon AmStaff. Named **Lexi** in all code and user-facing copy, **Tyler** in all 26 image filenames. That split has already caused two production 404s — see [§13](#13-art-assets-and-the-mascot).

**Domains (three, one codebase):**

| Host | Serves | Mechanism |
|---|---|---|
| `lexipaws.eu` | Language gateway (chooser only) | `App.tsx:51` hostname check → `<Gateway/>`. Also an `.htaccess` rewrite to a missing file. |
| `lexipaws.hu` | Hungarian app | Default |
| `lexipaws.sk` | Slovak app | `i18n.ts:15-32` TLD detection |
| `dev.lexipaws.eu` | Staging (`dev` branch) | `verify-deploy.yml:111-120` |

**Access model:** invite-gated. Public visitors request access (`request_beta_access`) → operator approves in `beta_admin.php` → a `LEXI-XXXX-XXXX` code is emailed → `AuthModal` only shows the Register tab when a `?invite=` code is present.

**Monetization (planned, not live):** `subscription_tier` of `free` / `premium` / `lifetime` exists and bypasses the energy gate (`Dashboard.tsx:103-127`). No payment provider is wired. `docs/BETA_READINESS.md` correctly defers all payment work until after the account/progress/security foundations are stable.

**Team:** `Neolix` (170 commits), `Rekovo` (90), `TheNeolix` (23), `google-labs-jules[bot]` (5). 268 commits since 2026-06-11. Repo is **public**: `github.com/Neolix-Studio/Learn-English-Interactively`.

---

### ⚠️ NON-NEGOTIABLE CONSTRAINTS — read before writing any code

These are owner-stated product constraints that are **not derivable from the codebase**, and that have been repeatedly lost across sessions. Losing them has already cost real rework.

#### 1. This is a MOBILE-FIRST product

The target audience is Hungarian and Slovak learners on **phones**. Every layout decision starts at 320–390 px and enhances upward. Desktop is the secondary target.

**This has been forgotten repeatedly**, shipping desktop-native UI that broke on phones and tablets and required ad-hoc patching afterwards. `MOBILE_UI_AUDIT.md`, the 401 `!important`s in `dashboard.css`, and the four overlapping short-viewport breakpoints in `interactive.css` are all scar tissue from that cycle.

**The structural cause — and it is structural, not discipline:** the CSS is authored **desktop-first** while the product is mobile-first.

| | Count |
|---|---|
| `@media (max-width: …)` — desktop-first shrink-downs | **38** |
| `@media (min-width: …)` — mobile-first enhancements | **16** |

Base styles (no media query) are therefore **desktop** styles. Any new component written without a media query is desktop-only by default, and mobile breaks silently. *Forgetting mobile is the architecture's default behaviour.*

The inverse failure exists too: `FillBlanks.tsx:121-138`'s compose-card classes are defined **only** inside `max-width` blocks in `interactive.css` (blocks opening at lines 520, 1006, 1104), so **920 exercises are completely unstyled above 600 px width** — an invisible blank and a stack of bare divs on desktop.

**Convention going forward:** write the mobile layout as the base rule with no media query; add `@media (min-width: …)` only to enhance for larger screens. Never add a new `max-width` block to shrink a desktop layout down.

**Definition of done for any UI change:** verified at **320 / 360 / 390 px portrait** *and* one desktop width, before the PR. Touch targets ≥ 44 × 44 px.

#### 2. The mascot is named **Lexi**

*(Tyler is the owner's real dog, and the origin of the name "Lexipaws" — but the in-product character is Lexi.)* The 26 `tyler-*.png` files are legacy filenames and should be renamed; that rename also fixes the live 404s in §13.

#### 3. Slovak is in scope for the first Beta

`data/sk/` was created as a deliberate **placeholder** to mark the intent, never as real content. The base-language field is being restructured to sibling `"hu"` / `"sk"` keys in a single tree (Option A, owner-approved) — see §9.

#### 4. Theme default is **system** (follow the OS)

Not dark-by-default. This means **light and dark must both be correct**, which they currently are not (§12). `docs/guides/design_guide.md` describes the *old* vanilla-JS app's design language and does not apply to this codebase.

#### 5. No designer budget

Art is AI-generated and the owner does not draw. Prefer fixes that reuse assets already on disk over anything requiring new illustration — see §13, where six of nine recommended fixes need no new art at all.

---

## 3. Stack, repo map, and toolchain

### Stack

| Layer | Choice | Version |
|---|---|---|
| Frontend | React + TypeScript + Vite | React 19.2.7, TS 6.0.3, Vite 8.1.3 |
| Routing | `react-router-dom` | 7.18.1 ⚠️ *2 HIGH advisories* |
| Server state | `@tanstack/react-query` | 5.101.2 — mounted globally, used for **2 queries, 0 mutations** |
| i18n | `i18next` / `react-i18next` | 26.3.6 / 17.0.9 |
| Misc | `framer-motion`, `canvas-confetti`, `react-joyride` 3.2.0, `react-helmet-async` | |
| Backend | Flat PHP, no framework, no autoloader, no Composer | PHP 8.5.7 local / **8.2 in CI** |
| DB | MariaDB via PDO (`utf8mb4`, `EMULATE_PREPARES=false`) | 10.6 in CI, 11.4 in prod ⚠️ |
| Mail | PHPMailer, **vendored** at `libs/PHPMailer` v7.1.1, no update path | |
| Hosting | Websupport.sk shared Apache, deployed over **FTPS port 21** | |
| Lint | `oxlint` 1.71 — 45 warnings, 0 errors, **non-blocking** | |

`package.json:2` still names the project `migration-vanillajs-to-react`. `version` is `0.0.0` and never bumped, so there is no way to answer *"what is on lexipaws.eu right now?"*

### Repo map

```
├── src/                    React app (100 tracked files, ~21.7k lines incl. CSS)
│   ├── App.tsx             THE route table + provider tree + auth guard
│   ├── context/            UserContext.tsx (549 lines) = ALL client state
│   ├── components/
│   │   └── LessonPlayer/   The learning loop + 15 exercise renderers
│   ├── pages/              ~20 route components (all eagerly imported)
│   ├── utils/              api.ts, engine.ts, roadmapLoader.ts, audio.ts, …
│   ├── locales/            hu.json / sk.json — 182 keys each, perfect parity
│   └── assets/css/         9,297 lines across 13 files, ONE stylesheet at runtime
├── data/                   144 JSON files — the entire curriculum. Bundled at BUILD time.
│   ├── hu/                 80 files — the only real content
│   ├── sk/                 63 files — a copy of hu/ (see §9)
│   └── migrations/         22 .sql files = the only declared schema
├── api.php                 2,026 lines. 26 routed actions. The whole backend.
├── security.php            Session, CSRF, rate limit, cron token gate
├── api/tts.php             Google TTS proxy + md5 file cache
├── {migrate,beta_admin,upload_avatar,report_problem,mailer,cron_*}.php
├── public/                 32 MB of images; ~1.5 MB actually referenced
├── docs/                   40 files. ~14 describe a deleted app. See §19.
├── reference/              98 files, 37 MB — 51% of all tracked bytes
└── scripts/ tools/         Build, release, security scan, local DB tooling
```

**Tracked-file distribution:** `data` 166, `src` 100, `reference` 98, `public` 89, `docs` 40. `reference/` (design mockups + a `.docx`) dominates clone and CI-checkout cost — and `verify-deploy.yml:104` uses `fetch-depth: 0` on the deploy job, pulling full history on every production deploy.

**Not tracked (verified via `git log --all`):** `dist/`, `release/`, `node_modules/`, `audio/`, `avatars/`, `db_config.php`, `db_config_prod.php`. None were ever committed.

### Missing repo hygiene

No `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, issue/PR templates, `.nvmrc`, `.editorconfig`, Prettier config, or `dependabot.yml`. `README.md` is the **stock Vite template** — and this is a public repo.

---

## 4. Running it locally

Three processes. `vite.config.ts:9-25` proxies exactly four paths to `127.0.0.1:8000`.

```bash
cd "/Users/ladislav/Documents/Documents - Ladislav’s MacBook Pro/Neolix Studio/Learn English Website with NeolixStudio"
npm ci
mysql -u root -e "CREATE DATABASE IF NOT EXISTS neolix_db CHARACTER SET utf8mb4;"
cp db_config.example.php db_config.php   # the example has MORE keys than the current local file
php migrate.php                          # CLI bypasses the token gate (security.php:80-82)
php -S 127.0.0.1:8000                    # terminal A — document root MUST be the repo root
npm run dev                              # terminal B — http://localhost:5173
```

**Traps, all confirmed by reading the code:**

- **On `localhost`, every auth guard is off.** `isLocalDevHost()` (`devEnvironment.ts:1-3`) checks only the hostname string, so guests reach every guarded route (`App.tsx:37`) and `Home.tsx:61` swaps the CTAs for a "Localhost teszt mód" panel. There is no `import.meta.env.DEV` reinforcement — a tunnel or hosts-file alias resolving to `localhost` would open staging the same way.
- **`/report_problem.php` is not in the proxy list** but `ReportProblemModal.tsx:56` posts to it. Report-a-problem is broken under `npm run dev`. Same gap for `/submit_feedback.php` and `/audio/`.
- **Curriculum JSON is not fetched at runtime.** `roadmapLoader.ts:25-26` and `storyLoader.ts:17` use `import.meta.glob(…, { eager: true })`. Editing `data/` needs a rebuild/HMR cycle, not a refresh.
- The `db_config.php` currently on this machine defines only `DB_*` and `SMTP_*`. Every consumer guards with `defined()`, so the app boots — but TTS errors out and password reset throws (`api.php:237`).

### Commands that matter

| Command | What it really does |
|---|---|
| `npm run build` | `tsc -b && vite build`. **Exits 0 today.** |
| `npm run lint` | oxlint. 45 warnings, **exits 0** — gates nothing. |
| `npm run validate:json` | Parses 144 files; applies a real schema check to **one** (`data/quests.json`). Prints "144/144 matched known schema checks" regardless. |
| `npm run security:php` | 4-pattern line-regex smoke scan over 20 PHP files. Exits 0. |
| `npm run package:release` | Wipes and rebuilds `release/` (~38 MB). |

### Current build output

```
dist/index.html                    2.10 kB │ gzip:   0.94 kB
dist/assets/index-*.css          154.21 kB │ gzip:  27.81 kB   ← ~47% unreachable selectors
dist/assets/storyLoader-*.js      79.68 kB │ gzip:  15.19 kB   ← the ONLY split chunk
dist/assets/index-*.js         1,728.41 kB │ gzip: 359.50 kB   ← everything else
```

No `React.lazy` anywhere. All ~20 route components, the lesson player, Joyride, and 2.4 MB of curriculum JSON are in the initial bundle an anonymous visitor downloads. `vite.config.ts` sets no `manualChunks` and no image optimisation. Build also warns about two ineffective dynamic imports (`i18next` in `UserContext.tsx:222`, `utils/api` in `LessonPlayer.tsx:274`).

---

## 5. Frontend architecture

### Bootstrap

`index.html` → `main.tsx` → `App.tsx`.

`main.tsx:15-23`: `StrictMode > ErrorBoundary > QueryClientProvider > App`. The `QueryClient` is created with **zero options** (`main.tsx:13`).
`App.tsx:61-107`: `HelmetProvider > UserProvider > ShopProvider > Router`.

`index.html` hardcodes `lang="hu"` for **all three domains** (`:2`), inlines GA4 `G-9SG38E7R6Q` (`:11-17`), loads the Headway widget (`:36`) and Nunito (`:33`), and emits a static `<title>`/`description`/`canonical` pointing at `https://lexipaws.eu/` (`:20-28`). `SEO.tsx` then emits a *second* canonical and description via Helmet on five pages — Helmet does not remove tags it did not create, so those pages ship duplicates, and the static one always says `lexipaws.eu`.

### Route table (`App.tsx:65-93`)

| Path | Component | Guard |
|---|---|---|
| `/` | `isGatewayDomain ? Gateway : Home` | public |
| `/welcome` | `WelcomeLayout` — **no index child** | `RequireAuthenticated` |
| `/welcome/{start,hear-about-us,why-learning,experience,placement}` | 5 FTUE screens | inherited |
| `/lesson/ftue` | `FTUELesson` | `RequireAuthenticated` |
| `/lesson/characters/:id` | `CharacterLesson` | `RequireAuthenticated` |
| `/dashboard` `/profile` `/friends` `/practice` `/characters` `/leaderboard` | | `RequireAuthenticated` |
| `/contact` `/privacy-policy` `/terms` `/impressum` `/gateway` | | public |
| `*` | `NotFoundPage` | public |

`RequireAuthenticated` (`App.tsx:35-48`) returns **`null`** while `isLoading` — a blank white screen on every guarded deep link during session bootstrap, even though `SkeletonLoader.tsx` already provides skeletons and `ProfilePage.tsx:64` proves the pattern.

Navigating to `/welcome` exactly renders an empty layout — there is no index redirect to `/welcome/start`.

### State: `UserContext.tsx` (549 lines) is everything

No Redux, no Zustand. `ShopContext` is a 25-line modal toggle. `UserProgressData` (`:6-40`) is a flattened remix of three server structures, not a mirror of any.

**`scores` is the real state bag** — an untyped JSON blob holding `bones`, `streak_count`, `streak_shields`, `level`, `active_theme`, `active_nameplate`, `achievements[]`, `node_state{nodeId:{completedLessons[]}}`, `earned_xp_per_node`. Several of these **duplicate real DB columns**; the frontend reads the JSON copies, the crons read the columns, and nothing reconciles them.

Fields the client **never sends back**: `energy`, `last_energy_refill`, `daily_quests_date`, `active_quests`. This is the root of finding #1.

### API client

`src/utils/api.ts` (72 lines) is the live client — a single `api.fetch(action, payload?)`. Method inferred from a `readOnlyActions` set. **It never throws** (`:67-70`): every network error and every non-2xx becomes a *resolved* `{ error: '…' }`. That single decision makes react-query's retry/error machinery inert everywhere except `FriendsPage.tsx:38`, which re-throws by hand.

`src/services/api.ts` is **dead** — zero importers, and it builds a broken URL (`/api.phpget_session`). Its semantics are the *opposite* of the live client (it throws on `!response.ok`, sends no CSRF header), so any future "reuse" of it inherits inverted failure behaviour. Delete it.

**CSRF:** cached in a module variable (`utils/api.ts:1`), filled once (`:23`), attached to every POST. **Never invalidated.** Sessions last 30 days (`security.php:14`); once the PHP session lapses, every POST 403s, the resolved `{error}` is discarded by `updateProgress`, and saves silently stop forever until a full page reload.

### Guest mode

`isGuest` defaults `true` (`:103`), set false only when `get_session` returns a truthy `res.session`. Guest progress = the whole state object in `localStorage["neolix_guest_progress"]`.

**A network blip demotes a logged-in user to guest.** Because `api.fetch` resolves rather than throws, a failed `get_session` yields `{error}` → `res.session` falsy → `UserContext.tsx:169` sets `isGuest = true` → the user's *real* progress starts writing to localStorage, and can later be merged back with `max()`/union semantics (`api.php:681-690`), resurrecting or duplicating progress.

Migration at auth time extracts **only `{points, completed, scores}`** (`guestProgress.ts:7-45`). Energy, learned vocabulary, unlocked themes, quests and notification preferences are silently dropped.

### localStorage keys — the complete list

| Key | Written by | Read by |
|---|---|---|
| `neolix_guest_progress` | `UserContext.tsx:362` | `UserContext.tsx:171`, `guestProgress.ts:8` |
| `user_local_progress` | `FTUELesson.tsx:30` | `guestProgress.ts:9`, `LessonPlayer.tsx:83` (legacy) |
| `guest_base_language` | `i18n.ts:16,24,27` | `i18n.ts` |
| `guest_character_progress` | `Characters.tsx:17`, `CharacterLesson.tsx:26,39` | same — **used for logged-in users too; never synced or migrated** |
| `ftue_marketing_data` | `HearAboutUsScreen:19`, `WhyLearningScreen:19`, `PostLesson:81` | `AuthModal.tsx:69` — **which runs before those screens ever render** |
| `lexipaws_tour_completed` | `ProductTour` | `Dashboard.tsx:33-44` |
| `neolix_active_lesson`, `adhd_volume`, `hasSeenWordTooltipGuide` | various | various |
| `forceBetaRequestModal` | `PostLesson.tsx:681` | `Home.tsx:92` ✅ |
| **`forceLoginModal`** | `NotFoundPage.tsx:7`, `SidebarRight.tsx:177` | **nothing** ❌ |
| **`forceRegisterModal`** | **nothing** | `Home.tsx:92` ❌ |
| **`neolix_language`** | `Gateway.tsx:10` | **nothing** ❌ |

The three ❌ rows are live bugs: the "Bejelentkezés" buttons on the 404 page and in `SidebarRight` navigate to `/` and open nothing. The working pattern is `/?login=true`.

### Page notes

- **`Home.tsx`** — owns the beta-request modal, the only caller of `request_beta_access`. All copy hardcoded Hungarian.
- **`Dashboard.tsx`** — `SidebarLeft` + `Roadmap` + `SidebarRight` + `MobileBottomBar`. Owns energy gating (`:101-131`) and the tour trigger.
- **`Contact.tsx:36-38`** — the form validates, `console.log`s, and shows *"sikeresen rögzítettük"*. **No network call.** Testers reporting problems here get silence.
- **`ProfilePage.tsx:52-56`** — Delete Account is a `confirm()` + an English alert. **No `delete_account` action exists in `api.php`.** GDPR erasure is unimplemented.
- **`ProfilePage.tsx:305`** — the sound-effects toggle is `<input type="checkbox" defaultChecked>` with no `onChange`. It does nothing.
- **`Leaderboard.tsx:138-235`** — ~100 lines of CSS injected through a JSX `<style>` tag on every render. `.leaderboard-row` is defined there but the markup uses `.rank-card` (`:351`), so those rules are dead.
- **`Leaderboard`/`PracticePage`/`Characters`** render `<SidebarRight />` with **no props**, so the mobile stats drawer is permanently unreachable on those routes. `Leaderboard` and `PracticePage` also have no `MobileBottomBar`. (`FriendsPage.tsx:210` *does* render one.)
- **Legal pages** ship `[N/A]` for IČO / DIČ / IČ DPH / court registry and `[Neolix Studio]` in brackets.

### SEO

`robots.txt` disallows the app routes but **omits `/friends`**. `sitemap.xml` lists only `lexipaws.eu` URLs — the gateway domain, not the content domains. No `hreflang` alternates link `.hu` and `.sk`. All meta titles are Hungarian and branded **"Neolix"**, not Lexipaws.

---

## 6. The learning loop

`LessonPlayer.tsx` (563 lines) is the only player in production. Mounted from four places, always `position: fixed; inset: 0; z-index: 1000`:

| Caller | Node source |
|---|---|
| `Dashboard.tsx:192` | roadmap node `originalData` |
| `PracticePage.tsx:70` | synthetic node from `get_weak_words`, or a random story |
| `FTUELesson.tsx:43` | first node of Module_1 |
| `CharacterLesson.tsx:52` | `data/<lang>/characters/<id>.json` |

### Lifecycle

1. Mount adds `body.is-lesson-active`; cleanup calls `stopAudio()`.
2. `selectLessonItems()` (`:106`) resolves items in priority order `lessons[]` → `levels[0].exercises` → `items` → the node itself. For `lessons[]` it picks the first sub-lesson not in `scores.node_state[nodeId].completedLessons`, **falling back to the *last* one when all are done** — so replaying a finished node always replays Part 4.
3. `enrichQuestion` (`:63`) attaches the dictionary and computes `newWords`.
4. Every exercise calls `onAnswer(isCorrect)` eagerly; the player just stores the last value (`:220`). **All answer validation lives inside the exercise components.**
5. `handleCheck` (`:232`) — first press builds `textToRead`, fires TTS, sets feedback, and on a wrong answer POSTs `log_failed_exercise`. Second press advances.
6. Completion renders `<PostLesson>` with a hardcoded `baseXp={15}` and `accuracy = max(0, 100 - mistakes*20)`.

**There is no hearts/lives system inside a lesson.** Mistakes are uncapped and never end the run. The only gate is the global `energy` counter. **Wrong answers are never re-queued inside the lesson** — the only repetition path is server-side via `user_failed_exercises` → PracticePage.

### Exercise registry

Dispatch is a `switch` at `LessonPlayer.tsx:297-330`. Counts are from a `jq` census across all 144 files in `data/`.

| `type` | Component | Validation | Count |
|---|---|---|---|
| `word_order` | `WordOrder.tsx` | join, lowercase, strip `.,!?`, trim | **1920** |
| `fill_blanks` | `FillBlanks.tsx` | `word === answer.split('/')[0]` — **case-sensitive, byte-exact** | **920** |
| `phonics_listen_choose` | `PhonicsListenChoose.tsx` | `opt.correct` | 908 |
| `phonics_compare` | `PhonicsCompare.tsx` | `question.isSame` | 404 |
| `phonics_speak` | `PhonicsSpeak.tsx` | **always `onAnswer(true)`** | 404 |
| `image_choice` | `ImageChoice.tsx` | `opt.correct` | 264 |
| `phonics_match` | `PhonicsMatch.tsx` | all pairs matched — **cannot be wrong** | 204 |
| `true_false` | `TrueFalse.tsx` | `question.answer` | 125 |
| `multiple_choice` | `MultipleChoice.tsx` | **exact string** | 125 |
| `type_in` | `TypeIn.tsx` | `trim().toLowerCase()` | 125 |
| `dictation`, `match_pairs`, `morale_boost`, `harder_encouragement`, `sentence_builder` | components exist | — | **0 — unreachable** |

**Leniency, summarised:** case-insensitivity only in `type_in`, `dictation`, `word_order`. Punctuation stripped only in `word_order`, `dictation`. **Nothing anywhere does typo tolerance, accent folding, alternate-answer lists, or whitespace normalisation beyond `trim()`.** `answer` values containing `/` (e.g. `"am/is"`) are truncated to the first variant by `FillBlanks.tsx:23`.

### Audio / TTS

- Chimes are synthesized with WebAudio oscillators (`audio.ts`). Volume from `localStorage.adhd_volume`, defaulting to **1.0** (`:73`) while `SidebarLeft.tsx:29` shows the slider at **50**. The UI lies on first run.
- `playTTS` → in-memory cache → `GET /api/tts.php` → fallback to `window.speechSynthesis`.
- **Every `audioUrl` in `data/` is `null`** (960/960 phonics slots). 100% of pronunciation audio is runtime TTS from one Google voice (`en-US-Journey-F`).
- **`api/tts.php:80` allows 30 uncached syntheses per hour**, while `WordOrder.tsx:45` preloads *every tile of every word-order question* with no in-flight dedupe. A learner meeting new vocabulary exhausts the quota inside one lesson and silently drops to browser TTS — a different voice, or none at all on some mobile browsers.
- **No speech recognition exists.** `grep -rn "SpeechRecognition|getUserMedia|MediaRecorder" src/` returns nothing. `PhonicsSpeak` is a 2-second `setTimeout` that always awards a correct answer. 404 curriculum items depend on it.

### `PostLesson.tsx` (713 lines)

Nine screens. **Screens 2–8 are static FTUE theatre** — the level-up, the flag, the 50% scale bar, the "1" streak, the 100%-wide quest bar (`:620`) and the bone rain read no real data. Screen 9 is the guest signup wall.

Screen 9 has **no `isGuest` guard**, and `LessonPlayer.tsx:374` passes `isTutorial={isTutorial || userData.points === 0}` — so **any logged-in user finishing their first lesson is shown the guest signup wall**, whose button sets `forceBetaRequestModal` and hard-redirects them out of the app to `/`.

`PostLesson` also always animates **+15 XP** (`LessonPlayer.tsx:371`) while `:381` reports `Math.max(5, 15 - mistakes)`. Six mistakes → the screen says 15, the user gets 9.

---

## 7. Curriculum data model

All content is static JSON under `data/`, pulled into the bundle at **build time** via four `import.meta.glob(…, {eager: true})` calls plus two static imports. **No PHP reads `data/` at all.**

### `module_meta.json` — 4 fields, identical in all 14 files

```json
{ "id": "Module_1", "title": "Module 1: Hello World",
  "description": "Tanulj meg alapvető kávézós szavakat…", "themeColor": "#3b82f6" }
```

`title` is English, `description` is Hungarian **in both language trees**. There is no node list — membership is purely the containing directory.

### Lesson node — 29 per language, identical top-level keys

```
{ title (Hungarian), type: "multi_level_node" (58/58), targetWords[], lessons[4] }
lessons[].{ id: lesson_1..4, title: "Part n/4", introducedWords[], items[8|10|11|15] }
```

**No node file carries an `id`.** `roadmapLoader.ts:62` derives it from the filename. Ids are therefore unnamespaced — two same-named node files in different modules would silently merge their completion state.

`targetWords` (present in all 58 files) is **read by nothing**, yet its union across all nodes is byte-for-byte the key set of `data/hu/vocabulary.json` (172 entries). It is the de-facto authoring source of truth for the dictionary.

### Roadmap assembly

`getCurriculum(lang='hu')` builds modules → nodes → sorts → splices a virtual `chest_<moduleId>` node at `floor(nodes.length/2)` (`roadmapLoader.ts:98-107`), titled the hardcoded Hungarian *"Jutalom Láda"*.

**Both callers omit the language argument** (`Roadmap.tsx:20`, `FTUELesson.tsx:10`), so the roadmap is always Hungarian.

### Other content shapes

- **Stories** — `{title, type:"reading_node", story:{en, hu}, items[15]}` (5 each of true_false / multiple_choice / type_in). `LessonPlayer.tsx:346,460` hardcode `story.hu`. Reached only from PracticePage via `getRandomStory()` — also with no language argument.
- **Phonics** — `{id, type:"character_lesson", title, characters[IPA], lessons[5]}`. Progress stored per-IPA in `localStorage`, never server-side.
- **Grammar** — `data/hu/grammar.json`, keyed `Module_1..7`. **Statically imported** by `GrammarModal.tsx:2`, so it is Hungarian-only for everyone.
- **Vocabulary** — flat `Record<string,string>`, 172 entries. **Statically imported** from `data/hu/` by `LessonPlayer.tsx:23`.

### Content defects found

- **One exercise is unsolvable.** `data/hu/A1/Module_2_Me_And_My_People/node3_family_ties.json`, `item_df635034`: the **uncommitted working-tree edit** sets `correctAnswer` to *"Hello, my name is… He is my brother."* while `scrambledWords` still offers only `She` / `sister.` — no `He` tile. A scan of all 1920 word_order items with `WordOrder.tsx`'s exact normalizer found this is **the only** unsolvable one. It will ship if committed as-is.
- **124 of 132 `image_choice` items per language have only 2 options** — a 50/50 coin flip presented as a picture quiz. Only Module_1 node1's 8 items have 4.
- **Six `image_choice` prompts leave the L1 word in English** — `tea`, `sugar`, `orange`, `lemon`, `apple`, `pizza`. *"Which of these is the 'apple'?"* with `apple` as an option.
- **`Module_6_Out_And_About` has no `node4`** — files jump node3 → node5. Git history shows no deletion; it was never authored.
- **`characters/s_z_pairs.json` breaks the schema** — no `id`, top-level `items[]` instead of `lessons[]`, and it is absent from the 20-group list in `Characters.tsx:42-63`, so it is unreachable except by hand-typing the URL.

### `validate:json` gives false assurance

`scripts/validate_json.js:155-167` dispatches schema validators **by basename** against `quests.json`, `words.json`, `fillBlanks.json`, `trueFalse.json`, `wordOrder.json`, `sectionExam.json`. Exactly **one of 144 files** matches. The other 143 get a bare `JSON.parse`. Line 208 nevertheless prints *"144/144 files also matched known schema checks."*

Nothing checks: solvable word_order tiles, answer-present-in-options, exactly-one-correct-option, duplicate item ids, or hu/sk parity.

---

## 8. Gamification & economy

**All reward math is client-side.** The browser decides what it earned, writes it into its own state, and pushes the blob to `save_progress`, which applies only *delta caps*.

| Resource | Earned | Spent | Authority |
|---|---|---|---|
| **XP** (`points`) | lesson `max(5, 15-mistakes)`; boss 30; chest 50 | **no sink at all** | client; server clamps to `[current, current+100]` per call |
| **Bones** 🦴 | lesson +1 (+3 premium); tutorial +5; chest +25 *(only if module ≥6 nodes)*; quests 1–2; feedback +20 | shield 100, fall theme 200, halloween 500 | client; +100/call cap |
| **Streak Shields** 🛡️ | shop, tutorial, leaderboard | **never consumed by any code path** | client-only, and stored in **two disconnected places** |
| **Energy** 🔋 | +1 per 2h to max 5; feedback refill | −1 per lesson start | **effectively client-only — see below** |
| **Streak** 🔥 | +1 whenever `daily_quests_date !== today` | never decremented | client-only |
| **Themes** | purchase | 200 / 500 | **server-authoritative** ✅ (`handleBuyCosmetic` prices from a server catalog and ignores the client's `cost`) |
| **weekly/monthly XP** | server mirrors the points delta | — | server ✅ |

### What is actually broken here

Almost all of it traces back to finding #1:

- **Energy does not persist.** Never sent in the payload; `api.php:982` defaults it to 5. **Reloading the page restores full energy.** The monetization gate is bypassable with F5.
- **The streak inflates once per page load.** `daily_quests_date` is nulled by every save, so `UserContext.tsx:192` sees a "new day" on every bootstrap and `:213` increments. The streak is *"number of times the app was opened"*.
- **Purchased themes deactivate themselves.** `active_theme` is reset to `'default'` on every save; the next `get_session` maps that back to `'system'`. A user who paid 500 bones for Halloween loses it after any lesson. (The *inventory* row survives.)
- **Daily quests reroll on every page load**, so the same three can be farmed repeatedly.
- **The quest-persistence call is a guaranteed no-op.** `UserContext.tsx:229-235` posts to `update_progress`, which reads **only** `$data['xp']` (`api.php:1155-1202`) and errors when it is absent. No caller anywhere sends `xp`. `handleUpdateProgress` is entirely dead server code — *and it is also the endpoint an attacker would use to mint XP.*
- **Achievements are noise.** `accuracy` is the literal `100` at all five `completeLesson` call sites (verified: `Dashboard.tsx:197,210`, `CharacterLesson.tsx:23`, `PracticePage.tsx:64`, `FTUELesson.tsx:20`). The `flawless` achievement and the `q_acc_100`/`q_acc_90` quests fire on everyone's first lesson. *(Nuance: `LessonPlayer.tsx:371` does compute a real accuracy and `PostLesson` consumes it — the value is discarded only at the `completeLesson` boundary.)*
- **Friends is broken for anyone with a friend in a league.** `api.php:1996-1999` reads `monthly_xp` from `user_progress`; the column lives on `user_leagues` (`09_add_monthly_xp.sql`). The subquery sits inside `if ($friend['league_id'])`, so friends with no league row are skipped — but any league member throws, and the `catch` at `api.php:2022` collapses the whole response into an empty state.
- **Streak shields are stored twice and never used.** `claim_reward` writes the `user_progress.streak_shields` **column**; the client reads `scores.streak_shields` (**JSON**). The column is zeroed by the next save. Leaderboard shield rewards are invisible and immediately lost. Nothing anywhere decrements a shield against a missed day.
- **The sidebar leaderboard always shows Bronze** — `SidebarRight.tsx:27` calls `get_leaderboard` with no `league_id` and `api.php:1342` defaults to league 1. The locale string even hardcodes *"Heti Ranglista (Bronz Liga)"*.
- **"Personal Level" is permanently 1** — `scores.level` is declared and rendered but never written anywhere in `src/`.
- **Most chests give nothing.** `Roadmap.tsx:61-64` grants bones and energy only when a module has ≥6 nodes; with the injected chest only Module_4 qualifies. The other six fire full confetti for 50 XP.
- **Leagues never demote.** `league_id` is recomputed from *lifetime* points on every save. Early adopters permanently occupy Diamond and its 3.0× reward multiplier.
- **`cron_reset_leaderboards.php` is not idempotent** — no "already ran this period" guard. Two `?type=weekly` invocations double every prize.
- **The economy is unbalanced ~100×** — a lesson pays 1 bone, the cheapest item costs 100. Excluding the 100-bone guest grant and the +20 feedback widget, the Halloween theme is ~500 lessons away.
- **`data/quests.json` is dead data.** The live pool is hardcoded Hungarian at `UserContext.tsx:195-202` with different ids, a different schema and 1–2 bone rewards vs the file's 5–50. The file is still shipped by `build_release.js:61` and is the *one* file `validate_json.js` really validates.
- **Bones have four names in the UI:** "Lexi Treats", "Csont", "Jutalom Falatok", "Maškrty".

### The minting holes, precisely

1. **Signup/login guest migration is uncapped.** `handleSignup` stores `guest_migration.scores` verbatim and `mergeGuestProgressIntoUser` (`api.php:667-696`) merges numerics with `max()` and **no cap**. The payload is `localStorage["neolix_guest_progress"]`, fully user-controlled. Editing one key before logging in grants arbitrary bones, XP, achievements and streak — bypassing every delta cap.
2. **`save_progress` / `update_progress` have no rate limit.** The only `security_rate_limit` calls in `api.php` are on beta request, signup, login, forgot/reset password and feedback. A loop mints +100 XP and +100 bones per request forever.
3. **Mass assignment.** `parseProgressData` writes 17 client-supplied fields straight through. Only points, bones, shields, node `current_level` and energy are checked. `unlocked_items`, `active_theme`, `level`, `completed`, `earned_xp_per_node` are stored verbatim — a client can hand itself every cosmetic and every completed node, bypassing the paid `buy_cosmetic` path entirely.
4. **Client-driven email bombing.** `streak_count` is unvalidated input, and `api.php:1104-1113` sends a milestone email whenever the incoming streak exceeds the stored one and equals 7/30/100. Alternating between 6 and 7 sends an email per round trip through the live SMTP account — risking the sender reputation of `noreply@lexipaws.eu` exactly when Beta invites need to land in inboxes.

---

## 9. Internationalization (HU / SK)

**The UI shell is genuinely bilingual. The product is not.**

### What is right

`src/locales/hu.json` and `sk.json` have **exact key parity**: 182 leaf keys each, 12 namespaces, **0 missing either way**. The Slovak is authentic, good-quality Slovak — not placeholder, not leftover Hungarian. The six email templates in `templates/emails/` all branch correctly on `$data['language']`. **This is the only fully-localized subsystem in the app.**

### What is wrong

**Coverage.** 13 of 68 `.tsx` files import `useTranslation`; **51 contain Hungarian string literals**. The locale files cover roughly 7% of user-facing strings.

**32% of the translated keys are never used** — and two whole namespaces are dead:

- **`tour.*` (32 keys)** — a fully translated 8-step dashboard tour and 9-step leaderboard tour in both languages. `ProductTour.tsx:133-172` ignores them entirely, does not import `useTranslation`, and hardcodes **four English steps**. Joyride's own buttons render "Next"/"Back"/"Skip". *The first thing every new user sees is in the wrong language for both markets.*
- **`leaderboard.*` (16 keys)** — `Leaderboard.tsx` hardcodes the Hungarian equivalents instead.

**Five `t()` keys resolve to nothing** and always render their Hungarian inline fallback: `levels.a1_desc`–`b2_desc` (`SidebarLeft.tsx:399-402`) and `dashboard.title` (`Dashboard.tsx:152`).

**Every exercise instruction is a hardcoded Hungarian literal** — no file under `exercises/` imports `useTranslation`. This is the core learning loop.

**All backend errors are Hungarian-only** — 74 lines in `api.php` with no language branch, surfaced verbatim via `AuthModal.tsx:101-102`. A Slovak user who mistypes a password gets *"Hibás e-mail cím vagy jelszó!"*.

**A third language leaks in:** `FriendsPage`, `LexiFeedbackWidget`, `AvatarUploadModal` and ProfilePage's Account Actions are hardcoded **English**.

### Content parity

| Metric | HU | SK |
|---|---|---|
| JSON files | 80 | 63 |
| A1 nodes / items | 29 / 1552 | 29 / 1552 |
| Stories | 21 | **4** |
| Commits ever touching the tree | 3 | **1** |

`diff -rq data/hu data/sk` reports **exactly two differences**: `story_5.json`–`story_21.json` (17 files) exist only in HU, and `Module_2/node3_family_ties.json` differs. Everything else — all 1420 base-language prompts, grammar, vocabulary, phonics — is **byte-identical Hungarian**.

*(Correction to an earlier internal finding: the SK tree is not literally byte-identical; those two differences are real. The practical conclusion is unchanged.)*

**The schema itself is HU-bound.** The base-language field is named `"hu"` — 1420 occurrences in *both* trees — and consumers read it unconditionally. `docs/curriculum_discussion.txt:129-134` records this as a deliberate deferral: *"leave it as hu key and will see what I decide once I get to building the Slovak version."*

**Drift has already started.** Two content bug fixes landed in `data/hu/…/node3_family_ties.json` and were never mirrored; `data/sk` still serves content the team has already identified as wrong. There is no sync tooling and no CI parity check.

### Language resolution — two implementations that disagree

`i18n.ts:15-32` (module load): `?land=` → `?lang=` → hostname TLD → `localStorage` → `'hu'`.
`UserContext.tsx:58-66` repeats the logic but **only reads `lang`, never `land`**, then force-applies the DB value at `:222-224`. So `?land=sk` works for guests and is silently reverted for authenticated users.

**Signup derives `base_language` from hostname only** (`AuthModal.tsx:80-82`). Anyone registering via `lexipaws.eu` or a shared link is permanently written to the DB as `hu`.

---

## 10. Backend API

Flat PHP on shared hosting. `api.php` is a single 2,026-line front controller with a `switch` over **26 routed actions**. Unknown actions return `{'error':'Invalid action'}` with **HTTP 200**.

### Session & auth

- 30-day cookie, `httponly`, `samesite=Lax`, `secure` only when HTTPS is detected (`security.php:8-20`).
- `password_hash(PASSWORD_DEFAULT)` / `password_verify`. ✅
- `session_regenerate_id(true)` on signup, login and beta-admin login — **but not after `update_password` or `reset_password`**, and neither invalidates other sessions. With 30-day cookies, a captured session survives the victim changing their password.
- **Password policy caps length at 16 characters** while requiring four character classes (`api.php:48`). This blocks password-manager secrets and pushes users toward weaker hand-made passwords. Client-side validation checks only `length >= 8`, so users hit server rejections after submitting.
- Password reset: `random_bytes(32)`, SHA-256 hashed before storage, 1-hour expiry, cleared on use, link base from an allowlisted `APP_BASE_URL`. ✅ Well done.

### CSRF

Token in `$_SESSION`, compared with `hash_equals`. Enforced at `api.php:89` **only when a session user exists** and the action isn't exempt. A second layer, `security_validate_same_origin()`, runs on POST only — and **both an absent `Origin` and an absent `Sec-Fetch-Site` pass**.

⚠️ **The CORS allowlist is duplicated in two files that must be edited together** — `api.php:7-26` (used by `api.php`) and `security.php:22-35` (used by `api/tts.php`). Both still include `https://neolix.studio` and four `localhost` origins **in production**, with `Access-Control-Allow-Credentials: true`. Since `csrf_token` is served over GET, script on any of those origins can fetch a token with credentials and drive every authenticated action.

### Rate limiting is not rate limiting

`security_rate_limit()` (`security.php:105-121`) stores counters in **`$_SESSION`**. The bucket keys embed `REMOTE_ADDR`, which makes them *look* IP-scoped, but the storage is per-session. **Dropping the cookie resets every limit** — login brute force, signup flooding, password-reset flooding, beta-request spam, and the TTS quota, all simultaneously.

The one durable limiter is `betaRequestDatabaseRateLimitError()` (`api.php:338-362`), which counts rows by SHA-256 IP hash (10/hour, 30/day). ✅

The TTS limit is the one with a direct cash cost: `api/tts.php` has **no session check**, so anyone who can reach the endpoint can bill the Google account.

### Public endpoints that need attention

| File | Protection | Note |
|---|---|---|
| `beta_admin.php` | `MAINTENANCE_TOKEN` only | **No rate limit, no lockout, and not in the `.htaccess` deny list.** A compromise mints unlimited invites and exposes every applicant's email, name and message. |
| `migrate.php` | `MIGRATION_TOKEN` | Reachable over HTTPS in production after deploy. Grants schema execution. |
| `cron_*.php` | `CRON_SECRET` | `security.php:92` accepts the secret from **`?secret=`**, so it lands in access logs, proxy logs and Referer headers. |
| `report_problem.php` | **none** — no session, no CSRF | Sends via bare PHP `mail()` into a Jira intake, with the reporter's unverified email in `Reply-To`. Expect spam on day one. |

### Other backend notes

- `sendTemplateEmail()` calls `extract($data)` **before** computing the template path from `$templateName` (`mailer.php:148-150`). No current caller passes a hostile key, but it is a live LFI/redirect footgun one careless call away.
- `handleSyncVocabulary` returns the **raw PDO exception message** to the client (`api.php:1571`) — the only handler that does. It will also fatal on a non-string array element (`:1556`).
- `weekly_report` emails are **always Hungarian** — `cron_reset_leaderboards.php:91-97` omits the `language` key.
- Username escaping is inconsistent: `htmlspecialchars` in `get_session`/`login`/`signup`, **raw** in `get_leaderboard`/`search_leaderboard`/`get_friends`.
- Slack POSTs set **no `CURLOPT_TIMEOUT`** — a hung Slack stalls a PHP worker on every feedback and beta-request submission.
- `handleUpdateAvatar` (`api.php:814-836`) has **no `case`** in the switch and no caller. Dead.
- `submit_feedback.php` and `logout.php` have no frontend callers but are still shipped by `build_release.js`. The former is a stale fork that never grants the 20-bone reward and never actually refills energy.
- `formatUserProgress(array $progress)` is called with `fetch()`'s result, which is `false` when a user has no `user_progress` row → **TypeError**, which `catch (Exception)` cannot catch → `get_session` 500s. *(This is rarer than it sounds — signup and guest-merge both always insert the row — and it does **not** break the deploy health check, which runs with no session cookie and returns early.)*

### Secrets — the good news

`db_config.php` and `db_config_prod.php` are **gitignored and were never committed** (verified: `git log --all -- db_config*.php` is empty; the SMTP password string is absent from history). `.htaccess:14-16` denies HTTP access to both.

**However**, both files sit in the working tree with live production values: DB credentials, `MIGRATION_TOKEN`, and the SMTP password for `noreply@lexipaws.eu`. They were read during this audit. **Rotate `MIGRATION_TOKEN` and the SMTP password** — the first grants schema execution on production, the second can send as the brand domain. Nothing reads `db_config_prod.php`; it is pure credential residue and should be deleted.

---

## 11. Database

Single MariaDB. Every backend script opens its own PDO connection from `db_config.php` constants. **No ORM, no shared connection helper, and no schema baseline** — the only declared schema is 22 `.sql` files in `data/migrations/`.

The schema is **MariaDB-only** (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). It will not apply to stock MySQL.

### Tables

| Table | Migration | Notes |
|---|---|---|
| `users` | 00, 04, 06, 15, 16, 19 | email/username unique; `marketing_data` + `notification_preferences` JSON; `base_language` |
| `user_progress` | 00, 01, 02, 07, 11 | **`user_id` is the PK.** 17 columns. `completed`/`scores` are TEXT JSON blobs. |
| `user_subscriptions` | 00 | `role`, `subscription_tier` |
| `user_failed_exercises` | **04 and 12 (identical)** | UNIQUE `(user_id, level, exercise_id)`. **No FK.** |
| `leagues` / `user_leagues` | 05, 09 | Seeded **Bronze/Silver/Gold/Diamond** at 0/500/1500/5000. `user_leagues` has **no FK to users**. |
| `user_rewards` | 10 | **FK commented out, no index on `user_id`** → `get_pending_rewards` full-scans |
| `user_vocabulary` | 13 | `strength`/`last_reviewed` are SRS scaffolding with zero readers |
| `user_inventory` | 14 | The real source of theme ownership ✅ |
| `user_friends` | 17 | PK `(user_id, friend_id)`, both FK CASCADE |
| `beta_invites` / `beta_access_requests` | 20 | sha256 code hashes, sha256 ip_hash ✅ |
| `character_progress` | 08 | **Created but never read or written by any PHP.** Dead table. |
| `migration_history` | 03 | Bootstrap |

### Tables that exist only at runtime

- **`tts_cache`** — created by `CREATE TABLE IF NOT EXISTS` on **every single TTS request** (`api/tts.php:61-66`). In no migration. Keyed by **md5** (the docs say SHA-256).
- **`user_metadata`** — queried in four places for one column, `last_feedback_refill` (`api.php:1713,1726`, `submit_feedback.php:42,57`). **No migration creates it.** On any DB built from migrations, the energy-refill-for-feedback loop throws — which is exactly the mechanism intended to harvest Beta feedback.

### The migration runner

`migrate.php` globs + `sort()`s by filename, applies unapplied files one per transaction, and **breaks at the first failure**. Tracking is **by filename with no checksum** — editing an applied file is silently a no-op forever. Two files share the `04_` prefix, so the numbering is no longer a total order.

**MariaDB implicitly commits on DDL**, so the per-file transaction cannot roll back a partially applied `CREATE`/`ALTER`. The rollback is cosmetic for every migration except 04 (a `DELETE`) and 18 (an `UPDATE`). A failure leaves production half-migrated, unrecorded, with the next run re-executing from the top.

`04_add_username_unique_constraint.sql:6-8` issues an **unguarded destructive `DELETE`** across `users` before adding the constraint. Safe today only because `migration_history` prevents a re-run.

### Missing indexes on hot paths

| Query | Gap |
|---|---|
| Leaderboard `WHERE league_id ORDER BY weekly_xp DESC` | no `(league_id, weekly_xp)` / `(league_id, monthly_xp)` → index scan + filesort |
| Friends join | `ON (…) OR (…)` across two columns defeats both indexes; `status` unindexed; per-friend rank query runs in a PHP loop (N+1) |
| `get_pending_rewards` | `user_rewards` has only a PK → full scan |
| Password reset `WHERE reset_token = ?` | **unindexed full scan of `users`, on an unauthenticated endpoint** |
| Beta rate limit `WHERE ip_hash = ?` | **unindexed, unauthenticated** |

The last two are cheap DoS amplifiers during an open Beta.

### No erasure path

`grep "DELETE FROM users"` finds only migration 04. And `user_leagues`, `user_rewards`, `user_failed_exercises` and `character_progress` have **no `ON DELETE CASCADE`**, so a manual delete orphans rows rather than cleaning up. GDPR erasure needs those FKs first.

---

## 12. Design system: documented vs. actual

> **Why the guide and the code disagree — resolved.** `docs/guides/design_guide.md` is not a wrong description of this app; it is an **accurate description of the *previous* app**, the vanilla-JS build still living on `origin/main`. The React rewrite on `dev` changed the product substantially and the design language went with it, but the guide was never rewritten. Treat it as a historical document, not a spec. **The owner has decided to author a new design system for the current app** — see §12.1.

`docs/guides/design_guide.md` describes a **dark-by-default OKLCH neon glassmorphism** system in **Outfit + Inter**. The code is a **light-by-default hex** system in whatever the OS sans-serif is. Every specific value in the guide's palette table is wrong *for this codebase*.

| Guide says | Reality |
|---|---|
| "Dark Mode by Default" | `main.css:7` `:root` is **light** (`#F9FAFB`); `UserContext` defaults to `'system'` |
| Full OKLCH token table | Palette is **hex**. Only `--color-success` / `--color-error` are OKLCH. |
| `--color-accent-in` = Neon Blue | Defined `#3b82f6`, **resolves to `#10B981` green** — a rogue bare `:root` at `landing.css:202-215` loads after `main.css` and wins, in light *and* dark |
| Outfit + Inter "loaded globally" | **`index.html:33` loads only Nunito.** No `@font-face` anywhere. Both tokens silently fall back to generic `sans-serif`, while `dashboard.css:2849` sets `* { font-family: 'Nunito' }` and `landing.css:218` forces it with `!important`. |
| Shop themes: Cyberpunk + Nature | Shop sells **fall** and **halloween**. Cyberpunk and Nature are unreachable dead CSS — `UserContext.tsx:269-282` only ever sets `dark`/`light`/`fall`/`halloween`. |
| `.proto-card` glassmorphism | `.proto-card` exists at `dashboard.css:2322` and is **never rendered** |
| Locked nodes `pointer-events: none` | `roadmap.css:92` uses `cursor: not-allowed` only — locked nodes stay clickable |
| Single column below 1024px | Real threshold is **992px** |
| 44px minimum touch targets | Violated by `.btn-secondary` 30px, `.btn-primary` 36px, `.btn-close-icon` 36px, `.info-tooltip` 16px, `.interactive-submit-btn` 40px |
| The reduced-motion block | Present **verbatim, including its bug** (below) |

### CSS reality

**13 files, 9,297 lines, bundled into ONE 154 KB stylesheet.** Because `App.tsx` imports every page statically, **every rule applies on every route** — "page-scoped" CSS does not exist here.

- **`src/index.css` and `src/App.css` (313 lines) are the unmodified Vite scaffold and are imported by nothing.** They define a conflicting purple token set. `docs/frontend/CSS_Architecture.md` points new contributors at exactly these two dead files.
- **`dashboard.css` is three files in a trench coat:** shell + exercise UI (1–2836), a **pasted-in standalone prototype** with its own `:root`, its own `*` reset, its own `body` gradient and global `h1,h2`/`p` rules (2837–3605), and an override layer that partially undoes both (3607–4479). `dashboard.css:3680` band-aids the body damage back with `!important`.
- **`landing.css` is two designs stacked** — glassmorphism (1–200) then a flat "Duolingo" repaint (202–455) that overrides it with 95 `!important`s.
- **`.dashboard-container` is defined 10×** and `.dashboard-right-sidebar` **15×**. All four `grid-template-columns` variants are dead; the winner is `dashboard.css:4405` (`display: block !important` + padding gutters).
- **`!important` density:** dashboard 401, interactive 160, landing 95, main 64.
- **272 of 575 class names (47%) appear in no `.ts`/`.tsx` file.**
- **Four universal `*` resets ship in one bundle.**
- **The whole 9,297-line corpus contains exactly one comment.** Commits `4dc050b` / `d361c21` ("Remove excessive code comments") stripped every section marker, so the boundaries between stacked design generations are now invisible.

### Live CSS bugs

- **`.cards-grid` collides and breaks the landing page.** `landing.css:44` makes it a 4-column grid for Home's level cards; `gateway.css:98` redefines it as a flex column. Gateway loads last (bundle offset 149169 vs 29784), so **Home's level grid never renders as a grid**. This is the first screen a visitor sees.
- **`gateway.css:43-54` sets `body { display:flex; align-items:center }`** as the last `body` rule in the bundle — every page in the app has a flex-centered body.
- **Reduced motion does not work.** `main.css:354` uses `animation-duration: -1ms`, which is invalid CSS and is dropped by every parser. *(The block's other five declarations — `animation-delay`, `iteration-count`, `background-attachment`, `scroll-behavior`, `transition-duration` — are valid and do apply.)* Net effect: animations still play once at their **full authored duration**, including infinite background loops and the paid themes' particle fields.
- **`scaleUp` and `slideInRight` have no `@keyframes` anywhere** — four modal entrance animations silently do nothing. `fadeIn` is defined only inside `PostLesson.tsx`'s `<style>` tag but used by three other components, so it only animates while PostLesson happens to be mounted.
- **Seven custom properties are used but never defined:** `--color-bg-body`, `--color-border`, `--color-bg-main`, `--color-bg-inset`, `--glass-border-color`, `--color-bg-active`, `--border-color`.
- **`--glass-border` is a shorthand** (`1px solid #E5E7EB`) used as a color in four places — all invalid and dropped.
- **`interactive.css:933-936` selects on inline-style string content:** `:has(.interactive-feedback-message[style*="rgb(5, 150, 105)"])`. Any change in how React serialises that colour silently breaks the correct-answer footer tint.
- **A third styling layer exists:** 22 `@keyframes` live inside `<style>` tags in six TSX components, some shadowing CSS-file definitions.
- **`RewardPopup.css` hardcodes a dark gradient with white text** — unreadable by design on the default light theme. Same class of problem in `legal.css`.

### Breakpoints

20 distinct values across 39 media queries, no shared scale. Three near-duplicate desktop thresholds coexist: **991 / 992 / 1199 / 1200** — and the design guide documents a fourth (1024). Two byte-identical media queries in `interactive.css` (lines 1180 and 1267) carry conflicting values.

**`root-fix.css` is two-thirds band-aid.** Its `overflow-x` and `box-sizing` rules duplicate `main.css`; only the `#root` flex-column rule is load-bearing. It was patching `index.css`'s `#root { width: 1126px }` — a threat that no longer exists since `index.css` was unhooked. Merge the `#root` rule into `main.css` and delete all three files.

---

## 13. Art, assets, and the mascot

> You said you're stuck here — no designer budget, can't draw, relying on AI generation. **The art is not your problem. The plumbing between the art and the app is.** You already own a genuinely good character bible; almost none of it reaches the screen.

### The numbers

`public/` ships **32 MB** of images (34 MB in `dist/`, ~38 MB in `release/`). Roughly **1.5 MB is referenced by code. ~30.4 MB is orphaned** — and all of it is copied verbatim into the deploy by `build_release.js:39`.

| Size | File | Used? |
|---|---|---|
| 5.20 MB | `Lexipaws app logo and icon.png` | no |
| 4.36 MB | `Lexipaws macot.png` | no |
| 2.01 MB ×2 | `tohave_verb_visual.png` (in **both** image dirs) | no |
| 1.36 MB | `stars.jpg` | no |
| 1.16 MB | `cartoon-pitbull-illustrated-collection/5378926.eps` | no |

**`public/images/` is a byte-identical duplicate** (md5-verified) of 22 files in `public/assets/images/` — 8.3 MB of pure duplication. Nothing references `/images/*`.

The four traced SVGs are wildly oversized for their render size: `new-icon.svg` **469 KB / 226 paths at 80×80**, `chest.svg` **316 KB at 80×80**, `energy.svg` **112 KB at 24×24**, `single-star.svg` **62 KB at 56×56**.

No WebP/AVIF, no `srcset`, no `<picture>`, no build-time optimisation, and **no `Cache-Control` or `Expires` header for any static asset** in either `.htaccess`.

### Tyler vs. Lexi — and the 404s it caused

The rename happened in code and copy but **never on the filesystem**: 26 of 26 mascot PNGs are `tyler-*`, every component is `Lexi*`. Two `<img>` tags were then written against the *new* name:

- `LexiFeedbackWidget.tsx:84` and `FeedbackRefillModal.tsx:73` → `/assets/images/lexi-mascot.png` — **no such file exists**. The widget is a persistent floating button on every dashboard screen.
- `Onboarding.tsx:64` → `lexi-head.png` (real file: `tyler-head.png`) — real, but **`Onboarding.tsx` has zero importers and never renders**, so this one does not ship. *(An earlier internal finding called this "the first screen a new user sees." It is dead code — corrected.)*
- Separately, `ProfilePage`, `FriendsPage` and `AvatarUploadModal` fall back to `/avatars/default.png`. **`public/avatars/` does not exist and is gitignored**, so the default avatar 404s for every user without an upload — and `FriendsPage`'s `onError` handler re-triggers on its own fallback.

### Five mascot renderings; users only ever see the worst one

1. **Hand-coded grey SVG** — the same path data copy-pasted into `LexiMascot.tsx`, `LexiAnimation.tsx` and `Gateway.tsx`. Reads as a grey hippo/bear: ears at the far edges like horns, featureless dark muzzle, forehead wrinkles floating outside the silhouette, a detached white circle for a paw. **No teal collar, no white chest blaze** — the brand mascot's two identifying features. This is what appears on the landing page, the language gateway, and inside `FillBlanks` exercises: the three highest-traffic surfaces.
2. **`Tyler-asset-pack.png`** (899 KB) — a genuinely good 2D cel turnaround: 6 head angles, 5 body views, 8 expressions, separate ears and tails. **Unused.**
3. **`Lexipaws macot.png` / `Lexipaws app logo and icon.png`** — polished flat-vector brand art, but they are *poster mockups with fake UI baked in*, not extractable assets. **Unused.**
4. **`public/images/tyler-3d/{run1,run2,skid,sit}.png`** — photoreal 3D, clearly cut for exactly the four states of the landing run-in animation. **Unused**; the SVG frames were hand-built instead.
5. **`boss_character.png`** — a dragon from a different franchise, **and it is a JPEG with a `.png` extension** (`file`: `JPEG image data, … 1024x1024, components 3`, no alpha, white corner pixel). It renders at 350×350 over a dark navy gradient → **a white square on the boss arena**.

Renderings 2, 3 and 4 *do* share a consistent character design — dark blue-grey AmStaff, white chest blaze, teal collar. **You have a real character bible.** The gap is entirely delivery.

### The single most damaging asset defect

**All 26 "Transparent PNGs" are the full 768×1364 source sheet with everything else erased — not crops.** Alpha bounding boxes: `tyler-jump.png` = 241×343, **7.9% of the canvas**; `tyler-head.png` 1.7%; the head expressions **0.6%**.

With `objectFit: contain` in `PostLesson.tsx:312`'s 200×200 box, the dog renders at roughly **35×50 px, offset below centre**. That is the lesson-completion celebration — the app's emotional payoff — and the mascot is a thumbnail floating in empty space. Same defect at 280px and 220px on the level-up and reward screens.

### Icon system: four parallel systems

| System | Count | Where |
|---|---|---|
| Inline JSX `<svg>` | 44 across 19 files | sidebars, Home, PostLesson, Gateway flags |
| `svgDictionary.json` | 136 entries | `ImageChoice.tsx` only |
| `<img>` to `public/*.svg` | 4 | chest, planet, star, energy |
| **Unicode emoji** | **231 instances, 74 distinct glyphs** | `ShopModal` 29, `SidebarLeft` 26 — *the entire main nav* |

Those emoji render as Apple Color Emoji on your Mac and as Segoe/Noto on the Windows + Android machines your Hungarian and Slovak audience actually uses. **The app looks materially different to your users than it does to you.**

`svgDictionary.json` is the healthiest asset in the repo: 136 keys, **all used, zero orphans, 100% coverage of all 560 image-choice options**, consistent flat style. Two defects: `water` and `apple juice` are byte-identical, and **19 icons literally spell the English answer in a `<text>` element** (`SUGAR`, `MILK`, `NOT`, `BUT`, `NOW`, `TODAY`, `HERE`, `WAS`, `WERE`, `CANNOT`, `CAN'T`, `ISN'T`, `AREN'T`, `DIDN'T`, `DON'T`, `DOESN'T`, `DO NOT`, `DOES NOT`, `ORANGE JUICE`) — so **34 of 264 image-choice exercises (13%) label their own correct answer**.

### Two brand-level own-goals

- **The favicon is a purple lightning bolt** — `public/favicon.svg` is scaffolding-template art, served live via `index.html:5`. Every browser tab, bookmark and home-screen shortcut carries someone else's logo. (`public/icons.svg`, a Bluesky/Discord/GitHub sprite, is likewise leftover and referenced by nothing.)
- **`og:image` points at an SVG** (`index.html:27`, `SEO.tsx:17`). **No major platform renders SVG OG images** — Facebook, Messenger, WhatsApp, Slack, LinkedIn, X and iMessage all preview **blank**, while `twitter:card` is set to `summary_large_image`. Every link shared during Beta recruitment previews empty.

### The pipeline is not reproducible

`tools/local/assets/extract_svg.cjs:4` reads a hardcoded path into **a dead Gemini/Antigravity IDE chat transcript on your machine** to recover `new-icon.svg`. There is no source design file, no export script, no manifest. If those four traced SVGs ever need regenerating, there is no path back.

### ⚠️ Licensing flag

`public/assets/images/cartoon-pitbull-illustrated-collection/` contains `5378924.ai`, `5378926.eps` and `5378928.jpg` — dated April 2021, with sequential stock IDs. These are **tracked in git, publicly served, and copied into every deploy**. Redistributing licensed vector *source* is a licence-terms problem regardless of whether the art is used, and `Terms.tsx:49` asserts that all site graphics are yours or licensed. Please confirm the licence and, if it is standard stock, remove them from git history — not just from `public/`.

### The cheapest path to "this looks like a real product"

Ordered by impact ÷ effort. **Items 1–6 need no new art at all.**

1. **Fix the mascot 404s** — point `LexiFeedbackWidget.tsx:84` and `FeedbackRefillModal.tsx:73` at a file that exists, and ship an `avatars/default.png`. ~10 minutes.
2. **Crop the 26 Transparent PNGs to their alpha bounding boxes.** One script. `tyler-jump.png` goes from a 35×50 dog in a 200×200 box to filling it. **The single biggest perceived-quality change available, and it costs nothing.**
3. **Re-export `boss_character.png` as a real PNG with alpha.** Currently a white rectangle on a navy arena.
4. **Replace the favicon and `og:image`** — export a 512×512 and a 1200×630 PNG from the logo you already own. Fixes the browser tab and every shared link.
5. **Delete the 19 answer-spelling `<text>` elements from `svgDictionary.json`.** Fixes 34 broken exercises. *(Keep `PAST`, `+ED`, `ING`, `+S`, `HE/SHE/IT` — those are intentional grammar cues.)*
6. **Swap the hand-coded grey SVG for a cropped `tyler-sitting-front.png`** in `LexiMascot`, `Gateway` and the animation's sit frame. The grey blob is the app's worst visual asset and it is on your three highest-traffic surfaces.
7. **Swap the run-cycle SVG frames for the four `tyler-3d/` PNGs** already on disk — same `setInterval`, `<img>` instead of `<svg>`. Also add `overflow: visible` (the muzzle is clipped every frame) and drop the `animation: none !important` at `main.css:756-759` that kills the run on phones while the JS keeps cycling.
8. **Pick one icon language.** Replacing the ~26 nav/UI emoji with flat SVGs matching `svgDictionary`'s style is about a day, and it stops the app from looking different on Windows.
9. **Delete the orphans and optimise the rest** — `public/images/` (byte-identical duplicate), the `.ai`/`.eps`/`pikaso-creations` folders, the two 4–5 MB mockup posters, `stars.jpg`, `star.jpg`, `star-gamified.png`, `public/icons.svg`, `src/assets/{hero.png,react.svg,vite.svg}`. Run SVGO on the four traced SVGs (expect 60–80% off 960 KB). **Takes the deploy from ~34 MB to ~2 MB.**

---

## 14. Build, deploy, CI, and tests

### Release packaging

`scripts/build_release.js` wipes `release/`, copies `dist/`, then `data/hu`, `data/sk`, `data/migrations`, `templates`, PHPMailer, and 14 individual PHP files.

**Ordering is load-bearing:** Vite copies `public/.htaccess` into `dist/`, and line 48 then **overwrites it** with the root `.htaccess`. This matters because the two files have **materially different CSP** — `public/.htaccess:36` declares `script-src 'self'` with no font or analytics allowances, which would block GA4, Headway **and the Nunito webfont**. It is dead configuration whose only purpose is to be overwritten.

`release/` also ships **2.7 MB of curriculum JSON that nothing reads** — no deployable PHP touches `data/`, and the frontend inlines it at build time. It is simultaneously publicly downloadable at `/data/hu/…`, so the whole curriculum is scrapeable and ships twice.

### Hosting & deploy

Shared Apache at Websupport.sk over **FTPS port 21**. No SSH, no containers, no server-side build. Two document roots on one account: `lexipaws.eu/web` (prod) and `lexipaws.eu/sub/dev` (staging).

Deploy order: **upload everything → run remote migrations → health check.** By the time anything can fail, production has already been overwritten. **There is no rollback step anywhere** — `docs/guides/cicd_user_story.md:33-34` lists "Rollback Capability" as an acceptance criterion and it is unimplemented.

**The health check is a false green.** `verify-deploy.yml:177` uses `curl -f`, which only fails on HTTP ≥ 400 — but `api.php:41-43` (missing `db_config.php`) and `:59-63` (PDO failure) both `echo` a JSON error and **exit with HTTP 200**. A deploy that lost its database config reports success and posts "🚀 CD Deploy Succeeded" to Slack. The check only proves Apache can execute PHP.

`main` deploys to production **automatically on push** with no manual approval gate, no GitHub Environment protection, and no version stamp.

### Workflows

| Workflow | Trigger | Gates? |
|---|---|---|
| `verify-deploy.yml` | push/PR on main+dev | ✅ The only real gate. PHP lint, security scan, oxlint, JSON validate, build, sandbox migrations against `mariadb:10.6`. |
| `codeql-analysis.yml` | push/PR + weekly | ✅ Required check `Analyze Code` — but **`javascript-typescript` only. The entire PHP backend is unscanned.** |
| `cypress.yml` | `workflow_dispatch` only | ❌ Gates nothing, and cannot run (see below) |
| `sonar-sync.yml` | after CI + daily cron | ❌ Two broken integrations (see below) |

CI pins **Node 20** and **PHP 8.2**; this machine runs Node 26 and PHP 8.5. Local and CI do not run the same runtimes.

`npm ci || npm install` (`:44`, `:143`) defeats the purpose of `npm ci` — a drifted lockfile silently falls through and passes green. *(The lock is in sync today.)*

The lint step is labelled "Run ESLint" but runs oxlint, which **exits 0 with 45 warnings**. It blocks nothing.

### Test coverage: effectively zero

The entire automated test suite:

```js
describe('Homepage Test', () => {
  it('loads the homepage successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});
```

That is `cypress/e2e/home.cy.js` in full. There are no unit tests, no component tests, no PHP tests, no `vitest`/`jest`/`playwright`/`phpunit` config anywhere. The one test asserts a `<body>` renders — not a route, not text, not a network call. Under `vite preview` there is no PHP backend at all, so every API call 404s and it still passes.

**And it cannot run:** `cypress` is in neither `dependencies`, nor `devDependencies`, nor `package-lock.json`, nor `node_modules/`. `cypress.yml` also declares a 2-container "parallelization" matrix without passing `parallel`/`record`/`group`, so it would run the same one test twice.

`docs/guides/git_workflow_and_testing_standards.md:115-119` declares tests **mandatory** for scoring engines, XP maths, streaks, API endpoints and security validation. None of that is tested. Merging to `main` deploys to `lexipaws.eu` with nothing verifying login, lesson playback, progress save, XP, or streaks.

### Two silently-broken automations

- **`sync_sonar_issues.js` can never deduplicate.** The issue body it writes contains no `<!-- SonarCloudKey: … -->` marker, but the dedup pass at `:183` extracts existing keys with a regex for exactly that marker. `existingKeys` is always empty, so **the daily midnight cron re-creates a GitHub issue for every unresolved SonarCloud finding, every day, forever.** Left running through Beta, real tester bug reports become unfindable.
- **Its GitHub Projects calls cannot work.** `sonar-sync.yml:16-17` grants only `permissions: issues: write`; the default `GITHUB_TOKEN` has no Projects v2 scope and workflow `permissions:` cannot grant one. Every project call fails, every failure is swallowed into `console.error`, and the workflow still reports success.

### Local-only artifacts

`release/` on this machine is **stale** (built Jul 16 against a Jul 17 `api.php`) and littered with iCloud/Finder conflict duplicates — `api 3.php`, `chest 2.svg`, `new-icon 2.svg`, plus six empty `* 2`/`* 3` directories. **These are local only** and the next `npm run package:release` erases them. But if `release/` were ever uploaded wholesale, stray duplicate PHP files would land in the web root.

---

## 15. The critical trace: node click → XP in MySQL

This is the most important thing in this document. Each hop discards information; the failures compound rather than sit side by side.

| # | Hop | Where | What is lost |
|---|---|---|---|
| 1 | Node click, energy spent | `Dashboard.tsx:121` | Energy decrements in **client state only** |
| 2 | Player computes reward | `LessonPlayer.tsx:381` `xpEarned: max(5, 15-mistakes)` | `PostLesson` is handed `baseXp={15}` unconditionally — the animation promises 15 while 9 may be granted |
| 3 | `onComplete` → context | `Dashboard.tsx:197` `completeLesson(id, xp, 100, …)` | **Accuracy is the literal `100`.** The real value never crosses this boundary → `flawless` + accuracy quests always fire |
| 4 | Reward engine | `UserContext.tsx:413-500` | Runs **entirely client-side**: bones, quests, achievements. Arrays are pushed into shallow copies (`:415,426,435,482`), mutating state still referenced by the current object |
| 5 | Debounced write | `UserContext.tsx:363-374` | 1500 ms `setTimeout`. Payload is **only** `{points, completed, scores, quest_progress, completed_quests_today}` |
| 6 | Transport | `utils/api.ts:33-71` | CSRF token cached and never invalidated; **no 403 refetch**. A stale token stops all saves silently and permanently |
| 7 | Server parse | `api.php:966-985` | **11 absent keys replaced with hardcoded defaults** |
| 8 | Persist | `api.php:1059-1085` | `ON DUPLICATE KEY UPDATE` writes `VALUES()` for **all 17 columns** → `level`→1, `streak_count`→0, `streak_shields`→0, `last_active_date`→NULL, `unlocked_items`→[], `active_theme`→'default', `earned_xp_per_node`→{}, `daily_quests_date`→NULL, `active_quests`→[], `energy`→5, `last_energy_refill`→now |
| 9 | Leaderboard | `api.php:1088-1110` | `user_leagues` weekly/monthly XP derived from the points delta — the only place XP becomes competitive data |

**Hops 3, 5, 7 and 8 each independently discard information, and hop 6 can silently stop the whole chain.**

There is **no `beforeunload`, `pagehide`, `sendBeacon`, `visibilitychange`, `navigator.onLine`, or service worker anywhere in `src/`.** The 1500 ms debounce is the only write trigger, and several flows navigate with `window.location.href` (`ProfilePage.tsx:48`, `PostLesson.tsx:682`, `SidebarRight.tsx:167,177`, `NotFoundPage.tsx:8`). **Finish a lesson, immediately close the tab or log out, and it is gone.**

### The one fix that resolves the most

Reconciling hops 5 and 7 — either send the full progress object, or make `parseProgressData` merge against the existing row instead of substituting defaults — fixes, in one change:

streak inflation · energy not persisting · themes deactivating · daily quests rerolling · streak-shield rewards vanishing · streak milestone emails firing on wrong days · `cron_notifications.php`'s streak logic being dead in production.

**Recommended direction:** make `handleSaveProgress` read the existing row first and only overwrite keys actually present in the request. That is a server-side change, it needs no client deploy, and it cannot regress older clients.

---

## 16. Known-broken inventory, ranked

Ranked by (user impact × likelihood a Beta tester hits it) ÷ fix cost.

### P0 — fix before inviting anyone

| # | Issue | Where |
|---|---|---|
| 1 | **`save_progress` wipes 11 columns per call** — streak, energy, theme, quests, shields, level | `UserContext.tsx:366` + `api.php:966,1059` |
| 2 | **`lexipaws.eu/` may 404** — `.htaccess` rewrites the apex to a missing `gateway.html`, and staging cannot reveal it | `.htaccess:4-5` |
| 3 | **Unbounded XP/bones minting** — no rate limit on `save_progress`/`update_progress`; uncapped `max()` merge at signup | `api.php:667-696`, `:1007-1041` |
| 3b | **One request permanently disarms every anti-cheat clamp.** `POST {"scores": 0}` → `parseProgressData` stores `json_encode(0)` = the string `"0"` → on every later request `!empty($currentDbProgress['scores'])` is **false** (verified: `empty("0") === true` in PHP), so the entire bones / streak_shields / node_state clamp block is skipped from then on. Next payload writes raw. | [api.php:1019](api.php:1019), [api.php:970](api.php:970) |
| 3c | **`last_active_date` is never set to `CURDATE()` by anything.** The only writers are `cron_notifications.php:69` (sets it to *yesterday*) and `save_progress` (null). So any row that once matches `cron_notifications.php`'s at-risk query can never stop matching. Currently harmless only because every autosave nulls the column — meaning **the save_progress bug is suppressing a worse bug.** Fixing one without the other destroys legacy users' shields and streaks. | [cron_notifications.php:54-97](cron_notifications.php:54) |
| 4 | **`BETA_INVITES_ENABLED` fails open** — one missing secret opens public registration | `api.php:260-262`, `write_db_config.js:4-6` |
| 5 | **One unsolvable exercise blocks Module 2** (uncommitted working-tree edit) | `data/hu/A1/Module_2…/node3_family_ties.json` |
| 6 | **Friends is broken for anyone with a league friend** — wrong table for `monthly_xp` | `api.php:1996-1999` |
| 7 | **`user_metadata` table does not exist** — the energy-refill-for-feedback loop always throws | `api.php:1713,1726` |
| 8 | **Registered users are shown the guest signup wall** after their first lesson and ejected to `/` | `PostLesson.tsx:668`, `LessonPlayer.tsx:374` |
| 9 | **Onboarding trap** — a registered user with zero progress is bounced to `/welcome/start` on every dashboard visit, and the welcome shell has no nav, no skip, and exits back to `/welcome/experience` | `Dashboard.tsx:95-99`, `UserContext.tsx:156`, `FTUELesson.tsx:39` |
| 10 | **2 HIGH dependency advisories** in `react-router` / `react-router-dom` | `package.json:36` |
| 11 | **Open redirect after auth** — `?redirect=` followed verbatim, on a domain users are asked to trust with credentials | `AuthModal.tsx:110-112,126-128` |
| 12 | **Contact form silently discards messages** while saying they were received | `Contact.tsx:36-38` |

### P1 — fix before a public Beta

13. **Every character lesson soft-locks on its last exercise.** `PhonicsSpeak.tsx:13` never resets `hasSpoken` between questions, and every character lesson ends with two consecutive `phonics_speak` items — so on the second one both the mic button and the skip link render disabled. It auto-passes, but the learner sees a frozen screen at the end of every pronunciation lesson.
14. **Stale correctness leaks across questions.** `ImageChoice` and `PhonicsListenChoose` reset their local selection without calling `onAnswer(false)`, and React reconciles the same component in the same slot without remounting. A learner who answers question N correctly can press CHECK on N+1 with nothing selected and be marked correct. `data/` contains 120 consecutive `image_choice` and 446 consecutive `phonics_listen_choose` adjacencies.
15. **The non-dialogue `fill_blanks` layout is unstyled on desktop** — all six of its classes are defined only inside mobile media queries. Above 600px, 920 exercises render as bare divs with an invisible blank.
16. **TTS rate limit (30/IP/hour) vs. aggressive preloading** — audio silently degrades mid-lesson.
17. **The product tour is English** for both target audiences, with 32 translated strings sitting unused.
18. **`.cards-grid` collision breaks the landing page's level grid** — the first screen a visitor sees.
19. **Mascot 404s + missing `/avatars/default.png`.**
20. **`og:image` is an SVG** → blank previews on every platform during Beta recruitment.
21. **Favicon is scaffolding art.**
22. **34 image-choice exercises label their own answer.**
23. **Weak-word rows are never cleared** — the practice loop has no exit condition.
24. **`sync_sonar_issues.js` floods the issue tracker daily.**
25. **CORS allowlist includes `neolix.studio` + four localhost origins in production**, with credentials.
26. **Session-based "rate limiting"** is bypassed by dropping a cookie.
27. **`beta_admin.php` has no brute-force protection** and is not in the `.htaccess` deny list.
28. **No rollback, and a health check that cannot detect a dead database.**

### P2 — quality and hygiene

29. Blank white screen on guarded routes during session load (`RequireAuthenticated` returns `null`).
30. `alert()`/`confirm()` — **19 calls across 9 files** — are the entire failure and destructive-action UI.
31. No error tracking of any kind (zero matches for Sentry/Bugsnag/Rollbar/Datadog/LogRocket).
32. Reduced motion does not work; infinite background animations run regardless.
33. Touch targets below the project's own 44px standard on five controls.
34. `/leaderboard` and `/practice` lose the bottom bar; `Characters` has neither nav affordance.
35. Duplicate canonical tags; sitemap lists only the gateway domain; no `hreflang`.
36. `dashboard.css` — 401 `!important`, `.dashboard-container` defined 10×.
37. `README.md` is the stock Vite template on a public repo.
38. `reference/` is 37 MB, 51% of tracked bytes, pulled in full on every production deploy.

---

## 17. Dead code & dead data

Roughly **1,100+ lines of dead application code** plus ~47% of the CSS will ship to Beta users unless removed.

| Item | Lines | Evidence |
|---|---|---|
| `src/utils/learningContent.ts` | 465 | Zero importers; its `dataSource` paths point at `data/A1/…` which has not existed since the migration. Also the only place carrying `title_sk` fields, so it *looks* like the localization source of truth. |
| `src/components/BossEncounter.tsx` | 301 | Mounted only when `activeLesson.id === 'Boss'`; node ids come from filenames and `find data -iname '*boss*'` returns nothing. Also carries an unreachable soft-lock of its own. |
| `src/utils/engine.ts` (`DynamicExerciseEngine`) | 166 | Runs only when `rawItems[0].type` is falsy; **0 of 144 data files produce typeless items**. |
| `src/components/Onboarding.tsx` | ~90 | Zero importers; `Dashboard.tsx:216` documents its removal. |
| `src/services/api.ts` | ~25 | Zero importers, broken URL construction, inverted error semantics. |
| `Dictation.tsx`, `MatchPairs.tsx` | | Emitted only by the unreachable engine. |
| `MoraleBoost.tsx`, `HarderEncouragement.tsx` | | **No producer at all** — the strings appear only in `LessonPlayer.tsx`. |
| `data/quests.json` | | No consumer in `src/` or any PHP file; still shipped and still the one file `validate_json.js` really checks. |
| `src/index.css`, `src/App.css` | 313 | Unmodified Vite scaffold, imported by nothing. |
| `public/icons.svg`, `public/favicon.svg` | | Scaffolding leftovers — the favicon is live. |
| `character_progress` table | | Created by migration 08, never read or written by any PHP. |
| `unlocked_items` column | | Written on every save, never read; ownership comes from `user_inventory`. |
| `handleUpdateAvatar` + `isAllowedAvatarValue` | | No `case`, no caller. |
| `handleUpdateProgress` | | Reads only `$data['xp']`; no caller ever sends it. |
| `submit_feedback.php`, `logout.php` | | No frontend callers; still shipped by `build_release.js`. |
| Dead switch cases | | `sentence_builder`, `speak_verify`, `node.type === 'reward'`, `node.id === 'Boss'` |
| Dead CSS | ~4,400 lines | 272 of 575 class names unreferenced; `.swipe-card*`, `.flip-card*`, `.exam-*`, `.boss-arena*`, `.proto-card` |
| Dead locale keys | 59 of 182 | Entire `tour.*` and `leaderboard.*` namespaces |
| Dead localStorage keys | 3 | `forceLoginModal` (written, never read), `forceRegisterModal` (read, never written), `neolix_language` (written, never read) |
| Dead props | | `SidebarRight.onOpenShop`, `SidebarLeft.highlightLeaderboardUnlock`, `QuestionHeader.hideMascot` (declared, passed, never destructured) |
| Orphan scripts | | `scripts/{generate_exercises.py,generate_node1.py,split_words.py,generate_phonics.cjs}` — referenced by no npm script, workflow, or doc |

---

## 18. Cross-cutting: a11y, privacy, errors, offline

### Accessibility

Measured across all 68 `.tsx` files: **23 `aria-*` attributes in 9 files** (the other 59 have none), **2 `role=`, 2 `tabIndex`, 1 `onKeyDown`, 0 `aria-live`, 0 `.focus()`, 0 Escape handling.**

- **None of the six modals** traps focus, restores focus on close, or closes on ESC. The lesson player is `position: fixed; inset: 0` over a live DOM with no `aria-modal` and no inert background.
- **Every answer submission and feedback banner is a silent DOM swap with no `aria-live`** — a screen-reader user gets no announcement of right or wrong.
- **`index.html:2` hardcodes `lang="hu"` on all three domains**, so Slovak text is announced with Hungarian phonetics — and the aria-labels that do exist are themselves hardcoded Hungarian.
- The treasure chest is a bare `<div onClick>` (`Roadmap.tsx:241-243`) — the only div-with-onClick in the codebase, and it gates a reward.
- `prefers-reduced-motion` is non-functional (§12) while the app runs infinite background loops.
- `MOBILE_UI_AUDIT.md:143-152` already lists 200% zoom and screen-reader focus order as untested; nothing has closed that.

⚠️ **The European Accessibility Act has applied to consumer e-learning services since June 2025.** Nobody has assessed the product against it. This is a legal question, not a nice-to-have — worth an hour with someone who knows EU accessibility law before you take money.

### Privacy / GDPR — EU users, three EU domains

- **There is no consent mechanism at all.** Zero matches for consent/cookie/süti across `src/**` and both locale files. **GA4 fires at `index.html:11-17` before React even mounts**, and Headway loads at `:36`. Non-essential analytics without prior consent is a direct ePrivacy Art. 5(3) problem in both HU and SK.
- **The processor list is incomplete.** `PrivacyPolicy.tsx:65-72` names only WebSupport. Actually receiving user data: **Google Analytics**, **Headway**, **Google Fonts** (leaks IPs), **Google Cloud TTS** (learner-triggered text POSTed to a US endpoint), **Slack** (feedback + username), **Atlassian/Jira** (the reporter's email in `Reply-To`), and the SMTP provider. None are disclosed — Art. 13(1)(e) and Art. 30 defects.
- **Controller identity is `[N/A]`** in both `Impressum.tsx:30-36` and `PrivacyPolicy.tsx:30-34`. Art. 13(1)(a) requires it; this is a compliance defect, not a cosmetic placeholder.
- **Erasure and portability are both unimplemented.** No `delete_account` action exists. `PrivacyPolicy.tsx:88` promises machine-readable portability; nothing implements it. No retention policy is stated for `beta_access_requests` (which stores an IP hash) or avatar uploads.
- **Both legal pages exist only in Hungarian** while the controller is Slovak-established and `lexipaws.sk` is a launch domain — Art. 12(1) requires intelligible form.
- The policy's stated legal basis for guest data is *"consent, by starting the guest session"* — but there is no consent event, and `neolix_guest_progress` is written unprompted.
- ✅ *Correcting an earlier internal finding:* `PrivacyPolicy.tsx:101-106` **does** name the Slovak DPA with full contact details. That part is fine.

### Error handling & observability

- `api.fetch` never throws → react-query's error path is dead everywhere but one call site.
- `updateProgress` ignores the save response except to fire a success event. **A failed save is invisible to the user, the console, and any monitor.**
- Five empty `catch (e) {}` blocks swallow every session-parse failure (`UserContext.tsx:134-138`).
- `ErrorBoundary.componentDidCatch` only `console.error`s. **No production crash is reported anywhere.**
- **19 `alert()`/`confirm()` calls across 9 files** are the entire failure and destructive-action UI.
- **No error-tracking SDK of any kind.**
- Server side: `error_log()` only. No request ids, no structured logging, no aggregation.
- **GA4 is a default page-view install with zero custom events.** For a Beta whose stated purpose is validating onboarding, energy pacing and monetisation — **none of it is measured.**

### Network failure

Covered in [§15](#15-the-critical-trace-node-click--xp-in-mysql). Summary: a blip demotes a logged-in user to guest; nothing is flushed on unload; a stale CSRF token stops saves permanently and silently; guarded routes render blank; there is no offline state, no retry affordance and no toast anywhere.

---

## 19. Which docs to trust

> **Important reframe (2026-08-28).** The ~14 "stale" docs below are **not describing a deleted app** — they accurately describe the vanilla-JS application that is *still on `origin/main` and still the production codebase today*. `dashboard.html`, `js/dashboard.js`, `css/`, `gateway.html` and `data/A1/` all exist there. These docs are correct for `main` and wrong for `dev`. That distinction matters: do not delete them as garbage until `dev` is promoted, because until then they document the code that is actually deployed.

`docs/` contains 40 files in **three strata that were never reconciled**. Roughly 14 describe the vanilla-JS app on `main` rather than the React app on `dev`.

### ✅ Trust these

| Doc | Why |
|---|---|
| `MOBILE_UI_AUDIT.md` | Newest (2026-07-27). All six findings verified implemented. Honest about what did *not* reproduce and what remains untested. |
| `docs/THEME_UPDATE_GUIDE.md` | **The best-calibrated doc in the repo.** Its unchecked to-do list still describes the codebase exactly. |
| `docs/security/PHP_SECURITY_BASELINE.md` | Every claim verified true. |
| `docs/QA/BETA_ACCESS.md` | Fully verified against the invite implementation. |
| `docs/QA/BETA_FEEDBACK_TRIAGE.md` | Routing verified. |
| `docs/WORKFLOW.md` | Most current process doc. Two gaps: omits `SLACK_WEBHOOK_URL_FEEDBACK` and `BETA_INVITES_ENABLED`; lists an unused `CYPRESS_RECORD_KEY`. |
| `docs/QA/{BETA_TEST_PLAN,PR_QA_WORKFLOW,STAGING_CHECKLIST,STAGING_TEST_ACCOUNTS}.md` | Current, and none of it has been executed. |
| `docs/DEPLOYMENT_MANIFEST.md` | Mostly accurate; stale branch name in the header. |

### ❌ Do not trust these

| Doc | Problem |
|---|---|
| `README.md` | **Stock Vite template.** Public repo. Zero product content. |
| `docs/guides/developer_guide.md` | **The single most misleading doc.** 183 confident lines about `dashboard.html`, `js/dashboard.js`, `data/A1/`. Only §3 (DB schema) survives. |
| `docs/guides/design_guide.md` | Palette, fonts, default theme and shop themes all contradicted by the CSS. See §12. |
| `docs/frontend/CSS_Architecture.md` | Points contributors at `index.css`/`App.css` — **both dead files**. Directly contradicts `THEME_UPDATE_GUIDE.md`. |
| `docs/backend/database/database.md` | Puts `points`/`scores`/`quests` on `users` (they are on `user_progress`), invents `users.role`, names `failed_exercises` (really `user_failed_exercises`), omits 12 of 15 tables. |
| `docs/architecture/React_Architecture.md` | Says React **18** (actual 19.2.7); hedges on routing that is definitively react-router v7; names 3 routes where ~20 exist. |
| `docs/architecture/Curriculum_Data_Model.md` | Every path wrong (`data/A1/`, `data/vocabulary.json`); node `type` wrong; documents a top-level `id` that does not exist. Concepts are right, specifics are not. |
| `docs/frontend/js/{dashboard,data,interactive,landing}.md` | Document deleted files. `interactive.md` describes a 5-heart lives model; the live model is `energy`. |
| `docs/QA/{word_order_test_specification,user_testing_scenarios,bugs_grouping}.md` | **Zero of their DOM ids, handlers or UI strings survive** in `src/`. |
| `docs/guides/MT.md` | Manual test results against deleted screens. |
| `docs/GITHUB_REPO_AUDIT.md` | Central premise (*"`dev` does not exist as a remote branch"*) is now false. |
| `docs/WORKFLOW_AUDIT.md:58` | Claims *"CodeQL now includes dev and PHP."* **`codeql-analysis.yml:27` is `javascript-typescript` only.** `WORKFLOW.md:120` says the opposite and is correct. |
| `docs/guides/cicd_user_story.md` | Specifies SSH/rsync deployment; reality is FTPS. Its rollback criterion is genuinely unimplemented. |
| `docs/architecture/Lexipaws/Welcome.md` | The default Obsidian vault stub, committed. Delete. |
| `docs/Home.md` | The designated entry point. Links five stale docs and **none** of the seven accurate beta/QA/security ones. |

### Special cases

- **`docs/guides/lessons_and_folders_to_be_created.md`** (1339 lines) — despite the name it contains **no folder plan, no schema, and no naming convention**. It is a flat bank of 1200 hand-authored A1 exercises for Lessons 2–9, in three identical shapes per lesson, with **no answer keys, no ids, no hu/sk translations**, and formats that map to none of the app's implemented exercise types. If Beta scope assumes Lessons 2–9 ship, **that content does not exist in loadable form.** (Also: its "LESSON 2: THE VERB TO BE" heading drills *to have*; line 838 reads "EXISTTENTIAL"; Lesson 9 Ex. 3 has 51 items, not 50.)
- **`reference/product-design/`** — the visual spec of record, and genuinely useful. `Complete FTUE experience/` holds the canonical 33-screen flow. Note lexicographic sort scrambles it (10 before 2), one filename contains a colon, and naming is inconsistent across its four sets.

---

## 20. Beta readiness, honestly

`docs/BETA_READINESS.md` is a good document. Its gates are the right gates. But it targets **2026-09-01 — four days from this audit — and the last commit was 2026-07-27.** Weeks 2–7 of its own roadmap have no corresponding commits or QA records anywhere in the repo.

| Gate | Doc says | Actually |
|---|---|---|
| **1. Staging stable** | in progress | ⚠️ Pipeline works. No staging accounts or invite codes exist. Health check is a false green. |
| **2. Core loop works** | not fully audited | ❌ **Now audited: it does not.** Progress persistence loses 11 columns per save; streak/energy/themes/quests are all broken by it. |
| **3. Audio reliable** | partially hardened | ❌ 30 syntheses/IP/hour vs. aggressive preloading. 100% of phonics is TTS with `audioUrl: null` everywhere. No key is exposed to the frontend ✅, but the proxy has no session check. |
| **4. Data & curriculum safe** | mostly in place | ⚠️ JSON validation is theatre (1 of 144 files). One unsolvable exercise. Slovak is untranslated. |
| **5. Security baseline** | in progress | ❌ Rate limiting is session-backed and bypassable. Unbounded currency minting. Invite gate fails open. CORS allows localhost + `neolix.studio` in prod. |
| **6. Feedback works** | needs QA | ❌ The energy-refill loop throws (`user_metadata` missing). Contact form discards silently. `report_problem.php` is unauthenticated. |
| **7. Production release** | not started | ❌ No rollback, no approval gate, no version stamp, no known-limitations doc. |

### What a realistic path looks like

**Do not launch a public Beta on 2026-09-01.** Two options, both honest:

**Option A — private Beta in ~2 weeks (recommended).** 5–10 hand-picked Hungarian testers, no Slovak domain, explicit known-limitations list. Fix P0 items 1–9 and 12 (all are small, contained changes; #1 is one server-side function). Manually verify `lexipaws.eu/` renders. That is a genuinely useful Beta — you would learn whether the learning loop teaches anything, which is the actual open question.

**Option B — public Beta in ~6–8 weeks.** Everything in A, plus the P1 list, plus a real decision on Slovak, plus enough automated tests to make a deploy safe.

**In either case, three things should happen this week regardless:**

1. **Verify `https://lexipaws.eu/` renders in a browser.** Highest value, five minutes, and staging cannot tell you.
2. **Confirm `BETA_INVITES_ENABLED` is actually `true` in the production GitHub secret.** If it is not, registration is already open.
3. **Rotate `MIGRATION_TOKEN` and the SMTP password**, and delete `db_config_prod.php`.

---

## 21. Open questions for the owner

Grouped by what they block. These genuinely need your answer — I can implement any of them, but the decision is yours.

### Blocks the Beta date
1. **Is 2026-09-01 still the target?** Several docs hardcode it.
2. **Is Slovak in scope for the first Beta?** Right now `lexipaws.sk` promises a Slovak course and serves a Hungarian one — *worse for credibility than an honest "coming soon" waitlist.*
3. **Does the invite gate stay for the public Beta**, or does registration open?

### Blocks content work
4. **How should the base-language field be modelled?** `docs/curriculum_discussion.txt` left this open. Either (a) add a sibling `"sk"` key inside the existing items and keep one shared tree, or (b) keep separate trees and rename `"hu"` to something neutral like `"l1"`. **This blocks all 1420 prompts and should be decided before any translation starts.**
5. **Who produces the Slovak translation** — you (you're a native speaker), a contractor, or MT with review?
6. **Is `lessons_and_folders_to_be_created.md` still the plan for Lessons 2–9?** It needs a schema and answer keys, or deletion.
7. **Was `Module_6/node4` intentionally dropped, or is it missing content?**

### Blocks design work
8. **Light or dark by default?** The design guide mandates dark + OKLCH; the CSS ships light + hex and defaults to `system`. **Everything downstream depends on this answer.**
9. **Blue `#3b82f6` or green `#10B981` as the primary accent?** Fixing the rogue `:root` in `landing.css` will change most of the UI at once, so this needs a product decision, not a code fix.
10. **Are Outfit and Inter still the intended typefaces?** Nothing loads them; Nunito is force-applied globally. If Nunito is the real brand font, the tokens and the guide should both say so.
11. **Which mascot rendering is canonical** — flat-vector, 2D cel, photoreal 3D, or the hand-coded SVG? Crops, animation frames, favicon, og:image and app icon all follow from this.
12. **Is the mascot named Lexi or Tyler?** A one-time file rename ends an entire class of bug.
13. **Do you hold a redistribution licence for `cartoon-pitbull-illustrated-collection/`?** (`.ai`/`.eps` stock source, tracked in git and publicly served.)
14. **Should emoji stay as the icon system?** It means the app looks different on your users' Windows/Android machines than on your Mac.

### Blocks architecture decisions
15. **Should `save_progress` become a partial/PATCH update, or should the client send the full object?** *(My recommendation: server-side partial merge — no client deploy needed, cannot regress older clients.)*
16. **Should reward math move server-side before launch**, or are per-request delta caps the accepted Beta posture?
17. **Is energy meant to be a hard paywall gate?** If yes it must become server-authoritative; if it is a soft nudge, the current behaviour is arguably fine and the UI should stop implying scarcity.
18. **Should leagues have promotion/relegation**, or stay as lifetime-XP tiers? The reward multipliers and the marketing copy both imply cohorts.
19. **Is `BossEncounter` / `DynamicExerciseEngine` / `Dictation` / `MatchPairs` planned, or deletable?** ~1,100 lines hang on this.
20. **Should `phonics_speak` ship at all** with no speech recognition? It is 404 items and closes every character lesson.
21. **Was react-query meant to own all server state**, or should it be removed and both queries folded back into plain fetches?
22. **Should `data/quests.json` become the live pool**, or be deleted?

### Legal / compliance — probably needs a professional
23. **What is the account-deletion policy for Beta?** The current alert is not a compliant erasure path.
24. **Will the company registration fields be filled in, or are you operating as a private individual?** The three legal pages currently disagree with each other.
25. **Will the legal pages be translated into Slovak** before `.sk` accepts registrations?
26. **Has anyone assessed the European Accessibility Act exposure?**

### Process
27. **Cypress, Playwright, or neither?** Open since 2026-07-13. Three inert files are still in the tree.
28. **Should `reference/` (37 MB, 51% of tracked bytes) stay in git?**
29. **Should the ~14 legacy docs be deleted or moved to the `docs/archive/` that `CLEANUP_PLAN.md` specified but never created?**
30. **Do you want a manual approval gate on production deploys**, given there is no rollback and no version stamp?
31. **Should `README.md` become a real README?** Public repo — what is public-safe?

---

## 22. Keeping this file honest

This document is only useful if it stays true. Two mechanisms:

### A. Re-verification script

These checks re-test the highest-stakes claims. If any output changes, the corresponding section is stale.

```bash
# 1. Does save_progress still send only 5 fields? (expect: points, completed, scores, quest_progress, completed_quests_today)
sed -n '366,372p' src/context/UserContext.tsx

# 2. Does the UPSERT still write all 17 columns?
sed -n '1059,1065p' api.php

# 3. Is accuracy still hardcoded to 100 at all 5 call sites? (expect 5 lines, all ending ", 100")
grep -rn "completeLesson(" src/ | grep -v "const completeLesson"

# 4. Does gateway.html exist yet? (expect: no output = still broken)
find . -name gateway.html -not -path './node_modules/*'

# 5. Does the invite gate still fail open? (expect: `return ['id' => null, 'error' => null];`)
sed -n '260,263p' api.php

# 6. Dependency advisories
npm audit --omit=dev

# 7. hu/sk content drift (expect: only node3_family_ties.json + stories 5-21)
diff -rq data/hu data/sk

# 8. Exercise-type census — has any new type appeared?
grep -rho '"type": *"[a-z_]*"' data/ | sort | uniq -c | sort -rn

# 9. Build still green + current bundle size
npm run build

# 10. Deploy weight (expect ~34 MB until the asset cleanup lands)
du -sh public dist
```

### B. Update protocol

- **When a P0/P1 item in [§16](#16-known-broken-inventory-ranked) is fixed**, strike it there and update the section it came from. Do not delete it — move it to a "Fixed" line with the commit SHA, so this file also records what changed and why.
- **When an owner question in [§21](#21-open-questions-for-the-owner) is answered**, record the answer inline. Those answers are the most valuable content in this file and exist nowhere else in the repo.
- **Re-run the full audit** after any change touching `UserContext.tsx`, `api.php`'s progress handlers, `main.css`'s token block, or the migration set.
- **Cite `file:line` for every new claim.** The value of this document is that it is checkable.

### Corrections already applied

Several findings from the first pass were wrong or overstated and were corrected before being written here. Recorded so they are not "rediscovered":

- `data/sk` is **not** byte-identical to `data/hu` — `node3_family_ties.json` differs and 17 stories are absent.
- `Onboarding.tsx` is **dead code**, so its broken `lexi-head.png` does not ship. The `lexi-mascot.png` 404 *does*.
- `get_friends` fails for friends with a **non-null `league_id`**, not for every accepted friend.
- The `get_session` TypeError is real but does **not** break the deploy health check (no session cookie → early return), and is rarer than implied.
- `LessonPlayer` does **not** throw its computed accuracy away — `PostLesson` consumes it. It is discarded at the `completeLesson` boundary.
- The reduced-motion block loses **only** its `animation-duration` declaration; the other five apply. The conclusion (animations run at full duration) still holds.
- `PrivacyPolicy.tsx:101-106` **does** name the Slovak DPA. The real defect is the undisclosed processor list.
- "A forgotten GitHub secret fails closed" is true for the cron/migrate token gate and **false** for `BETA_INVITES_ENABLED`, which fails open.
- The CORS allowlist lives in **two** files (`api.php:7-26` and `security.php:22-35`) that must be edited together.
- CSS corpus is **9,297** lines across 13 files.
