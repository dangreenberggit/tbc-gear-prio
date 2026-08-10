import { describe, expect, it } from "vitest";
import type { PoolEntry } from "../src/pool.js";
import {
  combineSe,
  computeSynergy,
  isBonusImplemented,
  nextMeasurableThreshold,
  selectPackage,
  setCounts,
  setLabel,
  type IndividualDelta,
} from "../src/set-value.js";
import { SIM_ORDER, type SimItemSpec } from "../src/slots.js";

function blank(): SimItemSpec[] {
  return SIM_ORDER.map(() => ({ gems: [] }));
}

const HEAD = SIM_ORDER.indexOf("head");
const SHOULDER = SIM_ORDER.indexOf("shoulder");
const CHEST = SIM_ORDER.indexOf("chest");
const HANDS = SIM_ORDER.indexOf("hands");
const LEGS = SIM_ORDER.indexOf("legs");

// Justicar Battlegear (setId 626): 29073 head, 29075 shoulder, 29072 hands,
// 29074 legs — matches verification.md V0a's item ids.
const JUSTICAR_SET_ID = 626;

function justicarPoolEntry(itemId: number, slot: string): PoolEntry {
  return {
    itemId,
    name: `justicar ${slot}`,
    slot: slot as PoolEntry["slot"],
    phase: 2,
    source: { kind: "raid", zone: "test" },
  };
}

const slotIndexForPoolEntry = (entry: PoolEntry): number | undefined => {
  switch (entry.slot) {
    case "head":
      return HEAD;
    case "shoulder":
      return SHOULDER;
    case "hands":
      return HANDS;
    case "legs":
      return LEGS;
    default:
      return undefined;
  }
};

describe("setCounts / setLabel", () => {
  it("counts worn pieces per setId, ignoring non-set items", () => {
    const gear = blank();
    gear[HEAD] = { id: 29073, gems: [] };
    gear[SHOULDER] = { id: 29075, gems: [] };
    const counts = setCounts(gear);
    expect(counts.get(JUSTICAR_SET_ID)).toBe(2);
  });

  it("falls back to `set ${id}` when no worn item carries a setName", () => {
    const gear = blank();
    expect(setLabel(gear, 999999)).toBe("set 999999");
  });
});

describe("isBonusImplemented (verification.md V1 table)", () => {
  it("Justicar 626 2pc is not implemented; 4pc is", () => {
    expect(isBonusImplemented(626, 2)).toBe(false);
    expect(isBonusImplemented(626, 4)).toBe(true);
  });

  it("Nordrassil 641 2pc is not implemented; 4pc is", () => {
    expect(isBonusImplemented(641, 2)).toBe(false);
    expect(isBonusImplemented(641, 4)).toBe(true);
  });

  it("Crystalforge 629 2pc and 4pc are implemented (mana/heal, measure ≈0)", () => {
    expect(isBonusImplemented(629, 2)).toBe(true);
    expect(isBonusImplemented(629, 4)).toBe(true);
  });

  it("unknown sets are conservatively not implemented", () => {
    expect(isBonusImplemented(123456, 2)).toBe(false);
  });
});

describe("nextMeasurableThreshold", () => {
  it("skips an unimplemented 2pc and points at 4pc (Nordrassil first piece)", () => {
    expect(nextMeasurableThreshold(641, 1)).toBe(4);
  });

  it("returns 2 when 2pc is implemented and not yet reached", () => {
    expect(nextMeasurableThreshold(676, 0)).toBe(2);
  });

  it("returns null once at/above the top implemented threshold", () => {
    expect(nextMeasurableThreshold(676, 4)).toBeNull();
  });
});

describe("selectPackage", () => {
  it("counts an already-worn piece toward the threshold and does not re-add it", () => {
    const gear = blank();
    gear[HEAD] = { id: 29073, gems: [] }; // already worn Justicar head
    const pool: PoolEntry[] = [
      justicarPoolEntry(29075, "shoulder"),
      justicarPoolEntry(29072, "hands"),
      justicarPoolEntry(29074, "legs"),
    ];
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 20 },
      { itemId: 29074, slotIndex: LEGS, deltaDps: 5 },
    ];
    const result = selectPackage(
      JUSTICAR_SET_ID,
      2,
      gear,
      pool,
      deltas,
      slotIndexForPoolEntry
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.piecesWorn).toBe(1);
    // Only one more piece needed to reach 2; highest deltaDps wins (hands).
    expect(result.addedPieces).toHaveLength(1);
    expect(result.addedPieces[0]?.itemId).toBe(29072);
    expect(result.addedPieces.some((p) => p.itemId === 29073)).toBe(false);
  });

  it("breaks ties in candidate selection by lower item id", () => {
    const gear = blank();
    const pool: PoolEntry[] = [
      justicarPoolEntry(29075, "shoulder"),
      justicarPoolEntry(29072, "hands"),
    ];
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 10 }, // tie
    ];
    const result = selectPackage(
      JUSTICAR_SET_ID,
      2,
      gear,
      pool,
      deltas,
      slotIndexForPoolEntry
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Need 2 pieces, both candidates tie in deltaDps and both get selected —
    // so pin the *order*/*identity* explicitly via a 1-needed variant below.
    expect(result.addedPieces.map((p) => p.itemId).sort()).toEqual([
      29072, 29075,
    ]);
  });

  it("ties by item id when only one of two equal-value slots is needed", () => {
    const gear = blank();
    gear[CHEST] = { id: 30129, gems: [] }; // one worn Justicar-unrelated filler not counted
    const pool: PoolEntry[] = [
      justicarPoolEntry(29075, "shoulder"),
      justicarPoolEntry(29072, "hands"),
    ];
    // Both candidates tie at 10 deltaDps; only 1 needed since... to force
    // "needed=1" we pre-equip one Justicar piece.
    const gearWithOne = blank();
    gearWithOne[HEAD] = { id: 29073, gems: [] };
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 10 },
    ];
    const result = selectPackage(
      JUSTICAR_SET_ID,
      2,
      gearWithOne,
      pool,
      deltas,
      slotIndexForPoolEntry
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.addedPieces).toHaveLength(1);
    // Tie broken by lower item id: 29072 < 29075.
    expect(result.addedPieces[0]?.itemId).toBe(29072);
  });

  it("reports insufficient-pieces when the pool cannot fill enough slots", () => {
    const gear = blank();
    const pool: PoolEntry[] = [justicarPoolEntry(29075, "shoulder")];
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10 },
    ];
    const result = selectPackage(
      JUSTICAR_SET_ID,
      4,
      gear,
      pool,
      deltas,
      slotIndexForPoolEntry
    );
    expect(result).toEqual({ ok: false, reason: "insufficient-pieces" });
  });
});

describe("combineSe", () => {
  it("combines conservatively as sqrt(sum of squares)", () => {
    expect(
      combineSe([
        { dps: 0, se: 3 },
        { dps: 0, se: 4 },
      ])
    ).toBeCloseTo(5, 10);
  });
});

describe("computeSynergy", () => {
  it("computes bonus(S,2) from packageDelta minus the added singles", () => {
    const result = computeSynergy({
      baseline: { dps: 1000, se: 2 },
      packageSample: { dps: 1100, se: 2 },
      addedPieceDeltas: [30, 20],
    });
    // packageDelta = 100; sumSingles = 50; bonus = 100 - 50 - 0 = 50
    expect(result.packageDeltaDps).toBeCloseTo(100, 10);
    expect(result.bonusDps).toBeCloseTo(50, 10);
    expect(result.se).toBeCloseTo(Math.sqrt(4 + 4), 10);
  });

  it("bonus(S,4) subtracts a measured bonus(S,2)", () => {
    const result = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceDeltas: [40, 30, 20, 10], // sum 100
      twoPieceBonus: 15,
    });
    // packageDelta = 200; bonus = 200 - 100 - 15 = 85
    expect(result.bonusDps).toBeCloseTo(85, 10);
  });

  it("treats an unmeasured (not-implemented) 2pc as a 0 subtraction, not a missing term", () => {
    const withOmitted = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceDeltas: [40, 30, 20, 10],
      // twoPieceBonus intentionally omitted — Justicar/Nordrassil 2pc case.
    });
    const withExplicitZero = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceDeltas: [40, 30, 20, 10],
      twoPieceBonus: 0,
    });
    expect(withOmitted.bonusDps).toBeCloseTo(withExplicitZero.bonusDps, 10);
    expect(withOmitted.bonusDps).toBeCloseTo(100, 10);
  });

  it("an implemented bonus measuring ≈0 reports the number, not a sentinel", () => {
    const result = computeSynergy({
      baseline: { dps: 2000, se: 5 },
      packageSample: { dps: 2000.5, se: 5 },
      addedPieceDeltas: [0.3, 0.2],
    });
    expect(result.bonusDps).toBeCloseTo(0, 5);
    expect(typeof result.bonusDps).toBe("number");
    expect(Number.isNaN(result.bonusDps)).toBe(false);
  });
});
