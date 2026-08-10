/**
 * contentHash — the idempotency key for a ranking (PLAN.md §7).
 *
 * The rule for membership is "if this value changes, do the numbers change?",
 * not PLAN.md §7's literal field list — see ADR-0019 for the delta.
 */

import { createHash } from "node:crypto";

/**
 * Deterministic JSON: sorted keys, `undefined` treated as absent, non-finite
 * numbers refused. A cache whose key varies with key insertion order never
 * hits, and the miss is silent, so this is pinned by test rather than left to
 * `JSON.stringify`'s object-order behaviour.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError(
      `contentHash inputs must be finite numbers, got ${value}`
    );
  }
  if (Array.isArray(value)) {
    // `undefined` becomes null rather than vanishing: dropping it would shift
    // every later index and change what the array means.
    return value.map((el) => (el === undefined ? null : canonicalize(el)));
  }
  if (value !== null && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj).sort()) {
      if (obj[key] === undefined) continue;
      out[key] = canonicalize(obj[key]);
    }
    return out;
  }
  return value;
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/**
 * Bump when a ranking-logic change should invalidate every cached result.
 * Without it a bug fix serves stale rankings forever, because none of the
 * other hashed inputs move when only our own arithmetic changes.
 */
export const ENGINE_VERSION = 3;

export type HashedGearItem = {
  id: number;
  slot: string;
  enchant?: number;
  gems?: readonly number[];
};

/** Every input that moves a number. Anything absent here is display-only. */
export type ContentHashInput = {
  character: { region: string; realm: string; name: string };
  spec: string;
  maxPhase: number;
  race: string;
  fight: { reportCode: string; fightId: number };
  gear: { items: readonly HashedGearItem[] };
  /**
   * Item id **and slot**. The slot picks which sim slots the swap is tried in
   * (`simSlotsForPoolSlot`), so it decides `deltaDps` and `slotChoice` — id
   * alone would serve stale deltas after a pool regeneration re-slots an item.
   */
  candidates: readonly { itemId: number; slot: string }[];
  gemPaletteIds: readonly number[];
  epWeights: Readonly<Record<string, number>> | readonly number[];
  presetId: string;
  /**
   * Hashed by value, not by `presetId`. The skeleton carries raid buffs,
   * debuffs, talents, encounter duration and the APL rotation — all live DPS
   * inputs under a `presetId` that never varies. Stripping `prepullActions`
   * measured 789.02 DPS against a 2042.85 baseline
   * (`docs/verification-log.md`, 2026-07-27), so a label-only hash would serve
   * those pre-edit deltas from cache.
   */
  skeleton: Readonly<Record<string, unknown>>;
  iterations: number;
  seeds: readonly number[];
  simVersion: string;
  engineVersion: number;
};

export function contentHashOf(input: ContentHashInput): string {
  return sha256Hex(canonicalJson(hashPayload(input)));
}

/**
 * Built field by field rather than spread from `input`, so a caller passing a
 * ViewOptions field cannot leak it into the hash. PLAN.md §14 gates exactly
 * that: a view toggle must never cost a re-sim.
 */
function hashPayload(input: ContentHashInput): Record<string, unknown> {
  return {
    character: {
      region: input.character.region.toLowerCase(),
      realm: input.character.realm.toLowerCase(),
      name: input.character.name.toLowerCase(),
    },
    spec: input.spec,
    maxPhase: input.maxPhase,
    race: input.race,
    fight: input.fight,
    // Sorted by slot: the sim reads gear by slot, so a reordered read of the
    // same logged set is the same set and must not re-sim.
    gear: [...input.gear.items]
      .map((item) => ({
        id: item.id,
        slot: item.slot,
        enchant: item.enchant ?? 0,
        gems: [...(item.gems ?? [])],
      }))
      .sort((a, b) =>
        a.slot < b.slot ? -1 : a.slot > b.slot ? 1 : a.id - b.id
      ),
    candidates: [...input.candidates]
      .map((c) => ({ itemId: c.itemId, slot: c.slot }))
      .sort((a, b) =>
        a.itemId !== b.itemId
          ? a.itemId - b.itemId
          : a.slot < b.slot
            ? -1
            : a.slot > b.slot
              ? 1
              : 0
      ),
    gemPaletteIds: [...input.gemPaletteIds].sort((a, b) => a - b),
    epWeights: input.epWeights,
    presetId: input.presetId,
    skeleton: input.skeleton,
    iterations: input.iterations,
    seeds: [...input.seeds],
    simVersion: input.simVersion,
    engineVersion: input.engineVersion,
  };
}
