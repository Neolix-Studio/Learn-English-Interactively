# Lexipaws — Remediation Plan

> **What this is.** The work that must happen before new feature development resumes, broken into **session-sized work packages**. One work package = one focused working session. Each has an ID, its dependencies, the exact files it touches, and a testable "done when".
>
> **Companion document:** [`SOURCE_OF_TRUTH.md`](SOURCE_OF_TRUTH.md) — the verified description of how the codebase actually works. This plan assumes it. Every `file:line` here is traceable there.
>
> **Created:** 2026-08-28 · **Against:** `origin/dev` @ `080f59c` · **Production:** `origin/main` @ `9725d11` (vanilla JS, currently down)

---

## The gate

**No new feature work until Phase A, B and C are complete.**

Those three phases are not a wish list. They are the reasons that feature work currently does not stick:

- **Phase A** — production has been serving nothing since roughly early July. Features that ship to nobody are not shipped.
- **Phase B** — every autosave destroys 11 database columns. Any feature touching progress, streaks, energy, quests or themes will appear to work and then silently lose its state. **Building on this is building on sand.**
- **Phase C** — the CSS is authored desktop-first while the product is mobile-first. Every new component is desktop-only by default and breaks on phones. This is the mechanism that has been generating ad-hoc mobile fixes all along; until it is inverted, every feature added will reproduce the same bug.

Phases D onward are real work but do not block feature development.

---

## How to run this

**One work package per session.** Start a session by naming the package (e.g. *"Do WP-B1"*). Each package is self-contained: it names its files, its change, and its exit test.

**Every session ends with:**
1. The "done when" checks passing.
2. A line appended to the [Progress log](#progress-log) at the bottom of this file.
3. `SOURCE_OF_TRUTH.md` updated if the package changed anything documented there.

**Every UI package additionally ends with:** verified at **320 / 360 / 390 px portrait** *and* one desktop width. Touch targets ≥ 44 × 44 px. This is the standing definition of done — see `SOURCE_OF_TRUTH.md` §2.

**Sizing:** `S` ≈ half a session · `M` ≈ one session · `L` ≈ two or more, or needs splitting on contact.

---

## Phase overview

| Phase | Theme | Packages | Blocks features? |
|---|---|---|---|
| **A** | Restore production | A1–A4 | ✅ yes |
| **B** | Data integrity & economy | B0, B1, B1b, B2–B4 | ✅ yes |
| **C** | Mobile-first conversion | C1–C4 | ✅ yes |
| **D** | Slovak (Option A) | D1–D3 | no |
| **E** | Security hardening | E0–E4 | E0 before beta |
| **F** | Curriculum correctness | F1–F3, **F4 (epic — split first)** | no · **F4 is post-Phase-C** |
| **G** | Brand, assets, design system | G1–G4 | no |
| **H** | Deploy safety, tests, docs | H1–H4 | no |

---

# Phase A — Restore production

> **Context that changes everything here:** `dev` and production **share one MariaDB database.** Verified: `gh secret list` shows a single set of `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASS`, the repo has no GitHub Environments besides `github-pages`, and `verify-deploy.yml` branches only on `server_dir` / `site_url`. Every `dev` deploy since the React work began has run `migrate.php` against the live production database.
>
> The upside: all 22 migrations are **already applied to production**, so the cutover applies **zero DDL**. The downside: there is no database rollback, because restoring a dump would also erase everything created on staging since.

---

### WP-A1 — Find out why production returns 403 · `S` · **owner task** — ✅ MOSTLY RESOLVED 2026-08-28

> ### ✅ Resolved
>
> **Cause: the production document root was manually emptied.** Owner confirms deleting the contents of `/lexipaws.eu/web`, which matches the pattern prescribed in `docs/DEV_SERVER_CLEANUP.md`. Mechanism (A). Deploying fixes it.
>
> **Verified in the Websupport panel:** `lexipaws.eu` → Apache 2.4 PHP 8.5 → document root **`/lexipaws.eu/web`** — exactly the `server_dir` the deploy workflow targets. Mechanism (B), a repointed docroot, is **ruled out**.
>
> **Verified externally:** all three domains are separately registered and on Websupport nameservers (`lexipaws.sk` created 2026-06-28). All three return a **byte-identical** stock Apache 403 (md5 `bb8f534f…`, 199 bytes), which is the signature of three hostnames sharing one empty directory rather than unconfigured vhosts.
>
> **⚠️ DNS trap, recorded so nobody re-checks this the wrong way:** `lexipaws.eu` and `lexipaws.hu` both have **wildcard DNS**. `hu.lexipaws.eu`, `sk.lexipaws.eu` and even `zzz-nonexistent-test.lexipaws.eu` all resolve. Resolution proves nothing about whether a hostname is configured.
>
> **Server topology — confirmed 2026-08-28 via WebFTP + HTTP probes:**
>
> ```
> /lexipaws.eu/web          ← docroot shared by .eu, www, .hu, .sk   [EMPTY — the whole problem]
> /lexipaws.eu/sub/dev      ← dev.lexipaws.eu (HTTP 200, working)
> /lexipaws.eu/logs         ← lexipaws.eu logs
> /lexipaws.eu/logs-lexipaws.hu   ← written today
> /lexipaws.eu/logs-lexipaws.sk   ← written today
> ```
>
> `.hu` and `.sk` **are live, configured vhosts** — proven by their per-domain log directories being written today, and by their HTTP→HTTPS behaviour differing from `.eu` (which aliases could not do). They are **separate service entries that share the `/lexipaws.eu/web` docroot**, which is why no alias list appears under *Upraviť*. **One deploy to `/lexipaws.eu/web` brings up all four hostnames.** No aliasing work needed.
>
> `web` last modified **Jul 10 2026** — six days after the final production deploy (Jul 4), consistent with the manual emptying.
>
> **⚠️ Separate finding — HTTPS redirect is inconsistent:**
>
> | Host | `http://` |
> |---|---|
> | `lexipaws.hu` / `lexipaws.sk` | 301 → https ✅ |
> | `lexipaws.eu` | 403, **no redirect** ❌ |
> | `dev.lexipaws.eu` | 200, **no redirect** ❌ |
>
> "Presmerovať na HTTPS" is OFF for `lexipaws.eu` in the panel. This matters because `security_start_session()` ([security.php:8-20](security.php:8)) sets the session cookie's `Secure` flag **only when it detects HTTPS** — so a plain-HTTP visitor gets a session cookie without `Secure`. One-click fix in the panel; safe to do while the docroot is empty.
>
> **⚠️ Credentials note:** the FTP login lives in GitHub secrets `WEBSUPPORT_FTP_USERNAME` / `WEBSUPPORT_FTP_PASSWORD` (set 2026-06-30). GitHub secrets are write-only and cannot be read back. **If the FTP password is reset in the panel, `WEBSUPPORT_FTP_PASSWORD` must be updated or WP-A4's deploy fails.** Working FTP is not needed until WP-A4's `avatars/` + `audio/` seeding step.
>
> Consequences for later packages: the FTP deploy will report *"this must be your first publish!"* — expected, not an error — and WP-A4 step 4.8 (sweep stray files) becomes a no-op.

**Original procedure, retained for reference:**

The evidence says the production document root is **empty**, not blocked:

| URL | Response |
|---|---|
| `https://lexipaws.eu/` | **403**, 199 bytes, iso-8859-1 — a directory with no index and `Options -Indexes` |
| `/index.html`, `/dashboard.html`, `/api.php`, `/.ftp-deploy-sync-state.json` | **404**, 196 bytes |
| `https://dev.lexipaws.eu/` | **200** |

A permissions block, ModSecurity rule or account suspension would return 403 on the *children* too. Certificates are current on both `.eu` (2026-06-30) and `.sk` (2026-07-01), so hosting is alive.

Two mechanisms fit, and they need different fixes:

- **(A)** `lexipaws.eu/web` was emptied or renamed by hand after 2026-07-04. Deploying fixes it. *More likely* — `docs/DEV_SERVER_CLEANUP.md` prescribes exactly this pattern, and the 2026-07-04 deploy log records `Server Files: 0` with *"this must be your first publish!"*, so that directory had been blanked once before by hand.
- **(B)** The document root was repointed in the Websupport panel to a different empty directory. Deploying to `web/` would then change nothing and burn the cutover.

**Steps**

1. **Panel → Hosting → Domains.** Open `lexipaws.eu`, `www.lexipaws.eu`, `lexipaws.hu`, `lexipaws.sk` and write down each document root **verbatim**. Compare with `lexipaws.eu/web`, the `server_dir` in `.github/workflows/verify-deploy.yml`.
2. **FTP in** with the pipeline's credentials (FTPS port 21; in FileZilla enable *Server → Force showing hidden files*). Record: does `web/` exist, is it empty, is `.ftp-deploy-sync-state.json` present, are `dashboard.html`/`js/`/`css/`/`api.php` present, is there a sibling `web_backup*` / `web_old` / `web_before_react`?
3. **The deciding probe — zero risk.** Upload a file `_probe.txt` containing `ok` into `lexipaws.eu/web/`, then:

```bash
for h in lexipaws.eu www.lexipaws.eu lexipaws.hu lexipaws.sk; do
  printf "%-22s %s\n" "$h" "$(curl -s -o /dev/null -w '%{http_code}' https://$h/_probe.txt)"
done
```

`200` proves that hostname is served from `lexipaws.eu/web` and the pipeline target is correct. `404` proves it is served from somewhere else — repeat the probe in each candidate directory from step 1 until one answers. Delete `_probe.txt` afterwards.

4. If the probe fails, **prefer repointing the document root back to `lexipaws.eu/web` in the panel** over editing `server_dir` in the workflow — that restores the known-good 2026-07-04 configuration. Write down the original value first; this is the only instantly reversible lever in the whole operation.

**Done when:** `_probe.txt` returns 200 on `lexipaws.eu`, and you have written down the document root for all four hostnames.

**Do not deploy any code until this passes.**

> *Note: one earlier hypothesis is now discarded. "No security headers on production" is a **red herring** — `origin/main:.htaccess` is 9 lines containing only the gateway rewrite and zero `Header` directives, so a correctly-deployed vanilla production would also have shown none. Likewise `lexipaws.sk` resolving to a different IP is not a second hosting service: both IPs reverse-resolve to `ing.r6.websupport.sk`.*

---

### WP-A2 — Pre-flight safety gates · `S` · depends on A1

Do this in phpMyAdmin before anything is promoted. **This is the package that stands between you and destroyed user accounts.**

1. **Back up the database and verify the backup.** Panel → phpMyAdmin → Export → Custom → all tables → gzip. Then actually check it:
   ```bash
   zcat dump.sql.gz | grep -c 'CREATE TABLE'
   zcat dump.sql.gz | grep -c 'INSERT INTO `users`'
   ```
   Both must be non-zero. Store it outside the repo. *An unverified backup is not a backup.*

2. **The gate that matters most:**
   ```sql
   SELECT migration_name, applied_at FROM migration_history ORDER BY id;
   ```
   **Expect exactly 21 rows.** If any row is missing — **stop.**

   > ✅ **Verified 2026-08-28: 21 rows present, gate PASSES.** `04_add_username_unique_constraint.sql` is recorded, so the destructive statement below cannot re-run.
   >
   > *Correction: an earlier draft said "22 rows". That was wrong.* Dev's `data/migrations/` holds 22 files, but `03_create_migration_history.sql` is the bootstrap — `migrate.php` executes it every run and explicitly skips recording it. So 22 files − 1 = **21 rows**. Separately, `04_email_verification.sql` exists only on `main` and was never applied here (this database was migrated from dev's set on 2026-07-09), so `users.is_verified` / `verification_token` were never created. Dev has zero references to either. **Anyone re-running this check should expect 21 and not abort on it.**

   Why: `data/migrations/04_add_username_unique_constraint.sql` ships in the release bundle and contains
   ```sql
   DELETE t1 FROM users t1 INNER JOIN users t2 WHERE t1.id < t2.id AND t1.username = t2.username;
   ```
   before its `ALTER TABLE users ADD UNIQUE (username)`. `user_progress`, `user_vocabulary`, `user_inventory` and `user_friends` all declare `ON DELETE CASCADE` on `users(id)`. **A single missing `migration_history` row fires that statement and cascade-deletes accounts and all their progress.** The only thing preventing it is that one row.

3. **Record the invariants:** `SELECT COUNT(*) FROM users;` and `SELECT COUNT(*) FROM user_progress;`. Write both down — they must be identical after the deploy.

4. **Decide the beta gate now.** `isConfigEnabled()` ([api.php:251](api.php:251)) treats empty/missing/`false` as **open**, so the apex accepts public signups the moment it goes live. Set the `BETA_INVITES_ENABLED` repo secret to `true` (or leave it deliberately open) **before** A4, so the cutover build bakes in the right value. One secret governs prod and dev simultaneously.

5. **Write the rollback card on paper:** the promotion SHA (filled in during A4), the path to the dump, and the literal `git revert -m 1 <sha>`. Also write a static maintenance `index.html` and leave it on your desktop — that is the 30-second kill switch.

**Done when:** verified dump exists, `migration_history` has all 22 rows, both counts recorded, beta-gate secret decided.

---

### WP-A3 — Harden the pipeline on `dev`, where it is safe · `M` · depends on A1 — ⏳ **IN PROGRESS**

> ⏳ **NOT COMPLETE. Re-checked live 2026-08-28: [PR #262](https://github.com/Neolix-Studio/Learn-English-Interactively/pull/262) is still `OPEN` against `dev` at head `fbf3062`, so none of this has deployed.** Two blocking review findings have since been fixed on the branch (see the progress log), and all checks are green — but green checks are not the exit criterion. A work package is done when it is **merged, deployed to `dev`, and its done-when checks pass on the live host** — not when CI goes green on a branch. Current state of the three checks below:
>
> | Check | Result |
> |---|---|
> | `dev.lexipaws.eu/` returns 200 | ✅ — but this passed **before** A3 too, so it proves nothing about this package |
> | CSP header present, with `googletagmanager` | ✅ — likewise pre-existing, served by the root `.htaccess` |
> | `.ftp-deploy-sync-state.json` returns 403 | ❌ **still 200, still 69,475 bytes** |
>
> **Change (d) — the one item on this list with live security impact — is not in effect.** The deploy manifest, listing every deployed file with hashes and sizes, is publicly readable on `dev.lexipaws.eu` right now. Until the PR merges and deploys, A3 buys nothing.

One PR into `dev`. Everything here is rehearsed on `dev.lexipaws.eu` before it can touch production.

| # | Change | File | Why |
|---|---|---|---|
| a | **Make the health check able to fail** | `.github/workflows/verify-deploy.yml:177` | `curl -f` passes on any 200, and api.php's PDO catch echoes a Hungarian error body with **no** `http_response_code()`. A dead database currently reports a green deploy. |
| b | **Delete `public/.htaccess`** | `public/.htaccess` | Near-duplicate with a stricter CSP (`script-src 'self'` — no Tag Manager, no Google Fonts, no Headway). The root file wins only by copy order in `build_release.js`. If that order ever changes, analytics and fonts break site-wide with no obvious cause. |
| c | **Remove the dead gateway rewrite** | `.htaccess:4-5` | `gateway.html` does not exist on `dev`; Gateway is a React route ([App.tsx:51](src/App.tsx:51)). The rule is host-conditional, so it has **never executed** and would fire for the first time ever on the production apex. Removing it makes the apex the same code path as `.hu`/`.sk`, which *is* exercised daily. |
| d | **Deny the deploy manifest** | `.htaccess` | `https://dev.lexipaws.eu/.ftp-deploy-sync-state.json` returns **200 with 69,475 bytes** listing every deployed file, hash and size — on a public repo's host. |
| e | **Upload a release artifact** | `verify-deploy.yml` | Add `actions/upload-artifact` for `./release/`, excluding `release/db_config.php`. The pipeline currently produces nothing you can restore from by hand. |
| f | **Add `workflow_dispatch:`** | `verify-deploy.yml` | Gives you "redeploy production without a code push" — exactly what you need when an FTPS upload dies halfway on shared hosting, the single most likely failure mode. |
| g | **Defuse the migration landmines** | `data/migrations/{04_add_username_unique_constraint,07_add_energy_system,11_add_user_cosmetics}.sql` | Change bare `ADD COLUMN` → `ADD COLUMN IF NOT EXISTS` (07, 11), and rewrite 04 to drop the `DELETE` and use `ADD UNIQUE KEY IF NOT EXISTS`. All three are already in `migration_history`, so **this changes nothing on production** — it only ensures a future replay fails loudly instead of silently deleting accounts. |

For (a), assert on `"session"` — **not** `"success"`:

```yaml
BODY=$(curl -fsS "${{ steps.vars.outputs.site_url }}/api.php?action=get_session")
echo "$BODY"
echo "$BODY" | grep -q '"session"' || { echo 'health check failed: no session payload'; exit 1; }
```

`handleGetSession()` ([api.php:911](api.php:911)) returns `{"session":null}` when logged out. There is **no `success` key on this endpoint** — asserting on it would fail every deploy on a healthy site.

**Done when:** merged to `dev`, **deployed**, and all three checks below pass **against the live host** — check 3 is the one that actually discriminates, since 1 and 2 already pass without this package:
```bash
curl -sI https://dev.lexipaws.eu/ | head -1                                    # 200
curl -sI https://dev.lexipaws.eu/ | grep -i content-security-policy            # present, with googletagmanager
curl -s -o /dev/null -w '%{http_code}\n' https://dev.lexipaws.eu/.ftp-deploy-sync-state.json  # 403
```

---

### WP-A4 — Promote `dev` → `main` and deploy · `M` · depends on A1, A2, A3

**First, de-stale your local git. This is a real trap.**

```bash
git fetch origin --prune
git rev-parse origin/main   # MUST be 9725d11d108dcd974ee89ceffb4809f37b923568
git rev-parse origin/dev    # MUST be 080f59c2d4aa103c7f4679dd461f2c074de3882f
```

Local `main` is `5f958c3` and local `dev` is `4dc050b` — **both stale**. A merge rehearsal run off the stale refs produces a completely different, deceptively clean result that silently drops `9725d11`. Never run the promotion off a local branch name.

**Seed the runtime directories first.** Over FTP, copy `lexipaws.eu/sub/dev/avatars/` → `lexipaws.eu/web/avatars/` and `.../audio/` → `.../web/audio/`. The database is shared but the filesystems are not: `users.avatar` and `tts_cache` rows already point at these filenames, while [upload_avatar.php:95](upload_avatar.php:95) writes to `./avatars/` and [api/tts.php:73](api/tts.php:73) reads `__DIR__/../audio/`, both relative to each docroot. Skip this and avatars render broken and every cached clip is re-synthesised against your Google TTS billing — while the 30/hour limiter caps learners at HTTP 429 mid-lesson on launch day.

**Tag the old production tip:**
```bash
git tag -a prod-vanilla-2026-07-04 9725d11 -m 'Last vanilla production build, deployed 2026-07-04'
git push origin prod-vanilla-2026-07-04
```

**Promote with the `-s ours` recipe** — a real two-parent merge whose tree is identical to `dev`, with zero conflicts:

```bash
git checkout -B release/react-to-prod origin/main
git merge -s ours --no-commit origin/dev
git rm -rq .
git checkout origin/dev -- .
git commit -m 'Promote React app to production'

git diff --stat origin/dev HEAD    # THE GATE — must print nothing
```

This was dry-run verified: it yields `parents=9725d11 080f59c` and a tree hash equal to `origin/dev^{tree}`. **The gate only reads empty *after* the commit** — running it earlier shows a huge diff and will scare you off a correct promotion.

*Why not a plain `git merge --no-ff`:* it produces four conflicts (`cypress.yml`, `.gitignore`, `api.php`, and `js/dashboard.js` modify/delete) and leaves seven legacy files behind. `check_php_security.js` then fails on `cron_cleanup.php:1 [unguarded-maintenance-endpoint]`, and since `deploy` has `needs: verify`, that blocks the deploy outright.
*Why not `git reset --hard && push --force-with-lease`:* it leaves no merge commit, so `git revert -m 1` is unavailable and rollback needs a second force-push.

**Open a PR into `main`, wait for green, then fast-forward:**
```bash
git push origin release/react-to-prod:main
git rev-parse main                  # RECORD THIS SHA on the rollback card
```

The `verify` job spins up a fresh `mariadb:10.6` and runs `php migrate.php` against an empty database — a full from-scratch rehearsal of the migration set.

**Watch the deploy and read three things:**
- FTP step: either *"this must be your first publish!"* or a list of `Delete:` lines removing vanilla files.
- **Migration step MUST print `"applied": []`.** Any filename listed → stop and inspect `migration_history` before anyone signs in.
- Health check returns a real session payload.

**Verify:**
```bash
for u in https://lexipaws.eu/ https://www.lexipaws.eu/ https://lexipaws.hu/ https://lexipaws.sk/; do
  echo "$u -> $(curl -s -o /dev/null -w '%{http_code}' $u)"; done          # all 200
curl -s 'https://lexipaws.eu/api.php?action=get_session'                   # {"session":null}
curl -s -o /dev/null -w '%{http_code}\n' https://lexipaws.eu/deep/spa/route # 200 via SPA fallback
for f in db_config.php security.php .ftp-deploy-sync-state.json; do
  echo "$f -> $(curl -s -o /dev/null -w '%{http_code}' https://lexipaws.eu/$f)"; done   # 403 403 403
```

Then **re-run the invariants** from A2 — `users` and `user_progress` counts must match, `migration_history` must still be 22 rows — and register a throwaway account, complete a lesson, log out, log back in, confirm XP persisted.

**Immediately after a green cutover:**
- **Golden copy:** server-side copy `lexipaws.eu/web` → `web_good_20260828`. `.ftp-deploy-sync-state.json` lives *inside* the directory, so restoring by rename also restores CI's diff state. Repeat after every successful production deploy; keep the last two.
- **Repoint the cron jobs.** `cron_cleanup.php` existed only on `main` and is not in the release — any panel cron calling it starts 404-ing at cutover. The release ships `cron_notifications.php` and `cron_reset_leaderboards.php`. Leaving them pointed at dev means streak emails and leaderboard resets fire from staging against the shared production database.

**Rollback tiers**

| Tier | Situation | Action | Time |
|---|---|---|---|
| 0 | Need it dark *now* | FTP a static maintenance `index.html` over the deployed one — the SPA fallback routes everything to it | ~30 s |
| 1 | Bad deploy | `git revert -m 1 <promotion-sha>` and push. No force-push, no history rewrite; re-promote later by reverting the revert. | 3–5 min |
| 2 | CI itself broken | `git switch main && npm ci && npm run package:release`, FTP `release/` contents up. **Delete `release/db_config.php` before transferring** — the server copy holds the real secrets. | 15 min |
| 3 | Database | **Effectively no rollback — go forward.** Restoring the dump also erases everything testers created on dev since. Prefer a corrective migration or targeted `UPDATE`. | — |

**Abort gates — stop, do not continue:**
- `_probe.txt` does not return 200 (A1)
- `migration_history` is not exactly 22 rows (A2)
- the PR's `verify` job is not green
- the deploy's migration step prints **any** filename under `applied`
- post-deploy `users` / `user_progress` counts do not match A2
- `api.php?action=get_session` returns the Hungarian database-connection error
- `https://lexipaws.eu/db_config.php` returns anything but 403

---

# Phase B — Data integrity & economy

> This phase exists because **the app currently cannot reliably remember anything.** Until B1 lands, no feature touching progress, streaks, energy, quests or themes can be trusted, and no beta metric is meaningful.

---

### WP-B0 — Close the live clamp bypass · `S` · **do this before B1**

Two live exploits, independent of everything else, both small.

**1. `POST {"scores": 0}` permanently disarms every anti-cheat clamp.** `parseProgressData` does `json_encode(0)` → the string `"0"`, which is stored. On every subsequent request `!empty($currentDbProgress['scores'])` ([api.php:1006](api.php:1006)) is **false**, because `"0"` is falsy in PHP. The entire bones / streak_shields / node_state clamp block is skipped from then on, and the next `{"scores":{"bones":999999999,…}}` is written raw.

Fix: replace the `!empty()` guard with a `json_decode`-based check (decode to array, default `[]`), and run the clamps unconditionally whenever `scores` is present in the payload.

**2. `save_progress` has no rate limit.** `security_rate_limit` appears only on beta_request, signup, login, forgot/reset password and feedback. Without it the +100 points / +100 bones / +3 shields per-request caps are **not caps**. Add one keyed on `$_SESSION['user_id']`.

**Done when:** `{"scores":0}` followed by an inflated payload is rejected; a scripted loop against `save_progress` is throttled.

---

### WP-B1 — Stop `save_progress` destroying 11 columns · `M` · **highest priority in the codebase**

**The bug.** The client sends 5 of 17 fields ([UserContext.tsx:366-372](src/context/UserContext.tsx:366)); `parseProgressData` ([api.php:966-985](api.php:966)) substitutes hardcoded defaults for every absent key; the `INSERT … ON DUPLICATE KEY UPDATE` ([api.php:1059-1085](api.php:1059)) writes `VALUES()` for all 17. Net effect **on every autosave**:

`level`→1 · `streak_count`→0 · `streak_shields`→0 · `last_active_date`→NULL · `unlocked_items`→[] · `active_theme`→'default' · `earned_xp_per_node`→{} · `daily_quests_date`→NULL · `active_quests`→[] · `energy`→5 · `last_energy_refill`→now

> ### ⚠️ Read this before starting — two independent adversarial reviews rejected the obvious fix
>
> **The obvious fix — read the existing row and merge — is the wrong mechanism.** Both reviewers reached that conclusion separately. It introduces a lost-update race (the SELECT and the upsert are outside any transaction, unlike `handleBuyCosmetic` and `handleClaimReward` which both use `FOR UPDATE`), so an autosave landing mid-purchase silently rolls the purchase back — item kept, bones restored — *from an honest client, with no crafted payload*. It also fatals on users with no `user_progress` row: `$stmtCheck` is an `INNER JOIN`, so `fetch()` returns `false`, and indexing it raises a **TypeError**, which is an `Error` and therefore **not** caught by the `catch (Exception)` at [api.php:1149](api.php:1149).
>
> **Use this instead:** remove the 11 never-sent columns from the `ON DUPLICATE KEY UPDATE` assignment list at [api.php:1062-1078](api.php:1062), while keeping them in the `INSERT` column/VALUES list. Keep only `points`, `completed`, `scores`, `quest_progress`, `completed_quests_today` in the UPDATE list.
>
> This is **exactly what already protects `active_title` and `active_border`**. It is atomic, needs no extra SELECT, and eliminates the race and the no-row fatal entirely. New users still get sane values from the INSERT; existing users keep what they had.

> ### 🚨 PREREQUISITE — this fix reactivates a destructive cron
>
> **Preserving `streak_count` and `last_active_date` is an active data-destruction change until `cron_notifications.php` is neutralised.**
>
> [cron_notifications.php:54-97](cron_notifications.php:54) selects `WHERE up.streak_count > 0 AND up.last_active_date < CURDATE() - INTERVAL 1 DAY`. Today that matches **nobody**, precisely because every autosave writes `streak_count=0` and `last_active_date=NULL`. **The bug is currently suppressing a worse bug.**
>
> Stop the wipe and legacy rows start matching — and remember `dev` and production share one database, so the vanilla app's rows are real. The cron's only write to `last_active_date` (line 67-69) sets it to *yesterday*, never today, and **nothing anywhere in the repo ever sets it to `CURDATE()`** (verified by grep across all PHP). So: run 1 burns a shield, run 2 burns the last one, run 3 hits the `else` branch and executes `UPDATE user_progress SET streak_count = 0`. Three daily "streak_protected" emails, shields destroyed, streak destroyed — and the user can never escape.
>
> **Before shipping B1, do one of:** disable the at-risk query, add a writer that sets `last_active_date = CURDATE()` on every successful save, or gate the query on a non-stale date.

**What this fix does *not* do** — do not claim these as done:

- **It does not fix `active_theme`.** The user's choice never reaches the column: `SidebarLeft.tsx:109-114` and `ProfilePage.tsx:74-79` write `scores.active_theme`, and the payload carries `scores` but no top-level `active_theme`. Worse, [UserContext.tsx:130-132](src/context/UserContext.tsx:130) has the **column unconditionally clobber the JSON on every session load**. Theme selection is lost on reload before *and* after. → **WP-B3**
- **It does not fix `daily_quests_date` / `active_quests`,** so it does not stop streak inflation. Those are posted to `update_progress`, which reads only `$data['xp']` and discards them. Preserving the column preserves `NULL` forever, so the per-page-load quest reroll and the `streak_count += 1` at `UserContext.tsx:213` both continue. → **WP-B3**
- **It does not restore energy as a gate.** The client never sends `energy`, so the column just freezes at its default of 5.

**Done when:** complete a lesson → reload → `streak_count`, `streak_shields`, `level`, `earned_xp_per_node` and `unlocked_items` are unchanged in the database. `cron_notifications.php` verified safe against a legacy row. All 22 `migration_history` rows untouched.

---

### WP-B1b — Whitelist what `save_progress` may write · `S` · **must ship with B1**

B1 turns a self-healing surface into a **permanent** one. Every one of these is currently harmless only because the next autosave overwrites it 1.5 seconds later:

| Payload | Effect after B1 |
|---|---|
| `{"active_theme":"halloween"}` | A 500-bone cosmetic, free and permanent. `parseProgressData` passes it straight through with **no check against `user_inventory`**, while `handleBuyCosmetic` charges for it under `FOR UPDATE`. |
| `{"streak_shields":999999}` | Permanent. The +3/request clamp operates on the **JSON** `scores.streak_shields`; the top-level **column has no clamp at all** — and `handleClaimReward` uses that column as the additive base for reward grants. |
| `{"energy":0}` | **Permanent self-lockout.** Nothing else ever raises the column, so `Dashboard.tsx:108` blocks every lesson start forever. Only escape is the 1-hour-cooldown feedback refill or a manual DB edit. |
| `{"level":99, "unlocked_items":[…]}` | Permanent, unvalidated. |

**Fix:** restrict the writable column set to what the client actually sends. Reject or ignore `level`, `streak_count`, `streak_shields`, `active_theme`, `unlocked_items`, `daily_quests_date`, `active_quests`, `energy` and `last_energy_refill` when they arrive from a client. If `active_theme` stays writable, validate it against `getUnlockedThemes()` plus the built-ins.

Also reconcile the two conflicting default sets: `parseProgressData` says `streak_shields` 0 / `active_theme` 'default', while `handleSignup:560-561` says 2 / 'system'. Pick one, or B1 bakes the wrong one in permanently.

---

### WP-B2 — Close the currency-minting holes · `M` · depends on B1

Three separate holes, all verified:

1. **No rate limit on `save_progress` / `update_progress`.** The only `security_rate_limit` calls in `api.php` are on beta request, signup, login, forgot/reset password and feedback. The caps (+100 XP, +100 bones, +3 shields per request) are **per request**, so a loop mints indefinitely.
2. **Guest migration at signup is uncapped.** `mergeGuestProgressIntoUser` ([api.php:667-696](api.php:667)) merges numerics with `max()` and no cap, from a payload that is entirely `localStorage`. Editing one key before logging in grants arbitrary bones, XP, achievements and streak — bypassing every delta cap.
3. **Mass assignment.** `parseProgressData` writes 17 client-supplied fields through; only 5 are checked. `unlocked_items`, `active_theme`, `level` and `completed` are stored verbatim, so a client can hand itself every cosmetic and every completed node, bypassing the paid `buy_cosmetic` path.

Note that B1 narrows (3) considerably by construction, since unsent keys stop being writable — sequence B1 first.

**Also fix here:** `security_rate_limit()` ([security.php:105-121](security.php:105)) stores counters in **`$_SESSION`**. The bucket keys embed `REMOTE_ADDR`, which makes them *look* IP-scoped, but dropping the cookie resets every limit in the app simultaneously — login brute force, signup flooding, password reset, beta-request spam, and the Google-TTS quota that costs real money.

**Done when:** a scripted loop against `save_progress` is throttled; a hand-edited `neolix_guest_progress` cannot grant more than a bounded amount at signup; dropping the session cookie does not reset the login limiter.

---

### WP-B3 — Fix the gamification correctness bugs · `M` · depends on B1

The ones B1 does *not* fix:

| Bug | Where | Fix |
|---|---|---|
| `accuracy` hardcoded to `100` at all 5 call sites → `flawless` + accuracy quests always fire | `Dashboard.tsx:197,210`, `CharacterLesson.tsx:23`, `PracticePage.tsx:64`, `FTUELesson.tsx:20` | pass `scoreData.accuracy` |
| `get_friends` reads `monthly_xp` from the wrong table → whole endpoint collapses for anyone with a league friend | [api.php:1996-1999](api.php:1996) | join `user_leagues` |
| `user_metadata` table **does not exist** → energy-refill-for-feedback always throws | `api.php:1713,1726`, `submit_feedback.php:42,57` | add a migration, or move `last_feedback_refill` onto `user_progress` |
| Streak shields stored in two disconnected places (`scores.streak_shields` JSON vs the column) and **never consumed** | `claim_reward` vs client | pick one store; implement or remove the mechanic |
| `handleUpdateProgress` reads only `$data['xp']`, which no caller ever sends → dead endpoint, and the daily-quest persistence call is a guaranteed no-op | [api.php:1155-1202](api.php:1155) | delete it or make it real |
| Sidebar leaderboard always shows Bronze | [SidebarRight.tsx:27](src/components/SidebarRight.tsx:27) | pass `league_id` |
| "Personal Level" permanently 1 — `scores.level` never written | `SidebarRight.tsx:44` | write it, or remove the display |
| Chests award nothing in 6 of 7 modules (requires ≥6 nodes) | [Roadmap.tsx:61-64](src/components/Roadmap.tsx:61) | rebalance |
| Weak-word rows are never cleared → practice loop has no exit condition | `user_failed_exercises` | decrement or delete on a correct answer. **Raised in priority by WP-F4** — exam retries feed this queue much faster than lessons do |
| **`phonics_match` can never be wrong** — `onAnswer(true)` fires once every pair is matched and mispairings only flash red for 800 ms, so 204 live items are unconditionally correct and inflate accuracy | [PhonicsMatch.tsx:74-84](src/components/LessonPlayer/exercises/PhonicsMatch.tsx:74) | **Owner decision 2026-08-28, now fully specified: a wrong attempt must count against accuracy while the exercise stays forgiving** — it still cannot be failed and still cannot block the lesson. **The rule: report `onAnswer(false)` once *any* mispairing has occurred, so the exercise incurs at most one mistake no matter how many wrong taps follow.** Never penalise per tap — `accuracy = max(0, 100 - mistakes*20)` is steep enough that four mistakes lands a learner at 20%. **Note the coupling:** `LessonPlayer.tsx:270-281` drives `mistakes` *and* `log_failed_exercise` off the same boolean, so this also pushes confused character pairs into weak-item practice. **Land it with the `accuracy` fix in the row above** — on its own it changes nothing the profile records |
| **Theme round-trip is broken** — the column clobbers the JSON on every session load, and the client never sends a top-level `active_theme` | [UserContext.tsx:130-132](src/context/UserContext.tsx:130) | either send `active_theme` top-level, or delete the clobber line. **B1 does not fix this.** |
| **Quest state is never persisted** → daily quests reroll and `streak_count` inflates on every page load | `UserContext.tsx:245-251` → [api.php:1155](api.php:1155) | make `handleUpdateProgress` persist `active_quests`/`quest_progress`/`completed_quests_today`/`daily_quests_date`, or route them through `save_progress`. **B1 does not fix this.** |

**Done when:** each row above has a passing manual check — including: pick a theme → reload → it survives; open the app twice in one day → the streak does not increment.

---

### WP-B4 — Make failures visible · `S`

The app currently cannot tell you when it breaks.

- `api.fetch` never throws ([utils/api.ts:67-70](src/utils/api.ts:67)) — every failure becomes a *resolved* `{error}`, so react-query's retry/error path is dead everywhere.
- The **CSRF token is cached and never invalidated** ([utils/api.ts:1](src/utils/api.ts:1)). Sessions last 30 days; once the PHP session lapses every POST 403s, the error is discarded, and **saves silently stop forever** until a full reload. Add 403-detect-and-refetch.
- **No flush on unload.** No `beforeunload`, `pagehide`, `sendBeacon` or `visibilitychange` anywhere in `src/`. The 1500 ms debounce is the only write trigger and several flows navigate with `window.location.href`. Finish a lesson, close the tab, it is gone.
- **A network blip demotes a logged-in user to guest** ([UserContext.tsx:169](src/context/UserContext.tsx:169)) and starts writing their real progress to `localStorage`.
- Five empty `catch (e) {}` blocks; `ErrorBoundary` only `console.error`s; **19 `alert()`/`confirm()` calls across 9 files** are the entire failure UI; no error-tracking SDK of any kind.

**Done when:** a failed save surfaces to the user; a stale CSRF token self-heals; closing the tab right after a lesson does not lose it; an error reporter is wired.

---

# Phase C — Mobile-first conversion

> **This is the phase that stops the bug class from regenerating.** Everything else in this plan fixes bugs that exist; this fixes the reason new ones keep appearing.

---

### WP-C1 — Establish the foundation · `M`

You cannot invert the media queries without a scale to invert them *to*.

**Breakpoints.** There are currently **20 distinct values across 39 queries** with four competing desktop thresholds (991 / 992 / 1199 / 1200) and a fifth documented in the old design guide (1024). Two byte-identical queries in `interactive.css` (lines 1180 and 1267) carry conflicting values. Pick **three**, name them, document them.

**Tokens.** Add what does not exist: a spacing scale, a radius scale, a z-index scale, a type scale. Today radii are ad-hoc literals from 4px to 999px and spacing is raw `rem`/`px`/`clamp()`.

**Fix the token bugs while you are in here:**
- **Seven custom properties are used but never defined:** `--color-bg-body`, `--color-border`, `--color-bg-main`, `--color-bg-inset`, `--glass-border-color`, `--color-bg-active`, `--border-color`.
- `--glass-border` is a *shorthand* (`1px solid #E5E7EB`) used as a colour in four places — all invalid and silently dropped.
- ✅ **DECIDED 2026-08-28 — Nunito is the brand typeface.** `--font-heading: 'Outfit'` and `--font-body: 'Inter'` (`main.css:4-5`) are never loaded — `index.html:33` fetches only Nunito — so both silently fall back to generic `sans-serif`. **Repoint both tokens at Nunito**, then delete the two hacks that were compensating for them: `dashboard.css:2849`'s `* { font-family: 'Nunito' }` and `landing.css:218`'s `!important`. Do not add Outfit/Inter font loads.
- ✅ **DECIDED 2026-08-28 — the accent is green `#10B981`.** `--color-accent-in` is `#3b82f6` in `main.css:12` but resolves to green, because a rogue bare `:root` at `landing.css:202-215` loads later and wins in light *and* dark. The decision **ratifies what already renders**, so light mode does not change. Set `main.css:12` to `#10B981` and delete `landing.css:206`.
  ⚠️ **Do not delete the rogue `:root` wholesale — it will break the landing page.** **Seven** tokens are defined *only* in that block (`landing.css:204-213`): `--color-bg`, `--color-surface`, `--color-primary`, `--level-a1`, `--level-a2`, `--level-b1`, `--level-b2` — with **16 live consumers, all inside `landing.css` itself** (`:219`, `:237`, `:268`, `:334`, `:387-400` — the level-card borders, shadows and buttons). **Rehome all seven into the C1 token block first, then delete the block.** *(An earlier pass said six — `--level-a1`…`--level-b2` is four tokens, not three.)* Blue is not banished: `--color-primary: #3B82F6` stays as a secondary and `--level-a2` is blue by design. The four theme scopes at `main.css:1032/1046/1060/1074` also re-declare `--color-accent-in` and are untouched.
  ⚠️ **`#10B981` is not shippable as one value — measured, not guessed.** It scores **2.43:1 as a foreground in light**, which fails AA for normal text (4.5:1), fails large text (3.0:1), *and* fails the non-text UI threshold of WCAG 1.4.11 — while scoring a comfortable 6.99:1 in dark. **White-on-green, the primary-button pattern, is 2.54:1.** Both shapes are live across 170 `--color-accent-in` usages. **Make the accent theme-scoped:** `#047857` (emerald-700) in light — 5.25:1 text, 5.48:1 white-on-fill — and `#10B981` in dark, where a fill needs a **near-black** label rather than white. `main.css:28-38`'s dark block does not redefine the accent at all today, so adding it is part of this package. **Extend the decision to `--color-accent-on` (58 uses) and `--color-accent-at` (10):** both are still blue, so the app currently renders a green base with blue hover/active and green→blue gradients. Full tables in §12.1 of `SOURCE_OF_TRUTH.md`.
  ⚠️ **Verify green in dark mode before closing this out.** Because the rogue block has always won, the blue build has never been seen — and `#10B981` was never chosen against a dark ground. *(§12.1 of `SOURCE_OF_TRUTH.md`.)*

**Done when:** three named breakpoints, a documented token set, zero undefined custom properties, a **theme-scoped** green accent whose light and dark values both clear **4.5:1 for text and 3.0:1 for non-text UI** (verified with a contrast checker, not by eye) across all three `--color-accent-*` tokens, font tokens pointing at Nunito with the two override hacks removed, and the landing page's level-card grid still rendering with its four level colours.

---

### WP-C2 — Invert the authoring direction · `L` · depends on C1

**The core structural fix.** Today: **38 `max-width` queries vs 16 `min-width`** — base styles are desktop, and mobile only works if someone remembers a shrink-down override.

Convert file by file so that **base rules (no media query) are the mobile layout**, and `@media (min-width: …)` blocks enhance upward. Then a forgotten media query yields a working phone layout that is merely plain on desktop.

Suggested order, easiest first — each is independently shippable:

| File | max / min today |
|---|---|
| `roadmap.css` | 7 / 2 |
| `legal.css` | 3 / 0 |
| `gateway.css` | 2 / 1 |
| `landing.css` | 9 / 1 |
| `interactive.css` | 19 / 13 |
| `main.css` | 34 / 11 |
| `dashboard.css` | 31 / 28 |

`dashboard.css` last: it is 4,479 lines with **401 `!important`s**, `.dashboard-container` defined 10×, `.dashboard-right-sidebar` 15×, and a pasted-in standalone prototype occupying lines 2837–3605 that brings its own `:root`, its own `*` reset, and global `body`/`h1,h2`/`p` rules. **Split that prototype block out before converting** — probably its own session.

**Done when:** `min-width` queries outnumber `max-width`; every page verified at 320/360/390 px and one desktop width.

---

### WP-C3 — Fix the known responsive breakage · `M`

| Bug | Where |
|---|---|
| **920 `fill_blanks` exercises are completely unstyled above 600 px** — all six compose-card classes live only inside mobile media queries; desktop shows an invisible blank and a stack of bare divs | `FillBlanks.tsx:121-138` + `interactive.css` blocks at 520, 1006, 1104 |
| `.cards-grid` collision breaks the landing page's level grid — `landing.css:44` defines a 4-column grid, `gateway.css:98` redefines it as a flex column and loads later | landing/gateway CSS |
| `gateway.css:43-54` sets `body { display:flex; align-items:center }` as the **last body rule in the bundle** — every page gets a flex-centred body | `gateway.css` |
| Touch targets below the project's own 44 px standard | `.btn-secondary` 30px, `.btn-primary` 36px, `.btn-close-icon` 36px, `.info-tooltip` 16px, `.interactive-submit-btn` 40px |
| `/leaderboard` and `/practice` have no `MobileBottomBar`; `Characters` has neither that nor a working right sidebar | those three pages |
| `SidebarRight` rendered with **no props** on three routes → mobile stats drawer permanently unreachable | `Leaderboard.tsx:418`, `PracticePage.tsx:217`, `Characters.tsx:227` |
| Reduced motion does not work — `animation-duration: -1ms` is invalid CSS and dropped, while infinite background loops run | `main.css:354` |
| `scaleUp` and `slideInRight` have **no keyframes anywhere**; `fadeIn` only exists inside `PostLesson`'s `<style>` tag | four modals |

Also close the six areas `MOBILE_UI_AUDIT.md:143-152` lists as never tested: authenticated Profile/Friends, all modals, every exercise type's states, soft-keyboard behaviour, notched safe-area, and 200% zoom / screen-reader focus order.

---

### WP-C4 — Delete the dead CSS · `M` · depends on C2

**272 of 575 class names (47%) appear in no `.ts`/`.tsx` file.** Verified dead: `.swipe-card*` (~200 lines), `.flip-card*`, `.option-card`, `.word-block`, `.quiz-opt-btn`, `.words-table*`, `.step-tabs`, `.exam-*`, `.brothers-*`, `.boss-arena*`, `.proto-card`.

Also delete: `src/index.css` and `src/App.css` (313 lines of unmodified Vite scaffold, imported by nothing), and fold `root-fix.css`'s single load-bearing `#root` rule into `main.css`.

**Owner decision 2026-08-28 — partially resolved:**

- ✅ **`.exam-*` — delete it.** Exams *are* coming (**WP-F4**), but these rules are old vanilla-app styling authored desktop-first. Keeping them would smuggle the pre-inversion layer past C2, and the new exam UI is authored against the C1 tokens. This is not a head start.
- ✅ **Matching — delete it.** The Beta matching feature is the **existing character/phonics activity** (`phonics_match`, 204 live items). The generic matching lesson that was removed is **not returning for Beta**, so its unreachable implementation goes too — `MatchPairs.tsx` (107 lines) and its `match_pairs` switch case, tracked under **WP-F3**.
- ✅ **`.swipe-card*` and `.flip-card*` — safe to delete. Investigated 2026-08-28 (report only, nothing implemented).** Neither is a reserved future feature; **both are working features of the *old vanilla app* whose JavaScript was dropped in the React migration, leaving the CSS orphaned.**
  - **On `dev` (React) there is no implementation of either.** Zero `.tsx`/`.ts` references to any `.swipe-*` or `.flip-card*` class. The only hit for "flip" in `src/` is `ProductTour.tsx:38`'s `flipOptions`, which is a **Floating-UI positioning option and unrelated to flip cards**. All 30 `.swipe-*` rules and the `.flip-card*` block live only in `dashboard.css` (`:1256-1290`, `:2590-2760`).
  - **On `origin/main` (vanilla) both are fully implemented** in `js/dashboard.js`: a **flip-card grid** (`:2225-2260`, click-to-toggle `.flipped`) and a **swipe vocabulary deck** (`:2896-3119` — `initSwipeDeck`, drag handling, and Hungarian "TUDOM" / "MÉG GYAKORLOM" *know / still practising* overlays).
  - **So the answer to "is this reserved?" is no — it is residue.** Deleting the CSS loses nothing: the working reference implementation stays in git on `main` for whenever the swipe deck is scheduled as a React feature. **Reinstating either is a new feature package, not a CSS revival** — the vanilla version is desktop-first and predates every Phase-C convention.
- ⚠️ **Still open — confirm before deleting:** `.option-card`, `.word-block`, `.quiz-opt-btn`, `.words-table*`, `.step-tabs`, `.brothers-*`, `.boss-arena*`. *(`.boss-arena*` goes with the `BossEncounter` deletion — the encounter is post-Beta and will be rebuilt against the C1 tokens; see WP-F3.)*

---

# Phase D — Slovak (Option A) · *owner-approved*

### WP-D1 — Migrate the data to sibling keys · `M`

Merge `data/sk/` into `data/hu/` as sibling `"sk"` keys, then delete `data/sk/`. **1,441 `"hu"` keys across 50 files.** Purely mechanical — `data/sk` was only ever a placeholder, so there is nothing to reconcile.

Seed new `"sk"` values as **`null`, not the Hungarian fallback**, so untranslated content is visibly untranslated rather than silently Hungarian — and so `count(null)` is a free progress metric.

Rename the tree to a neutral location (`data/A1/…`) since it is no longer language-scoped.

### WP-D2 — Wire the code · `S` · depends on D1

Only **four live call sites** read the field: [FillBlanks.tsx:29](src/components/LessonPlayer/exercises/FillBlanks.tsx:29), [WordOrder.tsx:82](src/components/LessonPlayer/exercises/WordOrder.tsx:82), [LessonPlayer.tsx:346](src/components/LessonPlayer/LessonPlayer.tsx:346) and [:460](src/components/LessonPlayer/LessonPlayer.tsx:460). *(`engine.ts` and `MatchPairs.tsx:17` are in the dead generator path.)*

Plus three wiring fixes that **must land in the same PR or Slovak still will not appear**: the hard-coded imports of `data/hu/vocabulary.json` ([LessonPlayer.tsx:23](src/components/LessonPlayer/LessonPlayer.tsx:23)) and `data/hu/grammar.json` ([GrammarModal.tsx:2](src/components/modals/GrammarModal.tsx:2)), and the loaders that default to `'hu'` because all three callers omit the argument ([roadmapLoader.ts:28](src/utils/roadmapLoader.ts:28), [storyLoader.ts:29](src/utils/storyLoader.ts:29)).

Side benefit: removes ~1.3 MB of duplicate JSON from the bundle.

### WP-D3 — Cover the untranslated UI · `L`

Only 13 of 68 `.tsx` files import `useTranslation`; **51 contain Hungarian string literals**, and the locale files cover roughly 7% of user-facing strings.

Priority order: **the product tour first** — it is hardcoded English for both audiences while **32 fully translated `tour.*` strings sit unused** in both locale files ([ProductTour.tsx:133-172](src/components/ProductTour.tsx:133)). Then `Leaderboard` (16 unused `leaderboard.*` keys), then every exercise instruction, then the landing page and legal pages, then `api.php`'s 74 lines of Hungarian-only errors.

Also fix the five `t()` keys that resolve to nothing (`levels.a1_desc`–`b2_desc`, `dashboard.title`), and the signup path that derives `base_language` from hostname only ([AuthModal.tsx:80-82](src/components/AuthModal.tsx:80)) so `lexipaws.eu` registrants are permanently mislabelled Hungarian.

---

# Phase E — Security hardening

| # | Package | Size | Content |
|---|---|---|---|
| **E0** | **Purge the seeded bot accounts** | `S` | **The production database holds ~500 bot accounts** (`bot1@lexipaws.local` … `bot500@lexipaws.local`, seeded by `tools/local/maintenance/dev_simulate_bots.php`) out of 511 total users. Their password is **hardcoded as `botpassword` at [dev_simulate_bots.php:35](tools/local/maintenance/dev_simulate_bots.php:35) in a public repository** — so anyone can log into 500 production accounts and obtain valid authenticated sessions. Combined with the Phase B minting holes that is a serious lever, and they will also pollute the beta leaderboard. Delete them **after** the WP-A2 backup; mind the cascading foreign keys on `users`. Consider also rotating the bot password constant or moving the script out of the tracked tree. |
| **E1** | Rotate credentials | `S` | Rotate `MIGRATION_TOKEN` and the SMTP password; delete `db_config_prod.php` (nothing reads it — pure credential residue). **Owner task.** |
| **E2** | Fix CORS + CSRF | `S` | The allowlist is duplicated in **two files that must be edited together** — `api.php:7-26` and `security.php:22-35` — and both still include `neolix.studio` and four `localhost` origins **in production**, with `Allow-Credentials: true`. Since `csrf_token` is served over GET, script on any of those origins can drive every authenticated action. |
| **E3** | Protect the exposed endpoints | `M` | `beta_admin.php` has **no brute-force protection and is not in the `.htaccess` deny list**; `report_problem.php` is fully unauthenticated and mails a Jira intake; cron secrets travel in `?secret=` and land in access logs; `api/tts.php` has no session check, so anyone can bill your Google account. |
| **E4** | Session & password fixes | `S` | `update_password` / `reset_password` don't regenerate the session id or invalidate other sessions (30-day cookies). Password policy **caps length at 16 chars**, blocking password managers. `handleSyncVocabulary` leaks the raw PDO message ([api.php:1571](api.php:1571)). Open redirect on `?redirect=` after auth ([AuthModal.tsx:110-112](src/components/AuthModal.tsx:110)). |

---

# Phase F — Curriculum correctness

| # | Package | Size | Content |
|---|---|---|---|
| **F1** | Fix broken content | `S` | The **one unsolvable exercise** (`node3_family_ties.json` `item_df635034` — `correctAnswer` needs "He … brother", tiles only offer "She"/"sister"; currently an uncommitted working-tree edit, so it ships if committed). Delete the **19 `<text>` elements in `svgDictionary.json` that spell the English answer**, fixing 34 exercises. Fix the six `image_choice` prompts that leave the L1 word in English. |
| **F2** | Make `validate:json` real | `M` | It applies a schema check to **1 of 144 files** while printing *"144/144 matched known schema checks"*. Add real validation: solvable `word_order` tiles, answer-present-in-options, exactly-one-correct-option, duplicate ids, hu/sk parity. This is the main automated guard on content contributions. |
| **F3** | Delete the dead content layer | `M` | ✅ **Largely decided 2026-08-28 — see `SOURCE_OF_TRUTH.md` §21 Q19.** Delete all four of `BossEncounter` (301), `engine.ts` (166), `Dictation` (93) and `MatchPairs` (107) — **~667 lines, zero behaviour change**, since none of it executes. **The product ideas are not being cancelled with the code:** the **boss encounter is post-Beta** and the **dictation exercise is deferred to CEFR B1/B2** (transcription does not fit an A1-only curriculum); both stay on the roadmap and are rebuilt against the Phase-C tokens when scheduled, with git history as the reference. The generic **matching lesson is not returning** — `phonics_match` is the Beta matching feature. `.boss-arena*` CSS goes with the encounter (WP-C4). ⚠️ **Still open:** `learningContent.ts` (465), `Onboarding.tsx`, `MoraleBoost`, `HarderEncouragement`, `data/quests.json`, `services/api.ts`. |
| **F4** | **End-of-module exams** | `L` **epic — split before starting** | **New scope, owner-decided 2026-08-28. Post-Phase-C · depends on F2, and on B3 for a real score.** Pass threshold **80%**. Soft gate for Beta: passing awards module completion **once**, failing does **not** block the next module, retries unlimited and non-farmable, wrong answers feed weak-item practice. **F4 also owns the telemetry that FR-1 will be decided from** (`SOURCE_OF_TRUTH.md` §20). ⚠️ **Not session-sized — decompose into F4a–F4e first. Full detail below.** |

---

### WP-F4 — End-of-module exams · `L` · **post-Phase-C** · depends on WP-F2

> ⚠️ **F4 is an epic, not a session — it must be split before anyone starts it.** Every other package in this plan is sized to one focused working session; this one is not, and pretending otherwise is how it gets started and abandoned half-done. **The first task is decomposition**, and the natural seams are already visible below: (i) define the `sectionExam.json` schema and extend the F2 validator to it; (ii) author the content for one module; (iii) build the exam runner and its pass/fail result screen; (iv) implement server-side award-once and scoring; (v) instrument the FR-1 telemetry. **Do not begin (ii)–(v) until (i) exists**, and re-scope the rest once (i) shows how big the content really is. Each seam becomes its own `F4a`…`F4e` entry with its own done-when.

**New scope, owner-decided 2026-08-28.** This is the first genuinely new feature after the Phase A/B/C gate lifts, and it is placed after Phase C deliberately: an exam is a new full-screen flow, and building it before the mobile-first inversion would reproduce the exact bug class Phase C exists to stop.

**Why it depends on F2.** An exam is the highest-stakes content in the product — it is the thing that tells a learner they passed or failed a module. `validate:json` today schema-checks **1 of 144 files** while printing *"144/144 matched"*, so authoring exam content against it means authoring unverified answer keys. F2's checks (solvable tiles, answer-present-in-options, exactly-one-correct-option, duplicate ids, hu/sk parity) are what make exam content safe to write. Useful detail: `scripts/validate_json.js:165` **already dispatches a `validateSectionExam` for a `sectionExam.json` that has never existed** — the schema slot is reserved but empty, and F2 should define its real shape.

**Owner decisions — settled, not options:**

| | Decision |
|---|---|
| **Placement** | One exam at the end of each module. |
| **Pass threshold** | **80%.** Owner-decided 2026-08-28. |
| **Beta gating** | **Soft gate.** Passing awards module completion; **failing does not block the next module.** |
| **Award** | Module completion is awarded **once**, on the first pass. |
| **Retries** | **Unlimited**, and they **cannot farm rewards** — no retry, after a pass or a fail, pays out again. |
| **Wrong answers** | **Feed weak-item practice** — the same `user_failed_exercises` path the lesson player already uses. |
| **Hard gates** | **Deferred to full release**, decided on Beta evidence. Tracked as **FR-1** in `SOURCE_OF_TRUTH.md` §20. |
| **Telemetry** | **F4 must collect the FR-1 evidence** — this is a deliverable of the package, not a follow-up. See below. |

**What already exists to build on:**

- **The award-once pattern is already in the codebase.** The chest node does exactly this: [Roadmap.tsx:67-69](src/components/Roadmap.tsx:67) writes `scores.node_state[node.id] = { completedLessons: ['chest_opened'] }`, and [:44](src/components/Roadmap.tsx:44) refuses to re-fire for any status but `current`. An exam pass can use the same `node_state` marker as its idempotency key — no new storage shape needed.
- **The weak-item path is free if the exam runs through `LessonPlayer`.** [LessonPlayer.tsx:274-281](src/components/LessonPlayer/LessonPlayer.tsx:274) already POSTs `log_failed_exercise` on every wrong answer (skipping guests and the tutorial); [api.php:856](api.php:856) upserts into `user_failed_exercises` with a `fail_count`; `PracticePage` reads it back through `get_weak_words` ([PracticePage.tsx:28](src/pages/PracticePage.tsx:28)). Reusing the player honours the wrong-answers decision at **zero cost**; writing a bespoke exam runner means re-implementing it, and forgetting to is the likely failure.

**What has to be designed — and the traps:**

1. **"Cannot farm rewards" is not free, and the naive version is client-side.** Reward math is client-authoritative (`SOURCE_OF_TRUTH.md` §8) and `save_progress` still has **no rate limit**, so an exam that pays XP or bones is a **new minting surface**. The award-once check must be **server-side** or it is advisory only. **Do not ship an exam reward before WP-B2.**
2. **A soft gate has to be visibly soft.** A failure that silently changes nothing reads as a bug — the learner needs to see three things at once: you did not pass, here is what to practise, the next module is still open. Getting this wrong is how a soft gate produces the retention damage a hard gate was supposed to.
3. **Unlimited retries + weak-item logging has no exit condition today.** Five retries write five rounds of weak items, and **weak-word rows are never cleared** (WP-B3). Exams will fill that queue far faster than lessons do. **Fix the clearing rule in B3 before exams ship**, or practice becomes an ever-growing wall — which then punishes exactly the learners the retries were meant to protect.
4. **Content volume is 7 modules × 2 languages.** Under the Phase-D sibling-key model that is one tree with `"sk": null` seeds. Exams are **not** a reason to fork `data/` again.
5. **`Module_6_Out_And_About` has no `node4`** (`SOURCE_OF_TRUTH.md` §7 — never authored, not deleted). Settle whether that module is complete before writing an exam that claims to test it.
6. **The 80% threshold makes WP-B3 a hard prerequisite, not a nice-to-have.** Nothing in the product currently computes a score that survives the lesson: `accuracy` is the literal `100` at all five `completeLesson` call sites until B3 passes `scoreData.accuracy` through. **An exam with an 80% pass line built on top of that would mark every learner as passing**, silently and convincingly. B3 must land first.
7. **80% interacts badly with the current accuracy formula — check this before authoring content.** `LessonPlayer` computes `accuracy = max(0, 100 - mistakes*20)`, which only takes the values 100, 80, 60, 40, 20, 0 regardless of exam length. Under that formula "80%" means **exactly one mistake allowed**, on a 10-question exam as much as on a 30-question one. **The exam almost certainly needs a real percentage** — `correct / total` — rather than reusing the lesson's penalty formula. Decide this in seam (iii) and write it into the schema, because it changes what a fair exam length is.

**F4 must collect the evidence FR-1 will be decided on.** The soft gate is a deliberate experiment, and an experiment that records nothing is just a shipped feature. **Instrumentation is in scope for this package** — deferring it means the Beta produces no answer and the hard-gate question rolls forward by default. Per attempt, persist at minimum: user, module, attempt number, **score as a percentage** (not just pass/fail — the distribution around the 80% line is the single most informative number, since a cluster at 70–79% says the threshold is wrong rather than the gate), pass/fail, and timestamp. Then FR-1 can be answered from data:

| FR-1 needs to know | Comes from |
|---|---|
| First-attempt pass rate per module | attempt number = 1, grouped by module |
| Whether 80% is the right line | the score distribution just below and above it |
| Whether failures are learner or exam | retry counts and whether scores improve across attempts |
| Whether soft gating hurts | do learners who failed and continued struggle in the next module |
| Whether the practice loop closes | is the weak-item queue exam failures feed actually worked down |

There is no analytics SDK in the app (§18 — zero matches for Sentry/Bugsnag/etc.), so this is a small server-side table, not a vendor integration. It should also survive the `save_progress` column-wipe class of bug — **write it from the server on exam submission, not as another client-supplied JSON blob.**

**Done when** *(for each split package; this is the whole-epic exit)***:** one module has an exam end-to-end; the pass line is **80%** of a real per-exam score, not the lesson penalty formula; passing marks module completion **exactly once**, enforced **server-side** (verified by re-running the exam and observing no second award); failing leaves the next module reachable **and visibly says so**; wrong answers show up in `get_weak_words`; every attempt is recorded with its percentage score in a form FR-1 can be queried from; the content passes the real F2 validator; and the whole flow is verified at 320 / 360 / 390 px plus one desktop width.

---

# Phase G — Brand, assets, design system

> `docs/guides/design_guide.md` documents the **old vanilla-JS app**, not this one. Owner has decided to author a new design system.
>
> **Settled 2026-08-28** (`SOURCE_OF_TRUTH.md` §12.1): accent **green `#10B981`**, typeface **Nunito**, and the canonical Lexi rendering is the **2D cel** `Tyler-asset-pack.png` turnaround. G4 inherits all three rather than re-opening them.
>
> **The cel decision changes G1 in two directions.** It **withdraws** the recommendation to swap the landing run-cycle for the photoreal `tyler-3d/` PNGs — that would put a second mascot style on the first screen a visitor sees, and only one running pose (`tyler-running-right.png`) exists in cel, so the run cycle stays unresolved rather than fixed.
> **But it makes the rest cheaper than it looks:** the cel views are **already separated on disk** — 24 of the 26 files in `public/assets/images/Transparent PNGs/` are cut from the pack (all five body views and eight head expressions). Nothing needs slicing. They are unusable today only because of the defect G1 item 2 already targets — every file is the full 768×1364 canvas with the rest erased. **Crop to alpha bounds and D3 is delivered**, with no new art and no new pipeline.

| # | Package | Size | Content |
|---|---|---|---|
| **G1** | Asset triage | `S` | **Six fixes, no new art required.** Fix the `lexi-mascot.png` 404 (`LexiFeedbackWidget.tsx:84`, `FeedbackRefillModal.tsx:73`); ship `avatars/default.png`; **crop the 26 Transparent PNGs to their alpha bounding boxes** (`tyler-jump.png`'s subject is 7.9% of its canvas, so the celebration mascot renders ~35×50 px in a 200×200 box — *the single biggest perceived-quality win available*); re-export `boss_character.png` as a real PNG with alpha (it is a JPEG → white square on a navy arena); replace the **purple lightning-bolt favicon**; replace the SVG `og:image` (no platform renders SVG previews — every beta recruitment link previews blank). |
| **G2** | Rename Tyler → Lexi | `S` | 26 files. Mechanical, and it eliminates the bug class that caused the live 404s. |
| **G3** | Cut the deploy weight | `S` | ~30 MB of the 32 MB in `public/` is orphaned. Delete `public/images/` (byte-identical duplicate), the `.ai`/`.eps`/`pikaso-creations` folders, the two 4–5 MB mockup posters, `stars.jpg`, `public/icons.svg`, the Vite scaffold leftovers. SVGO the four traced SVGs (469 KB `new-icon.svg` renders at 80×80). **Takes the deploy from ~34 MB to ~2 MB.** ⚠️ Resolve the stock-licence question on `cartoon-pitbull-illustrated-collection/` first — `.ai`/`.eps` source is tracked in git and publicly served. |
| **G4** | New design system | `L` | Replace `design_guide.md` for the current app: light + dark parity (theme default is **system**), tokens from C1, mascot usage rules. Consider sampling the palette from the mascot art so the UI and character belong to the same world — the interface is generic blue while the dog is blue-grey with a teal collar. |

---

# Phase H — Deploy safety, tests, docs

| # | Package | Size | Content |
|---|---|---|---|
| **H1** | Real tests | `L` | Current coverage is **one five-line Cypress test asserting `<body>` is visible** — and Cypress is in neither `package.json` nor the lockfile nor `node_modules`, so it cannot run. Decide Cypress vs Playwright (open since 2026-07-13), then cover the flows in `docs/QA/BETA_TEST_PLAN.md`'s Priority 1 backlog: session, registration, login/logout, lesson load, progress-save-once, password reset. |
| **H2** | Deploy hardening | `M` | Manual approval gate on production; version stamp (`package.json` is `0.0.0`, never bumped — there is no way to answer *"what is on lexipaws.eu?"*); pre-deploy remote backup; **split the dev and prod databases** (do this *after* A4, not before — sharing is what makes the cutover zero-DDL). |
| **H3** | Fix the broken automations | `S` | `sync_sonar_issues.js` writes no `SonarCloudKey` marker but greps for one, so dedup can never work — **latent, not currently firing** (no issue created since 2026-07-15), but it will flood the moment SonarCloud produces findings again. Its GitHub Projects calls also cannot work: the workflow grants only `issues: write`, and every failure is swallowed. |
| **H4** | Documentation | `M` | Write a real `README.md` (currently the stock Vite template, on a public repo). Move the ~14 `main`-era docs to `docs/archive/` — **after** A4, not before; until then they describe the code production actually serves. Rewrite `developer_guide.md`, `CSS_Architecture.md`, `backend/database/database.md`. Add `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`, `.editorconfig`, `.nvmrc`. |

---

## Standing items (not sessions)

- **`npm audit --omit=dev` reports 2 HIGH advisories** — `react-router` / `react-router-dom` 7.12.0–7.18.1 (GHSA-qwww-vcr4-c8h2). Four Dependabot PRs are open and green; merge them.
- **`reference/` is 37 MB, 51% of all tracked bytes**, and the deploy job uses `fetch-depth: 0`, pulling full history on every production deploy.
- **Never set `dangerous-clean-slate: true`** on the production FTP target. `avatars/`, `audio/` and `logs/` are not in the sync state and survive normal deploys; that flag would destroy every user-uploaded avatar.

---

## Suggested order

```
A1 → A2 → A3 → A4                    ← production is live again
        ↓
B0 → [neutralise cron] → B1 + B1b    ← must ship together; see the warnings in B1
        ↓
B2 → B3 → B4                         ← the app can remember things
        ↓
C1 → C2 → C3 → C4                    ← mobile-first is structural, not aspirational
        ↓
        ═══ GATE: feature work may resume ═══
        ↓
D, E, F, G, H in parallel as capacity allows
        ↓
F2 → F4a → F4b…F4e                   ← exams; split F4 first. Needs B3 (real score) + B2 (server-side award)
```

**B1 and B1b must ship in the same PR**, and the `cron_notifications.php` prerequisite must land first or the fix actively destroys legacy user data.

`B0`, `E1` (rotate credentials) and `G1` (asset triage) are all small and independent — good filler for a short session at any point.

---

## Progress log

Append one line per completed work package: `WP-ID · date · commit · notes`.

| WP | Date | Commit | Notes |
|---|---|---|---|
| — | 2026-08-28 | — | Plan created. |
| — | 2026-08-28 | — | **Documentation tightened; still no production-code changes.** **Status corrected:** **WP-A3 is ⏳ IN PROGRESS, not complete** — PR #262 is still open and the live done-when check fails (`.ftp-deploy-sync-state.json` = **200, 69,475 bytes** on `dev`). Standard restated: merged **and** deployed **and** live checks passing. **Verified live:** HTTP→HTTPS **301 on all four hostnames** ✅, and the `dev` session cookie carries `secure; HttpOnly; SameSite=Lax` ✅. The three production hosts still 404/403 (emptied docroot, pre-A4), so **re-run the cookie check there after A4** — TLS-terminating proxies can make PHP see plain HTTP and drop the flag. The old A1 'HTTPS is off' finding is **superseded**. **Measured, and it inverted an assumption:** green `#10B981` is **2.43:1 in light** — failing AA text, large text, *and* the 3.0:1 non-text threshold — versus 6.99:1 in dark; white-on-green is 2.54:1. **No single green passes both themes**, so D1 now requires a **theme-scoped** accent (`#047857` light / `#10B981` dark) extended across `--color-accent-on`/`--color-accent-at`, which are still blue. **Corrected:** the rogue-block token count is **seven**, not six. **Decisions recorded:** phonics-match costs **at most one mistake** per exercise if any mispairing occurs; exam pass threshold is **80%**; F4 must **collect the FR-1 evidence** and must be **split into F4a–F4e** before implementation; **`BossEncounter` is post-Beta** and **`Dictation` is deferred to CEFR B1/B2** — both implementations deletable (~667 lines with `engine.ts` and `MatchPairs`, zero behaviour change), the product ideas stay on the roadmap. §21 Q2, Q4 and Q12 marked answered from the standing §2 constraints. **Investigated (report only, nothing implemented):** no swipe-vocabulary or flip-card experience exists on `dev` — zero `.tsx` references, and `ProductTour.tsx:38`'s `flipOptions` is Floating-UI config. Both are **working features of the vanilla app on `origin/main`** (`js/dashboard.js:2225-2260` flip grid, `:2896-3119` swipe deck with know/practise overlays) whose JS was dropped in the migration. The CSS is residue, not a reservation — safe to delete in C4, recoverable from git. |
| **B0** | 2026-08-29 | PR #263 @ `e7b6e07` | ⏳ **IN PROGRESS — built and verified locally, awaiting review.** Branched from `dev` @ `080f59c`; does **not** build on #262. One file, +53/-35, no schema change, no client change. **(1) Clamp bypass closed.** The clamps now run whenever a payload carries `scores`, against the **decoded** current row (default `[]`), instead of being gated on `!empty()` of the stored string — so an already-poisoned `"0"` row is re-clamped on its next save and needs no data migration. A new `encodeScores()` normalises any non-array `scores` to `{}`, so the falsy value cannot be written at all. **(2) Rate limit added.** `security_rate_limit('save_progress_<user_id>', 45, 60)`. 45/min is unreachable by an honest client: the only caller is the 1500 ms-debounced autosave at `UserContext.tsx:366`, ceiling 40/min. **⚠️ The plan's description of the attack was wrong and is corrected in `SOURCE_OF_TRUTH.md` §P0 row 3b:** a lone `POST {"scores":0}` does **not** poison a row that already holds non-empty scores — the clamp block runs and stores `[]` (truthy) instead. The poisoning needs the stored `scores` empty at that moment, reached either by a **fresh account's first `save_progress`** or — cheaper, and previously unrecorded — by **signup**: `api.php:557` passed `guest_migration.scores` to `json_encode` unguarded, so `{"guest_migration":{"scores":0}}` wrote `"0"` in **one unauthenticated request**. `encodeScores()` is applied there too. **Verified end to end against a local throwaway MariaDB** (migrations from scratch, real HTTP, real sessions and CSRF; **the live database was not touched**), running the identical suite against unmodified `dev` first to prove it detects the exploit: poisoned row + inflated payload → `bones=999999999/shields=999/level=99` on `dev` vs `100/3/1` here; fresh-account two-step → raw write on `dev` vs clamped here; 60 looped requests → **60/60 accepted on `dev`, 45 accepted + 15×429 here**, with a 200 after the 60 s window elapses (sliding window, not a lockout); honest save byte-identical on both; new user with no `user_progress` row still inserts cleanly. `encodeScores()` unit-checked over 8 inputs; `php -l` clean; `check_php_security.js` passes. **Explicitly NOT done — still WP-B2:** counters remain in `$_SESSION` (weaker here than elsewhere, since `save_progress` needs an authenticated session, but still not a real limiter), `update_progress` is unlimited, and guest-migration **values** are uncapped — B0 only normalised their shape. **Still WP-B1/B1b:** the 11-column wipe and the writable-column whitelist; a `{"scores":0}` payload still clears `scores`, it just cannot disarm the clamps. **Still WP-B4:** a throttled save is dropped silently by the client. **Follow-on, forced by CI:** the SonarCloud gate failed the PR on two CRITICAL smells, both raised only because B0 *touched* `handleSaveProgress` — Sonar scores the whole function as new code once modified. S1192 (the rate-limit message became a third copy of the same literal) → promoted to a `RATE_LIMIT_ERR_MSG` constant used at all three sites. S3776 (cognitive complexity **59** vs a limit of 15) → `handleSaveProgress` was doing four unrelated jobs in one body; extracted as-is with no logic change into `clampProgressAgainstStored()` / `clampScores()` / `clampNodeState()`, `awardLeagueXp()`, and `sendStreakMilestoneEmails()` / `sendCommittedStreakEmail()`. Note for **WP-B1**, which edits this same function next: the `ON DUPLICATE KEY UPDATE` list B1 must shorten is untouched and still in `handleSaveProgress`. Re-verified after the refactor — all four exit-condition checks unchanged, league XP still accrues (+40 then +30 → 70, `league_id` 2 at 1040 points), milestone path still honours `notification_preferences.milestones` and returns in <2 ms without touching SMTP. Moves to ✅ DONE only when PR #263 is approved, merged, deployed, and re-verified against the deployed endpoint. |
| **A3** | 2026-08-28 | PR #262 @ `fbf3062` | ⏳ **STILL IN PROGRESS — review findings fixed, awaiting human approval.** Two blocking defects found by inspection were fixed on the branch. **(1) `workflow_dispatch` could never deploy:** the trigger was added but the deploy job still required `github.event_name == 'push'`, so a manual run executed only `verify` — change (f) was inert. It now takes a required `dev`/`main` choice input, and the gate additionally requires that input to equal the launched ref, so a feature branch cannot deploy and `dev`'s tree cannot be sent to the production docroot by mis-picking the target. `Set Environment Variables` now fails closed instead of defaulting an unknown ref to dev. **(2) The release artifact protected 12 live secrets with one untested exclusion glob** — and because the deploy job is skipped on PRs, `!release/db_config.php` had **never executed**; its first run would have been a live deploy, and artifacts on a public repo are downloadable by any signed-in user for 30 days. The bundle is now built and uploaded **before** `db_config.php` is generated, with an explicit assertion that fails the job if any `db_config*.php`/`.env` is present pre-upload; the glob is kept only as a third layer. Splitting the build out also removed all 17 secrets from the build step's environment. **(3) Follow-on:** moving the install line made SonarCloud re-score it as new code and fail the gate (C security rating — S6505 ×2, S8543), so `npm ci || npm install` became `npm ci --ignore-scripts` — which is also the fix this document already argued for. **Verified locally:** YAML parses; the deploy gate simulated across 9 push/PR/dispatch scenarios, all as intended; the assertion tested clean, with `db_config.php` present, and with a nested `.env`; a clean `npm ci --ignore-scripts` + `package:release` produces the same 287-file bundle. **CI: all checks green, rollup SUCCESS.** **Still not done:** `reviewDecision` is `REVIEW_REQUIRED` and `mergeStateStatus` is `BLOCKED`. The live check still fails — `https://dev.lexipaws.eu/.ftp-deploy-sync-state.json` returns **200 with 69,475 bytes**. Moves to ✅ DONE only when approved, merged, deployed, and that returns 403. |
| **A3** *(superseded)* | 2026-08-28 | PR #262 | ⏳ **IN PROGRESS — NOT COMPLETE.** Re-checked 2026-08-28: PR #262 is still **open**, nothing has deployed, and the live done-when check still fails — `https://dev.lexipaws.eu/.ftp-deploy-sync-state.json` returns **200 with 69,475 bytes**, so the manifest is still public. Moves to ✅ DONE only when merged, deployed, and that check returns 403. **Built, CI green, awaiting review.** All 7 changes: health check now asserts on the response body (it passed on a dead database before); `release/` uploaded as a restorable artifact; `workflow_dispatch` added; dead `gateway.html` rewrite removed; `.ftp-deploy-sync-state.json` denied (was serving 69 KB of the deploy manifest publicly); `public/.htaccess` deleted; migrations 07/11 made idempotent and the `DELETE` against `users` removed from 04. **Verified by CI**: `php migrate.php` against a fresh `mariadb:10.6` applied all 21 migrations with `"errors": []`, proving the rewritten SQL still builds a correct schema from zero. |
| **A2** | 2026-08-28 | — | **✅ DONE.** Backup taken and **verified** (phpMyAdmin dump, 274 KB, 15/15 tables, 511 password hashes, 21 migration rows, clean `COMMIT` footer — not truncated). Gate PASSES: `migration_history` = 21 rows including `04_add_username_unique_constraint.sql`, so the destructive DELETE cannot re-run. **Invariants recorded: `users` = 511, `user_progress` = 511** (every user has a progress row → the `get_session` TypeError has zero current exposure). `BETA_INVITES_ENABLED` set to `true`. Confirmed 500 bots / 11 real accounts → **WP-E0**. Empty tables `user_inventory`, `user_rewards`, `character_progress` corroborate the audit: no theme has ever been purchased, the reward cron has never run, and phonics progress is localStorage-only. Backup stored outside the repo — **contains real emails + password hashes, treat as personal data.** |
| — | 2026-08-28 | — | **Owner decisions recorded — documentation only, no production code touched.** **Design** (`SOURCE_OF_TRUTH.md` §12.1): accent is **green `#10B981`** (ratifies what already renders — the rogue `landing.css` `:root` has always beaten `main.css:12`), **Nunito** is the brand typeface (Outfit/Inter tokens get repointed, not fixed), and the canonical Lexi rendering is the **2D cel** `Tyler-asset-pack.png` — which is **cheaper than it sounds**: the individual cel views are already on disk and need only the WP-G1 alpha crop. **Infra:** the **HTTPS redirect has been enabled** at the host, superseding the WP-A1 side finding below. **Scope:** **WP-F4 — end-of-module exams** added, post-Phase-C and dependent on F2. Beta ships them as **soft** gates: passing awards module completion once, failing does not block the next module, retries unlimited and non-farmable, wrong answers feed weak-item practice. Whether they become **hard** gates is an explicit full-release decision on Beta evidence — **FR-1**, new in §20. **Matching:** the Beta feature is the existing `phonics_match` activity; the removed generic matching lesson is not returning, so `MatchPairs.tsx` may be deleted (F3, C4), and **incorrect phonics-matching attempts must affect accuracy while staying forgiving** (new row in B3). ⚠️ **Two items needed live verification:** green against a **dark** ground, and the **HTTPS redirect on all four hostnames**. *(A third was expected — whether the cel sheet could be sliced — but checking the disk settled it: 24 of the 26 files in `Transparent PNGs/` are already-separated cel views, so D3 needs no new art and no slicing, only the G1 alpha crop.)* ⚠️ **One correction to WP-C1:** "pick one accent and delete the other" would break the landing page — tokens live *only* in that rogue block with 16 consumers. Rehome first. **↑ SUPERSEDED by the row above (same day):** both verifications were carried out — the redirect passes on all four hostnames, and the accent was measured rather than eyeballed, which **reversed** the expected risk (green fails in **light**, not dark). The token count in this row was **six; it is seven**. |
| **A1** | 2026-08-28 | — | **✅ DONE.** Docroot confirmed `/lexipaws.eu/web`, matching the pipeline; owner manually emptied it (mechanism A). `.hu`/`.sk` confirmed as live vhosts sharing that docroot — one deploy brings up all four hostnames. Two side findings recorded: wildcard DNS on `.eu`/`.hu` makes subdomain checks meaningless, and HTTPS redirect is OFF for `lexipaws.eu` (session cookie loses its `Secure` flag over plain HTTP). |
| — | 2026-08-28 | — | **WP-B1 revised** after two independent adversarial reviews. The read-merge-write mechanism was rejected (lost-update race + TypeError on missing row); replaced with removing columns from the `ON DUPLICATE KEY UPDATE` list. Added the `cron_notifications.php` prerequisite, split out WP-B1b (whitelisting), and added WP-B0 for the live `{"scores":0}` clamp bypass. |
