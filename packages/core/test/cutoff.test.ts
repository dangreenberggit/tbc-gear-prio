import { describe, expect, it } from "vitest";
import {
  CUTOFF,
  CUTOFF_FERAL,
  cutoffAdmittingArm,
  cutoffForSpec,
  meetsCutoff,
  setBonusNoiseFloorDps,
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

describe("cutoffAdmittingArm (254)", () => {
  // Ticket 254: the cutoff is an OR (abs OR pct); a boundary row can sit above
  // the cutoff via the percentage arm while its absolute DPS is below the abs
  // threshold. The report gave no way to see which arm admitted a row, and an
  // SME read that as an inconsistency. This helper names the arm.

  it("names the %-arm when a row clears pct but its abs DPS is below the bar", () => {
    // The two committed slamaltman boundary rows (ticket 254 table), against
    // ret's {absDps: 3.4, pct: 0.15}: deltaDps 3.28/3.25 < 3.4 (abs fails),
    // deltaPct 0.164/0.162 >= 0.15 (pct clears). Only the %-arm admitted them.
    expect(
      cutoffAdmittingArm(3.2766067307575213, 0.1635811932827611, CUTOFF)
    ).toBe("pct");
    expect(
      cutoffAdmittingArm(3.24775956279359, 0.162141028335875, CUTOFF)
    ).toBe("pct");
  });

  it("names the abs-arm when a row clears abs but its pct is below the bar", () => {
    expect(cutoffAdmittingArm(5.0, 0.1, CUTOFF)).toBe("abs");
  });

  it("reports both when a row clears both arms", () => {
    expect(cutoffAdmittingArm(5.0, 0.2, CUTOFF)).toBe("both");
  });

  it("reports neither when a row clears no arm", () => {
    expect(cutoffAdmittingArm(1.0, 0.05, CUTOFF)).toBe("none");
  });

  it("agrees with meetsCutoff: any admitting arm means the row met the cutoff", () => {
    const cases: ReadonlyArray<readonly [number, number]> = [
      [5.0, 0.1],
      [3.28, 0.164],
      [5.0, 0.2],
      [1.0, 0.05],
    ];
    for (const [dps, pct] of cases) {
      const arm = cutoffAdmittingArm(dps, pct, CUTOFF);
      expect(arm !== "none").toBe(meetsCutoff(dps, pct, CUTOFF));
    }
  });
});

describe("setBonusNoiseFloorDps (332)", () => {
  it("derives √2 × absDps per spec", () => {
    // A prospective set bonus folds two measured deltas, so its combined 2×SE
    // bar is √2 larger than the per-spec `absDps` bar. Expressed via Math.SQRT2,
    // not decimals, so a mutation of the derivation turns this red.
    expect(setBonusNoiseFloorDps(CUTOFF)).toBe(Math.SQRT2 * CUTOFF.absDps);
    expect(setBonusNoiseFloorDps(CUTOFF_FERAL)).toBe(
      Math.SQRT2 * CUTOFF_FERAL.absDps
    );
  });

  it("gives feral a strictly higher floor than ret", () => {
    expect(setBonusNoiseFloorDps(CUTOFF_FERAL)).toBeGreaterThan(
      setBonusNoiseFloorDps(CUTOFF)
    );
  });
});
