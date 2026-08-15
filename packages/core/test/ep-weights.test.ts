import { describe, expect, it } from "vitest";
import { resolveEpWeightsPath } from "../src/ep-weights.js";

// Same fixture shape as data/presets/ep-weights-by-phase.json, kept inline
// so this test does not depend on the committed file's current content.
const mapping = {
  ret: {
    fallback: "data/presets/ret/p2.ep-weights.json",
    byPhase: { "3": "data/presets/ret/p3.ep-weights.json" },
  },
  feral: {
    fallback: "data/presets/feral/p1.ep-weights.json",
    byPhase: {},
  },
};

describe("resolveEpWeightsPath", () => {
  it("falls back to p2 weights below p3 for ret", () => {
    expect(resolveEpWeightsPath(mapping, "ret", 1)).toBe(
      "data/presets/ret/p2.ep-weights.json"
    );
    expect(resolveEpWeightsPath(mapping, "ret", 2)).toBe(
      "data/presets/ret/p2.ep-weights.json"
    );
  });

  it("picks p3 weights at exactly p3 for ret", () => {
    expect(resolveEpWeightsPath(mapping, "ret", 3)).toBe(
      "data/presets/ret/p3.ep-weights.json"
    );
  });

  it("keeps resolving to p3 weights for ret at p4 and p5 (highest key <= maxPhase)", () => {
    expect(resolveEpWeightsPath(mapping, "ret", 4)).toBe(
      "data/presets/ret/p3.ep-weights.json"
    );
    expect(resolveEpWeightsPath(mapping, "ret", 5)).toBe(
      "data/presets/ret/p3.ep-weights.json"
    );
  });

  it("always resolves feral to its single fallback file (empty byPhase)", () => {
    for (const phase of [1, 2, 3, 4, 5] as const) {
      expect(resolveEpWeightsPath(mapping, "feral", phase)).toBe(
        "data/presets/feral/p1.ep-weights.json"
      );
    }
  });

  it("throws for a spec with no mapping entry", () => {
    expect(() => resolveEpWeightsPath(mapping, "unknown" as never, 3)).toThrow(
      /no EP-weights mapping/
    );
  });
});
