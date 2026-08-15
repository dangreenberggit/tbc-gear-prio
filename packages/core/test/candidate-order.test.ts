import { describe, expect, it } from "vitest";

import { orderCandidatesByEp } from "../src/candidate-order.js";
import type { PoolEntry } from "../src/pool.js";
import { SIM_ORDER, type SimItemSpec } from "../src/slots.js";
import { Stat } from "../src/stats.js";

/** A minimal neck-slot PoolEntry; only itemId and slot matter to the ordering. */
function poolEntry(itemId: number, name: string): PoolEntry {
  return {
    itemId,
    name,
    slot: "neck",
    phase: 1,
    source: { kind: "badge", cost: 25 },
  };
}

const EP_WEIGHTS = { [Stat.StatSpellDamage]: 1, [Stat.StatStrength]: 1 };

describe("orderCandidatesByEp", () => {
  it("sorts by committed-EP delta vs the owned item in that slot, descending", () => {
    const highSp: PoolEntry = poolEntry(1001, "High SP Neck");
    const lowSp: PoolEntry = poolEntry(1002, "Low SP Neck");

    const statsById = new Map<number, number[]>([
      [1001, withStat(Stat.StatSpellDamage, 80)],
      [1002, withStat(Stat.StatSpellDamage, 20)],
      [1000, withStat(Stat.StatSpellDamage, 40)],
    ]);
    const equipment = equipmentWithNeck(1000);

    const ordered = orderCandidatesByEp(
      [lowSp, highSp],
      equipment,
      EP_WEIGHTS,
      (id) => statsById.get(id) ?? []
    );

    expect(ordered.map((e) => e.itemId)).toEqual([1001, 1002]);
  });

  it("breaks ties by item id, ascending, for a total order", () => {
    const a: PoolEntry = poolEntry(2002, "Tie B");
    const b: PoolEntry = poolEntry(2001, "Tie A");
    const equipment = equipmentWithNeck(undefined);
    const sameStats = withStat(Stat.StatSpellDamage, 10);

    const ordered = orderCandidatesByEp(
      [a, b],
      equipment,
      EP_WEIGHTS,
      () => sameStats
    );

    expect(ordered.map((e) => e.itemId)).toEqual([2001, 2002]);
  });

  it("sorts owned items to a delta of 0 relative to themselves", () => {
    const owned: PoolEntry = poolEntry(3001, "Owned Neck");
    const upgrade: PoolEntry = poolEntry(3002, "Better Neck");
    const equipment = equipmentWithNeck(3001);
    const statsById = new Map<number, number[]>([
      [3001, withStat(Stat.StatSpellDamage, 30)],
      [3002, withStat(Stat.StatSpellDamage, 90)],
    ]);

    const ordered = orderCandidatesByEp(
      [owned, upgrade],
      equipment,
      EP_WEIGHTS,
      (id) => statsById.get(id) ?? []
    );

    // Upgrade outranks the owned item (positive delta vs itself = 0).
    expect(ordered.map((e) => e.itemId)).toEqual([3002, 3001]);
  });

  it("never throws when stats are unavailable for a candidate or the worn item", () => {
    const unknownCandidate: PoolEntry = poolEntry(4001, "Unknown item");
    const equipment = equipmentWithNeck(undefined);

    expect(() =>
      orderCandidatesByEp([unknownCandidate], equipment, EP_WEIGHTS, () => [])
    ).not.toThrow();
  });

  it("never throws when a candidate's slot maps to a name outside SIM_ORDER", () => {
    // Ordering must be safe to call before any sim runs, so a slot-mapping
    // bug here must not do what the real candidate loop does (throw) — it
    // has no sim result to blame it on.
    const bogus: PoolEntry = {
      itemId: 5001,
      name: "Bogus slot",
      // Cast through unknown: exercising the guard against a slot name that
      // simSlotsForPoolSlot cannot resolve, which the real ItemSlot union
      // does not allow a caller to construct honestly.
      slot: "not-a-real-slot" as unknown as PoolEntry["slot"],
      phase: 1,
      source: { kind: "world" },
    };
    const equipment = equipmentWithNeck(undefined);

    expect(() =>
      orderCandidatesByEp([bogus], equipment, EP_WEIGHTS, () => [])
    ).not.toThrow();
  });
});

function withStat(stat: Stat, value: number): number[] {
  const stats: number[] = [];
  stats[stat] = value;
  return stats;
}

function equipmentWithNeck(neckId: number | undefined): SimItemSpec[] {
  // SIM_ORDER position of "neck" is looked up by the function under test;
  // this fixture only needs to be long enough and to carry the id at the
  // real index, so it is built from the real SIM_ORDER rather than an
  // assumed length.
  return Array.from({ length: 20 }, () => ({ gems: [] }) as SimItemSpec).map(
    (spec, i) =>
      i === neckIndex()
        ? { ...spec, ...(neckId !== undefined ? { id: neckId } : {}) }
        : spec
  );
}

function neckIndex(): number {
  return SIM_ORDER.indexOf("neck");
}
