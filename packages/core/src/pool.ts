/**
 * Candidate pool types and filters (PLAN.md §8.3).
 * Pool files are loaded by the CLI and injected via Deps — core stays pure.
 */

import type { ItemSlot } from "./items.js";

import itemSourceKinds from "./item-source-kinds.json" with { type: "json" };

/**
 * The discriminants only — `assemble_universe.py` validates against the same
 * JSON, so the list cannot drift across the language boundary. The per-kind
 * field shapes stay in the `ItemSource` union below, which JSON cannot express.
 */
export const ITEM_SOURCE_KINDS: readonly string[] = itemSourceKinds.kinds;

export type ItemSource =
  | { kind: "raid"; zone: string; boss?: string }
  | { kind: "token"; zone: string; boss?: string; token: string }
  | { kind: "badge"; cost: number }
  /**
   * `recipeZone` is set only when the recipe itself drops in a raid, so raid
   * views can attribute the craft to that raid's shopping list. Absent for
   * vendor/reputation/world-drop recipes — see .scratch/carry-forward/issues/13.
   */
  | {
      kind: "crafted";
      profession: string;
      recipeZone?: string;
      recipeBoss?: string;
    }
  | { kind: "rep"; faction: string; standing: string }
  | { kind: "heroic"; dungeon: string }
  | { kind: "pvp"; via: "arena" | "honor"; season?: number }
  | { kind: "world" };

/**
 * The union is the source of truth for *shape*; the JSON is what crosses the
 * language boundary. Keeping them in step is a runtime check in
 * `pool.test.ts`, deliberately not a type-level one: `resolveJsonModule`
 * widens `itemSourceKinds.kinds` to `string[]`, so any `extends` assertion
 * against it passes vacuously and would assert nothing while looking rigorous.
 */
export type ItemSourceKind = ItemSource["kind"];

export type PoolEntry = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  phase: number;
  source: ItemSource;
  /** Full provenance when loaded from a universe row; raid view matches any. */
  sources?: ItemSource[];
  /**
   * Unvalidated ordering hint for curation scripts only — not a measured
   * quantity and not used by rankUpgrades. Libram values are hand-typed.
   */
  curationHint?: number;
  bisTags?: Array<"BiS" | "Alt" | "Realistic">;
};

/** Row shape from `data/universes/ret-p*.json` before normalization. */
export type UniverseEntry = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  phase: number;
  sources: ItemSource[];
  curationHint?: number;
  /** @deprecated JSON key from pre-rename generators; mapped to curationHint */
  ep?: number;
  bisTags?: Array<"BiS" | "Alt" | "Realistic">;
};

export function poolEntryFromUniverse(entry: UniverseEntry): PoolEntry {
  const source = entry.sources[0];
  if (!source) {
    throw new Error(`universe row ${entry.itemId} has no sources`);
  }
  const curationHint = entry.curationHint ?? entry.ep;
  return {
    itemId: entry.itemId,
    name: entry.name,
    slot: entry.slot,
    phase: entry.phase,
    source,
    sources: [...entry.sources],
    ...(curationHint !== undefined ? { curationHint } : {}),
    ...(entry.bisTags !== undefined ? { bisTags: entry.bisTags } : {}),
  };
}

export function poolFromUniverse(data: {
  entries: readonly UniverseEntry[];
}): PoolEntry[] {
  return data.entries.map(poolEntryFromUniverse);
}

/** Inclusive maxPhase filter (PLAN.md §4 / R2). */
export function filterPoolByPhase(
  pool: readonly PoolEntry[],
  maxPhase: number
): PoolEntry[] {
  return pool.filter((e) => e.phase <= maxPhase);
}

function sourceHasZone(source: ItemSource, zone: string): boolean {
  return "zone" in source && source.zone === zone;
}

export function filterByZone<
  T extends { source: ItemSource; sources?: readonly ItemSource[] },
>(entries: readonly T[], zone: string): T[] {
  return entries.filter(
    (e) =>
      sourceHasZone(e.source, zone) ||
      (e.sources?.some((s) => sourceHasZone(s, zone)) ?? false)
  );
}

export function filterPoolByZone(
  pool: readonly PoolEntry[],
  zone: string
): PoolEntry[] {
  return filterByZone(pool, zone);
}

export function zonesInPool(pool: readonly PoolEntry[]): string[] {
  const zones = new Set<string>();
  for (const e of pool) {
    if ("zone" in e.source) zones.add(e.source.zone);
    for (const s of e.sources ?? []) {
      if ("zone" in s) zones.add(s.zone);
    }
  }
  return [...zones].sort();
}

/**
 * A sim equipment slot name, as `SIM_ORDER` spells it.
 *
 * Written out rather than derived from `slots-table.json`: that file is
 * imported under `resolveJsonModule`, which widens its array elements to
 * `string`, so a derived type would accept anything. `pool.test.ts` pins
 * every value here against `SIM_ORDER`, which is what keeps the two honest.
 */
export type SimSlotName =
  | Exclude<ItemSlot, "finger" | "trinket" | "weapon">
  | "finger1"
  | "finger2"
  | "trinket1"
  | "trinket2"
  | "mainhand";

/**
 * Map pool slot → sim equipment slot name(s). Rings/trinkets try both; ret
 * two-handers land in mainhand.
 */
export function simSlotsForPoolSlot(slot: ItemSlot): readonly SimSlotName[] {
  switch (slot) {
    case "finger":
      return ["finger1", "finger2"];
    case "trinket":
      return ["trinket1", "trinket2"];
    case "weapon":
      return ["mainhand"];
    default:
      return [slot];
  }
}
