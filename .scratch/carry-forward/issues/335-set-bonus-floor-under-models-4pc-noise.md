Status: open
Type: enhancement
Origin: round-7 pre-merge review (domain axis), 2026-08-29; feat/upgrades-dedup-wowsims
Blocks: none
Blocked by: none

# The per-spec set-bonus floor uses √2, which under-models 4pc noise (it is the 2pc factor)

Ticket 332 landed a per-spec ranking floor `setBonusNoiseFloorDps(cutoff) =
√2 × cutoff.absDps` (packages/core/src/cutoff.ts), gating any prospective set
bonus regardless of whether it is a 2pc or a 4pc bonus. The `√2` factor and the
doc comment frame it as "a prospective bonus folds two measured deltas, so its
SE combines to ~√2 larger" — i.e. the two-delta 2×SE bar.

## The concern (domain axis, round 7)

The `1.678` (ret) / `1.774` (feral) figures in `docs/five-seed-spread*.json` are
`meanReportedSe` — the SE the sim reports for a **single DPS mean** (one run),
not a per-delta SE. A `bonusDps` figure's actually-measured SE is
`combineSe = sqrt(Σ se_i²)` over every sim folded in (see `set-value.ts`
~303-306, ~366-379): base + package + N singles.

- A single-item delta folds **2** sims → SE ≈ √2 × 1.678 ≈ 2.37.
- A **2pc** prospective bonus folds **4** sims → SE ≈ 2 × 1.678 ≈ 3.36.
- A **4pc** prospective bonus folds **6** sims (`rank.ts` ~1693-1703 maps one
  sample per added piece) → SE ≈ √6 × 1.678 ≈ 4.11.

So the set-bonus/single-delta SE ratio is exactly **√2 for a 2pc** but
**√3 (≈1.73) for a 4pc**. The code applies the same `√2 × absDps ≈ 4.81` floor
to both (view.ts `rankableSetPotential`, no 2pc/4pc branch). A 4pc floor tuned to
its own noise would be ~40% higher (≈ √3/√2 = 1.22× the current value, or ~5.9
ret). Consequence: 4pc bonuses in roughly the (4.8, 6) DPS window are slightly
**under**-filtered.

## Why it is not a blocker (why this is a follow-up)

Every observed 4pc `prospectiveBonusDps` in the committed fixtures is ≤ 0.545 or
≥ 17.14 — the (0.545, 17.14) band is empty, so nothing currently lands in the
(4.8, 6) under-filtered window. This changes no observed row's tier today. The
practical gap is: the `cutoff.ts:36-38` doc comment claims the floor is "the
two-delta 2×SE bar," which is accurate for 2pc rows but overstates the model for
4pc rows.

## What a fix would do

Either (a) branch the floor by piece count — a 4pc row gates on
`√3 × cutoff.absDps` (or, more generally, `√(pieces_folded) × single_delta_SE`),
reading the actual fold count the same place `set-value.ts` computes `combineSe`;
or (b) if the flat-√2 floor is kept deliberately as a conservative-low ranking
bar, correct the `cutoff.ts` doc comment to say the floor is the **2pc** two-delta
bar and is intentionally below the 4pc noise level, with the reason. (a) is the
accurate model; (b) is the honest-comment minimum. Confirm against any
newly-measured 4pc bonus whether one now lands in the (4.8, 6) band before
choosing.

Related: [[332-ranking-noise-floor-may-zero-a-real-10-15-dps-bonus]] (the
per-spec floor this refines), the untested-spec inheritance note (enh/warlock/
rogue are the specs likeliest to exceed ret's floor if ever measured —
cutoff.ts already anticipates this).
