Status: open
Type: bug
Origin: docs/reviews/feat-tab-signoff-followups.md (targeted engine review 2026-09-25, finding D1)
Blocks: none
Blocked by: none
Related: 467, 490, 502

# Ret set credit counts bonuses that cannot add ret DPS

## Evidence

From the domain axis of the targeted engine review
(`.scratch/stage-gate/upgrades-tab-closeout/engine-review/domain.md`, D1):

- The Crystalforge 4pc is a 6% party heal (fork `sim/paladin/item_sets.go`
  lines 30–75).
- The Justicar 4pc changes only Judgement of Command.
  `.scratch/set-bonus-value/verification.md` V0 found that the default ret
  rotation never casts it: 0 casts, measured 1.27 ± 5.24 DPS.
  `ui/paladin/retribution/apls/default.apl.json` judges only while Seal of
  Blood is active.
- Even so, `.scratch/stage-gate/upgrades-tab-closeout/set-rule-scenarios/report.md`
  scenario H credits the Crystalforge 4pc +9.5 on 5 rows and moves
  Crystalforge Breastplate from rank 12 to rank 6. Scenario I credits the
  Crystalforge 4pc +21.1 on 4 rows and the Justicar 4pc +15.3 on 5 rows.
- Both SME handoffs for the net credit were feral only. No SME has judged
  the credit rule for ret.

Likely cause (hypothesis, untested): the rankable floor (≈4.81 DPS for ret)
is √2 times a single-sim cutoff, but a net set value is a difference of five
or more sims at 3000 iterations, so its noise is larger than the floor
allows for.

## What would close this

1. Pick one of: (a) require each credited set value to clear its own
   standard error, not the single-sim floor; or (b) exclude bonuses that
   cannot change DPS for the spec (heal, mana, or a judgement the rotation
   never casts). Record the choice and why.
2. A fixture in `packages/core/test/fork-set-net.test.ts` that pins the
   chosen rule, with its literals derived by hand in
   `docs/set-bonus-fixture-derivations.md`.
3. An SME check on ret (the `sme-rank-review` skill) of a live ret run with
   "Set potential" on, before ON is trusted for ret. Record the verdict here.
