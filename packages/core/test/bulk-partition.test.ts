/**
 * `partitionForBulkScreen` (batch-sim plan Step 5) — a pure function, so it is
 * unit-tested directly rather than through a seam (AGENTS.md § Testing: pure
 * functions are unit-tested where the logic is independently valuable; the bound
 * this enforces is what keeps both engines inside their no-culling regime).
 *
 * Dead code cover: nothing here is reachable from the upgrades tab at runtime.
 * The tab's only runner, `WorkerPoolSimRunner`, has no `runBulkScreen`, and the
 * fork's bulk adapters are deleted (fork `02cca7b70`). This suite covers the
 * engine's bulk branch that is still there (`engine/bulk/partition.ts`,
 * `rank.ts`'s screening pass, the seam's bulk types); ticket 567 deletes that
 * branch and this suite with it. Re-check with
 * `git -C vendor/tbc-new-fork grep -n runBulkScreen -- ui ':!ui/features/upgrades/model/engine'`,
 * which prints only a doc comment in `worker_pool_sim_runner.ts`.
 *
 * The module lives in the fork, which is gitignored (`vendor/`), so the suite
 * skips when the clone is absent — same pattern as `wowsims-fork-parity`.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const partitionModule = join(
  root,
  "vendor/tbc-new-fork/ui/features/upgrades/model/engine/bulk/partition.ts"
);
const forkPresent = existsSync(partitionModule);

type Candidate = { index: number; gear: Readonly<Record<string, unknown>> };

const load = async () =>
  (await import(pathToFileURL(partitionModule).href)) as {
    MAX_CANDIDATES_PER_BULK_REQUEST: number;
    partitionForBulkScreen: (
      candidates: readonly Candidate[],
      maxPerRequest?: number
    ) => Candidate[][];
  };

const candidates = (n: number): Candidate[] =>
  Array.from({ length: n }, (_, i) => ({ index: i, gear: { id: 1000 + i } }));

describe.skipIf(!forkPresent)("partitionForBulkScreen", () => {
  it("keeps the shared constant inside both engines' no-culling regimes", async () => {
    const { MAX_CANDIDATES_PER_BULK_REQUEST } = await load();
    // 25 is single-stage on both engines at every iteration count measured, so
    // the bound is iteration-invariant rather than tuned to today's default —
    // see the deleted `bulk-boundary.test.ts` for the table and the mechanism
    // (`git show 1964ecb0:packages/core/test/bulk-boundary.test.ts`). A change
    // here is a cross-engine decision, not a tuning knob.
    expect(MAX_CANDIDATES_PER_BULK_REQUEST).toBe(25);
    expect(MAX_CANDIDATES_PER_BULK_REQUEST).toBeLessThan(26);
  });

  it("never exceeds the bound, for every size 1..60", async () => {
    const { MAX_CANDIDATES_PER_BULK_REQUEST, partitionForBulkScreen } =
      await load();
    for (let n = 1; n <= 60; n++) {
      const chunks = partitionForBulkScreen(candidates(n));
      for (const chunk of chunks) {
        expect(chunk.length).toBeLessThanOrEqual(
          MAX_CANDIDATES_PER_BULK_REQUEST
        );
        expect(chunk.length).toBeGreaterThan(0);
      }
    }
  });

  it("round-trips every candidate index, in order, for every size 1..60", async () => {
    const { partitionForBulkScreen } = await load();
    for (let n = 1; n <= 60; n++) {
      const flat = partitionForBulkScreen(candidates(n)).flat();
      // No candidate dropped and none duplicated: the bound is enforced by
      // splitting, never by trimming.
      expect(flat.map((c) => c.index)).toEqual(
        Array.from({ length: n }, (_, i) => i)
      );
    }
  });

  it("splits an oversized slot rather than dropping any of it", async () => {
    const { partitionForBulkScreen } = await load();
    const chunks = partitionForBulkScreen(candidates(60), 25);
    expect(chunks.map((c) => c.length)).toEqual([25, 25, 10]);
  });

  it("returns no chunks for an empty candidate list", async () => {
    const { partitionForBulkScreen } = await load();
    expect(partitionForBulkScreen([])).toEqual([]);
  });

  it("preserves each candidate's own gear payload", async () => {
    const { partitionForBulkScreen } = await load();
    const input = candidates(30);
    const flat = partitionForBulkScreen(input).flat();
    expect(flat.map((c) => c.gear)).toEqual(input.map((c) => c.gear));
  });

  it("rejects a nonsensical bound instead of silently producing one chunk", async () => {
    const { partitionForBulkScreen } = await load();
    expect(() => partitionForBulkScreen(candidates(5), 0)).toThrow(
      /positive integer/
    );
    expect(() => partitionForBulkScreen(candidates(5), 2.5)).toThrow(
      /positive integer/
    );
  });
});
