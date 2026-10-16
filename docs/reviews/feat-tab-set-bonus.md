# Pre-merge review — feat/tab-set-bonus

Reviewed range: `34fe4ac64a996518fe37da0b9234d905208c2416..60aa11411c4f5ee84240b0b22ae8a2e4a765c833`

Fork range (round 1): `176268e7c1acb552c3c9cba9337eb29b181f080e..f4b78f65dd7ffb9df256a9f04ccf1d889a5033c4` in `vendor/tbc-new-fork`, branch `feat/tab-set-bonus`.

Tickets 467 (net value of a set bonus), 497 (Malorne/Nordrassil 4pc vs worn
Thunderheart, closed as designed), 336 (set-bonus popover whatever the Set
potential toggle says, design A) and new ticket 635, built through the
stage-gate pipeline (`.scratch/stage-gate/tab-set-bonus/` in the main
checkout, gitignored).

**Dispatch.** Full axes: the branch changes `data/` files
(`git diff --name-only dev...HEAD` lists `data/sim-implemented-effects.json`
and `data/wowsims-fork.lock.json`; `--shortstat`: 11 files, 768 insertions,
25 deletions), so the small-change lane does not apply. `codex` is not on
`PATH` (`which codex`), so each axis ran as a fresh `general-task` subagent
on Opus (review lane), in one parallel batch: adversarial, domain, and the
`code-review` skill's Standards and Spec sub-axes, each told it writes
nothing. The domain axis ran because the diff is game-domain work (set
bonus values and the wording shown to the player).

**Upstream-file audit (owner rule).**
`git -C vendor/tbc-new-fork diff --name-only 176268e7c..f4b78f65d` lists
only `assets/locales/en/upgrades.json`, `schemas/upgrades.schema.json` and
six paths under `ui/features/upgrades/`. The
`docs/fork-upstream-touchpoints.md` check
(`git -C vendor/tbc-new-fork diff --name-status --diff-filter=M 5262ff38 <tip>`)
prints only `M ui/app/SimTabsSection.tsx` (the approved edit); the status
count is 260 A, 1 M.

## Adversarial

No figure in the popover is wrong without warning, and no Breaks price is
credited to another bonus: a reachable step line is
`stepGearDps − singleDeltaDps`, which includes every break, and its label
names only the breaks beyond the row's own swap. The 497 tests and the new
fork tests ran and pass (`corepack pnpm -C <pair> exec vitest run packages/core/test/fork-set-net.test.ts -t 497`:
2 passed; fork: 47 passed over the three changed test files).

- **A1.** With the toggle on, a credited row keeps its step popover, cut at
  the best stop (`engine/view.ts:665`), and `set_bonus_tip.ts:287` skips
  the "Not counted" lines, so a 4pc past the stop is listed with the toggle
  off and not with it on. A scratch probe outside the repo showed it.
  Behaved this way before the branch; mock-up row 5 shows it as designed.
- **A2.** On a step ranking, rank.ts deletes a future's `pieces` when the
  partner choice is unmeasured, and the toggle-off line then reads
  "{set} 2pc with " with nothing after "with" (`set_bonus_tip.ts:192`,
  `set_bonus_labels.ts:14`). Introduced by the branch.
- **A3.** Every new reachable-line test has `singleDeltaDps === deltaDps`,
  so a regression to `row.deltaDps` would pass. Test gap, introduced by the
  branch.
- **A4.** A popover whose "Not counted" section holds only a screened set
  gets the heading "Not counted (Set potential is off)" with the toggle off
  (`set_bonus_tip.ts:290`), but the toggle is not why a screened set is not
  counted. Introduced by the branch (mock-up row 4 shows it).

## Domain

The wording shown to the player, the ticket close notes and the scope-doc
change agree with the wowsims set code (`sim/druid/item_sets.go` at the
fork tip: Malorne 2pc and 4pc, Nordrassil 4pc only, Thunderheart 2pc and
4pc) and with the set screen's reasons (`set-screen.ts:463-495`).

- **D1.** The 467, 497, 635 and 336 notes cite scripts and run files in the
  main checkout's gitignored stage folder (`.gitignore:59`), which no other
  clone can re-run. The tickets say so.
- **D2.** Ticket 635's cause is correctly labelled a hypothesis; upstream's
  feral rotation reads both Wolfshead and the Mangle cost
  (`sim/druid/feralcat/rotation.go:52`, `:189`, `:268-272`), a lead for its
  close condition 1.
- **D3.** On a non-step ranking, `reachableLines` prints `f.dps` (the bonus
  alone) under a label that names partner pieces. The live tab does not
  reach this path (the adversarial axis: `run.ts:125` always sets
  `measureBrokenSetValue`; an aborted run deletes `setContext`).
- **D4.** `docs/upgrades-tab-scope.md:315` and `:360-361` still describe 336
  as blocking and 467/497 as waiting for the live run.
- **D5.** 467 closed on feral evidence; whether other DPS specs' sets read
  correctly is untested. The code is not tied to a spec.

## Standards + Spec

### Standards

All 7 commit subjects follow the commit rules. No hard code violation.

- **S1.** Ticket 635 does not take the number `NEXT` gave (627).
- **S2.** Ticket 497's claim "moving 7 DPS between the two lines in
  `view.ts` fails both cases" names no command (AGENTS.md § Durable claims).
- **S3.** Same as D1.
- **S4.** A code comment and a test comment point at "Gate B M1 of stage
  tab-set-bonus", an artifact no fork reader can open. Recorded as Q1.
- **S5.** `SCREENED_REASONS` repeats the `ScreenedReason` union. Recorded
  as Q2.
- **S6.** Each new label kind adds a case to `tipLabelText` and
  `tipLabelId` (Repeated Switches).
- **S7.** `M2_497`, `M4_497`, `N4_497`, `split4` in `fork-set-net.test.ts`
  name the ticket, not the value. Recorded as Q3.
- **S8.** Two nested ternaries in `set_bonus_tip.ts`. Recorded as Q4.

### Spec

No missing requirement for 467 or 497, no real scope creep.

- **P1.** A row whose only future bonus is below the noise gate has no hint
  and no popover in either state (ret Lightbringer Breastplate 30990,
  `.scratch/handoffs/visual-review-tab-set-bonus-K3.md:54-55`), against
  336 condition 2 "every row with any set bonus". Plan claim C19 chose it;
  behaved this way before the branch.
- **P2.** 336 condition 2 says the toggle-on popover is "unchanged"; rows
  with no credit or a screened set now get the "Not counted" section in the
  on state. The owner's rule asks for it; the close note does not say it
  departs from condition 2.
- **P3.** The "Not counted" lines print in normal colour; the mock-up shows
  them muted (`mockup-336.html` `.faint`; `SetBonusPopover.tsx:34`, `:40`).
- **P4.** 497's close note credits close condition 1 to the controlled test
  alone; that the variation is gone comes from the live run.

Decision check (336 close condition 1): the close note says the session
decided the layout instead of the owner and that the owner may override,
but not that the owner was told; the decision log says "owner told on
2026-10-12 with override offered" (line 34). Added to the ticket in
`44d4e702`.

## Code quality

| ID  | From | Row                                                                                                                |
| --- | ---- | ------------------------------------------------------------------------------------------------------------------ |
| Q1  | S4   | Replace the "Gate B M1 of stage tab-set-bonus" pointers with something a fork reader can open, keeping the reason. |
| Q2  | S5   | Keep one list of screened reasons: derive the type from an `as const` array.                                       |
| Q3  | S7   | Rename the 497 test constants to say what they hold.                                                               |
| Q4  | S8   | Replace the two nested ternaries with plain code.                                                                  |

## Fixes (round 1)

- Main `44d4e702` (tickets and docs only): ticket 336 note (P2, the
  decision check, and A1/P1 pointing at 655); ticket 497 note (S2: the
  mutation run is chunk K1's, recorded in the stage folder's
  `execution-report.md:20`, with how to repeat it; P4); ticket 635 note
  (D2, labelled hypothesis, untested); new ticket 655 (A1, P1) with its
  `map.md` line and `NEXT` 656; `docs/upgrades-tab-scope.md` (D4). The
  commit subject names ticket 655 only; this list maps its lines to the
  findings.
- Fork `79e5f51ae` "Fix review findings A2 A3 A4 D3 P3":
  - A2: a reachable label with no pieces prints the new key
    `tip_reachable_bonus` ("{set} {n}pc"), added to the locale file and the
    schema's properties and `required` list; tests in `set_bonus_tip.test.ts`
    and `set_bonus_labels.test.ts`.
  - A3: a test with `deltaDps` 4.5 and `singleDeltaDps` 2 expects 28.5. With
    the code changed to subtract `row.deltaDps` it failed (26 received for
    28.5; 1 failed, 22 passed), and passed after the restore.
  - A4: `notCountedHeading` gives `not_counted` in both states when there
    is no reachable line. This departs on purpose from mock-up row 4.
  - D3: `reachableLines` returns no lines unless `ctx.stepRanking`; a new
    test failed with the guard removed.
  - P3: `muted` on Not-counted rows, `text-muted` on their cells in
    `SetBonusPopover.tsx`; tests assert it.
- Fork `80a876bb0` "Tidy set bonus tip for review Q1 Q2 Q4" and main
  `7ae67582` "Name 497 sweep test values for review Q3": the code-quality
  pass, no behaviour change.
- Main `f580494f` "Pin fork 80a876bb0 for review fixes": lock and
  `data/sim-implemented-effects.json` (`forkCommit` only).
  `corepack pnpm -C <pair> verify` rc=0 ("gates: 1526 ran, 0 skipped").

## Focused check (round 2)

Reviewed range: `60aa11411c4f5ee84240b0b22ae8a2e4a765c833..f580494fb1556342b8e2692fe498b337f1e23aaf`

Fork range (round 2): `f4b78f65dd7ffb9df256a9f04ccf1d889a5033c4..80a876bb070b358db3ee9e39f291c97bcb2c13aa`.

Conditions, checked by the dispatching agent before dispatch:

1. Commits: `44d4e702` changes tickets, `NEXT`, `map.md` and two
   bookkeeping sentences in `docs/upgrades-tab-scope.md` (D4); step 3 of the
   skill says a bookkeeping fix starts no round and round 2 checks it, so
   it is read here as a fix commit, mapped to its findings in "Fixes
   (round 1)". `79e5f51ae` names A2 A3 A4 D3 P3; `80a876bb0` and
   `7ae67582` name Q1 Q2 Q4 and Q3; `f580494f` changes only `data/`.
2. Changed code lines sit at the places A2, A3, A4, D3, P3 and Q1-Q4 cite.
3. At fork `80a876bb0` the touchpoints check prints only
   `M ui/app/SimTabsSection.tsx`, status count 260 A, 1 M, the same as at
   `f4b78f65d`; `git diff --name-only 176268e7c..80a876bb0` lists only
   allowed paths (adds `components/SetBonusPopover/SetBonusPopover.tsx`).

One fresh `general-task` agent on Opus (review lane), told it writes
nothing, ran the four checks:

1. **Conditions 1-3: pass.** Main log has exactly `44d4e702`, `7ae67582`,
   `f580494f`; fork log exactly `79e5f51ae`, `80a876bb0`. Reading
   `44d4e702` as a fix commit through the "Fixes (round 1)" mapping is
   sound: each part matches a named finding. `f580494f` changes only
   `data/`. Both fork audit commands give the outputs above.
2. **Each diff matches its finding: pass.** A2: an empty `pieces` list
   prints `tip_reachable_bonus` and "couldn't measure"
   (`set_bonus_labels.ts:76-78`; rank.ts:2799-2804 never sets
   `stepGearDps` when no partner was measured). A4, D3: as asked, nothing
   else. P3: only `outcome` or `screened` lines are muted, and only
   `reachableLines` sets `outcome`, so the muted lines are exactly the
   Not-counted lines. Q1, Q2, Q4: no behaviour change. Bookkeeping text
   carries its sources.
3. **Each new test asserts its finding: pass** (judged by reading). A3
   would get 26 for 28.5; D3's default future clears `stepEligible`, so
   without the guard the tip is not null; A2, A4, P3 tests check exact
   entries, labels and classes.
4. **Touched tests pass: pass.**
   `corepack pnpm -C <fork> exec vitest run ui/features/upgrades/model/set_bonus_tip.test.ts ui/features/upgrades/utils/set_bonus_labels.test.ts ui/features/upgrades/components/SetBonusPopover`
   rc=0, 51 passed;
   `corepack pnpm -C <pair> exec vitest run packages/core/test/fork-set-net.test.ts -t 497`
   rc=0, 2 passed.

Findings, both bookkeeping only:

- **R2-1.** Ticket 655 cites `set_bonus_tip.ts:287`, true at `f4b78f65d`
  but `:293` at the pinned `80a876bb0`.
- **R2-2.** Ticket 336's new note says the owner "has not objected" and
  cites a "snapshot test" without naming either source.

## Disposition (round 2)

| ID   | Axis          | Disposition | Ticket / note                                                                                                                                                                                                    |
| ---- | ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1   | Adversarial   | defer       | `.scratch/carry-forward/issues/655-popover-omits-some-reachable-bonuses.md` — toggle-on popover omits a bonus past the best stop; behaved this way before the branch (mock-up row 5)                             |
| A2   | Adversarial   | fixed       | fork `79e5f51ae`: a reachable label with no pieces prints "{set} {n}pc" (`tip_reachable_bonus`)                                                                                                                  |
| A3   | Adversarial   | fixed       | fork `79e5f51ae`: test with `singleDeltaDps` ≠ `deltaDps`; fails when the code subtracts `row.deltaDps`                                                                                                          |
| A4   | Adversarial   | fixed       | fork `79e5f51ae`: heading `not_counted` in both states when no reachable line; departs from mock-up row 4 on purpose                                                                                             |
| D1   | Domain        | wontfix     | The tickets name the gitignored main-checkout folder as the source, and the committed SME handoff quotes the numbers; whether stage folders are tracked is a repo-wide rule (`.gitignore:59`), not this branch's |
| D2   | Domain        | fixed       | `44d4e702`: the `rotation.go` lead added to ticket 635, labelled hypothesis, untested                                                                                                                            |
| D3   | Domain        | fixed       | fork `79e5f51ae`: no reachable lines on a non-step ranking                                                                                                                                                       |
| D4   | Domain        | fixed       | `44d4e702`: `docs/upgrades-tab-scope.md` sentences now record 336, 467 and 497 as closed and point at 655                                                                                                        |
| D5   | Domain        | wontfix     | The set-bonus code is not tied to a spec, and the 336 visual review captured ret rows (`review/336-9-ret33173-*`, `336-10-ret30990-*` in the stage folder)                                                       |
| S1   | Standards     | wontfix     | The orchestrator reserved ticket ranges across parallel unmerged branches (627, 628, 629, 640+, 645+, 650+; this branch 635); `NEXT` is now 656                                                                  |
| S2   | Standards     | fixed       | `44d4e702`: ticket 497 note names the K1 mutation run's record and how to repeat it                                                                                                                              |
| S3   | Standards     | wontfix     | Same as D1                                                                                                                                                                                                       |
| S4   | Standards     | fixed       | As Q1                                                                                                                                                                                                            |
| S5   | Standards     | fixed       | As Q2                                                                                                                                                                                                            |
| S6   | Standards     | wontfix     | The per-kind switch predates the branch, and the branch replaced an if-cascade with a `satisfies Record` map                                                                                                     |
| S7   | Standards     | fixed       | As Q3                                                                                                                                                                                                            |
| S8   | Standards     | fixed       | As Q4                                                                                                                                                                                                            |
| P1   | Spec          | defer       | `.scratch/carry-forward/issues/655-popover-omits-some-reachable-bonuses.md` — a row whose only future bonus is below the noise gate has no popover; behaved this way before the branch                           |
| P2   | Spec          | fixed       | `44d4e702`: ticket 336 note says the toggle-on change departs from condition 2's "unchanged" and why, and that the owner was told of design A                                                                    |
| P3   | Spec          | fixed       | fork `79e5f51ae`: Not-counted lines use `text-muted`                                                                                                                                                             |
| P4   | Spec          | fixed       | `44d4e702`: ticket 497 note gives both pieces of evidence for close condition 1                                                                                                                                  |
| Q1   | Code quality  | fixed       | fork `80a876bb0`: the pointers name ticket 336                                                                                                                                                                   |
| Q2   | Code quality  | fixed       | fork `80a876bb0`: `SCREENED_REASONS` `as const satisfies`, type derived from it                                                                                                                                  |
| Q3   | Code quality  | fixed       | main `7ae67582`: `MALORNE_2PC_DPS`, `MALORNE_4PC_DPS`, `NORDRASSIL_4PC_DPS`, `fourPcStepsWithBreaks`                                                                                                             |
| Q4   | Code quality  | fixed       | fork `80a876bb0`: `notCountedHeading` replaces the nested ternary                                                                                                                                                |
| R2-1 | Focused check | fixed       | Ticket 655 now names the fork commit for its line number and the line at `80a876bb0`                                                                                                                             |
| R2-2 | Focused check | fixed       | Ticket 336 note names decision-log line 34 for "has not objected" and the snapshot test file                                                                                                                     |

## Summary

Round 1 found no wrong figure and no Breaks price credited to another
bonus. It found three small popover faults the branch introduced (an empty
"with", a heading that blamed the toggle for a screened set, and a
mislabelled path on non-step rankings), one test gap, the unmuted
Not-counted lines, four code-quality rows and bookkeeping in the tickets.
All were fixed on the branch and passed the round-2 focused check. Two
cases where the popover still names a reachable bonus nowhere (a bonus past
the best stop with the toggle on; a row whose only future is below the
noise gate) behaved that way before the branch and are deferred to ticket 655. The A4 fix departs on purpose from mock-up row 4: a section holding
only a screened set is headed "Not counted" in both toggle states.

Tickets: this branch filed 2 (635, 655) and closed 3 (336, 467, 497)
(`git diff --name-status dev...HEAD -- '.scratch/carry-forward/issues/*.md'`
and the `Status:` grep in the pre-merge-review skill).

Fork tip `80a876bb0` (`pushed: false` in `data/wowsims-fork.lock.json`).
