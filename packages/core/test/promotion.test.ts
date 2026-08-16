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
      promoteTopJ: 1,
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
    // j = 1 is the pre-§6.4 best-in-slot floor: the generalization to top-j
    // must reproduce it exactly at j = 1.
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 2,
      promoteTopJ: 1,
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
      promoteTopJ: 1,
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
      promoteTopJ: 1,
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
      promoteTopJ: 1,
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
      promoteTopJ: 1,
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
      promoteTopJ: 1,
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

  it("promotes the top-j within each slot, independently of global rank", () => {
    // The rule this is here for: 'back' deltas are an order of magnitude
    // smaller than 'neck' deltas, so a global cutoff drops every cloak at
    // once — which is exactly the clustered miss M1.5 measured on ret. With
    // promoteTopJ = 2 the two best cloaks promote on their own slot's
    // ranking, no matter how small cloak upgrades are in absolute terms.
    const candidates = [
      entry(1, "neck"),
      entry(2, "neck"),
      entry(3, "neck"),
      entry(10, "back"),
      entry(11, "back"),
      entry(12, "back"),
    ];
    const screen = [
      screened(1, 100),
      screened(2, 90),
      screened(3, 80),
      screened(10, 9),
      screened(11, 8),
      screened(12, 7),
    ];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 0,
      promoteTopJ: 2,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    const promoted = new Set(
      result.filter((r) => r.promoted).map((r) => r.itemId)
    );
    expect([...promoted].sort((a, b) => a - b)).toEqual([1, 2, 10, 11]);
  });

  it("takes the whole slot when it holds fewer than j candidates", () => {
    const candidates = [entry(1, "neck"), entry(10, "back")];
    const screen = [screened(1, 100), screened(10, 9)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 0,
      promoteTopJ: 5,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.every((r) => r.promoted)).toBe(true);
  });

  it("breaks per-slot ties by item id, deterministically", () => {
    const candidates = [entry(3, "back"), entry(1, "back"), entry(2, "back")];
    const screen = [screened(3, 50), screened(1, 50), screened(2, 50)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 0,
      promoteTopJ: 2,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.find((r) => r.itemId === 1)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 2)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 3)?.promoted).toBe(false);
  });

  it("still promotes a dense slot's global-top rows beyond j", () => {
    // Per-slot top-j is a floor, not a cap: a slot holding many genuinely
    // strong candidates keeps them via global top-K. Removing top-K would
    // cap every slot at j and reopen the recall miss on the dense-cutoff
    // fixture that gates 7.2.
    const candidates = [
      entry(1, "neck"),
      entry(2, "neck"),
      entry(3, "neck"),
      entry(4, "neck"),
    ];
    const screen = [
      screened(1, 100),
      screened(2, 99),
      screened(3, 98),
      screened(4, 97),
    ];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 4,
      promoteTopJ: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.every((r) => r.promoted)).toBe(true);
  });

  it("does not promote a slot whose every candidate failed to screen", () => {
    // A candidate whose every slot attempt panicked screens at -Infinity.
    // The best-in-slot floor exists so no slot goes unrepresented, but a slot
    // where nothing produced a number has nothing to represent: promoting the
    // argmax of two failures spends a full-iteration sim on a candidate that
    // will panic again. -Infinity also serializes to JSON `null`, so letting
    // one reach a RankedItem breaks the sort comparator on a rehydrated
    // Ranking.
    const candidates = [entry(1, "back"), entry(2, "back")];
    const screen = [
      screened(1, Number.NEGATIVE_INFINITY),
      screened(2, Number.NEGATIVE_INFINITY),
    ];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 0,
      promoteTopJ: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.every((r) => !r.promoted)).toBe(true);
  });

  /**
   * Ticket 156. The two tests around this one pass `promoteTopK: 0`, so they
   * pin the "never promote a failed screen" intent for the per-slot floor
   * only. `topK` sorts the whole screened list and slices the first K without
   * checking finiteness, so at the shipped K (150) a pool smaller than 150
   * promotes *everything* — including candidates whose every slot attempt
   * panicked. The full-iteration sim then re-runs a swap already known to
   * crash, and the row is disclosed as "dropped from the ranking" on top of
   * the screening failure already recorded against it.
   */
  it("does not promote a failed screen through topK", () => {
    const candidates = [entry(1, "back"), entry(2, "neck")];
    const screen = [screened(1, Number.NEGATIVE_INFINITY), screened(2, 40)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 150,
      promoteTopJ: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.find((r) => r.itemId === 2)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 1)?.promoted).toBe(false);
  });

  it("still floors a slot on its one finite screen among failures", () => {
    const candidates = [entry(1, "back"), entry(2, "back")];
    const screen = [screened(1, Number.NEGATIVE_INFINITY), screened(2, -3)];
    const result = promotionRule({
      screened: screen,
      candidates,
      promoteTopK: 0,
      promoteTopJ: 1,
      ownedItemIds: new Set(),
      setPackageItemIds: new Set(),
    });
    expect(result.find((r) => r.itemId === 2)?.promoted).toBe(true);
    expect(result.find((r) => r.itemId === 1)?.promoted).toBe(false);
  });
});
