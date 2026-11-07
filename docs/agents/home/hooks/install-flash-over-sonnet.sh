#!/usr/bin/env bash
# Install or check the flash-over-sonnet hook. The owner runs this in their
# own terminal: agents cannot write ~/.claude/hooks or a settings file.
#   bash install-flash-over-sonnet.sh          install (safe to run again)
#   bash install-flash-over-sonnet.sh --check  print what is installed
# The hook reads ~/.claude/routing.md, so install that first
# (docs/agents/home/install-routing.sh does both). It is wired in
# ~/.claude_router/settings.json only: the "Claude + GLM workers" card.
# BACKUP_DIR names where replaced files go; default ~/.claude/backups/.
set -euo pipefail
D="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$D/flash-over-sonnet.py"
TESTS="$D/tests/flash-over-sonnet.py"
TARGET="$HOME/.claude/hooks/flash-over-sonnet.py"
ROUTING="$HOME/.claude/routing.md"
ROUTER="$HOME/.claude_router/settings.json"
PLAIN="$HOME/.claude/settings.json"
COMMAND='python3 "$HOME/.claude/hooks/flash-over-sonnet.py"'
BACKUP_DIR="${BACKUP_DIR:-$HOME/.claude/backups/flash-over-sonnet-$(date -u +%Y%m%dT%H%M%SZ)}"

# Prints only counts and yes/no: the settings files hold an env block.
agent_entries() { jq '[.hooks.PreToolUse[]? | select(.matcher == "Agent")] | length' "$1"; }
wired() {
  test -f "$1" || { echo no; return; }
  jq --arg c "$COMMAND" \
    'if [.hooks.PreToolUse[]? | select(.matcher == "Agent") | .hooks[]?.command] | index($c) then "yes" else "no" end' \
    -r "$1"
}
backup() {
  local rel="${1#"$HOME"/}"
  mkdir -p "$BACKUP_DIR/$(dirname "$rel")"
  cp -p "$1" "$BACKUP_DIR/$rel"
  echo "backed up $1 to $BACKUP_DIR/$rel"
}

check() {
  local rc=0
  if [ -f "$TARGET" ] && cmp -s "$SRC" "$TARGET"; then echo "hook: $TARGET matches $SRC"
  elif [ -f "$TARGET" ]; then echo "hook: $TARGET DIFFERS from $SRC"; rc=1
  else echo "hook: $TARGET missing"; rc=1; fi
  [ -f "$ROUTING" ] && echo "routing: $ROUTING present" || { echo "routing: $ROUTING missing"; rc=1; }
  local r p
  r="$(wired "$ROUTER")"; p="$(wired "$PLAIN")"
  echo "wired in $ROUTER: $r (want yes)"
  echo "wired in $PLAIN: $p (want no)"
  [ "$r" = yes ] && [ "$p" = no ] || rc=1
  if [ -f "$TARGET" ] && [ -f "$ROUTING" ]; then
    python3 "$TESTS" --hook "$TARGET" --routing "$ROUTING" || rc=1
  fi
  return $rc
}

install() {
  command -v jq >/dev/null || { echo "jq is needed" >&2; exit 1; }
  test -f "$ROUTING" || { echo "missing $ROUTING; install routing.md first" >&2; exit 1; }
  test -f "$ROUTER" || { echo "missing $ROUTER" >&2; exit 1; }
  python3 "$TESTS" --routing "$ROUTING"
  if ! { [ -f "$TARGET" ] && cmp -s "$SRC" "$TARGET"; }; then
    [ -f "$TARGET" ] && backup "$TARGET"
    mkdir -p "$(dirname "$TARGET")"
    cp "$SRC" "$TARGET.new"
    mv "$TARGET.new" "$TARGET"
    echo "copied $SRC to $TARGET"
  fi
  if [ "$(wired "$ROUTER")" = yes ]; then
    echo "already wired in $ROUTER"
  else
    local n
    n="$(agent_entries "$ROUTER")"
    # subagent-foreground-helpers.py's tests want exactly one Agent entry, so
    # the hook joins that entry instead of adding a second one.
    [ "$n" -le 1 ] || { echo "want at most one PreToolUse Agent entry in $ROUTER, found $n" >&2; exit 1; }
    backup "$ROUTER"
    # Write through a symlink: mv onto the link itself would replace it with a
    # regular file and cut it off from what it points at.
    local real rc
    real="$(readlink -f "$ROUTER")"
    jq --arg c "$COMMAND" '
      .hooks //= {} | .hooks.PreToolUse //= [] |
      if any(.hooks.PreToolUse[]; .matcher == "Agent")
      then .hooks.PreToolUse |= map(if .matcher == "Agent" then .hooks = ((.hooks // []) + [{"type": "command", "command": $c, "timeout": 10}]) else . end)
      else .hooks.PreToolUse += [{"matcher": "Agent", "hooks": [{"type": "command", "command": $c, "timeout": 10}]}]
      end' "$real" > "$real.new" || {
      rc=$?; rm -f "$real.new"; echo "jq failed; $ROUTER is unchanged" >&2; exit "$rc"; }
    chmod --reference="$real" "$real.new"
    mv "$real.new" "$real"
    echo "wired in $ROUTER"
  fi
  check
}

case "${1:-}" in
  "") install ;;
  --check) check ;;
  *) echo "usage: bash install-flash-over-sonnet.sh [--check]" >&2; exit 2 ;;
esac
