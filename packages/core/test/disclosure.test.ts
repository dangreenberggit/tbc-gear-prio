import { describe, expect, it } from "vitest";
import {
  buildStandingAssumptions,
  substitutionsFromMetaRepair,
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
