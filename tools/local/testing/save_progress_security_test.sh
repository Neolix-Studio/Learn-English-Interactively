#!/usr/bin/env bash
#
# Integration test for the save_progress anti-cheat surface (WP-B0), for the
# activity-day writer in save_progress and for cron_notifications.php, which
# trusts that writer (B1-cron, #358).
#
# Runs the real api.php over real HTTP, and the real cron from the command
# line, against a THROWAWAY MariaDB instance
# that this script creates and destroys. It never reads db_config.php and never
# connects to the live database — dev and production share one database, so
# there is no safe remote environment to test writes against.
#
#   ./tools/local/testing/save_progress_security_test.sh              # working tree
#   ./tools/local/testing/save_progress_security_test.sh --ref dev    # a git ref
#   ./tools/local/testing/save_progress_security_test.sh --slow       # + 60s window test
#
# With --db-host it uses a MariaDB that is already running instead of starting
# one: this is how the verify job in CI runs it, against its mariadb service
# container. The suite still creates a database of its own there and drops it
# on exit, and it stops if that name is already taken, so nothing else on the
# server is read or changed. Only a loopback host is accepted.
#
#   TEST_DB_PASS=root ./tools/local/testing/save_progress_security_test.sh \
#       --db-host 127.0.0.1 --db-port 3306
#
#   --db-host / TEST_DB_HOST   127.0.0.1 or localhost; switches this mode on
#   --db-port / TEST_DB_PORT   default 3306 (without --db-host: the port of the
#                              throwaway instance, default 3399)
#   --db-user / TEST_DB_USER   default root; must be allowed to CREATE DATABASE
#   TEST_DB_PASS               its password (environment only, so it stays out
#                              of the process list)
#
# --ref is how you prove a test detects the bug it claims to: run it against
# origin/dev before WP-B0 and checks 1, 2 and 3 must FAIL.
#
# Exits non-zero if any check fails.
#
# WP-B1 note: B1 (stop save_progress destroying 11 columns) must add its own
# assertions that level, streak_count, streak_shields, unlocked_items,
# active_theme, earned_xp_per_node, daily_quests_date, active_quests, energy
# and last_energy_refill survive an autosave that does not mention them.
# last_active_date is the exception: every save has to keep writing it
# (group 6), because the cron's gates (group 7) rely on it.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REF=""
SLOW=0
PORT="${TEST_HTTP_PORT:-8080}"
# An empty DB_HOST means "start a throwaway instance"; see the header.
DB_HOST="${TEST_DB_HOST:-}"
DB_PORT="${TEST_DB_PORT:-}"
DB_USER="${TEST_DB_USER:-root}"
DB_PASS="${TEST_DB_PASS:-}"

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --slow) SLOW=1; shift ;;
    --db-host) DB_HOST="$2"; shift 2 ;;
    --db-port) DB_PORT="$2"; shift 2 ;;
    --db-user) DB_USER="$2"; shift 2 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -n "$DB_HOST" ]; then
  # Loopback only. The suite creates and drops a database, and the one server it
  # must never reach - the live one dev and production share - is remote.
  case "$DB_HOST" in
    127.0.0.1) ;;
    # PDO and the client both treat the name "localhost" as "use the unix
    # socket" and ignore the port, so pin it to the TCP address.
    localhost) DB_HOST="127.0.0.1" ;;
    *) echo "FATAL: --db-host accepts 127.0.0.1 or localhost only, not '$DB_HOST'." >&2; exit 2 ;;
  esac
  DB_PORT="${DB_PORT:-3306}"
else
  DB_PORT="${DB_PORT:-3399}"
fi
case "$DB_PORT" in ''|*[!0-9]*) echo "FATAL: the DB port must be a number, not '$DB_PORT'." >&2; exit 2 ;; esac
# DB_USER is written into the generated PHP config below.
case "$DB_USER" in ''|*[!A-Za-z0-9_]*) echo "FATAL: the DB user may hold letters, digits and _ only." >&2; exit 2 ;; esac

# ---------------------------------------------------------------- prerequisites
if [ -n "$DB_HOST" ]; then
  # Only a client is needed. GitHub's Ubuntu runners ship `mysql`, not `mariadb`.
  MARIADB="${MARIADB:-$(command -v mariadb || command -v mysql || true)}"
  if [ -z "$MARIADB" ]; then
    echo "FATAL: no mariadb or mysql client on PATH." >&2
    exit 2
  fi
else
  MARIADBD="${MARIADBD:-$(command -v mariadbd || true)}"
  MARIADB="${MARIADB:-$(command -v mariadb || true)}"
  INSTALL_DB="${INSTALL_DB:-$(command -v mariadb-install-db || true)}"
  if [ -z "$MARIADBD" ] || [ -z "$MARIADB" ] || [ -z "$INSTALL_DB" ]; then
    echo "FATAL: mariadbd / mariadb / mariadb-install-db not on PATH." >&2
    echo "       brew install mariadb   (the server does NOT need to be running;" >&2
    echo "       this script starts its own throwaway instance)" >&2
    exit 2
  fi
fi
command -v php >/dev/null || { echo "FATAL: php not on PATH." >&2; exit 2; }

SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/lexipaws-sptest.XXXXXX")"
# The unix socket path has a ~103 character limit, and a socket inside a deep
# scratch directory silently blows through it. Keep it directly under /tmp.
SOCKET="/tmp/lexipaws-sptest-$$.sock"
if [ -n "$DB_HOST" ]; then
  # Unique per run, so a name left behind by a killed run cannot be mistaken
  # for this run's database.
  DB_NAME="lexipaws_sptest_$$_$(date +%s)"
  # The client reads the password from this file rather than from argv.
  CNF_PASS="${DB_PASS//\\/\\\\}"; CNF_PASS="${CNF_PASS//\"/\\\"}"
  ( umask 077
    printf '[client]\nprotocol=tcp\nhost=%s\nport=%s\nuser=%s\npassword="%s"\n' \
      "$DB_HOST" "$DB_PORT" "$DB_USER" "$CNF_PASS" > "$SANDBOX/client.cnf" )
  DB_SERVER=("$MARIADB" --defaults-file="$SANDBOX/client.cnf")
else
  DB_NAME="lexipaws_sptest"
  DB_SERVER=("$MARIADB" --socket="$SOCKET" -u root)
fi
DB_CREATED=0
BASE="http://localhost:$PORT/api.php"
FAILURES=0

cleanup() {
  [ -n "${PHP_PID:-}" ] && kill "$PHP_PID" 2>/dev/null
  if [ -n "$DB_HOST" ]; then
    # The server is not ours to stop. Drop the one database this run created.
    [ "$DB_CREATED" -eq 1 ] && "${DB_SERVER[@]}" -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
  else
    [ -S "$SOCKET" ] && "$MARIADB"-admin --socket="$SOCKET" -u root shutdown 2>/dev/null
    sleep 1
    rm -f "$SOCKET"
  fi
  rm -rf "$SANDBOX"
}
trap cleanup EXIT

pass() { echo "  ✅ PASS  $1"; }
fail() { echo "  ❌ FAIL  $1"; FAILURES=$((FAILURES+1)); }

# ------------------------------------------------------------------- sandbox
# Copy only what api.php needs. The sandbox gets its own db_config.php so the
# real one - which holds live credentials and is gitignored, i.e. NOT
# recoverable from git - is never read, written or overwritten.
mkdir -p "$SANDBOX/app/data" "$SANDBOX/app/libs" "$SANDBOX/sessions"
for f in api.php security.php mailer.php migrate.php cron_notifications.php; do
  if [ -n "$REF" ]; then
    git -C "$REPO_ROOT" show "$REF:$f" > "$SANDBOX/app/$f" || exit 2
  else
    cp "$REPO_ROOT/$f" "$SANDBOX/app/$f"
  fi
done
cp -R "$REPO_ROOT/data/migrations" "$SANDBOX/app/data/migrations"
if [ -n "$REF" ]; then
  git -C "$REPO_ROOT" archive "$REF" templates | tar -x -C "$SANDBOX/app" || exit 2
else
  cp -R "$REPO_ROOT/templates" "$SANDBOX/app/templates"
fi
cp -R "$REPO_ROOT/libs/PHPMailer" "$SANDBOX/app/libs/PHPMailer"

# The DSN concatenates DB_HOST straight into the string, so the port rides along.
# The password is read from the environment of the two PHP processes started
# below, so its characters never have to be quoted into PHP source.
export SPTEST_DB_PASS="$DB_PASS"
cat > "$SANDBOX/app/db_config.php" <<PHPCONF
<?php
define('DB_HOST', '127.0.0.1;port=$DB_PORT');
define('DB_NAME', '$DB_NAME');
define('DB_USER', '$DB_USER');
define('DB_PASS', (string) getenv('SPTEST_DB_PASS'));
define('GOOGLE_TTS_API_KEY', 'test');
define('SLACK_WEBHOOK_URL', '');
define('SLACK_WEBHOOK_URL_FEEDBACK', '');
define('CRON_SECRET', 'test');
define('MAINTENANCE_TOKEN', 'test');
define('APP_BASE_URL', 'http://localhost:$PORT');
define('BETA_INVITES_ENABLED', 'true');
define('SMTP_HOST', 'localhost');
define('SMTP_PORT', 465);
define('SMTP_SECURE', 'ssl');
define('SMTP_USER', '');
define('SMTP_PASS', '');
// The first day whose last_active_date the cron trusts. Live, this is the day
// after the writer shipped; here it is long ago, except in group 8.
define('ACTIVITY_DATES_TRUSTED_FROM', getenv('SPTEST_TRUSTED_FROM') ?: '2000-01-01');
PHPCONF

echo "=============================================================="
echo "save_progress security test  —  ${REF:-working tree}"
if [ -n "$DB_HOST" ]; then
  echo "database $DB_NAME on the MariaDB at $DB_HOST:$DB_PORT"
fi
echo "=============================================================="

# ------------------------------------------------------------------ database
if [ -n "$DB_HOST" ]; then
  if ! "${DB_SERVER[@]}" -e "SELECT 1" >/dev/null 2>"$SANDBOX/db-connect.log"; then
    echo "FATAL: cannot reach a MariaDB at $DB_HOST:$DB_PORT as $DB_USER" >&2
    cat "$SANDBOX/db-connect.log" >&2
    exit 2
  fi
else
  "$INSTALL_DB" --datadir="$SANDBOX/mysqldata" --auth-root-authentication-method=normal >/dev/null 2>&1
  "$MARIADBD" --datadir="$SANDBOX/mysqldata" --port="$DB_PORT" --socket="$SOCKET" \
              --bind-address=127.0.0.1 --pid-file="$SANDBOX/mysql.pid" >"$SANDBOX/mysqld.log" 2>&1 &
  for _ in $(seq 1 30); do [ -S "$SOCKET" ] && break; sleep 1; done
  [ -S "$SOCKET" ] || { echo "FATAL: MariaDB did not start; see $SANDBOX/mysqld.log" >&2; exit 2; }
fi

DB=("${DB_SERVER[@]}" "$DB_NAME" -N -B)
# No IF NOT EXISTS, on purpose: on a server this script did not start, a name
# that is already taken has to stop the run, not be reused and dropped on exit.
if ! "${DB_SERVER[@]}" -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4;"; then
  echo "FATAL: could not create the database $DB_NAME" >&2
  exit 2
fi
DB_CREATED=1
( cd "$SANDBOX/app" && php migrate.php ) > "$SANDBOX/migrate.log" 2>&1
if ! grep -q '"errors": \[\]' "$SANDBOX/migrate.log"; then
  echo "FATAL: migrations failed" >&2
  cat "$SANDBOX/migrate.log" >&2
  exit 2
fi

# --------------------------------------------------------------------- server
php -S "localhost:$PORT" -t "$SANDBOX/app" \
    -d session.save_path="$SANDBOX/sessions" -d session.use_strict_mode=0 \
    >"$SANDBOX/php-server.log" 2>&1 &
PHP_PID=$!
disown "$PHP_PID" 2>/dev/null || true
for _ in $(seq 1 20); do curl -sf -o /dev/null "$BASE?action=csrf_token" && break; sleep 0.5; done

# ---------------------------------------------------------------- test helpers
seed() {
  for u in 1 2 3 4; do
    printf 'user_id|i:%s;username|s:7:"tester%s";' "$u" "$u" > "$SANDBOX/sessions/sess_sptestuser$u"
  done
  "${DB[@]}" <<'SQL'
DELETE FROM user_leagues;
DELETE FROM user_progress;
DELETE FROM users;
INSERT INTO users (id, email, password_hash, username) VALUES
  (1, 'poisoned@test.local', 'x', 'poisonedtester'),
  (2, 'rate@test.local',     'x', 'ratetester'),
  (3, 'fresh@test.local',    'x', 'freshtester'),
  (4, 'honest@test.local',   'x', 'honesttester');
-- user 1: a row already holding the falsy "0" scores string - the state a live
--         row can be left in via signup guest_migration or a first save.
-- user 3: deliberately has NO user_progress row.
INSERT INTO user_progress (user_id, points, scores, streak_shields) VALUES
  (1, 1000, '0', 1),
  (2, 1000, '{"bones":50}', 1),
  (4, 1000, '{"bones":50,"streak_shields":1,"node_state":{"n1":{"current_level":3}}}', 1);
SQL
}
tok() {
  curl -s -b "PHPSESSID=sptestuser$1" "$BASE?action=csrf_token" \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("csrf_token",""))'
}
post() {  # $1=user  $2=json  -> echoes the HTTP status
  curl -s -o /dev/null -w '%{http_code}' -b "PHPSESSID=sptestuser$1" \
       -H "Content-Type: application/json" -H "X-CSRF-Token: $(tok "$1")" \
       -d "$2" "$BASE?action=save_progress"
}
col() { "${DB[@]}" -e "SELECT IFNULL($2,'<NULL>') FROM user_progress WHERE user_id=$1"; }
# clamps allow bones <= current+100, shields <= current+3, node level <= current+1
clamped() {
  col "$1" scores | python3 -c '
import sys, json
raw = sys.stdin.read().strip()
try: s = json.loads(raw)
except Exception: s = None
if not isinstance(s, dict): s = {}
b   = s.get("bones", 0)
sh  = s.get("streak_shields", 0)
lvl = (s.get("node_state") or {}).get("n1", {}).get("current_level", 0)
mb, ms, ml = (int(a) for a in sys.argv[1:4])
print(f"bones={b}/{mb} shields={sh}/{ms} level={lvl}/{ml}", file=sys.stderr)
sys.exit(0 if (b <= mb and sh <= ms and lvl <= ml) else 1)
' "$2" "$3" "$4"
}

# The learner's calendar day $1 days ago. The app counts days in Europe/Budapest
# (lexipaws_activity_date() in security.php), so the suite must too: PHP here
# may default to UTC and CI's database runs in UTC.
day() {
  python3 -c '
import sys, datetime, zoneinfo
today = datetime.datetime.now(zoneinfo.ZoneInfo("Europe/Budapest")).date()
print((today - datetime.timedelta(days=int(sys.argv[1]))).isoformat())' "$1"
}
# streak_count|streak_shields|last_active_date of one user
streak_row() {
  "${DB[@]}" -e "SELECT CONCAT(streak_count,'|',streak_shields,'|',IFNULL(last_active_date,'<NULL>')) FROM user_progress WHERE user_id=$1"
}

INFLATED='{"scores":{"bones":999999999,"streak_shields":999,"node_state":{"n1":{"current_level":99}}}}'

# ============================================================== 1. poisoned row
seed
echo
echo "1. an already-poisoned scores=\"0\" row still gets clamped"
post 1 "$INFLATED" >/dev/null
if clamped 1 100 3 2; then pass "inflated payload clamped against a falsy stored value"
else fail "clamps bypassed on a row holding \"0\""; fi

# ========================================================== 2. two-step poisoning
echo
echo "2. {\"scores\":0} cannot disarm the clamps on a fresh account"
post 3 '{"scores":0}' >/dev/null
STORED="$(col 3 scores)"
if [ -n "$STORED" ] && [ "$STORED" != "0" ]; then pass "a scalar scores payload stored as [$STORED], not a falsy string"
else fail "scores column poisoned with [$STORED]"; fi
post 3 "$INFLATED" >/dev/null
if clamped 3 100 3 2; then pass "follow-up inflated payload clamped"
else fail "clamps bypassed after {\"scores\":0}"; fi

# =============================================================== 3. rate limit
echo
echo "3. a scripted loop against save_progress is throttled"
TOK="$(tok 2)"; OK=0; T429=0; OTHER=0
for _ in $(seq 1 60); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -b "PHPSESSID=sptestuser2" \
          -H "Content-Type: application/json" -H "X-CSRF-Token: $TOK" \
          -d '{"scores":{"bones":60}}' "$BASE?action=save_progress")"
  case "$CODE" in 200) OK=$((OK+1)) ;; 429) T429=$((T429+1)) ;; *) OTHER=$((OTHER+1)) ;; esac
done
echo "     60 requests: accepted=$OK throttled=$T429 other=$OTHER"
if [ "$T429" -gt 0 ] && [ "$OTHER" -eq 0 ]; then pass "loop throttled after $OK requests"
else fail "loop not throttled (accepted=$OK, other=$OTHER)"; fi

if [ "$SLOW" -eq 1 ]; then
  echo "     waiting 62s for the rate-limit window to slide..."
  sleep 62
  if [ "$(post 2 '{"scores":{"bones":60}}')" = "200" ]; then pass "window releases - throttling is not a lockout"
  else fail "still throttled after the window elapsed - honest users would be locked out"; fi
fi

# ====================================================== 4. honest save unaffected
echo
echo "4. honest traffic is unaffected"
seed
post 4 '{"points":1050,"scores":{"bones":60,"streak_shields":1,"node_state":{"n1":{"current_level":4}}}}' >/dev/null
ROW="$("${DB[@]}" -e "SELECT CONCAT(points,'|',scores) FROM user_progress WHERE user_id=4")"
if [ "$ROW" = '1050|{"bones":60,"streak_shields":1,"node_state":{"n1":{"current_level":4}}}' ]
then pass "legitimate payload stored byte-for-byte"
else fail "legitimate payload altered: $ROW"; fi

CODE="$(post 3 '{"points":10,"scores":{"bones":5},"completed":{"n1":true}}')"
if [ "$CODE" = "200" ] && [ "$("${DB[@]}" -e "SELECT COUNT(*) FROM user_progress WHERE user_id=3")" = "1" ]
then pass "user with no user_progress row inserts cleanly (no fatal on the INSERT path)"
else fail "save failed for a user with no progress row (HTTP $CODE)"; fi

# ============================================ 5. paths moved by the B0 refactor
echo
echo "5. logic moved out of handleSaveProgress still behaves"
seed
post 4 '{"points":1040,"scores":{"bones":55}}' >/dev/null
L1="$("${DB[@]}" -e "SELECT CONCAT(league_id,'|',weekly_xp,'|',monthly_xp) FROM user_leagues WHERE user_id=4")"
post 4 '{"points":1070,"scores":{"bones":55}}' >/dev/null
L2="$("${DB[@]}" -e "SELECT CONCAT(league_id,'|',weekly_xp,'|',monthly_xp) FROM user_leagues WHERE user_id=4")"
if [ "$L1" = "2|40|40" ] && [ "$L2" = "2|70|70" ]
then pass "awardLeagueXp: +40 then +30 accumulates to 70, league_id 2 at 1040 points"
else fail "league XP wrong: after first save [$L1], after second [$L2] (expected 2|40|40 then 2|70|70)"; fi

"${DB[@]}" -e "UPDATE users SET notification_preferences='{\"milestones\":false}' WHERE id=4;
               UPDATE user_progress SET streak_count=6 WHERE user_id=4;"
START="$(python3 -c 'import time;print(time.time())')"
CODE="$(post 4 '{"points":1080,"streak_count":7,"scores":{"bones":55}}')"
ELAPSED="$(python3 -c 'import time,sys;print(round(time.time()-float(sys.argv[1]),3))' "$START")"
if [ "$CODE" = "200" ] && [ "$(col 4 streak_count)" = "7" ]
then pass "sendStreakMilestoneEmails: streak 6->7 with milestones=false succeeds without SMTP (${ELAPSED}s)"
else fail "milestone path broke the save (HTTP $CODE)"; fi

# =================================================== 6. the activity-day writer
echo
echo "6. a successful save stamps last_active_date with the learner's day"
seed
D0="$(day 0)"; D1="$(day 1)"; D2="$(day 2)"; D3="$(day 3)"
"${DB[@]}" -e "UPDATE user_progress SET last_active_date='2026-07-01' WHERE user_id=4"
post 4 '{"points":1010,"scores":{"bones":55}}' >/dev/null
GOT="$(col 4 last_active_date)"
if [ "$GOT" = "$D0" ]; then pass "a row last active on 2026-07-01 is stamped with today, $D0 (Europe/Budapest)"
else fail "last_active_date is [$GOT] after a save, expected $D0"; fi

post 4 '{"points":1020,"last_active_date":"2031-01-01","scores":{"bones":55}}' >/dev/null
GOT="$(col 4 last_active_date)"
if [ "$GOT" = "$D0" ]; then pass "a last_active_date sent by the client is ignored"
else fail "the client set last_active_date to [$GOT]"; fi

post 3 '{"points":10,"scores":{"bones":5}}' >/dev/null
GOT="$(col 3 last_active_date)"
if [ "$GOT" = "$D0" ]; then pass "a first save (no user_progress row yet) is stamped too"
else fail "last_active_date is [$GOT] after a first save, expected $D0"; fi

# Fixed instants either side of midnight in Budapest, in summer and in winter
# time, read with PHP set to a zone 12-13 hours ahead.
GOT="$(cd "$SANDBOX/app" && php -d date.timezone=Pacific/Kiritimati -r '
require "security.php";
echo implode(" ", [
    lexipaws_activity_date(0, 1782943199), // 2026-07-01 21:59:59 UTC = 23:59:59 in Budapest
    lexipaws_activity_date(0, 1782943200), // one second later
    lexipaws_activity_date(0, 1798757999), // 2026-12-31 22:59:59 UTC = 23:59:59 in Budapest
    lexipaws_activity_date(0, 1798758000), // one second later
    lexipaws_activity_date(2, 1798758000),
]);' 2>/dev/null)"
if [ "$GOT" = "2026-07-01 2026-07-02 2026-12-31 2027-01-01 2026-12-30" ]
then pass "the day changes at midnight in Europe/Budapest, whatever PHP's own time zone is"
else fail "lexipaws_activity_date() returned [$GOT]"; fi

# ================================================= 7. cron_notifications.php
echo
echo "7. cron_notifications.php leaves stale rows alone and keys mail on activity"
seed
# User 4 gets today's date from a real save. Until WP-B1 that save also zeroes
# streak_count, so the streak is put back by hand: the row then looks the way
# a saved-today row will after B1, and only the date keeps the cron away.
post 4 '{"points":1010,"scores":{"bones":55}}' >/dev/null
"${DB[@]}" <<SQL
UPDATE user_progress SET streak_count=5, streak_shields=2 WHERE user_id=4;
INSERT INTO users (id, email, password_hash, username, last_login_at) VALUES
  (11, 'legacy@test.local',   'x', 'legacytester',   '2026-07-01 08:00:00'),
  (12, 'neverset@test.local', 'x', 'neversettester', NOW()),
  (13, 'oldlogin@test.local', 'x', 'oldlogintester', NOW() - INTERVAL 10 DAY),
  (14, 'idle3@test.local',    'x', 'idle3tester',    NOW()),
  (15, 'missed1@test.local',  'x', 'missed1tester',  NOW()),
  (16, 'noshield@test.local', 'x', 'noshieldtester', NOW());
-- 11: a legacy row.                12: never stamped.
-- 13: active today, but the last password login was 10 days ago.
-- 14: idle for 3 days, although the login is fresh.
-- 15: missed exactly yesterday.    16: the same, with no shield left.
INSERT INTO user_progress (user_id, points, scores, streak_count, streak_shields, last_active_date) VALUES
  (11, 500, '{}', 5, 2, '2026-07-01'),
  (12, 500, '{}', 5, 2, NULL),
  (13, 500, '{}', 5, 2, '$D0'),
  (14, 500, '{}', 5, 2, '$D3'),
  (15, 500, '{}', 5, 2, '$D2'),
  (16, 500, '{}', 5, 0, '$D2');
SQL
for _ in 1 2 3; do ( cd "$SANDBOX/app" && php cron_notifications.php ) >> "$SANDBOX/cron.log" 2>&1; done
sed 's/^/     | /' "$SANDBOX/cron.log"
# No SMTP password is configured here, so a mail that is due shows up as a
# "Could not send ..." line, and one that is not due leaves no line at all.
mail_line() { grep -cE "$1 email to $2@test\.local" "$SANDBOX/cron.log"; }
never_mailed() {
  [ "$(grep -cF "$1@test.local" "$SANDBOX/cron.log")" = "0" ] && [ "$("${DB[@]}" -e "
    SELECT COUNT(*) FROM users WHERE email='$1@test.local'
      AND last_inactivity_email_sent IS NULL AND last_streak_email_sent IS NULL")" = "1" ]
}

if [ "$(grep -c 'Cron job finished successfully' "$SANDBOX/cron.log")" = "3" ] && ! grep -q '^Error' "$SANDBOX/cron.log"
then pass "three runs in a row finish without an error"
else fail "the cron did not finish three clean runs"; fi

ROW="$(streak_row 11)"
if [ "$ROW" = "5|2|2026-07-01" ] && never_mailed legacy
then pass "a legacy row (streak 5, 2 shields, last active 2026-07-01) is unchanged and gets no e-mail"
else fail "legacy row is now [$ROW], or it was mailed"; fi

ROW="$(streak_row 12)"
if [ "$ROW" = "5|2|<NULL>" ] && never_mailed neverset
then pass "a row whose last_active_date is NULL is unchanged and gets no e-mail"
else fail "NULL-date row is now [$ROW], or it was mailed"; fi

ROW="$(streak_row 4)"
if [ "$ROW" = "5|2|$D0" ] && never_mailed honest
then pass "a row saved today is not matched"
else fail "saved-today row is now [$ROW], or it was mailed"; fi

ROW="$(streak_row 13)"
if [ "$ROW" = "5|2|$D0" ] && never_mailed oldlogin
then pass "active today with a 10-day-old login: no inactivity e-mail"
else fail "active-today row is now [$ROW], or it was mailed"; fi

ROW="$(streak_row 14)"
if [ "$ROW" = "5|2|$D3" ] && [ "$(mail_line inactivity idle3)" -ge 1 ] && [ "$(mail_line 'streak protected' idle3)" = "0" ]
then pass "idle for 3 days: an inactivity e-mail is due; shields and streak are not touched"
else fail "idle-3-days row is now [$ROW], inactivity lines: $(mail_line inactivity idle3)"; fi

ROW="$(streak_row 15)"
if [ "$ROW" = "5|1|$D1" ] && [ "$(mail_line 'streak protected' missed1)" = "1" ]
then pass "one missed day costs one shield across three runs, with one streak e-mail"
else fail "missed-one-day row is now [$ROW] (expected 5|1|$D1), streak lines: $(mail_line 'streak protected' missed1)"; fi

ROW="$(streak_row 16)"
if [ "$ROW" = "0|0|$D2" ]
then pass "one missed day with no shield left ends the streak"
else fail "no-shield row is now [$ROW] (expected 0|0|$D2)"; fi

# The next two mornings: every date moves one day further into the past, then
# the cron runs once more. This is the case the old cron got wrong - it took a
# shield from the legacy row every day until the streak was gone.
for _ in 1 2; do
  "${DB[@]}" -e "UPDATE user_progress SET last_active_date = last_active_date - INTERVAL 1 DAY WHERE user_id IN (4, 11, 12, 13, 14, 15, 16)"
  ( cd "$SANDBOX/app" && php cron_notifications.php ) >> "$SANDBOX/cron.log" 2>&1
done

ROW="$(streak_row 11)"
if [ "$ROW" = "5|2|2026-06-29" ] && never_mailed legacy
then pass "two mornings later the legacy row still has its streak and both shields, and no e-mail"
else fail "legacy row after two more mornings is [$ROW], or it was mailed"; fi

ROW="$(streak_row 15)"
if [ "$ROW" = "0|0|$D2" ]
then pass "a second missed day takes the last shield, and a third ends the streak"
else fail "missed-three-days row is now [$ROW] (expected 0|0|$D2)"; fi

ROW="$(streak_row 4)"
if [ "$ROW" = "5|1|$D1" ]
then pass "the learner who saved two mornings ago has missed one day and lost one shield"
else fail "saved-two-mornings-ago row is now [$ROW] (expected 5|1|$D1)"; fi

LINKS="$(cd "$SANDBOX/app" && php -r '
require "mailer.php";
$template = include "templates/emails/inactivity.php";
foreach (["hu", "sk"] as $lang) {
    echo $lang, " ", $template(["username" => "x", "language" => $lang])["buttonLink"], "\n";
}' 2>/dev/null)"
if [ "$(printf '%s\n' "$LINKS" | grep -cE '^(hu|sk) .*/dashboard$')" = "2" ]
then pass "the inactivity e-mail's button opens /dashboard in Hungarian and in Slovak"
else fail "inactivity button links: [$LINKS]"; fi

# ===================================== 8. dates from before the writer shipped
echo
echo "8. a last_active_date from before the writer shipped is never acted on"
seed
"${DB[@]}" <<SQL
INSERT INTO users (id, email, password_hash, username) VALUES
  (21, 'oldcron@test.local', 'x', 'oldcrontester'),
  (22, 'oldidle@test.local', 'x', 'oldidletester');
-- 21: what the old cron left behind every night: a streak, a shield, and a
--     recent date that it wrote itself.    22: three days idle by an old date.
INSERT INTO user_progress (user_id, points, scores, streak_count, streak_shields, last_active_date) VALUES
  (21, 500, '{}', 5, 1, '$D2'),
  (22, 500, '{}', 5, 2, '$D3');
SQL
# The cut-off is yesterday: both dates are older, so neither row is trusted.
( cd "$SANDBOX/app" && SPTEST_TRUSTED_FROM="$D1" php cron_notifications.php ) > "$SANDBOX/cron-cutoff.log" 2>&1
sed 's/^/     | /' "$SANDBOX/cron-cutoff.log"
ROWS="$(streak_row 21) $(streak_row 22)"
if [ "$ROWS" = "5|1|$D2 5|2|$D3" ] && ! grep -qE 'oldcron@|oldidle@' "$SANDBOX/cron-cutoff.log"
then pass "with the cut-off after both dates: no shield taken, no streak ended, no e-mail"
else fail "rows before the cut-off are now [$ROWS], or one was mailed"; fi

# The same rows with the cut-off three days back: now the cron acts on them,
# so the cut-off was the only thing holding it back.
( cd "$SANDBOX/app" && SPTEST_TRUSTED_FROM="$D3" php cron_notifications.php ) > "$SANDBOX/cron-cutoff.log" 2>&1
ROWS="$(streak_row 21) $(streak_row 22)"
if [ "$ROWS" = "5|0|$D1 5|2|$D3" ] && grep -q 'inactivity email to oldidle@test.local' "$SANDBOX/cron-cutoff.log"
then pass "with the cut-off before both dates: the shield is taken and the inactivity e-mail is due"
else fail "rows after moving the cut-off are [$ROWS] (expected 5|0|$D1 5|2|$D3)"; fi

# ==================================================================== summary
echo
echo "=============================================================="
if [ "$FAILURES" -eq 0 ]; then
  echo "ALL CHECKS PASSED  —  ${REF:-working tree}"
else
  echo "$FAILURES CHECK(S) FAILED  —  ${REF:-working tree}"
fi
echo "=============================================================="
exit $(( FAILURES > 0 ? 1 : 0 ))
