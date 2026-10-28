Status: open
Type: process
Origin: owner decision in session, 2026-10-28, on ticket 727
Blocks: none
Blocked by: none
Related: 712, 723, 726, 727, 728

# Simplify the gate-planner's rules

Not started. The owner decides the scope and the timing. Do this before
ticket 726 (move the general stage-gate core to a plugin repo), so the
plugin does not start from rules that are about to change.

## The problem

The planner seat gets more rules than it needs, spread over four files
that point at each other and override each other "where they differ".
Most of the recent rules were written and then fixed through wording
reviews, not through test runs. On several branches, the fixes from one
review round caused the breaks that the next round found. Ticket 727
ended that way: its long "Few tool rounds" rule was replaced by one
sentence on 2026-10-28, after two review rounds kept finding new breaks
(`docs/reviews/feat-planner-tool-rounds-727.md` § Round 3).

## Evidence

Both reports are in the main checkout and gitignored:

- `.scratch/agent-reports/2026-10-28-general-task-planning-guidance-and-overengineering.md`
  (called "the overengineering report" below)
- `.scratch/agent-reports/2026-10-28-general-task-planner-vs-sources.md`
  (called "the sources report" below)

Numbers from the overengineering report, § Part 2, measured at
`686d4a36`, before the 727 reset:

- Per spawn, the planner reads `gate-planner.md`, `plan-template.md`,
  `docs/agents/stage-gate-project.md` and, in split modes,
  `.claude/skills/stage-gate/parts.md`: 27,882 bytes, 584 lines, about
  206 sentences and 46 § cross-references in total. The brief and the
  always-loaded `AGENTS.md` and memory files come on top of that.
- About 60 of the 187 lines in `stage-gate-project.md` apply to the
  planner (the report author's reading).
- Fixes that caused new problems: 712 (round 1 "found six rule
  problems, each introduced by this branch except P4",
  `docs/reviews/feat-712-stage-gate-loops.md:137`); open-faults (R2-1
  and R2-2, each a gap that came with a round-1 fix,
  `docs/reviews/feat-stage-gate-open-faults.md:291-330`); 727 (round 1
  found R1 to R3 in the new rule, round 2 found S1 and S2, "This branch
  introduced both, through the round limit").
- Split runs (`parts.md` modes) were used in 6 of 119 stage folders
  under `.scratch/stage-gate/`, the last on 2026-10-25.
- The Backburner section and `next:` mode have run only in the test
  stage `test-revision-chunk-id`. Only one `plan.md` has been written
  since 2026-10-26, and it is that test. So most rules added since
  2026-10-26 have run in at most one test stage.

## What the overengineering report says to keep and to drop

Keep:

- The planner on a strong model, read-only, writing for an executor
  with fresh context.
- The template core: Goal, Approach with the rejected alternative,
  Claims register with `Load-bearing` and `Verified by`, Steps with
  acceptance criteria and claim ids, Paths manifest, Verify recipe, Out
  of scope.
- Research through helpers, stated once: the objective, the files, the
  exact return form, the workhorse type and the private-data exception.
- Revisions: address or rebut each listed finding; the revised plan
  replaces the old one in full.
- A short `## Decisions` section, with the `added:` and `changed:`
  lines that the session's re-review rule reads.

Drop or move:

- The `run_in_background` paragraph: the PreToolUse hook
  `.claude/hooks/subagent-foreground-helpers.py` already sets it.
- The `WRONG_MODEL` first-action check (9 lines): move it to a
  session-side check or a hook on the spawn's model (option, untested).
- `parts.md` split, part, reconcile and re-split modes: replace with
  one paragraph. When the brief is too big or too mixed for one plan,
  return a proposed split and stop; the session opens one stage per
  piece.
- Backburner and `next:` mode: plan `K1` fully and list later chunks as
  one line each. After `K1` runs, a normal planner run on the brief and
  the execution report plans the next chunk.
- `stage-gate-project.md`: give the planner only its own lines, and
  write each shared sentence once.
- No "where they differ" overrides: put each mode's rules in one place.
- Process: judge a rule change by a real or test stage-gate run, not by
  another wording review; cap wording reviews at one round.

## Agent-file settings the planner does not use

From the sources report, § Q3. No file in `.claude/agents/` sets any of
these (`grep -l -E '^(maxTurns|tools|disallowedTools|omitClaudeMd):'
.claude/agents/*.md` printed nothing, per that report):

- `experimental.cacheTtl: 1h`: subagents get a five-minute prompt cache
  unless this is set. A planner that waits more than five minutes on a
  helper then pays for an uncached read of its whole context. Not
  applied while the subscription draws on usage credits.
- `disallowedTools: mcp__*`: the planner otherwise inherits every MCP
  server's tool names and instructions. Their size in the planner's
  context is hypothesis, untested.
- `maxTurns`: a turn cap well above the normal count, as a backstop
  against a runaway planner. Whether the session's resume path
  recognises the partial output is hypothesis, untested.
- `omitClaudeMd`: skips about 20 kB of global and project `AGENTS.md`
  per round, but the rules the planner does use from them would have to
  move into its own prompt. A trade-off for the owner.

## Done when

- The owner has chosen the scope and approved the wording in chat.
- The change is applied, and a stage-gate test run shows the planner
  still produces a plan the reviewer accepts.

## Applied, 2026-10-28

On branch `feat/simplify-planner-729`, from the draft in
`.scratch/agent-reports/2026-10-28-general-task-729-simplified-planner-draft.md`
§ 2, § 3 and § 6 Option B. Owner rulings in chat, 2026-10-28: scope as
in this ticket and the draft ("rec sounds ok"); later chunks by
Option B ("B sounds ok"): the planner gives steps to every chunk it can
plan now, and only a chunk that needs an earlier chunk's results waits
as a one-line entry. No agent files a new ticket without asking the
owner; small findings go in this ticket.

Open finding: `.claude/skills/stage-gate/SKILL.md` step 2 (`SPLIT:`)
and step 7 (chunks that have not run) still have a judgment agent file
tickets without asking the owner, which the ticket ruling above
forbids. Not changed here, because skill text needs the owner's
approval of the exact wording.

Still to do for § Done when: the stage-gate test run (draft § 7).
