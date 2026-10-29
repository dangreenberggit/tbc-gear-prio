Status: closed
Type: process
Origin: owner decision in session, 2026-10-28, on ticket 727
Blocks: none
Blocked by: none
Related: 712, 723, 726, 727, 728, 730

# Simplify the gate-planner's rules

Closed 2026-10-29. Applied and merged to `dev` at `3c008f0d`. The first
test run found that the planner did not follow the owner's Option B
ruling (§ Test result, 2026-10-28). A template fix (`eded62c3`) and a
second test run followed, and the second run passed (§ Second run,
2026-10-29). Ticket 726 (move the general stage-gate core to a plugin
repo) waited on this ticket, so the plugin starts from these rules.

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
as 727. The cause and the fix are in § Option B did not take effect in
the first run.

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

### Option B did not take effect in the first run

The owner ruled that the planner gives steps to every chunk it can plan
now (§ Applied). In this brief, K2 and K3 only append a line to a file
whose content K1's steps fix. Nothing about them is unknown at plan
time. Both the first planner and the K2 planner still left the later
chunks as one-line entries. The one-line entries even hold the full
commands and checks: `plan-before-K1-revision.md` and `plan-K2.md`
§ Execution chunks. Their `needs from` field names a file state that
K1's own acceptance fixes. With Option B followed, this run needed one
planner spawn plus the revision, not four.

What in the files allowed this, at `3c008f0d`:

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

The fix, applied in `eded62c3` on branch `chore/729-test-result` with
the owner's approval ("sure, fine", 2026-10-29): in `plan-template.md`
§ Execution chunks and its mirror
`.agents/skills/stage-gate/plan-template.md`, the two sentences quoted
above became

> Each chunk you can plan now has steps: `K1: steps 1–4`,
> `K2: steps 5–7`. A chunk is one line only when it needs a result
> that an earlier chunk's run produces and the plan cannot know
> before then: `K3: <goal in one sentence> — needs from K2's run:
> <result>`.

and "A new plan for a later chunk" became "A new plan for a one-line
chunk". The pass test for the rerun, on the same dummy without the
brief sentence "`K2` and `K3` are later chunks.": the first plan gives
steps to all three chunks, and the run has one planner spawn plus any
revision. § Second run, 2026-10-29 has the result.

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
recount works only until about 2026-11-27. The second run used the same
session, so these two commands now also print its spawns; the first
run's spawns are the lines timed before `2026-10-29T01:23Z`.

## Second run, 2026-10-29

One stage-gate run in the same session,
`fc215b62-f051-47b1-b269-e4f6d0ac0250`, stage folder
`.scratch/stage-gate/729-planner-test-2/` (main checkout, gitignored;
read `decision-log.md` first). Base: `eded62c3`, the template fix on
branch `chore/729-test-result`. The brief is the first run's brief
with the stage path moved and the sentence "`K2` and `K3` are later
chunks." removed (`diff` of the two `brief.md` files).

### Result

Passed. The first plan gave steps to all three chunks in one planner
spawn: K1 steps 1-3, K2 steps 4-6, K3 steps 7-9, and no one-line chunk
(`plan.md` § Execution chunks; `decision-log.md` `gate A` round 1). The
run had one planner spawn plus one revision, which is the pass test in
§ Option B did not take effect in the first run. Executors K1, K2 and
K3 all ran from that one plan, with no new planner spawn, and each
returned `success`. Final Gate C passed; HEAD stayed at `eded62c3`.

### Cost

`calls` / `est_cost_usd` per spawn, from the commands under Verified by
below. Agent ids are from `decision-log.md`.

| Spawn                          | Agent id            | Run log     | Recount     |
| ------------------------------ | ------------------- | ----------- | ----------- |
| planner, first plan            | `a33945bd682b70549` | 2 / 0.6897  | 3 / 0.9244  |
| reviewer, round 1              | `ad16b2f8769b1c00b` | 6 / 0.5164  | 6 / 0.5164  |
| planner, revision              | `abcf6fcc5308dab7b` | 1 / 0.4816  | 2 / 1.0385  |
| reviewer, round 2 (re-review)  | `a2bcdb1b305b7ff87` | 4 / 0.4247  | 5 / 0.4711  |
| executor, K1                   | `af229693bbbaa8b09` | 7 / 0.4229  | 8 / 0.4712  |
| executor, K2                   | `a99e1c96bcb95299a` | 7 / 0.4112  | 8 / 0.4573  |
| executor, K3                   | `ad744808dffdbacca` | 6 / 0.4063  | 7 / 0.4605  |
| **planner total (2)**          |                     | 3 / 1.1713  | 5 / 1.9629  |
| reviewer total (2)             |                     | 10 / 0.9411 | 11 / 0.9875 |
| executor total (3)             |                     | 20 / 1.2404 | 23 / 1.3890 |
| all 7 spawns                   |                     | 3.3528 USD  | 4.3394 USD  |

Against the first run (§ Cost above):

- First plan: 2 calls / 0.69 USD in both runs. This plan covered nine
  steps over three chunks; the first run's covered four steps of K1.
- Planner total: 2 spawns, 1.17 USD by run log, against 4 spawns and
  2.83 USD. By recount: 1.96 against 3.78.
- Whole run: 7 spawns, 3.35 USD by run log, against 10 spawns and
  5.59 USD. By recount: 4.34 against 6.87.
- By recount, the revision cost more than the first run's revision
  (1.04 against 0.88). This run also had a re-review, which the first
  run did not, because the revision added claims C6 and C7.
- These figures leave out the session's own calls, in both runs. One
  run each is a small sample.

Ticket 730 affects the run-log column: six of the seven lines are one
call short of the recount. The round 1 reviewer line is the exception:
its run log and recount agree (6 / 0.5164). Why is hypothesis,
untested. On the revision line the gap is 0.56 USD, more than the
logged cost.

### Against § Done when and the handoff's § What passes

- Plans the reviewer accepts: yes. Round 1 returned `VERDICT: revise`
  with two `material` findings: R1-F1 (step commands used the bare path
  `statements.md`, which resolves at the repo root from the executor's
  cwd) and R1-F2 (the postflight checks missed a new untracked file).
  One planner revision fixed both. It added claims C6 and C7 with
  `- added:` lines, so a re-review ran (`SKILL.md` step 4), and round 2
  returned `VERDICT: sound` (`plan-review.md` § Round 1 and § Round 2;
  `decision-log.md` `gate B` lines).
- Gate A passed on the first try for both plans.
- Chunks with steps ran; no one-line chunk was reached, because there
  was none. The ledgers hold only `advisory` rows (`execution-report.md`
  § Deviation ledger, three sections). `statements.md` holds the three
  lines.
- Removed rules: no stage file asks for Backburner, `next:`, `SPLIT:`,
  a part, a reconcile or `parts.md`
  (`grep -n -i -E 'backburner|next:|SPLIT|parts\.md|reconcile'` over
  the stage folder prints nothing).
- "The planner writes a plan in one spawn that passes Gate A and the
  reviewer's review" (handoff § What passes): not met as written. The
  first plan passed Gate A but got `revise`. The plan the reviewer
  accepted took two planner spawns. The first run had the same result
  (§ Against § Done when and the handoff's § What passes, above).

Why the ticket closes anyway. That handoff sentence asks the first plan
to have no defect the reviewer finds. It does not measure 729's change:

- Both findings are ordinary plan detail, and no rule that 729 removed
  covered them. `git show 3c008f0d^1:<file> | grep -n -i -E
  'absolute|cwd|untracked'` over the four pre-729 planner files
  (`gate-planner.md`, `plan-template.md`, `stage-gate-project.md`,
  `parts.md`) prints nothing.
- Finding such detail is the reviewer seat's job, and the revision loop
  is part of the pipeline (`SKILL.md` steps 3 and 4). The ticket's
  § Done when asks for "a plan the reviewer accepts", and both runs met
  it.
- The comparison with 727 points the other way and is weak. In both
  727 runs the first plan passed review in one spawn, but each covered
  K1 only, with 2 or 3 steps. In both 727 runs the K2 plan got `revise`;
  in stage b the finding was planted
  (`.scratch/stage-gate/727-planner-calls-a/decision-log.md` and
  `-b/decision-log.md`, `gate B` round 2 lines). In both 729 runs the
  first plan got `revise`. That 729 made plans worse is hypothesis,
  untested: two runs on each side, with plans of different size.

If the owner meant the one-spawn sentence as a hard bar, this ticket
should be reopened; no run so far meets it.

### Small findings (noted here by owner ruling; no new tickets)

- The revision planner's final message began with one chat line before
  the plan; the session left it out of `plan.md` (`decision-log.md`
  `gate A` round 2). The K3 planner did the same in the first run.
  `gate-planner.md:25-26` says the final message is the plan.
- `plan.md` § Approach begins "Three chunks, one line each." It means
  one statement line per chunk, but it uses the template's words for a
  one-line chunk. § Execution chunks says every chunk has steps, so it
  did no harm.
- The three executors wrote seven `advisory` ledger rows for reviewer
  findings that the revision had already applied (R1-F3, R1-F4) or that
  the reviewer marked "No change needed" (R2-F5). They did no harm.

### "Later chunk" in two files (noted, not edited)

The template-fix agent found two lines that still say "later chunk"
for a one-line chunk. Neither conflicts with the new template:

- `.claude/skills/stage-gate/SKILL.md:266` (Gate A): an open question
  is "answered with its three items, or named on the line of the later
  chunk that will answer it". "The line of" shows it means a one-line
  chunk. The session reads this file; the planner's files have no
  open-question rule (`grep -n -i 'open question'` over
  `gate-planner.md`, `plan-template.md`, `gate-reviewer.md` and
  `stage-gate-project.md` prints nothing). Under Option B a chunk with
  steps can also come later, so a reader could take "later chunk" to
  include it. That misreading has not been seen.
- `.claude/agents/gate-reviewer.md:63-64`: "a later chunk (a one-line
  chunk in `## Execution chunks`)". The parenthesis defines the term in
  the template's words, so the check means the same as the template.

Changing "later chunk" to "one-line chunk" at both places would use one
term everywhere. Both are agent-facing files, so that edit waits for the
owner's approval of the wording.

Verified by:

```
s=fc215b62-f051-47b1-b269-e4f6d0ac0250
grep '"agent_type": "gate-planner"' .scratch/agent-runs/$s.jsonl | python3 -c 'import sys,json
for line in sys.stdin:
    d = json.loads(line)
    print(d["agent_id"], d["description"], d["calls"], d["est_cost_usd"])'
python3 - "$s" a33945bd682b70549 ad16b2f8769b1c00b abcf6fcc5308dab7b a2bcdb1b305b7ff87 af229693bbbaa8b09 a99e1c96bcb95299a ad744808dffdbacca <<'EOF'
import sys, json, importlib.util
spec = importlib.util.spec_from_file_location("h", ".claude/hooks/log-agent-run.py")
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
ids = set(sys.argv[2:])
for line in open(f".scratch/agent-runs/{sys.argv[1]}.jsonl"):
    d = json.loads(line)
    if d["agent_id"] not in ids: continue
    st = h.context_stats(d["agent_transcript_path"])
    print(d["agent_type"], d["description"], d["calls"], d["est_cost_usd"], st.get("calls"), st.get("est_cost_usd"))
EOF
grep -n -A7 '^## Execution chunks' .scratch/stage-gate/729-planner-test-2/plan.md
grep -E '\| gate ' .scratch/stage-gate/729-planner-test-2/decision-log.md
```

The template fix is `tbc-gear-prio@eded62c3`.
