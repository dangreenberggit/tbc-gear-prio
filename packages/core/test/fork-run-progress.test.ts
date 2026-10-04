/**
 * The Upgrades tab's run progress tracker (ticket 542), on the fork.
 *
 * `run_progress.ts` turns the engine's `Progress` events into the phase the
 * progress component names, the bar's ratio and a remaining-time estimate.
 *
 * Two blocks:
 * - the pure block drives the module's exports with hand-built event lists,
 *   and every expected value is worked out by hand in the comment beside it;
 * - the engine-order block drives the real fork `rankUpgrades` with a
 *   controlled sim and the engine's default seeds, the way the tab calls it
 *   (no `seeds`), and checks the tracker's set-phase boundary against the
 *   events the engine really sends.
 *
 * The fork is gitignored (`vendor/`), so both blocks skip when the module is
 * absent.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { SIM_ORDER, type SimOrderName } from "../src/slots.js";
import {
  forkPresent,
  forkUpgradesDir,
  importForkUpgrades,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const runProgressModule = join(forkUpgradesDir, "run_progress.ts");
const moduleExists = (): boolean => existsSync(runProgressModule);

type Progress =
  | { stage: "resolving" }
  | { stage: "reading-gear" }
  | { stage: "composing" }
  | { stage: "building-pool" }
  | { stage: "simming"; done: number; total: number }
  | { kind: "row"; row: unknown }
  | { stage: "ranking" };

type RunPhase =
  "preparing" | "candidates" | "set-bonuses" | "replication" | "ranking";

type EstimatorConfig =
  | { kind: "linear" }
  | { kind: "phased"; kappa: number; psi: number; slowdown: number };

type RunTimeline = {
  sims: ReadonlyArray<{ t: number; done: number; afterRanking: boolean }>;
  rankingAt: number | undefined;
  total: number;
  boundary: number | null;
  concurrency: number;
  now: number;
  qualifyingRows: number;
  seedCount: number;
  topN: number;
};

type RunProgressView = {
  phase: RunPhase;
  stage: string;
  done?: number;
  total?: number;
  boundary: number | null;
  remainingMs?: number;
  qualifyingRows: number;
};

type Tracker = {
  setConcurrency(n: number): void;
  noteStop(): void;
  observe(p: Progress, nowMs: number): void;
  view(): RunProgressView;
};

type RunProgressModule = {
  TAB_REPLICATE_SEED_COUNT: number;
  replicationBoundary(
    total: number,
    seedCount: number,
    topN: number
  ): number | null;
  formatElapsed(ms: number): string;
  estimateRemainingMs(
    config: EstimatorConfig,
    run: RunTimeline
  ): number | undefined;
  expectedFinalDone(run: RunTimeline): number;
  RUN_PROGRESS_ESTIMATOR: EstimatorConfig;
  RUN_PROGRESS_SHOW_FROM_FRACTION: number;
  RUN_PROGRESS_MIN_CANDIDATES_DONE: number;
  RunProgressTracker: new (opts: {
    estimator: EstimatorConfig;
    showFromFraction: number;
    minCandidatesDone: number;
    seedCount?: number;
    topN?: number;
  }) => Tracker;
};

const loadModule = async () =>
  (await import(pathToFileURL(runProgressModule).href)) as RunProgressModule;

const sim = (done: number, total: number): Progress => ({
  stage: "simming",
  done,
  total,
});
const RANKING: Progress = { stage: "ranking" };
const row = (belowCutoff: boolean, simmed?: boolean): Progress => ({
  kind: "row",
  row: { belowCutoff, ...(simmed === undefined ? {} : { simmed }) },
});

describe.skipIf(!moduleExists())("run progress tracker (542), pure", () => {
  let mod: RunProgressModule;

  beforeAll(async () => {
    mod = await loadModule();
  });

  /** A tracker that shows any estimate from the first ten candidates on. */
  const tracker = (estimator: EstimatorConfig, concurrency = 1): Tracker => {
    const t = new mod.RunProgressTracker({
      estimator,
      showFromFraction: 0.05,
      minCandidatesDone: 1,
    });
    t.setConcurrency(concurrency);
    return t;
  };

  describe("formatElapsed matches the Bulk dialog's elapsed text", () => {
    it.each([
      [0, "0.0s"],
      [7_340, "7.3s"],
      // Upstream rounds with toFixed(1) before it switches to minutes.
      [59_990, "60.0s"],
      [60_000, "1m 0s"],
      [435_000, "7m 15s"],
    ])("%i ms reads %s", (ms, text) => {
      expect(mod.formatElapsed(ms)).toBe(text);
    });
  });

  describe("replicationBoundary", () => {
    // total = 1 + c + 4 * (1 + min(8, c)) with five seeds and top-N 8,
    // written out by hand for each c.
    it.each([
      [5, 1], // c = 0: 1 + 0 + 4 * 1
      [10, 2], // c = 1: 1 + 1 + 4 * 2
      [30, 6], // c = 5: 1 + 5 + 4 * 6
      [40, 8], // c = 7: 1 + 7 + 4 * 8
      [45, 9], // c = 8: 1 + 8 + 4 * 9
      [46, 10], // c = 9: 1 + 9 + 4 * 9
      [277, 241], // c = 240: 1 + 240 + 36
      [401, 365], // c = 364: run 1's total and boundary
    ])("total %i gives boundary %i", (total, boundary) => {
      expect(mod.replicationBoundary(total, 5, 8)).toBe(boundary);
    });

    it("returns the total itself with a single seed", () => {
      expect(mod.replicationBoundary(57, 1, 8)).toBe(57);
    });

    it.each([7, 38])("returns null for total %i, which no c gives", (total) => {
      expect(mod.replicationBoundary(total, 5, 8)).toBeNull();
    });

    it("mirrors the engine's private seed count of 5", () => {
      expect(mod.TAB_REPLICATE_SEED_COUNT).toBe(5);
    });
  });

  describe("phases follow the engine's event order", () => {
    // T = 57 is c = 20 candidates: 1 + 20 + 4 * 9, so B = 21.
    it("names each pre-sim stage as preparing", () => {
      const t = tracker({ kind: "linear" });
      expect(t.view().phase).toBe("preparing");
      for (const stage of [
        "resolving",
        "reading-gear",
        "composing",
        "building-pool",
      ] as const) {
        t.observe({ stage }, 10);
        expect(t.view()).toMatchObject({ phase: "preparing", stage });
      }
      expect(t.view().done).toBeUndefined();
      expect(t.view().boundary).toBeNull();
    });

    it("walks candidates, set bonuses, replication and ranking", () => {
      const t = tracker({ kind: "linear" });
      t.observe({ stage: "building-pool" }, 0);
      t.observe(sim(1, 57), 100);
      expect(t.view()).toMatchObject({
        phase: "candidates",
        done: 1,
        total: 57,
        boundary: 21,
      });
      t.observe(sim(20, 57), 200);
      expect(t.view().phase).toBe("candidates");
      // Eight rows clear the cutoff, so all 36 replication sims are expected.
      for (let i = 0; i < 8; i++) t.observe(row(false), 210);
      expect(t.view()).toMatchObject({ phase: "candidates", done: 20 });
      t.observe(sim(21, 57), 300);
      expect(t.view()).toMatchObject({ phase: "set-bonuses", done: 21 });
      t.observe(RANKING, 400);
      expect(t.view()).toMatchObject({
        phase: "replication",
        stage: "ranking",
        done: 21,
      });
      t.observe(sim(40, 57), 500);
      expect(t.view().phase).toBe("replication");
      t.observe(sim(57, 57), 600);
      expect(t.view()).toMatchObject({ phase: "ranking", done: 57 });
    });

    it("names a ranking with no sim count, a cached ranking, ranking", () => {
      const t = tracker({ kind: "linear" });
      t.observe({ stage: "resolving" }, 0);
      t.observe(RANKING, 50);
      expect(t.view()).toMatchObject({ phase: "ranking", stage: "ranking" });
      expect(t.view().done).toBeUndefined();
    });

    it("names the ranking after a Stop ranking, not replication", () => {
      const t = tracker({ kind: "linear" });
      t.observe(sim(1, 57), 100);
      t.observe(sim(8, 57), 200);
      t.noteStop();
      t.observe(sim(9, 57), 300);
      expect(t.view().phase).toBe("candidates");
      t.observe(RANKING, 400);
      expect(t.view()).toMatchObject({ phase: "ranking", done: 9 });
    });

    it("drops the boundary when a candidate count passes it", () => {
      const t = tracker({ kind: "linear" });
      t.observe(sim(1, 57), 100);
      t.observe(sim(22, 57), 200);
      expect(t.view()).toMatchObject({ phase: "candidates", boundary: null });
      // The boundary stays dropped, so done == 21 is not the set phase.
      t.observe(sim(21, 57), 250);
      expect(t.view()).toMatchObject({ phase: "candidates", boundary: null });
      t.observe(RANKING, 300);
      expect(t.view().phase).toBe("replication");
    });
  });

  describe("linear estimate", () => {
    it("is the elapsed time per finished sim times the sims left", () => {
      const t = tracker({ kind: "linear" });
      t.observe(sim(1, 100), 1_000);
      // (3000 - 1000) / (11 - 1) * (100 - 11) = 200 * 89
      t.observe(sim(11, 100), 3_000);
      expect(t.view().remainingMs).toBe(17_800);
    });

    it("never goes below zero", () => {
      const t = tracker({ kind: "linear" });
      t.observe(sim(1, 20), 0);
      // 2400 / 24 * (20 - 25) = -500, held at 0
      t.observe(sim(25, 20), 2_400);
      expect(t.view().remainingMs).toBe(0);
    });
  });

  describe("phased estimate", () => {
    // kappa 0.5 at concurrency 4 gives k = 2 candidate-times per replication
    // sim. T = 57 is c = 20, so B = 21 and R = T - B = 36. psi = 20.
    const phased: EstimatorConfig = {
      kind: "phased",
      kappa: 0.5,
      psi: 20,
      slowdown: 0,
    };

    it("applies the candidate, boundary, ranking and replication rules", () => {
      const t = tracker(phased, 4);
      t.observe(sim(1, 57), 1_000);
      // Eight qualifying rows by d 11: Q = 8 * 20 / 10 = 16, capped at 8, so
      // R = 4 * (1 + 8) = 36, the whole budget.
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      // r = (2000 - 1000) / 10 = 100; 100 * ((21 - 11) + 20 + 2 * 36)
      t.observe(sim(11, 57), 2_000);
      expect(t.view().remainingMs).toBe(10_200);
      // r_B = (3000 - 1000) / 20 = 100; 100 * (20 + 2 * 36)
      t.observe(sim(21, 57), 3_000);
      expect(t.view().remainingMs).toBe(9_200);
      // A row in the silent set phase changes nothing: the value is held.
      t.observe({ kind: "row", row: {} }, 4_000);
      expect(t.view().remainingMs).toBe(9_200);
      // b = 21; r_B * k * (T - b) = 100 * 2 * 36
      t.observe(RANKING, 5_000);
      expect(t.view().remainingMs).toBe(7_200);
      // m = 1: r_B * k * (T - d) = 100 * 2 * 35
      t.observe(sim(22, 57), 5_300);
      expect(t.view().remainingMs).toBe(7_000);
      // m = 2: (5700 - 5000) / 2 * (57 - 23) = 350 * 34
      t.observe(sim(23, 57), 5_700);
      expect(t.view().remainingMs).toBe(11_900);
      // The last sim leaves nothing.
      t.observe(sim(57, 57), 9_000);
      expect(t.view().remainingMs).toBe(0);
    });

    it("falls back to linear, then the observed rate, without a boundary", () => {
      const t = tracker(phased, 4);
      t.observe(sim(1, 57), 1_000);
      t.observe(sim(11, 57), 2_000);
      // done 22 > B 21 drops the boundary. Linear: 2100 / 21 * (57 - 22)
      t.observe(sim(22, 57), 3_100);
      expect(t.view().remainingMs).toBe(3_500);
      // No boundary event, so r_B = (3100 - 1000) / (22 - 1) = 100;
      // b = 22: 100 * 2 * (57 - 22)
      t.observe(RANKING, 4_000);
      expect(t.view().remainingMs).toBe(7_000);
    });
  });

  describe("slowdown term in the candidate estimate", () => {
    // Five events, four candidates done (n = 4) at 250 ms each. T = 47 is
    // c = 10, so B = 11 and R = 36. kappa 0.25 at concurrency 4 gives k = 1;
    // psi = 2. With S(x) = x(x + 1)/2: a = tau / (n + s S(n)),
    // C = a ((c - n) + s (S(c) - S(n))), rbar = (tau + C) / c and the
    // estimate is C + rbar (psi + k R).
    const sims = [0, 250, 500, 750, 1_000].map((t, i) => ({
      t,
      done: i + 1,
      afterRanking: false,
    }));
    // Four qualifying rows at n = 4: Q = 4 * 10 / 4 = 10, capped at 8, so
    // R = 4 * (1 + 8) = 36, the whole budget.
    const run = (over: Partial<RunTimeline> = {}): RunTimeline => ({
      sims,
      rankingAt: undefined,
      total: 47,
      boundary: 11,
      concurrency: 4,
      now: 1_000,
      qualifyingRows: 4,
      seedCount: 5,
      topN: 8,
      ...over,
    });
    const config = (slowdown: number): EstimatorConfig => ({
      kind: "phased",
      kappa: 0.25,
      psi: 2,
      slowdown,
    });

    it("uses the boundary the tab solves for total 47", () => {
      expect(mod.replicationBoundary(47, 5, 8)).toBe(11);
    });

    it.each([
      // Round 3's rule: 250 * (11 - 5 + 2 + 36)
      [0, 11_000],
      // a = 1000 / (4 + 0.1 * 10) = 200; C = 200 * (6 + 0.1 * 45) = 2100;
      // rbar = 3100 / 10 = 310; 2100 + 310 * 38
      [0.1, 13_880],
      // a = 1000 / 6; C = a * (6 + 0.2 * 45) = 2500; rbar = 350; 2500 + 350 * 38
      [0.2, 15_800],
    ])("with slowdown %f reads %i", (slowdown, expected) => {
      expect(mod.estimateRemainingMs(config(slowdown), run())).toBeCloseTo(
        expected,
        6
      );
    });

    it.each([0, 0.1])(
      "leaves the boundary rule unchanged (slowdown %f)",
      (slowdown) => {
        // r_B = 3000 / 10 = 300; 300 * (2 + 36)
        const atBoundary = run({
          sims: [...sims, { t: 3_000, done: 11, afterRanking: false }],
          now: 3_000,
          qualifyingRows: 8,
        });
        expect(
          mod.estimateRemainingMs(config(slowdown), atBoundary)
        ).toBeCloseTo(11_400, 6);
      }
    );

    it.each([0, 0.1])(
      "stays linear without a boundary (slowdown %f)",
      (slowdown) => {
        // 1000 / 4 * (47 - 5)
        expect(
          mod.estimateRemainingMs(config(slowdown), run({ boundary: null }))
        ).toBeCloseTo(10_500, 6);
      }
    );

    it("ships the round-4 constants fitted on run 1", () => {
      expect(mod.RUN_PROGRESS_ESTIMATOR).toEqual({
        kind: "phased",
        kappa: 0.3221,
        psi: 50.993,
        slowdown: 0.003064,
      });
      expect(mod.RUN_PROGRESS_SHOW_FROM_FRACTION).toBe(0.35);
      expect(mod.RUN_PROGRESS_MIN_CANDIDATES_DONE).toBe(10);
    });
  });

  describe("replication count from rows that clear the cutoff", () => {
    // kappa 0.5 at concurrency 4 gives k = 2; psi = 20; T = 57 is c = 20,
    // so B = 21. Five seeds and top-N 8: each re-simmed row and the baseline
    // take 4 sims, so R = 4 * (1 + min(8, Q)), or 0 when Q = 0.
    const config: EstimatorConfig = {
      kind: "phased",
      kappa: 0.5,
      psi: 20,
      slowdown: 0,
    };

    it("N1: expects no replication when no row qualifies", () => {
      const t = tracker(config, 4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 9; i++) t.observe(row(true), 1_500);
      // A row Stop left unsimmed is never re-simmed.
      t.observe(row(false, false), 1_500);
      expect(t.view().qualifyingRows).toBe(0);
      // r = 100; R = 0: 100 * ((21 - 11) + 20 + 0)
      t.observe(sim(11, 57), 2_000);
      expect(t.view().remainingMs).toBeCloseTo(3_000, 6);
      // r_B = 100; 100 * (20 + 0)
      t.observe(sim(21, 57), 3_000);
      expect(t.view().remainingMs).toBeCloseTo(2_000, 6);
      // Expected final done = B = 21, so ranking: 100 * 2 * (21 - 21)
      t.observe(RANKING, 5_000);
      expect(t.view().phase).toBe("ranking");
      expect(t.view().remainingMs).toBeCloseTo(0, 6);
    });

    it("N2: projects the count before the boundary and fixes it there", () => {
      const t = tracker(config, 4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 3; i++) t.observe(row(false), 1_500);
      for (let i = 0; i < 7; i++) t.observe(row(true), 1_500);
      // Q = 3 * 20 / 10 = 6, R = 4 * 7 = 28: 100 * (10 + 20 + 2 * 28)
      t.observe(sim(11, 57), 2_000);
      expect(t.view().remainingMs).toBeCloseTo(8_600, 6);
      for (let i = 0; i < 10; i++) t.observe(row(true), 2_500);
      expect(t.view().remainingMs).toBeCloseTo(8_600, 6);
      // Q = 3 at the boundary, R = 16: 100 * (20 + 2 * 16)
      t.observe(sim(21, 57), 3_000);
      expect(t.view().remainingMs).toBeCloseTo(5_200, 6);
      // Expected final done 37: 100 * 2 * 16
      t.observe(RANKING, 5_000);
      expect(t.view().phase).toBe("replication");
      expect(t.view().remainingMs).toBeCloseTo(3_200, 6);
      // m = 1: 100 * 2 * (37 - 22)
      t.observe(sim(22, 57), 5_300);
      expect(t.view().remainingMs).toBeCloseTo(3_000, 6);
      // m = 2: (5700 - 5000) / 2 * (37 - 23)
      t.observe(sim(23, 57), 5_700);
      expect(t.view().remainingMs).toBeCloseTo(4_900, 6);
      t.observe(sim(37, 57), 9_000);
      expect(t.view().phase).toBe("ranking");
      expect(t.view().remainingMs).toBeCloseTo(0, 6);
    });

    it("N3 and N4: counts a row after the boundary event, then self-checks", () => {
      const t = tracker(config, 4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 10; i++) t.observe(row(true), 1_500);
      // r_B = 100; Q = 0: 100 * 20
      t.observe(sim(21, 57), 3_000);
      expect(t.view().remainingMs).toBeCloseTo(2_000, 6);
      // Q = 1, R = 8, recomputed at the boundary event: 100 * (20 + 2 * 8)
      t.observe(row(false), 3_010);
      expect(t.view().remainingMs).toBeCloseTo(3_600, 6);
      // Expected final done 29: 100 * 2 * 8
      t.observe(RANKING, 5_000);
      expect(t.view().phase).toBe("replication");
      expect(t.view().remainingMs).toBeCloseTo(1_600, 6);
      // N4. m = 1: 100 * 2 * (29 - 22)
      t.observe(sim(22, 57), 5_300);
      expect(t.view().remainingMs).toBeCloseTo(1_400, 6);
      // m = 2: 350 * (29 - 23)
      t.observe(sim(23, 57), 5_700);
      expect(t.view().remainingMs).toBeCloseTo(2_100, 6);
      // 30 > 29, so the count was wrong and total is used: 3000 / 9 * 27
      t.observe(sim(30, 57), 8_000);
      expect(t.view().phase).toBe("replication");
      expect(t.view().remainingMs).toBeCloseTo(9_000, 6);
    });
  });

  describe("when the estimate is shown", () => {
    it("waits for the show fraction, then stays shown", () => {
      const t = new mod.RunProgressTracker({
        estimator: { kind: "linear" },
        showFromFraction: 0.5,
        minCandidatesDone: 10,
      });
      t.setConcurrency(1);
      t.observe(sim(1, 100), 0);
      t.observe(sim(11, 100), 1_000);
      expect(t.view().remainingMs).toBeUndefined();
      t.observe(sim(49, 100), 4_800);
      expect(t.view().remainingMs).toBeUndefined();
      // 4900 / 49 * (100 - 50) = 100 * 50
      t.observe(sim(50, 100), 4_900);
      expect(t.view().remainingMs).toBe(5_000);
      t.observe(sim(51, 100), 5_000);
      expect(t.view().remainingMs).toBeDefined();
      t.observe(RANKING, 5_100);
      expect(t.view().remainingMs).toBeDefined();
    });

    it("waits for the minimum number of candidates", () => {
      const t = new mod.RunProgressTracker({
        estimator: { kind: "linear" },
        showFromFraction: 0.05,
        minCandidatesDone: 10,
      });
      t.setConcurrency(1);
      t.observe(sim(1, 100), 0);
      // 9 candidates done
      t.observe(sim(10, 100), 900);
      expect(t.view().remainingMs).toBeUndefined();
      // 10 candidates done: 1000 / 10 * (100 - 11) = 100 * 89
      t.observe(sim(11, 100), 1_000);
      expect(t.view().remainingMs).toBe(8_900);
    });

    it("hides the estimate from a Stop on", () => {
      const t = tracker({ kind: "linear" });
      t.observe(sim(1, 100), 0);
      t.observe(sim(20, 100), 1_900);
      expect(t.view().remainingMs).toBeDefined();
      t.noteStop();
      expect(t.view().remainingMs).toBeUndefined();
      t.observe(sim(21, 100), 2_000);
      t.observe(RANKING, 2_100);
      expect(t.view().remainingMs).toBeUndefined();
    });
  });
});

/* ------------------------------------------------------------------ *
 * Engine order: the real fork engine, the tab's default seeds
 * ------------------------------------------------------------------ */

const SIM_VERSION = "v0.0.101";
const BASE_DPS = 3000;

// Real set-piece ids (Thunderheart Harness 676, Malorne Harness 640).
const THUNDERHEART = {
  head: 31039,
  shoulder: 31048,
  chest: 31042,
  hands: 31034,
  legs: 31044,
} as const;
const MALORNE = { hands: 29097, legs: 29099 } as const;
// Non-set items, so a candidate can replace a Malorne piece.
const NEUTRAL = { hands: 10140, legs: 8289 } as const;

const ITEM_VALUE = new Map<number, number>([
  ...Object.values(THUNDERHEART).map((id) => [id, 100] as const),
  [NEUTRAL.hands, 120],
  [NEUTRAL.legs, 120],
]);
const SET_BONUSES: Record<number, { b2: number; b4: number }> = {
  676: { b2: 50, b4: 80 },
  640: { b2: 40, b4: 70 },
};

type RaidSimRequest = Readonly<Record<string, unknown>>;
type SimRunOpts = { seed: number; iterations: number };

const feralSkeleton = JSON.parse(
  readFileSync(
    join(root, "data/presets/feral/p2.raid-sim-skeleton.json"),
    "utf8"
  )
) as RaidSimRequest;
const feralWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/feral/p1.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

function equippedIds(req: RaidSimRequest): number[] {
  const raid = (req as { raid?: { parties?: unknown[] } }).raid;
  const party = raid?.parties?.[0] as { players?: unknown[] } | undefined;
  const player = party?.players?.[0] as
    { equipment?: { items?: Array<{ id?: number }> } } | undefined;
  return (player?.equipment?.items ?? []).map((i) => i?.id ?? 0);
}

const FERAL_CHAR = { region: "US" as const, realm: "test", name: "progress" };
const FERAL_SUMMARY = {
  reportCode: "prog001",
  fightId: 1,
  encounterName: "Test Dummy",
  killedAt: "2026-10-03T00:00:00.000Z",
  route: "ranked" as const,
  confidence: 1,
};

type RecordedEvent = { progress: Progress; simCallsSoFar: number };

/**
 * One cold run: Malorne 2pc worn in hands and legs, Thunderheart and neutral
 * candidates, the broken-bonus measurement on, and no `seeds`, as the tab
 * calls it. The fake sim has no `computeStats`, so the engine skips its stats
 * reads (rank.ts `hitCapReadable`).
 */
async function recordRun(
  candidateValue: ReadonlyMap<number, number> = ITEM_VALUE
): Promise<RecordedEvent[]> {
  const rankMod = await importForkUpgrades<{
    rankUpgrades: (
      input: Record<string, unknown>,
      deps: Record<string, unknown>,
      onProgress: (p: Progress) => void
    ) => Promise<unknown>;
  }>("engine/rank.ts");
  const storeMod = await importForkUpgrades<{
    MemoryStore: new () => Record<string, unknown>;
  }>("engine/seams/store.ts");
  const gearMod = await importForkUpgrades<{
    RecordedGearSource: new (data: {
      fights: ReadonlyMap<string, unknown[]>;
      gear: ReadonlyMap<string, unknown>;
    }) => unknown;
    characterFightKey: (c: unknown, spec: string) => string;
    fightGearKey: (f: unknown) => string;
  }>("engine/seams/gear-source.ts");
  const itemsMod = await importForkUpgrades<{
    getItem: (id: number) => { setId?: number } | undefined;
  }>("engine/items.ts");

  const worn: Partial<Record<SimOrderName, number>> = {
    hands: MALORNE.hands,
    legs: MALORNE.legs,
  };
  const fightRef = {
    reportCode: FERAL_SUMMARY.reportCode,
    fightId: FERAL_SUMMARY.fightId,
  };
  const gearSource = new gearMod.RecordedGearSource({
    fights: new Map([
      [gearMod.characterFightKey(FERAL_CHAR, "feral"), [FERAL_SUMMARY]],
    ]),
    gear: new Map([
      [
        gearMod.fightGearKey(fightRef),
        {
          items: SIM_ORDER.map((slot) => ({
            id: worn[slot] ?? 0,
            slot,
            gems: [],
          })),
          talentPointsByTree: [0, 45, 16],
          provenance: { ...fightRef, sourceID: 1 },
        },
      ],
    ]),
  });

  const pool = [
    ...(["head", "shoulder", "chest", "hands", "legs"] as const).map(
      (slot) => ({ itemId: THUNDERHEART[slot], slot })
    ),
    { itemId: NEUTRAL.hands, slot: "hands" },
    { itemId: NEUTRAL.legs, slot: "legs" },
  ].map((p) => ({
    ...p,
    name: `item ${p.itemId}`,
    phase: 1,
    source: { kind: "badge" as const, cost: 1 },
  }));

  let simCalls = 0;
  const fakeSim = {
    version: () => Promise.resolve(SIM_VERSION),
    run: (req: RaidSimRequest, opts: SimRunOpts) => {
      simCalls += 1;
      let dps = BASE_DPS;
      const setCounts = new Map<number, number>();
      for (const id of equippedIds(req)) {
        if (!id) continue;
        dps += candidateValue.get(id) ?? 0;
        const setId = itemsMod.getItem(id)?.setId;
        if (setId != null)
          setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
      }
      for (const [setId, count] of setCounts) {
        const bonus = SET_BONUSES[setId];
        if (!bonus) continue;
        if (count >= 2) dps += bonus.b2;
        if (count >= 4) dps += bonus.b4;
      }
      return Promise.resolve({
        dps,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
      });
    },
  };

  const events: RecordedEvent[] = [];
  await rankMod.rankUpgrades(
    {
      character: FERAL_CHAR,
      spec: "feral",
      maxPhase: 5,
      fight: fightRef,
      iterations: 3000,
      candidateCap: 100,
    },
    {
      gear: gearSource,
      sim: fakeSim,
      store: new storeMod.MemoryStore(),
      clock: () => new Date("2026-10-03T12:00:00.000Z"),
      raidSimSkeleton: feralSkeleton,
      epWeights: feralWeights,
      pool,
      measureBrokenSetValue: true,
    },
    (progress) => events.push({ progress, simCallsSoFar: simCalls })
  );
  return events;
}

describe.skipIf(!forkPresent || !moduleExists())(
  "run progress event order (542)",
  () => {
    let mod: RunProgressModule;
    let topN: number;
    let events: RecordedEvent[];
    let zeroQualifyEvents: RecordedEvent[];

    beforeAll(async () => {
      mod = await importForkUpgrades<RunProgressModule>("run_progress.ts");
      topN = (
        await importForkUpgrades<{ PAIRED_REPLICATE_TOP_N: number }>(
          "engine/se.ts"
        )
      ).PAIRED_REPLICATE_TOP_N;
      events = await recordRun();
      // Every candidate loses 50 DPS, so no row clears the cutoff.
      zeroQualifyEvents = await recordRun(
        new Map([...ITEM_VALUE.keys()].map((id) => [id, -50] as const))
      );
    }, 240_000);

    const stageEvents = (from: RecordedEvent[] = events) =>
      from.filter(
        (
          e
        ): e is RecordedEvent & {
          progress: Exclude<Progress, { kind: "row" }>;
        } => !("kind" in e.progress)
      );
    const rankingIndex = (from: RecordedEvent[] = events) =>
      stageEvents(from).findIndex((e) => e.progress.stage === "ranking");
    const simmingAfterRanking = (from: RecordedEvent[]) =>
      stageEvents(from)
        .slice(rankingIndex(from) + 1)
        .filter((e) => e.progress.stage === "simming");
    const landedRows = (from: RecordedEvent[]) =>
      from
        .map((e) => e.progress)
        .filter(
          (p): p is Extract<Progress, { kind: "row" }> =>
            "kind" in p && p.kind === "row"
        )
        .map((p) => p.row as { belowCutoff?: boolean; simmed?: boolean });
    const simmingBeforeRanking = () =>
      stageEvents()
        .slice(0, rankingIndex())
        .filter((e) => e.progress.stage === "simming");

    it("solves the set-phase boundary from the first total with the tab's seed count", () => {
      expect(rankingIndex()).toBeGreaterThan(0);
      const sims = simmingBeforeRanking();
      const first = sims[0]!.progress as { done: number; total: number };
      const last = sims[sims.length - 1]!.progress as { done: number };
      // The first event is the baseline sim (done 1); each later one before
      // `ranking` is one candidate.
      const candidates = sims.length - 1;
      expect(candidates).toBeGreaterThan(0);
      expect(
        mod.replicationBoundary(first.total, mod.TAB_REPLICATE_SEED_COUNT, topN)
      ).toBe(last.done);
      expect(last.done).toBe(1 + candidates);
    });

    it("runs set-phase sims between the last candidate event and ranking", () => {
      const sims = simmingBeforeRanking();
      const lastCandidate = sims[sims.length - 1]!;
      const ranking = stageEvents()[rankingIndex()]!;
      expect(ranking.simCallsSoFar).toBeGreaterThan(
        lastCandidate.simCallsSoFar
      );
    });

    it("counts replication sims after ranking, above the boundary", () => {
      const sims = simmingBeforeRanking();
      const first = sims[0]!.progress as { total: number };
      const boundary = (sims[sims.length - 1]!.progress as { done: number })
        .done;
      const after = stageEvents()
        .slice(rankingIndex() + 1)
        .filter((e) => e.progress.stage === "simming")
        .map((e) => e.progress as { done: number; total: number });
      expect(after.length).toBeGreaterThan(0);
      for (const p of after) {
        expect(p.done).toBeGreaterThan(boundary);
        expect(p.done).toBeLessThanOrEqual(first.total);
      }
    });

    it("gives the tracker the phases preparing, candidates, set bonuses, replication", () => {
      const tracker = new mod.RunProgressTracker({
        estimator: { kind: "linear" },
        showFromFraction: 0.45,
        minCandidatesDone: 10,
      });
      tracker.setConcurrency(1);
      const phases: RunPhase[] = [tracker.view().phase];
      events.forEach((e, i) => {
        tracker.observe(e.progress, (i + 1) * 100);
        const phase = tracker.view().phase;
        if (phases[phases.length - 1] !== phase) phases.push(phase);
      });
      const expected: RunPhase[] = [
        "preparing",
        "candidates",
        "set-bonuses",
        "replication",
      ];
      expect([expected, [...expected, "ranking"]]).toContainEqual(phases);
    });

    it("re-sims the baseline and each qualifying row, at most top-N", () => {
      const q = landedRows(events).filter(
        (r) => r.belowCutoff === false && r.simmed !== false
      ).length;
      expect(simmingAfterRanking(events)).toHaveLength(
        q > 0 ? (mod.TAB_REPLICATE_SEED_COUNT - 1) * (1 + Math.min(topN, q)) : 0
      );
    });

    it("runs no replication when no row qualifies, and the tracker expects none", () => {
      const landed = landedRows(zeroQualifyEvents);
      expect(landed.length).toBeGreaterThan(0);
      for (const r of landed) expect(r.belowCutoff).toBe(true);
      expect(rankingIndex(zeroQualifyEvents)).toBeGreaterThan(0);
      expect(simmingAfterRanking(zeroQualifyEvents)).toHaveLength(0);

      const tracker = new mod.RunProgressTracker({
        estimator: mod.RUN_PROGRESS_ESTIMATOR,
        showFromFraction: 0.05,
        minCandidatesDone: 1,
      });
      tracker.setConcurrency(1);
      const phases: RunPhase[] = [tracker.view().phase];
      zeroQualifyEvents.forEach((e, i) => {
        tracker.observe(e.progress, (i + 1) * 100);
        const phase = tracker.view().phase;
        if (phases[phases.length - 1] !== phase) phases.push(phase);
      });
      expect(phases).toEqual([
        "preparing",
        "candidates",
        "set-bonuses",
        "ranking",
      ]);
      expect(tracker.view().remainingMs).toBe(0);
    });
  }
);
