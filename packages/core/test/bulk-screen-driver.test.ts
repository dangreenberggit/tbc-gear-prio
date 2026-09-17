/**
 * `runBulkScreenChunks` — the chunk loop both bulk transports drive (ticket
 * 347).
 *
 * Dead code cover: nothing here is reachable from the upgrades tab at runtime.
 * Since ticket 403 both transports take the per-candidate loop, and the switch
 * is `makeSimRunner(bulk = false)` in the fork's
 * `upgrades/adapters/bulk_wasm_sim_runner.ts`. Green means the machinery still
 * works, not that the tab uses it. The code is kept on purpose (ticket 406,
 * resolved keep) and these tests are its re-enable safety net. Re-check with:
 * `grep -rn 'makeSimRunner(' vendor/tbc-new-fork/ui --include=*.ts --include=*.tsx --include=*.mts | grep -v node_modules`
 *
 * Tested directly rather than through a runner because the runners are now a
 * constructor plus a one-line `dispatch`: everything worth asserting — cancel,
 * per-chunk signal isolation, which failures degrade and which surface — lives
 * here, and a fake `dispatch` is the only way to produce those conditions on
 * demand. The two transports differ in nothing this file covers, which is the
 * reason the loop was moved here in the first place.
 *
 * The request builder runs for real, so the assertions about `topResults` and
 * `highStageIterations` are about the request the engine would actually receive.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import {
  forkPresent,
  forkRoot,
  forkUpgradesDir,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";
import { CURRENT_API_VERSION } from "../src/individual-settings.js";

const driverModule = join(forkUpgradesDir, "adapters/bulk_screen_driver.ts");
const seamModule = join(forkUpgradesDir, "engine/seams/sim-runner.ts");
const signalModule = join(forkRoot, "ui/core/sim_signal_manager.ts");
const apiModule = join(forkRoot, "ui/core/proto/api.ts");

// Derived from the live proto version rather than repeated as a literal
// (ticket 390): this file's recordings just need one consistent stamp across
// runs, but a stale literal here would silently drift from the sibling
// bulk-screen-http-fixture.test.ts recordings once nothing forced it to move.
const SIM_VERSION = `api-v${CURRENT_API_VERSION}`;
const ITERATIONS = 5000;

type Candidate = { index: number; gear: Readonly<Record<string, unknown>> };
type Observation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
};
type BulkScreenResult = {
  baseline: Observation;
  rows: ReadonlyArray<{ index: number; observation: Observation }>;
  failures?: ReadonlyArray<{ indices: readonly number[]; reason: string }>;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const load = async () => {
  await loadForkEngineEnvironment();
  const driver = (await import(pathToFileURL(driverModule).href)) as {
    runBulkScreenChunks: (req: any, deps: any) => Promise<BulkScreenResult>;
  };
  const seam = (await import(pathToFileURL(seamModule).href)) as {
    BulkScreenAbortedError: new () => Error;
    BulkScreenIntegrityError: new (message: string) => Error;
  };
  const signals = (await import(pathToFileURL(signalModule).href)) as {
    SimSignalManager: new () => any;
  };
  const api = (await import(pathToFileURL(apiModule).href)) as {
    BulkSimResult: { create: (init: any) => any };
  };
  return { ...driver, ...seam, ...signals, ...api };
};

const candidates = (n: number): Candidate[] =>
  Array.from({ length: n }, (_, i) => ({
    index: i,
    gear: { items: [{ id: 30_000 + i }] },
  }));

const request = (n: number, signal?: AbortSignal) => ({
  baseRequest: {},
  candidates: candidates(n),
  iterations: ITERATIONS,
  seed: 11,
  ...(signal ? { signal } : {}),
});

/** A minimal well-formed response for a chunk of `count` candidates. */
const goodResult = (
  BulkSimResult: { create: (init: any) => any },
  chunk: readonly Candidate[]
) =>
  BulkSimResult.create({
    baseline: { dpsMetrics: { avg: 2000, stdev: 10 } },
    topResults: chunk.map((candidate) => ({
      candidateIndex: candidate.index,
      dpsMetrics: { avg: 2100 + candidate.index, stdev: 10 },
    })),
    stageMetrics: [{ iterations: ITERATIONS }],
  });

describe.skipIf(!forkPresent)("runBulkScreenChunks", () => {
  // Loaded once for the whole describe rather than per test: the fork
  // engine/WASM module import is the expensive part, and six tests each paying
  // it under heavy CPU contention pushed the first past the 30s budget (ticket
  // 375, reproduced at 4x CPU oversubscription). The load cost is paid once;
  // each test's own dispatch work is well under a second.
  let fork: Awaited<ReturnType<typeof load>>;
  // 30s, matching `testTimeout`, not the 10s default hookTimeout: the fork
  // engine/WASM import moved here from per-test bodies, and under heavy CPU
  // contention the import alone can pass 10s. The old structure gave the load
  // the test's own 30s budget; this keeps that headroom for the one-time cost
  // while each test's own work stays in the millisecond range (ticket 375).
  beforeAll(async () => {
    fork = await load();
  }, 30_000);

  it("chunks at the shared bound and returns a row per candidate", async () => {
    const { runBulkScreenChunks, SimSignalManager, BulkSimResult } = fork;
    const seen: { count: number; iterations: number; topResults: number }[] =
      [];
    const result = await runBulkScreenChunks(request(60), {
      signals: new SimSignalManager(),
      simVersion: SIM_VERSION,
      dispatch: async (built: any) => {
        seen.push({
          count: built.candidates.length,
          iterations: built.highStageIterations,
          topResults: built.topResults,
        });
        return goodResult(BulkSimResult, built.candidates);
      },
    });

    expect(seen.map((s) => s.count)).toEqual([25, 25, 10]);
    for (const s of seen) {
      expect(s.iterations).toBe(ITERATIONS);
      expect(s.topResults).toBe(s.count);
    }
    expect(result.rows).toHaveLength(60);
    expect(result.rows.map((row) => row.index).sort((a, b) => a - b)).toEqual(
      Array.from({ length: 60 }, (_, i) => i)
    );
    expect(result.failures).toBeUndefined();
  });

  it("dispatches nothing when the signal is already aborted", async () => {
    const { runBulkScreenChunks, SimSignalManager, BulkScreenAbortedError } =
      fork;
    const controller = new AbortController();
    controller.abort();
    let dispatches = 0;

    await expect(
      runBulkScreenChunks(request(60, controller.signal), {
        signals: new SimSignalManager(),
        simVersion: SIM_VERSION,
        dispatch: async () => {
          dispatches++;
          throw new Error("should not be reached");
        },
      })
    ).rejects.toBeInstanceOf(BulkScreenAbortedError);
    expect(dispatches).toBe(0);
  });

  it("aborts the in-flight chunk and issues no further one", async () => {
    const {
      runBulkScreenChunks,
      SimSignalManager,
      BulkScreenAbortedError,
      BulkSimResult,
    } = fork;
    const controller = new AbortController();
    let dispatches = 0;
    let firstSignals: any;

    const promise = runBulkScreenChunks(request(60, controller.signal), {
      signals: new SimSignalManager(),
      simVersion: SIM_VERSION,
      dispatch: async (built: any, signals: any) => {
        dispatches++;
        firstSignals = signals;
        // The Stop arrives while this chunk is in flight; the engine would
        // notice the triggered signal and return an aborted result, but a
        // normal resolution is the harder case — the driver must classify on
        // its own flag either way.
        controller.abort();
        return goodResult(BulkSimResult, built.candidates);
      },
    });

    await expect(promise).rejects.toBeInstanceOf(BulkScreenAbortedError);
    expect(dispatches).toBe(1);
    // The listener reached the chunk that was actually running — this is the
    // thing the old per-chunk-signal-made-inside-the-loop structure could not
    // do (ticket 347's Correction).
    expect(firstSignals.abort.isTriggered()).toBe(true);
  });

  it("keeps a chunk's own error-trigger from poisoning later chunks", async () => {
    const { runBulkScreenChunks, SimSignalManager, BulkSimResult } = fork;
    const triggered: boolean[] = [];
    let call = 0;

    const result = await runBulkScreenChunks(request(60), {
      signals: new SimSignalManager(),
      simVersion: SIM_VERSION,
      dispatch: async (built: any, signals: any) => {
        call++;
        if (call === 1) {
          // Exactly what upstream does on a candidate error: trigger this
          // batch's signals (`wasm/bulk_sim/batch.ts:132-134`) and then
          // RESOLVE with an error-bearing result (`index.ts:121-123`) — it
          // never rejects. Classifying on the signal here would read as a user
          // Stop and throw away the remaining 35 candidates.
          await signals.abort.trigger();
          return BulkSimResult.create({
            error: { message: "candidate 7 panicked" },
          });
        }
        triggered.push(signals.abort.isTriggered());
        return goodResult(BulkSimResult, built.candidates);
      },
    });

    expect(call).toBe(3);
    expect(triggered).toEqual([false, false]);
    expect(result.rows).toHaveLength(35);
    expect(result.failures).toEqual([
      {
        indices: Array.from({ length: 25 }, (_, i) => i),
        reason: expect.stringContaining("candidate 7 panicked"),
      },
    ]);
    // The surviving chunks' own baseline, since chunk 1 produced none.
    expect(result.baseline.dps).toBe(2000);
  });

  it("surfaces an integrity failure rather than degrading it", async () => {
    const {
      runBulkScreenChunks,
      SimSignalManager,
      BulkScreenIntegrityError,
      BulkSimResult,
    } = fork;
    const thrown = new BulkScreenIntegrityError("row shortfall");
    let call = 0;

    await expect(
      runBulkScreenChunks(request(60), {
        signals: new SimSignalManager(),
        simVersion: SIM_VERSION,
        dispatch: async (built: any) => {
          call++;
          if (call === 2) throw thrown;
          return goodResult(BulkSimResult, built.candidates);
        },
      })
    ).rejects.toBe(thrown);
    expect(call).toBe(2);
  });

  it("throws listing every reason when no chunk succeeded", async () => {
    const { runBulkScreenChunks, SimSignalManager } = fork;
    let call = 0;

    await expect(
      runBulkScreenChunks(request(60), {
        signals: new SimSignalManager(),
        simVersion: SIM_VERSION,
        dispatch: async () => {
          call++;
          throw new Error(`transport died on chunk ${call}`);
        },
      })
    ).rejects.toThrow(
      /transport died on chunk 1; transport died on chunk 2; transport died on chunk 3/
    );
  });
});
