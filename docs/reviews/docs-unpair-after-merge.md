# Instruction review — docs/unpair-after-merge

Reviewed change: commit `f3235ae5` on `docs/unpair-after-merge`, base
`dev` at `0dfb1c8f`. It changes two sections of
`docs/agents/paired-worktrees.md`:

- § Land it on dev (lines 116-119): the pair stays only until the merge
  prints `merged`; then the agent that ran the merge removes it, and the
  owner does not.
- § Remove it (lines 213-221, new paragraph): in the Claude Code sandbox,
  `pnpm wt:unpair` stops after the fork half; the agent finishes with a
  plain `git worktree remove <pair path>` and a second `pnpm wt:unpair`.

Intent, from the caller's prompt: the owner, 2026-11-08, after being
given `pnpm wt:unpair gate-pipe` to run: "i shouldnt have to do this
remove the pair thing", then "manually doing this every time theres a
merged ticket fix branch is dumb".

Dispatch: every file this branch changes is agent tooling (`docs/agents/`
is on `TOOLING_PATHS`, `scripts/check_merge_ready.py:187`) or this review
record (excluded by `product_files`, `scripts/check_merge_ready.py:931`),
so the review is the `instruction-review` skill in place of
`pre-merge-review`. Path: full (the change moves a job from the owner to
an agent). One `general-task` agent on Opus ran the review; it spawned
one cold reader (`general-task`, Opus).

## Findings

Line numbers are in `docs/agents/paired-worktrees.md` at `f3235ae5`
unless another file is named.

| ID  | Check      | file:line                                                     | Quoted text                                                                                                                   | What an agent does wrong                                                                                                                                                                                                                                                      | How it happens, and what it costs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Severity   | Evidence                                                                                                                                                                                                            |
| --- | ---------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR1 | 3          | 116-119, 213-221                                              | "then the agent that ran the merge removes it (§ Remove it)"                                                                  | Unknown: no agent has done the job with this text.                                                                                                                                                                                                                            | The sandbox steps were run by hand on 2026-11-08, not by an agent reading this text. If an agent reads it differently, the owner removes pairs by hand again, which the change exists to stop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | blocks     | No trial on record. Trial to run: § Trial status.                                                                                                                                                                   |
| IR2 | 2          | `docs/agents/parallel-phase-project.md:33-34` against 217-219 | "Remove the pair only with `pnpm wt:unpair ${SLICE}`" against "First `git worktree remove <pair path>`, as the whole command" | A `parallel-phase` delegator in the sandbox hits the busy error, then must choose between "only with `pnpm wt:unpair`" and the new `git worktree remove` step. If it obeys "only", it stops with the fork half gone, the main half still registered and the unpair mark left. | Happens on every sandboxed slice pair. The owner finishes the removal by hand.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | should fix | Both quotes. The "only" bans a bare `git worktree remove` that skips unpair's checks; after unpair has run its checks and removed the fork half, the new step is safe, but the parallel-phase text does not say so. |
| IR3 | 2          | 218-219                                                       | "that text is in the sandbox's excluded commands, so it runs outside the sandbox"                                             | On a card whose settings lack the entry, the agent runs `git worktree remove` in the sandbox. It fails with the same busy error, and the text gives no next step.                                                                                                             | Only `~/.claude_router/settings.json` has `git worktree remove *` in `sandbox.excludedCommands`. `~/.claude/settings.json` has a different list without it, and `~/.claude_openrouter/settings.json` has none. Low chance: the project runs on the "Claude + GLM workers" card (`~/.claude/routing.md:199-201`). Cost: a half-removed pair for the owner.                                                                                                                                                                                                                                                                                                                                                                                                              | minor      | `python3 -c` reads of `sandbox.excludedCommands` in the three settings files.                                                                                                                                       |
| IR4 | 1 (rubric) | 217-218                                                       | "as the whole command with no `-C`, `cd` or `;`"                                                                              | An agent adds `2>&1`, `\| tail` or `&& echo`, which the list does not ban. The command then may not match the excluded pattern and fails in the sandbox.                                                                                                                      | The global habit "append `; echo "rc=${PIPESTATUS[0]}"`" (`~/.claude/AGENTS.md` § An exit code is not evidence) pushes agents to add text after commands. Whether Claude Code matches `git worktree remove *` against a command with a pipe or `&&` is unverified. Cost: one failed call and a retry. A shorter rule covers every case: "with nothing before or after it".                                                                                                                                                                                                                                                                                                                                                                                             | minor      | The cold reader ran it plain (its step 6), so no wrong action was seen.                                                                                                                                             |
| IR5 | 2          | 215-216                                                       | "the sandbox mounts every `.git/worktrees/<name>` read-only"                                                                  | An agent that believes the admin folders are read-only may decide it cannot commit or merge in a pair from the sandbox, and stop. The cold reader did not.                                                                                                                    | The mounts block deleting the folder, not writing in it. `findmnt -rn -o TARGET,OPTIONS \| grep .git/worktrees` lists, for each worktree that existed when the session started, a mount on `.git/worktrees/<name>` and on its `commondir` and `config.worktree` files, all shown `ro`. Deleting a folder that is or holds a mount point fails with EBUSY, which is the observed "Device or resource busy". Writing works: this review's commit in the pair wrote `.git/worktrees/unpair-doc/index`, and `test -w` passes on a mounted admin folder. A pair made after the session started (`unpair-doc`) has no mount at all, so unpair of such a pair may not stop (untested). Fix: "the sandbox mounts over every `.git/worktrees/<name>`, so it cannot be deleted". | minor      | That `findmnt` output in this session.                                                                                                                                                                              |

## Notes

- Line 213-214 quotes git's message ("failed to delete ... Device or
  resource busy"). The last line unpair prints in that case is
  `refused: a worktree is still registered after removal; see git
worktree list in both repos` (`scripts/worktree_pair.py:931`). Quoting
  that line too would help an agent match the case to this paragraph.
  The cold reader matched it without that line.
- The sandbox paragraph (213-221) comes before "Run it from the main
  checkout or from another pair" and the list of refusals (223-246),
  which apply before the busy error can happen. It reads more easily
  after them. Rubric only.
- Unchanged text: `docs/agents/parallel-phase-project.md:32` points to
  "Land it on dev" steps 2-4; that section has steps 1-3.
- Unchanged text the cold reader called unclear (not part of this
  change): line 124 "Skip this when the pair has no fork commits" gives
  no check command; line 126 "the fork lock's `branch`" does not say
  which checkout's lock; line 134 does not say what to do with a fork
  merge that was not a fast-forward; line 135 "on `dev`" gives no step
  when the main folder is on another branch.
- The cold reader handled pair reports in `.scratch/agent-reports/`
  correctly by moving them into the main checkout before unpair. The
  text does not tell it to; unpair's own refusal does ("move them out
  (for example into the main checkout)", `scripts/worktree_pair.py:797`).
  No change needed.

## Cold reader's answer, as returned

Role given: an agent in the main checkout, in the sandbox, asked to merge
`fix/870-tooltip-wrap` from the pair `tooltip-wrap`, whose
`.scratch/agent-reports/` holds three worker reports. It got the new text
of § Land it on dev (older route omitted) and § Remove it, and no intent.

> 1. Check that both worktrees are clean. [...] `git -C /home/daniel/Code/lulz/tbc-wt/tooltip-wrap status --porcelain`; `git -C /home/daniel/Code/lulz/tbc-wt/tooltip-wrap/vendor/tbc-new-fork status --porcelain`
> 2. Merge the fork side, or skip it. "Skip this when the pair has no fork commits." [...] `git -C vendor/tbc-new-fork branch --show-current` [...] `git -C vendor/tbc-new-fork merge <fork-branch>` [...] `git -C vendor/tbc-new-fork rev-parse HEAD`, and check that it equals the `commit` field in [the pair's lock].
> 3. Merge into `dev`. [...] From the main folder I would run `pnpm merge-to-dev fix/870-tooltip-wrap`, and wait for `merged fix/870-tooltip-wrap -> dev`.
> 4. Stop the pair's servers. "On Linux the process list is not read … so stop the pair's servers before you unpair." The text gives no command for this.
> 5. Unpair. From the main folder: `pnpm wt:unpair tooltip-wrap`.
> 6. Finish the unpair in the sandbox. If it stops with "Device or resource busy", I run `git worktree remove /home/daniel/Code/lulz/tbc-wt/tooltip-wrap` from the main folder, as the whole command. Then I run `pnpm wt:unpair tooltip-wrap` again.
>
> Actions I would leave out: `--check-only` [...]; making a fork branch with `switch -c` [...]; the older route; `--force` on the first unpair attempt.
>
> (a) When it is done: after `merged` prints and the pair is removed. I would tell the owner the new `dev` sha, that the pair is gone, and where the three reports went. [Earlier stops: main fork not on the lock branch; fork commit does not match the lock; a `merge-to-dev` check fails; the main folder is not on `dev`.]
>
> (b) That refusal matches "ignored files that pair setup did not write, such as `.scratch/` stage records." Unpair copies only `.scratch/agent-runs/`, so `--force` would delete the three reports. I would move them into `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/agent-reports/` [...]. Then I would rerun `pnpm wt:unpair tooltip-wrap` without `--force`.
>
> (c) Unclear: line 124 "Skip this when the pair has no fork commits"; "prints the fork lock's `branch`" (which lock); "When it prints another commit … take the older route below" (undo the fork merge?); "Main folder, on `dev`" (no step when on another branch); "Without `--force` it refuses when … ignored files" (whether this runs before the fork half is removed); "Commit everything on both branches" (fork may be detached).

Every changed sentence led to the intended action: the reader removes the
pair itself after `merged`, runs the sandbox finish as written, and does
not hand the job to the owner. Its (c) list is all unchanged text (§ Notes).
On its (c) item 5: `unsaved_work` runs for both halves before anything
is removed (`scripts/worktree_pair.py:899-907`, before `mark_unpair_started`
at 922).

## Check 2: files read

| File                                                              | Result                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AGENTS.md` § Commits and merges                                  | agrees: merge waits for the owner's ask; removal comes after it                                                                                                                                                                                      |
| `~/.claude/AGENTS.md` § Commits and merges                        | agrees                                                                                                                                                                                                                                               |
| `docs/workflow.md` § The loop, step 5                             | agrees                                                                                                                                                                                                                                               |
| `docs/agents/orchestration.md:59-61`                              | agrees: the owner's ask before `pnpm merge-to-dev`                                                                                                                                                                                                   |
| `docs/agents/parallel-phase-project.md:33-34`                     | IR2                                                                                                                                                                                                                                                  |
| `docs/agents/upstream-catch-up.md:319-325`                        | agrees: delete scratch files before unpair                                                                                                                                                                                                           |
| `docs/agents/paired-worktrees.md:248-257` (`wt:cleanup`)          | agrees: a different command, not used by the new text                                                                                                                                                                                                |
| `scripts/worktree_pair.py` `unpair` (853-937), `remove` (834-850) | agrees: on the busy error, `remove` does not refuse, prune cannot clear it, and line 931 refuses with "still registered"; the mark stays. A rerun with no folder and no registered worktree clears the mark and prints `nothing to remove` (874-877) |
| `scripts/merge_to_dev.py:485, 615`                                | agrees: both forms print `merged <branch> -> dev`                                                                                                                                                                                                    |
| `~/.claude_router/settings.json` `sandbox.excludedCommands`       | agrees: `git worktree prune`, `git worktree prune *`, `git worktree remove *`                                                                                                                                                                        |
| `~/.claude/settings.json`, `~/.claude_openrouter/settings.json`   | IR3                                                                                                                                                                                                                                                  |
| `~/.claude/hooks/agent-guard.py:94-107`                           | agrees: reads `git worktree list` to find allowed roots; no rule on worktree commands                                                                                                                                                                |
| `findmnt` in this session                                         | IR5                                                                                                                                                                                                                                                  |

`/doctor prompt-audit` was not run: a subagent cannot run slash commands.

## Trial status

No trial run (IR1). Old-text behaviour is on record in the caller's
account of 2026-11-08: the agent that merged `gate-pipe` left the pair
and gave the owner `pnpm wt:unpair gate-pipe` to run. No same-input
old-text run beside a new-text run exists.

A trial needs a real pair that existed when the session started, because
the busy error comes from the sandbox's mounts over the main checkout's
`.git/worktrees/<name>`; a temp clone does not reproduce it. This review
made none: `pnpm wt:pair` writes to the main checkout's `.git`, and the
caller barred changes in the main checkout.

Trial to run, on the next paired branch the owner asks to merge (or a
throwaway pair the owner makes with `pnpm wt:pair`), on the
"Claude + GLM workers" card, from the main checkout:

- Input: a fresh `general-task` (Opus) told only "the owner asks you to
  merge `<branch>` into `dev`; it lives in the pair `<name>`", with
  `docs/agents/paired-worktrees.md` at `f3235ae5`.
- Baseline: the same prompt with the file at `0dfb1c8f`
  (`git show 0dfb1c8f:docs/agents/paired-worktrees.md`). Expected: it
  leaves the pair in place and does not run `pnpm wt:unpair`. For a real
  merge, run the baseline as far as its reply after `merged`, so only one
  agent merges.
- New text, expected: after `merged <branch> -> dev`, it runs
  `pnpm wt:unpair <name>`, gets the busy error, runs
  `git worktree remove /home/daniel/Code/lulz/tbc-wt/<name>` alone, runs
  `pnpm wt:unpair <name>` again and sees `nothing to remove`.
- Pass when `git worktree list` in the main checkout and in
  `vendor/tbc-new-fork` no longer lists the pair,
  `ls /home/daniel/Code/lulz/tbc-wt/<name>` fails,
  `ls .git/tbc-wt-unpair/<name>` fails, and the owner ran nothing.

## Round 2: fix path, last round

Reviewed `0902943f..94c4a3c5`: `bdf558d7` (fixes for IR2 to IR5) and
`94c4a3c5` (§ Remove it rewritten after the trial). Line numbers below
are in `docs/agents/paired-worktrees.md` at `94c4a3c5`.

Each fixed finding's check was run again on the changed sentences:

- IR2 (check 2): `docs/agents/parallel-phase-project.md:34` now says
  "Remove the pair as `docs/agents/paired-worktrees.md` "Remove it"
  says". The two files now agree. Closed.
- IR3 (check 2): lines 222-224 name `sandbox.excludedCommands` of
  `~/.claude_router/settings.json`, which holds `git worktree remove *`
  (read in round 1). The claim is now exact. Closed.
- IR4 (check 1): line 221 "with nothing before or after it in the
  call". The cold reader ran the command alone and left out `cd`,
  `git -C`, `2>&1` and the `rc=` echo. Closed.
- IR5 (check 2): line 216 "The sandbox mounts over
  `.git/worktrees/<name>` folders" matches the `findmnt` output. Closed,
  with new finding IR6 in the same sentence.
- IR1 (check 3): see § Trial, round 2. Still open.

A second cold reader (`general-task`, Opus, no tools) got § Land it on
dev and § Remove it at `94c4a3c5` and two cases. Case A (first unpair
exits 0): it ran `pnpm wt:unpair tooltip-wrap` once and stopped, quoting
"only after this error". Case B (busy error): it ran
`git worktree remove /home/daniel/Code/lulz/tbc-wt/tooltip-wrap` alone in
its call, then `pnpm wt:unpair tooltip-wrap` again, from the main
checkout. Both are the intended actions. It read line 217-219 ("On
2026-11-08 it stopped for the pair `gate-pipe` ...") as "background, not
a rule". It noted that the text does not mention the `refused: a
worktree is still registered after removal` line; that line was already
in round 1's Notes.

### Findings, round 2

| ID  | Check  | file:line | Quoted text                                                                                                                 | What an agent does wrong                                                                                            | How it happens, and what it costs                                                                                         | Severity | Evidence                                              |
| --- | ------ | --------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- |
| IR6 | 1      | 216-217   | "The sandbox mounts over `.git/worktrees/<name>` folders, so it cannot delete them"                                         | None seen. "it" reads as the sandbox; the author means unpair (git).                                                | A reader has to work out what "it" is. Cost: a moment's confusion; no wrong action.                                       | minor    | Reading; the cold reader did not act on the sentence. |
| IR7 | rubric | 217-219   | "On 2026-11-08 it stopped for the pair `gate-pipe`, made hours before, and not for a pair made and removed within minutes." | None seen. The sentence tells the history of one run; the action rule is "Run unpair first; only after this error". | An agent might try to predict the error from the pair's age. The cold reader did not. Cost: words an agent does not need. | minor    | Cold reader: "This is background, not a rule."        |

Both are wording only. Removing the reason and history sentences, as the
assessor below suggests, removes both findings in place of fixing them.

### Trial, round 2

The coordinator's trial (reported to this reviewer, not observed by it):
a throwaway pair `unpair-trial` from `dev` `0dfb1c8f`; a fresh Opus
`general-task`, told it had just merged that branch and to read the two
sections at `bdf558d7`, ran `pnpm wt:unpair unpair-trial` from the main
checkout, rc=0, removed both halves, left no unpair mark, and kept the
branches. The busy error did not happen, so no agent ran the fallback.
The fallback calls ran by hand on `gate-pipe` on 2026-11-08 and worked.

Under the skill's check 3, this trial is partial, so IR1 stays open:

- No old-text run on the same input. The old-text behaviour on record is
  the `gate-pipe` merge, where the agent left the pair and gave the owner
  `pnpm wt:unpair gate-pipe`.
- It ran `bdf558d7`, not the current `94c4a3c5`. § Land it on dev, which
  holds the new rule, is the same in both; only § Remove it changed.
- No agent has run the fallback (`git worktree remove`, then a second
  unpair).

### Assessor's view (round limit)

One `general-task` agent (Opus) that neither wrote nor reviewed the
change answered the three questions in the round-limit rule. Its view,
with its sources:

- **Has something gone wrong?** No loop. The change is still +18 lines
  in `paired-worktrees.md` and one sentence in
  `parallel-phase-project.md` (`git diff --stat`). Round 1 found 5
  findings, round 2 found 2 minor ones. `94c4a3c5` added a history
  sentence (IR7) in place of the cause.
- **Would doing less fix it?** Yes, for § Remove it. Keep the trigger,
  the two calls and the "nothing before or after it" rule; drop the
  `findmnt` reason, the history sentence and "Run unpair first". Its
  suggested text, not trialled:

  > **When unpair stops with `Device or resource busy`** (the sandbox
  > cannot delete `.git/worktrees/<name>`), finish from the main
  > checkout. Run `git worktree remove <pair path>` with nothing before
  > or after it in the call; `sandbox.excludedCommands` in
  > `~/.claude_router/settings.json` lets that exact text run outside
  > the sandbox. Then run `pnpm wt:unpair <name>` again to delete the
  > unpair mark.

  Reviewer's note: this text drops "only after this error". The heading
  "When unpair stops ..." carries the condition, but the trial agent
  asked exactly that question, so keep a few words such as "Only then,
  finish from the main checkout".

- **Would another round settle it?** The wording findings, yes. IR1
  closes only with a same-input old-text and new-text run of the current
  text, which needs throwaway pairs made before a new session starts and
  two Opus agents. In its view that costs more than the risk: if the
  fallback fails, the owner removes the pair by hand, as today. It
  recommends recording IR1 as `defer` with an open ticket for a trial on
  the next real paired merge, if the owner accepts that.

## Open

IR1 blocks until the owner rules. IR6 and IR7 are wording for the author.
Their rows below say `pending`, a word `scripts/check_merge_ready.py`
rejects, so `pnpm merge-to-dev` fails on this file until each row gets
`fixed`, `wontfix` or `defer` with a ticket path. IR1's row takes
`wontfix` with the owner's words if the owner approves without more
trial, or `defer` with a ticket path if the owner wants the trial on the
next real merge.

## Disposition

| ID  | Axis                        | Disposition | Ticket / note                                                                                                                                                   |
| --- | --------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| IR1 | Instruction review, round 1 | pending     | No full trial: the new text ran once (`bdf558d7`, `unpair-trial`, fallback not reached), with no old-text run beside it. Waits for the owner's ruling (§ Open). |
| IR2 | Instruction review, round 1 | fixed       | `bdf558d7`: `parallel-phase-project.md:34` points to "Remove it".                                                                                               |
| IR3 | Instruction review, round 1 | fixed       | `bdf558d7`: the text names `sandbox.excludedCommands` of `~/.claude_router/settings.json`.                                                                      |
| IR4 | Instruction review, round 1 | fixed       | `bdf558d7`: "with nothing before or after it in the call".                                                                                                      |
| IR5 | Instruction review, round 1 | fixed       | `bdf558d7`: "mounts over ... so it cannot delete them".                                                                                                         |
| IR6 | Instruction review, round 2 | pending     | "so it cannot delete them": name unpair, or drop the sentence (§ Assessor's view).                                                                              |
| IR7 | Instruction review, round 2 | pending     | Drop the `gate-pipe` history sentence; keep "only after this error".                                                                                            |
