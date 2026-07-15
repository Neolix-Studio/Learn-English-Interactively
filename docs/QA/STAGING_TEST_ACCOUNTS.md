# Staging Test Account Strategy

Use this strategy for `https://dev.lexipaws.eu` during beta readiness QA.

Do not commit real passwords, invite codes, or personal tester data. Store shared credentials in a password manager, and share one-time invite codes only through a private channel.

## Account Types

### Smoke Test Account

Purpose: quick PR checks after each staging deploy.

- Use for login, logout, session persistence, navigation, and basic lesson loading.
- Keep progress stable enough that repeated smoke tests are predictable.
- Do not use for destructive account deletion tests.
- Reset only when the account becomes unusable or polluted with broken progress.

Recommended name:

```text
Lexipaws Staging Smoke
```

### Progress Test Account

Purpose: learning-loop and persistence QA.

- Use for Hungarian and Slovak lesson progress checks.
- Use for XP, streak, rewards, refresh, and duplicate-award checks.
- Keep notes about which lesson/module was used in each QA run.
- It is acceptable for this account to accumulate progress over time.

Recommended name:

```text
Lexipaws Staging Progress
```

### Fresh Invite Test Account

Purpose: beta invite, registration, onboarding, and first-run QA.

- Create a new account only when testing registration or invite flows.
- Use a unique email alias for each run when possible, for example `qa+invite-2026-07-15@example.com`.
- Use a one-time invite code.
- After the test, record whether the invite was marked `used`.
- Do not reuse this account for long-term smoke or progress tests.

Recommended name pattern:

```text
Lexipaws Invite QA YYYY-MM-DD
```

### Negative Test Account

Purpose: failed login, invalid invite, wrong password, and password reset privacy checks.

- Use only for failure-path testing.
- Do not use for real learning progress.
- Confirm password reset responses do not reveal whether an email exists.
- Confirm invalid invite codes do not create accounts.

## Invite-Only Beta Rules

When `BETA_INVITES_ENABLED=true` on staging:

- Public registration should not be visible without an invite link.
- New QA accounts need a valid beta invite code.
- Invite codes are single-use.
- Email-bound invites must be used with the matching email address.
- A successful registration should mark the invite as `used`.

When `BETA_INVITES_ENABLED` is missing or false:

- Backend signup remains open for compatibility.
- QA should still follow the invite-only UI path unless explicitly testing fallback behavior.

## QA Run Notes

For every staging QA pass, record:

- date and environment
- browser and device or viewport
- account type used
- email alias pattern, not password
- invite behavior tested, if any
- pass, fail, blocked, or known issue result

Example:

```text
2026-07-15, dev.lexipaws.eu, Chrome desktop
Account: Fresh Invite Test Account, qa+invite-2026-07-15@example.com
Result: invite registration passed, invite marked used, session persisted after refresh
```

## Cleanup

- Keep smoke and progress accounts available between QA runs.
- Remove or ignore one-off invite QA accounts after the test if they clutter staging.
- Revoke unused invite codes that were created for failed or abandoned tests.
- Never test production with staging test credentials.
