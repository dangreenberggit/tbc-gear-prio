Status: closed
Type: task
Origin: pre-merge review feat/tab-wowsims-items, P3
Blocks: none
Blocked by: none
Serves: .scratch/plans/upgrades-tab-finish-line.md, Tab-adjacent follow-on
Related: 505

# The fork's "no other item fact" gate checks only JSON in one folder

The stage brief (`.scratch/stage-gate/tab-wowsims-items/brief.md:62` in the
main folder, gitignored) asked that "a gate fails if any other non-wowsims
item fact reaches the fork". `scripts/sync_fork_universes.py` `unlisted_json`
fails only on unlisted `*.json` under `ui/features/upgrades/model/data/`. An
item list in a `.ts` file, or in JSON elsewhere in the tab, passes. The plan
(plan.md:9) narrowed the gate to this, and the plan review did not object.

## Done means

Either the gate covers every JSON file the tab bundles (test fixtures listed by
name), with a stated reason why item lists in code cannot be detected without
a name or id heuristic, or the owner accepts the narrow gate and ADR-0038 says
so.

## Closing note

Recorded, not widened (session ruling 2026-10-18, decision log row P3).
ADR-0038 § Consequences, "The gate on the fork's data folder", now states that
`scripts/sync_fork_universes.py` checks `ui/features/upgrades/model/data/*.json`
only, why the plan narrowed it there, and why an item list in code is not
detected: nothing tells it from other numbers without a name or id-shape
heuristic.

Verified by: `grep -n "(ticket 689)" docs/adr/0038-fork-pool-comes-from-wowsims-at-run-time.md`
(the gate bullet) and `pnpm fork-universes:check`.
