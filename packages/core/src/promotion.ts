/**
 * M2 promotion rule (candidate-pool.md §6.1) — a pure function, unit-tested
 * directly per AGENTS.md § Testing.
 *
 * No SE, no intervals: F10 measured the only observable SE as independent
 * (~6.8 DPS at 300 iterations), which would promote everything if used as a
 * criterion. Promotion is rank-based instead.
 */
import type { PoolEntry } from "./pool.js";

/**
 * Defaults — see `RankInput.screenIterations` and `RankInput.promoteTopK`
 * in rank.ts for the measured justification (candidate-pool.md §3.4.1's
 * defaults, corrected against the fixture that actually gates 7.2 — see
 * that doc comment for the full story). Defined once so `rank.ts` and
 * `content-hash.ts` (which must normalize an omitted knob the same way the
 * runtime applies it) cannot drift apart.
 */
export const DEFAULT_SCREEN_ITERATIONS = 1000;
export const DEFAULT_PROMOTE_TOP_K = 150;
/**
 * Per-slot promotion depth (candidate-pool.md §6.4's option (a)). Generalizes
 * the best-in-slot floor from top-1 to top-`j`.
 *
 * Defaults to 1 — the pre-§6.4 best-in-slot floor, byte-for-byte — because
 * raising it does not pay on the gating fixture. Measured, 30 noise draws on
 * feral (see `RankInput.promoteTopJ` in rank.ts for the table): j=5 at the
 * shipped K=150 *raises* the ratio 0.7146 → 0.7232, and no (K, j) reaches the
 * §6.4 ≤0.4 target at zero misses. The knob is kept because the mechanism is
 * real and fixture-dependent, not because this default exercises it.
 */
export const DEFAULT_PROMOTE_TOP_J = 1;

/** One candidate's screening observation, keyed by item id. */
export type ScreeningResult = {
  itemId: number;
  deltaDps: number;
};

export type PromotionInputs = {
  screened: readonly ScreeningResult[];
  candidates: readonly PoolEntry[];
  promoteTopK: number;
  /**
   * How many candidates promote from *each* slot's own screening ranking.
   * `1` reproduces the pre-§6.4 best-in-slot floor exactly.
   */
  promoteTopJ: number;
  /** Item ids already worn (candidate-pool.md's "owned" — never dropped). */
  ownedItemIds: ReadonlySet<number>;
  /**
   * Item ids belonging to any set-completion package under consideration —
   * a set piece can be a below-cutoff single yet still be the best available
   * filler for a package (mirrors the full-iteration path in rank.ts).
   */
  setPackageItemIds: ReadonlySet<number>;
};

export type PromotionResult = {
  itemId: number;
  promoted: boolean;
};

/**
 * Promote candidate *c* if any of: *c* is in the global top-`promoteTopK` by
 * screening delta; *c* is in its own slot's top-`promoteTopJ` (a floor — no
 * slot goes under-sampled); *c* is in a set-completion package; *c* is owned.
 *
 * The per-slot floor is what a global cutoff cannot do. Upgrade deltas scale
 * with how outdated the worn piece is, so slots are not comparable on one
 * axis: a slot whose upgrades are all small loses *every* candidate to a
 * global K at once, taking with it the precision needed to order that slot at
 * all. M1.5 measured exactly that clustering (on ret, all six worst-ranked
 * rows were cloaks; on feral, belts and necks). Since only one item is ever
 * equipped per slot, the comparison that matters is within a slot — so the
 * screening budget is spread across slots rather than pooled (§6.4 (a)).
 *
 * Ties break toward the lower item id in both the global and per-slot
 * cutoffs, mirroring `orderCandidatesByEp`'s total order (candidate-order.ts)
 * — so the boundary of the promoted set never depends on input order.
 */
export function promotionRule(input: PromotionInputs): PromotionResult[] {
  const {
    screened,
    candidates,
    promoteTopK,
    promoteTopJ,
    ownedItemIds,
    setPackageItemIds,
  } = input;
  const slotByItemId = new Map(candidates.map((c) => [c.itemId, c.slot]));

  // Failed screens are excluded before the slice, not sorted to the bottom of
  // it (ticket 156): `slice(0, K)` at the shipped K of 150 takes every row of
  // any pool smaller than 150, so ordering alone still promotes a candidate
  // whose every slot attempt panicked. Promoting one spends a full-iteration
  // sim on a swap already known to crash, and then reports it as "dropped
  // from the ranking" on top of the screening failure already recorded — the
  // same reasoning the per-slot floor below already applies.
  const ordered = [...screened]
    .filter((s) => Number.isFinite(s.deltaDps))
    .sort((a, b) => {
      if (a.deltaDps !== b.deltaDps) return b.deltaDps - a.deltaDps;
      return a.itemId - b.itemId;
    });
  const topK = new Set(
    ordered.slice(0, Math.max(0, promoteTopK)).map((s) => s.itemId)
  );

  const bySlot = new Map<string, ScreeningResult[]>();
  for (const s of screened) {
    const slot = slotByItemId.get(s.itemId);
    if (slot === undefined) continue;
    // A candidate whose every slot attempt panicked screens at -Infinity.
    // The floor exists so no slot goes under-sampled, but a slot where
    // nothing produced a number has nothing to represent: promoting the
    // argmax of two failures spends a full-iteration sim on a candidate that
    // panics again, and -Infinity serializes to JSON `null`, so a promoted
    // one would break the sort comparator on any rehydrated `Ranking`.
    if (!Number.isFinite(s.deltaDps)) continue;
    const bucket = bySlot.get(slot);
    if (bucket) bucket.push(s);
    else bySlot.set(slot, [s]);
  }

  const topInSlot = new Set<number>();
  // A non-finite j would make `slice(0, j)` take nothing and silently delete
  // the floor — the one criterion that guarantees every slot is represented.
  // Failing closed to the pre-§6.4 top-1 keeps a miscall degraded, not silent.
  const j = Number.isFinite(promoteTopJ) ? Math.max(0, promoteTopJ) : 1;
  for (const bucket of bySlot.values()) {
    bucket.sort((a, b) => {
      if (a.deltaDps !== b.deltaDps) return b.deltaDps - a.deltaDps;
      return a.itemId - b.itemId;
    });
    for (const s of bucket.slice(0, j)) topInSlot.add(s.itemId);
  }

  return screened.map((s) => ({
    itemId: s.itemId,
    promoted:
      topK.has(s.itemId) ||
      topInSlot.has(s.itemId) ||
      setPackageItemIds.has(s.itemId) ||
      ownedItemIds.has(s.itemId),
  }));
}
