# Pre-merge review — feat/merge-to-dev-arg

Round cap: at most 2 rounds, by session instruction (2026-10-10). After
round 2, open findings are reported, not reviewed in a round 3.

Reviewed range: `8ebd89e6f9013630fbab6d6fb7b6cccf3e97dc19..241f8e13011de8bf2ea91ebba92807873d221b6b`

Round 1 dispatch: no `codex` on PATH; four fresh `general-task` agents on
Opus (adversarial, domain, standards, spec), each told it writes nothing.

## Adversarial (round 1)

The central claim holds: once `dev` is an ancestor of the tip, the `--no-ff`
merge produces the tip's tree (live log, identical trees). Every refusal
path the reviewer tried failed closed.

- **A1 (medium; false green)** After the gates, only `refs/heads/<branch>`
  was re-checked. An uncommitted edit or a `git switch` in the pair during
  verify would be checked by verify but not merged.
- **A2 (low; reproduced)** A branch `dev` already contains, with `dev`
  ahead, was fast-forwarded and reported as `merged` with no merge commit.
- **A3 (low; reproduced)** When the gates fail, the merge of `dev` into the
  branch stays on the branch; nothing said so.
- **A4 (low; hypothesis)** When only `dev` re-pinned the fork lock,
  `git merge dev` succeeds and the pair's fork gates then fail; the doc
  sent only the conflict case to the older route.
- **A5 (low; doc regression)** The doc dropped the warning that a green
  layout gate under `--check-only` leaves the layout lock uncommitted.
- **A6 (low; unbacked claims)** The doc and `check_merge_to_dev.py` cited
  live runs in this file, which did not record them; no record of a verify
  run in a real pair.
- **A7 (minor)** Named `--check-only` refused on dirty main-folder files,
  while no-argument `--check-only` tolerates a dirty tree.
- **A8 (nit)** A tree mismatch after the merge only warned and exited 0.

Notes: `-z` parsing of renames, staged changes, case folding and a path
with spaces and `é` behaved correctly in the reviewer's throwaway repo. A
holder worktree mid-rebase gives the message "not checked out in any
worktree".

## Domain (round 1)

No game-domain content: the diff touches no `data/` file, fork pin or
ranking code.

- **D1 (low; doc gap)** No check that the main folder's fork clone ends on
  the commit the pair's lock names after the fork-side merge.
- **D2 (low; doc gap)** Same case as A4.
- **D3 (minor; dropped warning)** Same as A5.

## Standards + Spec (round 1)

### Standards

- **S1 (medium; Durable claims)** Same as A6.
- **S2 (low; banned word)** "what lands on `dev`".
- **S3 (minor; Duplicated Code)** `git_out("rev-parse", X).strip()` seven
  times; the check-only success line printed in two places.
- **S4 (nit)** Git runs in the pair three ways (`run`, `git_out`,
  `subprocess.run`).
- **S5 (nit)** Three flags travel together into `gate_argv`; acceptable.

### Spec

- **P1 (medium; partial)** On a `git merge dev` conflict the script said
  "resolve it there" while the doc said "take the older route".
- **P2 (low)** The choice of the branch's worktree over a temporary
  detached worktree was not justified.
- **P3 (low; not asked)** The merge of `dev` into the branch stays when the
  gates fail (same behaviour as A3).
- **P4 (low)** Same as A6.
- **P5 (note)** The pair and the no-argument path still refuse any
  untracked file; nothing records whether that is still needed.
- **P6 (note)** Named `--check-only` checks the tip, not the merge result,
  when `dev` is ahead, and says so. Acceptable.

## Summary (round 1)

No high findings. The one medium correctness finding (A1) and the doc
mismatch (P1) are fixed in `aaaf337c` and `e2ae4954`, with the live tests
below.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                  |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | `worktree_problem` re-checks the pair (clean, on the branch, at the tip) before and after the gates; the gate run gets `--expect-head` and refuses another HEAD (live test T8) |
| A2  | Adversarial | fixed       | refuses "dev already contains" before any write (T7)                                                                                                                           |
| A3  | Adversarial | fixed       | the failure message and the doc say the merge of `dev` stays on the branch (T10)                                                                                               |
| A4  | Adversarial | fixed       | doc: "When `dev` has a new fork pin" sends both re-pin cases to the older route                                                                                                |
| A5  | Adversarial | fixed       | doc step 3 restores the `--check-only` layout-lock warning                                                                                                                     |
| A6  | Adversarial | fixed       | "Live tests" below records the runs; the real-pair gate run is recorded there                                                                                                  |
| A7  | Adversarial | fixed       | named `--check-only` prints blocking files as a note (T9)                                                                                                                      |
| A8  | Adversarial | fixed       | a tree mismatch now exits 1                                                                                                                                                    |
| D1  | Domain      | fixed       | doc step 2 ends on "clone HEAD is the pair lock's `commit`", else the older route                                                                                              |
| D2  | Domain      | fixed       | same fix as A4                                                                                                                                                                 |
| D3  | Domain      | fixed       | same fix as A5                                                                                                                                                                 |
| S1  | Standards   | fixed       | same fix as A6                                                                                                                                                                 |
| S2  | Standards   | fixed       | now "the tree that `dev` gets"                                                                                                                                                 |
| S3  | Standards   | fixed       | `rev_parse` helper; the named path returns after the child's own check-only line                                                                                               |
| S4  | Standards   | wontfix     | each form has a job: `run` echoes the pair merge into the log, `git_out` captures output, `is_ancestor` needs only the exit code                                               |
| S5  | Standards   | wontfix     | the reviewer judged keyword-only flags acceptable; they keep `gate_argv` pure and tested                                                                                       |
| P1  | Spec        | fixed       | script message and doc now agree: ordinary conflict in the pair, fork-pin cases by the older route                                                                             |
| P2  | Spec        | fixed       | module doc, "Why the gates run in the branch's worktree"                                                                                                                       |
| P3  | Spec        | wontfix     | kept on purpose: it is the update the owner makes anyway, and the next run reuses it; documented (A3)                                                                          |
| P4  | Spec        | fixed       | same fix as A6                                                                                                                                                                 |
| P5  | Spec        | wontfix     | the pair must stay fully clean because verify reads its working tree, where an untracked file can change the result; the no-argument path keeps today's rule unchanged         |
| P6  | Spec        | wontfix     | accepted by the reviewer; the note is printed (T3)                                                                                                                             |

## Live tests

Scratch clone, never the real `dev`, nothing pushed. Setup: `git clone -b
feat/merge-to-dev-arg <pair> C:\Users\dgree\AppData\Local\Temp\mtd\repo`,
remove `origin`, create local `dev` at the clone's tip, then branches
`feat/throwaway` (new file plus a `CONTEXT.md` line, with a review file),
`feat/conflict` (rewrites `README.md` line 1), `feat/noarg`, `feat/norev`
(no review file) and `feat/loose`; then one `dev` commit that rewrites
`README.md` line 1 and adds a file; worktrees for throwaway, conflict and
norev; `core.hooksPath .githooks`. Each case ran
`python <clone>/scripts/merge_to_dev.py <branch> --no-verify` from the
clone on `dev` unless noted. Run on 2026-10-10 against `e2ae4954`; log
copied to `C:\Users\dgree\AppData\Local\Temp\mtd-run2.log` (outside the
repo).

| Case  | What                                                                                      | Result                                                                                                                                                            |
| ----- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1a-c | named run from a non-dev folder; `dev` as the branch; a branch checked out nowhere        | each refused, rc 1                                                                                                                                                |
| T2a-c | untracked file at a merged path; modified merged file; staged unrelated file              | each refused naming the file, rc 1                                                                                                                                |
| T3    | `--check-only` while `dev` is ahead                                                       | note printed, gates ran with `--check-only`, nothing moved, rc 0                                                                                                  |
| T4    | real run; `dev` ahead; dirty tracked handoff note and an untracked file in the dev folder | `dev` merged into the branch in its worktree, gates ran there, `--no-ff` merge made; both dirty files untouched; branch still checked out; dev tree = branch tree |
| T5    | `git merge dev` conflicts in the branch's worktree                                        | aborted, no `MERGE_HEAD`, branch and `dev` unchanged, rc 1                                                                                                        |
| T7    | branch `dev` already contains                                                             | refused, rc 1                                                                                                                                                     |
| T8    | `--gates-only --expect-head 0000000000` in the worktree                                   | refused, rc 1                                                                                                                                                     |
| T9    | `--check-only` with a dirty merged file                                                   | note lists the file, rc 0                                                                                                                                         |
| T10   | gates fail (missing review) after `dev` was merged into the branch                        | message names the branch's new tip; `dev` unchanged, rc 1                                                                                                         |
| T6    | no-argument run from a checkout of `feat/noarg`                                           | checks out `dev`, merges as before, rc 0                                                                                                                          |

Gate run with verify in the real pair (`C:\Users\dgree\Code\lulz\tbc-wt\merge-arg`,
Node 22.17.1): `python scripts/merge_to_dev.py --gates-only --expect-head c7d8f7bd134cc5349beb03032cb61d17d8277c44`
exited 0 on 2026-10-10. Its output: `gates: 1519 ran, 0 skipped` (verify),
`disposition rows: 22 parsed of 22`, `merge-ready: ok`, the layout gate
skipped because the tab source was unchanged, then `gates: ok (not merging)`.
The pair's tree stayed clean at `c7d8f7bd`.

Not run: the layout gate's lock-only commit allowance (the fork was absent
in the clone, so the gate skipped), the race where the branch or the pair
moves during the gates, and a merge into the real `dev`.
