/**
 * The Upgrades tab's run progress tracker (ticket 542), on the fork.
 *
 * `run_progress.ts` turns the engine's `Progress` events into the activity the
 * progress component names, the bar's ratio and a remaining-time estimate.
 *
 * Two blocks:
 * - the pure block drives the module's exports with hand-built event lists,
 *   and every expected value is worked out by hand in the comment beside it;
 * - the engine-order block drives the real fork `rankUpgrades` with a
 *   controlled sim and the engine's default seeds, the way the tab calls it
 *   (no `seeds`), on a seven- and a twelve-candidate pool, a pool where no
 *   row clears the cutoff and a capped pool, and checks the tracker's
 *   set-phase boundary, activities and replication count, and that each run ends
 *   on `done === total`, against the events the engine really sends.
 *
 * The fork is gitignored (`vendor/`), so both blocks skip when the module is
 * absent, which includes every CI run.
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
  statsOnlyItemEp,
  tracedRank,
  zeroHitStats,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const runProgressModule = join(forkUpgradesDir, "run_progress.ts");
const moduleExists = (): boolean => existsSync(runProgressModule);

type Progress =
  | { stage: "resolving" }
  | { stage: "reading-gear" }
  | { stage: "composing" }
  | { stage: "building-pool" }
  | { stage: "simming"; done: number; total: number; candidateSims?: number }
  | { kind: "row"; row: unknown }
  | { stage: "ranking" };

type RunActivity =
  "preparing" | "candidates" | "set-bonuses" | "replication" | "ranking";

type RunTimeline = {
  sims: ReadonlyArray<{ t: number; done: number; afterRanking: boolean }>;
  rankingAt: number | undefined;
  total: number;
  doneAtLastCandidate: number | null;
  concurrency: number;
  now: number;
  replicableRowCount: number;
  seedCount: number;
  topN: number;
  finalTotal?: number;
  inFlight?: number;
  stageStartedAt?: number;
  candidateSims?: number;
  candidateSimsEnded?: number;
};

type RunProgressView = {
  activity: RunActivity;
  stage: string;
  done?: number;
  total?: number;
  doneAtLastCandidate: number | null;
  remainingMs?: number;
  replicableRowCount: number;
};

type Tracker = {
  setConcurrency(n: number): void;
  noteStop(): void;
  observe(p: Progress, nowMs: number): void;
  observeIterations(
    simId: string,
    completed: number,
    total: number,
    nowMs: number
  ): void;
  view(): RunProgressView;
};

type RunProgressModule = {
  TAB_REPLICATE_SEED_COUNT: number;
  doneAtLastCandidateFor(
    total: number,
    seedCount: number,
    topN: number
  ): number | null;
  formatElapsed(ms: number): string;
  estimateRemainingMs(run: RunTimeline): number | undefined;
  expectedFinalDone(run: RunTimeline): number;
  RunProgressTracker: new (opts?: {
    seedCount?: number;
    topN?: number;
  }) => Tracker;
};

const loadModule = async () =>
  (await import(pathToFileURL(runProgressModule).href)) as RunProgressModule;

/** A `simming` event; a candidates' event also says how many sims the candidates run. */
const sim = (
  done: number,
  total: number,
  candidateSims?: number
): Progress => ({
  stage: "simming",
  done,
  total,
  ...(candidateSims === undefined ? {} : { candidateSims }),
});
const RANKING: Progress = { stage: "ranking" };
/** A sim's first report, with no iterations done yet: it starts the stage's clock. */
const startClock = (t: Tracker, nowMs: number) =>
  t.observeIterations("clock", 0, 1_000, nowMs);
/** Sims that end, each counted as one done, as the runner reports a sim's end. */
const endSims = (t: Tracker, ids: readonly string[], nowMs: number) => {
  for (const id of ids) t.observeIterations(id, 1_000, 1_000, nowMs);
};
const ids = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => `${prefix}${i}`);
const row = (belowCutoff: boolean, simmed?: boolean): Progress => ({
  kind: "row",
  row: { belowCutoff, ...(simmed === undefined ? {} : { simmed }) },
});

describe.skipIf(!moduleExists())("run progress tracker (542), pure", () => {
  let mod: RunProgressModule;

  beforeAll(async () => {
    mod = await loadModule();
  });

  const tracker = (concurrency = 1): Tracker => {
    const t = new mod.RunProgressTracker();
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

  describe("doneAtLastCandidateFor", () => {
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
      expect(mod.doneAtLastCandidateFor(total, 5, 8)).toBe(boundary);
    });

    it("returns the total itself with a single seed", () => {
      expect(mod.doneAtLastCandidateFor(57, 1, 8)).toBe(57);
    });

    it.each([7, 38])("returns null for total %i, which no c gives", (total) => {
      expect(mod.doneAtLastCandidateFor(total, 5, 8)).toBeNull();
    });
  });

  describe("activities follow the engine's event order", () => {
    // T = 57 is c = 20 candidates: 1 + 20 + 4 * 9, so B = 21.
    it("names each pre-sim stage as preparing", () => {
      const t = tracker();
      expect(t.view().activity).toBe("preparing");
      for (const stage of [
        "resolving",
        "reading-gear",
        "composing",
        "building-pool",
      ] as const) {
        t.observe({ stage }, 10);
        expect(t.view()).toMatchObject({ activity: "preparing", stage });
      }
      expect(t.view().done).toBeUndefined();
      expect(t.view().doneAtLastCandidate).toBeNull();
    });

    it("walks candidates, set bonuses, replication and ranking", () => {
      const t = tracker();
      t.observe({ stage: "building-pool" }, 0);
      t.observe(sim(1, 57), 100);
      expect(t.view()).toMatchObject({
        activity: "candidates",
        done: 1,
        total: 57,
        doneAtLastCandidate: 21,
      });
      t.observe(sim(20, 57), 200);
      expect(t.view().activity).toBe("candidates");
      // Eight rows clear the cutoff, so all 36 replication sims are expected.
      for (let i = 0; i < 8; i++) t.observe(row(false), 210);
      expect(t.view()).toMatchObject({ activity: "candidates", done: 20 });
      t.observe(sim(21, 57), 300);
      expect(t.view()).toMatchObject({ activity: "set-bonuses", done: 21 });
      t.observe(RANKING, 400);
      expect(t.view()).toMatchObject({
        activity: "replication",
        stage: "ranking",
        done: 21,
      });
      // The engine restates the total: eight rows re-simmed, 21 + 4 * 9 = 57.
      t.observe(sim(21, 57), 450);
      expect(t.view()).toMatchObject({
        activity: "replication",
        done: 21,
        total: 57,
      });
      t.observe(sim(40, 57), 500);
      expect(t.view().activity).toBe("replication");
      t.observe(sim(57, 57), 600);
      expect(t.view()).toMatchObject({ activity: "ranking", done: 57 });
    });

    it("names a ranking with no sim count, a cached ranking, ranking", () => {
      const t = tracker();
      t.observe({ stage: "resolving" }, 0);
      t.observe(RANKING, 50);
      expect(t.view()).toMatchObject({ activity: "ranking", stage: "ranking" });
      expect(t.view().done).toBeUndefined();
    });

    it("names the ranking after a Stop ranking, not replication", () => {
      const t = tracker();
      t.observe(sim(1, 57), 100);
      t.observe(sim(8, 57), 200);
      t.noteStop();
      t.observe(sim(9, 57), 300);
      expect(t.view().activity).toBe("candidates");
      t.observe(RANKING, 400);
      expect(t.view()).toMatchObject({ activity: "ranking", done: 9 });
    });

    it("drops the boundary when a candidate count passes it", () => {
      const t = tracker();
      t.observe(sim(1, 57), 100);
      t.observe(sim(22, 57), 200);
      expect(t.view()).toMatchObject({
        activity: "candidates",
        doneAtLastCandidate: null,
      });
      // The boundary stays dropped, so done == 21 is not the set phase.
      t.observe(sim(21, 57), 250);
      expect(t.view()).toMatchObject({
        activity: "candidates",
        doneAtLastCandidate: null,
      });
      t.observe(RANKING, 300);
      expect(t.view().activity).toBe("replication");
    });
  });

  describe("the stage's clock, from its first progress report", () => {
    // The Bulk sim restarts its clock at the first progress report of a new
    // stage (`features/bulk/model/core_sim.ts:48-51`), not when the stage is
    // named, so the time spent sending the stage's sims out is not priced.
    it("starts the candidates' clock at their first report, with no figure at it", () => {
      const t = tracker(4);
      // 20 candidates of one slot each run 20 sims.
      t.observe(sim(1, 57, 20), 1_000);
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 0, 1_000, 1_500);
      // No time has passed on the stage's clock, so no figure, not "0s".
      expect(t.view().remainingMs).toBeUndefined();
      // Four sims a quarter done 500 ms in: one sim's worth, 500 / 1 * (20 - 1)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 250, 1_000, 2_000);
      expect(t.view().remainingMs).toBe(9_500);
    });

    it("starts the re-sims' clock at their first report, not at the ranking event", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      t.observe(sim(21, 57), 3_000);
      t.observe(RANKING, 5_000);
      t.observe(sim(21, 57), 5_000);
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 0, 500, 5_400);
      expect(t.view().remainingMs).toBeUndefined();
      // Four re-sims half done 2 s after their first report: two re-sims'
      // worth, 34 left: 2000 / 2 * (36 - 2)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 250, 500, 7_400);
      expect(t.view().remainingMs).toBe(34_000);
    });

    it("starts the clock at a counted step when no sim reported before it", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      // The store answered the first candidate's sim: it lands with no
      // report, and the candidates have 19 sims left to run.
      t.observe(sim(2, 57, 19), 1_100);
      expect(t.view().remainingMs).toBeUndefined();
      // Four sims half done at 2100 ms, two sims' worth since the clock
      // started at 1100 ms: 1000 / 2 * (19 - 2)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 500, 1_000, 2_100);
      expect(t.view().remainingMs).toBe(8_500);
    });
  });

  describe("the time left of the stage under way (896)", () => {
    // T = 57 is c = 20 candidates: 1 + 20 + 4 * 9, so B = 21. Each test's
    // first report starts the stage's clock (the describe above).
    it("prices the candidates left at the pace of the candidates so far, and no later stage", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      startClock(t, 1_000);
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      // 10 sims done at 2000 ms: (2000 - 1000) / 10 * (20 - 10)
      endSims(t, ids("s", 10), 2_000);
      t.observe(sim(11, 57, 20), 2_000);
      expect(t.view().remainingMs).toBe(1_000);
    });

    it("prices the re-sims left at the pace of the re-sims so far, from their first report", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      t.observe(sim(21, 57), 3_000);
      t.observe(RANKING, 5_000);
      // The engine restates the total: eight rows re-simmed, 21 + 4 * 9 = 57,
      // so the stage holds 36 re-sims.
      t.observe(sim(21, 57), 5_000);
      startClock(t, 5_000);
      // m = 4 at 5800 ms: (5800 - 5000) / 4 * (36 - 4)
      t.observe(sim(25, 57), 5_800);
      expect(t.view().remainingMs).toBe(6_400);
    });

    it("gives no time left in the set stage, which sends no count, nor before a re-sim is done", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      startClock(t, 1_000);
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      endSims(t, ids("s", 10), 2_000);
      t.observe(sim(11, 57, 20), 2_000);
      expect(t.view().remainingMs).toBeDefined();
      t.observe(sim(21, 57), 3_000);
      expect(t.view().activity).toBe("set-bonuses");
      expect(t.view().remainingMs).toBeUndefined();
      // A row that lands in the silent set stage recomputes nothing.
      t.observe(row(false), 4_000);
      expect(t.view().remainingMs).toBeUndefined();
      t.observe(RANKING, 5_000);
      expect(t.view().remainingMs).toBeUndefined();
      t.observe(sim(21, 57), 5_000);
      expect(t.view().remainingMs).toBeUndefined();
    });

    it("shows the time left from the first candidate done, as the Bulk sim does from its first step (898)", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      startClock(t, 1_000);
      expect(t.view().remainingMs).toBeUndefined();
      // 1 sim done at 1100 ms: 100 / 1 * (20 - 1)
      endSims(t, ["a"], 1_100);
      t.observe(sim(2, 57, 20), 1_100);
      expect(t.view().remainingMs).toBe(1_900);
    });

    it("counts the candidates under way by their iterations done, so the figure moves between landings", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      startClock(t, 1_000);
      // Four sims a quarter done at 1500 ms: one sim's worth in 500 ms,
      // 19 left: 500 / 1 * (20 - 1)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 250, 1_000, 1_500);
      expect(t.view().remainingMs).toBe(9_500);
      // Half done at 2000 ms: two sims' worth, 1000 / 2 * (20 - 2)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 500, 1_000, 2_000);
      expect(t.view().remainingMs).toBe(9_000);
      // "a" ends and its candidate lands: 1 done plus three halves,
      // (2400 - 1000) / 2.5 * (20 - 2.5)
      t.observeIterations("a", 1_000, 1_000, 2_400);
      t.observe(sim(2, 57, 20), 2_400);
      expect(t.view().remainingMs).toBeCloseTo(9_800, 6);
    });

    it("counts the re-sims under way by their iterations, and no set-stage sim (897)", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 8; i++) t.observe(row(false), 1_500);
      t.observe(sim(21, 57), 3_000);
      // A set-stage sim's iterations give that stage no time left, and do not
      // count toward the re-sims after it.
      t.observeIterations("set", 500, 1_000, 4_000);
      expect(t.view().remainingMs).toBeUndefined();
      t.observe(RANKING, 5_000);
      t.observe(sim(21, 57), 5_000);
      startClock(t, 5_000);
      // Four re-sims half done 2 s in: two re-sims' worth, 34 left:
      // 2000 / 2 * (36 - 2)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 250, 500, 7_000);
      expect(t.view().remainingMs).toBe(34_000);
    });
  });

  describe("each stage's own count", () => {
    it("gives no time left once a candidate count passes the boundary, since the stage's size is then unknown", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 20), 1_000);
      startClock(t, 1_000);
      endSims(t, ids("s", 10), 2_000);
      t.observe(sim(11, 57, 20), 2_000);
      expect(t.view().remainingMs).toBeDefined();
      // done 22 > B 21 drops the boundary.
      t.observe(sim(22, 57, 20), 3_100);
      expect(t.view()).toMatchObject({ doneAtLastCandidate: null });
      expect(t.view().remainingMs).toBeUndefined();
    });

    it("prices only the candidates left at half a steady run's candidates", () => {
      // 100 candidates of one sim at 250 ms each: T = 1 + 100 + 4 * 9 = 137,
      // B = 101. At 50 sims done: 250 * (100 - 50). No set stage or re-sim
      // is priced.
      const steady = Array.from({ length: 51 }, (_, i) => ({
        t: 250 * i,
        done: i + 1,
        afterRanking: false,
      }));
      expect(
        mod.estimateRemainingMs({
          sims: steady,
          rankingAt: undefined,
          total: 137,
          doneAtLastCandidate: 101,
          concurrency: 4,
          now: 12_500,
          replicableRowCount: 8,
          seedCount: 5,
          topN: 8,
          stageStartedAt: 0,
          candidateSims: 100,
          candidateSimsEnded: 50,
        })
      ).toBeCloseTo(12_500, 6);
    });
  });

  describe("the candidates, counted in sims (900)", () => {
    // Bulk's sim stage counts sims, the finished ones whole and the rest by
    // their iterations (`features/bulk/model/progress.ts:60-66`). T = 57 is
    // 20 candidates; 6 of them take two slots (a ring, a trinket), so the
    // candidates run 26 sims.
    it("keeps a finished sim's credit while its candidate's second slot runs, so the figure does not jump", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 26), 1_000);
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 0, 1_000, 1_000);
      // Four sims 95% done 7 s in: 3.8 sims, 7000 / 3.8 * (26 - 3.8)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 950, 1_000, 8_000);
      const before = t.view().remainingMs!;
      expect(before).toBeCloseTo((7_000 / 3.8) * 22.2, 6);
      // "a" and "b" end and their candidates land. "c" and "d" were the
      // first slots of two-slot candidates, whose second slots start.
      t.observeIterations("a", 1_000, 1_000, 8_100);
      t.observe(sim(2, 57, 26), 8_100);
      t.observeIterations("b", 1_000, 1_000, 8_100);
      t.observe(sim(3, 57, 26), 8_100);
      t.observeIterations("c", 1_000, 1_000, 8_100);
      t.observeIterations("d", 1_000, 1_000, 8_100);
      for (const id of ["c2", "d2", "e", "f"])
        t.observeIterations(id, 0, 1_000, 8_100);
      // Four sims done: 7100 / 4 * (26 - 4). Counted by the 2 candidates
      // landed, the figure would read 7100 / 2 * 18, over twice `before`.
      expect(t.view().remainingMs).toBeCloseTo((7_100 / 4) * 22, 6);
      expect(t.view().remainingMs!).toBeLessThan(before);
    });

    it("takes the sims the store answered out of the candidates' sims when their candidate lands", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 26), 1_000);
      startClock(t, 1_000);
      // A two-slot candidate the store answered lands at once and runs no sim.
      t.observe(sim(2, 57, 24), 1_000);
      // Four sims half done 1 s in: 1000 / 2 * (24 - 2)
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 500, 1_000, 2_000);
      expect(t.view().remainingMs).toBe(11_000);
    });

    it("counts a sim's end once, though the runner may report it twice", () => {
      const t = tracker(4);
      t.observe(sim(1, 57, 26), 1_000);
      for (const id of ["a", "b", "c", "d"])
        t.observeIterations(id, 0, 1_000, 1_000);
      // The worker's last report and the runner's own both say "a" ended.
      t.observeIterations("a", 1_000, 1_000, 2_000);
      t.observeIterations("a", 1_000, 1_000, 2_000);
      for (const id of ["b", "c", "d"])
        t.observeIterations(id, 500, 1_000, 2_000);
      // 1 done plus three halves: 1000 / 2.5 * (26 - 2.5)
      expect(t.view().remainingMs).toBeCloseTo(9_400, 6);
    });
  });

  describe("replication count from rows that clear the cutoff", () => {
    // T = 57 is c = 20, so B = 21. Five seeds and top-N 8: each re-simmed row
    // and the baseline take 4 sims, so R = 4 * (1 + min(8, Q)), or 0 when Q = 0.

    it("N1: expects no replication when no row qualifies", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 9; i++) t.observe(row(true), 1_500);
      // A row Stop left unsimmed is never re-simmed.
      t.observe(row(false, false), 1_500);
      expect(t.view().replicableRowCount).toBe(0);
      t.observe(sim(21, 57), 3_000);
      // Expected final done = B = 21, so ranking, with no time left.
      t.observe(RANKING, 5_000);
      expect(t.view().activity).toBe("ranking");
      expect(t.view().remainingMs).toBeUndefined();
    });

    it("N2: names the re-sims at ranking and sizes their stage from the engine's restated total", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 3; i++) t.observe(row(false), 1_500);
      for (let i = 0; i < 7; i++) t.observe(row(true), 1_500);
      t.observe(sim(21, 57), 3_000);
      t.observe(RANKING, 5_000);
      expect(t.view().activity).toBe("replication");
      // The engine restates the total as 21 + 4 * (1 + 3) = 37: 16 re-sims.
      t.observe(sim(21, 37), 5_000);
      startClock(t, 5_000);
      expect(t.view()).toMatchObject({ activity: "replication", total: 37 });
      // m = 2 at 5700 ms: (5700 - 5000) / 2 * (16 - 2)
      t.observe(sim(23, 37), 5_700);
      expect(t.view().remainingMs).toBeCloseTo(4_900, 6);
      t.observe(sim(37, 37), 9_000);
      expect(t.view().activity).toBe("ranking");
    });

    it("N3 and N4: counts a row after the boundary event, then takes the engine's total", () => {
      const t = tracker(4);
      t.observe(sim(1, 57), 1_000);
      for (let i = 0; i < 10; i++) t.observe(row(true), 1_500);
      t.observe(sim(21, 57), 3_000);
      // Q = 1 in the set stage.
      t.observe(row(false), 3_010);
      expect(t.view().replicableRowCount).toBe(1);
      t.observe(RANKING, 5_000);
      expect(t.view().activity).toBe("replication");
      // N4. The engine restates 33 = 21 + 4 * (1 + 2): two rows, not the one
      // counted, so the stage holds 12 re-sims.
      t.observe(sim(21, 33), 5_000);
      startClock(t, 5_000);
      expect(t.view()).toMatchObject({ activity: "replication", total: 33 });
      // 30 is past the projected 29 but short of 33: m = 9, 3000 / 9 * (12 - 9)
      t.observe(sim(30, 33), 8_000);
      expect(t.view().activity).toBe("replication");
      expect(t.view().remainingMs).toBeCloseTo(1_000, 6);
      t.observe(sim(33, 33), 9_000);
      expect(t.view().activity).toBe("ranking");
    });

    // A timeline with no restated total: the projection's self-check.
    const timeline = (over: Partial<RunTimeline>): RunTimeline => ({
      sims: [
        { t: 1_000, done: 1, afterRanking: false },
        { t: 3_000, done: 21, afterRanking: false },
        { t: 8_000, done: 30, afterRanking: true },
      ],
      rankingAt: 5_000,
      total: 57,
      doneAtLastCandidate: 21,
      concurrency: 4,
      now: 8_000,
      replicableRowCount: 1,
      seedCount: 5,
      topN: 8,
      ...over,
    });

    it("uses total when a replication event passes the projection and no total was restated", () => {
      // Projection 21 + 4 * (1 + 1) = 29; done 30 > 29, so total 57.
      expect(mod.expectedFinalDone(timeline({}))).toBe(57);
    });

    it("returns the restated total when there is one", () => {
      expect(mod.expectedFinalDone(timeline({ finalTotal: 33 }))).toBe(33);
    });
  });

  describe("when the estimate is shown", () => {
    it("hides the estimate from a Stop on", () => {
      const t = tracker();
      t.observe(sim(1, 100, 63), 0);
      startClock(t, 0);
      endSims(t, ids("s", 19), 1_900);
      t.observe(sim(20, 100, 63), 1_900);
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
// Five more pieces for slots nothing is worn in, so a pool can hold more
// candidates than PAIRED_REPLICATE_TOP_N (Thunderheart Wristguards,
// Waistguard and Treads; Primalstrike Bracers and Belt).
const EXTRA = [
  { itemId: 34444, slot: "wrist" },
  { itemId: 34556, slot: "waist" },
  { itemId: 34573, slot: "feet" },
  { itemId: 29527, slot: "wrist" },
  { itemId: 29526, slot: "waist" },
] as const;

const ITEM_VALUE = new Map<number, number>([
  ...Object.values(THUNDERHEART).map((id) => [id, 100] as const),
  [NEUTRAL.hands, 120],
  [NEUTRAL.legs, 120],
  ...EXTRA.map((p) => [p.itemId, 100] as const),
]);

/** A pool entry's slot: a sim slot, or a ring's or trinket's, which has two. */
type PoolSlot = { itemId: number; slot: SimOrderName | "finger" | "trinket" };

const SMALL_POOL: readonly PoolSlot[] = [
  ...(["head", "shoulder", "chest", "hands", "legs"] as const).map((slot) => ({
    itemId: THUNDERHEART[slot],
    slot,
  })),
  { itemId: NEUTRAL.hands, slot: "hands" },
  { itemId: NEUTRAL.legs, slot: "legs" },
];
const LARGE_POOL: readonly PoolSlot[] = [...SMALL_POOL, ...EXTRA];
// Rings and trinkets, each one candidate with two slots, so two sims
// (Shapeshifter's Signet, Garona's Signet Ring, Dragonspine Trophy,
// Bloodlust Brooch), and the small pool's one-slot candidates (ticket 900).
const TWO_SLOT: readonly PoolSlot[] = [
  { itemId: 30834, slot: "finger" },
  { itemId: 28649, slot: "finger" },
  { itemId: 28830, slot: "trinket" },
  { itemId: 29383, slot: "trinket" },
];
const MIXED_POOL: readonly PoolSlot[] = [...TWO_SLOT, ...SMALL_POOL];
const MIXED_VALUE = new Map<number, number>([
  ...ITEM_VALUE,
  ...TWO_SLOT.map((p) => [p.itemId, 100] as const),
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

type RankUpgrades = (
  input: Record<string, unknown>,
  deps: Record<string, unknown>,
  onProgress: (p: Progress) => void
) => Promise<unknown>;

/**
 * What every run here shares: Malorne 2pc worn in hands and legs, the pool
 * given, the broken-bonus measurement on, and no `seeds`, as the tab calls
 * it. The worn gear holds no meta, so the baseline's is the only stats read
 * and it moves no gem. `candidateCap` defaults to 100, more than any pool
 * here, so only a run that passes a smaller one is capped. `dpsOf` is the
 * sim's answer: the base, each worn item's value and the set bonuses.
 */
async function feralRun(
  poolSlots: readonly PoolSlot[],
  candidateCap = 100
): Promise<{
  rankUpgrades: RankUpgrades;
  input: Record<string, unknown>;
  deps: Record<string, unknown>;
  newStore: () => Record<string, unknown>;
  dpsOf: (req: RaidSimRequest, value: ReadonlyMap<number, number>) => number;
}> {
  const rankMod = await importForkUpgrades<{ rankUpgrades: RankUpgrades }>(
    "engine/rank.ts"
  );
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

  const pool = poolSlots.map((p) => ({
    ...p,
    name: `item ${p.itemId}`,
    phase: 1,
    source: { kind: "badge" as const, cost: 1 },
  }));

  const dpsOf = (req: RaidSimRequest, value: ReadonlyMap<number, number>) => {
    let dps = BASE_DPS;
    const setCounts = new Map<number, number>();
    for (const id of equippedIds(req)) {
      if (!id) continue;
      dps += value.get(id) ?? 0;
      const setId = itemsMod.getItem(id)?.setId;
      if (setId != null) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
    }
    for (const [setId, count] of setCounts) {
      const bonus = SET_BONUSES[setId];
      if (!bonus) continue;
      if (count >= 2) dps += bonus.b2;
      if (count >= 4) dps += bonus.b4;
    }
    return dps;
  };

  return {
    rankUpgrades: tracedRank(rankMod.rankUpgrades),
    input: {
      character: FERAL_CHAR,
      spec: "feral",
      maxPhase: 5,
      fight: fightRef,
      iterations: 3000,
      candidateCap,
    },
    deps: {
      gear: gearSource,
      clock: () => new Date("2026-10-03T12:00:00.000Z"),
      raidSimSkeleton: feralSkeleton,
      epWeights: feralWeights,
      itemEp: await statsOnlyItemEp(feralWeights),
      pool,
      measureSetBonuses: true,
    },
    newStore: () => new storeMod.MemoryStore(),
    dpsOf,
  };
}

/**
 * One run on `feralRun`'s setup, with a sim that answers at once: cold, unless
 * it is given the store an earlier run filled.
 */
async function recordRun(
  candidateValue: ReadonlyMap<number, number> = ITEM_VALUE,
  poolSlots: readonly PoolSlot[] = SMALL_POOL,
  {
    candidateCap = 100,
    store,
  }: { candidateCap?: number; store?: Record<string, unknown> } = {}
): Promise<RecordedEvent[]> {
  const run = await feralRun(poolSlots, candidateCap);
  let simCalls = 0;
  const fakeSim = {
    version: () => Promise.resolve(SIM_VERSION),
    computeStats: zeroHitStats,
    run: (req: RaidSimRequest, opts: SimRunOpts) => {
      simCalls += 1;
      return Promise.resolve({
        dps: run.dpsOf(req, candidateValue),
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
      });
    },
  };

  const events: RecordedEvent[] = [];
  await run.rankUpgrades(
    run.input,
    { ...run.deps, sim: fakeSim, store: store ?? run.newStore() },
    (progress) => events.push({ progress, simCallsSoFar: simCalls })
  );
  return events;
}

describe.skipIf(!forkPresent || !moduleExists())(
  "run progress event order (542)",
  () => {
    let mod: RunProgressModule;
    let topN: number;
    // Seven candidates take the small-pool branch of `doneAtLastCandidateFor`.
    // Twelve, all above the cutoff, take the large-pool branch and pass the
    // top-N cap on re-simmed rows.
    const recordings: Record<"seven" | "twelve", RecordedEvent[]> = {
      seven: [],
      twelve: [],
    };
    const pools = ["seven", "twelve"] as const;
    let zeroQualifyEvents: RecordedEvent[];
    const CAPPED_CANDIDATES = 4;
    let cappedEvents: RecordedEvent[];
    let mixedEvents: RecordedEvent[];
    let storedEvents: RecordedEvent[];

    beforeAll(async () => {
      mod = await importForkUpgrades<RunProgressModule>("run_progress.ts");
      topN = (
        await importForkUpgrades<{ PAIRED_REPLICATE_TOP_N: number }>(
          "engine/se.ts"
        )
      ).PAIRED_REPLICATE_TOP_N;
      recordings.seven = await recordRun();
      recordings.twelve = await recordRun(ITEM_VALUE, LARGE_POOL);
      // Every candidate loses 50 DPS, so no row clears the cutoff.
      zeroQualifyEvents = await recordRun(
        new Map([...ITEM_VALUE.keys()].map((id) => [id, -50] as const))
      );
      // Capped at four of twelve, and the Thunderheart chest loses DPS, so
      // fewer rows clear the cutoff than the cap or top-N (ticket 566).
      cappedEvents = await recordRun(
        new Map([...ITEM_VALUE, [THUNDERHEART.chest, -50]]),
        LARGE_POOL,
        { candidateCap: CAPPED_CANDIDATES }
      );
      mixedEvents = await recordRun(MIXED_VALUE, MIXED_POOL);
      // The small pool's sims fill a store; the mixed pool then finds them
      // there, so only the rings and trinkets run sims.
      const runForStore = await feralRun(SMALL_POOL);
      const store = runForStore.newStore();
      await recordRun(MIXED_VALUE, SMALL_POOL, { store });
      storedEvents = await recordRun(MIXED_VALUE, MIXED_POOL, { store });
    }, 240_000);

    const stageEvents = (from: RecordedEvent[]) =>
      from.filter(
        (
          e
        ): e is RecordedEvent & {
          progress: Exclude<Progress, { kind: "row" }>;
        } => !("kind" in e.progress)
      );
    const rankingIndex = (from: RecordedEvent[]) =>
      stageEvents(from).findIndex((e) => e.progress.stage === "ranking");
    const simmingAfterRanking = (from: RecordedEvent[]) =>
      stageEvents(from)
        .slice(rankingIndex(from) + 1)
        .filter((e) => e.progress.stage === "simming");
    const simmingBeforeRanking = (from: RecordedEvent[]) =>
      stageEvents(from)
        .slice(0, rankingIndex(from))
        .filter((e) => e.progress.stage === "simming");
    const landedRows = (from: RecordedEvent[]) =>
      from
        .map((e) => e.progress)
        .filter(
          (p): p is Extract<Progress, { kind: "row" }> =>
            "kind" in p && p.kind === "row"
        )
        .map(
          (p) =>
            p.row as { belowCutoff?: boolean; simmed?: boolean; owned?: true }
        );
    /** Rows replication can re-sim: rank-replication.ts `replicateTopItems`' filter. */
    const replicableRowCount = (from: RecordedEvent[]) =>
      landedRows(from).filter(
        (r) => r.belowCutoff === false && r.simmed !== false
      ).length;

    /** Feeds a recording to a tracker; returns it and the activities it named. */
    const replay = (from: RecordedEvent[]) => {
      const tracker = new mod.RunProgressTracker();
      tracker.setConcurrency(1);
      const activities: RunActivity[] = [tracker.view().activity];
      from.forEach((e, i) => {
        tracker.observe(e.progress, (i + 1) * 100);
        const activity = tracker.view().activity;
        if (activities[activities.length - 1] !== activity)
          activities.push(activity);
      });
      return { tracker, activities };
    };

    it("records one pool within top-N and one past it, with more rows above the cutoff than top-N", () => {
      // The first event before `ranking` is the baseline; each later one is
      // one candidate.
      expect(
        simmingBeforeRanking(recordings.seven).length - 1
      ).toBeLessThanOrEqual(topN);
      expect(
        simmingBeforeRanking(recordings.twelve).length - 1
      ).toBeGreaterThan(topN);
      const aboveCutoff = landedRows(recordings.twelve).filter(
        (r) => r.belowCutoff === false && r.simmed !== false
      );
      expect(aboveCutoff.length).toBeGreaterThan(topN);
    });

    it.each(pools)(
      "solves the set-phase boundary from the engine's first total with the tab's seed count (%s candidates)",
      (name) => {
        const from = recordings[name];
        expect(rankingIndex(from)).toBeGreaterThan(0);
        const sims = simmingBeforeRanking(from);
        const first = sims[0]!.progress as { done: number; total: number };
        const last = sims[sims.length - 1]!.progress as { done: number };
        const candidates = sims.length - 1;
        expect(candidates).toBeGreaterThan(0);
        expect(
          mod.doneAtLastCandidateFor(
            first.total,
            mod.TAB_REPLICATE_SEED_COUNT,
            topN
          )
        ).toBe(last.done);
        expect(last.done).toBe(1 + candidates);
      }
    );

    it("runs set-phase sims between the last candidate event and ranking", () => {
      const from = recordings.seven;
      const sims = simmingBeforeRanking(from);
      const lastCandidate = sims[sims.length - 1]!;
      const ranking = stageEvents(from)[rankingIndex(from)]!;
      expect(ranking.simCallsSoFar).toBeGreaterThan(
        lastCandidate.simCallsSoFar
      );
    });

    it.each(pools)(
      "counts replication sims after ranking, above the boundary (%s candidates)",
      (name) => {
        const from = recordings[name];
        const sims = simmingBeforeRanking(from);
        const first = sims[0]!.progress as { total: number };
        const boundary = (sims[sims.length - 1]!.progress as { done: number })
          .done;
        const after = simmingAfterRanking(from).map(
          (e) => e.progress as { done: number; total: number }
        );
        expect(after.length).toBeGreaterThan(1);
        // The first event after ranking restates the total and runs no sim
        // (ticket 566): it repeats the boundary and names the done the run
        // ends on.
        const [restated, ...replicas] = after;
        expect(restated!.done).toBe(boundary);
        expect(restated!.total).toBe(after[after.length - 1]!.done);
        for (const p of replicas) {
          expect(p.done).toBeGreaterThan(boundary);
          expect(p.done).toBeLessThanOrEqual(first.total);
        }
      }
    );

    it.each(pools)(
      "gives the tracker the activities preparing, candidates, set bonuses, replication, ranking (%s candidates)",
      (name) => {
        // The run ends on the done the tracker expects, so the last
        // replication sim names the final ranking.
        expect(replay(recordings[name]).activities).toEqual([
          "preparing",
          "candidates",
          "set-bonuses",
          "replication",
          "ranking",
        ]);
      }
    );

    it.each(pools)(
      "re-sims the baseline and each row the tracker counts, at most top-N (%s candidates)",
      (name) => {
        const from = recordings[name];
        const q = replay(from).tracker.view().replicableRowCount;
        expect(q).toBeGreaterThan(0);
        // The first event after ranking restates the total; the rest are sims.
        expect(simmingAfterRanking(from).slice(1)).toHaveLength(
          (mod.TAB_REPLICATE_SEED_COUNT - 1) * (1 + Math.min(topN, q))
        );
      }
    );

    it("runs no replication when no row qualifies, and the tracker expects none", () => {
      const landed = landedRows(zeroQualifyEvents);
      expect(landed.length).toBeGreaterThan(0);
      for (const r of landed) expect(r.belowCutoff).toBe(true);
      expect(rankingIndex(zeroQualifyEvents)).toBeGreaterThan(0);
      // One event restates the total as the done so far; no sim follows it.
      const before = simmingBeforeRanking(zeroQualifyEvents);
      const boundary = (before[before.length - 1]!.progress as { done: number })
        .done;
      const after = simmingAfterRanking(zeroQualifyEvents);
      expect(after.map((e) => e.progress)).toEqual([
        { stage: "simming", done: boundary, total: boundary },
      ]);
      const ranking =
        stageEvents(zeroQualifyEvents)[rankingIndex(zeroQualifyEvents)]!;
      expect(
        zeroQualifyEvents[zeroQualifyEvents.length - 1]!.simCallsSoFar
      ).toBe(ranking.simCallsSoFar);

      const { tracker, activities } = replay(zeroQualifyEvents);
      expect(activities).toEqual([
        "preparing",
        "candidates",
        "set-bonuses",
        "ranking",
      ]);
      expect(tracker.view().remainingMs).toBeUndefined();
    });

    it("caps the candidates and has fewer rows above the cutoff than the cap", () => {
      const candidates = simmingBeforeRanking(cappedEvents).length - 1;
      const owned = landedRows(cappedEvents).filter((r) => r.owned).length;
      expect(candidates).toBe(CAPPED_CANDIDATES + owned);
      const q = replicableRowCount(cappedEvents);
      expect(q).toBeGreaterThan(0);
      expect(q).toBeLessThan(CAPPED_CANDIDATES);
      expect(q).toBeLessThan(topN);
    });

    it.each([
      ["seven", () => recordings.seven],
      ["twelve", () => recordings.twelve],
      ["zero-qualify", () => zeroQualifyEvents],
      ["capped", () => cappedEvents],
      ["rings and trinkets", () => mixedEvents],
      ["rings and trinkets, the rest from the store", () => storedEvents],
    ] as const)(
      "sends the candidates' sims with each candidates event, ending on the sims the runner ran for them (900, %s)",
      (_name, from) => {
        const events = from();
        const candidates = simmingBeforeRanking(events);
        const first = candidates[0]!;
        const last = candidates[candidates.length - 1]!;
        const sims = (e: RecordedEvent) =>
          (e.progress as { candidateSims?: number }).candidateSims;
        for (const e of candidates) expect(sims(e)).toEqual(expect.any(Number));
        expect(sims(last)).toBe(last.simCallsSoFar - first.simCallsSoFar);
      }
    );

    it("plans one sim per slot of a ring or trinket, and takes out the sims the store answers", () => {
      const sims = (from: RecordedEvent[]) =>
        simmingBeforeRanking(from).map(
          (e) => (e.progress as { candidateSims: number }).candidateSims
        );
      // Seven one-slot candidates and four of two slots: 15 sims planned.
      // The Thunderheart head's meta repair fails, so its slot runs none.
      expect(sims(mixedEvents)[0]).toBe(15);
      expect(sims(mixedEvents).at(-1)).toBe(14);
      // The same 15 planned; the store answers the six one-slot sims the
      // small pool ran, and the head's repair fails again.
      expect(sims(storedEvents)[0]).toBe(15);
      expect(sims(storedEvents).at(-1)).toBe(8);
    });

    it("prices the candidates by the runner's own sims, so a ring's or trinket's first sim keeps its credit (900)", async () => {
      // Four workers, each sim 1 s, reported every 100 ms, as the runner
      // reports a sim's iterations (`worker_pool_sim_runner.ts`).
      const CONCURRENCY = 4;
      const SIM_MS = 1_000;
      const STEP_MS = 100;
      const run = await feralRun(MIXED_POOL);
      const tracker = new mod.RunProgressTracker();
      tracker.setConcurrency(CONCURRENCY);
      let now = 0;
      type Running = {
        id: string;
        startedAt: number;
        iterations: number;
        end: () => void;
      };
      const running: Running[] = [];
      const candidateSims: Array<{ startedAt: number; endedAt?: number }> = [];
      let simCount = 0;
      let inCandidates = false;
      let planned: number | undefined;
      let latest: number | undefined;
      const fakeSim = {
        version: () => Promise.resolve(SIM_VERSION),
        computeStats: zeroHitStats,
        run: (req: RaidSimRequest, opts: SimRunOpts) =>
          new Promise((resolve) => {
            const id = `sim${simCount++}`;
            const sim: { startedAt: number; endedAt?: number } = {
              startedAt: now,
            };
            if (inCandidates) candidateSims.push(sim);
            tracker.observeIterations(id, 0, opts.iterations, now);
            running.push({
              id,
              startedAt: now,
              iterations: opts.iterations,
              end: () => {
                sim.endedAt = now;
                resolve({
                  dps: run.dpsOf(req, MIXED_VALUE),
                  stdev: 30,
                  iterationsDone: opts.iterations,
                  simVersion: SIM_VERSION,
                });
              },
            });
          }),
      };
      const onProgress = (p: Progress) => {
        tracker.observe(p, now);
        if ("kind" in p || p.stage !== "simming") return;
        if (planned === undefined) {
          planned = p.candidateSims;
          inCandidates = true;
        } else if (p.done === 1 + MIXED_POOL.length) inCandidates = false;
        if (inCandidates) latest = p.candidateSims;
      };

      const settle = () => new Promise<void>((r) => setImmediate(r));
      let finished = false;
      const ranking = run
        .rankUpgrades(
          run.input,
          {
            ...run.deps,
            sim: fakeSim,
            store: run.newStore(),
            concurrency: CONCURRENCY,
          },
          onProgress
        )
        .finally(() => {
          finished = true;
        });
      await settle();
      const samples: Array<{
        now: number;
        shown: number | undefined;
        size: number;
      }> = [];
      for (let guard = 0; !finished; guard++) {
        if (guard > 10_000) throw new Error("the run did not end");
        now += STEP_MS;
        const due = running.filter((r) => now - r.startedAt >= SIM_MS);
        for (const r of running) {
          if (!due.includes(r))
            tracker.observeIterations(
              r.id,
              ((now - r.startedAt) / SIM_MS) * r.iterations,
              r.iterations,
              now
            );
        }
        for (const r of due) {
          running.splice(running.indexOf(r), 1);
          // The worker's last report and the runner's own both say it ended.
          tracker.observeIterations(r.id, r.iterations, r.iterations, now);
          tracker.observeIterations(r.id, r.iterations, r.iterations, now);
          r.end();
        }
        await settle();
        if (inCandidates)
          samples.push({
            now,
            shown: tracker.view().remainingMs,
            size: latest!,
          });
      }
      await ranking;

      // 15 sims planned; the head's meta repair fails as it is dispatched, so
      // the count the engine sends drops to the 14 the runner ran.
      expect(planned).toBe(15);
      expect(candidateSims).toHaveLength(14);
      expect(samples.at(-1)!.size).toBe(14);
      const startedAt = candidateSims[0]!.startedAt;
      // wowsims' rule on the runner's own sims: a sim that ended counts as
      // one, one under way by its share (`progress.ts:60-67`).
      const rule = (at: number, size: number) => {
        const done = candidateSims.reduce(
          (sum, s) =>
            sum +
            (s.endedAt !== undefined && s.endedAt <= at
              ? 1
              : Math.max(0, Math.min(1, (at - s.startedAt) / SIM_MS))),
          0
        );
        return ((at - startedAt) / done) * (size - done);
      };
      // The candidates' sims start after the baseline's, which starts their
      // clock: no figure at that first sample, then one at every sample.
      const [first, ...rest] = samples;
      expect(first!.now).toBe(startedAt);
      expect(first!.shown).toBeUndefined();
      expect(rest.length).toBeGreaterThan(10);
      for (const s of rest) {
        expect(s.shown).toBeDefined();
        expect(s.shown!).toBeCloseTo(rule(s.now, s.size), 3);
      }
      // So the figure never rises while the candidates run.
      for (let i = 1; i < rest.length; i++)
        expect(rest[i]!.shown!).toBeLessThanOrEqual(rest[i - 1]!.shown! + 1e-6);
    });

    // Ticket 566: the first total budgets re-sims for min(top-N, candidates)
    // rows; the run re-sims only the rows that clear the cutoff, so the
    // counter used to end short of its total.
    it.each([
      ["seven", () => recordings.seven],
      ["twelve", () => recordings.twelve],
      ["zero-qualify", () => zeroQualifyEvents],
      ["capped", () => cappedEvents],
    ] as const)("ends with done equal to total (%s)", (_name, from) => {
      const events = from();
      const sims = stageEvents(events)
        .filter((e) => e.progress.stage === "simming")
        .map((e) => e.progress as { done: number; total: number });
      const last = sims[sims.length - 1]!;
      expect(last.done).toBe(last.total);
      const candidates = simmingBeforeRanking(events).length - 1;
      const rows = Math.min(topN, replicableRowCount(events));
      expect(last.total).toBe(
        1 +
          candidates +
          (rows === 0 ? 0 : (mod.TAB_REPLICATE_SEED_COUNT - 1) * (1 + rows))
      );
    });
  }
);
