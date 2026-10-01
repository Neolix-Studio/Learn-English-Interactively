# Local Tools

These scripts are for local maintenance, previews, and one-off asset work. They are not part of the production runtime and should not be uploaded to Websupport.

## Folders

- `assets/`: one-off image/audio/transcript helper scripts.
- `email/`: local email preview generators.
- `maintenance/`: local or token-protected database/user maintenance scripts.
- `testing/`: the one-command local stack, and integration tests, both running the PHP API against a throwaway database.
- `ux-shots/`: headless-Chrome screenshots of the React app at every Beta viewport, in light and dark.

Use maintenance scripts carefully. Some can modify or destroy database data.

## Local stack

`testing/local_stack.sh` runs the real PHP backend behind the real UI on a
**throwaway MariaDB instance it creates and destroys itself**. Use it whenever a
change has to be seen working end to end: `dev` and production share one
database, and the `db_config.php` in the repo root holds its live credentials,
so a plain `php -S` from the repo root writes to production data.

```
./tools/local/testing/local_stack.sh up        # start, seed, print the logins
npm run dev                                    # then open http://app.localhost:5173
./tools/local/testing/local_stack.sh sync      # after editing PHP or adding a migration
./tools/local/testing/local_stack.sh sql "SELECT user_id, points FROM user_progress"
./tools/local/testing/local_stack.sh status    # is it up? prints the logins again
./tools/local/testing/local_stack.sh down      # stop everything, delete the data
```

What `up` does, in about ten seconds:

- Copies the deployable PHP (the list `scripts/build_release.js` ships) into
  `/tmp/lexipaws-local-stack/app` and writes a config of its own there. The
  repo's `db_config.php` is never read, copied or written.
- Starts a MariaDB with its data in the same directory, reachable only through
  a unix socket (no TCP port), and runs `php migrate.php` from zero.
- Seeds, with `testing/local_stack_seed.php`: a **returning learner** (1,240 XP,
  streak 12, three nodes done, five weak words at A1), a **new learner** (0 XP),
  and one **unused invite code**. `up` prints the e-mail addresses, the shared
  password and the invite link.
- Starts `php -S 127.0.0.1:8000` - the address `vite.config.ts` proxies to -
  from the sandbox, with `open_basedir` set to the stack directory, so PHP
  cannot open any file in the repo.

Things to know:

- **The sandbox is a copy.** PHP edits in the repo are served only after
  `sync`, which also applies new migrations. Frontend edits need nothing: Vite
  serves them as usual. `down` then `up` gives a fresh database.
- **Use `http://app.localhost:5173`**, not `localhost:5173`: on plain
  `localhost` the app switches its auth guards off. The PHP allow-lists do not
  know that host, so the sandbox maps its `Origin` to `http://localhost:5173`
  before each request (`origin_shim.php`); no other origin is mapped.
- **No outbound calls.** The generated config has no TTS key, no SMTP password
  and no Slack webhook: lesson audio falls back to the browser's voice, and
  e-mails (welcome, password reset) are logged as not sent in
  `php-server.log`.
- `up` refuses to start while anything else listens on `127.0.0.1:8000`, since
  that could be a `php -S` on the live database.
- **Trying the cron.** Run it from the sandbox copy, never from the repo:
  `(cd /tmp/lexipaws-local-stack/app && php cron_notifications.php)`. The
  sandbox config sets `ACTIVITY_DATES_TRUSTED_FROM` to the year 2000, so rows
  you date by hand with `sql` count; live, the cron ignores every
  `last_active_date` before 2026-10-01. It prints `Could not send ...` for
  each mail that is due, because nothing here can send.
- `down` deletes only a directory this script created. After a reboot `/tmp`
  is empty and the stack is simply gone; run `up` again.
- Requires `php` and `mariadb` from Homebrew (`brew install mariadb`); the
  MariaDB service does not need to be running. `LEXIPAWS_STACK_DIR` moves the
  directory (keep it short: unix sockets have a path limit).

## Testing

`testing/save_progress_security_test.sh` drives the real `api.php` over HTTP,
and runs the real `cron_notifications.php` from the command line, against a
**throwaway MariaDB instance it creates and destroys itself**. It never reads
`db_config.php` and never connects to the live database — `dev` and production
share one database, so there is no safe remote target for write tests.

| Group | What it proves |
|---|---|
| 1-5 | `save_progress` clamps an inflated payload, cannot be disarmed, is throttled, and leaves honest traffic alone (WP-B0). |
| 4, 5 | An autosave leaves the ten columns it does not send as they were, a client cannot write them, signup and a first save create a row with the same defaults, and a `streak_count` from the client is ignored and sends no mail (WP-B1 and WP-B1b, #359). |
| 6 | Every successful save sets `last_active_date` to the learner's day in Europe/Budapest and ignores a date sent by the client (#358). |
| 7 | The cron leaves legacy, never-stamped and saved-today rows alone, takes one shield per missed day, and keys the inactivity e-mail on activity, not on the last login (#358). |
| 8 | A `last_active_date` from before the cut-off day is never acted on (#358). |
| 10 | `get_friends` lists every friend when one is in a league, and the energy refill for feedback works once an hour (#382). |

No SMTP password is configured, so the cron cannot send anything: a mail that
is due shows up as a `Could not send ... email to ...` line in its output.

```
./tools/local/testing/save_progress_security_test.sh              # working tree
./tools/local/testing/save_progress_security_test.sh --ref dev    # a git ref
./tools/local/testing/save_progress_security_test.sh --slow       # + the 60s window check
```

Requires `mariadb` from Homebrew (`brew install mariadb`); the server does not
need to be running. `--ref` is how you show a check detects the bug it claims
to: run it against `dev` before WP-B0 (`--ref 450b9dd`) and checks 1-3 fail
while 4-5 pass; against the commit before #358 (`--ref 2408107`) groups 1-5
pass and 6-8 fail; against the commit before #359 (`--ref e6d7345`) 21 checks
fail, 19 of them in group 4. With `--ref` the PHP files and `templates/` come from that
ref; the migrations always come from the working tree.

**In CI.** The verify job of `verify-deploy.yml` runs the suite on every push,
without `--slow`, so a failed check stops the deploy. There it does not start a
MariaDB; it uses the job's `mariadb:10.6` service container:

```
TEST_DB_PASS=root ./tools/local/testing/save_progress_security_test.sh --db-host 127.0.0.1 --db-port 3306
```

| Flag | Environment | Meaning |
|---|---|---|
| `--db-host` | `TEST_DB_HOST` | Use the MariaDB already running at this address instead of starting one. `127.0.0.1` or `localhost` only. |
| `--db-port` | `TEST_DB_PORT` | Its port, default 3306. Without `--db-host` this is the port of the throwaway instance, default 3399. |
| `--db-user` | `TEST_DB_USER` | Default `root`. The account must be allowed to create a database. |
| | `TEST_DB_PASS` | Its password. Environment only, so it does not show in the process list. |

In this mode the suite creates a database named `lexipaws_sptest_<pid>_<time>`
and drops it on exit. It stops if that name already exists, and it touches no
other database on the server. A host that is not loopback is refused: the live
database is remote, and this keeps the suite from ever being pointed at it.
Only a client is needed (`mariadb`, or `mysql` as on GitHub's runners). To try
the mode on a Mac, start any local MariaDB with a root password first; without
`--db-host` nothing changes and the suite still brings its own.

`testing/check_phonics_items.mjs` reads every sound item in `data/*/characters`
and exits 1 when one cannot be answered by ear (a listen-choose item offering
the same word twice, a compare item that plays one spelling twice and calls it
different, a match item with a duplicated pair) or has no id of its own (#362).
It is not part of CI; the permanent validator rules belong to WP-F2.

```
node tools/local/testing/check_phonics_items.mjs
```

## Screenshots

`ux-shots/` captures the React app from headless Chrome with mocked backend replies. It needs only
`npm run dev`; it never starts PHP and no request it makes reaches PHP. See `ux-shots/README.md`.
The one exception is `ux-shots/unload-save.mjs` (#384), which runs against the local stack's real PHP
to check that closing the tab, logging out and a refused save lose no progress.

```
node tools/local/ux-shots/matrix.mjs --path /dashboard --preset returning-guest   # 5 viewports × light/dark
node tools/local/ux-shots/matrix.mjs --path / --lang hu,sk                        # + the same ten with ?lang=sk
```
