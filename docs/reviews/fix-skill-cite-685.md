# Pre-merge review — fix/skill-cite-685

Reviewed range: `953963251939b1cad57d6403de9af6cbe63f1834..58f2ce93496588c30739f5d93340ade1f8639c14`

## Dispatch

Small-change lane (round 1). `git diff --shortstat dev...HEAD` printed
`3 files changed, 23 insertions(+), 5 deletions(-)`, and
`git diff --name-only dev...HEAD` printed:

```
.agents/skills/data-pipeline-work/SKILL.md
.claude/skills/data-pipeline-work/SKILL.md
.scratch/carry-forward/issues/685-data-pipeline-skill-cites-a-moved-line.md
```

No path starts with `data/`, `vendor/` or `packages/core/src/`, and none has
`.generated.` in its name. `codex` is not on `PATH`, so one fresh
`general-task` agent on Opus (review lane) ran the adversarial brief plus the
`code-review` skill's Standards and Spec checks, with no subagents. The domain
brief was not given: the diff changes how a skill points at a check in
`scripts/check_rep_tables.py` and states no TBC, WCL or wowsims fact.

## Adversarial

**Adversarial: clean.** Each skill copy changes exactly lines 27 and 85
(`git diff --numstat 95396325..58f2ce93`: 2/2 per SKILL.md). The two copies
are still byte-identical (`cmp`), and all three files stay LF
(`git ls-files --eol`). No other agent doc cites a `check_rep_tables.py`
line number (`grep -rn check_rep_tables .claude .agents docs/agents AGENTS.md CONTEXT.md`).

## Domain

Not run: the diff states no game-domain fact (see Dispatch).

## Standards + Spec

**Standards: clean.** The subject "Cite the rep-tables check by name, not
line" is 43 characters, imperative, with no body. The ticket close follows
`docs/agents/issue-tracker.md` § Closing a ticket, and its three
`Verified by:` commands print what the closing note says when run from the
worktree root.

**Spec: clean.** Both copies say "invariant 4 in `check_rep_tables.py`",
the wording the owner approved and the ticket's "Done means". The reviewer
noted that the script's module docstring lists only three numbered items,
so "invariant 4" can mean only the `# 4.` check in `main()` at
`scripts/check_rep_tables.py:138`; the comment itself does not use the word
"invariant". This is an observation on the approved wording, not a defect
of this diff.

## Summary

Round 1 (small-change lane) found nothing. Round 2 is skipped: the only
commit after round 1's `<through-sha>` changes only this review file
(`git log --oneline 58f2ce93..HEAD` lists the commit that adds it). This
branch filed 0 tickets and closed 1 (685).

## Disposition

| ID  | Axis | Disposition | Ticket / note |
| --- | ---- | ----------- | ------------- |
