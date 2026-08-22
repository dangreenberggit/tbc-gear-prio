import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  fillEmptyCandidateGems,
  gemContext,
  metaSocketUnpriced,
  missingMetaPreferenceNote,
  SPEC_PREFERRED_METAS,
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

// Ticket 116: `fillCandidateGems` — a from-scratch fill that accepted any gem
// list — was deleted. It had no production caller, and a direct caller passing
// the full list would have quietly auto-filled epic gems above the rare cap
// (ticket 111). Its behaviour pins now run through `fillEmptyCandidateGems`
// with an all-empty starting layout and the capped `fillPalette`, the one path
// production uses.
describe("fillEmptyCandidateGems filling from scratch", () => {
  it("fills each socket on a gemmed head", () => {
    const headId = 32461; // Furious Gizmatic Goggles
    const sockets = socketsFor(headId);
    expect(sockets.length).toBeGreaterThan(0);
    const ctx = gemContext(gemsForPhase(2), epWeights);
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(gems).toHaveLength(sockets.length);
    expect(gems.every((id) => id > 0)).toBe(true);
  });

  it("returns empty for socketless items", () => {
    const ctx = gemContext(gemsForPhase(2), epWeights);
    expect(
      fillEmptyCandidateGems(28757, [], ctx.fillPalette, ctx.weightRecord)
    ).toEqual([]);
  });

  it("puts Relentless in an empty meta socket, not the higher-EP Swift Skyfire", () => {
    // Stat EP ranks Swift Skyfire 9.84 over Relentless 9.00, because
    // Relentless's +3% crit damage is a multiplier and additive EP cannot see
    // it. All three upstream wowsims ret gear presets use Relentless. Both
    // metas are quality 3, so the rare cap removes neither — the preference
    // still has something to choose between.
    const headId = 32461; // Furious Gizmatic Goggles
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    expect(metaIdx).toBeGreaterThanOrEqual(0);

    const ctx = gemContext(gemsForPhase(3), retEpWeights);
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(gems[metaIdx]).toBe(32409);
    expect(getGem(gems[metaIdx]!)?.colour).toBe(GemColor.GemColorMeta);
  });

  it("prefers strength reds over hit orange on Belt of One-Hundred Deaths under ret EP", () => {
    // Uncapped hit EP ranks a hit orange above a strength red on this set —
    // which is why gemFillWeights zeroes hit. Before the rare cap the picks
    // were two epic Bold Crimson Spinels (32193, measured against live
    // wowsimcli at ticket 111); under the cap the same preference lands on
    // rare Bold Living Ruby (24027, +8 Strength).
    const ctx = gemContext(gemsForPhase(3), retEpWeights);
    const gems = fillEmptyCandidateGems(
      30106,
      [],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(gems).toEqual([24027, 24027]);
    expect(getGem(gems[0]!)?.colour).toBe(GemColor.GemColorRed);
    expect(getGem(gems[0]!)?.stats[Stat.StatStrength]).toBe(8);
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

  it("keeps ctx.palette uncapped for gemPaletteIds provenance — only fillPalette narrows", () => {
    // Ticket 117: gem selection (fill and meta repair alike) now reads only
    // `fillPalette`. `ctx.palette`'s sole remaining consumer is rank.ts's
    // `gemPaletteIds`, which feeds the content hash — see ticket 130 item 4
    // for the open question on whether that hash should key off
    // `fillPalette` instead.
    const full = gemsForPhase(3);
    const ctx = gemContext(full, retEpWeights);
    expect(ctx.palette).toBe(full);
    expect(ctx.fillPalette.every((g) => g.quality <= 3)).toBe(true);
    expect(ctx.fillPalette.length).toBeLessThan(full.length);
  });
});

/**
 * Per-spec preferred meta (step6-meta-choice-spike.md option 1, extended by
 * the owner's 2026-08-22 ruling on ticket 257). Stat EP cannot rank meta
 * gems — nine of eighteen score 0.00 and the multiplicative effects invert
 * the additive ordering — so the choice cannot come from an EP pick.
 *
 * Ret's entry is read from upstream's gear presets: all three ret presets
 * socket 32409 and no other meta (`.scratch/handoffs/issue-1-upstream-gem-cleanup/meta-gem-research.md`,
 * "Local verification pass"). Feral and feral-tank have no such preset —
 * upstream's five vendored feral presets wear socketless Wolfshead Helm 8345 —
 * so those two rows rest on the owner's ruling instead: ticket 257 found that
 * leaving them absent was not a neutral "disclose and skip", it under-priced
 * every meta-socket head candidate for a player who already wears no meta
 * (i.e. every Wolfshead wearer, the upstream-normal case), because the
 * baseline in that case is missing nothing while the candidate was priced
 * with an empty socket. Relentless Earthstorm Diamond 32409 is not invented
 * for feral — it is the same id ret's row already carries, and it is the meta
 * wowsims' own vendored ret presets socket.
 */
describe("SPEC_PREFERRED_METAS", () => {
  it("records the same Relentless entry for ret, feral and feral-tank", () => {
    expect(SPEC_PREFERRED_METAS.ret).toEqual([32409]);
    expect(SPEC_PREFERRED_METAS.feral).toEqual([32409]);
    expect(SPEC_PREFERRED_METAS["feral-tank"]).toEqual([32409]);
  });

  it("seats ret's preferred meta when the spec is known", () => {
    const headId = 32461; // Furious Gizmatic Goggles: meta + blue
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    const ctx = gemContext(gemsForPhase(3), retEpWeights, "ret");
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord,
      { spec: ctx.spec! }
    );
    expect(gems[metaIdx]).toBe(32409);
  });

  it("seats the same preferred meta for feral (ticket 257)", () => {
    const headId = 32461;
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    const ctx = gemContext(gemsForPhase(3), retEpWeights, "feral");
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord,
      { spec: ctx.spec! }
    );
    expect(gems[metaIdx]).toBe(32409);
  });

  /**
   * The fail-loud path. Every `DetectedSpecId` (`ret | feral | feral-tank`)
   * now has a recorded preference, so this branch cannot be reached through
   * any spec the pipeline can actually detect today — the cast below is
   * synthetic, standing in for the spec ticket 142 / review row 5-D4 warned
   * about: the next one added to `DetectedSpecId` without a row here. A spec
   * with no recorded preference must not inherit another spec's gem — that is
   * the silent-wrong outcome the spike rejected — and must not pick a meta by
   * EP either, since EP cannot rank metas at all. It leaves the socket empty
   * and says so, which a caller can disclose.
   */
  it("leaves the meta socket empty for a spec with no recorded preference", () => {
    const headId = 32461;
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    const unlistedSpec = "unlisted-future-spec" as unknown as Parameters<
      typeof gemContext
    >[2];
    const ctx = gemContext(gemsForPhase(3), retEpWeights, unlistedSpec);
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord,
      { spec: ctx.spec! }
    );
    expect(gems[metaIdx] ?? 0).toBe(0);
    // The coloured socket is still filled — only the meta choice is withheld.
    const blueIdx = sockets.indexOf(GemColor.GemColorBlue);
    expect(gems[blueIdx]).toBeGreaterThan(0);
  });

  it("flags a meta-socketed candidate as unpriced only for a spec with no recorded preference", () => {
    // 29098 Stag-Helm of Malorne: [yellow, meta]. 8345 Wolfshead Helm: no
    // sockets. The flag is what lets a report row say "this number was
    // measured with the meta socket empty" instead of leaving the run-level
    // footnote to explain twelve rows it never points at. Feral now has a
    // recorded preference (ticket 257), so the fail-loud row-flag branch is
    // exercised with a synthetic unlisted spec — see the block comment above.
    const unlistedSpec = "unlisted-future-spec" as unknown as Parameters<
      typeof metaSocketUnpriced
    >[2];
    expect(metaSocketUnpriced(29098, [24028, 0], unlistedSpec)).toBe(true);
    expect(metaSocketUnpriced(29098, [24028, 32409], "ret")).toBe(false);
    expect(metaSocketUnpriced(29098, [24028, 32409], "feral")).toBe(false);
    expect(metaSocketUnpriced(8345, [], unlistedSpec)).toBe(false);
    expect(metaSocketUnpriced(29098, [24028, 0], undefined)).toBe(false);
  });

  it("does not flag a row whose meta socket the fill actually left filled", () => {
    // Ticket 139: the flag is a claim about what was *priced*, so it must read
    // the gems the candidate ended up with. `migrateGemsToItem` carries a worn
    // meta onto the candidate before fill runs, so a player who already wears
    // one leaves the socket full even with no recorded preference — deciding
    // from socket colours alone printed "empty" over a seated gem. Exercised
    // with the same synthetic unlisted spec as above, since feral itself no
    // longer takes this branch.
    const unlistedSpec = "unlisted-future-spec" as unknown as Parameters<
      typeof metaSocketUnpriced
    >[2];
    expect(metaSocketUnpriced(29098, [24028, 34220], unlistedSpec)).toBe(false);
  });

  it("names the spec in its no-preference disclosure", () => {
    // Ticket 257 gave feral a recorded preference, so it no longer carries
    // this disclosure — asserted here alongside ret's long-standing negative.
    // The positive case uses the same synthetic unlisted spec as the branch
    // tests above.
    const unlistedSpec = "unlisted-future-spec" as unknown as Parameters<
      typeof missingMetaPreferenceNote
    >[0];
    expect(missingMetaPreferenceNote(unlistedSpec)).toContain(
      "unlisted-future-spec"
    );
    expect(missingMetaPreferenceNote(unlistedSpec)).toContain(
      "no meta preference recorded"
    );
    expect(missingMetaPreferenceNote("ret")).toBeUndefined();
    expect(missingMetaPreferenceNote("feral")).toBeUndefined();
    expect(missingMetaPreferenceNote("feral-tank")).toBeUndefined();
  });

  /**
   * Ret's behaviour must be byte-identical to before the table existed: the
   * existing tests above call `gemContext` with no spec at all, and those must
   * keep seating 32409 rather than falling into the fail-loud path.
   */
  it("keeps the specless default on ret's entry, so existing callers do not change", () => {
    const headId = 32461;
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    const ctx = gemContext(gemsForPhase(3), retEpWeights);
    const gems = fillEmptyCandidateGems(
      headId,
      [],
      ctx.fillPalette,
      ctx.weightRecord
    );
    expect(gems[metaIdx]).toBe(32409);
  });
});

describe("fillEmptyCandidateGems socket bonus with an unfilled meta socket", () => {
  // Gladiator's Plate Helm (24545): sockets [meta, yellow], +4 to stat
  // index 0 when both match. A palette with no meta gem always leaves the
  // meta socket empty — the bonus must still be scored once the yellow
  // socket matches, because only coloured sockets gate it. If the fix
  // regresses (meta socket required to match), the two candidate layouts
  // below tie at 0 EP and `matchColors=true` is no longer strictly better,
  // so the fill would be free to return the wrong (unmatched) layout.
  it("prefers a colour-matched yellow gem worth less raw EP over an unmatched one worth more, because the bonus is still live", () => {
    const headId = 24545;
    // 23113 (yellow, +6 to stat 3) is colour-matched; 24054 (purple, +4 to
    // stat 0 and +6 to stat 2) is not. Weighted to tie at 10 raw EP either
    // way — only the socket bonus (stat 0, weighted higher) can break it.
    const palette = [
      ...gemsForPhase(2).filter((g) => g.id === 23113 || g.id === 24054),
    ];
    expect(palette).toHaveLength(2);

    const weights = { "0": 10, "2": 1, "3": 10 / 6 };
    const gems = fillEmptyCandidateGems(headId, [], palette, weights);
    const sockets = socketsFor(headId);
    const metaIdx = sockets.indexOf(GemColor.GemColorMeta);
    const yellowIdx = sockets.indexOf(GemColor.GemColorYellow);

    // No meta gem in this palette, so the meta socket is left empty.
    expect(gems[metaIdx]).toBe(0);
    // Yet the yellow socket still takes the colour-matched gem, because the
    // fill can see the socket bonus is live even with the meta socket bare.
    expect(gems[yellowIdx]).toBe(23113);
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
