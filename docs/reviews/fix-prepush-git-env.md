# Pre-merge review — fix/prepush-git-env

Reviewed range: `acbc1033561501b7f451f7f67d671da030049e7b..ccf05490186b694a66e99dcd9426de9b466dbf8d`

Dispatch note (round 1): `python scripts/check_merge_ready.py --product-files`
printed `.githooks/pre-push`, `package.json`, `scripts/check_gate_git_env.py`,
`scripts/check_merge_ready.py` and `scripts/check_worktree_pair.py`, so the
branch is mixed. The axes reviewed those five files. `instruction-review`
(one `general-task` Opus agent, full path) reviewed the other two:
`.scratch/carry-forward/issues/740-pre-push-from-a-worktree-runs-gate-git-on-the-real-repo.md`
(now 742) and `.scratch/carry-forward/issues/NEXT`. Not the small-change
lane: `git diff --shortstat acbc1033...ccf05490` gave
`7 files changed, 233 insertions(+), 2 deletions(-)`, above both limits.
`codex` is not on PATH, so each axis ran as a fresh `general-task` agent on
Opus. Domain axis skipped: the diff has no TBC, WCL or wowsims content.

## Adversarial

The fix holds. The reviewer pushed from a linked worktree of a throwaway
repo with a stub `pnpm` (git 2.34.1, `/bin/sh` is dash): the old hook
passed `GIT_DIR`, `GIT_PREFIX`, `GIT_EXEC_PATH` and `GIT_CONFIG_PARAMETERS`
to pnpm; the new hook passes only `GIT_EXEC_PATH` and `GIT_CONFIG*`. Putting
the bug back one part at a time (each script's scrub, the hook, a hook that
also drops `GIT_CONFIG*`) made the gate fail each time. The gate deletes
every `GIT_*` before its own first git call, so it cannot damage a repo when
run from the hook.

- **A1** `scripts/check_gate_git_env.py:37`, `:102`: the gate checked only 4
  of the 16 names `git rev-parse --local-env-vars` lists, and ran the
  scripts with only `GIT_DIR` set, so a narrower fix would also pass.
  Code quality.
- **A2** `package.json:15`: `&&pnpm run typecheck` is missing a space. Runs
  correctly. Code quality.
- **A3** `package.json:15`: both scripts now run twice in each verify (about
  7 s more). Code quality.

## Domain

Skipped: no game-domain content (dispatch note).

## Standards + Spec

Run as the `code-review` skill, unchanged.

- **S1** `package.json:15`: the same missing space as A2. Code quality.
- **S2** the two-line `GIT_*` scrub is now in three scripts, plus two copies
  in `check_merge_to_dev.py`. Code quality.
- **S3** the hook keeps `GIT_CONFIG*` and says why; the scripts drop it with
  no comment saying why that is safe. Code quality.
- **S4** the step name `gate-git-env:check` and its first place in
  `verify:steps` differ from the `*:unit:check` peers. Code quality.

**Spec:** P1 is the same missing space as S1. Otherwise clean: the hook,
both scrubs and the wired gate match ticket 742's "Done when" list and the
request.

## Instruction review (tickets)

- **I1** ticket number 740 was also taken by `chore/pnpm-12.16.1`, which
  merged into `dev` (b64bf6cd) during this review. Bookkeeping.
- **I2** the ticket names the read-only `.git/config.lock` in the main
  checkout, a real defect with no ticket of its own. Pre-existing.
- **I3** "safe however they are called" in "Done when" says more than the
  fix does. Bookkeeping.

## Code quality

| ID  | Row                                                                               |
| --- | --------------------------------------------------------------------------------- |
| A1  | Gate derives the hook's list from `--local-env-vars`; scripts run with three vars |
| A2  | Missing space in `verify:steps` (same as S1, P1)                                  |
| A3  | Both scripts run twice per verify                                                 |
| S1  | Missing space in `verify:steps`                                                   |
| S2  | Duplicated two-line `GIT_*` scrub                                                 |
| S3  | No why-comment on dropping `GIT_CONFIG*` in the scripts                           |
| S4  | Step name and place differ from peers                                             |

## Summary

Round 1 found no data loss, silent wrong result or loud failure in this
branch's code. Fixes after round 1: `5bf2b6a3` (I1, I3, and ticket 743 for
I2) and the code-quality pass `4e51d757` (S1/A2/P1, A1, S3). Between them,
`ce9d8bb4` merges `dev` (b64bf6cd, the reviewed pnpm 12 branch) into this
branch; its only conflict, `NEXT`, took dev's side. After the fixes,
`TBC_VERIFY_WITHOUT_FORK=1 pnpm verify` gave `verify rc=0`,
`gates: 1345 ran, 224 skipped`.

## Disposition

| ID  | Axis               | Disposition | Ticket / note                                                                                                                                    |
| --- | ------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial        | fixed       | 4e51d757: the hook check reads its list from `git rev-parse --local-env-vars`; the script runs also set GIT_WORK_TREE and GIT_INDEX_FILE         |
| A2  | Adversarial        | fixed       | 4e51d757 (same as S1)                                                                                                                            |
| A3  | Adversarial        | wontfix     | About 7 s on a verify of several minutes; the plain runs keep each script's full failure output, and the gate must run them under hook variables |
| S1  | Standards          | fixed       | 4e51d757                                                                                                                                         |
| S2  | Standards          | wontfix     | Two lines per copy; a shared module would add an import between standalone check scripts that today import only the module they test             |
| S3  | Standards          | fixed       | 4e51d757: comments say the checks pass without the sandbox's git settings, as in check_merge_to_dev.py                                           |
| S4  | Standards          | wontfix     | First on purpose, so a regression fails before the plain runs of both scripts later in the chain; it checks gates, not one unit                  |
| P1  | Spec               | fixed       | 4e51d757 (same as S1)                                                                                                                            |
| I1  | Instruction review | fixed       | 5bf2b6a3: ticket renumbered 742, NEXT 744, code comments say ticket 742                                                                          |
| I2  | Instruction review | defer       | .scratch/carry-forward/issues/743-read-only-config-lock-blocks-git-config-writes.md — filed open                                                 |
| I3  | Instruction review | fixed       | 5bf2b6a3: the Done-when line names `main()` and `self_test()`                                                                                    |

Reviewed range: `ccf05490186b694a66e99dcd9426de9b466dbf8d..4e51d757c164aed0fde9ebe1cafbd4ae3a2171c3`

## Focused check (round 2)

One fresh `general-task` agent on Opus. No other repo: the branch does not
move `data/wowsims-fork.lock.json`.

1. **Conditions hold.** `5bf2b6a3` names I1, I2, I3; `4e51d757` names the
   Code quality rows S1, A1, S3 (A2 and P1 are the same edit as S1). The dev
   merge `ce9d8bb4` is not a kind the skill lists; the agent found it adds
   no change of its own: `git show --cc ce9d8bb4` is empty, each side's diff
   matches its parent's, and `NEXT` took dev's 742. Every changed product
   line is at a place A1, S1 or S3 cites, or is a comment.
2. **Each fix changes only what its finding asks.** Pass.
3. **The A1 gate asserts its finding.** On `git archive HEAD` copies, a hook
   that unsets only GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE and GIT_COMMON_DIR,
   and each script with a scrub that pops only GIT_DIR, all fail the new
   gate (rc=1) and pass the gate at 5bf2b6a3 (rc=0).
4. **The touched tests pass.** `python scripts/check_gate_git_env.py`,
   `python scripts/check_worktree_pair.py` and
   `python scripts/check_merge_ready.py --self-test`: rc=0 each.

**Finding R2-1** `scripts/check_gate_git_env.py:38-39`: the comment says
the hook "cannot run at all" while `GIT_INTERNAL_SUPER_PREFIX` is set.
The hook does run: `git rev-parse --local-env-vars` fails, the loop
clears nothing, and with no `set -e` the hook runs pnpm with `GIT_DIR`
still set (agent's run, stub pnpm, rc=0). Code quality in the lines the
pass wrote; the fail-open loop itself is from round 1's range. Filed as
`.scratch/carry-forward/issues/744-pre-push-clears-nothing-when-rev-parse-fails.md`.
Hypothesis, untested: git never sets that variable for a pre-push hook.

Round 2 reported a finding, so the review stops here as the skill's
"Round limit" says: no round 2 Disposition table. The owner decides
between a fix for ticket 744 with a further focused round, and merging
with 744 open.

R2-1 was fixed after the last round (`03b37d51`), with no further round:
the owner answered "Yeah def" on 2026-11-01 to fixing the gap and merging
with no further review round.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                         |
| ---- | ------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| R2-1 | Focused check | fixed       | 03b37d51: the hook exits 1 when `git rev-parse --local-env-vars` fails; the gate checks it; comment fixed; 744 closed |
