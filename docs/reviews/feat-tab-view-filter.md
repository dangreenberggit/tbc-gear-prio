# Pre-merge review — feat/tab-view-filter

Reviewed range: `34fe4ac64a996518fe37da0b9234d905208c2416..19cb602fa47f85705a9ffb5a25c306686defc7d1`

Fork range (round 1): `vendor/tbc-new-fork` `176268e7c..c99dd97e400ecb8f835f60e7723672628ce36a84` (branch `feat/tab-view-filter`).

Ticket 527, "Filter by source" on the Upgrades tab, built through stage-gate
(artifacts in the main checkout's `.scratch/stage-gate/tab-view-filter/`).

**Dispatch (round 1).** Full axes: `git diff --shortstat dev...HEAD` gave
10 files, 154 insertions, 15 deletions, and `git diff --name-only dev...HEAD`
lists `data/sim-implemented-effects.json` and `data/wowsims-fork.lock.json`,
so the small-change lane does not apply; the feature code is the fork range
(25 files, 908 insertions, 65 deletions). `codex` is not on `PATH`
(`command -v codex` rc 1), so each axis ran as a fresh `general-task` agent on
Opus (review lane): adversarial, domain (the diff groups item sources into
raids and other sources, which is game-domain content), and the `code-review`
skill for Standards + Spec. A fourth read-only agent investigated the two
visual advisories handed over from the final Gate C (here `V-A2`, `V-A4`).

**Upstream wowsims files.** `git -C vendor/tbc-new-fork diff --stat 176268e7c..c99dd97e4`
touches only `ui/features/upgrades/**`, `assets/locales/en/upgrades.json` and
`schemas/upgrades.schema.json`. The `docs/fork-upstream-touchpoints.md`
check at the new tip, `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 c99dd97e4`,
prints only `6 0 ui/app/SimTabsSection.tsx`, the same as at `176268e7c`;
`--name-status` gives 263 A and 1 M.

## Adversarial

- **AD1 (visibly wrong result).** A pane whose above-cutoff rows all come
  from hidden sources, while shown sources still have below-cutoff rows,
  says "No upgrades found. Every candidate simmed at or below your current
  gear." The upgrades exist; the filter hid them. Cause: fork
  `ui/features/upgrades/model/results_view.ts` `paneRows` sets `noSourceRow`
  only when the pane has no rows at all. In the visual-acceptance state
  (ret-p3-p2, only Black Temple shown) the Wrist pane hides 32574 (+10.9 DPS)
  and 32568 (+7.7 DPS) and keeps 8 below-cutoff rows. The reviewer's scratch
  vitest probe gave `{"main":0,"below":1,"noSourceRow":false}`.
- **AD2 (visibly wrong order).** With a multi-zone row's first zone hidden,
  the Source cell names its first shown zone, but the Source column sorts on
  the first zone (`utils/format.ts` `SORT_LABELS.source = rowSourceLabel`);
  the export uses the same sort labels. Probe: `PROBE sort Hyjal Summit cell Black Temple`.
- **AD3 (missing test).** `hooks/useResultsView.ts` passes the Source cell
  only the hidden keys the view offers (`actingHidden`); no test drives that
  rule through `UpgradesResults` or the hook.

Checked and clean: old version-1 saved settings restore `[]`; an unknown
hidden key changes nothing; toggling a source does not mark a result stale;
stopped runs filter; the cutoff is not recomputed; ranks renumber 1..N; the
BiS-only tests fail when `slotsBeforeSourceCut` is removed. The 14 touched
test files pass (182 tests).

## Domain

The raid list is correct: across all 44 universes the zones are the 9 TBC
raids plus "World Bosses"; tier pieces file under their token's zone.

- **D1 (visibly wrong result, from before this branch).** For 9 of 11 specs,
  badge, PvP and dungeon gear is `unknown/db` and sits under "Source not
  recorded", so "only badge vendor" cannot be filtered for them. Ticket 293
  tracks the data gap.
- **D2 (visibly wrong result, from before this branch).** Some rows file under
  "Source not recorded" while the Source cell names a dungeon through
  upstream's `ItemSource` (`SourceCell.tsx`); Ret P3 has 4: 28288, 28034,
  27484, 22401. The pre-run Sources dialog keys these items the same way at
  the base.
- **D3 (misleading label, from before this branch; hypothesis, untested).**
  "Reputation vendor" covers the Band of Eternity rings (29298-29309), which
  are reputation-gated quest rewards, not vendor items.
- **D4 (silent wrong result; hypothesis, untested on real views).**
  `sourcesView` builds the shown keys from each row's first zone only
  (`validSourceKeysOf`). A row from zones Z1 and Z2 is cut when Z1 is hidden
  and no row in the view has Z2 first, though Z2 is not hidden. Most likely
  under BiS only.

## Standards + Spec

Standards: fork paths, commit messages, lock and regen, and comments follow
the rules.

- **S6 (bookkeeping).** The `c99dd97e4` entry in
  `data/wowsims-fork.lock.json` `_comment` leaves out the date, test counts
  and the `--diff-filter=D` check that earlier entries give.

Code-quality findings S1-S5 and S7 are under `## Code quality`.

Spec: built as plan.md and decision-log rows F1-F14 and the K-rows say; no
scope creep.

- **P1** is AD1 (the same defect, found independently).
- **P2 (missing test).** No test checks that hidden sources stay hidden across
  a second `startRun`/`settleRun`, as the sort test does.
- **P3 (bookkeeping).** Ticket 527 says its detailed choices were settled
  from earlier rulings; three have no owner ruling (no filtering while a run
  is in progress, what Hide all does, the export following the filter).

## Visual advisories from Gate C

- **V-A2 (check reads a wrong number).** The tab-review `rows` fact uses
  `count:[data-testid="upgrades-result-row"]`, which counts rendered rows of
  a virtualised table (overscan 10, `useVirtualRows.ts`), so it read 16 of 19
  at 375 px. `scripts/tab-harness/rows.mjs:1-10` already names the true
  count, the tbody's `data-row-count`.
- **V-A4 (un-baselined a11y warning).** In a pane with no below-cutoff
  group, the JSON export's `<h6>` (upstream `ContentBlock` default, used by
  the tab's `ExportPanel.tsx`) follows a higher heading directly, so axe
  `heading-order` moves from the baselined accordion header to the export
  title. Same skip the baseline already accepts.

## Code quality

| ID  | Where (fork)                                                                                | What                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | `components/ViewSources/ViewSourcesDialog.tsx:29-53`                                        | Duplicates `SourcesDialog.tsx:25-49`'s section block; share one `SourceSection`.                                                              |
| S2  | `model/results_view.ts` `resultsViewFor`                                                    | `hiddenSources` parameter used only by tests; production composes `sourcesView` in the hook.                                                  |
| S3  | `utils/format.ts:79,81`                                                                     | `sourcesOf` copies `settings_pool.ts` `poolSourcesOf`; `ownSourceKey` repeats the label fallback; `Pick` written where `SourcedEntry` exists. |
| S4  | `hooks/useResultsView.ts:61-64`, `ViewSourcesButton.tsx:27-28`, `ViewToggles.tsx:44`        | Offered-and-hidden sources computed in two places, counted in a third.                                                                        |
| S5  | `model/results_view.ts` `viewSourceOptions`                                                 | Wrapper that only forwards to `sourceOptions`.                                                                                                |
| S7  | main `scripts/tab-harness/test-review.mjs:34`; fork `model/results_view.ts:168`; ticket 527 | "carries"/"carry", on the AGENTS.md word list.                                                                                                |

## Round 2

Reviewed range: `19cb602fa47f85705a9ffb5a25c306686defc7d1..59f19140d4ca1ea7c50d32373a4d704c0fcdc508`

Fork range (round 2): `vendor/tbc-new-fork` `c99dd97e400ecb8f835f60e7723672628ce36a84..193c8d28ff7099de9d970ec5ff663924e32ee36a`.

## Focused check (round 2)

One fresh `general-task` agent on Opus, main range
`19cb602f..59f19140` (plus `d84e7d39`, which only records the range), fork
range `c99dd97e4..193c8d28f`, given the findings above and the four checks.

1. **Conditions 1-3: hold.** Every commit is a fix naming its finding IDs,
   the code-quality pass naming its rows, the re-pin `59f19140`, the review
   file, or the ticket filing `04a824bb` (the agent ruled it in scope:
   `docs/agents/issue-tracker.md:22-27` requires `NEXT` in the commit that
   adds a ticket, and the two `map.md` lines log the same tickets). Every
   changed code line is at a place a fixed finding cites. The wowsims-file
   check gives the same output at `193c8d28f` as at `c99dd97e4` (only
   `6 0 ui/app/SimTabsSection.tsx`, nothing deleted), and
   `176268e7c..193c8d28f` touches only the three allowed paths.
2. **Each change does only what its finding asks: pass.** The code-quality
   rows change no behaviour (read; `tsc --noEmit -p .` and
   `oxlint --max-warnings 0 ui/features/upgrades` rc 0 at `193c8d28f`).
3. **Each new test asserts its finding: pass**, judged by reading (no
   mutation re-run); the fixer's red runs (AD1, AD2, D4) and mutation runs
   (AD3, P2) agree.
4. **Touched tests pass:** 9 files, 151 tests, rc 0.

Findings (none bookkeeping):

- **R1 (visible inconsistency, introduced by the D4 fix; real-data effect
  untested).** `sourcesView` keeps a row while any zone it matches is not an
  offered hidden key, but the dialog offers only first zones, so a row whose
  other zone is no row's first zone survives Hide all while the button reads
  "m of m sources hidden". Ticket 647.
- **R2 (missing test).** No test covers AD1's negative case: a pane that
  had only below-cutoff rows keeps "No upgrades found" when another source
  is hidden. Ticket 648.
- **R3 (same defect as D4 in the pre-run box; ticket 527's "same rule"
  sentence now false).** `effectivePool` still cuts a two-zone entry whose
  second zone is not offered. Ticket 649.

By the skill's "Round limit" the review stops here with no round 3. The
caller's standing instruction for this run: "a round-two finding that is
filed as a ticket is fixed by a fresh agent on the branch". Tickets 647-649
were filed, and a fresh agent fixes them on the branch (see `## Summary`).

## Summary

Round 1 found three defects this branch introduced and the visual review
missed: a pane whose upgrades the filter hid said "No upgrades found"
(AD1 = P1), the Source column sorted on a hidden source (AD2), and a row
from two raids could vanish while one raid was still shown (D4). All are
fixed with tests that failed first. The code-quality rows S1-S5 and S7 were
applied in one pass with no behaviour change, and the Gate C advisories
V-A2 and V-A4 were fixed in the main repo. The pre-existing source-data gaps
D1-D3 are deferred to tickets 293, 646 and 645.

Round 2 (the focused check) passed its four checks but found R1-R3. Per the
caller's rule they were filed as tickets 647-649 and fixed on the branch by
a fresh agent: fork `88dcdb8dd` (test for 648, killing the mutant the ticket
named) and `c47012b0b` (647 and 649: both source dialogs now offer every zone
an entry matches, so the offered list and the keep rule agree). Measured on
the 44 committed universes: no real pool has an entry whose second zone is no
entry's first, so the pre-run Sources list is unchanged for every spec and
phase. These two fork commits had no review round after them; their evidence
is the red-then-green runs the fixer recorded, the full tab suite (55 files,
500 tests) and `pnpm verify` rc 0 at main `3076b0dc`.

Final fork pin `c47012b0b` (main `3076b0dc`). The wowsims-file audit at that
tip: `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M 5262ff38 c47012b0b`
prints only `6 0 ui/app/SimTabsSection.tsx`, `--diff-filter=D` prints
nothing, and `176268e7c..c47012b0b` touches only `ui/features/upgrades/**`,
`assets/locales/en/upgrades.json` and `schemas/upgrades.schema.json`.

Not checked: the fixes were not re-captured on the live tab (the visual
evidence for ticket 527 is from fork `c99dd97e4`). The layout lock
`data/wowsims-fork-layout.lock.json` is advanced by the layout gate inside
`pnpm merge-to-dev`; `pnpm verify` prints `layout: would run`.

Tickets on this branch: filed 6 (628, 645, 646, 647, 648, 649), closed 4
(527, 647, 648, 649). Filed is higher than closed because 628 (a flaky test
timeout) and the pre-existing source-data findings 645 and 646 stay open.

## Disposition

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                               |
| ---- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AD1  | Adversarial   | fixed       | fork `4cf89e432`: `paneRows` marks a pane the source cut emptied of upgrades (`panesWithMainBeforeSourceCut`); test fails first                             |
| P1   | Spec          | fixed       | same defect as AD1, fork `4cf89e432`                                                                                                                        |
| AD2  | Adversarial   | fixed       | fork `138170980`: `sortLabelsFor(hiddenSources)` sorts the Source column and the export on the label the cell shows                                         |
| AD3  | Adversarial   | fixed       | fork `cf83b3d40`: test through `UpgradesResults`; fails with the raw stored list in place of `actingHidden` (fixer's mutation run)                          |
| D1   | Domain        | defer       | `.scratch/carry-forward/issues/293-wowhead-source-attribution-backfill.md` — older than this branch; badge/PvP/dungeon sources are not recorded for 9 specs |
| D2   | Domain        | defer       | `.scratch/carry-forward/issues/646-unrecorded-source-rows-name-a-dungeon.md` — the pool keys these items the same way at the base                           |
| D3   | Domain        | defer       | `.scratch/carry-forward/issues/645-reputation-vendor-label-covers-quest-rings.md` — label older than this branch                                            |
| D4   | Domain        | fixed       | fork `959c56d9a` (keep while any matched source is not hidden), completed by `c47012b0b` (ticket 647)                                                       |
| S1   | Standards     | fixed       | fork `ff18853f0`: one shared `SourceSection`                                                                                                                |
| S2   | Standards     | fixed       | fork `193c8d28f`: `resultsViewFor` lost its test-only parameter                                                                                             |
| S3   | Standards     | fixed       | fork `2b0a45873`: shared `sourcesOf` and `bucketKeyOf`, `SourcedEntry`                                                                                      |
| S4   | Standards     | fixed       | fork `193c8d28f`: `offeredSourceKeys` / `offeredHidden`, tested                                                                                             |
| S5   | Standards     | fixed       | fork `193c8d28f`: `viewSourceOptions` removed                                                                                                               |
| S6   | Standards     | fixed       | main `59f19140`: lock `_comment` entries give date and D/M checks; no test counts recorded for `c99dd97e4`, said so                                         |
| S7   | Standards     | fixed       | fork `193c8d28f`, main `6a51c6d3`                                                                                                                           |
| P2   | Spec          | fixed       | fork `9c5d6767f`: hidden sources hold across a second run; fails when `startRun` clears them (fixer's mutation run)                                         |
| P3   | Spec          | fixed       | main `98c35f71`: ticket 527 labels three choices as agent decisions                                                                                         |
| V-A2 | Visual        | fixed       | main `f42a7bc9`: harness comment names `data-row-count`; the gitignored manifest reads it                                                                   |
| V-A4 | Visual        | fixed       | main `429ac979`: baseline entry for `heading-order` on the export title, `mayNotFire`                                                                       |
| R1   | Focused check | fixed       | ticket 647 closed; fork `c47012b0b`                                                                                                                         |
| R2   | Focused check | fixed       | ticket 648 closed; fork `88dcdb8dd`                                                                                                                         |
| R3   | Focused check | fixed       | ticket 649 closed; fork `c47012b0b`; ticket 527's "same rule" sentence is true again                                                                        |
