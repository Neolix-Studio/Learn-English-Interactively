# GitHub Repository Audit

Audit date: 2026-07-13

Repository: `Neolix-Studio/Learn-English-Interactively`

## Current GitHub State

- Default branch: `main`
- Visibility: public
- Existing remote branches: `main` only
- `dev` does not currently exist as a remote branch
- Open PRs: none
- Branch protection: not active
- Rulesets: one `main` ruleset exists, but enforcement is disabled
- Delete branch on merge: enabled
- GitHub Pages: enabled from `main` at `https://neolix-studio.github.io/Learn-English-Interactively/`

## What Happened Recently

PR #210, `Deployment to Prod from Test`, merged the old `develop` branch into `main` on 2026-07-04.

The resulting `main` commit was:

```text
9725d11d108dcd974ee89ceffb4809f37b923568
```

The `CI/CD Verify and Deploy` workflow completed successfully for that push to `main`, including the deploy job. That means the old GitHub app was deployed to production through the existing CD pipeline.

Because the repository has `delete_branch_on_merge` enabled, the old `develop` branch appears to have been deleted after it was merged.

## Current Problem

The desired branch model is:

| Branch | Purpose | Deploy target |
| --- | --- | --- |
| `dev` | Staging/dev | `https://dev.lexipaws.eu` / `lexipaws.eu/sub/dev` |
| `main` | Production | `https://lexipaws.eu` / `lexipaws.eu/web` |

But GitHub currently only has `main`. Therefore, normal PRs into `dev` cannot happen until `dev` is recreated.

## Local Workflow Status

The local migrated app has an updated workflow that:

- runs CI on PRs to `main` and `dev`
- deploys only on push/merge to `main` or `dev`
- deploys `dev` to `lexipaws.eu/sub/dev`
- health-checks staging at `https://dev.lexipaws.eu`
- deploys only the generated `release/` folder
- generates `release/db_config.php` from GitHub Secrets

The local workflow is not active on GitHub until this local app is pushed.

## Secrets

Required deployment secrets are present:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `MIGRATION_TOKEN`
- `GOOGLE_TTS_API_KEY`
- `CRON_SECRET`
- `MAINTENANCE_TOKEN`
- `SLACK_WEBHOOK_URL`
- `WEBSUPPORT_FTP_SERVER`
- `WEBSUPPORT_FTP_USERNAME`
- `WEBSUPPORT_FTP_PASSWORD`

Optional/related:

- `CYPRESS_RECORD_KEY` exists, but Cypress is currently manual-only locally.
- `SONAR_TOKEN` was not present during this audit. The SonarCloud issue sync can still call public SonarCloud APIs, but add `SONAR_TOKEN` if private/authenticated SonarCloud access is needed.

## Recommended Cleanup Plan

1. Recreate `dev` intentionally.
2. Push the migrated local app to `dev` when you are ready for the first staging deploy.
3. After that, use feature branches and PRs into `dev`.
4. Merging a PR into `dev` should deploy to `https://dev.lexipaws.eu`.
5. Keep `main` untouched until production is ready.
6. Open a `dev` -> `main` PR only when production deployment is intended.

## Recommended GitHub Settings

Enable branch protection/rulesets:

- Protect `main`.
- Protect `dev`.
- Require PR before merge.
- Require status checks before merge.
- Require `CI/CD Verify and Deploy / Verify (CI)`.
- Require CodeQL if you want security scanning as a gate.
- Disable direct pushes to `main`.
- Disable direct pushes to `dev`, except possibly admins if you intentionally allow it.

Recommended production safety:

- Add a GitHub `production` environment for `main`.
- Require manual approval for production deployments.
- Add a GitHub `staging` environment for `dev`.
- No manual approval needed for staging unless you want extra control.

Recommended repository cleanup:

- Disable GitHub Pages unless you intentionally use `https://neolix-studio.github.io/Learn-English-Interactively/`.
- Keep `delete_branch_on_merge` enabled for feature branches, but do not delete long-lived branches like `dev`.

## Important Warning

Do not push the migrated local app directly to `main`. A push to `main` triggers production deployment to `https://lexipaws.eu`.
