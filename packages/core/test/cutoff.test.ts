import { describe, expect, it } from "vitest";
import {
  CUTOFF,
  CUTOFF_FERAL,
  cutoffForSpec,
  meetsCutoff,
} from "../src/cutoff.js";

describe("per-spec cutoff", () => {
  it("keeps ret's cutoff unchanged at 3.4 dps / 0.15%", () => {
    // docs/five-seed-spread.json — ret's own derivation, untouched by the
    // feral spread added alongside this test (issue #1 README step 0).
    expect(CUTOFF).toEqual({ absDps: 3.4, pct: 0.15 });
  });

  it("derives a feral cutoff from feral's own noise floor, not ret's", () => {
    // docs/five-seed-spread-feral.json: max(3.0, 2× mean reported SE 1.774)
    // → 3.6. Regenerate with `python scripts/five_seed_spread_feral.py`
    // (requires vendor/wowsimcli-v0.0.101-*, fetched via
    // `pnpm fetch:wowsimcli`, and test/fixtures/shredzepelin-cat.raid-sim-request.json,
    // built via `python scripts/compose_feral_raid_sim.py`).
    expect(CUTOFF_FERAL).toEqual({ absDps: 3.6, pct: 0.15 });
  });

  it("routes ret and feral to their own derived cutoffs", () => {
    expect(cutoffForSpec("ret")).toBe(CUTOFF);
    expect(cutoffForSpec("feral")).toBe(CUTOFF_FERAL);
  });

  it("falls back to the ret-derived CUTOFF for a spec with no dedicated spread", () => {
    // No five-seed spread exists yet for any spec beyond ret/feral; falling
    // back to CUTOFF matches pre-existing behavior for those specs (CUTOFF
    // applied everywhere) rather than silently under- or over-filtering.
    expect(cutoffForSpec("feral-tank" as never)).toBe(CUTOFF);
  });

  it("feral's noise floor is measurably higher than ret's, motivating the split", () => {
    // Same iterations (5000) and derivation method on both fixtures; feral's
    // rotation being noisier is the whole reason this file exists (README
    // step 0), not an assumption — the numbers back it up directly.
    expect(CUTOFF_FERAL.absDps).toBeGreaterThan(CUTOFF.absDps);
  });

  it("meetsCutoff still reads whichever Cutoff object it's given", () => {
    expect(meetsCutoff(3.5, 0.1, CUTOFF)).toBe(true);
    expect(meetsCutoff(3.5, 0.1, CUTOFF_FERAL)).toBe(false);
  });
});
