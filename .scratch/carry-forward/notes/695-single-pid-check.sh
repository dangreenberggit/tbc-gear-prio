#!/bin/bash
# Ticket 695: send one signal to the pid of `node scripts/dev-tab.mjs frontend`
# alone (how the .claude/launch.json entries start it, with no pnpm) and check
# whether vite and its `tsc --watch` stop.
# Run from the checkout root: bash .scratch/carry-forward/notes/695-single-pid-check.sh 5193
# The SIGKILL round leaves vite and tsc running; the script stops them itself.
port=${1:?usage: $0 <free port>}
up() { ss -ltnH "sport = :$port" | grep -q . && echo up || echo down; }
running() { ps -eo comm=,args= | awk '$1=="node"||$1=="tsc"' | grep -E 'vite.js serve|tsc --noEmit|dev-tab.mjs frontend' | awk '{print $1}' | sort | uniq -c | tr -s ' \n' ' '; }
for sig in TERM HUP INT KILL; do
  node scripts/dev-tab.mjs frontend --frontend-port "$port" >/dev/null 2>&1 &
  p=$!
  for _ in $(seq 60); do [ "$(up)" = up ] && break; sleep 1; done
  sleep 2
  echo "SIG$sig: before: port=$(up) running:$(running)"
  kill -"$sig" "$p"
  sleep 4
  echo "  4 s after: port=$(up) running:$(running)"
  pkill -f 'vite.js serve'; pkill -f 'tsc --noEmit'
  wait "$p" 2>/dev/null
  sleep 1
done
