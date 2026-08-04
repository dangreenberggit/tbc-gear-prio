import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KAEL_TEMP_LEGENDARY_IDS } from "../src/kael-temp.js";
import {
  ArmorType,
  RangedWeaponType,
  WeaponType,
} from "../src/proto/common_pb.js";
import {
  filterByZone,
  filterPoolByPhase,
  filterPoolByZone,
  ITEM_SOURCE_KINDS,
  poolFromUniverse,
  type PoolEntry,
  type UniverseEntry,
} from "../src/pool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const wowsimsDbPath = join(root, "vendor/wowsims/db.json");
const twoHopPath = join(root, "data/two-hop/ret-tokens.json");

type WowsimsDbItem = {
  id: number;
  name?: string;
  setId?: number;
  armorType?: number;
  rangedWeaponType?: number;
  weaponType?: number;
  phase?: number;
  quality?: number;
  weaponSpeed?: number;
  scalingOptions?: Record<
    string,
    { weaponDamageMin?: number; weaponDamageMax?: number }
  >;
};

type WowsimsDb = { items?: WowsimsDbItem[] };

type TwoHopEntry = {
  pieceId: number;
  pieceName: string;
  zone: string;
  tokenName: string;
};

const hasWowsimsVendor = existsSync(wowsimsDbPath);

function loadWowsimsDbById(): Map<number, WowsimsDbItem> {
  if (!hasWowsimsVendor) return new Map();
  const db = JSON.parse(readFileSync(wowsimsDbPath, "utf8")) as WowsimsDb;
  return new Map((db.items ?? []).map((it) => [it.id, it]));
}

function loadUniverse(relativePath: string): {
  raw: { entries: UniverseEntry[] };
  pool: PoolEntry[];
} {
  const raw = JSON.parse(readFileSync(join(root, relativePath), "utf8")) as {
    entries: UniverseEntry[];
  };
  return { raw, pool: poolFromUniverse(raw) };
}

function wowsimsCuratedItemIds(): Set<number> {
  const ids = new Set<number>();
  for (const file of [
    "ret_preraid.gear.json",
    "ret_p1.gear.json",
    "ret_p2.gear.json",
  ]) {
    const gear = JSON.parse(
      readFileSync(join(root, "vendor/wowsims", file), "utf8")
    ) as { items?: Array<{ id?: number }> };
    for (const item of gear.items ?? []) {
      if (item?.id != null) ids.add(item.id);
    }
  }
  return ids;
}

/** Measured present in ret-p3 at sub-phase 6 base (24/36 wowsims curated IDs). */
const WOWSIMS_ADMITTED_IN_P3 = [
  23537, 24259, 28430, 28608, 28745, 28757, 28779, 28795, 28830, 29071, 29073,
  29075, 29383, 29947, 30022, 30055, 30061, 30098, 30104, 30106, 30129, 30644,
  32087, 32461,
] as const;

/** Still excluded at p3 — no resolvable source and/or below rare (see hardening handoff). */
const WOWSIMS_NOT_YET_ADMITTED = [
  23522, 27484, 27985, 28176, 28288, 28429, 29119, 29177, 30257, 30341, 30834,
  33173,
] as const;

/**
 * Must stay OUT, each for a different enforced rule. The count assertion
 * below only detects *change*: swapping ten real items for ten junk ones
 * keeps it at 354 and passes (ticket 24, folded in from 22). These name the
 * rules, so a regression says which one broke.
 *
 * Destroyer is the Warrior T5 set — phase 2, epic, plate, in body slots ret
 * uses. Nothing but `classAllowlist` keeps it out, which is what made it the
 * regression in ticket 25.
 */
const MUST_BE_ABSENT_FROM_P3 = [
  {
    id: 30115,
    name: "Destroyer Greathelm",
    why: "classAllowlist is [1] (warrior)",
  },
  {
    id: 30118,
    name: "Destroyer Breastplate",
    why: "classAllowlist is [1] (warrior)",
  },
  {
    id: 30121,
    name: "Destroyer Greaves",
    why: "classAllowlist is [1] (warrior)",
  },
  {
    id: 30318,
    name: "Netherstrand Longbow",
    why: "Kael temp legendary (also classAllowlist [3])",
  },
  {
    id: 34431,
    name: "Lightbringer Bands",
    why: "phase 5 ret tier, above maxPhase 3",
  },
] as const;

const RET_TIER_SET_IDS = new Set([626, 629, 680]);
const SUNWELL_TIER_PIECE_IDS = new Set([34431, 34485, 34561]);

describe("S6: bisTags do not affect pool membership", () => {
  const { pool: universeP3 } = loadUniverse("data/universes/ret-p3.json");
  const maxPhase = 3;
  const zoneWithEntries = "Karazhan";

  it("filterPoolByPhase ignores bisTags on universe pool", () => {
    const tagged = universeP3.map((e) => ({
      ...e,
      bisTags: ["BiS" as const],
    }));
    const stripped = universeP3.map((e) => {
      const copy = { ...e };
      delete copy.bisTags;
      return copy;
    });
    const before = filterPoolByPhase(universeP3, maxPhase)
      .map((e) => e.itemId)
      .sort((a, b) => a - b);
    const afterTagged = filterPoolByPhase(tagged, maxPhase)
      .map((e) => e.itemId)
      .sort((a, b) => a - b);
    const afterStripped = filterPoolByPhase(stripped, maxPhase)
      .map((e) => e.itemId)
      .sort((a, b) => a - b);
    expect(afterTagged).toEqual(before);
    expect(afterStripped).toEqual(before);
  });

  it("filterPoolByZone and filterByZone ignore bisTags on universe pool", () => {
    const tagged = universeP3.map((e) => ({
      ...e,
      bisTags: ["Alt" as const],
    }));
    const stripped = universeP3.map((e) => {
      const copy = { ...e };
      delete copy.bisTags;
      return copy;
    });
    const before = filterPoolByZone(universeP3, zoneWithEntries)
      .map((e) => e.itemId)
      .sort((a, b) => a - b);
    expect(
      filterPoolByZone(tagged, zoneWithEntries)
        .map((e) => e.itemId)
        .sort((a, b) => a - b)
    ).toEqual(before);
    expect(
      filterPoolByZone(stripped, zoneWithEntries)
        .map((e) => e.itemId)
        .sort((a, b) => a - b)
    ).toEqual(before);
    expect(
      filterByZone(
        tagged.map((e) => ({ ...e, deltaDps: 1 })),
        zoneWithEntries
      )
        .map((e) => e.itemId)
        .sort((a, b) => a - b)
    ).toEqual(before);
  });
});

describe("data/universes/ret-p3.json hardening", () => {
  const { raw, pool: universeP3 } = loadUniverse("data/universes/ret-p3.json");
  const poolIds = new Set(universeP3.map((e) => e.itemId));
  const byId = loadWowsimsDbById();
  const twoHop = JSON.parse(readFileSync(twoHopPath, "utf8")) as {
    entries: TwoHopEntry[];
  };
  const tierByPiece = new Map(
    twoHop.entries.map((e) => [e.pieceId, e] as const)
  );

  it("ships no empty sources on any row", () => {
    // Regenerate with `python scripts/assemble_universe.py --max-phase 3` to
    // re-derive this count.
    // 347 -> 349: the D7 weapon rule stopped rejecting polearms alongside
    // staves (paladins can wield polearms) — +28774 Glaive of the Pit,
    // +32248 Halberd of Desolation.
    // 349 -> 362: AtlasLoot's WorldBossesBC block now resolves, admitting the
    // 13 Doomwalker / Doom Lord Kazzak drops that db.json has no sources for.
    // 362 -> 354: classAllowlist is enforced, evicting 8 class-specific SSC/TK
    // trinkets a paladin cannot equip (ticket 25).
    // 354 -> 356: the Wowhead source parser learned "Requires <standing> with
    // <faction>", which it previously dropped on the floor — +29119 Haramad's
    // Bargain, +30834 Shapeshifter's Signet, both rep rewards on the p3 list
    // admitted through the existing list-only path (ticket 28).
    expect(universeP3.length).toBe(356);
    // Non-emptiness is not enough: poolEntryFromUniverse takes sources[0] and
    // callers switch on `kind`, so a row whose source cannot be discriminated
    // is as unusable as one with no source. assemble_universe.py fails the
    // build on both (PLAN.md §8.3.2); this pins the shipped artifact.
    const knownKinds = new Set<string>(ITEM_SOURCE_KINDS);
    for (const e of raw.entries) {
      expect(e.sources.length, `${e.itemId} ${e.name}`).toBeGreaterThan(0);
      for (const [i, s] of e.sources.entries()) {
        expect(
          knownKinds.has(s.kind),
          `${e.itemId} ${e.name} sources[${i}] kind ${String(s.kind)}`
        ).toBe(true);
      }
    }
    for (const e of universeP3) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
  });

  // Ticket 13: a crafted item whose *recipe* drops in a raid belongs on that
  // raid's shopping list. The join is name-based (AtlasLoot records the
  // product only in a trailing Lua comment), so it is fragile in one specific
  // direction — a silent miss, never a wrong zone. These pins catch the miss.
  it("attributes raid-dropped recipes to the raid that drops them", () => {
    const expected = new Map([
      [32568, "Black Temple"], // Plans: Swiftsteel Bracers
      [32574, "Black Temple"], // Pattern: Bindings of Lightning Reflexes
      [32581, "Black Temple"], // Pattern: Swiftstrike Shoulders
      [30032, "Serpentshrine Cavern"], // Plans: Red Belt of Battle (also TK)
      [30040, "Serpentshrine Cavern"], // Pattern: Belt of Deep Shadow (also TK)
      [30046, "Serpentshrine Cavern"], // Pattern: Belt of the Black Eagle (also TK)
    ]);
    for (const [itemId, zone] of expected) {
      const entry = raw.entries.find((e) => e.itemId === itemId);
      expect(entry, `${itemId} missing from p3 universe`).toBeTruthy();
      const zones = (entry?.sources ?? [])
        .filter((s) => s.kind === "crafted")
        .map((s) => (s as { recipeZone?: string }).recipeZone)
        .filter(Boolean);
      expect(
        zones,
        `${itemId} ${entry?.name} should carry recipeZone ${zone}`
      ).toContain(zone);
    }
    // The recipe zone must agree with the phase the item already sits at,
    // otherwise the join found the wrong recipe.
    const zonePhase = new Map([
      ["Serpentshrine Cavern", 2],
      ["Tempest Keep", 2],
      ["Black Temple", 3],
    ]);
    for (const e of raw.entries) {
      for (const s of e.sources) {
        if (s.kind !== "crafted") continue;
        const rz = (s as { recipeZone?: string }).recipeZone;
        if (!rz) continue;
        expect(
          zonePhase.get(rz),
          `${e.itemId} ${e.name} recipeZone ${rz} phase vs item phase`
        ).toBe(e.phase);
      }
    }
  });

  it("admits measured wowsims curated IDs in the p3 universe", () => {
    for (const id of WOWSIMS_ADMITTED_IN_P3) {
      expect(poolIds.has(id), `missing admitted wowsims id ${id}`).toBe(true);
    }
  });

  // Pairs the count above with membership. The count alone cannot tell a
  // clean universe from one that swapped real items for junk.
  it("keeps out items each enforced rule should exclude", () => {
    for (const { id, name, why } of MUST_BE_ABSENT_FROM_P3) {
      expect(poolIds.has(id), `${id} ${name} should be excluded: ${why}`).toBe(
        false
      );
    }
  });

  it.skipIf(!hasWowsimsVendor)(
    "excludes those for the stated reason, not by accident",
    () => {
      // A test that an item is absent passes just as well when the item was
      // never a candidate. Assert the property that does the excluding.
      for (const { id, name } of MUST_BE_ABSENT_FROM_P3) {
        const item = byId.get(id);
        expect(item, `${id} ${name} missing from wowsims db`).toBeTruthy();
        expect(
          (item?.quality ?? 0) >= 3,
          `${id} ${name} is at least rare`
        ).toBe(true);
      }
    }
  );

  it.skipIf(!hasWowsimsVendor)(
    "loads wowsims curated gear sets from vendor (36 IDs)",
    () => {
      const wowsimsIds = wowsimsCuratedItemIds();
      expect(wowsimsIds.size).toBe(36);
      for (const id of WOWSIMS_ADMITTED_IN_P3) {
        expect(wowsimsIds.has(id), `fixture id ${id}`).toBe(true);
      }
    }
  );

  // Ticket 17's triage measured all 12 as phase 1, appearing on the Wowhead
  // *pre-raid* stage list — BiS before you raid, which is why a P2+ universe
  // omitting them is defensible. Deliberately not "they are dungeon/crafted
  // so they are out of scope": content type is not the test, power at the
  // tier is (see the ticket's 2026-08-02 correction).
  it.todo(
    "admits all 36 wowsims curated ret gear-set items — deferred: " +
      WOWSIMS_NOT_YET_ADMITTED.join(", ") +
      " are phase 1 pre-raid-stage items (ticket 17 triage)"
  );

  it("tags wowsims curated ret gear-set members with bisTags (ticket 12)", () => {
    // 30098 Razor-Scale Battlecloak: verified present in vendor/wowsims/ret_p2.gear.json
    // and carrying bisTags in the regenerated data/universes/ret-p3.json.
    const razorScale = raw.entries.find((e) => e.itemId === 30098);
    expect(razorScale?.bisTags).toEqual(["BiS"]);

    for (const id of WOWSIMS_ADMITTED_IN_P3) {
      const entry = raw.entries.find((e) => e.itemId === id);
      expect(entry?.bisTags, `${id} should carry a BiS tag`).toEqual(["BiS"]);
    }
  });

  it.skipIf(!hasWowsimsVendor)("ranged slot is librams only", () => {
    const ranged = universeP3.filter((e) => e.slot === "ranged");
    expect(ranged.length).toBeGreaterThan(0);
    for (const e of ranged) {
      const dbItem = byId.get(e.itemId);
      expect(dbItem?.rangedWeaponType, `${e.itemId} ${e.name}`).toBe(
        RangedWeaponType.RangedWeaponTypeLibram
      );
    }
  });

  it("excludes Kael'thas temp legendaries and keeps Twinblade", () => {
    for (const kaelId of KAEL_TEMP_LEGENDARY_IDS) {
      expect(
        poolIds.has(kaelId),
        `Kael temp ${kaelId} should not be in pool`
      ).toBe(false);
    }
    expect(poolIds.has(29993)).toBe(true);
  });

  it("includes leather and mail body-slot examples", () => {
    expect(poolIds.has(30106), "Belt of One-Hundred Deaths").toBe(true);
    expect(poolIds.has(30104), "Cobra-Lash Boots").toBe(true);
    expect(universeP3.find((e) => e.itemId === 30106)?.slot).toMatch(
      /waist|feet/
    );
    expect(universeP3.find((e) => e.itemId === 30104)?.slot).toMatch(
      /waist|feet/
    );
  });

  it.skipIf(!hasWowsimsVendor)(
    "leather/mail examples have correct armor types in wowsims db",
    () => {
      expect(byId.get(30106)?.armorType).toBe(ArmorType.ArmorTypeLeather);
      expect(byId.get(30104)?.armorType).toBe(ArmorType.ArmorTypeMail);
    }
  );

  it.todo(
    "includes Shattrath Leggings (30257, leather legs) — deferred: phase 1 " +
      "pre-raid-stage item, and db.json gives it sources: null so no " +
      "AtlasLoot/Wowhead coverage resolves it (ticket 17 triage)"
  );

  // Ticket 28. These five are named by the Wowhead p5 list — four as "P5
  // BIS"/"Absolute BIS" — at the tier ret-p5.json exists to serve, and each
  // was previously excluded for a different reason. Asserting the source kind
  // rather than mere presence is the point: presence alone would pass again if
  // an item slipped in through some unrelated path, and it is the *mechanism*
  // that was broken in each case.
  //
  // Note the ticket predicted the last four were "Shattered Sun
  // badge/craft/rep rewards". Three are actually Sunwell Plateau raid drops
  // upgraded via a Sunmote at vendor Yrma; only 34679 is a rep reward.
  const P5_ADMITTED_BY = [
    {
      id: 34472,
      name: "Shard of Contempt",
      kind: "heroic",
      why: "drops in Magisters' Terrace at db difficulty 2; before the heroic path it was labelled a raid drop from a zone phase_raids.json does not list",
    },
    {
      id: 34388,
      name: "Pauldrons of Berserking",
      kind: "token",
      why: "Sunmote upgrade of 34192, an Eredar Twins drop",
    },
    {
      id: 34392,
      name: "Demontooth Shoulderpads",
      kind: "token",
      why: "Sunmote upgrade of 34195, an Eredar Twins drop",
    },
    {
      id: 34397,
      name: "Bladed Chaos Tunic",
      kind: "token",
      why: "Sunmote upgrade of 34211, an M'uru drop",
    },
    {
      id: 34679,
      name: "Shattered Sun Pendant of Might",
      kind: "rep",
      why: "Exalted with the Shattered Sun Offensive; the Wowhead parser had no rep branch at all",
    },
  ] as const;

  it("admits the phase-5 BiS items that drop outside a raid zone", () => {
    const { pool: universeP5 } = loadUniverse("data/universes/ret-p5.json");
    const byItemId = new Map(universeP5.map((e) => [e.itemId, e] as const));

    for (const { id, name, kind, why } of P5_ADMITTED_BY) {
      const entry = byItemId.get(id);
      expect(entry, `${id} ${name} missing from ret-p5: ${why}`).toBeTruthy();
      expect(entry!.source.kind, `${id} ${name} (${why})`).toBe(kind);
    }
  });

  it("keeps the heroic path out of the tiers below Magisters' Terrace", () => {
    // The phase map admits MT at 5 only. A heroic source appearing at p3 would
    // mean the 284 phase-1 heroic items measured in ticket 28 had leaked in.
    for (const entry of universeP3) {
      expect(
        entry.source.kind,
        `${entry.itemId} ${entry.name} carries a heroic source at maxPhase 3`
      ).not.toBe("heroic");
    }
  });

  it.skipIf(!hasWowsimsVendor)(
    "does not treat spell damage as a caster-only stat",
    () => {
      // Void Star Talisman is +48 spell damage and nothing else, which makes it
      // the sharpest probe for the stat set: if SpellDamage were treated as
      // caster-only, an item carrying nothing else would be junk-rejected. The
      // ret weights in data/presets/ret/p2.ep-weights.json price stat 5 at
      // 0.17, so that would contradict this repo's own EP model.
      //
      // Deliberately NOT asserted via pool membership. The item is
      // classAllowlist [9] (Warlock) and a paladin cannot equip it, so it is
      // correctly absent from the universe — see ticket 25. Membership would
      // pin the wrong fact; the stat set is what this test is about.
      const stats = (
        byId.get(30449) as {
          scalingOptions?: Record<string, { stats?: object }>;
        }
      )?.scalingOptions?.["0"]?.stats;
      expect(Object.keys(stats ?? {})).toEqual(["5"]);
    }
  );

  it.skipIf(!hasWowsimsVendor)(
    "ships no item whose classAllowlist excludes Paladin",
    () => {
      // A non-empty classAllowlist is a hard equip restriction. These 8
      // class-specific SSC/TK trinkets sat in both universes until the rule was
      // enforced (ticket 25); they cannot be worn and would consume trinket
      // candidate budget. Named rather than counted so a regression that swaps
      // one illegal item for another still fails.
      const ClassPaladin = 2;
      for (const id of [
        30446, 30448, 30449, 30450, 30663, 30664, 30665, 30720,
      ] as const) {
        expect(poolIds.has(id), `${id} is class-restricted`).toBe(false);
      }
      for (const e of universeP3) {
        const allow = (byId.get(e.itemId) as { classAllowlist?: number[] })
          ?.classAllowlist;
        if (!allow?.length) continue;
        expect(allow, `${e.itemId} ${e.name}`).toContain(ClassPaladin);
      }
    }
  );

  it("admits world boss drops via AtlasLoot", () => {
    // db.json has no sources, npcs or outdoor zones for Doomwalker and Doom
    // Lord Kazzak, so AtlasLoot's WorldBossesBC block is the only path in.
    for (const [id, name] of [
      [30729, "Black-Iron Battlecloak"],
      [30730, "Terrorweave Tunic"],
      [30738, "Ring of Reciprocity"],
      [30739, "Scaled Greaves of the Marksman"],
      [30740, "Ripfiend Shoulderplates"],
    ] as const) {
      expect(poolIds.has(id), `${id} ${name}`).toBe(true);
      const entry = universeP3.find((e) => e.itemId === id)!;
      expect(entry.source.zone, `${id} ${name}`).toBe("World Bosses");
    }
  });

  it("attributes each world boss drop to exactly one correct boss", () => {
    // Wowhead's free text spells the zone three ways and names the wrong boss
    // on some rows; AtlasLoot's per-NPC tables own the attribution.
    for (const [id, boss] of [
      [30729, "Doomwalker"],
      [30730, "Doomwalker"],
      [30738, "Doom Lord Kazzak"],
      [30739, "Doom Lord Kazzak"],
      [30740, "Doom Lord Kazzak"],
    ] as const) {
      const entry = raw.entries.find((e) => e.itemId === id)!;
      const worldBoss = entry.sources.filter((s) => s.zone === "World Bosses");
      expect(worldBoss.length, `${id} world-boss source count`).toBe(1);
      expect(worldBoss[0]!.boss, `${id} boss`).toBe(boss);
    }
  });

  it("admits two-hand polearms but never staves", () => {
    // Paladins can wield polearms; staves they cannot. The D7 rule once
    // rejected both in one condition, which hid Glaive of the Pit (a
    // Magtheridon drop) from the universe.
    expect(poolIds.has(28774), "Glaive of the Pit (polearm)").toBe(true);
    expect(poolIds.has(32248), "Halberd of Desolation (polearm)").toBe(true);
  });

  it.skipIf(!hasWowsimsVendor)("no staff ever enters the universe", () => {
    for (const e of universeP3) {
      const dbItem = byId.get(e.itemId);
      expect(dbItem?.weaponType, `${e.itemId} ${e.name} is a staff`).not.toBe(
        WeaponType.WeaponTypeStaff
      );
    }
  });

  it("includes all tier pieces through phase 3 with token zone attribution", () => {
    // two-hop map is the committed source of truth for ret tier piece IDs;
    // wowsims setId scan is a local cross-check only (vendor is gitignored).
    const tierItemIds = twoHop.entries.map((e) => e.pieceId);
    expect(tierItemIds.length).toBe(18);

    const expectedInP3 = tierItemIds.filter(
      (id) => !SUNWELL_TIER_PIECE_IDS.has(id)
    );
    expect(expectedInP3.length).toBe(15);

    const missing = expectedInP3.filter((id) => !poolIds.has(id));
    expect(missing, `missing tier pieces: ${missing.join(", ")}`).toEqual([]);

    for (const id of expectedInP3) {
      const map = tierByPiece.get(id);
      expect(map, `two-hop map for tier piece ${id}`).toBeTruthy();
      const entry = universeP3.find((e) => e.itemId === id)!;
      expect(entry.source.kind, `${id} ${entry.name}`).toBe("token");
      expect(entry.source.zone, `${id} ${entry.name}`).toBe(map!.zone);
    }

    for (const id of SUNWELL_TIER_PIECE_IDS) {
      expect(
        poolIds.has(id),
        `Sunwell tier ${id} not expected at maxPhase 3`
      ).toBe(false);
    }
  });

  it.skipIf(!hasWowsimsVendor)(
    "wowsims db setIds match the two-hop ret tier map",
    () => {
      const fromDb = [...byId.values()]
        .filter((it) => it.setId != null && RET_TIER_SET_IDS.has(it.setId))
        .map((it) => it.id)
        .sort((a, b) => a - b);
      const fromTwoHop = twoHop.entries
        .map((e) => e.pieceId)
        .sort((a, b) => a - b);
      expect(fromDb).toEqual(fromTwoHop);
    }
  );

  // Weapon damage is the dominant ret term and is not a stat, so a
  // curationHint blind to it ranked two-handers near-arbitrarily -- Glaive of
  // the Pit scored 0.00, last of 17, on an empty stat map while swinging
  // 119.7 dps. Assert the ordering property rather than a magnitude, so
  // regenerating with different weights does not re-pin this test.
  describe("curationHint values weapon damage (issue 27)", () => {
    const weaponDps = (it: WowsimsDbItem): number => {
      const scaling = it.scalingOptions?.["0"];
      const lo = scaling?.weaponDamageMin ?? 0;
      const hi = scaling?.weaponDamageMax ?? 0;
      const speed = it.weaponSpeed ?? 0;
      return speed > 0 ? (lo + hi) / 2 / speed : 0;
    };

    const weapons = () =>
      raw.entries
        .filter((e) => e.slot === "weapon")
        .map((e) => ({
          ...e,
          dps: weaponDps(byId.get(e.itemId)!),
          hint: e.curationHint ?? 0,
        }));

    it.skipIf(!hasWowsimsVendor)("scores every weapon above zero", () => {
      for (const w of weapons()) {
        expect(w.hint, `${w.itemId} ${w.name}`).toBeGreaterThan(0);
      }
    });

    it.skipIf(!hasWowsimsVendor)(
      "does not rank a competitive weapon last on an empty stat line",
      () => {
        const ranked = weapons().sort((a, b) => a.hint - b.hint);
        const worst = ranked[0]!;
        const best = ranked[ranked.length - 1]!;
        // Glaive of the Pit is within 15% of the best weapon dps in the P3
        // field, so nothing about its swing justifies scoring last.
        expect(worst.dps).toBeGreaterThan(best.dps * 0.8);
      }
    );

    it.skipIf(!hasWowsimsVendor)(
      "orders weapons broadly by what they swing",
      () => {
        const ws = weapons();
        const byHint = [...ws].sort((a, b) => b.hint - a.hint);
        const byDps = [...ws].sort((a, b) => b.dps - a.dps);
        // Rank correlation, not identity: stats legitimately reorder
        // neighbours. Before the fix this was strongly negative.
        const rankOf = new Map(byDps.map((w, i) => [w.itemId, i]));
        const n = ws.length;
        let d2 = 0;
        byHint.forEach((w, i) => {
          const d = i - rankOf.get(w.itemId)!;
          d2 += d * d;
        });
        const spearman = 1 - (6 * d2) / (n * (n * n - 1));
        expect(spearman).toBeGreaterThan(0.5);
      }
    );
  });
});
