import { describe, expect, it } from "vitest";
import {
  DegenerateSeedsError,
  PAIRED_REPLICATE_TOP_N,
  assertUsableSeeds,
  pairedReplicateSe,
  usesPairedReplication,
} from "../src/se.js";

describe("pairedReplicateSe", () => {
  it("is sd(deltas) / sqrt(n) over the paired deltas", () => {
    // sd (sample, n-1) of [10, 12, 14, 16, 18] is 3.1622776601683795.
    const se = pairedReplicateSe([10, 12, 14, 16, 18]);
    expect(se).toBeCloseTo(3.1622776601683795 / Math.sqrt(5), 12);
  });

  it("returns 0 for deltas that genuinely agree", () => {
    expect(pairedReplicateSe([7, 7, 7, 7, 7])).toBe(0);
  });

  it("needs at least two deltas to have a spread at all", () => {
    expect(() => pairedReplicateSe([4])).toThrow(/at least two/i);
  });
});

describe("assertUsableSeeds", () => {
  it("accepts distinct seeds", () => {
    expect(() => assertUsableSeeds([11, 22, 33, 44, 55])).not.toThrow();
  });

  it("accepts a single seed — that is the independent-SE path, not replication", () => {
    expect(() => assertUsableSeeds([42])).not.toThrow();
  });

  /**
   * The failure this guards is the whole reason the function exists: a shared
   * seed repeats bit-identical, so five copies of 42 yield sd = 0 and an SE of
   * zero that looks like a precise measurement and is an artifact (§10).
   */
  it("rejects repeated seeds, naming the degenerate value", () => {
    expect(() => assertUsableSeeds([42, 42, 42, 42, 42])).toThrow(
      DegenerateSeedsError
    );
    expect(() => assertUsableSeeds([42, 42, 42, 42, 42])).toThrow(/42/);
  });

  it("rejects a partial repeat too — one duplicate already flattens the spread", () => {
    expect(() => assertUsableSeeds([11, 22, 22, 44, 55])).toThrow(
      DegenerateSeedsError
    );
  });
});

describe("usesPairedReplication", () => {
  it("is off for the default single seed", () => {
    expect(usesPairedReplication([42])).toBe(false);
  });

  it("is on once RankInput.seeds carries more than one", () => {
    expect(usesPairedReplication([11, 22, 33, 44, 55])).toBe(true);
  });

  it("is off for an empty list rather than throwing", () => {
    expect(usesPairedReplication([])).toBe(false);
  });
});

describe("PAIRED_REPLICATE_TOP_N", () => {
  it("pins §10's 'top ~8 items only'", () => {
    expect(PAIRED_REPLICATE_TOP_N).toBe(8);
  });
});
