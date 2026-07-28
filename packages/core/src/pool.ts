/**
 * Candidate pool types and filters (PLAN.md §8.3).
 * Pool files are loaded by the CLI and injected via Deps — core stays pure.
 */

import type { ItemSlot } from "./items.js";
import type { ContentPhase } from "./types.js";

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
  ep?: number;
  bisTags?: Array<"BiS" | "Alt" | "Realistic">;
};

/** Inclusive maxPhase filter (PLAN.md §4 / R2). */
export function filterPoolByPhase(
  pool: readonly PoolEntry[],
  maxPhase: ContentPhase
): PoolEntry[] {
  return pool.filter((e) => e.phase <= maxPhase);
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
