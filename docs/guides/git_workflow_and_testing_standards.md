# Neolix Studio Git Workflow & QA Standards Guide

This document outlines the branch and deploy workflow and the testing requirements for future development.

> **Solo-maintainer mode (since 2026-09-23).** The project has one developer, so there is nobody to approve pull requests. `dev` accepts **direct pushes** and is the repository's **default branch**. `main` is unchanged and still protected, because it serves production and still holds the old vanilla-JS app until the React cutover.

---

## Part 1: Day-to-day workflow

1. Pull the latest `dev`: `git checkout dev && git pull`.
2. Commit your change on `dev`. A short-lived local branch is fine for experiments; merge it into `dev` locally when it works.
3. `git push origin dev`.
4. GitHub Actions runs **CI/CD Verify and Deploy**. If `Verify (CI)` passes, the deploy job publishes to `https://dev.lexipaws.eu`. If it fails, nothing is deployed, and you fix forward with another push.
5. CodeQL and SonarCloud also run on the push. They report findings but do not block the deploy.

What is still enforced on `dev`: no force-push, no branch deletion.

**Dependabot** opens PRs against `dev`. `dependabot-automerge.yml` merges patch and minor bumps automatically once every check on the PR is green, then triggers a `dev` deploy. Major bumps, 0.x minor bumps and grouped updates stay open for you to merge by hand.

---

## Part 2: Environments

```
[dev branch] ---------------------> [main branch]
 push -> dev.lexipaws.eu              (Production Env: lexipaws.eu)
```

* A push to `dev` deploys `https://dev.lexipaws.eu` once CI passes.
* A push to `main` deploys `https://lexipaws.eu`. `main` still requires a PR with one approval, plus the `Verify (CI)` and `Analyze Code` checks. When production is cut over to the React app, relax `main` the same way `dev` was relaxed, or promote with a manual `workflow_dispatch` run with `target: main`.
* A deploy can be re-run by hand from **Actions → CI/CD Verify and Deploy → Run workflow**, choosing the same branch in both "Use workflow from" and `target`.

---

## Part 3: Content-Only Workflow For Junior Tasks

Use this path for lesson, translation, and curriculum data work.

### Branch Naming

Use:

* `content/add-a1-food-vocab`
* `content/fix-sk-lesson-json`
* `content/update-hu-translations`

### Usually Safe To Edit

* `data/hu/`
* `data/sk/`
* `src/locales/`
* `src/data/` when specifically assigned
* Markdown docs under `docs/` when the task is documentation only

### Ask Before Editing

* PHP files such as `api.php`, `security.php`, `migrate.php`, `mailer.php`
* `.github/workflows/`
* `scripts/`
* database migrations
* `.htaccess`
* authentication, CSRF, TTS, or payment-related files

### Content PR Checklist

Before opening the PR:

* Confirm JSON files are valid.
* Confirm file names and folder structure match the existing pattern.
* Do not include `.DS_Store`, screenshots, `release/`, `dist/`, or local config files.
* Run `npm run validate:json` if Node is available locally.
* If unsure, open the PR anyway and let CI validate it.

---

## Part 4: Automated Testing Matrix

To ensure development velocity is not stalled by unnecessary testing overhead, use this matrix to decide what requires automated tests.

### 🔴 Automated Tests are MANDATORY for:
* **Business Logic & Calculations**: Scoring engines, leveling/XP mathematics, streak calculations, timer resets, and shop transaction/point deductions.
* **API Endpoints & Database Scripts**: Any PHP endpoints (like `api.php`), API parameters, SQL queries, or integrations with third-party databases/Supabase.
* **Security & Input Validation**: Email/phone validators, security tokens, CSRF protection, and encryption routines.
* **Complex Data State Manipulations**: Helper files that serialize, parse, or structure progress logs.

### 🟢 Automated Tests are NOT Required (Manual Visual QA is Sufficient) for:
* **Layout, Styling & Spacing**: CSS rules, responsive layout updates, sticky alignments, colors, gradients, and font adjustments.
* **Static Text or Translations**: Editing Hungarian/English vocabulary dictionary files, adding copy text, or fixing typos.
* **Simple Micro-Animations**: CSS transitions, element hover effects, or basic entrance animations.
* **Pure Tracking tags**: Non-critical analytics pixels or pageview counters.
