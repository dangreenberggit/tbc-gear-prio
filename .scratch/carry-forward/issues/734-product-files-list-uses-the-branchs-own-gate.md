Status: open
Type: process
Origin: docs/reviews/chore-733-gate-runs-dev-copy.md (round 1, P2)
Blocks: none
Blocked by: none
Related: 733, 731

# The review skill lists product files with the branch's own copy of the gate

## What happens

The `pre-merge-review` skill, § Agent-tooling branches, tells the
reviewer to run `python scripts/check_merge_ready.py --product-files`
(`.claude/skills/pre-merge-review/SKILL.md:27`). That is the branch's own
copy of the script. A branch that adds paths to `TOOLING_PATHS` in its
copy gets an empty list, so the skill sends it to `instruction-review`
alone.

Since ticket 733, `pnpm merge-to-dev` also runs dev's copy, which still
counts those files as product files. The door then refuses the branch
with `missing review`, after the reviewer has skipped the product review.
The failure is loud, not silent, but the review has to start again.

## What would fix it

Give the reviewer a way to list product files with dev's copy, for
example a `--product-files` mode in `scripts/merge_to_dev.py` that runs
`merge_ready_at` with dev's copy. Hypothesis, untested. The skill text
then names that command. A skill edit needs the owner's approval
(AGENTS.md, "Before you start, by kind of work").

## Done when

- The command the skill names gives the same product files as the door
  for a branch that widens `TOOLING_PATHS` in its own copy.
