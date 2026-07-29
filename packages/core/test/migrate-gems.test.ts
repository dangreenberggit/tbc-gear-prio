import { describe, expect, it } from "vitest";
import { fillEmptyCandidateGems } from "../src/candidate-gems.js";
import { gemsForPhase } from "../src/gems.js";
import { migrateGemsToItem } from "../src/migrate-gems.js";
import { GemColor } from "../src/proto/common_pb.js";

describe("migrateGemsToItem", () => {
  it("moves colour-matched gems onto the new item's sockets", () => {
    // Endless Pit (28779): red + blue sockets; worn Bold + Steady
    // Belt of One-Hundred Deaths (30106): yellow + blue
    const migrated = migrateGemsToItem([24027, 31118], 28779, 30106);
    expect(migrated).toHaveLength(2);
    // 24027 is red → eligible on yellow (not match) after blue takes 31118 or vice versa
    expect(migrated.filter((id) => id > 0).length).toBe(2);
    expect(new Set(migrated)).toEqual(new Set([24027, 31118]));
  });

  it("puts a meta gem only in a meta socket", () => {
    // Gizmatic 32461: meta + blue; Relentless 32409 is meta
    const migrated = migrateGemsToItem([32409, 24054], 32461, 32461);
    expect(migrated[0]).toBe(32409);
    expect(migrated[1]).toBe(24054);
  });

  it("leaves extra sockets empty when the new item has more sockets", () => {
    // neck has no sockets; head has 2 — nothing to migrate
    const migrated = migrateGemsToItem([], 30022, 32461);
    expect(migrated).toEqual([0, 0]);
  });
});

describe("fillEmptyCandidateGems", () => {
  it("keeps migrated gems and only fills zeros", () => {
    const palette = gemsForPhase(3);
    const ep = { "21": 1, "22": 1, "23": 1, "24": 1 };
    const partial = [24027, 0];
    const out = fillEmptyCandidateGems(30106, partial, palette, ep);
    expect(out[0]).toBe(24027);
    expect(out[1]).toBeGreaterThan(0);
    expect(out[1]).not.toBe(24027);
  });
});

describe("gemEligibleForSocket (via migrate)", () => {
  it("does not place a non-meta gem into a meta socket", () => {
    // Force a red gem onto goggles: only meta socket can take meta; red goes to blue
    const migrated = migrateGemsToItem([24027], 28779, 32461);
    expect(migrated[0]).toBe(0); // meta socket empty
    expect(migrated[1]).toBe(24027);
    void GemColor;
  });
});
