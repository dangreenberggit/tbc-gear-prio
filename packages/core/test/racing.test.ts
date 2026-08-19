/**
 * M2 racing — interface-level tests (candidate-pool.md §7: 7.0, 7.2, P3-recall).
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
  FERAL_P3_SYNTHETIC_ROW,
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

/**
 * Phase 3 bindings for the P3-recall gate (ticket 221).
 *
 * Same character, same worn gear, same presets — only the candidate pool
 * differs (398 eligible against the P2 row's 246). Feral ships no P3-specific
 * ep-weights or skeleton, so reusing the P2 row's is both necessary and what
 * makes the two miss counts comparable: the pool size is the only variable.
 */
const recordedP3 = recordingsFile.rows["feral-p3"]!;

const poolP3 = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/feral-p3.json"
    )
  ),
  FERAL_P3_SYNTHETIC_ROW.maxPhase
);

function baseInputP3() {
  return {
    character: FERAL_SYNTHETIC_REF,
    spec: FERAL_P3_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_P3_SYNTHETIC_ROW.maxPhase,
    iterations: recordedP3.iterations,
    seeds: [recordedP3.seed],
    race: "RaceTauren" as const,
  };
}

function baseDepsP3(sim: ReturnType<typeof buildSimP3>) {
  return {
    gear: new RecordedGearSource(gearData),
    sim,
    store: new MemoryStore(),
    clock: () => new Date("2026-08-15T12:00:00.000Z"),
    raidSimSkeleton: skeleton,
    epWeights,
    pool: poolP3,
  };
}

function buildSimP3(noiseSeed: number) {
  const recordings = new Map(Object.entries(recordedP3.recordings));
  return new DerivedNoiseSimRunner(
    recordedP3.simVersion,
    recordings,
    recordedP3.seed,
    noiseSeed
  );
}

/**
 * Hands the event loop back between noise draws.
 *
 * Every await inside a draw resolves from an in-memory recordings map, so the
 * whole 30-draw loop is one unbroken chain of microtasks: the worker never
 * reaches the macrotask queue, and vitest's reporter RPC starves until it
 * times out with `Timeout calling "onTaskUpdate"` — an unhandled error that
 * fails the run even though every assertion passed. `setImmediate` is a
 * macrotask, so awaiting one per draw lets the worker answer.
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
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

describe("M2 racing — §6.4: fullPool reproduces the pre-M2 flow", () => {
  it("full-iteration sims every eligible candidate and carries no screened rows", async () => {
    const eligibleCount = pool.length;
    const sim = new CountingSimRunner(buildSim(1));

    const ranking = await rankUpgrades(
      { ...baseInput(), fullPool: true },
      { ...baseDeps(sim as never), sim: sim as never }
    );

    // Byte-level property that distinguishes fullPool from racing: not one
    // row anywhere carries the `screened` field racing introduces —
    // `fullPool: true` is the escape hatch to the pre-M2 shape, not merely
    // to the pre-M2 candidate count.
    expect(ranking.items.every((i) => i.screened === undefined)).toBe(true);

    // Every eligible candidate got a full-iteration sim (baseline + one per
    // eligible candidate, at minimum — paired-slot items add a second try).
    const fullIterationRuns =
      sim.runsByIterations.get(recorded.iterations) ?? 0;
    expect(fullIterationRuns).toBeGreaterThanOrEqual(eligibleCount);
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
        await yieldToEventLoop();
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

describe("M2 racing — P3-recall: recall on the maxPhase 3 pool", () => {
  // Ticket 221: 7.2 above measures recall at 246 eligible candidates, but
  // every real feral run screens the phase 3 pool at 398. `promoteTopK` is a
  // fixed absolute budget, so the fraction it admits falls from ~61% to ~38%
  // as the pool grows — this gate measures whether recall survives that.
  //
  // Named with the non-numeric token "P3-recall" (ticket 230), not a §7
  // number: vitest's `-t` is an unanchored regex, so any "7.N" name collides
  // with the §7 row patterns. "7.2-P3" would widen every committed `-t 7.2`
  // to run both gates, and "7.13" is matched by `-t 7.1` (§7's Cap row).
  // The dot is any-char too, so while this block was named "7.3",
  // `-t 7.0` selected three blocks — 7.0, 7.2 and 7.3 — not one.
  // A token no `-t 7.N` pattern can match keeps each selector to one block.

  /** The recorded P3 full-sweep truth — same shape as 7.2's, on the P3 row. */
  async function fullSweepTruthP3() {
    const recordings = new Map(Object.entries(recordedP3.recordings));
    const sim = new RecordedSimRunner(recordedP3.simVersion, recordings);
    return rankUpgrades(
      { ...baseInputP3(), fullPool: true },
      { ...baseDepsP3(sim as never), sim: sim as never }
    );
  }

  // Same 30 draws as 7.2, so the two miss counts are directly comparable and
  // the pool size is the only thing that differs between the measurements.
  const NOISE_DRAWS = 30;

  // 7.2 runs 30 draws over 246 candidates within 60s; this pool is ~1.6x
  // larger, so the budget is doubled rather than scaled tight. A timeout here
  // should mean something changed, not that the machine was busy.
  const RECALL_TEST_TIMEOUT_MS = 120_000;

  it(
    "promotes every above-cutoff row and never screens out a top-5 row, across seeded noise draws",
    async () => {
      const truth = await fullSweepTruthP3();
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
        await yieldToEventLoop();
        const sim = buildSimP3(draw);
        // Defaults omitted, exactly as 7.2 does — the measurement is on what
        // a real caller gets, not on knobs the test supplies itself.
        const ranking = await rankUpgrades(baseInputP3(), baseDepsP3(sim));
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
