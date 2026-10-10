# Pre-merge review — feat/merge-to-dev-arg

Round cap: at most 2 rounds, by session instruction (2026-10-10). After
round 2, open findings are reported, not reviewed in a round 3.

Reviewed range: `8ebd89e6f9013630fbab6d6fb7b6cccf3e97dc19..241f8e13011de8bf2ea91ebba92807873d221b6b`

Reviewed range: `241f8e13011de8bf2ea91ebba92807873d221b6b..e7327e0cc56539041a91c55f64980103e7b74e99`

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
| D1  | Domain      | fixed       | doc step 2 now ends: "Done when `git -C vendor/tbc-new-fork rev-parse HEAD` prints the `commit` that the pair's `data/wowsims-fork.lock.json` names", else the older route     |
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

## Adversarial (round 2)

Every round-1 `fixed` row does what it claims, and every `wontfix` reason
matches the code or the log. In a throwaway repo the reviewer reproduced
the A1 race cases: an untracked file in the pair, a branch switch in the
pair and an extra commit were refused; a commit holding only the layout
lock was allowed and merged correctly (stub layout gate, no hooks).

- **A9 (medium; reproduced)** A `git switch -c <new>` in the main folder
  during the gates keeps HEAD's sha, so the merge went onto `<new>` and the
  script printed `merged ... -> dev` with rc 0 while `dev` did not move.
- **A10 (low)** `worktree_problem` did not check the pair's fork worktree,
  which `vendor/` hides from the main tree's status; the fork gates read it.
- **A11 (low)** The module doc's "161 s" had no source.
- **A12 (note; reproduced)** `dev`'s `merge_to_dev.py` has no branch
  argument, so this branch cannot merge itself by name; it takes the
  no-argument route.
- **A13 (note; reproduced, pre-existing)** A clean `git merge --no-ff` does
  not run `pre-commit`, so the `TBC_ALLOW_DEV_MERGE` guard fires only after
  a conflicted merge.
- **A14 (minor)** The new git paths have no automated test.
- **A15 (nit)** Refusals after the gates did not say the branch keeps the
  merge of `dev`.

## Domain (round 2)

D1-D3 fixes are correct; still no game facts, data files, fork pin or
ranking code in the diff.

- **D4 (nit)** "Step 3 fails" when only `dev` re-pinned is not true with
  `--no-verify`, since the fork gates run only inside verify.
- **D5 (note)** That case is found only after a verify run of minutes; a
  lock comparison before step 3 would find it in seconds.

## Standards + Spec (round 2)

### Standards

S1 and S2 fixes hold; S3 holds in `merge_named`; S4 and S5 reasons are true.

- **S6 (low)** `--expect-head` read HEAD with `run(...)` instead of
  `rev_parse("HEAD")`.
- **S7 (low)** Same as A11.
- **S8 (minor)** `expect_head` depends on `check_only` in the `gate_argv`
  call; acceptable.
- **S9 (minor)** Disposition row D1 quoted text the doc does not contain.
- **S10 (nit)** "including any merge of dev above" points at log output.
- **S11 (note)** `refuse_blockers` takes a flag; fine at two call sites.

### Spec

P1, P2 and P4 are fixed; the P3, P5 and P6 reasons hold.

- **P7 (low)** No verify run covered a merge result where `dev` had to be
  merged into the branch first.
- **P8 (low)** A branch checked out nowhere is refused, and a new fork pin
  on `dev` still needs the older route; both are documented.
- **P9 (nit)** The conflict message pointed fork-lock conflicts at the
  paragraph about ordinary conflicts.
- **P10 (nit)** Same as A11.

### Session note

- **X1 (note)** AGENTS.md "The forked tab repo" still says merges from a
  pair run "after `pnpm wt:unpair`". AGENTS.md edits need owner approval.

## Summary (round 2)

One medium finding (A9), fixed in `4ce824c0`. Round 2 was the last round
under the session cap, so the round-2 fixes below are covered by the live
tests (T11-T13) and the `pnpm merge-to-dev --check-only` run, not by a
review round.

## Disposition (round 2)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                     |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A9  | Adversarial | fixed       | after the gates: this folder must still be on `dev` at the same sha and `refs/heads/dev` unchanged; after the merge, `dev` must point at the new commit whose first parent is the old `dev` (T11) |
| A10 | Adversarial | fixed       | `worktree_problem` also requires a clean `vendor/tbc-new-fork` when the worktree has one (T12)                                                                                                    |
| A11 | Adversarial | fixed       | the number is gone; the doc names what `pnpm wt:pair` does instead                                                                                                                                |
| A12 | Adversarial | wontfix     | expected: the branch argument exists only after this branch is on `dev`; the report gives the route for this first merge                                                                          |
| A13 | Adversarial | defer       | `.scratch/carry-forward/issues/595-pre-commit-dev-merge-guard-misses-clean-merges.md`                                                                                                             |
| A14 | Adversarial | defer       | `.scratch/carry-forward/issues/596-automate-merge-to-dev-named-branch-tests.md`                                                                                                                   |
| A15 | Adversarial | fixed       | every refusal after the gates names the commits the branch keeps                                                                                                                                  |
| D4  | Domain      | fixed       | step 3 now refuses before any merge when `dev`'s fork lock changed since the branch forked; the doc says so (T13)                                                                                 |
| D5  | Domain      | fixed       | same change as D4                                                                                                                                                                                 |
| S6  | Standards   | fixed       | uses `rev_parse("HEAD")`                                                                                                                                                                          |
| S7  | Standards   | fixed       | same fix as A11                                                                                                                                                                                   |
| S8  | Standards   | wontfix     | the reviewer judged it acceptable; `gate_argv` stays pure and tested                                                                                                                              |
| S9  | Standards   | fixed       | row D1 now quotes the doc's words                                                                                                                                                                 |
| S10 | Standards   | fixed       | message now says "including the merge of dev made in this run, if any"                                                                                                                            |
| S11 | Standards   | wontfix     | the reviewer found it fine at two call sites                                                                                                                                                      |
| P7  | Spec        | defer       | `.scratch/carry-forward/issues/596-automate-merge-to-dev-named-branch-tests.md`                                                                                                                   |
| P8  | Spec        | wontfix     | both limits are deliberate and documented: the gates need the branch's own checkout, and a new fork pin needs the fork-side re-pin the older route does                                           |
| P9  | Spec        | fixed       | the conflict message no longer names a paragraph; fork-lock cases are refused earlier with a pointer to "When dev has a new fork pin"                                                             |
| P10 | Spec        | fixed       | same fix as A11                                                                                                                                                                                   |
| X1  | Session     | defer       | `.scratch/carry-forward/issues/597-agents-md-pair-merge-line-is-stale.md` (blocked on owner approval)                                                                                             |

## Live tests

Scratch clone, never the real `dev`, nothing pushed. Setup: `git clone -b
feat/merge-to-dev-arg <pair> C:\Users\dgree\AppData\Local\Temp\mtd\repo`,
remove `origin`, create local `dev` at the clone's tip, then branches
`feat/throwaway` (new file plus a `CONTEXT.md` line, with a review file),
`feat/conflict` (rewrites `README.md` line 1), `feat/noarg`, `feat/norev`
(no review file), `feat/race` (its own `merge_to_dev.py --gates-only` runs
`git switch -c not-dev` in the clone's main folder, test-only) and
`feat/loose`; then one `dev` commit that rewrites `README.md` line 1 and
adds a file; worktrees for throwaway, conflict, norev and race;
`core.hooksPath .githooks`. Each case ran
`python <clone>/scripts/merge_to_dev.py <branch> --no-verify` from the
clone on `dev` unless noted. Run on 2026-10-10 against `4ce824c0`; log
copied to `C:\Users\dgree\AppData\Local\Temp\mtd-run3.log` (outside the
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
| T10   | gates fail (missing review) after `dev` was merged into the branch                        | message names the commits the branch keeps; `dev` unchanged, rc 1                                                                                                 |
| T11   | the main folder switches to a new branch during the gates                                 | refused after the gates; `dev` unchanged, rc 1                                                                                                                    |
| T12   | untracked file in the branch worktree's `vendor/tbc-new-fork` (a `git init` stand-in)     | refused, rc 1                                                                                                                                                     |
| T13   | `dev` commits a change to `data/wowsims-fork.lock.json` after the branch forked           | refused before any merge; branch unchanged, rc 1                                                                                                                  |
| T6    | no-argument run from a checkout of `feat/noarg`                                           | checks out `dev`, merges as before, rc 0                                                                                                                          |

Gate run with verify in the real pair (`C:\Users\dgree\Code\lulz\tbc-wt\merge-arg`,
Node 22.17.1), at the round-1 fixes:
`python scripts/merge_to_dev.py --gates-only --expect-head c7d8f7bd134cc5349beb03032cb61d17d8277c44`
exited 0 on 2026-10-10. Its output: `gates: 1519 ran, 0 skipped` (verify),
`disposition rows: 22 parsed of 22`, `merge-ready: ok`, the layout gate
skipped because the tab source was unchanged, then `gates: ok (not merging)`.
The pair's tree stayed clean at `c7d8f7bd`. `dev` was already in the
branch, so this run did not cover a merge of `dev` first (ticket 596).

Not run: the layout gate's lock-only commit allowance in a real pair (the
round-2 adversarial reviewer ran it with a stub gate and no hooks), and a
merge into the real `dev`.
