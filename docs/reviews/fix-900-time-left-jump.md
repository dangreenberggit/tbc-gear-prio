# Pre-merge review — fix/900-time-left-jump

Diffed against: our repo `ccb6b769..bfebeb68` and the fork
`24e9ca02e..fefcf2950` on fork branch `fix/900-time-left-jump`. `ccb6b769`
is `dev`, and `24e9ca02e` is the fork commit `dev` pins. The fork diff
touches four files under `ui/features/upgrades/`, none of which exists on
`upstream/master` (`git cat-file -e upstream/master:<path>` fails for each),
so no upstream wowsims file changed. Two of them are ported engine files
(`model/engine/rank-candidates.ts`, `model/engine/rank-types.ts`).

What the branch is for: ticket 900,
`.scratch/carry-forward/issues/900-time-left-doubles-when-the-first-candidates-land.md`,
with its "Cause", "Fix" and "Done when (amended 2026-11-26)" sections. It
came from finding F2 of `docs/reviews/fix-896-stage-time-left.md`. The
user's request on 2026-11-26: "Read
.scratch/agent-reports/2026-11-26-general-task-900-time-left-jump.md and
finish ticket 900 from where it stopped: revert the reviewer's leftover
comment edits in the pair tl-jump-900, run pre-merge-review, build, do the
live ret web run against the bounds in the ticket, close 900, push both
sides of fix/900-time-left-jump".

Fork line numbers below are at `fefcf2950`; the comment fix in `ed4f42caa`
moves the lines after `rank-candidates.ts:64` down by two.

Reports (gitignored, the pair's `.scratch/agent-reports/`):
`2026-11-26-general-task-900-review-standards-spec.md` and
`2026-11-26-general-task-900-review.md`.

## What changed

- Fork `fefcf2950`: the candidates are priced in sims, as wowsims' Bulk sim
  counts its sim stage (`upstream/master`
  `ui/features/bulk/model/progress.ts:60-66`, `useSimCountProgress: true` at
  `ui/features/bulk/model/core_sim.ts:59`). The engine sends `candidateSims`
  with each of the candidates' `simming` events: one sim per legal slot
  (`legalSlotNames`), less each slot the store answered or whose hit read or
  repair failed. The tracker sizes the candidates by it and counts a sim
  that ended as one, each sim once. The re-sims are unchanged.
- Our repo: `de974ba2` (the cause and the bounds in the ticket) and
  `bfebeb68` (tests in `packages/core/test/fork-run-progress.test.ts`, the
  two provenance rows, the re-pin).
- Review fixes: fork `ed4f42caa` and our `69faaaa0` (below).

## Before the review

The first attempt at this review stopped when an API safeguard ended its
reviewer, which left uncommitted comment edits in the two ported fork files.
`git diff` showed those two edits and nothing else, and they were reverted
with `git checkout --` before this review began. After that the fork tree
was clean at `fefcf2950` and `pnpm run engine-port-drift:check` printed
"engine port drift check ok: 52 ported files match engine.md".

## Check output

`node --version` printed v22.23.2 in every shell.

At `fefcf2950` / `bfebeb68`, run by the standards and spec reviewer:

- Fork `npx tsc --noEmit -p tsconfig.json`: rc=0.
- Fork `npx vitest run ui/features/upgrades`: `Tests 917 passed (917)`, rc=0.
- Fork `npx oxlint --max-warnings 0 ./ui`: rc=0.
- Fork `npx oxfmt --check ui/features/upgrades`: "All matched files use the
  correct format.", rc=0.
- Our repo `pnpm exec vitest run packages/core/test/fork-run-progress.test.ts
packages/core/test/wowsims-fork-parity.test.ts`: `Tests 66 passed (66)`,
  rc=0.

After the fixes (fork `ed4f42caa`, our `69faaaa0`), run by the review's
caller:

- `pnpm exec vitest run packages/core/test/wowsims-fork-parity.test.ts`
  before the hashes moved: `Tests 1 passed (1)`, rc=0.
- Fork `npx oxfmt --check` on the two engine files: rc=0.
- `pnpm run engine-port-drift:check`: ok, 52 files, rc=0.
- `pnpm sim-implemented-effects:generate`: rc=0, "226 implemented, 450
  stub-only (fork commit ed4f42caac48...)"; only `forkCommit` changed, as
  predicted.
- `pnpm exec vitest run packages/core/test/fork-run-progress.test.ts
packages/core/test/wowsims-fork-parity.test.ts`: `Tests 66 passed (66)`,
  rc=0.
- `npx prettier --ignore-unknown --check` on the five files of `69faaaa0`:
  rc=0.
- `pnpm verify` at `69faaaa0` with the fork at `ed4f42caa`: "gates: 1774
  ran, 0 skipped", rc=0. Its layout step printed "layout: skipped -- the
  fork's built dist/ is absent".

Not run here: the layout gate (no built `dist/` in the pair's fork), the
build and the live ret web run, which the next agent runs.

## Findings

Two reviewers, neither of whom wrote the code: standards and spec (a
`general-task` on Opus at effort xhigh, the `code-review` skill's two axes,
with each wowsims citation opened on `upstream/master`), and adversarial
(the review's caller, `general-task` on Opus). No separate domain axis: the
diff states no TBC, WCL or sim fact, and its wowsims question, whether the
tab follows Bulk's sim count, is in the spec axis.

**Adversarial: clean.** What it checked is under Notes.

- **S1**: the comment at `fork-run-progress.test.ts:498-499` said the
  figure counted in candidates "would read 7100 / 2 \* 18, over twice
  `before`". That is 63 900 against `before` = 40 894.7, a ratio of 1.56;
  it is over twice (2.14) only against the old rule's own figure at 8 s,
  7000 / 3.8 \* 16.2 = 29 842 (`python3 -I -c`). The assertions were right.
- **S2**: the comments on `candidateSims` (`rank-candidates.ts:60-64`,
  `rank-types.ts:98-100`) said the count is "less each slot that ran none".
  After a Stop, slots that run no sim stay in it: a hit read the Stop
  refuses returns `'stopped'` with no decrement (`rank-candidates.ts:220`),
  and a candidate the pool does not start after the abort never reaches
  `bestSwapFor` (`:178-180`). No player sees it: the tab hides the time left
  from a Stop on (`run.ts:84`, `run_progress.ts:255`).
- **S3**: "each candidates' event" is not plain English (`each` takes a
  singular noun). It was at `rank-candidates.ts:61`, in the `rank-candidates.ts`
  provenance row, in the test title at `fork-run-progress.test.ts:1137`, and
  in the `fefcf2950` commit body.
- **S4**: `candidateSims: { count: number }` wraps a number in an object.
  `CandidateLoop` is already one object every task shares, so a plain number
  field would behave the same.
- **S5**: the ticking-runner test (`fork-run-progress.test.ts:1182`) named
  its array of sim timings `candidateSims`, the name of a count everywhere
  else, including the same test at `:1218`.
- **P1**: the progress bar still counts candidates (`utils/format.ts:208-209`)
  while the time left now counts sims. Bulk's bar and time left both come
  from the same sim count (`upstream/master` `progress.ts:72-77`), and
  nothing on the branch named this difference, as `AGENTS.md` asks for
  anything that differs from wowsims.
- **P2**: the ticket's Fix paragraph said "gem read" where the code catches
  `CandidateHitReadFailed` (`rank-candidates.ts:221`), and said a slot leaves
  the count "when its candidate is counted", where it leaves when the loop
  reaches the slot (`:223`, `:240`, `:252`).

What the branch adds that nothing asked for (spec reviewer): the
`endedSims` set, which ignores the runner's second report that a sim ended
(`worker_pool_sim_runner.ts:177`); `legalSlotNames`, now shared with
`placeholderSlotChoice`; `recordRun` split into `feralRun` and `recordRun`
with a `store` option for the store-replay recordings; and `run.test.ts`
fixtures that send `candidateSims`. Each serves the fix or its tests.

## Fixes

- S2, S3: fork `ed4f42caa` rewrites both comments: "less each slot the store
  answered or whose hit read or repair failed. After a Stop the slots left
  unrun stay in it; the tab hides the time left from a Stop on", and "with
  each of the candidates' `simming` events". Our `69faaaa0` updates the two
  provenance rows (new hashes, the same wording) and re-pins. Comments only;
  the parity test passed before the hashes moved and the drift check after.
- S1, S3, S5: `69faaaa0` corrects the S1 comment to compare the old rule's
  figures with each other, rewords the test title, and renames the array to
  `runnerSims`. The 66 tests pass after the change, as before.
- P1, P2: `69faaaa0` corrects the ticket's Fix paragraph and adds a
  paragraph naming the bar's difference from Bulk, with its reason: the bar
  counts whole candidates, which only grow, so it has no jump to fix.

The skill's step 3 (a fresh agent runs each new test red, then green)
had nothing to run: no fix adds or changes an assertion. The review's
caller ran the checks after the fixes, listed above.

## Disposition

| ID  | Axis      | Disposition | Ticket / note                                                                                                                                                                |
| --- | --------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | Standards | fixed       | `69faaaa0`; the comment now reads 7000 / 3.8 \* 16.2 at 8 s rising to 7100 / 2 \* 18; tests 66 passed after                                                                  |
| S2  | Standards | fixed       | fork `ed4f42caa`, provenance rows and re-pin in `69faaaa0`; comments only, drift check ok                                                                                    |
| S3  | Standards | fixed       | fork `ed4f42caa` comment, `69faaaa0` provenance row and test title. The `fefcf2950` commit body keeps the phrase: rewording it would rewrite a commit the pair already pins. |
| S4  | Standards | wontfix     | Behaves the same either way, and the reviewer called it a judgement call; changing it would churn eight lines of a ported file for no effect on what the tab shows.          |
| S5  | Standards | fixed       | `69faaaa0`; renamed to `runnerSims`; tests 66 passed after                                                                                                                   |
| P1  | Spec      | fixed       | `69faaaa0`; the ticket's Fix section now names the difference and its reason. The bar itself is unchanged.                                                                   |
| P2  | Spec      | fixed       | `69faaaa0`; the ticket's Fix paragraph now says hit read, and that a slot leaves the count when the loop reaches it                                                          |

## Notes

- What the adversarial axis checked and found sound:
  - Every runner sim the tracker counts as ended in the candidates is one
    the engine put in `candidateSims`, and the count never falls below the
    sims that ended. The baseline sim runs before the first `simming` event
    (`rank-candidates.ts:137`), while the activity is still `preparing`.
    The hit read goes through `readStats` and `computeStats`
    (`hit-budget.ts:304`, `sim-calls.ts:141`), which send no iteration
    reports. Each exit from
    the slot loop in `bestSwapFor` either takes the slot out of the count
    (hit read or repair failed, store answered: `:223`, `:240`, `:252`) or
    runs exactly one runner sim; an `eligibility.kind === 'skip'` slot is
    left out of `legalSlotNames` by the same `attemptEligibility` call.
  - The runner reports every sim's end, a failed one too, in a `finally`
    block (`worker_pool_sim_runner.ts:175-177`), so a sim error does not
    leave the stage short of its size.
  - A sim's end report runs before `run()` resolves, so every candidate
    sim's end reaches the tracker before the `simming` event of its
    candidate; none arrives after the activity moves to the set bonuses.
  - The figure cannot go negative or show "0s" early: size minus done is at
    least 0 by the point above, and a sim's end triggers no recompute.
  - Tests: the ticking-runner test compares each sample with wowsims' rule
    worked out from the fake runner's own start and end times, not from the
    tracker's state, and asserts the figure never rises; the engine-order
    test checks the final count against the runner calls between the first
    and last candidates' events. Neither recomputes the tracker's own
    arithmetic.
- Transitions checked (no state map exists for the tracker): a sim's end in
  each activity (`candidates` counts it; `replication` removes its share
  only; `preparing`, `set-bonuses` and `ranking` ignore it); a second end
  report (ignored, new); an iteration report after an end (ignored, new; it
  used to re-add a stale share); a candidates' event with and without
  `candidateSims`; a Stop (time left hidden, as before); a seed count that
  does not fit the first total (no figure, as before, 896's F6). No pair is
  left unhandled.
- Concern without evidence: a candidate the store answers starts the
  candidates' clock (`observeSimming`, the `stageStartedAt ??=` line) while
  adding nothing to the sims done. On a rerun whose first candidates come
  from the store, the first figures include the time spent reading the
  store, so they start high and fall. The figure does not rise from it, and
  the size of the effect is not measured.
- The author's report says all 12 new tests failed before the fix. This
  review did not re-run them against the old code.
- The pair's own index is stale (it matches `dev` `ccb6b769`, while the
  files and branch match the tip), as the sandbox makes its `.git/worktrees`
  folder read-only; commits here go through a temporary index, with
  `prettier --check` on the committed files in place of the pre-commit
  hook's `prettier --write`.
