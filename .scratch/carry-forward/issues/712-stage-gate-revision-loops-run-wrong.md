Status: closed
Type: process
Origin: audit `.scratch/agent-reports/2026-10-25-general-task-stage-gate-revision-audit.md` (§ Q3 "What looks plainly wrong in how the loop was run", § Q4; gitignored, owner's checkout) of stage-gate session 895dc2f0, 2026-10-25 19:33-20:33Z
Blocks: none
Blocked by: none
Related: 720 (ticket 550 on unmerged branch `feat/subagent-foreground-helpers`; see "Related unmerged fix")

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

## Comments

### 2026-10-26: owner rulings and the fix

The owner approved the drafted change on 2026-10-26 with these words:
"712 "go"". On the third review after a second loop-back, the owner chose
option D2 with these words: "712 third review d2: i want reviews to cover
what they should cover, not expand to everything over and over for all
eternity".

Drafts: `.scratch/agent-reports/2026-10-26-general-task-712-stage-gate-loop-fix-r3.md`
and the wording check
`.scratch/agent-reports/2026-10-26-general-task-712-wording-check-r3.md`
(both gitignored, owner's checkout). The fix is on branch
`feat/712-stage-gate-loops`. The SKILL.md changes are mirrored in
`.agents/skills/stage-gate/SKILL.md`.

What each finding's fix is:

1. **Stranded planner, false status.** A new PreToolUse hook,
   `.claude/hooks/subagent-foreground-helpers.py` (with its test, its
   `.claude/settings.json` entry and `pnpm foreground-hook:check` in
   `verify:steps`), sets `run_in_background` to false on every Agent call
   made inside a subagent. `gate-planner.md` tells the planner to run its
   researchers in the foreground. In `SKILL.md`, the `spawn` log line
   records `started`, `resumed` or `returned (<status>)`; an agent is
   working only while its last line is `started` or `resumed`, and
   conduct point 3 ties what the session tells the user to that. Step 1
   defines an agent's final message. Step 2 adds one `SendMessage` to a
   planner whose final message is not one its instructions ask for, then
   a stop for the user. Recovery covers a planner with no final message.
2. **Unchecked fixes passed as rulings.** Each revision prompt states the
   result `plan.md` must reach for each `blocking` and `material` finding,
   and marks any repeated method or command from a reviewer or researcher
   `hypothesis, untested`. `gate-planner.md` makes such a method a claim
   with its own `Verified by`, and adds `- added:` lines for new claims or
   steps no finding asked for.
3. **Re-review not called for.** Gate B now has a path for `material`
   findings without a `blocking` one: one revision and Gate A, not a
   loop-back, with a re-review only when the revision has `- added:`
   lines. After a second loop-back, one more re-review runs (D2); a
   `blocking` finding there stops the stage for the owner. No stage runs
   a review round above 3. Step 3 and `gate-reviewer.md` scope every
   re-review to the claims and steps the latest revision changed or
   added and the findings of the earlier rounds, and say it does not
   review the rest of the plan.
4. **Minor findings became rework.** Each `minor` finding is logged
   `advisory` and is left out of revision prompts. The executor applies
   it (an `adapt` ledger row) or leaves it with an `advisory` row and a
   reason. An `advisory` row waits for the final Gate C.
5. **Summarised reviews.** The reviewer writes its own review into
   `plan-review.md` under `# Round <n>`; the session writes nothing to
   that file and checks that the section is there.
6. **Reviewer started a server.** `gate-reviewer.md` § Fan-out: run every
   command in the foreground, start no process that keeps running, and
   run subagents in the foreground.

Branch `feat/subagent-foreground-helpers`: only its hook, the hook's
test, the settings entry and the `foreground-hook:check` script were
ported, with a new hook docstring. Its ticket 550, its `NEXT` change,
its review file and its text edits were not taken.

Open items (not fixed by this change):

- A notification that says the agent "is waiting on its own background
  work" makes the session log it and act on nothing else in it. No rule
  moves the stage on when the harness never resumes that agent; the
  session only tells the user the agent "has stopped and may resume on
  its own". With the hook, a subagent's Agent helpers run in the
  foreground, so this case should need a background Bash call
  (hypothesis, untested).
- `- added:` lines in a revision that no re-review follows (the revision
  after a re-review that found `material` findings only) go to the
  executor unreviewed, and no rule shows them to the owner.
- `- added:` lines list only new claims and steps. A claim the planner
  changed without a finding asking for it is not listed, so a re-review
  prompt may not name it (hypothesis, untested).
- `gate-executor.md:43` applies only to a `minor` finding "whose `Where`
  names a step" of the executor's chunk. No rule says what an executor
  does with a `minor` finding whose `Where` names no step (for example
  the whole plan), so no executor applies it or writes its `advisory`
  ledger row. Source: the patch-build report,
  `.scratch/agent-reports/2026-10-26-general-task-712-patch-build.md:60`.
- Branch `feat/subagent-foreground-helpers` (on the `windows` remote
  only): this change redid its fix. The hook, its test, the settings
  entry and the check script were ported; the rest was not taken.
  Whether to delete the remote branch is not decided.

### 2026-10-26: review rounds count per chunk

Question: this change caps plan reviews at round 3 per stage (SKILL.md
step 4, the bullet "Round 3 is the last review"). Branch
`feat/usage-limit-fixes` adds a re-review for each later execution chunk
(its SKILL.md step 5), so a plan with three or more chunks reaches the
cap. Option 1 was: count rounds per chunk, so each chunk gets one review
plus up to two re-reviews after revisions. The owner answered "Option 1
sounds fine" (relayed by the session on 2026-10-26).

When `feat/usage-limit-fixes` merges into `dev`, its SKILL.md step 5 and
Orchestrator conduct point 6 ("Pace the pipeline", which says review
rounds stay capped by step 4) must be rewritten to this rule. This
branch's SKILL.md step 3 round numbering ("1 for the stage's first
review, then 1 higher for each later review") and the step 4 bullet
"Round 3 is the last review" must be rewritten too, keeping each
`# Round <n>` heading and `R<n>-<id>` id unique within `plan-review.md`.

### 2026-10-27: owner rulings on two open items and the old branch

The owner's rulings, relayed by the session on 2026-10-27, on the
options in
`.scratch/agent-reports/2026-10-27-general-task-stage-gate-fault-drafts-v2.md`
(gitignored, owner's checkout). Applied on branch
`feat/stage-gate-open-faults`, not yet merged into `dev`:

- No rule moves the stage on when a waiting agent is never resumed
  (fault 4 in the drafts). Option B, a 30-minute background timer and
  then one `SendMessage`. Owner: "B sounds ok". Applied as drafted
  (edits 4B-a, 4B-b, 4B-c) in `2517440b`.
- `- added:` lines in a chunk's last revision reach the executor
  unreviewed (fault 5). Option B, one narrow `gate-reviewer` pass on
  those lines only. Owner: "sure". `6eb1037d` adds the bullet
  **Added-lines check** to `SKILL.md` step 4 and names it as the one
  exception in **Review limit per chunk**.
- Branch `feat/subagent-foreground-helpers` on the `windows` remote
  (tip `870e88d0`). Owner: "ok" to copying its ticket and review file
  onto this branch and then deleting the remote branch. `2dfe8d21`
  copies the ticket as 720 (dev already has a 550) and
  `docs/reviews/feat-subagent-foreground-helpers.md`. The delete,
  `git push windows --delete feat/subagent-foreground-helpers`, was
  refused for the agent by the `agent-guard` hook ("git push to windows
  (windows) is not a dangreenberggit GitHub repo. The owner can run it
  in their own terminal."), so the owner runs it. Check:
  `git ls-remote windows feat/subagent-foreground-helpers` prints
  nothing once it is gone.

A later review of the fault 4 and 5 commits
(`.scratch/agent-reports/2026-10-27-general-task-fault-4-5-applied-review.md`,
gitignored, owner's checkout) led to `f3f47db2` and `3883082e`. On
2026-10-27 the owner approved faults 6 and 7 with the words "plain fixes
approved": `86fd3681` adds `- changed:` lines (fault 6) and `98356b7f`
covers a `minor` finding whose `Where` names no step (fault 7). The same
review found two faults in unchanged text, filed as 721 and 722. With
fault 6 applied, a chunk's last revision could still pass `- changed:`
lines to the executor unreviewed. Asked whether the same single check
should also cover unasked changes, the owner answered "sure"
(2026-10-27): `c8737b8a` makes it run on `- added:` or `- changed:`
lines and renames it **Unasked-changes check** (spawn-line marker
`unasked-changes`).

### 2026-10-27: closed

Done when is met. Findings 1-6 have the fix the owner approved on
2026-10-26, merged into `dev` in `b5022cb8`. The decision on
`feat/subagent-foreground-helpers` is made: copy its ticket and review
file, then delete the remote branch. The four open items the 2026-10-26
fix left are applied on `feat/stage-gate-open-faults`, which is not yet
merged into `dev`. The remote delete is not done: the owner runs it.

Verified by: `tbc-gear-prio@b5022cb8` (findings 1-6);
`tbc-gear-prio@3c9d7ee2` (the four open items, on
`feat/stage-gate-open-faults`, after the later changes in the comment
below); `python3 scripts/check_skill_mirrors.py` (rc 0 at `3c9d7ee2`).

### 2026-10-27: owner approval of the later wording

The session reports (2026-10-27) that the owner approved each change on
this branch by choosing an option, and asked for a fresh review of each
applied change. The later fix commits apply what those reviews found:

- `f3f47db2` and `3883082e` fix findings F4-1, F4-2 and F5-1 of
  `.scratch/agent-reports/2026-10-27-general-task-fault-4-5-applied-review.md`.
- `1808a79c`, `d22fe9fd` and `2b9ed795` fix findings B1, M1-M4 and M5 of
  `.scratch/agent-reports/2026-10-27-general-task-fault-3-applied-review.md`.
- `90b61b8e` adds the Backburner check to the reviewer. The draft the
  owner accepted,
  `.scratch/agent-reports/2026-10-27-general-task-chunk-size-planner-led-draft.md`,
  left the choice open: delete the template sentence or add the check
  to the reviewer.

The pre-merge review `docs/reviews/feat-stage-gate-open-faults.md`
(round 1) found more gaps. The owner approved all its fixes on
2026-10-27 (relayed by the session: "have a subagent do all of the fixes
now"). They are `12ca28fb` through `3c9d7ee2`; the review's Disposition
table names the commit for each finding. The report files above are
gitignored, in the owner's checkout.
