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
  // `meetsCutoff` takes no percentage, so the guard against the removed
  // percentage rule is a recorded row, not a unit case: ret item 29997 cleared
  // only by percentage before ADR-0037 and must stay out of the ret set that
  // full-sweep-recall.test.ts checks.
});

describe("setBonusNoiseFloorDps (332)", () => {
  it("is √2 × the 3 DPS bar", () => {
    // A 2pc prospective bonus folds four sims, so its noise is about √2 × a
    // single delta's, and the floor scales the single-delta bar by √2. The
    // 3 DPS bar is a rough cut, not 2 × SE (ADR-0037). The expected value uses
    // the literal 3, not `CUTOFF.absDps`, so a change to either the bar or the
    // derivation turns this red.
    expect(setBonusNoiseFloorDps(CUTOFF)).toBe(Math.SQRT2 * 3);
  });
});
