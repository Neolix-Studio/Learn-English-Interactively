# Staging QA Checklist

Use this checklist after a PR is merged into `dev` and deployed to `https://dev.lexipaws.eu`.

Use `docs/QA/STAGING_TEST_ACCOUNTS.md` to choose the right staging account type before starting QA.

## Release Smoke Test

- Open `https://dev.lexipaws.eu` in a normal browser window.
- Confirm the app loads without a blank screen.
- Open browser dev tools and confirm there are no repeated console errors.
- Confirm `https://dev.lexipaws.eu/api.php?action=get_session` returns a JSON response.

## Account And Session

- Log into the smoke test account for routine PR QA.
- Create a fresh invite test account only when the PR touches registration, invite, onboarding, or first-run behavior.
- Refresh the page and confirm the session stays active.
- Log out and confirm private/progress UI is no longer available.
- Try one failed login and confirm the error is user-friendly.

## Lessons And Curriculum

- Open the main lesson/curriculum path.
- Start one Hungarian lesson.
- Start one Slovak lesson.
- Complete at least one exercise type touched by the PR.
- Confirm progress, XP, streak, or rewards update only when expected.

## Audio And TTS

- Play an existing audio prompt.
- Trigger a prompt that may use generated TTS.
- Confirm playback works on desktop.
- Confirm browser fallback TTS still works if generated audio is unavailable.

## Data Persistence

- Complete an exercise and refresh.
- Confirm progress remains saved.
- Confirm duplicate clicks or refreshes do not double-award points.

## Forms And Reporting

Use `docs/QA/BETA_FEEDBACK_TRIAGE.md` to classify any feedback or problem reports found during staging QA.

- Submit feedback or problem report with normal text.
- Submit with unusual but safe characters, such as quotes or accents.
- Confirm the form does not expose internal errors.
- Confirm the message reaches the expected Slack or Jira destination.

## Security Smoke Test

- Confirm protected endpoints are not casually accessible in the browser:
  - `https://dev.lexipaws.eu/migrate.php`
  - `https://dev.lexipaws.eu/cron_notifications.php`
  - `https://dev.lexipaws.eu/cron_reset_leaderboards.php`
- Confirm upload flows reject unsupported file types.
- Confirm password reset flow does not reveal whether an email exists.

## Responsive And Browser Pass

- Test mobile width in browser dev tools.
- Test desktop width.
- Confirm text does not overlap key controls.
- Confirm primary buttons are visible and usable.

## QA Result

Record one of these in the PR:

- `QA passed on dev.lexipaws.eu`
- `QA passed with known issues`
- `QA blocked`
- `QA failed`

Include browser, device/viewport, account type used, and short notes for anything suspicious. Do not include passwords or real invite codes.
