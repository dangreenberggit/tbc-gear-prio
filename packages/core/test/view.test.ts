import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
import type { ItemSource } from "../src/pool.js";
import type { RankedItem, Ranking } from "../src/rank.js";
import { applyView } from "../src/view.js";

function item(over: Partial<RankedItem> & Pick<RankedItem, "itemId">) {
  const base: RankedItem = {
    rank: null,
    itemId: over.itemId,
    name: `item-${over.itemId}`,
    slot: "neck",
    source: { kind: "raid", zone: "Karazhan", boss: "Nightbane" },
    deltaDps: 0,
    deltaPct: 0,
    // Small enough that unrelated rows do not accidentally form tie groups.
    se: 0.001,
    seMethod: "independent",
    bisTags: [],
    belowCutoff: false,
  };
  return { ...base, ...over };
}

function ranking(items: RankedItem[]): Ranking {
  // A real `Ranking`, not a cast — `applyView` reads `cutoff` and `items`, and
  // a cast fixture would stop catching shape changes in either.
  return {
    contentHash: "sha256:test",
    cutoff: CUTOFF,
    baseline: { dps: 2000, stdev: 90, metaAdjusted: false },
    assumptions: {
      maxPhase: 2,
      seeds: [42],
      iterations: 3000,
      race: "RaceBloodElf",
      presetId: "ret/p2.raid-sim-skeleton",
      standing: [],
    },
    substitutions: [],
    caps: {
      hit: { rating: 100, capRating: 142, gap: 42, capUncertainty: 0 },
      expertise: { rating: 0, capRating: null, gap: null },
    },
    items,
  };
}

describe("applyView", () => {
  it("returns every row untouched under the default view", () => {
    const r = ranking([
      item({ itemId: 1, deltaDps: 20, deltaPct: 1, rank: 1 }),
      item({ itemId: 2, deltaDps: 10, deltaPct: 0.5, rank: 2 }),
    ]);
    const { rows } = applyView(r);
    expect(rows.map((x) => x.itemId)).toEqual([1, 2]);
  });

  describe("rank stays absolute (§12)", () => {
    it("does not renumber inside a filtered view", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          deltaPct: 1.5,
          rank: 1,
          source: { kind: "raid", zone: "Tempest Keep" },
        }),
        item({
          itemId: 2,
          deltaDps: 20,
          deltaPct: 1,
          rank: 2,
          source: { kind: "raid", zone: "Tempest Keep" },
        }),
        item({
          itemId: 3,
          deltaDps: 10,
          deltaPct: 0.5,
          rank: 3,
          source: { kind: "raid", zone: "Karazhan" },
        }),
      ]);
      const { rows } = applyView(r, { raid: "Karazhan" });
      expect(rows).toHaveLength(1);
      // Rank 3, not renumbered to 1 — the whole point of §12.
      expect(rows[0]!.rank).toBe(3);
    });
  });

  describe("filter composes before the cutoff (§12)", () => {
    it("keeps a small gain visible when it is the best in the filtered raid", () => {
      // 2 DPS is below the 3.4 absolute cutoff globally, and it is still below
      // it inside the filter — what must not happen is the row disappearing.
      const small = item({
        itemId: 2,
        deltaDps: 2,
        deltaPct: 0.1,
        rank: null,
        belowCutoff: true,
        source: { kind: "raid", zone: "Gruul's Lair" },
      });
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        small,
      ]);
      const { rows } = applyView(r, { raid: "Gruul's Lair" });
      expect(rows.map((x) => x.itemId)).toEqual([2]);
      // Hidden behind an expand, never deleted (§10).
      expect(rows[0]!.belowCutoffInView).toBe(true);
    });

    it("recomputes the cutoff flag from the row's own delta", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        item({ itemId: 2, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
      ]);
      const { rows } = applyView(r);
      expect(rows.map((x) => x.belowCutoffInView)).toEqual([false, true]);
    });
  });

  describe("pinBis", () => {
    it("pins BiS members above everything else", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2 }),
        item({ itemId: 2, deltaDps: 5, deltaPct: 0.3, bisTags: ["BiS"] }),
      ]);
      expect(applyView(r, { pinBis: true }).rows.map((x) => x.itemId)).toEqual([
        2, 1,
      ]);
      expect(applyView(r).rows.map((x) => x.itemId)).toEqual([1, 2]);
    });

    it("orders the pinned group by deltaDps, never by slot order", () => {
      // Fed in ascending-delta order so a stable pass-through would fail.
      const r = ranking([
        item({ itemId: 1, deltaDps: 5, deltaPct: 0.3, bisTags: ["BiS"] }),
        item({ itemId: 2, deltaDps: 25, deltaPct: 1.2, bisTags: ["BiS"] }),
        item({ itemId: 3, deltaDps: 15, deltaPct: 0.8, bisTags: ["BiS"] }),
      ]);
      expect(applyView(r, { pinBis: true }).rows.map((x) => x.itemId)).toEqual([
        2, 3, 1,
      ]);
    });

    it("keeps a pinned negative delta visible and signed (§4.1)", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 12, deltaPct: 0.6 }),
        item({
          itemId: 2,
          deltaDps: -8,
          deltaPct: -0.4,
          bisTags: ["BiS"],
          setBonusNote: "breaks the T4 2-set",
        }),
      ]);
      const { rows } = applyView(r, { pinBis: true });
      expect(rows[0]!.itemId).toBe(2);
      expect(rows[0]!.deltaDps).toBe(-8);
      expect(rows[0]!.setBonusNote).toBe("breaks the T4 2-set");
    });

    it("does not pin Alt or Realistic members", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2 }),
        item({
          itemId: 2,
          deltaDps: 5,
          deltaPct: 0.3,
          bisTags: ["Alt", "Realistic"],
        }),
      ]);
      expect(applyView(r, { pinBis: true }).rows.map((x) => x.itemId)).toEqual([
        1, 2,
      ]);
    });

    it("reports the toggle as unavailable when no curated set exists", () => {
      const withBis = ranking([item({ itemId: 1, bisTags: ["BiS"] })]);
      const without = ranking([item({ itemId: 1, bisTags: ["Alt"] })]);
      expect(applyView(withBis).pinBisAvailable).toBe(true);
      // Degrades to disabled, not silently inert (§4.1).
      expect(applyView(without).pinBisAvailable).toBe(false);
    });
  });

  describe("raid and boss filters", () => {
    const token: ItemSource = {
      kind: "token",
      zone: "Karazhan",
      boss: "The Curator",
      token: "Gloves of the Fallen Champion",
    };

    it("reaches a tier piece through kind: 'token' (§8.3.2)", () => {
      // The quiet failure from §15's risk table: a Karazhan filter that omits
      // every T4 piece. 29072 Justicar Gauntlets is token-sourced only.
      const r = ranking([
        item({ itemId: 29072, deltaDps: 30, deltaPct: 1.5, source: token }),
        item({
          itemId: 2,
          deltaDps: 20,
          deltaPct: 1,
          source: { kind: "raid", zone: "Tempest Keep" },
        }),
      ]);
      expect(
        applyView(r, { raid: "Karazhan" }).rows.map((x) => x.itemId)
      ).toEqual([29072]);
    });

    it("matches a zone carried on a secondary source", () => {
      const r = ranking([
        item({
          itemId: 30129,
          deltaDps: 30,
          deltaPct: 1.5,
          source: { kind: "raid", zone: "Tempest Keep" },
          sources: [
            { kind: "raid", zone: "Tempest Keep" },
            { ...token, zone: "Serpentshrine Cavern" },
          ],
        }),
      ]);
      expect(
        applyView(r, { raid: "Serpentshrine Cavern" }).rows.map((x) => x.itemId)
      ).toEqual([30129]);
    });

    it("scopes the boss filter to the selected raid", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          deltaPct: 1.5,
          source: { kind: "raid", zone: "Karazhan", boss: "Nightbane" },
        }),
        item({
          itemId: 2,
          deltaDps: 20,
          deltaPct: 1,
          source: { kind: "raid", zone: "Tempest Keep", boss: "Nightbane" },
        }),
      ]);
      const { rows } = applyView(r, { raid: "Karazhan", boss: "Nightbane" });
      expect(rows.map((x) => x.itemId)).toEqual([1]);
    });

    it("treats 'all' as no filter", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        item({
          itemId: 2,
          deltaDps: 20,
          deltaPct: 1,
          source: { kind: "badge", cost: 60 },
        }),
      ]);
      expect(
        applyView(r, { raid: "all", boss: "all" }).rows.map((x) => x.itemId)
      ).toEqual([1, 2]);
    });

    it("drops sourceless-zone rows when a raid filter is on", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          deltaPct: 1.5,
          source: { kind: "badge", cost: 60 },
        }),
      ]);
      expect(applyView(r, { raid: "Karazhan" }).rows).toHaveLength(0);
    });
  });

  describe("hideOwned", () => {
    it("removes equipped rows only when asked", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5, owned: true }),
        item({ itemId: 2, deltaDps: 20, deltaPct: 1 }),
      ]);
      expect(applyView(r).rows.map((x) => x.itemId)).toEqual([1, 2]);
      expect(
        applyView(r, { hideOwned: true }).rows.map((x) => x.itemId)
      ).toEqual([2]);
    });
  });

  describe("groupBy", () => {
    it("buckets by slot, each bucket still delta-ordered", () => {
      const r = ranking([
        item({ itemId: 1, slot: "neck", deltaDps: 30, deltaPct: 1.5 }),
        item({ itemId: 2, slot: "hands", deltaDps: 25, deltaPct: 1.2 }),
        item({ itemId: 3, slot: "neck", deltaDps: 20, deltaPct: 1 }),
      ]);
      const groups = applyView(r, { groupBy: "slot" }).groups!;
      expect(groups.map((g) => g.key)).toEqual(["neck", "hands"]);
      expect(groups[0]!.rows.map((x) => x.itemId)).toEqual([1, 3]);
    });

    it("buckets by raid zone", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          deltaPct: 1.5,
          source: { kind: "raid", zone: "Karazhan" },
        }),
        item({
          itemId: 2,
          deltaDps: 20,
          deltaPct: 1,
          source: { kind: "raid", zone: "Tempest Keep" },
        }),
      ]);
      const groups = applyView(r, { groupBy: "raid" }).groups!;
      expect(groups.map((g) => g.key)).toEqual(["Karazhan", "Tempest Keep"]);
    });

    it("emits no groups for the default rank view", () => {
      const r = ranking([item({ itemId: 1 })]);
      expect(applyView(r, { groupBy: "rank" }).groups).toBeUndefined();
    });
  });

  describe("tie groups (§10)", () => {
    it("does not chain a long ladder into one undifferentiated group", () => {
      // Regression. Found by running the real ret P2 Karazhan ranking, where
      // reported SE is ~2.18 DPS and adjacent deltas differ by far less: a
      // walk that extends the group against its running bounds instead of its
      // leader marked items 20+ DPS apart as tied, collapsing all 100 rows
      // into one group. Each step here overlaps its neighbour by 1 DPS while
      // the ends are 30 DPS apart, so a transitive walk yields one group.
      const r = ranking(
        Array.from({ length: 16 }, (_, i) =>
          item({
            itemId: i + 1,
            deltaDps: 30 - i * 2,
            deltaPct: (30 - i * 2) / 20,
            se: 1.5,
          })
        )
      );
      const { rows } = applyView(r);
      const groups = new Set(
        rows.map((x) => x.tieGroupId).filter((g) => g !== undefined)
      );
      expect(groups.size).toBeGreaterThan(1);
      // The extremes must never share a group: 30 vs 0 DPS is not a tie.
      expect(rows[0]!.tieGroupId).not.toBe(rows[rows.length - 1]!.tieGroupId);
    });

    it("does not tie a pinned negative row with the upgrades behind it", () => {
      // Regression, pre-merge review (adversarial A1 / spec S4, converged).
      // Tie grouping ran over the *pin-sorted* list, so a pinned BiS row at
      // -8 DPS became the group leader and every positive row behind it
      // "overlapped" it — displaying a downgrade as tied with a +40 upgrade.
      // A tie is a claim about two numbers and cannot depend on sort order.
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: -8,
          deltaPct: -0.4,
          se: 1,
          bisTags: ["BiS"],
        }),
        item({ itemId: 2, deltaDps: 40, deltaPct: 2, se: 1 }),
        item({ itemId: 3, deltaDps: 39, deltaPct: 1.95, se: 1 }),
      ]);
      const { rows } = applyView(r, { pinBis: true });
      expect(rows[0]!.itemId).toBe(1);
      expect(rows[0]!.tieGroupId).toBeUndefined();
      // +40 and +39 genuinely do overlap, and must still read as a tie.
      expect(rows[1]!.tieGroupId).toBeDefined();
      expect(rows[1]!.tieGroupId).toBe(rows[2]!.tieGroupId);
    });

    it("assigns identical groups whether or not the view is pinned", () => {
      const items = [
        item({
          itemId: 1,
          deltaDps: -8,
          deltaPct: -0.4,
          se: 1,
          bisTags: ["BiS"],
        }),
        item({ itemId: 2, deltaDps: 40, deltaPct: 2, se: 1 }),
        item({ itemId: 3, deltaDps: 39, deltaPct: 1.95, se: 1 }),
      ];
      const groupsBy = (pinBis: boolean) =>
        new Map(
          applyView(ranking(items), { pinBis }).rows.map((x) => [
            x.itemId,
            x.tieGroupId,
          ])
        );
      expect(groupsBy(true)).toEqual(groupsBy(false));
    });

    it("does not let one wide-SE row bridge rows that do not overlap", () => {
      // Regression, pre-merge review (adversarial A2). Testing only
      // `row.high >= leader.low` made the group as wide as its widest member:
      // 100 and 50 tied through a row with se 60, while 50 and 49 did not.
      const r = ranking([
        item({ itemId: 10, deltaDps: 100, deltaPct: 5, se: 0.01 }),
        item({ itemId: 11, deltaDps: 50, deltaPct: 2.5, se: 60 }),
        item({ itemId: 12, deltaDps: 49, deltaPct: 2.45, se: 0.01 }),
      ]);
      const { rows } = applyView(r);
      // 100 vs 50 is a 50 DPS gap; no pair here may share a group.
      expect(rows.map((x) => x.tieGroupId)).toEqual([
        undefined,
        undefined,
        undefined,
      ]);
    });

    it("groups rows whose SE intervals overlap", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 20, deltaPct: 1, se: 2 }),
        item({ itemId: 2, deltaDps: 19, deltaPct: 0.95, se: 2 }),
        item({ itemId: 3, deltaDps: 5, deltaPct: 0.25, se: 0.1 }),
      ]);
      const { rows } = applyView(r);
      expect(rows[0]!.tieGroupId).toBeDefined();
      expect(rows[0]!.tieGroupId).toBe(rows[1]!.tieGroupId);
      expect(rows[2]!.tieGroupId).toBeUndefined();
    });

    it("breaks an exact tie by BiS-tag richness, then item id", () => {
      const r = ranking([
        item({ itemId: 500, deltaDps: 10, deltaPct: 0.5, bisTags: [] }),
        item({ itemId: 900, deltaDps: 10, deltaPct: 0.5, bisTags: ["BiS"] }),
        item({ itemId: 100, deltaDps: 10, deltaPct: 0.5, bisTags: [] }),
      ]);
      // Richer tags first, then ascending id — and all three still read as one
      // tie group rather than as a real ordering.
      const { rows } = applyView(r);
      expect(rows.map((x) => x.itemId)).toEqual([900, 100, 500]);
      expect(new Set(rows.map((x) => x.tieGroupId)).size).toBe(1);
    });
  });

  it("never mutates the ranking it was given", () => {
    const items = [
      item({ itemId: 1, deltaDps: 5, deltaPct: 0.3, bisTags: ["BiS"] }),
      item({ itemId: 2, deltaDps: 40, deltaPct: 2 }),
    ];
    const r = ranking(items);
    const before = structuredClone(r.items);
    applyView(r, { pinBis: true, hideOwned: true, raid: "Karazhan" });
    // Deep, not just top-level key absence: `{ ...item }` is a shallow copy,
    // so `bisTags` and `sources` are shared with the caller's Ranking and a
    // future push into either would not be caught by a key check.
    expect(r.items).toEqual(before);
    expect(r.items[0]).not.toHaveProperty("tieGroupId");
    expect(r.items[0]).not.toHaveProperty("belowCutoffInView");
  });
});
