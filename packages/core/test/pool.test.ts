import { describe, expect, it } from "vitest";
import { filterPoolByPhase, type PoolEntry } from "../src/pool.js";

const pool: PoolEntry[] = [
  {
    itemId: 1,
    name: "P1",
    slot: "neck",
    phase: 1,
    source: { kind: "raid", zone: "Karazhan" },
  },
  {
    itemId: 2,
    name: "P2",
    slot: "neck",
    phase: 2,
    source: { kind: "raid", zone: "SSC" },
  },
  {
    itemId: 3,
    name: "P3",
    slot: "neck",
    phase: 3,
    source: { kind: "raid", zone: "BT" },
  },
];

describe("filterPoolByPhase", () => {
  it("keeps entries with phase <= maxPhase (inclusive)", () => {
    expect(filterPoolByPhase(pool, 1).map((e) => e.itemId)).toEqual([1]);
    expect(filterPoolByPhase(pool, 2).map((e) => e.itemId)).toEqual([1, 2]);
    expect(filterPoolByPhase(pool, 3).map((e) => e.itemId)).toEqual([1, 2, 3]);
  });
});
