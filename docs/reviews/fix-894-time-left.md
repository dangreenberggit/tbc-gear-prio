# Pre-merge review — fix/894-time-left

Diffed against: our repo `7a9b9367..74663d8c` and the fork
`7ad984d47..a29f3cd28` on fork branch `fix/894-time-left`. `7a9b9367` and
`7ad984d47` are the tips of `fix/893-set-stage-progress`, which this branch
is built on and which had its own review
(`docs/reviews/fix-893-set-stage-progress.md`). So merging this branch lands
893 and 894 together. The fork diff touches seven files under
`ui/features/upgrades/`, none of which exists on `upstream/master`, so no
upstream wowsims file changed.

What the branch is for: ticket 894
(`.scratch/carry-forward/issues/894-run-dialog-time-left-line-missing-and-estimate-high.md`).
The owner asked for a time-left figure in 542 ("we should have this"), and on
2026-11-23 answered "recs sounds fine" to fixing 894 before the upstream PR
(T3 thread "Finish Upgrades Tab", Q2).

Reports (gitignored, main checkout `.scratch/agent-reports/`):
`2026-11-24-general-task-894-review-adversarial.md` and
`2026-11-24-general-task-894-review-standards-spec.md`.

## What changed

- Fork `77a6fe461`:
  - The run dialog shows the time left again under the stage name, in the
    Bulk dialog's words and place (`upstream/master`
    `ui/features/bulk/components/BulkProgress/BulkProgressMessage.tsx:12-13`,
    `bulk_tab.progress.time_remaining`), through the leaf
    `RunProgressMessage` and hook `useRunProgress`. This is the code of the
    893 branch's `ec6d15d31`, which was taken out before that merge.
  - `run_progress.ts` drops the `slowdown` term. The candidates left now
    cost the time per candidate so far.
- Fork `a29f3cd28` (review fixes, below): the line shows only while
  candidates or the top rows are simmed.
- Our repo: the lock re-pins, `forkCommit` in the effects file, the
  run-progress tests without the slowdown term plus one steady-run test with
  the shipped constants, and the ticket's bound and replay table.

## Check output

`node --version` printed v22.23.2 in every shell.

- Before the fix, red: our repo
  `npx vitest run packages/core/test/fork-run-progress.test.ts` printed
  `Tests 6 failed | 50 passed (56)`; the fork's
  `npx vitest run ui/features/upgrades/components/RunProgress ui/features/upgrades/utils/format.test.ts`
  failed 3 (`timeLeftText is not a function`, and the dialog showed no time
  left).
- At `a29f3cd28` / `74663d8c`: fork `npx vitest run ui/features/upgrades`
  `Tests 910 passed (910)`; `npx oxlint --max-warnings 0 ./ui` rc=0;
  `npx oxfmt --check ui/features/upgrades` "All matched files use the
  correct format"; `npx tsc --noEmit -p tsconfig.json` rc=0. Our repo:
  `Tests 56 passed (56)`.
- `pnpm verify`: see § Gates.

## Findings

Two reviewers, each `general-task` on Opus, neither of whom wrote the code:
adversarial, and standards and spec (the `code-review` skill's two axes).
No domain axis: the diff states no TBC, WCL or sim fact; its one wowsims
question, reuse of the Bulk dialog, is in the standards axis. Neither found
a bug in the estimate: with `slowdown` 0 the old formula reduces to the new
one, and both reworked the new test's 30 585 ms by hand.

- **A1** (adversarial): the dialog read "0s remaining" next to "Ranking
  results…" while it was still open: at the last sim the tracker's estimate
  is 0, and the line showed whenever an estimate existed
  (`RunProgressMessage.tsx:10-15`).
- **A2** (adversarial): the set-bonus dialog test sent no estimate, so its
  "no time left" check could not fail; the component never checked the
  stage.
- **A3** (adversarial, also standards F4): the re-sim dialog test no longer
  checked the "Re-simming the top rows" label, and no other test did.
- **F1** (standards): the ticket's bound said "50% of wall time" and called
  that 542's gate, while § Done when said "50% done" and 542 measured at
  done/T >= 0.5 (`replay.mjs:546`).
- **F2** (standards): `run_progress.ts` stated as fact that candidates take
  the same time early and late, from three replays.
- **F3** (standards): the lock's new `_comment` sentence left out
  `RunProgressDialog.tsx`.
- **F5** (standards): `useRunProgress` re-reads the latest progress before
  subscribing, which upstream's `useBulkProgress` does not, and said only "as
  upstream's"; citations had no line numbers.

## Fixes

- A1, A2, A3: `a29f3cd28`. `timeLeftText` gives a line only in the
  `candidates` and `replication` activities. New or tightened tests:
  `format.test.ts` "says no time left outside the stages that count sims";
  `RunProgressDialog.test.tsx` "shows no time left while the results are
  ranked, when nothing is left to sim", the set-bonus case now sends an
  estimate, and the re-sim case checks the label. A fresh agent put the old
  `format.ts` back under the new tests: 3 failed (`expected '4m 05s
remaining' to be undefined`, `... to be null`, `expected '0s remaining' to
be null`); at `a29f3cd28` all 910 passed.
- F1: the ticket's bound keeps its measuring point (50% of wall time),
  drops "542's gate", names the sample `analyze.py` picks, and fails a run
  whose nearest sample with a figure is more than 5% of wall time away. This
  was written after the desktop run had finished, which the ticket says.
- F2, F3, F5: comment and lock-note text in `a29f3cd28` and `74663d8c`.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                     |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `a29f3cd28`; `RunProgressDialog.test.tsx` "shows no time left while the results are ranked, when nothing is left to sim"          |
| A2  | Adversarial | fixed       | `a29f3cd28`; the set-bonus dialog test sends an estimate; `format.test.ts` "says no time left outside the stages that count sims" |
| A3  | Adversarial | fixed       | `a29f3cd28`; the re-sim dialog test checks the label                                                                              |
| F1  | Standards   | fixed       | `74663d8c`; ticket 894 § Bound names the point and the sample                                                                     |
| F2  | Standards   | fixed       | `a29f3cd28`, `74663d8c`; the comments name the runs the reading rests on                                                          |
| F3  | Standards   | fixed       | `74663d8c`; lock `_comment`                                                                                                       |
| F5  | Standards   | fixed       | `a29f3cd28`; `useRunProgress.ts` says what is new, with line numbers                                                              |

## Live runs

Fork `77a6fe461`, built in the pair (the bundle recipe by hand, as
e2e-final did; `npx tsx` cannot open its pipe in the sandbox). Feral, phase 3
from the Phase 2 "BiS 6%" preset, desktop then web, one after the other
(`.scratch/894/live.sh` in the pair). The bound, stated in the ticket before
the runs: within 25% at half the wall time.

| Run     | Wall time | Error at half | 40%    | 75%    | 90%    |
| ------- | --------- | ------------- | ------ | ------ | ------ |
| desktop | 296.8 s   | -0.240        | -0.186 | +0.484 | +0.280 |
| web     | 3817.9 s  | +0.123        | +0.223 | +0.268 | -0.036 |

Both meet the bound; desktop by a small margin. No time left showed in any
set-stage sample (27 desktop, 514 web). The machine was shared (1-minute
load 4.4 to 49.9 on 20 cores, median 9.4). Ticket 894 is closed with these
figures.

## Gates

GATES

## Notes

- The adversarial reviewer notes that the steady-run test pins the formula
  with the shipped constants; it does not check accuracy against a real
  run. The live runs do that.
- The replay of `d2-after` (desktop, 2026-11-23) still reads 65% high at
  half the run; its pace doubled late in the run, cause not found.
- No live run was made at `a29f3cd28`; the runs were at `77a6fe461`. The
  difference is the line hiding in the set-bonus and ranking stages, which
  the dialog tests cover; the estimate is the same.
