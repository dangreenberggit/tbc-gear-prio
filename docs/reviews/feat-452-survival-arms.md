# Pre-merge review — feat/452-survival-arms

Reviewed range: `c229d1299ce6e094021345372ab7959d618a07ca..418162e53d371bf45dd9a9e17da0d716c0605118`

Dispatch note (round 1): full axes, three fresh `general-task` agents on
Opus (`codex` is not on `PATH`). The branch stacks on
`chore/452-slice-tickets` (session A, unmerged, tooling-only, reviewed by
`instruction-review`), so this round diffs from that branch's head
`c229d129` rather than from `dev`. Fork range: `b603564ee..786a08f96`
(`data/wowsims-fork.lock.json` `commit` at the two ends).
`python scripts/check_merge_ready.py --product-files` printed 12 product
files (`data/presets/**`, `data/sim-implemented-effects.json`,
`data/wowsims-fork.lock.json`, `docs/fork-provenance/data.md`,
`docs/live-runs/2026-11-06-survival-arms-p45.md`, `scripts/tab-harness/*`).
The other six changed files are tickets and `NEXT` under
`.scratch/carry-forward/issues/`; they are the spec the axes read, not
agent instructions, so no `instruction-review` ran on them. Not a small
change: 18 files, 722 lines, and paths under `data/`. Domain axis runs:
the diff has EP weights and live-run rankings.

## Adversarial

No defect makes the tab show a wrong DPS figure without an error. Checks
the axis ran: the three fork test files in `ui/features/upgrades/model/`
(41/41), `run-tab-cdp.test.mjs` (6/6), `check_ep_presets.py` ("22 files
match"), `sync_fork_universes.py --check` ("22 bundled copies
byte-match"); the lock `commit` equals fork HEAD; the new weight files
equal `P1_SV_EP_PRESET` and `P1_ARMS_EP_PRESET`.

- **A1 (low):** fork `ui/features/upgrades/model/data/data.ts:55`. With no
  talent points (`[]`, the default parameter at `:191`) `.every()` is
  true, so warrior gets the Arms set and hunter the Survival set; `[0]`
  (an empty talents string) also picks Arms. The comments at `:41` and
  `:120` say no talents keeps the spec's own set. No production caller
  passes `[]` today.
- **A2 (low, test theatre):** fork `run.test.ts:145`. The test "gives an
  Arms warrior different weights from a Fury warrior" compares two JSON
  files and never calls the tab's code.
- **A3 (low, test theatre):** fork `assumptions.test.ts:21`. It passes even
  if the variant choice is broken, because the Beast Mastery, Fury,
  Survival and Arms sets are all P1, and no run output names the set.

## Domain

- **D1 (medium):** the tab bundles `P1_ARMS_EP_PRESET`, and the reason
  given (fork `data.ts:83-86`, `docs/fork-provenance/data.md`,
  `data/presets/warrior/arms-p1.ep-weights.json:7`: every spec bundles its
  lowest-phase set) is false: ret bundles `ret-p2`. The tab ranks phase 3
  by default (`data/wowsims.lock.json` `currentPhase`), and upstream's own
  Arms builds for phases 3-5 use `P3_ARMS_EP_PRESET`
  (`ui/specs/warrior/dps/presets.ts:446-463`). Arms' P1 and P3 hit weights
  differ by 0.80 (1.81 against 1.01). No shown DPS number is wrong (gem
  fill zeroes hit), but meta repair (ticket 746) and the candidate-cap
  order use the higher hit weight.
- **D2 (low):** upstream tells Arms from Fury by a two-handed main hand
  (`presets.ts:53-60`); the tab uses talent points. Every upstream build
  gets the set its name says (Arms 33/28/0, Kebab 33/28/0, Fury 21/40/0,
  SV 7/20/34, BM 41/20/0); Kebab gets the Arms set, which the live-run
  report and ticket 810 record as a choice.
- Info, checked correct: both weight files match upstream; P1 SV equals P1
  BM; every run number the report, ticket 810 and the ticket 750 comment
  cite matches the run files.

## Standards + Spec

Standards:

- **S1:** same defect as A1.
- **S2:** `data/presets/hunter/fallback.ep-weights.json:7`,
  `data/presets/warrior/fallback.ep-weights.json:7` and
  `data/presets/warrior/p2.ep-weights.json:7` cite
  `ui/hunter/dps/sim.ts:75` and `ui/warrior/dps/sim.ts:63`, which do not
  exist (`git cat-file -e`); the wiring is in
  `ui/specs/{hunter,warrior}/dps/spec.ts`. The path predates the branch,
  which rewrote those lines.
- **S3:** ticket 810 line 100 uses a banned word ("carries") in an
  ungrammatical sentence.
- **S4:** the report and ticket 810 cite gitignored run files that exist
  only in this worktree.
- **S5 (code quality):** `specId` and `talentPointsByTree` travel together
  through `epWeightsFor`, `epWeightsDisclosureFor`, `AssumptionsContext`
  and `run_session.ts`, and the talents are read twice (`run.ts:114`,
  `run_session.ts:83`).
- **S6 (code quality):** `scripts/tab-harness/run-tab-cdp.mjs:422-443`
  copies the fork's `getTalentTreePoints`, with a comment saying why.
- **S7:** `NEXT` went from 805 to 811 and the new ticket is 810.

Spec: ticket 803's Done-when is met (the fork test calls `rankForPlayer`
with real talent strings; `ep-presets:check`, `fork-universes:check` and
`sim-implemented-effects:check` pass and cover the new files; the re-pin
is on the branch). Ticket 799: every defect the report names maps to a
ticket.

- **P1:** the `--build` harness flag (commit `12014bfe`) was not asked for.
  The runs need it (a gear chip leaves Beast Mastery or Fury talents), but
  it also changes rotation, buffs, consumables and encounter against the
  p45 runs, and ticket 799 does not record that its run commands changed.
