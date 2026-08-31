#!/usr/bin/env bash
#
# Integration test for the save_progress anti-cheat surface (WP-B0).
#
# Runs the real api.php over real HTTP, against a THROWAWAY MariaDB instance
# that this script creates and destroys. It never reads db_config.php and never
# connects to the live database — dev and production share one database, so
# there is no safe remote environment to test writes against.
#
#   ./tools/local/testing/save_progress_security_test.sh              # working tree
#   ./tools/local/testing/save_progress_security_test.sh --ref dev    # a git ref
#   ./tools/local/testing/save_progress_security_test.sh --slow       # + 60s window test
#
# --ref is how you prove a test detects the bug it claims to: run it against
# origin/dev before WP-B0 and checks 1, 2 and 3 must FAIL.
#
# Exits non-zero if any check fails.
#
# WP-B1 note: this covers the clamp and rate-limit surface only. B1 (stop
# save_progress destroying 11 columns) must add its own assertions that
# level, streak_count, streak_shields, last_active_date, unlocked_items,
# active_theme, earned_xp_per_node, daily_quests_date, active_quests, energy
# and last_energy_refill survive an autosave that does not mention them.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
REF=""
SLOW=0
PORT="${TEST_HTTP_PORT:-8080}"
DB_PORT="${TEST_DB_PORT:-3399}"

while [ $# -gt 0 ]; do
  case "$1" in
    --ref) REF="$2"; shift 2 ;;
    --slow) SLOW=1; shift ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

# ---------------------------------------------------------------- prerequisites
MARIADBD="${MARIADBD:-$(command -v mariadbd || true)}"
MARIADB="${MARIADB:-$(command -v mariadb || true)}"
INSTALL_DB="${INSTALL_DB:-$(command -v mariadb-install-db || true)}"
if [ -z "$MARIADBD" ] || [ -z "$MARIADB" ] || [ -z "$INSTALL_DB" ]; then
  echo "FATAL: mariadbd / mariadb / mariadb-install-db not on PATH." >&2
  echo "       brew install mariadb   (the server does NOT need to be running;" >&2
  echo "       this script starts its own throwaway instance)" >&2
  exit 2
fi
command -v php >/dev/null || { echo "FATAL: php not on PATH." >&2; exit 2; }

SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/lexipaws-sptest.XXXXXX")"
# The unix socket path has a ~103 character limit, and a socket inside a deep
# scratch directory silently blows through it. Keep it directly under /tmp.
SOCKET="/tmp/lexipaws-sptest-$$.sock"
DB_NAME="lexipaws_sptest"
BASE="http://localhost:$PORT/api.php"
FAILURES=0

cleanup() {
  [ -n "${PHP_PID:-}" ] && kill "$PHP_PID" 2>/dev/null
  [ -S "$SOCKET" ] && "$MARIADB"-admin --socket="$SOCKET" -u root shutdown 2>/dev/null
  sleep 1
  rm -f "$SOCKET"
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
for f in api.php security.php mailer.php migrate.php; do
  if [ -n "$REF" ]; then
    git -C "$REPO_ROOT" show "$REF:$f" > "$SANDBOX/app/$f" || exit 2
  else
    cp "$REPO_ROOT/$f" "$SANDBOX/app/$f"
  fi
done
cp -R "$REPO_ROOT/data/migrations" "$SANDBOX/app/data/migrations"
cp -R "$REPO_ROOT/templates" "$SANDBOX/app/templates"
cp -R "$REPO_ROOT/libs/PHPMailer" "$SANDBOX/app/libs/PHPMailer"

# The DSN concatenates DB_HOST straight into the string, so the port rides along.
cat > "$SANDBOX/app/db_config.php" <<PHPCONF
<?php
define('DB_HOST', '127.0.0.1;port=$DB_PORT');
define('DB_NAME', '$DB_NAME');
define('DB_USER', 'root');
define('DB_PASS', '');
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
PHPCONF

echo "=============================================================="
echo "save_progress security test  —  ${REF:-working tree}"
echo "=============================================================="

# ------------------------------------------------------------------ database
"$INSTALL_DB" --datadir="$SANDBOX/mysqldata" --auth-root-authentication-method=normal >/dev/null 2>&1
"$MARIADBD" --datadir="$SANDBOX/mysqldata" --port="$DB_PORT" --socket="$SOCKET" \
            --bind-address=127.0.0.1 --pid-file="$SANDBOX/mysql.pid" >"$SANDBOX/mysqld.log" 2>&1 &
for _ in $(seq 1 30); do [ -S "$SOCKET" ] && break; sleep 1; done
[ -S "$SOCKET" ] || { echo "FATAL: MariaDB did not start; see $SANDBOX/mysqld.log" >&2; exit 2; }

DB=("$MARIADB" --socket="$SOCKET" -u root "$DB_NAME" -N -B)
"$MARIADB" --socket="$SOCKET" -u root -e "CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4;"
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
