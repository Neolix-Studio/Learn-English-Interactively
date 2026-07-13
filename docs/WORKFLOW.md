# Development And Release Workflow

This is the recommended workflow for the migrated React/PHP Lexipaws app.

## Branches

| Branch | Purpose | Deploys? |
| --- | --- | --- |
| `feature/*` | Active work branches. Use for all development. | No |
| `dev` | Shared staging branch. | Yes, to `https://dev.lexipaws.eu` / `lexipaws.eu/sub/dev` |
| `main` | Production branch. | Yes, to `https://lexipaws.eu` / `lexipaws.eu/web` |

Important: GitHub `main` currently contains the old app. The local Mac branch contains the migrated app. Do not merge this local branch into `main` until production is intentionally prepared and reviewed.

Current GitHub audit note: as of 2026-07-13, the remote repository only has `main`; `dev` must be recreated before PRs can target staging.

## Local Development

1. Work on a feature branch, never directly on `main` or `dev`.
2. Install dependencies:
   ```bash
   npm ci
   ```
3. Start PHP backend locally:
   ```bash
   php -S 127.0.0.1:8000
   ```
4. In another terminal, start Vite:
   ```bash
   npm run dev
   ```
5. Use local `db_config.php` for local database credentials only. This file is ignored and must never be committed.

## Before Opening A PR

Run:

```bash
npm run build
npm run lint
npm run validate:json
npm run package:release
npm audit
find . -name "*.php" -not -path "./libs/*" -not -path "./node_modules/*" -print0 | xargs -0 -n 1 php -l
```

`npm run lint` currently reports warnings but exits successfully. Treat new warnings as cleanup items, especially before payment/subscription work.

## PR Flow

1. Create a feature branch.
2. Commit focused changes.
3. Push the feature branch.
4. Open a PR into `dev`.
5. CI must pass.
6. Review the PR.
7. Merge into `dev` to deploy staging.
8. Verify staging manually.
9. Open PR from `dev` to `main`.
10. Merge into `main` to deploy production.

## Junior Developer Workflow

For JSON/curriculum tasks:

1. Create a branch named `content/<short-topic>`.
2. Only edit files under:
   - `data/hu/`
   - `data/sk/`
   - `src/locales/`
3. Do not edit PHP, deployment workflows, or database migrations unless assigned.
4. Keep lesson JSON valid and deterministic.
5. Open PR into `dev`.

Suggested PR checklist for curriculum work:

- The JSON file parses.
- The module/node naming matches the existing folder pattern.
- No `.DS_Store`, screenshots, audio files, or generated files are included.
- The app builds locally or CI passes.

## Current CI/CD Behavior

From `.github/workflows/verify-deploy.yml`:

- CI runs on pushes and PRs targeting `main` or `dev`.
- CI checks PHP syntax, frontend lint, JSON parsing/known schemas, React build, and sandbox migrations.
- CD runs only on push events to `main` or `dev`.
- Push to `dev` deploys staging.
- Push to `main` deploys production.
- CD now runs `npm run package:release`, writes `release/db_config.php`, and uploads only `release/` via FTPS.

The Cypress workflow is currently manual only because Cypress config/tests exist but the Cypress package is not installed in the migrated app yet. Re-enable it for PRs after adding Cypress back to `devDependencies` and updating the lockfile.

## GitHub Actions Notes

- `verify-deploy.yml` is the main CI/CD pipeline.
- `codeql-analysis.yml` scans JavaScript/TypeScript and PHP on `main`, `dev`, and scheduled weekly runs.
- `sonar-sync.yml` syncs SonarCloud findings through `scripts/sync_sonar_issues.js`.
- `cypress.yml` is kept manual until Cypress is reintroduced.

## Secrets Required

Current hardened deployment expects:

- `DB_HOST`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `MIGRATION_TOKEN`
- `GOOGLE_TTS_API_KEY`
- `SLACK_WEBHOOK_URL`
- `CRON_SECRET`
- `MAINTENANCE_TOKEN`
- `WEBSUPPORT_FTP_SERVER`
- `WEBSUPPORT_FTP_USERNAME`
- `WEBSUPPORT_FTP_PASSWORD`
- `CYPRESS_RECORD_KEY`

## Staging/Production Safety Rule

Because `dev` and `main` deploy automatically, never push large migration work directly to either branch. Use PRs only.

For the current migration, first push the local app to a new remote branch such as `migration/react-php-app`, open a PR into `dev`, and review the deploy package before merging.
