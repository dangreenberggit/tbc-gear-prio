Status: closed
Type: task
Origin: ticket 727 § What `calls` counts (close note, 2026-10-28)
Blocks: none
Blocked by: none
Related: 727

# Run log leaves each agent's final response out of `calls` and cost

## What a reader of the run log sees

Each `stop` line in `.scratch/agent-runs/<session>.jsonl` shows a
`calls` count one lower than the agent's real number of model
responses, and an `est_cost_usd` that leaves out the price of that
missing response. The missing response is the agent's last one, the
final message with `stop_reason` `end_turn`. A reader who compares
agents or sessions by these fields reads every agent as one round
cheaper than it was. The error is per agent, so it is a larger share of
the total for short runs.

Second, smaller point: lines for `glm-flash-task` helpers show
`est_cost_usd` 0 and `unpriced_calls` 1, so the run log puts no price on
GLM work at all.

## Facts

Line numbers are at `tbc-gear-prio@e3736534`.

- `.claude/hooks/log-agent-run.py` runs as an async `SubagentStop` hook
  (docstring, line 5). `read_calls` (lines 112-160) counts the model
  responses in the agent's transcript; `context_stats` stores
  `"calls": len(calls)` (line 191) and prices `est_cost_usd` from the
  same list. The hook reads the transcript at `agent_transcript_path`
  (line 230) through `context_stats(transcript)` (line 248).
- Re-checked on 2026-10-28 for this ticket: running the hook's own
  `context_stats` on the transcripts of the 12 `gate-planner` runs in
  sessions `c33da48e-1527-4d89-8989-f3c193ceffe9` and
  `7ed55f38-b4c7-4d55-8e81-d22141af5e92` finds one more response than
  the logged `calls` in 11 of 12 runs (only stage b's "next K3" matches,
  5 and 5). For the run "gate-planner: dummy plan" in `c33da48e`, the
  log says 2 calls / 0.6898 USD, the transcript has 3 responses /
  0.8551 USD, and the three responses' stop reasons are `tool_use`,
  `tool_use`, `end_turn`. The table and the recount command are in
  ticket 727 § What `calls` counts.
- Re-checked the same day: the four `glm-flash-task` lines in session
  `7ed55f38` all show model `z-ai/glm-5.3-flash`, `est_cost_usd` 0 and
  `unpriced_calls` 1. The `PRICES` table (line 43) has no z-ai entry
  (`grep -n 'glm\|z-ai' .claude/hooks/log-agent-run.py` prints nothing).
- Reported by ticket 727, not re-checked here: the defect affects every
  agent type, not only `gate-planner`. Hypothesis, untested: the
  `SubagentHandback` path (the `PostToolUse` registration in the same
  docstring) has the same gap.
- Why the last record is missing when the hook runs is hypothesis,
  untested. One candidate: the async hook reads the transcript before
  Claude Code writes the final response to it.

## Done when

- In a new session, after the fix, that runs at least three Claude
  agents, every Claude agent's `stop` line has `calls` and
  `est_cost_usd` equal to what
  `context_stats(d["agent_transcript_path"])` returns when re-run on its
  transcript afterwards. Use the recount command in ticket 727 § What
  `calls` counts with that session id and without the agent-type
  filter. The note that closes this ticket gives the session id and the
  recount output.
- `glm-flash-task` lines in that session show `est_cost_usd` above 0
  and `unpriced_calls` 0, or this ticket records the owner's decision
  in chat to leave GLM runs unpriced.

Run-log lines written before the fix stay as they are. Transcripts are
deleted after `cleanupPeriodDays` (default 30), so a recount of old
lines works only before then.

## Closed, 2026-10-28

Folded into ticket 727 § What `calls` counts, by owner ruling in chat
on 2026-10-28: no new tickets without asking the owner, and 727
already records this problem and the recount command. The hook is not
changed.

Verified by:

```
grep -n -A6 'Ticket 730 was filed' .scratch/carry-forward/issues/727-limit-planner-tool-calls-on-fable.md
```
