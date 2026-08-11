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
  GEM_POLICY_QUALIFIER,
  setBonusEntry,
  formatSetPotentialLine,
  isCuratedBis,
  formatPackageMembershipLine,
  packageSetPotentialDps,
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
    expect(html).toContain("Curated ranked list");
    const raidShortlist =
      html.match(
        /<div class="shortlist">\s*<h2>Curated ranked list[\s\S]*?<\/div>\s*<\/div>/
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

  it("excludes magnitude-flagged weapons from the curated ranked list", () => {
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
    expect(html).toContain("Curated ranked list");
    expect(html).toContain("Torch of the Damned");
    const raidShortlist =
      html.match(
        /<div class="shortlist">\s*<h2>Curated ranked list[\s\S]*?<\/div>\s*<\/div>/
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
    // Repinned for the curated-ranked-list rename: the heading changes, chips
    // split the old "#N Name" into an empty `.pos` (the script writes the
    // position), the name, and a dimmed `.abs` carrying the absolute rank,
    // plus a title tooltip and the renumbering pass in the script.
    // Repinned for the source filter and the JSON export: rows gain
    // `data-item-id`/`data-sources`, chips gain `data-sources`, the page gains
    // the Sources and Export panels, and the <script> is now unconditional
    // (the export panel needs it on every page, where before it only shipped
    // alongside a set or BiS control). This fixture has two source buckets, so
    // unlike the previous repins it *does* render a new control. Diffed
    // before/after to confirm the delta is those attributes, the two panels,
    // the script, and the new CSS block.
    // Repinned for carry-forward 96's curated-package pointer: the stylesheet
    // gains the `.curated-pointer` rule and every row interpolates an empty
    // pointer slot. No row in this fixture is both curated-BiS and carries a
    // `setContext`, so nothing visible renders — diffed before/after, where the
    // whole delta is those five CSS lines and two blank slots.
    // Repinned for ticket 98's plausibility panel: the stylesheet gains the
    // `.panel.plausibility` rule. This fixture trips neither gate, so the panel
    // itself does not render — verified by dumping the document on both sides,
    // where the whole diff is those six CSS lines and nothing in the body.
    // Repinned for the owner's package mode (2026-08-10): rows and chips gain
    // `data-package`/`data-package-label`, the delta triple becomes a quadruple
    // with `.delta-package`, every row interpolates an empty package-line slot,
    // the stylesheet gains `.package-line` and a fourth display arm, and the
    // script gains a `package` arm on the sort attribute and the label swap.
    // No row in this fixture carries a `setContext.package`, so the control's
    // fourth radio does not render here and every package value equals its
    // plain delta. Diffed before/after to confirm the delta is exactly that and
    // nothing visible moves with the toggle off. Extended again in the same
    // change for the `body.package .pct` rule, which hides the row's own
    // percentage under package mode -- four more CSS lines, nothing in the body.
    // Repinned again for carry-forward 104, which widens that rule to
    // `weighted` and `full`: the length moved by exactly the 186 characters the
    // CSS edit adds, so the whole delta is inside `<style>` and no markup moved.
    // Repinned once more for the Set potential reorganisation. Both documents
    // were dumped and diffed: the entire body delta is the removal of six empty
    // interpolation slots (this fixture carries no set data, so no `.set-info`
    // block and no panel entry render at all), and the remaining +1744 is
    // inside `<style>`. Body 13909 -> 13879, CSS 12342 -> 14086.
    // Repinned once more for the package-mode curated-list admission. Diffed
    // again: the entire body delta is one `data-item-id` attribute per chip,
    // which the admission needs to identify a chip. This fixture has no
    // package-carrying row, so no admitted chip renders and the chip list is
    // the same two chips in the same order. The rest is the new CSS.
    // Repinned for the export-order fix. Diffed with `<style>` and `<script>`
    // elided: the only body change is the export panel's caption, rewritten to
    // say what the export now is. Everything else in the delta is the script.
    expect({ digest, length: html.length }).toEqual({
      digest:
        "6c4756b73d392eead051e6952e987c2c0ba8bd400a9493494cef296bf6c67529",
      length: 29759,
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
    ).toBe(
      "Thunderheart Harness 4pc (0 worn) — +91.68 DPS — " +
        "whole package -317.24 DPS vs current gear " +
        `(${GEM_POLICY_QUALIFIER}) — ` +
        "add item 1, item 2, item 3, item 4"
    );
  });

  /**
   * A package that displaces another worn set inflates the reported figure by
   * `(k−1)·B` (the closed form on `brokenSetBonuses`), which no sim can
   * separate after the fact — so the line has to say so. The qualifier leads
   * the figure rather than trailing it (ticket 91).
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
      "Thunderheart Harness 4pc (0 worn) — " +
        "[breaks Malorne Harness 2pc (2→1); figure inflated by it] +91.68 DPS — " +
        "whole package -317.24 DPS vs current gear " +
        `(${GEM_POLICY_QUALIFIER}) — ` +
        "add Thunderheart Cover, Thunderheart Pauldrons, " +
        "Thunderheart Gauntlets, Thunderheart Leggings"
    );
  });

  /**
   * The break qualifier must not claim the figure it introduces is net of the
   * break. `bonusDps = packageDelta − Σ singles` is the quantity ADR-0023
   * decision 3 suppresses *because* it is inflated by `(k−1)·B`; on the
   * shredzepelin P3 artifact it reads 193.89 where the de-confounded value is
   * ~62.8. "nets this in" promised the opposite of what the number does.
   */
  it("does not claim the confounded figure is net of the break it names", () => {
    const line = formatSetBonusLine({
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [31048, 31042, 31034, 31044],
      packageDeltaDps: 64.07,
      bonusDps: 193.89,
      breaks: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesBefore: 2,
          piecesAfter: 0,
        },
      ],
    });
    expect(line).not.toContain("nets this in");
    expect(line).toContain("inflated by");
  });

  /**
   * The question a reader actually arrives with is "what happens if I equip the
   * whole package?", and `packageDeltaDps` is the only stored figure that
   * answers it: one sim of the assembled package against the baseline, with the
   * break already inside the measurement rather than derived back out. It
   * reached no surface at all before this — the panel showed only the
   * confounded `bonusDps`, so the member rows' large negatives had nothing
   * positive to be read against (loop log iteration 5, defect A).
   */
  it("states the whole-package delta, the figure that is net of any break", () => {
    const line = formatSetBonusLine({
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [31048, 31042, 31034, 31044],
      packageDeltaDps: 64.07,
      bonusDps: 193.89,
      breaks: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesBefore: 2,
          piecesAfter: 0,
        },
      ],
    });
    expect(line).toContain("whole package +64.07 DPS vs current gear");
  });

  /**
   * Ticket 103's disclosure, on the surface the ticket was filed against. The
   * per-row package line already carries this qualifier; the panel's own
   * package figure is the same quantity assembled the same way, so a reader
   * comparing it against their own re-gemmed wowsims run needs the same
   * warning — the gap is ~30 DPS on a ~2150 baseline.
   */
  it("qualifies the panel's package figure as holding current gems fixed", () => {
    const line = formatSetBonusLine({
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [31048, 31042, 31034, 31044],
      packageDeltaDps: 64.07,
      bonusDps: 193.89,
    });
    expect(line).toContain(GEM_POLICY_QUALIFIER);
  });

  it("states a negative whole-package delta with its sign", () => {
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
    ).toContain("whole package -317.24 DPS vs current gear");
  });

  /**
   * An unmeasured bonus has no package sim behind it, so `packageDeltaDps` is a
   * structural zero rather than a measurement. Rendering it would state a
   * measured-looking 0.00 for a package that was never simmed.
   */
  it("omits the whole-package delta when the bonus is unmeasured", () => {
    expect(
      formatSetBonusLine({
        setId: 641,
        setName: "Nordrassil Harness",
        threshold: 2,
        piecesWorn: 0,
        packageItemIds: [],
        packageDeltaDps: 0,
        unmeasured: "not-implemented-in-sim",
      })
    ).not.toContain("whole package");
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

  /**
   * Ticket 91: at 0 worn pieces every single-swap candidate lands at
   * `piecesAfterSwap === 1`, and `nextMeasurableThreshold` stops at
   * Thunderheart's implemented 2pc — so no row anywhere carries the 4pc figure.
   * The panel is the only surface that can show it, which makes naming the
   * package contents the actionable part: the reader needs to know *which four
   * items* the number is about.
   */
  it("names the package contents so a bonus no row carries is still actionable", () => {
    const line = formatSetBonusLine({
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [31048, 31042, 31034, 31044],
      packageDeltaDps: 64.07,
      bonusDps: 193.89,
    });
    expect(line).toContain("Thunderheart Pauldrons");
    expect(line).toContain("Thunderheart Chestguard");
    expect(line).toContain("Thunderheart Gauntlets");
    expect(line).toContain("Thunderheart Leggings");
  });

  it("leads with the breakage rather than trailing it after the figure", () => {
    const line = formatSetBonusLine({
      setId: 676,
      setName: "Thunderheart Harness",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [31048, 31042, 31034, 31044],
      packageDeltaDps: 64.07,
      bonusDps: 193.89,
      breaks: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesBefore: 2,
          piecesAfter: 0,
        },
      ],
    });
    // A qualified figure must read as qualified before the reader has taken the
    // number away — the caveat cannot sit past the end of the sentence.
    expect(line.indexOf("breaks")).toBeLessThan(line.indexOf("193.89"));
    expect(line).toContain("Malorne Harness 2pc");
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
    ).toBe(
      "Crystalforge Battlegear 2pc (1 worn) — 0.00 DPS — " +
        "whole package +0.10 DPS vs current gear " +
        `(${GEM_POLICY_QUALIFIER}) — add item 1`
    );
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

  it("still discloses a confounded figure, qualified by what it breaks", () => {
    // Ticket 90: the number is kept out of ranking, but the reader must still
    // see it and see why it is not being counted.
    const line = formatSetPotentialLine({
      setContext: {
        setId: 676,
        setName: "Thunderheart Harness",
        piecesWornBefore: 0,
        piecesAfterSwap: 1,
        nextThreshold: 4,
        crossesThreshold: false,
        prospectiveBonusDps: 193.89,
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
    });
    expect(line).toBeDefined();
    expect(line).toContain("193.89");
    expect(line).toContain("Malorne Harness");
    expect(line).toContain("not counted in ranking");
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

  it("credits nothing for a confounded bonus, under either credit mode", () => {
    // Ticket 90: `bonus = packageDelta - Σ singles` charges a displaced set's
    // lost bonus once in packageDelta and k times across the singles, so a
    // figure with non-empty `breaks` is inflated by (k-1)·B and must not move
    // a row's value. B is disputed, so this suppresses rather than corrects.
    const confounded = ctx({
      prospectiveBonusBreaks: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesBefore: 2,
          piecesAfter: 0,
        },
      ],
    });
    expect(
      weightedSetPotentialDps({ deltaDps: 10, setContext: confounded })
    ).toBe(10);
    expect(
      weightedSetPotentialDps({ deltaDps: 10, setContext: confounded }, "full")
    ).toBe(10);
  });

  it("still credits a bonus whose breaks list is empty", () => {
    // An empty `breaks` is the unconfounded case (k=0), not a missing field.
    expect(
      weightedSetPotentialDps({
        deltaDps: 10,
        setContext: ctx({ prospectiveBonusBreaks: [] }),
      })
    ).toBeCloseTo(35);
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

describe("packageSetPotentialDps", () => {
  // The owner's decision (2026-08-10, spec §4): under the opt-in view, a member
  // row of an incomplete set scores by the WHOLE-PACKAGE net figure. Membership
  // is `packageItemIds`, not `nextThreshold` — at 0 pieces worn every single
  // swap lands at `piecesAfterSwap === 1`, so `nextThreshold` pins to 2pc and a
  // threshold-keyed lookup would reach only two of the four T6 rows (ticket 91).
  const pkg = (over: Partial<NonNullable<RankedItem["setContext"]>> = {}) => ({
    setId: 676,
    setName: "Thunderheart Harness",
    piecesWornBefore: 0,
    piecesAfterSwap: 1,
    nextThreshold: 2 as const,
    crossesThreshold: false,
    prospectiveBonusDps: 31.46,
    package: {
      threshold: 4 as const,
      deltaDps: 64.07,
      itemIds: [31048, 31042, 31034, 31044],
      piecesNeeded: 4,
    },
    ...over,
  });

  it("scores a member row by the whole-package figure, not its own delta", () => {
    // The marquee case: the T6 shoulders sim at -106.16 as a single swap while
    // the package they belong to is +64.07.
    expect(
      packageSetPotentialDps({ deltaDps: -106.16, setContext: pkg() })
    ).toBeCloseTo(64.07);
  });

  it("gives every member row of one package the same figure", () => {
    // Not a per-piece split (spec §2.1 stands): all four rows carry the
    // identical whole-package number, which is why it must be labelled as one.
    const rows = [-106.16, -100.16, 21.75, 23.29].map((deltaDps) =>
      packageSetPotentialDps({ deltaDps, setContext: pkg() })
    );
    for (const v of rows) expect(v).toBeCloseTo(64.07);
  });

  it("falls back to deltaDps when the package value is not positive", () => {
    // Only a measured, positive package is credited. Nordrassil's 4pc package
    // measures -21.18 on this gear; crediting it would demote the row below its
    // own honest delta.
    expect(
      packageSetPotentialDps({
        deltaDps: -110.9,
        setContext: pkg({ package: { ...pkg().package, deltaDps: -21.18 } }),
      })
    ).toBe(-110.9);
    expect(
      packageSetPotentialDps({
        deltaDps: 5,
        setContext: pkg({ package: { ...pkg().package, deltaDps: 0 } }),
      })
    ).toBe(5);
  });

  it("falls back to deltaDps with no package on the context", () => {
    const bare = pkg();
    delete (bare as { package?: unknown }).package;
    expect(packageSetPotentialDps({ deltaDps: 5, setContext: bare })).toBe(5);
    expect(packageSetPotentialDps({ deltaDps: 5 })).toBe(5);
  });

  it("does not suppress a package whose bonusDps split is confounded", () => {
    // Ticket 90 suppresses `bonusDps` — the DERIVED `packageDelta - Σ singles`
    // split, which carries the (k-1)·B inflation. `packageDeltaDps` is one
    // simmed measurement with the break's cost already inside it, so the
    // confound never lands on it and the suppression does not apply.
    const confounded = pkg({
      prospectiveBonusBreaks: [
        {
          setId: 640,
          setName: "Malorne Harness",
          threshold: 2,
          piecesBefore: 2,
          piecesAfter: 0,
        },
      ],
    });
    expect(
      packageSetPotentialDps({ deltaDps: -106.16, setContext: confounded })
    ).toBeCloseTo(64.07);
  });

  it("still credits a row whose own delta already beats the package", () => {
    // The package figure replaces the row's own value rather than maxing with
    // it, so the whole set of member rows sorts as one block — which is the
    // point of the view.
    expect(
      packageSetPotentialDps({ deltaDps: 23.29, setContext: pkg() })
    ).toBeCloseTo(64.07);
  });
});

describe("formatPackageMembershipLine", () => {
  const ctx = {
    setId: 676,
    setName: "Thunderheart Harness",
    piecesWornBefore: 0,
    piecesAfterSwap: 1,
    nextThreshold: 2 as const,
    crossesThreshold: false,
    package: {
      threshold: 4 as const,
      deltaDps: 64.07,
      itemIds: [31048, 31042, 31034, 31044],
      piecesNeeded: 4,
    },
  };

  it("states the package figure and keeps the row's own swap visible", () => {
    const line = formatPackageMembershipLine({
      deltaDps: -106.16,
      setContext: ctx,
    });
    expect(line).toBeDefined();
    expect(line).toContain("this swap alone: -106.16");
    expect(line).toContain("part of 4pc package: +64.07");
    expect(line).toContain("Thunderheart Harness");
  });

  it("labels the figure as the whole package, never as this piece's share", () => {
    // Spec §2.1 is unchanged: no per-piece split exists. Every member row shows
    // the same number, so the wording has to say it is the package's.
    const line = formatPackageMembershipLine({
      deltaDps: 21.75,
      setContext: ctx,
    })!;
    expect(line).toContain("whole package");
    expect(line).not.toContain("share");
  });

  it("discloses that the figure holds the current gem policy fixed", () => {
    // Ticket 103: packageDeltaDps reads ~30 DPS conservative against a
    // re-gemmed wowsims run (+64.07 vs +97 reported), because the package is
    // assembled with the same sequential gem policy single swaps use. Not
    // fixed here; disclosed where the figure is shown.
    const line = formatPackageMembershipLine({
      deltaDps: -106.16,
      setContext: ctx,
    })!;
    expect(line).toContain("re-gemming");
  });

  it("is absent when there is no positive package to describe", () => {
    expect(formatPackageMembershipLine({ deltaDps: 5 })).toBeUndefined();
    expect(
      formatPackageMembershipLine({
        deltaDps: 5,
        setContext: { ...ctx, package: { ...ctx.package, deltaDps: -21.18 } },
      })
    ).toBeUndefined();
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

describe("package mode (in-browser toggle, owner decision 2026-08-10)", () => {
  const pkgContext = {
    setId: 676,
    setName: "Thunderheart Harness",
    piecesWornBefore: 0,
    piecesAfterSwap: 1,
    nextThreshold: 2 as const,
    crossesThreshold: false,
    prospectiveBonusDps: 31.46,
    package: {
      threshold: 4 as const,
      deltaDps: 64.07,
      itemIds: [31048, 31042, 31034, 31044],
      piecesNeeded: 4,
    },
  };

  const shoulders = item({
    name: "Thunderheart Pauldrons",
    slot: "shoulder",
    itemId: 31048,
    deltaDps: -106.16,
    setContext: pkgContext,
  });
  // A plain row that outranks the shoulders by delta but is beaten by the
  // package figure — the pair that proves the toggle actually reorders.
  const plain = item({
    name: "Plain shoulders",
    slot: "shoulder",
    itemId: 999,
    deltaDps: 30,
    belowCutoff: false,
  });

  const meta: RankReportMeta = {
    character: "c",
    realm: "r",
    region: "US",
    spec: "feral",
    maxPhase: 3,
    poolSize: 2,
    generatedAt: "now",
  };

  it("embeds both orders as data, so the toggle needs no shell re-run", () => {
    // The delivery shape from `.scratch/handoffs/set-potential-weighted-toggle
    // -scope-miss.md`: both sort keys ride on the row at generation time and
    // the browser re-sorts DOM it already has.
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain('data-delta="-106.16"');
    expect(html).toContain('data-package="64.07"');
    // The unaffected row carries its own delta under both keys, so a sort on
    // either attribute is total over every row.
    expect(html).toContain('data-package="30"');
  });

  it("offers package as a fourth radio in the existing set-weight control", () => {
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain('type="radio" name="set-weight" value="package"');
    expect(html).toContain(
      'type="radio" name="set-weight" value="off" checked'
    );
  });

  it("ships the client-side script that re-sorts on the package key", () => {
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain("<script>");
    expect(html).toContain("data-package");
    // No shell re-run: the script sorts children already in the DOM.
    expect(html).toContain("appendChild");
  });

  it("shows the package framing on the row with its own swap delta", () => {
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain("this swap alone: -106.16");
    expect(html).toContain("part of 4pc package: +64.07");
  });

  it("offers the control when only the package figure would move a row", () => {
    // A member row with no prospective bonus at all still moves under package
    // mode, so availability cannot be gated on the weighted/full credits.
    const bonusless = { ...pkgContext };
    delete (bonusless as { prospectiveBonusDps?: number }).prospectiveBonusDps;
    const html = renderRankHtml(
      ranking([item({ ...shoulders, setContext: bonusless })]),
      meta
    );
    expect(html).toContain('type="radio" name="set-weight" value="package"');
  });

  /**
   * Carry-forward 104. `weighted` and `full` have the same shape as `package`
   * and predate it, so `5b7ee96`'s fix applies to all three: the DPS column
   * switches to a credited figure while `.pct` keeps showing `deltaPct` from
   * the row's own swap. No percentage was measured for any credited mode —
   * `prospectiveBonusDps` is absolute DPS and the weights scale DPS, not a
   * ratio — so showing none beats deriving one the pipeline never computed.
   */
  it("hides the row's own percentage under every credited mode", () => {
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain(
      "body.weighted .pct, body.full .pct, body.package .pct { display: none; }"
    );
  });

  it("leaves the default order and the cutoff untouched", () => {
    // Default view (toggle off) is exactly today's: the row renders muted from
    // its own `belowCutoff`, and the plain +30 row precedes it in the DOM.
    const html = renderRankHtml(ranking([shoulders, plain]), meta);
    expect(html).toContain('class="row muted"');
    expect(html.indexOf("Plain shoulders")).toBeLessThan(
      html.indexOf("Thunderheart Pauldrons")
    );
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

describe("curated ranked list chips", () => {
  const meta: RankReportMeta = {
    character: "c",
    realm: "r",
    region: "US",
    spec: "feral",
    maxPhase: 3,
    poolSize: 2,
    generatedAt: "now",
  };

  const chipItems = [
    item({
      name: "First",
      slot: "head",
      deltaDps: 20,
      itemId: 41,
      rank: 1,
      belowCutoff: false,
      source: { kind: "raid", zone: "Black Temple", boss: "Illidan" },
    }),
    item({
      name: "Third overall",
      slot: "waist",
      deltaDps: 10,
      itemId: 42,
      rank: 7,
      belowCutoff: false,
      source: { kind: "raid", zone: "Karazhan", boss: "Prince" },
    }),
  ];

  it("carries the absolute rank separately from the rendered position", () => {
    // The position itself is written by the script, so the served markup has
    // an empty `.pos` and the absolute rank alongside it — never the absolute
    // rank *as* the position, which is what it used to render.
    const html = renderRankHtml(ranking(chipItems), meta);
    expect(html).toContain('data-abs-rank="#7"');
    expect(html).toContain('<span class="pos"></span>');
    expect(html).toContain('<span class="abs">#7</span>');
  });

  it("explains the absolute rank in the chip's tooltip", () => {
    const html = renderRankHtml(ranking(chipItems), meta);
    expect(html).toContain('title="#7 of every candidate simmed"');
  });

  it("does not renumber RankedItem.rank itself (§12)", () => {
    // §12 forbids renumbering `rank` inside a filter. The row in the slot
    // section still shows the absolute rank; only the chip shows position.
    const html = renderRankHtml(ranking(chipItems), meta);
    // `soft-rank` rides along when |delta| < stdev, so match the rank span
    // without pinning that unrelated class.
    expect(html).toMatch(/<span class="rank[^"]*">#7<\/span>/);
  });

  it("names an unranked chip's tooltip rather than emitting #null", () => {
    const html = renderRankHtml(
      ranking([
        item({
          name: "Unranked",
          slot: "head",
          deltaDps: 5,
          itemId: 43,
          belowCutoff: false,
          source: { kind: "raid", zone: "Karazhan" },
        }),
      ]),
      meta
    );
    expect(html).toContain('title="not ranked overall"');
    expect(html).toContain('data-abs-rank=""');
    expect(html).not.toContain("#null");
  });

  it("gives each strip its own live counter element", () => {
    const html = renderRankHtml(ranking(chipItems), meta);
    expect(html).toContain(
      '<h2>Curated ranked list <span class="list-count"></span></h2>'
    );
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

  /**
   * The export's payload is the *ranked order*, because it is pasted into
   * thatsmybis as an upgrade priority list. It read
   * `document.querySelectorAll("article.row")` — the per-slot detail rows in
   * document order — so it emitted every visible row grouped slot by slot and
   * never reflected the curated list's global cross-slot order. On the
   * shredzepelin P3 report that was 407 ids starting from a below-cutoff row,
   * against a 36-chip curated list.
   */
  it("builds the export from the curated chips, not the slot rows", () => {
    const html = renderRankHtml(ranking([karaDrop]), meta);
    // The export is handed the chips the strip pass just collected, and the
    // slot rows are no longer gathered for it at all.
    expect(html).toContain("updateExport(exportChips)");
    expect(html).toContain("exportChips.push(c)");
    expect(html).not.toContain("var visibleRows");
  });

  /**
   * Strips are read in document order (raid, then PvP), which the caption has
   * to say — the two strips renumber from 1 independently on screen, so a
   * reader seeing "1" twice needs to know which one the export leads with.
   */
  it("says what the export is and how strips concatenate", () => {
    const html = renderRankHtml(ranking([karaDrop]), meta);
    expect(html).toContain("the curated list, top to bottom");
    expect(html).toContain("as currently filtered and sorted");
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

  /**
   * Every stage `assemble_universe.py` can emit must resolve. A label the map
   * does not know returns null, which makes `bisStale` false and silently
   * withholds the "no curated set is pinned for PN" warning — it fails in the
   * direction that looks correct (carry-forward 102).
   */
  it("resolves every stage the Python source can label", () => {
    expect(curatedSetPhase("p3")).toBe(3);
    expect(curatedSetPhase("p3_9p")).toBe(3);
  });

  it("is null for a label it does not recognise", () => {
    expect(curatedSetPhase("p9")).toBeNull();
    expect(curatedSetPhase("")).toBeNull();
  });
});

describe("set potential (§4)", () => {
  it("renders the panel with the toggle off — disclosure is not gated on the ranking change", () => {
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
    expect(html).toContain("Set potential (1)");
    expect(html).toContain("Justicar Battlegear");
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
    expect(html).toContain("Thunderheart Harness 4pc — 0 worn");
    expect(html).toContain("+91.68 DPS");
    expect(html).toContain("completion-package synergy");
  });

  /**
   * Ticket 91's user-facing fix. With 0 pieces worn and an implemented 2pc, the
   * 4pc bonus reaches no row in any display mode (`off`, `weighted`, `full`) —
   * the walk stops at 2. The Set potential panel is where it stays visible, so
   * the panel must carry both thresholds and name what completes each.
   */
  it("shows a 4pc bonus no row can carry, for a set worn 0 pieces of", () => {
    const html = renderRankHtml(
      {
        ...rankingWithPvpWeaponAboveCutoff(),
        setBonuses: [
          {
            setId: 676,
            setName: "Thunderheart Harness",
            threshold: 2,
            piecesWorn: 0,
            packageItemIds: [31034, 31044],
            packageDeltaDps: 76.5,
            bonusDps: 31.46,
          },
          {
            setId: 676,
            setName: "Thunderheart Harness",
            threshold: 4,
            piecesWorn: 0,
            packageItemIds: [31048, 31042, 31034, 31044],
            packageDeltaDps: 64.07,
            bonusDps: 193.89,
            breaks: [
              {
                setId: 640,
                setName: "Malorne Harness",
                threshold: 2,
                piecesBefore: 2,
                piecesAfter: 0,
              },
            ],
          },
        ],
      },
      { ...meta(), view: { withSetPotential: true } }
    );

    expect(html).toContain("Set potential (2)");
    expect(html).toContain("Thunderheart Harness 4pc — 0 worn");
    expect(html).toContain("193.89");
    // The four items that complete it — the actionable part a per-row number
    // was failing to convey.
    expect(html).toContain("Thunderheart Pauldrons");
    expect(html).toContain("Thunderheart Chestguard");
    // And the figure stays qualified by what completing it would break.
    expect(html).toContain("Malorne Harness 2pc");
  });

  /**
   * Carry-forward 96. A curated-BiS row can rank far below cutoff as a single
   * swap and still be genuinely BiS as part of a completed package — both
   * figures are correct, and the row shows them side by side with no
   * reconciliation. The Set potential panel holds the explanation; this is the
   * pointer from the row to it. A pointer, never a recomputed number.
   */
  it("points a below-cutoff curated row at the panel that reconciles its BiS tag", () => {
    const html = renderRankHtml(
      {
        ...ranking([
          item({
            rank: 40,
            name: "Thunderheart Chestguard",
            slot: "chest",
            deltaDps: -100.16,
            belowCutoff: true,
            bisTags: ["BiS"],
            setBonusNote: "breaks 2-piece Malorne Harness (below 2)",
            setContext: {
              setId: 676,
              setName: "Thunderheart Harness",
              piecesWornBefore: 0,
              piecesAfterSwap: 1,
              nextThreshold: 2,
              crossesThreshold: false,
              prospectiveBonusDps: 31.46,
            },
          }),
        ]),
        setBonuses: [
          {
            setId: 676,
            setName: "Thunderheart Harness",
            threshold: 4,
            piecesWorn: 0,
            packageItemIds: [31048, 31042, 31034, 31044],
            packageDeltaDps: 64.07,
            bonusDps: 193.89,
          },
        ],
      },
      meta()
    );

    expect(html).toContain("BiS as part of Thunderheart Harness");
    expect(html).toContain("Set potential");
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

/**
 * The Set potential surfaces grew across five commits and read as accreted
 * clauses: a panel entry was one em-dash chain whose order fell out of the
 * order the parts were added, and a member row hung three loose divs off the
 * body with nothing saying they were one subject.
 *
 * These tests pin the *organisation*, not the numbers. Every figure and every
 * qualifier that was disclosed before is still disclosed — the no-information-
 * loss assertions below are the guard on that.
 */
/**
 * The curated ranked list is the report's shopping-list area, and package mode
 * exists to organise it. It could not: chips are rendered from
 * `partitionShortlist`, which keeps only above-cutoff rows, so a package-
 * positive member that is a downgrade as a single swap (31048, 31042) had no
 * chip element at all and the client script had nothing to re-sort into view.
 *
 * The fix is render-but-hide, at the owner's direction (ADR-0024 amendment):
 * these chips exist in every document and are visible only under package mode.
 * Cutoff data is untouched — this is admission into a presentation area, the
 * same re-sort-not-repartition principle ADR-0024 already applies to rows.
 */
describe("curated list under package mode (owner direction 2026-08-10)", () => {
  function t6Ranking(): Ranking {
    const pkg = {
      threshold: 4 as const,
      deltaDps: 64.07,
      piecesNeeded: 4,
      itemIds: [31048, 31042, 31034, 31044],
    };
    const ctx = (piecesAfterSwap: number) => ({
      setId: 676,
      setName: "Thunderheart Harness",
      piecesWornBefore: 0,
      piecesAfterSwap,
      nextThreshold: 2 as const,
      crossesThreshold: false,
      prospectiveBonusDps: 31.46,
      package: pkg,
    });
    return ranking([
      item({
        rank: 1,
        itemId: 999,
        name: "Plain Upgrade",
        slot: "neck",
        deltaDps: 30,
        belowCutoff: false,
      }),
      item({
        itemId: 31048,
        name: "Thunderheart Pauldrons",
        slot: "shoulder",
        deltaDps: -106.16,
        belowCutoff: true,
        bisTags: ["BiS"],
        setContext: ctx(1),
      }),
      item({
        itemId: 31042,
        name: "Thunderheart Chestguard",
        slot: "chest",
        deltaDps: -100.16,
        belowCutoff: true,
        bisTags: ["BiS"],
        setContext: ctx(1),
      }),
    ]);
  }

  it("renders chips for package-positive members that miss the cutoff", () => {
    const html = renderRankHtml(t6Ranking(), meta());
    for (const id of [31048, 31042]) {
      const chip = new RegExp(
        `<a class="chip[^"]*"[^>]*data-item-id="${id}"[^>]*>`
      ).exec(html);
      expect(chip, `chip for ${id}`).not.toBeNull();
      // Carries the package figure the client sorts on, and is marked so CSS
      // can keep it out of every mode that did not ask for it.
      expect(chip?.[0]).toContain('data-package="64.07"');
      expect(chip?.[0]).toContain("package-only");
    }
  });

  /**
   * The other three modes must stay byte-identical to today, which is what
   * "hidden by default" has to mean here — the chips exist in the document but
   * no mode except `package` shows them.
   */
  it("hides those chips outside package mode", () => {
    const html = renderRankHtml(t6Ranking(), meta());
    expect(html).toContain(".chip.package-only { display: none; }");
    expect(html).toContain(
      "body.package .chip.package-only { display: inline-flex; }"
    );
  });

  /**
   * The admitted chips must not disturb the list the report has always shown:
   * a package member that already cleared the cutoff keeps its ordinary chip,
   * and the above-cutoff chips keep their generation-time order.
   */
  it("leaves the above-cutoff chip list unchanged", () => {
    const html = renderRankHtml(t6Ranking(), meta());
    const chips = [...html.matchAll(/<a class="chip([^"]*)"[^>]*>/g)];
    const ordinary = chips.filter((c) => !c[1]?.includes("package-only"));
    expect(ordinary).toHaveLength(1);
  });

  /** BiS-only must not strand them: 31042/31048 carry BiS tags. */
  it("keeps them in the BiS-only filter", () => {
    const html = renderRankHtml(t6Ranking(), meta());
    const chip = /<a class="chip[^"]*"[^>]*data-item-id="31048"[^>]*>/.exec(
      html
    );
    expect(chip?.[0]).toContain("is-bis");
  });
});

describe("Set potential presentation (grouping and order)", () => {
  const thunderheart = {
    setId: 676,
    setName: "Thunderheart Harness",
    threshold: 4 as const,
    piecesWorn: 0,
    packageItemIds: [31048, 31042, 31034, 31044],
    packageDeltaDps: 64.07,
    bonusDps: 193.89,
    breaks: [
      {
        setId: 640,
        setName: "Malorne Harness",
        threshold: 2 as const,
        piecesBefore: 2,
        piecesAfter: 0,
      },
    ],
  };

  /**
   * One consistent order for every entry, so a reader scanning the panel finds
   * the same fact in the same place in each: what the set is, the bonus figure,
   * the package figure, what completes it, then the qualifiers that constrain
   * both figures.
   */
  it("orders a panel entry: bonus, package, contents, then qualifiers", () => {
    const parts = setBonusEntry(thunderheart);
    expect(parts.heading).toBe("Thunderheart Harness 4pc — 0 worn");
    expect(parts.lines.map((l) => l.kind)).toEqual([
      "bonus",
      "package",
      "contents",
      "qualifier",
      "qualifier",
    ]);
  });

  /** No information loss: every figure and caveat the flat line carried. */
  it("keeps every figure and qualifier the accreted line disclosed", () => {
    const text = [
      setBonusEntry(thunderheart).heading,
      ...setBonusEntry(thunderheart).lines.map((l) => l.text),
    ].join("\n");
    expect(text).toContain("+193.89 DPS");
    expect(text).toContain("+64.07 DPS");
    expect(text).toContain("Thunderheart Pauldrons");
    expect(text).toContain("Thunderheart Leggings");
    expect(text).toContain("Malorne Harness 2pc");
    expect(text).toContain("inflated");
    expect(text).toContain(GEM_POLICY_QUALIFIER);
  });

  /**
   * An unmeasured bonus has no package sim and nothing to chase, so it stays a
   * bare reason rather than acquiring empty package and contents rows.
   */
  it("renders an unmeasured entry as a reason alone", () => {
    const parts = setBonusEntry({
      setId: 641,
      setName: "Nordrassil Harness",
      threshold: 2,
      piecesWorn: 0,
      packageItemIds: [],
      packageDeltaDps: 0,
      unmeasured: "not-implemented-in-sim",
    });
    expect(parts.lines.map((l) => l.kind)).toEqual(["bonus"]);
    expect(parts.lines[0]?.text).toBe("not implemented in the pinned sim");
  });

  /**
   * The row's own delta stays primary. The set clauses become one labelled
   * block instead of three sibling divs, so the reader sees one secondary
   * subject rather than three unrelated sentences competing with the name.
   */
  it("groups a row's set clauses into one block", () => {
    const html = renderRankHtml(
      ranking([
        item({
          itemId: 31048,
          name: "Thunderheart Pauldrons",
          slot: "shoulder",
          deltaDps: -106.16,
          belowCutoff: true,
          bisTags: ["BiS"],
          setBonusNote: "breaks 2-piece Malorne Harness (below 2)",
          setContext: {
            setId: 676,
            setName: "Thunderheart Harness",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 2,
            crossesThreshold: false,
            prospectiveBonusDps: 31.46,
            package: {
              threshold: 4,
              deltaDps: 64.07,
              piecesNeeded: 4,
              itemIds: [31048, 31042, 31034, 31044],
            },
          },
        }),
      ]),
      { ...meta(), view: { withSetPotential: true } }
    );
    const block = /<div class="set-info">([\s\S]*?)<\/div>\s*<\/div>/.exec(
      html
    );
    expect(block).not.toBeNull();
    const inner = block?.[1] ?? "";
    expect(inner).toContain("Thunderheart Harness");
    expect(inner).toContain("31.46");
    expect(inner).toContain("64.07");
    // The row's own figure stays in the numbers column, not inside the block.
    expect(html).toContain('class="delta down delta-plain">-106.16');
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
