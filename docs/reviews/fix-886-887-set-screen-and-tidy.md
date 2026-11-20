# Pre-merge review — `fix/886-887-set-screen-and-tidy`

Tickets 886 (the set screen counting a set's own bonus more than once) and
887 (the set-aside tidy items from the naming review). The owner's ask,
2026-11-20: "You're in charge of making sure these are knocked out ticket 886
(the possible set-bonus double count) and ticket 887 (the set-aside
tidy-ups)."

Range reviewed:

- Fork (`vendor/tbc-new-fork`, branch `fix/886-887-set-screen-and-tidy`):
  `93027b6c9..57035ec23` (697f84ca3 for 886, 57035ec23 for 887). The review
  fixes are `6ca79f308`.
- Main repo (same branch name): the change against `d421134f`. When the
  reviewers read it, it was not yet committed, because the sandbox could not
  write this pair's main-repo git index.

Three fresh reviewers, one per axis (Opus `general-task`). Their full
reports are in the pair's `.scratch/agent-reports/` (gitignored):
`2026-11-20-general-task-review-adversarial-886-887.md`,
`2026-11-20-general-task-review-domain-886-887.md` and
`2026-11-20-general-task-review-standards-spec-886-887.md`.

## Adversarial

The 886 fix is correct, and none of the 887 deletions or renames changes
behaviour. Checked: worn 0 (no crossing check, nothing taken out), no bonus
at w + 1 (check skipped, nothing taken out), a crossing value below noise
(still taken out; unbiased), and the crossing-check block that moved before
the screen (it reads only inputs set earlier, none reassigned). Tests 886-W1
and 886-W3 take their expected values from the fake sim's model, not from
the code's formula, and both failed before the fix.

- **A1.** No test covered a crossing check that ran without a value
  (`rank.ts`, `if (crossing && crossing.dps === undefined) return undefined;`).
  Deleting that line would have brought back the over-count for that set and
  passed every test.

Notes: the subtracted value carries the crossing check's noise once per added
piece (no verdict flipped when the rule was scored again); crossing-check run
notes now come before the bonus-loop notes; the old same-slot problem for sets
with two items that fit one slot pair cannot reach the screen with TBC data
(Latro's Flurry is a 2-piece set).

## Domain

The game facts behind 886 hold. A single swap of a piece of a set worn at w
gives w + 1 pieces, because added pieces skip slots the set already fills
(`selectAddedPieces`), and the crossing check uses the same rule. PvP seasons
share one set id and are kept out the same way. The only set with two pieces
that can share slots is Latro's Flurry (737), a 2-piece set the screen skips.
Tier tokens are only sources. Hand checks of 511-SN (390) and 511-SD (−45)
match the fake model. All 20 stored warning messages matched the code's text
character for character.

- **D1.** The reworded dead-slot message said every alternative "loses
  Thunderheart Harness's bonus" in `feral-p5-th4pc.json`, where the set is
  worn at 4 and only the 4pc is lost. The old "pays X's lost bonus" was as
  vague.
- **D2 (from the Notes).** "Likely measurement problem" claims more than the
  old "suspected confound".

## Standards + Spec

The branch does what the ask and the brief asked. Every 887 item the ticket
marks done is done in the diff, D11 is left with its reason, and no file
outside the fork's `ui/features/upgrades/` changed. Hashes, the lock, line
endings, `pnpm tab-fixtures:check` and `pnpm run fork-lint:check` passed.

- **S1.** The `SCREEN_ON_RULE` re-score's script and output lived only in a
  session scratchpad; the ticket cited a gitignored script without the
  correction. The output also showed two results the ticket left out
  (passing rules 117 to 116; `choose` now picks the tab's rule).
- **S2.** Same as A1.
- **S3.** Both `Verified by:` lines named this review file before it existed.
- **S4.** D3 leaves `SimSlotName` as an alias of `SimOrderName`.
- **S5.** The closed tickets still said "Not started" and "hypothesis,
  untested".
- **S6.** The `engine.md` rows for `dead-slots.ts` and `plausibility.ts`
  still read as matching core.
- **S7.** One sentence of the new `rank.ts` comment ("sets worn at another
  count carry no such extra") was unclear.

## Fix evidence

- A1 / S2: new test `886-WU: when the crossing check at worn + 1 has no
value, the screen keeps the set unread`
  (`packages/core/test/fork-set-net.test.ts`). With the guard line removed
  from `rank.ts` it failed with `AssertionError: expected 450 to be
undefined` (`.scratch/set-bonus-value/886-rescore/886-WU-red.txt`); with
  the line back it passed.
- D1, D2, S7: fork `6ca79f308`. The message now says "loses a Thunderheart
  Harness bonus" (true at any worn count), the bonus warning says "suspected
  measurement problem", and the comment is rewritten. The five feral
  recordings follow the new text (`packages/core/test/fixtures/tab-recordings/README.md`).
- S1: the scripts, outputs and a README with the commands are in
  `.scratch/set-bonus-value/886-rescore/` (tracked). Re-running
  `rescore_886.py` from there printed output identical to the saved
  `rescore_886.out` (`diff` empty). Ticket 886 cites it and the two extra
  results.
- S5, S6: tickets and `engine.md` rows updated.

## Check output

`node --version; pnpm verify` in the pair, before the review fixes (main
working tree with fork `57035ec23`): `v22.23.2`, `gates: 1744 ran, 0
skipped`, rc 0. The layout gate skipped because the pair's fork has no built
`dist/`.

The fix check (a fresh Opus agent,
`.scratch/agent-reports/2026-11-20-general-task-check-fixes-886-887.md` in
the pair):

- 886-WU with the guard line removed: `AssertionError: expected 450 to be
undefined`; restored: `Tests  1 passed`.
- 886-W1 and 886-W3 with `rank.ts` and `set-screen.ts` at fork `93027b6c9`
  (before 886): both `expected 3 to be close to +0`; restored, `-t "886-"`:
  `Tests  3 passed`.
- Its `pnpm verify` failed at `tsc --build`: 886-WU's `th` array was typed as
  the Thunderheart ids, so `th.includes(id)` with a plain number did not
  type-check (vitest does not type-check). Fixed with
  `const th: readonly number[]`; `pnpm run typecheck` then passed.

`node --version; pnpm verify` in the pair after all fixes (fork `6ca79f308`,
main working tree): `v22.23.2`, `gates: 1745 ran, 0 skipped`, `fork tests
check ok ... Tests  907 passed (907)`, rc 0. The layout gate skipped again
for the missing `dist/`.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                      |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | fixed       | Test 886-WU; failed with the guard removed, passes with it.                                                                                                                                                                                                        |
| D1  | Domain      | fixed       | Fork `6ca79f308`: "loses a <set> bonus"; recordings updated.                                                                                                                                                                                                       |
| D2  | Domain      | fixed       | Fork `6ca79f308`: "suspected measurement problem", as strong as the old text.                                                                                                                                                                                      |
| S1  | Standards   | fixed       | Evidence in `.scratch/set-bonus-value/886-rescore/`; ticket 886 cites it and the two extra results.                                                                                                                                                                |
| S2  | Standards   | fixed       | Same as A1.                                                                                                                                                                                                                                                        |
| S3  | Standards   | fixed       | This file now exists.                                                                                                                                                                                                                                              |
| S4  | Standards   | wontfix     | The second copy of the union is gone, which is what D3 asked. `SimSlotName` has about 30 uses across the engine and the tab's results view, and core's `pool.ts` has the same name; renaming them all is churn with nothing left to drift. Recorded in ticket 887. |
| S5  | Standards   | fixed       | "Not started" and "hypothesis, untested" replaced in both tickets.                                                                                                                                                                                                 |
| S6  | Standards   | fixed       | Both rows note the ticket 887 change and point to § Set-aside tidy.                                                                                                                                                                                                |
| S7  | Standards   | fixed       | Fork `6ca79f308`: comment rewritten.                                                                                                                                                                                                                               |

## Notes

- D1 of ticket 887 deletes the two engine fixture files, which the owner's
  2026-10-08 ruling "Unused dev features: ignore them" had left in place.
  Ticket 887 asked for it, so it is done; the owner can still say no.
- `ret-p3-p2.json` still stores Crystalforge's (629) screen measure from
  before the fix (−16.74; fixed −18.89). Nothing reads it back, and the set
  stays kept either way.
- D11 (the `'split'` credit view and the `'full-path'` rule, which the tab
  never chooses) is left unchanged: removing them is a product decision.
