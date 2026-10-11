# Pre-merge review — fix/unpair-rerun

Round cap: the session's instruction for this branch was "at most 2
rounds"; when round 2 still finds defects, the review stops and reports
them as open. The skill's own round limit (pre-merge-review, "Round limit",
as merged to `dev` at 005fa7c6) is also two rounds.

Reviewed range: `05955d62268a45984a4e2032cadc6529f5f2ab3e..ff02939ecf98989cf0717e3d94091b00c9782ba8`

Reviewed range: `ff02939ecf98989cf0717e3d94091b00c9782ba8..bc5d3d087433ecea668bba005a8dbd06ed63c0ce`

Dispatch (round 1): `codex` is not on `PATH` (`which codex`), so each axis
ran as a fresh `general-task` agent on Opus (review lane). Round 1 ran on
the skill text from before `dev` 005fa7c6 with all axes, domain included.
The small-change lane does not apply: `git diff --shortstat 05955d62...ff02939e`
reports 3 files changed, 312 insertions, 21 deletions, over the 150-line
limit.

## Adversarial

No blockers. A registered half always gets the full work checks again, so a
fresh mark cannot let a rerun delete work in it. Findings:

- **A1 (minor)** The mark is written before steps that can refuse without
  removing anything (git refusing, the link guard, the run-log copy), and
  it then stays. While it stays, a plain rerun deletes an unregistered
  folder at a pair path after only the link check, for example a separate
  fork clone with unpushed commits. From reading the code; not run.
- **A2 (minor)** The failed-delete message always says the rerun finishes
  "without --force". After a `--force` run that stopped on the fork while
  the main half was dirty, a plain rerun refuses and asks for `--force`.
- **A3 (minor)** The process check missed Git Bash spelling
  (`/c/Users/...`), which Claude Code's Bash tool uses, and doubled
  backslashes. Probe script in the reviewer's scratchpad.
- **A4 (low)** A reused process id in the parent walk could exclude an
  unrelated holder.
- **A5 (minor, test theatre)** The check named "deleted only with force or
  a mark" tests only the `force or started` truth table; nothing automated
  covers when the mark is kept or cleared.
- **A6 (low)** On Linux and macOS an open file does not stop a delete, so
  "A process still has them open" names the wrong cause there.
- **A7 (note)** Elevated processes probably read with an empty program
  path and command line from a shell that is not elevated, so the check
  misses them. Hypothesis, untested.

## Domain

**Domain: clean.** The diff changes only `scripts/worktree_pair.py`,
`scripts/check_worktree_pair.py` and `docs/agents/paired-worktrees.md`. A
grep of the changed lines for game, WCL and wowsims terms matched only the
backend program name `wowsimtbc.exe`, used as an example process.

## Standards + Spec

### Standards

- **S1 (minor)** The subject of c7722f16 is 51 characters; the commit rules
  allow 50.
- **S2 (low)** Both commit bodies state causes (the 2026-10-10 incident,
  the NameError) with no command to re-run (AGENTS.md "Durable claims").
- **S3 (nit)** ff02939e joins a code fix and a doc change.
- **S4 (nit)** The `describe_processes` docstring says what, not why.
- **S5 (low, Mysterious Name)** `left_in`, `os_said`, `said`, `first`.
- **S6 (low, tramp parameter)** The rerun hint is passed through `remove`
  into `delete_folder` only to build a message.
- **S7 (nit, Duplicated Code)** Two messages repeat the rerun instruction.
- **S8 (nit, Primitive Obsession)** Process rows are `list[dict]` with
  string keys.
- **S9 (nit, Speculative Generality)** `left_in(limit=5)`: no caller passes
  `limit`.
- **S10 (note)** No banned words in the doc change.

### Spec

The diff does the four things the task asked. Findings:

- **P1 (minor)** c7722f16 holds three slices in one commit, and its
  process refusal crashed in the first live run (fixed in ff02939e).
- **P2 (note)** `--force` skips the process refusal; not asked for, but
  documented.
- **P3 (nit)** Two refactors not asked for: `LONG_PREFIX` and the
  "deleting what git left of" wording.
- **P4 (low)** The failed-delete message says a process holds the files
  for every failure, not only a lock.
- **P5 (low)** The mark text and the doc say the work checks passed, also
  on a `--force` run, which skips them.

## Code quality

| ID  | Row                                                     |
| --- | ------------------------------------------------------- |
| S4  | `describe_processes` docstring says what, not why       |
| S5  | vague names in `delete_folder` / `left_in`              |
| S6  | rerun hint passed through `remove` into `delete_folder` |
| S7  | rerun instruction repeated in two messages              |
| S8  | process rows typed as bare `dict`                       |
| S9  | unused `limit` parameter on `left_in`                   |

## Live tests

All on 2026-10-10, on throwaway pairs made with
`pnpm wt:pair <name> test/<name> --fork-detached -b`, running the branch's
script as `python C:\Users\dgree\Code\lulz\tbc-wt\unpair-fix\scripts\worktree_pair.py unpair <name>`
from the main checkout.

1. **Process check refuses before removing anything (code at ff02939e).**
   With `tsc.exe` from the pair's fork `node_modules` running in watch mode,
   unpair refused, listing pid 68204 and its path, printed "Nothing was
   removed", and wrote no mark; both worktrees were still listed. The first
   attempt at c7722f16 crashed with a NameError in this message (fixed in
   ff02939e, finding P1).
2. **The incident, reproduced (code at ff02939e, again at 84ebc0e7).** A
   PowerShell process held the fork's `tsc.exe` open, with the path passed in
   an environment variable so its command line did not name the pair. A
   plain unpair printed git's "failed to delete ... Invalid argument", left
   the fork unregistered and half-deleted, kept the mark, and named the held
   file with "The process cannot access the file because it is being used by
   another process". The script from `dev` then refused the plain rerun with
   the incident's message ("is not a worktree of ... rerun with --force").
   After the holder was stopped, the branch's script, rerun without
   `--force`, deleted the fork leftover, removed the main worktree, deleted
   the mark, and printed "removed unpair-probe". At 84ebc0e7 the run
   repeated on pair `unpair-probe2`, with the same result and the mark text
   "after its work checks passed".
3. **An unregistered folder with no mark is refused.** A hand-made
   `tbc-wt/unpair-stray/vendor/tbc-new-fork/work.txt` was refused with "no
   earlier unpair of this pair started removing it"; the file was kept.
4. **The process check on live rows (84ebc0e7).** With a `tsc.exe` from the
   `unpair-fix` pair's fork and a Git Bash
   `bash -c "cd /c/Users/dgree/Code/lulz/tbc-wt/unpair-fix && sleep 60"`
   running, `processes_using` on `running_processes()` listed the tsc and
   both bash processes (the `binash.exe` launcher and the
   `usrinash.exe` it starts). Only the check was called; no unpair ran
   on that pair.

Every test process was stopped afterwards, and the test pairs and their
branches `test/unpair-probe` and `test/unpair-probe2` were removed; `git
worktree list` in both repos lists only `tbc-wt/unpair-fix` under
`tbc-wt`.

## Summary

Round 1 found no blocker. A1 (a mark left by a run that removed nothing)
was the one data-loss risk and is fixed in 7d98e832, with A2-A7, P4 and P5.
The code-quality pass (84ebc0e7) fixed S4, S5, S7, S8 and S9 and left S6,
now ticket 601. Commits before round 2, from `git log --oneline --first-parent ff02939e..HEAD`:
f7570bc8 (merge of `dev` 005fa7c6, ordered by the session; `git show --cc
f7570bc8` has no conflict hunks), 7d98e832, 84ebc0e7.

ROUND2_SUMMARY

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                  |
| --- | ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | 7d98e832: a failed run keeps the mark only while a half is unregistered (`mark_still_needed`); a folder with its own `.git` folder is refused even with a mark |
| A2  | Adversarial | fixed       | 7d98e832: the rerun command keeps `--force` when the run had it                                                                                                |
| A3  | Adversarial | fixed       | 7d98e832: Git Bash `/c/` paths and doubled backslashes are read; live test 4                                                                                   |
| A4  | Adversarial | fixed       | 7d98e832: a parent counts as a starter only when created before its child                                                                                      |
| A5  | Adversarial | fixed       | 7d98e832: `check_failed_unpair_keeps_its_mark_only_for_an_unregistered_half`; the order of steps is covered by live tests 1-3                                  |
| A6  | Adversarial | fixed       | 7d98e832: the message names a process only when the delete error says the file is in use                                                                       |
| A7  | Adversarial | fixed       | 7d98e832: documented as a hypothesis in `processes_using` and paired-worktrees.md                                                                              |
| S1  | Standards   | wontfix     | c7722f16's subject is 51 characters; fixing it means rewriting reviewed history                                                                                |
| S2  | Standards   | wontfix     | the incident is the owner's report in the task; the reproduction and the NameError run are recorded under Live tests here                                      |
| S3  | Standards   | wontfix     | no repo rule against it; the two parts are one fix and its doc                                                                                                 |
| S4  | Standards   | fixed       | 84ebc0e7                                                                                                                                                       |
| S5  | Standards   | fixed       | 84ebc0e7                                                                                                                                                       |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/601-unpair-rerun-hint-passed-through-remove.md` — the pass found no simpler structure that keeps the check                      |
| S7  | Standards   | fixed       | 84ebc0e7: the rerun command is built once                                                                                                                      |
| S8  | Standards   | fixed       | 84ebc0e7: `ProcessRow` TypedDict                                                                                                                               |
| S9  | Standards   | fixed       | 84ebc0e7                                                                                                                                                       |
| S10 | Standards   | wontfix     | not a defect: no banned words found                                                                                                                            |
| P1  | Spec        | wontfix     | history; the crash was found by the live test and fixed in ff02939e                                                                                            |
| P2  | Spec        | wontfix     | not a defect: `--force` already means "remove anyway", and the doc says it skips this check                                                                    |
| P3  | Spec        | wontfix     | harmless refactors inside the changed function                                                                                                                 |
| P4  | Spec        | fixed       | 7d98e832, with A6                                                                                                                                              |
| P5  | Spec        | fixed       | 7d98e832: the mark says when `--force` skipped the checks; the doc says so too                                                                                 |
