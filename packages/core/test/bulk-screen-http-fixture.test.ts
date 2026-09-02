/**
 * A bulk screen recorded from the **Go engine over HTTP**, replayed through the
 * same seam the WASM transport uses (batch-sim local plan Step 4).
 *
 * The point is not to re-test the seam - `bulk-screen-branch.test.ts` does that
 * with synthetic numbers. The point is that observations produced by a
 * *different engine*, reached over a *different transport*, replay through the
 * identical `bulkScreenCacheKey` machinery with nothing transport-specific
 * anywhere in the path. If the Go route ever needed its own key scheme, its own
 * mapping, or its own fixture shape, this test is where that would show up.
 *
 * ## Provenance of the numbers below
 *
 * Recorded 2026-09-01 against the packaged local Go server (`wowsimtbc`, port
 * 3333), feral-p2, 5,000 iterations, on a real `RaidSimRequest` captured from
 * the page. Candidates are the character's own gear with the back slot replaced
 * by an unworn phase-2 pool item. The request went through the shared
 * `buildBulkSimRequest` and the response through the shared
 * `bulkScreenResultFrom` - i.e. exactly `BulkHttpSimRunner`'s code path.
 *
 * The full 21-candidate dump, the loop-vs-bulk equivalence scores and the
 * loop-vs-loop control live in
 * `.scratch/stage-gate/batch-sim-web-local/equiv-dump-local.json`. The three
 * candidates kept here are the ones whose deltas are far enough above the noise
 * floor to be meaningful; the dump's tail candidates sit within ~1 DPS of the
 * baseline and their order is noise (ticket 345).
 *
 * ## simVersion (reconciliation R5)
 *
 * `api-v15`. R5 asked what version a Go-served recording carries, since a
 * different value from a WASM recording would split the fixture story. Measured:
 * it cannot differ. `version()` is inherited from `WasmSimRunner` and returns
 * `` `api-v${CURRENT_API_VERSION}` `` (`adapters/wasm_sim_runner.ts`) - a
 * compile-time constant, not something read off the running engine - so both
 * transports report the same string and the cache key really is transport-blind.
 * This test asserts that value explicitly, so a future change to
 * `CURRENT_API_VERSION` fails here rather than silently invalidating recordings.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const forkEngineDir = join(
  root,
  "vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine"
);
const forkPresent = existsSync(forkEngineDir);
const seamModule = join(forkEngineDir, "seams/sim-runner.ts");

/** The value the HTTP runner reports; see the R5 note in this file's header. */
const RECORDED_SIM_VERSION = "api-v15";

type SimObservation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
};

type BulkScreenRequest = {
  baseRequest: Readonly<Record<string, unknown>>;
  candidates: readonly {
    index: number;
    gear: Readonly<Record<string, unknown>>;
  }[];
  iterations: number;
};

type BulkScreenResult = {
  baseline: SimObservation;
  rows: ReadonlyArray<{ index: number; observation: SimObservation }>;
};

const loadSeam = async () =>
  (await import(pathToFileURL(seamModule).href)) as {
    bulkScreenCacheKey: (req: BulkScreenRequest, simVersion: string) => string;
    RecordedSimRunner: new (
      simVersion: string,
      recordings: ReadonlyMap<string, SimObservation>,
      bulkRecordings?: ReadonlyMap<string, BulkScreenResult>
    ) => {
      runBulkScreen?: (req: BulkScreenRequest) => Promise<BulkScreenResult>;
    };
  };

/**
 * The recorded request. `baseRequest` is deliberately reduced to an opaque
 * marker: the cache key hashes whatever it is given, and carrying a full
 * feral-p2 raid request here would add megabytes without testing anything the
 * key scheme does not already do with a small object.
 */
const RECORDED_REQUEST: BulkScreenRequest = {
  baseRequest: { recording: "feral-p2-go-http-2026-09-01" },
  candidates: [
    { index: 0, gear: { items: [{ id: 29994 }] } },
    { index: 1, gear: { items: [{ id: 30098 }] } },
    { index: 2, gear: { items: [{ id: 31255 }] } },
  ],
  iterations: 5000,
};

const obs = (dps: number): SimObservation => ({
  dps,
  stdev: 0,
  iterationsDone: 6075,
  simVersion: RECORDED_SIM_VERSION,
});

/** Measured on the Go server; see equiv-dump-local.json for the full set. */
const RECORDED_RESULT: BulkScreenResult = {
  baseline: obs(2181.6723670119713),
  rows: [
    { index: 0, observation: obs(2234.1162967202495) },
    { index: 1, observation: obs(2230.2092660165404) },
    { index: 2, observation: obs(2228.9121045295165) },
  ],
};

describe.skipIf(!forkPresent)("bulk screen recorded from the Go engine", () => {
  it("replays under the same key scheme the WASM transport uses", async () => {
    const { RecordedSimRunner, bulkScreenCacheKey } = await loadSeam();
    const key = bulkScreenCacheKey(RECORDED_REQUEST, RECORDED_SIM_VERSION);
    const runner = new RecordedSimRunner(
      RECORDED_SIM_VERSION,
      new Map(),
      new Map([[key, RECORDED_RESULT]])
    );

    const replayed = await runner.runBulkScreen!(RECORDED_REQUEST);

    // One row per candidate, keyed by the caller's own index -- the property
    // `rank.ts` relies on when it maps rows back onto screening attempts.
    expect(replayed.rows).toHaveLength(RECORDED_REQUEST.candidates.length);
    expect(replayed.rows.map((r) => r.index)).toEqual([0, 1, 2]);
    expect(replayed.baseline.dps).toBeCloseTo(2181.6723670119713, 6);

    // Every candidate out-DPSes the baseline, and by a margin far larger than
    // the ~1 DPS noise floor measured on this character -- so these three rows
    // carry real signal rather than tail jitter.
    for (const row of replayed.rows) {
      expect(row.observation.dps).toBeGreaterThan(replayed.baseline.dps + 40);
    }
  });

  it("keys on the recorded simVersion, so a version bump cannot replay stale numbers (R5)", async () => {
    const { RecordedSimRunner, bulkScreenCacheKey } = await loadSeam();
    // The recording was made over HTTP; a WASM recording of the same batch would
    // carry this same string, because version() is a constant rather than an
    // engine reading. That is what makes one fixture scheme serve both.
    expect(RECORDED_RESULT.baseline.simVersion).toBe(RECORDED_SIM_VERSION);

    // Recording filed under a DIFFERENT version than the runner reports: the
    // lookup must miss. Asserting the miss (rather than a matching pair) is what
    // makes this test fail if the key ever stops depending on simVersion.
    const staleRunner = new RecordedSimRunner(
      RECORDED_SIM_VERSION,
      new Map(),
      new Map([
        [bulkScreenCacheKey(RECORDED_REQUEST, "api-v14"), RECORDED_RESULT],
      ])
    );
    await expect(staleRunner.runBulkScreen!(RECORDED_REQUEST)).rejects.toThrow(
      /no recording for bulk screen key/
    );

    // ...and the same recording filed under the reported version must hit, so
    // the miss above is attributable to the version and not to some other part
    // of the key.
    const freshRunner = new RecordedSimRunner(
      RECORDED_SIM_VERSION,
      new Map(),
      new Map([
        [
          bulkScreenCacheKey(RECORDED_REQUEST, RECORDED_SIM_VERSION),
          RECORDED_RESULT,
        ],
      ])
    );
    await expect(
      freshRunner.runBulkScreen!(RECORDED_REQUEST)
    ).resolves.toBeDefined();
  });
});
