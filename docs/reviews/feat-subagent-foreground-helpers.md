# Pre-merge review — feat/subagent-foreground-helpers

Reviewed range: `10c13a77f29f2702f97193fc4ba6a0ae867f23fb..7079d666d034d823a618d9e46e0cf1d8eed769d5`

Round 1. Four fresh `general-task` subagents on Opus (effort high, the
Claude Code review lane), started together in one message, each in the
foreground: adversarial, domain, and the `code-review` skill's Standards
and Spec sub-agents. `codex` is not on `PATH` (`which codex`). Every axis
was told to write nothing; each reported the worktree clean at
`7079d666`.

The branch adds a `PreToolUse` hook on `Agent` that rewrites a
subagent's background spawn to `run_in_background: false`, its test (run
by `pnpm verify` as `hooks:check`), a one-sentence rule in five agent
files and `docs/agents/model-policy.md`, a stage-gate check in step 2 and
Gate B, and ticket 550, which is the spec.

## Adversarial

No test theatre and no correctness bug in the hook itself. The test runs
the hook as a subprocess and compares every key of the output.
`python .claude/hooks/tests/subagent-foreground-helpers.py` prints "10 of
10 cases passed" (rc 0). The reviewer ran 8 broken copies of the hook (no
`agent_id` check, keys dropped, no `hookEventName`, absent field skipped,
exit 2, wrong output key, `ensure_ascii=False`, file missing); each made
the test fail (rc 1). `scripts/run_verify.mjs:139-146` stops on a
non-zero step, so `hooks:check` gates `pnpm verify`.

- **A1. An unresolved hook path blocks every Agent call, the session's
  included.** `.claude/settings.json:9-11` runs
  `python ${CLAUDE_PROJECT_DIR}/.claude/hooks/subagent-foreground-helpers.py`.
  If that file is missing, `python` exits 2 (`python C:/nonexistent/x.py`
  gives rc 2), and the hooks reference says exit 2 from a `PreToolUse`
  hook blocks the call (doc-sourced, not tested here). The matcher fires
  before the script's `agent_id` check, so top-level spawns are blocked
  too. The docstring's "must never stop a spawn" covers only errors
  inside the script. The block is visible, not silent. The same `args`
  form already resolves in the main checkout: `log-agent-run.py`,
  registered the same way, wrote
  `.scratch/agent-runs/f01a3427-7bea-40a4-b5c6-31784c55ab12.jsonl` for
  this session. So the risk is a rename of the hook file without its
  registration, or a checkout that removes the file while a session keeps
  the old settings (hypothesis, untested). Suggested fix: `hooks:check`
  also asserts that `.claude/settings.json` registers the file it tests.
- **A2. Older text still offers "end your turn while workers run".**
  `docs/agents/model-policy.md` option 2 (disk handoff, then end) and
  `.claude/skills/parallel-phase/SKILL.md:16` ("write a `PROCESS.md`
  handoff ... before you end") predate the hook. On Claude Code the hook
  makes every subagent spawn foreground, so nothing is in flight when a
  subagent ends and option 2 no longer applies to it. The Agent tool's own
  description also says to background by default.
- **A3. The stage-gate `SendMessage` check relies on a second hand-back.**
  Ticket 550 cites anthropics/claude-code#96849 ("a second hand-back
  after a wake-up is refused"). The ticket's own table shows 8 second
  reports delivered after a wake-up.
- Unexamined: `isolation: "remote"` with a forced `run_in_background:
false`. The tool says remote always runs in the background. No agent
  doc in the repo asks for remote isolation
  (`grep -rn 'isolation.*remote\|"remote"' .claude .agents docs/agents AGENTS.md`
  matches only lines about `isolation: worktree`).

## Domain

**Domain: clean.** The diff asserts no TBC, Warcraft Logs or wowsims
fact. `git diff --name-only 10c13a77..7079d666 -- data src vendor tests
docs/stage0-findings.md docs/verification-log.md` prints nothing. The
only game word in an added line is the made-up test input "Research 540
proc sites" (`.claude/hooks/tests/subagent-foreground-helpers.py:22-23`),
which states no fact.

## Standards + Spec

### Standards

No hard violation. `python scripts/check_skill_mirrors.py` prints "skill
mirrors match". All four commit subjects meet the seven rules
(`git log --format=%B -n 4`; the longest is exactly 50 characters). The
hook's comments explain why, not what.

- **S1. A claim is stated as fact that ticket 550's own evidence
  qualifies.** `docs/agents/model-policy.md` (new block, lines 155-162)
  and the hook docstring say "A subagent cannot wait for a subagent that
  runs in the background" and that the harness orders it to hand back at
  once. Ticket 550 § Why it happens marks the rule behind the enforce
  message "hypothesis, untested", and § How often records that "Four more
  agents got the enforce message with helpers pending and kept waiting
  until every report arrived" (11 handed back early, 4 waited). The
  prescribed action is right either way; the absolute "cannot" is
  stronger than the evidence (AGENTS.md § Durable claims).
- **S2. The `research` skill still says to background.**
  `.claude/skills/research/SKILL.md:6`: "Spin up a **background agent**".
  An agent that reads it and its own agent file gets opposite
  instructions. Ticket 550 § What stays untested already lists this case.
- **S3. `hooks:check` names all hooks but tests one** (judgement call,
  Mysterious Name). `bash-footguns.sh` and `log-agent-run.py` have no test.
- **S4. The same four-line sentence is in five agent files with no check
  that keeps them identical** (judgement call, Duplicated Code). Each
  agent loads only its own file, so the copies are needed.
- **S5. Ticket 550 used the word "shape"** ("records a shape") for the
  `requestShape` field.
- **S6. Ticket 550's cost figures have no committed command.** They are
  measurements from the described transcript scan, not causal claims.
- **S7. The hook docstring in `0f7a0d15` cites ticket 550, which is filed
  three commits later** in `7079d666`.

### Spec

The branch builds all four parts of ticket 550 § The fix on this branch:
the hook (registered as `PreToolUse`, matcher `Agent`, not async,
`timeout: 10`; copies the full input; no `permissionDecision`; fails
open), the rule in all five agent files and the model-policy block, the
check in step 2 and Gate B of both stage-gate copies (same blob
`dab97a41`), and `hooks:check` in `verify:steps`
(`scripts/run_verify.mjs:50` reads it). The reviewer re-ran the 10 unit
cases and three mutations of its own (each rc 1). It did not re-run the
live hook tests, the 2194-transcript scan or `pnpm verify`.

- **P1. The ticket number jump is unexplained.** `NEXT` read 545 at
  `10c13a77`; the branch took 550 and wrote 551.
  `git ls-tree --name-only feat/round-11-followups .scratch/carry-forward/issues/`
  shows that branch files 545 and 546, so the jump avoids a clash, but
  neither the ticket nor the commit says so.
- **P2. Ticket 550 says "Status: closed" but its body opened with
  "Claimed by branch".**

### What stays untested (ticket 550): does any item block a merge?

None blocks. Every item either falls back to today's behaviour or fails
visibly.

- Real `.claude/settings.json` entry not run live: the same `python` +
  `${CLAUDE_PROJECT_DIR}` form already runs `log-agent-run.py` in this
  repo (A1 evidence). One spawn from a subagent after the merge confirms
  it; if it fails, see A1.
- Python missing or slow: a missing interpreter exits 127 or 9009, not 2;
  a timed-out `PreToolUse` hook lets the call continue (hooks reference,
  not tested here).
- No time limit on a foreground Agent call: a hung helper stalls its
  caller visibly; the ticket's live test shows `TaskStop` frees it.
- Depth 3: the hook checks only that `agent_id` is present, which the
  live test saw at depth 1 and 2.
- Skills that ask for a background agent: they now run in the foreground
  inside subagents; the cost is wall time, the results stay correct.

## Summary

Verdict: no blocking finding. The hook does what ticket 550 specifies,
its test catches every mutation the reviewers tried, and `pnpm verify`
runs it. Two small findings are open because their fixes are in files
this review may not write: A1 (a test assertion that settings.json
registers the tested file) and S1 (soften "cannot wait" in model-policy
and the hook docstring, which changes owner-approved text). Ticket items
P1, P2 and S5 were fixed in ticket 550 in this review's commit. The rest
are dropped as `wontfix` with reasons.

## Open findings (round 2 records their disposition)

- **A1** — fix inline (assert the registered path in `hooks:check`) or
  drop. Not a merge blocker: the block would be visible and the path
  form is proven by `log-agent-run.py`.
- **S1** — fix inline (for example "A subagent has no tool that waits for
  a background subagent; in ticket 550's scan, 11 of 15 such agents
  handed back early") or drop. The current wording is owner-approved, so
  the owner decides.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                    |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A2  | Adversarial | wontfix     | The hook forces foreground, so option 2 and the parallel-phase handoff become moot for subagents rather than harmful; model-policy's new block already says read-only seats have only option 1. Skill edits need owner approval. |
| A3  | Adversarial | wontfix     | Checked: ticket 550's table shows 8 second hand-backs delivered after a wake-up, so #96849 does not stop the stage-gate `SendMessage` check here.                                                                                |
| S2  | Standards   | wontfix     | The hook settles the conflict at run time, and ticket 550 § What stays untested records the `research` case; editing the skill needs owner approval.                                                                             |
| S3  | Standards   | wontfix     | One-hook test under a general name; the owner approved `hooks:check` ("verify sounds good."). A later hook test can join it.                                                                                                     |
| S4  | Standards   | wontfix     | Each agent loads only its own file, so the five copies are needed; a sync check is more machinery than five sentences warrant.                                                                                                   |
| S5  | Standards   | fixed       | Ticket 550 now names the `requestShape` field instead of "a shape".                                                                                                                                                              |
| S6  | Standards   | wontfix     | Measurements whose method the ticket describes (§ How often), not causal claims.                                                                                                                                                 |
| S7  | Standards   | wontfix     | Harmless once the branch merges: both commits land together.                                                                                                                                                                     |
| P1  | Spec        | fixed       | Ticket 550 § Closed now records why it is 550 and says to keep the higher `NEXT` at merge.                                                                                                                                       |
| P2  | Spec        | fixed       | Ticket 550's opening line now points at the Closed section instead of "Claimed by branch".                                                                                                                                       |

## Round 2

Reviewed range: `7079d666d034d823a618d9e46e0cf1d8eed769d5..1cf21e9a40d29ea1d1d434e1105a32ffe47b784e`

Round 2 ran no review axes. It records the fixes for round 1's two open
findings, A1 and S1, made by a `general-task` subagent on Opus that the
session sent with both fixes stated. The range also holds `ca0ad146`,
round 1's own record (this file, and ticket 550 fixes P1, P2 and S5).

- **A1 fixed in `1cf21e9a`.** `.claude/hooks/tests/subagent-foreground-helpers.py`
  has an eleventh case. It reads `.claude/settings.json`, takes the one
  `PreToolUse` entry with matcher `Agent`, expands `${CLAUDE_PROJECT_DIR}`
  to the repo root, and fails unless a command or arg names the hook file
  the test runs and that file exists. The check bites: against a copy of
  settings.json with the path spelt `subagent-forground-helpers.py`, the
  script prints `FAIL settings.json names this hook: no command or arg
names ...` and "10 of 11 cases passed" (rc 1). Against a copy of the
  layout with settings.json but no hook file, it prints `... does not
exist` (rc 1). The real run prints "11 of 11 cases passed" (rc 0).
- **S1 fixed in `30dbf138`.** Owner, 2026-10-04: "alternative wording
  sounds better." The five agent files now say "no tool lets you wait for
  a subagent that runs in the background, and when your turn ends the
  harness tells you to hand back at once". `docs/agents/model-policy.md`
  and the hook docstring say "has no tool that waits for" a background
  subagent or helper, and model-policy now says 11 of the 15 agents that
  got the hand-back order obeyed. That figure is from ticket 550 § How
  often: 11 early hand-backs in the table, plus four agents that "kept
  waiting until every report arrived". Model-policy says their late
  reports "can" wake them, because the ticket's table shows a second
  report for 8 of the 11. Ticket 550's bullet is now "No tool waits for a
  background helper." `git grep -n "cannot wait"` now matches only round
  1's record in this file.

`pnpm verify` passed at `1cf21e9a`, including `hooks:check`.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                   |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `hooks:check` asserts that `.claude/settings.json` names the hook file it tests and that the file exists.       |
| S1  | Standards   | fixed       | "cannot wait" replaced with the owner-approved "no tool waits" wording and the 11-of-15 figure from ticket 550. |
