Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 4 (Tab-adjacent)
Type: task
Origin: docs/reviews/docs-stage-3t-boxes.md (findings B2, K1)
Blocks: none
Blocked by: none
Related: 369, 568

# `docs/fork-upstream-touchpoints.md` names a fork commit and upstream base that the locks no longer pin

## What is wrong

`docs/fork-upstream-touchpoints.md` § How to reproduce every number here
says the fork commit is `316326a95`, "the commit
`data/wowsims-fork.lock.json` pins", on upstream base `5262ff38`, "the
upstream commit `data/wowsims.lock.json` pins". On `docs/stage-3t-boxes`
the fork lock pins `bc96d0a03` with `branchedFrom`
`e804c29e8d615fcc6dcc632a1b0c782605e27d46` (upstream v0.0.150), and the
engine lock pins the same upstream commit. The fork sha was already behind
on `dev` before that branch (`dev` pinned fork `8cd8d1c80`); the doc was
last refreshed at `243329e7`.

The pre-merge-review skill (`.claude/skills/pre-merge-review/SKILL.md`,
"Focused check (round 2)", condition 3) runs this doc's commands at a new
fork tip. With the old base the command over-counts: from the main repo
root, `git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 5262ff38 bc96d0a03 | wc -l`
prints 9 (upstream's 8 changed files read as fork edits), while the same
command with base `e804c29e8` prints 1 (`ui/app/SimTabsSection.tsx`, 6/0)
(measured by the `docs/stage-3t-boxes` review, 2026-10-16).

No doc or procedure says to refresh this doc when a pin moves
(`git grep -n fork-upstream-touchpoints -- docs/agents .claude/skills` names
only the pre-merge-review skill).

## Done means

- The doc's commit and base lines name the fork lock's `commit` and
  `branchedFrom` on the branch that fixes it, and the "How the count moved"
  table has a row for each pin since `316326a95` (at least `8cd8d1c80` and
  `bc96d0a03`, base `e804c29e8`) with the `--name-only --diff-filter=M`
  count for it.
- `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M <branchedFrom> <commit>`
  prints only `6 0 ui/app/SimTabsSection.tsx`.
- Optional, the fixer's call: one line in `docs/agents/upstream-catch-up.md`
  § 5 saying to refresh this doc with each re-pin.
