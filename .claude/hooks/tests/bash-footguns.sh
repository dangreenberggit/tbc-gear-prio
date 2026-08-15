#!/usr/bin/env bash
# Cases for bash-footguns.sh. Run before copying the hook to ~/.claude/hooks/.
#
#     bash .claude/hooks/tests/bash-footguns.sh
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

# --- Rule 2: Git Bash paths to native binaries -------------------------------
run block "node -e with /c/Users path"       "$(fg 'node -e \"require(0)\" /c/Users/dgree/x.json')"
run block "python with /c/Users path"        "$(fg 'python /c/Users/dgree/s.py')"
run block "node with quoted /c/Users path"   "$(fg "node script.js '/c/Users/dgree/a.json'")"

run allow "node with C:/Users path"          "$(fg 'node script.js C:/Users/dgree/a.json')"
run allow "node with a relative path"        "$(fg 'node scripts/build.js data/x.json')"
run allow "ls with a /c/Users path"          "$(fg 'ls /c/Users/dgree/Code')"
run allow "cp with /c/Users paths"           "$(fg 'cp /c/Users/dgree/a /c/Users/dgree/b')"
run allow "grep for the literal string"      "$(fg 'grep -r \"/c/Users\" docs/')"
run allow "PowerShell out of scope"          "$(ps1 'node /c/Users/dgree/x.js')"
# 'node' inside another word must not trip the rule.
run allow "nodemon is not node"              "$(fg 'nodemon /c/Users/dgree/x.js')"

# --- Prose that merely mentions both -----------------------------------------
# Found the hard way: the hook blocked its own commit, because the message
# described the rule. Command text is not the same as command arguments.
run allow "commit message naming both"       "$(fg 'git commit -m \"node reads C:/Users not /c/Users/x\"')"
run allow "heredoc body naming both"         "$(fg 'git commit -F - <<EOF\nnode and /c/Users/dgree/x\nEOF')"
run allow "echo of a /c/Users path"          "$(fg 'echo \"see /c/Users/dgree/notes\" && ls')"
run allow "grep for node near a path"        "$(fg 'grep -rn \"node\" /c/Users/dgree/Code')"

# --- Payload shapes ----------------------------------------------------------
run allow "non-Bash tool"                    '{"tool_name":"Read","tool_input":{"file_path":"/c/Users/x"}}'
run allow "missing command field"            '{"tool_name":"Bash","tool_input":{}}'

echo
echo "passed: $pass  failed: $fail"
[[ $fail -eq 0 ]]
