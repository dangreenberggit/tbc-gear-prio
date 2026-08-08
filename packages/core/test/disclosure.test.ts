import { describe, expect, it } from "vitest";
import { HIT_CAP_RATING, HIT_CAP_UNCERTAINTY } from "../src/caps.js";
import {
  buildStandingAssumptions,
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
    expect(line).not.toContain("talents");
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
