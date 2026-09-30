# Lexipaws — how a Claude session works in this repo

Lexipaws teaches English to Hungarian speakers (Slovak follows): a React 19 + TypeScript + Vite app in `src/`, flat PHP + MariaDB behind `api.php`, and the curriculum as JSON in `data/`. It is a hard Alpha working toward a Hungarian-only Beta. The owner is the only developer and works with Claude Code only.

**One GitHub issue = one session = one push to `dev`.** The owner starts a session with "Do #NNN" and closes the issue with his OK. This file is the protocol for that session. The detail lives in the specs:

| File | What it holds |
|---|---|
| `SOURCE_OF_TRUTH.md` (SOT) | How the code works today, with a `file:line` for every claim. §2 owner constraints, §4 running locally, §16 known-broken list, §19 which docs to trust, §22 re-verification script. |
| `REMEDIATION_PLAN.md` (RP) | The work packages (`WP-…`) and the progress log. |
| `UX_REVIEW.md` | The UI/UX findings (`C01`–`C71`, `N1`–`N12`), the packages (`UX-…`) and the owner questions (`Q1`–`Q15`). |
| [Project 1](https://github.com/orgs/Neolix-Studio/projects/1) | The tracker: issues #353 and up, titled `KEY · Title`. An issue body is short and names the spec ids it implements. |

## Hard rules

Safety. These have no exceptions; if a task seems to need one, stop and ask the owner.

- **Push only to `dev`.** Never push to `main`, never force-push, never amend a pushed commit. `main` is the owner's, untouched until the Beta cutover (WP-A4). No PRs and no feature branches: commit on `dev`.
- **Never run PHP against the real `db_config.php`, and never write to the live database.** `dev.lexipaws.eu` and production share one database until H2c (#483), and the `db_config.php` in the repo root holds its live credentials. So no `php -S`, no `php migrate.php` and no `php <script>` from the repo root, and do not print or copy that file. `php -l` is safe. Anything that needs a backend runs on the local stack (step 4). On `dev.lexipaws.eu`, only look: no sign-up, no form submit, no request that saves.
- **A new file in `data/migrations/` is a write to the live database**: the deploy applies it on the next push. It must be additive and safe to run twice, proven from zero on the local stack, and the owner must say yes to it before the push.
- **Never set `dangerous-clean-slate`** on an FTP deploy step. It would delete every uploaded avatar and the audio cache.

Product. These are owner decisions; do not reopen them unless he asks.

- **Mobile-first.** Write the phone layout as the base rule and enhance with `@media (min-width: …)`. **No new `max-width` queries.** Touch targets are at least 44 × 44 px.
- **Light and dark both have to be right.** The theme default is `system`.
- **The mascot is Lexi.** `tyler-*.png` are legacy file names, not the mascot's name.
- **The Beta is Hungarian-only.** A Beta session writes UI strings to `src/locales/hu.json` only and verifies in Hungarian. Leave `sk.json` alone (a missing key falls back to Hungarian, `src/i18n.ts:39`). Slovak is its own milestone.
- **No new art.** Reuse what is on disk. If a fix seems to need a new illustration, stop and ask.
- Also settled: the mobile app will wrap this web app, the audience is all ages, and the product is Duolingo-like with its own identity (SOT §2, §12.1; `UX_REVIEW.md` §2).

## Traps

| It looks like | It is |
|---|---|
| `docs/` describes this app | About 14 of its 40 files describe the old vanilla-JS app on `main`. SOT §19 lists the ones to trust. `docs/guides/design_guide.md` is the old app's design system. |
| Production runs this code | Production has never run the React app. `lexipaws.eu`, `.hu` and `.sk` answer 403 from an emptied docroot until the cutover. Only `dev.lexipaws.eu` serves `dev`. |
| `dev` has its own database | It shares production's (see the hard rules). |
| Local `main` is current | It is stale, and so are the other old local branches. Use `git fetch origin` and read `origin/main`. |
| `data/sk` is the Slovak course | It is a copy of `data/hu` in Hungarian, minus 17 stories. |
| Green checks mean it works | There are no automated tests. `npm run lint` exits 0 with warnings, and `npm run validate:json` checks the schema of one file. Green means "it builds". |
| `http://localhost:5173` is the app | On `localhost` every auth guard is off. Use `http://app.localhost:5173` to see what a user sees. |
| Editing `data/` shows on refresh | Curriculum JSON is bundled at build time. |
| This machine matches CI | CI runs Node 20 and PHP 8.2; this machine runs newer versions of both. |
| The owner can check Hungarian copy | He is a native Slovak speaker. Put an English gloss next to every Hungarian string you add or change, in the evidence comment. |

## The session

### 1. Pick the issue

If the owner named one, that is the issue. Otherwise pick from Project 1: the current milestone (the first one with open issues; today that is Beta), Status **Next** before **Backlog**, **P0** before P1 before P2, then the lowest number.

```bash
gh project item-list 1 --owner Neolix-Studio --limit 400 --format json \
  --jq '.items[] | select(.status=="Next" and .milestone.title=="Beta") | "\(.priority) #\(.content.number) \(.size) \(.title)"' | sort
```

**Every issue under "Depends on" must be closed.** If one is open, say so and stop; do not start.

```bash
git pull --ff-only origin dev
gh issue view NNN
gh api graphql -f query='query{repository(owner:"Neolix-Studio",name:"Learn-English-Interactively"){issue(number:NNN){blockedBy(first:50){nodes{number state title}}}}}'
```

Set the board item to **In progress** (commands under [Board](#board)).

If the issue has an "Owner input needed" section, get that answer before building the part it decides. Never guess a product decision.

### 2. Read the specs

Read the ids the issue cites (`WP-…`, `C..`, `N..`, `Q..`, `UX-…`, `SOT §…`) in SOT, RP and `UX_REVIEW.md`. **Re-check every `file:line` they give against the current code before changing anything**: the lines were recorded at older commits and move. SOT §22 has ready-made checks; run the ones that cover what you are about to touch. If a spec is wrong, say so and correct it with a dated note. Do not quietly work around it.

### 3. Implement

Do what the issue's "Done when" asks, and only that. When you find something else broken, do not fix it in this push: list it under "Seen, not changed" in the evidence comment and tell the owner.

### 4. Verify

Always, and all must pass:

```bash
npm ci
npm run build
npm run lint
npm run validate:json
npm run security:php
php -l path/to/each_touched_file.php
```

Depending on what changed:

- **`api.php` or `security.php`:** `./tools/local/testing/save_progress_security_test.sh` has to pass every check.
- **Anything where the server and the UI have to work together:** the local stack, which runs the real PHP on a throwaway database. `./tools/local/testing/local_stack.sh up`, then `npm run dev`, then `http://app.localhost:5173`; `sync` after a PHP edit, `down` when finished. Details: `tools/local/README.md`.
- **Any UI change:** the screenshot matrix, with `npm run dev` running: `node tools/local/ux-shots/matrix.mjs --path /route --preset <state>`. It gives 320×568, 360×800, 390×844, 768×1024 and 1280×800, each in light and dark; add `--lesson` for lesson screens. **Open and read every PNG**: the tool reports that a file was written, not that the screen is right. Once TOOL-checks (#380) exists, run its contrast check too. Details: `tools/local/ux-shots/README.md`.

Then tick through the issue's "Done when" list and keep the command and its output for each line.

### 5. Update the specs

In the same commit as the change:

- **RP progress log:** one new row directly under the "Plan created" row: the plan key with a link to the issue, the date, what was done and how it was verified. The row records the work; whether the owner has accepted it is the issue's open or closed state.
- **SOT:** where it describes what changed. A fixed §16 item is struck through and marked `✅ Fixed (#NNN, date)`, never deleted, and the section it came from is updated too. Correct any `file:line` you found stale. A §21 owner question that got answered gets its answer inline.
- **`UX_REVIEW.md`:** a fixed `C`/`N` finding gets `✅ Fixed (#NNN, date)` under its heading, with what is still open if the fix was partial. Do not delete findings.

A commit cannot contain its own SHA, so the specs cite the issue number. The commit subject carries the same number, so `git log --oneline --grep '#NNN'` finds the SHA, and the comment from step 8 states it.

### 6. Commit, push, watch

One commit for the issue, on `dev`, with the plan key and the issue number in the subject, for example `Add a one-command local stack on a throwaway database (TOOL-stack, #355)`. Do not write "Closes #NNN" or "Fixes #NNN": that would close the issue at push time, before the owner has checked it.

```bash
git push origin dev
gh run watch "$(gh run list --workflow verify-deploy.yml --branch dev --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
```

The run has two jobs. **Verify** failing means nothing was deployed. **Deploy** failing means `dev.lexipaws.eu` may be broken: tell the owner at once. In both cases fix forward with a new commit on `dev`.

### 7. Check it live

Read-only, on `dev.lexipaws.eu`:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://dev.lexipaws.eu/                                # 200
curl -s 'https://dev.lexipaws.eu/api.php?action=get_session'                                     # {"session":null}
curl -s -o /dev/null -w '%{http_code}\n' https://dev.lexipaws.eu/.ftp-deploy-sync-state.json     # 403
```

Then run the live checks the issue itself names.

### 8. Post the evidence

Post one comment on the issue:

- `## Ready for your check — pushed to dev as <sha>`
- a table with one row per "Done when" line: the command, its output, and for UI work which matrix screenshots you read and what each showed. `gh` cannot attach images: show the owner the PNGs that matter in the session, and never commit or upload them
- "Seen, not changed", if anything
- "How to check it yourself" (step 9)

Leave the issue open and its board item **In progress**.

### 9. Tell the owner how to check it

End every session by telling the owner, in plain words, how to check the result himself: the address on `dev.lexipaws.eu` (or the command to run on his Mac), the steps to take, what he should see, and which phone width or theme to look at. No jargon and no file paths. If the change has no visible effect, say "nothing to test by hand" and name the automated check that proves it. The same steps go into the comment from step 8. Then ask him for his OK.

### 10. Close, after the owner's OK

**A session never closes an issue on its own** (owner decision, 2026-09-30), also when there was nothing to test by hand. When the owner says it is fine, in this session or a later one ("close #NNN"):

1. `gh issue close NNN --reason completed`
2. Set its board item to **Done**.
3. Move every dependent whose last open blocker this was from **Blocked** to **Backlog**.
4. Add one line to the issue saying what was moved.

If he reports a problem instead, fix it in the same issue with a new commit and repeat steps 4 to 9.

## Board

Board commands need a token with the `project` scope. `gh auth status` shows which account is active; if it is not `TheNeolix`, prefix the command with `GH_TOKEN=$(gh auth token --user TheNeolix)`.

```bash
# the board item for an issue
gh project item-list 1 --owner Neolix-Studio --limit 400 --format json --jq '.items[] | select(.content.number==NNN) | .id'

# set its Status
gh project item-edit --project-id PVT_kwDOEaE0CM4BbXar --id <item-id> \
  --field-id PVTSSF_lADOEaE0CM4BbXarzhWIaNM --single-select-option-id <option>
```

Status options: Backlog `b112800a` · Next `f573bf35` · In progress `5aff76b8` · Blocked `aa9031a0` · Done `11710069`.

```bash
# run after closing NNN: its dependents, with the blockers each still has open; an empty list means move it to Backlog
gh api graphql -f query='query{repository(owner:"Neolix-Studio",name:"Learn-English-Interactively"){issue(number:NNN){blocking(first:50){nodes{number title blockedBy(first:50){nodes{number state}}}}}}}' \
  --jq '.data.repository.issue.blocking.nodes[] | "#\(.number) open blockers: \([.blockedBy.nodes[] | select(.state=="OPEN") | .number] | join(","))"'
```
