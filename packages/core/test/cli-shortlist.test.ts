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
import { setPotentialDisclosureLine } from "../src/disclosure.js";
import {
  formatSetBonusLine,
  GEM_POLICY_QUALIFIER,
  formatSetPotentialLine,
  ruledOutDisclosureLine,
  ruledOutLines,
} from "../src/rank-report-rules.js";
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
    complete: true,
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

/**
 * Ticket 224. Screened candidates are disclosed as a set, never printed in a
 * positional list. `--show-ruled-out` is independent of `--show-below-cutoff`:
 * the two flags expand two disjoint groups of hidden rows.
 */
describe("CLI ruled-out disclosure", () => {
  const SCREENED_MIX = ranking([
    item({ itemId: 1, slot: "trinket", deltaDps: 30, deltaPct: 1.5 }),
    item({
      itemId: 2,
      slot: "trinket",
      deltaDps: 1,
      deltaPct: 0.05,
      belowCutoff: true,
    }),
    item({
      itemId: 30,
      name: "screened-b",
      slot: "trinket",
      deltaDps: 12,
      deltaPct: 0.6,
      screened: { iterations: 1000, promoted: false },
    }),
    item({
      itemId: 31,
      name: "screened-a",
      slot: "neck",
      deltaDps: 40,
      deltaPct: 2,
      screened: { iterations: 1000, promoted: false },
    }),
  ]);

  it("excludes screened rows from the printed selection under either flag", () => {
    expect(rowsPrinted(SCREENED_MIX, false).map((r) => r.itemId)).toEqual([1]);
    expect(rowsPrinted(SCREENED_MIX, true).map((r) => r.itemId)).toEqual([
      1, 2,
    ]);
    expect(applyView(SCREENED_MIX).ruledOut.map((r) => r.itemId)).toEqual([
      31, 30,
    ]);
  });

  /**
   * The counting identity `cli-shortlist.test.ts` has asserted since ticket 04,
   * extended to the third group. The three counts are disjoint and jointly
   * exhaustive over the rows the filters left, so nothing is silently dropped.
   */
  it("reconciles shortlist, below-cutoff and ruled-out against the filtered total", () => {
    const view = applyView(SCREENED_MIX);
    expect(view.shortlist.length).toBe(1);
    expect(view.belowCutoffCount).toBe(1);
    expect(view.ruledOut.length).toBe(2);
    expect(
      view.shortlist.length + view.belowCutoffCount + view.ruledOut.length
    ).toBe(SCREENED_MIX.items.length);
    expect(view.rows.length + view.ruledOut.length).toBe(
      SCREENED_MIX.items.length
    );
  });

  /**
   * The copy avoids "ruled out": both SMEs read that as a verdict on the item
   * when it is a verdict on the measurement. `ruledOut` survives as the
   * identifier only.
   */
  it("discloses the count on one line", () => {
    expect(ruledOutDisclosureLine(applyView(SCREENED_MIX).ruledOut)).toBe(
      "2 candidate(s) screened only (measured roughly, not re-checked; not ranked); --show-ruled-out to list them"
    );
  });

  it("prints nothing when there are no ruled-out rows", () => {
    expect(ruledOutDisclosureLine(applyView(MIXED).ruledOut)).toBeNull();
  });

  /**
   * The listing carries no `#` position and no delta ordering — a per-slot
   * heading over a name-ordered set, which is what stops it reading as a
   * second, weaker ranking.
   */
  it("lists ruled-out rows per slot with no positions", () => {
    expect(ruledOutLines(applyView(SCREENED_MIX).ruledOut)).toEqual([
      "neck: screened only — measured roughly, not re-checked (1)",
      "  screening deltas are not comparable to the ranked deltas above",
      "  screened-a screen ~Δ40.00",
      "trinket: screened only — measured roughly, not re-checked (1)",
      "  screening deltas are not comparable to the ranked deltas above",
      "  screened-b screen ~Δ12.00",
    ]);
  });

  /**
   * The non-comparability note is the part the second SME insisted on: on real
   * rows the screened spread and the ranked spread are different scales, so a
   * reader assuming one scale misreads the block. Every slot carries it.
   */
  it("repeats the non-comparability note under every slot heading", () => {
    const lines = ruledOutLines(applyView(SCREENED_MIX).ruledOut);
    const headings = lines.filter((l) => l.includes("screened only"));
    const notes = lines.filter((l) => l.includes("not comparable"));
    expect(headings).toHaveLength(2);
    expect(notes).toHaveLength(2);
  });
});

/**
 * `--with-set-potential` (spec §4): the CLI prints a short block from
 * `Ranking.setBonuses` plus a per-item annotation from `RankedItem.setContext`.
 * `main()` cannot be driven here (see file header) — this exercises the same
 * lines `main()` builds, the way `cli.ts` actually assembles them: one
 * `formatSetBonusLine` per entry in the block, one `formatSetPotentialLine`
 * per printed row.
 */
describe("--with-set-potential output", () => {
  const SET_BONUSES = [
    {
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4 as const,
      piecesWorn: 0,
      packageItemIds: [31039, 31048, 31034, 31044],
      packageDeltaDps: -317.24,
      bonusDps: 91.68,
    },
    {
      setId: 626,
      setName: "Justicar Battlegear",
      threshold: 2 as const,
      piecesWorn: 1,
      packageItemIds: [29073],
      packageDeltaDps: 0,
      unmeasured: "not-implemented-in-sim" as const,
    },
  ];

  it("prints the disclosure line and one line per SetBonusValue, unmeasured reasons included", () => {
    const lines = [
      `assumption: ${setPotentialDisclosureLine()}`,
      `set potential (${SET_BONUSES.length}):`,
      ...SET_BONUSES.map((b) => `  ${formatSetBonusLine(b)}`),
    ];
    expect(lines).toEqual([
      "assumption: set potential is measured with the completion-package synergy method, shared seeds — see PLAN.md §14's 2026-08-09 amendment",
      "set potential (2):",
      "  Thunderheart Harness 4pc (0 worn) — +91.68 DPS — " +
        "whole package -317.24 DPS vs current gear " +
        `(${GEM_POLICY_QUALIFIER}) — add Thunderheart Cover, ` +
        "Thunderheart Pauldrons, Thunderheart Gauntlets, Thunderheart Leggings",
      // Unmeasured: no figure to chase, so no package contents are named.
      "  Justicar Battlegear 2pc (1 worn) — not implemented in the pinned sim",
    ]);
  });

  it("prints the per-item +X set potential (needs N more pieces) line", () => {
    const withPotential = item({
      itemId: 1,
      deltaDps: 12,
      setContext: {
        setId: 676,
        setName: "Thunderheart Harness",
        piecesWornBefore: 2,
        piecesAfterSwap: 3,
        nextThreshold: 4,
        crossesThreshold: false,
        prospectiveBonusDps: 91.68,
      },
    });
    expect(formatSetPotentialLine(withPotential)).toBe(
      "+91.68 set potential (needs 1 more piece)"
    );
  });

  it("prints nothing for a row with no setContext, even under the flag", () => {
    const plain = item({ itemId: 1, deltaDps: 12 });
    expect(formatSetPotentialLine(plain)).toBeUndefined();
  });
});
