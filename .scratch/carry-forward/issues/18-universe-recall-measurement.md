Status: open
Type: task
Origin: `.scratch/handoffs/raid-scoped-pool-implementation-review.md` “Not yet done”
Blocks: none
Blocked by: none

# Recall measurement on the raid-scoped universe (junk-filter gate)

## Problem

Sub-phase 4’s purpose was to measure recall / false negatives on the
**assembled** universe before applying narrowing rules. Existing recall
figures still come from the old ~191-item EP+wowsims set and cannot show
what raid-scoped membership omitted.

The junk filter is correctly **not applied** (S7) — reports show ~30.8%
caster-only rejection at maxPhase 2 on the zone-scoped universe vs ~12% on
the full eligible set (different populations). Neither rate has been checked
against **simulated** results on the 224 / 347 universes.

Universes are now small enough that a full (or stratified) sim pass is
affordable.

## Done when

- A documented measurement run: for maxPhase 2 and/or 3, sim the universe
  membership (or a justified sample) and report:
  - how many “would-be junk rejects” would have been above-cutoff upgrades
    (false negatives if the filter were applied);
  - how that compares to the report’s `junkFilter` counts.
- Explicit go/no-go on applying the junk filter (or a tightened variant).
- Commands and artifact paths under `.scratch/` so the run is reproducible.

## Notes

- Do not apply the junk filter in `assemble_universe.py` until this passes.
- Prefer slamaltman (or another fixed offline character) for comparability
  with existing rank reports.
