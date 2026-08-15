#!/usr/bin/env bash
# Blocks two Bash mistakes that succeed at doing the wrong thing.
#
# THIS FILE IS THE SOURCE OF TRUTH, BUT IT IS NOT THE COPY THAT RUNS.
# Registered at the USER level so it guards every repo:
#     ~/.claude/settings.json  ->  ~/.claude/hooks/bash-footguns.sh
# After editing:
#     bash .claude/hooks/tests/bash-footguns.sh     # all cases must pass
#     cp .claude/hooks/bash-footguns.sh ~/.claude/hooks/
# Editing only this copy changes nothing at runtime.
#
# PreToolUse hook. Reads the tool call on stdin, exits 2 to block.
#
# Both rules target commands that EXIT 0 while accomplishing nothing, which is
# why they are worth a hook: a loud failure teaches you on the spot, a quiet
# one gets believed and reported as done.
#
# Bash only. PowerShell is a separate tool_name with its own cwd semantics and
# native path handling, so neither rule applies there.

set -uo pipefail

input=$(cat)

tool=$(printf '%s' "$input" | grep -o '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
[[ "$tool" == "Bash" ]] || exit 0

command=$(printf '%s' "$input" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(\(\\.\|[^"\\]\)*\)".*/\1/p' | head -1)
[[ -n "$command" ]] || exit 0

backgrounded=$(printf '%s' "$input" | grep -o '"run_in_background"[[:space:]]*:[[:space:]]*true' | head -1)

block() {
  echo "BLOCKED: $1" >&2
  echo "$2" >&2
  exit 2
}

# Rule 1: `cd` in a backgrounded call.
#
# Background commands run in the session cwd regardless of a leading `cd`, so
# `cd X && npm ci` installs into whatever directory the session happens to be
# in. It exits 0. The artifact lands somewhere else entirely.
if [[ -n "$backgrounded" ]]; then
  if printf '%s' "$command" | grep -qE '(^|[;&|]|&&)[[:space:]]*cd[[:space:]]+[^;&|]'; then
    block "backgrounded Bash command contains 'cd'" \
"Backgrounded commands do not inherit 'cd' -- they run in the session cwd, so
this would succeed while working in the wrong directory.
Use the command's own directory flag instead: npm --prefix <dir>, git -C <dir>,
pnpm -C <dir>. For anything else, run it in the foreground."
  fi
fi

# Rule 2: Git Bash path form passed to a Windows-native binary.
#
# node/python read C:/Users/..., not /c/Users/.... The Bash form resolves to
# C:\c\Users\... and raises ENOENT, which reads as a missing file rather than
# a malformed path.
# Matching the binary anywhere and the path anywhere flags any command whose
# text merely mentions both -- a commit message about this very rule trips it.
# Require instead that the path FOLLOW the binary on the same segment, and drop
# heredoc bodies first, since prose there is data the binary never parses.
scan=$(printf '%s' "$command" | sed 's/<<-\{0,1\}[[:space:]]*[A-Za-z_'\''"][A-Za-z0-9_]*.*$//')

if printf '%s' "$scan" | grep -qE '(^|[[:space:];&|(])(node|python|python3)([[:space:]]+[^;&|]*)?[[:space:]"'\''=(]/[a-zA-Z]/[Uu]sers/'; then
  block "Git Bash path form (/c/Users/...) passed to a Windows-native binary" \
"node and python read C:/Users/..., not /c/Users/.... The Bash form becomes
C:\\c\\Users\\... and fails with ENOENT, which looks like a missing file.
Rewrite the path as C:/Users/... -- forward slashes are fine."
fi

exit 0
