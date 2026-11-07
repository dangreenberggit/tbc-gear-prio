Status: open
Type: bug
Origin: docs/reviews/feat-452-meta-repair-hit-cap.md (round 1, A4)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 535, 746

# A budget spec ranked without a stats read repairs hit at full weight and says nothing

## What is wrong

When meta repair runs for a spec whose hit policy is a budget (ret,
feral, mage, shadow, warlock) and the sim runner has no `computeStats`,
repair counts hit gems at full value and the ranking carries no note
saying so. A full-weight spec in the same case does get its note.

- Fork `ui/features/upgrades/model/engine/rank.ts`: the budget path runs
  only under `if (hitCapReadable)`, and the full-weight note is pushed
  only in its `else if (capProfile.repair.kind === "fullWeight")`
  branch, so a budget spec with no reader gets neither.
- Main-repo test 535-S7 (`packages/core/test/fork-meta-repair.test.ts`)
  pins this silence for ret.
- Since ticket 535 this held for ret and feral; since ticket 746 it also
  holds for mage, shadow and warlock.

## Who reaches it

The tab's runner always has `computeStats`
(`ui/features/upgrades/model/adapters/worker_pool_sim_runner.ts:221` in
the fork), so the tab does not. The CLI path and tests without a stats
reader do (pre-merge review round 1, A4).

## Done when

A budget spec ranked by a runner without `computeStats` either gets a
note in the ranking's `substitutions` that says hit was counted at full
value, or is shown never to reach meta repair on that runner. A test
pins the chosen result in place of 535-S7's silence.

## Comments
