# Deployment Manifest

This document defines what belongs on Websupport staging/production and what must stay out of deployed web roots.

## Current Reality

- Local branch: `feature/ui-and-tts-updates`
- Remote: `origin` points to `https://github.com/Neolix-Studio/Learn-English-Interactively.git`
- GitHub `main` and `dev` are currently older than the local Mac project.
- CD behavior in `.github/workflows/verify-deploy.yml`:
  - push to `dev` deploys to `lexipaws.eu/sub/dev`
  - push to `main` deploys to `lexipaws.eu/web`
  - deploy uploads only the generated `release/` folder
- Until the local migration is reviewed and pushed intentionally, do not merge/push this branch into `dev` or `main`.

## Deployable Runtime Files

These are needed on Websupport for the React/PHP app to run.

| Path | Deploy? | Notes |
| --- | --- | --- |
| `dist/` output | Yes | Built React/Vite frontend. Prefer deploying built output, not raw `src/`, once workflow is corrected. |
| `.htaccess` | Yes | SPA routing and security headers/access blocks. |
| `api.php` | Yes | Main PHP API router. |
| `api/tts.php` | Yes | TTS endpoint. |
| `security.php` | Yes, but blocked by `.htaccess` | Shared PHP security helpers required by backend scripts. |
| `logout.php` | Yes | Standalone logout endpoint if still used by frontend. |
| `upload_avatar.php` | Yes | Avatar upload endpoint. |
| `report_problem.php` | Yes | Problem report endpoint. |
| `submit_feedback.php` | Optional | Frontend now uses `api.php?action=submit_feedback`, but keep only if legacy callers need it. |
| `cron_notifications.php` | Yes, restricted | Scheduled notification/streak email job. Requires `CRON_SECRET`. |
| `cron_reset_leaderboards.php` | Yes, restricted | Scheduled weekly/monthly leaderboard reset. Requires `CRON_SECRET`. |
| `migrate.php` | Yes, restricted | Required by CD remote migration step. Token must be passed via `X-Migration-Token`. |
| `mailer.php` | Yes | Email sender helper. |
| `templates/` | Yes | Email templates and base template. |
| `libs/PHPMailer/` | Yes | Required by `mailer.php`. Consider installing via Composer later. |
| `data/hu/`, `data/sk/`, `data/quests.json`, `data/migrations/` | Yes | Runtime curriculum and migrations. |
| `public` static assets copied into `dist/` | Yes via build | Do not manually upload `public/` separately if deploying `dist/` correctly. |
| `db_config.php` | Generated only | Created by GitHub Actions from secrets; never commit. |
| `audio/` | Server-generated/cache | Do not deploy from local by default. Let server generate/cache MP3s. |
| `avatars/` | Server-generated/uploads | Do not overwrite from local. |
| `logs/` | Server-generated/private | Do not deploy or download into repo. |

## Do Not Deploy

These should never be uploaded to Websupport web roots.

| Path | Reason |
| --- | --- |
| `.git/`, `.github/` | Source control and workflow internals. |
| `node_modules/` | Development dependencies. |
| `src/` | Source code, not needed if deploying built `dist/`. |
| `docs/` | Documentation only. |
| `reference/product-design/Learn English website/` | Design/reference/source material, not runtime. |
| `reference/backups/A1_backup_before_refactor/` | Backup/reference content only. |
| `tools/local/maintenance/reset_db.php` | Destructive maintenance script. |
| `tools/local/maintenance/nuke_and_rebuild_db.php` | Destructive maintenance script. |
| `tools/local/maintenance/fix_db.php` | Maintenance script. |
| `tools/local/maintenance/dev_simulate_bots.php` | Local/dev script. |
| `tools/local/maintenance/rename_bots.php` | Local/dev script. |
| `tools/local/email/generate_preview.php`, `tools/local/email/generate_welcome_preview.php` | Local preview utilities. |
| `email_preview.html`, `email_preview_welcome.html` | Generated preview output. |
| `tools/local/assets/` | Local utility/test scripts. |
| `db_config.php`, `db_config_prod.php` | Secrets. |
| `.DS_Store` | macOS generated metadata. |
| `dist/* 2.*`, `dist/* 3.*` | Duplicate generated artifacts, likely accidental Finder copies. |

## Recommended CD Direction

The workflow now uses this release packaging direction:

1. Run `npm ci`.
2. Run `npm run package:release`.
3. Create a clean deploy directory, for example `release/`.
4. Copy `dist/` contents into `release/`.
5. Copy required PHP runtime files into `release/`.
6. Generate `release/db_config.php` from GitHub Secrets.
7. Upload only `release/` via FTPS.

This reduces the chance of accidentally deploying local docs, source files, build junk, or dangerous scripts.

`release/` is ignored by Git and should be treated as generated output.

## Manual FileZilla Rule

Avoid FileZilla for normal deploys. If it must be used temporarily, upload only the files listed under "Deployable Runtime Files" and never drag the whole project folder.
