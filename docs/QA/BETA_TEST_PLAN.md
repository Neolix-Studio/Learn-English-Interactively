# Beta Test Plan

This plan turns the beta readiness checklist into repeatable manual and automated QA work.

Use it for:

- new PR test plans
- staging QA after merges to `dev`
- deciding what your cousin should test or automate next
- deciding whether `dev` is ready to promote to `main`

Use `docs/QA/STAGING_TEST_ACCOUNTS.md` when choosing accounts for staging runs.

## QA Habit For Every PR

Every PR should answer four questions:

1. What changed?
2. What could break?
3. How did we test it?
4. Who owns QA follow-up?

Recommended PR test note:

```md
## Test Plan
- [ ] Required checks passed
- [ ] Manual QA completed or not needed
- [ ] Staging QA needed after merge: yes/no

## QA Owner
@username

## Risk
Low / Medium / High

## QA Notes
- 
```

## Risk Levels

Low risk:

- docs-only changes
- copy changes
- isolated JSON/content edits
- small styling changes that do not affect core flow

Medium risk:

- lesson flow changes
- exercise UI changes
- content structure changes
- feedback/report form changes
- audio file or TTS behavior changes

High risk:

- login, registration, logout, password reset
- sessions and cookies
- progress saving, XP, streaks, rewards
- database migrations
- uploads
- cron or migration endpoints
- deployment workflow changes
- anything involving secrets or future payments

## Manual Test Suites

### Suite A: Staging Smoke

Run after every merge to `dev`.

- Open `https://dev.lexipaws.eu`.
- Confirm the app renders.
- Confirm no repeated console errors.
- Call `https://dev.lexipaws.eu/api.php?action=get_session`.
- Confirm the response is JSON.
- Log in with the smoke test account.
- Confirm the main navigation is usable on desktop.
- Confirm the main navigation is usable on mobile width.

Owner: QA owner or developer who merged.

### Suite B: Account And Session

Run for auth/session/password changes and before beta.

- Register a fresh invite test account when invite-only beta is enabled.
- Log out.
- Log in again.
- Refresh and confirm the session persists.
- Try a wrong password.
- Request password reset.
- Confirm password reset response does not reveal whether an email exists.
- Confirm private UI is unavailable after logout.

Suggested automation priority: high.

### Suite C: Learning Loop

Run for lesson, progress, XP, streak, reward, and curriculum changes.

- Start a Hungarian lesson.
- Start a Slovak lesson.
- Complete one exercise.
- Complete one lesson.
- Refresh and confirm progress persists.
- Confirm XP/rewards are not duplicated after refresh.
- Retry a failed exercise where applicable.

Suggested automation priority: high.

### Suite D: Exercise Types

Run when exercise components or lesson JSON changes.

- Multiple choice.
- True/false.
- Word order.
- Fill blanks.
- Dictation or type-in.
- Match pairs.
- Phonics listen/choose.
- Phonics compare/speak where available.

Suggested automation priority: medium.

### Suite E: Audio And TTS

Run for audio/TTS changes and before beta.

- Play existing audio.
- Trigger server-generated TTS.
- Confirm browser fallback TTS still works when generated audio is unavailable.
- Confirm missing audio does not block lesson completion.
- Confirm no API key appears in browser source, network payloads, or console output.

Suggested automation priority: medium.

### Suite F: Uploads And Forms

Run for avatar upload, feedback, and report changes.

- Upload valid avatar file.
- Reject invalid file type.
- Submit feedback with normal text.
- Submit feedback with quotes and accented characters.
- Submit problem report.
- Confirm feedback reaches Slack and problem reports reach Jira.
- Confirm no internal stack trace or database error appears to user.

Suggested automation priority: medium.

### Suite G: Admin, Cron, Migration, And Security

Run before beta and after endpoint/security changes.

- Confirm `migrate.php` denies browser access without token.
- Confirm cron endpoints deny browser access without token.
- Confirm state-changing API calls require CSRF where applicable.
- Confirm generated deployment config is not committed.
- Confirm PHP security smoke scan passes.

Suggested automation priority: high for endpoint checks.

## Automated Test Backlog

Start with these tests because they protect the most important beta flows.

### Priority 1

- unauthenticated session check returns JSON
- registration creates account and session
- login succeeds with valid credentials
- logout clears session
- lesson loads for test user
- completing an exercise updates progress once
- password reset request returns generic success/failure message

### Priority 2

- invalid login is rate-limited or handled safely
- CSRF missing on state-changing request is rejected
- avatar upload rejects invalid file type
- feedback form accepts safe special characters
- TTS endpoint requires valid request shape
- migration endpoint rejects missing token

### Priority 3

- mobile navigation opens/closes
- all JSON lesson files load through app data loader
- audio fallback does not block lesson completion
- reward/streak shield edge cases
- weekly/monthly cron endpoints require cron secret

## Suggested GitHub Issue Template For QA Tasks

```md
## QA Task

Related PR:

Environment:
- dev.lexipaws.eu

Risk:
- Low / Medium / High

Scope:
- 

Steps:
1. 
2. 
3. 

Expected:
- 

Result:
- Passed / Failed / Blocked

Notes:
- 
```

## Definition Of Done For Beta QA

A beta-related PR is done when:

- required checks pass
- reviewer approves
- risk level is stated
- QA owner is assigned when behavior changes
- staging QA result is commented after merge when needed
- any failed QA creates a follow-up issue or blocks release

## Production Release Test Pass

Run before merging `dev` to `main` for beta:

- Suite A: Staging Smoke
- Suite B: Account And Session
- Suite C: Learning Loop
- Suite E: Audio And TTS
- Suite F: Uploads And Forms
- Suite G: Admin, Cron, Migration, And Security

Record results in the `dev` to `main` PR.
