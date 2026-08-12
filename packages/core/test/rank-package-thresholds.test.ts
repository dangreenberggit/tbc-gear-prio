import { describe, expect, it } from "vitest";
import {
  memberPackages,
  type SetBonusValue,
  type SetContext,
} from "../src/rank.js";
import {
  formatCuratedPackagePointer,
  formatPackageMembershipLine,
  GEM_POLICY_QUALIFIER,
  packageSetPotentialDps,
} from "../src/rank-report-rules.js";

/**
 * Ticket 118 (owner decision, 2026-08-11): a member row carries EVERY measured
 * threshold's package value for its set, not just the largest threshold's.
 *
 * The numbers are the ret slamaltman-p3 artifact's Lightbringer measurements
 * (`.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json`): the
 * 2pc package measures +11.31 and the 4pc measures -6.83. Under the old
 * largest-threshold-first rule every Lightbringer row carried only the
 * negative 4pc figure and the positive 2pc reached no row at all.
 */
describe("memberPackages", () => {
  const lightbringer: SetBonusValue[] = [
    {
      setId: 680,
      setName: "Lightbringer Battlegear",
      threshold: 2,
      piecesWorn: 0,
      packageItemIds: [30990, 30993],
      packageDeltaDps: 11.31,
      bonusDps: 25.9,
    },
    {
      setId: 680,
      setName: "Lightbringer Battlegear",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [30989, 30997, 30990, 30993],
      packageDeltaDps: -6.83,
      bonusDps: -40.1,
    },
  ];

  it("gives a member row every measured threshold's figure, smallest threshold first", () => {
    const pkgs = memberPackages(30990, lightbringer);
    expect(pkgs).toEqual([
      {
        threshold: 2,
        deltaDps: 11.31,
        itemIds: [30990, 30993],
        piecesNeeded: 2,
      },
      {
        threshold: 4,
        deltaDps: -6.83,
        itemIds: [30989, 30997, 30990, 30993],
        piecesNeeded: 4,
      },
    ]);
  });

  it("gives a row that is only in the 4pc package the set's full measured list too", () => {
    // The owner's sort rule reads "the best of the measured package values for
    // that row's set", so the data must be the set's, not just the packages
    // this exact item appears in.
    const pkgs = memberPackages(30989, lightbringer);
    expect(pkgs?.map((p) => p.threshold)).toEqual([2, 4]);
  });

  it("returns undefined for an item in none of the set's packages", () => {
    // A worn piece, or a pool candidate that lost its slot's selection —
    // no package assembles it, so it is not a member row.
    expect(memberPackages(30129, lightbringer)).toBeUndefined();
  });

  it("skips unmeasured thresholds", () => {
    const justicar: SetBonusValue[] = [
      {
        setId: 626,
        setName: "Justicar Battlegear",
        threshold: 2,
        piecesWorn: 0,
        packageItemIds: [],
        packageDeltaDps: 0,
        unmeasured: "not-implemented-in-sim",
      },
      {
        setId: 626,
        setName: "Justicar Battlegear",
        threshold: 4,
        piecesWorn: 0,
        packageItemIds: [29073, 29075, 29071, 29074],
        packageDeltaDps: -80.56,
      },
    ];
    const pkgs = memberPackages(29073, justicar);
    expect(pkgs?.map((p) => p.threshold)).toEqual([4]);
  });
});

/**
 * The owner's sort rule for package mode: order by the BEST of the measured
 * package values for the row's set. Plain arithmetic over simmed data — a
 * Lightbringer row sorts by the 2pc's +11.31, not the 4pc's -6.83.
 */
describe("packageSetPotentialDps with several measured thresholds", () => {
  const lightbringerCtx = (): SetContext => ({
    setId: 680,
    setName: "Lightbringer Battlegear",
    piecesWornBefore: 0,
    piecesAfterSwap: 1,
    nextThreshold: 2,
    crossesThreshold: false,
    packages: [
      {
        threshold: 2,
        deltaDps: 11.31,
        itemIds: [30990, 30993],
        piecesNeeded: 2,
      },
      {
        threshold: 4,
        deltaDps: -6.83,
        itemIds: [30989, 30997, 30990, 30993],
        piecesNeeded: 4,
      },
    ],
  });

  it("scores a member row by the best measured package value", () => {
    expect(
      packageSetPotentialDps({ deltaDps: -0.55, setContext: lightbringerCtx() })
    ).toBe(11.31);
  });

  it("falls back to the row's own delta when every measured package is negative", () => {
    const ctx = lightbringerCtx();
    ctx.packages = [
      {
        threshold: 4,
        deltaDps: -80.56,
        itemIds: [29073, 29075, 29071, 29074],
        piecesNeeded: 4,
      },
    ];
    expect(packageSetPotentialDps({ deltaDps: 4.2, setContext: ctx })).toBe(
      4.2
    );
  });
});

/**
 * The row detail line shows each measured threshold's figure as its own
 * number — "2pc package +11.31 / 4pc package -6.83" — never only the largest
 * threshold's, and never a blend.
 */
describe("formatPackageMembershipLine with several measured thresholds", () => {
  const lightbringerCtx = (): SetContext => ({
    setId: 680,
    setName: "Lightbringer Battlegear",
    piecesWornBefore: 0,
    piecesAfterSwap: 1,
    nextThreshold: 2,
    crossesThreshold: false,
    packages: [
      {
        threshold: 2,
        deltaDps: 11.31,
        itemIds: [30990, 30993],
        piecesNeeded: 2,
      },
      {
        threshold: 4,
        deltaDps: -6.83,
        itemIds: [30989, 30997, 30990, 30993],
        piecesNeeded: 4,
      },
    ],
  });

  it("shows both thresholds' figures separately, with the row's own swap first", () => {
    const line = formatPackageMembershipLine({
      deltaDps: -0.55,
      setContext: lightbringerCtx(),
    });
    expect(line).toBeDefined();
    expect(line).toContain("this swap alone: -0.55");
    expect(line).toContain("2pc package +11.31");
    expect(line).toContain("4pc package -6.83");
    expect(line).toContain("Lightbringer Battlegear");
    expect(line).toContain("whole package");
    expect(line).toContain(GEM_POLICY_QUALIFIER);
  });

  it("still renders when every measured package is negative — the numbers are the data", () => {
    const ctx = lightbringerCtx();
    ctx.setName = "Justicar Battlegear";
    ctx.packages = [
      {
        threshold: 4,
        deltaDps: -80.56,
        itemIds: [29073, 29075, 29071, 29074],
        piecesNeeded: 4,
      },
    ];
    const line = formatPackageMembershipLine({
      deltaDps: 4.2,
      setContext: ctx,
    });
    expect(line).toContain("4pc package -80.56");
  });

  it("is absent when the row is in no measured package", () => {
    const ctx = lightbringerCtx();
    delete ctx.packages;
    expect(
      formatPackageMembershipLine({ deltaDps: 5, setContext: ctx })
    ).toBeUndefined();
    expect(formatPackageMembershipLine({ deltaDps: 5 })).toBeUndefined();
  });
});

/**
 * Ticket 118's related surface (folded in from ticket 96's live case): the
 * pointer on a below-cutoff BiS row used to read "BiS as part of Crystalforge
 * Battlegear ... see Set potential" while every panel entry it pointed at was
 * negative — the pointer implied the package redeems the row and the
 * destination said the opposite. The fix is data, not advice: the pointer now
 * states each measured package figure itself, so the destination cannot
 * contradict it.
 */
describe("formatCuratedPackagePointer with measured package figures", () => {
  // piecesWorn is 0 on both entries because ticket 119 made worn count =
  // threshold - 1 report as unmeasured rather than a measured figure, so a
  // 2pc entry can no longer carry a measured packageDeltaDps at 1 worn.
  const crystalforge: SetBonusValue[] = [
    {
      setId: 629,
      setName: "Crystalforge Battlegear",
      threshold: 2,
      piecesWorn: 0,
      packageItemIds: [30131, 30130],
      packageDeltaDps: -0.47,
    },
    {
      setId: 629,
      setName: "Crystalforge Battlegear",
      threshold: 4,
      piecesWorn: 0,
      packageItemIds: [30131, 30130, 30133, 30132],
      packageDeltaDps: -26.77,
    },
  ];

  const wornBreastplate = {
    bisTags: ["BiS" as const],
    belowCutoff: true,
    setContext: {
      setId: 629,
      setName: "Crystalforge Battlegear",
      piecesWornBefore: 0,
      piecesAfterSwap: 1,
      nextThreshold: 2 as const,
      crossesThreshold: false,
    },
  };

  it("states each measured package figure in the pointer itself", () => {
    const line = formatCuratedPackagePointer(wornBreastplate, crystalforge);
    expect(line).toContain(
      "BiS as part of Crystalforge Battlegear, not as this swap alone"
    );
    expect(line).toContain("2pc -0.47");
    expect(line).toContain("4pc -26.77");
    expect(line).toContain("Set potential");
  });

  it("keeps the bare pointer when the set has no measured package", () => {
    const line = formatCuratedPackagePointer(wornBreastplate, [
      { ...crystalforge[0]!, unmeasured: "not-implemented-in-sim" },
    ]);
    expect(line).toBe(
      "BiS as part of Crystalforge Battlegear, not as this swap alone — see Set potential"
    );
  });
});
