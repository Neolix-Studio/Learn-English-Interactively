# PHP Security Baseline

This project uses a lightweight PHP security smoke scan as the first automated backend security gate.

Run locally:

```bash
npm run security:php
```

CI runs the same command in `Verify (CI)` after PHP syntax linting.

## What The Current Scan Blocks

The scan checks deployable PHP files for high-risk patterns:

- dynamic code execution such as `eval()`
- shell execution such as `shell_exec()`, `system()`, `passthru()`, `proc_open()`
- unsafe `unserialize()`
- committed debug output such as `var_dump()` or `print_r()`
- secrets, passwords, tokens, or keys read from `GET`, `REQUEST`, or `COOKIE`
- cron or migration endpoints that do not use `security_require_cli_or_token()`
- uploaded files saved without generated names

The scan intentionally excludes:

- `libs/`
- `release/`
- `dist/`
- `node_modules/`
- `tools/local/`
- local ignored config files such as `db_config.php`

## Why This Exists Before PHPStan/Psalm

Composer is not currently part of the app root, so adding PHPStan or Psalm would introduce new PHP dependency management. The smoke scan gives us useful protection immediately without changing deployment packaging.

## Next Static Analysis Step

Before payments/subscriptions, add one deeper PHP analyzer:

- PHPStan for broad static analysis, or
- Psalm for stricter type/security modeling.

Recommended starting point:

- introduce Composer in the root only for development tooling
- install `phpstan/phpstan` or `vimeo/psalm` as a dev dependency
- start at the lowest practical strictness level
- exclude generated/build folders
- make the analyzer required in CI after the initial baseline is clean

## Payment Readiness Additions

Before September 1, 2026 beta/payment preparation, add checks for:

- payment webhook signature verification
- idempotent webhook handling
- subscription state transition tests
- no payment secrets in frontend code
- no payment secrets in logs
- rate limiting for auth and payment-sensitive endpoints
