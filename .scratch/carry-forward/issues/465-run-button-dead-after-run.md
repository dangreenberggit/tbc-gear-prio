Status: closed
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: run/stop button state, status.stale
Resolution: The button was not a broken handler — a repeat click with unchanged
  settings replayed the cached ranking (rankUpgrades returns the stored result on a
  matching input hash), so it looked dead. Fixed as the owner's intended case in
  fork commit 8bc15cad9 (re-pin 09caef2b), with a staleness-wiring correction in
  85f0a545e (re-pin 80fc19f9): the button is renamed "Simulate" and disabled after
  a completed run until a setting or gear change marks it stale; a settingsChangedEmitter
  listener now re-enables it when iterations/candidates/prune change. A stopped or
  error run is never done && !stale, so the button stays live to re-run. Verified
  live: run → button disabled and labelled "Simulate" → change iterations → button
  re-enabled with the stale banner → runs again (live-verify 5d).

# After a run, the "Run" button does nothing; if intentional it should show disabled + say "Simulate"

Owner report, 2026-09-20. After running, the "Run" button no longer works.

## What would close this

- If the button is dead on purpose (settings unchanged since the last run, so
  re-running would give the same result), make that visible: render it
  **disabled**, and change the label from "Run" to "Simulate" (owner's wording).
  It should re-enable when settings change.
- If it's NOT intentional (a real broken handler), fix the handler so Run works
  again after a completed run.
- Decide which case this is first (check the post-run button state / any
  settings-changed gating), then apply the matching fix. Verify live: run, then
  try to run again.
