import { describe, expect, it } from "vitest";
import {
  classifyDeadSlots,
  THIN_POOL_CANDIDATES,
  UNIQUE_EFFECT_GAP_DPS,
  type DeadSlotRow,
} from "../src/dead-slots.js";

/**
 * The four dead slots of `.scratch/rank-reports/shredzepelin-p3.json`, which
 * ticket 94 established arise from three different causes. Item ids and deltas
 * are transcribed from that artifact; the setIds come from
 * `data/items/index.json` via the classifier's own join, not from here.
 */

/**
 * The equipped item: `owned` marks it, and its delta is exactly 0 because the
 * swap replaces it with itself.
 */
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

const SHOULDER: DeadSlotRow[] = [
  worn(29100, "Mantle of Malorne", "shoulder"),
  cand(33674, "Vengeful Gladiator's Dragonhide Spaulders", "shoulder", -102.16),
  cand(31048, "Thunderheart Pauldrons", "shoulder", -106.16),
];

// 18 rows in the artifact — a deep pool, so thinness cannot explain this one.
// Only the two nearest candidates are named; the rest pad the pool to its real
// depth so the `thin-pool` test does not fire ahead of `unique-effect`.
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

/** A live slot: some candidate beats the worn item, so it is not dead at all. */
const WAIST: DeadSlotRow[] = [
  worn(21873, "worn waist", "waist"),
  cand(32268, "Belt of One-Hundred Deaths", "waist", 45.5),
];

/** Worn counts of the player's sets, as `setCounts` would report them. */
const SHREDZEPELIN_WORN_SET_COUNTS = new Map<number, number>([[640, 2]]);

describe("classifyDeadSlots", () => {
  it("leaves a slot with a positive candidate unclassified", () => {
    const found = classifyDeadSlots([...WAIST, ...CHEST], {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    expect(found.map((d) => d.slot)).not.toContain("waist");
  });

  it("classifies chest and shoulder as a set-break toll, naming the set", () => {
    const found = classifyDeadSlots([...CHEST, ...SHOULDER], {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });

    const chest = found.find((d) => d.slot === "chest");
    expect(chest?.cause).toBe("set-break-toll");
    // The signature is the worn item's own setId sitting at/above an
    // implemented threshold — not the size of the gap.
    expect(chest?.wornSetId).toBe(640);
    expect(chest?.wornSetName).toBe("Malorne Harness");
    expect(chest?.brokenThreshold).toBe(2);
    expect(chest?.runnerUpGapDps).toBeCloseTo(-90.16, 2);

    const shoulder = found.find((d) => d.slot === "shoulder");
    expect(shoulder?.cause).toBe("set-break-toll");
    expect(shoulder?.wornSetId).toBe(640);
    expect(shoulder?.brokenThreshold).toBe(2);
  });

  it("classifies Wolfshead Helm's slot as a unique effect, not a toll", () => {
    const found = classifyDeadSlots(HEAD, {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    const head = found.find((d) => d.slot === "head");
    // A huge gap with no set behind it: the symptom of a toll, none of the cause.
    expect(head?.cause).toBe("unique-effect");
    expect(head?.wornSetId).toBeNull();
    expect(head?.runnerUpGapDps).toBeCloseTo(-202.05, 2);
  });

  it("classifies the 4-idol ranged slot as a thin pool", () => {
    const found = classifyDeadSlots(RANGED, {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    });
    const ranged = found.find((d) => d.slot === "ranged");
    expect(ranged?.cause).toBe("thin-pool");
    expect(ranged?.wornSetId).toBeNull();
    expect(ranged?.poolSize).toBe(3);
  });

  it("classifies a setless slot with a shallow gap as benign", () => {
    // Ret's dead slots: a deep pool, no set, and nothing better by a hair.
    const benign: DeadSlotRow[] = [
      worn(29390, "worn wrist", "wrist"),
      ...Array.from({ length: 12 }, (_, i) =>
        cand(30000 + i, `wrist ${i}`, "wrist", -0.2 - i)
      ),
    ];
    const found = classifyDeadSlots(benign, { wornSetCounts: new Map() });
    const wrist = found.find((d) => d.slot === "wrist");
    expect(wrist?.cause).toBe("benign-nothing-better");
  });

  it("uses the owned flag, not the zero delta, to pick the worn item", () => {
    // A second candidate measuring identically to baseline is unremarkable at
    // 3000 iterations. Without `owned` the classifier picked whichever zero row
    // came first, so the setId it joined against was arbitrary.
    const tied: DeadSlotRow[] = [
      cand(33675, "Vengeful Gladiator's Dragonhide Tunic", "chest", 0),
      { ...worn(29096, "Breastplate of Malorne", "chest"), owned: true },
      cand(31042, "Thunderheart Chestguard", "chest", -100.16),
    ];
    const chest = classifyDeadSlots(tied, {
      wornSetCounts: SHREDZEPELIN_WORN_SET_COUNTS,
    }).find((d) => d.slot === "chest");
    expect(chest?.wornItemId).toBe(29096);
    expect(chest?.cause).toBe("set-break-toll");
  });

  it("does not let a tied candidate masquerade as the runner-up", () => {
    // The reviewer's case: a clone at 0 made the gap 0, which read as benign
    // and suppressed the warning for a slot whose real runner-up is at -300.
    const tied: DeadSlotRow[] = [
      { ...worn(8345, "Wolfshead Helm", "head"), owned: true },
      cand(50001, "head clone", "head", 0),
      ...Array.from({ length: 10 }, (_, i) =>
        cand(50100 + i, `head filler ${i}`, "head", -300 - i)
      ),
    ];
    const head = classifyDeadSlots(tied, { wornSetCounts: new Map() }).find(
      (d) => d.slot === "head"
    );
    expect(head?.tiedCandidates).toBe(1);
    expect(head?.runnerUpGapDps).toBeCloseTo(-300, 2);
    expect(head?.cause).toBe("unique-effect");
  });

  it("reports an unresolvable worn item as unknown-item, not a unique effect", () => {
    // Item id absent from data/items/index.json: a set-break toll is
    // undetectable by construction, so no confident cause may be claimed.
    const rows: DeadSlotRow[] = [
      { ...worn(999_999_999, "Mystery Helm", "head"), owned: true },
      ...Array.from({ length: 10 }, (_, i) =>
        cand(50200 + i, `head filler ${i}`, "head", -300 - i)
      ),
    ];
    const head = classifyDeadSlots(rows, { wornSetCounts: new Map() }).find(
      (d) => d.slot === "head"
    );
    expect(head?.cause).toBe("unknown-item");
    expect(head?.wornSetId).toBeNull();
  });

  it("classifies both worn rings rather than dropping the finger slot", () => {
    // Ticket 150. `owned` is per item id but the grouping key is the pool slot,
    // so a player wearing two pooled rings produces two `owned, deltaDps: 0`
    // rows in one `finger` group. The old `wornRowOf` called that ambiguous and
    // returned null, and the caller dropped the whole slot: no entry, no
    // warning, a report that looks complete. Both rows are correctly identified
    // worn items, so both get classified.
    const rows: DeadSlotRow[] = [
      worn(11934, "Emperor's Seal", "finger"),
      worn(11979, "Peridot Circle", "finger"),
      cand(11980, "Opal Ring", "finger", -300),
    ];
    const fingers = classifyDeadSlots(rows, { wornSetCounts: new Map() });
    expect(
      fingers.map((d) => d.wornItemId).sort((a, b) => (a ?? 0) - (b ?? 0))
    ).toEqual([11934, 11979]);
    for (const f of fingers) expect(f.slot).toBe("finger");
  });

  it("carries the tie count when every candidate ties the worn item", () => {
    // Ticket 151 / review row 6-A4. All candidates tie, so there is no
    // strictly-worse runner-up, the gap is 0, and the slot reads benign — no
    // warning. That suppression is deliberate (nothing is measurably worse),
    // but it must not be invisible: `tiedCandidates` is what records it, and
    // `deadSlotWarnings` surfaces the count wherever a warning does fire.
    const rows: DeadSlotRow[] = [
      { ...worn(29390, "worn wrist", "wrist"), owned: true },
      ...Array.from({ length: 6 }, (_, i) =>
        cand(62000 + i, `wrist tie ${i}`, "wrist", 0)
      ),
    ];
    const wrist = classifyDeadSlots(rows, { wornSetCounts: new Map() })[0];
    expect(wrist?.cause).toBe("benign-nothing-better");
    expect(wrist?.runnerUpGapDps).toBe(0);
    expect(wrist?.tiedCandidates).toBe(6);
  });

  it("still reports when an owned row exists but none measures zero", () => {
    // Adversarial round over b16e0b1. `wornRowsOf` keeps only owned rows at
    // exactly 0, so an owned row at -3.2 (noise, rounding, or a worn item the
    // baseline was not built from) left `wornRows` empty while ownership was
    // plainly recorded -- and the slot was dropped with no entry at all. That
    // is the same silent drop ticket 150 removed, one branch further down.
    const rows: DeadSlotRow[] = [
      {
        itemId: 11934,
        name: "Emperor's Seal",
        slot: "finger",
        deltaDps: -3.2,
        owned: true,
      },
      cand(11980, "Opal Ring", "finger", -300),
    ];
    const found = classifyDeadSlots(rows, { wornSetCounts: new Map() });
    expect(found).toHaveLength(1);
    expect(found[0]?.cause).toBe("unidentified-worn-item");
  });

  it("still reports a slot whose every row is a worn item", () => {
    // Two pooled rings and nothing else in `finger`: every row is worn, so the
    // candidate list is empty for both and the slot produced no entry. A pool
    // with zero alternatives is precisely what a reader needs told.
    const rows: DeadSlotRow[] = [
      worn(11934, "Emperor's Seal", "finger"),
      worn(11979, "Peridot Circle", "finger"),
    ];
    const found = classifyDeadSlots(rows, { wornSetCounts: new Map() });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((d) => d.slot === "finger")).toBe(true);
  });

  it("refuses out loud when no row identifies the worn item", () => {
    // Ticket 151. Reached by re-rendering a report saved before `rank.ts` set
    // `owned`. The old code fell back to guessing from zero deltas, and where
    // that guess found nothing it dropped the slot silently. Neither is
    // acceptable: it classifies nothing, and it says so.
    const rows: DeadSlotRow[] = [
      cand(33675, "a", "chest", -10),
      cand(31042, "b", "chest", -20),
    ];
    const found = classifyDeadSlots(rows, { wornSetCounts: new Map() });
    expect(found).toHaveLength(1);
    expect(found[0]?.cause).toBe("unidentified-worn-item");
    expect(found[0]?.slot).toBe("chest");
  });

  it("puts THIN_POOL_CANDIDATES at the boundary between thin and deep", () => {
    const pool = (n: number): DeadSlotRow[] => [
      { ...worn(29390, "worn wrist", "wrist"), owned: true },
      ...Array.from({ length: n }, (_, i) =>
        cand(60000 + i, `wrist ${i}`, "wrist", -100 - i)
      ),
    ];
    const causeOf = (n: number) =>
      classifyDeadSlots(pool(n), { wornSetCounts: new Map() })[0]?.cause;
    expect(causeOf(THIN_POOL_CANDIDATES - 1)).toBe("thin-pool");
    expect(causeOf(THIN_POOL_CANDIDATES)).toBe("unique-effect");
  });

  it("treats UNIQUE_EFFECT_GAP_DPS as inclusive of the gap itself", () => {
    const pool = (gap: number): DeadSlotRow[] => [
      { ...worn(29390, "worn wrist", "wrist"), owned: true },
      cand(61000, "nearest", "wrist", gap),
      ...Array.from({ length: 10 }, (_, i) =>
        cand(61100 + i, `wrist ${i}`, "wrist", -500 - i)
      ),
    ];
    const causeOf = (gap: number) =>
      classifyDeadSlots(pool(gap), { wornSetCounts: new Map() })[0]?.cause;
    expect(causeOf(UNIQUE_EFFECT_GAP_DPS)).toBe("unique-effect");
    expect(causeOf(UNIQUE_EFFECT_GAP_DPS + 0.01)).toBe("benign-nothing-better");
  });

  it("does not call a set-break toll on a worn set below its threshold", () => {
    // One Malorne piece worn: swapping it away breaks no active threshold, so
    // the dead zone needs a different explanation than a toll.
    const found = classifyDeadSlots(CHEST, {
      wornSetCounts: new Map([[640, 1]]),
    });
    expect(found.find((d) => d.slot === "chest")?.cause).not.toBe(
      "set-break-toll"
    );
  });
});
