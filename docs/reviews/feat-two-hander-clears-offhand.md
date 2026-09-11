# Pre-merge review — feat/two-hander-clears-offhand

Reviewed range: `d4fdca5bec61cdccadd7f1fb6095eb3c98df0b4b..ba81bb533c89c16f9f4a678afdc31212a3c16d31`

Four axes, fresh context, Opus at effort `medium`, two parallel batches.
`codex` is not on `PATH`, so the cross-vendor route was unavailable; this is the
harness's review lane, not a downgrade.

**What this branch is.** Two pieces of work. First, ticket 350: a dual-wield
character wearing a one-hander plus an off-hand item was offered two-handed
candidates for the main hand, and the ranker swapped the two-hander in while
leaving the off-hand item equipped — composing gear the game cannot equip. The
fix clears the off hand, prices that swap honestly, and discloses the two-item
change on three reader surfaces. Second, a fork lint gate: `pnpm verify` now
lints and type-checks the files we own inside the gitignored wowsims fork
checkout, which nothing had ever done.

## Adversarial

**One material finding, one minor.** The axis mutation-tested rather than
argued, in a throwaway `git archive` copy.

**A1 (material) — the clear/swap ordering is a live constraint with no test.**
Reversing the two statements — `swapItemAt` on the original array, the clear
afterwards — left all five tests green. The ordering is not decorative:
`fillOptsForSwap` skips only the swap target and sweeps every other slot's gems
into `usedUnique`, so a unique gem on a removed off-hand would still block the
candidate two-hander's own socket, producing a plausible wrong DPS with no
signal. The comment describes the hazard correctly; nothing enforces it.

**A2 (minor) — `getItem` undefined is a dead path today, not a live silent
failure.** All 884 `warrior-p2` entries resolve, and none of the 53 two-handers
has a null `handType`. It stays a latent trap: an unresolvable id returns
`undefined`, the `?.handType !== HandTypeTwoHand` check passes, and an illegal
set composes silently.

**Cleared under attack.** No-oping the clear turned T1, T2 and T4 red while the
two negative cases correctly stayed green — the suite is not theatre. T4's
relaxation from "exactly 1" to `<= 1` did not gut the property: instrumented at
55 two-hander attempts, 1006 one-diff and exactly 4 zero-diff, with the
two-hander branch still asserting the strict `toEqual(new Set([MAINHAND,
OFFHAND]))` and `twoHanderAttempts > 0` a genuine floor at 55. The re-pinned
digest is honest — deleting the `${removedItems}` slot reproduced the old
digest and old length exactly, so the +10 is precisely two empty
interpolations. All 14 changed engine files had their PROVENANCE rows rewritten
and the gate re-hashes from disk. The fork copy matches core, and the tab's
`removedItemsLine` really renders with a null guard and id fallback.

## Domain

**No blocking or material defects in the fix itself.** The TBC premise is
right: a two-hander occupies both hand slots in 2.4.3, off-hand held items
occupy the off-hand slot the same way for equip purposes, and clearing leaves a
legal ordinary build. Titan's Grip is Wrath and appears nowhere in the branch.
The mirror-case reasoning is sound — `mainHandIsOneHanded` reads the **worn**
main hand, so the existing guard genuinely covers the other direction, and the
asymmetry of remedies holds in TBC terms.

All five item facts reproduce from `data/items/index.json`, and the full T2
stat-delta literal was recomputed from raw stat vectors as byte-identical.
Reachability reproduces exactly: rogue-p2 117 weapons / **0** two-handers,
enh-p2 151/42, warrior-p2 190/55, hunter-p2 111/43. `DUAL_WIELD_SPECS` is the
right set for TBC. No Wrath-isms or retail-isms anywhere.

**D-1 (minor)** — the test comment calls Dragonstrike (28439) "1H"; its
`handType` is `1` (`HandTypeMainHand`), not `2` (`HandTypeOneHand`). No
behaviour is wrong — the assertion is `not.toBe(HandTypeTwoHand)`, which is the
property the test needs — but ticket 350's own table warns about exactly this
confusion.

**D-2 (material, out of scope and already conceded)** — casters really do wear
a one-hander plus a held off-hand in TBC: the ele, mage, warlock, shadow and
balance p2 universes each carry 29–44 `handType 3` held items. The reachability
claim is correct _as a statement about this ranker_, because
`simSlotsForPoolSlot` gives an off-hand placement only to `DUAL_WIELD_SPECS`.
Ticket 350's D2 note already records that `pool.ts`'s "neither can put anything
in the off hand" comment is too strong read as a statement about TBC.

**D-3 (minor)** — the HTML suffix "a two-hander leaves no off hand" was
hardcoded onto every `removedItems` entry, but the field is typed to carry any
slot. The first non-off-hand removal would have rendered a false sentence.

## Standards + Spec

**Spec: clean.** No missing requirements, no scope creep, no wrong
implementations. Paths-manifest compliance holds — the fork range touches only
`upgrades/**`, `upgrades_tab.tsx`, and the two i18n files the decision log's Q3
ruling allowed; no `sim/`, no `ui/core/` outside `upgrades/`, no SCSS. Both
owner rulings hold: "override" appears in no new comment or assertion, and the
existing guard is byte-untouched in both engine copies. Step 3's ordering and
anchor criteria verified in both copies. The three named prohibitions are
respected. T4's relaxation is consistent with the plan's stated winning
condition (containment, not minimum movement) and is guarded against vacuity —
noted only because the plan on disk still reads "exactly 1".

**Standards: one documented-standard breach.** CONTEXT.md bans
"land"/"lands"/"landed" for merging, shipping or building. The axis reported
roughly fifteen hits; measuring the diff showed only **three** were added by
this branch, and all three were the prohibited sense — the rest is pre-existing
prose in the arrival sense ("as each sim lands"), which the rule does not reach.
Comment policy, the testing rule, durable claims and the Python conventions all
pass: the new comments state _why_ not _what_, the test file drives
`rankUpgrades` and touches no stage internal, commit bodies cite re-runnable
commands, and `check_fork_lint.py` matches its siblings' contract, exit scheme
and skip behaviour. Two baseline smells raised as judgement calls: a small Data
Clump (`{ slotIndex, itemId }` written inline four times) and a weak
Speculative Generality (the plural `removedItems` for a single case today) —
both explicitly ruled not worth changing.

## Summary

Adversarial 1 material + 1 minor. Domain 1 material (out of scope) + 2 minor.
Standards 1 hard violation. Spec 0.

**No blockers.** The fix is correct and verified: the ordering holds in both
copies, the tests are not theatre, the TBC premise is right, and the golden
digest re-pin is honest arithmetic rather than a silent re-baseline.

The one finding worth dwelling on is A1, and it is mine rather than the
executor's. I made the clear-before-swap ordering an explicit Gate B acceptance
criterion and then accepted a **grep in a commit message** as evidence it held.
A grep proves the current state; it does not stop the next edit reversing it. I
reproduced the mutation myself before filing: five tests green with the ordering
reversed. Filed as ticket 370 rather than fixed inline, because the committed
fixtures cannot express it — the fury preset's off-hand has zero sockets,
`warrior-p2` holds exactly one socketed off-hand-capable item, and the phase ≤ 2
palette holds exactly one unique gem of the matching colour. A test needing a
hand-built array no recorded character wears is a different test from the ones
this file holds, and designing it honestly is its own work.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1  | Adversarial | defer       | `.scratch/carry-forward/issues/370-nothing-tests-the-clear-before-swap-ordering.md` — reproduced independently (five tests green with the ordering reversed). The shipped behaviour is **correct**; this is a missing guard, not a defect. The ticket names a `fillOptsForSwap`-level test as the cheaper route, since it needs no item fixture.                                                                   |
| A2  | Adversarial | wontfix     | `getItem` returning `undefined` is unreachable today — all 884 `warrior-p2` entries resolve and no two-hander has a null `handType`. Recorded as a latent trap rather than fixed, since a guard would need a policy for "unresolvable candidate id" that no caller currently needs.                                                                                                                                |
| D-1 | Domain      | wontfix     | The test comment's "1H" for Dragonstrike is loose prose; `handType` is `HandTypeMainHand`. The assertion itself tests the right property (`not.toBe(HandTypeTwoHand)`), and a main-hand-only mace does occupy one hand in TBC. Not worth a commit on its own; fold into the next edit of that file.                                                                                                                |
| D-2 | Domain      | wontfix     | Out of scope and already conceded in ticket 350's D2 note. `pool.ts`'s comment is upstream-of-us prose about a ranker placement rule; casters wearing held off-hands is real TBC but unreachable from this branch's bug.                                                                                                                                                                                           |
| D-3 | Domain      | fixed       | `packages/core/src/rank-report.ts` — the "a two-hander leaves no off hand" suffix now rides only on `r.slot === "offhand"` rows. Verified: `pnpm typecheck` rc=0, 157 tests pass across `rank-report.test.ts` and `cli-shortlist.test.ts`, and the byte-identical digest did **not** move, because no fixture row carries a non-off-hand removal. Inert today, correct when the field is reused. Commit `27567d7`. |
| S1  | Standards   | fixed       | Three new instances of the banned word "land" in the prohibited sense: `clearOffHandForTwoHander`'s doc comment now says a candidate "fills" the main hand; `check_fork_lint.py`'s docstring says a defect could "reach" our fork code and that upstream might "introduce" a type error. Measured that the other ~12 hits are pre-existing arrival-sense prose the rule does not reach. Commit `27567d7`.          |
| S2  | Standards   | wontfix     | Data Clump (`{ slotIndex, itemId }` inline four times) and Speculative Generality (plural `removedItems`). Both judgement calls the axis itself ruled not worth changing; the second is documented in the field's own comment.                                                                                                                                                                                     |
| P1  | Spec        | no finding  | Both owner rulings intact, paths manifest clean, no scope creep, T4's relaxation consistent with its pre-registered winning condition.                                                                                                                                                                                                                                                                             |
