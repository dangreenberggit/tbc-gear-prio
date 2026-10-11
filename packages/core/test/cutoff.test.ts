import { describe, expect, it } from "vitest";
import { CUTOFF, meetsCutoff, setBonusNoiseFloorDps } from "../src/cutoff.js";

describe("the cutoff (ADR-0037)", () => {
  it("is one flat 3 DPS bar with no percentage rule", () => {
    // Owner ruling 2026-10-11: "Just do 3 DPS then fuck it".
    expect(CUTOFF).toEqual({ absDps: 3 });
  });

  it("admits a row at or above 3 DPS and nothing below it", () => {
    expect(meetsCutoff(3, CUTOFF)).toBe(true);
    expect(meetsCutoff(3.3, CUTOFF)).toBe(true);
    expect(meetsCutoff(2.99, CUTOFF)).toBe(false);
  });

  it("no longer admits a row by its percentage of baseline", () => {
    // Under the old OR rule a row at +2.9 on a 1500 DPS baseline is 0.19%,
    // above the old 0.15% bar, so it cleared by percentage alone. It must
    // now stay below the cutoff: the bar reads only the DPS change.
    expect(meetsCutoff(2.9, CUTOFF)).toBe(false);
  });
});

describe("setBonusNoiseFloorDps (332)", () => {
  it("is √2 × the 3 DPS bar", () => {
    // A prospective set bonus folds two measured deltas, so its combined 2×SE
    // bar is √2 larger than the single-delta bar. The expected value uses the
    // literal 3, not `CUTOFF.absDps`, so a change to either the bar or the
    // derivation turns this red.
    expect(setBonusNoiseFloorDps(CUTOFF)).toBe(Math.SQRT2 * 3);
  });
});
