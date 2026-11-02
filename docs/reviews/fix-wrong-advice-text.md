# Pre-merge review — fix/wrong-advice-text

Reviewed range: `b24a4228705bd681a65a1b97f4a0d1fa01fc6073..d7bb429347f8c40b807d0659728714a34edfff90`

Reviewed range: `d7bb429347f8c40b807d0659728714a34edfff90..4421129b5c040a02cb0476af63555808c5cb323c`

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

| ID  | Where                                                                             | Finding                                                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CQ1 | fork `model/engine/rank.ts:848-872` and `:1091-1111`                              | Possible Duplicated Code: the new worn-gear read (`readStats`, finite-hit check, `hitCapBudgetFrom`, skip `StopRefusedSim`, warn, note) repeats the baseline read. A shared helper in this ported file needs the provenance cycle. |
| CQ2 | fork `wornMetaInactive` in `rank.ts`; `meta-repair.ts:200`, `:273-278`            | Possible Duplicated Code: it copies the guard in `repairAndMinimize` and re-implements `allGemIds`; an exported predicate from `meta-repair.ts` would stop the two drifting apart.                                                 |
| CQ3 | fork `model/shown_figure.ts` (twice), `model/set_bonus_tip.ts:82`                 | Possible Duplicated Code: `Math.round(Number(x.toFixed(1)) * 10)` written three times; `shown_figure.ts` could export the helper.                                                                                                  |
| CQ4 | fork `model/results_view.ts` `PaneRows`, `components/ResultsPane/ResultsPane.tsx` | Possible Primitive Obsession: four booleans that cannot be true together (`noBisListRow`, `noSourceRow`, `ownedBisRow`, `ownedBisList`) drive a nested ternary; one reason union would replace them.                               |
| CQ5 | `packages/core/test/fork-meta-repair.test.ts`, `wornWithMetaOff` comment          | Comment says the repair "puts Rigid back"; the replaced gem was Enscribed Fire Opal (30584), so it puts Rigid in.                                                                                                                  |

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
