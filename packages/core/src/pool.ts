/**
 * Candidate pool types and filters (PLAN.md §8.3).
 * Pool files are loaded by the CLI and injected via Deps — core stays pure.
 */

import type { ItemSlot } from "./items.js";

export type ItemSource =
  | { kind: "raid"; zone: string; boss?: string }
  | { kind: "token"; zone: string; boss?: string; token: string }
  | { kind: "badge"; cost: number }
  | { kind: "crafted"; profession: string }
  | { kind: "rep"; faction: string; standing: string }
  | { kind: "heroic"; dungeon: string }
  | { kind: "pvp"; via: "arena" | "honor"; season?: number }
  | { kind: "world" };

export type PoolEntry = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  phase: number;
  source: ItemSource;
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

export function filterByZone<T extends { source: ItemSource }>(
  entries: readonly T[],
  zone: string
): T[] {
  return entries.filter((e) => "zone" in e.source && e.source.zone === zone);
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
  }
  return [...zones].sort();
}

/**
 * Map pool slot → sim equipment slot name(s). Rings/trinkets try both; ret
 * two-handers land in mainhand.
 */
export function simSlotsForPoolSlot(slot: ItemSlot): readonly string[] {
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
