import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  feralOfflineRecordings,
  NEXESS_REF,
  SHREDZEPELIN_REF,
  type FeralRawFixture,
} from "../src/fixtures/feral-offline.js";
import { characterFightKey } from "../src/seams/gear-source.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function load<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

describe("feral preset", () => {
  const skeleton = load<{
    raid: {
      parties: Array<{
        players: Array<{
          class: string;
          talentsString: string;
          rotation: Record<string, unknown>;
          equipment: { items: unknown[] };
          feralCatDruid?: unknown;
          retributionPaladin?: unknown;
        }>;
      }>;
    };
  }>("data/presets/feral/p2.raid-sim-skeleton.json");
  const player = skeleton.raid.parties[0]!.players[0]!;

  it("is a druid carrying the feral spec options, not ret's", () => {
    expect(player.class).toBe("ClassDruid");
    expect(player.feralCatDruid).toBeDefined();
    // The spec-options oneof: leaving ret's key behind would make the request
    // ambiguous about which spec it is.
    expect(player.retributionPaladin).toBeUndefined();
  });

  it("carries the APL, which the sim actually runs", () => {
    // verification-log 2026-07-27 measured this for ret and it holds for
    // feral: stripping the APL drops the smoke sim from ~2120 to ~666 DPS.
    const apl = load<Record<string, unknown>>(
      "vendor/wowsims/feral_default.apl.json"
    );
    for (const key of ["prepullActions", "priorityList", "groups"]) {
      expect(player.rotation[key]).toEqual(apl[key]);
    }
    expect(player.rotation.type).toBe("TypeAPL");
  });

  it("ships bare gear so no ret item can leak into a feral request", () => {
    expect(player.equipment.items).toHaveLength(17);
    expect(player.equipment.items.every((i) => Object.keys(i!).length === 0));
  });

  it("prices FeralAttackPower, which ret weights cannot see", () => {
    const feral = load<{ weights: Record<string, number> }>(
      "data/presets/feral/p1.ep-weights.json"
    ).weights;
    const ret = load<{ weights: Record<string, number> }>(
      "data/presets/ret/p2.ep-weights.json"
    ).weights;
    expect(feral["19"]).toBeGreaterThan(0);
    expect(ret["19"]).toBeUndefined();
  });
});

describe("feral offline recordings", () => {
  it("keys both characters under the feral spec", () => {
    for (const [ref, file] of [
      [SHREDZEPELIN_REF, "test/fixtures/shredzepelin.raw.json"],
      [NEXESS_REF, "test/fixtures/nexess.raw.json"],
    ] as const) {
      const data = feralOfflineRecordings(load<FeralRawFixture>(file), ref);
      expect([...data.fights.keys()]).toEqual([
        characterFightKey(ref, "feral"),
      ]);
    }
  });

  it("measures confidence from form uptime instead of asserting 1", () => {
    const data = feralOfflineRecordings(
      load<FeralRawFixture>("test/fixtures/shredzepelin.raw.json"),
      SHREDZEPELIN_REF
    );
    const summary = [...data.fights.values()][0]![0]!;
    expect(summary.confidence).toBeGreaterThan(0.95);
    expect(summary.confidence).toBeLessThanOrEqual(1);
  });

  it("reads a bear night at markedly lower confidence", () => {
    const data = feralOfflineRecordings(
      load<FeralRawFixture>("test/fixtures/shredzepelin-bear.raw.json"),
      SHREDZEPELIN_REF
    );
    const summary = [...data.fights.values()][0]![0]!;
    // 69% bear / 31% cat. The recording still resolves, but the number is the
    // signal that this fight is not the spec the caller asked for.
    expect(summary.confidence).toBeLessThan(0.8);
  });

  it("carries salvation uptime onto the summary so a caller can flag off-tank duty", () => {
    // Ticket 06: confidence alone cannot separate these two — both are ~99%
    // cat. Shredzepelin was backup tank on Morogrim and has no salvation.
    const offTank = feralOfflineRecordings(
      load<FeralRawFixture>("test/fixtures/shredzepelin.raw.json"),
      SHREDZEPELIN_REF
    );
    const realCat = feralOfflineRecordings(
      load<FeralRawFixture>("test/fixtures/nexess.raw.json"),
      NEXESS_REF
    );
    expect([...offTank.fights.values()][0]![0]!.salvationUptime).toBe(0);
    expect([...realCat.fights.values()][0]![0]!.salvationUptime).toBe(1);
  });
});
