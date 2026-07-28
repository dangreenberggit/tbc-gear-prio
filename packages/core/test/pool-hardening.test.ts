import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { KAEL_TEMP_LEGENDARY_IDS } from "../src/kael-temp.js";
import { ArmorType, RangedWeaponType } from "../src/proto/common_pb.js";
import {
  filterByZone,
  filterPoolByPhase,
  filterPoolByZone,
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
  phase?: number;
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
    expect(universeP3.length).toBe(347);
    for (const e of raw.entries) {
      expect(e.sources.length, `${e.itemId} ${e.name}`).toBeGreaterThan(0);
    }
    for (const e of universeP3) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
  });

  it("admits measured wowsims curated IDs in the p3 universe", () => {
    for (const id of WOWSIMS_ADMITTED_IN_P3) {
      expect(poolIds.has(id), `missing admitted wowsims id ${id}`).toBe(true);
    }
  });

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

  it.todo(
    "admits all 36 wowsims curated ret gear-set items — blocked: " +
      WOWSIMS_NOT_YET_ADMITTED.join(", ") +
      " lack resolvable sources or fail D7/quality (06-hardening §2.1)"
  );

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
    "includes Shattrath Leggings (30257, leather legs) — blocked: no db/atlasloot/wowhead source (06-hardening §2.4)"
  );

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
});
