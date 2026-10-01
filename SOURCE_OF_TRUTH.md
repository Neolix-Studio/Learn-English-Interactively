# Lexipaws — Source of Truth

> **What this is.** A single, verified reference for how this codebase actually works today — as opposed to how `docs/` says it works. Most documents in `docs/` describe a vanilla-JS app that was deleted during the React migration. This file was written by reading the code, not the docs.
>
> **Audited:** 2026-08-28 · **Against commit:** `7b2a8f2` (2026-07-27) · **Branch:** `codex/mobile-ui-audit`
> **Method:** 13 parallel subsystem readers + an adversarial verification pass. Every claim below carries a `file:line`. Claims that survived adversarial re-checking are unmarked; anything softer is labelled ⚠️ *unverified*.
>
> **Owner decisions recorded:** 2026-08-28 — see [§12.1](#121-settled-design-decisions--owner-2026-08-28) (accent, typeface, mascot), [§6](#matching-what-ships-and-what-does-not--owner-2026-08-28) (matching), [§10](#session--auth) (HTTPS redirect) and [§20](#full-release-readiness-beyond-beta) (exams as a full-release gate); 2026-09-30 — [§21](#21-open-questions-for-the-owner) (UX Q13: the currency is 'Lexi-falat', the 'LexiPaws score' screens are deleted; UX Q10: the streak rule, the shield cap of 3 and the push timing; UX Q2: all ages in the Beta with a parent's consent under 16, under-18s visible on public boards; UX Q3: what the landing may promise; UX Q6: no English glosses in the chrome, informal 'te' except legal; UX Q12: locks stay hard in the Beta). **Decisions are not audit findings** — they describe what the product *will* be, not what the code does today, and each names the change it implies. Anything a decision cannot settle from the repo alone is marked ⚠️ *needs live verification*.
>
> **Status catch-up:** 2026-09-30, against `origin/dev` @ `c8c9976`. Three things this audit reported have since been fixed on `dev` and are marked where they appear: the deploy hardening (WP-A3, `450b9dd`), the `save_progress` clamp bypass and rate limit (WP-B0, `92b6f18`), and the two HIGH dependency advisories (`c4c6609`, `c8c9976`). The rows are kept and dated rather than deleted ([§22 B](#b-update-protocol)). Everything not marked is still as audited.

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
| **1** | ~~**Every autosave wipes 11 database columns.** The client sends 5 of 17 fields; the server substitutes hardcoded defaults for the rest and `ON DUPLICATE KEY UPDATE`s all 17.~~ ✅ **Fixed (#359, 2026-09-30).** `save_progress` reads only the five fields the client sends. On an existing row it writes those five and `last_active_date` (the server's day, #358); the other ten columns are kept, and a client cannot write them. | `UserContext.tsx:366-372` → `api.php:1007-1015` → `api.php:1213-1222` | ~~Streak, energy, active theme, daily quests, level and shields are destroyed on every save.~~ The columns survive a save. That does **not** repair what the learner sees: the client keeps its streak, shields, theme and quests in the `scores` JSON or in memory and never sends these columns, so the streak still inflates, a theme choice is still lost on reload and energy still refills on reload ([§8](#8-gamification--economy), WP-B3). |
| **2** | **The economy is client-authoritative and mintable.** Reward math runs in the browser; the only server defence is per-request delta caps, and `save_progress` / `update_progress` have **no rate limit**. | `api.php:1017-1092`, no `security_rate_limit` call on either action | +100 XP and +100 bones per request, indefinitely. The leaderboard — a headline Beta feature — is fully forgeable. Guest-migration at signup bypasses even the caps (`api.php:657-707` merges with `max()`, uncapped). **Part-fixed @ `92b6f18` (WP-B0, 2026-08-31):** `save_progress` is now limited to 45 requests / 60 s per user, which slows the loop but does not cap it; `update_progress` and the signup merge are unchanged — see [§16](#16-known-broken-inventory-ranked) row 3. |
| **3** | **The Slovak product does not exist.** `data/sk/` is a copy of `data/hu/` (one node file differs, 17 stories missing). The base-language field inside both trees is literally named `"hu"`. `roadmapLoader` defaults to `'hu'` and both callers omit the argument. | `roadmapLoader.ts:28` + `Roadmap.tsx:20`, `FTUELesson.tsx:15`; `LessonPlayer.tsx:24` hard-imports `data/hu/vocabulary.json` | `lexipaws.sk` advertises *"Učte sa anglicky po slovensky"* and serves a Hungarian course. A Slovak beginner cannot complete one exercise. |
| **4** | **`lexipaws.eu/` may be a 404 in production and staging cannot reveal it.** `.htaccess:4-5` rewrites the apex to `gateway.html`, which exists nowhere in the repo, `public/`, `dist/`, or `release/`. | `.htaccess:4-5` (verified target missing) | Works today only if Apache's rewrite loop falls through to the SPA rule. The condition is scoped to `lexipaws.eu`, so `dev.lexipaws.eu` never exercises it. **Check this by hand before anything else.** ✅ **Fixed @ `450b9dd` (WP-A3, 2026-08-29):** the rewrite was removed, so the apex now takes the same SPA path as `.hu` and `.sk`. It is still unproven on production, which serves an empty docroot until the cutover (WP-A4). |

Two more that are cheap to fix and disproportionately visible:

- ~~**`BETA_INVITES_ENABLED` fails *open*.** `api.php:260-262` returns a pass when the flag is unset, and `write_db_config.js:4-6` turns any missing GitHub secret into `''`. One forgotten secret and public registration is wide open. The client-side gate (`AuthModal.tsx:40`) only hides a tab.~~ ✅ **Fixed (#387, 2026-10-01):** `betaInvitesRequired()` ([api.php:239](api.php:239)) opens signup only for an explicit `0`/`false`/`no`/`off`; unset or empty keeps the gate shut. The client-side gate (`AuthModal.tsx:54`) still only hides a tab.
- ~~**`npm audit --omit=dev` reports 2 HIGH advisories** — `react-router` / `react-router-dom` 7.12.0–7.18.1 (GHSA-qwww-vcr4-c8h2). `package.json:36` pins `^7.18.1`.~~ ✅ **Fixed 2026-09-24:** Dependabot PRs #266 (react-router and react-router-dom → 7.18.4, `c4c6609`) and #258 (postcss → 8.5.28, `c8c9976`) were merged into `dev` and deployed. `npm audit --omit=dev` reports 0 vulnerabilities and no Dependabot alert is open (re-checked 2026-09-30). There is still no `dependabot.yml`; the PRs come from GitHub's security updates, and `dependabot-automerge.yml` merges the patch and minor ones ([§14](#14-build-deploy-ci-and-tests)).

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

The inverse failure exists too: `FillBlanks.tsx:118-140`'s compose-card classes are defined **only** inside `max-width` blocks in `interactive.css` (blocks opening at lines 666, 1132, 1230), so **920 exercises are completely unstyled above 600 px width** — an invisible blank and a stack of bare divs on desktop.

**Convention going forward:** write the mobile layout as the base rule with no media query; add `@media (min-width: …)` only to enhance for larger screens. Never add a new `max-width` block to shrink a desktop layout down.

**Definition of done for any UI change:** verified at **320 / 360 / 390 px portrait** *and* one desktop width, before the PR. Touch targets ≥ 44 × 44 px.

*(2026-09-30, #356: there are no PRs any more, and the check is now the `tools/local/ux-shots` matrix — 320×568, 360×800, 390×844, 768×1024 and 1280×800, each in light and dark — run before the push to `dev`. `CLAUDE.md` step 4 has the full verification set.)*

#### 2. The mascot is named **Lexi**

*(Tyler is the owner's real dog, and the origin of the name "Lexipaws" — but the in-product character is Lexi.)* The 26 `tyler-*.png` files are legacy filenames and should be renamed; that rename also fixes the live 404s in §13.

#### 3. The first Beta is Hungarian-only; Slovak follows it

*Owner decision 2026-09-24, reversing the earlier constraint "Slovak is in scope for the first Beta" (recorded 2026-08-28).* Slovak comes after the Beta, still as a translation of the Hungarian version. Until then, Slovak visitors (`lexipaws.sk`, `?lang=sk`, `base_language = 'sk'`) get an honest 'Čoskoro po slovensky' holding state instead of the Hungarian course (UX_REVIEW C59's interim fix).

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

**Tracked-file distribution:** `data` 166, `src` 100, `reference` 98, `public` 89, `docs` 40. `reference/` (design mockups + a `.docx`) dominates clone and CI-checkout cost — and `verify-deploy.yml:140` uses `fetch-depth: 0` on the deploy job, pulling full history on every production deploy.

**Not tracked (verified via `git log --all`):** `dist/`, `release/`, `node_modules/`, `audio/`, `avatars/`, `db_config.php`, `db_config_prod.php`. None were ever committed.

### Missing repo hygiene

No `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `CODEOWNERS`, issue/PR templates, `.nvmrc`, `.editorconfig`, Prettier config, or `dependabot.yml`. `README.md` is the **stock Vite template** — and this is a public repo.

---

## 4. Running it locally

Three processes. `vite.config.ts:9-25` proxies exactly four paths to `127.0.0.1:8000`.

**Use the local stack (added 2026-09-30, #355).** `dev` and production share one database and the `db_config.php` on this machine holds its live credentials, so the by-hand recipe further down writes to production data. `tools/local/testing/local_stack.sh` starts the same three processes on a throwaway database instead:

```bash
./tools/local/testing/local_stack.sh up      # throwaway MariaDB + migrations + seeds + php -S 127.0.0.1:8000
npm run dev                                  # then http://app.localhost:5173 (real auth guards)
./tools/local/testing/local_stack.sh sync    # after editing PHP: the backend is a sandbox COPY
./tools/local/testing/local_stack.sh down    # stop, delete the data
```

It serves a copy of the deployable PHP from `/tmp/lexipaws-local-stack/app` with a generated config and `open_basedir` confined to that directory, never reading the repo's `db_config.php`; MariaDB listens on a unix socket only. `up` seeds a returning learner (1,240 XP, streak 12, five weak words), a new learner and an unused invite code, and prints the logins. No TTS key, SMTP password or Slack webhook is configured, so nothing leaves the machine. Details: `tools/local/README.md`.

**By hand, from scratch** (a machine with no `db_config.php` yet; line 3 of the recipe overwrites an existing one):

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
- **`http://app.localhost:5173` keeps the guards on, but PHP rejects its POSTs.** That host is not in `security_allowed_origins()` (`security.php:25-44`, the only list since #387), so against a plain `php -S` every POST, login included, returns 403 "Invalid request origin." The local stack maps that one origin to `http://localhost:5173` inside its sandbox; production code is unchanged.
- **`/report_problem.php` is not in the proxy list** but `ReportProblemModal.tsx:56` posts to it. Report-a-problem is broken under `npm run dev`. Same gap for `/audio/`. (`/submit_feedback.php` was listed too; it is no longer shipped, #382.)
- **Curriculum JSON is not fetched at runtime.** `roadmapLoader.ts:25-26` and `storyLoader.ts:17` use `import.meta.glob(…, { eager: true })`. Editing `data/` needs a rebuild/HMR cycle, not a refresh.
- The `db_config.php` currently on this machine defines only `DB_*` and `SMTP_*`. Every consumer guards with `defined()`, so the app boots — but TTS errors out and password reset throws (`api.php:237`).

### Commands that matter

| Command | What it really does |
|---|---|
| `npm run build` | `tsc -b && vite build`. **Exits 0 today.** |
| `npm run lint` | oxlint. 45 warnings, **exits 0** — gates nothing. |
| `npm run validate:json` | Parses 144 files; applies a real schema check to **one** (`data/quests.json`). Prints "144/144 matched known schema checks" regardless. |
| `npm run security:php` | 4-pattern line-regex smoke scan over 20 PHP files. Exits 0. |
| `npm run check:css` | Fails on a `var(--x)` that nothing defines and on `--glass-border` used as a colour (§12 Tokens). Exits 0 today; not run by CI. Added 2026-09-30 (#364). |
| `npm run package:release` | Wipes and rebuilds `release/` (~38 MB). |
| `./tools/local/testing/local_stack.sh up` | Real `api.php` behind `npm run dev` on a **throwaway MariaDB** (socket only), seeded with two learners, an invite code and weak words; `php -S 127.0.0.1:8000` serves a sandbox copy that cannot open repo files. `sync` re-copies the PHP and applies new migrations, `sql "…"` queries the database, `status` reprints the logins, `down` stops everything and deletes the data. Added 2026-09-30 (#355). |
| `node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest` | Screenshots one route in headless Chrome at 320×568, 360×800, 390×844, 768×1024 and 1280×800, light and dark (10 PNGs, git-ignored `out/`). Needs only `npm run dev`; **never starts PHP and no request reaches it** — every backend call is answered from a mock or as "backend down" — and GA4 and Headway are blocked. `shot.mjs` beside it takes one capture or a scripted flow. Added 2026-09-30 (#354); see `tools/local/ux-shots/README.md`. |
| `node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z` | Plays one level of a sound lesson to the result screen through `shot.mjs` (or every viewport with `--matrix`) and exits 1 unless each item is graded as tapped, a compare pick survives one second, and the result is 100% minus 20 per `--wrong` item. The regression check for C13 until WP-H1. Added 2026-09-30 (#362). |
| `node tools/local/ux-shots/contrast.mjs` | Measures every on-screen text of eight key screens (Home, sign-in, welcome, path, lesson item and feedback, leaderboard, profile, practice; `contrast-screens.json`) at 360×800 in light and dark against WCAG AA (4.5:1, 3:1 large) and **exits 1 on any failure**. Gradients count by their worst stop; text on images, gradient-filled text and disabled controls are counted, not measured. **Fails on `dev` today** with 34 pairs, among them white on `#10B981` at 2.54:1 on ELLENŐRZÉS and TOVÁBB (C48). Not in CI (needs Chrome and the dev server). Added 2026-10-01 (#380). |
| `node tools/local/testing/check_phonics_items.mjs` | Reads `data/*/characters`; exits 1 on a sound item that cannot be answered by ear or has no id of its own. Not in CI (the validator rules are WP-F2). Added 2026-09-30 (#362). |

### Current build output

```
dist/index.html                    2.10 kB │ gzip:   0.94 kB
dist/assets/index-*.css          154.21 kB │ gzip:  27.81 kB   ← ~47% unreachable selectors
dist/assets/storyLoader-*.js      79.68 kB │ gzip:  15.19 kB   ← the ONLY split chunk
dist/assets/index-*.js         1,728.41 kB │ gzip: 359.50 kB   ← everything else
```

No `React.lazy` anywhere. All ~20 route components, the lesson player, Joyride, and 2.4 MB of curriculum JSON are in the initial bundle an anonymous visitor downloads. `vite.config.ts` sets no `manualChunks` and no image optimisation. Build also warns about two ineffective dynamic imports (`i18next` in `UserContext.tsx:222`, `utils/api` in `LessonPlayer.tsx:350`).

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
| `/lesson/ftue` | `FTUELesson` — redirects to `/dashboard` when `tutorial_done` is already set (#373) | `RequireAuthenticated` |
| `/lesson/characters/:id` | `CharacterLesson` | `RequireAuthenticated` |
| `/dashboard` `/profile` `/friends` `/practice` `/characters` `/leaderboard` | | `RequireAuthenticated` |
| `/contact` `/privacy-policy` `/terms` `/impressum` `/gateway` | | public |
| `*` | `NotFoundPage` | public |

`RequireAuthenticated` (`App.tsx:35-48`) returns **`null`** while `isLoading` — a blank white screen on every guarded deep link during session bootstrap, even though `SkeletonLoader.tsx` already provides skeletons and `ProfilePage.tsx:64` proves the pattern.

Navigating to `/welcome` exactly renders an empty layout — there is no index redirect to `/welcome/start`.

History (#373, 2026-09-30): the tutorial leaves for `/dashboard` with `replace` (`FTUELesson.tsx:48`), so it is not behind the first dashboard in history. The ← on `/profile` and `/friends` (`ProfilePage.tsx:44`, `FriendsPage.tsx:32`) goes back when there is in-app history and to `/dashboard` (replace) when the page was opened directly (`location.key === 'default'`). The other ← that calls `navigate(-1)`, `PlacementScreen.tsx:59`, is unchanged. Lessons, sheets and drawers still have no history entries (UX-3).

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

**A network blip demotes a logged-in user to guest.** Because `api.fetch` resolves rather than throws, a failed `get_session` yields `{error}` → `res.session` falsy → `UserContext.tsx:169` sets `isGuest = true` → the user's *real* progress starts writing to localStorage, and can later be merged back with `max()`/union semantics (`api.php:686-688`), resurrecting or duplicating progress.

Migration at auth time extracts **only `{points, completed, scores}`** (`guestProgress.ts:7-45`). Energy, learned vocabulary, unlocked themes, quests and notification preferences are silently dropped.

**The merge is asked for, not silent (#363, 2026-09-30).** On submit, `AuthModal` ([AuthModal.tsx:80](src/components/AuthModal.tsx:80)) runs `summarizeGuestProgress` ([guestProgress.ts:57](src/utils/guestProgress.ts:57)) over that payload. When it holds any XP, treats, streak or finished lesson, the modal shows 'Hozzáadod a fiókodhoz?' ("Add it to your account?") with those amounts before any request is made ([:234](src/components/AuthModal.tsx:234)); this holds for login and for signup. 'Igen, hozzáadom' sends `guest_migration` and clears the three guest keys on success, as before. 'Nem, kihagyom' sends the request **without a `guest_migration` field** ([:110](src/components/AuthModal.tsx:110)) and leaves the guest keys on the device, where they stay until logout. The answer is remembered for a retry after a wrong password and asked again when the e-mail address changes. A payload with nothing to show (no XP, treats, streak or lesson) is no longer sent at all. The server is unchanged: it still merges whatever it is sent, with `max()` and no cap (§8, WP-B2).

**Logout clears every per-person key (#363).** Both logout handlers ([SidebarLeft.tsx:121](src/components/SidebarLeft.tsx:121), [ProfilePage.tsx:47](src/pages/ProfilePage.tsx:47)) call `clearPersonalStorage()` ([guestProgress.ts:102](src/utils/guestProgress.ts:102)), which removes the keys marked *person* in the table below. The keys are not namespaced per user, so two accounts that share a browser **without** a logout in between (an expired session, then another login) still share them.

### localStorage keys — the complete list

*Whose* says what logout does with the key since #363: **person** keys are removed by `clearPersonalStorage()` ([guestProgress.ts:90](src/utils/guestProgress.ts:90)), **device** keys stay. *(2026-09-30: `selectedLevel`, `last_feedback_refill` and `neolix_reduced_motion` were missing from this "complete" list; added.)*

| Key | Written by | Read by | Whose |
|---|---|---|---|
| `neolix_guest_progress` | `UserContext.tsx:362` | `UserContext.tsx:171`, `guestProgress.ts:8` | person |
| `user_local_progress` | `FTUELesson.tsx:40` | `guestProgress.ts:9`, `LessonPlayer.tsx:111` (legacy) | person |
| `guest_base_language` | `i18n.ts:16,24,27` | `i18n.ts` | device |
| `guest_character_progress` | `Characters.tsx:17`, `CharacterLesson.tsx:26,39` | same — **used for logged-in users too; never synced or migrated** | person |
| `ftue_marketing_data` | `HearAboutUsScreen:19`, `WhyLearningScreen:19`, `PostLesson:88`, `Onboarding.tsx:42` | `AuthModal.tsx:114` — **which runs before those screens ever render** | person |
| `lexipaws_tour_completed` | `Dashboard.tsx:50` | `Dashboard.tsx:35` | person |
| `neolix_active_lesson` | `Dashboard.tsx:129` | `Dashboard.tsx:105` | person |
| `hasSeenWordTooltipGuide` | `InteractiveSentence.tsx:59` | `InteractiveSentence.tsx:19` | person |
| `selectedLevel` | `UserContext.tsx:291`, `AuthModal.tsx` (on login and signup) | `UserContext.tsx:100` | person |
| `last_feedback_refill` | `FeedbackRefillModal.tsx:49` | `Dashboard.tsx:109` (one-hour cooldown of the refill survey, client-side only) | person |
| `adhd_volume` | `SidebarLeft.tsx:243` | `SidebarLeft.tsx:28`, `audio.ts:74` | device |
| `neolix_reduced_motion` | `SidebarLeft.tsx:53` | `SidebarLeft.tsx:44` | device |
| `forceBetaRequestModal` | `SidebarRight.tsx:167` (and `PostLesson.tsx` screen 9 until #372, 2026-09-30) | `Home.tsx:92` ✅ | device |
| **`forceLoginModal`** | `NotFoundPage.tsx:7`, `SidebarRight.tsx:177` | **nothing** ❌ | device |
| **`forceRegisterModal`** | **nothing** | `Home.tsx:92` ❌ | device |
| **`neolix_language`** | `Gateway.tsx:10` | **nothing** ❌ | device |

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

`LessonPlayer.tsx` (597 lines) is the only player in production. Mounted from four places, always `position: fixed; inset: 0; z-index: var(--layer-screen)` (§12 Tokens):

| Caller | Node source |
|---|---|
| `Dashboard.tsx:192` | roadmap node `originalData` |
| `PracticePage.tsx:71` | synthetic node from `get_weak_words`, or a random story |
| `FTUELesson.tsx:14-18` | first node of Module_1 |
| `CharacterLesson.tsx:52` | `data/<lang>/characters/<id>.json` |

### Lifecycle

1. Mount adds `body.is-lesson-active`; cleanup calls `stopAudio()`.
2. `selectLessonItems()` (`:134`) resolves items in priority order `lessons[]` → `levels[0].exercises` → `items` → the node itself. For `lessons[]` it picks the first sub-lesson not in `scores.node_state[nodeId].completedLessons`, **falling back to the *last* one when all are done** — so replaying a finished node always replays Part 4.
3. `enrichQuestion` (`:64`) attaches the dictionary and computes `newWords`.
4. Every exercise reports `onAnswer({ hasAnswer, isCorrect, value })` (`exercises/answer.ts`) as the learner answers. The player keeps the last report in one `answer` state (`:174`) and puts it back to `NO_ANSWER` every time the index moves (`goToNextQuestion`, `:301`). The exercise is mounted under a key made of the index and the item id (`:516`), so every item starts with fresh local state. **All answer validation lives inside the exercise components.**
5. `handleCheck` (`:310`) — while there is no answer it does nothing (`:318`), and the button carries `aria-disabled` and neutral grey until `canSubmit` (`:299`). With an answer, the first press builds `textToRead`, fires TTS, sets feedback, and on a wrong answer POSTs `log_failed_exercise` (`:351`). Second press advances. An interstitial card, or an item whose type has no exercise component, shows 'TOVÁBB' and advances ungraded (`:298`).
6. Completion computes the two numbers once (`commitLesson`, `LessonPlayer.tsx:256-276`, UX0a-5, #371 and UX0b-1, #372, 2026-09-30): `xpEarned = max(5, 15 − mistakes)` and `accuracy = floor(correct ÷ graded × 100)`, where graded = correct + wrong answers. A skipped item and the two interstitial cards are neither; with nothing graded the accuracy is 100. It is rounded down so that only a lesson without a mistake reaches 100. **The lesson is saved the moment its last item is resolved** (#372): `commitLesson` runs on the last item's CHECK (`:377`, `:392`), on its skip (`:282`), or when the last item is an interstitial (`:337`), exactly once, and calls the page's `onCommit(scoreData)`, which calls `completeLesson`. `<PostLesson>` (`:440-446`) only shows the result: it gets the two values and `pointsBefore`, the points before the save, so its count-up does not add the XP twice. Its last 'Tovább' calls `onComplete`, which only leaves the lesson. All five callers split the two (`Dashboard.tsx:191-214`, `FTUELesson.tsx`, `CharacterLesson.tsx`, `PracticePage.tsx`, and `BossEncounter`, which commits on the answer that ends the fight). `FTUELesson` and `CharacterLesson` build their node object once (`useMemo`), because a new object makes `LessonPlayer` reload the lesson and the save re-renders the page. *(Before #371: `baseXp={15}` and `accuracy = max(0, 100 - mistakes*20)`. Before #372: the save ran only on PostLesson's last tap.)*

**Feedback banner (UX0a-1, #360, 2026-09-30).** The footer carries `data-state` = `none | correct | incorrect | skipped` (`:521`) and the message renders inside a slot that is always in the DOM with `role="status"` (`:528`), so a screen reader announces it. No colour is inline any more: `interactive.css:499-565` defines twelve `--feedback-*` tokens (title colour, banner background, icon fill and icon glyph, for success, danger and warning) for light and for dark, the dark set also serving the `fall` and `halloween` themes, and `:572-591` maps the state to a set. Every text pair is at least 4.8:1. The answer line comes from `getCorrectAnswerText()` (`:82`): 'Igaz'/'Hamis' for `true_false`, the correct option's text for `phonics_listen_choose`, the matching button label for `phonics_compare`, the pair words for `phonics_match`, the word for `phonics_speak`, the first accepted answer for `fill_blanks`, otherwise `correctAnswer ?? answer`. Below 601 px the banner stacks (`interactive.css:625`): icon, title and the whole answer on a full-width row, then a full-width 'TOVÁBB' of at least 44 px; from 601 px it is the old row (`:674`). Skipping plays `playSoundEffect('warning')` (`:251`, `audio.ts:59`), no longer the success chime. **The submit button's own colours are still inline hex** (`:563-564`, C48).

**Answer state, CHECK and option colours (UX0a-2, #361, 2026-09-30).** What counts as an answer: a picked option (`image_choice`, `multiple_choice`, `true_false`, `fill_blanks`, `phonics_listen_choose`, `phonics_compare`), at least one placed word (`word_order`), non-blank text (`type_in`, `dictation`), every pair matched (`phonics_match`, `match_pairs`), the end of the 2-second timer (`phonics_speak`). Taking the last word back or clearing the field reports `NO_ANSWER` again. Once CHECK is pressed the exercises get `isAnswered` and lock: option and word-tile handlers return early and carry `aria-disabled`, text fields turn `readOnly`. Each option button carries `data-option-state` from `getOptionState()` (`exercises/answer.ts`): `idle`, `selected` (a neutral blue, before CHECK), then `correct` (green) or `wrong` (red) for the pick and `answer` for the right option that was not picked. `interactive.css:593-617` maps the state to `--option-fg/bg/border`, which the exercises read with their idle colour as the `var()` fallback, and draws a 3 px green outline on the right option. Six new tokens (`--option-selected-*`, `--submit-disabled-*`) sit next to the `--feedback-*` ones, per theme; text on its tint is at least 5.2:1. The `fill_blanks` inserted word takes the same state colours (`interactive.css:905`), on the phone layout only: above 600 px that word is still unstyled (§16 P1 #15). `BossEncounter` was only adapted to the new callback.

**Sound items: ids, failures and the two checks (UX0a-3, #362, 2026-09-30).** Every item in `data/*/characters` now has an `id`: `<level id>_<position>` in the 20 generated files (`cons_s_z_level_1_3`), `s_z_pairs_<position>` in the orphan file; 960 per tree. It is the string the player already built for these items when it logged a failure in a sound lesson (`LessonPlayer.tsx:353`, `` `${activeSubLessonId}_${currentIndex}` ``), so rows already in `user_failed_exercises` keep matching. What changed is practice: the synthetic node's only level is `lesson_1`, so a sound item failed again there used to be logged as `lesson_1_<position in that practice session>`, a row shared by whatever item happened to sit at that position. Now the saved copy carries the id, and for a copy saved before the ids existed `PracticePage.tsx:40` falls back to the row's `exercise_id`; a repeated failure raises `fail_count` on the item's own row. The 15 homograph items per tree (C14) are replaced with pairs from the same file: `vowels_o_ow` level 1 drills no/now and boat/bout, level 2 coat/cow and goat/gout, `cons_th_th` level 2 teeth/teethe and bath/bathe. Two scripts guard this, neither in CI: `node tools/local/testing/check_phonics_items.mjs` (no duplicate options, no same-word "different" compare, no duplicate match pair, every item has its own id) and `node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z` (plays a level in headless Chrome: a compare pick is still selected one second after the tap, every item is graded as tapped, the result screen says 100%, nothing is logged as failed). The false failures already stored are removed by `tools/local/maintenance/sql/362_delete_false_sound_drill_failures.sql`, which the owner runs by hand. **Not covered:** story items have no id and no level id, so every story failure is logged as `undefined_<position>` (one shared row per position across all 21 stories).

**There is no hearts/lives system inside a lesson.** Mistakes are uncapped and never end the run. The only gate is the global `energy` counter. **Wrong answers are never re-queued inside the lesson** — the only repetition path is server-side via `user_failed_exercises` → PracticePage.

### Exercise registry

Dispatch is a `switch` at `LessonPlayer.tsx:259-292`. Counts are from a `jq` census across all 144 files in `data/`.

| `type` | Component | Validation | Count |
|---|---|---|---|
| `word_order` | `WordOrder.tsx` | join, lowercase, strip `.,!?`, trim | **1920** |
| `fill_blanks` | `FillBlanks.tsx` | `word === answer.split('/')[0]` — **case-sensitive, byte-exact** | **920** |
| `phonics_listen_choose` | `PhonicsListenChoose.tsx` | `opt.correct` | 908 |
| `phonics_compare` | `PhonicsCompare.tsx` | `question.isSame` | 404 |
| `phonics_speak` | `PhonicsSpeak.tsx` | **always `onAnswer(true)`** | 404 |
| `image_choice` | `ImageChoice.tsx` | `opt.correct` | 264 |
| `phonics_match` | `PhonicsMatch.tsx` | all pairs matched; graded wrong, once, if any pairing on the way was wrong (#371) — see below | 204 |
| `true_false` | `TrueFalse.tsx` | `question.answer` | 125 |
| `multiple_choice` | `MultipleChoice.tsx` | **exact string** | 125 |
| `type_in` | `TypeIn.tsx` | `trim().toLowerCase()` | 125 |
| `dictation`, `match_pairs`, `morale_boost`, `harder_encouragement`, `sentence_builder` | components exist | — | **0 — unreachable** · `match_pairs` is now **confirmed deletable** — see below |

**Leniency, summarised:** case-insensitivity only in `type_in`, `dictation`, `word_order`. Punctuation stripped only in `word_order`, `dictation`. **Nothing anywhere does typo tolerance, accent folding, alternate-answer lists, or whitespace normalisation beyond `trim()`.** `answer` values containing `/` (e.g. `"am/is"`) are truncated to the first variant by `FillBlanks.tsx:17-18`.

### Matching: what ships, and what does not — owner, 2026-08-28

**The Beta matching feature is the existing character/phonics activity, `phonics_match`** — 204 live items, reached from every character lesson. **The generic matching lesson that was removed is not returning for Beta**, so its unreachable implementation may be deleted: `MatchPairs.tsx` (107 lines) and the `match_pairs` switch case, both emitted only by the dead `DynamicExerciseEngine` path. *(This closes the `MatchPairs` half of §21 Q19; `BossEncounter`, `engine.ts` and `Dictation` are still open.)*

**Second decision: a wrong `phonics_match` attempt must count against accuracy, while the exercise stays forgiving.**

✅ **Built (UX0a-5, #371, 2026-09-30).** `PhonicsMatch` keeps a `hadMispairing` ref (`PhonicsMatch.tsx:20`), set in the mismatch branch (`:83`) and cleared with the question (`:34`). When the last pair is matched it reports `isCorrect: !hadMispairing.current` (`:80`). So three wrong pairings or thirty are one mistake, the item can always be finished, and CHECK then shows 'Helytelen!' with the pair words, logs one `log_failed_exercise` row and lowers the accuracy that `completeLesson` now receives. Proof: `node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --mispair 2`. The paragraphs below describe the state before #371 and the reasoning; they are kept for the record.

Before #371 it could not count against anything. `PhonicsMatch.tsx:76-78` *(now `:79-81`)* reported a correct answer once every tile is matched *(since #362 a tile is identified by its position in the item, `:21-23`, an audio tile and a text tile match when their texts are equal, `:70`, and the item is complete when all `pairs.length × 2` tiles are matched; #361's distinct-text count is gone, and so are the three items with a duplicated pair, C14)*, and the mismatch branch (`:79-86`) only flashes red for 800 ms before clearing the selection. Since the learner cannot advance without eventually matching every pair, the exercise is **unconditionally correct** — it inflates lesson accuracy and never records a mistake.

Three consequences worth knowing before this is implemented:

- **"Affects accuracy" and "feeds weak-item practice" are the same switch.** `LessonPlayer.tsx:349-357` increments `mistakes` *and* POSTs `log_failed_exercise` off the same wrong answer. Reporting a mispairing therefore also pushes it into `user_failed_exercises` → `get_weak_words` → PracticePage, whether or not that was intended. It is almost certainly the right behaviour for a phonics contrast the learner just confused — but it is a coupling, not a choice made separately.
- ✅ **The rule is settled (owner, 2026-08-28): a `phonics_match` exercise incurs *at most one* mistake, and only if at least one mispairing occurred.** Report `onAnswer(false)` once any mispairing has happened, regardless of how many wrong taps follow — never a penalty per tap. The exercise still cannot be failed and still cannot block the lesson; only the score moves. This mattered because `accuracy = max(0, 100 - mistakes*20)` was unusually steep: four mistakes already landed a learner at 20%, so a per-tap penalty on a drag-and-match exercise would have been punitive out of all proportion to the error. *(Since #371 accuracy is correct ÷ graded; the one-mistake rule stands.)*
- ~~**It is inert until the accuracy hardcode is gone.** All five `completeLesson` call sites pass the literal `100` (§8). Until WP-B3 passes `scoreData.accuracy` through, a correctly-reported mispairing changes the in-lesson counter and the `log_failed_exercise` row, but nothing the user's profile records.~~ ✅ Fixed (#371, 2026-09-30): the hardcode went in the same push.

### Audio / TTS

- Chimes are synthesized with WebAudio oscillators (`audio.ts`): success (two rising sine notes), fail (two falling sawtooth notes), warning (two level triangle notes at 392 Hz, used for a skipped exercise since #360) and pop. Volume from `localStorage.adhd_volume`, defaulting to **1.0** (`:78`) while `SidebarLeft.tsx:29` shows the slider at **50**. The UI lies on first run.
- `playTTS` → in-memory cache → `GET /api/tts.php` → fallback to `window.speechSynthesis`.
- **Every `audioUrl` in `data/` is `null`** (960/960 phonics slots). 100% of pronunciation audio is runtime TTS from one Google voice (`en-US-Journey-F`).
- **`api/tts.php:80` allows 30 uncached syntheses per hour**, while `WordOrder.tsx:47` preloads *every tile of every word-order question* with no in-flight dedupe. A learner meeting new vocabulary exhausts the quota inside one lesson and silently drops to browser TTS — a different voice, or none at all on some mobile browsers.
- **No speech recognition exists.** `grep -rn "SpeechRecognition|getUserMedia|MediaRecorder" src/` returns nothing. `PhonicsSpeak` is a 2-second `setTimeout` that always awards a correct answer. 404 curriculum items depend on it.

### `PostLesson.tsx` (446 lines)

Three screens, still numbered 1, 5 and 6: the result (`:258`), the "1"-day streak (`:291`) and the streak-goal pick (`:348`). A first lesson walks 1 → 5 → 6 (`handleNext`, `:59-80`); every other lesson, and a sound lesson, shows screen 1 only. A first lesson is `isTutorial` or a learner without `scores.tutorial_done`, read when the lesson is saved. ✅ Screen 9, the guest sign-up wall 'Mentenéd a haladásod?', is gone (UX0b-1, #372, 2026-09-30; production has no guest mode, Q1); its four `post_lesson.*` strings stay in `hu.json` for UX0c-2 (#419), like the #371 ones. PostLesson is display-only: it no longer reads the user context and saves nothing. **Screens 5 and 6 are still static FTUE theatre**: the "1" and the week row read no real data. **Owner decision 2026-09-30 (UX Q13, #370): the 'LexiPaws score' is not defined; its screens are deleted.** ✅ Done (UX0a-5, #371, 2026-09-30): tutorial screens 2–4 (level-up, flag, 50% scale bar) and 7–8 (100%-wide quest bar, bone rain) are gone, with their five keyframes and three phone rules. Their `post_lesson.*` strings stay in `hu.json` until UX0c-2 (#419) removes them.

On screen 1 the accuracy card is success green from 60% up and neutral below it (`accuracyTone`, `:26-29`; the card carries `data-tone="success|neutral"`): surface background, border token, muted label, main-text value, in light and dark.

~~Screen 9 has **no `isGuest` guard**, and `LessonPlayer.tsx:414` passes `isTutorial={isTutorial || userData.points === 0}` — so **any logged-in user finishing their first lesson is shown the guest signup wall**, whose button sets `forceBetaRequestModal` and hard-redirects them out of the app to `/`.~~ ✅ Fixed (#372, 2026-09-30): screen 9 is removed, and 'first lesson' reads the `tutorial_done` flag, not `points === 0`. Measured on the local stack: a new learner finishing lesson 1 walks 1 → 5 → 6 and lands on `/dashboard` with the path.

~~`PostLesson` also always animates **+15 XP** (`LessonPlayer.tsx:404`) while `:414` reports `Math.max(5, 15 - mistakes)`. Six mistakes → the screen says 15, the user gets 9.~~ ✅ Fixed (#371, 2026-09-30): one `xpEarned` (`LessonPlayer.tsx:405`) is both shown and saved. Measured with 8 of 15 right: '+8' and '53%' on screen, `save_progress` carries 1240 + 8 = 1248 points.

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

**Both callers omit the language argument** (`Roadmap.tsx:20`, `FTUELesson.tsx:15`), so the roadmap is always Hungarian.

### Other content shapes

- **Stories** — `{title, type:"reading_node", story:{en, hu}, items[15]}` (5 each of true_false / multiple_choice / type_in). `LessonPlayer.tsx:379,493` hardcode `story.hu`. Reached only from PracticePage via `getRandomStory()` — also with no language argument.
- **Phonics** — `{id, type:"character_lesson", title, characters[IPA], lessons[5]}`; each level holds 9 items, and since #362 every item has an `id` (`<level id>_<position>`). Progress stored per-IPA in `localStorage`, never server-side; logout removes it (#363).
- **Grammar** — `data/hu/grammar.json`, keyed `Module_1..7`. **Statically imported** by `GrammarModal.tsx:2`, so it is Hungarian-only for everyone.
- **Vocabulary** — flat `Record<string,string>`, 172 entries. **Statically imported** from `data/hu/` by `LessonPlayer.tsx:24`.

### Content defects found

- **One exercise is unsolvable.** `data/hu/A1/Module_2_Me_And_My_People/node3_family_ties.json`, `item_df635034`: the **uncommitted working-tree edit** sets `correctAnswer` to *"Hello, my name is… He is my brother."* while `scrambledWords` still offers only `She` / `sister.` — no `He` tile. A scan of all 1920 word_order items with `WordOrder.tsx`'s exact normalizer found this is **the only** unsolvable one. It will ship if committed as-is.
- **124 of 132 `image_choice` items per language have only 2 options** — a 50/50 coin flip presented as a picture quiz. Only Module_1 node1's 8 items have 4.
- **Six `image_choice` prompts leave the L1 word in English** — `tea`, `sugar`, `orange`, `lemon`, `apple`, `pizza`. *"Which of these is the 'apple'?"* with `apple` as an option.
- **`Module_6_Out_And_About` has no `node4`** — files jump node3 → node5. Git history shows no deletion; it was never authored.
- **`characters/s_z_pairs.json` breaks the schema** — no top-level `id` *(its 10 items have ids since #362)*, top-level `items[]` instead of `lessons[]`, and it is absent from the 20-group list in `Characters.tsx:42-63`, so it is unreachable except by hand-typing the URL.

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
| **Streak Shields** 🛡️ | shop (`buy_shield`, 100), intro lesson, leaderboard (`claim_reward`); at most 3 | one per missed day, at the next save | **server** ✅ since #381: the `streak_shields` column only |
| **Energy** 🔋 | +1 per 2h to max 5; feedback refill | −1 per lesson start | **effectively client-only — see below** |
| **Streak** 🔥 | +1 for the first lesson saved on a Budapest day | 0 when missed days outnumber shields | **server** ✅ since #381 (`streakState()`, `countLessonDay()` in `api.php`) |
| **Themes** | purchase | 200 / 500 | **server-authoritative** ✅ (`handleBuyCosmetic` prices from a server catalog and ignores the client's `cost`) |
| **weekly/monthly XP** | server mirrors the points delta | — | server ✅ |

### What is actually broken here

Almost all of it traces back to finding #1:

- **Energy does not persist.** Never sent in the payload, so the column stays at the 5 a new row gets (`api.php:996`) and the client counts energy down in memory only. *(#359, 2026-09-30: a save no longer rewrites the column and a client can no longer set it. What the learner sees is unchanged.)* **Reloading the page restores full energy.** The monetization gate is bypassable with F5.
- ✅ **Fixed (#381, 2026-10-01): the streak is the server's.** A save that carries `lesson_completed` (sent only by `completeLesson`) counts its Budapest day once; every day missed since the new `streak_date` column (migration `21_add_streak_date.sql`) takes one shield, and when the shields run out first the streak restarts at 1 and the remaining shields are spent too (owner, Q10). `get_session` returns the settled numbers without writing; the client copies them into `scores` on load and after each save, and the server drops `streak_count`, `streak_shields` and `streak_date` from any scores it stores. A streak still held in an old JSON copy is taken over (the higher number wins), and a NULL `streak_date` counts the next lesson as +1. Milestone mail follows the server's count only, so at most once a day. Guests run the same rule in `src/utils/streak.ts`. Suite group 9 proves each rule. *The text below is the bug as it was.* — **The streak inflates once per page load.** `daily_quests_date` never reaches the database: the client posts it to `update_progress`, which discards it (below), so the column stays NULL *(until #359, 2026-09-30, every save also nulled it; leaving it alone changes nothing here)*, and `UserContext.tsx:192` sees a "new day" on every bootstrap and `:213` increments. The streak is *"number of times the app was opened"*. **Owner decision 2026-09-30 (UX Q10, #365): a day counts when at least one lesson is completed on it; the day is the calendar day in Europe/Budapest (`lexipaws_activity_date()`, `security.php:136`); today's inflated numbers are kept, not reset.** See §21. Nothing in the code follows the rule yet: B3b (#381).
- **Purchased themes deactivate themselves.** The choice is written to `scores.active_theme` only. The `active_theme` column never receives it, and on the next load the column overwrites the JSON copy (`UserContext.tsx:139-141`). *(Until #359, 2026-09-30, every save also reset the column to `'default'`. It is now left alone, which does not help: nothing writes the choice into it. WP-B3.)* A user who paid 500 bones for Halloween loses it after any lesson. (The *inventory* row survives.)
- **Daily quests reroll on every page load**, so the same three can be farmed repeatedly.
- **The quest-persistence call is a guaranteed no-op.** `UserContext.tsx:229-235` posts to `update_progress`, which reads **only** `$data['xp']` (`api.php:1243-1290`) and errors when it is absent. No caller anywhere sends `xp`. `handleUpdateProgress` is entirely dead server code — *and it is also the endpoint an attacker would use to mint XP.*
- ~~**Achievements are noise.** `accuracy` is the literal `100` at all five `completeLesson` call sites (verified: `Dashboard.tsx:197,210`, `CharacterLesson.tsx:23`, `PracticePage.tsx:65`, `FTUELesson.tsx:20`). The `flawless` achievement and the `q_acc_100`/`q_acc_90` quests fire on everyone's first lesson.~~ ✅ Fixed (#371, 2026-09-30): all five pass `scoreData.accuracy`, the value the result screen shows (§6; the dead `BossEncounter` passes its hearts-based one). Measured as the returning guest on `cons_s_z`: one mistake → 88%, no `flawless`, `q_acc_100` 0, `q_acc_90` 0; a clean run → 100%, `flawless`, both quests +1. `q_acc_90` counts a lesson at 90% **or above** (`UserContext.tsx:459`) although its text says 'feletti' ("above"); not changed.
- ✅ **Fixed (#382, 2026-10-01):** the rank is counted on `user_leagues.monthly_xp` (`api.php:2267-2281`), so `get_friends` answers with every friend; group 10 of `save_progress_security_test.sh` checks it. *The text below is the bug as it was.* — **Friends is broken for anyone with a friend in a league.** `api.php:2083-2087` reads `monthly_xp` from `user_progress`; the column lives on `user_leagues` (`09_add_monthly_xp.sql`). The subquery sits inside `if ($friend['league_id'])`, so friends with no league row are skipped — but any league member throws, and the `catch` at `api.php:2110` collapses the whole response into an empty state.
- ✅ **Fixed (#381, 2026-10-01): one store, used, capped at 3.** The column is the store; `claim_reward` and the new `buy_shield` endpoint (100 Lexi-falat priced on the server, POST only, refused at 3 before anything is taken) settle missed days first and stop at 3; the shop button is disabled at 3 with 'Legfeljebb 3 pajzsod lehet.'. The intro lesson's shield is granted by the server once (`lesson_completed: 'tutorial'` while the stored scores lack `tutorial_done`). **Still not built:** the shield after registering (owner, #359). *The text below is the bug as it was.* — **Streak shields are stored twice and never used.** `claim_reward` writes the `user_progress.streak_shields` **column**; the client reads `scores.streak_shields` (**JSON**). ~~The column is zeroed by the next save.~~ *(Fixed by #359, 2026-09-30: a save keeps the column.)* Leaderboard shield rewards are kept now, but still invisible: the client shows only the JSON copy. Nothing anywhere decrements a shield against a missed day. *(Corrected 2026-09-30: `cron_notifications.php` does, on the **column**, which the client never reads. See [§10](#10-backend-api), "`cron_notifications.php` and the panel cron jobs".)* **Owner decision, 2026-09-30 (#359):** a new account starts with **0** shields. The learner gets 1 after the intro lesson and 1 more after registering; after that shields come from the shop and, later, from random quizzes (not built). Only the 0 exists in code (`newProgressRowDefaults()`, `api.php:989`; signup inserted 2 until #359, and the column's schema default is still 2, `01_add_gamification_columns.sql:7`, which no insert relies on). The two grants are not built; they belong with the one-store decision in WP-B3. **Owner decision 2026-09-30 (UX Q10, #365): a shield is used automatically, one per missed day, and a learner holds at most 3.** No cap exists in code today: the shop adds 1 per purchase with no limit (`ShopModal.tsx:26`), `claim_reward` adds to the column with no limit (`api.php:1586`), and the only bound is the +3-per-save clamp on the JSON copy (`api.php:1068-1071`). B3b (#381).
- **The sidebar leaderboard always shows Bronze** — `SidebarRight.tsx:27` calls `get_leaderboard` with no `league_id` and `api.php:1430` defaults to league 1. The locale string even hardcodes *"Heti Ranglista (Bronz Liga)"*.
- **"Personal Level" is permanently 1** — `scores.level` is declared and rendered but never written anywhere in `src/`.
- **Most chests give nothing.** `Roadmap.tsx:61-64` grants bones and energy only when a module has ≥6 nodes; with the injected chest only Module_4 qualifies. The other six fire full confetti for 50 XP.
- **Leagues never demote.** `league_id` is recomputed from *lifetime* points on every save. Early adopters permanently occupy Diamond and its 3.0× reward multiplier.
- **`cron_reset_leaderboards.php` is not idempotent** — no "already ran this period" guard. Two `?type=weekly` invocations double every prize.
- **The economy is unbalanced ~100×** — a lesson pays 1 bone, the cheapest item costs 100. Excluding the 100-bone guest grant and the +20 feedback widget, the Halloween theme is ~500 lessons away.
- **`data/quests.json` is dead data.** The live pool is hardcoded Hungarian at `UserContext.tsx:195-202` with different ids, a different schema and 1–2 bone rewards vs the file's 5–50. The file is still shipped by `build_release.js:61` and is the *one* file `validate_json.js` really validates.
- **Bones have four names in the UI:** "Lexi Treats", "Csont", "Jutalom Falatok", "Maškrty". **Owner decision 2026-09-30 (UX Q13, #370): the one Hungarian name is 'Lexi-falat'** ("Lexi treat"); see §21. The UI still shows the four names until D3b (#402) renames them.

### The minting holes, precisely

1. **Signup/login guest migration is uncapped.** `handleSignup` stores `guest_migration.scores` verbatim and `mergeGuestProgressIntoUser` (`api.php:657-707`) merges numerics with `max()` and **no cap**. The payload is `localStorage["neolix_guest_progress"]`, fully user-controlled. Editing one key before logging in grants arbitrary bones, XP, achievements and streak — bypassing every delta cap.
2. **`save_progress` / `update_progress` have no rate limit.** The only `security_rate_limit` calls in `api.php` are on beta request, signup, login, forgot/reset password and feedback. A loop mints +100 XP and +100 bones per request forever. **Part-fixed @ `92b6f18` (WP-B0):** `handleSaveProgress` now calls `security_rate_limit('save_progress_<user_id>', 45, 60)` ([api.php:1182](api.php:1182)). That is a rate reduction, not a cap, and the counter is session-backed ([§10](#rate-limiting-is-not-rate-limiting)); `update_progress` ([api.php:1243](api.php:1243)) still has no limit. Both remain WP-B2.
3. ~~**Mass assignment.** `parseProgressData` writes 17 client-supplied fields straight through. Only points, bones, shields, node `current_level` and energy are checked. `unlocked_items`, `active_theme`, `level`, `completed`, `earned_xp_per_node` are stored verbatim — a client can hand itself every cosmetic and every completed node, bypassing the paid `buy_cosmetic` path entirely.~~ ✅ **Narrowed (#359, WP-B1b, 2026-09-30).** `parseProgressData` ([api.php:1007](api.php:1007)) reads five fields: `points`, `completed`, `scores`, `quest_progress` and `completed_quests_today`. A `level`, `streak_count`, `streak_shields`, `active_theme`, `unlocked_items`, `earned_xp_per_node`, `daily_quests_date`, `active_quests`, `energy`, `last_energy_refill` or `last_active_date` sent by a client is ignored, on an existing row and on a first save alike. **Still open (WP-B2):** `completed` is stored verbatim, so a client can still mark every node completed, and the values inside the `scores` JSON (bones, `scores.streak_shields`, `scores.active_theme`) are held back only by the per-request clamps.
4. ~~**Client-driven email bombing.** `streak_count` is unvalidated input, and `api.php:1104-1113` sends a milestone email whenever the incoming streak exceeds the stored one and equals 7/30/100. Alternating between 6 and 7 sends an email per round trip through the live SMTP account — risking the sender reputation of `noreply@lexipaws.eu` exactly when Beta invites need to land in inboxes.~~ ✅ **Fixed (#359, WP-B1b, 2026-09-30).** A `streak_count` from the client is ignored, so the streak never rises through `save_progress` and `sendStreakMilestoneEmails` ([api.php:1148](api.php:1148)) sends nothing. The other side of that: **no milestone mail goes out at all** until the server counts the streak itself (WP-B3). *(Since #381, 2026-10-01, it does: a real day-7 lesson sends one mail, a second lesson that day none; suite group 9.)* The React client never triggered one either, because it never sent `streak_count`.

---

## 9. Internationalization (HU / SK)

**The UI shell is genuinely bilingual. The product is not.**

### What is right

`src/locales/hu.json` and `sk.json` have **exact key parity**: 182 leaf keys each, 12 namespaces, **0 missing either way**. The Slovak is authentic, good-quality Slovak — not placeholder, not leftover Hungarian. The six email templates in `templates/emails/` all branch correctly on `$data['language']`. **This is the only fully-localized subsystem in the app.**

### What is wrong

**Coverage.** 13 of 68 `.tsx` files import `useTranslation`; **51 contain Hungarian string literals**. The locale files cover roughly 7% of user-facing strings.

**32% of the translated keys are never used** — and two whole namespaces are dead:

- **`tour.*` (32 keys)** — a fully translated 8-step dashboard tour and 9-step leaderboard tour in both languages. `ProductTour.tsx:135-174` ignores them entirely, does not import `useTranslation`, and hardcodes **four English steps**. Joyride's own buttons render "Next"/"Back"/"Skip". *The first thing every new user sees is in the wrong language for both markets.*
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
  **Owner decision, 2026-08-28: the HTTPS redirect has been enabled at the host** — this **supersedes** the WP-A1 side finding that it was off for `lexipaws.eu`, which should no longer be cited as a live defect.
  ✅ **Redirect verified 2026-08-28 on all four hostnames.** `http://` returns **301** to the matching `https://` origin for `lexipaws.eu`, `lexipaws.hu`, `lexipaws.sk` **and** `dev.lexipaws.eu` — so this is not scoped to the apex, and `.hu`/`.sk` logins are not left on plain HTTP.
  ✅ **`Secure` session cookie verified on `dev`.** `GET https://dev.lexipaws.eu/api.php?action=csrf_token` returns `Set-Cookie: PHPSESSID=…; Max-Age=2592000; path=/; secure; HttpOnly; SameSite=Lax` — every flag §10 claims, confirmed live.
  ⚠️ **Not verifiable on the three production hostnames yet, and this is expected.** `https://lexipaws.{eu,hu,sk}/api.php` returns **404** and `/` returns **403** — production is still the emptied docroot from WP-A1, so there is no PHP to set a cookie. **Re-run the cookie check on all three immediately after the WP-A4 cutover.** The redirect being right does not prove the cookie is: `security.php:8-20` sets `secure` from its own HTTPS detection, and behind a proxy that terminates TLS, PHP can see plain HTTP and drop the flag even though the browser is on HTTPS.
- `password_hash(PASSWORD_DEFAULT)` / `password_verify`. ✅
- `session_regenerate_id(true)` on signup, login and beta-admin login — **but not after `update_password` or `reset_password`**, and neither invalidates other sessions. With 30-day cookies, a captured session survives the victim changing their password.
- **Password policy caps length at 16 characters** while requiring four character classes (`api.php:48`). This blocks password-manager secrets and pushes users toward weaker hand-made passwords. Client-side validation checks only `length >= 8`, so users hit server rejections after submitting.
- Password reset: `random_bytes(32)`, SHA-256 hashed before storage, 1-hour expiry, cleared on use, link base from an allowlisted `APP_BASE_URL`. ✅ Well done.

### CSRF

Token in `$_SESSION`, compared with `hash_equals`. Enforced at `api.php:89` **only when a session user exists** and the action isn't exempt. A second layer, `security_validate_same_origin()`, runs on POST only — and **both an absent `Origin` and an absent `Sec-Fetch-Site` pass**.

~~⚠️ **The CORS allowlist is duplicated in two files that must be edited together** — `api.php:7-26` (used by `api.php`) and `security.php:22-35` (used by `api/tts.php`). Both still include `https://neolix.studio` and four `localhost` origins **in production**, with `Access-Control-Allow-Credentials: true`. Since `csrf_token` is served over GET, script on any of those origins can fetch a token with credentials and drive every authenticated action.~~ ✅ **Fixed (#387, 2026-10-01, WP-E2).** There is one list, `security_allowed_origins()` ([security.php:25](security.php:25)): `https://dev.lexipaws.eu`, `https://lexipaws.eu`, `https://www.lexipaws.eu`, `https://lexipaws.hu`, `https://lexipaws.sk`, plus `http://localhost`, `:3000`, `:5173` and `:8080` **only when PHP runs under `php -S`** (`PHP_SAPI === 'cli-server'`: the local stack and the security suite; never the host). `api.php:7-8` sends the CORS headers through `security_send_cors_headers()` ([security.php:46](security.php:46), with `Vary: Origin`) and checks POSTs against the same list; `api/tts.php`, `upload_avatar.php` and `report_problem.php` use it too. `neolix.studio` is gone from every PHP file, including the `APP_BASE_URL` host lists (`api.php:33`, `mailer.php:13`). Group 11 of `save_progress_security_test.sh` checks it. Unchanged: `csrf_token` is still a GET, and an absent `Origin` or `Sec-Fetch-Site` still passes the POST check.

**Signup invite gate.** `lockBetaInviteForSignup()` ([api.php:248](api.php:248)) requires a valid invite unless `betaInvitesRequired()` ([api.php:239](api.php:239)) says otherwise, and that is false only for an explicit `0`/`false`/`no`/`off` in `BETA_INVITES_ENABLED` (environment first, then the `db_config.php` constant). Unset or empty, which is what `write_db_config.js` writes for a missing GitHub secret, keeps the gate shut (#387; it failed open before).

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
- `handleSyncVocabulary` returns the **raw PDO exception message** to the client (`api.php:1659`) — the only handler that does. It will also fatal on a non-string array element (`:1644`).
- `weekly_report` emails are **always Hungarian** — `cron_reset_leaderboards.php:91-97` omits the `language` key.
- Username escaping is inconsistent: `htmlspecialchars` in `get_session`/`login`/`signup`, **raw** in `get_leaderboard`/`search_leaderboard`/`get_friends`.
- Slack POSTs set **no `CURLOPT_TIMEOUT`** — a hung Slack stalls a PHP worker on every feedback and beta-request submission.
- `handleUpdateAvatar` (`api.php:821-843`) has **no `case`** in the switch and no caller. Dead.
- `logout.php` has no frontend callers but is still shipped by `build_release.js`. ~~So was `submit_feedback.php`, a stale fork that never granted the 20-bone reward and never actually refilled energy.~~ ✅ Fixed (#382, 2026-10-01): `build_release.js` no longer ships it; feedback goes only through `api.php?action=submit_feedback`.
- `formatUserProgress(array $progress)` is called with `fetch()`'s result, which is `false` when a user has no `user_progress` row → **TypeError**, which `catch (Exception)` cannot catch → `get_session` 500s. *(This is rarer than it sounds — signup and guest-merge both always insert the row — and it does **not** break the deploy health check, which runs with no session cookie and returns early.)*

### `cron_notifications.php` and the panel cron jobs

**The schedule (owner's Websupport panel, screenshot of 2026-09-30).** Three jobs exist:

| Job | Type | When | Target |
|---|---|---|---|
| Email notification | PHP 8.5 command | every night at 02:00 (`0 2 * * *`) | `lexipaws.eu/sub/dev/cron_notifications.php`, the dev folder |
| Weekly reset | URL visit | Sunday 23:59 (`59 23 * * 0`) | `https://lexipaws.eu/cron_reset_leaderboards.php…`, the production host |
| Monthly reset | URL visit | the 1st at 00:00 (`0 0 1 * *`) | `https://lexipaws.eu/cron_reset_leaderboards.php…`, the production host |

The notifications job is a command, not a URL visit. It passes `security_require_cli_or_token()` as CLI without any secret, and it has no `HTTP_HOST`, so its mail links come from `APP_BASE_URL` (`mailer.php:16-40`). It works on the database that dev shares with production. The two resets call the production host, which serves nothing until the cutover (WP-A4); that was not re-checked on 2026-09-30, and no job calls the reset on dev.

**What the notifications cron does since #358 (2026-09-30).**

- **The learner's day** is `lexipaws_activity_date()` ([security.php:136](security.php:136)): the calendar day in Europe/Budapest, which is the same zone as Europe/Bratislava, computed in PHP. `save_progress` writes it to `user_progress.last_active_date` on every successful save ([api.php:1207](api.php:1207)) and ignores a value sent by the client. The cron reads the clock once per run and compares against the same function. `CURDATE()` is not used, so neither PHP's `date.timezone` nor the database server's zone decides when a day ends. "Active" means a successful `save_progress`; the client sends one 1.5 s after any progress change (`UserContext.tsx:363-374`).
- **The cut-off.** A `last_active_date` before 2026-10-01, the first full day after the writer shipped, is never acted on ([cron_notifications.php:29](cron_notifications.php:29)). Until #358 the column was written by the old app's client and by this cron, never by the server on a save, so older dates say nothing reliable about activity. The constant `ACTIVITY_DATES_TRUSTED_FROM` overrides the day; only the configs generated by `local_stack.sh` and the test suite define it.
- **Inactivity mail** goes to a learner whose `last_active_date` is 2 to 13 days ago ([cron_notifications.php:34-42](cron_notifications.php:34)). `last_login_at` is no longer read, and a NULL date gets no mail. The cadence is unchanged: the first two at least 48 hours apart, then weekly. `inactivity_email_count` is still reset only by a password login (`api.php:740`).
- **Streak shields: mail only, no writes (#381, 2026-10-01).** The cron no longer writes `streak_count` or `streak_shields` ([cron_notifications.php:72-109](cron_notifications.php:72)). The server settles missed days itself at the learner's next save (§8). The cron only sends `streak_protected` to a row with `streak_count > 0`, `streak_shields > 0` and `streak_date` exactly two days ago, at most once in 24 hours. `streak_date` is written only by the server's own count, so legacy rows (NULL) are never matched; the cut-off above now gates the inactivity mail only.
- ~~**Columns, not the JSON.** … WP-B3 settles which store is the streak.~~ *(Settled by #381, 2026-10-01: the columns are the one store; see §8.)* Until #381 this block took a column shield and could end a column streak on an old-app row; suite group 7 now checks that five runs over three mornings change no streak and no shield, a legacy row included.
- **A failed send is printed and retried** on the next run (`Could not send … email to …`); only a successful send is recorded.

**What the old version did (2026-07-13, `a3a977b`, until #358).** Its at-risk query was `streak_count > 0 AND last_active_date < CURDATE() - INTERVAL 1 DAY` with no lower bound, and its shield write set the date to yesterday. Every row with a streak and an old date therefore lost one shield per night and then its streak. The old app on `main` wrote such rows for its users: its client sent `streak_count`, `streak_shields` and `last_active_date` with every save (`origin/main:js/dashboard.js:1180-1182`). What the cron did to them is recorded only in the database; `tools/local/maintenance/sql/358_what_the_old_streak_cron_did.sql` is a read-only query for the owner.

### Secrets — the good news

`db_config.php` and `db_config_prod.php` are **gitignored and were never committed** (verified: `git log --all -- db_config*.php` is empty; the SMTP password string is absent from history). `.htaccess:14-16` denies HTTP access to both.

**However**, both files sit in the working tree with live production values: DB credentials, `MIGRATION_TOKEN`, and the SMTP password for `noreply@lexipaws.eu`. They were read during this audit. **Rotate `MIGRATION_TOKEN` and the SMTP password** — the first grants schema execution on production, the second can send as the brand domain. Nothing reads `db_config_prod.php`; it is pure credential residue and should be deleted.

---

## 11. Database

Single MariaDB. Every backend script opens its own PDO connection from `db_config.php` constants. **No ORM, no shared connection helper, and no schema baseline** — the only declared schema is 24 `.sql` files in `data/migrations/` (00–23, two of them `04_`).

The schema is **MariaDB-only** (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`). It will not apply to stock MySQL.

### Tables

| Table | Migration | Notes |
|---|---|---|
| `users` | 00, 04, 06, 15, 16, 19 | email/username unique; `marketing_data` + `notification_preferences` JSON; `base_language` |
| `user_progress` | 00, 01, 02, 07, 11 | **`user_id` is the PK.** 17 columns. `completed`/`scores` are TEXT JSON blobs. |
| `user_subscriptions` | 00 | `role`, `subscription_tier` |
| `user_failed_exercises` | **04 and 12 (identical)**, 23 | UNIQUE `(user_id, level, exercise_id)`. FK CASCADE since 23 (#385). |
| `leagues` / `user_leagues` | 05, 09, 23 | Seeded **Bronze/Silver/Gold/Diamond** at 0/500/1500/5000. `user_leagues` FK CASCADE to users since 23 (#385). |
| `user_rewards` | 10, 23 | FK commented out in 10; index `idx_user_rewards_user_id` and FK CASCADE since 23 (#385) |
| `user_vocabulary` | 13 | `strength`/`last_reviewed` are SRS scaffolding with zero readers |
| `user_inventory` | 14 | The real source of theme ownership ✅ |
| `user_friends` | 17 | PK `(user_id, friend_id)`, both FK CASCADE |
| `beta_invites` / `beta_access_requests` | 20 | sha256 code hashes, sha256 ip_hash ✅ |
| `character_progress` | 08, 23 | **Created but never read or written by any PHP.** Dead table. FK CASCADE since 23 (#385). |
| `migration_history` | 03 | Bootstrap |

### Tables that exist only at runtime

- **`tts_cache`** — created by `CREATE TABLE IF NOT EXISTS` on **every single TTS request** (`api/tts.php:61-66`). In no migration. Keyed by **md5** (the docs say SHA-256).
- ~~**`user_metadata`** — queried in four places for one column, `last_feedback_refill` (`api.php:1801,1814`, `submit_feedback.php:42,57`). **No migration creates it.** On any DB built from migrations, the energy-refill-for-feedback loop throws — which is exactly the mechanism intended to harvest Beta feedback.~~ ✅ Fixed (#382, 2026-10-01). The live database has no such table either (owner, phpMyAdmin, 2026-10-01), so the refill had never worked anywhere. `last_feedback_refill` is now a `user_progress` column (`22_add_last_feedback_refill.sql`), and one `UPDATE` both checks the one-hour cooldown and stamps it (`api.php:1990-2005`), so two parallel submits cannot both refill. Nothing reads or writes `user_metadata` any more; the `user_metadata` key in the `get_session` reply (`api.php:961`) is an unrelated name for the user's profile fields.

### The migration runner

`migrate.php` globs + `sort()`s by filename, applies unapplied files one per transaction, and **breaks at the first failure**. Tracking is **by filename with no checksum** — editing an applied file is silently a no-op forever. Two files share the `04_` prefix, so the numbering is no longer a total order.

**MariaDB implicitly commits on DDL**, so the per-file transaction cannot roll back a partially applied `CREATE`/`ALTER`. The rollback is cosmetic for every migration except 04 (a `DELETE`) and 18 (an `UPDATE`). A failure leaves production half-migrated, unrecorded, with the next run re-executing from the top.

`04_add_username_unique_constraint.sql:6-8` issues an **unguarded destructive `DELETE`** across `users` before adding the constraint. Safe today only because `migration_history` prevents a re-run.

### Missing indexes on hot paths

| Query | Gap |
|---|---|
| Leaderboard `WHERE league_id ORDER BY weekly_xp DESC` | no `(league_id, weekly_xp)` / `(league_id, monthly_xp)` → index scan + filesort |
| Friends join | `ON (…) OR (…)` across two columns defeats both indexes; `status` unindexed; per-friend rank query runs in a PHP loop (N+1) |
| ~~`get_pending_rewards`~~ | ~~`user_rewards` has only a PK → full scan~~ ✅ Fixed (#385, 2026-10-01): `idx_user_rewards_user_id` (migration 23) |
| Password reset `WHERE reset_token = ?` | **unindexed full scan of `users`, on an unauthenticated endpoint** |
| Beta rate limit `WHERE ip_hash = ?` | **unindexed, unauthenticated** |

The last two are cheap DoS amplifiers during an open Beta.

### No erasure path

`grep "DELETE FROM users"` finds only migration 04: the app has no delete-account action (§5, `ProfilePage.tsx`). ~~And `user_leagues`, `user_rewards`, `user_failed_exercises` and `character_progress` have **no `ON DELETE CASCADE`**, so a manual delete orphans rows rather than cleaning up. GDPR erasure needs those FKs first.~~ ✅ Fixed (#385, 2026-10-01): `23_add_user_cascade_foreign_keys.sql` deletes the rows that already belonged to no user, then adds `ON DELETE CASCADE` FKs from those four tables to `users(id)`. Every table with a user id now cascades, except `beta_invites.used_by_user_id`, which is `ON DELETE SET NULL` (20).

**Operator erasure procedure** (by hand in phpMyAdmin, until the app has a delete-account action):

1. `DELETE FROM users WHERE id = ?;` — this one statement removes the user's rows from `user_progress`, `user_subscriptions`, `user_leagues`, `user_rewards`, `user_failed_exercises`, `user_vocabulary`, `user_inventory`, `user_friends` (both directions) and `character_progress`, and clears `beta_invites.used_by_user_id`.
2. Not keyed by user id, so not covered by step 1: the e-mail address in `beta_access_requests.email` and `beta_invites.email` (delete or blank those rows by e-mail), and the avatar file in `avatars/` named by `users.avatar` (`upload_avatar.php:95,120`; note the name before step 1).

Proven on the local stack, against a database seeded with orphan rows and from zero: after step 1, `tools/local/testing/erasure_check.sql` lists every table and finds 0 rows naming the erased id.

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

**13 files, 9,297 lines, bundled into ONE 154 KB stylesheet** *(counted 2026-08-28; on 2026-09-30, with `tokens.css` from #364, it is 14 files and 9,534 lines)*. Because `App.tsx` imports every page statically, **every rule applies on every route** — "page-scoped" CSS does not exist here.

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
- **Reduced motion does not work.** `main.css:358` uses `animation-duration: -1ms`, which is invalid CSS and is dropped by every parser. *(The block's other five declarations — `animation-delay`, `iteration-count`, `background-attachment`, `scroll-behavior`, `transition-duration` — are valid and do apply.)* Net effect: animations still play once at their **full authored duration**, including infinite background loops and the paid themes' particle fields.
- **`scaleUp` and `slideInRight` have no `@keyframes` anywhere** — four modal entrance animations silently do nothing. `fadeIn` is defined only inside `PostLesson.tsx`'s `<style>` tag but used by three other components, so it only animates while PostLesson happens to be mounted.
- ~~**Seven custom properties are used but never defined:** `--color-bg-body`, `--color-border`, `--color-bg-main`, `--color-bg-inset`, `--glass-border-color`, `--color-bg-active`, `--border-color`.~~ ✅ Fixed (#364, 2026-09-30): `--color-border` is now a real token (below); the other six references were replaced by an existing token or by the value that already rendered. `npm run check:css` fails on any new one.
- ~~**`--glass-border` is a shorthand** (`1px solid #E5E7EB`) used as a color in four places — all invalid and dropped.~~ ✅ Fixed (#364, 2026-09-30). *It was 25 places, not four (6 in CSS, 19 in components): `border: 2px solid var(--glass-border)` and the like, which the browser dropped whole, so those elements had no border at all.* All 25 now use `var(--color-border)`; the visible results are listed under Tokens.
- ~~**`interactive.css:933-936` selects on inline-style string content:** `:has(.interactive-feedback-message[style*="rgb(5, 150, 105)"])`. Any change in how React serialises that colour silently breaks the correct-answer footer tint.~~ ✅ Fixed (#360, 2026-09-30): the selector is gone, and so are the phone-only lime title (`#8bdc2a !important`), the rule that hid the ✓/✖ and the two-line clamp on the answer. The footer's `data-state` now picks the colours from the `--feedback-*` tokens (`interactive.css:499-591`, §6 Lifecycle).
- **A third styling layer exists:** 22 `@keyframes` live inside `<style>` tags in six TSX components, some shadowing CSS-file definitions.
- **`RewardPopup.css` hardcodes a dark gradient with white text** — unreadable by design on the default light theme. Same class of problem in `legal.css`.

### Breakpoints

20 distinct values across 39 media queries, no shared scale. Three near-duplicate desktop thresholds coexist: **991 / 992 / 1199 / 1200** — and the design guide documents a fourth (1024). Two byte-identical media queries in `interactive.css` (lines 1306 and 1388) carry conflicting values. *(2026-09-30, #360: `interactive.css` gained one `@media (min-width: 601px)` block at `:623` for the feedback banner; 601 was already one of the values, so the distinct-value count is unchanged and the query count is one higher.)*

**The scale, decided in C1a (#364, 2026-09-30): three `min-width` breakpoints and no others.**

| Name | Query | Use |
|---|---|---|
| `sm` | `@media (min-width: 480px)` | two-up option grids |
| `md` | `@media (min-width: 768px)` | drawers become side panels |
| `lg` | `@media (min-width: 1024px)` | three-column desktop; replaces 991 / 992 / 1199 / 1200 |

Phone styles are the base rule. A media query cannot read a custom property, so the number is written out; `--breakpoint-sm/md/lg` in `tokens.css` carry the same values for scripts. **Every new media query uses one of these three values.** The existing queries are untouched: #364 added none and changed none, and WP-C2 converts them file by file. Until then `Dashboard.tsx:31` and `ProductTour.tsx:11` still test `(max-width: 991px)` in JavaScript.

### Tokens (C1a, #364, 2026-09-30)

[`src/assets/css/tokens.css`](src/assets/css/tokens.css) holds the tokens that do not depend on the theme; `main.tsx:3` imports it first. Colour tokens stay in `main.css`, one set per theme scope (C1b, #393, builds the ramp). #364 **defined** the scales and moved the z-indexes onto them; it did not repaint existing spacing, radii or shadows, which WP-C2/C3 do as they touch each rule.

| Scale | Tokens |
|---|---|
| Spacing (4-pt) | `--space-1` 4 px · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 (the phone gutter) · `--space-6` 24 · `--space-8` 32 · `--space-12` 48 (written in rem) |
| Radius | `--radius-sm` 8 px inputs and chips · `--radius-md` 16 buttons and cards · `--radius-lg` 24 sheets and dialogs · `--radius-full` pills and avatars |
| Elevation | level 0 is `border: var(--glass-border)` and no shadow · `--elevation-1` `0 1px 2px` + `0 2px 8px` · `--elevation-2` `0 12px 32px` (navy `#0F1524` at 6, 8 and 18 %) |
| Motion | `--duration-press` 120 ms · `--duration-state` 200 ms · `--duration-sheet` 320 ms · `--ease-out` `cubic-bezier(0.2, 0.8, 0.2, 1)`. Defined only; reduced motion is still broken (C3e, #464) |
| Border colour | `--color-border`, per theme scope in `main.css`: `#E5E7EB` light (`:21`), white 10 % dark (`:35`, `:49`), amber 20 % `fall`, purple 20 % `halloween`. `--glass-border` is `1px solid var(--color-border)` and is only valid as a whole `border` value |

**Layers.** Anything that covers the page takes a layer token, never a number:

| Token | Value | Who uses it |
|---|---|---|
| `--layer-base` | 0 | the landing nav drawer inside the header |
| `--layer-raised` | 10 | the header's logo and menu button, the landing hero and mascot, the floating feedback button |
| `--layer-app-bar` | 100 | `.site-header` (`main.css:99`) |
| `--layer-nav` | 200 | the dashboard drawers and side panels; the phone bottom bar is `calc(var(--layer-nav) + 1)` so it stays above an open drawer |
| `--layer-screen` | 250 | full-screen takeovers: `LessonPlayer`, `BossEncounter` |
| `--layer-dialog` | 300 | `.modal-overlay` (auth, shop), reward popup, grammar modal, report, avatar upload, energy refill, level picker |
| `--layer-toast` | 400 | `AchievementPopup` |
| `--layer-tour` | 500 | the product tour. Joyride needs a number, so `ProductTour.tsx:14` repeats it as `TOUR_LAYER = 500`: change both together |

- **The header is below every dialog** (100 < 300). Before #364 it carried an inline `zIndex: 9999` over `.modal-overlay`'s 2000 and hid the top 58 px of the auth dialog on phones (C37). That inline style and the one-off `zIndex: 10000` on the guest-merge question (#363) are gone.
- **A layer only orders siblings inside one stacking context.** `.dashboard-container` is one (`dashboard.css:13`, `z-index: 1`): its drawers, bottom bar and the level picker inside the left drawer stay under the lesson screen and under the floating feedback button whatever their layer. That is why the feedback button still sits on top of an open drawer (C37, #391). The real fix is a portal (UX2-1, #396).
- **26 literal z-index values before, 16 after.** What is left is local to one component (−2 … 20, 60, 90, 100) plus two above 100: the word tooltip inside the lesson (`InteractiveSentence.tsx:183`, 2000) and the dead `.mascot-container` (`dashboard.css:2882`, 1000).
- **What became visible when the 25 dropped borders started to apply:** a hairline around the lesson's instruction bubble, word-order chips, the type-in field (with its green focus ring), the streak-goal cards, the Profile selects and 'Log Out' button, the avatar drop zone, and the round back button on Practice, Characters and Leaderboard. The 'My Friends' rows lost a hardcoded `#eee` border that glared in dark mode. Nothing else moved: a before/after pixel comparison of 372 screenshots is in the #364 evidence.

**`npm run check:css`** ([`scripts/check_css_tokens.js`](scripts/check_css_tokens.js)) reads every stylesheet a module imports plus every `.ts`/`.tsx` file and fails when a `var(--x)` has no definition or when `--glass-border` is used as anything but a whole border value. It skips `src/index.css` and `src/App.css`, which nothing imports. It is not part of CI yet.

**`root-fix.css` is two-thirds band-aid.** Its `overflow-x` and `box-sizing` rules duplicate `main.css`; only the `#root` flex-column rule is load-bearing. It was patching `index.css`'s `#root { width: 1126px }` — a threat that no longer exists since `index.css` was unhooked. Merge the `#root` rule into `main.css` and delete all three files.

---

### 12.1 Settled design decisions — owner, 2026-08-28

These answer §21 Q8–Q11. They are **decisions, not descriptions of the code**: each names the change it implies. Where they disagree with `docs/guides/design_guide.md`, they win.

| # | Decision | Where the code stands today |
|---|---|---|
| **D1** | **The primary accent is green `#10B981`.** | Already what users see — the rogue bare `:root` at `landing.css:206` beats `main.css:12`'s `#3b82f6` in light *and* dark. The decision **ratifies the accident**: no visual change today, but the value must move into `main.css:12` and the rogue block must go. ⚠️ **`#10B981` is not shippable as a single value — it fails contrast in light mode. See "The accent needs a ramp" below.** |
| **D2** | **Nunito is the brand typeface.** | Already the only font `index.html:33` loads, and already force-applied globally (`dashboard.css:2849`, `landing.css:218` with `!important`). `--font-heading: 'Outfit'` and `--font-body: 'Inter'` (`main.css:4-5`) are dead pointers to be **repointed at Nunito** — not repaired by adding font loads. |
| **D3** | **The canonical Lexi rendering is the 2D cel** — the `Tyler-asset-pack.png` turnaround (879 KB: 6 head angles, 5 body views, 8 expressions, separate ears and tails). | Ships in every deploy and is **used nowhere** — but it is **not the only copy**: 24 of the 26 files in `public/assets/images/Transparent PNGs/` are **already-separated cel views cut from that pack** (`tyler-sitting-front`, `tyler-front-full-body`, `tyler-left/right-profile`, `tyler-back`, `tyler-running-right`, plus 8 head expressions). The hand-coded grey SVG in `LexiMascot.tsx` / `LexiAnimation.tsx` / `Gateway.tsx` is retired; the photoreal `tyler-3d/` frames are **not** canonical. |
| **D4** | **Theme default stays `system`.** | Restated, not new — §2 constraint #4 is unchanged. Light and dark must both be correct. |

**Consequences that are not obvious:**

- **Deleting the rogue `:root` wholesale breaks the landing page.** **Seven** tokens are defined *only* there — `--color-bg`, `--color-surface`, `--color-primary`, `--level-a1`, `--level-a2`, `--level-b1`, `--level-b2` (`landing.css:204-213`) — with **16 live consumers, all inside `landing.css` itself** (`:219`, `:237`, `:268`, `:334`, `:387-400`, the level-card borders and buttons). WP-C1 currently reads *"pick one and delete the other"*; the accurate instruction is **rehome those seven into the C1 token block first, then delete the rogue block.** *(Corrected 2026-08-28 — an earlier pass said six; `--level-a1`…`--level-b2` is four tokens, not three.)*
- **D1 does not banish blue.** `--color-primary: #3B82F6` survives as a secondary, and `--level-a2` is blue by design. The decision is about `--color-accent-in` only.
- **D1 does not touch the purchased themes.** `main.css:1035`, `:1050`, `:1065` and `:1080` each re-declare `--color-accent-in` inside a theme scope; those stay.
- **D2 makes two hacks redundant, not correct.** Once the tokens say Nunito, `dashboard.css:2849`'s `* { font-family }` and `landing.css:218`'s `!important` should be **deleted**, not kept as belt-and-braces — they are two of the reasons the type layer is currently unpredictable.
- **D3 withdraws recommendation 7 in §13.** That item proposed swapping the landing run-cycle for the four `tyler-3d/` PNGs. Under D3 that is off the table — the run cycle needs 2D cel frames, and the asset pack does not contain a run sequence. **Recommendation 6 (swap the grey SVG for a cropped cel still) stands and is now the priority; recommendation 7 is withdrawn pending cel run frames.** Until those exist the run animation stays as-is; it is not a regression, just an unresolved surface.

#### The accent needs a ramp — measured 2026-08-28

D1 was checked against WCAG rather than by eye, and the result **inverts the risk an earlier pass assumed.** Green is fine in dark and **fails in light** — which is the default-rendering theme and the one every current user sees. Contrast of `#10B981` against the palette in `main.css:7-10` and `:28-31`:

| Usage | Light | Dark |
|---|---|---|
| Accent as **text/icon** on the page ground | **2.43:1 ❌** | 6.99:1 ✅ AA |
| Accent as text on a surface | **2.54:1 ❌** | 5.79:1 ✅ AA |
| **White label on a green fill** (the primary-button pattern) | **2.54:1 ❌** | — |
| Non-text UI contrast, WCAG 1.4.11 (needs 3.0:1) | **2.43:1 ❌** | 6.99:1 ✅ |

**Both failing patterns are live and widespread.** `--color-accent-in` has **170 usages**, in both shapes: as a text colour (`AuthModal.tsx:369` a link, `ShopModal.tsx:89` the active tab, `ReportProblemModal.tsx:130` and `FeedbackRefillModal.tsx:139` headings) and as a fill under a hardcoded white label (`AvatarUploadModal.tsx:119`, `FeedbackRefillModal.tsx:113`, `LexiFeedbackWidget.tsx:51`, `ReportProblemModal.tsx:232`). For reference the blue it replaces was also weak in light (3.52:1 — large text only), so this is **not a regression introduced by D1**; it is a pre-existing failure that D1 makes slightly worse and now owns.

**No single green satisfies both themes** — that is the finding that matters, because it is structural rather than a matter of taste:

| Candidate | On light | White on fill | On dark |
|---|---|---|---|
| `#10B981` emerald-500 *(the decided value)* | 2.43 ❌ | 2.54 ❌ | **6.99 ✅** |
| `#059669` emerald-600 | 3.61 ⚠️ | 3.77 ⚠️ | 4.71 ✅ |
| `#047857` emerald-700 | **5.25 ✅** | **5.48 ✅** | 3.23 ⚠️ |
| `#34D399` emerald-400 | 1.84 ❌ | 1.92 ❌ | **9.23 ✅** |

**Recommended, and it keeps D1 intact — the accent is still green, it just stops being one hex:**

- **Light: `#047857`** (emerald-700) — 5.25:1 as text, 5.48:1 for a white label on a green fill. Both pass AA.
- **Dark: `#10B981`** (emerald-500, the decided value) — 6.99:1. Note a green fill in **dark** needs a **near-black label**, not white (`#111827` on `#10B981` is 6.99:1; white is 2.54:1).
- This means **`--color-accent-in` must become theme-scoped.** It is not today: the dark block at `main.css:29-40` redefines backgrounds and text but **never redefines the accent**, so light and dark currently share one accent value. That gap is a C1 deliverable, not a colour preference.

⚠️ **Still needs a human eye, not a calculator:** contrast is a floor, not a design review. Emerald-700 is noticeably deeper than the green on the landing page today, so the light theme will visibly change — which contradicts the "no visual change" reading of D1 and is worth seeing before it ships.

**One inconsistency D1 does not resolve.** The accent is a *family* — `--color-accent-in` (170 uses), `--color-accent-on` (58), `--color-accent-at` (10) — and D1 names only the first. The other two are still blue (`#60a5fa`, `#2563eb` at `main.css:13-14`), so today the app renders **a green base with blue hover and active states**, and the gradients at `AuthModal.tsx:34` and `ShopModal.tsx:66,127` interpolate green→blue. **C1 must extend the green decision across all three**, or the ramp fix will look half-applied.

⚠️ **One earlier assumption was wrong — corrected by checking the disk:**

**~~The cel sheet has to be sliced.~~ It already is.** The individual cel views exist as separate files and have since 2026-07-03. What blocks them is the defect §13 already names: **every one is the full 768×1364 canvas with everything else erased**, so they render as thumbnails floating in empty space. D3 therefore needs **no new art and no slicing** — it needs **WP-G1 item 2, the alpha-bounding-box crop**, which was already the single highest-value asset fix available. That makes D3 cheap. The one genuine gap is the **run cycle**: only `tyler-running-right.png` exists, a single pose, not a sequence — which is why §13 recommendation 7 is withdrawn rather than redirected. *(A chroma-key variant, `tyler-asset-pack-green-bg.png`, 1.3 MB, also ships and is likewise unused — a second orphan for WP-G3, not a second decision.)*

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
2. **`Tyler-asset-pack.png`** (879 KB) — a genuinely good 2D cel turnaround: 6 head angles, 5 body views, 8 expressions, separate ears and tails. **Unused as a sheet — but 24 of the 26 files in the same folder are already-separated views cut from it**, equally unused. ✅ **Canonical as of 2026-08-28 — see §12.1 D3.**
3. **`Lexipaws macot.png` / `Lexipaws app logo and icon.png`** — polished flat-vector brand art, but they are *poster mockups with fake UI baked in*, not extractable assets. **Unused.**
4. **`public/images/tyler-3d/{run1,run2,skid,sit}.png`** — photoreal 3D, clearly cut for exactly the four states of the landing run-in animation. **Unused**; the SVG frames were hand-built instead.
5. **`boss_character.png`** — a dragon from a different franchise, **and it is a JPEG with a `.png` extension** (`file`: `JPEG image data, … 1024x1024, components 3`, no alpha, white corner pixel). It renders at 350×350 over a dark navy gradient → **a white square on the boss arena**.

Renderings 2, 3 and 4 *do* share a consistent character design — dark blue-grey AmStaff, white chest blaze, teal collar. **You have a real character bible.** The gap is entirely delivery.

### The single most damaging asset defect

**All 26 "Transparent PNGs" are the full 768×1364 source sheet with everything else erased — not crops.** Alpha bounding boxes: `tyler-jump.png` = 241×343, **7.9% of the canvas**; `tyler-head.png` 1.7%; the head expressions **0.6%**.

With `objectFit: contain` in `PostLesson.tsx:312`'s 200×200 box, the dog renders at roughly **35×50 px, offset below centre**. That is the lesson-completion celebration — the app's emotional payoff — and the mascot is a thumbnail floating in empty space. *(The level-up and reward screens, which had the same defect at 280px and 220px, were deleted in #371; the image is now `PostLesson.tsx:283`.)*

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
6. **Swap the hand-coded grey SVG for a cropped 2D cel still** (`tyler-sitting-front.png`, or a crop cut from `Tyler-asset-pack.png`) in `LexiMascot`, `Gateway` and the animation's sit frame. The grey blob is the app's worst visual asset and it is on your three highest-traffic surfaces. **Confirmed by §12.1 D3 — the cel is canonical, so this is now the priority item in this list.**
7. ~~**Swap the run-cycle SVG frames for the four `tyler-3d/` PNGs**~~ — **WITHDRAWN 2026-08-28 by §12.1 D3.** The photoreal 3D rendering is not canonical, so shipping it on the landing page would put a second mascot style in front of first-time visitors. The run cycle needs **cel** frames, and the asset pack has no run sequence — so this stays unresolved rather than fixed. *Two parts of it survive independently of which art is used:* add `overflow: visible` (the muzzle is clipped every frame) and drop the `animation: none !important` at `main.css:759-762`, which kills the run on phones while the JS keeps cycling.
8. **Pick one icon language.** Replacing the ~26 nav/UI emoji with flat SVGs matching `svgDictionary`'s style is about a day, and it stops the app from looking different on Windows.
9. **Delete the orphans and optimise the rest** — `public/images/` (byte-identical duplicate), the `.ai`/`.eps`/`pikaso-creations` folders, the two 4–5 MB mockup posters, `stars.jpg`, `star.jpg`, `star-gamified.png`, `public/icons.svg`, `src/assets/{hero.png,react.svg,vite.svg}`. Run SVGO on the four traced SVGs (expect 60–80% off 960 KB). **Takes the deploy from ~34 MB to ~2 MB.**

---

## 14. Build, deploy, CI, and tests

### Release packaging

`scripts/build_release.js` wipes `release/`, copies `dist/`, then `data/hu`, `data/sk`, `data/migrations`, `templates`, PHPMailer, and 14 individual PHP files.

**Ordering is load-bearing:** Vite copies `public/.htaccess` into `dist/`, and line 48 then **overwrites it** with the root `.htaccess`. This matters because the two files have **materially different CSP** — `public/.htaccess:36` declares `script-src 'self'` with no font or analytics allowances, which would block GA4, Headway **and the Nunito webfont**. It is dead configuration whose only purpose is to be overwritten. ✅ **Fixed @ `450b9dd` (WP-A3):** `public/.htaccess` was deleted, so the root `.htaccess` is the only one and the copy order no longer matters.

`release/` also ships **2.7 MB of curriculum JSON that nothing reads** — no deployable PHP touches `data/`, and the frontend inlines it at build time. It is simultaneously publicly downloadable at `/data/hu/…`, so the whole curriculum is scrapeable and ships twice.

### Hosting & deploy

Shared Apache at Websupport.sk over **FTPS port 21**. No SSH, no containers, no server-side build. Two document roots on one account: `lexipaws.eu/web` (prod) and `lexipaws.eu/sub/dev` (staging).

Deploy order: **upload everything → run remote migrations → health check.** By the time anything can fail, production has already been overwritten. **There is no rollback step anywhere** — `docs/guides/cicd_user_story.md:33-34` lists "Rollback Capability" as an acceptance criterion and it is unimplemented.

**The health check is a false green.** `verify-deploy.yml:177` uses `curl -f`, which only fails on HTTP ≥ 400 — but `api.php:41-43` (missing `db_config.php`) and `:59-63` (PDO failure) both `echo` a JSON error and **exit with HTTP 200**. A deploy that lost its database config reports success and posts "🚀 CD Deploy Succeeded" to Slack. The check only proves Apache can execute PHP. ✅ **Fixed @ `450b9dd` (WP-A3, 2026-08-29):** the health check now fails unless the body of `api.php?action=get_session` contains `"session"` (`verify-deploy.yml:269-271`), so a dead database turns the deploy red. The order is unchanged — it still reports after the upload, so it detects a broken deploy but does not prevent one.

**What else WP-A3 changed (`450b9dd`).** The release bundle is uploaded as a workflow artifact before `db_config.php` is generated, behind an assertion that fails the job if any credential file is in it (`verify-deploy.yml:188-201`), so there is now something to restore from by hand. `workflow_dispatch` redeploys a target without a code push, and only when the chosen target matches the branch it was launched from. `.htaccess:23-25` denies `.ftp-deploy-sync-state.json` — it returned 200 with 69,475 bytes before and returns **403** now (re-checked 2026-09-30). Migrations 04, 07 and 11 are idempotent. There is still no automatic rollback.

`main` deploys to production **automatically on push** with no manual approval gate, no GitHub Environment protection, and no version stamp.

**Branch policy — solo-maintainer mode (owner, 2026-09-23).** The project has one developer, so PR review was removed. `dev` is the **default branch** and accepts **direct pushes**, with no required reviews and no required status checks. It still blocks force-push and deletion. Every push runs CI, and the deploy job `needs: verify`, so a red build lands on the branch but never reaches `dev.lexipaws.eu`. `main` keeps its classic protection (1 approval, strict `Verify (CI)` + `Analyze Code`, enforced for admins) until the React cutover. Deploys are serialised per target with a `concurrency` group. `dependabot-automerge.yml` merges green patch and minor Dependabot PRs into `dev` and dispatches the deploy itself, because a `GITHUB_TOKEN` merge does not fire `push` workflows.

**Dependabot state (2026-09-24, re-checked 2026-09-30).** #266 (react-router and react-router-dom → 7.18.4, `c4c6609`) and #258 (postcss → 8.5.28, `c8c9976`) were merged into `dev` on 2026-09-24 and deployed green at `c8c9976` (CI/CD run 35975312643). #266 is a grouped update, which the auto-merge workflow skips by design, so it was merged by hand. #257, #264 and #265 targeted `main` and were closed unmerged on 2026-09-23. No Dependabot PR or alert is open, and the remote has only `dev` and `main`.

### Workflows

| Workflow | Trigger | Gates? |
|---|---|---|
| `verify-deploy.yml` | push/PR on main+dev, manual dispatch | ✅ The only real gate — on `dev` it gates the **deploy**, not the push. PHP lint, security scan, oxlint, JSON validate, build, sandbox migrations against `mariadb:10.6`, and since 2026-09-30 (H1a, #357) the `save_progress` security suite (`verify-deploy.yml:91-95`), which since #358 also runs `cron_notifications.php`. |
| `codeql-analysis.yml` | push/PR + weekly | ✅ Required check `Analyze Code` on `main` only (advisory on `dev`) — but **`javascript-typescript` only. The entire PHP backend is unscanned.** |
| `cypress.yml` | `workflow_dispatch` only | ❌ Gates nothing, and cannot run (see below) |
| `sonar-sync.yml` | after CI + daily cron | ❌ Two broken integrations (see below). **Disabled since 2026-09-24**, after it filed 86 duplicate issues in one night. |
| `dependabot-automerge.yml` | after CI on a Dependabot PR | Merges patch and minor bumps into `dev` once all PR checks pass, then dispatches a `dev` deploy. |

CI pins **Node 20** and **PHP 8.2**; this machine runs Node 26 and PHP 8.5. Local and CI do not run the same runtimes.

`npm ci || npm install` (`:44`, `:143`) defeats the purpose of `npm ci` — a drifted lockfile silently falls through and passes green. *(The lock is in sync today.)* **Half-fixed @ `450b9dd` (WP-A3):** the deploy job now runs `npm ci --ignore-scripts` (`verify-deploy.yml:177`); the verify job still has the fallback (`:53`).

The lint step is labelled "Run ESLint" but runs oxlint, which **exits 0 with 45 warnings**. It blocks nothing.

### Test coverage: effectively zero

**One real test now gates the deploy (H1a, #357, 2026-09-30).** The verify job runs `tools/local/testing/save_progress_security_test.sh` on every push (`verify-deploy.yml:91-95`), without `--slow`. It drives the real `api.php` over HTTP from a sandbox copy and makes 8 checks: the anti-cheat clamps hold on a poisoned `scores="0"` row and after a `{"scores":0}` payload, a scripted loop is throttled after 45 requests, an honest save is stored byte for byte, a user with no `user_progress` row can save, league XP accumulates, and a streak milestone saves without SMTP. A failed check exits non-zero and fails the job; the deploy job `needs: verify` (`verify-deploy.yml:117`) and its `if:` has no `always()` or `failure()`, so it is skipped. In CI the suite does not start a MariaDB: `--db-host 127.0.0.1 --db-port 3306` points it at the job's `mariadb:10.6` service, where it creates a database of its own (`lexipaws_sptest_<pid>_<time>`), drops it on exit, and leaves `learn_english_test` alone. It accepts a loopback host only, so it cannot be pointed at the live database. Without `--db-host` it still starts and destroys its own instance, as before. **This is the only automated test of behaviour.** It covers `save_progress` and nothing else: login, signup, lesson playback, XP maths in the frontend and streak rules remain untested, and everything below still describes the rest. **Extended by #358 (2026-09-30) to 26 checks in 8 groups:** group 6 proves that every successful save sets `last_active_date` to the learner's day and ignores a date sent by the client; group 7 runs the real `cron_notifications.php` from the command line and proves that legacy, never-stamped and saved-today rows are left alone, that one missed day costs one shield, and that the inactivity mail follows activity and not the last login; group 8 proves the cut-off day. So the suite now also covers the notifications cron. It still cannot send mail: a mail that is due appears as a `Could not send …` line. **Extended by #359 (2026-09-30) to 45 checks (46 with `--slow`):** group 4 gained 19. Ten prove that each column the client never sends survives the real five-field autosave; one that the five sent fields are stored and the day is stamped; five that an autosave carrying `active_theme`, `streak_shields`, `energy`, `level` with `unlocked_items`, or the remaining ignored keys leaves the whole row unchanged; one that the same keys sent on their own change none of the ten columns; and two that a first save and a real signup (through the invite gate) create a row with the same defaults. Group 5's milestone check now proves that a `streak_count` from the client is ignored and attempts no mail. Against the commit before (`--ref e6d7345`) 21 of the 45 fail.

The rest of the automated test suite:

```js
describe('Homepage Test', () => {
  it('loads the homepage successfully', () => {
    cy.visit('/');
    cy.get('body').should('be.visible');
  });
});
```

That is `cypress/e2e/home.cy.js` in full. There are no unit tests, no component tests, no PHP tests other than the `save_progress` suite above, no `vitest`/`jest`/`playwright`/`phpunit` config anywhere. The one test asserts a `<body>` renders — not a route, not text, not a network call. Under `vite preview` there is no PHP backend at all, so every API call 404s and it still passes.

**And it cannot run:** `cypress` is in neither `dependencies`, nor `devDependencies`, nor `package-lock.json`, nor `node_modules/`. `cypress.yml` also declares a 2-container "parallelization" matrix without passing `parallel`/`record`/`group`, so it would run the same one test twice.

`docs/guides/git_workflow_and_testing_standards.md:115-119` declares tests **mandatory** for scoring engines, XP maths, streaks, API endpoints and security validation. None of that is tested. Merging to `main` deploys to `lexipaws.eu` with nothing verifying login, lesson playback, progress save, XP, or streaks.

### Two silently-broken automations

- **`sync_sonar_issues.js` can never deduplicate.** The issue body it writes contains no `<!-- SonarCloudKey: … -->` marker, but the dedup pass at `:183` extracts existing keys with a regex for exactly that marker. `existingKeys` is always empty, so **the daily midnight cron re-creates a GitHub issue for every unresolved SonarCloud finding, every day, forever.** Left running through Beta, real tester bug reports become unfindable. **This happened on 2026-09-24:** one nightly run filed 86 duplicate `[SonarCloud]` issues (#267–#352) between 02:35 and 02:38 UTC. All 86 were closed as not planned the same morning, and the workflow was disabled that day (`gh workflow disable`; `gh workflow list --all` shows `disabled_manually`). The script is not repaired, so re-enabling the workflow repeats the flood; deleting both files is WP-H3. SonarCloud findings live only in the SonarCloud dashboard.
- **Its GitHub Projects calls cannot work.** `sonar-sync.yml:16-17` grants only `permissions: issues: write`; the default `GITHUB_TOKEN` has no Projects v2 scope and workflow `permissions:` cannot grant one. Every project call fails, every failure is swallowed into `console.error`, and the workflow still reports success.

### Local-only artifacts

`release/` on this machine is **stale** (built Jul 16 against a Jul 17 `api.php`) and littered with iCloud/Finder conflict duplicates — `api 3.php`, `chest 2.svg`, `new-icon 2.svg`, plus six empty `* 2`/`* 3` directories. **These are local only** and the next `npm run package:release` erases them. But if `release/` were ever uploaded wholesale, stray duplicate PHP files would land in the web root.

---

## 15. The critical trace: node click → XP in MySQL

This is the most important thing in this document. Each hop discards information; the failures compound rather than sit side by side.

| # | Hop | Where | What is lost |
|---|---|---|---|
| 1 | Node click, energy spent | `Dashboard.tsx:121` | Energy decrements in **client state only** |
| 2 | Player computes reward | `LessonPlayer.tsx:405-406` `xpEarned = max(5, 15-mistakes)`, `accuracy = floor(correct ÷ graded × 100)` | ~~`PostLesson` is handed `baseXp={15}` unconditionally — the animation promises 15 while 9 may be granted~~ ✅ Fixed (#371, 2026-09-30): `PostLesson` shows the same two values that are saved |
| 3 | `onCommit` → context | `Dashboard.tsx:197` `completeLesson(id, xp, scoreData.accuracy, …)`, on the last answer since #372 | ~~**Accuracy is the literal `100`.** The real value never crosses this boundary → `flawless` + accuracy quests always fire~~ ✅ Fixed (#371, 2026-09-30) |
| 4 | Reward engine | `UserContext.tsx:413-500` | Runs **entirely client-side**: bones, quests, achievements. Arrays are pushed into shallow copies (`:415,426,435,482`), mutating state still referenced by the current object |
| 5 | Write | `UserContext.tsx:442-590` *(was `:356-392`; corrected 2026-10-01)* | 1500 ms `setTimeout`, except `completeLesson`, which calls `updateProgress(…, true)` and saves at once (#372, 2026-09-30). Payload is **only** `{points, completed, scores, quest_progress, completed_quests_today}`. Since #384 (2026-10-01) the wait is cut short on `pagehide`, on a hidden tab and before logout (`flushProgress`, `:496`), and a failed save is retried on its own |
| 6 | Transport | `utils/api.ts:119-174` *(was `:109-165`)* | ~~CSRF token cached and never invalidated; **no 403 refetch**. A stale token stops all saves silently and permanently~~ ✅ Fixed (#383, 2026-10-01): a POST answered 403 drops the cached token, refetches it and is sent once more; a 401 drops it too. A save that still fails shows a notice (`UserContext.tsx` `saveProgress`, `components/ConnectionNotice.tsx`): signed out on 401, offline when there was no answer, failed otherwise. `save_progress` with no session answers 401 (`api.php:1260-1265`) |
| 7 | Server parse | `api.php:1007-1015` | ~~**11 absent keys replaced with hardcoded defaults**~~ ✅ Fixed (#359, 2026-09-30): only the five sent fields are read. The defaults (`newProgressRowDefaults()`, `api.php:985-999`) are used only when a row is inserted |
| 8 | Persist | `api.php:1213-1222` | ~~`ON DUPLICATE KEY UPDATE` writes `VALUES()` for **all 17 columns** → `level`→1, `streak_count`→0, `streak_shields`→0, `last_active_date`→today, `unlocked_items`→[], `active_theme`→'default', `earned_xp_per_node`→{}, `daily_quests_date`→NULL, `active_quests`→[], `energy`→5, `last_energy_refill`→now~~ ✅ Fixed (#359, 2026-09-30): the UPDATE list is `points`, `completed`, `scores`, `last_active_date` (set by the server at `api.php:1207`), `quest_progress` and `completed_quests_today`. The INSERT still names all 17 columns, for a user with no row. **Still lost here:** a payload that leaves out one of the five sent fields empties that field; the honest client always sends all five |
| 9 | Leaderboard | `api.php:1094-1121` | `user_leagues` weekly/monthly XP derived from the points delta — the only place XP becomes competitive data |

**Hops 3 and 5 each independently discard information, and hop 6 can silently stop the whole chain.** Hops 7 and 8 did too, until #359 (2026-09-30). Hop 6 no longer stops silently since #383 (2026-10-01).

There is **no `beforeunload`, `pagehide`, `sendBeacon`, `visibilitychange`, `navigator.onLine`, or service worker anywhere in `src/`.** *(Since #384: `pagehide` and `visibilitychange` flush the save; see the end of this paragraph.)* The 1500 ms debounce is the only write trigger for everything except a finished lesson, and several flows navigate with `window.location.href` (`ProfilePage.tsx:48`, `SidebarRight.tsx:167,177`, `NotFoundPage.tsx:8`). ~~**Finish a lesson, immediately close the tab or log out, and it is gone.**~~ ✅ Narrowed (#372, 2026-09-30): the lesson is sent the moment its last item is answered, before the result screen, so reload, Back or closing on the result screen keeps it (measured: reload and Back on screen 1, then `get_session` has the XP and the `node_state` entry). Still open for WP-B4: a save that fails is not retried or shown, and other state still waits 1.5 s. ✅ Narrowed again (#383, 2026-10-01): a save that fails is shown, with a retry button (and an automatic retry on the browser's `online` event when it failed for lack of a connection); a finished lesson's `lesson_completed` flag rides on later saves until one gets through. Still open: nothing is flushed on unload, and other state still waits 1.5 s. ✅ **Fixed (#384, 2026-10-01):** every `save_progress` is a keepalive request (`utils/api.ts` `FetchOptions.keepalive`; dropped above 60,000 bytes, the browser's limit), so closing the tab or a `window.location.href` does not cancel a save on its way. On `pagehide`, and on `visibilitychange` to hidden, `flushProgress()` (`UserContext.tsx`) sends what the server does not have yet at once: the change still in its 1.5 s wait, or the snapshot whose save failed; with the CSRF token cached since `get_session`, the request leaves inside the handler. Both logout buttons (`SidebarLeft.tsx`, `ProfilePage.tsx`) await `flushProgress()` first; if that save fails the learner stays signed in with the notice up, and closing the notice lets the next click log out. A failed save (429, 500, no answer) is retried on its own after 5, 15, 30 and then every 60 s, and the notice reads "Nem sikerült menteni a haladásodat. Hamarosan magától újra megpróbáljuk." Each change carries a number, so an older save that fails after a newer one got through shows nothing. Measured on the local stack with `tools/local/ux-shots/unload-save.mjs` (11 checks): tab closed 300 ms after a lesson's last answer, and 200 ms after a theme change; logout 100 ms after a change; a 429 retried until it landed after 113 s.

### The one fix that resolves the most

> ✅ **Done, by a different mechanism (#359, WP-B1 and WP-B1b, 2026-09-30).** Reading the row and merging, as recommended below, was rejected in review because of a lost-update race (`REMEDIATION_PLAN.md` WP-B1). What shipped instead: the ten unsent columns left the `ON DUPLICATE KEY UPDATE` list, and `parseProgressData` stopped reading them from the request. It is one atomic statement, as before. **It ends the wipe; it does not clear the list below.** The client neither reads nor sends these columns, so streak inflation, energy not persisting, themes deactivating and daily quests rerolling are all still open (WP-B3). What it does fix: shields granted by `claim_reward` are kept, `level`, `unlocked_items` and `earned_xp_per_node` are kept, no client can set any of them, and the milestone mail can no longer be triggered by a client (it now never fires; §8).

Reconciling hops 5 and 7 — either send the full progress object, or make `parseProgressData` merge against the existing row instead of substituting defaults — fixes, in one change:

streak inflation · energy not persisting · themes deactivating · daily quests rerolling · streak-shield rewards vanishing · streak milestone emails firing on wrong days · `cron_notifications.php`'s streak logic being dead in production *(corrected 2026-09-30: it was dead only for rows the React app saves; see §16 #3c)*.

**Recommended direction:** make `handleSaveProgress` read the existing row first and only overwrite keys actually present in the request. That is a server-side change, it needs no client deploy, and it cannot regress older clients.

---

## 16. Known-broken inventory, ranked

Ranked by (user impact × likelihood a Beta tester hits it) ÷ fix cost.

### P0 — fix before inviting anyone

| # | Issue | Where |
|---|---|---|
| 1 | ~~**`save_progress` wipes 11 columns per call** — streak, energy, theme, quests, shields, level *(10 since #358: `last_active_date` is now set to today)*~~ ✅ **Fixed (#359, 2026-09-30; WP-B1 and WP-B1b in one push).** The upsert's UPDATE list holds `points`, `completed`, `scores`, `quest_progress`, `completed_quests_today` and `last_active_date` ([api.php:1213-1222](api.php:1213)); the INSERT still sets all 17 columns for a user with no row. `parseProgressData` ([api.php:1007](api.php:1007)) reads only the five sent fields, so a client cannot write the other columns on either path. Signup, the guest-merge insert and a first save take a new row's values from one function, `newProgressRowDefaults()` ([api.php:985](api.php:985)): theme `'system'` (§2 constraint 4) and 0 shields (owner, 2026-09-30; signup inserted 2 before). No migration: the column's schema default stays 2, and every insert names the column. Suite group 4 proves it with 19 checks; 21 checks fail on the commit before. On the local stack a played lesson and a reload left `level`, `streak_count`, `streak_shields`, `unlocked_items` and `earned_xp_per_node` as they were. **Not fixed by this:** what the learner sees (streak inflation, a theme lost on reload, energy refilling on reload, quests rerolling) comes from the client never sending these columns and stays open as WP-B3. A payload that leaves out one of the five sent fields still empties it. | `UserContext.tsx:366` + `api.php:1007,1213` |
| 2 | ~~**`lexipaws.eu/` may 404** — `.htaccess` rewrites the apex to a missing `gateway.html`, and staging cannot reveal it~~ ✅ **Fixed @ `450b9dd` (WP-A3, PR #262, 2026-08-29)** — the rewrite was removed; the apex now takes the same SPA fallback as `.hu` and `.sk`. Confirm on production at the cutover (WP-A4). | `.htaccess` (rule removed) |
| 3 | **Unbounded XP/bones minting** — no rate limit on `save_progress`/`update_progress`; uncapped `max()` merge at signup. ✅ **Part-fixed @ `92b6f18` (WP-B0, PR #263, merged 2026-08-31): `save_progress` is limited to 45 requests / 60 s, keyed on `user_id` ([api.php:1182](api.php:1182)).** Measured on a throwaway database: 60/60 requests accepted before the fix, 45 accepted and 15 throttled after it (re-run against `origin/dev` on 2026-09-24 and 2026-09-30). This slows minting; it does not cap it. **Still open (WP-B2):** `update_progress` has no limit, the signup merge is uncapped, and the counters live in `$_SESSION`. | `api.php:657-707`, [api.php:1182](api.php:1182), [api.php:1243](api.php:1243) |
| 3b | **One request permanently disarms every anti-cheat clamp.** A `scores` value of `0` → `parseProgressData` stores `json_encode(0)` = the string `"0"` → on every later request `!empty($currentDbProgress['scores'])` is **false** (verified: `empty("0") === true` in PHP), so the entire bones / streak_shields / node_state clamp block is skipped from then on. Next payload writes raw. ⚠️ **Mechanism corrected 2026-08-29 by running the attack against a real database** — a lone `POST {"scores":0}` to `save_progress` is **not** sufficient. If the row already holds non-empty scores the clamp block runs, `json_decode("0", true)` is not an array, and `[]` is stored instead — truthy as `"[]"`, so nothing is disarmed. The poisoning needs the stored `scores` to be **empty at that moment**, which two paths reach: a **fresh account's first `save_progress`** (no `user_progress` row → `$currentDbProgress` is false → block skipped), and **signup**, where [api.php:557](api.php:557) passes `guest_migration.scores` to `json_encode` unguarded — so `{"guest_migration":{"scores":0}}` writes `"0"` in **one unauthenticated request**. The signup path is the cheaper one and was not previously recorded here. `mergeGuestProgressIntoUser` is already `is_array`-guarded at [api.php:607](api.php:607). ✅ **Fixed @ `92b6f18` (WP-B0, PR #263, merged 2026-08-31).** The clamps now run whenever a payload carries `scores`, against the decoded stored row (`clampProgressAgainstStored()`, [api.php:1077](api.php:1077)), so an already-poisoned `"0"` row is re-clamped on its next save. `encodeScores()` ([api.php:973](api.php:973)) turns any non-array `scores` into `{}` on both write paths — `save_progress` ([api.php:1011](api.php:1011)) and signup ([api.php:558](api.php:558)) — so the falsy value can no longer be stored. `tools/local/testing/save_progress_security_test.sh --ref origin/dev` passes all 8 checks (2026-09-24 and 2026-09-30). The description above is the bug as it was; its line numbers are from before the fix. | [api.php:1077](api.php:1077), [api.php:973](api.php:973), [api.php:558](api.php:558) |
| 3c | ~~**`last_active_date` is never set to `CURDATE()` by anything.** The only writers are `cron_notifications.php:69` (sets it to *yesterday*) and `save_progress` (null). So any row that once matches `cron_notifications.php`'s at-risk query can never stop matching. Currently harmless only because every autosave nulls the column — meaning **the save_progress bug is suppressing a worse bug.** Fixing one without the other destroys legacy users' shields and streaks.~~ ✅ **Fixed (#358, 2026-09-30).** Every successful `save_progress` sets `last_active_date` to the learner's day ([api.php:1207](api.php:1207); `lexipaws_activity_date()`, [security.php:136](security.php:136), Europe/Budapest). The cron acts only on a row last active exactly two days ago, and never on a NULL date, an older date or a date before 2026-10-01. Details in [§10](#10-backend-api). ⚠️ **Corrected the same day: "currently harmless" was wrong.** It held only for rows the React app saves. The old app's rows kept a real `streak_count` and `last_active_date` (its client sent both on every save, `origin/main:js/dashboard.js:1180-1182`), no React autosave ever touched them, and the panel cron has run this file every night from the dev folder. The old query therefore matched those rows all along and could take their shields and then their streaks. What it actually did is recorded only in the database: `tools/local/maintenance/sql/358_what_the_old_streak_cron_did.sql` is a read-only query for the owner. | [cron_notifications.php:75-137](cron_notifications.php:75) |
| 4 | ~~**`BETA_INVITES_ENABLED` fails open** — one missing secret opens public registration~~ ✅ **Fixed (#387, 2026-10-01):** only an explicit `0`/`false`/`no`/`off` opens signup; unset or empty keeps it invite-only. Group 11 of `save_progress_security_test.sh` | [api.php:239-250](api.php:239) |
| 5 | **One unsolvable exercise blocks Module 2** (uncommitted working-tree edit) | `data/hu/A1/Module_2…/node3_family_ties.json` |
| 6 | ~~**Friends is broken for anyone with a league friend** — wrong table for `monthly_xp`~~ ✅ **Fixed (#382, 2026-10-01):** the rank reads `user_leagues.monthly_xp`; group 10 of `save_progress_security_test.sh` | [api.php:2267](api.php:2267) |
| 7 | ~~**`user_metadata` table does not exist** — the energy-refill-for-feedback loop always throws~~ ✅ **Fixed (#382, 2026-10-01):** `last_feedback_refill` moved to `user_progress` (`22_add_last_feedback_refill.sql`); one refill per hour, checked in group 10 of `save_progress_security_test.sh` | [api.php:1990](api.php:1990) |
| 8 | ~~**Registered users are shown the guest signup wall** after their first lesson and ejected to `/`~~ ✅ **Fixed (#372, 2026-09-30):** the wall is removed and the lesson is saved on its last answer | ~~`PostLesson.tsx:458`, `LessonPlayer.tsx:414`~~ |
| 9 | **Onboarding trap** — a registered user with zero progress is bounced to `/welcome/start` on every dashboard visit, and the welcome shell has no nav, no skip, and exits back to `/welcome/experience`. ✅ **Part-fixed (#372, 2026-09-30):** the redirect reads `scores.tutorial_done` (`Dashboard.tsx:95-99`), which `completeLesson` sets with the first saved lesson (`UserContext.tsx:433`), instead of `points > 0`; data saved before the flag gets it on load when it has points or a completed node (`UserContext.tsx:188-191`). So nobody who has finished a lesson is sent back. ✅ **Part-fixed (#373, 2026-09-30):** the tutorial cannot be replayed. `FTUELesson` leaves for `/dashboard` with `replace` (`FTUELesson.tsx:48`), so Back from the first dashboard does not reach it, and a learner whose `tutorial_done` was already set when the page opened is redirected to `/dashboard` (`:11`, `:21-23`) before any reward is granted again. **Still open:** the welcome shell's missing nav and skip, its exit to `/welcome/experience` (`:52`), and the `/welcome/*` screens still open for a learner who has finished the tutorial (Back from the first dashboard lands on `/welcome/placement`; starting from there now goes to `/dashboard`) | `Dashboard.tsx:95-99`, `UserContext.tsx:188-191`, `FTUELesson.tsx:11-23,48,52` |
| 10 | ~~**2 HIGH dependency advisories** in `react-router` / `react-router-dom`~~ ✅ **Fixed 2026-09-24** — #266 (react-router and react-router-dom → 7.18.4, `c4c6609`) and #258 (postcss → 8.5.28, `c8c9976`) merged into `dev` and deployed; `npm audit --omit=dev` reports 0 vulnerabilities | `package.json:27` |
| 11 | **Open redirect after auth** — `?redirect=` followed verbatim, on a domain users are asked to trust with credentials | `AuthModal.tsx:110-112,126-128` |
| 12 | **Contact form silently discards messages** while saying they were received | `Contact.tsx:36-38` |
| 12b | **~500 seeded bot accounts with a public password** *(added 2026-10-01; until then recorded only as RP WP-E0 and the A2 row)*. About 500 of the 511 users are `bot1@lexipaws.local` … `bot500@lexipaws.local`, created by `dev_simulate_bots.php` with one fixed password written in this public repo, so anyone could hold a signed-in session on 500 accounts. `rename_bots.php` had given them ordinary-looking names, so they fill the leaderboard (league 1 monthly showed 200 rows, its cap, on 2026-10-01) and no name scan finds them. ✅ **Script defused (#386, 2026-10-01):** `rename_bots.php` is deleted; `dev_simulate_bots.php` gives each bot a random password nobody knows and exits unless `DB_HOST` is `localhost`, `127.0.0.1` or `::1` (the part before any `;`). A `git grep` for the old password finds nothing. ⏳ **Purge: the owner runs it by hand** — `tools/local/maintenance/sql/386_check_before_bot_purge.sql` (read-only) then `386_purge_bot_accounts.sql`, one `DELETE` on the exact pattern `^bot[0-9]+@lexipaws[.]local$` that cascades through migration 23 (#385). Rehearsed on the local stack. | [dev_simulate_bots.php:10-19,46](tools/local/maintenance/dev_simulate_bots.php:10) |

### P1 — fix before a public Beta

13. ~~**Every character lesson soft-locks on its last exercise.** `PhonicsSpeak.tsx:13` never resets `hasSpoken` between questions, and every character lesson ends with two consecutive `phonics_speak` items — so on the second one both the mic button and the skip link render disabled. It auto-passes, but the learner sees a frozen screen at the end of every pronunciation lesson.~~ ✅ **Fixed (#361, 2026-09-30).** Each item is mounted under its own key (`LessonPlayer.tsx:516`), so the second `phonics_speak` starts with `hasSpoken` false (`PhonicsSpeak.tsx:14`) and both of its buttons work. Checked on `cons_th_th` level 2's two closing items. **Still open (UX0a-4, #417):** the exercise never opens a microphone and its 2-second timer is always graded right.
14. ~~**Stale correctness leaks across questions.** `ImageChoice` and `PhonicsListenChoose` reset their local selection without calling `onAnswer(false)`, and React reconciles the same component in the same slot without remounting. A learner who answers question N correctly can press CHECK on N+1 with nothing selected and be marked correct. `data/` contains 120 consecutive `image_choice` and 446 consecutive `phonics_listen_choose` adjacencies.~~ ✅ **Fixed (#361, 2026-09-30).** The player holds one `{hasAnswer, isCorrect, value}` answer, resets it when the index moves and remounts the exercise per item; CHECK does nothing, and is shown disabled, until there is an answer (§6 Lifecycle). On `node1_ordering_a_drink` lesson_1, item 2 with nothing selected: no grade, no chime and no `log_failed_exercise` request.
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
25. ~~**CORS allowlist includes `neolix.studio` + four localhost origins in production**, with credentials.~~ ✅ **Fixed (#387, 2026-10-01):** one list in `security.php`, the five Lexipaws origins, localhost only under `php -S` ([§10](#10-backend-api)).
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
| `src/components/LessonPlayer/BossEncounter.tsx` | 303 | Mounted only when `activeLesson.id === 'Boss'`; node ids come from filenames and `find data -iname '*boss*'` returns nothing. Also carries an unreachable soft-lock of its own. ✅ **Decided 2026-08-28 — delete the code; the boss encounter stays on the roadmap as post-Beta** (§21 Q19). |
| `src/utils/engine.ts` (`DynamicExerciseEngine`) | 166 | Runs only when `rawItems[0].type` is falsy; **0 of 144 data files produce typeless items**. ✅ **Decided 2026-08-28 — delete** (§21 Q19). |
| `src/components/Onboarding.tsx` | ~90 | Zero importers; `Dashboard.tsx:216` documents its removal. |
| `src/services/api.ts` | ~25 | Zero importers, broken URL construction, inverted error semantics. |
| `Dictation.tsx` (93), `MatchPairs.tsx` (107) | 200 | Emitted only by the unreachable engine, so neither has ever rendered. ✅ **Both decided 2026-08-28 — delete** (§21 Q19). **`Dictation` the *feature* is deferred to CEFR B1/B2** (transcription does not fit an A1-only curriculum); **`MatchPairs` is not returning** — the Beta matching feature is the existing `phonics_match` activity (§6). |
| `MoraleBoost.tsx`, `HarderEncouragement.tsx` | | **No producer at all** — the strings appear only in `LessonPlayer.tsx`. |
| `data/quests.json` | | No consumer in `src/` or any PHP file; still shipped and still the one file `validate_json.js` really checks. |
| `src/index.css`, `src/App.css` | 313 | Unmodified Vite scaffold, imported by nothing. |
| `public/icons.svg`, `public/favicon.svg` | | Scaffolding leftovers — the favicon is live. |
| `character_progress` table | | Created by migration 08, never read or written by any PHP. |
| `unlocked_items` column | | Written on every save, never read; ownership comes from `user_inventory`. |
| `handleUpdateAvatar` + `isAllowedAvatarValue` | | No `case`, no caller. |
| `handleUpdateProgress` | | Reads only `$data['xp']`; no caller ever sends it. |
| `logout.php` | | No frontend callers; still shipped by `build_release.js`. (`submit_feedback.php` was listed here too; no longer shipped since #382, 2026-10-01.) |
| Dead switch cases | | `sentence_builder`, `speak_verify`, `node.type === 'reward'`, `node.id === 'Boss'` |
| Dead CSS | ~4,400 lines | 272 of 575 class names unreferenced; `.swipe-card*`, `.flip-card*`, `.exam-*`, `.boss-arena*`, `.proto-card` |
| Dead locale keys | 59 of 182 | Entire `tour.*` and `leaderboard.*` namespaces |
| Dead localStorage keys | 3 | `forceLoginModal` (written, never read), `forceRegisterModal` (read, never written), `neolix_language` (written, never read) |
| Dead props | | `SidebarRight.onOpenShop`, `SidebarLeft.highlightLeaderboardUnlock`, `QuestionHeader.hideMascot` (declared, passed, never destructured) |
| Orphan scripts | | `scripts/{generate_exercises.py,generate_node1.py,split_words.py,generate_phonics.cjs}` — referenced by no npm script, workflow, or doc. *2026-09-30 (#362):* `generate_phonics.cjs` writes to `public/data/characters`, which nothing reads, shuffles at random and emits no item ids; its word lists still hold the homograph pairs (bow/bow, sow/sow, row/row, mouth/mouth) that #362 replaced by hand in `data/`. Do not regenerate the sound lessons from it. |

---

## 18. Cross-cutting: a11y, privacy, errors, offline

### Accessibility

Measured across all 68 `.tsx` files: **26 `aria-*` attributes in 10 files** (the other 58 have none), **3 `role=`, 2 `tabIndex`, 1 `onKeyDown`, 0 `aria-live`, 0 `.focus()`, 0 Escape handling.** *(Recounted 2026-09-30 after #360, which added the lesson banner's `role="status"` and three `aria-hidden` icons; before it: 23 in 9 files, 2 `role=`.)*

- **None of the six modals** traps focus, restores focus on close, or closes on ESC. The lesson player is `position: fixed; inset: 0` over a live DOM with no `aria-modal` and no inert background.
- ~~**Every answer submission and feedback banner is a silent DOM swap with no `aria-live`** — a screen-reader user gets no announcement of right or wrong.~~ ✅ Fixed for the lesson feedback banner (#360, 2026-09-30): it renders inside a permanent `role="status"` region (`LessonPlayer.tsx:528`), which is an implicit polite live region, so the title and the correct answer are announced. **Still silent:** toasts, reward popups and the PostLesson screens (C24).
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
- **Nothing protects or even identifies an under-16.** Sign-up asks for an age group with one bucket for minors, '18 év alatti' ("under 18", `AuthModal.tsx:417-425`); `api.php:527` stores whatever string the client sends in `users.age_range`, unchecked, and nothing reads it afterwards except to echo it back in the session. There is no consent step (GDPR Art. 8; the age of digital consent is 16 in both HU and SK). **Owner decision 2026-09-30 (UX Q2, #366): the Beta admits all ages and an under-16 needs a parent's consent**; see §21. Until UX10-10a (#408) and UX10-10c (#588) land, the code is as described here.
- **Both legal pages exist only in Hungarian** while the controller is Slovak-established and `lexipaws.sk` is a launch domain — Art. 12(1) requires intelligible form.
- The policy's stated legal basis for guest data is *"consent, by starting the guest session"* — but there is no consent event, and `neolix_guest_progress` is written unprompted.
- ✅ *Correcting an earlier internal finding:* `PrivacyPolicy.tsx:101-106` **does** name the Slovak DPA with full contact details. That part is fine.

### Error handling & observability

- ~~`api.fetch` never throws → react-query's error path is dead everywhere but one call site.~~ ✅ Fixed (#383, 2026-10-01): `api.fetch` (`utils/api.ts`) still never throws, but every failure has one shape, `{error, httpStatus}` (0 = no answer, including a 15 s timeout); `api.query` throws an `ApiError` for react-query. `get_session` and `get_friends` use it; the other call sites still read `res.error`/`res.success` as before.
- ~~`updateProgress` ignores the save response except to fire a success event. **A failed save is invisible to the user, the console, and any monitor.**~~ ✅ Fixed for the user and the console (#383, 2026-10-01): a failed save logs and shows `SaveErrorNotice`. Still invisible to any monitor (no error reporter).
- ~~Five empty `catch (e) {}` blocks swallow every session-parse failure (`UserContext.tsx:134-138`).~~ ✅ Fixed (#383, 2026-10-01): each logs a `console.warn` naming the field.
- `ErrorBoundary.componentDidCatch` only `console.error`s. **No production crash is reported anywhere.**
- **19 `alert()`/`confirm()` calls across 9 files** are the entire failure and destructive-action UI.
- **No error-tracking SDK of any kind.**
- Server side: `error_log()` only. No request ids, no structured logging, no aggregation.
- **GA4 is a default page-view install with zero custom events.** For a Beta whose stated purpose is validating onboarding, energy pacing and monetisation — **none of it is measured.**

### Network failure

Covered in [§15](#15-the-critical-trace-node-click--xp-in-mysql). Summary: a blip demotes a logged-in user to guest; nothing is flushed on unload; a stale CSRF token stops saves permanently and silently; guarded routes render blank; there is no offline state, no retry affordance and no toast anywhere. ✅ **Changed by #383 (2026-10-01):** a failed or hung `get_session` (no `session` key, after two retries) shows "Nem érjük el a szervert" ("We can't reach the server") with a retry button instead of guest mode; a stale CSRF token is refetched once; a failed save shows a notice with retry or sign-in. ✅ **Changed by #384 (2026-10-01):** unsaved progress is sent on `pagehide` and when the tab is hidden, as a keepalive request; logout saves first; a failed save is retried on its own (5, 15, 30, then every 60 s) — see §15. **Still true:** guarded routes render blank while loading, and there is no offline mode beyond the save notice.

---

## 19. Which docs to trust

> **Important reframe (2026-08-28).** The ~14 "stale" docs below are **not describing a deleted app** — they accurately describe the vanilla-JS application that is *still on `origin/main` and still the production codebase today*. `dashboard.html`, `js/dashboard.js`, `css/`, `gateway.html` and `data/A1/` all exist there. These docs are correct for `main` and wrong for `dev`. That distinction matters: do not delete them as garbage until `dev` is promoted, because until then they document the code that is actually deployed.

`docs/` contains 40 files in **three strata that were never reconciled**. Roughly 14 describe the vanilla-JS app on `main` rather than the React app on `dev`.

### ✅ Trust these

| Doc | Why |
|---|---|
| `CLAUDE.md` | **The session protocol (2026-09-30, #356).** Claude Code loads it at the start of every session: the hard rules, the traps, and the steps from picking an issue on Project 1 to posting the evidence, and closing it once the owner has checked the result. It replaced `AI_CONTEXT_BRIEF.md`, which is now a pointer to it. It states the owner constraints in short; [§2](#2-product--business-context) stays their full record. |
| `UX_REVIEW.md` | **Newest (2026-09-23).** Verified UI/UX review of `dev` @ `f1d3dc8`: 146 findings → 71 root causes, all adversarially re-verified (0 refuted), plus 12 gap findings, with a refactor plan mapped onto the WP ids here. Owns the UX layer; this file stays the engineering truth. |
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
- **`reference/product-design/`** — useful as a **flow** reference, **not** a visual spec: *(corrected 2026-09-23)* every UI screenshot in it is a capture of **Duolingo's own product** (`duolingo.com` URLs, Duo the owl, Super upsells), desktop-width and dark mode. `Complete FTUE experience/` is Duolingo's 33-screen Hungarian onboarding. Note lexicographic sort scrambles it (10 before 2), **two** filenames contain a colon (FTUE 11 and 17), and naming is inconsistent across its four sets. Where the live app copies Duolingo's colours and Hungarian copy verbatim, see `UX_REVIEW.md` C57.

---

## 20. Beta readiness, honestly

`docs/BETA_READINESS.md` is a good document. Its gates are the right gates. But it targets **2026-09-01 — four days from this audit — and the last commit was 2026-07-27.** Weeks 2–7 of its own roadmap have no corresponding commits or QA records anywhere in the repo.

| Gate | Doc says | Actually |
|---|---|---|
| **1. Staging stable** | in progress | ⚠️ Pipeline works. No staging accounts or invite codes exist. ~~Health check is a false green.~~ *(Fixed @ `450b9dd`, WP-A3 — see [§14](#hosting--deploy).)* |
| **2. Core loop works** | not fully audited | ❌ **Now audited: it does not.** Progress persistence loses 11 columns per save; streak/energy/themes/quests are all broken by it. |
| **3. Audio reliable** | partially hardened | ❌ 30 syntheses/IP/hour vs. aggressive preloading. 100% of phonics is TTS with `audioUrl: null` everywhere. No key is exposed to the frontend ✅, but the proxy has no session check. |
| **4. Data & curriculum safe** | mostly in place | ⚠️ JSON validation is theatre (1 of 144 files). One unsolvable exercise. Slovak is untranslated. |
| **5. Security baseline** | in progress | ❌ Rate limiting is session-backed and bypassable. Unbounded currency minting. ✅ Invite gate fails closed and CORS allows only the Lexipaws origins (#387, 2026-10-01). ⏳ ~500 bot accounts with a public password: the script is defused, the purge waits for the owner's SQL run (§16 P0 #12b, #386). |
| **6. Feedback works** | needs QA | ~~The energy-refill loop throws (`user_metadata` missing).~~ ✅ Fixed (#382, 2026-10-01). ❌ Contact form discards silently. `report_problem.php` is unauthenticated. |
| **7. Production release** | not started | ❌ No rollback, no approval gate, no version stamp, no known-limitations doc. |

### What a realistic path looks like

**Do not launch a public Beta on 2026-09-01.** Two options, both honest:

**Option A — private Beta in ~2 weeks (recommended).** 5–10 hand-picked Hungarian testers, no Slovak domain, explicit known-limitations list. Fix P0 items 1–9 and 12 (all are small, contained changes; #1 is one server-side function). Manually verify `lexipaws.eu/` renders. That is a genuinely useful Beta — you would learn whether the learning loop teaches anything, which is the actual open question.

**Option B — public Beta in ~6–8 weeks.** Everything in A, plus the P1 list, plus a real decision on Slovak, plus enough automated tests to make a deploy safe.

**In either case, three things should happen this week regardless:**

1. **Verify `https://lexipaws.eu/` renders in a browser.** Highest value, five minutes, and staging cannot tell you.
2. **Confirm `BETA_INVITES_ENABLED` is actually `true` in the production GitHub secret.** If it is not, registration is already open. *(Since #387, 2026-10-01: an unset or empty secret keeps signup invite-only; only `false`, `0`, `no` or `off` opens it. Confirm it is not one of those.)*
3. **Rotate `MIGRATION_TOKEN` and the SMTP password**, and delete `db_config_prod.php`.

### Full-release readiness (beyond Beta)

Items that are explicitly **not** Beta gates, but must be settled before a full public release. They are recorded here because **the Beta is partly being run to produce the evidence that settles them** — which only works if someone writes down in advance what evidence to collect.

| # | Item | The decision, and what settles it |
|---|---|---|
| **FR-1** | **Do end-of-module exams become hard progression gates?** | **Owner decision, 2026-08-28: an explicit full-release decision, deliberately deferred.** Beta ships exams as **soft** gates (WP-F4: **the pass threshold is 80%**; passing awards module completion once; failing does not block the next module; retries are unlimited and cannot farm rewards; wrong answers feed weak-item practice). After Beta, **decide on evidence** whether failing an exam should lock the next module. **Evidence to collect during the Beta — and WP-F4 is required to instrument this, not merely to permit it (see its done-when):** first-attempt pass rate per module against the 80% line; the score distribution around that line (if most failures cluster at 70–79%, the threshold is the variable to change, not the gate); the retry distribution (a long tail means the exam is mis-pitched, not that learners are failing); whether learners who fail and continue anyway go on to struggle in the next module; and whether the weak-item queue that exam failures feed is actually worked through or just accumulates. **If the Beta ends without this data, FR-1 cannot be answered and the gate decision defaults to staying soft** — which is a legitimate outcome, but it should be a choice rather than an accident. **Why it ships soft:** hardening the gate later is a small change, while softening it after learners have already been blocked out of content they paid attention to is a trust problem. Note this decision is not purely pedagogical — a hard gate on a module boundary is also a retention cliff, and the Beta cohort is 5–10 people, which is enough to see confusion but **not** enough to measure drop-off. Expect FR-1 to need a judgement call on top of the numbers. |

---

## 21. Open questions for the owner

Grouped by what they block. These genuinely need your answer — I can implement any of them, but the decision is yours.

### Blocks the Beta date
1. **Is 2026-09-01 still the target?** Several docs hardcode it.
2. ~~**Is Slovak in scope for the first Beta?**~~ **ANSWERED — yes.** This is already a standing owner constraint (§2, constraint #3) and drives all of Phase D; recorded here 2026-08-28 so it stops being re-asked. The `lexipaws.sk` credibility problem stands as a *defect* rather than an open question: until Phase D lands, the `.sk` domain promises a Slovak course and serves a Hungarian one. **Superseded 2026-09-24 — no:** the owner decided the first Beta is Hungarian-only and Slovak follows it (§2 constraint #3). Phase D's Slovak work moves after the Beta; in the Beta, the `.sk` defect is handled by a 'coming soon' holding state instead of the Hungarian course.
3. **Does the invite gate stay for the public Beta**, or does registration open?

### Blocks content work
4. ~~**How should the base-language field be modelled?**~~ **ANSWERED — option (a), sibling keys in one shared tree.** Already recorded as owner-approved in §2 constraint #3 and specified in **WP-D1**; noted here 2026-08-28 because this list still described it as blocking. `data/sk/` is deleted, the tree moves to a neutral `data/A1/…`, and new `"sk"` values are seeded **`null`** rather than falling back to Hungarian, so untranslated content is visibly untranslated and `count(null)` is a free progress metric.
5. **Who produces the Slovak translation** — you (you're a native speaker), a contractor, or MT with review?
6. **Is `lessons_and_folders_to_be_created.md` still the plan for Lessons 2–9?** It needs a schema and answer keys, or deletion.
7. **Was `Module_6/node4` intentionally dropped, or is it missing content?**

### Blocks design work
8. ~~**Light or dark by default?**~~ **ANSWERED — `system`.** Already stated as §2 constraint #4 and restated as §12.1 D4; recorded here 2026-08-28 so the question stops being re-asked. The design guide's dark-by-default mandate describes the old app. **Light and dark must both be correct.**
9. ~~**Blue `#3b82f6` or green `#10B981` as the primary accent?**~~ **ANSWERED 2026-08-28 — green** (§12.1 D1). The work is moving the value into `main.css:12` and rehoming the **seven** tokens that live only in the rogue block. ⚠️ **But `#10B981` cannot ship as a single value:** measured against the palette it scores **2.43:1 in light** (fails AA, and fails even the 3.0:1 non-text threshold) versus 6.99:1 in dark. The accent must become **theme-scoped** — recommended `#047857` light / `#10B981` dark — and the decision must extend to `--color-accent-on` and `--color-accent-at`, which are still blue. Full measurements in §12.1.
10. ~~**Are Outfit and Inter still the intended typefaces?**~~ **ANSWERED 2026-08-28 — no. Nunito is the brand typeface** (§12.1 D2). `--font-heading` / `--font-body` get repointed at Nunito, and the `* { font-family }` and `!important` overrides that were compensating for the dead tokens get deleted.
11. ~~**Which mascot rendering is canonical?**~~ **ANSWERED 2026-08-28 — the 2D cel** (`Tyler-asset-pack.png`; §12.1 D3). The hand-coded grey SVG is retired and the photoreal `tyler-3d/` frames are not canonical, which **withdraws recommendation 7 in §13** (the run-cycle swap). **The crops already exist** — 24 of the 26 files in `public/assets/images/Transparent PNGs/` are separated cel views cut from the pack, so nothing needs slicing; they need only the WP-G1 alpha-bounding-box crop. *(An earlier pass said the crops had to be cut by hand — corrected 2026-08-28 by checking the folder.)* The one real gap is a **run cycle**: only `tyler-running-right.png` exists, a single pose.
12. ~~**Is the mascot named Lexi or Tyler?**~~ **ANSWERED — Lexi.** Already a standing owner constraint (§2, constraint #2: *Tyler is the owner's real dog and the origin of "Lexipaws", but the in-product character is Lexi*); recorded here 2026-08-28. The 26 `tyler-*.png` filenames are legacy and the rename is **WP-G2** — which also ends the 404 class in §13.
13. **Do you hold a redistribution licence for `cartoon-pitbull-illustrated-collection/`?** (`.ai`/`.eps` stock source, tracked in git and publicly served.)
14. **Should emoji stay as the icon system?** It means the app looks different on your users' Windows/Android machines than on your Mac.

### Blocks architecture decisions
15. ~~**Should `save_progress` become a partial/PATCH update, or should the client send the full object?** *(My recommendation: server-side partial merge — no client deploy needed, cannot regress older clients.)*~~ **SETTLED by WP-B1's reviewed design, shipped in #359 (2026-09-30): neither.** A read-and-merge was rejected in review (lost-update race; `REMEDIATION_PLAN.md` WP-B1). The server has a fixed list instead: a save may change the five fields the client sends and the activity day, nothing else. The client still has to send all five; one that is left out is stored empty.
16. **Should reward math move server-side before launch**, or are per-request delta caps the accepted Beta posture?
17. **Is energy meant to be a hard paywall gate?** If yes it must become server-authoritative; if it is a soft nudge, the current behaviour is arguably fine and the UI should stop implying scarcity.
18. **Should leagues have promotion/relegation**, or stay as lifetime-XP tiers? The reward multipliers and the marketing copy both imply cohorts.
19. ~~**Is `BossEncounter` / `DynamicExerciseEngine` / `Dictation` planned, or deletable?**~~ **ANSWERED 2026-08-28 — all three implementations are deletable, and two of the product ideas survive.** The distinction matters: *the code goes, the roadmap entry stays.*

    | Item | Product idea | The code on `dev` |
    |---|---|---|
    | **`BossEncounter`** (301 lines) | **Post-Beta.** Still wanted, not in Beta scope. | **Delete.** Reachable only when `activeLesson.id === 'Boss'`; node ids come from filenames and `find data -iname '*boss*'` returns nothing. It also carries its own unreachable soft-lock, and its art (`boss_character.png`) is a JPEG with no alpha that renders as a white square. Rebuild it against the Phase-C tokens when it is actually scheduled. |
    | **`Dictation`** (93 lines) | **Deferred to CEFR B1/B2.** Dictation is a listening-and-transcription task that does not fit A1 — which is the entire current curriculum. | **Delete.** Emitted only by the dead `DynamicExerciseEngine` path, so it has never rendered. |
    | **`MatchPairs`** (107 lines) | **Not returning.** The Beta matching feature is the existing `phonics_match` activity. | **Delete**, with its `match_pairs` switch case (§6). |
    | **`DynamicExerciseEngine`** (`engine.ts`, 166 lines) | — | **Delete.** Runs only when `rawItems[0].type` is falsy; **0 of 144 data files** produce typeless items. Deleting it is what makes `Dictation` and `MatchPairs` unreachable in the first place. |

    Deleting all four removes ~667 lines with **zero behaviour change**, because none of it executes. Everything is recoverable from git history if a post-Beta rebuild wants it as a reference — which is the point: keeping dead code in the tree is a worse record of intent than a roadmap line plus a commit SHA.
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

### Answered questions from `UX_REVIEW.md` §7
The UI/UX review keeps its own owner questions (`Q1`–`Q15`, `UX_REVIEW.md` §7). An answered one is recorded there and here.

- ~~**UX Q13 — What is the currency called, and is the 'LexiPaws score' defined or deleted?**~~ **ANSWERED 2026-09-30 (#370).**
  - **The currency is 'Lexi-falat'** ("Lexi treat"). The owner chose the branded name over the review's recommendation, 'csont' ("bone"). Forms: '10 Lexi-falat', '5 Lexi-falatot kaptál' ("you got 5 Lexi treats"), 'nincs elég Lexi-falatod' ("you don't have enough Lexi treats"). It replaces all four names in §8 ('Lexi Treats', 'Csont', 'Jutalom Falatok', 'Maškrty'). The icon stays the existing 🦴: no new art. Only the Hungarian name is decided; the Slovak one is decided in D3b-sk ('Lexi-maškrta' is the matching candidate).
  - **The 'LexiPaws score' is deleted, not defined.** Its screens go until a real metric exists: `PostLesson` tutorial screens 2–4 and 7–8 (§6) and the 'LexiPaws-pontszám' / 'LexiPaws Skála' strings.
  - **What it changes, and where:** nothing in the code yet. UX0a-5 (#371) removes the screens; D3b (#402) writes the glossary and the `terms` namespace with `terms.currency` = 'Lexi-falat'; UX0c-2 (#419) rewrites the copied lines.
- ~~**UX Q10 — What is the streak rule, and what happens to today's inflated streaks?**~~ **ANSWERED 2026-09-30 (#365).**
  - **The rule: one completed lesson per day.** A day counts for the streak when the learner completes at least one lesson on it. Opening the app does not count, and there is no goal-based streak.
  - **The day boundary: the calendar day in Europe/Budapest**, midnight to midnight, which is also Slovakia's clock. It is the day `lexipaws_activity_date()` already computes (`security.php:136`) and `save_progress` already writes to `last_active_date` (§10).
  - **Inflated streaks are kept, not reset.** No stored number changes; from the fix onward the streak grows only by the rule above.
  - **Shields: used automatically, one per missed day, at most 3 held.** The owner chose 3 over the review's recommended 2. The grants decided in #359 stand (0 at signup, 1 after the intro lesson, 1 after registering, then the shop). **Shields are spent day by day, also when they cannot save the streak** (owner, same day): each missed day takes one shield without the learner doing anything, so a learner with 2 shields who misses 3 days comes back to a reset streak and 0 shields. The learner never uses a shield by hand.
  - **Push permission: asked once, right after the day-1 goal pick** in the wrapped app, never on first open.
  - **What it changes, and where:** the streak half is in code since #381 (2026-10-01, §8). B3b (#381) computes the streak on the server, uses shields and enforces the cap; UX5-3 (#469) shows the 'Lexi őrködött' ("Lexi kept watch") notice, the today state and the count; UX5-12 (#565) adds the goal ring that resets at the same midnight. The push prompt is APP-push (#587), filed with this answer in the App milestone behind the wrapper (#577); who sends the reminders is not specified yet.
- ~~**UX Q2 — What is the minimum age, and how do minors appear in social features?**~~ **ANSWERED 2026-09-30 (#366).**
  - **The Beta admits all ages; an under-16 needs a parent's consent.** The owner chose the consent flow over the review's recommendation, a 16+ Beta. 16 is the age of digital consent in Hungary and Slovakia (GDPR Art. 8).
  - **The age question stays at sign-up** (`UX_REVIEW.md` C-5) **and its minors' bucket is split.** Today the list has '18 év alatti' ("under 18", value `under_18`, `AuthModal.tsx:419`), which cannot tell an under-16 apart. It becomes two choices, 'under 16' and '16–17'; the Hungarian labels are written in UX10-10a (#408). The server, which today stores any string (`api.php:527`), accepts only values on the list.
  - **How consent is given:** an under-16 types a parent's e-mail address at sign-up; that address gets a link, and opening it confirms the account.
  - **While the confirmation is missing: learn, but hidden.** The child can do lessons and keeps the progress, but is on no board that other people see and can neither send nor receive friend requests. The owner chose this over the recommended 'nothing until confirmed'. **After 14 days without confirmation the account is locked**: logging in shows only a waiting screen with a resend button. It is not deleted; confirming unlocks it as it was.
  - **Existing accounts:** an account that stores `under_18` is asked once, at its next login, whether the learner is under 16 or 16–17. An 'under 16' answer starts the same parent step.
  - **Under-18s on public boards: visible by default, exactly like adults.** The owner chose this over the review's recommendation (opt-in or anonymised). It covers 16–17-year-olds and under-16s whose parent has confirmed. No anonymising and no visibility switch is built.
  - **Legal advice on minors: not planned for the Beta.** `UX_REVIEW.md` N7 asks for it before the public Beta; the owner decided against it and accepts the risk. The privacy-page wording for the consent step is therefore written without a lawyer.
  - **Still open** (each is an 'Owner input needed' on its issue): what a parent can do besides confirm (refuse, withdraw later), and how long a locked account is kept before deletion.
  - **What it changes, and where:** nothing in the code yet. UX10-10a (#408) splits the age list and validates it; UX10-10c (#588) builds the parent's consent and the hidden waiting state and carries a database migration; UX10-10d (#589) asks the existing accounts; UX10-10e (#590) locks after 14 days. #588–#590 were filed with this answer, because no issue covered a consent flow. UX10-10b (#455) drops 'anonymise under-18s on boards' and keeps exact-username friend requests, the same answer for any e-mail and report-name; UX10-3 (#406) keeps the age field on Register; UX6-5 (#542) needs no separate board for minors.

- ~~**UX Q3 — What may the landing promise?**~~ **ANSWERED 2026-09-30 (#367).**
  - **Approval wait: a window of 1–3 days**, '1–3 napon belül' ("within 1–3 days"). Not a queue, not hand-picking. It is a promise the owner must keep when approving requests.
  - **Levels A2–B2: shown muted and not selectable, as 'Hamarosan'** ("Soon"), as recommended.
  - **Placement test: not mentioned** until it exists, as recommended.
  - **Tutoring: mentioned nowhere on the site for now.** The owner went further than the recommendation (Contact/About only): the 15 €/50 perc offer is removed from the Impressum (`Impressum.tsx:47-48`) and from Contact (`Contact.tsx:86-88`).
  - **What it changes, and where:** nothing in the code yet. UX10-1 (#450) shows the wait on the request form's success; UX0c-3 (#420) mutes A2–B2 and drops the placement claim; UX10-5 (#407) removes both tutoring passages; UX10-7 (#481) repeats the wait in the Beta FAQ.

- ~~**UX Q6 — Language policy: English glosses and the Hungarian register**~~ **ANSWERED 2026-09-30 (#368)** (the proofreading part was answered 2026-09-24: a native Hungarian speaker reviews Claude's first-pass list).
  - **No English glosses in the chrome.** Buttons, menus, headings and toasts are Hungarian only ('Bolt (Shop)' → 'Bolt', 'Főnök (Boss)' → 'Főnök', 'Achievement Unlocked' → Hungarian). English appears only as clearly marked learning content in lessons. As recommended.
  - **Register: informal 'te' everywhere except the legal pages**, which keep formal 'Ön'. As recommended.
  - **What it changes, and where:** nothing in the code yet. UX0c-2 (#419) removes the glosses; D3b (#402) writes both rules into the voice sheet; UX0c-4a (#421) flags every 'Ön' outside legal and every gloss in its first-pass list. The in-app language switch and the Slovak register stay with Q5.

- ~~**UX Q12 — Can learners skip ahead on the path?**~~ **ANSWERED 2026-09-30 (#369).**
  - **No, not in the Beta: locks stay hard.** Nodes open in order; a locked node never starts a lesson or spends energy. As recommended.
  - **Later:** skipping ahead will mean passing the WP-F4 module exam (`UX_REVIEW.md` C-14), not a second, separate gate.
  - **What it changes, and where:** nothing in the code yet. UX0d-2 (#390) stops locked nodes from starting lessons (C68).
---

## 22. Keeping this file honest

This document is only useful if it stays true. Two mechanisms:

### A. Re-verification script

These checks re-test the highest-stakes claims. If any output changes, the corresponding section is stale.

```bash
# 1. Does save_progress still send only 5 fields? (expect: points, completed, scores, quest_progress, completed_quests_today)
sed -n '366,372p' src/context/UserContext.tsx

# 2. Does a save still leave the columns it does not send alone? (FIXED by #359, WP-B1 + WP-B1b, 2026-09-30.)
#    First command: expect 17 column names in the INSERT list and exactly six `= VALUES(...)` lines:
#    points, completed, scores, last_active_date, quest_progress, completed_quests_today. A seventh means
#    that column is overwritten with its new-row default on every save again. `last_active_date` must stay
#    in the list: see check 2b. Second command: expect parseProgressData to read those five request keys
#    and then `+ newProgressRowDefaults()`; an `$data['level']` or similar here reopens WP-B1b.
#    (Lines re-checked 2026-10-01 for #387, which moved api.php up by 18 lines.)
sed -n '1288,1297p' api.php
sed -n '999,1007p' api.php

# 2b. Does every save still set the activity day, and does the cron still leave stale rows alone?
#    (expect: the function in security.php, one call in api.php, a comment and three calls in
#    cron_notifications.php; then the cut-off day '2026-10-01' and a SELECT with `last_active_date = ?`
#    and `last_active_date >= ?`.)
grep -n 'lexipaws_activity_date' security.php api.php cron_notifications.php
sed -n '29p;80,89p' cron_notifications.php

# 3. Does every completeLesson caller pass the real accuracy? (FIXED by #371, 2026-09-30: expect 5 lines, each with
#    `scoreData.xpEarned, scoreData.accuracy`. A literal 100 means 'flawless' and the accuracy quests fire for everyone again.)
grep -rn "completeLesson(" src/ | grep -v "const completeLesson"

# 3b. Is the XP that is shown the XP that is saved, and is accuracy correct ÷ graded? (expect: "PASSED … result +13 XP
#    and 77%, saved as 1253 points, 2 log_failed_exercise request(s)"; needs `npm run dev`; #371)
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --wrong 1,4

# 4. Is the dead gateway.html rewrite still gone? (FIXED @ 450b9dd, WP-A3: expect no output from either command.
#    Output from grep means the rewrite is back; the file itself was never meant to exist.)
grep -n 'gateway' .htaccess
find . -name gateway.html -not -path './node_modules/*'

# 5. Does the invite gate still fail closed? (FIXED by #387, 2026-10-01: expect `function betaInvitesRequired()`,
#    `return !in_array($value, ['0', 'false', 'no', 'off'], true);`, and `if (!betaInvitesRequired()) {`.
#    An `in_array` without the `!`, or a list of '1'/'true'/'yes'/'on', means it fails open again.
#    Group 11 of save_progress_security_test.sh proves it over HTTP.)
grep -n 'betaInvitesRequired\|0., .false., .no., .off' api.php

# 6. Dependency advisories (expect: "found 0 vulnerabilities" since #266 and #258 merged on 2026-09-24)
npm audit --omit=dev

# 7. hu/sk content drift (expect: only node3_family_ties.json + stories 5-21)
diff -rq data/hu data/sk

# 8. Exercise-type census — has any new type appeared?
grep -rho '"type": *"[a-z_]*"' data/ | sort | uniq -c | sort -rn

# 9. Build still green + current bundle size
npm run build

# 10. Deploy weight (expect ~34 MB until the asset cleanup lands)
du -sh public dist

# 11. Is the accent still split between two files? (expect, until C1 lands: main.css:12 #3b82f6 losing to landing.css:206 #10B981.
#     The four main.css oklch hits are the purchased themes and are correct — ignore them.)
grep -rn -- '--color-accent-in:' src/assets/css/main.css src/assets/css/landing.css

# 12. Are the rogue-block-only tokens still defined nowhere but landing.css? (expect: 4 hits, all landing.css:204-211.
#     Sampling 4 of the 6; --level-a2/b1/b2 sit on the same lines. If any hit moves to main.css, C1 has rehomed them.)
grep -rn -- '--color-primary:\|--level-a1:\|--color-bg:\|--color-surface:' src/assets/css/

# 13. Do the font tokens still point at fonts nothing loads? (expect: Outfit + Inter until C1 lands)
grep -n -- '--font-heading:\|--font-body:' src/assets/css/main.css

# 14. Does a wrong pairing in phonics_match still count, once? (FIXED by #371, 2026-09-30: expect two lines, the reset
#    `onAnswer(NO_ANSWER)` and `isCorrect: !hadMispairing.current`; `isCorrect: true` means it can never be wrong again.
#    Then, with `npm run dev` running: three wrong pairings, the item still finishes, "result +14 XP and 88%", one log row.)
grep -n 'onAnswer(' src/components/LessonPlayer/exercises/PhonicsMatch.tsx
node tools/local/ux-shots/sound-lesson.mjs --id cons_s_z --mispair 2

# 14b. Can every sound item be answered by ear, and does each have its own id? (expect: "OK: …", exit 0; #362)
node tools/local/testing/check_phonics_items.mjs

# 15. Is the HTTPS redirect live on all four hostnames? (VERIFIED 2026-08-28: all four 301 → https)
for h in lexipaws.eu lexipaws.hu lexipaws.sk dev.lexipaws.eu; do
  printf '%-18s ' "$h"; curl -s -o /dev/null -m 15 -w '%{http_code} -> %{redirect_url}\n' "http://$h/"
done

# 16. Does the session cookie carry Secure? (VERIFIED on dev 2026-08-28; the three prod hosts 404 until WP-A4)
for h in lexipaws.eu lexipaws.hu lexipaws.sk dev.lexipaws.eu; do
  printf '%-18s ' "$h"; curl -s -m 15 -D - -o /dev/null "https://$h/api.php?action=csrf_token" | grep -i '^set-cookie' || echo 'no cookie (404 until A4)'
done

# 17. Is the deploy manifest denied on dev? (expect "403 199 bytes" — WP-A3 merged 2026-08-29 @ 450b9dd, VERIFIED 2026-09-24
#     and 2026-09-30. It was 200 + 69,475 bytes on 2026-08-28; a 200 here means the .htaccess deny rule was lost.)
curl -s -o /dev/null -m 15 -w '%{http_code} %{size_download} bytes\n' https://dev.lexipaws.eu/.ftp-deploy-sync-state.json

# 18. Is the accent still a single non-theme-scoped value? (expect: no --color-accent-in inside the dark block until C1)
sed -n '29,41p' src/assets/css/main.css | grep -c 'color-accent'
```

### B. Update protocol

- **When a P0/P1 item in [§16](#16-known-broken-inventory-ranked) is fixed**, strike it there and update the section it came from. Do not delete it — move it to a "Fixed" line with the commit SHA, so this file also records what changed and why.
- **When an owner question in [§21](#21-open-questions-for-the-owner) is answered**, record the answer inline. Those answers are the most valuable content in this file and exist nowhere else in the repo.
- **Re-run the full audit** after any change touching `UserContext.tsx`, `api.php`'s progress handlers, `main.css`'s token block, or the migration set.
- **Cite `file:line` for every new claim.** The value of this document is that it is checkable.
- **Every session updates this file as part of finishing** — the steps are in `CLAUDE.md` (step 5). A session is one commit, which cannot contain its own SHA, so from 2026-09-30 a fix is marked `✅ Fixed (#NNN, date)` with the issue number; `git log --oneline --grep '#NNN'` gives the commit, and the issue's evidence comment states it. Older marks cite the SHA directly.

### Corrections already applied

Several findings from the first pass were wrong or overstated and were corrected before being written here. Recorded so they are not "rediscovered":

- `data/sk` is **not** byte-identical to `data/hu` — `node3_family_ties.json` differs and 17 stories are absent.
- `Onboarding.tsx` is **dead code**, so its broken `lexi-head.png` does not ship. The `lexi-mascot.png` 404 *does*.
- `get_friends` fails for friends with a **non-null `league_id`**, not for every accepted friend.
- The `get_session` TypeError is real but does **not** break the deploy health check (no session cookie → early return), and is rarer than implied.
- `LessonPlayer` does **not** throw its computed accuracy away — `PostLesson` consumes it. It is discarded at the `completeLesson` boundary. *(No longer discarded since #371.)*
- The reduced-motion block loses **only** its `animation-duration` declaration; the other five apply. The conclusion (animations run at full duration) still holds.
- `PrivacyPolicy.tsx:101-106` **does** name the Slovak DPA. The real defect is the undisclosed processor list.
- "A forgotten GitHub secret fails closed" is true for the cron/migrate token gate and **false** for `BETA_INVITES_ENABLED`, which fails open. *(Since #387, 2026-10-01, `BETA_INVITES_ENABLED` fails closed too.)*
- The CORS allowlist lives in **two** files (`api.php:7-26` and `security.php:22-35`) that must be edited together. *(Since #387 it lives in `security.php` only.)*
- CSS corpus is **9,297** lines across 13 files.
