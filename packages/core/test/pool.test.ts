import { describe, expect, it } from "vitest";
import {
  filterPoolByPhase,
  prefilterPool,
  type PoolEntry,
} from "../src/pool.js";

const pool: PoolEntry[] = [
  {
    itemId: 1,
    name: "P1",
    slot: "neck",
    phase: 1,
    ep: 10,
    source: { kind: "raid", zone: "Karazhan" },
  },
  {
    itemId: 2,
    name: "P2",
    slot: "neck",
    phase: 2,
    ep: 50,
    source: { kind: "raid", zone: "SSC" },
  },
  {
    itemId: 3,
    name: "P3",
    slot: "neck",
    phase: 3,
    ep: 100,
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

describe("prefilterPool", () => {
  it("keeps the highest-EP entries up to the limit", () => {
    expect(prefilterPool(pool, { limit: 2 }).map((e) => e.itemId)).toEqual([
      3, 2,
    ]);
  });

  it("skips the limit when fullPool is set", () => {
    expect(
      prefilterPool(pool, { fullPool: true, limit: 1 }).map((e) => e.itemId)
    ).toEqual([1, 2, 3]);
  });
});
