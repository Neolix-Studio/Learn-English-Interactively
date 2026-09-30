#!/usr/bin/env bash
# Lexipaws autopilot: runs one fresh Claude Code session per issue, one after
# another, until a session needs the owner. Each session follows CLAUDE.md
# (steps 1-10 and its "Autopilot" section) and ends its reply with
#   AUTOPILOT: CONTINUE            the issue is closed, start the next one
#   AUTOPILOT: STOP — <reason>     the owner is needed; the loop ends here
#
#   ./tools/local/autopilot.sh          at most 10 issues
#   ./tools/local/autopilot.sh 3        at most 3 issues
#
# Needs the Claude Code CLI (`claude`), logged in. Commands a session may run
# without asking are listed in .claude/settings.json; anything else is refused
# (permission mode dontAsk), and the session is told to stop and say so.
# Logs: ~/Library/Logs/lexipaws-autopilot/. Ctrl-C stops the loop.

set -u
cd "$(dirname "$0")/../.." || exit 1
# The native installer puts claude in ~/.local/bin, which a shell may not have on its PATH yet.
export PATH="$HOME/.local/bin:$PATH"

MAX="${1:-10}"
LOG_DIR="$HOME/Library/Logs/lexipaws-autopilot"
mkdir -p "$LOG_DIR"

PROMPT='Autopilot run. Start the next priority issue from Project 1 and take it through CLAUDE.md steps 1 to 10, following its "Autopilot" section. Nobody is watching this session. End your final message with exactly one line: "AUTOPILOT: CONTINUE" or "AUTOPILOT: STOP — <what the owner must do>".'

notify() {
  osascript -e "display notification \"$1\" with title \"Lexipaws autopilot\" sound name \"Glass\"" >/dev/null 2>&1 || true
}

if ! command -v claude >/dev/null 2>&1; then
  echo "The Claude Code CLI is not installed. Install it with:"
  echo "  curl -fsSL https://claude.ai/install.sh | bash"
  exit 1
fi

for i in $(seq 1 "$MAX"); do
  if [ "$(git branch --show-current)" != "dev" ] || [ -n "$(git status --porcelain)" ]; then
    echo "Stopped: the working tree must be clean and on dev before a run."
    notify "Stopped: the working tree is not clean on dev."
    exit 1
  fi

  log="$LOG_DIR/$(date +%Y-%m-%d_%H%M%S).log"
  echo "[$(date +%H:%M)] Run $i of $MAX, log: $log"
  claude -p "$PROMPT" \
    --permission-mode dontAsk \
    --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
    >"$log" 2>&1
  code=$?

  last="$(grep -E '^AUTOPILOT: ' "$log" | tail -1)"
  echo "    exit $code: ${last:-no AUTOPILOT line}"

  case "$last" in
    "AUTOPILOT: CONTINUE"*) continue ;;
  esac

  reason="${last#AUTOPILOT: STOP — }"
  [ -z "$last" ] && reason="the session ended without an AUTOPILOT line (exit $code); see the log"
  notify "Needs you: $reason"
  echo
  echo "Needs you: $reason"
  echo "Full reply: $log"
  exit 0
done

notify "Finished $MAX runs."
echo "Finished $MAX runs."
