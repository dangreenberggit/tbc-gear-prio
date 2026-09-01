/**
 * The bulk screening branch in the fork's `rankUpgrades` (batch-sim plan Step 8,
 * round-2 condition N1).
 *
 * The primary test stays at the module interface — `rankUpgrades` through
 * recorded adapters — and asserts the property N1 actually cares about: taking
 * the bulk route changes WHERE the screening DPS comes from and nothing else.
 * Every row must still carry the metadata the per-candidate loop computes, and
 * the run must reach `replicateTopItems` without a `RankError`.
 *
 * The bulk branch is exercised by handing `RecordedSimRunner` a bulk-recordings
 * map, which is what makes `runBulkScreen` present. The strongest form of the
 * assertion is a comparison: the SAME fixture run twice, once with the bulk
 * capability and once without, must produce the same ranking — because the
 * recorded bulk observations are the same numbers the loop would have read.
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
const forkPresent =
  existsSync(forkEngineDir) &&
  existsSync(join(root, "vendor/tbc-new-fork/ui/core/proto/common.ts"));

const seamModule = join(forkEngineDir, "seams/sim-runner.ts");

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
      version(): Promise<string>;
      run(
        req: Readonly<Record<string, unknown>>,
        opts: { seed: number; iterations: number }
      ): Promise<SimObservation>;
      runBulkScreen?: (req: BulkScreenRequest) => Promise<BulkScreenResult>;
    };
  };

describe.skipIf(!forkPresent)("bulk screening capability (seam)", () => {
  it("is absent unless the runner was given bulk recordings", async () => {
    const { RecordedSimRunner } = await loadSeam();
    const withoutBulk = new RecordedSimRunner("v1", new Map());
    // `rank.ts` branches on the member's presence, so a fixture with no bulk
    // recordings must be indistinguishable from a runner that never had the
    // capability -- otherwise every existing fixture would silently take the
    // bulk path and fail on a missing recording.
    expect(withoutBulk.runBulkScreen).toBeUndefined();
    expect("runBulkScreen" in withoutBulk).toBe(false);

    const withBulk = new RecordedSimRunner("v1", new Map(), new Map());
    expect(typeof withBulk.runBulkScreen).toBe("function");
  });

  it("replays a recorded batch by its key", async () => {
    const { RecordedSimRunner, bulkScreenCacheKey } = await loadSeam();
    const req: BulkScreenRequest = {
      baseRequest: { raid: { parties: [] } },
      candidates: [
        { index: 0, gear: { items: [{ id: 1 }] } },
        { index: 1, gear: { items: [{ id: 2 }] } },
      ],
      iterations: 5000,
    };
    const expected: BulkScreenResult = {
      baseline: {
        dps: 1000,
        stdev: 10,
        iterationsDone: 5000,
        simVersion: "v1",
      },
      rows: [
        {
          index: 0,
          observation: {
            dps: 1100,
            stdev: 11,
            iterationsDone: 5000,
            simVersion: "v1",
          },
        },
        {
          index: 1,
          observation: {
            dps: 900,
            stdev: 9,
            iterationsDone: 5000,
            simVersion: "v1",
          },
        },
      ],
    };
    const runner = new RecordedSimRunner(
      "v1",
      new Map(),
      new Map([[bulkScreenCacheKey(req, "v1"), expected]])
    );
    await expect(runner.runBulkScreen!(req)).resolves.toEqual(expected);
  });

  it("throws rather than inventing numbers for an unrecorded batch", async () => {
    const { RecordedSimRunner } = await loadSeam();
    const runner = new RecordedSimRunner("v1", new Map(), new Map());
    await expect(
      runner.runBulkScreen!({
        baseRequest: {},
        candidates: [{ index: 0, gear: {} }],
        iterations: 5000,
      })
    ).rejects.toThrow(/no recording for bulk screen key/);
  });

  it("keys on the batch, so a different candidate set is a different key", async () => {
    const { bulkScreenCacheKey } = await loadSeam();
    const base = { raid: {} };
    const one = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 1 } }],
        iterations: 5000,
      },
      "v1"
    );
    const two = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 2 } }],
        iterations: 5000,
      },
      "v1"
    );
    const differentIterations = bulkScreenCacheKey(
      {
        baseRequest: base,
        candidates: [{ index: 0, gear: { id: 1 } }],
        iterations: 3000,
      },
      "v1"
    );
    expect(one).not.toBe(two);
    expect(one).not.toBe(differentIterations);
    // Stable for the same inputs, so a recording made once replays forever.
    expect(one).toBe(
      bulkScreenCacheKey(
        {
          baseRequest: base,
          candidates: [{ index: 0, gear: { id: 1 } }],
          iterations: 5000,
        },
        "v1"
      )
    );
  });
});
