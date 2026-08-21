import { describe, expect, it } from "vitest";

describe("promisePool error and size edge cases", () => {
  it("rejects with the lowest-index error, not the first to reject", async () => {
    // Two tasks fail in one drain. A time-ordered winner would surface
    // index 2 here, making the error depend on pool size and task latency.
    const tasks = [
      async () => {
        await new Promise((r) => setTimeout(r, 30));
        throw new Error("index-0");
      },
      async () => "ok",
      async () => {
        throw new Error("index-2");
      },
    ];
    await expect(promisePool(tasks, 3)).rejects.toThrow("index-0");
  });

  it("surfaces the same error at every pool size", async () => {
    const build = () => [
      async () => {
        await new Promise((r) => setTimeout(r, 20));
        throw new Error("index-0");
      },
      async () => {
        throw new Error("index-1");
      },
      async () => "ok",
    ];
    const at1 = await promisePool(build(), 1).catch((e: Error) => e.message);
    const at4 = await promisePool(build(), 4).catch((e: Error) => e.message);
    expect(at1).toBe("index-0");
    expect(at4).toBe(at1);
  });

  it("runs every task when given a non-finite pool size", async () => {
    // NaN once produced zero workers and a silent success.
    const ran: number[] = [];
    const tasks = [0, 1, 2].map((i) => async () => {
      ran.push(i);
      return i;
    });
    const out = await promisePool(tasks, Number.NaN);
    expect(out).toEqual([0, 1, 2]);
    expect(ran.sort()).toEqual([0, 1, 2]);
  });
});

import { promisePool } from "../src/promise-pool.js";

describe("promisePool", () => {
  it("runs at most n tasks concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const tasks = Array.from({ length: 6 }, (_, i) => async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return i;
    });

    await promisePool(tasks, 2);

    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it("propagates a task rejection", async () => {
    const tasks = [
      async () => 1,
      async () => {
        throw new Error("task blew up");
      },
      async () => 3,
    ];

    await expect(promisePool(tasks, 2)).rejects.toThrow("task blew up");
  });

  it("keys results by input position, not arrival order", async () => {
    // Task 0 finishes last on purpose — a pool that reports by arrival order
    // rather than by request would put it last in the array too.
    const tasks = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return "slow-first";
      },
      async () => "fast-second",
      async () => "fast-third",
    ];

    const results = await promisePool(tasks, 3);

    expect(results).toEqual(["slow-first", "fast-second", "fast-third"]);
  });
});
