import { describe, expect, it } from "vitest";
import type { RankedItem, Ranking } from "../src/rank.js";
import {
  formatItemSource,
  groupBySlot,
  partitionShortlist,
  renderRankHtml,
  type RankReportMeta,
} from "../src/rank-report.js";

type TestItem = RankedItem & {
  magnitudeWarning?: boolean;
  replacesEquipped?: {
    slot: string;
    itemId: number;
    name: string;
  };
  alternateSlot?: {
    choice: string;
    deltaDps: number;
    deltaPct: number;
    replacesName: string;
  };
};

function item(
  partial: Pick<TestItem, "name" | "slot" | "deltaDps"> & Partial<TestItem>
): TestItem {
  return {
    rank: null,
    itemId: 1,
    source: { kind: "world" },
    deltaPct: 0,
    se: 0,
    seMethod: "independent",
    bisTags: [],
    belowCutoff: true,
    ...partial,
  };
}

describe("rank-report", () => {
  it("groups and sorts by delta within each slot", () => {
    const bySlot = groupBySlot([
      item({ name: "low", slot: "finger", deltaDps: 1 }),
      item({ name: "bow", slot: "ranged", deltaDps: 20 }),
      item({ name: "high", slot: "finger", deltaDps: 7 }),
    ]);
    expect(bySlot.get("finger")?.map((i) => i.name)).toEqual(["high", "low"]);
    expect(bySlot.get("ranged")?.map((i) => i.name)).toEqual(["bow"]);
    expect(bySlot.get("head")).toEqual([]);
  });

  it("formats sources for humans", () => {
    expect(
      formatItemSource({ kind: "raid", zone: "SSC", boss: "Lady Vashj" })
    ).toBe("SSC · Lady Vashj");
    expect(formatItemSource({ kind: "badge", cost: 50 })).toBe("50 badges");
  });

  it("partitionShortlist splits raid from pvp above cutoff", () => {
    const { raid, pvp } = partitionShortlist([
      item({
        name: "BT Helm",
        slot: "head",
        deltaDps: 10,
        belowCutoff: false,
        source: { kind: "raid", zone: "BT", boss: "Illidan" },
      }),
      item({
        name: "Vengeful Gladiator's Bonegrinder",
        slot: "weapon",
        deltaDps: 7.6,
        belowCutoff: false,
        source: { kind: "pvp", via: "arena", season: 3 },
      }),
      item({
        name: "below cutoff pvp",
        slot: "weapon",
        deltaDps: 1,
        belowCutoff: true,
        source: { kind: "pvp", via: "arena", season: 3 },
      }),
    ]);
    expect(raid.map((i) => i.name)).toEqual(["BT Helm"]);
    expect(pvp.map((i) => i.name)).toEqual([
      "Vengeful Gladiator's Bonegrinder",
    ]);
  });

  it("raid shortlist excludes pvp sources", () => {
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), meta());
    expect(html).toContain("Act on tonight");
    const raidShortlist =
      html.match(
        /<div class="shortlist">\s*<h2>Act on tonight<\/h2>[\s\S]*?<\/div>\s*<\/div>/
      )?.[0] ?? "";
    expect(raidShortlist).not.toContain("Vengeful Gladiator's Bonegrinder");
    expect(html).toContain("PvP upgrades");
    const pvpShortlist =
      html.match(
        /<div class="shortlist pvp-shortlist">[\s\S]*?<\/div>\s*<\/div>/
      )?.[0] ?? "";
    expect(pvpShortlist).toContain("Vengeful Gladiator's Bonegrinder");
  });

  it("includes stdev noise disclaimer when baseline stdev is positive", () => {
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), meta());
    expect(html).toContain(
      "Order within ~±119.0 DPS is run noise, not a ranked wishlist."
    );
  });

  it("omits stdev noise disclaimer when baseline stdev is zero", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        baseline: { dps: 2000, stdev: 0, metaAdjusted: false },
      },
      meta()
    );
    expect(html).not.toContain("run noise");
  });

  it("shows magnitude warning pill on flagged weapons", () => {
    const html = renderRankHtml(
      {
        contentHash: "test",
        cutoff: { absDps: 5, pct: 0.5 },
        baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
        assumptions: { standing: [] },
        substitutions: [],
        items: [
          item({
            rank: null,
            itemId: 28773,
            name: "Gorehowl",
            slot: "weapon",
            deltaDps: -103.9,
            belowCutoff: true,
            magnitudeWarning: true,
            source: {
              kind: "raid",
              zone: "Karazhan",
              boss: "Prince Malchezaar",
            },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain('<span class="pill warn">sim magnitude</span>');
    expect(html).toContain("Gorehowl");
  });

  it("excludes magnitude-flagged weapons from Act on tonight", () => {
    const html = renderRankHtml(
      {
        contentHash: "test",
        cutoff: { absDps: 5, pct: 0.5 },
        baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
        assumptions: { standing: [] },
        substitutions: [],
        items: [
          item({
            rank: 1,
            itemId: 32332,
            name: "Torch of the Damned",
            slot: "weapon",
            deltaDps: 82,
            belowCutoff: false,
            source: {
              kind: "raid",
              zone: "Black Temple",
              boss: "Reliquary of Souls",
            },
          }),
          item({
            rank: null,
            itemId: 28773,
            name: "Gorehowl",
            slot: "weapon",
            deltaDps: -103.9,
            belowCutoff: true,
            magnitudeWarning: true,
            source: {
              kind: "raid",
              zone: "Karazhan",
              boss: "Prince Malchezaar",
            },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain("Act on tonight");
    expect(html).toContain("Torch of the Damned");
    const raidShortlist =
      html.match(
        /<div class="shortlist">\s*<h2>Act on tonight<\/h2>[\s\S]*?<\/div>\s*<\/div>/
      )?.[0] ?? "";
    expect(raidShortlist).not.toContain("Gorehowl");
  });

  it("shows which ring is replaced instead of bare slot choice", () => {
    const html = renderRankHtml(
      {
        contentHash: "test",
        cutoff: { absDps: 3.4, pct: 0.15 },
        baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
        assumptions: { standing: [] },
        substitutions: [],
        items: [
          item({
            rank: 4,
            itemId: 32526,
            name: "Band of Devastation",
            slot: "finger",
            deltaDps: 20.68,
            belowCutoff: false,
            slotChoice: "finger1",
            replacesEquipped: {
              slot: "finger1",
              itemId: 28757,
              name: "Ring of a Thousand Marks",
            },
            alternateSlot: {
              choice: "finger2",
              deltaDps: 8,
              deltaPct: 0.39,
              replacesName: "Shapeshifter's Signet",
            },
            source: {
              kind: "raid",
              zone: "Black Temple",
              boss: "Illidan Stormrage",
            },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain("Replaces Ring of a Thousand Marks");
    expect(html).not.toContain('<span class="choice">a</span>');
    expect(html).toContain("Also +8.00 if replacing Shapeshifter's Signet");
  });

  // When the paired slot is empty there is no worn item to name, so
  // slotChoice is what the reader gets. It used to be a bare "a".
  it("names the sim slot when nothing is being replaced", () => {
    const html = renderRankHtml(
      {
        contentHash: "test",
        cutoff: { absDps: 5, pct: 0.5 },
        baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
        assumptions: { standing: [] },
        substitutions: [],
        items: [
          item({
            rank: 1,
            itemId: 32526,
            name: "Band of Devastation",
            slot: "finger",
            deltaDps: 20.68,
            belowCutoff: false,
            slotChoice: "finger2",
            source: { kind: "raid", zone: "Black Temple", boss: "Illidan" },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain("Into finger2");
    expect(html).not.toMatch(/<span class="choice">[ab]<\/span>/);
  });

  it("describes universe pool scope in the lede", () => {
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), meta());
    expect(html).toContain("Universe pool (ret-p3).");
    expect(html).not.toContain("EP prefilter");
  });
});

function meta(): RankReportMeta {
  return {
    character: "slamaltman",
    realm: "dreamscythe",
    region: "US",
    spec: "ret",
    maxPhase: 3,
    poolSize: 100,
    generatedAt: "2026-07-27T00:00:00.000Z",
  };
}

function rankingWithPvpWeaponAboveCutoff(): Ranking {
  return {
    contentHash: "test",
    cutoff: { absDps: 5, pct: 0.5 },
    baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
    assumptions: { standing: [] },
    substitutions: [],
    items: [
      item({
        rank: 1,
        name: "Helm of the Illidari Shatterer",
        slot: "head",
        deltaDps: 15,
        belowCutoff: false,
        source: { kind: "raid", zone: "Black Temple", boss: "Illidan" },
      }),
      item({
        rank: 12,
        name: "Vengeful Gladiator's Bonegrinder",
        slot: "weapon",
        deltaDps: 7.6,
        belowCutoff: false,
        source: { kind: "pvp", via: "arena", season: 3 },
      }),
    ],
  };
}
