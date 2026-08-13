import { describe, expect, it } from "vitest";
import {
  IMPLAUSIBLE_BONUS_FRACTION,
  deadSlotWarnings,
  plausibilityWarnings,
  setBonusMagnitudeWarnings,
} from "../src/plausibility.js";
import type { SetBonusValue } from "../src/rank.js";
import type { DeadSlotRow } from "../src/dead-slots.js";

/**
 * DPS figures are the measured ones from
 * `.scratch/set-bonus-value/measurements-2026-08-10.md`, not invented sizes.
 * The gate's whole value is that it separates the confounded engine figure from
 * the bonuses that were sim-measured in isolation, so the tests are written in
 * those terms.
 */
const SHREDZEPELIN_BASELINE = 2152.1;
const MALORNE_REFERENCE_BASELINE = 2227.0;

function bonus(over: Partial<SetBonusValue> = {}): SetBonusValue {
  return {
    setId: 676,
    setName: "Thunderheart Harness",
    threshold: 4,
    piecesWorn: 0,
    packageItemIds: [],
    packageDeltaDps: 0,
    ...over,
  };
}

/** The engine's confounded T6 4pc: 193.89 on a 2152.10 baseline, ~9.0%. */
const CONFOUNDED_T6_4PC = bonus({ bonusDps: 193.89 });

/** Directly sim-measured Malorne 2pc: 131.1 on its own 2227 baseline, ~5.9%. */
const MEASURED_MALORNE_2PC = bonus({
  setId: 640,
  setName: "Malorne Harness",
  threshold: 2,
  bonusDps: 131.1,
});

describe("setBonusMagnitudeWarnings", () => {
  it("flags the engine's confounded T6 4pc at ~9% of baseline", () => {
    const found = setBonusMagnitudeWarnings([CONFOUNDED_T6_4PC], {
      baselineDps: SHREDZEPELIN_BASELINE,
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.setId).toBe(676);
    expect(found[0]?.threshold).toBe(4);
    expect(found[0]?.bonusDps).toBeCloseTo(193.89, 2);
    expect(found[0]?.fractionOfBaseline).toBeCloseTo(0.0901, 3);
    expect(found[0]?.thresholdFraction).toBe(IMPLAUSIBLE_BONUS_FRACTION);
  });

  it("does NOT flag the directly-measured Malorne 2pc at ~5.9%", () => {
    // The false positive the SME's original "~5% is suspect" rule would produce.
    // Malorne 2pc was measured directly, with no package and no break to
    // confound it, so a gate that fires here is wrong about a real bonus.
    const found = setBonusMagnitudeWarnings([MEASURED_MALORNE_2PC], {
      baselineDps: MALORNE_REFERENCE_BASELINE,
    });
    expect(found).toEqual([]);
  });

  it("does not flag the isolation-measured T6 4pc or 2pc", () => {
    const found = setBonusMagnitudeWarnings(
      [
        bonus({ bonusDps: 73.5 }),
        bonus({ threshold: 2, bonusDps: 30.5 }),
        bonus({ setId: 640, threshold: 4, bonusDps: 18.04 }),
      ],
      { baselineDps: SHREDZEPELIN_BASELINE }
    );
    expect(found).toEqual([]);
  });

  it("ignores unmeasured bonuses and a zero baseline", () => {
    const unmeasured = bonus({ unmeasured: "not-implemented-in-sim" });
    expect(
      setBonusMagnitudeWarnings([unmeasured], {
        baselineDps: SHREDZEPELIN_BASELINE,
      })
    ).toEqual([]);
    // No baseline means no fraction to compare against — a division by zero
    // would flag every bonus as infinitely implausible.
    expect(
      setBonusMagnitudeWarnings([CONFOUNDED_T6_4PC], { baselineDps: 0 })
    ).toEqual([]);
  });

  it("flags a strongly negative bonus, worded as negative rather than large", () => {
    // Ticket 120: a Malorne-strength 2pc measured with one piece already worn
    // would put roughly -262 on the 4pc figure. That is not a set bonus
    // hurting the player; it is a measurement gone wrong, and the warning has
    // to say so in those words — calling it "too large" would misdescribe it.
    const found = setBonusMagnitudeWarnings([bonus({ bonusDps: -262 })], {
      baselineDps: 2000,
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.kind).toBe("implausible-set-bonus");
    expect(found[0]?.bonusDps).toBeCloseTo(-262, 2);
    expect(found[0]?.fractionOfBaseline).toBeCloseTo(-0.131, 3);
    expect(found[0]?.thresholdFraction).toBe(IMPLAUSIBLE_BONUS_FRACTION);
    expect(found[0]?.message).toContain("implausibly negative");
    expect(found[0]?.message).toContain("measurement problem");
    // The positive-side wording must not leak in: this figure is not "large".
    expect(found[0]?.message).not.toContain("large");
    // Same voice rule as the positive side: the figure is the engine's report.
    expect(found[0]?.message).toContain("reports");
  });

  it("does not flag a noise-sized negative bonus", () => {
    // The ret artifact's Crystalforge 4pc came out at -9.92 on a ~2000
    // baseline — about two standard errors of run noise. A gate that fires
    // there would flag ordinary measurement scatter on every run.
    const found = setBonusMagnitudeWarnings([bonus({ bonusDps: -9.92 })], {
      baselineDps: 2000,
    });
    expect(found).toEqual([]);
  });

  it("uses the same band on both sides of zero", () => {
    // 7.5% of a 2000 baseline is 150: just inside stays quiet, just outside
    // fires, in either direction.
    const justInside = setBonusMagnitudeWarnings(
      [bonus({ bonusDps: -149 }), bonus({ bonusDps: 149 })],
      { baselineDps: 2000 }
    );
    expect(justInside).toEqual([]);
    const justOutside = setBonusMagnitudeWarnings(
      [bonus({ bonusDps: -151 }), bonus({ bonusDps: 151 })],
      { baselineDps: 2000 }
    );
    expect(justOutside).toHaveLength(2);
  });

  it("keeps the threshold above the measured Malorne 2pc and below the confound", () => {
    // Pins the calibration itself, so moving the constant has to face the two
    // measurements that fix it rather than only the tests above.
    expect(IMPLAUSIBLE_BONUS_FRACTION).toBeGreaterThan(131.1 / 2227.0);
    expect(IMPLAUSIBLE_BONUS_FRACTION).toBeLessThan(193.89 / 2152.1);
  });

  it("warns rather than throwing, and still carries the figure", () => {
    const found = setBonusMagnitudeWarnings([CONFOUNDED_T6_4PC], {
      baselineDps: SHREDZEPELIN_BASELINE,
    });
    expect(found[0]?.kind).toBe("implausible-set-bonus");
    expect(found[0]?.message).toContain("193.89");
    expect(found[0]?.message).toContain("Thunderheart Harness");
    // The flagged figure is the engine's *report*, not a measurement of the
    // bonus — ticket 99 measures the same 4pc at 73.5 in isolation. Measurement
    // voice here would restate the suspect number as authoritative.
    expect(found[0]?.message).toContain("reports");
    expect(found[0]?.message).not.toContain("measures");
  });
});

/** The shredzepelin-p3 dead slots, as ticket 94's classifier tests transcribe them. */
function worn(itemId: number, name: string, slot: string): DeadSlotRow {
  return { itemId, name, slot, deltaDps: 0, owned: true };
}
function cand(
  itemId: number,
  name: string,
  slot: string,
  deltaDps: number
): DeadSlotRow {
  return { itemId, name, slot, deltaDps };
}

const CHEST: DeadSlotRow[] = [
  worn(29096, "Breastplate of Malorne", "chest"),
  cand(33675, "Vengeful Gladiator's Dragonhide Tunic", "chest", -90.16),
  cand(31042, "Thunderheart Chestguard", "chest", -100.16),
];

const HEAD: DeadSlotRow[] = [
  worn(8345, "Wolfshead Helm", "head"),
  cand(33672, "Vengeful Gladiator's Dragonhide Helm", "head", -202.05),
  cand(32235, "Cursed Vision of Sargeras", "head", -202.13),
  ...Array.from({ length: 15 }, (_, i) =>
    cand(40000 + i, `head filler ${i}`, "head", -210 - i)
  ),
];

const RANGED: DeadSlotRow[] = [
  worn(29390, "Everbloom Idol", "ranged"),
  cand(32257, "Idol of the White Stag", "ranged", -25.27),
  cand(28568, "Idol of the Avian Heart", "ranged", -54.6),
  cand(30051, "Idol of the Crescent Goddess", "ranged", -54.6),
];

const BENIGN: DeadSlotRow[] = [
  worn(29390, "worn wrist", "wrist"),
  ...Array.from({ length: 12 }, (_, i) =>
    cand(30000 + i, `wrist ${i}`, "wrist", -0.2 - i)
  ),
];

const SHREDZEPELIN_WORN_SET_COUNTS = new Map<number, number>([[640, 2]]);

describe("deadSlotWarnings", () => {
  it("warns on the set-break toll slot, naming the set it charges", () => {
    const found = deadSlotWarnings(CHEST, {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.kind).toBe("dead-slot");
    expect(found[0]?.slot).toBe("chest");
    expect(found[0]?.cause).toBe("set-break-toll");
    expect(found[0]?.message).toContain("Malorne Harness");
  });

  it("warns on Wolfshead Helm's unique-effect slot", () => {
    const found = deadSlotWarnings(HEAD, {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    expect(found.map((w) => w.cause)).toEqual(["unique-effect"]);
    expect(found[0]?.message).toContain("Wolfshead Helm");
  });

  it("does NOT warn on the 4-idol thin pool", () => {
    // The over-collection ticket 94 exists to stop: four idols and the worn one
    // happens to be best says nothing about the gear, so crying wolf here would
    // fire on every idol/relic/ranged slot in the game.
    expect(
      deadSlotWarnings(RANGED, { wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS })
    ).toEqual([]);
  });

  it("warns that an unresolvable worn item leaves the cause unknown", () => {
    const rows: DeadSlotRow[] = [
      worn(999_999_999, "Mystery Helm", "head"),
      ...Array.from({ length: 10 }, (_, i) =>
        cand(50300 + i, `head filler ${i}`, "head", -300 - i)
      ),
    ];
    const found = deadSlotWarnings(rows, { wornSetCounts: new Map() });
    expect(found.map((w) => w.cause)).toEqual(["unknown-item"]);
    // Naming a cause it cannot have established is exactly the failure this
    // warning replaces, so the unique-effect wording must not appear.
    expect(found[0]?.message).not.toContain("matches");
    expect(found[0]?.message).toContain("could not be resolved");
  });

  it("reaches a reader with the tie count (ticket 151)", () => {
    // Review row 6-A4: `tiedCandidates` existed to carry what the report is
    // "silent about by construction", but no renderer or message read it, so
    // the count never reached a human. It must appear in the warning text.
    const rows: DeadSlotRow[] = [
      worn(8345, "Wolfshead Helm", "head"),
      cand(50001, "head clone", "head", 0),
      ...Array.from({ length: 10 }, (_, i) =>
        cand(50400 + i, `head filler ${i}`, "head", -300 - i)
      ),
    ];
    const found = deadSlotWarnings(rows, { wornSetCounts: new Map() });
    expect(found[0]?.message).toContain("1 candidate measured identically");
  });

  it("warns instead of dropping a slot whose worn item is unidentified", () => {
    // Ticket 151 / 4b. No row carries `owned`, as in an older saved report.
    const rows: DeadSlotRow[] = [
      cand(33675, "a", "chest", -10),
      cand(31042, "b", "chest", -20),
    ];
    const found = deadSlotWarnings(rows, { wornSetCounts: new Map() });
    expect(found.map((w) => w.cause)).toEqual(["unidentified-worn-item"]);
    expect(found[0]?.message).toContain("no row records which item is worn");
  });

  it("does NOT warn when a deep pool simply has nothing better", () => {
    expect(deadSlotWarnings(BENIGN, { wornSetCounts: new Map() })).toEqual([]);
  });

  it("warns on exactly the two actionable causes across the whole artifact", () => {
    const found = deadSlotWarnings([...CHEST, ...HEAD, ...RANGED, ...BENIGN], {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    expect(found.map((w) => w.slot).sort()).toEqual(["chest", "head"]);
  });
});

describe("plausibilityWarnings", () => {
  it("collects both gates into one list", () => {
    const found = plausibilityWarnings({
      baselineDps: SHREDZEPELIN_BASELINE,
      setBonuses: [CONFOUNDED_T6_4PC],
      rows: [...CHEST, ...RANGED],
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    expect(found.map((w) => w.kind)).toEqual([
      "implausible-set-bonus",
      "dead-slot",
    ]);
  });

  it("returns nothing when the run is plausible throughout", () => {
    expect(
      plausibilityWarnings({
        baselineDps: SHREDZEPELIN_BASELINE,
        setBonuses: [bonus({ bonusDps: 73.5 })],
        rows: [...RANGED, ...BENIGN],
        wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
      })
    ).toEqual([]);
  });
});
