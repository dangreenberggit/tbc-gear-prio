#!/usr/bin/env bash
# Cases for bash-footguns.sh. Run before copying the hook to ~/.claude/hooks/.
#
#     bash docs/agents/home/hooks/tests/bash-footguns.sh
#
# A false positive here is worse than a miss: a hook that blocks legitimate
# commands trains the reader to work around it. Most cases below are therefore
# things that must be ALLOWED.

set -uo pipefail

HOOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/bash-footguns.sh"
pass=0
fail=0

# run <expect: block|allow> <description> <json payload>
run() {
  local expect="$1" desc="$2" payload="$3" rc
  printf '%s' "$payload" | bash "$HOOK" >/dev/null 2>&1
  rc=$?
  local got="allow"; [[ $rc -eq 2 ]] && got="block"
  if [[ "$got" == "$expect" ]]; then
    pass=$((pass + 1))
  else
    fail=$((fail + 1))
    echo "FAIL [expected $expect, got $got] $desc"
  fi
}

bg()  { printf '{"tool_name":"Bash","tool_input":{"command":"%s","run_in_background":true}}' "$1"; }
fg()  { printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$1"; }
ps1() { printf '{"tool_name":"PowerShell","tool_input":{"command":"%s"}}' "$1"; }

# --- Rule 1: cd in a backgrounded call ---------------------------------------
run block "backgrounded cd && npm ci"        "$(bg 'cd /c/proj/fork && npm ci')"
run block "backgrounded cd ; cmd"            "$(bg 'cd /c/proj && ls')"
run block "backgrounded cd with &&  spacing" "$(bg 'cd  /c/proj   &&  pnpm i')"
run block "backgrounded cd after a pipe"     "$(bg 'echo hi | cat && cd /c/proj && ls')"

run allow "foreground cd is fine"            "$(fg 'cd /c/proj/fork && npm ci')"
run allow "backgrounded without cd"          "$(bg 'npm ci --prefix /c/proj/fork')"
run allow "backgrounded git -C"              "$(bg 'git -C /c/proj status')"
# 'cd' as a substring of another word must not trip the rule.
run allow "word containing cd"               "$(bg 'echo abcd && ls')"
run allow "cd inside a longer word"          "$(bg 'mycd --flag')"
run allow "PowerShell is out of scope"       "$(ps1 'cd C:/proj; npm ci')"

# --- Payload shapes ----------------------------------------------------------
run allow "non-Bash tool"                    '{"tool_name":"Read","tool_input":{"file_path":"/c/Users/x"}}'
run allow "missing command field"            '{"tool_name":"Bash","tool_input":{}}'

echo
echo "passed: $pass  failed: $fail"
[[ $fail -eq 0 ]]
