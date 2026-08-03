# Gem / regem handling — ours vs wowsims Suggest Gems

**Date:** 2026-07-28  
**Sources:** `packages/core/src/{rank,candidate-gems,migrate-gems,meta,meta-repair,gems}.ts`; PLAN.md §9; local wowsims tree `.scratch/wowsims-tbc-new-src` (`ui/core/components/suggest_reforges_action.tsx`, `ui/core/proto_utils/{gems,equipped_item,gear}.ts`).  
**Note:** PLAN.md §9 once said there was “no upstream optimizer to borrow” for meta. That was about Go-sim meta enforcement. Upstream UI now has a full **Suggest Gems** LP (`ReforgeOptimizer`); TBC has no reforging — the name is reused from later expansions.

---

## 1. What we do today (rank / sim path)

End-to-end in `rankUpgrades`:

1. **Read** worn items + gems from WCL (`LoggedGear`).
2. **Baseline meta repair** — `repairMeta` on the full set (min-EP-loss recolour until meta active, or `meta-unsolvable`). Socket-bonus forfeiture is in the cost (PLAN R4).
3. **Baseline sim** with repaired gems; meta swaps disclosed via `substitutionsFromMetaRepair`.
4. **Each candidate swap** (`swapItemAt` → `equipmentForCandidateSwap`):
   - **Same item id:** keep worn gems (avoids same-item nonsense deltas).
   - **New item:** `migrateGemsToItem` (wowsims `EquippedItem.withItem` — colour match first, else eligible), then `fillEmptyCandidateGems` (EP-fill only empties).
   - Then **`repairMeta` again** on the whole set.
5. Candidate fill uses `gemFillWeights`: same EP weights but **melee hit + expertise EP zeroed** so softcaps don’t force Glinting over Bold on already-capped sets. Meta repair still uses full EP weights.

Important modules:

| Piece | Role |
|--|--|
| `candidate-gems.ts` | Per-item EP fill; matched vs free layout; unique within the piece |
| `migrate-gems.ts` | Carry worn gems onto new socket layout |
| `meta.ts` | Colour matching, meta conditions (ported from wowsims `gems.ts`) |
| `meta-repair.ts` | Greedy min-EP recolour until meta active |
| `gems.ts` / `data/gems/palette.json` | Phase palette; JC excluded at generation |

Product stance (PLAN §9): **repair, not re-optimize** the player’s gemming — output must stay recognisably their gear.

---

## 2. What wowsims “gem optimizer” does

UI label: **Suggest Gems**. Implementation: `ReforgeOptimizer` in `suggest_reforges_action.tsx`, solved with **HiGHS WASM** (binary ILP), not a small greedy walk.

Pipeline (`optimizeReforges`):

1. **Strip gems** from non-frozen slots (`withoutGems`), keep frozen slots / meta context as configured.
2. Measure **base stats without gem contribution**; compute hard-cap gaps and soft-cap breakpoints relative to that base.
3. **Build ILP:**
   - Variables: each eligible `(slot, socketIdx, gemId)` binary (+ optional `SocketBonus_<slot>`).
   - Objective: maximize EP `score` (weights updated across iterations).
   - Constraints: ≤1 gem per socket; unique gems ≤1; **meta colour mins / compare** as `greaterEq` on colour coefficients; soft/hard caps enforced by **re-solving** when caps are exceeded (`checkCaps` → zero EP or add bounds → recurse).
4. **Socket bonus:** either force colour-matching when a quick matched-vs-unmatched score says matching wins, or model bonus as an all-or-nothing variable linked to matching sockets.
5. **Prune** gem options per socket colour: sort by pre-cap EP; keep best uncapped (and JC-aware if profession present) plus gems that still help when some stats are capped.
6. **`minimizeRegems`:** after solving, swap gem *placements* against the previous layout so the player regems as few sockets as possible for the same multiset of gem choices.

Also: phase / quality filters, optional disable-uniques, frozen slots, profession-aware JC gems.

This is a different product job: **best gem layout for a fixed gearset**, not **fair one-slot upgrade delta vs worn gems**.

---

## 3. Already borrowed

- Meta colour rules / matching tables (`meta.ts` ← wowsims `gems.ts`).
- Item swap gem migration (`migrate-gems.ts` ← `EquippedItem.withItem`).
- Socket-bonus awareness in meta-repair cost and in candidate matched-vs-free layout score.
- Phase-filtered palette; unique handling (local to a fill); JC exclusion (we’re stricter — always out).

---

## 4. Mechanisms worth borrowing (for *our* process)

Ranked by fit to “smooth ranking,” not “replace PLAN §9 with full Suggest Gems.”

### A. Meta-aware empty fill (high value, small)

Today: fill empties for max EP (hit/expertise zeroed) → then greedy `repairMeta` may recolour again.  
Borrow: when filling empties, prefer gems that **reduce meta deficit** (or satisfy colour constraints) among near-EP choices — same idea as wowsims putting meta colour coeffs into the model *before* scoring. Avoids fill→repair thrash on head/shoulder/chest swaps that change colour counts.

### B. Soft-cap / breakpoint EP for fills (high value, medium)

We only zero hit + expertise. Wowsims has hard caps, soft-cap breakpoints, and iterative post-cap EP.  
Borrow a lighter version: configurable softcaps (hit, expertise, maybe haste thresholds) for **candidate fill weights only**, not a full LP. Closes the gap where zero-or-full EP is too blunt.

### C. Set-wide unique tracking on fill (medium, small)

`fillSockets` tracks uniques only within the candidate piece. A unique already on another worn slot can be re-picked into the new piece.  
Borrow: pass `usedUnique` from the full equipment set into `fillEmptyCandidateGems` (wowsims `UniqueGem_* ≤ 1`).

### D. `minimizeRegems`-style remap (medium for UX/disclosure, low for ΔDPS)

Doesn’t change sim stats if the multiset is identical; does make disclosed gem swaps less scary and closer to what a player would physically do. Useful if we ever surface “suggested gems on this upgrade” rather than silent fill.

### E. Gem option pruning (low–medium for perf)

Palette is small (~hundreds). Pruning “best uncapped per colour + helpers for capped stats” matters more if we expand searches. Nice if we add joint meta+bonus search.

### F. Full-set ILP (low fit for ranking loop)

Pulling HiGHS + clearing the set per candidate fights PLAN §9 trust model and costs too much for N-candidate ranking. Keep Suggest Gems as a **separate optional tool** (“optimize my baseline gems”) if we ever want that product surface — not as the per-candidate sim path.

---

## 5. What not to borrow blindly

| Wowsims behavior | Why it fights us |
|--|--|
| Clear all gems then reoptimize | Made real upgrades look like losses when we full-EP-regemmed candidates; migrate+fill-empty was the fix |
| JC gems when profession known | We deliberately don’t model professions |
| Cap re-solve via character-stats roundtrips | Needs live sim/stats service; ranking must stay offline-deterministic |
| Force whole-set optimal layout on every candidate | Deltas mix “item upgrade” with “full remgem”; SME trust suffers |

---

## 6. Suggested next slices (if we act)

1. **Set-wide uniques + meta-aware empty fill** — pure functions, unit tests next to `candidate-gems` / `meta-repair`; wire through `swapItemAt` only.
2. **Richer `gemFillWeights`** from preset softcaps (data, not LP).
3. Leave full Suggest Gems / HiGHS alone unless we want a non-ranking “optimize gems” command.

---

## Source anchors

- Ours: `packages/core/src/rank.ts` (`repairMeta` baseline ~161; `swapItemAt` / `equipmentForCandidateSwap` ~385–445).
- Wowsims: `.scratch/wowsims-tbc-new-src/ui/core/components/suggest_reforges_action.tsx` (`optimizeReforges` ~1171, `buildYalpsVariables` ~1300, `buildYalpsConstraints` ~1610, `minimizeRegems` ~1882).
- Migration twin: wowsims `equipped_item.ts` `withItem` ~138 ↔ `migrate-gems.ts`.
