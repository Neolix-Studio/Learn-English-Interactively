# Local Tools

These scripts are for local maintenance, previews, and one-off asset work. They are not part of the production runtime and should not be uploaded to Websupport.

## Folders

- `assets/`: one-off image/audio/transcript helper scripts.
- `email/`: local email preview generators.
- `maintenance/`: local or token-protected database/user maintenance scripts.
- `testing/`: integration tests that run the PHP API against a throwaway database.
- `ux-shots/`: headless-Chrome screenshots of the React app at every Beta viewport, in light and dark.

Use maintenance scripts carefully. Some can modify or destroy database data.

## Testing

`testing/save_progress_security_test.sh` drives the real `api.php` over HTTP
against a **throwaway MariaDB instance it creates and destroys itself**. It
never reads `db_config.php` and never connects to the live database — `dev` and
production share one database, so there is no safe remote target for write
tests.

```
./tools/local/testing/save_progress_security_test.sh              # working tree
./tools/local/testing/save_progress_security_test.sh --ref dev    # a git ref
./tools/local/testing/save_progress_security_test.sh --slow       # + the 60s window check
```

Requires `mariadb` from Homebrew (`brew install mariadb`); the server does not
need to be running. `--ref` is how you show a check detects the bug it claims
to: run it against `origin/dev` before WP-B0 and checks 1-3 fail while 4-5 pass.

## Screenshots

`ux-shots/` captures the React app from headless Chrome with mocked backend replies. It needs only
`npm run dev`; it never starts PHP and no request it makes reaches PHP. See `ux-shots/README.md`.

```
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest   # 5 viewports × light/dark
node tools/local/ux-shots/matrix.mjs --path / --lang hu,sk                        # + the same ten with ?lang=sk
```
