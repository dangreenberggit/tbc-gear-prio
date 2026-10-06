/**
 * The no-culling boundary, measured against upstream's own estimator (ticket
 * 349).
 *
 * Dead code cover: nothing here is reachable from the upgrades tab at runtime.
 * Since ticket 403 both transports take the per-candidate loop, and the switch
 * is `makeSimRunner(bulk = false)` in the fork's
 * `upgrades/adapters/bulk_wasm_sim_runner.ts`. Green means the machinery still
 * works, not that the tab uses it. The code is kept on purpose (ticket 406,
 * resolved keep) and these tests are its re-enable safety net. Re-check with:
 * `grep -rn 'makeSimRunner(' vendor/tbc-new-fork/ui --include=*.ts --include=*.tsx --include=*.mts | grep -v node_modules`
 *
 * Ticket 349's premise was that a high enough iteration count would push the
 * single-stage boundary below the shared chunk bound of 25, silently culling
 * candidates out of a screening pass. Running `shouldUseLegacyBulkSim` over a
 * wide span of iteration counts shows the premise is false at 25 — the boundary
 * moves down as iterations rise but floors at n = 27 — and that is what the
 * per-iteration-count cases here record (one `it.each` case per row of
 * `FIRST_MULTI_STAGE_N`), so a change in upstream's estimator or stage table
 * shows up as a failing row rather than as a wrong comment.
 *
 * The property that actually protects the ranking is the third test:
 * `assertSingleStageChunk` refuses a chunk the estimator would take multi-stage,
 * whatever the constant happens to be. That is the guard ticket 349 asked for,
 * and it is checked by making it fire.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import {
  forkPresent,
  forkUpgradesDir,
  forkRoot,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";

const estimateModule = join(forkRoot, "ui/sim/wasm/bulk_sim/estimate.ts");
const apiModule = join(forkRoot, "ui/generated/proto/api.ts");
const partitionModule = join(forkUpgradesDir, "engine/bulk/partition.ts");
const builderModule = join(forkUpgradesDir, "adapters/bulk_request_builder.ts");
const seamModule = join(forkUpgradesDir, "engine/seams/sim-runner.ts");

/**
 * The measured first multi-stage `n` per iteration count. `n` below the listed
 * value is single-stage (no culling); at the listed value and above the
 * estimator starts running pre-High stages.
 */
const FIRST_MULTI_STAGE_N: ReadonlyArray<readonly [number, number]> = [
  [3_000, 40],
  [5_000, 33],
  [7_500, 31],
  [10_000, 30],
  [15_000, 28],
  [20_000, 28],
  [28_000, 28],
  [28_001, 27],
  [30_000, 27],
  [50_000, 27],
  [100_000, 27],
  [1_000_000, 27],
];

type BulkSimRequestProto = { highStageIterations: number };

const load = async () => {
  await loadForkEngineEnvironment();
  const { shouldUseLegacyBulkSim } = (await import(
    pathToFileURL(estimateModule).href
  )) as {
    shouldUseLegacyBulkSim: (
      request: BulkSimRequestProto,
      candidateCount: number
    ) => boolean;
  };
  const { BulkSimRequest } = (await import(pathToFileURL(apiModule).href)) as {
    BulkSimRequest: {
      create: (init: { highStageIterations: number }) => BulkSimRequestProto;
    };
  };
  const { MAX_CANDIDATES_PER_BULK_REQUEST } = (await import(
    pathToFileURL(partitionModule).href
  )) as { MAX_CANDIDATES_PER_BULK_REQUEST: number };
  const { assertSingleStageChunk } = (await import(
    pathToFileURL(builderModule).href
  )) as {
    assertSingleStageChunk: (
      request: BulkSimRequestProto,
      candidateCount: number
    ) => void;
  };
  const { BulkScreenIntegrityError } = (await import(
    pathToFileURL(seamModule).href
  )) as { BulkScreenIntegrityError: new (message: string) => Error };
  return {
    shouldUseLegacyBulkSim,
    BulkSimRequest,
    MAX_CANDIDATES_PER_BULK_REQUEST,
    assertSingleStageChunk,
    BulkScreenIntegrityError,
  };
};

describe.skipIf(!forkPresent)("bulk single-stage boundary", () => {
  // Loaded once for the whole describe rather than per test: the fork
  // engine/WASM module import is the expensive part, and under heavy CPU
  // contention it plus a whole-table sweep in one test pushed past the 30s
  // budget (ticket 375, reproduced at 4x CPU oversubscription). Splitting the
  // sweep into one it.each case per iteration count bounds each test's own work
  // to a single row's inner loop while the load cost is paid once.
  let fork: Awaited<ReturnType<typeof load>>;
  // 30s, matching `testTimeout`, not the 10s default hookTimeout: the fork
  // engine/WASM import moved here from per-test bodies, and under heavy CPU
  // contention the import alone can pass 10s. The old structure gave the load
  // the test's own 30s budget; this keeps that headroom for the one-time cost
  // while each test's own work stays in the millisecond range (ticket 375).
  beforeAll(async () => {
    fork = await load();
  }, 30_000);

  it.each(FIRST_MULTI_STAGE_N)(
    "first multi-stage n at %i iterations is the measured value",
    (iterations, expectedN) => {
      const { shouldUseLegacyBulkSim, BulkSimRequest } = fork;
      const request = BulkSimRequest.create({
        highStageIterations: iterations,
      });
      let firstMultiStage = -1;
      for (let n = 20; n <= 120; n++) {
        if (!shouldUseLegacyBulkSim(request, n)) {
          firstMultiStage = n;
          break;
        }
      }
      expect(firstMultiStage).toBe(expectedN);
    }
  );

  it("keeps the shipped chunk bound single-stage at an absurd iteration count", () => {
    const {
      shouldUseLegacyBulkSim,
      BulkSimRequest,
      MAX_CANDIDATES_PER_BULK_REQUEST,
    } = fork;
    expect(
      shouldUseLegacyBulkSim(
        BulkSimRequest.create({ highStageIterations: 1_000_000 }),
        MAX_CANDIDATES_PER_BULK_REQUEST
      )
    ).toBe(true);
  });

  it("refuses a chunk the estimator would cull, and passes 25 and 26 at any count", () => {
    const { BulkSimRequest, assertSingleStageChunk, BulkScreenIntegrityError } =
      fork;
    const cullable = () =>
      assertSingleStageChunk(
        BulkSimRequest.create({ highStageIterations: 30_000 }),
        27
      );
    // The TYPE is the load-bearing half, not the wording: the driver and
    // `rank.ts` both rethrow `BulkScreenIntegrityError` unconditionally and
    // degrade everything else to the per-candidate loop, so a guard throwing a
    // bare `Error` would fail quietly — the opposite of what ticket 349 asked
    // for — while still matching a message assertion.
    expect(cullable).toThrow(BulkScreenIntegrityError);
    expect(cullable).toThrow(/multi-stage/);
    expect(() =>
      assertSingleStageChunk(
        BulkSimRequest.create({ highStageIterations: 1_000_000 }),
        25
      )
    ).not.toThrow();
    expect(() =>
      assertSingleStageChunk(
        BulkSimRequest.create({ highStageIterations: 1_000_000 }),
        26
      )
    ).not.toThrow();
  });
});
