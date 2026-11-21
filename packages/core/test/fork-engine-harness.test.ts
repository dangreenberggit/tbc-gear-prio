/**
 * `tracedRank`, the opt-in trace behind the readability refactor's K2 check
 * (`.scratch/agent-reports/2026-11-21-design-task-upgrades-readability-plan.md`
 * § Checks). A trace that drops or reorders a call would let a refactor pass
 * K2 while changing behaviour, so the recorder itself is pinned here.
 */
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { tracedRank } from "./fork-engine-harness.js";

type Sim = {
  run: (req: unknown, opts: unknown) => Promise<unknown>;
  computeStats?: (req: unknown) => Promise<unknown>;
  activeSetBonuses?: (req: unknown) => Promise<unknown>;
};

const ENV = "TBC_RANK_TRACE_DIR";
const before = process.env[ENV];
let dir: string | undefined;

afterEach(() => {
  if (before === undefined) delete process.env[ENV];
  else process.env[ENV] = before;
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = undefined;
});

function traceTo(): string {
  dir = mkdtempSync(join(tmpdir(), "rank-trace-"));
  process.env[ENV] = dir;
  return dir;
}

function lines(d: string): Array<Record<string, unknown>> {
  return readFileSync(join(d, "fork-engine-harness.test.ts.jsonl"), "utf8")
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("tracedRank", () => {
  it("returns the engine function itself when the variable is unset", () => {
    delete process.env[ENV];
    const rank = (): Promise<string> => Promise.resolve("r");
    expect(tracedRank(rank)).toBe(rank);
  });

  it("records the ranking, every sim call in order and each warning", async () => {
    const d = traceTo();
    const own = Promise.resolve({ dps: 1 });
    const seen: Array<Promise<unknown>> = [];
    const rank = async (
      input: { n: number },
      deps: { sim: Sim }
    ): Promise<{ n: number }> => {
      seen.push(deps.sim.run({ a: 1 }, { iterations: 5 }));
      await deps.sim.computeStats!({ a: 2 });
      console.warn("first", { not: "kept" });
      await deps.sim.activeSetBonuses!({ a: 3 });
      await deps.sim.run({ a: 1 }, { iterations: 6 });
      return { n: input.n };
    };
    const sim: Sim = {
      run: () => own,
      computeStats: () => Promise.resolve({}),
      activeSetBonuses: () => Promise.resolve([]),
    };
    const warn = console.warn;
    console.warn = () => {};
    try {
      await tracedRank(rank)({ n: 7 }, { sim });
      await tracedRank(rank)({ n: 8 }, { sim });
    } finally {
      console.warn = warn;
    }

    expect(seen[0]).toBe(own);
    const [first, second] = lines(d);
    expect(first).toMatchObject({
      test: "tracedRank > records the ranking, every sim call in order and each warning",
      call: 1,
      ranking: { n: 7 },
      warnings: ["first"],
    });
    expect(second).toMatchObject({ call: 2, ranking: { n: 8 } });
    const calls = first!.sims as Array<[string, string]>;
    expect(calls.map(([kind]) => kind)).toEqual([
      "run",
      "computeStats",
      "activeSetBonuses",
      "run",
    ]);
    // Same request, different options: a different call.
    expect(calls[0]![1]).not.toBe(calls[3]![1]);
    expect(calls[0]![1]).toMatch(/^[0-9a-f]{64}$/);
  });

  it("records a rejected run and rethrows the same error", async () => {
    const d = traceTo();
    const boom = Object.assign(new Error("no sim"), { code: "sim-failed" });
    const rank = (_input: unknown, _deps: unknown): Promise<never> =>
      Promise.reject(boom);
    await expect(
      tracedRank(rank)({}, { sim: { run: () => Promise.resolve() } })
    ).rejects.toBe(boom);
    expect(lines(d)[0]).toMatchObject({
      error: { name: "Error", message: "no sim", code: "sim-failed" },
    });
  });

  it("leaves a runner without computeStats without it", async () => {
    traceTo();
    let had: boolean | undefined;
    const rank = (_: unknown, deps: { sim: Sim }): Promise<null> => {
      had = typeof deps.sim.computeStats === "function";
      return Promise.resolve(null);
    };
    await tracedRank(rank)({}, { sim: { run: () => Promise.resolve() } });
    expect(had).toBe(false);
  });
});
