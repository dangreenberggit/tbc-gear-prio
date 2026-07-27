/**
 * 19→17 WCL → sim equipment mapping (PLAN.md §8.4).
 *
 * Source of truth: slots-table.json (Python scripts load the same file).
 * Drop shirt/tabard, then reorder — filter-only mis-slots 11/17 positions.
 */

import table from "./slots-table.json" with { type: "json" };

export const WCL_ORDER = table.wclOrder;
export const SIM_ORDER = table.simOrder;

export type WclGearEntry = {
  id?: number | null;
  permanentEnchant?: number | null;
  gems?: Array<{ id?: number | null } | null> | null;
};

export type SimItemSpec = {
  id?: number;
  enchant?: number;
  gems: number[];
};

export function mapWclGearToSim(
  wclGear: readonly WclGearEntry[]
): SimItemSpec[] {
  if (wclGear.length !== WCL_ORDER.length) {
    throw new Error(
      `expected ${WCL_ORDER.length} WCL gear slots, got ${wclGear.length}`
    );
  }

  const bySlot = new Map<string, SimItemSpec>();
  for (let i = 0; i < WCL_ORDER.length; i++) {
    const name = WCL_ORDER[i]!;
    if (name === "SHIRT" || name === "TABARD") continue;
    bySlot.set(name, toItemSpec(wclGear[i]!));
  }

  return SIM_ORDER.map((name) => {
    const item = bySlot.get(name);
    if (!item) {
      throw new Error(`missing mapped slot ${name}`);
    }
    return item;
  });
}

function toItemSpec(slot: WclGearEntry): SimItemSpec {
  const id = slot.id ?? 0;
  if (!id) return { gems: [] };

  const gems = (slot.gems ?? [])
    .map((g) => g?.id)
    .filter((g): g is number => typeof g === "number" && g > 0);

  const out: SimItemSpec = { id, gems };
  const ench = slot.permanentEnchant;
  if (ench) out.enchant = ench;
  return out;
}
