import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
import type { RankedItem, Ranking } from "../src/rank.js";
import { renderRankHtml, type RankReportMeta } from "../src/rank-report.js";
import {
  plausibilityWarnings,
  type PlausibilityWarning,
} from "../src/plausibility.js";

/**
 * The renderer's side of ticket 98's gates: warnings computed during ranking
 * (where the worn equipment lives) travel on `Ranking` and have to reach the
 * page. A gate nobody sees is not a gate.
 */

function ranking(
  warnings?: PlausibilityWarning[],
  items: RankedItem[] = []
): Ranking {
  return {
    contentHash: "test",
    cutoff: CUTOFF,
    fight: { reportCode: "test", fightId: 1, route: "ranked" },
    baseline: { dps: 2152.1, stdev: 12, metaAdjusted: false },
    assumptions: {
      maxPhase: 3,
      seeds: [42],
      iterations: 3000,
      race: "RaceTauren",
      presetId: "feral/p2.raid-sim-skeleton",
      standing: [],
    },
    substitutions: [],
    caps: {
      hit: { rating: 100, capRating: 142, gap: 42, capUncertainty: 0 },
      expertise: { rating: 0, capRating: null, gap: null },
    },
    items,
    // Mirrors `rankUpgrades`: the field is present only when non-empty.
    ...(warnings?.length ? { plausibilityWarnings: warnings } : {}),
  };
}

function meta(): RankReportMeta {
  return {
    character: "Shredzepelin",
    realm: "test",
    region: "us",
    spec: "feral",
    maxPhase: 3,
    poolSize: 56,
    generatedAt: "2026-08-10T00:00:00Z",
  };
}

const MAGNITUDE: PlausibilityWarning = {
  kind: "implausible-set-bonus",
  setId: 676,
  setName: "Thunderheart Harness",
  threshold: 4,
  bonusDps: 193.89,
  fractionOfBaseline: 0.0901,
  thresholdFraction: 0.075,
  message: "Thunderheart Harness 4pc measures 193.89 DPS — 9.0% of baseline.",
};

const DEAD: PlausibilityWarning = {
  kind: "dead-slot",
  slot: "chest",
  cause: "set-break-toll",
  wornItemName: "Breastplate of Malorne",
  message: "No positive candidate in chest: every alternative pays a toll.",
};

describe("plausibility warnings in the rank report", () => {
  it("renders both warnings on the page", () => {
    const html = renderRankHtml(ranking([MAGNITUDE, DEAD]), meta());
    expect(html).toContain("Thunderheart Harness 4pc measures 193.89 DPS");
    expect(html).toContain("No positive candidate in chest");
  });

  it("still renders the figure the magnitude gate flagged", () => {
    // A warning, never a suppression: the reader has to be able to see the
    // number being questioned, or the gate reads as a refusal to report.
    const html = renderRankHtml(ranking([MAGNITUDE]), meta());
    expect(html).toContain("193.89");
  });

  it("shows no warnings panel when the run is plausible", () => {
    const html = renderRankHtml(ranking(), meta());
    expect(html).not.toContain("Plausibility warnings");
  });

  it("puts a tripping bonus on the page and a passing one nowhere", () => {
    // The gate end to end, from a `SetBonusValue` as ranking builds it through
    // to rendered markup — the two measured anchors that calibrate the band.
    const trips = plausibilityWarnings({
      baselineDps: 2152.1,
      setBonuses: [
        {
          setId: 676,
          setName: "Thunderheart Harness",
          threshold: 4,
          piecesWorn: 0,
          packageItemIds: [],
          packageDeltaDps: 0,
          bonusDps: 193.89,
        },
      ],
      rows: [],
      wornSetCounts: new Map(),
    });
    expect(renderRankHtml(ranking(trips), meta())).toContain(
      "Thunderheart Harness 4pc"
    );

    const passes = plausibilityWarnings({
      baselineDps: 2227,
      setBonuses: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesWorn: 2,
          packageItemIds: [],
          packageDeltaDps: 0,
          bonusDps: 131.1,
        },
      ],
      rows: [],
      wornSetCounts: new Map(),
    });
    expect(passes).toEqual([]);
    expect(renderRankHtml(ranking(passes), meta())).not.toContain(
      "Plausibility warnings"
    );
  });
});

/**
 * Ticket 164: the top-of-page panel retracts a dead slot's rows, but a
 * reader who clicks the sticky nav straight to that slot never scrolls past
 * the panel. The retraction has to travel into the section itself, and the
 * rows it qualifies must not read as ordinary losses.
 */
describe("ticket 164 — dead-slot retraction travels to its section", () => {
  const RANGED_DEAD: PlausibilityWarning = {
    kind: "dead-slot",
    slot: "ranged",
    cause: "worn-unrankable",
    wornItemName: "Libram of Avengement",
    message:
      "ranged is unmeasured: the worn Libram of Avengement is not in the candidate pool for this slot, so every row shown for ranged was scored against an empty slot, not against Libram of Avengement.",
  };

  const rangedItem: RankedItem = {
    rank: 3,
    itemId: 23203,
    name: "Libram of Fervor",
    slot: "ranged",
    source: { kind: "world" },
    deltaDps: -14.1,
    deltaPct: -0.7,
    se: 0,
    seMethod: "independent",
    bisTags: [],
    belowCutoff: true,
  };

  // A slot with no warning, to prove the new markup is opt-in per slot.
  const chestItem: RankedItem = {
    rank: 1,
    itemId: 30001,
    name: "Breastplate of Malorne",
    slot: "chest",
    source: { kind: "world" },
    deltaDps: 12,
    deltaPct: 0.6,
    se: 0,
    seMethod: "independent",
    bisTags: [],
    belowCutoff: false,
  };

  it("echoes the warning's own message inside the ranged section", () => {
    const html = renderRankHtml(
      ranking([RANGED_DEAD], [rangedItem, chestItem]),
      meta()
    );
    const sectionStart = html.indexOf('id="slot-ranged"');
    const sectionEnd = html.indexOf("</section>", sectionStart);
    const section = html.slice(sectionStart, sectionEnd);
    expect(section).toContain("slot-retraction");
    expect(section).toContain(
      "the worn Libram of Avengement is not in the candidate pool"
    );
  });

  it("does not add a retraction to a slot the warning does not name", () => {
    const html = renderRankHtml(
      ranking([RANGED_DEAD], [rangedItem, chestItem]),
      meta()
    );
    const sectionStart = html.indexOf('id="slot-chest"');
    const sectionEnd = html.indexOf("</section>", sectionStart);
    const section = html.slice(sectionStart, sectionEnd);
    expect(section).not.toContain("slot-retraction");
  });

  it("marks the dead-slot row unmeasured instead of an ordinary loss", () => {
    const html = renderRankHtml(
      ranking([RANGED_DEAD], [rangedItem, chestItem]),
      meta()
    );
    const rowStart = html.indexOf('data-item-id="23203"');
    const articleStart = html.lastIndexOf("<article", rowStart);
    const articleEnd = html.indexOf("</article>", rowStart);
    const row = html.slice(articleStart, articleEnd);
    expect(row).toContain("row muted unmeasured");
  });

  it("distinguishes the unmeasured nav chip from an ordinary no-BiS chip", () => {
    const html = renderRankHtml(
      ranking([RANGED_DEAD], [rangedItem, chestItem]),
      meta()
    );
    expect(html).toMatch(
      /<a href="#slot-ranged" class="nav-slot no-bis unmeasured"/
    );
    // chest has a BiS-less item too, but no warning names it -- its chip
    // must stay plain "no-bis", not pick up "unmeasured" for free.
    expect(html).toMatch(/<a href="#slot-chest" class="nav-slot no-bis"[^u]/);
  });
});
