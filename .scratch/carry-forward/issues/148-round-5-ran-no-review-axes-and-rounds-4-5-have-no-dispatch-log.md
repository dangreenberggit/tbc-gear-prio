Status: closed
Closed: d8b0698
Type: task
Origin: docs/reviews/feat-set-bonus-value.md round 5 (process P5)
Blocks: none
Blocked by: none

# Round 5 ran no review axes; rounds 4-5 have no dispatch log

Process drift found while auditing the branch. Each item is separately
actionable.

**Round 5 ran no review axes at all.** 19 commits of behavioural change
(ticket 107/135/136 work, per-spec meta selection, the `--spec` collapse)
shipped with only a self-authored execution log. No opt-in was recorded and no
label appears in the review file, both of which `pre-merge-review/SKILL.md`
requires. This is what let ticket 139 reach the branch tip.

**No dispatch log covers rounds 4-5.** `agent-usage-log.md` stops at
2026-08-11; both rounds are 2026-08-12. Their model-lane claims are
self-reported and unbacked. The review lane is exactly where an unbacked claim
matters, because the point of the lane is independence.

**Round 2's "domain axis died mid-stream on an API error and was re-run from
scratch"** has no corroborating evidence anywhere in `.scratch/` or `docs/`.
Plausible, and probably true — but it is a durable causal claim in a committed
artifact with nothing a reader can re-run, which is the rule AGENTS.md states.

**The issue-1 fan-out has no written pre-spawn disjointness check.** AGENTS.md
calls this "a claim to verify, not eyeball". `fan-in-brief.md` has a good
`pathsAllowed`/`pathsForbidden` partition, but nothing records that file lists
were cross-checked before spawning. The slices were in fact disjoint (overlap
computed from the three branches: none), but **two slices exceeded their
declared paths** — slice C created `compose_feral_raid_sim.py` and two fixture
files no slice owned; slice B created three undeclared scripts. Disjointness
held by the partition's shape, not by the mandated check.

**Five implementation workers ran on Fable via `inherit`** (`fix-round/
DIRECTOR.md`, 171k-239k tokens each) — the top price tier on workhorse jobs,
against `docs/agents/model-policy.md`. This is the policy's own named
cautionary case ("an unnamed subagent inherits it") actually occurring.

Not a violation, recorded so it is not re-flagged: the round-4 **Fable
delegator** is sanctioned. The policy scopes the prohibition to review *axes*,
and those ran Opus; aggregating and applying fixes is the judgment/fan-in seat.

## Fix

Backfill the rounds 4-5 dispatch entries if the data still exists, or mark them
unrecorded. Add the disjointness check as an explicit written step in
`parallel-phase`, and make worker model an explicit spawn argument rather than
`inherit` (partly done at `d8b0698`/`ff5ca69` — verify it covers the fix-round
path).

## Disposition (2026-08-13)

Observation 4 (five implementation workers on the top tier by inheritance) is
**verified fixed** by `d8b0698` / `ff5ca69`. Checked that the fix covers the
inheritance path the workers actually took, not merely the prohibition list:

- `docs/agents/model-policy.md` "Lane is per job, not per parent" names the
  `model: inherit` default as the mechanism and cites the 2026-08-11 incident.
- `.agents/skills/parallel-phase/SKILL.md` step 3's "Done when" carries the
  checkable bound -- every worker prompt names its model and effort -- which is
  what would have caught it. Mirrored to `.claude/skills/`.

    grep -n "Lane is per job" -A 12 docs/agents/model-policy.md
    grep -n "names its model and effort" .agents/skills/parallel-phase/SKILL.md

The other four observations are records of what happened in rounds 2, 4 and 5
(no review axes on round 5, no dispatch log for rounds 4-5, round 2's
unbacked re-run claim, the unwritten disjointness check). They are historical
facts about completed rounds -- nothing further is actionable on them, which is
why this ticket closes. The forward-looking rule they argue for is ticket 145's
chaining-rule change, which remains open pending owner approval of a skill
edit.
