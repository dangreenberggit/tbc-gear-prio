Status: open
Type: task
Origin: docs/reviews/feat-tab-follow-ups.md (addendum, finding R2)
Blocks: none
Blocked by: none

# The data-pipeline-work skill cites a line of `check_rep_tables.py` that moved

## What is wrong

`.claude/skills/data-pipeline-work/SKILL.md` lines 27 and 85, and the same
lines of `.agents/skills/data-pipeline-work/SKILL.md`, cite
`check_rep_tables.py:136` as invariant 4 (two faction names collapsing to
one key), "the pattern to copy". Commit `78fea887` added the db.json guard
above it, and the review-fix commit after it removed a dead branch, so the
`# 4. The faction id lookup` comment is no longer at line 136
(`grep -n "# 4\." scripts/check_rep_tables.py`). An agent following the
skill lands inside invariant 3.

## Done means

- Both skill copies name the check by its name, not a line number, for
  example "invariant 4 in `check_rep_tables.py`", so later edits to the
  script cannot break the citation.
- The owner approved the exact edit first: AGENTS.md § Writing for agents
  requires approval before any skill-file edit.
