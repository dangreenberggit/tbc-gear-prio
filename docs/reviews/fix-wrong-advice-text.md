# Pre-merge review — fix/wrong-advice-text

Reviewed range: `b24a4228705bd681a65a1b97f4a0d1fa01fc6073..d7bb429347f8c40b807d0659728714a34edfff90`

Reviewed range: `d7bb429347f8c40b807d0659728714a34edfff90..4421129b5c040a02cb0476af63555808c5cb323c`

Reviewed range: `4421129b5c040a02cb0476af63555808c5cb323c..be968c3822ae6ed03d9c9ae8dd9dbb49d84074c1`

Reviewed range: `be968c3822ae6ed03d9c9ae8dd9dbb49d84074c1..096dbfc1f10ee6ea0c8a318ab9297345f871401f`

Reviewed range: `096dbfc1f10ee6ea0c8a318ab9297345f871401f..40051a16c572453c3c4a6d9b8f01182e4a1d296a`

Fork range, round 5: `4fd85ca4a435e0f6471b6692bc01f0f2a9bedb3e..4626c5d7b3908d2b690fefc7cae39b62938ffbd9`
(commits e4bae67e6, 4626c5d7b).

Fork range, round 4: `81e803ada3caa3f60ae442771a12665fbefdd7ae..4fd85ca4a435e0f6471b6692bc01f0f2a9bedb3e`
(commit 4fd85ca4a).

Fork range, round 3: `e3dbf38fa07d224915f0d404b880cf692e4b3bfb..81e803ada3caa3f60ae442771a12665fbefdd7ae`
(commits eee005acc, 81e803ada).

Fork range, round 2: `8a58f4af0084a81a326c09333b43e14b5770c6ea..e3dbf38fa07d224915f0d404b880cf692e4b3bfb`
(commits dd137de96, c06b10b3f, d016093bd, e3dbf38fa).

Fork range, round 1: `05da8b9ab5cecaaf323f365f7fa9be25c98c24c7..8a58f4af0084a81a326c09333b43e14b5770c6ea`
(`vendor/tbc-new-fork`, branch `fix/wrong-advice-text`; commits 10e2d0f98,
e707b1403, 8a58f4af0).

Dispatch note, round 1:

- Requested by the dispatching session on 2026-11-02 for tickets 625, 618
  and 705. Both trees were clean at dispatch (`git status --porcelain`
  empty in each; the adversarial and standards agents saw the same).
- Tooling check: `python scripts/check_merge_ready.py --product-files`
  printed `data/sim-implemented-effects.json`, `data/wowsims-fork.lock.json`,
  `docs/fork-provenance/engine.md`, `docs/upgrades-tab-scope.md`,
  `packages/core/test/fork-meta-repair.test.ts` (rc=0), so the branch is
  mixed. The axes reviewed those five files and the fork range above. The
  other changed files are tickets 618, 625, 705, 745 and
  `.scratch/carry-forward/issues/NEXT`. They are not agent instructions, so
  `instruction-review` has nothing to read there; the Spec axis read the
  tickets as the spec.
- Not the small-change lane: `git diff --shortstat dev...HEAD` gave
  `10 files changed, 188 insertions(+), 49 deletions(-)`, and two paths
  start with `data/`.
- `codex` is not on `PATH` (`command -v codex` rc=1). Four fresh
  `general-task` agents on Opus (review lane) ran the adversarial axis, the
  domain axis, and the `code-review` skill's Standards and Spec agents.
  Each was told it writes nothing.
- Domain axis run: the diff changes how the meta-gem repair counts hit
  rating against the hit cap (game-domain content).
- Context given to the axes from the dispatching session, unchecked by it:
  the 705 change follows `.scratch/stage-gate/meta-hit-cap-705/plan.md`,
  a plan that was never reviewed, and the implementer reworded the 705
  note that plan kept; two side effects were flagged as untested (a Stop
  during the new stats read is ignored; a run whose worn meta gem is off
  makes one extra stats read even on a cached run). Owner rulings for
  player-facing text: one plain sentence in player words; the tab gives no
  rotation or gear advice.
- Wowsims-file check (`docs/fork-upstream-touchpoints.md` § How to reproduce
  every number here): at fork `05da8b9ab` and at `8a58f4af0`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 <tip>`
  prints only `6 0 ui/app/SimTabsSection.tsx`. `--name-status ... | cut -f1 | sort | uniq -c`
  prints `237 A`, `1 M` at `05da8b9ab` and `239 A`, `1 M` at `8a58f4af0`
  (the two new files are `model/shown_figure.ts` and its test). The
  modified-upstream-file set is the same at both tips.

## Adversarial

No change gives a confidently wrong number. Tests run by the axis: the 7
changed fork test files, 149 passed, rc=0; `packages/core/test/fork-meta-repair.test.ts`,
34 passed, rc=0 (vitest run directly with `node node_modules/vitest/vitest.mjs run`,
because `pnpm exec` stopped on a pnpm version mismatch in the sandbox, see P2).

The 705 plan's approach was judged correct: the worn budget's `remaining`
is measured against the gear handed to the repair (`meta-repair.ts:116-122`);
`wornMetaInactive` makes the same test as `repairAndMinimize`
(`meta-repair.ts:200`, `273-282`); a failed read sets `hitCapFailed`, so
that ranking is not cached. 618: a row is below the cutoff by
`deltaDps >= absDps` (`cutoff.ts:72`) and the new rounding uses the same
test. 625: `owned` means equipped (`rank.ts:1335`, `1582`).

- **A1.** `ui/features/upgrades/model/set_bonus_tip.ts:288` (fork). In the
  Set potential "outcomes" popover, when an outcome is marked as the row's
  figure, the "item alone" line shows the raw `row.deltaDps`. Trigger: a
  row with `deltaDps` 2.96, bar 3, Set potential on, an outcome marked: the
  popover's item-alone line reads 3.0, and with Set potential off the same
  row's cell reads "+2.9". The plan keeps this line raw on purpose
  (`.scratch/stage-gate/tab-text-625-618-705/plan.md` § Out of scope, main
  checkout). Checked by the dispatcher: `set_bonus_tip.ts:281-289` at
  `8a58f4af0` does this. Before this branch both read 3.0; the
  disagreement is new.
- **A2.** `packages/core/test/fork-meta-repair.test.ts:1404-1465`. Every 705
  test reads a hit value over the cap. No test reads a value under the cap
  and expects the worn repair to keep the hit gem (Rigid). A bug that
  always passes a zero or negative budget would pass W1 to W4.
- **A3 (flagged side effect a).** A Stop during the new read
  (`rank.ts:848-872`) is swallowed and the worn gems are repaired at full
  weight. The run still marks itself stopped (`rank.ts:1521`) and returns a
  partial ranking that is never cached (`rank.ts:1807`, cache write at
  `1824`). The UI does not hang. Not run.
- **A4 (flagged side effect b).** The cache key is built from the repaired
  gear, so the read cannot move after the cache lookup without a
  restructure. On a cache hit the read's result is thrown away and the
  cached ranking is returned. Cost: one `computeStats` call
  (`rank.ts:3780-3790`), not a DPS sim.

Unexamined: the desktop gate golden (needs the owner's run outside the
sandbox); `packages/core/src` purity (not touched).

## Domain

No game fact is stated wrongly, no second hit-cap value is added, and both
new strings are true and give no advice. Checked: Rigid Dawnstone (24051)
has +8 at stat 20, `StatMeleeHitRating` (`proto/common.proto:197`); the 9%
constant (`cap-profile.ts:128`) matches the engine (`sim/core/target.go:394,401`);
`hitTerm` (`meta-repair.ts:121`) charges for hit removed below the cap; a
worn item ranks only in the slot where it is worn (`rank.ts:1292-1293`), so
"You already wear a BiS-list item in this slot." is true; the reworded 705
note shows only for Retribution and Feral, where it is true.

- **D1 (from before this branch).** Fork `cap-profile.ts:90,177,188`: only
  the `ret` and `feral` profiles set `repairCap`. `hitCapReadable`
  (`rank.ts:819-821`) needs it, so for every other DPS spec the worn-gear
  and candidate repairs count hit at full value and the tab shows no note
  (`hitCapUnknownNote` is pushed only inside `if (hitCapReadable)`,
  `rank.ts:1099-1111`). That is ticket 705's symptom on the specs its fix
  does not reach. Checked by the dispatcher at `8a58f4af0`. No open ticket
  covered it (grep of open tickets for repair and hit-cap terms; only 521,
  about the readout, matched).
- **D2.** `packages/core/test/fork-meta-repair.test.ts`, the `wornWithMetaOff`
  comment says the repair "puts Rigid back"; the replaced chest gem is
  Enscribed Fire Opal (30584), so the repair puts Rigid in. Moved to
  `## Code quality` as CQ5.

Unverified (domain axis): that the stats read includes Heroic Presence when
the race or party gives it (`sim/core/buffs.go:1293-1325`); that ret-p3-p2's
meta gem is off by one yellow. Unexamined: Warcraft Logs fields (diff
touches none).

## Standards + Spec

### Standards

No hard breach of a documented standard. The ported-file cycle was
followed: only `rank.ts` of the ported files changed, its sha256 at
`8a58f4af0` (`fcaf2c62…`) appears once in `docs/fork-provenance/engine.md`,
and the lock `commit` and `sim-implemented-effects.json` `forkCommit` both
moved to `8a58f4af0` in `538e65c9`. Ticket closes have `Verified by:`
lines; `NEXT` moved 745 to 746 with ticket 745. Commit subjects meet the
rules. New comments explain why. Judgement calls are CQ1 to CQ4 under
`## Code quality`. Minor points:

- **S5.** Commit `d7bb4293` "Close tickets 625, 618 and 705" also files
  ticket 745 and removes the 644 and 655 rows from `docs/upgrades-tab-scope.md`;
  the subject does not say so.
- **S6.** The `Verified by:` commands of 618 and 625 start with
  `cd vendor/tbc-new-fork && …`.
- **S7.** The new fork test at `model/results_view.test.ts:298` reads a
  main-repo recording through a relative path behind
  `it.skipIf(!existsSync(RECORDING))`, so a fork-only checkout skips it.

Unexamined: lint and types (tooling enforces them); other rows of
`engine.md`; a re-run of the effects generator.

### Spec

All three tickets are met. 625: both strings are one plain sentence, in the
schema's properties and `required` list, with the ret-p3-p2 neck recording
test (`results_view.test.ts:298`). 618: a row is below the cutoff only when
`meetsCutoff` fails on its figure (`view.ts:231-245`, `rank.ts:1447,1724`),
and a value below the bar that would round up to it shows as "+2.9". 705:
the worn-gear repair gets its own budget from the same `hitCapBudgetFrom`;
tests W1 to W4.

- **P1.** The first plan's step 7 check, "The two Maintenance loops … print
  nothing", still fails: the first loop prints MISSING for 714, 715, 718,
  719, 725, 726, 731, 732, 734 to 741, 743 and 745 (run through
  `python scripts/check_merge_ready.py --list-only`). The branch filed
  ticket 745 for it; 17 of the 18 were open before this branch.
- **P2.** In the sandbox, `corepack pnpm -s issues:open` and `pnpm exec`
  fail with a pnpm version error (12.16.1 wanted, v11.24.0 found).
- **P3.** The worn-gear read checks that hit percent is a finite number, a
  step the 705 plan's step 4d does not name; it copies the baseline read's
  check (`rank.ts:1094-1097`).
- **P4.** `docs/upgrades-tab-scope.md` deletes the rows for 644 and 655,
  which no plan asks for; both tickets are closed, and the deletion is what
  makes the second loop print nothing.
- **P5.** The 705 note was reworded although the 705 plan (step 4g, claim
  C12) said to keep it. Held to the ticket: it complains that "'only known'
  reads like a fact about the game", and the first plan's Q-705 says both
  options reword the note. The new wording is accurate: the note is added
  only when `hitCapBudgetFrom` returns nothing with the repair cap present
  and hit percent finite, which leaves only "a target is not level 73".
- **P6.** The 705 Resolution said "test in the 705 report on this branch"
  with no path, pointing at a gitignored report.

Unexamined: test runs (adversarial axis ran them); the live tab and the
desktop gate (owner's environment).

### Review bookkeeping found by the dispatcher

- **B1.** `.scratch/carry-forward/map.md` had no line for ticket 745.

## Code quality

| ID     | Where                                                                                                                                          | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1    | fork `model/engine/rank.ts:848-872` and `:1091-1111`                                                                                           | Possible Duplicated Code: the new worn-gear read (`readStats`, finite-hit check, `hitCapBudgetFrom`, skip `StopRefusedSim`, warn, note) repeats the baseline read. A shared helper in this ported file needs the provenance cycle.                                                                                                                                                                                                                                                            |
| CQ2    | fork `wornMetaInactive` in `rank.ts`; `meta-repair.ts:200`, `:273-278`                                                                         | Possible Duplicated Code: it copies the guard in `repairAndMinimize` and re-implements `allGemIds`; an exported predicate from `meta-repair.ts` would stop the two drifting apart.                                                                                                                                                                                                                                                                                                            |
| CQ3    | fork `model/shown_figure.ts` (twice), `model/set_bonus_tip.ts:82`                                                                              | Possible Duplicated Code: `Math.round(Number(x.toFixed(1)) * 10)` written three times; `shown_figure.ts` could export the helper.                                                                                                                                                                                                                                                                                                                                                             |
| CQ4    | fork `model/results_view.ts` `PaneRows`, `components/ResultsPane/ResultsPane.tsx`                                                              | Possible Primitive Obsession: four booleans that cannot be true together (`noBisListRow`, `noSourceRow`, `ownedBisRow`, `ownedBisList`) drive a nested ternary; one reason union would replace them.                                                                                                                                                                                                                                                                                          |
| CQ5    | `packages/core/test/fork-meta-repair.test.ts`, `wornWithMetaOff` comment                                                                       | Comment says the repair "puts Rigid back"; the replaced gem was Enscribed Fire Opal (30584), so it puts Rigid in.                                                                                                                                                                                                                                                                                                                                                                             |
| R4-CQ1 | fork `model/results_view.ts:81`, `components/ResultsPane/ResultsPane.tsx:15`, `components/UpgradesResults/UpgradesResults.tsx:87-88` (round 4) | Stale comments after 4fd85ca4a: `:81` says `PaneEmptyReason` is what a pane says "when its main table is empty", and `ResultsPane.tsx:15` says "with no main table, `emptyReason` picks the empty state's text"; both now apply only when the group is empty too (`ResultsPane.tsx:45`, and the `paneRows` doc at `results_view.ts:99-101` says so). `UpgradesResults.tsx:87-88` says "each pane says no row comes from the shown sources", but a pane whose group has rows now says nothing. |

## Summary

Round 1 finds no confidently wrong number, and all three tickets are met.
Two findings that this branch introduced block the merge until they are
fixed or the owner allows a deferral, and they have no Disposition row yet:

- **A1** (blocks the merge): with Set potential on, the outcomes popover's
  item-alone line can read 3.0 for an item whose cell reads "+2.9" with
  Set potential off. Fix: pass the item-alone line through `shownValue`
  always, with a test.
- **A2** (blocks the merge): no test covers a worn repair under the hit
  cap. Fix: one test that reads hit under the cap and expects the hit gem
  kept.

Also open before round 2: the code-quality pass over CQ1 to CQ5 (one fresh
agent, no behaviour change, `pnpm verify` after it), then each CQ row gets
a Disposition row. Round 2 is the focused check over the fixes and that
pass.

Deferred: D1 to new ticket 746 (meta-gem repair counts hit at full value,
with no note, for every spec but ret and feral); P1 to ticket 745.
Bookkeeping applied in this review's commit: P6 (705 Resolution now says
what the recording check was) and B1 (map line for 745).

Ticket counts at round 1 (not final; round 2 is still to run): filed 2
(745, 746), closed 3 (618, 625, 705), by the two commands in the
`pre-merge-review` skill step 3.

Round 2 (2026-11-02): the round-1 fixes are correct and their tests pass,
but the focused check found two open code-quality findings in the fix
lines (R2-CQ6, R2-CQ7 under `## Focused check (round 2)`), so the review
stops there for the owner's decision. Ticket counts at round 2 by the
same commands: filed 3 (745, 746, 747), closed 3 (618, 625, 705).

Round 3 (2026-11-02, focused check over the 625 rework and the R2-CQ6 and
R2-CQ7 fixes): all four checks pass and nothing this branch wrote is wrong.
One finding from before this branch is deferred: R3-1, the first sentence
of the "No upgrades found" body, "Every candidate simmed at or below your
current gear.", is false when rows that gained DPS sit below the cutoff or
are hidden by BiS only (ticket 748). Final ticket counts by the two
commands in the `pre-merge-review` skill step 3, at a5221e29: filed 4
(745, 746, 747, 748), closed 3 (618, 625, 705). Filed is higher than
closed because the review found three defects from before this branch
(746, 747, 748) and the scope doc's Maintenance loop found 745.

Round 4 (2026-11-02, focused check over the ticket 748 fix): the fix is
correct, its tests catch its removal, and every changed string is true in
every state checked. The round stops on one code-quality finding in the
comments the fix left stale (R4-CQ1, under `## Code quality`), so it
writes no Disposition table and the merge check was not run. One finding
from before this branch is filed: R4-1, "No BiS-list item for this slot."
is false when the run left the slot's BiS-list item out (ticket 749); its
`defer` row goes in the next Disposition table.

Round 5 (2026-11-02, focused check over the R4-CQ1 comment fix and the
ticket 749 fix): both fixes are correct, the touched tests pass, and every
remaining empty-state text is true in every state checked. The new
`hadRowBeforeSourceCut` guard is needed and its slot arm is tested, but
its `tab === SHOPPING_LIST_TAB` arm is not: R5-1, a missing test in lines
this branch wrote, so the round stops there, writes no Disposition table,
and the merge check was not run. Bookkeeping B6 (the R4-CQ1 row's wording)
is applied.

## Disposition

| ID  | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                        |
| --- | ------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial  | fixed       | Fork dd137de96: the item-alone line goes through `shownValue` always (`set_bonus_tip.ts` `outcomesEntries`); test "shows the item-alone line one tenth under the bar when an outcome is marked" failed before (2.96 for 2.9). Re-pinned in 443f3e79. |
| A2  | Adversarial  | fixed       | c9141cc9: test 705-W5 reads hit 2% under the baseline and expects Rigid kept and no hit-cap note; it passed with no code change, so no bug.                                                                                                          |
| A3  | Adversarial  | wontfix     | Not a defect: a stopped run is marked stopped and never cached (`rank.ts:1521,1807,1824`); same as a Stop before the baseline read.                                                                                                                  |
| A4  | Adversarial  | wontfix     | Not a defect: one `computeStats` call, not a DPS sim; the cache key needs the repaired gear, so the read cannot move after the lookup without a restructure.                                                                                         |
| D1  | Domain       | defer       | .scratch/carry-forward/issues/746-meta-repair-hit-cap-only-ret-and-feral.md — from before this branch; other specs have no `repairCap`.                                                                                                              |
| D2  | Domain       | wontfix     | Moved to `## Code quality` as CQ5; disposed there.                                                                                                                                                                                                   |
| S5  | Standards    | wontfix     | Bookkeeping: the commit exists; rewording it would rewrite branch history for a subject line.                                                                                                                                                        |
| S6  | Standards    | wontfix     | Bookkeeping: each command runs as written in a fresh shell; the `cd` rule is about tool calls whose cwd persists.                                                                                                                                    |
| S7  | Standards    | wontfix     | Not a defect: the skip is on purpose and says why in a comment (`results_view.test.ts:297`); in a pair the recording exists and the test ran (149 passed).                                                                                           |
| P1  | Spec         | defer       | .scratch/carry-forward/issues/745-tab-scope-doc-misses-open-tickets.md — 17 of the 18 MISSING tickets were open before this branch.                                                                                                                  |
| P2  | Spec         | wontfix     | Sandbox environment, not this branch: `package.json` is not in the diff. Possibly the case of ticket 741 (hypothesis, untested).                                                                                                                     |
| P3  | Spec         | wontfix     | Not a defect: the check copies the baseline read's (`rank.ts:1094-1097`).                                                                                                                                                                            |
| P4  | Spec         | wontfix     | In scope: 644 and 655 are closed; the second Maintenance loop needs the rows gone.                                                                                                                                                                   |
| P5  | Spec         | wontfix     | In scope and accurate: the ticket asks for the rewording; the note shows only where it is true.                                                                                                                                                      |
| P6  | Spec         | fixed       | 705 Resolution now states the implementer's recording check in the ticket.                                                                                                                                                                           |
| B1  | Dispatcher   | fixed       | Added the 745 line to `.scratch/carry-forward/map.md`.                                                                                                                                                                                               |
| CQ1 | Code quality | fixed       | Fork c06b10b3f: the worn-gear and baseline reads share `readHitCap` and `hitCapReadFailed`, and all three hit reads share `hitPercentOf` (`rank.ts`); no behaviour change, E-W3 green, PROVENANCE row re-hashed. Re-pinned in 443f3e79.              |
| CQ2 | Code quality | fixed       | Fork c06b10b3f: `meta-repair.ts` exports `inactiveMeta`, which `repairAndMinimize` and the worn-gear read in `rank.ts` both call; `wornMetaInactive` is gone. PROVENANCE row re-hashed.                                                              |
| CQ3 | Code quality | fixed       | Fork d016093bd: `shown_figure.ts` exports `tenthsOf`; `shownTenths` and `set_bonus_tip.ts` use it.                                                                                                                                                   |
| CQ4 | Code quality | fixed       | Fork e3dbf38fa: `PaneRows.emptyReason` (one of five values, decided in `paneRows` in the order the pane read the flags) replaces the four flags; `ResultsPane.tsx` maps it to the same strings.                                                      |
| CQ5 | Code quality | fixed       | 443f3e79: the `wornWithMetaOff` comment says the repair puts Rigid in.                                                                                                                                                                               |

## Focused check (round 2)

Main range `d7bb4293..4421129b`; fork range `8a58f4af0..e3dbf38fa`
(`vendor/tbc-new-fork`, branch `fix/wrong-advice-text`). The branch moves
the fork pin (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
rc=1), so the fork log was read.

Dispatch note, round 2: `codex` is not on `PATH`; one fresh `general-task`
agent on Opus (review lane) ran the four checks, told it writes nothing.
The dispatching agent read the three conditions before dispatch and
proceeded although condition 1 does not hold as written (below), because
the Disposition rows of round 1 name the commit for every finding; the
user can rule otherwise.

Results:

- **Condition 1: fails as written (bookkeeping).** Five fix commits name
  no finding ID in their messages: main c9141cc9 (A2); fork dd137de96
  (A1), c06b10b3f (CQ1, CQ2), d016093bd (CQ3), e3dbf38fa (CQ4). Only the
  round-1 Disposition table links them. 443f3e79 is the re-pin and also
  changes the CQ5 test comment, which it names. 4421129b files ticket 747,
  which no Disposition row links; 747 says it is not a review finding and
  was there before this branch (`schemas/upgrades.schema.json` at fork
  `05da8b9ab` has no `tip_too_small`). 7cce2598 changes only this file
  and tickets its rows link.
- **Condition 2: one change outside a cited place.** Fork `rank.ts:1186-1189`
  at `e3dbf38fa` (the set-version hit read) now calls `hitPercentOf`; CQ1
  cites only `:848-872` and `:1091-1111`. Same error text, same `catch`.
  The CQ1 row already says "all three hit reads share `hitPercentOf`".
- **Condition 3: holds.** At fork `e3dbf38fa`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 e3dbf38fa`
  prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
  prints `239 A`, `1 M`: the same as round 1 at `8a58f4af0`.
- **Check 2 (only what each finding asks): pass**, except the third
  hit-read site above. CQ1, CQ2 and CQ4 change no behaviour: `inactiveMeta`
  (`meta-repair.ts:207`) keeps the same truthy gems in the same order as
  the removed `wornMetaInactive`; the shared `hitCapReadFailed`
  (`rank.ts:847-856`) adds the same single note for the worn-gear read,
  which runs first.
- **CQ4 claim: confirmed.** The no-source and already-worn cases can both
  hold (`results_view.ts:123-127` at `e3dbf38fa`); the agent built one
  (BiS only, owned BiS helm from Zul'Aman, unowned BiS helm from Black
  Temple, Black Temple hidden) and got `'no-source-row'`. For every
  combination of the four old flags, the new order shows the string the
  old ternary showed (`ResultsPane.tsx:41-47` at `8a58f4af0`). Round 1's
  "cannot be true together" in CQ4 was wrong.
- **CQ1/CQ2 provenance: confirmed.** The sha256 of `rank.ts` and
  `meta-repair.ts` at `e3dbf38fa` each appear once in
  `docs/fork-provenance/engine.md`; the old hashes appear 0 times; other
  rows changed only in column padding. The lock `commit` and
  `sim-implemented-effects.json` `forkCommit` both read `e3dbf38fa`.
- **Check 3 (tests assert their findings): pass.** With the A1 fix
  reverted in a scratch copy, the new `set_bonus_tip` test failed
  (`expected 2.96 to be 2.9`, rc=1). With the worn budget forced to
  `remaining: 0`, W5 failed and W1 to W4 passed, so W5 catches the bug A2
  described.
- **Check 4 (touched tests pass): pass.** Node v22.23.2. Fork
  `node node_modules/vitest/vitest.mjs run ui/features/upgrades`: 65
  files, 743 passed, rc=0. Main `fork-meta-repair.test.ts` and
  `wowsims-fork-parity.test.ts` (E-W3): 36 passed, rc=0. Fork `tsc
--noEmit` rc=0; `oxlint --max-warnings 0` on the 9 changed fork files
  rc=0.

Findings of round 2 that are not bookkeeping (still open; no
Disposition row yet):

- **R2-CQ6 (code quality).** Fork `ui/features/upgrades/model/set_bonus_tip.ts`
  at `e3dbf38fa` fails the fork's formatter: a double blank line at
  `:80-81` (left when d016093bd removed `tenths`), and the `line(...)`
  call at `:285-288` that oxfmt joins to one line after dd137de96. The
  file was clean at `8a58f4af0`. Re-run: from inside the fork,
  `git show e3dbf38fa:ui/features/upgrades/model/set_bonus_tip.ts | node_modules/.bin/oxfmt --stdin-filepath=ui/features/upgrades/model/set_bonus_tip.ts | diff <(git show e3dbf38fa:ui/features/upgrades/model/set_bonus_tip.ts) -`
  (rc=1 at `e3dbf38fa`, rc=0 at `8a58f4af0`). Fix: run `oxfmt` on the
  file in the fork, commit, re-pin.
- **R2-CQ7 (test coverage).** No test covers the state where the
  no-source and already-worn cases both hold, which the order in
  `paneRows` (`results_view.ts:125-133`) decides. Several CQ4 assertions
  are `.not.toBe(...)` where the exact reason is known, for example
  `results_view.test.ts:300` asserts `.not.toBe('no-bis-list-row')` right
  after `.toBe('owned-bis-row')`, and the `.not.toBe('owned-bis-row')`
  lines at `:268-273` would still pass if the owned case were hidden
  behind the no-source text. Fix: one test for the owned-plus-hidden-source
  case expecting `'no-source-row'`, and exact expected reasons in place
  of the `.not.toBe` lines.

Bookkeeping found in round 2: B2, fix commits without finding IDs
(condition 1 above; the fork is unpushed, `pushed: false`, so rewording
is possible but moves every fork sha and needs another re-pin); B3,
ticket 747 is not linked from this file (it is recorded here now).

Outcome: round 2 reports two findings that are not bookkeeping, so by the
skill's "Round limit" the review ends here with no `## Disposition
(round 2)` table. The owner decides: fix R2-CQ6 and R2-CQ7 (a small
fork change, a re-pin, then a further focused check), or allow them as
`defer` rows with tickets.

## Disposition (round 2)

The brief that dispatched this rework (2026-11-02) said to fix R2-CQ6 and
R2-CQ7 and not to run a further round; no further focused check has run.

| ID     | Axis         | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------ | ------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R2-CQ6 | Code quality | fixed       | Fork 81e803ada: `oxfmt` on `model/set_bonus_tip.ts` (the double blank line and the `line(...)` call); the round-2 re-run command now prints no diff for the file. Re-pinned in de8b0e45.                                                                                                                                                                                                                                                            |
| R2-CQ7 | Code quality | fixed       | Fork eee005acc: the already-worn reason is gone (row 625 below), so the test "says no BiS-list item before no shown source, and no shown source before no upgrades" (`results_view.test.ts`) pins the order that remains, including the worn-helm-plus-hidden-source pane, which gets `'no-source-row'`; with the first two reasons swapped in `paneRows` it fails. The `.not.toBe` reason assertions are now exact `.toBe`. Re-pinned in de8b0e45. |
| 625    | Owner        | fixed       | Fork eee005acc reworks ticket 625 after the owner's ruling (below): the `owned-bis-row` and `owned-bis-list` reasons, their locale keys and schema properties are gone, so those panes show "No upgrades found" again, and the hint under it now says "Widen your filters to consider more items." Ticket 625's Done when and Resolution are rewritten. Re-pinned in de8b0e45.                                                                      |
| B2     | Bookkeeping  | wontfix     | Rewording the round-1 commits would move every fork sha and need another re-pin; the round-1 Disposition table links each one. The round-2 commits (eee005acc, 81e803ada, de8b0e45) name their finding IDs or ticket.                                                                                                                                                                                                                               |
| B3     | Bookkeeping  | fixed       | Ticket 747 is recorded under `## Focused check (round 2)` above.                                                                                                                                                                                                                                                                                                                                                                                    |

The owner's words on ticket 625, 2026-11-02: "I think the issue is "phase
or content filter" is too specific and narrown". Earlier in the same
exchange, on the text that replaced "No upgrades found": "This sounds
dumb" and "This isn't for an item the users character already has
equipped". Background: `.scratch/agent-reports/2026-11-02-general-task-owner-meaning-625.md`
in the main checkout.

The round-1 CQ4 row says `emptyReason` has five values; after eee005acc
it has three (`no-bis-list-row`, `no-source-row`, `no-upgrades`).

## Focused check (round 3)

Main range `4421129b..be968c38`; fork range `e3dbf38fa..81e803ada`
(`vendor/tbc-new-fork`, branch `fix/wrong-advice-text`). The branch moves
the fork pin (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
rc=1), so the fork log was read.

Dispatch note, round 3: requested by the dispatching session on
2026-11-02 as the next focused check, over the 625 rework on the owner's
ruling and the R2-CQ6 and R2-CQ7 fixes. `codex` is not on `PATH`
(`command -v codex` rc=1). One fresh subagent on Opus (review lane), with
no part in writing the code, ran the four checks itself and wrote only
this file and tickets. A `discrete-task` helper (Sonnet) ran the
fork test, lint, format and locale commands and three mutation runs in a
`$TMPDIR` copy of the fork, and wrote nothing in either repo. Both trees
were clean at dispatch (`git status --porcelain` empty in each).

Results:

- **Condition 1: holds except for the owner's rework.** Main 20d97407 and
  be968c38 change only this file and ticket 625 (which row 625 of
  `## Disposition (round 2)` links); de8b0e45 is a fork re-pin (lock and
  `data/sim-implemented-effects.json` only). Fork 81e803ada names R2-CQ6.
  Fork eee005acc names R2-CQ7 and ticket 625; its 625 part is new work on
  the owner's ruling, not a fix for a finding of this review, so it is
  outside the condition's list as written. The dispatching session asked
  for this round to cover it; the user can rule that it needs a fresh
  round 1.
- **Condition 2: holds.** Every non-test line eee005acc changes is in the
  places row 625 names (the locale, the schema, `ResultsPane.tsx`,
  `results_view.ts`); 81e803ada changes only `set_bonus_tip.ts:80-81` and
  `:284`, the places R2-CQ6 cites.
- **Condition 3: holds.** At fork `81e803ada`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 81e803ada`
  prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
  prints `239 A`, `1 M`, the same as round 2. No ported engine file
  changed (`docs/fork-provenance/engine.md` names none of the changed
  files, `grep -c` 0). The lock `commit` and `sim-implemented-effects.json`
  `forkCommit` both read `81e803ada`.
- **Check 2 (only what each finding asks): pass.** Nothing of the removed
  reasons is left: `git -C vendor/tbc-new-fork grep -nE "owned-bis|owned_bis|ownedBis|allOwned"`
  at HEAD finds only the test variable `ownedBisHelm`
  (`results_view.test.ts:261`); in main the strings appear only in ticket
  625, this file and the lock's `_comment` history. A script comparing
  every object of `assets/locales/en/upgrades.json` with
  `schemas/upgrades.schema.json` (`properties` and `required`) finds
  `upgrades_tab.results` matching exactly. `EMPTY_BODY_KEYS` in
  `ResultsPane.tsx` is checked against `PaneEmptyReason` by its
  `satisfies` clause, and `tsc --noEmit` is rc=0. The `paneRows` comment
  lists the three reasons that remain. No `.not.toBe` on an empty reason is
  left in the fork's tests.
- **Check 3 (tests assert their findings): pass.** In a `$TMPDIR` copy of
  the fork, three edits to the `emptyReason` line in `paneRows` each fail
  the new test "says no BiS-list item before no shown source, and no shown
  source before no upgrades": swapping the first two reasons (2 tests
  fail), keying the no-source reason on `rows.length === 0` (2 fail), and
  an all-worn check placed before the no-source check (1 fails, the new
  test). The baseline copy passed (49 passed, 1 skipped). R2-CQ6: the
  round-2 re-run command prints no diff at `81e803ada` (rc=0).
- **Check 4 (touched tests pass): pass.** Node v22.23.2. Fork
  `node node_modules/vitest/vitest.mjs run ui/features/upgrades`: 65
  files, 741 passed, rc=0 (743 at round 2; eee005acc removes two
  `ResultsPane` tests and merges two `results_view` tests into one).
  `tsc --noEmit` rc=0; `oxlint --max-warnings 0 ./ui` rc=0;
  `oxfmt --check` on the 7 changed files rc=0. Main
  `fork-meta-repair.test.ts` and `wowsims-fork-parity.test.ts`: 36
  passed, rc=0. The fork's `node test-locales.mjs` fails (rc=1) on
  `upgrades_tab/set_bonus`, ticket 747, from before this branch.

**Is the generic body true wherever it shows?** The new second sentence,
"Widen your filters to consider more items.", names no one filter, as
the owner asked. The first sentence, "Every candidate simmed at or below
your current gear.", is not always true; it is unchanged since fork
`2c88a1192` (2026-10-08) and is in the `dev` pin `05da8b9ab`:

- **R3-1 (from before this branch).** The body shows for a pane whose main
  table is empty (`ResultsPane.tsx:41-45`) and for the whole-results empty
  state (`UpgradesResults.tsx:96-101`). It is false when the pane's
  below-cutoff group holds a row that gained DPS below the cutoff: the
  `ResultsPane.test.tsx:96-107` test renders that state (its row,
  `fixtureRow(5)`, has `deltaDps` 2.91 under a 3 DPS cutoff) and the line
  this branch added at `:103-106` asserts the sentence there. In the
  `ret-p3-p2` recording 9 of 894 rows are below the cutoff with
  `deltaDps > 0`, two of them necks (up to +1.25); so the neck pane under
  BiS only, ticket 625's case, also hides two candidates that simmed above
  the worn neck. Under BiS only with no BiS-list row in the run, the
  whole-results state shows it too (read from `UpgradesResults.tsx:56`,
  `:90-91` and `bisOnlyView`; not run). The 625 rework sends those panes
  back to the text they showed on `dev`, so the branch adds no new place
  where the sentence shows. Effect: false text, visible, from before this
  branch; deferred to ticket 748. Its fix is player-facing text and needs
  the owner's words.

Bookkeeping found in round 3: B4, ticket 747 named one missing schema key;
the check stops at its first error and hides a second,
`upgrades_tab.assumptions.substitution_in_slot` (in the locale, not in the
schema, at `05da8b9ab`, `e3dbf38fa` and `81e803ada`). Added to 747 in
a5221e29. The intro of `## Disposition (round 2)` says no further focused
check has run; this section is that check.

## Disposition (round 3)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                      |
| ---- | ------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| R3-1 | Focused check | fixed       | Fork 4fd85ca4a, re-pinned in 7718f078: a pane whose main table is empty shows only its closed group when the group has rows, and "No items to show" / "Try widening your filters." when it has none; the group label names no cutoff. Words from the owner (2026-11-02); ticket 748 closed. Superseded in round 4. |
| B4   | Bookkeeping   | fixed       | a5221e29: ticket 747 now also names `upgrades_tab.assumptions.substitution_in_slot`.                                                                                                                                                                                                                               |

## Focused check (round 4)

Main range `be968c38..096dbfc1`; fork range `81e803ada..4fd85ca4a`
(`vendor/tbc-new-fork`, branch `fix/wrong-advice-text`). The branch moves
the fork pin (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
rc=1), so the fork log was read.

Dispatch note, round 4: requested by the dispatching session on
2026-11-02 as the next focused check, over the ticket 748 fix (R3-1), with
the owner's rule for this round: every player-facing string must be true
in every state it shows in, judged against what else is on screen.
`codex` was not tried; one fresh `general-task` subagent on Opus (review
lane), with no part in writing the code, ran the four checks and the
string check itself and wrote only this file and tickets. A
`glm-flash-task` helper ran the fork test, type, lint, format and locale
commands, two mutation runs in a `$TMPDIR` copy of the fork, and the main
tests, and wrote nothing in either repo. Both trees were clean at
dispatch (`git status --porcelain` empty in each).

Results:

- **Condition 1: holds.** Main a5221e29 changes tickets 747 and 748 (rows
  B4 and R3-1 link them), `NEXT` and the map; e6455f9e and 096dbfc1 change
  only this file and ticket 748; 7718f078 is a fork re-pin (lock and
  `data/sim-implemented-effects.json` only). Fork 4fd85ca4a names ticket
  748, R3-1's ticket.
- **Condition 2: holds.** Every non-test line 4fd85ca4a changes is at a
  place ticket 748 cites (`upgrades.json:147-148`, `ResultsPane.tsx:41-45`,
  `UpgradesResults.tsx` comments, the `paneRows` doc) or carries an owner
  ruling quoted in its Resolution (the group labels and their schema keys:
  "i dont like the term "the cutoff"").
- **Condition 3: holds.** At fork `4fd85ca4a`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 4fd85ca4a`
  prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
  prints `239 A`, `1 M`, the same as round 3. None of the 11 changed files
  is in `docs/fork-provenance/engine.md` (`grep -c` 0 for each). The lock
  `commit` and the `forkCommit` both read `4fd85ca4a`.
- **Check 2 (only what the finding asks): pass,** with R4-CQ1 below.
- **Check 3 (tests assert the finding): pass.** In a `$TMPDIR` copy,
  baseline `ResultsPane` tests 21 passed. Deleting
  `belowCutoff.length > 0 ? null : ` at `ResultsPane.tsx:45` fails 2: "shows
  only the closed group, with no empty-state message, when the only row
  gained DPS below the bar" and "shows no empty-state message beside the
  group when Filter by source emptied the main table". Changing
  `below_cutoff_group_bar_one` to the plural text fails 2, including "names
  the bar as a gain in DPS on the group once a ranking is shown, never as a
  cutoff".
- **Check 4 (touched tests pass): pass.** Node v22.23.2. Fork
  `vitest run ui/features/upgrades ui/app`: 85 files, 844 passed, rc=0.
  `tsc --noEmit` rc=0; `oxlint --max-warnings 0 ./ui` rc=0; `oxfmt --check`
  on the 11 changed files rc=0 (it checks 10; it skips
  `schemas/upgrades.schema.json`). `node test-locales.mjs` rc=1 only on
  `upgrades_tab/set_bonus`, ticket 747, from before this branch. Main
  `fork-meta-repair.test.ts` and `wowsims-fork-parity.test.ts`: 36 passed,
  rc=0, run with `node node_modules/vitest/vitest.mjs`; `pnpm -C <pair>
exec vitest` refused to start ("This project is configured to use
  12.16.1 of pnpm. Your current pnpm is v11.24.0").

**Is each string true in every state it shows in?** Read from the code at
fork `4fd85ca4a`; not run in the tab.

- "N items that gain less than 3 DPS" (`_one`/`_other`): the group holds
  rows that miss the bar, are not owned and are not on a BiS list
  (`results_view.ts:114`, `:123`). Without Set potential the bar reads
  `deltaDps`; with it, `deltaDps` plus the set credit
  (`engine/view.ts:231-245`), the same figure the ΔDPS cell shows
  (`DeltaCell.tsx:27`, `dpsSortKeyFor`), and `shownTenths` keeps a figure
  under the bar from reading as the bar (ticket 618). A stopped run carries
  the cutoff (`StoppedRanking` is a `PartialRanking`, which keeps
  `cutoff`), so it gets this label too. True. A row that loses DPS is in
  the group; "gains less than 3 DPS" is still true of it. BiS-list rows
  that miss the bar sit in the main table, so the label counts the group,
  not every row under 3 DPS on screen; it does not claim to.
- "1 more item" / "N more items": only when the row context has no
  ranking; `ResultsPanes` renders only for a done or stopped run, which
  always has one (`useResultsView.ts:52`, `:68`). Not reachable in the tab.
- "No items to show" / "Try widening your filters.": a pane with no main
  row and no group row and no other reason, and the whole-results state of
  a done run with no row (`UpgradesResults.tsx:91`, `:96-101`). In each,
  no result row is on screen. A pane can reach it with rows that are all
  owned and miss the bar (owned rows show in neither table,
  `results_view.ts:72`, `:114`), for example a BiS-only slot whose BiS-list
  item is worn; "No items to show" is still true there, and turning BiS
  only off shows more. The hint is the generic one the owner asked for.
- "No rows from the shown sources.": now only when "Filter by source"
  emptied the pane and the group is empty too (`results_view.ts:118-119`,
  `ResultsPane.tsx:45`, `:51`). Removing it beside a group is right: there
  it sat above rows from the shown sources, which made it false. With the
  group empty, no row from a shown source is on screen, so it is true; the
  view toggles still show how many sources are hidden.
- "No BiS-list item for this slot.": **R4-1**, below.
- **The pane with an empty main table and a closed group.** Its slot tab
  reads 0 and is dimmed (`ResultsPanes.tsx:72-74`); the count is rows that
  meet the bar (`slotTabs`), and the pane shows only "N items that gain
  less than 3 DPS", closed, which says why the count is 0. Under BiS only
  the group is always empty (every row is on a BiS list, and BiS-list rows
  that miss the bar go to the main table), so BiS only never shows this
  pane. Not confusing; no finding.

Findings:

- **R4-1 (from before this branch).** Under BiS only, a slot pane with no
  BiS-list row says "No BiS-list item for this slot."
  (`upgrades.json:152`; `noBisListRow` at `results_view.ts:117`). The run's
  candidates are cut before the sim: by the pre-run Sources settings and
  the set prune (`settings_pool.ts:208-213`, from `run.ts:115`), and by
  `poolFor` (missing effect, item-level floor, heroic five-man policy,
  `pool_source.ts:153-156`); the BiS tag goes only on entries that survive
  (`:167`). So when the player unticked the source of the slot's BiS-list
  item, the pane says the slot has none although the BiS list names one.
  Read from the code; not run in the tab. The text came in with fork
  `08afcdcce` (2026-10-11) and is in the `dev` pin `05da8b9ab`. Effect:
  false text, visible, from before this branch. Filed as ticket 749; the
  fix is player-facing text and needs the owner's words.
- **R4-CQ1 (code quality, in this branch's fix).** Stale comments, row
  R4-CQ1 under `## Code quality`. It goes to the code-quality pass.

Bookkeeping applied in this round: B5, the R3-1 row in
`## Disposition (round 3)` now says "Superseded in round 4", as
`docs/agents/known-traps.md` "Before writing a review Disposition table"
asks.

The round reports a code-quality finding in the fix, so by the skill's
"Round limit" it writes no Disposition table and the merge check was not
run. Open: R4-CQ1 (needs the code-quality pass, then a focused check of
it) and R4-1 (a `defer` row to ticket 749 in that round's table).

## Disposition (round 4)

| ID     | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                   |
| ------ | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R4-CQ1 | Code quality  | fixed       | Fork e4bae67e6, re-pinned in 8741a765: the comments at `results_view.ts` (`PaneEmptyReason`) and `ResultsPane.tsx` (`rows` prop) say the empty-state text shows only when the main table and the below-cutoff group are both empty, and the one at `UpgradesResults.tsx` (`filteredEmpty`) says each pane can say why it is empty (`paneRows`). |
| R4-1   | Focused check | fixed       | Ticket 749, closed. Fork 4626c5d7b, re-pinned in 8741a765: "No BiS-list item for this slot." and the `no-bis-list-row` reason are removed; such a pane shows "No items to show" / "Try widening your filters." (owner, 2026-11-02: "a generic one that can be used regardless of filters. it doesnt need tobe so long.").                       |

## Focused check (round 5)

Main range `096dbfc1..40051a16`; fork range `4fd85ca4a..4626c5d7b`
(`vendor/tbc-new-fork`, branch `fix/wrong-advice-text`). The branch moves
the fork pin (`git diff --quiet dev...HEAD -- data/wowsims-fork.lock.json`
rc=1), so the fork log was read.

Dispatch note, round 5: requested by the dispatching session on
2026-11-02 as the next focused check, over the R4-CQ1 comment fix and the
ticket 749 fix, with the owner's rule for this round: every player-facing
string must be true in every state it shows in, judged against what else
is on screen, and no "cutoff" in player text. `codex` was not tried; one
fresh `general-task` subagent on Opus (review lane), with no part in
writing the code, ran the four checks and the string check itself and
wrote only this file. A `glm-flash-task` helper ran the fork test, type,
lint, format and locale commands and four mutation runs in a `$TMPDIR`
copy of the fork, and wrote nothing in either repo. Both trees were clean
at dispatch (`git status --porcelain` empty in each).

Results:

- **Condition 1: holds.** Main ef04f0a7 changes this file, ticket 749
  (row R4-1 links it), `NEXT` and the map; 40051a16 changes only this file
  and ticket 749; 8741a765 is a fork re-pin (`data/wowsims-fork.lock.json`
  and `data/sim-implemented-effects.json`, one line each for the commit,
  plus the lock's `_comment`). Fork e4bae67e6 names R4-CQ1; 4626c5d7b names
  ticket 749, R4-1's ticket.
- **Condition 2: holds.** e4bae67e6 changes only the three comments R4-CQ1
  cites. 4626c5d7b removes the key, its schema entry and its
  `EMPTY_BODY_KEYS` line (`upgrades.json:152`, `ResultsPane.tsx:51`, both
  cited by ticket 749), the `no-bis-list-row` reason and the `bisOnly` flag
  only it read (`results_view.ts:117`, cited; `grep` finds no other reader
  of `bisOnly` under `ui/`), and adds `hadRowBeforeSourceCut` on the next
  line, which keeps the job the removed `noBisListRow` did for a slot with
  no row before the source cut.
- **Condition 3: holds.** At fork `4626c5d7b`,
  `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M cec2a7b68 4626c5d7b`
  prints only `6 0 ui/app/SimTabsSection.tsx`, and `--name-status ... | cut -f1 | sort | uniq -c`
  prints `239 A`, `1 M`, the same as round 4. None of the 7 changed files
  is in `docs/fork-provenance/engine.md` (`grep -c` 0 for each). The lock
  `commit` and the `forkCommit` both read `4626c5d7b`.
- **Check 2 (only what the finding asks): pass.** The 749 fix removes the
  false text and its reason and nothing else on screen changes, except
  through the guard below, which is needed.
- **Check 3 (tests assert the finding): pass for the 749 text; see R5-1
  for the guard.** `ResultsPanes.test.tsx` "under BiS only gives a slot
  with no BiS-list row the generic empty text, never that the slot has no
  BiS-list item" pins the on-screen text. The ticket's "Done when" asks for
  a slot whose BiS-list item the Sources settings left out of the run; the
  test's chest slot has no BiS-list row, and `paneRows` reads only the
  run's rows, so the two cannot differ on screen. Agreed. Mutation runs in
  a `$TMPDIR` copy, `vitest run ui/features/upgrades/model/results_view.test.ts ui/features/upgrades/components`:
  control 205 passed, 1 skipped, rc=0. M1, `(rows.length === 0 && hadRowBeforeSourceCut)`
  to `rows.length === 0` at `results_view.ts:120`: 1 fails, "under BiS
  only, says no row comes from the shown sources only for a slot that had
  a BiS-list row before the source cut". M3,
  `view.slotsBeforeSourceCut?.includes(tab) === true` to `true` at `:119`:
  the same test fails. M2, dropping `tab === SHOPPING_LIST_TAB ||` at
  `:119`: every test passes (R5-1).
- **Check 4 (touched tests pass): pass.** Node v22.23.2. Fork
  `npx vitest run ui/features/upgrades ui/app`: 85 files, 844 passed, rc=0.
  `tsc --noEmit` rc=0; `oxlint --max-warnings 0 ./ui` rc=0; `oxfmt --check`
  on the 7 changed files rc=0. `node test-locales.mjs` rc=1 only on
  `upgrades_tab/set_bonus` ("must NOT have additional properties"), ticket
  747, from before this branch. Main `fork-meta-repair.test.ts` and
  `wowsims-fork-parity.test.ts` with `node node_modules/vitest/vitest.mjs`:
  36 passed, rc=0.

**The `hadRowBeforeSourceCut` guard** (`results_view.ts:119-121`).

- Needed: yes. Without it, removing `noBisListRow` would leave
  `sourceCutEmptied = rows.length === 0 || ...`, so under BiS only with a
  source hidden, a slot that had no BiS-list row before the cut would say
  "No rows from the shown sources.", blaming the filter for a pane BiS
  only emptied. M1 shows the test sees this.
- Correct: yes. `sourcesView` builds `slotsBeforeSourceCut` from the rows
  it is given (`:222`), which under BiS only are already the BiS-list rows
  (`resultsViewFor` cuts BiS only first, `:246`), so it names exactly the
  slots that had a BiS-list row. Without BiS only every slot tab comes from
  a row before the cut (`tabSlots`, `:221`), so the guard changes nothing
  there. The Upgrades pane arm is right because `sourcesView` sets
  `sourcesHidden` only when it cut at least one row (`:219`), so that pane
  always had a row before the cut.
- Tested: the slot arm, yes (M1, M3). The Upgrades pane arm, no (R5-1).

**Is each remaining empty text true in every state it shows in?** Read
from the code at fork `4626c5d7b`; not run in the tab. No player text
under `upgrades_tab.results` contains "cutoff" (`assets/locales/en/upgrades.json:144-157`).

- "No items to show" / "Try widening your filters.": a pane with no main
  row, no group row and no source-cut reason, and the whole-results state
  of a done run with no row and no hidden source (`UpgradesResults.tsx:91`,
  `:96-101`). The new state from 749 is a BiS-only slot with no BiS-list
  row: nothing is on screen, and BiS only is on, so the hint names a
  filter the player can widen. True. The state where no filter can be
  widened needs a slot whose every candidate is worn: `owned` means
  equipped (`engine/rank.ts:1330`) and the pool is every item the player
  can equip at the phase (`pool_source.ts:210-222` `buildPool`, from
  `db.getAllItems()`), so a slot tab almost always has an unworn row in its
  main table or group (hypothesis, untested: not driven in the tab).
- "No rows from the shown sources.": now only when "Filter by source"
  emptied the pane, the group is empty, and the pane had a row before the
  cut (a slot in `slotsBeforeSourceCut`, or the Upgrades pane). With the
  group empty, no row from a shown source is on screen, so it is true.
  One state reads oddly but stays true: under BiS only, a slot whose one
  BiS-list row is worn shows "No items to show" (ticket 625); hiding that
  row's source changes the text to "No rows from the shown sources." This
  comes from the `rows.length === 0` arm, which is older than this branch,
  and ticket 648's rule covers only a cut that leaves rows behind. No
  finding.
- "N items that gain less than 3 DPS" and "1 more item" / "N more items":
  not changed in this range; round 4 judged them.
- "No ranking yet", "Rows appear here as their sims finish." and "No
  candidate list for Phase N": not changed on this branch (the last came in
  with fork af93190ba, an ancestor of the `dev` pin `05da8b9ab`); not
  judged in this round.

Findings:

- **R5-1 (missing test, in this branch's fix).** Fork
  `ui/features/upgrades/model/results_view.ts:119`: the
  `tab === SHOPPING_LIST_TAB ||` arm of `hadRowBeforeSourceCut` has no
  test; with it removed every test passes (M2). It decides the Upgrades
  pane's text when "Filter by source" removes every row of a run whose
  rows all missed the bar (so `panesWithMainBeforeSourceCut` is empty):
  with the arm the pane says "No rows from the shown sources.", without it
  "No items to show". Both texts are true there, so nothing on screen is
  wrong today; the arm is new code in 4626c5d7b with nothing to keep it.
  Suggested fix: one `results_view.test.ts` case, a ranking whose rows are
  all below the bar and not on a BiS list, `bySource` hiding every source,
  expecting `paneRows(view, SHOPPING_LIST_TAB).emptyReason` to be
  `'no-source-row'`, run once with the arm removed to see it fail. By the
  skill's step 3 a missing test this branch introduced blocks the merge
  until it is fixed or the owner allows a deferral.

Bookkeeping applied in this round: B6, the R4-CQ1 row in
`## Disposition (round 4)` said all three comments say the empty text
shows only when both tables are empty; the `UpgradesResults.tsx` one says
each pane can say why it is empty (`paneRows`). The row now says so.

The round reports a finding other than bookkeeping, so by the skill's
"Round limit" it writes no Disposition table and the merge check was not
run. Open: R5-1 (one test, then a focused check of it).

## Disposition (round 5)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R5-1 | Focused check | fixed       | Fork 13a980cf3, re-pinned in 85c7ee8d: `results_view.test.ts` "says the Upgrades pane has no row from the shown sources when the filter hid every row, all of them below the cutoff" (two rows below the cutoff, on no BiS list, both sources hidden) expects `'no-source-row'`. With the `tab === SHOPPING_LIST_TAB` arm of `hadRowBeforeSourceCut` removed it fails (`expected 'no-upgrades' to be 'no-source-row'`). |
