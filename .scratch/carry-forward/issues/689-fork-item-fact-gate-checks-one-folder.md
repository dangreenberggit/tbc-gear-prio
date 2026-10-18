Status: open
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
