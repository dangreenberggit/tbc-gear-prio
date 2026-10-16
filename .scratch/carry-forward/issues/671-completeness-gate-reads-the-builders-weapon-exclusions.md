Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, follow-on of 610 (scope bucket for the orchestrator to set)
Type: bug
Origin: pre-merge review of feat/tab-item-lists (docs/reviews/feat-tab-item-lists.md, finding P2), 2026-10-16
Blocks: none
Blocked by: none
Related: 610

# The completeness gate reads the weapon exclusions the builder writes

`scripts/check_pool_completeness.py` says independence from the builder is
its point: it "imports nothing from the builder nor reads its
`*.report.json`, so a rule the builder drops or bends shows up here as a
failure instead of passing by construction" (docstring, lines 10-15). But
it reads `data/weapon-type-exclusions.json` (`:199-203`), and
`scripts/assemble_universe.py` rewrites that file from its own
`SPEC_PROFILES` on every run (`:11-13`, `EXCLUSIONS_MANIFEST` at `:720`).

So when the builder's weapon-type rule for a spec changes, the gate's rule
changes with it in the same regen, and the gate cannot catch the change.
Today the two agree (the review's adversarial axis rebuilt all 44 lists
byte-identical at 3b9bb690); no list is wrong because of this. Plan C26 of
stage tab-blocking-finish listed the file as a gate input, so the gap came
from the plan.

The gate already restates four builder-only rules as its own constants
(docstring, "Four rules exist only as builder code"). One fix is to restate
the per-spec weapon-type exclusions the same way, so a drift between the
two fails the gate.

Done when: the gate gets its weapon-type exclusions from somewhere other
than the builder's output; changing one spec's exclusion in
`SPEC_PROFILES` and regenerating makes `pnpm pool-listings:check` fail
(a red run recorded in the closing note); `pnpm verify` rc 0.

## Comments
