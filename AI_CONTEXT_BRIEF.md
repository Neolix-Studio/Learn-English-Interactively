# AI Context Brief — read this first

> **Purpose.** This file onboards any AI assistant given access to this folder — ChatGPT desktop, a new Claude Code session, anything. Paste the block in §0 to start, or just point the assistant here.
>
> **Why it exists.** This repository contains **two different applications**, and most of its documentation describes the wrong one. An assistant that reads the code without this warning will confidently reach wrong conclusions.

---

## 0. The starting prompt

Paste this into a fresh ChatGPT session that has this folder connected:

```
You have access to the folder for Lexipaws, a gamified web app that teaches English to Hungarian
and Slovak speakers. Before answering anything about it, read these three files in full and treat
them as ground truth:

  1. AI_CONTEXT_BRIEF.md   — this file: constraints, traps, how we work together
  2. SOURCE_OF_TRUTH.md    — verified description of how the code actually works
  3. REMEDIATION_PLAN.md   — the prioritised backlog, split into session-sized work packages

YOUR ROLE
You are my brainstorming partner and prompt author. You do NOT write production code — Claude Code
does that in a separate session with access to this same folder. Your output is:
  (a) thinking decisions through with me, challenging the plan, spotting what it missed
  (b) precise, self-contained prompts I can hand to Claude Code
Push back when you disagree. I would rather argue now than find out after the code is written.

CRITICAL CONTEXT — you will get this wrong without it

- This repo contains TWO DIFFERENT APPLICATIONS. `origin/main` is the ORIGINAL vanilla-JS app
  (dashboard.html, js/, css/) and is what production was last deployed from, back in July 2026.
  `origin/dev` is the React + Vite + TypeScript rewrite. My checkout is a `dev` descendant, so the
  files you can see are the REACT app. The React app has never been deployed to production.
- About 14 of the 40 files in docs/ describe `main`, not the code in front of you. In particular
  docs/guides/developer_guide.md, docs/guides/design_guide.md, docs/frontend/CSS_Architecture.md
  and docs/backend/database/database.md are ACTIVELY MISLEADING for the current app. Do not quote
  them at me. SOURCE_OF_TRUTH.md §19 lists which docs are trustworthy.
- SOURCE_OF_TRUTH.md and REMEDIATION_PLAN.md came from a deep audit with adversarial verification;
  every claim carries a file:line. Prefer them over re-deriving conclusions from the source. If you
  think one is wrong, say so explicitly — do not quietly disagree or silently reconcile.
- `dev` and production SHARE ONE DATABASE. There is no separate staging DB.

NON-NEGOTIABLE CONSTRAINTS (my decisions — do not relitigate unless I ask)
  1. Mobile-first. Users are on phones. Every layout starts at 320-390px and enhances upward.
  2. The mascot is named Lexi. (Tyler is my real dog; the tyler-*.png files are legacy names.)
  3. Slovak ships in the first beta, using sibling "hu"/"sk" keys in one data tree.
  4. Theme default is `system` — follow the OS. Both light and dark must be correct.
  5. No designer budget. Prefer fixes that reuse assets already on disk.

WHAT YOU CANNOT DO HERE
You can read files, but you cannot run git or gh, see branches other than my checked-out files,
run the build, hit the network, or check the live site. So you cannot verify whether something is
still true, and you cannot see `main` at all. When a question depends on any of that, say
"this needs Claude Code to verify" instead of guessing.

WRITING PROMPTS FOR CLAUDE CODE
Keep them SHORT. The context already lives in the repo and Claude Code reads it. A good prompt is
usually: name the work package, plus any decision we made that isn't written down yet, plus the
"done when". Do not paste chunks of SOURCE_OF_TRUTH.md back in. Do not over-specify implementation
from a reading of code you couldn't run. One work package per prompt — they are sized deliberately.

FIRST TASK
Read the three files, then give me:
  - a 10-line summary of where the project actually stands
  - which three work packages you think should come first, and why
  - any question that is genuinely ambiguous
Do not guess at product decisions — ask me.
```

---

## 1. What Lexipaws is

A gamified web app that teaches **English to Hungarian and Slovak native speakers**. React 19 + TypeScript + Vite frontend, flat PHP + MariaDB backend (one `api.php` front controller), static JSON curriculum in `data/`. Mascot is **Lexi**, a cartoon AmStaff. Hard Alpha, working toward a first Beta.

Three hostnames, one codebase: `lexipaws.eu` is a language gateway, `lexipaws.hu` and `lexipaws.sk` are the localized apps, `dev.lexipaws.eu` is staging.

---

## 2. The five non-negotiable constraints

These are owner decisions. They are **not** derivable from the code, and they have been lost repeatedly across sessions.

1. **Mobile-first.** Target users are on phones. Start every layout at 320–390 px and enhance upward. *The CSS is currently authored desktop-first (38 `max-width` queries vs 16 `min-width`), which is the structural reason mobile keeps breaking — see REMEDIATION_PLAN.md Phase C.*
2. **The mascot is named Lexi.** (Tyler is the owner's real dog and the origin of the name; the 26 `tyler-*.png` files are legacy filenames.)
3. **Slovak is in scope for the first Beta.** `data/sk/` was a deliberate placeholder, never real content. The approved approach is sibling `"hu"` / `"sk"` keys in one tree — REMEDIATION_PLAN.md Phase D.
4. **Theme default is `system`** (follow the OS). Not dark-by-default. Both light and dark must be correct.
5. **No designer budget.** Art is AI-generated; the owner does not draw. Prefer fixes that reuse assets already on disk. Six of the nine recommended art fixes need no new art at all.

---

## 3. Things an assistant will get wrong without being told

| Trap | Reality |
|---|---|
| "The docs describe this app" | ~14 of them describe `main`, the old vanilla app |
| "`gateway.html` is missing — that's a bug" | It exists on `main`. `dev` inherited the `.htaccess` rule without the file. |
| "Production runs this code" | Production has **never** run the React app. Last prod deploy was the vanilla app, 2026-07-04. |
| "`dev` and prod have separate databases" | **They share one.** Every `dev` deploy runs migrations against the live production DB. |
| "The design guide describes the design system" | It describes the *old* app's design system. |
| "`data/sk` is a Slovak translation" | It is a byte-copy of `data/hu` with Hungarian text, minus 17 stories. |
| "Local `main`/`dev` are current" | Both local refs are **stale**. Always `git fetch origin` and use `origin/*`. |
| "Tests cover the app" | One five-line Cypress test that asserts `<body>` is visible — and Cypress isn't installed. |

---

## 4. Division of labour

**ChatGPT (brainstorming, discussion, prompt authoring)**
- Talk through product and design decisions
- Weigh trade-offs, challenge the plan, spot what the plan missed
- Turn a decision into a precise, self-contained prompt for Claude Code

**Claude Code (implementation)**
- Reads and writes files, runs the build, runs `git` and `gh`, probes the live site
- Verifies claims against the actual code before acting
- Updates `SOURCE_OF_TRUTH.md` and the `REMEDIATION_PLAN.md` progress log as part of finishing work

**What ChatGPT cannot do here** — and should say so rather than guessing: run `git`/`gh`, see branches other than the checked-out files, run the build, hit the network, or check production. Anything requiring those is a question for Claude Code.

---

## 5. Writing a good prompt for Claude Code

The work packages in `REMEDIATION_PLAN.md` are designed to be one session each. A good prompt is usually **short**, because the context already lives in the repo.

**Do:**
- Name the work package: *"Do WP-B1."* Claude Code will read the plan and `SOURCE_OF_TRUTH.md` itself.
- State any decision made during brainstorming that is **not** yet written down — this is the main thing worth adding.
- State the goal and the "done when", not the implementation. Let Claude verify against the real code.
- Ask it to flag assumptions it had to make.

**Don't:**
- Paste large excerpts of `SOURCE_OF_TRUTH.md` back in. It reads the file.
- Over-specify implementation from a reading of the code ChatGPT did without being able to run it.
- Bundle several work packages into one prompt. They are sized deliberately.

**Template:**

```
Do WP-<id> from REMEDIATION_PLAN.md.

Decisions made since the plan was written:
- <anything settled in brainstorming that is not yet in the repo>

Constraints for this one:
- <anything unusual; otherwise omit — the standing constraints are in AI_CONTEXT_BRIEF.md §2>

When you're done, update the progress log in REMEDIATION_PLAN.md and SOURCE_OF_TRUTH.md if
anything documented there changed.
```

**A worked example:**

```
Do WP-C1 from REMEDIATION_PLAN.md.

Decisions made since the plan was written:
- Accent colour: go with the green (#10B981), not the blue. Delete the blue from main.css
  rather than the rogue :root in landing.css, so there's one definition left.
- Brand font is Nunito. Update --font-heading and --font-body to match reality and stop
  referencing Outfit/Inter.
- Breakpoints: 480 / 768 / 1024. Retire 991/992/1199/1200.

Flag anything that contradicts what's in SOURCE_OF_TRUTH.md rather than silently reconciling it.
```

---

## 6. Keeping the two documents honest

`SOURCE_OF_TRUTH.md` ends with a re-verification script (§22) that re-tests its highest-stakes claims. Run it rather than assuming the file is current — especially after a gap, or after any change touching `UserContext.tsx`, `api.php`'s progress handlers, `main.css`'s token block, or `data/migrations/`.

Both files are meant to be **edited as work lands**, not left to rot like `docs/` did. A work package is not finished until they reflect it.
