# Workflow Audit

Audit date: 2026-07-13

## Summary

The local Mac project is the migrated React/PHP app. GitHub `main` still represents the old application, so this local branch should be treated as a migration branch until it is intentionally pushed, reviewed, and merged.

Do not push directly to `dev` or `main`. Both branches are deployment branches.

## Current Branch/Deploy Model

| Branch | Role | Deploy target |
| --- | --- | --- |
| `feature/*` or `migration/*` | Local/PR work | No deploy |
| `dev` | Staging | `https://dev.lexipaws.eu` / `lexipaws.eu/sub/dev` |
| `main` | Production | `https://lexipaws.eu` / `lexipaws.eu/web` |

## Findings

1. GitHub `main` is stale compared with the local Mac project.
2. The previous deploy uploaded the repository root with exclusions, which made accidental FileZilla-style uploads easy to repeat.
3. The CI workflow referenced old scripts: `lint:css`, old validator paths, and old script folders.
4. The JSON validator was CommonJS, but the migrated app is configured as ESM through `"type": "module"`.
5. CodeQL only scanned `main`/`master` and JavaScript/TypeScript.
6. Sonar issue sync referenced `js/sync_sonar_issues.js`, but the migrated script is under `scripts/`.
7. Cypress workflow existed, but Cypress is not installed in the migrated app dependencies.

## Local Fixes Applied

1. CI now runs:
   - PHP syntax lint
   - `npm run lint`
   - `npm run validate:json`
   - `npm run build`
   - sandbox migrations
2. CD now runs `npm run package:release`, builds a clean `release/` folder, and uploads only `release/`.
3. The release package includes runtime cron scripts so Websupport scheduled jobs can call them with `CRON_SECRET`.
4. `db_config.php` is generated into `release/db_config.php` during deploy.
5. CodeQL now includes `dev` and PHP.
6. Sonar issue sync uses `scripts/sync_sonar_issues.js`.
7. Cypress is manual-only until Cypress is re-added to the migrated app.
8. Root-level local utility scripts were moved into `tools/local/`.
9. Reference-only design/backups were moved into `reference/`.
10. `release/` is ignored by Git.

## Recommended Migration Flow

1. Keep this work local until you are ready to publish the migrated app.
2. Push to a new remote branch, for example `migration/react-php-app`.
3. Open a PR from `migration/react-php-app` into `dev`.
4. Review the changed file list carefully because this is a full app migration.
5. Confirm GitHub Secrets exist:
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
6. Merge into `dev` only when staging deployment is intended.
7. Verify staging manually.
8. Open a PR from `dev` into `main`.
9. Merge to `main` only when production deployment is intended.

## Junior Developer Guardrails

For now, junior/content work should stay inside:

- `data/hu/`
- `data/sk/`
- `src/locales/`

Avoid assigning changes in:

- `.github/`
- PHP backend files
- `data/migrations/`
- deployment scripts
- security helpers

## Still To Decide

1. Whether to keep Cypress, replace it with Playwright, or remove the old Cypress setup.
2. Whether `reference/` should be committed to Git or kept only locally.
3. Whether to add stronger schema validation for the new lesson JSON format beyond parse checks.
