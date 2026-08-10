# Pre-merge review — feat/set-bonus-value

Diffed against: dev...feat/set-bonus-value (initial review at `1386eda`; fixes
verified through `de70cd3`). Four axes, fresh-context Opus at effort medium;
`codex` not on `PATH` (harness sharp lane, per the skill's ceiling rule).
Feature: set-bonus prospective value per `.scratch/set-bonus-value/spec.md` —
completion-package synergy per (set, threshold), `withSetPotential` view
toggle, unmeasured states carry reasons.

## Adversarial

Six findings, one blocking. **A1 (blocking):** under `withSetPotential`,
`applyView` copied `belowCutoffInView` verbatim from `belowCutoff`, so the
shortlist filtered out exactly the rows the toggle exists to surface —
below-cutoff-alone tier pieces with real prospective value (every Thunderheart
single in the V0 evidence is individually negative). **A2:** `piecesAfterSwap`
derives "already worn" from `item.owned`, an ownership proxy — benign today
only because all six implemented sets have one piece per canonical slot.
**A3:** "needs 0 more pieces" printable via a dead-but-live fallback.
**A4:** package-failure rows put a set id in an item-id field and blamed one
arbitrary piece. **A5 (test theatre):** the headline test's synthetic sim left
all singles at 0, so the Σ-singles subtraction — the non-trivial part of the
formula — was untested. **A6 (nit):** the 2pc→4pc carry-over silently depends
on `SET_THRESHOLDS` being ascending.

## Domain

Verdict blocking. Re-fetched both `item_sets.go` files at pin `8aa378b3`:
V1's table reproduces exactly, including both corrections to research.md
(Justicar 2pc is a bare `ExposeToAPL` no-op; Nordrassil has no `2:` key), and
the `ExposeToAPL`-doesn't-gate conclusion is sound. **D1 (blocking):** V0b's
+91.68 Thunderheart synergy was confounded — the feral baseline wears two
Malorne pieces (29096, 29100) with an active, implemented, cat-relevant 2pc,
and the probe's shoulder arm broke it; the singles sum double-charges a
breakage the package pays once, biasing the number upward. **D2:** the same
blind spot shipped in `selectPackage`, which treats a slot as free unless it
holds the _same_ setId — a package could silently break another set's bonus
and misattribute the net. **D3:** research.md's Justicar 2pc row was stale
against the branch's own V1. **D4:** same-slot contention within 8-piece sets
flagged unverified (overlaps A2).

## Standards + Spec

**Standards:** comment-policy breaches (several what-comments), a user-facing
disclosure line pointing at a `.scratch/` path, and the rank-report digest pin
made strictly more brittle. Baseline smells (judgement calls): `buildSetBonuses`
data clump (~11 params), duplicated unmeasured-row shape, ~17 new barrel
exports with no external caller, dead `PackagePiece.alreadyWorn`,
`set-value.ts` vs `set-bonus.ts` naming. Clean: `sortKeyFor` injection shape,
pure and directly-tested synergy arithmetic, correct `ENGINE_VERSION` bump.

**Spec:** **S1:** acceptance §8.2 (strip-and-compare vs dev) and §8.4 (CLI
demo) ran but were never persisted as evidence. **S2:** `se` combined only
baseline+package, contradicting §2.2's "over the sims involved" and the V0
worked example. **S3:** `nextThreshold` computed from `piecesWornBefore`
instead of `piecesAfterSwap` — a crossing row pointed at a threshold already
crossed, and "needs N more" was off by the same error. **S4:** `packageItemIds`
in deltaDps order, not canonical-slot order. **S5 (scope notes):** tie-group
ids also change under the toggle (unasked, defensible); `setLabel` gained a
parameter beyond §3's letter (justified — a set with zero worn pieces was
otherwise unnameable). **S6:** a comment claimed absent-vs-0 for the 2pc
subtraction differ when they are numerically identical.

## Summary

The mechanism survives review: the formula is sound, V1's implementation table
is independently reproducible, and the honest-uncertainty machinery
(unmeasured reasons, measured-≈0 reporting) held up on all axes. Both blockers
were real and both are fixed: the shortlist now promotes rows whose effective
value clears the _same absolute_ cutoff, and the V0 gate evidence was re-run
confound-free (Malorne 2pc→4pc on untouched slots: synergy 20.89 vs 3σ bar
18.03 — pass; the confounded V0b retained with a caveat). The production
mirror of the confound now records other-set bonuses a package breaks
(`SetBonusValue.breaks`). Fixes landed as `161e4d0`..`de70cd3`; 537 tests and
`pnpm verify` green on the tip. Known limits, disclosed in verification.md:
the ret P2 fixture shows no positive set potential (Crystalforge is mana/heal,
Justicar 4pc inert under a Seal-of-Blood APL — correct, demonstrated on the
feral side), and sets 566/583 report `not-implemented-in-sim` from a
conservative default whose Go source was not read.

## Disposition

| ID  | Axis        | Disposition | Ticket / note                                                                                                   |
| --- | ----------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| A1  | Adversarial | fixed       | `161e4d0` — effective-value cutoff in view; 5 tests                                                             |
| A2  | Adversarial | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md`                            |
| A3  | Adversarial | fixed       | `d0387e7` — threshold/"needs N" corrected                                                                       |
| A4  | Adversarial | fixed       | `d0387e7` — failure rows name the package                                                                       |
| A5  | Adversarial | fixed       | `d0387e7` — nonzero singles in headline fixture                                                                 |
| A6  | Adversarial | fixed       | `d0387e7` — ascending order pinned                                                                              |
| D1  | Domain      | fixed       | `161e4d0` — V0c Malorne probe is the gate evidence                                                              |
| D2  | Domain      | fixed       | `f52da38` — `SetBonusValue.breaks`, rendered                                                                    |
| D3  | Domain      | fixed       | `c945d2c` — research.md corrected in place                                                                      |
| D4  | Domain      | defer       | `.scratch/carry-forward/issues/86-pieces-after-swap-uses-owned-as-equipped-proxy.md` (same root as A2)          |
| S1  | Spec        | fixed       | `de70cd3` — §8.2/§8.4 evidence persisted at tip                                                                 |
| S2  | Spec        | fixed       | `d0387e7` — se over all contributing sims                                                                       |
| S3  | Spec        | fixed       | `d0387e7` — `piecesAfterSwap`; `thresholdBeforeSwap` split out                                                  |
| S4  | Spec        | fixed       | `d0387e7` — slot-index order                                                                                    |
| S5  | Spec        | wontfix     | tie-groups follow the displayed sort by design; `setLabel` param is the fix for a real defect (`a778018`)       |
| S6  | Spec        | fixed       | `c945d2c` — comment corrected                                                                                   |
| St1 | Standards   | fixed       | `c945d2c` — what-comments deleted, disclosure points at PLAN.md §14, dead field removed                         |
| St2 | Standards   | defer       | `.scratch/carry-forward/issues/87-set-value-module-shape-cleanups.md` (naming, data clump, exports, digest pin) |
