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
  formatSetBonusLine,
  formatSetPotentialLine,
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
    expect({ digest, length: html.length }).toEqual({
      digest:
        "d85d3eb3fa38b3570b3435007f02a309e560be110c02cf6b11ff7effb38229be",
      length: 11648,
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
