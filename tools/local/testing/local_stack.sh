#!/usr/bin/env bash
#
# One-command local stack on a THROWAWAY database (TOOL-stack, #355).
#
# Runs the real PHP backend behind the real UI without going near the live
# database. dev and production share one database and the repo's own database
# config holds its live credentials, so a plain `php -S` from the repo root
# writes to production data. This script never reads or writes that file: it
# serves a sandbox COPY of the deployable PHP with a config it generates.
#
#   ./tools/local/testing/local_stack.sh up        # start + seed, print the logins
#   npm run dev                                    # then open http://app.localhost:5173
#   ./tools/local/testing/local_stack.sh sync      # after editing PHP or adding a migration
#   ./tools/local/testing/local_stack.sh sql "SELECT user_id, points FROM user_progress"
#   ./tools/local/testing/local_stack.sh status
#   ./tools/local/testing/local_stack.sh down      # stop everything, delete the data
#
# `up` creates a MariaDB instance of its own (socket only, no TCP port), runs
# `php migrate.php`, seeds two learners, an unused invite code and weak-word
# rows, and starts `php -S 127.0.0.1:8000` - the address vite.config.ts proxies
# to - from the sandbox copy.
#
# The sandbox is a copy, not a symlink, on purpose: PHP resolves __DIR__ through
# symlinks, so a linked api.php would load the repo's config. The price is that
# PHP edits in the repo are served only after `sync`.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SELF="tools/local/testing/local_stack.sh"
SEEDER="$REPO_ROOT/tools/local/testing/local_stack_seed.php"

# Fixed by vite.config.ts, which proxies the backend paths to this address.
HTTP_ADDR="127.0.0.1:8000"
APP_URL="http://app.localhost:5173"
DB_NAME="lexipaws_local"

# Test-only values for the throwaway database. The password has to satisfy
# PASSWORD_REGEX in api.php so that it also works in the change-password form.
SEED_LEARNER_EMAIL="anna@lexipaws.test"
SEED_LEARNER_USERNAME="KovacsAnna"
SEED_NEW_EMAIL="uj@lexipaws.test"
SEED_NEW_USERNAME="UjTanulo"
SEED_PASSWORD="Teszt-1234"
SEED_INVITE_CODE="LOCAL-STACK-INVITE"

# Everything the stack creates lives in this one directory. Keep it short: a
# unix socket path has a ~103 character limit.
STACK_DIR="${LEXIPAWS_STACK_DIR:-/tmp/lexipaws-local-stack}"
MARKER_NAME=".lexipaws-local-stack"

# The deployable PHP, the same set scripts/build_release.js ships. An explicit
# list, so the repo's own database config can never be swept into the sandbox.
APP_FILES="api.php api/tts.php beta_admin.php cron_notifications.php
cron_reset_leaderboards.php logout.php mailer.php migrate.php report_problem.php
security.php submit_feedback.php upload_avatar.php data/quests.json"

die() { echo "FATAL: $*" >&2; exit 1; }

set_paths() {
  APP_DIR="$STACK_DIR/app"
  SOCKET="$STACK_DIR/mysql.sock"
  DB_PID_FILE="$STACK_DIR/mysql.pid"
  PHP_PID_FILE="$STACK_DIR/php.pid"
  PHP_LOG="$STACK_DIR/php-server.log"
}

# /tmp is a symlink on macOS; open_basedir compares real paths.
resolve_stack_dir() {
  [ -d "$STACK_DIR" ] || return 1
  STACK_DIR="$(cd "$STACK_DIR" && pwd -P)"
  set_paths
}

need_tools() {
  MARIADBD="$(command -v mariadbd || true)"
  MARIADB="$(command -v mariadb || true)"
  MARIADB_ADMIN="$(command -v mariadb-admin || true)"
  INSTALL_DB="$(command -v mariadb-install-db || true)"
  if [ -z "$MARIADBD" ] || [ -z "$MARIADB" ] || [ -z "$MARIADB_ADMIN" ] || [ -z "$INSTALL_DB" ]; then
    echo "FATAL: mariadbd / mariadb / mariadb-admin / mariadb-install-db not on PATH." >&2
    echo "       brew install mariadb   (the server does NOT need to be running;" >&2
    echo "       this script starts its own throwaway instance)" >&2
    exit 1
  fi
  command -v php >/dev/null || die "php not on PATH."
  command -v curl >/dev/null || die "curl not on PATH."
}

port_busy() { (exec 3<>"/dev/tcp/${HTTP_ADDR%:*}/${HTTP_ADDR#*:}") 2>/dev/null; }

# A pid file counts only while its process is alive AND was started for this
# stack directory - a recycled pid must never be signalled.
live_pid() {
  local pid
  [ -f "$1" ] || return 1
  pid="$(cat "$1" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null || return 1
  ps -p "$pid" -o command= 2>/dev/null | grep -qF "$STACK_DIR" || return 1
  echo "$pid"
}

php_up() { live_pid "$PHP_PID_FILE" >/dev/null; }
db_up() { [ -S "$SOCKET" ] && "$MARIADB_ADMIN" --socket="$SOCKET" -u root ping >/dev/null 2>&1; }

# ------------------------------------------------------------------- sandbox
copy_app() {
  local f
  mkdir -p "$APP_DIR/api" "$APP_DIR/data" "$APP_DIR/libs" || return 1
  for f in $APP_FILES; do
    cp "$REPO_ROOT/$f" "$APP_DIR/$f" || return 1
  done
  rm -rf "$APP_DIR/data/migrations" "$APP_DIR/templates" "$APP_DIR/libs/PHPMailer"
  cp -R "$REPO_ROOT/data/migrations" "$APP_DIR/data/migrations" || return 1
  cp -R "$REPO_ROOT/templates" "$APP_DIR/templates" || return 1
  cp -R "$REPO_ROOT/libs/PHPMailer" "$APP_DIR/libs/PHPMailer" || return 1
}

# The generated config. With host "localhost" PDO honours unix_socket, and the
# DSN concatenates DB_HOST straight into the string, so the socket rides along.
# No TTS key, no SMTP password and no Slack webhook: tts.php and mailer.php
# then return early, so the stack makes no outbound call and sends no e-mail.
write_config() {
  cat > "$APP_DIR/db_config.php" <<PHPCONF
<?php
define('DB_HOST', 'localhost;unix_socket=$SOCKET');
define('DB_NAME', '$DB_NAME');
define('DB_USER', 'root');
define('DB_PASS', '');
define('GOOGLE_TTS_API_KEY', '');
define('SLACK_WEBHOOK_URL', '');
define('SLACK_WEBHOOK_URL_FEEDBACK', '');
define('CRON_SECRET', '$1');
define('MAINTENANCE_TOKEN', '$1');
define('APP_BASE_URL', 'http://localhost:5173');
define('BETA_INVITES_ENABLED', 'true');
define('SMTP_HOST', 'localhost');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');
define('SMTP_USER', '');
define('SMTP_PASS', '');
// cron_notifications.php ignores a last_active_date from before the day the
// writer shipped. Here every date counts, so the cron can be tried on seeded rows.
define('ACTIVITY_DATES_TRUSTED_FROM', '2000-01-01');
PHPCONF
}

# $APP_URL has the production-like auth guards (on plain localhost the app
# switches them off), but the PHP allow-lists know only http://localhost:5173.
# Rather than widen a production allow-list for a dev host, the sandbox maps
# that one origin before each request.
write_origin_shim() {
  cat > "$STACK_DIR/origin_shim.php" <<PHPSHIM
<?php
if ((\$_SERVER['HTTP_ORIGIN'] ?? '') === '$APP_URL') {
    \$_SERVER['HTTP_ORIGIN'] = 'http://localhost:5173';
}
PHPSHIM
}

run_migrations() {
  ( cd "$APP_DIR" && php migrate.php ) > "$STACK_DIR/migrate.log" 2>&1
  grep -q '"success": true' "$STACK_DIR/migrate.log"
}

# ------------------------------------------------------------------ teardown
teardown() {
  local pid
  if pid="$(live_pid "$PHP_PID_FILE")"; then kill "$pid" 2>/dev/null; fi
  if [ -S "$SOCKET" ]; then "$MARIADB_ADMIN" --socket="$SOCKET" -u root shutdown 2>/dev/null; fi
  for _ in $(seq 1 20); do
    live_pid "$PHP_PID_FILE" >/dev/null || live_pid "$DB_PID_FILE" >/dev/null || break
    sleep 0.5
  done
  if pid="$(live_pid "$DB_PID_FILE")"; then kill "$pid" 2>/dev/null; sleep 2; fi
  if pid="$(live_pid "$PHP_PID_FILE")"; then kill -9 "$pid" 2>/dev/null; fi
  # Delete only a directory this script created.
  if [ -f "$STACK_DIR/$MARKER_NAME" ]; then rm -rf "$STACK_DIR"; fi
}

fail_up() {
  echo "FATAL: $1" >&2
  if [ -n "${2:-}" ] && [ -f "$2" ]; then echo "------ $2" >&2; tail -n 20 "$2" >&2; fi
  teardown
  exit 1
}

print_summary() {
  cat <<SUMMARY
==============================================================
Lexipaws local stack is UP  -  throwaway database, nothing live
==============================================================
  Backend    http://$HTTP_ADDR  (php -S, serving the copy in $APP_DIR)
  Database   $DB_NAME, socket $SOCKET (user root, no password)
  Logs       $PHP_LOG

  Next       npm run dev      then open $APP_URL

  Returning learner   $SEED_LEARNER_EMAIL   ($SEED_LEARNER_USERNAME: 1,240 XP, streak 12, 5 weak words at A1)
  New learner         $SEED_NEW_EMAIL     ($SEED_NEW_USERNAME: 0 XP, nothing played)
  Password (both)     $SEED_PASSWORD
  Unused invite code  $SEED_INVITE_CODE   ->  $APP_URL/?invite=$SEED_INVITE_CODE

  Look in the DB      ./$SELF sql "SELECT user_id, points FROM user_progress"
  After editing PHP   ./$SELF sync
  Stop and delete     ./$SELF down
SUMMARY
}

# ------------------------------------------------------------------ commands
cmd_up() {
  need_tools
  if resolve_stack_dir; then
    [ -f "$STACK_DIR/$MARKER_NAME" ] || [ -z "$(ls -A "$STACK_DIR")" ] \
      || die "$STACK_DIR exists and was not created by this script. Move it or set LEXIPAWS_STACK_DIR."
    if php_up && db_up; then
      echo "Already up. Run \"./$SELF down\" first for a fresh database."
      echo
      print_summary
      return 0
    fi
    echo "Found a stale stack in $STACK_DIR; cleaning it up first."
    teardown
  fi

  if port_busy; then
    echo "FATAL: something is already listening on $HTTP_ADDR." >&2
    echo "       If that is a \"php -S\" started from the repo root, it is using the LIVE" >&2
    echo "       database. Stop it, then run this again." >&2
    command -v lsof >/dev/null && lsof -nP -iTCP:"${HTTP_ADDR#*:}" -sTCP:LISTEN >&2
    exit 1
  fi

  mkdir -p "$STACK_DIR" && chmod 700 "$STACK_DIR" || die "cannot create $STACK_DIR"
  resolve_stack_dir
  [ "${#SOCKET}" -le 100 ] || { rmdir "$STACK_DIR"; die "$SOCKET is too long for a unix socket; use a shorter LEXIPAWS_STACK_DIR."; }
  touch "$STACK_DIR/$MARKER_NAME"
  mkdir -p "$STACK_DIR/sessions" "$STACK_DIR/uploads"

  echo "Copying the deployable PHP into $APP_DIR ..."
  copy_app || fail_up "could not copy the PHP files into the sandbox"
  write_config "$(php -r 'echo bin2hex(random_bytes(16));')"
  write_origin_shim

  echo "Starting a throwaway MariaDB ..."
  "$INSTALL_DB" --datadir="$STACK_DIR/mysqldata" --auth-root-authentication-method=normal \
    > "$STACK_DIR/install-db.log" 2>&1 || fail_up "mariadb-install-db failed" "$STACK_DIR/install-db.log"
  nohup "$MARIADBD" --datadir="$STACK_DIR/mysqldata" --socket="$SOCKET" --skip-networking \
    --pid-file="$DB_PID_FILE" > "$STACK_DIR/mysqld.log" 2>&1 &
  for _ in $(seq 1 60); do db_up && break; sleep 0.5; done
  db_up || fail_up "MariaDB did not start" "$STACK_DIR/mysqld.log"

  "$MARIADB" --socket="$SOCKET" -u root -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4;" \
    || fail_up "could not create the database"
  run_migrations || fail_up "migrations failed" "$STACK_DIR/migrate.log"

  echo "Seeding test accounts ..."
  STACK_DB_SOCKET="$SOCKET" STACK_DB_NAME="$DB_NAME" STACK_REPO_ROOT="$REPO_ROOT" \
  SEED_LEARNER_EMAIL="$SEED_LEARNER_EMAIL" SEED_LEARNER_USERNAME="$SEED_LEARNER_USERNAME" \
  SEED_NEW_EMAIL="$SEED_NEW_EMAIL" SEED_NEW_USERNAME="$SEED_NEW_USERNAME" \
  SEED_PASSWORD="$SEED_PASSWORD" SEED_INVITE_CODE="$SEED_INVITE_CODE" \
    php "$SEEDER" > "$STACK_DIR/seed.log" 2>&1 || fail_up "seeding failed" "$STACK_DIR/seed.log"

  echo "Starting php -S on $HTTP_ADDR ..."
  # cd into the sandbox and confine PHP to the stack directory: two of the
  # scripts require their config by a relative path, and neither the working
  # directory nor open_basedir leaves PHP a way back to the repo.
  ( cd "$APP_DIR" && exec nohup php -S "$HTTP_ADDR" \
      -d open_basedir="$STACK_DIR/" \
      -d auto_prepend_file="$STACK_DIR/origin_shim.php" \
      -d session.save_path="$STACK_DIR/sessions" \
      -d upload_tmp_dir="$STACK_DIR/uploads" \
      -d sys_temp_dir="$STACK_DIR/uploads" \
      > "$PHP_LOG" 2>&1 ) &
  echo $! > "$PHP_PID_FILE"
  for _ in $(seq 1 40); do
    curl -sf "http://$HTTP_ADDR/api.php?action=csrf_token" 2>/dev/null | grep -q '"csrf_token"' && break
    sleep 0.25
  done
  curl -sf "http://$HTTP_ADDR/api.php?action=csrf_token" 2>/dev/null | grep -q '"csrf_token"' \
    || fail_up "php -S did not answer on $HTTP_ADDR" "$PHP_LOG"
  php_up || fail_up "$HTTP_ADDR is answering, but not from this stack" "$PHP_LOG"

  echo
  print_summary
}

cmd_down() {
  need_tools
  if ! resolve_stack_dir; then echo "Nothing to stop: $STACK_DIR does not exist."; return 0; fi
  [ -f "$STACK_DIR/$MARKER_NAME" ] \
    || die "$STACK_DIR was not created by this script; refusing to touch it."
  teardown
  [ ! -e "$STACK_DIR" ] || die "could not delete $STACK_DIR"
  echo "Stopped php -S and MariaDB; deleted $STACK_DIR."
}

require_up() {
  need_tools
  resolve_stack_dir && [ -f "$STACK_DIR/$MARKER_NAME" ] && php_up && db_up \
    || die "the stack is not up. Run \"./$SELF up\" first."
}

cmd_status() {
  need_tools
  if resolve_stack_dir && [ -f "$STACK_DIR/$MARKER_NAME" ] && php_up && db_up; then
    print_summary
    return 0
  fi
  echo "The local stack is DOWN. Start it with \"./$SELF up\"."
  return 1
}

cmd_sync() {
  require_up
  copy_app || die "could not copy the PHP files into the sandbox"
  run_migrations || { tail -n 20 "$STACK_DIR/migrate.log" >&2; die "migrations failed"; }
  echo "Sandbox refreshed from the working tree; migrations:"
  cat "$STACK_DIR/migrate.log"
  echo
}

cmd_sql() {
  require_up
  if [ $# -gt 0 ]; then
    "$MARIADB" --socket="$SOCKET" -u root "$DB_NAME" -t -e "$*"
  else
    "$MARIADB" --socket="$SOCKET" -u root "$DB_NAME"
  fi
}

set_paths
case "${1:-}" in
  up)     cmd_up ;;
  down)   cmd_down ;;
  status) cmd_status ;;
  sync)   cmd_sync ;;
  sql)    shift; cmd_sql "$@" ;;
  *)      echo "usage: ./$SELF up | down | status | sync | sql [\"QUERY\"]" >&2; exit 2 ;;
esac
