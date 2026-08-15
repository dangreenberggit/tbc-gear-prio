import { describe, expect, it } from "vitest";

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
