# Beta Feedback Triage

Use this playbook during beta to turn tester messages into clear follow-up work.

## Feedback Sources

### In-App Feedback

Source: dashboard feedback widget and feedback reward modal.

Route: `api.php?action=submit_feedback`.

Expected notification: feedback Slack channel via `SLACK_WEBHOOK_URL_FEEDBACK`.

Use for:

- general learning experience feedback
- confusion about lessons, wording, difficulty, motivation, or rewards
- product ideas and beta impressions
- non-urgent polish issues

### Report A Problem

Source: lesson/report problem flow.

Route: `report_problem.php`.

Expected notification: Jira Service Management at `support@lexipaws.atlassian.net`.

Use for:

- broken lesson content
- missing or wrong audio
- blocked exercise flow
- account, progress, or save problems
- bugs that need tracking and resolution

## Triage Cadence

During active beta:

- Check Slack feedback at least once per working day.
- Check Jira Service Management at least once per working day.
- Review new critical/blocking reports as soon as possible.
- Keep one short known-issues list for repeated reports.

During quiet/private testing:

- Check both channels after each staged QA session.
- Convert anything reproducible into a GitHub issue or Jira ticket.

## Severity Levels

### Critical

The app is unusable or unsafe for a tester.

Examples:

- cannot log in or create an invited account
- progress is lost or corrupted
- private user data is exposed
- production or staging secrets appear in browser output
- payment-related behavior appears before payments are intentionally launched

Action:

- stop expanding beta access
- create a high-priority issue
- fix before inviting more testers

### High

A core learning flow is blocked or unreliable.

Examples:

- lesson cannot be completed
- audio consistently fails with no fallback
- XP/progress is duplicated or not saved
- feedback or problem reports do not reach Slack/Jira

Action:

- create a bug issue
- prioritize before the next beta wave

### Medium

The tester can continue, but the experience is confusing or degraded.

Examples:

- unclear instructions
- layout overlap on one device size
- wrong translation or awkward copy
- intermittent audio fallback

Action:

- group repeated reports
- fix in normal beta polish work

### Low

Nice-to-have polish or subjective feedback.

Examples:

- feature suggestions
- visual preferences
- motivational/reward ideas

Action:

- keep for product review
- do not interrupt stability work unless repeated often

## Triage Steps

1. Read the message and classify it as feedback, bug, content issue, support issue, or feature idea.
2. Assign severity: critical, high, medium, or low.
3. Check whether the same issue was already reported.
4. If reproducible, create or update a GitHub issue or Jira ticket.
5. Add useful context:
   - environment: staging or production
   - browser/device, if known
   - account type, if known
   - lesson/module, if known
   - expected behavior
   - actual behavior
   - screenshots or console/network notes, if available
6. Reply to the tester only when there is a clear next step, workaround, or thanks/acknowledgement.
7. Move repeated non-blocking feedback into the known-issues list or beta polish backlog.

## What Not To Put In Issues

Do not paste:

- passwords
- invite codes
- full session cookies
- raw reset links
- webhook URLs
- private email content beyond what is needed to identify the report

Use masked values when needed:

```text
qa+invite-2026-07-15@example.com -> qa+invite-YYYY-MM-DD@example.com
LEXI-FAMILY-001 -> LEXI-...-001
```

## Suggested Issue Labels

Use these labels when available:

- `beta`
- `qa-needed`
- `qa-blocked`
- `risk-high`
- `risk-medium`
- `risk-low`
- `content`
- `security`

## Close-Out Rules

Before marking a beta feedback issue as done:

- the fix is merged to `dev`
- staging deploy completed
- QA owner retested the issue
- tester-facing workaround or known limitation is updated, if needed
- the original Slack/Jira thread is marked handled or linked to the issue
