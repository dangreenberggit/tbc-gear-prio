/**
 * The 17-slot equipment vector `compose` expects, from a fight's logged gear.
 *
 * A local copy of core's `equipmentFromLoggedGear`, which core does not
 * export from its index (see the handoff's notes). Same mapping: a slot the
 * capture did not fill becomes a blank spec so the vector keeps its shape and
 * `compose` writes a `{}` into that position rather than shifting the rest.
 *
 * Its own module so `jobs.ts` (which composes the baseline) and `exports.ts`
 * (which swaps a candidate into it) can both reach it without importing each
 * other.
 */

import {
  SIM_ORDER,
  type LoggedGear,
  type SimItemSpec,
} from "@tbc-gear-prio/core";

export function equipmentFromLogged(gear: LoggedGear): SimItemSpec[] {
  const bySlot = new Map<string, SimItemSpec>();
  for (const item of gear.items) {
    if (!item.id) {
      bySlot.set(item.slot, { gems: [] });
      continue;
    }
    const spec: SimItemSpec = { id: item.id, gems: [...(item.gems ?? [])] };
    if (item.enchant) spec.enchant = item.enchant;
    bySlot.set(item.slot, spec);
  }
  return SIM_ORDER.map((slot) => bySlot.get(slot) ?? { gems: [] });
}
