import { describe, expect, it } from "vitest";
import type { RankedItem, Ranking } from "@tbc-gear-prio/core";
import { applyView, type ViewResult } from "@tbc-gear-prio/core/view";
import {
  finalOrder,
  mergeRows,
  progressLabel,
  showPinControl,
  skeletonCount,
  type JobProgress,
} from "../src/run-state.js";

function row(over: Partial<RankedItem> & Pick<RankedItem, "itemId">) {
  const base: RankedItem = {
    rank: null,
    itemId: over.itemId,
    name: `item-${over.itemId}`,
    slot: "neck",
    source: { kind: "raid", zone: "Karazhan", boss: "Nightbane" },
    deltaDps: 0,
    deltaPct: 0,
    se: 0.001,
    seMethod: "independent",
    bisTags: [],
  };
  return { ...base, ...over };
}

describe("progressLabel", () => {
  it("names each pre-sim stage in the plan's vocabulary", () => {
    expect(progressLabel({ stage: "resolving", done: 0, total: 0 })).toBe(
      "resolving"
    );
    expect(progressLabel({ stage: "reading-gear", done: 0, total: 0 })).toBe(
      "reading gear"
    );
    expect(progressLabel({ stage: "building-pool", done: 0, total: 0 })).toBe(
      "building pool"
    );
  });

  it("counts sims done over total while simming", () => {
    expect(progressLabel({ stage: "simming", done: 12, total: 40 })).toBe(
      "simming 12/40"
    );
  });

  it("names the ranking stage", () => {
    expect(progressLabel({ stage: "ranking", done: 40, total: 40 })).toBe(
      "ranking"
    );
  });

  it("falls back to the raw stage rather than inventing a label", () => {
    expect(progressLabel({ stage: "composing", done: 0, total: 0 })).toBe(
      "composing"
    );
  });
});

describe("skeletonCount", () => {
  it("is undefined until a poll carries a candidate count", () => {
    // Deviation 4: `total` counts sims, not rows, so it must not size the list.
    expect(
      skeletonCount({ stage: "simming", done: 3, total: 40 })
    ).toBeUndefined();
    expect(skeletonCount({ stage: "resolving", done: 0, total: 0 })).toBe(
      undefined
    );
  });

  it("is the candidate count on any poll that carries one", () => {
    expect(
      skeletonCount({ stage: "simming", done: 3, total: 40, candidates: 19 })
    ).toBe(19);
  });

  it("keeps a candidate count of zero rather than reading it as absent", () => {
    expect(
      skeletonCount({ stage: "simming", done: 1, total: 1, candidates: 0 })
    ).toBe(0);
  });
});

describe("mergeRows", () => {
  it("keeps arrival order and never sorts by delta", () => {
    const merged = mergeRows(
      [row({ itemId: 1, deltaDps: 5 })],
      [
        row({ itemId: 1, deltaDps: 5 }),
        row({ itemId: 2, deltaDps: 90 }),
        row({ itemId: 3, deltaDps: 40 }),
      ]
    );
    expect(merged.map((r) => r.itemId)).toEqual([1, 2, 3]);
  });

  it("appends later arrivals after earlier ones", () => {
    const first = mergeRows([], [row({ itemId: 7 }), row({ itemId: 3 })]);
    const second = mergeRows(first, [
      row({ itemId: 7 }),
      row({ itemId: 3 }),
      row({ itemId: 5 }),
    ]);
    expect(second.map((r) => r.itemId)).toEqual([7, 3, 5]);
  });

  it("does not reorder when the server replays rows in a different order", () => {
    const prev = mergeRows([], [row({ itemId: 7 }), row({ itemId: 3 })]);
    const merged = mergeRows(prev, [row({ itemId: 3 }), row({ itemId: 7 })]);
    expect(merged.map((r) => r.itemId)).toEqual([7, 3]);
  });

  it("updates a row in place when its payload changes", () => {
    const prev = mergeRows([], [row({ itemId: 7, deltaDps: 1 })]);
    const merged = mergeRows(prev, [
      row({ itemId: 7, deltaDps: 2 }),
      row({ itemId: 9 }),
    ]);
    expect(merged.map((r) => r.itemId)).toEqual([7, 9]);
    expect(merged[0]?.deltaDps).toBe(2);
  });

  it("distinguishes the two ring slots that share an item id", () => {
    const merged = mergeRows(
      [],
      [
        row({ itemId: 4, slot: "finger", slotChoice: "finger1" }),
        row({ itemId: 4, slot: "finger", slotChoice: "finger2" }),
      ]
    );
    expect(merged).toHaveLength(2);
  });

  it("returns the previous array untouched for an empty poll", () => {
    const prev = mergeRows([], [row({ itemId: 1 })]);
    expect(mergeRows(prev, [])).toEqual(prev);
  });
});

function ranking(items: RankedItem[]): Ranking {
  return {
    contentHash: "hash",
    cutoff: { absDps: 10, pct: 0.5 },
    fight: { reportCode: "AbC", fightId: 3, route: "ranked" },
    baseline: { dps: 1000, stdev: 5, metaAdjusted: false },
    assumptions: {
      maxPhase: 2,
      seeds: [1],
      iterations: 10000,
      race: "Human",
      presetId: "ret-p2",
      standing: [],
    },
    substitutions: [],
    caps: {
      hit: { rating: 100, capRating: 142, gap: 42, capUncertainty: 0 },
      expertise: { rating: 0, capRating: null, gap: null },
    },
    items,
    complete: true,
  };
}

describe("finalOrder", () => {
  it("is applyView's row order, sorted by delta rather than arrival", () => {
    const r = ranking([
      row({ itemId: 1, deltaDps: 5, rank: 3 }),
      row({ itemId: 2, deltaDps: 90, rank: 1 }),
      row({ itemId: 3, deltaDps: 40, rank: 2 }),
    ]);
    expect(finalOrder(r, {}).map((x) => x.itemId)).toEqual([2, 3, 1]);
  });

  it("filters by raid without renumbering the absolute rank", () => {
    const r = ranking([
      row({
        itemId: 1,
        deltaDps: 90,
        rank: 1,
        source: { kind: "raid", zone: "Karazhan", boss: "Nightbane" },
      }),
      row({
        itemId: 2,
        deltaDps: 40,
        rank: 2,
        source: { kind: "raid", zone: "Gruul's Lair", boss: "Gruul" },
      }),
    ]);
    const rows = finalOrder(r, { raid: "Gruul's Lair" });
    expect(rows.map((x) => x.itemId)).toEqual([2]);
    expect(rows[0]?.rank).toBe(2);
  });
});

describe("showPinControl", () => {
  it("is true when the ranking has a curated BiS to pin", () => {
    expect(showPinControl({ pinBisAvailable: true } as ViewResult)).toBe(true);
  });

  it("is false when nothing carries a BiS tag, so the control is absent", () => {
    expect(showPinControl({ pinBisAvailable: false } as ViewResult)).toBe(
      false
    );
  });

  it("agrees with applyView on a ranking with no BiS tag", () => {
    const r = ranking([row({ itemId: 1, bisTags: [] })]);
    expect(showPinControl(applyView(r))).toBe(false);
  });

  it("agrees with applyView on a ranking that has one", () => {
    const r = ranking([row({ itemId: 1, bisTags: ["BiS"] })]);
    expect(showPinControl(applyView(r))).toBe(true);
  });
});

const progressStages: JobProgress["stage"][] = [
  "resolving",
  "reading-gear",
  "composing",
  "building-pool",
  "simming",
  "ranking",
];

describe("JobProgress stages", () => {
  it("labels every stage the server can report", () => {
    for (const stage of progressStages) {
      expect(progressLabel({ stage, done: 1, total: 2 })).toBeTruthy();
    }
  });
});
