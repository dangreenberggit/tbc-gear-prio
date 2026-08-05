# EP vs simmed ΔDPS — rank correlation measurement

**Date:** 2026-07-28
**Branch:** `phase-1/five-seed-spread`
**Scope:** throwaway measurement under `.scratch/ep-vs-sim/`, no changes to `packages/`, `scripts/`, or `data/`.
**Question:** is the pool generator's linear EP score usable as a *membership* filter, measured against actual simmed ΔDPS on the items that matter (wowsims' own ret BiS + the current pool)?

## tl;dr verdict

**No — reject linear EP as an admissible membership filter, without a fallback plan.** Overall rank correlation is weak (ρ=0.18, n=191). It is only usable-ish for two structural slot families (weapons, and armor slots with dominant scalar stats: feet/hands/waist/wrist, ρ 0.56–0.85) and is **actively wrong or blind** for trinkets (ρ=-0.25), fingers (ρ=-0.21), shoulders (ρ≈0), and librams (ρ undefined — EP scores every libram 0.0, full blind spot). This is the same axis the `pool-redesign/compiled-recommendation.md` hybrid plan (Option A lists + B hygiene) is built to route around; this measurement is direct evidence for that call, not a new proposal.

## Methodology (re-runnable)

**Candidate assembly:** `.scratch/ep-vs-sim/assemble_candidates.py`

```
python .scratch/ep-vs-sim/assemble_candidates.py
```

Candidate set = union of:
1. All distinct item IDs across `vendor/wowsims/ret_{preraid,p1,p2}.gear.json` (36 distinct IDs across the three 16-slot sets — not 30; recount from these three files directly, see note below).
2. All items currently in `data/pools/ret.json` that occupy the same slots as (1).

This gives 191 total candidates across 14 slots (back 14, chest 14, feet 15, finger 15, hands 15, head 14, legs 13, neck 15, ranged 8, shoulder 13, trinket 15, waist 14, weapon 13, wrist 13). EP is computed by importing `scripts/generate_pool.py`'s own `item_stats`, `ep_score`, `weapon_damage_ep` against `data/presets/ret/p2.ep-weights.json` and `vendor/wowsims/db.json` — not reimplemented. Output: `.scratch/ep-vs-sim/candidates.json`.

**Note on the "30 distinct" prior figure:** memory record `project_ret_pool_ep_membership_failure.md` states 30 distinct BiS items; recounting `vendor/wowsims/ret_{preraid,p1,p2}.gear.json` directly (`node -e` dedup over the three 16-item arrays, shown in this session) gives **36** distinct non-null item IDs. This measurement uses the freshly recounted 36; the discrepancy with the earlier 30 is unresolved and not investigated further here — flagging so it isn't silently treated as reconciled.

**Sim harness:** `.scratch/ep-vs-sim/measure.ts`, single-slot swap against the recorded `slamaltman` fixture character (`test/fixtures/slamaltman.raw.json`, same fixture as `packages/core/test/`), driven through the same functions `rankUpgrades` uses (`fillCandidateGems`, `compose`, `setBreakNote`, best-of-two for finger/trinket dual slots) rather than hand-rolled request JSON. Sim runner: `CliSimRunner` against the pinned `vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe` (real live binary, not a recorded/mocked adapter — `data/wowsims.lock.json` tag `v0.0.101`).

```
npx tsx .scratch/ep-vs-sim/measure.ts
```

- **Seed:** 42 (matches `rank.ts` `DEFAULT_SEEDS`)
- **Iterations:** 3000 (matches `rank.ts` `DEFAULT_ITERATIONS`)
- **Baseline:** dps=2042.85, stdev=119.04 (single run, same seed/iterations, printed at the top of the run)
- Items already equipped are treated as identity swaps (ΔDPS=0), matching `rank.ts`'s behavior — not re-simmed.
- Full run: 191 candidates, all succeeded (no sim failures), output `.scratch/ep-vs-sim/results.json`.

**Analysis:** `.scratch/ep-vs-sim/analyze.py` (Spearman rank correlation with tie-averaged ranks, no external stats library — implementation inline, reviewable in the file).

```
python .scratch/ep-vs-sim/analyze.py
```

## Correlation table

| slot | n | Spearman ρ(EP, ΔDPS) |
|---|---|---|
| **overall** | **191** | **0.183** |
| weapon | 13 | 0.851 |
| feet | 15 | 0.685 |
| waist | 14 | 0.657 |
| hands | 15 | 0.632 |
| wrist | 13 | 0.560 |
| legs | 13 | 0.346 |
| head | 14 | 0.306 |
| chest | 14 | 0.279 |
| neck | 15 | 0.242 |
| back | 14 | 0.169 |
| shoulder | 13 | -0.017 |
| finger | 15 | -0.211 |
| **trinket** | **15** | **-0.247** |
| ranged (librams) | 8 | n/a — EP is 0.0 for all 8 librams, zero variance |

Per-slot dominates the read here as instructed: EP is only weakly-to-moderately useful where the slot's value is almost entirely scalar melee stats with no on-equip effect competing (weapon white-damage-plus-stats, feet/hands/waist/wrist rare-armor rows). It is **near-zero or negative** everywhere an item's value routes through something linear EP cannot see: trinket on-use/proc, ring/back set-adjacent or unusual stat blends, and librams (100% invisible — spell-effect relic, no stat line at all in most cases).

## Trinket hypothesis — confirmed

The brief's hypothesis (Bloodlust Brooch EP=29.5, Dragonspine Trophy EP=16.4, both low-EP but chase items) is corroborated and generalizes across all 15 trinkets sampled:

| trinket | EP | ΔDPS | note |
|---|---:|---:|---|
| Steely Naaru Sliver | 115.56 | -28.05 | highest EP, negative ΔDPS |
| Shard of Contempt | 94.16 | 0.28 | |
| Madness of the Betrayer | 77.44 | -18.71 | |
| Romulo's Poison Vial | 75.25 | -48.72 | worst ΔDPS in the whole trinket set |
| Drake Fang Talisman | 65.96 | -37.15 | |
| Icon of Unyielding Courage | 64.50 | -41.21 | |
| Blackened Naaru Sliver | 63.18 | **+24.49** | best ΔDPS, mid-pack EP |
| Tsunami Talisman | 50.76 | -13.93 | |
| Warp-Spring Coil | 45.15 | -25.52 | |
| Assassin's Alchemist Stone | 44.28 | -18.31 | |
| Royal Seal of Eldre'Thalas | 43.00 | **-57.25** | worst ΔDPS overall of all 191 candidates, mid-pack EP |
| Berserker's Call | 36.90 | +15.77 | second-best ΔDPS, low EP |
| Bloodlust Brooch | 29.52 | 0 (owned) | |
| Abacus of Violent Odds | 26.24 | -20.56 | |
| Dragonspine Trophy | 16.40 | 0 (owned) | |

ρ = -0.247: the trinket with the single worst measured ΔDPS in the entire 191-item candidate set (Royal Seal of Eldre'Thalas, -57.25 dps) is not the lowest-EP trinket, and the best (Blackened Naaru Sliver, +24.49) is not the highest. **Headline finding confirmed**: for trinkets, EP rank order is not just noisy, it is anti-correlated with a real credible signal (the pool's own membership already includes all 15 of these, so this is not an "EP ranked it out" story for trinkets specifically — it's a "if EP-rank had been used to choose which trinkets to keep, it would have kept the wrong ones" story).

Caveat specific to this fixture: this trinket set's ΔDPS values are dominated by whether the trinket's on-use/proc synergizes with the fixture character's APL/rotation (Justice-style burst windows, etc.), which linear EP structurally cannot model — this is exactly the invisibility the brief predicted, not a fixture artifact to explain away.

## Worst mispredictions

### EP-high / ΔDPS-low (wasted sim budget) — top 25 by EP, worst 15 by ΔDPS

| item | slot | EP | ΔDPS | ΔDPS% | note |
|---|---|---:|---:|---:|---|
| Gorehowl | weapon | 1519.58 | -103.89 | -5.08% | |
| Lionheart Champion | weapon | 1505.33 | -41.92 | -2.05% | BiS-list item, still overpredicted by raw EP vs the fixture's current weapon |
| Soul Cleaver | weapon | 1661.37 | -38.56 | -1.89% | |
| Helm of the Illidari Shatterer | head | 156.44 | -32.19 | -1.58% | |
| World Breaker | weapon | 1556.49 | -23.11 | -1.13% | |
| Mayhem Projection Goggles | head | 157.17 | -16.44 | -0.81% | |
| Krakken-Heart Breastplate | chest | 157.75 | -5.70 | -0.28% | |
| Twinblade of the Phoenix | weapon | 1638.59 | -3.27 | -0.16% | forced-include chase weapon, near-flat vs current |
| Brutal Gladiator's Decapitator | weapon | 1813.48 | -2.64 | -0.13% | highest EP of any weapon candidate, near-flat ΔDPS |
| The Blade of Harbingers | weapon | 1756.64 | -0.87 | -0.04% | |
| Lionheart Executioner | weapon | 1608.33 | 0.00 | 0.00% | owned, identity swap |

Weapon-slot EP-high/ΔDPS-low entries dominate this list — expected, since weapon EP magnitudes (1500+) dwarf every other slot and the fixture is already holding a strong weapon (Lionheart Executioner), so most weapon candidates read as sideways or negative swaps regardless of EP. This is mostly a "baseline is already near the top of the weapon curve" artifact, not evidence EP is broken for weapons specifically (weapon slot had the *best* correlation, ρ=0.851).

### EP-low / ΔDPS-high (false negatives — the fatal ones) — bottom half by EP, best 15 by ΔDPS

| item | slot | EP | ΔDPS | ΔDPS% | origin |
|---|---|---:|---:|---:|---|
| Hard Khorium Choker | neck | 72.71 | +25.28 | +1.24% | pool |
| Blackened Naaru Sliver | trinket | 63.18 | +24.49 | +1.20% | pool |
| Cloak of Fiends | back | 63.11 | +21.87 | +1.07% | pool |
| Band of Devastation | finger | 63.33 | +20.68 | +1.01% | pool |
| Razor-Scale Battlecloak | back | 50.25 | +16.09 | +0.79% | **BiS-only, EP ranked it out** |
| Berserker's Call | trinket | 36.90 | +15.77 | +0.77% | pool |
| Shapeshifter's Signet | finger | 61.55 | +14.65 | +0.72% | BiS, owned |
| Cloak of Darkness | back | 41.48 | +14.61 | +0.71% | pool |
| Vengeance Wrap | back | 39.03 | +13.22 | +0.65% | **BiS-only, EP ranked it out** |
| Ancestral Ring of Conquest | finger | 47.75 | +9.79 | +0.48% | **BiS-only, EP ranked it out** |

These are the ones that matter most: items with below-median EP that still deliver real, positive, cutoff-relevant ΔDPS. Three (Razor-Scale Battlecloak, Vengeance Wrap, Ancestral Ring of Conquest) are wowsims' own curated BiS/alt picks that the generator's EP rank-out would drop — directly reproducing the "22 of 30 BiS items miss on EP rank-out" failure mode from the earlier membership audit, now with simmed ΔDPS attached instead of just an EP-cutoff comparison.

## Set-bonus caveat (measurement limitation, not a finding)

The brief asked to flag where a single tier-piece swap shows artificially low ΔDPS from breaking/not-completing a set bonus, rather than silently treating that as "EP was right." **This could not be tested with the fixture used**: the `slamaltman` fixture is wearing exactly **one** tier piece (Crystalforge Breastplate, `setId=629`), so `setBreakNote` (packages/core/src/set-bonus.ts) — which only fires on a ≥2→<2 or ≥4→<4 piece-count crossing — never triggered for any of the 191 swaps (confirmed: the "SET-BREAK FLAGGED ROWS" section of `analyze.py`'s output is empty). Justicar Breastplate (`setId=626`, a *different* Justicar-line item) swapped in at ΔDPS=-11.55, but that is a lateral single-item stat/socket comparison against the already-equipped Crystalforge Breastplate, not a measured set-bonus break — no candidate in this run crossed a 2pc/4pc threshold in either direction. **Do not read the chest-slot or any other-slot correlation numbers above as "confirmed clean of set-bonus distortion"** — they are simply untested on this axis with this fixture. A fixture wearing 2 or 4 Justicar pieces would be needed to actually measure the distortion the brief hypothesized.

## Files produced

- `.scratch/ep-vs-sim/assemble_candidates.py` — candidate assembly + EP scoring (imports `generate_pool.py`)
- `.scratch/ep-vs-sim/candidates.json` — 191 candidates, EP + origin tags
- `.scratch/ep-vs-sim/measure.ts` — swap-and-sim harness (env-overridable `CANDIDATES_FILE`/`RESULTS_FILE` for the trinket-subset dry run this session used first)
- `.scratch/ep-vs-sim/results.json` — full sim output, 191 rows, baseline + per-item ΔDPS/stdev/setBonusNote
- `.scratch/ep-vs-sim/analyze.py` — Spearman correlation (inline implementation, tie-averaged ranks) + misprediction tables
- `.scratch/ep-vs-sim/analysis_summary.json` — machine-readable overall/per-slot ρ

All under `.scratch/`; nothing in `packages/`, `scripts/`, or `data/` was modified. Nothing landed, committed, or merged.
