import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  fillCandidateGems,
  fillEmptyCandidateGems,
  gemContext,
} from "../src/candidate-gems.js";
import { gemsForPhase, getGem } from "../src/gems.js";
import { socketsFor } from "../src/items.js";
import { isKaelTempLegendary } from "../src/kael-temp.js";
import { GemColor } from "../src/proto/common_pb.js";
import { Stat } from "../src/stats.js";

const epWeights = { "21": 1, "22": 1, "23": 1, "24": 1 };

const retEpWeights = JSON.parse(
  readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../data/presets/ret/p2.ep-weights.json"
    ),
    "utf8"
  )
).weights as Record<string, number>;

describe("fillCandidateGems", () => {
  it("fills each socket on a gemmed head", () => {
    const headId = 32461; // Furious Gizmatic Goggles
    const sockets = socketsFor(headId);
    expect(sockets.length).toBeGreaterThan(0);
    const gems = fillCandidateGems(headId, gemsForPhase(2), epWeights);
    expect(gems).toHaveLength(sockets.length);
    expect(gems.every((id) => id > 0)).toBe(true);
  });

  it("returns empty for socketless items", () => {
    expect(fillCandidateGems(28757, gemsForPhase(2), epWeights)).toEqual([]);
  });

  it("puts Relentless in an empty meta socket, not the higher-EP Swift Skyfire", () => {
    // Stat EP ranks Swift Skyfire 9.84 over Relentless 9.00, because
    // Relentless's +3% crit damage is a multiplier and additive EP cannot see
    // it. All three upstream wowsims ret gear presets use Relentless.
    const headId = 32461; // Furious Gizmatic Goggles
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    expect(metaIdx).toBeGreaterThanOrEqual(0);

    const gems = fillCandidateGems(headId, gemsForPhase(3), retEpWeights);
    expect(gems[metaIdx]).toBe(32409);
    expect(getGem(gems[metaIdx]!)?.colour).toBe(GemColor.GemColorMeta);
  });

  it("prefers strength reds over hit orange on Belt of One-Hundred Deaths under ret EP", () => {
    // Two Bold Crimson Spinels beat Glinting+Sovereign on this set even though
    // uncapped hit EP ranks the orange higher — which is why gemFillWeights
    // zeroes hit. Measured against live wowsimcli; re-run with
    // `pnpm rank --region US --realm dreamscythe --character slamaltman
    //  --offline --max-phase 3` and compare the waist row.
    const gems = fillCandidateGems(30106, gemsForPhase(3), retEpWeights);
    expect(gems).toEqual([32193, 32193]);
    expect(getGem(gems[0]!)?.colour).toBe(GemColor.GemColorRed);
    expect(getGem(gems[0]!)?.stats[Stat.StatStrength]).toBe(10);
  });
});

describe("fillEmptyCandidateGems rarity cap (ticket 111)", () => {
  // Agility-only weights reproduce the ticket's measured case: unconstrained
  // P3 fill picked 32194 (epic +10 agi) for Thunderheart Gauntlets' socket;
  // the owner wears that gem nowhere. The rare pick is 24028 (+8 agi).
  const agiWeights = { [String(Stat.StatAgility)]: 1 };

  it("fills the socket a P3 swap leaves empty with rare 24028, not epic 32194", () => {
    const ctx = gemContext(gemsForPhase(3), agiWeights);
    const gems = fillEmptyCandidateGems(
      31034,
      [0],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(gems).toEqual([24028]);
  });

  it("never returns a gem whose palette quality exceeds rare", () => {
    const ctx = gemContext(gemsForPhase(3), retEpWeights);
    // Gloves (1 socket), goggles (meta+yellow), belt (2 red) — the cap holds
    // on every socket colour. All 18 meta gems are quality 3, so the meta
    // socket is NOT left empty: the fill seats Relentless (32409) through
    // the cap. That diverges from the owner's observed suggest-gems button
    // (which placed no meta) — a known model difference, recorded at ticket
    // 111 close-out, not silently asserted away here.
    for (const itemId of [31034, 32461, 30106]) {
      const gems = fillEmptyCandidateGems(
        itemId,
        [],
        ctx.fillPalette,
        ctx.weightRecord
      );
      expect(gems.every((id) => id > 0)).toBe(true);
      for (const id of gems) {
        expect(getGem(id)?.quality ?? 99).toBeLessThanOrEqual(3);
      }
    }
    const goggleSockets = socketsFor(32461);
    const metaIdx = goggleSockets.indexOf(GemColor.GemColorMeta);
    expect(metaIdx).toBeGreaterThanOrEqual(0);
    const goggleGems = fillEmptyCandidateGems(
      32461,
      [],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(goggleGems[metaIdx]).toBe(32409);
  });

  it("keeps the full palette for meta repair — only the fill palette narrows", () => {
    const full = gemsForPhase(3);
    const ctx = gemContext(full, retEpWeights);
    expect(ctx.palette).toBe(full);
    expect(ctx.fillPalette.every((g) => g.quality <= 3)).toBe(true);
    expect(ctx.fillPalette.length).toBeLessThan(full.length);
  });
});

describe("Kael temp legendaries", () => {
  it("flags encounter-only Kael weapons, not Twinblade", () => {
    expect(isKaelTempLegendary(30318)).toBe(true);
    expect(isKaelTempLegendary(29993)).toBe(false);
    expect(isKaelTempLegendary(32332)).toBe(false);
  });
});

describe("gemContext", () => {
  // `epScore` accepts weights as a dense array or a record; the gem fillers
  // only take the record. gemContext is the single place that reconciles them,
  // so the array branch needs its own case -- nothing else in the suite feeds
  // dense-array weights through a candidate swap, which let a mutation that
  // skipped the conversion entirely pass the whole suite.
  it("indexes dense-array weights by position", () => {
    const ctx = gemContext([], [0, 0, 0, 1.5]);
    expect(ctx.weightRecord).toEqual({ "0": 0, "1": 0, "2": 0, "3": 1.5 });
  });

  it("passes a record through unchanged and keeps both shapes in step", () => {
    const weights = { "21": 1, "24": 2.14 };
    const ctx = gemContext([], weights);
    expect(ctx.weightRecord).toEqual(weights);
    // The whole point of the context: the two fields are never independent
    // inputs that a caller could disagree on.
    expect(ctx.weights).toBe(weights);
  });

  it("treats a hole in the array as zero rather than undefined", () => {
    // `new Array(3)` has no element at index 1, so the `?? 0` in
    // toWeightRecord is what keeps the record numeric. Written this way rather
    // than as a sparse literal, which no-sparse-arrays rejects.
    const holed = Array.from({ length: 3 }) as unknown as number[];
    holed[0] = 1;
    holed[2] = 3;
    expect(gemContext([], holed).weightRecord).toEqual({
      "0": 1,
      "1": 0,
      "2": 3,
    });
  });
});
