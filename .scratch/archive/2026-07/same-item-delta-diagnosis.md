# Diagnosis — same-item / worn-gear nonsense deltas

**Date:** 2026-07-28  
**Symptom:** SME `trust-with-caveats` — equipped Endless Pit / Bladespire / Crystalforge above cutoff as upgrades (~+4); Furious Gizmatic Goggles ~−35 while worn. User: obvious upgrades as downgrades; same-item large loss fails any player sanity check.

## Phase 1 feedback loop (already run)

```
npx tsx .scratch/diag-same-item-gems.ts
```

Output (abridged):

| Slot | Item | Worn gems | `fillCandidateGems` | Same? |
|------|------|-----------|---------------------|-------|
| head | 32461 Gizmatic | `[32409, 24054]` (Relentless Earthstorm + purple) | `[25894, 32193]` | **no** |
| shoulder | 30055 | `[24027]` | `[32193]` | **no** |
| chest | 30129 | `[24027, 24058, 24058]` | `[32193, 32217, 32217]` | **no** |
| wrist | 28795 | `[24054, 24027]` | `[32193, 32193]` | **no** |
| waist | 28779 | `[24027, 31118]` | `[32193, 32193]` | **no** |

Same-item head swap + `repairMeta` only changes the head row to the filled gems.

## Ranked hypotheses

1. **Primary (confirmed by loop):** `swapItemAt` always sets `gems: fillCandidateGems(itemId, …)` even when `itemId ===` currently equipped id — so “ranking yourself” re-sockets the piece and sims a different loadout. Prediction: preserve worn gems when same id → candidate request matches baseline → Δ≈0 (or omit noise).
2. Meta-repair thrashing the whole set on same-item swap — **falsified** for head: only head gems changed in the diag.
3. Wrong baseline / wrong slot mapping — **unlikely**; worn IDs match ranking rows.
4. Enchant dropped on same-item swap — enchant path already preserves; goggles have enchant 3003; secondary vs gem wipe.

## Intended fix

When constructing candidate equipment for a slot, if the candidate `itemId` equals the item already in that slot, **keep that slot’s worn gems (and enchant)**; do not call `fillCandidateGems`. New item IDs still get filled + meta-repaired.

PLAN.md §8.3: owned items stay in the list and are marked `owned` — they must not look like upgrades/downgrades of themselves.

## Acceptance (green when)

1. Automated: failing → passing tests at `rankUpgrades` / candidate-equipment seam (same-item preserves gems; CapturingSimRunner sees identical slot gems).
2. `npx tsx .scratch/diag-same-item-gems.ts` still documents the old bug; regression is in vitest.
3. Live or offline re-rank: Gizmatic Δ≈0 (or belowCutoff near 0); Endless Pit / Bladespire / Crystalforge not above-cutoff “upgrades.”
4. Top *new* upgrades (Torch, 100 Deaths, etc.) still look right — SME-shaped sanity.
