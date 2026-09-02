/**
 * What `rankUpgrades` does when the screening pass does not deliver (ticket
 * 347).
 *
 * Three outcomes have to stay distinguishable at the seam, and each is a
 * different promise to the user:
 *
 * - An engine or transport failure costs speed only. Every affected attempt
 *   falls through to `deps.sim.run`, so the ranking is the one the loop would
 *   have produced — asserted here by comparing it row for row against a run with
 *   no bulk capability at all — and the extra cost is disclosed in
 *   `screeningFallbacks` rather than left mysterious.
 * - A structurally wrong response (a row shortfall, no baseline) must surface.
 *   Degrading it would hide the check that stands between a silent cull and a
 *   truncated ranking, which is exactly what ticket 349's guard exists to catch.
 * - A Stop must land a `PartialRanking` with nothing further dispatched.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { describe, expect, it } from "vitest";

import { forkPresent } from "./fork-engine-harness.js";
import {
  baseDeps,
  buildRankFixture,
  equipmentOf,
  loadRank,
  loadSeam,
  LOOP_BASELINE_DPS,
  SIM_VERSION,
  syntheticDps,
  type BulkScreenRequest,
  type BulkScreenResult,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
} from "./bulk-screen-fixture.js";

/** Prices any request the same deterministic way, counting the calls. */
function countingRunner(): {
  runner: { version(): Promise<string>; run: typeof run };
  calls: () => number;
} {
  let calls = 0;
  async function run(
    req: RaidSimRequest,
    opts: SimRunOpts
  ): Promise<SimObservation> {
    calls++;
    return {
      dps: syntheticDps(equipmentOf(req), LOOP_BASELINE_DPS),
      stdev: 30,
      iterationsDone: opts.iterations,
      simVersion: SIM_VERSION,
    };
  }
  return {
    runner: {
      version: async () => SIM_VERSION,
      run,
    },
    calls: () => calls,
  };
}

describe.skipIf(!forkPresent)("screening failure handling", () => {
  it("degrades a failed screening pass to the loop and discloses it", async () => {
    const { rankUpgrades } = await loadRank();
    const { input, makeGearSource, pool } = await buildRankFixture();

    const loop = countingRunner();
    const loopRanking = await rankUpgrades(input, {
      ...(await baseDeps()),
      gear: makeGearSource(),
      sim: loop.runner,
      pool,
    });

    const fallback = countingRunner();
    let attempted = 0;
    const fallbackRanking = await rankUpgrades(input, {
      ...(await baseDeps()),
      gear: makeGearSource(),
      sim: {
        ...fallback.runner,
        runBulkScreen: async (req: BulkScreenRequest) => {
          attempted = req.candidates.length;
          throw new Error("boom");
        },
      },
      pool,
    });

    expect(attempted).toBeGreaterThan(0);
    expect(fallbackRanking.screeningFallbacks).toEqual([
      { candidates: attempted, reason: "boom" },
    ]);
    // The ranking is the loop's, not an approximation of it.
    expect(fallbackRanking.items).toEqual(loopRanking.items);
    // And it cost the same number of sims: nothing was skipped for want of a
    // screening row.
    expect(fallback.calls()).toBe(loop.calls());
  }, 120_000);

  it("sims only the candidates a partly-failed screening pass omitted", async () => {
    const { rankUpgrades } = await loadRank();
    const { input, makeGearSource, pool } = await buildRankFixture();

    const loop = countingRunner();
    const loopRanking = await rankUpgrades(input, {
      ...(await baseDeps()),
      gear: makeGearSource(),
      sim: loop.runner,
      pool,
    });
    const loopBaselineDps = loopRanking.baseline.dps;

    const partial = countingRunner();
    let omitted = 0;
    const partialRanking = await rankUpgrades(input, {
      ...(await baseDeps()),
      gear: makeGearSource(),
      sim: {
        ...partial.runner,
        runBulkScreen: async (
          req: BulkScreenRequest
        ): Promise<BulkScreenResult> => {
          const half = Math.floor(req.candidates.length / 2);
          const served = req.candidates.slice(0, half);
          const dropped = req.candidates.slice(half);
          omitted = dropped.length;
          return {
            // Screening prices on its own scale; `rank.ts` differences every
            // screened row against this, so serving the loop's own baseline
            // keeps the two routes' deltas identical.
            baseline: {
              dps: loopBaselineDps,
              stdev: 30,
              iterationsDone: req.iterations,
              simVersion: SIM_VERSION,
            },
            rows: served.map((candidate) => ({
              index: candidate.index,
              observation: {
                dps: syntheticDps(
                  (candidate.gear as { items?: unknown }).items,
                  LOOP_BASELINE_DPS
                ),
                stdev: 30,
                iterationsDone: req.iterations,
                simVersion: SIM_VERSION,
              },
            })),
            failures: [
              {
                indices: dropped.map((candidate) => candidate.index),
                reason: "chunk 2 transport failure",
              },
            ],
          };
        },
      },
      pool,
    });

    expect(omitted).toBeGreaterThan(0);
    expect(partialRanking.screeningFallbacks).toEqual([
      { candidates: omitted, reason: "chunk 2 transport failure" },
    ]);
    expect(partialRanking.items).toEqual(loopRanking.items);
    // The screened half really did save sims, so the disclosure is about a
    // partial pass rather than a total one.
    expect(partial.calls()).toBeLessThan(loop.calls());
  }, 120_000);

  it("surfaces an integrity failure instead of ranking around it", async () => {
    const { rankUpgrades } = await loadRank();
    const { BulkScreenIntegrityError } = await loadSeam();
    const { input, makeGearSource, pool } = await buildRankFixture();
    const thrown = new BulkScreenIntegrityError("row shortfall");

    await expect(
      rankUpgrades(input, {
        ...(await baseDeps()),
        gear: makeGearSource(),
        sim: {
          ...countingRunner().runner,
          runBulkScreen: async () => {
            throw thrown;
          },
        },
        pool,
      })
    ).rejects.toBe(thrown);
  }, 120_000);

  it("lands a partial ranking when Stop aborts the screening pass", async () => {
    const { rankUpgrades } = await loadRank();
    const { BulkScreenAbortedError } = await loadSeam();
    const { input, makeGearSource, pool } = await buildRankFixture();
    const deps = await baseDeps();
    const store = deps.store as {
      get: (key: string) => Promise<unknown>;
    };

    const controller = new AbortController();
    const counted = countingRunner();
    let baselineCalls = 0;

    const ranking = await rankUpgrades(input, {
      ...deps,
      gear: makeGearSource(),
      sim: {
        version: counted.runner.version,
        run: async (req: RaidSimRequest, opts: SimRunOpts) => {
          baselineCalls++;
          return counted.runner.run(req, opts);
        },
        runBulkScreen: async () => {
          // The Stop arrives mid-chunk; the driver's own classification turns
          // whatever the engine returned into this.
          controller.abort();
          throw new BulkScreenAbortedError();
        },
      },
      signal: controller.signal,
      pool,
    });

    expect(ranking.complete).toBe(false);
    expect(ranking.items.length).toBeGreaterThan(0);
    expect(ranking.items.every((item) => item.simmed === false)).toBe(true);
    // Only the run's own baseline sim, never a candidate: Stop dispatches
    // nothing new, and the screening chunk's cost is not re-paid through the
    // loop.
    expect(baselineCalls).toBe(1);
    // A clean bulk route is byte-identical to the no-bulk route, so an aborted
    // one discloses no fallback either.
    expect(ranking.screeningFallbacks).toBeUndefined();
    // No `ranking:` row for a partial run — the runtime check in `rank.ts`, not
    // the type, is what keeps a partial out of the cache.
    expect(
      await store.get(
        `ranking:${(ranking as unknown as { contentHash: string }).contentHash}`
      )
    ).toBeUndefined();
  }, 120_000);
});
