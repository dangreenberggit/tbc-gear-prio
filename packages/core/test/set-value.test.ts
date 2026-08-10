import { describe, expect, it } from "vitest";
import type { PoolEntry } from "../src/pool.js";
import {
  brokenSetBonuses,
  combineSe,
  computeSynergy,
  isBonusImplemented,
  nextMeasurableThreshold,
  selectPackage,
  setCounts,
  SET_THRESHOLDS,
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

describe("SET_THRESHOLDS", () => {
  // The 4pc formula (rank.ts's buildSetBonuses) carries the 2pc bonus
  // forward as a subtracted term, which only works if 2 is iterated before
  // 4 — a silent dependency on array order (finding 7's guard).
  it("stays ascending", () => {
    const sorted = [...SET_THRESHOLDS].sort((a, b) => a - b);
    expect(SET_THRESHOLDS).toEqual(sorted);
  });
});

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

  /**
   * The regression this feature is most exposed to: its whole subject is sets
   * the player wears no piece of, and a worn-gear-only scan names none of them.
   * A live `--with-set-potential` run printed `set 626 4pc` for Justicar
   * Battlegear, whose setName is right there in the item data.
   */
  it("names a set the player wears no piece of, from the pieces offered", () => {
    const gear = blank();
    expect(setLabel(gear, JUSTICAR_SET_ID)).toBe(`set ${JUSTICAR_SET_ID}`);
    expect(setLabel(gear, JUSTICAR_SET_ID, [29073])).toBe(
      "Justicar Battlegear"
    );
  });

  it("still prefers a worn piece's name over the offered pieces", () => {
    const gear = blank();
    gear[HEAD] = { id: 29073, gems: [] };
    expect(setLabel(gear, JUSTICAR_SET_ID, [29074])).toBe(
      "Justicar Battlegear"
    );
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
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10, se: 1 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 20, se: 1 },
      { itemId: 29074, slotIndex: LEGS, deltaDps: 5, se: 1 },
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
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10, se: 1 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 10, se: 1 }, // tie
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
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10, se: 1 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 10, se: 1 },
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

  it("emits addedPieces in canonical-slot order regardless of selection order (finding 6)", () => {
    // Selection picks by highest deltaDps first — legs (30) beats hands (20)
    // beats shoulder (10) — but SIM_ORDER puts shoulder before hands before
    // legs. Spec §3 requires the emitted array in canonical-slot order, not
    // selection order.
    // One Justicar piece already worn (not head, so all three pool slots stay
    // open) — threshold 4 then needs exactly the 3 pool candidates supplied.
    const wornOther = blank();
    wornOther[HEAD] = { id: 29073, gems: [] };
    const pool: PoolEntry[] = [
      justicarPoolEntry(29075, "shoulder"),
      justicarPoolEntry(29072, "hands"),
      justicarPoolEntry(29074, "legs"),
    ];
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10, se: 1 },
      { itemId: 29072, slotIndex: HANDS, deltaDps: 20, se: 1 },
      { itemId: 29074, slotIndex: LEGS, deltaDps: 30, se: 1 },
    ];
    const result = selectPackage(
      JUSTICAR_SET_ID,
      4,
      wornOther,
      pool,
      deltas,
      slotIndexForPoolEntry
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.addedPieces.map((p) => p.slotIndex)).toEqual(
      [SHOULDER, HANDS, LEGS].sort((a, b) => a - b)
    );
    expect(result.addedPieces.map((p) => p.itemId)).toEqual([
      29075, 29072, 29074,
    ]);
  });

  it("reports insufficient-pieces when the pool cannot fill enough slots", () => {
    const gear = blank();
    const pool: PoolEntry[] = [justicarPoolEntry(29075, "shoulder")];
    const deltas: IndividualDelta[] = [
      { itemId: 29075, slotIndex: SHOULDER, deltaDps: 10, se: 1 },
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
      addedPieceSamples: [
        { deltaDps: 30, se: 1 },
        { deltaDps: 20, se: 1 },
      ],
    });
    // packageDelta = 100; sumSingles = 50; bonus = 100 - 50 - 0 = 50
    expect(result.packageDeltaDps).toBeCloseTo(100, 10);
    expect(result.bonusDps).toBeCloseTo(50, 10);
  });

  /**
   * §2.2's `se` is `sqrt(Σ se_i²)` over *every* sim involved — baseline,
   * package, and each subtracted single — not just baseline+package.
   * verification.md's V0 worked example combines exactly these six.
   */
  it("combines se over baseline, package, and every added single (finding 4)", () => {
    const result = computeSynergy({
      baseline: { dps: 1000, se: 2 },
      packageSample: { dps: 1100, se: 2 },
      addedPieceSamples: [
        { deltaDps: 30, se: 1 },
        { deltaDps: 20, se: 3 },
      ],
    });
    expect(result.se).toBeCloseTo(Math.sqrt(4 + 4 + 1 + 9), 10);
  });

  it("bonus(S,4) subtracts a measured bonus(S,2)", () => {
    const result = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceSamples: [
        { deltaDps: 40, se: 1 },
        { deltaDps: 30, se: 1 },
        { deltaDps: 20, se: 1 },
        { deltaDps: 10, se: 1 },
      ], // sum 100
      twoPieceBonus: 15,
    });
    // packageDelta = 200; bonus = 200 - 100 - 15 = 85
    expect(result.bonusDps).toBeCloseTo(85, 10);
  });

  it("treats an unmeasured (not-implemented) 2pc as a 0 subtraction, not a missing term", () => {
    const samples = [
      { deltaDps: 40, se: 1 },
      { deltaDps: 30, se: 1 },
      { deltaDps: 20, se: 1 },
      { deltaDps: 10, se: 1 },
    ];
    const withOmitted = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceSamples: samples,
      // twoPieceBonus intentionally omitted — Justicar/Nordrassil 2pc case.
    });
    const withExplicitZero = computeSynergy({
      baseline: { dps: 1000, se: 1 },
      packageSample: { dps: 1200, se: 1 },
      addedPieceSamples: samples,
      twoPieceBonus: 0,
    });
    expect(withOmitted.bonusDps).toBeCloseTo(withExplicitZero.bonusDps, 10);
    expect(withOmitted.bonusDps).toBeCloseTo(100, 10);
  });

  it("an implemented bonus measuring ≈0 reports the number, not a sentinel", () => {
    const result = computeSynergy({
      baseline: { dps: 2000, se: 5 },
      packageSample: { dps: 2000.5, se: 5 },
      addedPieceSamples: [
        { deltaDps: 0.3, se: 1 },
        { deltaDps: 0.2, se: 1 },
      ],
    });
    expect(result.bonusDps).toBeCloseTo(0, 5);
    expect(typeof result.bonusDps).toBe("number");
    expect(Number.isNaN(result.bonusDps)).toBe(false);
  });
});

/**
 * The production mirror of verification.md's V0b confound: `selectPackage`
 * treats a slot as free unless it holds the *same* set's piece, so a package
 * can displace another set's piece and drop it below a threshold.
 */
describe("brokenSetBonuses (finding 8)", () => {
  // Malorne Harness (640) T4 feral: 29096 chest, 29097 hands, 29098 head,
  // 29100 shoulder. Both its 2pc and 4pc are implemented (verification.md V1).
  const MALORNE_SET_ID = 640;

  it("reports an other set's threshold the package drops below", () => {
    const gear = blank();
    gear[CHEST] = { id: 29096, gems: [] };
    gear[SHOULDER] = { id: 29100, gems: [] };

    // Exactly V0b: a Thunderheart shoulder (31048) lands on the slot holding
    // Malorne's, taking Malorne from 2 pieces to 1 and killing its 2pc.
    const broken = brokenSetBonuses(
      gear,
      [{ itemId: 31048, slotIndex: SHOULDER }],
      676
    );

    expect(broken).toHaveLength(1);
    expect(broken[0]).toMatchObject({
      setId: MALORNE_SET_ID,
      setName: "Malorne Harness",
      threshold: 2,
      piecesBefore: 2,
      piecesAfter: 1,
    });
  });

  it("reports nothing when the package only fills slots holding no set piece", () => {
    const gear = blank();
    gear[CHEST] = { id: 29096, gems: [] };
    gear[SHOULDER] = { id: 29100, gems: [] };

    // V0c: head and hands are empty here, so crossing Malorne 2pc -> 4pc
    // displaces nothing and breaks nothing.
    const broken = brokenSetBonuses(
      gear,
      [
        { itemId: 29098, slotIndex: HEAD },
        { itemId: 29097, slotIndex: HANDS },
      ],
      MALORNE_SET_ID
    );

    expect(broken).toEqual([]);
  });

  it("never reports the set being completed as broken", () => {
    const gear = blank();
    gear[CHEST] = { id: 29096, gems: [] };
    gear[SHOULDER] = { id: 29100, gems: [] };
    const broken = brokenSetBonuses(
      gear,
      [{ itemId: 29098, slotIndex: SHOULDER }],
      MALORNE_SET_ID
    );
    expect(broken.every((b) => b.setId !== MALORNE_SET_ID)).toBe(true);
  });

  it("ignores a dropped threshold whose bonus the sim does not implement", () => {
    const gear = blank();
    // Justicar 626 2pc is not implemented (verification.md V1), so dropping
    // from 2 pieces to 1 costs no DPS and is not worth reporting.
    gear[HEAD] = { id: 29073, gems: [] };
    gear[LEGS] = { id: 29074, gems: [] };
    const broken = brokenSetBonuses(
      gear,
      [{ itemId: 31039, slotIndex: HEAD }],
      676
    );
    expect(broken).toEqual([]);
  });
});
