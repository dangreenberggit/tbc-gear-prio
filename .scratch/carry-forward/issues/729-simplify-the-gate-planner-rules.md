Status: open
Type: process
Origin: owner decision in session, 2026-10-28, on ticket 727
Blocks: none
Blocked by: none
Related: 712, 723, 726, 727, 728

# Simplify the gate-planner's rules

Applied and merged to `dev` at `3c008f0d`. Open: one test run found that
the planner does not follow the owner's Option B ruling (§ Test result,
2026-10-28). Do this before ticket 726 (move the general stage-gate core
to a plugin repo), so the plugin does not start from rules that are
about to change.

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

Finding (settled): `.claude/skills/stage-gate/SKILL.md` step 2
(`SPLIT:`) and step 7 (chunks that have not run) still have a judgment
agent file tickets without asking the owner. Owner ruling,
2026-10-28: the filing stays as it is; an agent should not stop work
to ask before filing a ticket.

Pre-merge review (`docs/reviews/feat-simplify-planner-729.md`): A1 fixed (owner approved, 2026-10-28). Step 2 and step 7 ticket filing stays as it is (owner: an agent should not stop work to ask before filing a ticket). A2 and S2 wording fixed; the rest `wontfix`.

## Test result, 2026-10-28

One stage-gate run, session `fc215b62-f051-47b1-b269-e4f6d0ac0250`,
stage folder `.scratch/stage-gate/729-planner-test/` (main checkout,
gitignored; read `decision-log.md` first). The brief is the 727
three-chunk dummy brief, with its Backburner sentence replaced by
"`K2` and `K3` are later chunks." (draft § 7 item 1). Handoff:
`.scratch/handoffs/2026-10-28-ticket-729-planner-test.md`.

### Result

The planner wrote plans the reviewer accepted, and nothing in the run
needed a removed rule. The planner did not follow Option B: it gave
steps to `K1` only, so the run used four planner spawns, the same count
as 727. The ticket stays open for that reason (§ Why open).

Template fix applied on branch `chore/729-test-result` with the owner's
approval ("sure, fine", 2026-10-29): the § Why open wording is now in
both `plan-template.md` copies. A second dummy run follows; the ticket
stays open until it passes.

### Cost

`calls` / `est_cost_usd` per spawn. "Run log" is the handoff's
§ Measure command. "Recount" is the transcript recount from ticket 727
§ What `calls` counts, with this session id.

| Spawn                   | Run log      | Recount      |
| ----------------------- | ------------ | ------------ |
| planner, first plan     | 2 / 0.6844   | 3 / 0.8534   |
| reviewer, round 1 (K1)  | 3 / 0.4545   | 4 / 0.5054   |
| planner, revision of K1 | 2 / 0.6542   | 3 / 0.8772   |
| executor, K1            | 6 / 0.4002   | 7 / 0.4515   |
| planner, new plan K2    | 2 / 0.6779   | 3 / 0.9232   |
| reviewer, round 2 (K2)  | 5 / 0.4799   | 6 / 0.5285   |
| executor, K2            | 8 / 0.4217   | 9 / 0.4776   |
| planner, new plan K3    | 3 / 0.8122   | 4 / 1.1280   |
| reviewer, round 3 (K3)  | 7 / 0.5720   | 8 / 0.6251   |
| executor, K3            | 7 / 0.4353   | 8 / 0.4959   |
| **planner total (4)**   | 9 / 2.8287   | 13 / 3.7818  |
| reviewer total (3)      | 15 / 1.5064  | 18 / 1.6590  |
| executor total (3)      | 21 / 1.2572  | 24 / 1.4250  |
| all 10 spawns           | 5.5923 USD   | 6.8658 USD   |

Against 727 on the same brief (ticket 727 § Test result and close):

- First plan: 2 calls / 0.68 USD, against 2 / 0.70-0.77. The same.
- Four planner spawns: 2.83 USD, against 3.49 (stage a) and 3.93
  (stage b) from the run log. By recount: 3.78, against 4.22 and 4.67.
  The 727 recount totals are the sums of the per-run recounts in 727
  § What `calls` counts.
- The spawns differ in kind. 727 had `next:` edits and a revision of
  K2. This run had new plans and a revision of K1. One run is a small
  sample.

Ticket 730 (run log leaves out each agent's last response) affects
these numbers: every one of the 10 run-log lines is one call short of
the recount, and its cost leaves out that call. The 727 numbers in the
handoff are run-log numbers with the same gap, so the run-log
comparison is like for like. The recount comparison gives the same
order.

### Against § Done when and the handoff's § What passes

- Plans the reviewer accepts: yes. The first plan got `VERDICT:
  revise` with one `material` finding, R1-F1 (step 1 put the sentence
  in the `printf` format string, so a `%` or `\` changed the line). One
  revision fixed it, and Gate B passed without a re-review. The new
  plans for K2 and K3 each passed Gate A and got `VERDICT: sound` in one
  spawn (`plan-review.md` § Round 1 to § Round 3; `decision-log.md`
  `gate B` lines).
- "A plan in one spawn that passes Gate A and the reviewer's review":
  not met for the first plan (R1-F1), met for K2 and K3.
- Gate A passed on the first try for all four plans. Every gate in
  `decision-log.md` passed except Gate B round 1, which returned
  `revise` for R1-F1.
- One-line chunks reached a new plan as `SKILL.md` step 5 says: yes,
  for K2 and K3 (`decision-log.md`, `note sha` lines "before new plan
  for K2" and "before new plan for K3"). `statements.md` holds the
  three lines.
- Removed rules: no stage file asks for Backburner, `next:`, `SPLIT:`,
  a part, a reconcile or `parts.md`. The only mention is the
  decision-log line about the brief edit.

### Why open: Option B did not take effect

The owner ruled that the planner gives steps to every chunk it can plan
now (§ Applied). In this brief, K2 and K3 only append a line to a file
whose content K1's steps fix. Nothing about them is unknown at plan
time. Both the first planner and the K2 planner still left the later
chunks as one-line entries. The one-line entries even hold the full
commands and checks: `plan-before-K1-revision.md` and `plan-K2.md`
§ Execution chunks. Their `needs from` field names a file state that
K1's own acceptance fixes. With Option B followed, this run needed one
planner spawn plus the revision, not four.

What in the files allows this:

- `.claude/skills/stage-gate/plan-template.md:46-47`: "The first chunks
  have steps: `K1: steps 1–4`. Each later chunk is one line: `K2: …
  — needs from K1: <result or file>`." The draft wrote this text for
  Option A. Option B only changed "chunk" to "chunks" (draft § 3 and
  § 6). It contradicts `.claude/agents/gate-planner.md:37-40` ("Give
  steps to every chunk you can plan now"), and its only example has
  steps on K1 alone.
- `gate-planner.md` never uses the term "later chunk". The template and
  the brief do.
- The brief's sentence "`K2` and `K3` are later chunks." uses the
  template's word for a one-line chunk. Hypothesis, untested: the brief
  and template lines 46-47 together read as an order to leave K2 and K3
  without steps. The first planner also read the `decision-log.md` line
  saying this sentence replaced the Backburner sentence.
- Gate A (`SKILL.md` step 2) and the reviewer allow the result, as
  designed, so nothing catches it.

The template is a skill file, so the fix waits for the owner's approval
of the wording. Proposed wording for `plan-template.md` § Execution
chunks and its mirror `.agents/skills/stage-gate/plan-template.md`
(not applied): replace the two sentences quoted above with

> Each chunk you can plan now has steps: `K1: steps 1–4`,
> `K2: steps 5–7`. A chunk is one line only when it needs a result
> that an earlier chunk's run produces and the plan cannot know
> before then: `K3: <goal in one sentence> — needs from K2's run:
> <result>`.

and change "A new plan for a later chunk" to "A new plan for a one-line
chunk". Then rerun the same dummy without the brief sentence "`K2` and
`K3` are later chunks.": pass when the first plan gives steps to all
three chunks and the run has one planner spawn plus any revision.

### Small findings (noted here by owner ruling; no new tickets)

- The K3 planner's final message began with a chat line ("I have
  everything I need; …") before the plan. The session left it out of
  `plan.md`. `gate-planner.md:25-26` says the final message is the plan.
- The K3 plan labelled C15 `hypothesis, untested` although its command
  was run and passes (R3-F3).
- The K3 plan's step 14 acceptance names the `# K3` section of
  `execution-report.md`, which only the session writes (R3-F1). The
  executor adapted.
- The session copied `plan.md` to `plan-before-K1-revision.md` before
  the revision. `docs/agents/orchestration.md` § The session delegates
  does not list that copy, and no rule asks for it. It did no harm.

Verified by:

```
s=fc215b62-f051-47b1-b269-e4f6d0ac0250
grep '"agent_type": "gate-planner"' .scratch/agent-runs/$s.jsonl | python3 -c 'import sys,json
for line in sys.stdin:
    d = json.loads(line)
    print(d["description"], d["calls"], d["est_cost_usd"])'
python3 - "$s" <<'EOF'
import sys, json, importlib.util
spec = importlib.util.spec_from_file_location("h", ".claude/hooks/log-agent-run.py")
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
for line in open(f".scratch/agent-runs/{sys.argv[1]}.jsonl"):
    d = json.loads(line)
    st = h.context_stats(d["agent_transcript_path"])
    print(d["agent_type"], d["description"], d["calls"], d["est_cost_usd"], st.get("calls"), st.get("est_cost_usd"))
EOF
grep -n -A4 '^## Execution chunks' .scratch/stage-gate/729-planner-test/plan-before-K1-revision.md .scratch/stage-gate/729-planner-test/plan-K2.md
```

Transcripts are deleted after `cleanupPeriodDays` (default 30), so the
recount works only until about 2026-11-27.
