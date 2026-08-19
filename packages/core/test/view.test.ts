import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
import type { ItemSource } from "../src/pool.js";
import type { RankedItem, Ranking } from "../src/rank.js";
import { applyView, type ViewOptions } from "../src/view.js";
import { realPoolEntry } from "./real-source.js";

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
    fight: { reportCode: "test", fightId: 1, route: "ranked" },
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
    complete: true,
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

    it("carries the cutoff flag from the row's own delta", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        item({ itemId: 2, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
      ]);
      const { rows } = applyView(r);
      expect(rows.map((x) => x.belowCutoffInView)).toEqual([false, true]);
    });

    // ADR-0020: the cutoff is absolute, so no view moves the bar. This is the
    // property that lets `applyView` carry `belowCutoff` instead of re-deriving
    // it; it fails loudly the day a filter is allowed to change the threshold.
    it("agrees with the ranking's own belowCutoff under every filter", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        item({
          itemId: 2,
          deltaDps: 2,
          deltaPct: 0.1,
          belowCutoff: true,
          source: { kind: "raid", zone: "Gruul's Lair", boss: "Gruul" },
        }),
        item({ itemId: 3, deltaDps: -8, deltaPct: -0.4, belowCutoff: true }),
        item({ itemId: 4, deltaDps: 5, deltaPct: 0.25, rank: 2, owned: true }),
      ]);
      const views: ViewOptions[] = [
        {},
        { raid: "Karazhan" },
        { raid: "Gruul's Lair" },
        { raid: "Gruul's Lair", boss: "Gruul" },
        { hideOwned: true },
        { pinBis: true },
        { groupBy: "slot" },
      ];
      const byId = new Map(r.items.map((i) => [i.itemId, i.belowCutoff]));

      for (const v of views) {
        const { rows } = applyView(r, v);
        // A filter that emptied the list would pass vacuously.
        expect(rows.length).toBeGreaterThan(0);
        for (const row of rows) {
          expect(row.belowCutoffInView).toBe(byId.get(row.itemId));
        }
      }
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
      // 32590 Nethervoid Cloak is a T6-era trash drop that genuinely drops in
      // both Hyjal Summit and Black Temple. Its sources[0] is Hyjal Summit, so
      // matching Black Temple can only come from a secondary source.
      //
      // This used to use 30129 and its Serpentshrine Cavern row, which was not
      // a second true zone but the transcription bug in carry-forward 50.
      const nethervoidCloak = realPoolEntry(32590, "ret-p3");
      const r = ranking([
        item({
          itemId: 32590,
          deltaDps: 30,
          deltaPct: 1.5,
          source: nethervoidCloak.source,
          // poolEntryFromUniverse always sets `sources` from a universe row's
          // (non-empty) sources[] — non-null assertion, not a cast, since the
          // field genuinely is present here.
          sources: nethervoidCloak.sources!,
        }),
      ]);
      expect(
        applyView(r, { raid: "Black Temple" }).rows.map((x) => x.itemId)
      ).toEqual([32590]);
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

  describe("withSetPotential (spec §4)", () => {
    it("does not change sort order or rank when off (default)", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 10,
          rank: 2,
          setContext: {
            setId: 626,
            setName: "Justicar Battlegear",
            piecesWornBefore: 1,
            piecesAfterSwap: 2,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 50,
          },
        }),
        item({ itemId: 2, deltaDps: 20, rank: 1 }),
      ]);
      const off = applyView(r);
      expect(off.rows.map((x) => x.itemId)).toEqual([2, 1]);
      const explicitOff = applyView(r, { withSetPotential: false });
      expect(explicitOff.rows.map((x) => x.itemId)).toEqual([2, 1]);
    });

    it("sorts on deltaDps + prospectiveBonusDps when on, reordering the rows", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 10,
          rank: 2,
          setContext: {
            setId: 626,
            setName: "Justicar Battlegear",
            piecesWornBefore: 1,
            piecesAfterSwap: 2,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 50,
          },
        }),
        item({ itemId: 2, deltaDps: 20, rank: 1 }),
      ]);
      const { rows } = applyView(r, { withSetPotential: true });
      // itemId 1: 10 + 50 = 60, beats itemId 2's bare 20 — order flips.
      expect(rows.map((x) => x.itemId)).toEqual([1, 2]);
    });

    it("keeps a confounded bonus out of the sort key (ticket 90)", () => {
      // A bonus whose package breaks another worn set is inflated by (k-1)·B
      // and cannot be corrected after the fact, so it must not reorder rows.
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 10,
          rank: 2,
          setContext: {
            setId: 641,
            setName: "Nordrassil Harness",
            piecesWornBefore: 1,
            piecesAfterSwap: 2,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 50,
            prospectiveBonusBreaks: [
              {
                setId: 640,
                setName: "Malorne Harness",
                threshold: 2,
                piecesBefore: 2,
                piecesAfter: 0,
              },
            ],
          },
        }),
        item({ itemId: 2, deltaDps: 20, rank: 1 }),
      ]);
      const { rows } = applyView(r, { withSetPotential: true });
      // Without the confound gate this would flip to [1, 2] on 10 + 50 = 60.
      expect(rows.map((x) => x.itemId)).toEqual([2, 1]);
    });

    it("keeps a confounded bonus out of the cutoff comparison (ticket 90)", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        item({
          itemId: 2,
          deltaDps: -5,
          deltaPct: -0.25,
          belowCutoff: true,
          setContext: {
            setId: 641,
            setName: "Nordrassil Harness",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 90,
            prospectiveBonusBreaks: [
              {
                setId: 640,
                setName: "Malorne Harness",
                threshold: 2,
                piecesBefore: 2,
                piecesAfter: 0,
              },
            ],
          },
        }),
      ]);
      const on = applyView(r, { withSetPotential: true });
      // The unconfounded version of this row is promoted; this one must not be.
      expect(on.shortlist.map((x) => x.itemId)).toEqual([1]);
      expect(on.belowCutoffCount).toBe(1);
    });

    it("keeps rank absolute even though the toggle reorders rows (§12)", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 10,
          rank: 2,
          setContext: {
            setId: 626,
            setName: "Justicar Battlegear",
            piecesWornBefore: 1,
            piecesAfterSwap: 2,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 50,
          },
        }),
        item({ itemId: 2, deltaDps: 20, rank: 1 }),
      ]);
      const { rows } = applyView(r, { withSetPotential: true });
      // Reordered [1, 2] in display, but ranks stay their absolute default
      // values — non-monotonic in the new order, proving no renumbering.
      expect(rows.map((x) => x.itemId)).toEqual([1, 2]);
      expect(rows.map((x) => x.rank)).toEqual([2, 1]);
    });

    it("does not double-count a candidate that already crosses its threshold (§2.1)", () => {
      // crossesThreshold: true carries no prospectiveBonusDps — the value is
      // already inside deltaDps — so `?? 0` must not invent one.
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          rank: 1,
          setContext: {
            setId: 626,
            setName: "Justicar Battlegear",
            piecesWornBefore: 3,
            piecesAfterSwap: 4,
            nextThreshold: null,
            crossesThreshold: true,
          },
        }),
        item({ itemId: 2, deltaDps: 20, rank: 2 }),
      ]);
      const { rows } = applyView(r, { withSetPotential: true });
      expect(rows.map((x) => x.itemId)).toEqual([1, 2]);
    });

    /**
     * The finding this toggle existed to serve and originally defeated: a first
     * tier piece is normally below cutoff *on its own stats* (V0b's Thunderheart
     * singles are all negative), so carrying `belowCutoff` had the shortlist
     * filter out exactly the rows the toggle surfaces.
     */
    it("promotes a below-cutoff row whose prospective value clears the bar", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 40, deltaPct: 2, rank: 1 }),
        item({
          itemId: 2,
          deltaDps: -5,
          deltaPct: -0.25,
          belowCutoff: true,
          setContext: {
            setId: 676,
            setName: "Thunderheart Harness",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 90,
          },
        }),
      ]);

      const off = applyView(r);
      expect(off.shortlist.map((x) => x.itemId)).toEqual([1]);
      expect(off.belowCutoffCount).toBe(1);

      const on = applyView(r, { withSetPotential: true });
      expect(on.shortlist.map((x) => x.itemId)).toEqual([2, 1]);
      expect(on.belowCutoffCount).toBe(0);
    });

    it("leaves a row below cutoff when even its prospective value is noise", () => {
      const r = ranking([
        item({
          itemId: 3,
          deltaDps: -1,
          deltaPct: -0.05,
          belowCutoff: true,
          setContext: {
            setId: 629,
            setName: "Crystalforge Battlegear",
            piecesWornBefore: 1,
            piecesAfterSwap: 2,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 1.2,
          },
        }),
      ]);
      const on = applyView(r, { withSetPotential: true });
      expect(on.shortlist).toEqual([]);
      expect(on.rows[0]!.belowCutoffInView).toBe(true);
    });

    /**
     * The bar itself never moves — only the quantity measured against it
     * (ADR-0020's rejected alternative was a threshold derived from the row
     * *set*, which this is not).
     */
    it("uses the same absolute cutoff, not a relative one", () => {
      // Under both arms: 2.0 DPS < 3.4, and 2.0/2000 = 0.1% < 0.15%.
      const r = ranking([
        item({
          itemId: 4,
          deltaDps: 0,
          deltaPct: 0,
          belowCutoff: true,
          setContext: {
            setId: 626,
            setName: "Justicar Battlegear",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 2,
          },
        }),
      ]);
      // Sole row, so a set-relative bar would promote it; the absolute one does not.
      expect(applyView(r, { withSetPotential: true }).shortlist).toEqual([]);
    });

    it("leaves rows without set context on their ranking verdict", () => {
      const r = ranking([
        item({ itemId: 5, deltaDps: 2, deltaPct: 0.1, belowCutoff: true }),
        item({ itemId: 6, deltaDps: 40, deltaPct: 2, rank: 1 }),
      ]);
      const on = applyView(r, { withSetPotential: true });
      expect(on.shortlist.map((x) => x.itemId)).toEqual([6]);
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

  /**
   * §10's constraint on the below-cutoff expand is **hidden, never deleted**.
   * So this is a second projection of `rows` rather than a filter over them:
   * `rows` stays whole and stays the payload, and `shortlist` is what a
   * default view displays. A caller that renders `rows` is unaffected.
   */
  describe("shortlist (below-cutoff expand)", () => {
    const r = () =>
      ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        item({ itemId: 2, deltaDps: 20, deltaPct: 1 }),
        item({ itemId: 3, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
      ]);

    it("drops below-cutoff rows from the shortlist and keeps them in rows", () => {
      const view = applyView(r());
      expect(view.rows.map((x) => x.itemId)).toEqual([1, 2, 3]);
      expect(view.shortlist.map((x) => x.itemId)).toEqual([1, 2]);
    });

    it("counts what it hid, so a caller can offer the expand", () => {
      expect(applyView(r()).belowCutoffCount).toBe(1);
    });

    it("is measured on belowCutoffInView, not on the ranking's own flag", () => {
      // The two always agree (ADR-0020, and the "agrees with the ranking's own
      // belowCutoff" test above), but the shortlist is a property of the
      // *view*, so it reads the row's own display verdict rather than reaching
      // back into the `Ranking`.
      const view = applyView(r());
      const hidden = view.rows.filter((x) => x.belowCutoffInView);
      expect(hidden.map((x) => x.itemId)).toEqual([3]);
      expect(view.shortlist).toHaveLength(
        view.rows.length - view.belowCutoffCount
      );
    });

    it("is empty rather than undefined when every row is below cutoff", () => {
      const allBelow = ranking([
        item({ itemId: 9, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
      ]);
      const view = applyView(allBelow);
      expect(view.shortlist).toEqual([]);
      expect(view.rows).toHaveLength(1);
      expect(view.belowCutoffCount).toBe(1);
    });

    it("composes with a filter — the shortlist is of the filtered rows", () => {
      const mixed = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5, owned: true }),
        item({ itemId: 2, deltaDps: 20, deltaPct: 1 }),
        item({ itemId: 3, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
      ]);
      const view = applyView(mixed, { hideOwned: true });
      expect(view.rows.map((x) => x.itemId)).toEqual([2, 3]);
      expect(view.shortlist.map((x) => x.itemId)).toEqual([2]);
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

    it("labels a zone-less source with a readable bucket, not the raw kind string (ticket 45 §3)", () => {
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 30,
          deltaPct: 1.5,
          source: { kind: "unknown" },
        }),
      ]);
      const groups = applyView(r, { groupBy: "raid" }).groups!;
      expect(groups.map((g) => g.key)).toEqual(["Source not recorded"]);
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

    it("judges a mixed-seMethod pair on the coarser SE", () => {
      // Ticket 08. Paired replication rewrites the top 8 above-cutoff rows, so
      // the row-8/row-9 boundary compares a ~0.016 DPS SE against a ~2.15 one
      // (measured on the ret P2 ranking; ADR-0021 records the run). Under
      // `Math.min` the paired row's window decided the pair, claiming a
      // resolution the independent row never had. Deltas 0.44 apart, as on the
      // measured run: within the independent window, far outside the paired one.
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 7.977,
          deltaPct: 0.4,
          se: 0.00053,
          seMethod: "paired-replicate",
        }),
        item({ itemId: 2, deltaDps: 7.537, deltaPct: 0.38, se: 2.181 }),
      ]);
      const { rows } = applyView(r);
      expect(rows[0]!.tieGroupId).toBeDefined();
      expect(rows[0]!.tieGroupId).toBe(rows[1]!.tieGroupId);
    });

    it("keeps the narrower SE within a single seMethod", () => {
      // The mixed-method rule must not weaken the same-scale case: two
      // paired-replicate rows 0.44 apart are genuinely resolved, and widening
      // to `max` there would re-collapse exactly what Stage 2 bought.
      const r = ranking([
        item({
          itemId: 1,
          deltaDps: 7.977,
          deltaPct: 0.4,
          se: 0.00053,
          seMethod: "paired-replicate",
        }),
        item({
          itemId: 2,
          deltaDps: 7.537,
          deltaPct: 0.38,
          se: 0.0068,
          seMethod: "paired-replicate",
        }),
      ]);
      const { rows } = applyView(r);
      expect(rows[0]!.tieGroupId).toBeUndefined();
      expect(rows[1]!.tieGroupId).toBeUndefined();
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

  describe("screened rows (candidate-pool.md §6.1, 7.7 ext)", () => {
    function screenedItem(
      over: Partial<RankedItem> & Pick<RankedItem, "itemId">
    ) {
      return item({
        screened: { iterations: 1000, promoted: false },
        ...over,
      });
    }

    // Rewritten for ticket 224: screened rows are a disclosed set, not an
    // ordered tail. The intent of the original — a screened row is a third
    // state, neither shortlisted nor a ranked below-cutoff row — is kept; what
    // changed is which projection carries it.
    it("comes back in ruledOut, never in rows or the shortlist — a third state, not below-cutoff", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        item({ itemId: 2, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
        screenedItem({ itemId: 3, deltaDps: 50, deltaPct: 2.5 }),
      ]);
      const view = applyView(r);
      expect(view.rows.map((x) => x.itemId)).toEqual([1, 2]);
      expect(view.ruledOut.map((x) => x.itemId)).toEqual([3]);
      expect(view.shortlist.map((x) => x.itemId)).toEqual([1]);
      // The ruled-out set carries no position claim at all.
      expect(view.ruledOut[0]?.tieGroupId).toBeUndefined();
      expect(view.ruledOut[0]?.rank).toBeNull();
      // belowCutoffCount now counts full-iteration rows only.
      expect(view.belowCutoffCount).toBe(1);
      // Below-cutoff for the same reason a Stop-unsimmed row would be: there
      // is no measured verdict to give it, and belowCutoffInView existing
      // as `true` is what keeps it out of the shortlist without inventing
      // a distinct third boolean the rest of the view layer would need to
      // learn about.
      const screenedRow = view.ruledOut.find((x) => x.itemId === 3);
      expect(screenedRow?.belowCutoffInView).toBe(true);
    });

    // Rewritten for ticket 224: screened rows are a disclosed set, not an
    // ordered tail. The original asserted the screened rows formed a delta-
    // ordered tail of `rows` ([1, 2, 9, 8]); the surviving intent is that a
    // large screening delta never buys a position among the ranked rows.
    it("is a set ordered by slot and name, never interleaved with full-iteration deltas", () => {
      const r = ranking([
        // A screened row with a *larger* deltaDps than every full-iteration
        // row — if screened rows were ranked at all, this one would sort
        // first among them; under slot/name order its delta buys it nothing.
        screenedItem({
          itemId: 9,
          name: "zulian",
          deltaDps: 999,
          deltaPct: 50,
        }),
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        item({ itemId: 2, deltaDps: 20, deltaPct: 1 }),
        screenedItem({ itemId: 8, name: "amani", deltaDps: 5, deltaPct: 0.3 }),
      ]);
      const { rows, ruledOut } = applyView(r);
      expect(rows.map((x) => x.itemId)).toEqual([1, 2]);
      // Same slot, so name order decides: "amani" before "zulian", which is
      // the opposite of the screening-delta order the old tail carried.
      expect(ruledOut.map((x) => x.itemId)).toEqual([8, 9]);
    });

    // Rewritten for ticket 224: the row survives the filter into `ruledOut`
    // rather than into `rows`. The intent — filters select ruled-out rows the
    // same way they select ranked ones — is unchanged.
    it("survives every filter — hideOwned, raid, boss — the same as any other row", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5, owned: true }),
        screenedItem({
          itemId: 2,
          deltaDps: 10,
          deltaPct: 0.5,
          source: { kind: "raid", zone: "Tempest Keep", boss: "Void Reaver" },
        }),
      ]);
      const filtered = applyView(r, { raid: "Tempest Keep" });
      expect(filtered.rows).toEqual([]);
      expect(filtered.ruledOut.map((x) => x.itemId)).toEqual([2]);
      expect(filtered.shortlist).toEqual([]);
    });

    it("applies hideOwned to the ruled-out set as to the ranked rows", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        screenedItem({ itemId: 2, name: "kept", deltaDps: 10, deltaPct: 0.5 }),
        screenedItem({
          itemId: 3,
          name: "dropped",
          deltaDps: 9,
          deltaPct: 0.4,
          owned: true,
        }),
      ]);
      const view = applyView(r, { hideOwned: true });
      expect(view.ruledOut.map((x) => x.itemId)).toEqual([2]);
    });

    it("applies the boss filter to the ruled-out set", () => {
      const r = ranking([
        screenedItem({
          itemId: 2,
          deltaDps: 10,
          deltaPct: 0.5,
          source: { kind: "raid", zone: "Karazhan", boss: "Nightbane" },
        }),
        screenedItem({
          itemId: 3,
          deltaDps: 9,
          deltaPct: 0.4,
          source: { kind: "raid", zone: "Karazhan", boss: "Prince Malchezaar" },
        }),
      ]);
      const view = applyView(r, { raid: "Karazhan", boss: "Nightbane" });
      expect(view.ruledOut.map((x) => x.itemId)).toEqual([2]);
    });

    // Rewritten for ticket 224: the screened row is looked up in `ruledOut`
    // instead of `rows`. The intent — a screened row whose raw delta sits
    // between two tied full-iteration rows is not folded into their group —
    // is unchanged, and is now structural rather than incidental.
    it("does not affect the ranked (non-screened) rows' own tie groups", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30.0, deltaPct: 1.5, se: 0.001 }),
        item({ itemId: 2, deltaDps: 30.001, deltaPct: 1.5, se: 0.001 }),
        screenedItem({ itemId: 3, deltaDps: 30.0005, deltaPct: 1.5 }),
      ]);
      const { rows, ruledOut } = applyView(r);
      const tied = rows.filter((x) => x.itemId === 1 || x.itemId === 2);
      expect(tied.every((x) => x.tieGroupId === tied[0]?.tieGroupId)).toBe(
        true
      );
      const screenedRow = ruledOut.find((x) => x.itemId === 3);
      expect(screenedRow).toBeDefined();
      expect(screenedRow?.tieGroupId).toBeUndefined();
    });

    // The trinket pole from ticket 224: a dozen screened trinkets inside one
    // 7.25 DPS band. This is the case that made the old delta-ordered tail
    // read as a ranking, so the test that matters is that the *order does not
    // depend on the deltas at all*.
    it("returns the trinket pole as an unordered set with no positions", () => {
      const screenedTrinkets = Array.from({ length: 12 }, (_, i) =>
        screenedItem({
          itemId: 200 + i,
          name: `trinket-${String(i).padStart(2, "0")}`,
          slot: "trinket",
          deltaDps: 40 - i * 0.6,
          deltaPct: 2,
        })
      );
      const r = ranking([
        item({ itemId: 1, slot: "trinket", deltaDps: 60, deltaPct: 3 }),
        ...screenedTrinkets,
      ]);
      const view = applyView(r, { groupBy: "slot" });

      expect(view.ruledOut).toHaveLength(12);
      expect(view.rows.map((x) => x.itemId)).toEqual([1]);
      expect(view.shortlist.map((x) => x.itemId)).toEqual([1]);
      for (const row of view.ruledOut) {
        expect(row.tieGroupId).toBeUndefined();
        expect(row.rank).toBeNull();
      }
      const grouped = view.groups?.flatMap((g) => g.rows.map((x) => x.itemId));
      expect(grouped).toEqual([1]);

      // Shuffling the screening deltas leaves the ruled-out sequence
      // identical — the disclosure carries no information about which
      // screened candidate measured higher.
      const shuffledDeltas = [7, 3, 11, 0, 5, 9, 1, 8, 4, 10, 2, 6];
      const reshuffled = ranking([
        item({ itemId: 1, slot: "trinket", deltaDps: 60, deltaPct: 3 }),
        ...screenedTrinkets.map((t, i) => ({
          ...t,
          deltaDps: 40 - shuffledDeltas[i]! * 0.6,
        })),
      ]);
      expect(applyView(reshuffled).ruledOut.map((x) => x.itemId)).toEqual(
        view.ruledOut.map((x) => x.itemId)
      );
    });

    // The weapon pole: the promoted rows there are a real ranking and must
    // keep reading as one.
    it("keeps promoted weapon rows in delta order while their screened peers leave", () => {
      const r = ranking([
        screenedItem({
          itemId: 90,
          name: "screened-axe",
          slot: "weapon",
          deltaDps: 12,
          deltaPct: 0.6,
        }),
        item({ itemId: 2, slot: "weapon", deltaDps: 40, deltaPct: 2, rank: 2 }),
        item({
          itemId: 1,
          slot: "weapon",
          deltaDps: 55,
          deltaPct: 2.7,
          rank: 1,
        }),
        screenedItem({
          itemId: 91,
          name: "screened-mace",
          slot: "weapon",
          deltaDps: 11,
          deltaPct: 0.5,
        }),
        item({
          itemId: 3,
          slot: "weapon",
          deltaDps: 25,
          deltaPct: 1.2,
          rank: 3,
        }),
      ]);
      const view = applyView(r);
      expect(view.rows.map((x) => x.itemId)).toEqual([1, 2, 3]);
      expect(view.rows.map((x) => x.rank)).toEqual([1, 2, 3]);
      expect(view.ruledOut.map((x) => x.itemId)).toEqual([90, 91]);
    });

    // C13: removing the screened tail must be invisible to everything above
    // it. Compared against the same ranking with the screened items simply
    // absent — an independent source of truth for what the promoted rows
    // should look like.
    it("leaves promoted rows byte-identical to a ranking with no screened items", () => {
      const promoted = [
        item({ itemId: 1, deltaDps: 30.0, deltaPct: 1.5, se: 0.001 }),
        item({ itemId: 2, deltaDps: 30.0005, deltaPct: 1.5, se: 0.001 }),
        item({ itemId: 3, deltaDps: 12, deltaPct: 0.6 }),
        item({ itemId: 4, deltaDps: 0.4, deltaPct: 0.02, belowCutoff: true }),
      ];
      const withScreened = applyView(
        ranking([
          ...promoted,
          screenedItem({ itemId: 80, deltaDps: 999, deltaPct: 50 }),
          screenedItem({ itemId: 81, deltaDps: 30.0002, deltaPct: 1.5 }),
        ]),
        { groupBy: "slot" }
      );
      const withoutScreened = applyView(ranking(promoted), {
        groupBy: "slot",
      });

      expect(withScreened.rows).toEqual(withoutScreened.rows);
      expect(withScreened.shortlist).toEqual(withoutScreened.shortlist);
      expect(withScreened.groups).toEqual(withoutScreened.groups);
      expect(withScreened.belowCutoffCount).toBe(
        withoutScreened.belowCutoffCount
      );
      expect(withScreened.rows.map((x) => x.tieGroupId)).toEqual([
        "tie-1",
        "tie-1",
        undefined,
        undefined,
      ]);
    });

    it("never mutates a ranking that contains screened rows", () => {
      const r = ranking([
        item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
        screenedItem({ itemId: 2, deltaDps: 999, deltaPct: 50 }),
      ]);
      const before = structuredClone(r.items);
      const order = r.items.map((x) => x.itemId);
      applyView(r, { groupBy: "slot", hideOwned: true });
      expect(r.items).toEqual(before);
      // The delta ordering the engine produced stays reachable on the
      // Ranking — that is where the measurement scripts read it from.
      expect(r.items.map((x) => x.itemId)).toEqual(order);
      expect(r.items[1]).not.toHaveProperty("belowCutoffInView");
    });
  });
});
