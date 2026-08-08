import { describe, expect, it } from "vitest";
import { HIT_CAP_RATING, HIT_CAP_UNCERTAINTY } from "../src/caps.js";
import {
  buildStandingAssumptions,
  fightProvenanceLines,
  hitCapBanner,
  renderDisclosure,
  substitutionsFromMetaRepair,
  type Substitution,
} from "../src/disclosure.js";

describe("disclosure", () => {
  it("always includes weapon-imbue-omitted among standing assumptions", () => {
    const standing = buildStandingAssumptions("RaceHuman");
    expect(standing.map((s) => s.id)).toContain("weapon-imbue-omitted");
  });

  it("records meta repair swaps as a run substitution", () => {
    expect(
      substitutionsFromMetaRepair([
        {
          itemId: 1,
          socketIndex: 0,
          from: 10,
          to: 20,
          cost: 1.5,
        },
      ])
    ).toEqual([
      {
        field: "gems.meta-repair",
        detail:
          "Meta inactive — repaired with 1 min-EP gem swap(s): 10→20@item 1.",
      },
    ]);
    expect(substitutionsFromMetaRepair([])).toEqual([]);
  });
});

const STANDING = buildStandingAssumptions("RaceBloodElf");

function subs(n: number): Substitution[] {
  return Array.from({ length: n }, (_, i) => ({
    field: `field-${i}`,
    detail: `detail ${i}`,
  }));
}

describe("hitCapBanner", () => {
  it("never states a precise figure (§4 (R8))", () => {
    const line = hitCapBanner({
      rating: 72,
      gap: HIT_CAP_RATING - 72,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).toMatch(/^~70 rating under the hit cap/);
    // The exact gap is 69.92… — it must not be quoted to the decimal.
    expect(line).not.toContain("69.9");
  });

  it("names the Heroic Presence uncertainty rather than hiding it", () => {
    const line = hitCapBanner({
      rating: 72,
      gap: 69.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).toContain("Heroic Presence");
    expect(line).toContain("16");
  });

  it("states which way the error runs instead of a symmetric band", () => {
    // Heroic Presence is one-sided: unreadable from WCL, and it only ever
    // lowers the cap. A "±16" reads as noise that might push either way,
    // which overstates the shortfall while looking careful.
    const line = hitCapBanner({
      rating: 72,
      gap: 69.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).not.toContain("±");
    expect(line).toContain("smaller");
  });

  it("no longer claims talents go uncounted, now that capStateFrom folds them in", () => {
    // carry-forward 33: hit.rating/hit.gap already include talent-granted hit
    // where capStateFrom was given a recognised talentsString/spec, so a
    // banner built from those numbers must not tell the reader talents are
    // still missing — that was true before the fix and is not true after.
    const line = hitCapBanner({
      rating: 119,
      gap: 22.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).not.toContain("gear alone");
    expect(line).not.toContain("not counted");
  });

  it("says the talent hit it counted was assumed, not read from the character", () => {
    // carry-forward 60: capStateFrom reads `talentsString` off the *composed
    // request*, which compose never writes from the log — so it is always the
    // pinned preset's 3/3 Precision, for every ret character. That is a
    // defensible default (a raiding ret paladin almost always takes it) but
    // the reader must be told it is a default rather than their build.
    const line = hitCapBanner({
      rating: 119,
      gap: 22.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
      talentHitAssumed: { talent: "Precision", points: 3, maxPoints: 3 },
    });
    expect(line).toContain("Precision");
    expect(line).toContain("3/3");
    expect(line).toMatch(/assum/i);
  });

  it("drops the assumption clause when no talent hit was folded in", () => {
    // Feral has no mapped hit talent, so nothing was assumed and the banner
    // must not invent a caveat about one.
    const line = hitCapBanner({
      rating: 119,
      gap: 22.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).not.toContain("Precision");
    expect(line).not.toMatch(/assum/i);
  });

  it("drops the over-cap floor once talent hit is only assumed", () => {
    // carry-forward 60. NOTE the negative gap: "you are over by at least
    // this much" lives on the OVER-cap branch, so a positive gap would take
    // the under-cap return and pass this without exercising the change.
    const over = { rating: 152, gap: -10, capUncertainty: HIT_CAP_UNCERTAINTY };
    const assumed = {
      ...over,
      talentHitAssumed: { talent: "Precision", points: 3, maxPoints: 3 },
    };

    expect(hitCapBanner(over)).toContain("at least this much");
    expect(hitCapBanner(assumed)).not.toContain("at least this much");
  });

  it("does not promise the under-cap shortfall shrinks when talents were assumed", () => {
    // The direction claim is the whole point of the banner. Heroic Presence
    // alone can only shrink the shortfall, but an assumed 3/3 Precision can
    // *inflate* the rating for someone who skipped it, making the real
    // shortfall larger — so "smaller" would be wrong in the one direction
    // this disclosure exists to get right.
    const under = {
      rating: 119,
      gap: 22.92,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    };

    expect(hitCapBanner(under)).toContain("smaller");
    const assumedLine = hitCapBanner({
      ...under,
      talentHitAssumed: { talent: "Precision", points: 3, maxPoints: 3 },
    });
    expect(assumedLine).not.toContain("smaller");
    expect(assumedLine).toContain("either way");
  });

  it("reads as over the cap when the gap is negative", () => {
    const line = hitCapBanner({
      rating: 160,
      gap: -18.08,
      capUncertainty: HIT_CAP_UNCERTAINTY,
    });
    expect(line).toContain("over the hit cap");
    expect(line).not.toContain("-18");
  });
});

describe("renderDisclosure", () => {
  it("collapses standing assumptions behind a count by default (§9 R7)", () => {
    const lines = renderDisclosure({ standing: STANDING, substitutions: [] });
    expect(lines).toEqual([
      "assumptions: 4 standing (--assumptions to expand)",
    ]);
    // Collapsed means the details are genuinely absent, not merely indented.
    expect(lines.join("\n")).not.toContain("Race assumed");
  });

  it("expands standing assumptions on request", () => {
    const lines = renderDisclosure({
      standing: STANDING,
      substitutions: [],
      expandStanding: true,
    });
    expect(lines[0]).toBe("assumptions (4):");
    expect(lines).toHaveLength(5);
    expect(lines.join("\n")).toContain("[race]");
  });

  it("expands five this-run substitutions, not zero", () => {
    // The ticket is explicit: build for a run that substituted five things.
    // A clean run is the easy case and proves nothing about the busy one.
    const lines = renderDisclosure({
      standing: STANDING,
      substitutions: subs(5),
    });
    expect(lines).toContain("substitutions this run (5):");
    for (let i = 0; i < 5; i++) {
      expect(lines.join("\n")).toContain(`field-${i}: detail ${i}`);
    }
  });

  it("says nothing about substitutions on a clean run", () => {
    const lines = renderDisclosure({ standing: STANDING, substitutions: [] });
    expect(lines.join("\n")).not.toContain("substitutions");
  });

  it("keeps the two tiers distinguishable", () => {
    const lines = renderDisclosure({
      standing: STANDING,
      substitutions: subs(2),
    });
    const text = lines.join("\n");
    expect(text).toContain("standing");
    expect(text).toContain("this run");
  });
});

describe("fight provenance (ticket 06)", () => {
  const morogrim = {
    reportCode: "YwahQLgv2jBrZGn6",
    fightId: 39,
    encounterName: "Morogrim Tidewalker",
    route: "ranked" as const,
  };

  it("names the fight the gear came from even when nothing looks wrong", () => {
    // The whole point: an off-tank fight reached a user who had no way to see
    // which fight was read. Disclosure is unconditional, not a warning.
    const text = fightProvenanceLines({
      ...morogrim,
      confidence: 1,
      salvationUptime: 1,
    }).join("\n");
    expect(text).toContain("Morogrim Tidewalker");
    expect(text).toContain("39");
    expect(text).toContain("YwahQLgv2jBrZGn6");
  });

  it("flags a confident DPS parse that never had salvation", () => {
    const text = fightProvenanceLines({
      ...morogrim,
      confidence: 0.99,
      salvationUptime: 0,
    }).join("\n");
    expect(text).toMatch(/salvation/i);
  });

  it("asks rather than asserting off-tank, because the roster is unreadable", () => {
    // capture_fixture.py scopes the buffs table to one player, so "no paladin
    // in the raid" is indistinguishable from "stripped for tank duty".
    const text = fightProvenanceLines({
      ...morogrim,
      confidence: 0.99,
      salvationUptime: 0,
    }).join("\n");
    expect(text).toMatch(/paladin/i);
    expect(text).not.toMatch(/you were (the )?(off-?)?tank/i);
  });

  it("stays quiet about salvation on a clean cat parse that had it", () => {
    const text = fightProvenanceLines({
      ...morogrim,
      confidence: 0.99,
      salvationUptime: 1,
    }).join("\n");
    expect(text).not.toMatch(/salvation/i);
  });

  it("does not flag salvation on a fight that already reads as tank", () => {
    // A bear parse has no salv either; saying so adds nothing the low
    // confidence has not already said.
    const text = fightProvenanceLines({
      ...morogrim,
      encounterName: "Fathom-Lord Karathress",
      confidence: 0.69,
      salvationUptime: 0,
    }).join("\n");
    expect(text).not.toMatch(/salvation/i);
  });

  it("says nothing about salvation when it was never measured", () => {
    // Absent ≠ zero. The ret/report-events recordings carry no buff table.
    const text = fightProvenanceLines({
      ...morogrim,
      confidence: 1,
    }).join("\n");
    expect(text).not.toMatch(/salvation/i);
  });
});
