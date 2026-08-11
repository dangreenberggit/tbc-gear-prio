import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { memberPackages, type SetBonusValue } from "../src/rank.js";
import {
  formatPackageMembershipLine,
  packageSetPotentialDps,
} from "../src/rank-report-rules.js";

/**
 * Ticket 118 acceptance, against the two committed report artifacts. The
 * artifacts were generated before this change, so their `setContext` still
 * carries the old single-package shape — these tests re-run the attachment
 * over the artifacts' `setBonuses` (the measured data, which did not change)
 * and assert what a regenerated report's member rows carry.
 */
type ArtifactRanking = {
  items: { itemId: number; deltaDps: number; name?: string }[];
  setBonuses: SetBonusValue[];
};

function loadArtifact(relPath: string): ArtifactRanking {
  const url = new URL(relPath, import.meta.url);
  const parsed = JSON.parse(readFileSync(url, "utf8")) as {
    ranking: ArtifactRanking;
  };
  return parsed.ranking;
}

const ret = loadArtifact(
  "../../../.scratch/set-bonus-value/ret-catchup/artifacts/slamaltman-p3.json"
);
const feral = loadArtifact(
  "../../../.scratch/rank-reports/shredzepelin-p3.json"
);

function bonusesFor(artifact: ArtifactRanking, setId: number): SetBonusValue[] {
  return artifact.setBonuses.filter((b) => b.setId === setId);
}

function rowFor(artifact: ArtifactRanking, itemId: number) {
  const row = artifact.items.find((i) => i.itemId === itemId);
  expect(row, `item ${itemId} in artifact`).toBeDefined();
  return row!;
}

describe("ret artifact (slamaltman-p3): Lightbringer", () => {
  const lightbringer = bonusesFor(ret, 680);

  it("gives a member row both the 2pc +11.31 and the 4pc -6.83 as data", () => {
    const pkgs = memberPackages(30990, lightbringer)!;
    expect(pkgs.map((p) => p.threshold)).toEqual([2, 4]);
    expect(pkgs[0]!.deltaDps).toBeCloseTo(11.31, 2);
    expect(pkgs[1]!.deltaDps).toBeCloseTo(-6.83, 2);
  });

  it("sorts member rows by the best measured value, +11.31 — not the 4pc's -6.83", () => {
    const row = rowFor(ret, 30990);
    const value = packageSetPotentialDps({
      deltaDps: row.deltaDps,
      setContext: {
        setId: 680,
        setName: "Lightbringer Battlegear",
        piecesWornBefore: 0,
        piecesAfterSwap: 1,
        nextThreshold: 2,
        crossesThreshold: false,
        packages: memberPackages(30990, lightbringer)!,
      },
    });
    expect(value).toBeCloseTo(11.31, 2);
    // Under the old largest-threshold-first rule this row carried only the
    // negative 4pc figure and fell back to its own delta — package mode moved
    // nothing on the whole report (ticket 118's headline symptom).
    expect(value).not.toBe(row.deltaDps);
  });

  it("reaches a piece that only the 4pc package assembles with the same set-level data", () => {
    // 30989 is in the 4pc package but not the 2pc. The owner's rule sorts by
    // the best measured value for the row's SET, so it too rises on +11.31.
    const pkgs = memberPackages(30989, lightbringer)!;
    expect(pkgs.map((p) => p.threshold)).toEqual([2, 4]);
    expect(
      packageSetPotentialDps({
        deltaDps: rowFor(ret, 30989).deltaDps,
        setContext: {
          setId: 680,
          setName: "Lightbringer Battlegear",
          piecesWornBefore: 0,
          piecesAfterSwap: 1,
          nextThreshold: 2,
          crossesThreshold: false,
          packages: pkgs,
        },
      })
    ).toBeCloseTo(11.31, 2);
  });

  it("shows both figures separately on the row detail line", () => {
    const line = formatPackageMembershipLine({
      deltaDps: rowFor(ret, 30990).deltaDps,
      setContext: {
        setId: 680,
        setName: "Lightbringer Battlegear",
        piecesWornBefore: 0,
        piecesAfterSwap: 1,
        nextThreshold: 2,
        crossesThreshold: false,
        packages: memberPackages(30990, lightbringer)!,
      },
    })!;
    expect(line).toContain("2pc package +11.31");
    expect(line).toContain("4pc package -6.83");
  });

  it("leaves a set whose every measured package is negative sorting by own delta", () => {
    // Justicar's only measured package (4pc) is -80.56: the figures are shown
    // as data, but no row moves on them.
    const justicar = bonusesFor(ret, 626);
    const pkgs = memberPackages(29073, justicar)!;
    expect(pkgs.map((p) => p.deltaDps).every((d) => d < 0)).toBe(true);
    const row = rowFor(ret, 29073);
    expect(
      packageSetPotentialDps({
        deltaDps: row.deltaDps,
        setContext: {
          setId: 626,
          setName: "Justicar Battlegear",
          piecesWornBefore: 0,
          piecesAfterSwap: 1,
          nextThreshold: 4,
          crossesThreshold: false,
          packages: pkgs,
        },
      })
    ).toBe(row.deltaDps);
  });
});

describe("feral artifact (shredzepelin-p3): existing package-mode behaviour stays correct", () => {
  it("keeps every Thunderheart member sorting on a positive measured package", () => {
    // Both Thunderheart packages are positive (2pc +74.11, 4pc +64.09), so
    // all four members still sort as one positive block. The best-of rule
    // picks the 2pc's +74.11 where the old rule pinned the 4pc's +64.09 —
    // both figures now show on the row, so nothing measured is hidden.
    const thunderheart = bonusesFor(feral, 676);
    for (const itemId of [31048, 31042, 31034, 31044]) {
      const pkgs = memberPackages(itemId, thunderheart)!;
      expect(pkgs.map((p) => p.threshold)).toEqual([2, 4]);
      expect(
        packageSetPotentialDps({
          deltaDps: rowFor(feral, itemId).deltaDps,
          setContext: {
            setId: 676,
            setName: "Thunderheart Harness",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 2,
            crossesThreshold: false,
            packages: pkgs,
          },
        })
      ).toBeCloseTo(74.11, 2);
    }
  });

  it("keeps a single-threshold set exactly as before", () => {
    // Malorne has one measured package (4pc, +14.78, two pieces to add) —
    // the best-of rule reduces to the old behaviour when only one threshold
    // is measured.
    const malorne = bonusesFor(feral, 640);
    const pkgs = memberPackages(29097, malorne)!;
    expect(pkgs).toHaveLength(1);
    expect(
      packageSetPotentialDps({
        deltaDps: rowFor(feral, 29097).deltaDps,
        setContext: {
          setId: 640,
          setName: "Malorne Harness",
          piecesWornBefore: 2,
          piecesAfterSwap: 3,
          nextThreshold: 4,
          crossesThreshold: false,
          packages: pkgs,
        },
      })
    ).toBeCloseTo(14.78, 2);
  });

  it("still moves no Nordrassil row — its only measured package is negative", () => {
    const nordrassil = bonusesFor(feral, 641);
    const pkgs = memberPackages(30229, nordrassil)!;
    const row = rowFor(feral, 30229);
    expect(
      packageSetPotentialDps({
        deltaDps: row.deltaDps,
        setContext: {
          setId: 641,
          setName: "Nordrassil Harness",
          piecesWornBefore: 0,
          piecesAfterSwap: 1,
          nextThreshold: 4,
          crossesThreshold: false,
          packages: pkgs,
        },
      })
    ).toBe(row.deltaDps);
  });
});
