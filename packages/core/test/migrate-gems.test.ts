import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fillEmptyCandidateGems } from "../src/candidate-gems.js";
import { gemsForPhase, getGem } from "../src/gems.js";
import { migrateGemsToItem } from "../src/migrate-gems.js";
import { GemColor } from "../src/proto/common_pb.js";
import { Stat } from "../src/stats.js";

const retEpWeights = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../data/presets/ret/p2.ep-weights.json"
    ),
    "utf8"
  )
).weights as Record<string, number>;

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

  it("skips set-wide unique gems already used on another piece", () => {
    // Restrict palette so the unique green is the unconstrained pick for the
    // empty blue socket; a stam blue is the only fallback when unique is taken.
    const palette = gemsForPhase(3).filter((g) =>
      [30546, 24033].includes(g.id)
    );
    const unconstrained = fillEmptyCandidateGems(
      30106,
      [32193, 0],
      palette,
      retEpWeights
    );
    expect(unconstrained[1]).toBe(30546);
    expect(getGem(30546)?.unique).toBe(true);

    const blocked = fillEmptyCandidateGems(
      30106,
      [32193, 0],
      palette,
      retEpWeights,
      { usedUnique: new Set([30546]) }
    );
    expect(blocked[1]).toBe(24033);
  });

  it("among near-EP picks, prefers a gem that reduces meta deficit", () => {
    // Red socket empty; Relentless short one blue. Bold (10 str) vs Sovereign
    // purple (5 str + stam). Under strength+stam weights they are within 1 EP;
    // purple activates meta, Bold does not.
    const palette = gemsForPhase(3).filter((g) =>
      [32193, 32211].includes(g.id)
    );
    const ep = {
      [String(Stat.StatStrength)]: 1,
      [String(Stat.StatStamina)]: 0.7,
    };
    // Other slots only — the kept 32200 below belongs to the piece under fill
    // and must not be counted here as well.
    const otherGemIds = [32409, 32193, 32193, 32205, 32205];
    // Endless Pit (28779) is red+blue — fill the red (index 0), keep the blue.
    const out = fillEmptyCandidateGems(28779, [0, 32200], palette, ep, {
      meta: { metaId: 32409, otherGemIds },
    });
    expect(out[0]).toBe(32211);
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
