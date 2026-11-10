#!/bin/bash
# Ticket 695: send one signal to the pid of `node scripts/dev-tab.mjs frontend`
# alone (how the .claude/launch.json entries start it, with no pnpm) and check
# whether vite and its `tsc --noEmit --watch` stop.
# Run from the checkout root: bash .scratch/carry-forward/notes/695-single-pid-check.sh 5193
# Expected: SIGTERM, SIGHUP and SIGINT print "all gone" and port=down; SIGKILL
# prints "still running after 30 s" and port=up, because the wrapper cannot
# catch it. Each round then stops the process group it started, and only that.
port=${1:?usage: $0 <free port>}
up() { ss -ltnH "sport = :$port" | grep -q . && echo up || echo down; }
alive() { for q in "$@"; do kill -0 "$q" 2>/dev/null && echo "$q"; done; }
for sig in TERM HUP INT KILL; do
  node scripts/dev-tab.mjs frontend --frontend-port "$port" >/dev/null 2>&1 &
  wrapper=$!
  for _ in $(seq 60); do [ "$(up)" = up ] && break; sleep 1; done
  [ "$(up)" = up ] || { echo "SIG$sig: vite never listened on :$port" >&2; kill "$wrapper"; exit 1; }
  sleep 2
  # vite leads its own process group (serve in scripts/dev-tab.mjs), and tsc runs in it.
  vite=$(pgrep -P "$wrapper")
  pids=$(ps -eo pid=,pgid= | awk -v g="$vite" '$2==g {print $1}')
  echo "SIG$sig: before: port=$(up), wrapper $wrapper and $(echo $pids | wc -w) processes in vite's group"
  kill -"$sig" "$wrapper"
  t=0
  while [ -n "$(alive $wrapper $pids)" ] && [ $t -lt 30 ]; do sleep 1; t=$((t + 1)); done
  if [ -n "$(alive $wrapper $pids)" ]; then
    echo "  still running after 30 s: $(alive $wrapper $pids | xargs ps -o comm= -p | sort | uniq -c | xargs); port=$(up)"
  else
    echo "  all gone ${t} s after; port=$(up)"
  fi
  kill -- -"$vite" 2>/dev/null
  wait "$wrapper" 2>/dev/null
  sleep 1
done
