import { describe, expect, it } from "vitest";
import {
  epWeightsPhaseNote,
  resolveEpWeights,
  resolveEpWeightsPath,
} from "../src/ep-weights.js";

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

describe("resolveEpWeights disclosure", () => {
  it("reports the phase the chosen weights were written for", () => {
    const got = resolveEpWeights(mapping, "ret", 3);
    expect(got.path).toBe("data/presets/ret/p3.ep-weights.json");
    expect(got.weightsPhase).toBe(3);
    expect(got.requestedPhase).toBe(3);
  });

  it("reports a mismatch rather than silently absorbing it", () => {
    // Ret's p3 weights are the highest at or below p5, so a p5 run is scored
    // by p3-era weights. That is the shipped behaviour and it is defensible --
    // EP drives only the prefilter and gem fill -- but it must be visible.
    const got = resolveEpWeights(mapping, "ret", 5);
    expect(got.weightsPhase).toBe(3);
    expect(got.requestedPhase).toBe(5);
    expect(got.weightsPhase).not.toBe(got.requestedPhase);
    expect(epWeightsPhaseNote(got)).toBe("EP weights: P3 (requested: P5)");
  });

  it("marks an unphased fallback as unphased instead of guessing a phase", () => {
    // Feral's byPhase is empty, so every phase resolves to the fallback. The
    // file is not a claim about any phase, so weightsPhase must be undefined
    // rather than being back-filled with the requested one.
    const got = resolveEpWeights(mapping, "feral", 5);
    expect(got.weightsPhase).toBeUndefined();
    expect(epWeightsPhaseNote(got)).toBe(
      "EP weights: unphased default (requested: P5)"
    );
  });

  it("says nothing when the weights match the requested phase", () => {
    expect(
      epWeightsPhaseNote(resolveEpWeights(mapping, "ret", 3))
    ).toBeUndefined();
  });

  it("keeps resolveEpWeightsPath agreeing with resolveEpWeights", () => {
    for (const phase of [1, 2, 3, 4, 5] as const) {
      for (const spec of ["ret", "feral"] as const) {
        expect(resolveEpWeightsPath(mapping, spec, phase)).toBe(
          resolveEpWeights(mapping, spec, phase).path
        );
      }
    }
  });
});
