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
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
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

    // Default screenIterations/promoteTopK (omitted) — this exercises what
    // a real caller gets without threading the knobs through by hand.
    const ranking = await rankUpgrades(baseInput(), {
      ...baseDeps(sim as never),
      sim: sim as never,
    });

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

describe("M2 racing — 7.2: recall on the held-out fixture", () => {
  // §7.a: feral is the HELD-OUT fixture and gates 7.2; ret is the tuning
  // fixture and never gates (candidate-pool.md, top-level module comment and
  // §7.a). This file already ranks feral exclusively, so every assertion
  // below is on the fixture the plan requires 7.2 to run against.

  /**
   * The recorded full-sweep truth, un-noised — `fullPool: true` against the
   * plain `RecordedSimRunner`, exactly like synthetic-fixtures.test.ts. This
   * is the independent source of truth 7.2 checks racing's promotions
   * against: which rows are above cutoff, and which 5 rank highest.
   */
  async function fullSweepTruth() {
    const recordings = new Map(Object.entries(recorded.recordings));
    const sim = new RecordedSimRunner(recorded.simVersion, recordings);
    return rankUpgrades(
      { ...baseInput(), fullPool: true },
      { ...baseDeps(sim as never), sim: sim as never }
    );
  }

  // 30 draws: the number this file's defaults were measured against (see
  // rank.ts's `RankInput.promoteTopK` doc comment) — zero misses held at
  // this count during tuning, so this is the same bar the defaults were
  // set to clear, not an arbitrarily larger one.
  const NOISE_DRAWS = 30;

  // 30 draws over a ~250-candidate pool at 1000 screening iterations each is
  // real work, so this test takes an explicit timeout well above the
  // default 5s — generous enough that ordinary CI variance cannot turn a
  // passing recall gate into a flaky timeout.
  const RECALL_TEST_TIMEOUT_MS = 60_000;

  it(
    "promotes every above-cutoff row and never screens out a top-5 row, across seeded noise draws",
    async () => {
      const truth = await fullSweepTruth();
      const aboveCutoffIds = new Set(
        truth.items.filter((i) => !i.belowCutoff).map((i) => i.itemId)
      );
      const top5Ids = new Set(
        truth.items
          .filter((i) => i.rank !== null)
          .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
          .slice(0, 5)
          .map((i) => i.itemId)
      );
      // A recall gate needs something to recall — a fixture with no
      // above-cutoff rows would make every assertion below vacuously true.
      expect(aboveCutoffIds.size).toBeGreaterThan(0);
      expect(top5Ids.size).toBe(5);

      const misses: Array<{ draw: number; itemId: number }> = [];
      const top5Misses: Array<{ draw: number; itemId: number }> = [];

      for (let draw = 0; draw < NOISE_DRAWS; draw++) {
        const sim = buildSim(draw);
        // Default screenIterations/promoteTopK (omitted) — the recall gate
        // is on what a real caller gets, not on hand-tuned knobs this test
        // supplies itself.
        const ranking = await rankUpgrades(baseInput(), baseDeps(sim));
        const screenedOutIds = new Set(
          ranking.items
            .filter((i) => i.screened?.promoted === false)
            .map((i) => i.itemId)
        );
        for (const itemId of aboveCutoffIds) {
          if (screenedOutIds.has(itemId)) misses.push({ draw, itemId });
        }
        for (const itemId of top5Ids) {
          if (screenedOutIds.has(itemId)) top5Misses.push({ draw, itemId });
        }
      }

      // A miss fails the build; the fix is the rule or the defaults, never
      // the test (candidate-pool.md §7, 7.2's own row).
      expect(misses).toEqual([]);
      expect(top5Misses).toEqual([]);
    },
    RECALL_TEST_TIMEOUT_MS
  );
});
