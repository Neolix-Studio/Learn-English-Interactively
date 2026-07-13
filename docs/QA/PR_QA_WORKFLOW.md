# Pull Request QA Workflow

Every feature or bug fix PR should have a matching QA note before it is merged into `dev`.

## Roles

- Developer: describes what changed, what risk exists, and how to test it.
- Reviewer: checks the code and confirms the PR is understandable.
- QA owner: runs the test notes on `dev` after merge, or reviews automated test evidence before merge when applicable.

For now, your cousin can usually own QA for content, JSON, lesson behavior, and automated test updates.

## PR Description Template

Copy this into each PR description:

```md
## Summary
- 

## Risk Level
- Low / Medium / High

## Areas Changed
- Frontend:
- PHP/API:
- Data/JSON:
- Database:
- Deployment:

## Test Plan
- [ ] `npm run validate:json`
- [ ] `npm run security:php` when PHP changed
- [ ] Manual QA notes added below

## Manual QA Notes
- Environment:
- Browser/device:
- Test account:
- Steps:
- Expected result:

## QA Owner
@username
```

## When QA Is Required

QA is required for:

- Lesson flow changes
- JSON/curriculum changes
- API/PHP changes
- Login, password, session, CSRF, upload, email, TTS, progress, XP, streak, or reward changes
- Layout changes that affect mobile or primary flows
- Any change intended for the September 1 beta

QA can be lighter for:

- Documentation-only changes
- Comment-only changes
- Internal cleanup with no runtime behavior change

## Choosing QA Depth

Use this rule of thumb:

- Low risk: one focused manual pass or one targeted automated test.
- Medium risk: focused manual pass plus related regression checks.
- High risk: automated test evidence, manual staging pass, and owner review.

High-risk examples include authentication, payments, migrations, user progress, generated audio, uploads, and anything touching secrets.

## PR To Dev Flow

1. Developer opens PR into `dev`.
2. Developer fills the PR template.
3. GitHub runs required checks:
   - `Verify (CI)`
   - `Analyze Code`
4. Reviewer approves the PR.
5. PR is merged into `dev`.
6. CD deploys to `https://dev.lexipaws.eu`.
7. QA owner runs the relevant checklist on staging.
8. QA owner comments the result on the PR or linked issue.

## Dev To Main Flow

Use this only for production releases.

1. Confirm staging QA has passed.
2. Open PR from `dev` to `main`.
3. Add release notes and beta/production risk notes.
4. Require review approval.
5. Merge only when ready to deploy `https://lexipaws.eu`.

For the current roadmap, `main` should receive the new app when beta starts around September 1, 2026.

## Suggested QA Labels

Create these labels in GitHub if they do not exist yet:

- `qa-needed`
- `qa-passed`
- `qa-blocked`
- `qa-failed`
- `risk-low`
- `risk-medium`
- `risk-high`
- `content`
- `security`
- `beta`
