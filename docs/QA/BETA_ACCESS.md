# Beta Access

Beta invites are feature-flagged with `BETA_INVITES_ENABLED`.

## Default behavior

If `BETA_INVITES_ENABLED` is empty, missing, or set to `false`, signup remains open.

If `BETA_INVITES_ENABLED` is set to `true`, `1`, `yes`, or `on`, signup requires a valid beta invite code.

## Creating an invite

Invite codes are stored as SHA-256 hashes. Do not commit invite codes.

Pending beta access requests are stored in `beta_access_requests`. The landing page request form also sends a Slack notification and a confirmation email to the requester.

To review pending requests:

```sql
SELECT id, email, name, base_language, message, created_at
FROM beta_access_requests
WHERE status = 'pending'
ORDER BY created_at ASC;
```

Example SQL for one reusable-looking but single-use invite:

```sql
INSERT INTO beta_invites (email, invite_code_hash, invited_by, expires_at)
VALUES (
  'tester@example.com',
  SHA2(UPPER(TRIM('LEXI-TEST-2026')), 256),
  'ladislav',
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
```

Use `NULL` for `email` if the invite code can be used by any one tester:

```sql
INSERT INTO beta_invites (email, invite_code_hash, invited_by, expires_at)
VALUES (
  NULL,
  SHA2(UPPER(TRIM('LEXI-FAMILY-001')), 256),
  'ladislav',
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
```

After signup, the invite is marked `used` and linked to the created user.

## Manual approval flow

1. Pick one pending request from `beta_access_requests`.
2. Choose a one-time invite code, for example `LEXI-FAMILY-001`.
3. Insert the invite for that request's email:

```sql
INSERT INTO beta_invites (email, invite_code_hash, invited_by, expires_at)
VALUES (
  'tester@example.com',
  SHA2(UPPER(TRIM('LEXI-FAMILY-001')), 256),
  'ladislav',
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
```

4. Mark the request as invited:

```sql
UPDATE beta_access_requests
SET status = 'invited'
WHERE email = 'tester@example.com';
```

5. Email the tester their invite code and ask them to register with that same email address.

Suggested message:

```text
Hi,

Your Lexipaws beta access request has been approved.

Use this invite code when registering:
LEXI-FAMILY-001

Please create your account with this email address so the invite can be matched correctly.
```

You can also send a prefilled invite link:

```text
https://dev.lexipaws.eu/?invite=LEXI-FAMILY-001&email=tester%40example.com
```

Public visitors and guest users should use the beta access request form. Direct registration is only shown when an invite code is present in the URL.

## Enabling on staging

1. Add or update GitHub Actions secret `BETA_INVITES_ENABLED` to `true`.
2. Merge to `dev` so deployment regenerates `db_config.php`.
3. Insert invite rows into the staging database.
4. Test one valid invite and one invalid invite on `https://dev.lexipaws.eu`.
