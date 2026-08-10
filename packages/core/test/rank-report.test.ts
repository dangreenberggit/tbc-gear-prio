import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
import type { RankedItem, Ranking } from "../src/rank.js";
import {
  formatItemSource,
  groupBySlot,
  partitionShortlist,
  renderRankHtml,
  type RankReportMeta,
} from "../src/rank-report.js";
import {
  curatedSetPhase,
  formatSetBonusLine,
  formatSetPotentialLine,
  isCuratedBis,
  weightedSetPotentialDps,
  wowsimsItemIdsJson,
} from "../src/rank-report-rules.js";
import { realPoolEntry } from "./real-source.js";

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

/**
 * A real `Ranking`, not a cast — these tests render one, so a cast fixture
 * would stop catching shape changes the renderer has to keep up with. Rows
 * carry their own `belowCutoff`; the renderer never re-applies `cutoff`.
 */
function ranking(items: RankedItem[]): Ranking {
  return {
    contentHash: "test",
    cutoff: CUTOFF,
    fight: { reportCode: "test", fightId: 1, route: "ranked" },
    baseline: { dps: 2040, stdev: 119, metaAdjusted: false },
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
    expect(
      formatItemSource({ kind: "crafted", profession: "Blacksmithing" })
    ).toBe("Crafted · Blacksmithing");
    // A recipe behind a reputation is a grind the player has to know about.
    expect(
      formatItemSource({
        kind: "crafted",
        profession: "Blacksmithing",
        recipeFaction: "Ashtongue Deathsworn",
        recipeStanding: "Friendly",
        recipeFactionId: 1012,
      })
    ).toBe("Crafted · Blacksmithing · Ashtongue Deathsworn Friendly");
    // recipeZone is a filter concern and stays out of the label, as before.
    expect(
      formatItemSource({
        kind: "crafted",
        profession: "Tailoring",
        recipeZone: "Black Temple",
      })
    ).toBe("Crafted · Tailoring");
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
      ranking([
        item({
          rank: null,
          itemId: 28773,
          name: "Gorehowl",
          slot: "weapon",
          deltaDps: -103.9,
          belowCutoff: true,
          magnitudeWarning: true,
          source: realPoolEntry(28773).source,
        }),
      ]),
      meta()
    );
    expect(html).toContain('<span class="pill warn">sim magnitude</span>');
    expect(html).toContain("Gorehowl");
  });

  it("excludes magnitude-flagged weapons from Act on tonight", () => {
    const html = renderRankHtml(
      ranking([
        item({
          rank: 1,
          itemId: 32332,
          name: "Torch of the Damned",
          slot: "weapon",
          deltaDps: 82,
          belowCutoff: false,
          source: realPoolEntry(32332, "ret-p3").source,
        }),
        item({
          rank: null,
          itemId: 28773,
          name: "Gorehowl",
          slot: "weapon",
          deltaDps: -103.9,
          belowCutoff: true,
          magnitudeWarning: true,
          source: realPoolEntry(28773).source,
        }),
      ]),
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
      ranking([
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
          source: realPoolEntry(32526, "ret-p3").source,
        }),
      ]),
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
      ranking([
        item({
          rank: 1,
          itemId: 32526,
          name: "Band of Devastation",
          slot: "finger",
          deltaDps: 20.68,
          belowCutoff: false,
          slotChoice: "finger2",
          source: realPoolEntry(32526, "ret-p3").source,
        }),
      ]),
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

  it("names the ranked spec's pool, not a hardcoded ret", () => {
    // The spec was interpolated as a literal `ret`, so every feral report
    // claimed a `ret-pN` pool while the CLI had loaded `feral-pN.json`. The
    // ret fixture above passes either way, which is why it never caught this.
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), {
      ...meta(),
      spec: "feral",
      maxPhase: 3,
    });
    expect(html).toContain("Universe pool (feral-p3).");
    expect(html).not.toContain("ret-p3");
  });

  it("names the stage a BiS badge is BiS for (carry-forward 47)", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        items: [
          item({
            rank: 1,
            itemId: 30834,
            name: "Shapeshifter's Signet",
            slot: "finger",
            deltaDps: 20.68,
            belowCutoff: false,
            source: realPoolEntry(30834).source,
            bisTags: ["BiS"],
            bisSets: ["p2"],
            curatedSets: ["p1", "p2", "preraid"],
          }),
        ],
      },
      meta()
    );
    // The bare pill is what overstated the claim; the stage is the whole fix.
    expect(html).toContain("p2 BiS");
    expect(html).not.toMatch(/<span class="pill tag">BiS<\/span>/);
  });

  it("says when a recommendation costs hit under the cap (carry-forward 47)", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        items: [
          item({
            rank: 1,
            itemId: 30098,
            name: "Razor-Scale Battlecloak",
            slot: "back",
            deltaDps: 20.68,
            belowCutoff: false,
            source: { kind: "raid", zone: "Gruul's Lair", boss: "Gruul" },
            hitRegression: { lost: 17, gapAfter: 87 },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain("costs 17 hit rating");
    expect(html).toContain("widens your gap to 87");
  });

  // The real cap is 9 * 15.769233, so a live `gapAfter` is essentially never
  // integral and the raw value rendered as 64.92309699999998 in the shipped
  // report (carry-forward 77). Whole-number fixtures above hid it.
  it("rounds a fractional hit gap like the banner does (carry-forward 77)", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        items: [
          item({
            rank: 1,
            itemId: 30098,
            name: "Razor-Scale Battlecloak",
            slot: "back",
            deltaDps: 20.68,
            belowCutoff: false,
            source: { kind: "raid", zone: "Gruul's Lair", boss: "Gruul" },
            hitRegression: { lost: 17, gapAfter: 64.92309699999998 },
          }),
        ],
      },
      meta()
    );
    expect(html).toContain("widens your gap to 65");
    expect(html).not.toContain("64.92309699999998");
  });

  // The page rendered per-row "widens your gap to N" while never stating what
  // the gap was, carrying no Heroic Presence caveat, and naming no fight —
  // 22 rows referencing "your gap" against zero banner lines in the shipped
  // nexess-p3-all.html (carry-forward 76). The HTML report is the shareable
  // artifact, so it has to carry the same disclosure the CLI prints.
  it("renders the hit-cap banner and fight provenance (carry-forward 76)", () => {
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), meta());
    expect(html).toContain("under the hit cap");
    expect(html).toContain("Heroic Presence");
    // The whole provenance sentence, not a substring of it: "test" alone also
    // matches the contentHash in the footer and proves nothing.
    expect(html).toContain(
      "gear read from fight 1 (test fight 1, ranked route)"
    );
  });

  // The off-tank warning is the one ticket 06 added *because* nothing in the
  // output named the fight. It fires only on a confident parse with zero
  // salvation uptime — the combination that means "this may be tank gear".
  it("names the report-events route and the off-tank warning in the HTML too", () => {
    const base = rankingWithPvpWeaponAboveCutoff();
    const html = renderRankHtml(
      {
        ...base,
        fight: {
          ...base.fight,
          route: "report-events",
          confidence: 1,
          salvationUptime: 0,
        },
      },
      meta()
    );
    expect(html).toContain("report-events");
    expect(html).toContain("Blessing of Salvation");
    expect(html).toContain("off-tanking");
  });

  // The other cases here assert on fragments, so a change to the surrounding
  // markup or CSS passes them all. This pins the whole document, which is what
  // makes a pure restructure of this module provable: split the file, move the
  // template, extract the styles — if a single byte of output moves, this
  // fails. Update the hash only when the rendered report is *meant* to change,
  // and say so in the commit.
  it("renders a byte-identical document for a fixed ranking", () => {
    const html = renderRankHtml(rankingWithPvpWeaponAboveCutoff(), meta());
    const digest = createHash("sha256").update(html, "utf8").digest("hex");
    // Repinned for carry-forward 34: the fixture now builds its `Ranking`
    // through the shared `ranking()` helper, which uses the real `CUTOFF`
    // constant (3.4 DPS / 0.15%) instead of the old ad hoc `{ absDps: 5, pct:
    // 0.5 }` literal — `Cutoff`'s fields are literal-typed, so that literal
    // could never have satisfied the real type. The rendered "Cutoff 3.4 DPS
    // / 0.15%" line is longer than "Cutoff 5 DPS / 0.5%", which is the whole
    // delta against the previous pin.
    // Repinned for carry-forward 76: the page now renders the hit-cap banner
    // and the fight-provenance line it was only ever printing to the CLI.
    // Diffed before/after to confirm the delta is exactly those two <p>
    // elements plus their CSS rules — nothing else in the document moved.
    // Repinned for set-bonus-value Slice C: every row now interpolates a
    // `${setPotential}` div (empty string when `--with-set-potential` is off,
    // as this fixture renders), and the document gains an always-present but
    // empty `${setPotentialPanel}` slot next to `${subs}`. Diffed before/after
    // to confirm the delta is exactly those interpolation points' whitespace —
    // no visible markup changes with the toggle off.
    // Repinned for the set-weight toggle: rows and chips now carry
    // `data-delta`/`data-weighted`, the row's delta div is split into a
    // `.delta-plain`/`.delta-weighted` pair, and the stylesheet gains the
    // toggle's rules. This fixture has no `setContext` on any row, so the
    // toggle control and its <script> do not render at all here (both
    // interpolate to ""), and every weighted value equals its plain one.
    // Diffed before/after to confirm the delta is exactly those attributes,
    // the paired delta divs, the new CSS block, and the empty interpolation
    // slots — no visible markup moved.
    // Repinned again for the `full` credit mode: rows and chips gain
    // `data-full`/`data-full-label`, the delta pair becomes a triple with
    // `.delta-full`, and the toggle's CSS grows a `.set-weight-title` rule and
    // a third display arm. This fixture still renders no control and no
    // <script>, and all three values are equal on every row here. Diffed
    // before/after to confirm the delta is exactly that.
    // Repinned for the BiS-only filter: nav links gain
    // `class`/`data-hits`/`data-bis-hits`, slot sections gain a `no-bis`
    // marker and a second (hidden) count paragraph, and the stylesheet gains
    // the filter's rules. No row here is curated, so the filter control and
    // the <script> still do not render for this fixture. Diffed before/after
    // to confirm that is the whole delta.
    // Repinned for the source filter and the JSON export: rows gain
    // `data-item-id`/`data-sources`, chips gain `data-sources`, the page gains
    // the Sources and Export panels, and the <script> is now unconditional
    // (the export panel needs it on every page, where before it only shipped
    // alongside a set or BiS control). This fixture has two source buckets, so
    // unlike the previous repins it *does* render a new control. Diffed
    // before/after to confirm the delta is those attributes, the two panels,
    // the script, and the new CSS block.
    expect({ digest, length: html.length }).toEqual({
      digest:
        "feff44f2c463ffefb29ff8a838dbfa79e76e52eb6b1beae31cacf117eb289f5e",
      length: 22702,
    });
  });
});

describe("formatSetBonusLine / formatSetPotentialLine (pure rendering rules)", () => {
  it("renders a measured bonus, signed", () => {
    expect(
      formatSetBonusLine({
        setId: 676,
        setName: "Thunderheart Harness",
        threshold: 4,
        piecesWorn: 0,
        packageItemIds: [1, 2, 3, 4],
        packageDeltaDps: -317.24,
        bonusDps: 91.68,
      })
    ).toBe("Thunderheart Harness 4pc (0 worn) — +91.68 DPS");
  });

  /**
   * verification.md V0b measured exactly this package and reported +91.68,
   * where the confound-free V0c measures +20.89. The number nets the broken
   * bonus in and cannot separate it, so the line has to say so (finding 8).
   */
  it("names an other-set bonus the package breaks", () => {
    expect(
      formatSetBonusLine({
        setId: 676,
        setName: "Thunderheart Harness",
        threshold: 4,
        piecesWorn: 0,
        packageItemIds: [31039, 31048, 31034, 31044],
        packageDeltaDps: -317.24,
        bonusDps: 91.68,
        breaks: [
          {
            setId: 640,
            setName: "Malorne Harness",
            threshold: 2,
            piecesBefore: 2,
            piecesAfter: 1,
          },
        ],
      })
    ).toBe(
      "Thunderheart Harness 4pc (0 worn) — +91.68 DPS " +
        "[breaks Malorne Harness 2pc (2→1); measured value nets this in]"
    );
  });

  it("says nothing about breakage when the package breaks nothing", () => {
    expect(
      formatSetBonusLine({
        setId: 640,
        setName: "Malorne Harness",
        threshold: 4,
        piecesWorn: 2,
        packageItemIds: [29098, 29097],
        packageDeltaDps: -282.29,
        bonusDps: 20.89,
      })
    ).not.toContain("breaks");
  });

  it("renders a measured ≈0 bonus as a number, not as unmeasured (§2.3)", () => {
    expect(
      formatSetBonusLine({
        setId: 629,
        setName: "Crystalforge Battlegear",
        threshold: 2,
        piecesWorn: 1,
        packageItemIds: [1],
        packageDeltaDps: 0.1,
        bonusDps: 0,
      })
    ).toBe("Crystalforge Battlegear 2pc (1 worn) — 0.00 DPS");
  });

  it("renders each unmeasured reason as readable text", () => {
    expect(
      formatSetBonusLine({
        setId: 626,
        setName: "Justicar Battlegear",
        threshold: 2,
        piecesWorn: 1,
        packageItemIds: [1],
        packageDeltaDps: 0,
        unmeasured: "not-implemented-in-sim",
      })
    ).toBe(
      "Justicar Battlegear 2pc (1 worn) — not implemented in the pinned sim"
    );
    expect(
      formatSetBonusLine({
        setId: 641,
        setName: "Nordrassil Harness",
        threshold: 4,
        piecesWorn: 1,
        packageItemIds: [],
        packageDeltaDps: 0,
        unmeasured: "insufficient-pieces",
      })
    ).toBe(
      "Nordrassil Harness 4pc (1 worn) — not enough pieces in the pool to build the package"
    );
    expect(
      formatSetBonusLine({
        setId: 676,
        setName: "Thunderheart Harness",
        threshold: 4,
        piecesWorn: 2,
        packageItemIds: [],
        packageDeltaDps: 0,
        unmeasured: "sim-failed",
      })
    ).toBe("Thunderheart Harness 4pc (2 worn) — the package sim failed");
  });

  it("formats the per-item potential line with the pieces-needed count", () => {
    expect(
      formatSetPotentialLine({
        setContext: {
          setId: 626,
          setName: "Justicar Battlegear",
          piecesWornBefore: 1,
          piecesAfterSwap: 2,
          nextThreshold: 4,
          crossesThreshold: false,
          prospectiveBonusDps: 45,
        },
      })
    ).toBe("+45.00 set potential (needs 2 more pieces)");
  });

  it("points at the 4pc threshold and says needs 2 more for a 1-worn candidate crossing to 2 (finding 3)", () => {
    // piecesWornBefore=1, piecesAfterSwap=2, but 2pc is not-implemented-in-sim
    // so nextThreshold is the nearest *measurable* one: 4pc. needed must be
    // nextThreshold - piecesAfterSwap = 2, never 0.
    expect(
      formatSetPotentialLine({
        setContext: {
          setId: 626,
          setName: "Justicar Battlegear",
          piecesWornBefore: 1,
          piecesAfterSwap: 2,
          nextThreshold: 4,
          crossesThreshold: false,
          prospectiveBonusDps: 45,
        },
      })
    ).toBe("+45.00 set potential (needs 2 more pieces)");
  });

  it("singularizes 'piece' when exactly one more is needed", () => {
    expect(
      formatSetPotentialLine({
        setContext: {
          setId: 626,
          setName: "Justicar Battlegear",
          piecesWornBefore: 3,
          piecesAfterSwap: 3,
          nextThreshold: 4,
          crossesThreshold: false,
          prospectiveBonusDps: 45,
        },
      })
    ).toBe("+45.00 set potential (needs 1 more piece)");
  });

  it("is undefined for a crossing candidate (value already in deltaDps)", () => {
    expect(
      formatSetPotentialLine({
        setContext: {
          setId: 626,
          setName: "Justicar Battlegear",
          piecesWornBefore: 3,
          piecesAfterSwap: 4,
          nextThreshold: null,
          crossesThreshold: true,
        },
      })
    ).toBeUndefined();
  });

  it("is undefined with no setContext at all", () => {
    expect(formatSetPotentialLine({})).toBeUndefined();
  });
});

describe("weightedSetPotentialDps", () => {
  const ctx = (over: Partial<NonNullable<RankedItem["setContext"]>> = {}) => ({
    setId: 626,
    setName: "Justicar Battlegear",
    piecesWornBefore: 1,
    piecesAfterSwap: 2,
    nextThreshold: 4 as const,
    crossesThreshold: false,
    prospectiveBonusDps: 100,
    ...over,
  });

  it("adds a quarter of a 4pc bonus", () => {
    expect(
      weightedSetPotentialDps({ deltaDps: 10, setContext: ctx() })
    ).toBeCloseTo(35);
  });

  it("adds half of a 2pc bonus", () => {
    expect(
      weightedSetPotentialDps({
        deltaDps: 10,
        setContext: ctx({ piecesAfterSwap: 1, nextThreshold: 2 }),
      })
    ).toBeCloseTo(60);
  });

  it("weights flatly, ignoring how many pieces are still missing", () => {
    // One piece away and three pieces away both take the same 0.25x credit —
    // the documented consequence of a flat weight, asserted so a later change
    // to a pieces-remaining divisor cannot land silently.
    const oneAway = weightedSetPotentialDps({
      deltaDps: 0,
      setContext: ctx({ piecesAfterSwap: 3 }),
    });
    const threeAway = weightedSetPotentialDps({
      deltaDps: 0,
      setContext: ctx({ piecesAfterSwap: 1 }),
    });
    expect(oneAway).toBeCloseTo(25);
    expect(threeAway).toBeCloseTo(25);
  });

  it("falls back to deltaDps when the bonus is already inside it", () => {
    expect(
      weightedSetPotentialDps({
        deltaDps: 10,
        setContext: ctx({ crossesThreshold: true, nextThreshold: null }),
      })
    ).toBe(10);
  });

  it("falls back to deltaDps when the threshold was never measured", () => {
    // `prospectiveBonusDps` absent, not set to undefined —
    // `exactOptionalPropertyTypes` distinguishes the two, and an unmeasured
    // bonus is genuinely an absent key.
    const unmeasured = ctx();
    delete (unmeasured as { prospectiveBonusDps?: number }).prospectiveBonusDps;
    expect(
      weightedSetPotentialDps({ deltaDps: 10, setContext: unmeasured })
    ).toBe(10);
  });

  it("falls back to deltaDps with no setContext", () => {
    expect(weightedSetPotentialDps({ deltaDps: 10 })).toBe(10);
  });

  it("credits the whole bonus under `full`, at either threshold", () => {
    expect(
      weightedSetPotentialDps({ deltaDps: 10, setContext: ctx() }, "full")
    ).toBeCloseTo(110);
    expect(
      weightedSetPotentialDps(
        { deltaDps: 10, setContext: ctx({ nextThreshold: 2 }) },
        "full"
      )
    ).toBeCloseTo(110);
  });

  it("still falls back to deltaDps under `full` with nothing to credit", () => {
    // `full` widens the credit, never the set of rows eligible for one — a
    // crossing candidate's bonus is already inside deltaDps either way.
    expect(
      weightedSetPotentialDps(
        {
          deltaDps: 10,
          setContext: ctx({ crossesThreshold: true, nextThreshold: null }),
        },
        "full"
      )
    ).toBe(10);
    expect(weightedSetPotentialDps({ deltaDps: 10 }, "full")).toBe(10);
  });

  it("defaults to the weighted credit when no mode is given", () => {
    const c = ctx();
    expect(weightedSetPotentialDps({ deltaDps: 10, setContext: c })).toBe(
      weightedSetPotentialDps({ deltaDps: 10, setContext: c }, "weighted")
    );
  });

  it("keeps a negative row negative when the weighted credit is too small", () => {
    expect(
      weightedSetPotentialDps({
        deltaDps: -220,
        setContext: ctx({ prospectiveBonusDps: 18 }),
      })
    ).toBeCloseTo(-215.5);
  });
});

describe("set-weight toggle (client-side re-sort)", () => {
  const withPotential = item({
    name: "Tier piece",
    slot: "head",
    deltaDps: -100,
    itemId: 30229,
    setContext: {
      setId: 641,
      setName: "Nordrassil Harness",
      piecesWornBefore: 0,
      piecesAfterSwap: 1,
      nextThreshold: 4,
      crossesThreshold: false,
      prospectiveBonusDps: 200,
    },
  });

  const meta: RankReportMeta = {
    character: "c",
    realm: "r",
    region: "US",
    spec: "feral",
    maxPhase: 2,
    poolSize: 2,
    generatedAt: "now",
  };

  it("emits all three values and the control when some row would move", () => {
    const html = renderRankHtml(ranking([withPotential]), meta);
    expect(html).toContain('name="set-weight"');
    expect(html).toContain('data-delta="-100"');
    // -100 + 200 * 0.25
    expect(html).toContain('data-weighted="-50"');
    // -100 + 200 * 1
    expect(html).toContain('data-full="100"');
  });

  it("offers the three modes as radios, defaulting to off", () => {
    // Radios, not checkboxes: the modes are alternatives, and the markup has
    // to make picking both impossible rather than policing it in script.
    const html = renderRankHtml(ranking([withPotential]), meta);
    expect(html).toContain(
      'type="radio" name="set-weight" value="off" checked'
    );
    expect(html).toContain('type="radio" name="set-weight" value="weighted"');
    expect(html).toContain('type="radio" name="set-weight" value="full"');
    expect(html).not.toContain('type="checkbox" name="set-weight"');
  });

  it("omits the control entirely when no row would move", () => {
    const html = renderRankHtml(
      ranking([item({ name: "plain", slot: "head", deltaDps: 5 })]),
      meta
    );
    // The stylesheet always carries the control's rules, so the absence check
    // is on the control markup. The <script> is now unconditional — the export
    // panel needs it on every page — so its presence says nothing here.
    expect(html).not.toContain('type="radio" name="set-weight"');
  });

  it("offers the control for a row only `full` would move", () => {
    // A 4pc bonus small enough that the 0.25x weighted credit rounds to the
    // same displayed value would still move materially under `full`; gating
    // availability on `weighted` alone would hide a live control.
    const html = renderRankHtml(
      ranking([
        item({
          name: "Tier piece",
          slot: "head",
          deltaDps: 0,
          setContext: {
            setId: 641,
            setName: "Nordrassil Harness",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 4,
            crossesThreshold: false,
            prospectiveBonusDps: 80,
          },
        }),
      ]),
      meta
    );
    expect(html).toContain('name="set-weight"');
    expect(html).toContain('data-full="80"');
  });

  it("does not change which rows are above cutoff", () => {
    // The toggle is display-only: a row's `belowCutoff` class is rendered from
    // the ranking, never from the weighted value.
    const html = renderRankHtml(ranking([withPotential]), meta);
    expect(html).toContain('class="row muted"');
  });
});

describe("isCuratedBis", () => {
  it("is true only for a current-stage BiS tag", () => {
    expect(isCuratedBis({ bisTags: ["BiS"] })).toBe(true);
    expect(isCuratedBis({ bisTags: ["BiS", "Alt"] })).toBe(true);
    expect(isCuratedBis({ bisTags: [] })).toBe(false);
    expect(isCuratedBis({ bisTags: ["Alt"] })).toBe(false);
    expect(isCuratedBis({ bisTags: ["Realistic"] })).toBe(false);
  });

  it("does not read curatedSets", () => {
    // `curatedSets` also carries earlier-stage sets (feral P2 has five
    // `preraid` rows). "Was in the pre-raid set" is not "BiS now".
    expect(
      isCuratedBis({ bisTags: [], curatedSets: ["preraid"] } as Pick<
        RankedItem,
        "bisTags"
      >)
    ).toBe(false);
  });
});

describe("BiS-only filter", () => {
  const meta: RankReportMeta = {
    character: "c",
    realm: "r",
    region: "US",
    spec: "feral",
    maxPhase: 2,
    poolSize: 3,
    generatedAt: "now",
  };

  const bisAbove = item({
    name: "Curated hit",
    slot: "head",
    deltaDps: 20,
    itemId: 11,
    belowCutoff: false,
    bisTags: ["BiS"],
    bisSets: ["p2_6p"],
  });
  const bisBelow = item({
    name: "Curated but a downgrade alone",
    slot: "head",
    deltaDps: -30,
    itemId: 12,
    belowCutoff: true,
    bisTags: ["BiS"],
    bisSets: ["p2_6p"],
  });
  const notBis = item({
    name: "Uncurated",
    slot: "waist",
    deltaDps: 5,
    itemId: 13,
    belowCutoff: false,
  });

  it("marks curated rows and offers the filter", () => {
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    expect(html).toContain('id="bis-only"');
    expect(html).toContain("is-bis");
  });

  it("marks a slot with no curated row so it can be hidden wholesale", () => {
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    // head has a curated row, waist does not.
    expect(html).toContain('<section class="slot" id="slot-head">');
    expect(html).toContain('<section class="slot no-bis" id="slot-waist">');
  });

  it("keeps below-cutoff curated rows marked, so the filter shows all of them", () => {
    // An item is BiS as a member of a whole optimized set, so some curated
    // picks are downgrades as a single swap. Dropping them would misdescribe
    // the very list the control names.
    const html = renderRankHtml(ranking([bisAbove, bisBelow]), meta);
    expect(html).toContain('class="row muted is-bis"');
    expect(html).toContain('class="row hit is-bis"');
    expect(html).toContain("2 BiS candidates");
  });

  it("carries both nav counts so the badge can follow the filter", () => {
    const html = renderRankHtml(ranking([bisAbove, bisBelow, notBis]), meta);
    // head: 1 above cutoff, 2 curated.
    expect(html).toContain('data-hits="1" data-bis-hits="2"');
    // waist: 1 above cutoff, 0 curated — and marked so the link hides.
    expect(html).toContain('class="nav-slot no-bis" data-hits="1"');
  });

  it("omits the filter when nothing is curated", () => {
    const html = renderRankHtml(ranking([notBis]), meta);
    expect(html).not.toContain('id="bis-only"');
  });

  it("names the sets the tags came from, not the requested phase", () => {
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    expect(html).toContain("(p2_6p)");
  });

  it("warns when the curated list is older than the ranked phase", () => {
    // Where no set is pinned for the ranked phase the tags degrade to the
    // newest one that is. Calling that "P3 BiS" would assert a curation
    // nobody made — the overclaim carry-forward 47 §1 was filed for.
    const html = renderRankHtml(ranking([bisAbove, notBis]), {
      ...meta,
      maxPhase: 3,
    });
    expect(html).toContain("No curated set is pinned for P3");
  });

  it("does not warn when the curated list matches the ranked phase", () => {
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    expect(html).not.toContain("No curated set is pinned");
  });

  it("still ships the script when only the BiS filter is present", () => {
    // The two controls are independent: a page with curated rows but no
    // unrealised set bonus still needs the script for the filter to work.
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    // The script's own querySelectorAll mentions `set-weight`, so the absence
    // check has to target the radio markup rather than the bare string.
    expect(html).not.toContain('type="radio" name="set-weight"');
    expect(html).toContain("<script>");
    expect(html).toContain('getElementById("bis-only")');
  });

  it("does not filter rows out of the emitted document", () => {
    // Hidden, never deleted (§10): the artifact holds every row and the
    // filter is CSS over classes.
    const html = renderRankHtml(ranking([bisAbove, notBis]), meta);
    expect(html).toContain("Uncurated");
  });
});

describe("wowsimsItemIdsJson", () => {
  it("emits the wowsims envelope with ids in display order", () => {
    expect(wowsimsItemIdsJson([{ itemId: 30229 }, { itemId: 32014 }])).toBe(`{
  "items": [
    {
      "id": 30229
    },
    {
      "id": 32014
    }
  ]
}`);
  });

  it("emits an empty items array rather than null when nothing is visible", () => {
    expect(JSON.parse(wowsimsItemIdsJson([]))).toEqual({ items: [] });
  });

  it("carries ids only — no enchant or gems invented for unowned items", () => {
    const parsed = JSON.parse(wowsimsItemIdsJson([{ itemId: 1 }])) as {
      items: Array<Record<string, unknown>>;
    };
    expect(Object.keys(parsed.items[0]!)).toEqual(["id"]);
  });
});

describe("source filter", () => {
  const meta: RankReportMeta = {
    character: "c",
    realm: "r",
    region: "US",
    spec: "feral",
    maxPhase: 3,
    poolSize: 3,
    generatedAt: "now",
  };

  const karaDrop = item({
    name: "Kara drop",
    slot: "head",
    deltaDps: 10,
    itemId: 21,
    belowCutoff: false,
    source: { kind: "raid", zone: "Karazhan", boss: "Prince" },
  });
  const crafted = item({
    name: "Crafted thing",
    slot: "waist",
    deltaDps: 5,
    itemId: 22,
    belowCutoff: false,
    source: { kind: "crafted", profession: "Leatherworking" },
  });

  it("tags a row with a zone key per raid it drops in", () => {
    const html = renderRankHtml(ranking([karaDrop, crafted]), meta);
    expect(html).toContain('data-sources="zone:Karazhan"');
    expect(html).toContain('data-sources="kind:crafted"');
  });

  it("reaches a tier piece's raid through its token source, not just the primary", () => {
    // The two-hop case §15's risk table names: filtering on `source` alone
    // gives a Karazhan filter that omits every T4 piece.
    const tierPiece = item({
      name: "Tier piece",
      slot: "chest",
      deltaDps: 3,
      itemId: 23,
      source: { kind: "unknown" },
      sources: [
        {
          kind: "token",
          zone: "Serpentshrine Cavern",
          token: "Chest of the Vanquished",
          boss: "Vashj",
        },
      ],
    });
    const html = renderRankHtml(ranking([tierPiece]), meta);
    expect(html).toContain('data-sources="zone:Serpentshrine Cavern"');
  });

  it("separates source keys with a tab, so multi-word zones survive", () => {
    // Space-separated was the first cut, and every multi-word zone ("Black
    // Temple") then split into keys matching no checkbox — 236 of 407 rows
    // vanished with their own filter switched on. Caught in a browser, not by
    // a test, which is why this one exists.
    const twoZones = item({
      name: "Two zones",
      slot: "head",
      deltaDps: 1,
      itemId: 24,
      source: { kind: "raid", zone: "Black Temple", boss: "Illidan" },
      sources: [
        { kind: "raid", zone: "Black Temple", boss: "Illidan" },
        { kind: "raid", zone: "Hyjal Summit", boss: "Archimonde" },
      ],
    });
    const html = renderRankHtml(ranking([twoZones]), meta);
    expect(html).toContain(
      'data-sources="zone:Black Temple\tzone:Hyjal Summit"'
    );
    // The delimiter must not appear inside a key, or the split re-breaks.
    for (const key of ["zone:Black Temple", "zone:Hyjal Summit"]) {
      expect(key).not.toContain("\t");
    }
  });

  it("offers one checkbox per bucket, all checked, with a count", () => {
    const html = renderRankHtml(ranking([karaDrop, crafted]), meta);
    expect(html).toContain('class="source-box" value="zone:Karazhan" checked');
    expect(html).toContain('class="source-box" value="kind:crafted" checked');
    // Zone-less kinds get the reader-facing label, not the bare kind.
    expect(html).toContain("Crafted");
  });

  it("omits the filter when every row shares one source bucket", () => {
    const html = renderRankHtml(ranking([karaDrop]), meta);
    expect(html).not.toContain('class="source-box"');
  });

  it("always ships the export panel and its script", () => {
    const html = renderRankHtml(ranking([karaDrop]), meta);
    expect(html).toContain('id="export-json"');
    expect(html).toContain('id="export-copy"');
    expect(html).toContain('data-item-id="21"');
    expect(html).toContain("<script>");
  });
});

describe("curatedSetPhase", () => {
  it("reads the phase from a label, ignoring the variant suffix", () => {
    expect(curatedSetPhase("p2")).toBe(2);
    expect(curatedSetPhase("p2_6p")).toBe(2);
    expect(curatedSetPhase("p2_9p")).toBe(2);
    expect(curatedSetPhase("p1")).toBe(1);
    // Pre-raid is phase 1: it is the set you take *into* a phase-1 raid.
    expect(curatedSetPhase("preraid")).toBe(1);
  });

  it("is null for a label it does not recognise", () => {
    expect(curatedSetPhase("p3")).toBeNull();
    expect(curatedSetPhase("")).toBeNull();
  });
});

describe("set potential (§4)", () => {
  it("renders nothing when the toggle is off, even with setBonuses present", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        setBonuses: [
          {
            setId: 626,
            setName: "Justicar Battlegear",
            threshold: 4,
            piecesWorn: 1,
            packageItemIds: [1, 2, 3],
            packageDeltaDps: 10,
            bonusDps: 5,
          },
        ],
      },
      meta()
    );
    expect(html).not.toContain("Set potential");
    expect(html).not.toContain("Justicar Battlegear");
  });

  it("renders the set block and the measured bonus under the toggle", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        setBonuses: [
          {
            setId: 676,
            setName: "Thunderheart Harness",
            threshold: 4,
            piecesWorn: 0,
            packageItemIds: [31039, 31048, 31034, 31044],
            packageDeltaDps: -317.24,
            bonusDps: 91.68,
          },
        ],
      },
      { ...meta(), view: { withSetPotential: true } }
    );
    expect(html).toContain("Set potential (1)");
    expect(html).toContain("Thunderheart Harness 4pc (0 worn)");
    expect(html).toContain("+91.68 DPS");
    expect(html).toContain("completion-package synergy");
  });

  it("renders each unmeasured reason as text, never a blank or a 0", () => {
    const reasons = [
      "not-implemented-in-sim",
      "insufficient-pieces",
      "sim-failed",
    ] as const;
    for (const reason of reasons) {
      const html = renderRankHtml(
        {
          ...rankingWithPvpWeaponAboveCutoff(),
          setBonuses: [
            {
              setId: 641,
              setName: "Nordrassil Harness",
              threshold: 2,
              piecesWorn: 1,
              packageItemIds: [1],
              packageDeltaDps: 0,
              unmeasured: reason,
            },
          ],
        },
        { ...meta(), view: { withSetPotential: true } }
      );
      expect(html).not.toMatch(/Nordrassil Harness 2pc \(1 worn\) — <\/li>/);
      expect(html).not.toContain("Nordrassil Harness 2pc (1 worn) — 0.00 DPS");
      expect(html.match(/Nordrassil Harness/g)?.length).toBeGreaterThan(0);
    }
  });

  it("shows the per-item set-potential annotation, and the crossing case as included-in-delta", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        items: [
          item({
            rank: 1,
            itemId: 29073,
            name: "Justicar Crown",
            slot: "head",
            deltaDps: 12,
            belowCutoff: false,
            setContext: {
              setId: 626,
              setName: "Justicar Battlegear",
              piecesWornBefore: 1,
              piecesAfterSwap: 2,
              nextThreshold: 4,
              crossesThreshold: false,
              prospectiveBonusDps: 45,
            },
          }),
          item({
            rank: 2,
            itemId: 29074,
            name: "Justicar Legplates",
            slot: "legs",
            deltaDps: 8,
            belowCutoff: false,
            setContext: {
              setId: 626,
              setName: "Justicar Battlegear",
              piecesWornBefore: 3,
              piecesAfterSwap: 4,
              nextThreshold: null,
              crossesThreshold: true,
            },
          }),
        ],
      },
      { ...meta(), view: { withSetPotential: true } }
    );
    expect(html).toContain("+45.00 set potential (needs 2 more pieces)");
    expect(html).toContain("completes 4pc (included in delta)");
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
  return ranking([
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
  ]);
}
