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
| **F** | Curriculum correctness | F1–F3 | no |
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

### WP-A3 — Harden the pipeline on `dev`, where it is safe · `M` · depends on A1

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

**Done when:** merged to `dev`, deployed, and:
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
| Weak-word rows are never cleared → practice loop has no exit condition | `user_failed_exercises` | decrement or delete on a correct answer |
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
- **`--font-heading: 'Outfit'` and `--font-body: 'Inter'` are never loaded.** `index.html:33` fetches only Nunito. Both tokens fall back to generic `sans-serif` while `dashboard.css:2849` sets `* { font-family: 'Nunito' }`. Decide: load Outfit/Inter, or make Nunito the declared brand font and update the tokens.
- **The accent colour has no single source of truth.** `--color-accent-in` is `#3b82f6` in `main.css:12` but resolves to **`#10B981` green** because a rogue bare `:root` at `landing.css:202-215` loads later and wins — in light *and* dark. Pick one and delete the other. *(Owner decision needed; see §21 of SOURCE_OF_TRUTH.md.)*

**Done when:** three named breakpoints, a documented token set, zero undefined custom properties, one accent colour.

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

⚠️ **Owner decision first:** some of this may be reserved for planned features (swipe vocabulary deck, flip cards, exam section). Confirm before deleting.

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
| **F3** | Decide on the dead content layer | `M` | ~1,100 lines hang on one owner decision: `BossEncounter` (301), `engine.ts` (166), `learningContent.ts` (465), `Onboarding.tsx`, `Dictation`, `MatchPairs`, `MoraleBoost`, `HarderEncouragement`, `data/quests.json`, `services/api.ts`. Ship or delete. |

---

# Phase G — Brand, assets, design system

> `docs/guides/design_guide.md` documents the **old vanilla-JS app**, not this one. Owner has decided to author a new design system.

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
```

**B1 and B1b must ship in the same PR**, and the `cron_notifications.php` prerequisite must land first or the fix actively destroys legacy user data.

`B0`, `E1` (rotate credentials) and `G1` (asset triage) are all small and independent — good filler for a short session at any point.

---

## Progress log

Append one line per completed work package: `WP-ID · date · commit · notes`.

| WP | Date | Commit | Notes |
|---|---|---|---|
| — | 2026-08-28 | — | Plan created. |
| **A3** | 2026-08-28 | PR #262 | **Built, CI green, awaiting review.** All 7 changes: health check now asserts on the response body (it passed on a dead database before); `release/` uploaded as a restorable artifact; `workflow_dispatch` added; dead `gateway.html` rewrite removed; `.ftp-deploy-sync-state.json` denied (was serving 69 KB of the deploy manifest publicly); `public/.htaccess` deleted; migrations 07/11 made idempotent and the `DELETE` against `users` removed from 04. **Verified by CI**: `php migrate.php` against a fresh `mariadb:10.6` applied all 21 migrations with `"errors": []`, proving the rewritten SQL still builds a correct schema from zero. |
| **A2** | 2026-08-28 | — | **✅ DONE.** Backup taken and **verified** (phpMyAdmin dump, 274 KB, 15/15 tables, 511 password hashes, 21 migration rows, clean `COMMIT` footer — not truncated). Gate PASSES: `migration_history` = 21 rows including `04_add_username_unique_constraint.sql`, so the destructive DELETE cannot re-run. **Invariants recorded: `users` = 511, `user_progress` = 511** (every user has a progress row → the `get_session` TypeError has zero current exposure). `BETA_INVITES_ENABLED` set to `true`. Confirmed 500 bots / 11 real accounts → **WP-E0**. Empty tables `user_inventory`, `user_rewards`, `character_progress` corroborate the audit: no theme has ever been purchased, the reward cron has never run, and phonics progress is localStorage-only. Backup stored outside the repo — **contains real emails + password hashes, treat as personal data.** |
| **A1** | 2026-08-28 | — | **✅ DONE.** Docroot confirmed `/lexipaws.eu/web`, matching the pipeline; owner manually emptied it (mechanism A). `.hu`/`.sk` confirmed as live vhosts sharing that docroot — one deploy brings up all four hostnames. Two side findings recorded: wildcard DNS on `.eu`/`.hu` makes subdomain checks meaningless, and HTTPS redirect is OFF for `lexipaws.eu` (session cookie loses its `Secure` flag over plain HTTP). |
| — | 2026-08-28 | — | **WP-B1 revised** after two independent adversarial reviews. The read-merge-write mechanism was rejected (lost-update race + TypeError on missing row); replaced with removing columns from the `ON DUPLICATE KEY UPDATE` list. Added the `cron_notifications.php` prerequisite, split out WP-B1b (whitelisting), and added WP-B0 for the live `{"scores":0}` clamp bypass. |
