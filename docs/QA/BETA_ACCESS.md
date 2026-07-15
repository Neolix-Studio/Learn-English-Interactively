# Beta Access

Beta invites are feature-flagged with `BETA_INVITES_ENABLED`.

## Default behavior

If `BETA_INVITES_ENABLED` is empty, missing, or set to `false`, signup remains open.

If `BETA_INVITES_ENABLED` is set to `true`, `1`, `yes`, or `on`, signup requires a valid beta invite code.

## Creating an invite

Invite codes are stored as SHA-256 hashes. Do not commit invite codes.

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

## Enabling on staging

1. Add or update GitHub Actions secret `BETA_INVITES_ENABLED` to `true`.
2. Merge to `dev` so deployment regenerates `db_config.php`.
3. Insert invite rows into the staging database.
4. Test one valid invite and one invalid invite on `https://dev.lexipaws.eu`.
