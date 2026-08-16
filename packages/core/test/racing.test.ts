/**
 * M2 racing — interface-level tests (candidate-pool.md §7: 7.0, 7.2).
 *
 * Tune on ret, gate on feral (§7.a) — this file therefore ranks the
 * **feral** synthetic fixture (`FERAL_SYNTHETIC_ROW`) throughout, per the
 * plan's explicit rule "never tune on the fixture that gates".
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import type {
  RaidSimRequest,
  SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { CountingSimRunner, DerivedNoiseSimRunner } from "./racing-support.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows.feral!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const skeleton = loadJson<RaidSimRequest>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);
const presetGear = loadJson<PresetGearFile>(
  "vendor/wowsims/feral_preraid.gear.json"
);
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/feral-p2.json"
    )
  ),
  FERAL_SYNTHETIC_ROW.maxPhase
);

const gearData = syntheticOfflineRecordings({
  ref: FERAL_SYNTHETIC_REF,
  spec: FERAL_SYNTHETIC_ROW.spec,
  presetGear,
  fight: FERAL_SYNTHETIC_FIGHT,
});

function baseInput() {
  return {
    character: FERAL_SYNTHETIC_REF,
    spec: FERAL_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_SYNTHETIC_ROW.maxPhase,
    iterations: recorded.iterations,
    seeds: [recorded.seed],
    race: "RaceTauren" as const,
  };
}

function baseDeps(sim: ReturnType<typeof buildSim>) {
  return {
    gear: new RecordedGearSource(gearData),
    sim,
    store: new MemoryStore(),
    clock: () => new Date("2026-08-15T12:00:00.000Z"),
    raidSimSkeleton: skeleton,
    epWeights,
    pool,
  };
}

function buildSim(noiseSeed: number) {
  const recordings = new Map(Object.entries(recorded.recordings));
  return new DerivedNoiseSimRunner(
    recorded.simVersion,
    recordings,
    recorded.seed,
    noiseSeed
  );
}

describe("M2 racing — 7.0: racing does less full-iteration work", () => {
  it("sees strictly fewer full-iteration sims than eligible candidates, with >=1 screened out", async () => {
    const eligibleCount = pool.length;
    const sim = new CountingSimRunner(buildSim(1));

    const ranking = await rankUpgrades(
      { ...baseInput(), screenIterations: 300, promoteTopK: 35 },
      { ...baseDeps(sim as never), sim: sim as never }
    );

    // Full-iteration sims: every run at the ranking's own `iterations`
    // (recorded.iterations) rather than at screenIterations.
    const fullIterationRuns =
      sim.runsByIterations.get(recorded.iterations) ?? 0;
    expect(fullIterationRuns).toBeGreaterThan(0);
    expect(fullIterationRuns).toBeLessThan(eligibleCount);

    const screenedOut = ranking.items.filter(
      (i) => i.screened !== undefined && i.screened.promoted === false
    );
    expect(screenedOut.length).toBeGreaterThanOrEqual(1);
  });
});
