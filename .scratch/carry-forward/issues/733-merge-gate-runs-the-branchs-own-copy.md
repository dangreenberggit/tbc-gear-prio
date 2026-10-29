Status: open
Type: process
Origin: docs/reviews/chore-731-tooling-review-exemption.md (round 1, A3)
Blocks: none
Blocked by: none
Related: 731

# The merge gate judges a branch with the branch's own copy of its code

## What happens

`pnpm merge-to-dev` loads and runs the branch's own
`scripts/check_merge_ready.py` (`scripts/merge_to_dev.py:73` and
`:375`, as the round 1 adversarial axis reports). A branch can edit that
copy and pass its own gate.

The adversarial axis built this case in a throwaway repo: a branch added
`packages/` to `TOOLING_PATHS`, removed the gate file from `GATE_PATHS`,
and edited `packages/x.ts`. The branch's copy printed
`review not required`, rc=0. Dev's copy of the script listed
`packages/x.ts` and `scripts/check_merge_ready.py` as product files for
the same branch.

This gap is older than branch `chore/731-tooling-review-exemption`: any
branch could already edit the gate to drop the review requirement. The
ticket 731 proposal records it under "Limits of the prototype"
(`.scratch/agent-reports/2026-10-28-general-task-731-exemption-proposal.md`
in the main checkout). Ticket 731 makes the gap matter more, because a
branch that the gate counts as tooling now merges with no review file.

## What would fix it

In named mode, have `scripts/merge_to_dev.py` work out the branch's
product files with `dev`'s copy of the module, before it runs the
branch's gates. Hypothesis, untested: loading the module from
`git show dev:scripts/check_merge_ready.py` is enough.

## Done when

- A branch that edits `TOOLING_PATHS` or `GATE_PATHS` and a product file
  is refused when it has no review file.
- A test in `scripts/check_merge_to_dev.py` or the
  `check_merge_ready.py` self-test shows it.
