import { describe, expect, it } from "vitest";
import { promotionRule, type ScreeningResult } from "../src/promotion.js";
import type { PoolEntry } from "../src/pool.js";

function entry(itemId: number, slot: PoolEntry["slot"]): PoolEntry {
  return {
    itemId,
    name: `item-${itemId}`,
    slot,
    phase: 1,
    source: { kind: "world" },
  };
}

function screened(itemId: number, deltaDps: number): ScreeningResult {
  return { itemId, deltaDps };
}

describe("promotionRule (candidate-pool.md §6.1)", () => {
  it("promotes the global top-K by screening delta", () => {
    // Same slot for every candidate, so best-in-slot picks only the single
    // top row and does not rescue anything the top-K cutoff would drop —
    // isolating top-K from the best-in-slot floor.
    const candidates = [
      entry(1, "neck"),
      entry(2, "neck"),
      entry(3, "neck"),
      entry(4, "neck"),
    ];
    const screen = [
      screened(1, 100),
      screened(2, 80),
      screened(3, 60),
      screened(4, 40),
    ];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 2,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(
      result
        .filter((r) => r.promoted)
        .map((r) => r.itemId)
        .sort()
    ).toEqual([1, 2]);
  });

  it("promotes the best-in-slot candidate even outside the top-K (floor: no empty slot)", () => {
    // Item 5 is the only 'back' candidate but ranks below the top-2 cutoff —
    // without the floor, 'back' would have zero promoted rows.
    const candidates = [
      entry(1, "neck"),
      entry(2, "neck"),
      entry(3, "neck"),
      entry(5, "back"),
    ];
    const screen = [
      screened(1, 100),
      screened(2, 90),
      screened(3, 80),
      screened(5, 10),
    ];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 2,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    const promoted = result.filter((r) => r.promoted).map((r) => r.itemId);
    expect(promoted).toContain(5);
  });

  it("promotes a set-completion package member regardless of screening rank", () => {
    const candidates = [entry(1, "neck"), entry(2, "waist"), entry(9, "back")];
    const screen = [screened(1, 100), screened(2, 90), screened(9, -50)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set([9]),
    });
    expect(result.find((r) => r.itemId === 9)?.promoted).toBe(true);
  });

  it("promotes an owned item regardless of screening rank", () => {
    const candidates = [entry(1, "neck"), entry(2, "waist"), entry(7, "back")];
    const screen = [screened(1, 100), screened(2, 90), screened(7, -999)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 1,
      ownedItemIds: new Set([7]),
      setPackageItemIds: new Set(),
    });
    expect(result.find((r) => r.itemId === 7)?.promoted).toBe(true);
  });

  it("screens everyone out below the floor when neither top-K, best-in-slot, package, nor owned applies", () => {
    const candidates = [entry(1, "neck"), entry(2, "neck"), entry(3, "neck")];
    const screen = [screened(1, 100), screened(2, 90), screened(3, 80)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    // Item 2 and 3 are neither in top-1 nor best-in-slot (item 1 already is
    // best-in-slot for 'neck'), so both are screened out.
    expect(result.find((r) => r.itemId === 2)?.promoted).toBe(false);
    expect(result.find((r) => r.itemId === 3)?.promoted).toBe(false);
  });

  it("promotes everyone when candidates are fewer than K", () => {
    const candidates = [entry(1, "neck"), entry(2, "waist")];
    const screen = [screened(1, 100), screened(2, 90)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 35,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.every((r) => r.promoted)).toBe(true);
  });

  it("breaks all-equal deltas by item id, deterministically", () => {
    const candidates = [entry(3, "neck"), entry(1, "neck"), entry(2, "neck")];
    const screen = [screened(3, 50), screened(1, 50), screened(2, 50)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 2,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    // Ties broken toward lower item id: 1 and 2 promoted, 3 is not (unless
    // best-in-slot rescues it — here 3 IS the top delta-tied item but loses
    // the id tiebreak, and best-in-slot picks the same winner as top-K
    // since they share the slot, so 3 stays screened out).
    expect(result.find((r) => r.itemId === 1)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 2)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 3)?.promoted).toBe(false);
  });
});
