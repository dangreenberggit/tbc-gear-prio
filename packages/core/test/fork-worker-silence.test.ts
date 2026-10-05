/**
 * The Upgrades tab's opt-in worker silence check (ticket 545).
 *
 * The fork's `WorkerPool` can wait forever on a worker that stops talking:
 * a worker that never becomes ready, or — on the browser (wasm) build — a sim
 * whose request id was already answered with an empty payload and which then
 * stops sending progress. The silence option fails every request waiting on
 * such a worker and restarts it. These tests drive the real `WorkerPool` and
 * `SilenceMonitor` from the fork with a scripted fake `Worker` and fake timers.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { join } from "node:path";
import { pathToFileURL } from "node:url";

import {
  baseDeps,
  buildRankFixture,
  loadRank,
  SIM_VERSION,
} from "./bulk-screen-fixture.js";
import {
  forkPresent,
  forkRoot,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";

type Regime = "start" | "run" | "presim";

type SilenceMonitorModule = {
  SilenceMonitor: new (
    limits: { startMs: number; runMs: number; presimMs?: number },
    hooks: {
      hasWaiters: () => boolean;
      onExpire: (regime: Regime, limitMs: number) => void;
    }
  ) => {
    requestWaiting(): void;
    messageSeen(): void;
    setRegime(regime: Regime): void;
    dispose(): void;
  };
};

const importFork = async <T>(relativePath: string): Promise<T> => {
  await loadForkEngineEnvironment();
  return (await import(pathToFileURL(join(forkRoot, relativePath)).href)) as T;
};

const loadMonitor = () =>
  importFork<SilenceMonitorModule>("ui/core/worker_silence.ts");

describe.skipIf(!forkPresent)("SilenceMonitor", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const LIMITS = { startMs: 2000, runMs: 1000, presimMs: 5000 };

  async function monitorWith(waiting: { value: boolean }) {
    const { SilenceMonitor } = await loadMonitor();
    const expiries: Array<[Regime, number]> = [];
    const monitor = new SilenceMonitor(LIMITS, {
      hasWaiters: () => waiting.value,
      onExpire: (regime, limitMs) => expiries.push([regime, limitMs]),
    });
    return { monitor, expiries };
  }

  it("expires once, at the run limit, while a request waits", async () => {
    const { monitor, expiries } = await monitorWith({ value: true });
    monitor.setRegime("run");
    monitor.requestWaiting();
    await vi.advanceTimersByTimeAsync(999);
    expect(expiries).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(expiries).toEqual([["run", 1000]]);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(expiries).toHaveLength(1);
  });

  it("never expires when nothing waits", async () => {
    const { monitor, expiries } = await monitorWith({ value: false });
    monitor.setRegime("run");
    monitor.requestWaiting();
    monitor.messageSeen();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(expiries).toEqual([]);
  });

  it("never expires while messages arrive every 100 ms", async () => {
    const { monitor, expiries } = await monitorWith({ value: true });
    monitor.setRegime("run");
    monitor.requestWaiting();
    for (let t = 0; t < 10_000; t += 100) {
      await vi.advanceTimersByTimeAsync(100);
      monitor.messageSeen();
    }
    expect(expiries).toEqual([]);
  });

  it("lets a 3 s warm-up silence pass and fails it at the 5 s presim limit", async () => {
    const { monitor, expiries } = await monitorWith({ value: true });
    monitor.setRegime("run");
    monitor.requestWaiting();
    monitor.messageSeen();
    monitor.setRegime("presim");
    await vi.advanceTimersByTimeAsync(3000);
    expect(expiries).toEqual([]);
    await vi.advanceTimersByTimeAsync(1999);
    expect(expiries).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(expiries).toEqual([["presim", 5000]]);
  });

  it("gives a request on an idle worker a full limit (D-N1)", async () => {
    // The worker's last message re-armed the timer; nothing waits. A request
    // posted 1 ms before that deadline must still get a whole limit.
    const waiting = { value: false };
    const { monitor, expiries } = await monitorWith(waiting);
    monitor.setRegime("run");
    monitor.messageSeen();
    await vi.advanceTimersByTimeAsync(999);
    waiting.value = true;
    monitor.requestWaiting();
    await vi.advanceTimersByTimeAsync(1);
    expect(expiries).toEqual([]);
    await vi.advanceTimersByTimeAsync(998);
    expect(expiries).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(expiries).toEqual([["run", 1000]]);
  });

  it("stays silent after dispose", async () => {
    const { monitor, expiries } = await monitorWith({ value: true });
    monitor.requestWaiting();
    monitor.dispose();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(expiries).toEqual([]);
  });
});

// --- WorkerPool with the silence option -------------------------------------

type WorkerMessage = {
  msg: string;
  id?: string;
  // The wasm worker answers an async request's id with no payload.
  outputData?: Uint8Array | undefined;
  error?: string;
};

type Script = {
  /** Post `ready` once the pool has attached its listener. */
  ready: boolean;
  onRequest?: (
    worker: FakeWorker,
    message: { msg: string; id: string }
  ) => void;
};

/**
 * Stands in for the browser `Worker`: records what the pool posts and replies
 * only as the current test's script says. A terminated worker sends nothing.
 */
class FakeWorker {
  static instances: FakeWorker[] = [];
  static script: Script = { ready: false };

  readonly posted: Array<{ msg: string; id?: string }> = [];
  terminated = false;
  private readonly listeners: Array<(event: { data: WorkerMessage }) => void> =
    [];

  constructor() {
    FakeWorker.instances.push(this);
    // The pool attaches its listener after the constructor returns.
    if (FakeWorker.script.ready) {
      void Promise.resolve().then(() =>
        this.send({ msg: "ready", outputData: new Uint8Array([1]) })
      );
    }
  }

  addEventListener(
    type: string,
    listener: (event: { data: WorkerMessage }) => void
  ) {
    if (type === "message") this.listeners.push(listener);
  }

  postMessage(message: { msg: string; id?: string }) {
    this.posted.push(message);
    if (message.msg === "setID" || !message.id) return;
    FakeWorker.script.onRequest?.(this, { msg: message.msg, id: message.id });
  }

  terminate() {
    this.terminated = true;
  }

  send(data: WorkerMessage) {
    if (this.terminated) return;
    for (const listener of this.listeners) listener({ data });
  }
}

type ProtoMessage<T> = {
  create(init?: Partial<T>): T;
  toBinary(message: T): Uint8Array;
};

type PoolModule = {
  WorkerPool: new (
    numWorkers: number,
    options?: {
      silence?: { startMs: number; runMs: number; presimMs?: number };
    }
  ) => {
    computeStats(request: unknown): Promise<unknown>;
    raidSimAsync(
      request: unknown,
      onProgress: (progress: unknown) => void,
      signals: unknown
    ): Promise<unknown>;
  };
};

type ApiModule = {
  ComputeStatsRequest: ProtoMessage<Record<string, unknown>>;
  RaidSimRequest: ProtoMessage<{ requestId: string }>;
  RaidSimResult: ProtoMessage<Record<string, unknown>>;
  ProgressMetrics: ProtoMessage<{
    completedIterations: number;
    totalIterations: number;
    presimRunning: boolean;
    finalRaidResult?: unknown;
  }>;
};

const POOL_LIMITS = { startMs: 2000, runMs: 1000, presimMs: 5000 };

/** A signals object whose abort is never triggered; abort is not under test. */
const SIGNALS = { abort: { onTrigger: () => () => {} } };

type Tracked = { state: "pending" | "resolved" | "rejected"; error?: unknown };

function track(promise: Promise<unknown>): Tracked {
  const tracked: Tracked = { state: "pending" };
  promise.then(
    () => (tracked.state = "resolved"),
    (error: unknown) => {
      tracked.state = "rejected";
      tracked.error = error;
    }
  );
  return tracked;
}

type ProgressInit = {
  completedIterations?: number;
  presimRunning?: boolean;
  final?: boolean;
};

describe.skipIf(!forkPresent)("WorkerPool silence option", () => {
  let api: ApiModule;
  let WorkerPool: PoolModule["WorkerPool"];
  let requestCount = 0;

  beforeEach(async () => {
    api = await importFork<ApiModule>("ui/core/proto/api.ts");
    ({ WorkerPool } = await importFork<PoolModule>("ui/core/worker_pool.ts"));
    vi.useFakeTimers();
    // Extend the harness's window, never replace it: constants/other.ts read
    // window.location when the fork was first imported.
    Object.assign((globalThis as unknown as { window: object }).window, {
      Worker: FakeWorker,
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
    });
    FakeWorker.instances = [];
    FakeWorker.script = { ready: false };
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const raidRequest = () =>
    api.RaidSimRequest.create({ requestId: `raidSimAsync-t${++requestCount}` });

  const progressBytes = (init: ProgressInit) =>
    api.ProgressMetrics.toBinary(
      api.ProgressMetrics.create({
        completedIterations: init.completedIterations ?? 0,
        totalIterations: 3000,
        presimRunning: init.presimRunning ?? false,
        ...(init.final ? { finalRaidResult: api.RaidSimResult.create() } : {}),
      })
    );

  /**
   * The wasm reply pattern: the request id is answered with an empty payload,
   * then the result streams over `${id}progress`. Each step is sent at its
   * delay after the request arrives; after the last one, nothing.
   */
  const wasmScript = (steps: Array<[number, ProgressInit]>): Script => ({
    ready: true,
    onRequest: (worker, { msg, id }) => {
      if (msg !== "raidSimAsync") return;
      void Promise.resolve().then(() =>
        worker.send({ msg: "raidSimAsync", id, outputData: undefined })
      );
      for (const [delayMs, progress] of steps) {
        setTimeout(
          () =>
            worker.send({
              msg: "progress",
              id: `${id}progress`,
              outputData: progressBytes(progress),
            }),
          delayMs
        );
      }
    },
  });

  it("fails a lookup and a sim on a worker that never becomes ready, and again after the restart", async () => {
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    const lookup = track(pool.computeStats(api.ComputeStatsRequest.create()));
    const sim = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));

    await vi.advanceTimersByTimeAsync(POOL_LIMITS.startMs - 1);
    expect(lookup.state).toBe("pending");
    expect(sim.state).toBe("pending");

    await vi.advanceTimersByTimeAsync(1);
    expect(lookup.state).toBe("rejected");
    expect(sim.state).toBe("rejected");
    expect(String(lookup.error)).toMatch(
      /sent nothing for 2 s; it was restarted/
    );
    expect(String(sim.error)).toMatch(/sent nothing for 2 s/);
    expect(FakeWorker.instances).toHaveLength(2);
    expect(FakeWorker.instances[0]!.terminated).toBe(true);

    // The restarted worker never becomes ready either (D-N2): no hang.
    const second = track(pool.computeStats(api.ComputeStatsRequest.create()));
    await vi.advanceTimersByTimeAsync(POOL_LIMITS.startMs - 1);
    expect(second.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(second.state).toBe("rejected");
    expect(String(second.error)).toMatch(/sent nothing for 2 s/);
    expect(FakeWorker.instances).toHaveLength(3);
  });

  it("fails a wasm sim that answered its id, sent progress, then went silent; the restarted worker is checked too", async () => {
    FakeWorker.script = wasmScript([
      [100, { completedIterations: 10 }],
      [200, { completedIterations: 20 }],
    ]);
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    await vi.advanceTimersByTimeAsync(0);

    const first = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(200 + POOL_LIMITS.runMs - 1);
    expect(first.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(first.state).toBe("rejected");
    expect(String(first.error)).toMatch(
      /sent nothing for 1 s; it was restarted/
    );
    expect(FakeWorker.instances).toHaveLength(2);

    await vi.advanceTimersByTimeAsync(0);
    const second = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(200 + POOL_LIMITS.runMs - 1);
    expect(second.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(second.state).toBe("rejected");
    expect(FakeWorker.instances).toHaveLength(3);
  });

  it("never fails a sim that keeps sending progress, and resolves it on the final message", async () => {
    const steps: Array<[number, ProgressInit]> = [];
    for (let t = 100; t <= 10_000; t += 100) {
      steps.push([t, { completedIterations: t / 10 }]);
    }
    steps.push([10_050, { completedIterations: 3000, final: true }]);
    FakeWorker.script = wasmScript(steps);
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    await vi.advanceTimersByTimeAsync(0);

    const sim = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sim.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(50);
    expect(sim.state).toBe("resolved");
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it("lets a warm-up pass stay silent past the run limit, under the presim limit", async () => {
    FakeWorker.script = wasmScript([
      [100, { presimRunning: true }],
      // 3 s of warm-up silence: three run limits, under the presim limit.
      [3100, { presimRunning: false }],
      [3200, { completedIterations: 100 }],
      [3300, { completedIterations: 3000, final: true }],
    ]);
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    await vi.advanceTimersByTimeAsync(0);

    const sim = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(3300);
    expect(sim.state).toBe("resolved");
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it("fails a warm-up pass that outlasts the presim limit", async () => {
    FakeWorker.script = wasmScript([[100, { presimRunning: true }]]);
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    await vi.advanceTimersByTimeAsync(0);

    const sim = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(100 + POOL_LIMITS.presimMs - 1);
    expect(sim.state).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(sim.state).toBe("rejected");
    expect(String(sim.error)).toMatch(/sent nothing for 5 s/);
  });

  it("does not restart an idle worker after a finished sim", async () => {
    FakeWorker.script = wasmScript([
      [100, { completedIterations: 3000, final: true }],
    ]);
    const pool = new WorkerPool(1, { silence: POOL_LIMITS });
    await vi.advanceTimersByTimeAsync(0);

    const sim = track(pool.raidSimAsync(raidRequest(), () => {}, SIGNALS));
    await vi.advanceTimersByTimeAsync(100);
    expect(sim.state).toBe("resolved");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(FakeWorker.instances).toHaveLength(1);
  });

  it("leaves a pool without the option waiting, as before", async () => {
    const pool = new WorkerPool(1);
    const lookup = track(pool.computeStats(api.ComputeStatsRequest.create()));
    await vi.advanceTimersByTimeAsync(600_000);
    expect(lookup.state).toBe("pending");
    expect(FakeWorker.instances).toHaveLength(1);
  });
});

// rank.test.ts pins the same path on packages/core's engine; this one runs the
// fork's copy, which is the engine the tab actually calls.
describe.skipIf(!forkPresent)(
  "fork rankUpgrades — silent worker on the baseline sim",
  () => {
    it("fails the ranking as sim-failed carrying the worker's text", async () => {
      const SILENCE = "Sim worker 2 sent nothing for 30 s; it was restarted";
      const { rankUpgrades } = await loadRank();
      const { input, makeGearSource, pool } = await buildRankFixture();
      const silentSim = {
        version: async () => SIM_VERSION,
        run: async () => {
          throw new Error(SILENCE);
        },
      };

      await expect(
        rankUpgrades(input, {
          ...(await baseDeps()),
          gear: makeGearSource(),
          pool,
          sim: silentSim,
        })
      ).rejects.toMatchObject({
        name: "RankError",
        kind: "sim-failed",
        message: SILENCE,
      });
    });
  }
);
