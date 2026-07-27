import { describe, expect, it } from "vitest";
import { CUTOFF } from "../src/cutoff.js";
import { RankError, rankUpgrades } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import { RecordedSimRunner } from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";

describe("CUTOFF", () => {
  it("pins the five-seed derived constant", () => {
    expect(CUTOFF).toEqual({ absDps: 3.4, pct: 0.15 });
  });
});

describe("rankUpgrades", () => {
  it("is not implemented yet but exposes the public signature", async () => {
    await expect(
      rankUpgrades(
        {
          character: {
            region: "US",
            realm: "dreamscythe",
            name: "slamaltman",
          },
          spec: "ret",
          maxPhase: 2,
        },
        {
          gear: new RecordedGearSource({
            fights: new Map(),
            gear: new Map(),
          }),
          sim: new RecordedSimRunner("v0.0.101", new Map()),
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
        }
      )
    ).rejects.toMatchObject({
      name: "RankError",
      kind: "not-implemented",
    } satisfies Partial<RankError>);
  });
});
