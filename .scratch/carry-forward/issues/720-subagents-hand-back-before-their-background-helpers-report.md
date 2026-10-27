Status: closed
Type: bug
Origin: planner incident in session 5cef0953, 2026-10-04; owner 2026-10-04: "You can work on that fix if you're able to branch out / work tree without messing up the other agent/session this is forked from"
Blocks: none
Blocked by: none
Related: 712

# Subagents hand back before their background helpers report

The hook part of the fix reached `dev` in merge `b5022cb8` (see "Copied
from the old branch 2026-10-27" below).

## What is wrong

A subagent starts helper subagents in the background, then ends its turn
to wait for them. The harness then orders it to hand back at once, so it
sends a report that is missing its helpers' results. When the helpers
finish, their reports wake it, and it sends a second report that the
parent may already have acted on or may ignore.

On 2026-10-04 a `gate-planner` sent plan v1 without its four researchers'
results and marked those claims `hypothesis, untested`. The session wrote
v1 to `plan.md`, passed Gate A and started a reviewer on it. The planner
sent v2 four minutes later, and the session stopped the first reviewer.

Evidence (transcript
`C:\Users\dgree\.claude\projects\C--Users-dgree-Code-lulz-tbc-gear-prio\5cef0953-10d5-4668-b1e6-2fbbf6778cb6\subagents\agent-ac49dfaac5aba2ec7.jsonl`,
read line by line with Python `json.loads`):

- Lines 60-63, 17:10:58 to 17:11:57 UTC: four `general-task` spawns, each
  with `run_in_background: true`, each in its own message about 20 s
  apart.
- Line 86, 17:12:38.714: the planner ends its turn with "Researchers are
  out; I will wait for their reports before drafting."
- Line 87, 13 ms later: the harness message "[handback-send-enforce] Your
  report has not been delivered. Call SubagentHandback({message: <your
  full report>}) now; the call ends your run."
- Line 89, 17:15:13: hand-back of v1. The four researchers had handed back
  between 17:13:21 and 17:14:48 (their own transcripts), but their reports
  reached the planner only after v1 (lines 91 and 95-97).
- Line 100, 17:19:41: hand-back of v2.

## How often

11 agents since 2026-09-25, the day `SubagentHandback` first appears in
the transcripts. Method: a scan of all 2194 subagent transcripts under
`C:\Users\dgree\.claude\projects\C--Users-dgree-Code-lulz-tbc-gear-prio*\*\subagents\agent-*.jsonl`
(2026-07-27 to 2026-10-04) for the enforce message, `Agent` and
`SubagentHandback` calls, and child reports. "Pending" is the number of
background helpers still running at the first hand-back, out of all the
agent's background helpers.

| Date | Session | Agent type | Agent | Pending | Second report |
| --- | --- | --- | --- | --- | --- |
| 2026-09-25 | 8669fd4d | gate-planner | a4c44b1cfdbdc566a | 1 of 3 | yes |
| 2026-09-25 | 35273a06 | general-purpose | a498934de56590d13 | 3 of 4 | yes |
| 2026-09-28 | 956a3811 | gate-planner | a0796638a69737446 | 4 of 4 | yes |
| 2026-09-28 | 2aa99708 | design-task | ad7c2800d5ab3aabc | 1 of 2 | no; the helper's report never appears |
| 2026-09-28 | 956a3811 | design-task | a4a20485f2412b50a | 1 of 1 | no; the report came 1 s after the hand-back |
| 2026-09-29 | 956a3811 | gate-reviewer | a994db309151ce4f9 | 4 of 4 | yes |
| 2026-10-02 | 2fbe8365 | general-task | a5243848b038cb1e1 | 4 of 4 | yes |
| 2026-10-03 | 408b0abb | design-task | ab6026acbcb848a7a | 1 of 1 | yes |
| 2026-10-03 | 467935c1 | gate-planner | a4baecfc7a5ff1235 | 4 of 4 | yes |
| 2026-10-03 | 408b0abb | general-task | ac1e7a7e1e40ddd41 | 2 of 2 | no; neither report appears |
| 2026-10-04 | 5cef0953 | gate-planner | ac49dfaac5aba2ec7 | 4 of 4 | yes |

The research for this ticket also gave the count as "12" or "11 + 1".
That figure counts the 2026-10-04 incident twice: it is the last row
above. Four more agents got the enforce message with
helpers pending and kept waiting until every report arrived. They did not
hand back early.

## Why it happens

- **Background is the default.** The Agent tool description says
  subagents run in the background by default. A spawn that omits
  `run_in_background` reached a test hook with the key absent and ran in
  the background (live hook test, 2026-10-04, session f01a3427). In the
  scan, 107 of 107 omitted spawns whose helper metadata has a
  `requestShape` field (in `agent-<id>.meta.json`) were background.
- **No tool waits for a background helper.** No documented tool
  blocks until a named background agent finishes
  (https://code.claude.com/docs/en/tools-reference; `TaskOutput` is
  deprecated and does not block). A subagent whose turn ends without a
  `SubagentHandback` call gets the enforce message at once (transcript
  line 87 above). The message is not in the Claude Code docs or changelog
  (searched 2026-10-04), so the rule behind it is inferred from timing:
  hypothesis, untested.
- **The repo never said to wait.** Before this branch, the instructions
  that tell agents to spawn helpers said nothing about foreground,
  background or waiting: `gate-planner.md` "Research by subagent",
  `gate-reviewer.md` § Fan-out, `design-task.md`, `general-task.md`, and
  the executor's `gate-visual` and `gate-sme` spawns
  (`grep -rn run_in_background .claude docs AGENTS.md` matched only
  `.claude/hooks/bash-footguns.sh`, which is about Bash).
- **The nearest rule targeted another failure.** `docs/agents/model-policy.md`
  § Manager / multi-step fan-out came from a Cursor manager that lost its
  fan-in on 2026-07-28 (`git log -S"waiting on workers" -- docs/agents/model-policy.md`
  finds `2ce5413b` and `f22a63ac`). It addresses "a manager that must
  spawn workers and run fan-in" and never named the Agent tool flag. The
  planner's prompt does not point at that section.
- **Read-only seats had no fix.** That rule's second option is a disk
  handoff, but `gate-planner`, `gate-reviewer` and `design-task` may not
  write files.

## The fix on this branch

1. **Hook.** `.claude/hooks/subagent-foreground-helpers.py`, registered in
   `.claude/settings.json` as `PreToolUse`, matcher `Agent`, not async,
   `timeout: 10`. On an `Agent` call that has `agent_id` (present only
   inside a subagent) and `run_in_background` not `false`, it prints
   `updatedInput` (the full original input with
   `run_in_background: false`) and no `permissionDecision`. Calls from the
   session are left alone. Any error prints nothing and exits 0, so the
   spawn runs unchanged.
2. **Written rule.** One sentence, the same in `gate-planner.md`,
   `gate-reviewer.md`, `design-task.md`, `general-task.md` and
   `gate-executor.md`: start the subagents you need at the same time in
   one message, each with `run_in_background: false`. The model-policy
   section now covers every subagent that spawns subagents on Claude Code.
   The hook cannot join calls that an agent sends in separate messages,
   so the one-message rule stays in writing.
3. **Gate check.** `.claude/skills/stage-gate/SKILL.md` step 2 and Gate B:
   a planner or reviewer report that says its research is missing or
   still pending goes back to that seat by `SendMessage` and is not
   written as the stage artifact.

## Tests and results

Unit cases: `python .claude/hooks/tests/subagent-foreground-helpers.py`
prints "10 of 10 cases passed" (rc 0, 2026-10-04). The cases: `true` and
absent are rewritten with every other key kept; `false`, no `agent_id`,
an empty `agent_id`, a Bash call, malformed stdin, empty stdin, a
non-object `tool_input` and a JSON list give no output and exit 0. Three
broken copies of the hook each failed the script (rc 1).

Live hook tests, 2026-10-04, session f01a3427. Each registered a
test-only hook in the main checkout's `.claude/settings.local.json` that
acted only on spawns whose description contained `HOOKTEST`, and
restored the file afterwards (checked with `cmp`):

- A `PreToolUse` hook on `Agent` added mid-session takes effect without a
  restart. Inside a subagent its input has `agent_id` and `agent_type`,
  where `agent_type` is the caller's type; the spawned type is
  `tool_input.subagent_type`. Calls from the session have no `agent_id`.
- The rewrite works for `true` and for an omitted field, at depth 1 and
  depth 2: the call blocked and returned the helper's report inline. No
  stray notification or second report followed.
- Two rewritten calls in one message still ran in parallel: two 20 s
  sleeps overlapped by 19 s.
- The final check called the real script's `rewrite()` from this branch.
  A foreground probe reached the hook and got no output. A spawn sent with
  `run_in_background: true` was rewritten and returned "OK" inline in
  about 2.8 s.
- Deny (`permissionDecision: "deny"`) also works at depth 1 and 2, but it
  costs the agent a retry turn and a re-sent prompt. That is why the fix
  rewrites instead.
- Leaving out `"allow"` matters: `"allow"` would also skip permission
  prompts for the spawn.
- When the session stopped a stuck foreground helper with `TaskStop`, the
  waiting caller got `[Request interrupted by user for tool use]` and kept
  working.

## Costs

From the transcript scan above (5-minute cache lifetime on every cache
write; Fable 5.1 cache write $12.50 and read $0.25 per million tokens):

- **Cache.** A foreground wait over 5 minutes rewrites the parent's
  cache. For a planner on Fable 5.1 with about 100k tokens of context that
  is about $1.23. 17% of planner research rounds ran past 5 minutes, so
  the average is about $0.21 extra per round. A median planner run costs
  $3.32.
- **Wall time.** A background parent kept reading code while its helpers
  ran (median 23 tool calls per planner research round). A foreground
  parent cannot, so each round adds the slowest helper's time: a median
  of 2.2 minutes and a 75th percentile of 3.6 minutes for planners.
- **A holder subagent saves nothing.** A seat that waits on a holder in
  the foreground waits as long as it would wait on the helpers, and its
  cache expires the same way. A seat that starts the holder in the
  background brings back this bug.

## What stays untested

- The real `.claude/settings.json` entry, with `${CLAUDE_PROJECT_DIR}`,
  has not run in a live session. The live check used the same command
  form with an absolute path to a wrapper.
- How the hook behaves when Python is missing or slow. Per the hooks
  reference (https://code.claude.com/docs/en/hooks), a timed-out
  `PreToolUse` command hook lets the call continue. Open Windows issues
  anthropics/claude-code#96476 and #77776 describe hook processes that
  hang, which is why the script uses only the standard library, starts no
  child processes and has a 10 s timeout.
- Whether a foreground Agent call has its own time limit. A hung helper
  blocks its caller until it is stopped.
- Depth 3. Subagents nest at most 3 layers below the session by default
  (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`); the pre-merge review chain
  reaches depth 3. The hook was tested at depth 1 and 2 only.
- Skills that ask for a background agent, such as `research`, now run
  that agent in the foreground when a subagent uses them. The session
  is not affected. No run has checked this.

## Open upstream question

Should Claude Code let a subagent wait for its own background helpers,
or document the `[handback-send-enforce]` behaviour? The closest GitHub
issue is anthropics/claude-code#99259. Related open issues: #86963 (a
nested background subagent is not woken by its helpers), #96849 (a second
hand-back after a wake-up is refused) and #98241 (the enforce message
repeats after the parent has gone).

The owner decided not to file an issue for this case. Owner, 2026-10-04:
"dont bother, they have a zillion issues and while vibecode a new problem
or a half solution before reading our issue, is my assumption"

## Closed 2026-10-04

The fix is in three commits on `feat/subagent-foreground-helpers`:

- `0f7a0d15` adds the hook, its test and the `.claude/settings.json`
  entry. `pnpm verify` now runs the test as the `hooks:check` step.
- `95ff962b` adds the written rule to the five agent files and
  `docs/agents/model-policy.md`.
- `4d5a702f` adds the gate check to both `stage-gate/SKILL.md` copies.

The items under "What stays untested" are still untested.

Numbering: this ticket is 550 although `NEXT` on `dev` at `10c13a77`
read 545. `feat/round-11-followups` files tickets 545 and 546
(`git ls-tree --name-only feat/round-11-followups .scratch/carry-forward/issues/`).
When the two branches' `NEXT` values conflict at merge, keep the higher
one.

## Copied from the old branch 2026-10-27

This ticket was 550 on branch `feat/subagent-foreground-helpers` (tip
`870e88d0`, on the `windows` remote only). Dev already has a different
550, so this copy is 720. That branch was never merged. Ticket 712's fix
ported its hook, the hook's test, the `.claude/settings.json` entry and
the `foreground-hook:check` script, and reached `dev` in merge
`b5022cb8`. Its ticket, its `NEXT` change, its review file and its text
edits were not taken (ticket 712, § Comments, "2026-10-26: owner rulings
and the fix"). This ticket and the review file
`docs/reviews/feat-subagent-foreground-helpers.md` were copied from the
branch so that it can be deleted (owner ruling in ticket 712, § Comments,
2026-10-27). The items under "What stays untested" are still untested.

Verified by: `tbc-gear-prio@b5022cb8`; on `dev` at `8a59f35d`,
`python3 .claude/hooks/tests/subagent-foreground-helpers.py` printed
"11 of 11 cases passed" (rc 0, 2026-10-27).
