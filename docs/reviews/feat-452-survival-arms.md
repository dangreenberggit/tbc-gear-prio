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

## Code quality

| ID  | Finding                                                                                       | Pass                                                                                                                                             |
| --- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| S5  | `specId` and talent points travel together through four functions; the talents are read twice | fork `5db390483`: the EP set is worked out once and passed on, the `= []` default is gone; the two reads in `run.ts` and `run_session.ts` remain |
| S6  | `run-tab-cdp.mjs` `readCharacter` copies the fork's `getTalentTreePoints`                     | not changed: the page exposes no player handle on `window`, and the harness may not import from `vendor/`                                        |

## Round 1 fixes

Fork `786a08f96..5d1ecb595`: `3e72c5033` (A1, S1, D1, A2, A3, fork copies
for S2), `5db390483` (S5), `5d1ecb595` (a comment that followed D1: the
variant sets' phases come from the upstream preset names). Main
`418162e5..b5eb3473`: `b23c5bef` (D1, S2, re-pin), `62d5862c` (S3, P1,
notes in 746 and 803), `d187e0fc`, `49c32e07`, `ba7cca4e` (re-pins),
`b5eb3473` (the live-run report and tickets 810 and 750 now cite the Arms
re-runs with the P3 set, D1; ticket 811 filed for S5 and S6).

D1 changed the Arms EP set from P1 to P3, so both Arms runs were redone
(`arms-p4-r2.json`, `arms-p5-r2.json`). Baselines are equal; the phase 4
above-cutoff set is unchanged; at phase 5 Leggings of the Immortal Night
went from +2.4 to +3.3 and crossed the 3 DPS cutoff. The Arms SME judged
both re-runs "pass with notes" (`.scratch/agent-reports/2026-11-06-general-task-sme-arms.md`
§ Round 2 runs). A trade-off D1 brings: an Arms run that ranks phase 1 or
2 now uses the P3 set, though upstream's P1 and P2 Arms builds use the P1
set; the assumptions line says "written for P3".

Reviewed range: `418162e53d371bf45dd9a9e17da0d716c0605118..b5eb34738e7b21a9a702b96de352995fbe17e2c8`

## Focused check (round 2)

One fresh `general-task` agent on Opus. Fork range `786a08f96..5d1ecb595`.

1. Conditions hold: **pass.** Every commit in both ranges is a fix
   naming its finding IDs, the code-quality pass (S5), a fork re-pin, or a
   ticket and docs edit. Every changed code line is at a place a finding
   cites. No upstream wowsims file changed (`git diff --numstat
--diff-filter=M cec2a7b68 <end>` prints only `6 0
ui/app/SimTabsSection.tsx` at both ends).
2. Fixes in scope: **pass**, with R1 and R2 below.
3. Tests assert their findings: **pass.** `data/data.test.ts` covers A1
   (the fixer's reverted run failed 2 of 5); the A3 test now tells Arms
   (P3) from Fury (P1); A2's test was removed.
4. Touched tests pass: **pass.** `vitest run ui/features/upgrades/model`
   26 files, 437 tests; `check_ep_presets.py` "22 files match";
   `sync_fork_universes.py --check` "22 bundled copies byte-match"; node
   v22.23.2.

The Arms re-run numbers in the live-run report and tickets 810 and 750
were recomputed from the run files and are stated truly.

Findings:

- **R1 (beyond scope, low):** fork `data.ts:102-104` (`5d1ecb595`) names
  D1, but the comment fix came from the fixer's own note, not from what
  D1 asks. Comment only.
- **R2 (code quality, low):** the same sentence, "That file has no entry
  for the two talent variants", follows a mention of
  `docs/fork-provenance/data.md` and so reads as that file; it means
  `ep-weights-by-phase.json`.
- **R3 (code quality, low):** fork `assumptions.ts:36` and
  `run_session.ts:65-68`, from S5. The EP-weights line now appears only
  when the optional `epWeightsSet` is passed, and no session test checks
  that the session passes it. The live Arms run shows the line today
  (`arms-p5-r2.json` `assumptionsLine`).
- **R4 (bookkeeping, informational):** main `49c32e07` pins fork
  `a92fdc2f1`, now reachable only from the fork's reflog; its tree equals
  `5d1ecb595`'s, as the lock `_comment` and the live-run report say.

## Summary

Round 2 was the last round and reported findings other than
bookkeeping (R2 and R3, code quality, in lines the round-1 fixes wrote),
so the review stopped there (`~/.claude/AGENTS.md` § Review round
limits). The owner chose one further round (§ Round 2 fixes); round 3
passed with no findings (§ Focused check (round 3)), and every finding
has its row in § Disposition (round 3).

Tickets this branch filed: 2 (810, 811). Closed: 2 (803, 799). Open
after the review: 810 (waits on an owner ruling) and 811 (S5, S6).

## Round 2 fixes

The owner chose a further round on 2026-11-06 ("452b: 1 is fine",
answering the option: one short fix pass for R2 and R3, then a focused
check). Fork `5d1ecb595..3d8c215f8`: `3d8c215f8` (R2: the comment above
`EP_WEIGHTS_PHASE_BY_SET` names each source of the phases once; R3:
`specId` removed from `AssumptionsContext`, so `epWeightsSet` switches the
pool and EP-weights lines, and the flat-cutoff test asserts the EP line).
Main: `64fd78f1` (this file's round 2 and ticket 799 closed), `bbff8fd5`
(re-pin). With `epWeightsSet` dropped from `assumptionsContextOf`, a
`run_session.test.ts` test failed (1 of 11). R1 and R4 need no change.

Reviewed range: `b5eb34738e7b21a9a702b96de352995fbe17e2c8..bbff8fd50310b6614d7cb6e965812a209b09a428`

## Focused check (round 3)

One fresh `general-task` agent on Opus. Fork range `5d1ecb595..3d8c215f8`.

1. Conditions hold: **pass.** `bbff8fd5` is a fork re-pin; `64fd78f1`
   edits this file, closes ticket 799 (its Done when holds) and changes
   one line of the live-run report to record that close; fork `3d8c215f8`
   names R2 and R3. Every changed code line is at a place R2 or R3 cites.
   No upstream wowsims file changed.
2. Fixes in scope: **pass.** Production output is unchanged:
   `epWeightsSetFor` always returns a set, so the set is undefined exactly
   when the spec was.
3. Test asserts R3: **pass.** `run_session.test.ts:146-166` expects the
   pool-source line, which is now built only inside `if (epWeightsSet)`.
4. Touched tests pass: **pass.** `vitest run ui/features/upgrades/model`
   26 files, 437 tests; fork `tsc --noEmit` rc 0; node v22.23.2.

No findings.

## Disposition (round 3)

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                     |
| --- | ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | fork `3e72c5033`: the variant set needs more than zero points and strictly the most; `data.test.ts` covers `[]`, `[0]`, `[0,0,0]` and a tie                       |
| A2  | Adversarial | fixed       | fork `3e72c5033`: the test that compared two JSON files is removed; the `it.each` identity test stays                                                             |
| A3  | Adversarial | fixed       | fork `3e72c5033`: the assumptions test tells Arms (P3) from Fury (P1)                                                                                             |
| D1  | Domain      | fixed       | fork `3e72c5033`, main `b23c5bef`: Arms bundles `P3_ARMS_EP_PRESET` with the true reason; both Arms runs redone and re-judged (`b5eb3473`)                        |
| D2  | Domain      | wontfix     | the talent rule gives every upstream build the set its name says; Kebab getting the Arms set is a recorded choice (live-run report, ticket 810)                   |
| S1  | Standards   | fixed       | same fix as A1                                                                                                                                                    |
| S2  | Standards   | fixed       | main `b23c5bef`, fork `3e72c5033`: the notes cite `ui/specs/{hunter,warrior}/dps/spec.ts`                                                                         |
| S3  | Standards   | fixed       | main `62d5862c`: ticket 810's sentence rewritten                                                                                                                  |
| S4  | Standards   | wontfix     | the report and ticket 810 say the run files exist only in this worktree; the chain-B handoff gives the owner a `cp -a` to keep them before the worktree is pruned |
| S5  | Standards   | defer       | `.scratch/carry-forward/issues/811-talent-points-counted-in-three-places.md` — fork `5db390483` passes the set on; the two talent reads remain                    |
| S6  | Standards   | defer       | `.scratch/carry-forward/issues/811-talent-points-counted-in-three-places.md` — the harness copy stays until the page exposes the count                            |
| S7  | Standards   | wontfix     | `NEXT` 812 follows the chain's reserved ranges (B files from 810-819)                                                                                             |
| P1  | Spec        | fixed       | main `62d5862c`: ticket 799 records the `--build` change to its run commands                                                                                      |
| R1  | Focused     | wontfix     | the comment change was correct; R2's rewrite in `3d8c215f8` replaced the sentence                                                                                 |
| R2  | Focused     | fixed       | fork `3d8c215f8`: the comment names each phase source once                                                                                                        |
| R3  | Focused     | fixed       | fork `3d8c215f8`: `specId` removed, `epWeightsSet` switches the lines; a session test fails without it                                                            |
| R4  | Focused     | wontfix     | bookkeeping: `a92fdc2f1` has the same tree as `5d1ecb595`, as the lock `_comment` and the live-run report say                                                     |
