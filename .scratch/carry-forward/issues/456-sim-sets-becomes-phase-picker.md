Status: open
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 455 (prune label), 448 (Other-phases disclosure), 457 (sources button), 424/433 (Sim-sets + default selection)

# Sim-sets: drop the "always include" behavior, make it a "select phase" picker

Owner report, 2026-09-20. The Sim-sets caption
("Items in these sets are always included in the sim, even if the filters above
would exclude them.") describes behavior the owner does not want. The
always-include-over-filters mechanic is unnecessary.

## What would close this

- Replace the current Sim-sets control with a simpler "select phase" option.
  Selecting a phase automatically selects that phase's associated BiS sets for
  the sim. No separate "always included even if filtered out" concept.
- Remove the caption `upgrades_tab.settings.sets_caption` (and any now-dead
  always-include wiring in `effectivePool` / the set-union path).
- Couples to 455 (the prune toggle becomes "Sim only selected set items") and
  455/457's rewordings. Land as one behavior change.
- This reshapes ticket 424's union mechanic and touches 433's default selection;
  re-check both. Verify live on the Go backend.

## Notes

Behavior change, not just copy — the owner is removing a feature (filter
override) and replacing the set-selection UX with a phase picker. Worth a small
design note before implementing so the pool-composition change is deliberate.
