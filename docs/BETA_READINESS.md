# Lexipaws Beta Readiness Plan

Target beta date: September 1, 2026.

This checklist tracks what should be true before the new app is promoted from `dev` to `main` and opened to beta users.

## Beta Goal

Beta should prove that real learners can:

- create or access an account
- complete lessons
- hear audio reliably
- save progress
- report problems
- use the app on mobile and desktop
- trust that their account and progress are safe

Subscriptions and payment work should not go live until the account, progress, security, and QA foundations are stable.

## Release Gates

### Gate 1: Staging Is Stable

Required before wider testing:

- `dev` branch deploys reliably to `https://dev.lexipaws.eu`.
- Required checks pass on PRs:
  - `Verify (CI)`
  - `Analyze Code`
- No direct pushes to `dev` or `main`.
- Every PR has a short test plan.
- Every behavior-changing PR has QA notes before or after staging deploy.
- Staging has a known test account strategy in `docs/QA/STAGING_TEST_ACCOUNTS.md`.

Status: in progress. Test account strategy is documented; staging credentials and invite codes still need to be created privately.

### Gate 2: Core Learning Loop Works

Required before inviting beta testers:

- Users can register.
- Users can log in and log out.
- Users can resume an existing session.
- Users can start lessons in Hungarian and Slovak paths.
- Major exercise types work.
- Progress, XP, streak, rewards, and completion state persist after refresh.
- Guest-to-account migration works or is intentionally disabled/documented.
- Mobile layout works for the primary learning flow.

Status: not fully audited.

### Gate 3: Audio Is Reliable

Required before inviting beta testers:

- Existing audio files load from staging.
- Google TTS generation works server-side.
- Browser TTS fallback works when generated audio is unavailable.
- Missing audio does not break the lesson flow.
- Audio cache behavior is understood.
- No Google TTS API key is exposed to frontend code.

Status: partially hardened, needs QA pass.

### Gate 4: Data And Curriculum Are Safe

Required before inviting beta testers:

- JSON validation runs in CI.
- Curriculum folder conventions are documented.
- Content-only PR process is clear for junior/content work.
- Hungarian and Slovak lesson paths load without broken references.
- No local/generated files are committed.

Status: mostly in place, needs content QA checklist adoption.

### Gate 5: Security Baseline Is In Place

Required before beta:

- Secrets are stored in GitHub Actions secrets, not committed files.
- `db_config.php` is generated during deployment.
- CSRF protections are active for state-changing requests.
- Session cookies are `HttpOnly`, `Secure` on HTTPS, and `SameSite=Lax`.
- Migration and cron endpoints require server-side tokens.
- Uploads reject unsafe file types and generated names are used.
- Password reset links are built from configured `APP_BASE_URL`, not request host headers.
- PHP security smoke scan or deeper PHP static analysis runs in CI.
- No sensitive errors are shown to users.

Status: in progress.

### Gate 6: Feedback And Support Work

Required before beta:

- Feedback/problem report form works.
- Slack or email notifications reach the right person.
- User-facing errors explain what happened without leaking internals.
- There is a simple issue triage process for beta feedback in `docs/QA/BETA_FEEDBACK_TRIAGE.md`.

Status: needs staging QA. Feedback triage process is documented.

### Gate 7: Production Release Is Intentional

Required before merging `dev` to `main`:

- Staging QA checklist passes.
- Known beta limitations are documented.
- Rollback plan exists.
- `main` deployment target is confirmed as `https://lexipaws.eu`.
- Production database target is confirmed.
- Production secrets are confirmed.
- Production launch PR from `dev` to `main` is reviewed.

Status: not started. Planned for beta launch window.

## Weekly Roadmap

### Week 1: Workflow And QA Foundation

- Merge protected-branch workflow docs.
- Merge PHP security/QA baseline.
- Adopt PR test plan habit.
- Create QA labels in GitHub:
  - `qa-needed`
  - `qa-passed`
  - `qa-blocked`
  - `qa-failed`
  - `risk-low`
  - `risk-medium`
  - `risk-high`
  - `beta`
- Decide who approves PRs when you and your cousin collaborate.

### Week 2: Account And Session Audit

- Create private staging smoke, progress, fresh invite, and negative-test accounts from `docs/QA/STAGING_TEST_ACCOUNTS.md`.
- Test registration.
- Test login.
- Test logout.
- Test session persistence.
- Test password reset.
- Test guest-to-account behavior.
- Fix any auth/session issues before expanding beta work.

### Week 3: Learning Loop Audit

- Test lesson start and completion.
- Test main exercise types.
- Test XP/progress/streak persistence.
- Test refresh/retry behavior.
- Identify missing automated tests for lesson completion.

### Week 4: Audio/TTS Audit

- Test generated TTS.
- Test existing audio files.
- Test fallback browser TTS.
- Test missing or failed audio behavior.
- Confirm Google TTS key remains server-only.

### Week 5: Mobile And Content QA

- Test mobile learning flow.
- Test Hungarian and Slovak lesson paths.
- Check text overflow and button usability.
- Review content-only PR process with cousin.

### Week 6: Security And Beta Feedback

- Run security smoke checks.
- Review upload, feedback, report, cron, migration, and password reset flows.
- Confirm feedback routing.
- Review feedback triage with the QA owner using `docs/QA/BETA_FEEDBACK_TRIAGE.md`.
- Prepare known-issues list.

### Week 7: Beta Release Prep

- Freeze risky features unless needed for beta.
- Run full staging QA.
- Prepare `dev` to `main` release PR.
- Confirm production secrets and deployment target.
- Keep rollback folder/server backup available.

## Beta Launch Criteria

Do not launch beta until all are true:

- Staging deploy is green.
- Full staging QA is complete.
- Account/session flows are stable.
- Learning loop is stable.
- Audio has an acceptable fallback.
- Progress persistence is reliable.
- Critical security checks are in CI.
- Feedback path is working.
- Known limitations are written down.
- `dev` to `main` production PR is reviewed and intentionally merged.

## Known Follow-Up Before Payments

Before subscriptions or payments:

- choose payment provider
- design subscription state model
- add webhook signature verification
- add idempotent webhook handling
- add payment-specific test accounts/sandbox mode
- add endpoint tests for payment state transitions
- make payment webhooks impossible to trigger without provider signature
- confirm no payment secret reaches frontend code or logs
