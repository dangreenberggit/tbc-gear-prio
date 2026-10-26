Status: open
Type: process
Origin: audit `.scratch/agent-reports/2026-10-25-general-task-stage-gate-revision-audit.md` (§ Q3 "What looks plainly wrong in how the loop was run", § Q4; gitignored, owner's checkout) of stage-gate session 895dc2f0, 2026-10-25 19:33-20:33Z
Blocks: none
Blocked by: none
Related: 550 on unmerged branch `feat/subagent-foreground-helpers` (not dev's 550; see "Related unmerged fix")

# Stage-gate revision loops were run wrong in six ways

In session 895dc2f0 the orchestrator ran five stage-gate features at once
(text fixes 625/618, narrow width 607/603, phase 4/5 pass 452, set
bonuses 644/655, meta-gem hit cap 705). The audit found that most
send-backs were justified, but the loop was run wrong in the six ways
below. One of them gave the owner a false status.

**Cost.** The revision loops used about 22.2M of the session's 86.7M Opus
cache reads (26%) and 5.9M of its 11.6M Fable cache reads (51%) — about
half again what first-pass planning and review cost (audit § Q4, lines
322-342). How much of that the six problems below added is
**hypothesis, untested**; the audit does not split it out.

Every fix here edits the stage-gate skill or an agent file. AGENTS.md §
Writing for agents says to propose those edits in chat and wait for the
owner's approval. This ticket proposes no wording.

## Sources

- Audit: `.scratch/agent-reports/2026-10-25-general-task-stage-gate-revision-audit.md`.
  Line numbers below are in that file.
- Main transcript ("M" in the audit):
  `~/.claude/projects/-home-daniel-Code-lulz-tbc-gear-prio/895dc2f0-d99d-4e51-a07f-a2bfd67da2c5.jsonl`,
  with its `subagents/agent-<id>.jsonl` files ("S/").
- Stage folders: `.scratch/stage-gate/{tab-text-625-618-705,narrow-width-607-603,p45-dps-pass-452,set-bonus-644-655,meta-hit-cap-705}/`.

All three are gitignored and exist only in the owner's WSL checkout.

## Findings

### 1. A planner was left stranded, and the owner was told it was working

The narrow-width revision planner (`ad2562f777e12efd3`) spawned its
measurement helper (`437f38`) with `run_in_background: true` at 20:05:52.
It ended its turn at 20:06:26 with "I am waiting for the researcher
before writing the revised plan", and never resumed (`jq -r .timestamp`
over its transcript ends at 20:06:26). The helper's result went to the
main loop at 20:17:53. The main loop made **zero `SendMessage` calls** in
the whole session (`jq` over `tool_use` names in M), so the result never
reached the planner. The main loop then told the owner "The layout
planner has its measurements and is rewriting its plan" (20:18:51). That
was false: no planner was running. The narrow-width stage had no agent
working on it from 20:06 to the end of the session. Cost: 1.25M Fable
plus 3.63M Opus cache reads with no plan produced. The measurement report
is on disk and can be reused. (Audit lines 156-161, 256-269.)

Two other planners in the same situation (tab-text at 19:43:30,
set-bonus at 19:49:05) got their helper's notification in their own
transcripts and resumed (audit lines 260-262). Why this one did not is
not known.

Two rules were broken. AGENTS.md § Models and walls: "Managers must not
background workers and end the turn without a disk handoff". The
stage-gate skill (`.claude/skills/stage-gate/SKILL.md:161-162`) says to
send a planner's answers back with `SendMessage` or a respawn.

### 2. Round-1 fixes were passed to planners as rulings without being checked

At Gate B on the phase 4/5 plan, the orchestrator turned two suggested
fixes into exact orders for the revision planner:

- F1's build route ("bundle steps with `node --import tsx`, touch the
  bundle stamp, then `make`"), taken from an older report. Round 2's R1
  (blocking) found it still fails in a fresh pair: `vite build` touches
  `node_modules`, so `make` reruns `npx protoc` / `npx tsx`.
- F2's wait, "for example with Monitor and an until-loop", from the
  reviewer. Round 2's R2 found that "Monitor returns at once and expires
  after at most 30 minutes", so the executor would have ended its turn
  with batches still running, silently.

Both defects came from the round-1 orders, and they caused the second
p45 loop-back. (Audit lines 184-202, 270-276; F1 ruling in
`S/agent-a65eb3fce44cb3925.jsonl`, first user message.) Tab-text had a
milder case: the revision's own new code and new out-of-scope line
produced round 2's N1 and N2 (audit lines 115-122). The audit's proposed
fix is **hypothesis, untested**: ask the reviewer to mark a suggested fix
"untested", or have the planner check a prescribed route before relying
on it.

### 3. A re-review the skill does not call for (tab-text)

The skill loops back to planner and reviewer only for "a `blocking`
finding, or a refuted load-bearing claim" (`SKILL.md:201`). Material
findings are "fixed in the plan or accepted" (`SKILL.md:215`). Tab-text
round 1 had no blocking finding, but the log records a loop-back on
"four material findings" (`tab-text-625-618-705/decision-log.md:16`) and
runs a full re-review (`decision-log.md:20-21`). That was the largest
reviewer run of the session, at 6.17M cache reads. Round 2, under the
same conditions, skipped the re-review (`decision-log.md:27`). The
handling was not consistent. This re-review did find N2, a contradiction
the player would see. (Audit lines 128-133, 277-284.)

### 4. Minor findings became rework, not advisories

The skill says "`minor` findings ride along to the executor as
advisories" (`SKILL.md:217`; the log's `advisory` word, `SKILL.md:136`).
The logs record them as `rework` instead:
`narrow-width-607-603/decision-log.md:11`,
`p45-dps-pass-452/decision-log.md:14`,
`set-bonus-644-655/decision-log.md:14`,
`tab-text-625-618-705/decision-log.md:12-15`. This made each revision and
each re-review larger. Tab-text F7 has a stated reason (the owner rule
that findings must not vanish); the others give none. Whether this added
rounds is **hypothesis, untested**. (Audit lines 285-291.)

### 5. Round-2 reviews were saved as summaries, not word for word

Skill step 3 says to write the reviewer's final message to
`plan-review.md`. The round-2 sections are 1.7k-3.1k characters, but the
reviewers' messages were 10.2k-13.9k characters (`awk` and `wc -c`
comparison). The second set-bonus revision prompt admits it: "the full
round-2 text with evidence is summarised there"
(`S/agent-aa1536c3724d29151.jsonl`, first user message). The executor
and any later reader lose the evidence. (Audit lines 292-297.)

### 6. A reviewer started a server against its prompt

The phase 4/5 round-1 reviewer's prompt said "Do not start servers or
runs". The reviewer ran a 25-second throwaway HTTP server in a background
call at 19:58:25. That call woke it again after it had returned its
review. The cost was small. (Audit lines 302-304.)

### Not included

The audit's Q3 item 6 (revision planners told to write `plan.md`
themselves) departs from `gate-planner.md`. The audit does not call it a
mistake, because it keeps 30-45k-character plans out of the main loop's
context (audit lines 298-301).

## Related unmerged fix

Branch `feat/subagent-foreground-helpers` (tip `870e88d0`, last commit
2026-10-04) exists only on the `windows` remote, with no local branch in
the WSL clone (`git branch -a --contains 870e88d0` lists only
`remotes/windows/feat/subagent-foreground-helpers`). It is 8 commits on
top of a merge base that dev is now 740 commits past (`git rev-list
--count`). It adds a PreToolUse hook,
`.claude/hooks/subagent-foreground-helpers.py`, that sets
`run_in_background` to false on every `Agent` call made inside a
subagent. It also adds rule lines to five agent files, the stage-gate
skill and `docs/agents/model-policy.md`. Its review
`docs/reviews/feat-subagent-foreground-helpers.md` (on the branch)
records "no blocking finding". The owner deferred the merge (memory note
"Early-handback fix on a branch").

It targets the failure in finding 1: a subagent backgrounds its helpers
and ends its turn. That it would have prevented the stranded
narrow-width planner is **hypothesis, untested**. It does not cover the
other half of finding 1: the orchestrator never forwarded the
notification and gave the owner a false status.

Two traps for whoever merges it:

- The branch files its ticket as
  `550-subagents-hand-back-before-their-background-helpers-report.md`
  (already `Status: closed`). Dev has a different 550,
  `550-fork-gofmt-never-clean-heals-go-does-not-parse.md`. The branch
  also changes `NEXT`. Both conflict with dev; renumber the branch's
  ticket at merge.
- It is 740 commits behind dev and edits files that dev has changed
  since: `SKILL.md`, `gate-planner.md`, `model-policy.md` and `NEXT`
  (`git diff --stat 10c13a77 dev -- <file>`). Expect conflicts there.

## Done when

Each of findings 1-6 has a rule change the owner approved and applied, or
an owner ruling not to change it, recorded here. For finding 1, that
includes a decision on `feat/subagent-foreground-helpers` (merge, redo or
drop).
