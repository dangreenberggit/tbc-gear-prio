/**
 * `oneHandBlockedEntries` (ticket 700) decides from the item's hand type
 * alone. A weapon whose hand type the database does not give (`null`, which
 * `getItem` also returns for wowsims' `HandTypeUnknown`) must stay in the
 * run: holding it out would be a guess.
 */
import { describe, expect, it, vi } from "vitest";
import type { PoolEntry } from "../src/pool.js";

const { HAND } = vi.hoisted(() => ({
  HAND: new Map<number, number | null>(),
}));
vi.mock("../src/items.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/items.js")>();
  return {
    ...actual,
    getItem: (id: number) => {
      const real = actual.getItem(id);
      return HAND.has(id) && real ? { ...real, handType: HAND.get(id)! } : real;
    },
  };
});

const { oneHandBlockedEntries, mainHandLeavesOffHandFree } =
  await import("../src/pool.js");

const TWO_HANDER = 29988; // The Nexus Key
const ONE_HANDER = 28524; // Emerald Ripper
const NO_HAND_TYPE = 29182; // Riftmaker, given a null hand type below

const weapon = (itemId: number): PoolEntry =>
  ({
    itemId,
    name: `item ${itemId}`,
    slot: "weapon",
    phase: 1,
    source: { kind: "raid", zone: "Karazhan" },
  }) as PoolEntry;

describe("oneHandBlockedEntries", () => {
  it("keeps a weapon whose hand type is not given", () => {
    HAND.set(NO_HAND_TYPE, null);
    expect(mainHandLeavesOffHandFree(TWO_HANDER)).toBe(false);
    const held = oneHandBlockedEntries(
      [ONE_HANDER, NO_HAND_TYPE, TWO_HANDER].map(weapon),
      "mage",
      TWO_HANDER
    ).map((e) => e.itemId);
    expect(held).toEqual([ONE_HANDER]);
  });
});
