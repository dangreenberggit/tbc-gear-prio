Status: open
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
deferred to ticket 728. The ticket stays open for S1 and S2 and for the
test run (§ Done when, last item).
