/**
 * Set-bonus prospective value — completion-package synergy (§2.2, §2.3).
 * Pure functions only: no sim calls, no seams. `rank.ts` (Slice B) supplies
 * measured deltas and calls into this module to select packages and compute
 * synergy.
 */

import { getItem } from "./items.js";
import type { PoolEntry } from "./pool.js";
import type { SimItemSpec } from "./slots.js";

export type SetThreshold = 2 | 4;

export const SET_THRESHOLDS: readonly SetThreshold[] = [2, 4];

export type UnmeasuredReason =
  "not-implemented-in-sim" | "insufficient-pieces" | "sim-failed";

/**
 * Which (setId, threshold) bonuses have a DPS-relevant effect body in the
 * pinned wowsims Go source, per `.scratch/set-bonus-value/verification.md`
 * V1. Absence of an entry here (or `false`) means `not-implemented-in-sim`.
 * A bonus that IS implemented but happens to measure ≈0 DPS on some spec's
 * APL (e.g. Crystalforge, which is mana/heal) is still `true` — the sim
 * genuinely runs an effect, and Slice B reports the measured number, not an
 * unmeasured reason. Only Justicar (626) 2pc and Nordrassil (641) 2pc lack
 * any effect body at all.
 */
const IMPLEMENTED_IN_SIM: Record<
  number,
  Partial<Record<SetThreshold, boolean>>
> = {
  626: { 2: false, 4: true }, // Justicar Battlegear
  629: { 2: true, 4: true }, // Crystalforge Battlegear
  680: { 2: true, 4: true }, // Lightbringer Battlegear
  640: { 2: true, 4: true }, // Malorne Harness
  641: { 2: false, 4: true }, // Nordrassil Harness
  676: { 2: true, 4: true }, // Thunderheart Harness
};

/**
 * Is `bonus(setId, threshold)` implemented in the pinned sim? Unknown sets
 * (no verification.md V1 entry) are conservatively treated as unimplemented
 * rather than assumed measurable.
 */
export function isBonusImplemented(
  setId: number,
  threshold: SetThreshold
): boolean {
  return IMPLEMENTED_IN_SIM[setId]?.[threshold] ?? false;
}

/** Count of equipped pieces per `setId`, ignoring items with no set. */
export function setCounts(
  equipment: readonly SimItemSpec[]
): Map<number, number> {
  const counts = new Map<number, number>();
  for (const spec of equipment) {
    if (!spec.id) continue;
    const setId = getItem(spec.id)?.setId;
    if (setId == null) continue;
    counts.set(setId, (counts.get(setId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Display name for `setId`, falling back to `set ${setId}` (§3).
 *
 * `alsoConsider` exists because this feature's whole subject is sets the player
 * has *no* pieces of yet: scanning worn equipment alone finds no name for them,
 * so every prospective bonus rendered as a bare `set 626`. Callers pass the
 * package's own item ids, which do carry the name.
 */
export function setLabel(
  equipment: readonly SimItemSpec[],
  setId: number,
  alsoConsider: readonly number[] = []
): string {
  for (const spec of equipment) {
    if (!spec.id) continue;
    const item = getItem(spec.id);
    if (item?.setId === setId && item.setName) return item.setName;
  }
  for (const itemId of alsoConsider) {
    const item = getItem(itemId);
    if (item?.setId === setId && item.setName) return item.setName;
  }
  return `set ${setId}`;
}

/**
 * Smallest threshold above `piecesAfterSwap` whose bonus is implemented in
 * the sim (§2.3 "nearest-measurable threshold"). Thresholds skipped over
 * because they are unimplemented are not returned — the caller lists them
 * separately with their unmeasured reason, per spec.
 */
export function nextMeasurableThreshold(
  setId: number,
  piecesAfterSwap: number
): SetThreshold | null {
  for (const t of SET_THRESHOLDS) {
    if (t <= piecesAfterSwap) continue;
    if (isBonusImplemented(setId, t)) return t;
  }
  return null;
}

/** One item worn or selected for a completion package, by canonical slot. */
export type PackagePiece = {
  itemId: number;
  slotIndex: number;
  /** True when this piece was already worn (does not need to be "added"). */
  alreadyWorn: boolean;
};

export type PackageSelectionResult =
  | { ok: true; piecesWorn: number; addedPieces: PackagePiece[] }
  | { ok: false; reason: "insufficient-pieces" };

/**
 * A candidate's individually-measured single-swap result, keyed by itemId —
 * the input package selection needs to rank candidates of the same set by
 * their own `deltaDps` (§2.2 step 1).
 */
export type IndividualDelta = {
  itemId: number;
  slotIndex: number;
  deltaDps: number;
  /** SE of this single-swap sim's DPS mean — feeds §2.2's combined `se`. */
  se: number;
};

/**
 * Select the completion package `P(S,t)`: worn pieces of `setId` count
 * toward `t` as-is; missing pieces come from `poolCandidates` of that set,
 * one per canonical slot (a slot already filled by a worn piece of the set
 * is not re-selected), highest individual `deltaDps` first, ties broken by
 * lower item id (§2.2 step 1). Returns `insufficient-pieces` when the pool
 * cannot supply enough distinct slots to reach `t`.
 */
export function selectPackage(
  setId: number,
  threshold: SetThreshold,
  equipment: readonly SimItemSpec[],
  poolCandidates: readonly PoolEntry[],
  individualDeltas: readonly IndividualDelta[],
  slotIndexForPoolEntry: (entry: PoolEntry) => number | undefined
): PackageSelectionResult {
  const wornSlotIndices = new Set<number>();
  let piecesWorn = 0;
  for (let i = 0; i < equipment.length; i++) {
    const spec = equipment[i];
    if (!spec?.id) continue;
    if (getItem(spec.id)?.setId === setId) {
      piecesWorn++;
      wornSlotIndices.add(i);
    }
  }

  const needed = threshold - piecesWorn;
  if (needed <= 0) {
    return { ok: true, piecesWorn, addedPieces: [] };
  }

  const deltaByItemId = new Map(
    individualDeltas.map((d) => [d.itemId, d] as const)
  );

  // Best candidate per open slot (not already occupied by a worn set piece).
  const bestPerSlot = new Map<number, IndividualDelta & { itemId: number }>();
  for (const entry of poolCandidates) {
    const item = getItem(entry.itemId);
    if (item?.setId !== setId) continue;
    const slotIndex = slotIndexForPoolEntry(entry);
    if (slotIndex === undefined) continue;
    if (wornSlotIndices.has(slotIndex)) continue;
    const delta = deltaByItemId.get(entry.itemId);
    if (!delta) continue;

    const current = bestPerSlot.get(slotIndex);
    if (
      !current ||
      delta.deltaDps > current.deltaDps ||
      (delta.deltaDps === current.deltaDps && delta.itemId < current.itemId)
    ) {
      bestPerSlot.set(slotIndex, delta);
    }
  }

  const candidates = [...bestPerSlot.values()].sort((a, b) =>
    b.deltaDps !== a.deltaDps ? b.deltaDps - a.deltaDps : a.itemId - b.itemId
  );

  if (candidates.length < needed) {
    return { ok: false, reason: "insufficient-pieces" };
  }

  // Selection above ranks by deltaDps (highest first, ties by lower item id)
  // to choose *which* pieces fill the package — unchanged. The emitted order
  // is a separate concern (spec §3: "canonical-slot order"), sorted only
  // after selection so it stays deterministic regardless of selection order.
  const addedPieces: PackagePiece[] = candidates
    .slice(0, needed)
    .map((c) => ({
      itemId: c.itemId,
      slotIndex: c.slotIndex,
      alreadyWorn: false,
    }))
    .sort((a, b) => a.slotIndex - b.slotIndex);

  return { ok: true, piecesWorn, addedPieces };
}

/** One sim observation feeding synergy arithmetic: a DPS mean and its SE. */
export type DpsSample = { dps: number; se: number };

/** `sqrt(Σ se_i²)` — conservative combined SE over the sims involved (§2.2). */
export function combineSe(samples: readonly DpsSample[]): number {
  return Math.sqrt(samples.reduce((sum, s) => sum + s.se * s.se, 0));
}

/**
 * One added piece's single-swap measurement: the `deltaDps` subtracted in
 * §2.2's formula, alongside the `se` of that same single-swap sim — needed
 * because §2.2 reports `se` as `sqrt(Σ se_i²)` over *every* sim involved,
 * including the singles whose deltas are subtracted, not just baseline and
 * package (verification.md's V0 worked example combines six: base + package
 * + four singles).
 */
export type AddedPieceSample = {
  deltaDps: number;
  se: number;
};

export type SynergyInput = {
  /** `D(baseline)` */
  baseline: DpsSample;
  /** `D(P(S,t))` */
  packageSample: DpsSample;
  /** Each added piece's single-swap delta and se (§2.2). */
  addedPieceSamples: readonly AddedPieceSample[];
  /**
   * `bonus(S,2)`, subtracted when computing `bonus(S,4)` per §2.2's formula.
   * Absent (not just 0) when there was no 2pc bonus to subtract — either t=2
   * itself, or the 2pc bonus is `not-implemented-in-sim` and so was never
   * measured. Passing 0 in that case would silently invent a measured value.
   */
  twoPieceBonus?: number;
};

export type SynergyResult = {
  packageDeltaDps: number;
  bonusDps: number;
  se: number;
};

/**
 * §2.2's synergy formula:
 *   packageDelta(S,t) = D(P(S,t)) - D(baseline)
 *   bonus(S,2)         = packageDelta(S,2) - Σ singles
 *   bonus(S,4)         = packageDelta(S,4) - Σ singles - bonus(S,2)
 * `twoPieceBonus` supplies the subtracted term for t=4; omit it (rather than
 * passing 0) when the 2pc bonus itself was `not-implemented-in-sim` — the
 * spec calls out this exact case (§2.2 note) so the 4pc number does not
 * silently absorb a phantom zero-valued subtraction that was never measured.
 */
export function computeSynergy(input: SynergyInput): SynergyResult {
  const packageDeltaDps = input.packageSample.dps - input.baseline.dps;
  const sumSingles = input.addedPieceSamples.reduce(
    (sum, s) => sum + s.deltaDps,
    0
  );
  const bonusDps = packageDeltaDps - sumSingles - (input.twoPieceBonus ?? 0);
  const se = combineSe([
    input.baseline,
    input.packageSample,
    ...input.addedPieceSamples.map((s) => ({ dps: 0, se: s.se })),
  ]);
  return { packageDeltaDps, bonusDps, se };
}
