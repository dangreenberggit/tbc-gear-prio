# Pre-merge review — chore/merge-hurdles

Reviewed range: `0bca77ec3ea5a692574273ccf582935de87a14bb..5ce0825b1466b9a17567c61b3ada5fb13aefae30`

Reviewed range: `5ce0825b1466b9a17567c61b3ada5fb13aefae30..f6005cf8a31e555b64140e473ed7dd74489afaa5`

Reviewed range: `f6005cf8a31e555b64140e473ed7dd74489afaa5..309b910e82c3638b26d758e5e0d439ef84cc2e90`

Reviewed range: `309b910e82c3638b26d758e5e0d439ef84cc2e90..e61184ea0dd138f2118ac1a69b95182bf174d07e`

Dispatch note: `python scripts/check_merge_ready.py --product-files`
printed `package.json`, `scripts/check_merge_ready.py`,
`scripts/check_merge_to_dev.py`, `scripts/check_worktree_cleanup.py`,
`scripts/merge_to_dev.py` and `scripts/worktree_cleanup.py`; the three
axes read those files only. The other changed files
(`docs/agents/issue-tracker.md`, `docs/agents/paired-worktrees.md`, the
tickets, `NEXT` and `map.md`) got `instruction-review`, full path,
recorded below. `git diff --shortstat dev...HEAD` gave 14 files, 1017
insertions, 20 deletions, so the full axes ran, not the small-change
lane. Each axis was a fresh `general-task` (Opus) subagent; `codex` is
not on `PATH`. The domain axis was skipped: the diff holds no TBC, WCL or
wowsims facts, only merge and worktree tooling.

## Adversarial

- **A1 (high).** `scripts/worktree_cleanup.py`: a git repo nested under
  `.scratch/` (a nested worktree, or an embedded clone as `.gitignore`
  places under `.scratch/`) was listed by `git ls-files --others` as one
  folder path, skipped, and deleted by `--remove` with its uncommitted
  files and no archive copy. Reproduced in a throwaway repo.
- **A2 (medium).** A worktree at `dev`'s tip with no commits of its own
  counts as merged, so a live session writing reports there loses any
  report written after the script read the worktree. Reproduced by
  writing a report between the read and the removal.
- **A3 (low).** Work under `vendor/` other than pair setup's folders was
  deleted: `is_disposable("vendor/")` is true and the script did not call
  `worktree_pair.unknown_vendor_folders`.
- **A4 (low, fails safe).** `fork_pin_problem` refused with "would
  conflict" when the branch and `dev` wrote the same lock, which git
  merges with no conflict.

No defect found in the ticket-number check. All three check scripts
passed.

## Domain

Skipped (see the dispatch note).

## Standards + Spec

**Standards:** no documented standard broken. Five judgement calls,
recorded under § Code quality: CQ1 to CQ5.

**Spec:** all three tickets' "Done when" met. Three points:

- **SP1.** The brief says "If a doc tells agents to keep the higher
  `NEXT` on a conflict, correct it." The gitignored handoff
  `/home/daniel/Code/lulz/tbc-gear-prio/.scratch/handoffs/2026-11-06-452-chain-A.md`
  still says "A merge that conflicts on `NEXT` keeps the highest value."
  This session cannot write the main checkout. The D and E handoffs in
  the T3 worktrees were corrected.
- **SP2.** By default the list shows each report folder with a file
  count; file names appear with `--files`.
- **SP3.** `--remove` archives reports only from the worktrees it
  removes.

## Instruction review (tooling files)

Full path: the `NEXT` paragraph in `docs/agents/issue-tracker.md` is a
new rule.

**Check 1 (cold readers, one per doc).**

- **IR1.** `docs/agents/paired-worktrees.md` opened the fork-pin part
  with "When `dev` has a new fork pin, take the older route below", with
  no condition; a reader in a plain worktree would try to unpair a pair
  it does not have. Reworded to "When `dev` has a new fork pin and step
  3 refuses for it". A second cold reader, given the whole "Land it on
  dev" section after the fix, took the plain route for a plain worktree
  (with and without a new `commit`) and the older route for a pair.
- **IR2.** `docs/agents/issue-tracker.md`: "Renumber ... from `dev`'s
  `NEXT`" could read as "after it", and "update every reference to the
  old number" also catches `dev`'s ticket of that number. Reworded to
  "starting at the number in `dev`'s `NEXT`" and "each reference the
  branch made ... a reference on `dev` means `dev`'s ticket and stays".
- The issue-tracker reader's "blocking" point (the section ends
  mid-sentence) came from where the excerpt was cut, not from the doc.

**Check 2 (clashes).** Files read: `docs/agents/upstream-catch-up.md`,
`docs/agents/parallel-phase-project.md`, `docs/agents/known-traps.md`,
`docs/agents/pre-merge-review-project.md`, `AGENTS.md`, and every
`.claude/`, `.agents/` and `~/.claude/skills` file that names `NEXT`
(`git grep` found none outside `issue-tracker.md`). All agree except:

- **IR3.** `docs/agents/upstream-catch-up.md:485` said the merge refuses
  "if `dev`'s fork lock moved"; after 833 it refuses only for a new
  `commit`. Reworded.

**Check 3 (trial run).** Two pairs of runs in throwaway repos where the
branch filed tickets 5 and 6 and `dev` filed its own 5, stopped on the
`NEXT` conflict:

- Without a handoff: the new text renumbered the branch's tickets to 6
  and 7, fixed both references and set `NEXT` to 8. The old-text run
  proposed the same fix but did not commit (it ran as a type that may not
  write git), so it is not a full baseline.
- With a handoff saying "A merge that conflicts on `NEXT` keeps the
  highest value" (the 452 handoffs' wording): the new-text run quoted the
  rule over the handoff and renumbered from `dev`'s `NEXT`. The old-text
  run quoted the handoff, "kept the highest value, 7", then renamed one
  ticket by its own judgement. Both runs ended with unique numbers; the
  new text changed the reasoning the agent quoted, not the end state, on
  this input. The 832 duplicates came from an agent that kept the higher
  value and renamed nothing, which this trial did not reproduce.

**Notes (unchanged sentences).** The cold readers also found unclear
sentences that this branch did not change, in "Land it on dev": step 1's
check assumes a fork, "The pair stays in place" against the older
route's "remove the pair", "It has not yet merged into the real `dev`",
an unnamed "the clone", and no step back to `dev`. Filed as ticket 836.

## Code quality

| ID  | File                           | Row                                                                     |
| --- | ------------------------------ | ----------------------------------------------------------------------- |
| CQ1 | `scripts/worktree_cleanup.py`  | Own `git()`/`git_ok()` beside `worktree_pair`'s                         |
| CQ2 | `scripts/check_merge_ready.py` | Symlink rule written twice; `carry_rel` line repeated                   |
| CQ3 | three check scripts            | Throwaway-repo setup repeated in each check script                      |
| CQ4 | `scripts/worktree_cleanup.py`  | `T3_DIR` and `REPORTS` hold a path part and a prefix, not what they say |
| CQ5 | `scripts/merge_to_dev.py`      | `fork_pin_problem` takes five arguments that travel together            |

## Focused check (round 2)

One fresh `general-task` (Opus) agent over
`5ce0825b..f6005cf8`. No fork range: the branch never moves
`data/wowsims-fork.lock.json` (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
exits 0).

1. **Conditions: pass.** Every commit names its findings (A1-A3, A4,
   IR1-IR3, CQ2 and CQ4) or only edits the review file and tickets.
   Every changed code line is at a place a fixed finding cites.
2. **Fixes change only what each finding asks: pass**, with two
   wording-only extras: a three-line comment above `git()` in
   `scripts/worktree_cleanup.py` that explains CQ1, and two reworded
   sentences next to IR1 in `docs/agents/paired-worktrees.md`.
3. **Tests assert their findings: pass** for A1, A3, A4 and the A2
   session test; each failed with its fix reverted in a copy. The re-read
   after archiving and the own-process exclusion have no test.
4. **Touched tests pass:** `check_worktree_cleanup.py` (4),
   `check_merge_to_dev.py` (28), `check_merge_ready.py --self-test` (45),
   all rc 0.

Findings, all in the A2 fix (`scripts/worktree_cleanup.py`):

- **R2-1 (medium).** `processes_in` sees only the caller's PID namespace.
  Inside Claude Code's sandboxed Bash, `/proc` held 5 processes, so it
  returns no process for every worktree and the session guard is off with
  no message. The test passes because its `sleep` runs in the same
  namespace.
- **R2-2 (low to medium).** `own_process_tree` leaves out the processes
  that started the script, so a session in a merged worktree that runs
  `pnpm -C <main checkout> wt:cleanup --remove` can have its own worktree
  removed. Reproduced in a copy. No test.
- **R2-3 (low).** The re-read after archiving compares report names only;
  a report rewritten in place after the copy loses its new text.
  Reproduced in a copy. No test. Suggested fix: run `archive_problem`
  again on the re-read worktree.
- **R2-4 (hypothesis, untested).** A Claude Code subagent with
  `isolation: "worktree"` may run inside its parent's process, so no
  process has its folder in that worktree between Bash calls.

Round 2 is the last round, and it reported findings that are not
bookkeeping, so the review stopped here with these open; step 4 (the merge
check) was not run. An assessor that neither wrote nor reviewed the work
judged that the process check is a guess no fix can make reliable, and
recommended deleting it and having `--remove` take worktree names. The
owner chose that on 2026-11-07: "sure 1 is fine".

## Focused check (round 3)

The owner chose a further round. Range `f6005cf8..309b910e`: `2e601013`
(review file only) and `309b910e`, which deletes `processes_in`,
`own_process_tree` and the re-read after archiving, and makes `--remove`
act only on named worktrees (folder name, or path when two share one).
An unknown or shared name stops the run before anything changes; list
mode prints a ready-to-paste `pnpm wt:cleanup --remove <names>` line.
One fresh `general-task` (Opus) agent checked it.

1. **Conditions: pass.** `309b910e` names R2-1 to R2-4; every changed
   code line is in the removed check, the remove loop, name handling or
   the list output.
2. **Only what was asked: pass.** The re-read went with the process
   check; R2-3 is about it, and naming a worktree is the owner's statement
   that no session uses it.
3. **Tests assert their findings: pass.** Five mutants in copies (names
   ignored, bad names accepted, first match of a shared name taken, the
   paste line using folder names only, no paste line) each fail
   `check_worktree_cleanup.py`.
4. **Touched tests pass:** `check_worktree_cleanup.py` (5 checks) and
   `pnpm verify` with `TBC_VERIFY_WITHOUT_FORK=1`, both rc 0.

It found no way for `--remove` to copy or remove a worktree nobody named,
or one `keep_reason` keeps. Findings, all in `scripts/worktree_cleanup.py`:

- **R3-F1 (low).** List mode run with `--include-t3` puts T3 worktrees
  in the paste line without the flag, so pasting it keeps them, with
  rc 0 and "keeps it: T3 worktree" for each.
- **R3-F2 (low).** A path that differs from a worktree's only in letter
  case matches it on Linux, through `worktree_pair.norm_path`, which
  lower-cases for Windows.
- **R3-F3 (low, loud).** The paste line does not quote names; a path
  with a space breaks it, and the pasted run refuses.
- **R3-F4 (low).** Naming one worktree twice prints "removed 1 of 2".
- **R3-F5 (low, loud).** A relative path with `..` is refused, because
  `Path.absolute()` does not resolve `..`.

A cold reader of the reworded "Other worktrees" paragraph in
`docs/agents/paired-worktrees.md` listed first and then asked the owner
which worktrees to remove, as intended. Its wording points (what a name
is, that dirty or unmerged worktrees stay even when named, that T3
worktrees are left out of the paste line, and who picks the names) were
fixed in the paragraph.

Round 3 is again a last round and reported findings that are not
bookkeeping, so the review stopped there. An assessor judged that a
12-line rewrite of the name handling settles all five, and that a narrow
check of it would settle them where a full round would only find more.
The owner chose that on 2026-11-07: "A sounds ok".

## Focused check (round 4)

The owner chose a further, narrow round. Range `309b910e..e61184ea`:
`dfcd3c56` (review file and doc wording), `49ef9d2a` (names compare as
`Path.resolve()` on both sides with no lower-casing, relative to pnpm's
`INIT_CWD` when set; a repeated name counts once; the paste line quotes
names with `shlex.quote` and carries `--include-t3`; one test per
finding) and `e61184ea` (the tests drop an inherited `INIT_CWD`, which
had made `pnpm verify` fail). One fresh `general-task` (Opus) agent
checked it.

1. **Conditions: pass.** Every changed code line is at a place R3-F1 to
   R3-F5 cite.
2. **Probes: pass.** Each of the five findings, re-run in a throwaway
   repo, now behaves correctly; a pasted line with `'sp ace'` and
   `--include-t3` removed both worktrees through `bash -c`. The agent
   also confirmed in a scratch package that `pnpm` runs a script from the
   package root and sets `INIT_CWD` to the folder it was typed in.
3. **Tests assert their findings: pass.** Six mutants in copies (one per
   fix, two for R3-F5) each fail `check_worktree_cleanup.py`.
4. **Touched tests pass:** `check_worktree_cleanup.py` (6 checks), rc 0;
   `pnpm verify` with `TBC_VERIFY_WITHOUT_FORK=1` rc 0 at `e61184ea`.

Findings: none.

## Summary

Round 1 found one data-loss bug in `pnpm wt:cleanup --remove` (A1) and
three smaller holes (A2-A4), fixed with tests in `578cec41` and
`a823168e`; the instruction review's wording points are fixed in
`3b4d2002` (IR1-IR3). Round 2 found the A2 fix, a process scan, could
not tell that a session still uses a worktree (R2-1 to R2-4); on the
owner's choice `309b910e` deleted it and `--remove` now acts only on
named worktrees. Round 3 found five small name-handling problems
(R3-F1 to R3-F5), fixed in `49ef9d2a` and `e61184ea`; round 4 found
none.

Tickets: filed 4 (833-836), closed 3 (833-835): `git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
shows four `A` rows, and three added `Status: closed` lines. Ticket 836
stays open.

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                                     |
| --- | ------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial        | fixed       | `578cec41`: a `.scratch/` folder path from `ls-files` (a nested repo) now keeps the worktree; test `nested`                                                       |
| A2  | Adversarial        | fixed       | Superseded in round 3: `309b910e` removed the process scan of `578cec41`; `--remove` acts only on worktrees the owner names, the owner's choice of 2026-11-07     |
| A3  | Adversarial        | fixed       | `578cec41`: unknown `vendor/` folders keep the worktree; test `vendor`                                                                                            |
| A4  | Adversarial        | fixed       | `a823168e`: a branch lock identical to dev's is not refused; `check_fork_pin_refusal_skips_a_lock_identical_to_devs`                                              |
| SP1 | Spec               | wontfix     | Gitignored file in the main checkout, which this session cannot write; the owner's one-line command is in the session's final reply                               |
| SP2 | Spec               | wontfix     | One worktree holds 497 report files; names by default would bury the list. `--files` prints every name                                                            |
| SP3 | Spec               | wontfix     | A kept worktree still holds its reports, so there is nothing to save; copying them would duplicate them                                                           |
| IR1 | Instruction review | fixed       | `3b4d2002`: the fork-pin route opens with "and step 3 refuses for it"; re-read by a second cold reader                                                            |
| IR2 | Instruction review | fixed       | `3b4d2002`: "starting at the number in `dev`'s `NEXT`"; references the branch made; the trial run with a handoff read the fixed text                              |
| IR3 | Instruction review | fixed       | `3b4d2002`: `upstream-catch-up.md` says "pins a new `commit`"                                                                                                     |
| IR4 | Instruction review | defer       | `.scratch/carry-forward/issues/836-land-it-on-dev-reads-as-pair-only.md` — unclear sentences this branch did not change                                           |
| CQ1 | Standards          | wontfix     | `worktree_pair.git` raises `Refusal`, which this script does not catch, and decodes without `errors=`; reuse would turn the `FAIL: git ...` line into a traceback |
| CQ2 | Standards          | fixed       | Code-quality commit: `CARRY_REL` and `GIT_SYMLINK_MODE` constants in `scripts/check_merge_ready.py`                                                               |
| CQ3 | Standards          | wontfix     | One throwaway-repo helper per check script is the repo's convention; a shared module would make three check scripts depend on it                                  |
| CQ4 | Standards          | fixed       | Code-quality commit: `T3_PATH_PART` and `REPORTS_PREFIX` in `scripts/worktree_cleanup.py`                                                                         |
| CQ5 | Standards          | wontfix     | One caller already holds the five values as locals; a bundle type adds code for one call                                                                          |

## Disposition (rounds 2 to 4)

| ID    | Axis          | Disposition | Ticket / note                                                                                             |
| ----- | ------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| R2-1  | Focused check | fixed       | `309b910e`: the process scan is gone; `--remove` acts only on named worktrees                             |
| R2-2  | Focused check | fixed       | `309b910e`: `own_process_tree` is gone with the process scan                                              |
| R2-3  | Focused check | fixed       | `309b910e`: the re-read is gone; naming a worktree is the owner's statement that no session writes there  |
| R2-4  | Focused check | fixed       | `309b910e`: no process check is left for a worktree subagent to slip past                                 |
| R3-F1 | Focused check | fixed       | `49ef9d2a`: the paste line carries `--include-t3`; the list-mode check pastes it and the T3 worktree goes |
| R3-F2 | Focused check | fixed       | `49ef9d2a`: names compare as resolved paths, case-sensitive; `check_name_forms`                           |
| R3-F3 | Focused check | fixed       | `49ef9d2a`: `shlex.quote` in the paste line; the `sp ace` worktree in the checks                          |
| R3-F4 | Focused check | fixed       | `49ef9d2a`: a repeated name counts once; `check_name_forms`                                               |
| R3-F5 | Focused check | fixed       | `49ef9d2a`, `e61184ea`: relative names resolve from pnpm's `INIT_CWD`; `check_name_forms`                 |
