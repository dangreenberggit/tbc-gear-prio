import { describe, expect, it } from "vitest";
import {
  RecordedSimRunner,
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";

const REQ: RaidSimRequest = { raid: { parties: [] }, note: "baseline" };
const OBS: SimObservation = {
  dps: 2042.85,
  stdev: 119.04,
  iterationsDone: 5000,
  simVersion: "v0.0.101",
};

describe("simCacheKey", () => {
  it("changes when seed or iterations change", () => {
    const a = simCacheKey(REQ, "v0.0.101", { seed: 42, iterations: 5000 });
    const b = simCacheKey(REQ, "v0.0.101", { seed: 43, iterations: 5000 });
    const c = simCacheKey(REQ, "v0.0.101", { seed: 42, iterations: 3000 });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("is stable for the same request payload", () => {
    const again: RaidSimRequest = { raid: { parties: [] }, note: "baseline" };
    expect(simCacheKey(REQ, "v0.0.101", { seed: 42, iterations: 5000 })).toBe(
      simCacheKey(again, "v0.0.101", { seed: 42, iterations: 5000 })
    );
  });
});

describe("RecordedSimRunner", () => {
  it("returns the configured sim version", async () => {
    const sim = new RecordedSimRunner("v0.0.101", new Map());
    expect(await sim.version()).toBe("v0.0.101");
  });

  it("replays a recorded observation for a matching key", async () => {
    const key = simCacheKey(REQ, "v0.0.101", { seed: 42, iterations: 5000 });
    const sim = new RecordedSimRunner("v0.0.101", new Map([[key, OBS]]));
    expect(await sim.run(REQ, { seed: 42, iterations: 5000 })).toEqual(OBS);
  });

  it("throws when no recording matches", async () => {
    const sim = new RecordedSimRunner("v0.0.101", new Map());
    await expect(sim.run(REQ, { seed: 42, iterations: 5000 })).rejects.toThrow(
      /no recording/i
    );
  });
});
