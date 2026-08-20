import { describe, expect, it } from "vitest";
import {
  DegenerateSeedsError,
  PAIRED_REPLICATE_TOP_N,
  assertUsableSeeds,
  pairedReplicateSe,
  replicateSeeds,
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

/**
 * Ticket 232. Upstream seeds iteration `i` from `RandomSeed + i`
 * (`vendor/tbc-new-fork/sim/core/sim.go:248-251`, called per iteration at
 * `:347-348`), so a run of `N` iterations from seed `S` consumes the streams
 * `S .. S+N-1`. Two seeds closer together than `N` therefore share streams and
 * are not independent replicates.
 */
describe("seed spacing (ticket 232)", () => {
  it("rejects seeds spaced closer than the iteration count", () => {
    // The seeds this project shipped, at the iteration count it shipped them
    // at: 11 and 22 share 2,989 of 3,000 streams.
    expect(() => assertUsableSeeds([11, 22, 33, 44, 55], 3000)).toThrow(
      DegenerateSeedsError
    );
  });

  it("names the offending pair and the spacing it needed", () => {
    expect(() => assertUsableSeeds([11, 22, 33, 44, 55], 3000)).toThrow(
      /11.*22|22.*11/
    );
    expect(() => assertUsableSeeds([11, 22, 33, 44, 55], 3000)).toThrow(/3000/);
  });

  it("accepts seeds spaced by exactly the iteration count", () => {
    expect(() =>
      assertUsableSeeds([11, 3011, 6011, 9011, 12011], 3000)
    ).not.toThrow();
  });

  it("ignores order — spacing is about distance, not sequence", () => {
    expect(() =>
      assertUsableSeeds([12011, 11, 9011, 3011, 6011], 3000)
    ).not.toThrow();
  });

  it("still rejects exact repeats when given an iteration count", () => {
    expect(() => assertUsableSeeds([42, 42], 3000)).toThrow(
      DegenerateSeedsError
    );
  });

  it("skips the spacing check when no iteration count is given", () => {
    // Callers that cannot know the iteration count keep the old contract.
    expect(() => assertUsableSeeds([11, 22, 33, 44, 55])).not.toThrow();
  });

  it("does not constrain a single seed — there is no pair to overlap", () => {
    expect(() => assertUsableSeeds([11], 3000)).not.toThrow();
  });
});

describe("replicateSeeds (ticket 232)", () => {
  it("spaces seeds by the iteration count, so they never share streams", () => {
    expect(replicateSeeds(11, 5, 3000)).toEqual([11, 3011, 6011, 9011, 12011]);
  });

  it("tracks the iteration count rather than pinning constants", () => {
    // The bug this fixes was a constant that stayed still while the thing it
    // depended on moved, so the spacing has to follow `iterations`.
    expect(replicateSeeds(11, 3, 5000)).toEqual([11, 5011, 10011]);
  });

  it("produces seeds its own guard accepts", () => {
    const seeds = replicateSeeds(11, 5, 3000);
    expect(() => assertUsableSeeds(seeds, 3000)).not.toThrow();
  });

  it("returns a single seed unchanged", () => {
    expect(replicateSeeds(11, 1, 3000)).toEqual([11]);
  });
});
