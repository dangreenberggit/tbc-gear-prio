Status: open
Type: bug
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: run/stop button state, status.stale

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
