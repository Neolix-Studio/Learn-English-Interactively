# Local Cleanup Plan

This plan is intentionally conservative. It lists cleanup work to do after the local migration is committed safely on a feature branch.

## Phase 1: Ignore Generated Local Files

Add or confirm ignore rules for:

- `.DS_Store`
- `dist/`
- `release/`
- `node_modules/`
- `audio/`
- `avatars/`
- `logs/`
- `email_preview*.html`
- `db_config.php`
- `db_config_prod.php`

## Phase 2: Remove Generated/Accidental Files From Working Tree

Candidates:

- `.DS_Store` files across the project.
- `dist/` duplicate files such as `index 2.html`, `favicon 2.svg`, `stars 3.jpg`.
- `email_preview.html`
- `email_preview_welcome.html`

Do not delete source assets from `public/` or `src/` without checking references.

## Phase 3: Move Local Utility Scripts

Status: completed locally. Local-only tools now live under:

- `tools/local/assets/`
- `tools/local/email/`
- `tools/local/maintenance/`

PHP scripts that depended on root-relative paths were updated to resolve paths from the project root.

## Phase 4: Separate Reference Material

Status: completed locally. Design/reference material now lives under:

```text
reference/
  product-design/
  backups/
```

## Phase 5: Documentation Restructure

Keep current docs, but make entry points obvious:

```text
docs/
  WORKFLOW.md
  DEPLOYMENT_MANIFEST.md
  CLEANUP_PLAN.md
  architecture/
  backend/
  frontend/
  guides/
  QA/
```

Move old one-off docs that are no longer current into:

```text
docs/archive/
```

## Phase 6: CD Deploys A Clean Release Folder

Current local workflow changes prepare this package:

```text
release/
  index.html
  assets/
  data/
  images/
  api.php
  api/
  cron_notifications.php
  cron_reset_leaderboards.php
  security.php
  mailer.php
  templates/
  libs/PHPMailer/
  db_config.php
  .htaccess
```

Then upload `release/` only.

Status: implemented locally through `npm run package:release` and `.github/workflows/verify-deploy.yml`. Do not rely on it in GitHub until this migrated app is pushed to a migration branch and reviewed.

## Do Not Do Yet

- Do not force-push the local migration to `dev`.
- Do not delete old GitHub branches until the migrated app is safely reviewed.
- Do not manually upload the whole local folder through FileZilla.
