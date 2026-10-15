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
