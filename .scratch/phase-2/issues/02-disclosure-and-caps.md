Status: open
Type: task
Origin: PLAN.md §14 Phase 2, §4 (R8/CapState), §9 (R4/R7)
Blocks: none
Blocked by: 01

# Disclosure and caps — two-tier CLI output, socket-bonus-aware meta repair, hit-cap banner

Branch: `phase-2/disclosure-and-caps` off `phase-2/trust`, after 01.

Second, because it adds the **required** `caps` field to `Ranking`. Doing it
before `applyView` (03) means the view layer is written against the final type
rather than being retrofitted.

## What exists today

- `packages/core/src/disclosure.ts` already separates **standing assumptions**
  from **run substitutions** (§9 R7's two tiers) and `buildStandingAssumptions`
  returns four standing entries.
- `packages/core/src/meta-repair.ts` exists and `rank.ts:440` feeds
  `substitutionsFromMetaRepair(metaSwaps)` into `Ranking.substitutions`;
  `baseline.metaAdjusted` is populated.
- `packages/core/src/cli.ts:265` prints substitutions as a flat list.

## What is missing

1. **`CapState` does not exist.** `grep` for `caps` / `capRating` / `hitCap`
   across `packages/core/src` returns nothing outside a comment in
   `candidate-gems.ts`. §4 defines `caps` as a **required** field on `Ranking`
   — "a `Ranking` you can't audit is not a `Ranking`". Build it:

   > **2026-08-05 — the rating was not reachable when this ticket was written.**
   > See `02-blocker-item-stats.md`. `data/items/index.json` carried no `stats`
   > field (the generator emitted them for gems only), `RaidSimResult` has no
   > stats field, and the pinned wowsimcli exposes no `ComputeStats` RPC.
   > Resolved by extending `scripts/generate_item_gem_index.py` to emit a dense
   > per-item `stats` array and regenerating the index. **Consequence to carry
   > forward:** the resulting figure is **gear-only** — talents and buffs are
   > not counted, so it reads low (slamaltman: 72 of ~142). §4.3's uncertainty
   > band is doing real work here, not decoration.
   - `hit: { rating, capRating, gap, assumedRace, capUncertainty }` and
     `expertise: { rating, capRating, gap }`.
   - Take the rating conversions **from upstream rather than deriving them**
     (§4): `PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233` from
     `ui/core/constants/mechanics.ts` at the pinned commit. Copy the value with
     the pin SHA in a comment; do not import across the vendor boundary.
     `9 × 15.769233 = 141.92` is the ~142 cap; `capUncertainty: 16` is the 1%
     Heroic Presence band.
   - **Use the physical constant, not the spell one.**
     `SPELL_HIT_RATING_PER_HIT_PERCENT` is 12.615385 and a ret hit cap that
     uses it is silently wrong.
2. **`hitDriven` on `RankedItem`.** Declared in §4's type, absent from
   `rank.ts`'s `RankedItem`. Flag items whose gain is mostly hit rating while
   the player is under cap. §4 is explicit that not modelling combinations is
   *correct* per §2's scoping rule — this flag exists because
   correct-but-misleading is still misleading.
3. **Two-tier CLI output.** `cli.ts` prints one flat substitutions list.
   §9 R7: standing assumptions collapsed by default, this-run substitutions
   expanded. Build for **five substitutions on a clean run, not zero**.
4. **The hit-cap banner** in CLI output, phrased to carry the uncertainty:
   *"~20 rating under the hit cap, assuming no Heroic Presence in your party"* —
   never a precise figure (§4.3).
5. ~~**Socket-bonus pricing inside the meta-repair cost function** (§9 R4)~~ —
   **already done, verified 2026-08-05.** The ticket asked to "verify whether
   `meta-repair.ts` prices it today"; it does. The forfeit is added inside the
   cost function at `meta-repair.ts:195-197`, not post-hoc:

   ```ts
   let cost = gemEp(from, …) - gemEp(candidate.id, …);
   if (matchedBefore && !socketsMatch(slot.itemId, trialGems)) {
     cost += socketBonusEp(slot.itemId, …);
   }
   ```

   The constructed conflict fixture this ticket calls for **also already
   exists**: `meta-repair.test.ts:94` ("prices socket-bonus forfeiture inside
   the cost") builds a strength-only-weights case where gem-EP alone ties at 0
   and only the bonus forfeit breaks the tie, then asserts the solver picks the
   non-breaking recolour. So the second gate box was closed before this ticket
   started. No code change here.

## Gate boxes owned

> ☐ inactive-meta baseline auto-repaired and disclosed
> ☐ **a meta repair that would break a socket bonus picks the other move** (§9, R4)

The second box needs a **constructed fixture**: a head with an inactive meta
where the cheapest recolour by gem-EP-alone breaks a socket bonus, and a
second-cheapest that does not. Assert the solver picks the second. Without such
a fixture the box cannot be honestly checked — a repair that happens not to
encounter the conflict proves nothing.

## Testing

`applyView` is not touched here. Meta repair and the cap computation are pure
functions and are unit-tested directly per AGENTS.md § Testing. The disclosure
output is asserted through `rankUpgrades` against recorded adapters.

## Done when

- `Ranking.caps` is required and populated; `hitDriven` set where applicable.
- Socket-bonus-conflict fixture proves the solver takes the other move.
- CLI shows two tiers and the uncertainty-carrying banner.
- `pnpm verify` green; review at `docs/reviews/phase-2-disclosure-and-caps.md`.
