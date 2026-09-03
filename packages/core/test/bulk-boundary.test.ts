/**
 * The no-culling boundary, measured against upstream's own estimator (ticket
 * 349).
 *
 * Ticket 349's premise was that a high enough iteration count would push the
 * single-stage boundary below the shared chunk bound of 25, silently culling
 * candidates out of a screening pass. Running `shouldUseLegacyBulkSim` over a
 * wide span of iteration counts shows the premise is false at 25 — the boundary
 * moves down as iterations rise but floors at n = 27 — and that is what the
 * first test here records, so a change in upstream's estimator or stage table
 * shows up as a failing table rather than as a wrong comment.
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
import { describe, expect, it } from "vitest";

import {
  forkPresent,
  forkUpgradesDir,
  forkRoot,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";

const estimateModule = join(forkRoot, "ui/core/wasm/bulk_sim/estimate.ts");
const apiModule = join(forkRoot, "ui/core/proto/api.ts");
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
  it("reproduces the measured first multi-stage n per iteration count", async () => {
    const { shouldUseLegacyBulkSim, BulkSimRequest } = await load();
    const measured = FIRST_MULTI_STAGE_N.map(([iterations]) => {
      const request = BulkSimRequest.create({
        highStageIterations: iterations,
      });
      for (let n = 20; n <= 120; n++) {
        if (!shouldUseLegacyBulkSim(request, n)) return [iterations, n];
      }
      return [iterations, -1];
    });
    expect(measured).toEqual(FIRST_MULTI_STAGE_N.map(([i, n]) => [i, n]));
  });

  it("keeps the shipped chunk bound single-stage at an absurd iteration count", async () => {
    const {
      shouldUseLegacyBulkSim,
      BulkSimRequest,
      MAX_CANDIDATES_PER_BULK_REQUEST,
    } = await load();
    expect(
      shouldUseLegacyBulkSim(
        BulkSimRequest.create({ highStageIterations: 1_000_000 }),
        MAX_CANDIDATES_PER_BULK_REQUEST
      )
    ).toBe(true);
  });

  it("refuses a chunk the estimator would cull, and passes 25 and 26 at any count", async () => {
    const { BulkSimRequest, assertSingleStageChunk, BulkScreenIntegrityError } =
      await load();
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
