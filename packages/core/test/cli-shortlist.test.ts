/**
 * The ticket-04 observable that had no test: *"Below-cutoff rows are absent
 * from the default run and present under the flag, with the row count
 * identical across both."*
 *
 * `view.test.ts` covers `applyView`'s `shortlist` projection, but the claim
 * above is about what the **CLI prints** — two runs of `main()` and a
 * comparison of their output. A pure-function test cannot see that, which is
 * how the named observable stayed unverified while the mechanism landed.
 *
 * Driven through `main()` with a stubbed sim binary is not possible — the CLI
 * shells out to `wowsimcli` — so this exercises the printing rules through
 * `applyView` plus the same selection the CLI applies, and asserts the
 * *counting* identity the ticket names. The end-to-end proof is the recorded
 * run in `docs/verification-log.md`.
 */
import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
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
    se: 0.001,
    seMethod: "independent",
    bisTags: [],
    belowCutoff: false,
  };
  return { ...base, ...over };
}

function ranking(items: RankedItem[]): Ranking {
  return {
    contentHash: "0".repeat(64),
    cutoff: CUTOFF,
    fight: {
      reportCode: "abc123",
      fightId: 7,
      encounterName: "Hydross the Unstable",
      route: "ranked",
    },
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

/** The CLI's row selection: `main()`'s `args.showBelowCutoff ? rows : shortlist`. */
function rowsPrinted(r: Ranking, showBelowCutoff: boolean) {
  const view = applyView(r);
  return showBelowCutoff ? view.rows : view.shortlist;
}

const MIXED = ranking([
  item({ itemId: 1, deltaDps: 30, deltaPct: 1.5 }),
  item({ itemId: 2, deltaDps: 20, deltaPct: 1 }),
  item({ itemId: 3, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
  item({ itemId: 4, deltaDps: -8, deltaPct: -0.4, belowCutoff: true }),
]);

describe("CLI shortlist default", () => {
  it("omits below-cutoff rows from the default run", () => {
    expect(rowsPrinted(MIXED, false).map((r) => r.itemId)).toEqual([1, 2]);
  });

  it("prints them under --show-below-cutoff", () => {
    expect(rowsPrinted(MIXED, true).map((r) => r.itemId)).toEqual([1, 2, 3, 4]);
  });

  /**
   * The ticket's exact wording: the two runs must agree on the total. Hidden,
   * never deleted — the rows the default omits are still in the payload, so
   * default + hidden must reconstruct the expanded run exactly.
   */
  it("keeps the row count identical across both runs", () => {
    const view = applyView(MIXED);
    const shown = rowsPrinted(MIXED, false);
    const expanded = rowsPrinted(MIXED, true);

    expect(shown.length + view.belowCutoffCount).toBe(expanded.length);
    expect(expanded.length).toBe(view.rows.length);
    expect(view.belowCutoffCount).toBe(2);
  });

  it("still reaches every row through the payload when the default hides them", () => {
    const allBelow = ranking([
      item({ itemId: 9, deltaDps: 1, deltaPct: 0.05, belowCutoff: true }),
    ]);
    expect(rowsPrinted(allBelow, false)).toEqual([]);
    expect(rowsPrinted(allBelow, true)).toHaveLength(1);
    expect(applyView(allBelow).rows).toHaveLength(1);
  });

  /**
   * Grouped output takes the same default, read off each row's own
   * `belowCutoffInView`. A group left empty by the cutoff prints nothing
   * rather than a header with no rows under it.
   */
  it("applies the same default to grouped output", () => {
    const grouped = ranking([
      item({ itemId: 1, slot: "neck", deltaDps: 30, deltaPct: 1.5 }),
      item({
        itemId: 2,
        slot: "hands",
        deltaDps: 1,
        deltaPct: 0.05,
        belowCutoff: true,
      }),
    ]);
    const view = applyView(grouped, { groupBy: "slot" });
    const visible = (view.groups ?? [])
      .map((g) => ({
        key: g.key,
        rows: g.rows.filter((r) => !r.belowCutoffInView),
      }))
      .filter((g) => g.rows.length > 0);

    expect(visible.map((g) => g.key)).toEqual(["neck"]);
    // The hands group still exists in the view — hidden, not deleted.
    expect((view.groups ?? []).map((g) => g.key).sort()).toEqual([
      "hands",
      "neck",
    ]);
  });
});
