Status: open
Type: bug
Origin: pre-merge review round 4 adversarial axis (feat/tab-signoff-followups), 2026-09-19
Blocks: none
Blocked by: none
Related: 449 (the modal-scan blind spot; same "ratchet promises more than it enforces" theme), the visual+a11y reviewer infra (test-tab-harness.mjs focusWalk / a11yClassify)

# a11y focus-walk passes green when it measures nothing

The keyboard focus-walk in `test-tab-harness.mjs` (`focusWalk`, ~:1516) presses Tab
once; if `document.activeElement` is still `body` it returns `unmeasured: true`, and
`a11yClassify` only synthesises focus-miss violations `if (walk && !walk.unmeasured)`
(~:1586). So in a headless browser that does not move DOM focus on a synthetic Tab
(the documented C23 case — resolved MEASURED in session 2's env, but not guaranteed
in every environment/CI), a keyboard-unreachable control ships with only a WARN line,
never a FAIL.

This is DISCLOSED (a WARN line + a `focusUnmeasured` banner), so it is honest, not
silent — but the gate advertises a keyboard-operability guarantee it does not enforce
whenever the environment declines to focus. If the focus emulation ever regresses, the
operability check degrades to a no-op without failing.

## What would close this

- Decide the intended contract when the focus-walk cannot measure: either (a) FAIL
  the gate when `unmeasured` (treat "couldn't verify keyboard reachability" as a
  block, the strict reading), or (b) keep it a WARN but make the WARN loud/tracked so
  a regression to always-unmeasured is caught, or (c) document explicitly that the
  focus-walk is best-effort and the operability guarantee is conditional on the env
  moving focus. Pick one and make the code + the ratchet docs say the same thing.
- Verify by forcing `unmeasured` (e.g. a browser/flag where synthetic Tab doesn't
  focus) and confirming the gate behaves as the chosen contract says.

## Where

`vendor/tbc-new-fork/test-tab-harness.mjs` (`focusWalk`, `a11yClassify`);
the ratchet contract in `scripts/check_layout_gate.py` / the proposal §1a.
