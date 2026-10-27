Status: closed
Type: process
Origin: wording review `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-wording-review.md` § "Faults in unchanged text that no draft touches" (gitignored, owner's checkout), via the v2 drafts `.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-drafts-v2.md` § "Faults in unchanged text"
Blocks: none
Blocked by: none
Related: 712

# A stage-gate revision prompt does not name the chunk it revises

Line numbers are on branch `feat/stage-gate-open-faults` after commit
`6eb1037d`. `.claude/skills/stage-gate/SKILL.md` and
`.agents/skills/stage-gate/SKILL.md` are identical
(`python3 scripts/check_skill_mirrors.py` rc 0), so each line number
holds for both copies.

`SKILL.md:319-320` (**Loop back**: "respawn `gate-planner` with brief +
plan + review for a revision") and `SKILL.md:330` (the
`material`-findings bullet: "spawns one `gate-planner` revision with
brief + plan + review") list what a revision prompt holds, and the chunk
id is not in either list. After `K1` has run, `plan.md` holds the steps
of several chunks, so a revision planner must work out which chunk it
revises from the review. Rules that depend on that chunk ("keep the
steps of every chunk", `.claude/agents/gate-planner.md:32-33`) then
rest on a guess (hypothesis, untested that
a planner guesses wrong).

Fix: add the chunk id to both lists.

Every fix here edits the stage-gate skill. AGENTS.md says to propose
skill edits in chat and wait for the owner's approval.

### 2026-10-27: owner approved the fix; closed

On 2026-10-27 the owner approved Text D. In both
`.claude/skills/stage-gate/SKILL.md` and
`.agents/skills/stage-gate/SKILL.md`, at both revision lists (in
**Loop back**, and in the `material`-findings rule), "brief + plan +
review" now reads: "brief + plan + review + the id of each chunk that
the latest review covers (the last field of that `gate-reviewer`'s
`spawn` line)". The re-split revision rule is unchanged.

A dummy stage-gate run on 2026-10-27
(`.scratch/stage-gate/test-revision-chunk-id/`, gitignored, owner's
checkout) gave a revision planner only "Chunks the latest review covers:
K2". It revised K2 and left K1 byte-identical: `cmp` against
`plan-before-K2-revision.md` (`decision-log.md:26` and `:28` of that
run). This is a weak test, because the planted finding also named
step 3, so the planner could find the chunk without the id.

Verified by: on branch `feat/stage-gate-follow-ups`, all three commands
below give rc 0. The first prints `skill mirrors match (.claude/skills <->
.agents/skills)`.

```
python3 scripts/check_skill_mirrors.py
git grep -n -F 'covers (the last field of' -- .claude/skills/stage-gate/SKILL.md .agents/skills/stage-gate/SKILL.md
git grep -n -F 'review + the id of each chunk that the latest review covers (the' -- .claude/skills/stage-gate/SKILL.md .agents/skills/stage-gate/SKILL.md
```

Output of the two `git grep` commands:

```
.agents/skills/stage-gate/SKILL.md:352:     id of each chunk that the latest review covers (the last field of
.claude/skills/stage-gate/SKILL.md:352:     id of each chunk that the latest review covers (the last field of
.agents/skills/stage-gate/SKILL.md:340:     review + the id of each chunk that the latest review covers (the
.claude/skills/stage-gate/SKILL.md:340:     review + the id of each chunk that the latest review covers (the
```
