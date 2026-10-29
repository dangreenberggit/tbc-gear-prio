Status: closed
Type: process
Origin: owner decision in session, 2026-10-27, on tickets 723 and 724
Blocks: none
Blocked by: none
Related: 723, 724

# Limit the planner's own tool calls on Fable

## Owner's words

Owner, 2026-10-27: "Yeah running tools like grep with fable would be
absolutely insane". After being told that the planner still runs small
commands itself on Fable: "If that sort of insanity is out of the
running here then I approve", then "Fine agreed on both. But ill need a
reminder to do it immediately after the merge".

The owner wants a reminder to start this ticket right after the
stage-gate follow-ups branch merges to `dev`.

## Facts

- The `gate-planner` seat runs on Fable: `.claude/agents/gate-planner.md:4`
  is `model: fable`.
- In a dummy stage-gate run on 2026-10-27, the planner ran checks itself
  and spawned no helper. The run folder is
  `.scratch/stage-gate/test-revision-chunk-id/` in the main checkout
  (gitignored). Its `plan.md:146`, under `## Decisions`, says:
  "Ran the two checks inline, no helper — two cheap commands with known
  targets — evidence: C9, C10". Check:
  `grep -n inline .scratch/stage-gate/test-revision-chunk-id/plan.md`.
- No line in `.claude/agents/gate-planner.md` says the planner may run a
  lookup itself. Its § Rules, "Research by subagent" (lines 51-72), says
  "Give each block of searches, reads, named command runs and
  measurements to a workhorse helper."
- `docs/agents/stage-gate-project.md:62-63` sends the planner elsewhere
  for that choice: "Block size, and what to run in place:
  `docs/agents/model-policy.md` § Workhorse jobs."
- That section is the rule that lets the planner run checks itself.
  `docs/agents/model-policy.md:334-338` says a block is worth a helper
  "when it would otherwise take the overseer more than about five tool
  calls on its own grown context (hypothesis, untested: the break-even
  is not measured). Run in place: a read of a file you are about to
  edit, a check whose output decides your next step, and anything under
  that bound."
- Cost: every tool call sends the agent's whole context again
  (`AGENTS.md` § "One tool round, many commands", which cites
  code.claude.com/docs/en/costs). So the Fable cost depends on how many
  tool calls the planner makes, not on which model runs `grep`. A helper
  spawn is itself one planner tool call, and the planner then needs a
  turn to read the result. Whether a helper saves money for one or two
  small commands is hypothesis, untested.

## Proposed direction (not settled; the owner decides)

- The planner puts its small lookups in one Bash call.
- Anything larger goes to one helper that gets several jobs at once.
- A stage-gate test run counts the planner's tool calls before and after
  the change.

Any wording change to a skill or agent file needs the owner's approval
in chat before it is applied.

## How to count the planner's calls

The run-log hook writes one `stop` line per agent to
`.scratch/agent-runs/<session>.jsonl`. Its `calls` field is the number
of model calls in the agent's transcript (`.claude/hooks/log-agent-run.py`,
`read_calls` at line 112, `"calls": len(calls)` at line 191). Each tool round is one model call.
Check:

```
grep '"agent_type": "gate-planner"' .scratch/agent-runs/<session>.jsonl
```

In session `c33da48e-1527-4d89-8989-f3c193ceffe9` the four planner runs
of the dummy test logged `calls` of 2, 8, 2 and 8 (descriptions
"dummy plan", "next: K2", "revision of K2", "next: K3"), costing an
estimated 0.69, 1.07, 0.72 and 1.18 USD (`est_cost_usd`). These are the
"before" numbers.

## Done when

- The owner has approved the wording in chat.
- The change is applied.
- A stage-gate test run shows the planner's `calls` count from the run
  log, next to the "before" numbers above.

## Applied, 2026-10-28

The session that applied this ticket reports that the owner approved
the wording in chat on 2026-10-28; the wording history is in
`.scratch/agent-reports/2026-10-28-general-task-727-*.md` (main
checkout, gitignored). Commit `ccd7028e` on
`feat/planner-tool-rounds-727` adds § Rules, "Few tool rounds" to
`.claude/agents/gate-planner.md` and points
`docs/agents/stage-gate-project.md` § Worker lanes, Planner at it. It
allows up to 4 helpers in one Research round, not the one helper that
§ Proposed direction named. Line numbers in § Facts are at `104b2017`.

The pre-merge review (`docs/reviews/feat-planner-tool-rounds-727.md`)
found wording problems in that text (R1, R2, R3, R5). Commit `aa179d24`
applies the owner-approved fixes. Commit `63959063` replaces parts of
them with texts P1 to P4 from
`.scratch/agent-reports/2026-10-28-general-task-727-committed-rule-check.md`
(main checkout, gitignored); the session that applied them reports that
the owner approved those texts in chat on 2026-10-28.

Round 2 of that review found two problems that block the merge and went
back to the owner (S1, S2: output cut short by the harness, with no
extra-round reason that allows reading the rest), and five wording gaps
deferred to ticket 728.

### Replaced by one rule, 2026-10-28

Two research reports (main checkout, gitignored:
`.scratch/agent-reports/2026-10-28-general-task-planner-vs-sources.md`
and
`.scratch/agent-reports/2026-10-28-general-task-planning-guidance-and-overengineering.md`)
found that Anthropic's "Prompting Claude Fable 5.1" guide handles
batching in one sentence. The owner approved in chat on 2026-10-28
(their word: "ok") a reset of `.claude/agents/gate-planner.md` and
`docs/agents/stage-gate-project.md` to their state on `dev`
(`104b2017`), plus one rule built on that sentence: § Rules, "Batch
your tool calls" in `.claude/agents/gate-planner.md`. The long "Few
tool rounds" rule and every fix to it (`ccd7028e`, `aa179d24`,
`63959063`) are gone, so review findings S1 and S2 no longer apply and
ticket 728 is closed. The larger simplification of the planner's rules
is ticket 729.

The ticket stays open for the test (§ Done when, last item): after
this branch merges to `dev`, in a new session, run the four-planner
dummy test twice and compare each planner's run-log `calls` with the
"before" numbers 2, 8, 2 and 8 (§ How to count the planner's calls).

## Test result and close, 2026-10-28

The dummy test ran twice in session
`7ed55f38-b4c7-4d55-8e81-d22141af5e92`, in stage folders
`.scratch/stage-gate/727-planner-calls-a` and
`.scratch/stage-gate/727-planner-calls-b` (main checkout, gitignored;
each has a `decision-log.md`). Run-log `calls` / `est_cost_usd` of the
four planner runs:

| Planner run    | Before (`c33da48e`) | After, stage a | After, stage b |
| -------------- | ------------------- | -------------- | -------------- |
| first plan     | 2 / 0.6898          | 2 / 0.6973     | 2 / 0.7685     |
| next K2        | 8 / 1.0679          | 3 / 0.9553     | 3 / 0.9974     |
| revision of K2 | 2 / 0.7151          | 2 / 0.6968     | 3 / 0.8056     |
| next K3        | 8 / 1.1795          | 5 / 1.1386     | 5 / 1.3546     |

On the two `next:` runs, `calls` fell from 8 to 3-5. The estimated cost
did not clearly fall: next K2 went from 1.07 to 0.96 and 1.00, next K3
from 1.18 to 1.14 and 1.35. Each run had its own planner and its own
reviewer findings, so the plans differ, and two runs per change is a
small sample.

Verified by:

```
for s in c33da48e-1527-4d89-8989-f3c193ceffe9 7ed55f38-b4c7-4d55-8e81-d22141af5e92; do
grep '"agent_type": "gate-planner"' .scratch/agent-runs/$s.jsonl | python3 -c 'import sys,json
for line in sys.stdin:
    d = json.loads(line)
    print(d["description"], d["calls"], d["est_cost_usd"])'
done
```

### What `calls` counts

`read_calls` (`.claude/hooks/log-agent-run.py:112-160`) counts the model
responses in the agent's own transcript: assistant records that have
`usage`, one per message id, `<synthetic>` records left out. One
response can hold several parallel tool calls. The harness reported
`tool_uses` of 14, 13, 11 and 14 for the four after-runs of `next:`,
against `calls` of 3, 3, 5 and 5.

The hook reads the transcript when it runs (async `SubagentStop`, line
5). In 11 of the 12 planner runs above, the transcript did not yet hold
the planner's final response at that time: the recount below finds one
more call per run, and that call is the last one, with `stop_reason`
`end_turn`. Only stage b's next K3 already included it. So in these
runs the logged `calls` is the number of tool rounds, and the logged
cost leaves out the final response. Why the final record is missing at
hook time is hypothesis, untested.

Recount from the transcripts, `calls` / `est_cost_usd` (transcripts are
deleted after `cleanupPeriodDays`, default 30): before 3 / 0.8551,
9 / 1.1432, 3 / 1.0147, 9 / 1.2431; stage a 3 / 0.9296, 4 / 1.0852,
3 / 1.0042, 6 / 1.2053; stage b 3 / 0.9936, 4 / 1.1151, 4 / 1.2094,
5 / 1.3546. The comparison holds: rounds on `next:` fell from 9 to 4-6,
and cost did not clearly fall.

```
python3 - <<'EOF'
import json, importlib.util
spec = importlib.util.spec_from_file_location("h", ".claude/hooks/log-agent-run.py")
h = importlib.util.module_from_spec(spec); spec.loader.exec_module(h)
for s in ["c33da48e-1527-4d89-8989-f3c193ceffe9", "7ed55f38-b4c7-4d55-8e81-d22141af5e92"]:
    for line in open(f".scratch/agent-runs/{s}.jsonl"):
        d = json.loads(line)
        if d["agent_type"] == "gate-planner":
            st = h.context_stats(d["agent_transcript_path"])
            print(d["description"], st.get("calls"), st.get("est_cost_usd"))
EOF
```

Ticket 730 was filed to fix this in the hook. The owner ruled on
2026-10-28 that 730 closes as this note, because this section already
records the problem and the recount. The hook is not changed: to get a
run's true `calls` and cost, recount from its transcript with the
command above.

### Helpers are not in the planner's cost

`est_cost_usd` covers only the planner's own transcript
(`agent_transcript_path` at line 230, `context_stats(transcript)` at
line 248). A helper gets its own run-log line. Stage b's planners
spawned one `glm-flash-task` helper on every run except the first plan;
stage a's spawned none. The four helper lines show `est_cost_usd` 0 and
`unpriced_calls` 1, so the run log puts no price on them.

### Close

§ Done when, last item: "A stage-gate test run shows the planner's
`calls` count from the run log, next to the "before" numbers above."
The table above meets it. These numbers do not show that the rule
lowers the planner's cost.
