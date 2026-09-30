# Lexipaws — UI/UX Review

> **What this is.** A verified review of what a learner actually experiences in the React app, written to plan the UI/UX refactor. Every issue names where it lives (as `file:line` wherever a line pins the cause), a concrete fix and an effort size, and is mapped to the existing work packages.
>
> **Date:** 2026-09-23 · **Against:** branch `dev` @ `f1d3dc8` · **Not reviewed:** `main` (the vanilla app production still serves)
>
> **Method:** 8 surface reviewers rendered real screens in headless Chrome at 320 / 360 / 390 / 1280 px, light and dark, against a mocked backend; the completeness critic added tablets (768–1024 px) and laptop heights.
> 146 findings → 71 root causes, 71/71 adversarially re-verified: 35 confirmed, 36 confirmed with corrections, 0 refuted; + 12 gap findings from a completeness critic.
>
> **Visual companion:** [Lexipaws UX Review — screenshots](https://claude.ai/artifact/Ecf7p32G1fE7vbBVf9E31f) (private artifact; the six criticals, 20 key majors and gap findings, and the strengths, as real phone screenshots)
>
> **How it relates to the other two documents.** [`SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md) (SOT) is the engineering truth: how the code works. [`REMEDIATION_PLAN.md`](REMEDIATION_PLAN.md) (RP) holds the work packages (WP-…) and the gate. This file is the UX layer on top of both: what the learner sees, why, and which package fixes it. Where a finding restates SOT it says so; where a fix already lives in a WP, it names that WP instead of inventing a parallel one.
>
> **Ids.** `C01`–`C71` are verified root-cause clusters. `N1`–`N12` are the critic's gap findings (N1 is merged into C08). `F1`–`F22` are claimed strengths that did not survive. `C-1`…`C-14` (with a hyphen) are the critic's constraint notes, not clusters. **Where a verifier corrected a panel claim, only the corrected fact appears here.** Cited lines were spot-checked against `f1d3dc8`.

---

## Contents

1. [The verdict in one page](#1-the-verdict-in-one-page)
2. [Framing: what this review judged against](#2-framing-what-this-review-judged-against)
3. [What works — keep these through the refactor](#3-what-works--keep-these-through-the-refactor)
4. [What doesn't work](#4-what-doesnt-work)
5. [What could be better — the target experience](#5-what-could-be-better--the-target-experience)
6. [Refactor plan](#6-refactor-plan)
7. [Decisions the owner needs to make](#7-decisions-the-owner-needs-to-make)
8. [Constraint notes](#8-constraint-notes)
9. [Method, coverage and limits](#9-method-coverage-and-limits)

---

## 1. The verdict in one page

**The skeleton is right and the content is real, but the app does not yet tell learners the truth — about whether they answered correctly, what they earned, how their streak stands, or which language they are in — and it is not yet an app shell that can be wrapped.**

- **The core loop's feedback is untrustworthy on the primary device.** On phones every feedback title is lime, so 'Helytelen!' ("Incorrect!") reads as success in both themes (and at 1.43–1.51:1 is barely legible in light mode), and the correct answer is often cut off (C01). An empty 'ELLENŐRZÉS' ("Check") press is graded, and after a correct picture item it is praised 'Kiváló!' ("Excellent!") (C02). The same/different sound drill marks every correct answer wrong (C13), and the speaking drill never opens the microphone yet praises every attempt 'Kiváló!' on CHECK (C15). All four are small fixes with no art.
- **The numbers are not honest.** The result screen always shows '+15' XP while 5–15 is saved, accuracy is `100 − 20 × mistakes` (8 of 15 right shows 0%), and every `completeLesson` caller passes a literal 100, so 'Flawless' fires after a 0% lesson (C25). For signed-in learners the streak grows on every app load and never breaks, quests reroll per load and shields are inert (C27). The roots are WP-B1/B3; **no UX work should make these numbers more prominent until they are true.**
- **Learners lose work in ways they never see.** A finished lesson is saved only on the last reward-screen tap, and the save wall's primary button throws the first lesson away and loops a new registered user back into onboarding (C36). Android Back abandons lessons and replays the tutorial (C22). Sessions die silently on day 30 for everyone (N3), two devices overwrite each other (N9), and logging in on a shared device silently absorbs another person's guest progress (N6).
- **Slovak learners get a Hungarian product.** Only the i18n shell switches; every exercise prompt, instruction, path label, shop, story and error is Hungarian, and Slovak beta applicants get English e-mails (C59). This is a documented launch gate (Phase D), and it contradicts the standing constraint.
- **It is a website, not yet an app.** There is no history model, 19 `alert()`/`confirm()` calls and several full-page reloads, safe-area padding that resolves to 0 because `viewport-fit=cover` is missing, a bottom bar whose five tabs behave five ways and is absent on three routes, and a path that opens at the top instead of at the learner's node (C22, C23, C66, C67, C71).
- **One pasted CSS block and one missing ramp define the look.** A prototype pasted into `dashboard.css` paints every h1/h2 as purple gradient text, so module names on the main screen measure 1.3–1.7:1 (C49). The green accent fails contrast as text in light mode and under white labels in both themes, because the theme-scoped ramp was decided but not built (C48). Headings fall back to Arial because the font tokens still point at an unloaded font (C50), and Lexi reaches the screen as the retired grey SVG or a ~50 px thumbnail (C55).
- **What is worth protecting is substantial:** a bundled A1 curriculum that opens instantly, a two-zone lesson player, a forgiving no-hearts model, outcome-framed streak goals, a sound curriculum aimed at HU/SK interference, and good Slovak shell strings (§3).
- **Almost everything here is fixable without new art.** The exceptions are named (§8, C-3), and one hard limit matters for every mascot idea: most cel crops are only 70–84 px wide (the largest head is 130 px, the jump pose 241 px), so Lexi cannot be shown large without an upscale pass or the 1536 px logo poster (C-2).

### Area scorecard

The panel's scores, 1 (poor) to 5 (excellent); no area scored above 3 on any dimension, and '–' means that panel did not score the dimension. The scores were given before verification, so a few of their rationales rest on claims that were later corrected (for example the forgot-password "trap", C37).

| Area | Clarity & flow | Mobile ergonomics | Visual polish | Motivation & delight | Learning effectiveness | Accessibility | Native-app readiness | Language & copy | Vision alignment |
|---|---|---|---|---|---|---|---|---|---|
| First contact & trust | 2 | 2 | 2 | 2 | – | 2 | 2 | 2 | 2 |
| Onboarding | 2 | 2 | 2 | 2 | 2 | 2 | **1** | 2 | 2 |
| Lesson & feedback | 2 | 3 | 2 | 2 | 2 | **1** | 2 | 2 | 2 |
| Rewards & motivation | 2 | 2 | 2 | 2 | 2 | **1** | **1** | **1** | 2 |
| Home & navigation | 2 | 2 | 2 | 3 | 2 | **1** | **1** | 2 | 3 |
| Pronunciation & practice | 2 | 2 | 2 | 2 | **1** | 2 | 2 | 2 | 2 |
| Visual system & accessibility | 3 | 3 | 2 | 2 | 2 | **1** | 2 | 2 | 2 |
| Language & copy | 2 | – | 2 | 3 | 2 | 2 | 2 | 2 | 2 |

### Fix these first

The six criticals plus the six majors with the most learner impact per hour of work. Package ids are defined in §6.

| # | Issue | Why first | Effort | Package |
|---|---|---|---|---|
| 1 | **C01** Phone feedback shows 'Helytelen!' in success lime, hides the ✖ and cuts the answer | Every answer on every phone; ~14% of A1 answers are truncated at 360 px | S–M | UX-0a |
| 2 | **C02** CHECK is live with no answer | Empty presses are scored, logged as failures, or praised | S | UX-0a |
| 3 | **C13** Same/different sound drill marks correct answers wrong | 200 reachable items unwinnable; a perfect run ends at 60% | S | UX-0a |
| 4 | **C36** Lesson saved only on the last reward tap; save wall loops new users | Every new Beta user meets it after lesson 1 | S | UX-0b |
| 5 | **C22** No history model: Back abandons lessons, replays the tutorial | Android back gesture today, every Back in the wrapper | S for the worst cases, L in full | UX-0b → UX-3 |
| 6 | **C59** Slovak learners get Hungarian | Standing constraint; HU prompts are unanswerable for SK speakers | S interim, L full (WP-D1–D3) | UX-0e → UX-8 |
| 7 | **C49** One pasted CSS rule paints every heading purple | Highest-ROI visual fix; module names 1.3–1.7:1 on the main screen | S–M | UX-1 |
| 8 | **C25** Result screen numbers are untrue | Ends every lesson | S | UX-0a |
| 9 | **C12** 105 authored explanations are never shown | The vision's core promise ("explanation the moment you err") | S to render, M for a review round | UX-0a → UX-4 |
| 10 | **N3** Session expires silently on day 30 | Guaranteed for every tester; finished lessons vanish | M | UX-3 (session part, alongside WP-B4) |
| 11 | **C66 + C67** Three routes lack the tab bar; path opens at the top | No visible way home from three routes; a Module-7 learner scrolls ~5,600 px per visit | S | UX-0d |
| 12 | **C55** Lexi appears as the retired grey SVG or a thumbnail | First impression and every celebration; the fix is a crop (WP-G1) | S | UX-9 |

---

## 2. Framing: what this review judged against

### Owner decisions and standing constraints

The first three rows are owner decisions of 2026-09-23; the rest are the standing constraints in SOT §2 and the design decisions of 2026-08-28 in SOT §12.1.

| Decision | What it means for this review |
|---|---|
| **The mobile app wraps this web app** (Capacitor/PWA); the React UI *is* the app | Web-only shortcuts (`alert()`, reloads, domain jumps, query-param entry points, no history) are app defects, not polish |
| **Audience: all ages**, teens to older adults; HU/SK speakers; mostly absolute beginners | Legibility floors (12–14 px), no childish tone, minors' safety in social features |
| **Duolingo-like with its own identity** (Lexi, HU/SK-specific teaching) | Borrow interaction patterns; do not rebuild Duolingo's look or copy |
| **Mobile-first, 320–390 px; 360 Android is primary** | Every finding is judged at phone width first; desktop is secondary |
| **2D cel Lexi is canonical** | The grey SVG and the 3-D frames are retired |
| **Green accent, theme-scoped: `#047857` light / `#10B981` dark** (SOT §12.1 D1 and its measured ramp; a WP-C1 done-when) | White on `#10B981` (2.54:1) is a defect; dark fills take near-black labels |
| **Nunito** is the typeface | No new faces; headings must actually reach Nunito |
| **Theme = system; light and dark must both be right** | A light-only or dark-only surface is a defect |
| ~~**Slovak ships in the first Beta**~~ **Superseded 2026-09-24: the first Beta is Hungarian-only; Slovak follows it** (still a translation of the Hungarian) | Until Slovak ships, a Slovak visitor must meet an honest 'Čoskoro po slovensky' state, never the Hungarian course (C59's interim fix); after that, any Hungarian a Slovak learner meets is a defect |
| **No designer budget** | Fixes reuse art on disk; new art is flagged every time |

### The vision in five bullets

- **Duolingo-like, for Hungarian and Slovak speakers, written by a certified teacher:** grammar explained in the learner's own language, drills aimed at L1 interference, and an IPA sound curriculum.
- **Explanations appear the moment a learner makes a mistake** (`Content.docx`, "Ebből fognak a legtöbbet tanulni!" — "This is what they will learn the most from!").
- **Bite-sized and forgiving, for focus:** no hearts, varied short items, energy as the only gate, soft end-of-module exams (WP-F4).
- **A dog-themed identity:** Lexi the cel-drawn dog, bones as the currency, a winding path with chests.
- **A1 → B2 on phones:** only A1 exists; A2–B2 are "coming soon"; the app will be wrapped for the stores.

> ### ⚠️ The reference screens are Duolingo, and the copying is an identity risk
> Every UI capture in `reference/product-design/` is **Duolingo's own product** (Duo the owl, `duolingo.com` URLs, Super upsells). This review used them **only as a flow reference**: screen order, mechanics and feedback timing. They are not a brand or visual spec, and they are desktop-width dark-mode captures, not phone layouts.
>
> The app goes beyond borrowing the flow (C57): it uses Duolingo's exact hexes (`#58cc02` / `#46a302` with the 3-D lip, `#1cb0f6`), two word-for-word Hungarian lines ('Minden Napi feladat teljesítve!' — "All daily quests complete!" — and 'Szép volt, elérted a napi célodat!' — "Well done, you reached your daily goal!"), a near-verbatim "Score" unlock, and Duolingo's celebration order one-to-one. **This is flagged as a product-identity risk for a public launch, not as a legal conclusion.** It is also cheap to fix: about 15 strings and a handful of colour literals.

---

## 3. What works — keep these through the refactor

Only strengths that survived the critic's audit are listed. Each needs protecting when its surroundings are rebuilt.

### Product & content

| Keep | Why | Evidence |
|---|---|---|
| **The bundled A1 curriculum** | 29 nodes × 4 sub-lessons, 1,552 items, imported at build time: lessons open instantly and could run offline in the wrapper | `src/utils/roadmapLoader.ts:25-26`, `src/utils/storyLoader.ts:13` |
| **The L1-specific hero sentence** | States the offer and the differentiator (grammar in Hungarian) first. Drop its placement-test promise (C40) | `src/pages/Home.tsx:153-154` |
| **The café first-lesson scenario** | Real-life, escalates gently from pictures to building 'Coffee, please.' | `data/hu/A1/Module_1_Hello_World/node1_ordering_a_drink.json` (lesson_1) |
| **The 20-group contrast sound curriculum** | v/w, θ/s/f, æ/ɛ, l/ɹ: the errors HU/SK speakers actually make; the intended differentiator | `src/pages/Characters.tsx:43-64` |
| **Stories as a content asset** | 21 A1 texts, 15 questions each, 5 authored explanations per story; only the presentation holds them back (C12, C20) | `data/hu/stories/story_1.json` |
| **svgDictionary icons** | Flat, consistent, 100% coverage of image-choice options (after removing the answer-spelling labels, WP-F1) | `src/components/LessonPlayer/exercises/ImageChoice.tsx:4-6` |
| **The 404 voice** | 'Hoppá! Úgy tűnik, Lexi, a kutyánk elásott valahol ezt az oldalt.' ("Oops! Looks like Lexi, our dog, buried this page somewhere.") — playful, not childish; the model for the voice sheet | `src/pages/NotFoundPage.tsx:28-34` |
| **Practice and sound drills cost no energy** | An always-available, low-pressure option; say so on screen (C19) | `src/pages/Dashboard.tsx:101-131` (the only energy gate) |

### Lesson

| Keep | Why | Evidence |
|---|---|---|
| **The no-hearts model** | Mistakes never end a run; re-entering a node doesn't charge energy twice | `src/pages/Dashboard.tsx:101-131` |
| **The two-zone player anatomy** | Top bar (✖, progress, 🚩), content, one action in a bottom footer. Fix the CTA that moves sideways (F4, C03) | `src/components/LessonPlayer/LessonPlayer.tsx:394-548` |
| **The phone fill_blanks card** | L1 meaning on top, a visible blank that previews the pick, 2×2 pills ≥50 px. Make it the base style (C08) | `src/components/LessonPlayer/exercises/FillBlanks.tsx:120-139`, `src/assets/css/interactive.css:635-737` |
| **Tap-a-word translation** | Dotted new words show a translation and play the English. Disable it on the image_choice prompt (C06) | `src/components/LessonPlayer/InteractiveSentence.tsx:64-80,135-147` |
| **The dark-mode word_order drop zone** | Visible answer line and ghost slot; the model for the light theme (C05) | `src/assets/css/interactive.css:769-796` |
| **The story peek** | '📖 Történet' ("Story") re-opens the text without losing your place | `src/components/LessonPlayer/LessonPlayer.tsx:425-462` |

### Onboarding

| Keep | Why | Evidence |
|---|---|---|
| **Outcome-framed streak goals** | '~75 új szó (Tudsz majd rendelni egy étteremben!)' ("~75 new words — you'll be able to order in a restaurant!"); localised in both languages | `src/locales/hu.json:104-107`, `src/locales/sk.json:104-107` |
| **Gated onboarding cards** | Full-width, 49–60 px, one tap, Continue disabled until something is picked | `src/assets/css/main.css:502-516` |
| **The e-mail-only beta request form** | One required field, 16 px inputs, real labels, a server-side DNS check that the e-mail domain can receive mail | `src/pages/Home.tsx:12-34,302-338`, `api.php:318-337,424-487` |
| **Invite prefill** | `?invite=` opens Register with e-mail and code filled. Drop the hard lock on the code field (N11) | `src/components/AuthModal.tsx:40,303-355` |
| **The forgot-password copy** | Doesn't leak account existence, echoes the address, mentions spam | `src/components/AuthModal.tsx:225-240` |
| **The bilingual gateway heading** | 'Válaszd ki a nyelved / Vyber si svoj jazyk' ("Choose your language") lets each visitor read their own language first | `src/pages/Gateway.tsx:40-43` |

### Rewards & navigation

| Keep | Why | Evidence |
|---|---|---|
| **The 150 XP leaderboard unlock** | Beginners see 'Gyűjts még 90 XP-t…' ("Collect 90 more XP…") instead of a ranking | `src/utils/featureUnlocks.ts:1-5`, `src/components/SidebarRight.tsx:187-193` |
| **The "top 3 + you ±2" drawer board** | Tight 50 px rows centred on the learner; reuse it on the Leaderboard page (C30) | `src/components/SidebarRight.tsx:196-233` |
| **Chest anticipation on the path** | A mid-module surprise with a 'Nyisd ki!' ("Open it!") bubble. Add a real reveal (C26) | `src/utils/roadmapLoader.ts:97-106`, `src/components/Roadmap.tsx:231-251` |
| **The semantic bottom-nav skeleton** | `<nav>` of ≥44 px buttons with an active tint. Its safe-area padding is inert until C23 | `src/components/MobileBottomBar.tsx:30`, `src/assets/css/dashboard.css:1852-1900` |
| **The node tooltip** | Title, '3/4. lecke' ("lesson 3 of 4") and a full-width 50 px 'INDÍTÁS' ("Start"). Add node status (C68) | `src/components/Roadmap.tsx:274-291` |
| **Útmutató on every module banner** | The grammar guide ("Guide") sits exactly where the module starts | `src/components/ModuleBanner.tsx:23-31` |

### Foundations

| Keep | Why | Evidence |
|---|---|---|
| **Theme plumbing** | Tokens on `:root`, a guarded dark block, explicit `[data-theme]` overrides, default = system | `src/assets/css/main.css:1-52` |
| **Nunito body text** | Rounded, legible, full ő/ű/č/ť/ľ coverage | `index.html:33` |
| **The cel style and expressions** | One consistent style across 24 separated cel views: body poses including jump and run, and 7 distinct head expressions. Respect the pixel ceiling (§5b) | `public/assets/images/Transparent PNGs/` |
| **Slovak shell strings with key parity** | Natural Slovak ('Učivo', 'Rebríček', 'Denná séria' — "Course", "Leaderboard", "Daily streak"), 182/182 keys | `src/locales/sk.json` |
| **The CEFR colour code** | A1 green, A2 blue, B1 amber, B2 purple; ship as 700-shade tokens (C48) | `src/assets/css/landing.css:211-214,387-400` |
| **L1 prompt separated from the English answer** | Slovak becomes a sibling key without touching answers (WP-D1) | `data/hu/A1/Module_1_Hello_World/node1_ordering_a_drink.json` |

### Claimed strengths that did not survive

Do not build on these.

- **F1** "No account is required before learning" — false in production; it was observed on `localhost`, where auth guards are off (`App.tsx:35-48,68,76`; C39).
- **F2** "Offline-tolerant first run" — holds only in dev or guest mode.
- **F3** Safe-area padding — inert: without `viewport-fit=cover` every inset is 0 (C23).
- **F4** "The footer doesn't jump" — CHECK changes size and moves sideways (C03).
- **F5** "Dark feedback tints read well" — the dark tints are legible (9.6:1), but the phone title is lime in both themes, so a wrong answer reads as success (C01).
- **F6** "Report sends enough context" — it cannot identify the item (C09).
- **F7** "Accuracy is computed honestly" — 8 of 15 correct shows 0% (C25).
- **F8** "Readable node states" — locked nodes are playable; current and completed look alike (C68).
- **F9** Profile's loading skeleton — it never renders (C46).
- **F10** The desktop rail — it cuts off items on laptop heights (N2).
- **F11** The "can't speak now" banner — its title is lime and it plays the success chime (C01).
- **F12** "Lenient type-in" — one typo is marked wrong (`TypeIn.tsx:24`).
- **F13** "No overflow at 195 px" — the page doesn't scroll, but content is clipped (C58).
- **F14** "The cel art is enough" — enough poses, not enough pixels (C55, C-2).
- **F15** The returning-user Home CTA — flashes the guest version first; below the fold at 320 px (C46).
- **F16** The hero — promises placement tests that don't exist (C40).
- **F17** The forgot-password flow — its exit sits under the header (C37).
- **F18** "The correct English is always spoken" — the TTS quota and WebView fallback make it unreliable (C21).
- **F19** Themes priced server-side — true, but they revert on every save (C32).
- **F20** The Slovak copy — some strings are masculine-only (C63).
- **F21** The tutorial rewards — they can be replayed (C22, C36).
- **F22** A correction, not a strength: `index.html:33` does load Nunito 900; the missing weight is 500 (C50).

---
## 4. What doesn't work

The full catalogue: all 71 clusters and critic findings N2–N12, each in exactly one area, ordered by severity within the area. Paths are under `src/` unless they start with `data/`, `public/`, `templates/`, `api/`, `index.html` or another root PHP file; `main:` marks a path on `origin/main` (local `main` is stale, RP WP-A4); `…/exercises/` is `src/components/LessonPlayer/exercises/`. Line numbers are at `f1d3dc8`.

| Area | Critical | Major | Minor | Total |
|---|---|---|---|---|
| 4.1 First contact & trust | 0 | 11 | 3 | 14 |
| 4.2 Onboarding | 1 | 2 | 0 | 3 |
| 4.3 Lesson & feedback | 2 | 5 | 3 | 10 |
| 4.4 Rewards & motivation | 0 | 10 | 3 | 13 |
| 4.5 Home & navigation (incl. app shell) | 1 | 9 | 3 | 13 |
| 4.6 Pronunciation & practice | 1 | 8 | 1 | 10 |
| 4.7 Visual system & accessibility | 0 | 9 | 3 | 12 |
| 4.8 Language & copy | 1 | 3 | 3 | 7 |
| **Total** | **6** | **57** | **19** | **82** |

**A production caveat that runs through several issues:** on `localhost` auth guards are off (`utils/devEnvironment.ts:1-3`), so the reviewers could play lessons as a guest. In production every lesson route is behind `RequireAuthenticated` (`App.tsx:35-48`). Guest-only variants are therefore **latent** today; the blocks say so where it matters.

## 4.1 First contact & trust

**Verdict:** the headline promise is clear and the invite form is light, but the page never says the Beta is invite-only, sells levels and tests that don't exist, and several trust basics fail: sign-up errors that render off-screen, a contact form that discards messages, tracking before consent, and account data that can silently expire, merge or be overwritten.

**Sub-area: safety & data trust**

### N3 · Session expiry is guaranteed on day 30 and fails silently — **major**
- **What happens:** the 30-day cookie is never re-issued and `session_regenerate_id` runs only at signup and login, so every session ends 30 days after login however active the learner is. `save_progress` then returns 'Munkamenet lejárt! Kérjük, jelentkezz be újra.' ("Session expired! Please log in again."), but the client only handles success: achievement toasts still show and the path advances. Relaunching opens the marketing page under an empty login modal with no reason; an offline launch takes the same path.
- **Learner impact:** every Beta tester silently loses the lessons done after day 30 until they notice they are logged out.
- **Fix:** a sliding session (re-issue the cookie on activity); a local outbox of unsaved progress; a re-login sheet with the e-mail prefilled that flushes the outbox; an in-app login screen that states the reason.
- **Effort:** M
- **Where:** `security.php:13-19`, `api.php:575,729,1155-1158`, `context/UserContext.tsx:366-376`
- **Related:** WP-B4 (invisible failures, stale CSRF), WP-E4; N9, C46.

### N6 · Logging in silently merges another person's guest progress into the account — **major**
- **What happens:** logging in on a device that holds guest data POSTs `guest_migration` with it (reproduced: 245 XP, node 1, 140 bones, streak 4) and clears it; nothing in the UI mentions it. Logout leaves other per-person keys for the next user.
- **Learner impact:** on a shared family or classroom device, one person's progress is absorbed into someone else's account, irreversibly. In production guests can't play lessons, so today the data at risk is mainly old-app guest progress under the same key (N5); it becomes fully live if guest mode returns (Q1).
- **Fix:** ask first ('Hozzáadod a fiókodhoz?' — "Add it to your account?"); clear or per-user-namespace every per-person key on logout.
- **Effort:** S
- **Where:** `components/AuthModal.tsx:115-129`, `api.php:653-700,736`, `components/SidebarLeft.tsx:117-122`
- **Related:** WP-B2 (the same merge is uncapped); C17 (sound progress leaks across accounts), N4, N5; decision Q1.

### N7 · Social features have no protection for minors — **major** (needs legal input)
- **What happens:** the username is free text up to 50 characters and its placeholder 'Pl. Péter' ("e.g. Péter") nudges towards a real name. `age_range` is stored and never read. From 150 XP, public boards show names to strangers; friend requests go to any username or e-mail (and reveal whether an address is registered); friends see the uploaded photo. There is no block, report-user or moderation, and no under-16 consent step (GDPR Art. 8; DSA Art. 28).
- **Learner impact:** minors are visible to strangers by default in an all-ages product.
- **Fix:** nickname guidance and a generated default name, a name blocklist, report-name. Use the stored age group: anonymised or opt-in boards and exact-username friend requests for under-18s; a consent step or a 16+ Beta for under-16s. **Get legal advice before the public Beta.**
- **Effort:** M
- **Where:** `components/AuthModal.tsx:326`, `api.php:489-495,1940`
- **Related:** C30, C35, C38, C70; decision Q2; C-5.

### N9 · Resume and two-device staleness: stale day, stale quests, progress overwritten — **major**
- **What happens:** the session is fetched once and the day rollover (quests, streak) runs only at load, on the UTC date, so a WebView resumed the next day keeps yesterday's state. Saves send the whole `completed` and `scores` objects and the server overwrites them, so a phone left in the background erases lessons done since on a laptop.
- **Learner impact:** learners who use two devices lose completed lessons without warning.
- **Fix:** refetch on resume and at local midnight (Budapest/Bratislava time); union-merge `completed` and `scores` on the server. That merge must run under a row lock (`SELECT … FOR UPDATE` in a transaction, as `handleBuyCosmetic` does): RP WP-B1 rejected an unlocked read-then-merge as a lost-update race.
- **Effort:** M
- **Where:** `context/UserContext.tsx:108-112,190-214`, `api.php:995-1065,1205`
- **Related:** after WP-B1 (its locking warning applies), SOT §21 Q15; C27, N3.

### N5 · Existing learners arrive after the cutover with their XP but an empty path — **major**
- **What happens:** the old app on `main` stores progress as `completed["A1_<section>_<sub>"]`, and the database is shared with production. A mocked legacy account shows 860 XP, Level 2 and streak 6 — and Module 1 node 1, with no explanation. The old guest data uses the same `neolix_guest_progress` key on the same origin, so it will be imported as-is.
- **Learner impact:** returning learners keep their points but none of their progress, and no one tells them why.
- **Fix:** map old sections to new nodes, or a one-time 'Új Lexipaws' ("New Lexipaws") sheet explaining the fresh start; namespace local keys by schema version. The owner should count affected accounts first.
- **Effort:** S–M
- **Where:** `main:js/dashboard.js:1212-1230`, `utils/guestProgress.ts:7-45`
- **Related:** WP-A4 (cutover); C34 (frozen legacy level), N4; decision Q4.

### C42 · Contact form fakes success; legal pages disagree on who runs the service — **major**
- **What happens:** the contact form validates, `console.log`s and shows 'Köszönjük! Az üzenetét sikeresen rögzítettük…' ("Thank you! Your message was recorded…"); no request is sent. In light mode the inputs are mid-grey boxes and the success line is 1.91:1. Impressum, Privacy and Terms show '[N/A]' registry fields and a bracketed '[Neolix Studio]' / '[Ladislav Szép]', while Contact describes a sole trader with '[Feltöltés alatt]' ("being uploaded"). Terms define the audience as Hungarian-only, the copy uses formal Ön, and a tutoring price ad (15 €/50 perc) sits inside the Impressum.
- **Learner impact:** messages are lost; a parent checking who runs the service finds placeholders.
- **Fix:** a mailto button plus the existing copy button until an endpoint exists; light-theme input tokens; one operator identity without brackets (owner/legal); tutoring out of the Impressum; Terms widened to HU+SK.
- **Effort:** S
- **Where:** `pages/Contact.tsx:22-38,70-90`, `assets/css/legal.css:95-112,143-152`, `pages/Impressum.tsx:28-49`, `pages/PrivacyPolicy.tsx:28-34`, `pages/Terms.tsx:28-39`
- **Related:** SOT §16 P0 #12, §21 Q24–25; decision Q3.

### C43 · Analytics and third-party widgets load before any consent — **major**
- **What happens:** GA4 fires inline before React mounts; Headway and Google Fonts load for every visitor. There is no consent UI anywhere, and the privacy policy says consent is given 'by starting the guest session', which production visitors cannot do.
- **Learner impact:** an ePrivacy/GDPR exposure on an all-ages product that anyone can check.
- **Fix:** the cheapest compliant path is no banner at all: drop GA (or go cookieless) and self-host Nunito. Otherwise a localised bottom sheet with equal-weight accept and reject, loading GA only after consent. Make the same choice for the wrapper.
- **Effort:** S
- **Where:** `index.html:10-17,30-36`, `pages/PrivacyPolicy.tsx:40-45`
- **Related:** SOT §18; C23, C50.

**Sub-area: acquisition and sign-up**

### C39 · Invite-gated funnel: no primary CTA, no invite explanation, onboarding answers discarded — **major**
- **What happens:** both hero buttons render as identical green outlines because a `.btn-secondary !important` rule beats their inline styles; at 320×568 both sit below the fold. 'Béta' is unexplained, 'free' appears only in Terms, and no wait time is given. Three login entry points ('Bejelentkezés' — "Log in", 'Már van profilom' — "I already have a profile", the A1 card) open a login-only modal with no "request an invite" link. `/welcome/*` and `/lesson/ftue` are auth-guarded, so the real path is request → approval → e-mail → register → onboarding: about 17–20 taps plus a human wait before the first English word. Signup, the only reader of `ftue_marketing_data`, now runs *before* the questionnaire, so every answer is discarded; the experience level is never stored; the streak goal is written as `streakCommitment` but read as `streak_commitment`.
- **Learner impact:** a newcomer can't tell what to do or that access is gated; an invited learner answers questions that go nowhere.
- **Fix:** one filled primary 'Kérek meghívót – ingyenes' ("Request an invite – free"), the other as a text link, one line of invite microcopy, 'Nincs még fiókod? Kérj meghívót' ("No account yet? Request an invite") in the login sheet, an honest wait on success. For the invite Beta: register → first lesson directly; hide 'Már van profilom' when signed in; move attribution questions into the beta-request form, which reaches the server; rename the key. No art.
- **Effort:** S (copy, CSS, key) / M (reordered funnel)
- **Where:** `assets/css/dashboard.css:3624-3628`, `pages/Home.tsx:152-175,197,287-296`, `App.tsx:35-48,68-76`, `components/AuthModal.tsx:40,67-98,303`, `pages/Welcome/WelcomeLayout.tsx:28-39`, `pages/Welcome/ExperienceScreen.tsx:6,76`, `components/LessonPlayer/PostLesson.tsx:80-82`, `api.php:1102-1112`
- **Related:** SOT §5, §21 Q3; C27, C37, N11; decision Q1.

### C40 · Unbuilt levels (A2–B2) and features are presented as available — **major**
- **What happens:** only A1 exists, but the landing, header menu and in-app picker show A1–B2 as equal choices. The hero promises 'szintfelmérő tesztek' ("placement tests") and the exams card a quiz after every topic; the onboarding placement option fires `alert('A szintfelmérő teszt hamarosan érkezik!')` ("The placement test is coming soon!"). Picking A2 in-app persists `selectedLevel` and replaces the path with 'Hamarosan érkezik!' ("Coming soon!") and no button; the way back is the picker in the 'Szintek' ("Levels") drawer, one tap away, and login resets it to A1. Level names disagree ('B1 Középfok' — "B1 Intermediate" — vs 'B1 – Küszöbszint' — "B1 – Threshold"), and 'alapfok/középfok' ("basic/intermediate") collide with Hungarian state-exam levels (≈B1/B2). B1/B2 badges use accent colours that contradict their cards.
- **Learner impact:** a beginner is promised a test and a ladder that aren't there, and a curious tap can blank the home screen.
- **Fix:** A1 as the course; A2–B2 as a muted, non-selectable 'Hamarosan' ("Soon") roadmap; never persist a level with no content; 'Vissza az A1-hez' ("Back to A1") on the coming-soon screen. Drop placement-test and per-topic-quiz claims until they ship (exams come with WP-F4). One naming set from locale keys (HU 'A2 Alapozó / B1 Küszöbszint / B2 Középszint' — "Foundation / Threshold / Intermediate"; SK names need the owner). Badges on `--level-*` tokens.
- **Effort:** S
- **Where:** `pages/Home.tsx:154,184-233,267-268`, `components/Roadmap.tsx:22-32`, `context/UserContext.tsx:99-101,289-292`, `components/SidebarLeft.tsx:398-415`, `locales/hu.json:10-13`, `components/Header.tsx:38-41`, `assets/css/landing.css:102-112,213-214,389-400`, `pages/Welcome/PlacementScreen.tsx:36`
- **Related:** WP-F4; C61; decision Q3.

### C38 · Sign-up hides password rules, rejects passphrases, and fails silently on small phones — **major**
- **What happens:** the server requires 8–16 characters with all four character classes (enforced at signup, change and reset), so a 19-character passphrase fails; Register shows no rules and has no client check. At 320×568 the server error renders above the scrolled modal (y = −172…−54), so nothing visibly happens (at 360×800 it is visible). Also: `autoComplete="current-password"` on register and `"username"` on a nickname field, no show-password toggle, a '••••••••' placeholder that looks pre-filled, 13.6 px grey labels, no terms/privacy link, an unexplained age group with no parental path, and the formal 'Kérjük várjon...' ("Please wait").
- **Learner impact:** invited testers fail registration with no visible reason; password managers' secrets are rejected.
- **Fix:** length-only policy (min 8–10, max ≥64) in WP-E4, then a single rule line; `new-password`/`nickname` autocomplete; an eye toggle; inline errors with scroll-to-first-invalid; an 'ÁSZF / Adatkezelés' ("Terms / Privacy") line. Keep an age gate at signup (C-5).
- **Effort:** S
- **Where:** `api.php:47-50,502,1285,1378`, `components/AuthModal.tsx:160-170,249,315-381`
- **Related:** SOT §10, WP-E4; N7, C63; decision Q2.

### N11 · Invite links dead-end when expired, used, forwarded or re-clicked — **major**
- **What happens:** the invite code is read-only and checked only on submit, so after filling the whole form the learner gets 'Érvénytelen vagy lejárt…' ("Invalid or expired…") with no next step. Invites expire after 30 days and the e-mail doesn't say so; re-clicking a used invite or editing the e-mail gives the same error.
- **Learner impact:** a tester who waited days for approval can dead-end on the last step.
- **Fix:** validate the invite when the link opens, then branch: the form, "log in instead" (already used), or "request a new invite" (expired). State the expiry in the e-mail.
- **Effort:** S
- **Where:** `components/AuthModal.tsx:343-352`, `api.php:260-293`
- **Related:** C39, C38, N12.

### C41 · Language choice: Slovak below the fold, wrong Slovak copy and flag, choice not remembered — **minor**
- **What happens:** at 360×800 the gateway's Slovak card starts at y=830, below the fold (at 320×568 only the Magyar card's top shows). The SK card says 'Slovenský' (an adjective; the language is 'Slovenčina'), the CTAs are nouns, formal 'Učte sa' ("Learn", formal plural) sits beside informal 'Vyber si' ("Choose"), and the drawn coat of arms lacks the double cross. `neolix_language` is written and never read. The tab title stays '…Magyaroknak' ("…for Hungarians"). In-app, Profile's English 'Study Language / Domain' switch jumps to another domain (C71).
- **Learner impact:** a Slovak visitor on a phone meets a Hungarian-first chooser; a later language change logs them out.
- **Fix:** two equal rows above the fold at 320×568; endonyms with verb CTAs ('Tovább magyarul' / 'Pokračovať po slovensky' — "Continue in Hungarian / in Slovak"); a correct flag from an open-licence set; legal links; remember the choice. In-app: `i18n.changeLanguage` plus a save, no domain jump; seed language from saved setting → `navigator.language` → domain (the wrapper has no .sk TLD).
- **Effort:** S
- **Where:** `pages/Gateway.tsx:3,9-11,40-86`, `pages/ProfilePage.tsx:279-299`
- **Related:** SOT §1 #4 (`gateway.html` missing at the apex), §5; C59, C71; decision Q6.

### C44 · Landing layout debt — **minor**
- **What happens:** `gateway.css:98` redefines `.cards-grid` as a flex column and loads after `landing.css:44`, so the level grid is never a grid at ≥768 px. Step cards use a literal `#E5E7EB` border and lip that shows as a bright rim in dark mode. The phone page is 4,795 px (six screens) with one real action.
- **Learner impact:** cosmetic on phones; the rims and the long scroll look unfinished.
- **Fix:** scope or rename the gateway `.cards-grid` (WP-C3); border tokens with dark values; a shorter phone page with three real 360 px screenshots instead of abstract step cards (no new art).
- **Effort:** S
- **Where:** `assets/css/gateway.css:98-111`, `assets/css/landing.css:44-49,414-418`
- **Related:** SOT §12, WP-C3; C39.

### C45 · Marketing header and footer navigation is noisy — **minor**
- **What happens:** the mobile menu repeats A1–B2 as four links to `/#levels`, shows a 36×36 Hungarian flag (also on SK pages; its only name is the Hungarian title) that leaves for `/gateway`, and has no request-access or 'Kapcsolat' ("Contact") item. The footer's first link, 'Gyakran Ismételt Kérdések (GYIK)' ("FAQ"), is `href="#"`; footer links are 24 px tall.
- **Learner impact:** minor friction, and a dead FAQ where invite questions should be answered.
- **Fix:** one 'Tananyag' ("Course") link, primary 'Kérek meghívót', 'Belépés' ("Log in"), 'Nyelv: Magyar ▸' ("Language: Hungarian") as text, 'Kapcsolat'; ≥44 px footer rows; a 5-question FAQ that explains the closed beta.
- **Effort:** S
- **Where:** `components/Header.tsx:35-79`, `components/Footer.tsx:45-58`
- **Related:** C39, C59.

## 4.2 Onboarding

**Verdict:** the order is right on paper and the first lesson is well chosen, but the real flow is invite → register → a questionnaire whose answers go nowhere → a first lesson whose save wall throws it away, followed by an English tour that re-opens on every visit.

### C36 · Finished lesson is saved only on the last reward tap; the save wall discards it and loops new users — **critical**
- **What happens:** the result is written only by PostLesson's `onComplete`, which fires on the final 'Tovább' ("Continue") or on 'Később' ("Later"); there is no unload flush. Screen 9, 'Mentenéd a haladásod? Készíts egy profilt…' ("Save your progress? Create a profile…"), has no `isGuest` guard, and `LessonPlayer` treats `points === 0` as a tutorial. So a newly registered user finishes lesson 1, taps the primary 'Profil készítése' ("Create profile"), lands on the marketing page with nothing saved, and is sent back to `/welcome/start`. 'Később' does save and ends the loop. For regular lessons the loss window is PostLesson screen 1 (one tap); in the first lesson it spans 9 screens. The guest variants (spent energy, a wall after every lesson) exist only on `localhost`.
- **Learner impact:** every new registered Beta user meets the wall at the end of their very first lesson, and its primary button discards that lesson.
- **Fix:** commit in `handleCheck`'s final branch and make PostLesson display-only (pass the pre-commit points so the count-up doesn't double-count); remove screen 9 while production has no guest mode; store `onboarding_completed` as a flag, not `points > 0`. No art.
- **Effort:** S
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:283-289,366-389`, `components/LessonPlayer/PostLesson.tsx:55-89,668-698`, `pages/Dashboard.tsx:95-99,195-199`, `pages/Welcome/FTUELesson.tsx:18-40`, `context/UserContext.tsx:156`, `pages/Home.tsx:69-97`
- **Related:** SOT §16 P0 #8–#9, WP-B4 (flush on unload); C22, C25, C35; decision Q1.

### C47 · First-run product tour: broken step on phones, recurs every visit, English, wrong content — **major**
- **What happens:** the first dashboard visit opens the left drawer and runs 4 hard-coded English steps with Joyride's English 'Skip / Back / Next (1 of 4)', while 33 translated `tour.*` keys sit unused. Step 2 targets the ~6,500 px `.roadmap-container` with placement 'top', so at 320/360/390 its tooltip and buttons render above the viewport (y ≈ −36). It is not a trap — the overlay is click-through and step 1's Skip works — but the flag is written only on finish or skip, so anyone who pressed Next gets the drawer and the tour again on every visit. The steps explain the drawer and the changelog, not the path, energy, bones or streak.
- **Learner impact:** a new learner's first view of home is an English tour covering the path, returning until they find Skip.
- **Fix:** target `.roadmap-node.current` with auto/bottom placement; write the flag when the tour starts; pass `tour.controls` to Joyride's `locale`; stop force-opening the drawer on phones. Better: 2–3 just-in-time Lexi hints (current node, energy, 'Útmutató' — "Guide") using existing cel heads.
- **Effort:** S
- **Where:** `components/ProductTour.tsx:18-34,133-163,186-219`, `pages/Dashboard.tsx:33-65`
- **Related:** SOT §16 P1 #17, WP-D3 (tour first); C51, C60.

### C03 · No shared screen scaffold: the primary CTA is small, moves, and sits mid-screen; onboarding has no progress or back — **major**
- **What happens:** in the lesson, 'ELLENŐRZÉS' ("Check") is a centred 145×40 pill that becomes a 116×40 button flush right after checking, so the thumb re-aims on every item. On PostLesson the CTA centre lands at 564, 370, 395, 479, 660 and 675 px on screens 1–6 at 360×800, because a mobile `flex-start` override cancels `margin-top: auto`. In onboarding the card is content-height, so 'TOVÁBB' sits mid-screen with 209–401 px empty below; options sit in a 42dvh inner scroll with no cue (4 of 6 visible at 320×568); steps 1–4 have no progress bar or back control; at 320×568 the Experience CTA is below the fold.
- **Learner impact:** every screen makes the thumb hunt; older and one-handed users feel it most.
- **Fix:** one sticky full-width footer primitive (48–56 px, thumb zone, safe-area padded) shared by onboarding, the lesson and PostLesson; in onboarding a progress bar and a back arrow tied to the hardware Back. Trimming the questionnaire is an owner call.
- **Effort:** M
- **Where:** `components/LessonPlayer/PostLesson.tsx:193-198,293-298,700-710`, `assets/css/main.css:440-453,650-701`, `assets/css/interactive.css:974-1003,1256-1263`, `pages/Welcome/PlacementScreen.tsx:58-63`
- **Related:** WP-C3; C23, C52, C58.

## 4.3 Lesson & feedback

**Verdict:** the player's shape is right and forgiving, but on phones it misreports right and wrong, accepts empty answers and never explains a mistake — and it treats the most common exercise (word_order, 62% of items) and the first contact with new words (image_choice) carelessly.

### C01 · Phone feedback banner contradicts the result and hides the correct answer — **critical**
- **What happens:** inside `@media (max-width:600px),(max-height:700px)`, `interactive.css:956-961` forces every feedback title to lime `#8bdc2a !important` and `:952-954` hides the ✓/✖ badge. So on phones 'Helytelen!' ("Incorrect!"), 'Kiváló!' ("Excellent!"), 'Kihagyva' ("Skipped") and SK 'Nesprávne!' ("Incorrect!") are all lime: 1.43–1.51:1 on the light tints, legible in dark (9.6:1) but still reading as success. 'A helyes válasz:' ("The correct answer:") is 10.9 px grey (2.91:1 in light, 4.61:1 in dark) clamped to two lines in a 153 px slot (121 px at 320): **216 of 1,552 A1 answers are cut at 360, 618 at 320.** The skipped state plays the success chime. At every width a wrong selected card stays solid green, and fill_blanks' inserted word is always green; TrueFalse paints 'Hamis ❌' ("False") red at tap time even when it is correct; true_false prints raw 'True'/'False'; phonics items have no answer field, so the line is empty; no exercise re-shows the correct option. SK 'POKRAČOVAŤ' ("Continue") overflows its button at 320/360. Tablets and desktop show the correct red title and ✖.
- **Learner impact:** on the primary device a beginner cannot reliably tell right from wrong, and often cannot read the right answer.
- **Fix:** per-theme success/danger/warning tokens driven by a `data-state` on the footer; keep the icon on phones; remove only the lime override, the icon-hiding rule, the clamp and the `:has()` colour hack (the surrounding block also holds the footer layout); let the banner grow, or give the answer its own full-width row; neutral selection before CHECK, then green/red plus an outline on the correct option; 'Igaz/Hamis' ("True/False") mapping; a derived phonics answer; a warning chime for skipped. No art.
- **Effort:** S–M
- **Where:** `assets/css/interactive.css:520,708-714,933-972,1004`, `components/LessonPlayer/LessonPlayer.tsx:224-228,495-522`, `…/exercises/ImageChoice.tsx:49-53`, `…/exercises/MultipleChoice.tsx:69-73`, `…/exercises/PhonicsListenChoose.tsx:80-82`, `…/exercises/TrueFalse.tsx:81-110`
- **Related:** SOT §12 (`:has()` selector); C24, C48, C58; UX-2 FeedbackSheet.

### C02 · CHECK is live with no answer: empty presses are graded, and praised after a correct item — **critical**
- **What happens:** `LessonPlayer` keeps one boolean `selectedAnswerCorrect`, never reset on advance, and CHECK is never disabled. ImageChoice, PhonicsListenChoose and PhonicsSpeak don't report false on a new item, so an empty CHECK after a correct one is praised 'Kiváló! Helyes válasz.' ("Excellent! Correct answer.") — reproduced on items 1–2 of the first lesson (56 of 116 sub-lessons open with two image_choice items). Elsewhere an empty CHECK is graded wrong, costs accuracy and logs `log_failed_exercise` for logged-in users. Options stay tappable after CHECK and change the stored answer. At 360 the centred CHECK overlaps the right-aligned 'TOVÁBB', so a double tap lands an empty CHECK on the next item.
- **Learner impact:** scores and the Mistakes queue fill with presses the learner never made, and praise for nothing teaches that praise means nothing.
- **Fix:** one `{hasAnswer, isCorrect, value}` state reset on every index change; `key={item.id ?? index}`; CHECK disabled (neutral grey, `aria-disabled`) until `hasAnswer`; options locked after CHECK; log failures only for real answers. Ship with C01 and C13.
- **Effort:** S
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:146,220-222,265-291,525-547`, `…/exercises/ImageChoice.tsx:16-18`, `…/exercises/PhonicsListenChoose.tsx:17-23`, `…/exercises/PhonicsSpeak.tsx:19-24`
- **Related:** SOT §16 P1 #14; C03, C13, C15, C25.

### C12 · Mistakes never become learning: authored explanations unused, no re-queue, no review path — **major**
- **What happens:** all 105 story true_false items carry an authored `explanation`, and no component reads it, so a wrong answer shows only 'Helytelen! / A helyes válasz: True'. Roadmap items have no tip field, and the grammar guide can't be opened from a lesson (C10). Missed items are never re-queued; after a 0% lesson the only action is 'Tovább', though weak-word practice exists; the two accuracy quests always complete (literal 100). Stories: 17 of 21 are 37–45 words with 15 questions each; 90 of 105 type-in hints give the Hungarian translation and 15 give the answer verbatim ('Máté', 'park', 'taxi').
- **Learner impact:** the product's central promise — an explanation the moment you err — is not delivered even where it has already been written.
- **Fix:** render `item.explanation` in the wrong-answer state now (the texts are English and work for HU and SK). Then a short end-of-lesson 'Javítsuk ki!' ("Let's fix it!") round and a 'Hibák átnézése' ("Review mistakes") action on low-accuracy results. Hiding hints behind 'Segítség' ("Help") and trimming stories to 6–8 questions are content calls.
- **Effort:** S (render) / M (review round)
- **Where:** `data/hu/stories/story_*.json`, `components/LessonPlayer/LessonPlayer.tsx:265-291,505-513`, `context/UserContext.tsx:195-202,413-486`, `components/LessonPlayer/PostLesson.tsx:310-341`
- **Related:** SOT §6, WP-B3, WP-F4; C18, C25; decision Q7.

### C07 · Exercises have no consistent L1 instruction, and new words are never introduced — **major**
- **What happens:** each exercise writes and styles its own instruction: image_choice a 30 px 'Melyik ezek közül a(z) "…"?' ("Which of these is '…'?"), word_order only the L1 sentence in a pill with no 'Fordítsd le!' ("Translate!"), fill_blanks an uppercase grey label, TF/MC a 28 px heading, type_in a small pill. Several say 'Kattints' ("Click") on touch screens; module titles are English idioms ('Module 1: Hello World'). The 'Új szó / New Word' badge never renders, because `LessonPlayer.tsx:463` reads `newWord` from the raw item, which never has it. The first lesson has no break screen and no mascot.
- **Learner impact:** an absolute beginner guesses what each screen wants, and first exposures to a word look like tests.
- **Fix:** one `ExerciseHeader` with a fixed L1 imperative per type from locale keys ('Koppints' / 'Ťukni' — "Tap"), typographic quotes, no 'a(z)'. A first-exposure 'Új szó' card (icon, English word, audio, meaning) needs first-occurrence-per-lesson logic — reading `enrichedQuestion.newWord` alone would badge 962 of 1,000 items. L1 module titles with the English as a subtitle is an owner call.
- **Effort:** S (header) / M (new-word card)
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:63-78,163-165,463`, `…/exercises/WordOrder.tsx:82`, `…/exercises/MultipleChoice.tsx:24`, `…/exercises/TypeIn.tsx:28`, `components/LessonPlayer/InteractiveSentence.tsx:86,210`, `data/hu/A1/*/module_meta.json`
- **Related:** WP-D3; C05, C06, C11, C59.

### C05 · word_order (62% of items): no instruction, invisible drop zone in light mode, give-away tiles — **major**
- **What happens:** word_order is 960 of 1,552 roadmap items. Its answer line and empty slots are `rgba(255,255,255,…)`, so light mode has no visible drop zone (dark is fine). The first-time hint pill is 1.51:1 in light, says 'Kattints', and recurs on every item until a word is tapped. Tiles vanish without a placeholder, so the bank reflows under the finger; a 999px radius turns long prompts into ovals; at 320×568 three tiles sit under the footer. Every item has a capitalised tile and 958 a punctuated one; since distractors are capitalised too, 584 reveal the first word, 658 the last, and 436 (45%) both.
- **Learner impact:** the most common exercise gives light-mode users no target and often gives the answer away.
- **Fix:** theme-token lines and slots; the C07 instruction; ghost placeholders; 'Koppints'; a 16–20 px radius; strip capitals and punctuation from tiles (the grader already ignores both) with an exception list for 'I' and proper nouns.
- **Effort:** S
- **Where:** `assets/css/interactive.css:769-796,859-873`, `components/LessonPlayer/exercises/WordOrder.tsx:76-82,128-149`, `components/LessonPlayer/InteractiveSentence.tsx:19-59,84-88`
- **Related:** WP-C1; C07, C58.

### C06 · image_choice is a silent 50/50 with give-aways — **major**
- **What happens:** image_choice opens 71 of 116 sub-lessons and is where new words are met, but 124 of 132 items have two options. Six prompts equal an option's text (four are plain English: sugar, orange, lemon, apple). 19 icons spell the answer exactly (23 by a looser count, e.g. the MILK carton). The cards are silent, while the dotted prompt word is tappable and plays the English and shows it in a tooltip — a full give-away.
- **Learner impact:** the item that introduces vocabulary can be passed by guessing or by tapping the prompt.
- **Fix:** 3–4 options from the 136 existing icons; audio on card tap; L1 prompts; remove icon `<text>` labels (WP-F1); no translation tooltip on the image_choice prompt.
- **Effort:** S–M
- **Where:** `components/LessonPlayer/exercises/ImageChoice.tsx:16-35`, `components/LessonPlayer/InteractiveSentence.tsx:104-143`, `data/hu/A1/Module_1_Hello_World/node2_beverages.json`, `assets/svgDictionary.json`
- **Related:** SOT §7, §13, WP-F1, WP-F2; C07, C21.

### C08 · fill_blanks is unstyled above phone width, tablets included (merged with N1) — **major**
- **What happens:** every `.fill-blank-*` compose-card rule lives inside `@media (max-width:600px),(max-height:700px)`. Above 600 px — tablets at 768×1024, 800×1280 and 1024×768, and desktop windows taller than 700 px — the item renders as bare text ('Válaszd ki a hiányzó szót / Kérem / Coffee, .' — "Choose the missing word") with a 0×22 invisible blank and nothing marking the inserted word. 460 items per language, about 30% of roadmap items. Tablets show the correct red feedback while phones show the lime one (C01): the two device classes have opposite defects.
- **Learner impact:** family tablets — likely devices for children and older adults, and a wrapper target — break every third item.
- **Fix:** move the phone rules into the base styles (the mobile-first inversion) with a `min-width` cap on large screens; add 768×1024, 800×1280 and 1024×768 to the definition of done.
- **Effort:** S (+ M for a full tablet pass)
- **Where:** `components/LessonPlayer/exercises/FillBlanks.tsx:120-139`, `assets/css/interactive.css:520,635-716` (plus the smaller copies in the blocks opening at `:1006` and `:1104`)
- **Related:** SOT §16 P1 #15, WP-C2, WP-C3 (first row); C58; C-9.

### C11 · Nothing motivates during a lesson: no combo, identical praise, no Lexi — **minor**
- **What happens:** between the first item and the result nothing reacts to performance: a fixed gradient progress bar with no combo state, one pair of praise strings, no Lexi. `MoraleBoost` and `HarderEncouragement` exist with zero data items; the only in-lesson mascot is the grey SVG in a fill_blanks dialogue branch that no item uses. An enhancement gap, not a defect.
- **Learner impact:** up to 15 items with no rhythm, against the product's focus framing.
- **Fix:** after C01/C02: a praise pool in locale keys, a reduced-motion-aware combo label, Lexi's happy and thinking heads in the feedback sheet (within the pixel ceiling), optional haptics in the wrapper.
- **Effort:** S–M
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:407-423,496-503`, `…/exercises/FillBlanks.tsx:32,58`, `components/LessonPlayer/QuestionHeader.tsx:11-15`, `locales/hu.json:93-94`
- **Related:** SOT §17, WP-F3; C55, C63.

### C09 · 'Report a problem' is a generic Hungarian bug form that drops the item context — **minor**
- **What happens:** the 🚩 opens a Hungarian-only form: a type dropdown, e-mail (asked even of logged-in users), a required 'Leírás' ("Description") and 'Lépések a reprodukáláshoz' ("Steps to reproduce"). Its × is 18×32; 'Küldés' ("Send") is partly clipped at 360×800 but reachable by scrolling. The payload has no item id, sub-lesson id, learner answer or expected answer, and `questionText` is undefined for image_choice and word_order.
- **Learner impact:** rarely used by learners, but the owner cannot act on content reports, and reporting is a Beta success criterion.
- **Fix:** the payload first (item id, sub-lesson id, learner answer, expected answer, no e-mail for logged-in users), then a chip-based sheet. Pair a lower-friction form with the server fix, since the endpoint is unauthenticated.
- **Effort:** S
- **Where:** `components/modals/ReportProblemModal.tsx:17-70,107-216`, `components/LessonPlayer/LessonPlayer.tsx:550-559`
- **Related:** WP-E3; C52, C60.

### C10 · Grammar guide is hard to read, unreachable from lessons, and contains a Hungarian error — **minor**
- **What happens:** the module 'Útmutató' opens inline; its title is purple gradient on the green header (C49), section headings are `#10B981` on white (2.54:1, light only), its × is 19×32. The content is paragraph walls with no tables or audio, is Hungarian for SK users, and can't be opened from a lesson. It says 'Magyarul mondhatod, hogy "Én fáradt"' ("In Hungarian you can say 'Én fáradt'"), which is ungrammatical ('Én fáradt' ≈ "I tired"): the copula drops only in the third person ('Ő fáradt' — "He/she is tired").
- **Learner impact:** the differentiating grammar content is hard to read and absent at the moment it's needed.
- **Fix:** fix 'Én fáradt' now (one line). Then a bottom sheet with a solid title, a 44 px close, am/is/are tables, tappable examples and an entry from the lesson header. Slovak content needs the owner.
- **Effort:** S (content) / M (sheet)
- **Where:** `components/modals/GrammarModal.tsx:2`, `components/Roadmap.tsx:134`, `data/hu/grammar.json`
- **Related:** SOT §7, WP-D2; C12, C49, C59.

## 4.4 Rewards & motivation

**Verdict:** the pieces of a good reward loop exist — a sound result-screen skeleton, a chest, outcome-framed goals — but the numbers are untrue or hidden, the economy pays for feedback rather than learning, and three overlays (energy, league reward, shop) break on phones. Most of this sits on WP-B1/B2/B3 and must be sequenced after them.

### C25 · The result screen reports untrue numbers; returning learners get none of the sequence — **major**
- **What happens:** PostLesson is passed `baseXp={15}` while `max(5, 15 − mistakes)` is saved (logged-in: '+15' shown, +7 saved after 8 mistakes). Accuracy is `max(0, 100 − 20 × mistakes)`, so five mistakes shows 'Pontosság 0%' ("Accuracy 0%") in success green under 'Lecke teljesítve!' ("Lesson complete!"), and one mistake in a 15-item story shows 80% instead of 93%. All completeLesson callers pass the literal 100, so 'Flawless' and the accuracy quests fire after 0%. Tutorial screens 2–8 are static and untrue: a level-up, a Score of 1 at 50%, 'Minden Napi feladat teljesítve!' ("All daily quests complete!") while the drawer shows 1/3. Regular lessons jump from screen 1 to the end, so returning learners never see a real streak, quest or bone moment.
- **Learner impact:** every lesson ends on numbers the learner can't trust, from day 1.
- **Fix:** compute XP once and pass the same value to PostLesson and `onComplete`; accuracy = correct / total; real accuracy at all completeLesson call sites (WP-B3's first row); never a failing value in success green; below 60% a neutral tone plus 'Hibák átnézése'. Drop tutorial screens 2–4 and 7–8 rather than rebuild them. Build the data-driven returning sequence only after C27.
- **Effort:** S (numbers) / M (returning sequence)
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:369-389`, `components/LessonPlayer/PostLesson.tsx:14-89,310-338,343-665`, `pages/Dashboard.tsx:197,210`, `pages/Welcome/FTUELesson.tsx:20`, `pages/PracticePage.tsx:64`, `pages/Characters/CharacterLesson.tsx:23`, `context/UserContext.tsx:436-505`
- **Related:** SOT §6, §8, WP-B3; C27, C33, C36, C57; decision Q13.

### C27 · Daily state is hollow: streak +1 per app open, quests reroll per load, shields inert, no daily goal — **major**
- **What happens:** for logged-in users `save_progress` sends 5 fields and the server defaults `daily_quests_date` to null and `active_quests` to []; `update_progress` processes only `xp`. So every load rerolls the three quests (near-duplicates like 'Végezz el 3 feladatot' and '…5 feladatot' — "Complete 3/5 tasks" — together) and adds +1 to the streak (12 → 13 on load with no lesson). For guests it is +1 per day opened. Nothing resets a streak or consumes a shield, yet the shop sells shields for 100 bones in one tap. There is no daily goal or "today" state. The goal picked on day 1 is saved under a key the server never reads, and is never shown again.
- **Learner impact:** the streak — the main daily motivator — means nothing, and the paid shield does nothing.
- **Fix:** ship with WP-B1/B3: streak = at least one completed lesson per local day; quests persisted per local day; a shield consumed automatically ('Lexi őrködött' — "Lexi stood guard"); shields capped at 2 and pulled from the shop until they work; a daily-goal ring. Keep existing inflated numbers and count honestly from the fix onward. Quest copy 'Fejezz be 3 leckét' ("Finish 3 lessons").
- **Effort:** M
- **Where:** `context/UserContext.tsx:190-235,353-380`, `api.php:973-990,1102-1112,1221-1260`, `components/modals/ShopModal.tsx:20-32`, `components/LessonPlayer/PostLesson.tsx:75-83`
- **Related:** SOT §8, §15, WP-B1, WP-B3; C34, C35, C39, C61, N9; decision Q10.

### C34 · Streak, energy and bones are invisible on the phone home screen and unlabelled in the drawer — **major**
- **What happens:** below 992 px the stats bar exists only as the top row of the off-canvas right drawer, so the phone path screen shows no streak, energy or bones; the only energy check is a failed start. In the drawer they are icon + number, labelled only in `title` tooltips ('Napi Széria', 'Energia', 'Jutalom Falatok' — "Daily streak", "Energy", "Reward treats"). Owned shields are computed and never rendered. 'Személyes szint' ("Personal level") reads a value React never writes: new users are stuck at 'Level 1', migrated legacy users show a frozen old level (1,240 XP → Level 13). Profile shows no streak or energy.
- **Learner impact:** on the primary device the daily motivators hide behind a tab called 'Statisztika' ("Stats").
- **Fix:** reuse the `top-stats-bar` markup as a sticky ≤48 px phone HUD under the safe-area inset — streak with shield badge, energy with refill time, bones — as chips that open labelled sheets. Define or remove 'Személyes szint'. **Only after C27**, or it puts an inflating streak on the home screen.
- **Effort:** S–M
- **Where:** `components/SidebarRight.tsx:39-61,67-111,121-128`, `pages/ProfilePage.tsx:147-151`
- **Related:** SOT §5, §8 ("Personal Level" is permanently 1), WP-B3 (its "Personal Level" row); C27, C28, C61, N5.

### C26 · Bones are ~100× out of balance, and chests never say what they paid — **major**
- **What happens:** a lesson pays 1 bone (3 premium) and quests 1–2 (+2 for all three), and quest cards don't show the reward; the shield costs 100, themes 200 and 500. Logged-in users also get +20 bones per feedback-widget submission (server limit 10/hour), so the shop is minutes away for anyone who spams feedback and months away for anyone who learns. Unaffordable items are disabled with no "you need N more". Chests pay bones and energy only in Module 4; elsewhere a silent +50 XP behind 150-particle confetti that ignores reduced motion, and the opened chest reuses the closed art. Guests start with 100 bones.
- **Learner impact:** learning barely pays, the chest feels like nothing, and the economy rewards the wrong behaviour.
- **Fix:** rebalance to roughly 30 bones on a daily-goal day; cap or remove the +20 feedback reward; '+N 🦴' on quest cards and a 'még 60 🦴' ("60 more") pill; a CSS-desaturated opened chest with a ✓; a `<button>` wrapper; `disableForReducedMotion`; a reveal sheet with itemised rewards (tyler-jump + coin burst, existing art). Reward maths must move server-side first.
- **Effort:** M
- **Where:** `components/modals/ShopModal.tsx:20-40,123-161,183-190`, `context/UserContext.tsx:195-202,445-476`, `components/Roadmap.tsx:44-81,231-247`, `utils/roadmapLoader.ts:97-105`, `components/icons/TreasureChest.tsx:24-43`, `components/LexiFeedbackWidget.tsx:12-26`, `api.php:1798-1813`
- **Related:** SOT §8, §21 Q16, WP-B2, WP-B3; C31, C53, N10.

### C28 · Zero energy leads to an English survey with a broken image, or a native paywall alert — **major**
- **What happens:** energy is deducted before a lesson starts and never shown on the node. At 0, 'INDÍTÁS' ("Start") opens an English 'Help Lexi Improve!' survey whose image `lexi-mascot.png` does not exist; within the 1-hour cooldown it is instead a native `alert('Nincs elég energiád! … vagy fizess elő a korlátlan tanulásért!')` ("Not enough energy! … or subscribe for unlimited learning!") with no wait time, for a subscription that doesn't exist. Guests get 'Unauthorized' (English) from the survey, and it throws on any database built from migrations (`user_metadata` missing). Nothing auto-starts after a refill. Energy is a bolt in the drawer and a 🔋 in the modal.
- **Learner impact:** engaged learners hit a broken, foreign-language dead end exactly when they want to keep going.
- **Fix:** '⚡ 1' on the start button; the HUD chip (C34); a localised rest sheet (tyler-sitting-front, within the pixel ceiling) with the refill time and free options — practice, sounds, a story, capped (C-6); the survey for logged-in users only, auto-start after refill; no subscription line until payments exist.
- **Effort:** S–M
- **Where:** `pages/Dashboard.tsx:101-131,219-221`, `components/modals/FeedbackRefillModal.tsx:35-62,72-78`, `components/Roadmap.tsx:283-291`, `api.php:1879-1884`
- **Related:** SOT §8, §11, §21 Q17, WP-B3 (the missing `user_metadata` table), WP-B4, WP-G1 (the `lexi-mascot.png` 404); C19, C60, C71; decision Q9.

### C29 · League reward popup: dark-only, clips at 320, no close, traps on failure, reloads the app — **major**
- **What happens:** the weekly RewardPopup is a hard-coded navy card in every theme; 'Gratulálunk!' ("Congratulations!") is repainted purple (2.33–3.30:1) and white on the amber 'Begyűjtés!' ("Collect!") is 2.15–3.2:1. At 320×568 the card runs from y=−45 to 613 with no scroll. There is exactly one button; Escape and backdrop taps do nothing. If `claim_reward` fails nothing advances or explains, and because the reward stays pending, the overlay returns on every dashboard load. After the last claim it calls `window.location.reload()`. It never names the league and calls the shield 'Menedék' ("Shelter").
- **Learner impact:** a failing claim can lock a learner out of the dashboard.
- **Fix:** a themed bottom sheet (`max-height: 100dvh`, scroll, safe-area inset) with 'Később', an error-with-retry state, a context update instead of a reload, `role=dialog`; name the league ('Ezüst liga · 2. hely' — "Silver league · 2nd place") from the `league_id` already in the payload.
- **Effort:** S–M
- **Where:** `components/RewardPopup.tsx:21-69,77-121`, `components/RewardPopup.css:1-25,47-55,103-117`, `assets/css/dashboard.css:2999-3006`
- **Related:** SOT §8, §12; C49, C61, C71.

### C31 · Shop breaks on phones: buy button off the card, one-tap irreversible purchases, errors shown as success — **major**
- **What happens:** each row's price button overflows: at 360 '🦴 100' spans x=285–362, past the card, the modal and the viewport; at 390 it overflows the card only; at 320×568 about 18 px stays visible and a sideways swipe reveals the rest. The gradient header is 183 px (32% of 568) and 'Bolt' ("Shop") is purple at 1.4–1.8:1. Price buttons are 77×38, the close 32×32. A purchase takes 100 bones in one tap with no confirmation, undo or cap (the server clamps shields to +3 per save but still deducts the bones). The result banner is green even for '❌' errors, and a bought theme isn't offered for activation. Strings mix Hungarian and English ('Power-Ups', 'Streak Shield', 'Fall Téma' — "Fall theme").
- **Learner impact:** younger users can spend their whole balance by accident, and errors look like success.
- **Fix:** a bottom sheet with a 56 px header; the full-width 44 px price button under the text at base width; a confirmation sheet showing the remaining balance; a red error state; 'Kipróbálom most' ("Try it now"); locale keys; a history entry so Back closes it.
- **Effort:** S–M
- **Where:** `components/modals/ShopModal.tsx:20-49,66-77,99-136,164-170`, `assets/css/dashboard.css:2999-3006`, `api.php:1047-1049`
- **Related:** C22, C26, C27, C49, C60.

### C30 · Leaderboard rows are unstyled and your own rank is buried — **major**
- **What happens:** rows use `className="rank-card"` but the only row styles target `.leaderboard-row`, so each row is `display:block` with no padding (130–160 px tall) and rank, initials, name and XP stack. At 390×844 the first row is at y=587 and your own row (rank 23) at y=2,026 with 10 mocked rows; production returns up to 100/200. The page always opens on Bronze and doesn't mark your league; tabs are non-focusable divs; there is no bottom bar; gold and silver text is 1.32–1.82:1 in light; a failed search — or a network error — is `alert('Felhasználó nem található.')` ("User not found."); the countdown ticks every second.
- **Learner impact:** the Beta's social pillar is a long, broken list.
- **Fix:** the one-line className fix plus 56 px rows (reuse the drawer's "top 3 + you ±2" row); open on the caller's league (a server default when `league_id` is omitted); a sticky own row; `<button role="tab">` chips; hour-precision countdown; text-safe rank colours. The league-aware part waits for decision Q11.
- **Effort:** S (layout) / M (league-aware)
- **Where:** `pages/Leaderboard.tsx:19-20,42-54,82-111,206-234,262-283,340-376`, `api.php:1406-1446`
- **Related:** SOT §5, WP-C3, WP-E0 (bot accounts); C35, C66, N7.

### N10 · Finishing a node, a module or A1 is silent, and the path just ends — **major**
- **What happens:** `isNodeComplete` reaches `completeLesson` but nothing renders on it; after node 29 there is blank space.
- **Learner impact:** the course's biggest achievements pass unacknowledged, and the end of A1 offers no next step.
- **Fix:** a node-complete stamp, a module-complete sheet (tyler-jump plus a summary), and an 'A1 kész! Mi jön?' ("A1 done! What's next?") card — all existing art. The module exams (WP-F4) hook into the same moment later.
- **Effort:** S–M
- **Where:** `context/UserContext.tsx:413-417,481`, `components/Roadmap.tsx` (end of path)
- **Related:** WP-F4; C25, C26, C40.

### N8 · "We miss you" e-mails go to learners who practise every day — **major**
- **What happens:** inactivity is keyed on `last_login_at`, which is written only at password login. A daily learner who stays signed in gets the loss-framed 'Hiányzol nekünk… már pár napja nem léptél be' ("We miss you… you haven't logged in for a few days") on day 2, day 4, then weekly; its button goes to the marketing page.
- **Learner impact:** the most active learners are told they are inactive.
- **Fix:** key on the last lesson date; skip anyone active today; gain-framed copy; link to `/dashboard` (an app link once N12 lands). Nothing writes a "today" activity date yet: `last_active_date` is never set to `CURDATE()` (SOT §16 P0 #3c).
- **Effort:** S
- **Where:** `cron_notifications.php:19-22`, `api.php:734`, `mailer.php:42-51`, `templates/emails/inactivity.php`
- **Related:** WP-B1's cron prerequisite edits the same file and proposes the `last_active_date = CURDATE()` writer this fix needs, so do them together; C27, C35, N12.

### C35 · Loss-framed pressure mechanics for an all-ages audience — **minor**
- **What happens:** day 1's first success is followed by a red '⚠️ Vigyázz! A szériád törlődik, ha holnap nem gyakorolsz!' ("Careful! Your streak resets if you don't practise tomorrow!") — a loss that can't happen, since nothing resets streaks, shown before the tutorial silently credits a shield. The week strip fills past days as practised on any day but Monday, and future days are invisible (an invalid border token). The streak '1' renders purple. The leaderboard countdown ticks per second, with "urgency" as its written intent; the energy alert pushes a nonexistent subscription; 'juss feljebb a ligákban' ("climb the leagues") promises movement that lifetime-XP tiers can't deliver.
- **Learner impact:** anxiety cues on day 1, several of them untrue.
- **Fix:** gain-framed copy in the streak colour; fill only practised days; a visible future-day outline from a valid token; hour-precision countdown; no red box before day 3; league copy that matches the league model. Copy and CSS only.
- **Effort:** S
- **Where:** `components/LessonPlayer/PostLesson.tsx:458-511`, `pages/Leaderboard.tsx:42-54,254-256`, `locales/hu.json` (`post_lesson.streak_caution`, `dashboard.not_enough_energy`)
- **Related:** C27, C28, C30, C49, C63; decision Q11.

### C32 · Purchased themes revert after a save, and Halloween degrades the stats drawer — **minor**
- **What happens:** the Profile select writes `scores.active_theme`, `save_progress` stores the column as 'default', and on the next load `UserContext.tsx:139-141` maps it back to 'system'. **The same round trip resets a logged-in user's explicit Light or Dark choice to System on every load**, which is the part of this cluster that matters most under the both-themes constraint. With Halloween active, `.stats-widget` floats (`pulseSlime`, `spookyFloat`) against the 'Bezárás' ("Close") button and the translucent surface lets the path show through; the text stays legible. Fall and Halloween are dark palettes that override a light-mode user.
- **Learner impact:** few learners can afford a theme; everyone who picks Light or Dark loses the choice.
- **Fix:** WP-B3's theme round-trip row, prioritised for the light/dark revert; opaque surfaces; no float on `.stats-widget`; 'Alkalmaz' ("Apply") after purchase; label Fall and Halloween as dark themes rather than build light variants.
- **Effort:** S
- **Where:** `context/UserContext.tsx:139-141,270-287`, `pages/ProfilePage.tsx:72-79,248-262`, `assets/css/main.css:1069-1081,1199-1214`, `api.php:984`
- **Related:** SOT §8, WP-B3; C51, C69; decision Q14.

### C33 · Achievement toasts: wrong unlocks, English titles, covering the bottom nav — **minor**
- **What happens:** unlock checks don't backfill, so a 12-day, 1,240-XP user gets 'First Steps', 'On a Roll' and 'Overachiever' in sequence (~16 s) after a 0% lesson. Titles are English under 'Eredmény feloldva' ("Achievement unlocked"). At 360 the toast wraps into a 180×122 capsule at `bottom: 20px` that covers and swallows taps on 'Tananyag', 'Bolt' and 'Statisztika'; no dismiss, no safe-area inset, no `aria-live`.
- **Learner impact:** navigation is blocked for up to ~16 s, once per achievement.
- **Fix:** achievements as a card in the post-lesson sequence; localised titles; silent backfill for existing users. If a toast survives: above the bar plus the inset, tap to dismiss, `role=status`.
- **Effort:** S
- **Where:** `components/AchievementPopup.tsx:1-93`, `context/UserContext.tsx:478-504`
- **Related:** SOT §8, §9; C24, C25, C60.

## 4.5 Home & navigation (including the app shell)

**Verdict:** the path, the chest and the bottom bar are the right skeleton, but there is no history model, no consistent tab semantics, no way home from three routes, and the path opens at the top. Loading, error and session states are undesigned, and native dialogs and page reloads stand in for app UI — which the wrapper will expose.

### C22 · No history model: Back abandons lessons, loses the first lesson, and replays the tutorial — **critical**
- **What happens:** the lesson player, PostLesson, drawers, level modal, shop and avatar modal are React state with no history entry, while cross-route tab taps do push one. Android's system Back is `history.back()` — in Chrome today and in a Capacitor WebView — so Back mid-lesson silently unmounts it (answered items lost), Back on PostLesson screen 1 leaves before the lesson is committed, and Back with a drawer open changes route. `FTUELesson` pushes `/dashboard`, so Back from the first dashboard re-opens `/lesson/ftue` and replays the tutorial, re-granting energy 5, +5 bones, +1 shield and streak 1 (with a 'Flawless' toast over CHECK). The ← on a deep-linked page is a dead button. ✖ exits without confirmation and there is no resume. Re-entering a node costs no energy.
- **Learner impact:** the most natural gesture on Android throws away work and corrupts rewards.
- **Fix:** worst cases first (S): `navigate('/dashboard', {replace:true})` at `FTUELesson.tsx:35` and a redirect from `/lesson/ftue` once onboarding is done; a persisted `tutorial_done` flag; commit before PostLesson (C36); a quit-confirm sheet. Then (L): lesson and sheets as routes or pushState entries; a Capacitor `backButton` listener that closes the top overlay first; a `location.key === 'default'` fallback to `/dashboard` for ← buttons.
- **Effort:** S (worst cases) / L (full)
- **Where:** `pages/Welcome/FTUELesson.tsx:19-40`, `components/LessonPlayer/PostLesson.tsx:55-89`, `components/LessonPlayer/LessonPlayer.tsx:134-135`, `context/UserContext.tsx:440-444,514-517`, `pages/Dashboard.tsx:26-29,101-131,171-201`, `components/MobileBottomBar.tsx:17-27`, `pages/FriendsPage.tsx:120`, `pages/ProfilePage.tsx:125`
- **Related:** C24 (shared "top overlay" concept), C36, C66, C71, N12.

### C66 · No coherent app IA: three routes lack the bottom bar, no Home item, the logo goes to marketing, five tab behaviours — **major**
- **What happens:** `/practice`, `/characters` and `/leaderboard` render no bottom bar, only a 44×44 '☰' that overlaps the Characters heading. The drawer has no Home/Learn item ('Kezdőlap' — "Home" — exists at `hu.json:3` and is never rendered), and its logo links to `/`, the marketing landing. Where the bar exists its five tabs behave five ways: 'Szintek' opens the whole app menu, 'Tananyag' only closes drawers, 'Bolt' opens a modal and leaves the previous tab highlighted, 'Statisztika' opens a second drawer, 'Profil' is a route. Desktop Profile and Friends show no navigation, only a ←. Routes back exist (☰ → Profilom → Tananyag) but are hidden.
- **Learner impact:** from three screens, the home of the core loop has no visible route back; the working routes are hidden in the drawer.
- **Fix:** now (S): render `MobileBottomBar` on every signed-in route, add a Learn item to `/dashboard`, point the in-app logo at `/dashboard`. Structural (L, decision Q11): an AppShell layout route with `<Outlet/>` and four routed tabs — Tanulás, Gyakorlás, Liga, Profil ("Learn, Practice, League, Profile") — with the shop as a sheet from the bones chip and a `/settings` route.
- **Effort:** S (now) / L (restructure)
- **Where:** `pages/PracticePage.tsx:78-93`, `pages/Characters.tsx:158-170`, `pages/Leaderboard.tsx:237-249`, `components/SidebarLeft.tsx:125-210,405-415`, `components/MobileBottomBar.tsx:17-76`, `pages/Dashboard.tsx:72-88,171-185`, `pages/ProfilePage.tsx:125,407`
- **Related:** SOT §16 P2 #34, WP-C3; C19, C22, C69.

### C67 · The path opens at the top, not at the current node — **major**
- **What happens:** `Dashboard.tsx:67-70` calls `window.scrollTo(0,0)` on mount and nothing scrolls to the current node. From node 4 on it is below the fold at 360×800; module banners sit at y=72 … 5,608 (page height 6,676 px), so a Module-7 learner scrolls about 5,600 px on every visit. Re-tapping 'Tananyag' doesn't scroll, returning from Profile resets to the top, and finished modules never collapse.
- **Learner impact:** "what's next?" is several screens away, every time.
- **Fix:** `scrollIntoView({block:'center'})` on one anchor — the first unfinished node in path order, since several nodes can be 'current' — on mount and on a Learn re-tap (`behavior:'auto'` under reduced motion); a floating 'Folytatás' ("Continue") pill when the node is off-screen; finished modules collapsed to one line.
- **Effort:** S
- **Where:** `pages/Dashboard.tsx:67-70,171-185`, `components/Roadmap.tsx:89-130`
- **Related:** C66, C68; §5a.

### C68 · Locked nodes start real lessons and spend energy; current and completed look alike — **major**
- **What happens:** neither the node click, 'INDÍTÁS' nor `handleNodeClick` checks status. A locked grey node opens the same tooltip and starts a real lesson (a Module-1 learner started Module-2 and Module-3 lessons; a guest lost energy — for logged-in users the deduction is client-side only). Completed nodes charge energy for a replay with no "practise again" framing. An inline `background:'none'` overrides the state gradients, so current and completed nodes share one star-island look, and 'Kezdés' ("Start") shows on half-done nodes. Any node with progress becomes 'current', so a stray locked-node lesson creates a second current node.
- **Learner impact:** beginners can wander into Module 4 by accident, and the path doesn't show where they are.
- **Fix:** a locked tooltip with the reason and 'Ugrás oda' ("Go there") → the current node; 'Gyakorlás újra' ("Practise again") with the energy cost on completed nodes; a distinct current-node ring and 'Folytatás' once it has progress; fix the multi-current logic. If skipping ahead is wanted, do it through the WP-F4 module exam (C-14).
- **Effort:** S
- **Where:** `components/Roadmap.tsx:194-213,253-291`, `pages/Dashboard.tsx:101-131`, `assets/css/roadmap.css:70-98`, `assets/css/dashboard.css:3386-3392`
- **Related:** SOT §12, WP-F4; C24, C67; decision Q12.

### C71 · Native alert()/confirm() and full-page reloads are the feedback, destructive-action and navigation UI — **major**
- **What happens:** 19 `alert()`/`confirm()` calls in 9 files (the Profile and Friends ones in English). Several flows reload or leave: Profile's language change sets `window.location.href` to another origin (`https://lexipaws.sk/`) and lands on `/`; avatar upload and the last reward claim reload; guest login buttons write a `forceLoginModal` key nothing reads. The drawer's 'Kijelentkezés' ("Log out") is one tap with a full reload; Profile's logout asks an English confirm; 'Delete Account' confirms, then says to contact support with no link — no delete endpoint exists.
- **Learner impact:** in the wrapper these become OS dialogs titled with the origin and white-flash restarts; the domain jump logs the learner out.
- **Fix:** one localised Toast and one bottom ConfirmSheet cover all 19; context updates and `navigate()` instead of reloads; in-place `i18n.changeLanguage`; guest CTAs to `/?login=true` or `/?register=true`; honest delete copy with a mailto until real deletion exists (needed for App Store guideline 5.1.1(v)).
- **Effort:** M
- **Where:** `components/SidebarLeft.tsx:95-123,292-302`, `components/SidebarRight.tsx:167,177`, `pages/ProfilePage.tsx:44-56,284-293,383-401`, `components/modals/AvatarUploadModal.tsx:64-72`, `components/RewardPopup.tsx:55-62`, `pages/FriendsPage.tsx:74-99`, `pages/Dashboard.tsx:115`, `pages/Leaderboard.tsx:110`, `components/LessonPlayer/PostLesson.tsx:77`, `pages/Characters.tsx:75`, `pages/PracticePage.tsx:24,46,55`, `pages/Welcome/PlacementScreen.tsx:36`, `pages/NotFoundPage.tsx:6-9`
- **Related:** SOT §5, §15, §16 P2 #30, §21 Q23, WP-B4; C22, C41, C60.

### C46 · Loading, session-error and 404 states: blank screens, wrong-state flashes, and exits — **major**
- **What happens:** `index.html` ships an empty `#root`, and the landing waits for one 1.73 MB (360 KB gzip) bundle with every route and all curriculum; there is no `React.lazy`. Home treats loading as guest, so a returning user sees the guest CTAs flip to 'Szia, …! / VISSZA A FELÜLETRE' ("Hi, …! / Back to the app"). `RequireAuthenticated` returns null, so guarded routes show a blank gradient and Profile's own skeleton never mounts. A `get_session` 500 demotes a signed-in learner to `/?login=true` with no reason, and after login everyone lands on `/dashboard`, not the page they asked for. The 404 uses an OS 🐕 partly under the header, and its links lead to the marketing page.
- **Learner impact:** blank or wrong screens on every slow start, and silent logouts on a server hiccup.
- **Fix:** lazy-load authenticated routes, the player, Joyride and curriculum; a skeleton app shell in the guard instead of null; a neutral CTA skeleton while the session loads; a retry banner instead of demotion when `get_session` fails; a safe `?redirect=` (which also closes the open redirect, WP-E4); a cel head on the 404.
- **Effort:** M
- **Where:** `index.html:39`, `App.tsx:35-48`, `pages/Home.tsx:59-60,66-99,156-175`, `pages/ProfilePage.tsx:58-70`, `context/UserContext.tsx:169`, `pages/NotFoundPage.tsx:5-38`, `utils/roadmapLoader.ts:25-26`
- **Related:** SOT §3, §5, §16 P2 #29, §18, WP-B4, WP-E4; C55, N3, N4.

### C37 · Ad-hoc z-index: the fixed header covers modals, and the feedback button covers content — **major**
- **What happens:** the header carries an inline `zIndex: 9999` while `.modal-overlay` is 2000 and top-aligned at ≤480 px, so the 70 px header covers the first ~58 px of every modal: auth tabs and beta titles. In 'Elfelejtett jelszó' ("Forgot password") the visible exit '← Vissza a bejelentkezéshez' ("Back to login") sits under the header, with no close, Escape or scrim close; submitting any address reaches a screen with a visible back button, so it is not a hard trap. The reset view has no cancel. On `/dashboard` for logged-in users the floating feedback button (z 999) shows a missing image clipped to 'Feedb', overlaps the Útmutató button and sits above the stats drawer; its copy is English.
- **Learner impact:** the auth screen — the wrapped app's likely first screen — looks broken and hides its own exits.
- **Fix:** stopgap: header below the overlay (or overlay above 9999). Proper: a z-index scale plus a portal (WP-C1); header `inert` while a dialog is open; X/←, Escape and scrim close on every auth sub-view; hide the feedback button while overlays are open, point it at an existing cel and localise it (or move it into Settings/Help).
- **Effort:** S
- **Where:** `components/Header.tsx:17`, `assets/css/main.css:363-384,909-913`, `components/AuthModal.tsx:186-271`, `components/LexiFeedbackWidget.tsx:12,40-84`
- **Related:** SOT §13, WP-C1, WP-G1; C24, C52.

### C70 · Friends page overflows and clips its buttons on phones, is all English, and mislabels Decline — **major**
- **What happens:** at 360 the page container is 430 px wide (the documented flex-body rule lets the add-friend row size it), so 'SEND REQUEST', 'Decline' and 'Remove' are cut at the edge; at 390 the cards' right borders are cut and 'Remove' hides behind the bottom bar. Every h2 is 40 px purple gradient; avatars are blank (`/avatars/default.png` 404s); back is 28×33 and the actions 34–36 px. All copy is English. 'Decline' calls the remove handler and confirms 'Are you sure you want to remove this friend?'. A failed `get_friends` shows 'My Friends (0)' with no error. Friends is reachable only via Profile → 'Friends List'.
- **Learner impact:** the social surface is broken on the primary device and foreign in both markets.
- **Fix:** rebuild mobile-first: input and button stacked at base width, 44 px targets, neutral Decline without a confirm, Remove behind an overflow menu, an empty state with a `navigator.share` CTA (the native share sheet in the wrapper), a failure state with retry, bottom padding for the tab bar, a cel-head default avatar.
- **Effort:** M
- **Where:** `pages/FriendsPage.tsx:31-40,74-99,117-208`, `pages/ProfilePage.tsx:157`
- **Related:** SOT §9, §13, WP-C3, WP-G1; C49, C60, N7.

### N4 · One malformed stored value bricks the whole app on that device — **major**
- **What happens:** with `scores: null` in stored guest progress, every route crashes, including `/`, and both buttons on the Hungarian-only crash screen (purple heading) lead back into the crash. Stored data is spread without validation, and the single app-wide `ErrorBoundary` offers only reload or home.
- **Learner impact:** in the wrapper the only way out is clearing app data, which deletes the learner's progress.
- **Fix:** one normaliser with a schema version for all stored and server state; route-level boundaries with 'Reset local data' and Report.
- **Effort:** S–M
- **Where:** `context/UserContext.tsx:170-182`, `components/ErrorBoundary.tsx`
- **Related:** WP-B4; C46, C49, N5.

### N12 · E-mail links will leave the wrapped app, and the session won't follow — **major** (wrapper milestone)
- **What happens:** every e-mail CTA is a plain web URL, and there is no `.well-known` app-links file. In Capacitor the link opens the browser, which has its own cookie jar, so the learner is logged out when they get back to the app; after a password reset they must retype both e-mail and password. Invite and reset links arrive as query params on `/`.
- **Learner impact:** invite, reset and reminder e-mails break the very flow they are meant to start.
- **Fix:** path routes (`/invite/:code`, `/reset/:token`) plus Android App Links and iOS Universal Links; sign the user in after a reset.
- **Effort:** M
- **Where:** `templates/emails/*.php`, `mailer.php`, `App.tsx:53-56`, `pages/Home.tsx:54-58`
- **Related:** C23, C71, N8, N11.

### C23 · No app-shell layer for the wrapper — **minor** (a release blocker for the wrapper milestone)
- **What happens:** `index.html:6` lacks `viewport-fit=cover`, so all 25 `env(safe-area-inset-*)` uses resolve to 0. There is no manifest, `theme-color` or touch icon, and the favicon is Vite's purple bolt. No tap-highlight or touch-callout reset; ~96 `:hover` selectors without a `(hover:hover)` guard and 18 `onMouseOver` handlers stick on touch. GA, Nunito and Headway load from third parties in `<head>`, so an offline first launch falls back. 100vh remains in 32 places (100dvh is already used 30 times). Today's mobile-web learner only sees sticky hover; the rest is about the wrapper.
- **Learner impact:** little today; at wrap time the header, tab bar and lesson footer will sit under the system bars.
- **Fix:** mostly one-line config: `viewport-fit=cover, interactive-widget=resizes-content`; `theme-color` per scheme; a manifest and icons cut from 'Lexipaws app logo and icon.png'; touch resets; `@media (hover:hover)` around hover rules; self-hosted Nunito (latin + latin-ext, including 900). Turning on `viewport-fit` wakes 25 dormant rules at once — test 320–390 in both themes.
- **Effort:** S–M
- **Where:** `index.html:5-36`, `public/favicon.svg`, `assets/css/main.css:378,404,912`, `assets/css/dashboard.css:19,22-40,1857-1858`, `assets/css/interactive.css:528-1122`
- **Related:** SOT §13, WP-G1; C22, C50, N12; F3.

### C69 · Profile and settings: split in two places, dead toggles, no progress summary — **minor**
- **What happens:** the drawer holds volume, reduced motion and theme (paid themes bought via `confirm()`); Profile holds theme again, an English 'Nameplate', 'Study Language / Domain', 'Hangeffektek' ("Sound effects") and notifications, and the two sets disagree. The sound switch is `defaultChecked` with no `onChange`; the volume shows 50% while audio plays at 1.0. There is no password change, though the `update_password` endpoint exists. Profile is a 2,745 px column showing XP, bones and 'FREE PLAN' but no streak, level or course progress, with a generic 🧑‍🎓 avatar. Every page has a different header pattern.
- **Learner impact:** settings don't do what they say, and Profile doesn't show progress.
- **Fix:** one `/settings` route with grouped rows: a working sound switch, the true volume, reduced motion defaulting to the OS, password change on the existing endpoint, help and legal. Profile becomes an "about me" stats screen with a cel-head default avatar.
- **Effort:** M
- **Where:** `components/SidebarLeft.tsx:27-54,85-123,221-291`, `pages/ProfilePage.tsx:121-150,244-409`, `utils/audio.ts:68-75`, `api.php:127,1285-1306`
- **Related:** SOT §5, §6; C21, C53, C71, N2.

### N2 · The desktop left rail cuts off its bottom items at common laptop heights — **minor**
- **What happens:** `.dashboard-left-sidebar` is fixed, 1,044 px tall, with `overflow-y: hidden`. At 1366×657, 1280×720 and 1024×768 the four legal and contact links can't be reached; with 'Beállítások' ("Settings") open, 'Probléma jelentése' ("Report a problem") drops off too.
- **Learner impact:** the privacy policy and out-of-lesson reporting vanish on the most common laptops.
- **Fix:** `overflow-y: auto` now; help and legal move into `/settings` (C69).
- **Effort:** S
- **Where:** `assets/css/dashboard.css:3729-3735` (`overflow: hidden !important`), `:4404-4426` (the fixed rail at ≥992 px)
- **Related:** C09, C69.

## 4.6 Pronunciation & practice

**Verdict:** both modes are good ideas with real content — a sound curriculum aimed at HU/SK interference and 21 stories — but the sound drills fail correct answers, fake the speaking step and never teach, and the practice hub hides itself and praises the learner when it fails to load.

### C13 · Same/different sound drill marks every correct answer wrong — **critical**
- **What happens:** `PhonicsCompare`'s reset effect depends on `onAnswer`, and `LessonPlayer` passes a new handler on every render. So a correct tap is undone within ~100 ms (select → `onAnswer(true)` → re-render → effect → deselect → `onAnswer(false)`), while a wrong tap stays and scores wrong. All 200 reachable phonics_compare items (about two per sound lesson) are unwinnable: a perfect run ends at 60% (13 XP credited, '+15' shown), and for logged-in users every false failure is logged, filling Mistakes with items that can never be passed. Both words also replay after every re-render. The mode is reached from the 'Szintek' drawer, not the main path.
- **Learner impact:** 100% reproducible for anyone who opens a sound lesson; it tells learners their ears are wrong.
- **Fix:** hold `onAnswer` in a ref (or depend only on `question`), `useCallback` the handler, key exercises by index, reset `selectedAnswerCorrect` on advance, add a regression test. Clean up the logged false failures with a reviewed one-off SQL that the owner runs — `dev` shares the live database.
- **Effort:** S
- **Where:** `components/LessonPlayer/exercises/PhonicsCompare.tsx:24-51`, `components/LessonPlayer/LessonPlayer.tsx:220-222,273-281,325,371-381`, `pages/Characters/CharacterLesson.tsx:23`
- **Related:** C02, C14, C15, C18.

### C15 · Speaking exercise pretends to listen and always says 'Kiváló!' — **major**
- **What happens:** phonics_speak closes every sound lesson (200 reachable items) and never opens a microphone — no `getUserMedia`, `SpeechRecognition` or `MediaRecorder` exists in `src`. 'FIGYELEK...' ("Listening...") is a 2-second timer followed by `onAnswer(true)`, so CHECK then says 'Kiváló! Helyes válasz.'. On a second consecutive item the mic is disabled but looks enabled and CHECK passes on the stale value; when a correct listen-choose precedes it, CHECK **without touching the mic** is praised. The speaker is a grey silhouette, not Lexi. Rated major because it is owner-known and blocks nothing in a secondary mode — but it ends every sound lesson on a dishonest note.
- **Learner impact:** learners are told their pronunciation is excellent when nothing listened.
- **Fix:** an ungraded 'Mondd utána!' ("Repeat after me!") step with a reused Lexi head, replay and slow replay, and a neutral advance; outside accuracy and XP; delete 'FIGYELEK...'; key by index. Keep the orange "can't speak now" skip. Record-and-compare is a later feature behind the mic permission.
- **Effort:** S
- **Where:** `components/LessonPlayer/exercises/PhonicsSpeak.tsx:11-37,55-61,87-134`, `components/LessonPlayer/LessonPlayer.tsx:146,220-222,265-267`
- **Related:** SOT §6, §16 P1 #13, §21 Q20; C01 (skip chime), C02, C13; decision Q8.

### C14 · Homograph sound items show two identical words and cannot be answered by ear — **major**
- **What happens:** the generator paired homographs (bow/bow, sow/sow, row/row, mouth/mouth). In both `data/hu` and `data/sk`: 8 listen-choose items offer two identical options (a coin flip); 4 compare items play the same spelling twice with `isSame: false` (TTS reads both identically); 3 match items have duplicate pairs, which create duplicate React keys, so the matched count never reaches 4 and the item is always wrong. 15 items in 3 of ~100 sound sub-lessons; vowels_o_ow L1 opens on 'bow | bow'.
- **Learner impact:** glaring where it occurs, and unwinnable by listening.
- **Fix:** replace them with pairs already in the same file (no/now, boat/bout, coat/cow, goat/gout); validator rules for unique options and pairs and no `word1 == word2` with `isSame:false`; key PhonicsMatch tiles by index or id, not text. Ship with C13.
- **Effort:** S
- **Where:** `data/hu/characters/vowels_o_ow.json:15-43,90-99`, `data/hu/characters/cons_th_th.json:155-180`, `components/LessonPlayer/exercises/PhonicsMatch.tsx:19-31,64-76`, `…/exercises/PhonicsListenChoose.tsx:72-78`
- **Related:** WP-F2; C13.

### C16 · The pronunciation mode never teaches, and its name doesn't say what it trains — **major**
- **What happens:** the mode is labelled 'Karakterek' / 'Znaky' ("Characters") with a typography icon, and its 39 tiles lead with bare IPA glyphs, some of which collide with HU/SK letter values (IPA s is Hungarian 'sz'). The page heading does explain the purpose — hard-coded in Hungarian, so Slovak learners get Hungarian. The 950 phonics items carry only test fields (no tip, explanation or translation), group titles are never shown, and about 9% of items use invented words (fope, yorn, zoze). PhonicsMatch and the grid call `speechSynthesis` directly, so one lesson can use two voices. The grid and several strings reproduce Duolingo's Hungarian sound drills.
- **Learner impact:** beginners drill sounds without being told how to make them or why these ones matter to them.
- **Fix:** rename to 'Kiejtés' / 'Výslovnosť' ("Pronunciation"); an intro item per group with an existing Lexi pose; show the group title; one audio pipeline; replace invented words or label them 'kitalált szó' ("made-up word"); HU/SK meanings after CHECK (owner-teacher content); i18n the page. The copied strings are polish.
- **Effort:** M (+ owner content)
- **Where:** `pages/Characters.tsx:79-84,133-134,175-178`, `src/data/characters_data.ts:7-50`, `components/LessonPlayer/exercises/PhonicsMatch.tsx:36-43`, `components/SidebarLeft.tsx:189-191`
- **Related:** SOT §6; C17, C21, C57, C59; decision Q8.

### C17 · Sound progress model: random start, groups retired by shared sounds, progress only on the device — **major**
- **What happens:** progress is counted per IPA symbol in `localStorage` for everyone, including logged-in users, and never synced. 'Kezdés: +10 Pont' ("Start: +10 points", a hard-coded literal) picks a random group whose first symbol is under 5, so finishing θ/ð also retires `cons_th_s_f` and `cons_th_d_z` — groups never done — while showing full bars; tapping a tile only speaks. On a new device the bars reset while the level comes from synced `node_state`. Logout doesn't clear the key, so progress leaks between accounts. '+10' matches neither the '+15' shown nor the XP credited; "all done" is an `alert()`. The page is 3,624 px tall with its only CTA at the top. The data's own `id` also overrides the `char_lesson_` prefix, so PostLesson never recognises a character lesson.
- **Learner impact:** learners can't choose a sound, lose progress across devices, and inherit someone else's on a shared one.
- **Fix:** derive completion from the synced `node_state[groupId]`; a group-card list with a sticky 'Folytatás'; put `id` after the spread; clear the key on logout.
- **Effort:** M
- **Where:** `pages/Characters.tsx:15-18,42-77,98,204`, `pages/Characters/CharacterLesson.tsx:14-44`, `utils/guestProgress.ts:47-51`, `components/SidebarLeft.tsx:116-122`, `components/LessonPlayer/LessonPlayer.tsx:371-381`
- **Related:** SOT §5, §11; C16, C71, N6.

### C18 · Mistakes practice never closes, has no count, and praises you when it fails to load — **major**
- **What happens:** `get_weak_words` returns the same top 10 rows by `fail_count`; no correct answer clears a row, and a wrong one pushes it higher. A session ends on 'Lecke teljesítve! +15, Pontosság 0%' (5 misses of 8 already give 0%) and returns to an unchanged page. On any API error or offline, the learner sees 'Nincsenek gyakorolható hibáid jelenleg. Nagyon ügyes vagy!' ("You have no mistakes to practise right now. You're very clever!"), because every non-success falls into the empty branch. Sound items re-failed inside practice log under a colliding generic id.
- **Learner impact:** the review loop never ends, and it lies when it breaks.
- **Fix:** the clearing rule (WP-B3); separate error from empty state; a count on the card; an end-of-session 'Kijavítva / Még gyakorolandó' ("Fixed / Still to practise") summary; stable ids for phonics items.
- **Effort:** S–M
- **Where:** `api.php:857-898`, `pages/PracticePage.tsx:21-66`, `utils/api.ts:63-71`, `components/LessonPlayer/LessonPlayer.tsx:277`
- **Related:** SOT §16 P1 #23, WP-B3, WP-F4; C12, C13, C14.

### C19 · The practice hub gives no guidance, and its entry points are hidden — **major**
- **What happens:** `/practice` doesn't say what each mode is for; 'Start' appears only after a card is picked and renders above the cards near the top. A story is a random draw from 21 with no list, titles or read state. Neither mode is linked from the path, the result screen or the zero-energy moment, though both are energy-free and nothing says so. On phones both live only in the drawer behind 'Szintek', as 'Ismétlés' ("Review") under a 'GYAKORLÁS' ("Practice") header.
- **Learner impact:** the energy-free, review-first modes are hardest to find exactly when a learner needs them.
- **Fix:** tap-to-start cards with state; a 'nem fogy energia' ("uses no energy") line; entries after mistakes and on the out-of-energy sheet; replace the 'Szintek' tab with 'Gyakorlás' rather than adding a sixth; a story list with read ticks (a small per-user read log); pass the UI language to `getRandomStory`.
- **Effort:** M
- **Where:** `pages/PracticePage.tsx:48-57,102-138`, `components/MobileBottomBar.tsx:17-77`, `components/SidebarLeft.tsx:179-191`, `pages/Dashboard.tsx:101-131`
- **Related:** SOT §16 P2 #34; C20, C28, C66.

### C20 · The story reader is unreadable on phones and always shows the full translation — **major**
- **What happens:** a 2rem screen padding plus a 3rem card padding leave a 152 px text column at 360 (112 px at 320): an 84-word story wraps to 58 lines and scrolls 4,519 px at 320. The 2.5rem title clips at 320; 'Tovább a kérdésekhez' ("On to the questions") overflows its white-on-`#10B981` button (≈2.5:1). The full Hungarian translation is always printed under the English, so the questions test nothing, and there is no read-aloud. During questions the 'Történet' button squeezes the progress bar to 34 px. Slovak learners get Hungarian stories and translations (`getRandomStory()` defaults to 'hu').
- **Learner impact:** reading practice is a scrolling chore that hands over the answers.
- **Fix:** 16 px gutter, no inner card padding, the title in the header only, a collapsed translation toggle, a sticky CTA with a dark label on green, an icon-only story peek. Per-sentence audio only with pre-generated files (the TTS proxy allows 30 calls an hour, C-8).
- **Effort:** S–M
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:333-365,425-436`, `utils/storyLoader.ts:29-33`, `pages/PracticePage.tsx:49-50`
- **Related:** C12, C21, C48, C59.

### C21 · Audio has no visible affordance and no reliable pipeline — **major**
- **What happens:** all 8 `QuestionHeader` uses (6 in live exercises; the other 2 are in dead `MatchPairs` and `Dictation`) pass `hideAudio={true}`, so there is no speaker, replay, slow speed or "can't listen now" anywhere; image cards and fill_blanks options are silent (word_order does speak tapped tiles). All sound-drill audio is runtime TTS through a proxy limited to 30 calls an hour that falls back to `window.speechSynthesis`, and PhonicsMatch and the grid build `SpeechSynthesisUtterance` directly — unreliable in Android System WebView (plausible; needs a device check). Press feedback is mouse-only; the volume slider says 50% while audio plays at 1.0; the 'Hangeffektek' switch is dead; the wrong-answer sound is a 150→100 Hz sawtooth buzz. An invalid sound-lesson id shows an English white 'Failed to load lesson' page in dark mode.
- **Learner impact:** a listening course where learners can't replay what they hear, and where audio may go silent in the wrapped app.
- **Fix:** pre-generate audio for the ~415 phonics words and the roadmap sentences into the existing `audioUrl` field (check the TTS vendor's licence for stored audio); 44 px speakers on image cards and the fill_blanks sentence; a slow button in the feedback sheet; a working sound switch and the true volume; `:active` press states; a softer wrong sound.
- **Effort:** S (affordances) / M (pipeline)
- **Where:** `components/LessonPlayer/QuestionHeader.tsx:45-63`, `…/exercises/WordOrder.tsx:49-66`, `utils/audio.ts:50-53,68-75,108-192`, `…/exercises/PhonicsMatch.tsx:36-43`, `pages/Characters.tsx:79-84,114-125`, `components/SidebarLeft.tsx:27-30`, `pages/ProfilePage.tsx:302-308`, `api/tts.php:80`
- **Related:** SOT §6, §16 P1 #16, §20 gate 3, WP-E3; C16, C20, C69; F18; C-8.

### C04 · type_in fights the phone keyboard and has no typo tolerance — **minor**
- **What happens:** type_in appears only in the 21 stories (105 items). Enter/Go does nothing; there are no `autocapitalize`, `autocorrect`, `spellcheck` or `enterkeyhint` attributes, so HU/SK keyboards "correct" English words; `autoFocus` on mount likely pops the keyboard on Android. Grading is exact after trim and lowercase, so one typo is 'Helytelen!'. The root has no class, so the instruction renders as a small pill and the blank as '....'.
- **Learner impact:** keyboard friction and harsh grading in the story quizzes.
- **Fix:** `autoCapitalize="none"`, `autoCorrect="off"`, `spellCheck={false}`, `enterKeyHint="done"`, Enter → CHECK; optionally a one-letter tolerance for words of 5+ letters, shown as "correct — watch the spelling", that never accepts a different real word (house/horse); Capacitor keyboard resize mode in the wrapper.
- **Effort:** S
- **Where:** `components/LessonPlayer/exercises/TypeIn.tsx:13-26,34,65-67,73-97`
- **Related:** SOT §6; C07, C12; decision Q7.

## 4.7 Visual system & accessibility

**Verdict:** the theme plumbing and the player's anatomy are sound, but what users see is defined by accidents: a pasted prototype's global heading rule, an accent decided but never built as a ramp, headings that never reach Nunito, no dialog or live-region primitives, and a mascot that barely reaches the screen.

### C24 · No accessibility primitives: overlays aren't dialogs, feedback is silent, path and audio buttons unusable by keyboard or screen reader — **major**
- **What happens:** in `src` there are 0 `role="dialog"`, `aria-modal`, `inert`, `aria-live`, portals, `role=progressbar`/`radio`/`status`, `aria-pressed` or `aria-current`; 14 `aria-label`s in TSX; one `onKeyDown` in the app. Modals and drawers neither trap nor restore focus and ignore Escape; with the shop open Tab lands on the bottom nav behind it, and in a lesson Tab walks into the dashboard. Feedback, toasts and reward popups are silent DOM swaps. Path nodes are `div role=button tabIndex=0` with only `onClick` and `outline:none`: Enter and Space do nothing and their focus is invisible (focus is visible elsewhere). The chest, league tabs and avatar drop zone are clickable divs. Speaker buttons and ✖/🚩 have no accessible names; options have no radio or pressed semantics.
- **Learner impact:** keyboard and switch users cannot start a lesson; screen-reader users hear nothing when they answer.
- **Fix:** one dialog primitive (native `<dialog>` or a portal; focus trap, Escape, focus restore, inert background) for every overlay, built together with C22's "top overlay" history; path nodes and the chest as `<button>` with `:focus-visible`; localised `aria-label`s; a `role=status` live region for feedback; `aria-current` on tabs.
- **Effort:** M
- **Where:** `components/Roadmap.tsx:241-266`, `assets/css/roadmap.css:38-61`, `pages/Leaderboard.tsx:285-294`, `components/icons/TreasureChest.tsx:12`, `components/modals/AvatarUploadModal.tsx:90-92`, `components/LessonPlayer/LessonPlayer.tsx:397-446`, `…/exercises/PhonicsListenChoose.tsx:36-69`, `…/PhonicsCompare.tsx:103-124`, `…/PhonicsMatch.tsx:151-156`, `…/PhonicsSpeak.tsx:73-80`
- **Related:** SOT §18, §21 Q26 (EAA); C22, C52, C65; decision Q15.

### C48 · No theme-scoped colour ramp: CTAs, reward numbers, banners and headings fail contrast in both themes — **major**
- **What happens:** the accent that renders comes from a global `:root` in `landing.css:203-215`, not `main.css`, and the dark block never redefines it; TSX holds 466 hex literals and 846 inline style objects. Measured: white on `#10B981` is 2.54:1 on 'ELLENŐRZÉS', PostLesson 'TOVÁBB' and the save wall in both themes; onboarding white on `#58cc02` 2.09:1; PostLesson '+15' 1.91:1 and '0%' 1.80:1; module banner descriptions (white at 0.9 alpha) 1.99–3.75:1; rank-1 gold 1.34–1.40:1 in light (fine in dark); the dark-mode '☰' 1.43:1; `#9ca3af` subtitles 2.54:1; the auth error 3.14:1 light / 3.73:1 dark; dark-mode purple headings 2.33–2.82:1.
- **Learner impact:** most of this text is legible but below AA on the most-used controls; older learners feel it first.
- **Fix:** WP-C1's theme-scoped ramp (`#047857` light / `#10B981` dark) across all `--color-accent-*` tokens, with paired on-colours (near-black on dark-mode green), 700-shade module fills, and semantic and game tokens (§5b). It must replace the `landing.css` `:root` block — after rehoming its seven tokens — or that block keeps winning.
- **Effort:** M
- **Where:** `assets/css/landing.css:203-215,397-400`, `assets/css/main.css:1-52`, `components/LessonPlayer/LessonPlayer.tsx:526-548`, `components/LessonPlayer/PostLesson.tsx:331-337,701-708`, `components/AuthModal.tsx:315-319`, `data/hu/A1/*/module_meta.json`
- **Related:** SOT §12.1, WP-C1; C01, C49, C57.

### C49 · A pasted prototype CSS block paints every heading purple and frames the lesson as a card — **major**
- **What happens:** the standalone prototype at `dashboard.css:2837-3605` ships globally. Its `h1, h2` rule (`:2999-3006`) sets 2.5rem, weight 800 and transparent-fill indigo→purple gradient text on every heading, overriding intended colours: module banner titles measure 1.27–1.71:1 on their banners, and 'Bolt', the grammar guide, 'Ranglista' ("Leaderboard"), 'Gratulálunk!', 'Lecke teljesítve!', 'Mentenéd a haladásod?', the Friends and Avatar headings and the Practice and Characters titles all turn purple; emoji inside them become silhouettes. About 8 more gradient-text rules do the same elsewhere. Its `.screen` class gives the lesson overlay 24 px side padding and a 30 px corner radius, losing 48 px of width at 360.
- **Learner impact:** module names on the main screen are near-illegible, and purple has become the de facto brand colour.
- **Fix:** scope the whole prototype block under a wrapper class (or delete the rule) — but it also supplies heading size, weight and margin app-wide, so do it with a screenshot pass at 320/360/390 in both themes; give the lesson player its own root class with 0 padding and radius. The highest-ROI visual fix in this review.
- **Effort:** S–M
- **Where:** `assets/css/dashboard.css:2837-2860,2938-2956,2999-3006,4155`, `assets/css/roadmap.css:263-276`, `components/RewardPopup.css:47-55`, `components/LessonPlayer/PostLesson.tsx:312-313`, `assets/css/main.css:125,1102,1180,1485`, `assets/css/landing.css:26`, `assets/css/legal.css:20`, `pages/NotFoundPage.tsx:25`
- **Related:** SOT §12, WP-C2 (split the prototype out first); C48, C50, C56.

### C50 · Headings never reach Nunito, there is no type scale, and key text drops to 9–11 px — **major**
- **What happens:** the `main.css:75-78` h1–h4 rule uses `var(--font-heading)` = 'Outfit', which is never loaded, and it out-specifies `dashboard.css:2849`'s `* { Nunito }`, so every heading renders in an Arial/Helvetica fallback beside Nunito body text. There is no type scale (15 sizes on the 360 dashboard, 9.28 → 40 px), and the smallest text sits where it matters: bottom-nav labels 9.28 px at ≤380 px (`0.58rem !important`), the correct answer 10.9 px, the energy countdown 10.4 px. 'Kezdés' is 2.54:1 on white; the active tab label about 2.2:1. Nunito 900 is loaded (F22); weight 500 is not.
- **Learner impact:** 9 px primary navigation on the primary device, for an all-ages audience.
- **Fix:** repoint `--font-heading`/`--font-body` at Nunito and delete the two compensating hacks (WP-C1); the §5b type scale with a 12 px floor for tab labels and 14 px for stats — five tabs at 360 need shorter labels, or icon-only below 340 px; self-host Nunito including 900.
- **Effort:** S (tokens) / M (scale)
- **Where:** `index.html:31-33`, `assets/css/main.css:3-4,75-78`, `assets/css/dashboard.css:2849,3975-3986`, `components/SidebarRight.tsx:97,123-128`, `assets/css/roadmap.css:100-118,213-219`
- **Related:** SOT §12.1 D2, WP-C1; C23, C43, C66; C-11.

### C51 · Dark mode is partial: onboarding stays white, several overlays ignore the theme, no color-scheme — **major**
- **What happens:** the whole `/welcome/*` flow is light-only (`#f9fafb` layout, white card, inline `#e5e7eb` / `#58cc02` / `#3b82f6` options), so a dark-mode user gets a bright white onboarding and then a dark lesson. RewardPopup is always dark; the tour is always white with an indigo button; the 'Kezdés' bubble stays white. No `color-scheme` is declared (only in the dead `src/index.css:20`), so native controls render light. Legal H2s still get the purple gradient on the dark card. Lexi is readable on dark but low-contrast (about 1.9:1 at the edges).
- **Learner impact:** every dark-mode new user's first run flips between themes.
- **Fix:** tokenise the onboarding shell, tour and RewardPopup; set `color-scheme` per resolved theme (`[data-theme=light]`, `[data-theme=dark]` and the system query) — not a static `light dark`, which breaks manual overrides; an optional mascot halo in dark.
- **Effort:** M
- **Where:** `assets/css/main.css:418-452`, `pages/Welcome/HearAboutUsScreen.tsx:36-50`, `components/ProductTour.tsx:15-28`, `components/RewardPopup.css:16`, `index.css:20`
- **Related:** SOT §12, §12.1 D4; C29, C32, C47, C57.

### C55 · Mascot delivery: the retired grey SVG on key surfaces, thumbnail cels, Lexi absent from emotional moments — **major**
- **What happens:** the retired hand-coded grey SVG still fronts the landing hero (below both CTAs on phones), the gateway, every onboarding step and the streak-goal screen, and its run cycle runs in place on phones (CSS kills the movement while `setInterval` keeps swapping frames). The cel PNGs are uncropped 768×1364 canvases, so the lesson-complete Lexi renders about 50–55×72–78 px at 360/390 (45×64 at 320). The alpha crops are small: happy-face head 81×72, sitting-front 81×133, front-full-body 73×147, tyler-head 130×136, jump 241×343, running-right 211×131. Lexi is missing from wrong answers, empty states, errors, zero energy, the 404 (an OS 🐕) and the tour, though 7 distinct expressions exist. `Onboarding.tsx:64` references a `lexi-head.png` that doesn't exist.
- **Learner impact:** a new user's first sight of the brand is the retired mascot, and the reward moment shows a thumbnail.
- **Fix:** alpha-crop the cels (WP-G1); one `<Lexi pose size>` component; replace the three grey-SVG sites; head expressions on wrong-answer, empty, error and 404 states; delete the in-place run cycle. **Respect the pixel ceiling** (§5b): larger than about 40–65 CSS px for heads or ~120×170 for the jump needs the 1536×2728 logo poster or an upscale pass (C-2).
- **Effort:** S (crop and swap) / M (component and roles)
- **Where:** `components/LexiAnimation.tsx:9-60`, `assets/css/main.css:745-770`, `pages/Welcome/WelcomeLayout.tsx:23`, `pages/Gateway.tsx:17-37`, `pages/Home.tsx:179`, `components/LessonPlayer/PostLesson.tsx:187-191,312,518-538,660`, `…/exercises/FillBlanks.tsx:31-60`, `pages/NotFoundPage.tsx:24`, `public/assets/images/Transparent PNGs/`
- **Related:** SOT §12.1 D3, §13, WP-G1, WP-G2, WP-G4; C11, C56; C-2, C-3; decision Q15.

### C56 · Brand identity is fragmented: five names, a purple wordmark, competing colours, scaffold favicon and OG image — **major**
- **What happens:** five user-visible spellings: 'Lexipaws', 'LexiPaws' ('LexiPaws-pontszámot', 'LexiPaws Skála' — "LexiPaws score", "LexiPaws scale"), 'NeolixStudio' (footer), '… | Neolix' (tab titles) and 'Neolix Studio' (legal). The wordmark is purple gradient text in the fallback font, jammed against the top edge. Purple headings, blue guide and login buttons, emerald CTAs, Duolingo lime onboarding, a `#1cb0f6` guest login and an indigo tour compete for roles, while Lexi's navy and teal appear nowhere in the UI. The favicon is Vite's bolt; `og:image` is an SVG, so shared links preview blank on Messenger and Facebook — where Beta recruitment happens.
- **Learner impact:** the first contact doesn't read as one product, and recruitment links show no image.
- **Fix:** one product name, 'Lexipaws', with Neolix Studio only as the legal operator; favicon, touch icons and a 1200×630 PNG OG image cropped from 'Lexipaws app logo and icon.png' (the same crop gives the wrapper icons); the wordmark in Nunito, in brand green or Lexi navy.
- **Effort:** S
- **Where:** `components/Footer.tsx:41,61`, `pages/Home.tsx:137,143`, `locales/hu.json:112-113`, `index.html:5,20,25-27`, `components/SEO.tsx:15-19`, `assets/css/dashboard.css:4136-4158`
- **Related:** SOT §5, §13, WP-G1, WP-G4; C23, C49, C57.

### C57 · Duolingo trade dress and verbatim Hungarian copy — **major** (identity risk, not a legal conclusion)
- **What happens:** Duolingo's exact `#58cc02`/`#46a302` with the 4 px lip on four onboarding screens and the guest card; `#1cb0f6`/`#1899d6` on the guest login; a latent `#58CC02` banner fallback. Word-for-word lines 'Minden Napi feladat teljesítve!' (`hu.json:122`) and 'Szép volt, elérted a napi célodat!' ("Well done, you reached your daily goal!", `:124`); a near-verbatim 'Feloldottad a LexiPaws-pontszámot angolból!' ("You unlocked the LexiPaws score in English!") and 5-rung experience ladder. PostLesson screens 1–9 follow Duolingo's celebration order one-to-one, including an undefined "Score". The patterns that actually do the work — progress bar, back, disabled Check, pinned footer — were not carried over. Generic phrases such as 'Lecke teljesítve!' are not counted.
- **Learner impact:** none directly; it undercuts "own identity" and is a risk ahead of a public launch.
- **Fix:** keep the interaction patterns; rewrite about 15 strings in Lexi's voice; replace the Duolingo hexes with the brand ramp (which also fixes C48's 2.09:1); define or drop the Score screens. Decide once, in WP-G4, whether the lip and uppercase buttons stay (C-4).
- **Effort:** S
- **Where:** `locales/hu.json:108-127`, `pages/Welcome/WelcomeStartScreen.tsx:29-32`, `pages/Welcome/HearAboutUsScreen.tsx:73-76`, `pages/Welcome/WhyLearningScreen.tsx:75`, `pages/Welcome/ExperienceScreen.tsx:8-14,81-84`, `components/SidebarRight.tsx:168-182`, `components/ModuleBanner.tsx:15`, `components/LessonPlayer/PostLesson.tsx:310-668`
- **Related:** WP-G4; C16, C25, C48; decisions Q13, Q14; C-4.

### C58 · Fixed-pixel layouts break at 200% text, with Slovak strings, at 320 px and in landscape — **major**
- **What happens:** at a 195 px viewport (about 200% page zoom) the progress bar collapses to an 8 px dot, image cards overlap and clip, 'TOVÁBB' covers 'Helytelen!' and the answer, and the module banner fills the screen. The feedback CTA is a fixed-width uppercase button, so SK 'POKRAČOVAŤ' (123.5 px of text in 116 px) spills at 320/360 on every answered item. In landscape 844×390 the second row of image cards falls under the footer; at 320×568 the phonics compare answers sit behind the footer. Title Case calques read as machine translation ('Napi Széria', 'Jutalom Falatok', SK 'Začať: +10 Bodov' — "Start: +10 points").
- **Learner impact:** low-vision users lose the correct answer; Slovak users get a broken button on every item.
- **Fix:** fluid buttons (no fixed flex-basis, wrap, no letter-spacing), sentence case (pending Q14), 'Ďalej' ("Next") for the SK continue, container-query option grids, and a 320/360/390 × HU/SK × text-size × theme test matrix that includes Android WebView `textZoom` (text-only scaling breaks differently from page zoom). On orientation, read C-1 before choosing a portrait lock.
- **Effort:** M
- **Where:** `assets/css/interactive.css:974-1003`, `components/LessonPlayer/LessonPlayer.tsx:526-548`, `locales/hu.json:26-30`, `locales/sk.json:37,79,113,120`
- **Related:** WP-C3; C01, C03, C08, C61; decision Q15; C-1.

### C52 · No component primitives — **minor**
- **What happens:** about 57 button-like classes (roughly 13 genuinely different button styles on the 360 dashboard), 4 overlay systems plus the lesson overlay, PostLesson and Joyride, 26 z-index values (−2 … 999999), 846 inline style objects and three close glyphs (✖ ✕ ×). Below 44 px: CHECK 145×40, TOVÁBB 116×40, report ✖ 18×32, grammar × 19×32, shop ✕ 32×32, shop price 77×38, 'Heti/Havi' ("Weekly/Monthly") 148×42, tour Skip 43×30. Continue is lime in onboarding and emerald in lessons (red after a wrong answer is a deliberate, fine pattern).
- **Learner impact:** modest on its own — the tiny targets sit in infrequent modals — but it is the cause behind C48 and C49.
- **Fix:** first an `IconButton` with a 44×44 hit area and a full-width lesson CTA of at least 48 px; then the §5b component set; stylelint bans on hex, raw z-index and `!important`.
- **Effort:** S (first step) / L (full)
- **Where:** `components/LessonPlayer/LessonPlayer.tsx:526-548`, `assets/css/legal.css:50-60,118-128`, `assets/css/dashboard.css:1852-1868`
- **Related:** WP-C1 (z-index scale), WP-C3 (sub-44 px targets); C24, C37, C48.

### C53 · Motion has no system — **minor**
- **What happens:** `main.css:354`'s `-1ms` is invalid, so under OS reduced motion animations still play once (a 15–20 s background drift, the mascot's blink and ear flicks). Without it, four infinite loops run on the dashboard and `gradientMove` keeps repainting behind the lesson. The in-app 'Csökkentett mozgás' ("Reduced motion") toggle stops the background but not the node pulse, the 'Kezdés' bubble or the PostLesson loops, and `LexiAnimation` ignores reduced motion. `@keyframes pulse` exists in three materially different versions in one bundle.
- **Learner impact:** a reduced-motion setting that half works, in a product pitched at focus.
- **Fix:** `0.01ms` instead of `-1ms`; one `data-motion` attribute driven by the OS query or the toggle, extended to `.roadmap-node.current`, `.node-chat-bubble` and the PostLesson loops; namespaced keyframes; delete the animated background.
- **Effort:** S
- **Where:** `assets/css/main.css:352-361,1335-1360`, `assets/css/dashboard.css:2288-2320,3116-3120`, `assets/css/interactive.css:427-431`, `components/SidebarLeft.tsx:43-54`, `components/LexiAnimation.tsx:9-41`
- **Related:** SOT §12, WP-C3; C26 (confetti), C69.

### C54 · The icon system is about 220 emoji — **minor**
- **What happens:** 217 emoji instances (76 glyphs) carry the bottom bar (☰ 🏠 🛒 🎯 👤), navigation, shop, currency, shield, locks, leagues and celebrations, next to inline SVG in the same rows. They render differently per OS, can't follow tokens or dark mode, turn into purple silhouettes in gradient headings, and are read aloud (no `aria-hidden`).
- **Learner impact:** inconsistency and screen-reader noise; nothing is blocked.
- **Fix:** now: `aria-hidden` on decorative emoji, labels on icon-only buttons, one close glyph. Then decision Q14: one MIT-licensed outline set (Lucide or Phosphor) on `currentColor` for the chrome.
- **Effort:** S (now) / M (swap)
- **Where:** `components/MobileBottomBar.tsx:30-76`, `components/modals/ShopModal.tsx`, `components/SidebarLeft.tsx`
- **Related:** SOT §13, §21 Q14; C24, C49; C-10.

## 4.8 Language & copy

**Verdict:** where the locale files are used, the Hungarian reads well and the Slovak is genuinely good. The problem is how little goes through them: Slovak learners meet Hungarian almost everywhere, English leaks into both markets, and no glossary, voice guide or tooling stops it recurring.

### C59 · Slovak learners get a Hungarian product (and English beta e-mails) — **critical**
- **What happens:** with `?lang=sk` — what lexipaws.sk resolves to — only the i18n shell switches. Every lesson reads `data/hu`: `getCurriculum()` and `getRandomStory()` default to 'hu', and `data/sk` (never loaded) is a copy holding 1,420 Hungarian prompts. So a Slovak learner meets Hungarian on the landing ('BÉTA HOZZÁFÉRÉS KÉRÉSE' — "Request beta access"), in auth and server errors, onboarding ('Üdvözlünk a Lexipaws-nál!' — "Welcome to Lexipaws!"), every instruction and L1 prompt ('Melyik ezek közül a(z) "kávé"?' above a Slovak footer), path tooltips, quests, Shop, Leaderboard, reward popup, sounds page, stories, grammar guide and weekday letters; `<html lang>` stays `hu`. About 490 non-comment lines with Hungarian literals sit in 53 non-locale files (about 200 of them long-form legal and grammar text). The beta receipt and approval e-mails have only a Hungarian branch, so Slovak applicants get English.
- **Learner impact:** Hungarian-to-English prompts are unanswerable for a Slovak speaker, and the `.sk` domain promises a course it doesn't serve.
- **Fix:** interim (S): add the two Slovak e-mail branches; don't admit Slovak learners into lessons until a Slovak loop exists — an honest 'Čoskoro po slovensky' ("Soon in Slovak") state or waitlist on lexipaws.sk and for `base_language = 'sk'`. Full (L, WP-D1–D3): sibling `"sk"` keys seeded null; the loader wiring and hard imports in the same change; strings along the learner's path (lesson loop → first contact → path chrome → secondary surfaces → legal); a designed "not yet in Slovak" state instead of Hungarian fallback; language seeded from saved setting → `navigator.language` → domain; an ő/ű text-scan regression check.
- **Effort:** S (interim) / L (full)
- **Where:** `api.php:403-423`, `beta_admin.php:67-87`, `pages/Home.tsx:108-109`, `utils/roadmapLoader.ts:28`, `components/Roadmap.tsx:20`, `pages/Welcome/FTUELesson.tsx:10`, `utils/storyLoader.ts:29`, `pages/PracticePage.tsx:49-50`, `components/LessonPlayer/LessonPlayer.tsx:23`, `components/modals/GrammarModal.tsx:2`, `components/LessonPlayer/PostLesson.tsx:474`, `index.html:2`
- **Related:** SOT §1 #3, §9, §21 Q5, WP-D1, WP-D2, WP-D3; C60, C63, C65; decision Q5.

### C60 · English and bilingual strings leak into both markets — **major**
- **What happens:** English covers Profile ('EDIT', 'FREE PLAN', 'Friends List', 'Nameplate', 'Account Actions / Log Out / Delete Account', English achievement titles and confirms), all of Friends, the avatar modal, the feedback widget ('Lexi needs treats! 🦴') and refill survey, the shop's 'Power-Ups'/'Streak Shield', and alt texts. Locale strings carry parenthetical glosses at `hu.json:29,53,55,62,66,70,92` ('🛒 Bolt (Shop)', 'Profil (Profile)', '✨ Új szó / New Word'), mirrored in `sk.json`. The stats bar hard-codes a US/HU split flag and an 'ENG' chip for everyone, Slovaks included, and the path strings ('Kezdés', 'INDÍTÁS', 'Nyisd ki!', 'Útmutató') are hard-coded Hungarian.
- **Learner impact:** absolute beginners meet untranslated English in the chrome of an app that is teaching them English.
- **Fix:** one rule — app chrome is 100% L1, English appears only as marked learning content. Delete the glosses now; derive the flag from the base language or use a text chip; localise Profile, Friends and the feedback modals in the same pass that removes their `alert()`/`confirm()` (C71).
- **Effort:** S (glosses) / M (surfaces)
- **Where:** `pages/ProfilePage.tsx:11-56,143-162,267-299,383-401`, `pages/FriendsPage.tsx:65-98,117-208`, `locales/hu.json:29,53,55,62,66,70,92`, `locales/sk.json:53,55,62,66,70,92`, `components/SidebarRight.tsx:68-84`, `components/Roadmap.tsx:26-28,238,266,279,290`, `components/ModuleBanner.tsx:29`, `components/LexiFeedbackWidget.tsx:49`, `components/modals/FeedbackRefillModal.tsx:75-139`, `components/modals/AvatarUploadModal.tsx:87`
- **Related:** SOT §9, WP-D3; C47, C64, C71; decision Q6.

### C62 · Hungarian errors in UI copy and in the first lessons — **major**
- **What happens:** node titles on the A1 path are wrong: 'Ők (He, She, It)' ('ők' means "they"), and Module 5's 'Igen, tudom!' / 'Nem tudom!' mean "Yes, I know / I don't know", not can/can't ('tudok'). First-node prompts carry proofreading errors: 'Igen, vizet kérem.' (definite verb with an indefinite object), 'Tejet és vizet, kérek.' (a stray comma; ', kérek' appears in 16 prompts of nodes 1–2) and 'almalé' missing its accusative ('almalét'); 'Kávét kérek' itself is idiomatic. UI slips: 'Köteleződj el magad' (→ 'Kötelezd el magad' — "Commit yourself"), 'valósélet-beli', '{{days}} Napos széria', 'Lexi Treatet', an English 'isolated' inside the privacy policy, and one action labelled both 'Profil Készítése' and 'Profil Létrehozása'. Overt pronouns in about 48% of prompts (heuristic) are a teaching choice, not an error count.
- **Learner impact:** wrong node titles undercut "written by a teacher" for Hungarian adults and parents.
- **Fix:** now: rename to 'Ő (he, she, it)', 'Igen, tudok!', 'Nem tudok!'; fix the listed UI strings and prompts; add a content lint for ', kérek.'. Then one native-Hungarian proofreading pass over `hu.json`, hard-coded literals and Modules 1–2 — a budget or volunteer question (C-12).
- **Effort:** S (fixes) / M (proofreading)
- **Where:** `data/hu/A1/Module_2_Me_And_My_People/node2_he_she_it.json:2`, `data/hu/A1/Module_5_Likes_And_Abilities/node3_yes_i_can.json`, `…/node4_i_cant.json` (titles), `data/hu/A1/Module_1_Hello_World/node1_ordering_a_drink.json:335,460`, `…/node2_beverages.json:445,472`, `locales/hu.json:35,115,119,120,123,127`, `pages/PrivacyPolicy.tsx:40`
- **Related:** WP-F1, WP-F2; C10 ('Én fáradt'), C63; decision Q6.

### C65 · i18n stops at string lookup: fixed page language, no lang="en", hard-coded formats, text stored as data — **major**
- **What happens:** `index.html:2` hard-codes `lang="hu"` and nothing syncs it, and no English content carries `lang="en"`, so screen readers read Slovak UI and English target words with Hungarian phonetics — in an app that teaches pronunciation. The title is 'Online Angol Nyelvtanulás Magyaroknak' ("Online English learning for Hungarians") on every app route. Timers are hand-formatted ('4n 13ó 13p 19mp' — Hungarian for "4d 13h 13m 19s" — under Slovak; '1h 13m'); `toLocaleString()` has no locale; there are no plural keys ('Dostal si 5 kostí!' — "You got 5 bones!" — bakes the number in). Quest descriptions are persisted as Hungarian text, and 'Vendég' ("Guest") is a data default. The Hungarian level descriptions shown to Slovaks come from inline `t()` defaults for keys that exist in neither locale (the files have exact 182/182 parity, so `fallbackLng` is a future risk, not today's cause).
- **Learner impact:** wrong pronunciation for screen-reader users, and a Hungarian page title for Slovaks.
- **Fix:** set `documentElement.lang` on init and on `languageChanged`; wrap English learning content in `lang="en" translate="no"`; a neutral 'Lexipaws' title with localised page names; `Intl` formatters for weekdays, timers and numbers; i18next plurals (Slovak one/few/many/other); quests stored as ids; remove inline Hungarian `t()` defaults; a key-parity check plus a no-literal lint.
- **Effort:** M
- **Where:** `index.html:2,20`, `i18n.ts:15-43`, `components/SEO.tsx:27-28`, `pages/Leaderboard.tsx:44-49`, `components/SidebarRight.tsx:51-59`, `components/modals/ShopModal.tsx:75`, `context/UserContext.tsx:72,144,195-202`, `utils/roadmapLoader.ts:98-106`, `components/SidebarLeft.tsx:399-402`
- **Related:** SOT §9, §18, WP-D3; C24, C59, C61.

### C61 · No glossary: one concept, many names — **minor**
- **What happens:** the currency shows as 'Csont' ("Bone"), 'Lexi Treats', '5 Lexi Treatet kaptál!' ("You got 5 Lexi Treats!") and Slovak 'kostí' ("bones") — always next to 🦴, which limits the confusion. The shield is 'Streak Shield' in the Shop and 'Menedék' in the reward popup. 'Végezz el 3 feladatot' ("Complete 3 tasks") counts lessons, so ten exercises show 1/3, while 'feladat' also means a single exercise. XP is also 'Pont'/'Bodov' and collides with 'LexiPaws-pontszám'; 'level' means the CEFR level, a personal level stuck at 1, and 'szintet léptél' ("you levelled up"); 'Kezdés' and 'INDÍTÁS' both mean Start; the level picker is headed 'Utazás' / 'Cesta' ("Journey"); energy is a bolt and a 🔋. 'Szériavédelem' ("streak protection"), 'Napi Sorozat' ("daily series") and 'Jutalom Falatok' are dead keys or hover-only.
- **Learner impact:** small but constant friction; the quest mismatch breaks the daily loop's logic.
- **Fix:** the §5e glossary as a `terms` namespace with i18next nesting and plurals; quest copy 'Fejezz be 3 leckét' / 'Dokonči 3 lekcie' ("Finish 3 lessons"); store quest ids, not text.
- **Effort:** S
- **Where:** `components/modals/ShopModal.tsx:72-75,116-121`, `components/RewardPopup.tsx:94,101`, `context/UserContext.tsx:195-202,440-460`, `locales/hu.json:9,39,79,98,112,123,139,187`, `components/modals/FeedbackRefillModal.tsx:76,130`
- **Related:** SOT §8; C27, C65; decision Q13.

### C63 · No voice or register guide — **minor**
- **What happens:** eight learner-addressed Slovak strings are masculine-only, five of them on the reward sequence ('Dosiahol si novú úroveň vedomostí!' — "You [masc.] reached a new level of knowledge!", 'Odomkol si…', 'Dostal si 5 kostí!', 'Si veľmi šikovný!' — "You're [masc.] very clever!"). 'Kérjük várjon...' is the only truly formal Hungarian UI string ('Kérjük' — "we ask" — with te-forms is normal company voice). The Slovak gateway uses the formal plural 'Učte sa' beside informal 'Vyber si'. Lexi's persona flips between 'Üdvözlünk' ("We welcome you") and 'Üdvözöllek!' ("I welcome you!") on the same screen, and feedback is one identical line per state.
- **Learner impact:** about half of Slovak learners are addressed in the wrong gender at their reward moments.
- **Fix:** the one-page voice sheet (§5e): te/ty everywhere except legal; gender-neutral Slovak ('+5 kostičiek pre teba!' — "+5 bones for you!", 'Nová úroveň!' — "New level!", 'Odomknuté: …' — "Unlocked: …"), confirmed by the owner; Lexi speaks only in bubbles, first person singular, 12 words or fewer; rotating feedback lines. Fold the Slovak fixes into WP-D3.
- **Effort:** S
- **Where:** `locales/sk.json:75,82,107,111,112,123,124,126`, `components/AuthModal.tsx:381`, `pages/Gateway.tsx:30,84`, `components/LexiAnimation.tsx:48`, `pages/Welcome/WelcomeStartScreen.tsx:16`, `…/exercises/ImageChoice.tsx:21`, `…/exercises/TrueFalse.tsx:37,88-109`
- **Related:** WP-D3; C11, C41, C59; decision Q6.

### C64 · Error messages: server strings shown verbatim, blaming, with no next step — **minor**
- **What happens:** `api.php` returns about 74 Hungarian error strings plus English ones ('Unauthorized'; 'Cooldown active. Try again later.', which reaches learners through the refill survey), and the client renders `data.error` verbatim ('Hibás e-mail cím vagy jelszó!' — "Wrong e-mail or password!" — also under Slovak). The tone blames and dead-ends ('Magadat nem veheted fel barátnak!' — "You can't add yourself as a friend!"). A failed Friends load is silent. The 'Database error: ' text at `api.php:1637` is never displayed; it is an information leak for WP-E4, not a UX message.
- **Learner impact:** errors that don't say what to do next, sometimes in the wrong language.
- **Fix:** stable error codes from the server mapped to `errors.*` locale keys; "what happened, then what to do" copy with an action button; a designed failure state with retry for silent query failures; an offline message for the wrapper.
- **Effort:** M
- **Where:** `api.php:725,1223,1296,1714,1777-1790,1883,1889,1921,1950`, `components/AuthModal.tsx:101-102`, `components/modals/FeedbackRefillModal.tsx:38-60`, `pages/FriendsPage.tsx:31-40`, `components/modals/ShopModal.tsx:34-47`
- **Related:** SOT §9, WP-D3, WP-E4; C59, N3.

---
## 5. What could be better — the target experience

This section is the improvement vision, not a bug list. It is assembled from the panel's opportunities and the fixes above, filtered through the owner's constraints and the critic's constraint notes (§8).

### 5a. The 60-second loop, redesigned

A returning learner on a 360 px Android phone, in the wrapped app. The audio steps (auto-play, replay, slow replay) need pre-generated audio first (C-8).

1. **Open (0 s).** A splash cut from the 1536×2728 logo poster on `--bg` (the cel crops are too small for a splash, C-2); the theme follows the OS. The session is sliding (N3); if it has expired, a re-login sheet with the e-mail prefilled opens *over the app* — never the marketing page — and flushes any unsaved progress.
2. **Home (1 s).** The Learn tab opens with the path scrolled so the current node is centred (C67). A sticky 48 px HUD shows 🔥 streak (with a shield badge), ⚡ energy with its refill time, and 🦴 bones, each a labelled chip that opens a sheet (C34). Under it, one card: '▶ Folytatás: Ki beszél? · 3/4. lecke · ⚡1' ("Continue: Who is speaking? · lesson 3 of 4 · 1 energy"). A small Lexi head beside the current node marks "you are here".
3. **Start (2 s).** One tap opens `/lesson/:nodeId` as a real route (C22). At zero energy the same tap opens Lexi's rest sheet instead: the refill time plus free options (mistakes, a story, a sound), capped (C-6) — never an `alert()` or an upsell (C28).
4. **Meet the word (5 s).** A word the learner has never seen gets an 'Új szó' ("New word") card: icon, English word, auto-played audio with replay, L1 meaning (C07, C21).
5. **Answer (10–40 s).** Every item has the same header — one L1 imperative such as 'Fordítsd le!' ("Translate!") or 'Koppints a hallott szóra' ("Tap the word you hear") — and the same full-width 48–56 px footer in the thumb zone. CHECK stays grey until there is an answer (C02, C03).
6. **Feedback.** A sheet rises from the footer: an icon and a title in the state colour ('Majdnem!' — "Almost!" — in danger red, 'Pontosan!' — "Exactly!" — in success green), the full correct answer with replay and slow replay, a one-line 'Miért?' ("Why?") explanation where one exists, Lexi's thinking or happy head, a 'Jelentés' ("Report") link and a full-width 'Tovább'. It is announced to screen readers (C01, C12, C24). After three in a row, a quiet combo label (C11).
7. **'Javítsuk ki!' (45 s).** Missed items come back once, in a new order, after a one-line card: '2 feladat, amit még gyakorolunk' ("2 items we'll practise again"). Getting them right here clears them from the Mistakes queue (C12, C18).
8. **Commit.** The result is saved the moment the last item is answered (queued if offline). Nothing after this point can lose it (C36, N3).
9. **Celebrate, honestly (50 s).** One screen: 'Lecke kész!' ("Lesson done!"), the XP that was actually saved, accuracy as correct ÷ total, and a Lexi reaction mapped to the result: the jump at ≥90%, the happy head at 60–89%, the thinking head below 60% with a 'Hibák átnézése' ("Review mistakes") button. Chips read 'Ma 4 új szót tanultál' ("You learned 4 new words today") and play on tap. Then only screens that carry news — the streak going up (only when it actually did), a quest done, a node or module complete (N10), an achievement card — each skippable and static under reduced motion (C25, C33, C35).
10. **Daily goal and streak (55 s).** The goal ring fills, with gain framing: 'Mára megvan a napi adag!' ("Today's portion is done!") and 'Holnap is gyere vissza, és nő a széria.' ("Come back tomorrow and your streak grows."). Only on day 1, right after the goal pick: 'Emlékeztesselek esténként?' ("Shall I remind you in the evenings?").
11. **Back to the path (60 s).** 'Tovább' or the system Back returns to Learn, anchored on the next node; the finished node shows a stamp and the Continue card updates. Back on a tab root leaves the app (C22).

### 5b. Design-system foundation

This *is* WP-C1, WP-C2 and WP-C4 plus WP-G4 — not a parallel effort. The values below are the panel's proposal and consistent with SOT §12.1. Ratios are text against `--bg`, or label against fill where a label is named; they were re-computed for this document, but re-check every pair with a script before adopting them.

**Colour tokens** (semantic; purchased themes override only these):

| Token | Light | Dark | Note |
|---|---|---|---|
| `--bg` / `--surface` / `--surface-2` | `#F7F8FA` / `#FFFFFF` / `#EEF1F6` | `#0F1524` / `#182033` / `#222B40` | Lexi navy-black, not Duolingo's slate |
| `--border` | `#DDE2EA` | `#2E3850` | replaces the `#E5E7EB` literals and the invalid glass shorthand |
| `--ink` / `--ink-muted` | `#1B2336` (14.7:1) / `#525B6E` (6.4:1) | `#F3F5F9` (16.7:1) / `#A7B0C2` (8.35:1) | |
| `--accent` (fills) | `#047857` | `#10B981` | SOT §12.1 |
| `--on-accent` | `#FFFFFF` (5.48:1) | `#0F1524` (7.18:1) | near-black label on dark-mode green |
| `--accent-fg` (text, links) | `#047857` (5.16:1) | `#34D399` (9.47:1) | |
| `--accent-pressed` | `#065F46` | `#059669` | the lip, if kept (Q14), in our own colour |
| `--info` | `#2563EB` + white (5.17:1) | `#60A5FA` + `#0F1524` (7.16:1) | blue survives as a secondary |
| `--danger` | fill `#B91C1C` + white (6.47:1); text on `#FEF2F2` (5.91:1) | fill `#F87171` + `#0F1524` (6.58:1); text `#FCA5A5` | |
| `--warning` (skip, can't listen) | `#F59E0B` + ink (7.30:1) | `#FBBF24` + `#0F1524` (10.9:1) | |
| `--xp-fg` / `--streak` | `#B45309` (4.73:1) / `#C2410C` (4.87:1) | `#FBBF24` (10.9:1) / `#FB923C` (8.05:1) | |
| Module and level fills | 700 shades with white text: `#1D4ED8` `#6D28D9` `#0E7490` `#BE185D` `#B45309` `#B91C1C` `#047857` (5.0–7.1:1) | same; check on `#111827` | fixes C48's banners |
| `--focus-ring` | 3 px `--accent-fg`, 2 px offset | same | |

`color-scheme` is set per resolved theme, not as a static `light dark` (C51).

**Type** (Nunito only, in rem so OS text scaling works): display 2.5rem/1.1 w800–900 (reward numbers) · h1 1.75rem/1.2 w800 · h2 1.375rem/1.25 w800 · prompt 1.25rem/1.35 w700 · body 1.0625rem (17 px)/1.5 at w400 or w600 — **w500 is not loaded** (C-11) · button label 1rem w800 · caption 0.8125rem (13 px) w700 as the floor · tab labels ≥0.75rem (12 px) · grammar text ≤60ch.

| Scale | Values |
|---|---|
| Spacing (4-pt) | 4, 8, 12, 16 (phone gutter), 24, 32, 48 |
| Radius | 8 inputs and chips · 16 buttons and cards · 24 sheets and dialogs · full for pills and avatars (never 999 px on text blocks) |
| Elevation | e0 1 px border · e1 `0 1px 2px` + `0 2px 8px` (navy, 6–8%) · e2 `0 12px 32px` (18%) · optional `--lip: 0 4px 0 var(--accent-pressed)` |
| Layers (z-index) | base 0 · raised 10 · app bar 100 · nav 200 · sheet 300 · toast 400 · tour 500; native `<dialog>` uses the top layer |
| Breakpoints (`min-width` only) | sm 480 (2-up option grids) · md 768 (drawers become side panels) · lg 1024 (3-column desktop; replaces 991/992/1199/1200). Phone styles are the base, so tablets inherit working layouts (C08). The values are the brief's worked example; WP-C1 makes the decision |
| Motion | 120 ms press · 200 ms state change · 320 ms sheet · celebrations one-shot ≤1.2 s · ease-out `cubic-bezier(.2,.8,.2,1)` · `html[data-motion=reduced]` → 0 ms plus a 150 ms opacity fade · no infinite loops |

**Minimal component set:** AppShell (safe areas, AppBar, BottomNav, back-button router) · Button (primary, secondary, ghost, danger; 48/56 px; full-width on phones; hover only under `(hover:hover)`) · IconButton (≥44×44, `aria-label` required) · OptionCard (radio/checkbox semantics; selected = border + ✓, never colour alone) · WordTile · ProgressBar (`role=progressbar`) · **FeedbackBanner/Sheet** (success, danger, warning; icon + title + unclamped answer; `role=status`) · **Sheet/Dialog** on native `<dialog>` (focus trap, Escape and Back close) · **ConfirmSheet + Toast** · Tabs (`role=tablist`) · Card · Badge/Chip · StatPill (icon + number + glossary label) · EmptyState (Lexi + one line + one action) · Lexi · Skeleton. **Build the three in bold first:** they fix C01, C24 and C71.

**Icons:** pending decision Q14 (C-10). The recommendation is one MIT outline set (Lucide or Phosphor) on `currentColor` at 20/24/28 px for chrome; svgDictionary for vocabulary (minus the answer-spelling labels); the cel, chest and coin art for rewards; no emoji in chrome; decorative icons `aria-hidden`.

**Mascot usage rules with the real pixel limits.** The asset pack itself is 768×1364, so there is no higher-resolution source to re-crop. A crisp image needs CSS size ≤ source pixels ÷ device pixel ratio; common 360 px Android phones run at 2.6–3×:

| Cel (alpha crop) | Source px | Crisp max at 2× | Crisp max at 3× | Role |
|---|---|---|---|---|
| `typer-happy-face` (sic — misspelled on disk) | 81×72 | 40×36 | 27×24 | cheerleader: correct answer in the feedback sheet |
| other expression heads (thinking, sad, troubled) | 82–84 wide | ~41 | ~27 | empathy (wrong + explanation), error, offline, 404, soft gate |
| `tyler-head` | 130×136 | 65×68 | 43×45 | host bubble, default avatar |
| `tyler-sitting-front` | 81×133 | 40×66 | 27×44 | rest sheet at zero energy, the shield |
| `tyler-front-full-body` | 73×147 | 36×73 | 24×49 | commitment (streak-goal screen) |
| `tyler-jump` | 241×343 | 120×171 | 80×114 | celebrant: lesson done, chest, module done |
| `tyler-running-right` | 211×131 | 105×65 | 70×44 | loading, as a static pose (there is no run cycle) |
| `Lexipaws app logo and icon.png` | 1536×2728 | — | — | anything large: app icon, splash, OG image, big avatar |

Rules: one Lexi per screen; never inside the answer area; the angry and terrified heads are never aimed at a learner's mistake; `alt="Lexi"` or `aria-hidden` when decorative; static under reduced motion; an optional soft halo in dark. The panel's 120 px bodies, 96 px heads and 200 px hero **exceed these limits** (C-2). Flat cel art may tolerate about 1.5× upscaling — judge on a real phone — but beyond that the options are smaller sizes, the logo poster, or an upscale pass the owner runs himself (flag it as art work).

### 5c. The app shell for the wrapper

- **Routes:** four tabs — `/learn` (the path), `/practice`, `/league`, `/profile` (decision Q11) — inside one AppShell layout route with `<Outlet/>` (C66). Full-screen routes for `/lesson/:nodeId`, `/lesson/characters/:groupId` and `/story/:id`. Sheets (`/shop`, `/level`, `/settings`, reward, report, confirm) are history entries, so Back closes the top layer.
- **History:** replace-navigation through `/welcome/*` and after the first lesson; the Capacitor `backButton` closes the top overlay, then goes back, then exits on a tab root; ← buttons fall back to `/learn` when there is no history (C22).
- **HUD:** a sticky ≤48 px stats bar on Learn under `--safe-top` (C34).
- **No web-page behaviour:** no `alert()`, `confirm()`, `location.reload()` or cross-origin `location.href`; Toast, ConfirmSheet, context updates and `i18n.changeLanguage` instead (C71).
- **Safe areas and install:** `viewport-fit=cover, interactive-widget=resizes-content`; `--safe-top`/`--safe-bottom` used only by the app bar, bottom nav, lesson footer and sheets; a manifest with 192, 512 and maskable icons from the logo poster; `theme-color` per scheme; tap-highlight and touch-callout resets; `(hover:hover)` guards; self-hosted Nunito; GA and Headway deferred or removed (C23, C43).
- **Deep links:** `/invite/:code`, `/reset/:token` and reminder links as Android App Links and iOS Universal Links; sign in after a reset (N12).
- **Session and data:** a sliding cookie, a re-login sheet and a local outbox (N3); refetch on resume and at local midnight, and a server-side union merge (N9); a schema-versioned normaliser for stored state and route-level error boundaries (N4).
- **Loading and offline:** a skeleton shell in the auth guard and lazy routes (C46); lessons are bundled, so an offline banner plus queued saves keep learning possible.
- **Language:** saved setting → `navigator.language` → domain, because the wrapper has no `.sk` host (C41, C59); `documentElement.lang` kept in sync (C65).
- **Orientation:** see C-1 — prefer no lock; if phones are locked, never lock tablets.
- **Store requirements:** in-app account deletion before submission (C71).

### 5d. Lexi's own twist on the gamification

Duolingo's mechanics, translated into a dog's world, using art already on disk wherever possible.

| Idea | What it is | New art? | Depends on |
|---|---|---|---|
| **'Lexi őrködik'** ("Lexi keeps watch") | The shield becomes 'Szériavédő – Lexi őrködik' / 'Lexi stráži'. A covered day shows a paw-and-shield mark; the return screen says 'Tegnap Lexi őrködött – a szériád megmaradt!' ("Yesterday Lexi kept watch — your streak survived!") | No: `tyler-sitting-front` plus shield and paw glyphs from the icon set (Q14) | C27 (shields must work, WP-B3) |
| **Paw-print week** | Practised days get a paw print instead of a flame | No, if the icon set's paw is used; a custom drawing is new art | C27, C35 |
| **Honest Lexi reactions** | Result tiers mapped to jump / happy / thinking; the rest pose at zero energy | No (within the pixel ceiling) | C25, C55 |
| **Lexi on the path** | A small head beside the current node, doubling as the Continue anchor | No — but the panel's "sleepy" and "excited" variants don't exist (C-3); use existing expressions | C67 |
| **'Lexi kiásott egy ládát!'** ("Lexi dug up a chest!") | An itemised chest-reveal sheet: `tyler-jump` over `coins-and-stars-explosion-big` | No for the sheet; a digging pose would be new art (C-3) | C26, WP-B2 |
| **Progress to the next treat** | 'még 60 csont a Szériavédőig' ("60 more bones to the shield") bar with the bone icon | No; the animated treat jar the panel proposed is new art (C-3) | C26 |
| **'Falka'** ("Pack") | A friends-only weekly board shown before the public leagues | No | N7, decision Q11 |
| **Out of energy? Practise for free** | The rest sheet offers mistakes, a story or a sound; each refills 1 ⚡ up to a daily cap | No | C-6, decision Q9, C18 closed first |
| **Sound of the day** | One minute on the learner's weakest sound, as a quest option | No | pre-generated audio (C-8), C13–C16 |
| **Minimal pairs with pictures** | An icon under each word after CHECK | Yes, for most pairs (C-3) | C16 |
| **Lexi's wardrobe** (post-Beta) | Collar, bandana and hat overlays as the long-term bone sink | Yes | the gate, WP-B2 |

Tone (C-13): keep the dog wink light and adult. Treat and dog-bowl copy may read as childish to learners aged 35–55; test it with the Beta cohort.

### 5e. Language: glossary and voice sheet

Recommended home: `docs/LANGUAGE_SHEET.md`, mirrored as a `terms` namespace in each locale file so a rename is one edit. **⚑ = flagged by the panel for native Slovak confirmation**; the owner signs off the whole Slovak column, and a Hungarian native signs off the Hungarian one. The currency name is decision Q13.

| Concept | Hungarian | Slovak | Retire |
|---|---|---|---|
| XP | XP (glossed once as 'tapasztalati pont') | XP (once as 'body skúseností') | 'Pont' / 'Bod' for XP |
| Currency | csont (10 csont, nincs elég csontod) | kostička ⚑ (1 kostička, 3 kostičky, 5 kostičiek) | Lexi Treats, Jutalom Falatok, Maškrty |
| Streak | napi széria; 7 napos széria | denná séria; 7-dňová séria | sorozat |
| Streak shield | szériavédő | ochrana série ⚑ | Streak Shield, Menedék, szériavédelem |
| Energy | energia | energia | the 🔋 icon |
| Daily quest | napi küldetés | denná výzva ⚑ | 'feladat' for quests |
| One exercise | feladat | úloha | |
| Sub-lesson | lecke ('Italok · 2. lecke a 4-ből') | lekcia ('Nápoje · lekcia 2 zo 4') | |
| Node / module | téma / 1. modul | téma / 1. modul | 'Module 1:' |
| CEFR level | szint ('Szinted') | úroveň ('Tvoja úroveň') | 'Utazás' / 'Cesta' |
| Personal level, score | hidden until defined (Q13) | same | 'Személyes szint', 'LexiPaws-pontszám' |
| League / leaderboard | Bronz liga / ranglista | Bronzová liga / rebríček | |
| Grammar guide | Nyelvtan | Gramatika | Útmutató, Sprievodca |
| Sounds mode | Kiejtés | Výslovnosť | Karakterek, Znaky |
| Start / Continue | Kezdés / Tovább | Začať / Ďalej | INDÍTÁS; Pokračovať (overflows) |
| Check / Skip | Ellenőrzés / Kihagyás | Skontrolovať / Preskočiť | |
| Shop / Profile / Guest | Bolt / Profil / Vendég | Obchod / Profil / Hosť | 'Bolt (Shop)', 'Profil (Profile)' |
| Current-level badge | Jelenlegi | Aktuálna | '(Te)' / '(Ty)' |

**Voice rules:**
1. **Address:** te / ty everywhere in the app, including auth and errors; formal address only in legal documents. The Slovak gateway becomes register-free: 'Angličtina po slovensky' ("English in Slovak").
2. **Gender-neutral Slovak:** no l-participles or adjectives about the learner — 'Dostal si 5 kostí!' → '+5 kostičiek pre teba!'; 'Dosiahol si novú úroveň vedomostí!' → 'Nová úroveň!'; 'Si veľmi šikovný!' → 'Skvelá práca!' ("Great work!"). Hungarian needs no change.
3. **Lexi** speaks only in bubbles, in the first person singular, in 12 words or fewer: warm, adult, a light dog wink. System text stays neutral.
4. **Feedback variety:** 6–8 correct lines ('Szuper!', 'Pontosan!' / 'Presne tak!' — "Super!", "Exactly!"), 4–6 gentle wrong lines ('Majdnem!', 'Nem egészen – így helyes:' / 'Takmer!', 'Nie celkom – správne je:' — "Almost!", "Not quite — here's the right one:"), never the same line twice in a row.
5. **Gain framing:** 'Holnap is gyere vissza, és nő a széria.' / 'Príď aj zajtra a séria porastie.' No ⚠️ and no red box before day 3.
6. **Chrome is 100% L1:** English appears only as marked learning content (`lang="en"`), never in parentheses; sentence case (button labels pending Q14); typographic quotes; no 'a(z)' templates; 'Koppints' / 'Ťukni' ("Tap"), never 'Kattints' ("Click").
7. **Errors** say what happened, then what to do, with a button that does it.

---

## 6. Refactor plan

Same conventions as `REMEDIATION_PLAN.md`: one package = one working session (UX-0 is a bundle of five small sessions), each with a testable done-when, logged in the RP progress log. **Fix** = corrects a defect and is allowed now. **Feature** = new behaviour and waits for the RP gate ("No new feature work until Phase A, B and C are complete."). UX-1 and UX-2 *are* Phase C work.

**Every package's done-when includes this matrix:** 320×568, 360×800, 390×844, 768×1024 and 800×1280 (plus 1024×768 for lesson screens) and 1280×800; light and dark; Hungarian, and Slovak wherever the surface is localised; touch targets ≥44 px; no new `max-width` query (SOT §2, constraint 1).

| Package | Scope | Why | Depends on | Size | Type | Done when (besides the matrix) |
|---|---|---|---|---|---|---|
| **UX-0a Lesson truth** | C01 (colour override, icon, clamp, Igaz/Hamis, phonics answer, skip chime), C02, C13, C14, C15 (ungraded), C25 numbers, C12 (render explanations), C06 (no prompt tooltip) | The core loop stops misreporting right and wrong | None. C25's accuracy pass-through is WP-B3's first row; it is client-only, so it can land here ahead of B1 (note the exception in the progress log) and be ticked there. RP couples B3's `phonics_match` row to it: land both together. C15 per Q8 | M | fix | A wrong answer shows a red title, ✖ and the full answer at every width; CHECK is disabled with no answer; a perfect `cons_s_z` run shows 100%; shown XP equals saved XP; 0% is never green; a wrong story answer shows its explanation |
| **UX-0b Don't lose the lesson** | C36, C22 worst cases (replace-navigation, `tutorial_done`, quit sheet), N6, N8 | Work is never silently lost or merged | Can land with WP-B4's unload flush; N8 goes with WP-B1's cron prerequisite (same file) | S–M | fix | Reload or Back on PostLesson screen 1 keeps the lesson; a new user lands on the path after lesson 1; Back from the first dashboard never reopens the tutorial; login with guest data on the device asks first |
| **UX-0c Copy one-liners** | C62 fixes, C10 'Én fáradt', C60 glosses, C57 verbatim lines, C40 claims, C61 quest copy, C63 Slovak gender, C39 streak key | The cheapest credibility fixes | Q13 for the Score strings; the owner for Slovak | S | fix | No parenthetical glosses, no 'Ők (He', no verbatim Duolingo lines (grep); node titles corrected |
| **UX-0d Navigation quick fixes** | C66 (bar everywhere, Learn item, logo), C67, C68, C47, C37 stopgap, C30 className, C40 in-app picker, N2 | Home is reachable and anchored; the tour stops nagging | None. The bottom bar on `/practice`, `/leaderboard` and `/characters` is a WP-C3 row and the tour's localisation is WP-D3's first item: tick them there | S–M | fix | Bottom bar on every signed-in route; the path opens centred on the current node; a locked node can't start a lesson; the tour never renders off-screen and speaks HU/SK |
| **UX-0e Honest surfaces, Slovak interim** | C59 interim (Slovak e-mails, waitlist), C18 error vs empty, C28 (image, locale, no upsell), C09 payload, N11, C42 mailto | Nothing claims success when it failed | Q5 for the Slovak gate | S | fix | An API error on Mistakes shows an error and retry; a Slovak applicant gets Slovak e-mails; a report carries item id and answers; an expired invite shows a next step before the form |
| **UX-1 Design foundation** | C48, C49, C50, C51, C53 quick fix, C56 wordmark | The look stops being defined by accidents | **= WP-C1**, plus the prototype split that opens **WP-C2** | M–L | fix (Phase C) | WP-C1's done-when; no heading computes 'Outfit'; no transparent-fill heading outside the wordmark; every CTA passes 4.5:1 text / 3:1 non-text in both themes by script; `/welcome/*` is dark in dark mode |
| **UX-2 Primitives** | FeedbackSheet (C01), Sheet/Dialog (C24, C29, C31, C09, C10), ConfirmSheet + Toast (C71, C33), sticky footer (C03), Button/IconButton (C52), OptionCard | One component per job, with accessibility and Back built in | UX-1; lives inside **WP-C2/C3** | L | fix (Phase C) | Zero `alert()`/`confirm()` in `src`; every overlay is a dialog that Escape and Back close, with focus restored; the lesson CTA is full-width and doesn't move; axe passes on 10 key screens |
| **UX-3 App shell & session** | C22 in full, C23, C46, C66 AppShell, C71 language switch, N3, N4, N9, N12 | The web app becomes a wrappable app | UX-2; **WP-B4**; after **WP-B1** (N9's server merge is new work under B1's locking warning); N12 at the wrapper milestone | L | fix; N12 is a wrapper feature | Back closes the top layer, then leaves; `viewport-fit=cover` with no overlap at 320–390; an expired session shows a re-login sheet and loses nothing; a malformed stored value shows a recovery screen; no blank guarded route |
| **UX-4 Lesson learning layer** | C07, C05, C06 options and audio, C08/N1, C58, C21 affordances, C10 sheet, C04; then the 'Javítsuk ki!' round, the new-word card and praise/combo (C11, C12) | Teach, don't only test | UX-2; **WP-F1/F2** for content; pre-generated audio for audio items (C-8) | L | fixes first; review round, new-word card and combo are features | Every exercise shows one L1 imperative; fill_blanks is styled at 768 and 1024; the Slovak continue fits at 320; 200% text keeps the answer visible; (feature) missed items return once and clear from Mistakes |
| **UX-5 Honest daily loop** | C27, C34 HUD, C26, C28 rest sheet, C29, C31, C32, C33, C35, N10 | Streak, quests, bones and energy mean something | **WP-B1 + B1b, WP-B2, WP-B3** — surface no number before these land | M–L | fix; the goal ring and chest reveal are features | Two opens in a day leave the streak unchanged; a missed day consumes a shield; the HUD shows streak, energy and bones at 320; quest cards show rewards; zero energy opens a localised sheet |
| **UX-6 Home & IA** | C66 four-tab IA, C67 Continue card and collapse, C68 locked sheet, C69 `/settings`, C70, C19, C30 league-aware | One consistent place for everything | UX-3; Q11, Q12 | L | C70 and C19 are fixes; the IA restructure is a feature | Four routed tabs on every signed-in screen; one settings screen whose switches all work; Friends fits at 320 |
| **UX-7 Pronunciation & practice** | C16, C17, C18 clearing, C19, C20, C21 pipeline | The differentiator teaches | **WP-B3** (weak-word clearing), **WP-F2** (C14's validator rules), pre-generated audio, owner content | L | fix + content; record-and-compare is a feature | The mode is named 'Kiejtés'; sound progress syncs across devices; Mistakes empties when answered right; stories are readable at 320 |
| **UX-8 Language** | C59 in full, C60, C61 terms, C63 voice, C64 error codes, C65, C41 | Slovak ships; one vocabulary | **= Phase D (WP-D1–D3)**; Q5, Q6. *2026-09-24: the Beta is Hungarian-only. The Hungarian parts (C60 leaks, C61 terms, C64 error copy, C65's `lang="en"` and page titles, the tour) stay in the Beta, with C59's interim holding state; C59 in full, C41 and the Slovak halves of C63/C65 move to a Slovak milestone after the Beta* | L | fix | An ő/ű scan of every route under Slovak finds nothing; `documentElement.lang` follows the language; one name per concept |
| **UX-9 Brand & mascot** | C55, C56, C57 identity, C54 icons | Lexi and one brand reach the screen | **= WP-G1, G2, G4**; G1 is allowed any time; Q14, Q15 | M | fix (G1/G2); G4 is the design-system record | No grey SVG renders; every Lexi respects the pixel ceiling; one product name; the PNG OG image previews on Messenger |
| **UX-10 First contact & trust** | C39, C38, C40 landing copy, C41 gateway, C42, C43, C44, C45, N5, N7 | The funnel is honest and safe for minors | **WP-E4** (password policy), **WP-A4** (N5), legal input (N7); Q1–Q4 | M | fix; a landing taster demo would be a feature | One primary CTA above the fold at 320; sign-up errors visible at 320×568; no tracking before consent; minors' visibility matches the Q2 decision |

```
NOW — fixes, alongside Phases A and B
  UX-0a lesson truth ─► UX-0b don't lose the lesson ─► UX-0c · UX-0d · UX-0e (any order)
  UX-9 part 1 = WP-G1 crop (RP's "filler" package, any time) + WP-G2 rename

PHASE B — the data must be true before the UI shows it
  (WP-B0 is merged; B1's cron prerequisite lands before B1, per RP)
  WP-B1 + B1b ─► WP-B2 ─► WP-B3 ─► WP-B4
                              │         └─► UX-3 session parts (N3, N9)
                              └─► UX-5 honest daily loop (fix parts)

PHASE C — mobile-first conversion = the design system
  UX-1 (= WP-C1 + prototype split) ─► UX-2 primitives (inside WP-C2/C3) ─► WP-C4
                                          └─► UX-3 app shell & session

═════════════ GATE: Phases A, B and C complete — feature work may resume ═════════════

AFTER THE GATE — in parallel as capacity allows
  UX-4 learning-layer features │ UX-6 four-tab IA │ UX-7 practice │ UX-10 funnel
  UX-8 = Phase D (Slovak): RP's order puts it here, but it is not feature work, so the owner may pull it earlier
        (2026-09-24: Slovak is its own milestone after the Beta; the Beta keeps UX-8's Hungarian parts
         and C59's interim 'Čoskoro po slovensky' state)
  UX-9 part 2 = WP-G4 (the design system written down)
  WP-F2 ─► WP-F4 exams (reuse UX-2's FeedbackSheet; test-outs reuse the exam, C-14)
  Wrapper milestone: N12 deep links, store icons and splash, in-app account deletion
```

---

## 7. Decisions the owner needs to make

All panel owner questions and the critic's constraint items, deduplicated into 15. Each has the panel's recommendation and the trade-off in one line.

| # | Blocks | Question | Recommendation | Trade-off |
|---|---|---|---|---|
| **Q1** | UX-0b, UX-10 | Guest-first or account-first — for the invite Beta, and for the wrapped app's first screen ('Start learning' vs 'Log in / I have an invite')? | Account-first for the invite Beta, with no save wall; revisit guest-first for the public launch | Guest-first converts better but brings back the save wall, guest migration and N6's merge question |
| **Q2** | UX-10, leagues, friends | Minimum age and minors: state 16+ for the Beta or build parental consent? Under-18s on public boards by default, opt-in, or friends-only? | 16+ for the Beta with an "under 16?" gate kept at signup (C-5); under-18s opt-in or anonymised; take legal advice | A 16+ Beta excludes the youngest learners; a consent flow costs M plus legal input |
| **Q3** | UX-0c, UX-0e, UX-10 | What may the landing promise: an approval window ('1–3 napon belül' — "within 1–3 days"?), a queue or hand-picking, A2–B2 hidden or muted, a placement test, tutoring on the product site? | An honest window; A2–B2 muted and not selectable; no placement-test claim; tutoring on Contact/About, not in the Impressum | Showing unbuilt levels signals ambition but reads as dishonest to beginners |
| **Q4** | WP-A4 cutover | Legacy learners (N5): map old progress to new nodes, or a one-time 'Új Lexipaws' sheet? How many accounts are affected? | Count first; a sheet if few, a mapping if many | A mapping is fairer but is M work for a possibly tiny group |
| **Q5** | UX-0e, UX-8 | Slovak Beta scope: which modules get Slovak first, who translates (SOT Q5), and until then a waitlist or a badge? | A waitlist on `.sk` until Modules 1–2 exist in Slovak; hide untranslated modules rather than badge them | A waitlist delays Slovak testers; admitting them early gives them unanswerable lessons |
| **Q6** | UX-0c, UX-8 | Language policy: in-app language switch regardless of domain? English glosses as immersion? Slovak ty + gender-neutral? Who proofreads the Hungarian (C-12)? | In-app switch, no domain jump; no glosses in chrome; ty + gender-neutral everywhere including the gateway; one native-Hungarian pass over the UI and Modules 1–2 | A proofread costs money or a volunteer; skipping it leaves errors on the A1 path |
| **Q7** | UX-4 | Error recovery: a short 'Javítsuk ki!' round inside each lesson, or repetition only in Practice? Explanations per item or per pattern? One-typo tolerance in type_in? | The end-of-lesson round; explanations per grammar pattern or trap, reused across items; tolerate one typo in words of 5+ letters with a spelling note | Per-pattern texts are far cheaper than 1,552 × 2 per-item texts, but less specific |
| **Q8** | UX-0a, UX-7 | Sound mode: ship phonics_speak as an ungraded 'Mondd utána' or remove it (SOT Q20)? Are the invented words deliberate? Should sound mistakes feed the main Mistakes queue? | Ungraded 'Mondd utána'; replace the invented words or label them; keep sound mistakes inside the Kiejtés mode | Removing speak shortens lessons; keeping it needs honest copy |
| **Q9** | UX-5, C28 | Energy: a soft pacing nudge, or a future paywall gate (SOT Q17)? | A soft nudge for the Beta: never block review; free alternatives refill with a daily cap (C-6); if monetised later, gate only new lessons | A hard gate needs server-authoritative energy (WP-B2) and makes the UI imply scarcity |
| **Q10** | UX-5 | Streak: one completed lesson per local day, or a daily goal? Reset or keep today's inflated streaks? Push reminders in the wrapper, asked right after the day-1 goal pick? | One lesson per day; keep current numbers and count honestly from the fix; ask for push only after the goal pick | Resetting is honest but punishes testers for a bug; a goal-based streak is harder for beginners |
| **Q11** | UX-6, C30, C35 | Leagues: weekly cohorts with promotion, or lifetime-XP tiers (SOT Q18)? Does League get a bottom tab, or does the fourth tab go to Quests? | A League tab with a locked state under 150 XP; decide cohorts vs tiers before redesigning the page, and match the copy to the answer | Cohorts need cron work and bot-free boards (WP-E0); tiers make 'juss feljebb' ("climb higher") untrue |
| **Q12** | UX-6, C68 | Can learners skip ahead on the path? | Locks stay hard for the Beta; later, skipping = passing the WP-F4 module exam (C-14), not a second gate | Hard locks frustrate false beginners |
| **Q13** | UX-0c, UX-8 | Naming the economy: 'csont' / 'kostička' ("bone") or a branded 'Lexi-falat' / 'Lexi-maškrta' ("Lexi treat")? The 'LexiPaws score': define it (words known, CEFR can-dos) or delete its screens? | 'csont' / 'kostička'; delete the Score screens until the metric exists | A branded name is more distinctive but longer and harder to decline |
| **Q14** | UX-1, UX-9 (WP-G4) | Identity vs Duolingo: an MIT icon set instead of emoji (SOT Q14)? Sentence-case or ALL-CAPS buttons? Keep the 3-D lip in brand colour? Purchased themes dark-only or with light variants? | Lucide or Phosphor for chrome; sentence case; the lip only if the other Duolingo signatures go (C-4); label Fall and Halloween as dark themes | Green + lip + caps + Duolingo's celebration order rebuilds Duolingo's look; emoji are cheap and friendly |
| **Q15** | UX-2, UX-3, UX-9 | Accessibility bar and art: WCAG 2.2 AA for the Beta (EAA, SOT Q26)? Lock orientation? Accept Lexi at its real pixel sizes, or run an upscale pass? Revive the chat-style fill_blanks with Lexi as speaker, or delete it? | AA; no orientation lock (C-1); small Lexi now and an upscale pass later if wanted; delete the chat branch until content exists | An orientation lock hides C58 instead of fixing it and conflicts with WCAG 1.3.4 and the EAA |

---

## 8. Constraint notes

The critic's constraint audit, kept where it changes a decision.

- **C-1 · Portrait lock.** Several panel fixes assumed the wrapper locks portrait. That conflicts with WCAG 1.3.4 (Orientation) and the European Accessibility Act, locks tablets, and hides C58 instead of fixing it. If phones are locked anyway, never lock tablets, and still stop the lesson footer covering options in landscape.
- **C-2 · Mascot pixel limits.** The proposed 120 px bodies, 96 px heads and 200 px hero exceed the 70–84 px and 241 px source crops at 2.6–3× DPR, and the 768×1364 pack offers nothing larger. "No new art" holds only at the §5b sizes, unless the owner runs an upscale pass or uses the 1536×2728 logo poster.
- **C-3 · Ideas that do need new art:** the treat jar, a "sleepy" or "excited" Lexi (no such cels exist), a digging Lexi, minimal-pair icons, Lexi's wardrobe, and a paw-and-shield mark unless it is built from an icon set.
- **C-4 · Duolingo trade dress.** Replacing the hexes (C57) is not enough if the green 3-D lip, uppercase labels and the one-to-one celebration order all stay: together they rebuild Duolingo's look. Sentence-case buttons (visual panel) and kept uppercase (other panels) contradict each other. Decide once, in WP-G4 (Q14).
- **C-5 · Age gate.** Moving the age question out of signup (an acquisition-panel idea) breaks the GDPR Art. 8 consent path. Keep an "under 16?" gate at signup.
- **C-6 · Energy soft nudge.** It answers SOT Q17, so present it as an option (Q9). "Practice refills energy" plus a Mistakes queue that never empties (C18) equals unlimited energy: cap it.
- **C-7 · Fix vs feature.** §6 labels every package. The review round, new-word card, combo, goal ring, chest reveal, landing taster, IA restructure and record-and-compare are features and wait for the gate.
- **C-8 · Audio depends on the pipeline.** Per-sentence audio, slow replay, the sound of the day and story read-aloud all need pre-generated audio first; the TTS proxy allows 30 calls an hour (SOT §20 gate 3).
- **C-9 · C08's severity** was set on desktop-first reasoning; the bug hits everything above 600 px, tablets included (N1), so it is major.
- **C-10 · The icon set is still an open question** (SOT Q14), not a settled decision.
- **C-11 · Nunito 500 isn't loaded.** Use 400/600 for body text, or add 500 when self-hosting.
- **C-12 · A paid proofreading pass** is a budget item with no budget; a volunteer native speaker or a Beta tester is the realistic route.
- **C-13 · Dog-bowl and treat copy** may read as childish to 35–55-year-olds.
- **C-14 · Test-outs** should reuse the WP-F4 module exam, not add a second gate.
- **Respected by the panel:** no hearts, no `match_pairs` revival, no per-tap phonics penalty, no 3-D or grey-SVG Lexi, no new typeface, no blue accent, no dark default, no boss or dictation for Beta, no payments, no native rebuild; the proposed tokens match SOT §12.1.

---

## 9. Method, coverage and limits

**What was checked**
- Eight surface reviewers (first contact, onboarding, lesson, rewards, navigation, practice, visual system, language) drove the real React app on `dev` through the Vite dev server in headless Chrome. They captured and read screens at 320×568, 360×800, 390×844 and 1280×800, plus a 195 px zoom emulation and 844×390 landscape; in light and dark; in Hungarian and `?lang=sk`; with and without reduced motion. The tablet band (768×1024, 800×1280, 1024×768) and laptop heights (1366×657, 1280×720) were added by the completeness critic.
- Two hosts: `localhost:5173` (dev mode: auth guards off, guest progress in `localStorage`) and `app.localhost:5173` (production-like guards, backend mocked). States came from seed files and mocked API responses: a new guest, a returning guest (245 XP, streak 4), a logged-in user (1,240 XP, streak 12), zero energy, error codes, slow responses, pending league rewards and weak words.
- Measurements came from computed styles and hit-tests (contrast ratios, element boxes, `elementFromPoint`, touch-target sizes, font families, running animations) and from code and data censuses.
- 146 findings were merged into 71 root causes. Each was re-verified by an independent verifier (six batches) with fresh captures, and each of the 11 panel-rated criticals was re-checked a second time: 35 confirmed, 36 confirmed with corrections, 0 refuted. A completeness critic then covered the tablet band, session expiry, a crash from bad stored data, legacy accounts, shared devices, invite links, the end of the course and laptop heights (N1–N12).

**What was not checked**
- **Real devices:** no Android WebView (`textZoom`, system Back, `speechSynthesis`), no iOS WKWebView, no notch or gesture-bar insets. The wrapper does not exist yet.
- **Real TTS:** blocked, with `speechSynthesis` stubbed; audio quality, latency and WebView silence are unverified.
- **The real backend:** PHP was not run, because the local `db_config.php` holds live credentials and `dev` shares production's database. Server behaviour comes from reading the code and from mocks; production-only states (the missing `user_metadata` table, the ~500 bot accounts, the lexipaws.eu apex rewrite) are unverified.
- **Screen readers:** no TalkBack or VoiceOver run; accessibility findings come from a DOM census and keyboard tests.
- **Also out of scope:** performance and battery (claimed, not measured), e-mail rendering in real clients, payments (none exist), and real network loss. Guest-mode observations came from `localhost` and are latent in production (§4).

**How to re-verify**
- The capture tool, `shot.mjs`, runs one isolated headless Chrome per call from a JSON step list (click, type, tap, scroll, eval, viewport, scheme, measureTargets), with seed and mock files. **It lived in the review session's temporary scratchpad and is not in the repo**, and most screenshots behind the verification record were lost with that folder (the visual companion re-captured the key ones). It belongs under `tools/local/ux-shots/` — which `scripts/build_release.js` never copies and `scripts/check_php_security.js` skips, like the WP-B0 test suite in `tools/local/testing/` — together with the seeds, the mocks and a short README, so any claim here can be re-run.
- Once added, a typical check looks like: `node tools/local/ux-shots/shot.mjs --path /dashboard --w 360 --h 800 --ls tools/local/ux-shots/seeds/returning.json --steps '[{"click":".roadmap-node.current"},{"click":".tooltip-start-btn"},{"click":".interactive-submit-btn"},{"shot":"q1-feedback"}]'`
- Three cheap regression gates are worth adding with it: the contrast script, an ő/ű scan of every route under Slovak (C59), and the §6 screenshot matrix (320 to 1280 px, light and dark).
- Line numbers are at `f1d3dc8`. After any large refactor, re-run the `file:line` spot checks, as SOT §22 does for the engineering record.
