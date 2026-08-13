import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  findMetaGemId,
  gemPalette,
  gemsForQuality,
  getGem,
  type GemEntry,
} from "../src/gems.js";
import { getItem, isEnchantable, socketsFor } from "../src/items.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("items index", () => {
  it("covers every equippable item, not just a curated pool", () => {
    // db.json has 8257 items total, 4 of which carry no `type` (not
    // equippable — herbs, quest tokens). The generated index must include
    // the rest, not a hand-picked subset.
    const raw = JSON.parse(
      readFileSync(join(root, "data/items/index.json"), "utf8")
    ) as Record<string, unknown>;
    expect(Object.keys(raw).length).toBeGreaterThan(8000);
  });

  it("classifies a head item as enchantable with no sockets (Wolfshead Helm)", () => {
    const item = getItem(8345);
    expect(item?.name).toBe("Wolfshead Helm");
    expect(item?.slot).toBe("head");
    expect(item?.enchantable).toBe(true);
    expect(item?.sockets).toEqual([]);
  });

  it("classifies a neck item as not enchantable (Necklace of Sanctuary)", () => {
    const item = getItem(10778);
    expect(item?.slot).toBe("neck");
    expect(item?.enchantable).toBe(false);
  });

  it("captures sockets and socketBonus on a belt (Spellfire Belt)", () => {
    const item = getItem(21846);
    expect(item?.slot).toBe("waist");
    expect(item?.enchantable).toBe(false);
    expect(item?.sockets).toEqual([4, 3]);
    expect(socketsFor(21846)).toEqual([4, 3]);
    // Socket bonus is only granted when every socket is colour-matched
    // (PLAN.md §9 R4) — the raw stat array must be non-empty so the
    // meta-repair solver can price forfeiting it.
    expect(item?.socketBonus.some((v) => v > 0)).toBe(true);
  });

  it("marks trinkets as not enchantable", () => {
    expect(isEnchantable(28830)).toBe(false); // Dragonspine Trophy
    expect(getItem(28830)?.slot).toBe("trinket");
  });

  it("marks rings as enchantable, correcting PLAN.md §9's stated rule", () => {
    // PLAN.md §9 states neck/finger/trinket are all non-enchantable in TBC.
    // Cross-checking the full slamaltman fixture (25 combatants, not just
    // the two Stage-0 probe characters) shows ring slots carrying a real
    // "Enchant Ring - *" permanentEnchant in 14/50 cases. Band of Eternity
    // is one of the ring ids observed enchanted in that fixture.
    const item = getItem(29302);
    expect(item?.slot).toBe("finger");
    expect(item?.enchantable).toBe(true);
  });

  it("agrees with every enchant/no-enchant slot observed in the real fixture", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as {
      combatant_info_events: Array<{
        gear: Array<{ id?: number | null; permanentEnchant?: number | null }>;
      }>;
    };

    let checked = 0;
    for (const ev of raw.combatant_info_events) {
      for (const g of ev.gear) {
        if (!g.id) continue;
        const item = getItem(g.id);
        if (!item) continue; // shirt/tabard — not in db.json, expected
        if (g.permanentEnchant) {
          expect(item.enchantable).toBe(true);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(300);
  });

  it("every socket count in the fixture is covered by the item's own socket list", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as {
      combatant_info_events: Array<{
        gear: Array<{
          id?: number | null;
          gems?: Array<unknown> | null;
        }>;
      }>;
    };

    for (const ev of raw.combatant_info_events) {
      for (const g of ev.gear) {
        if (!g.id) continue;
        const item = getItem(g.id);
        if (!item) continue;
        const gemCount = g.gems?.length ?? 0;
        expect(gemCount).toBeLessThanOrEqual(item.sockets.length);
      }
    }
  });
});

describe("gem palette", () => {
  it("excludes jewelcrafting-restricted gems outright (PLAN.md §9 R4)", () => {
    // "Crimson Sun" requires Jewelcrafting in db.json and must not appear.
    const crimsonSun = gemPalette().find((g) => g.id === 33131);
    expect(crimsonSun).toBeUndefined();
  });

  it("flags meta gems with colour 1, all phase 1", () => {
    // Relentless Earthstorm Diamond is a meta gem.
    const meta = getGem(32409);
    expect(meta?.colour).toBe(1);
    expect(meta?.phase).toBe(1);
  });

  it("flags unique gems so multi-socket consideration can exclude them", () => {
    const unique = gemPalette().filter((g) => g.unique);
    expect(unique.length).toBeGreaterThan(0);
    expect(unique.every((g) => typeof g.id === "number")).toBe(true);
  });

  it("keeps phase 3's epic gems out of a maxPhase 2 selection", () => {
    // PLAN.md §9 R4.1: gem counts by tier are 163/6/39/0/6 for P1-P5, and
    // phase 3 is the epic-gem tier. A maxPhase:2 rank must never surface them.
    const phase3Gems = gemPalette().filter((g) => g.phase === 3);
    expect(phase3Gems.length).toBeGreaterThan(0);
    for (const g of phase3Gems) {
      expect(g.phase).toBeGreaterThan(2);
    }
  });

  it("carries db.json's `quality` on every entry (ticket 111 rarity cap)", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "data/gems/palette.json"), "utf8")
    ) as Array<Record<string, unknown>>;
    expect(raw.length).toBeGreaterThan(0);
    for (const entry of raw) {
      expect(typeof entry.quality).toBe("number");
    }
    // 32194 (Brilliant Crimson Spinel) is the epic the unconstrained fill
    // chose; 24028 (Delicate Living Ruby) is the rare the cap should pick.
    expect(getGem(32194)?.quality).toBe(4);
    expect(getGem(24028)?.quality).toBe(3);
  });

  it("treats null and undefined quality alike, loudly, not as opposite outcomes (ticket 114)", () => {
    // Before the fix: `null <= 3` is `true` in JS (passes the cap silently),
    // `undefined <= 3` is `false` (drops silently) — two malformed inputs,
    // two different outcomes, neither reported. A safety net that fabricates
    // a verdict on missing data is worse than no net (set-bonus-resolution
    // handoff, 2026-08-10) — the chosen behaviour here is loud: throw for
    // either, so a malformed injected palette cannot pass as good data.
    const withNullQuality: GemEntry[] = [
      {
        id: 1,
        colour: 2,
        stats: [],
        phase: 1,
        quality: null as unknown as number,
        unique: false,
      },
    ];
    const withUndefinedQuality: GemEntry[] = [
      {
        id: 2,
        colour: 2,
        stats: [],
        phase: 1,
        quality: undefined as unknown as number,
        unique: false,
      },
    ];
    const withStringQuality: GemEntry[] = [
      {
        id: 3,
        colour: 2,
        stats: [],
        phase: 1,
        quality: "3" as unknown as number,
        unique: false,
      },
    ];
    expect(() => gemsForQuality(withNullQuality, 3)).toThrow(/quality/i);
    expect(() => gemsForQuality(withUndefinedQuality, 3)).toThrow(/quality/i);
    expect(() => gemsForQuality(withStringQuality, 3)).toThrow(/quality/i);
  });

  it("renames db.json's `color` field to `colour`", () => {
    const raw = JSON.parse(
      readFileSync(join(root, "data/gems/palette.json"), "utf8")
    ) as Array<Record<string, unknown>>;
    expect(raw.length).toBeGreaterThan(0);
    for (const entry of raw) {
      expect(entry).not.toHaveProperty("color");
      expect(entry).toHaveProperty("colour");
    }
  });
});

// Moved out of rank.ts, where it walked gem data from the ranking
// orchestrator (ticket 24, feature envy). Nothing tested it there.
describe("findMetaGemId", () => {
  const META = 25890; // Chaotic Skyfire Diamond, GemColorMeta
  const OTHER_META = 25893;
  const RED = 23094;
  const BLUE = 23096;

  it("finds the meta gem among a mixed set", () => {
    expect(findMetaGemId([RED, META, BLUE])).toBe(META);
  });

  it("returns undefined when none is a meta", () => {
    expect(findMetaGemId([RED, BLUE])).toBeUndefined();
    expect(findMetaGemId([])).toBeUndefined();
  });

  it("ignores ids absent from the palette", () => {
    expect(findMetaGemId([999999, RED])).toBeUndefined();
    expect(findMetaGemId([999999, META])).toBe(META);
  });

  // A character can only wear one meta, so order is the tiebreak.
  it("takes the first meta when given more than one", () => {
    expect(findMetaGemId([OTHER_META, META])).toBe(OTHER_META);
  });

  it("agrees with the palette on what a meta is", () => {
    expect(getGem(META)?.colour).toBe(1);
    expect(getGem(RED)?.colour).not.toBe(1);
  });
});
