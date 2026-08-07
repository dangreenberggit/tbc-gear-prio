import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  type ItemSource,
  type PoolEntry,
  type UniverseEntry,
} from "../src/pool.js";

/** `raid` and `token` are the only `ItemSource` variants that carry a zone. */
function hasZone(
  source: ItemSource
): source is Extract<ItemSource, { kind: "raid" | "token" }> {
  return source.kind === "raid" || source.kind === "token";
}

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
  boss: string;
  tokenName: string;
};

const hasWowsimsVendor = existsSync(wowsimsDbPath);

/**
 * Read from disk rather than hand-listed so a newly assembled universe is
 * covered by the data gates below without anyone remembering to add it.
 */
const UNIVERSE_FILES: readonly string[] = readdirSync(
  join(root, "data/universes")
)
  .filter((f) => f.endsWith(".json") && !f.endsWith(".report.json"))
  .sort()
  .map((f) => `data/universes/${f}`);

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

describe("curated BiS tags name their source (carry-forward 47)", () => {
  const specSets: Record<string, string[]> = {
    ret: ["ret_preraid.gear.json", "ret_p1.gear.json", "ret_p2.gear.json"],
    feral: [
      "feral_preraid.gear.json",
      "feral_p2_6p.gear.json",
      "feral_p2_9p.gear.json",
    ],
  };

  function curatedIdsFor(spec: string): Set<number> {
    const ids = new Set<number>();
    for (const file of specSets[spec]!) {
      const gear = JSON.parse(
        readFileSync(join(root, "vendor/wowsims", file), "utf8")
      ) as { items?: Array<{ id?: number }> };
      for (const item of gear.items ?? []) {
        if (item?.id != null) ids.add(item.id);
      }
    }
    return ids;
  }

  for (const [spec, file] of [
    ["ret", "data/universes/ret-p3.json"],
    ["feral", "data/universes/feral-p3.json"],
  ] as const) {
    it(`${spec}: every BiS row is equipped by that spec's own curated sets`, () => {
      // The cross-spec case the ticket asks to pin: a ring curated for feral
      // must not arrive tagged on a ret rank by way of the other spec's sets.
      const curated = curatedIdsFor(spec);
      const tagged = loadUniverse(file).raw.entries.filter((e) =>
        (e.bisTags ?? []).includes("BiS")
      );
      expect(tagged.length).toBeGreaterThan(0);
      for (const entry of tagged) {
        expect(curated.has(entry.itemId)).toBe(true);
      }
    });

    it(`${spec}: every BiS row names the stage it is BiS for`, () => {
      // A `BiS` tag with no stage behind it is the absolute claim upstream
      // never makes, so the two fields travel together.
      for (const entry of loadUniverse(file).raw.entries) {
        if (!(entry.bisTags ?? []).includes("BiS")) {
          expect(entry.bisSets).toBeUndefined();
          continue;
        }
        expect(entry.bisSets?.length ?? 0).toBeGreaterThan(0);
        expect(entry.curatedSets?.length ?? 0).toBeGreaterThan(0);
      }
    });
  }

  it("does not badge earlier-stage gear as BiS on a later-phase list", () => {
    // The defect in the round: the union of preraid/p1/p2 flattened three
    // stage verdicts into one, so a phase-5 ret list badged Justicar (T4) and
    // pre-raid pieces `BiS`. They stay in the pool and keep `curatedSets` —
    // only the claim is withdrawn.
    const p5 = loadUniverse("data/universes/ret-p5.json").raw.entries;
    const justicarCrown = p5.find((e) => e.name === "Justicar Crown");
    expect(justicarCrown?.curatedSets).toEqual(["p1"]);
    expect(justicarCrown?.bisTags).toBeUndefined();

    for (const entry of p5) {
      if ((entry.bisTags ?? []).includes("BiS")) {
        expect(entry.bisSets).toEqual(["p2"]);
      }
    }
  });

  it("keeps the ret and feral verdicts on the shared ring distinguishable", () => {
    // Shapeshifter's Signet is the item that opened the ticket. Upstream
    // really does equip it in all three ret sets — it was never a cross-spec
    // leak — so it keeps the tag, but now says which stage vouches for it.
    // Feral curates it pre-raid only, so at p3 it carries no BiS claim there.
    const ret = loadUniverse("data/universes/ret-p3.json").raw.entries.find(
      (e) => e.itemId === 30834
    );
    const feral = loadUniverse("data/universes/feral-p3.json").raw.entries.find(
      (e) => e.itemId === 30834
    );
    expect(ret?.curatedSets).toEqual(["p1", "p2", "preraid"]);
    expect(ret?.bisSets).toEqual(["p2"]);
    expect(feral?.curatedSets).toEqual(["preraid"]);
    expect(feral?.bisTags).toBeUndefined();
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
    // 356 -> 359: the wowsims curated gear sets now grant membership rather
    // than only labelling rows admitted by another route (ticket 41).
    // +28176 Sha'tari Wrought Greaves, +29177 A'dal's Command, +30257
    // Shattrath Leggings — all carrying `{kind: "unknown"}`, which has no zone
    // and so never appears in a raid-filtered view. Haramad's Bargain and
    // Shapeshifter's Signet were already here via the rep path above.
    // 359 -> 361: `{kind: "world"}` (ticket 45 §1) now counts as list-driven
    // membership, admitting +23203 Libram of Fervor and +31275 Necklace of
    // Trophies via their "World Drop" Wowhead text.
    // 361 -> 364: `curated_list_only` (ticket 41 remainder) admits a curated
    // item whose real db source is list-only shaped (crafted, no zone) but
    // was not independently a member — +23522 Ragesteel Breastplate, +28429
    // Lionheart Champion, +33173 Ragesteel Shoulders. 28430 Lionheart
    // Executioner is not a new row here: its p3 Wowhead text reads
    // "Profession: ..." (parses today), only its p1-p2 text reads
    // "Crafting: ..." (does not), so it was already a p3 member and only
    // needed this fix at p2.
    expect(universeP3.length).toBe(364);
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

    // Every curated member is still *admitted* — ticket 12's widening is about
    // membership and is unchanged, which `curatedSets` records. The `BiS`
    // claim itself is now stage-scoped (carry-forward 47): at p3 the current
    // curated stage is p2, so a member curated only for pre-raid or p1 keeps
    // its provenance and drops the badge.
    for (const id of WOWSIMS_ADMITTED_IN_P3) {
      const entry = raw.entries.find((e) => e.itemId === id);
      expect(
        entry?.curatedSets?.length ?? 0,
        `${id} should be recorded as curated`
      ).toBeGreaterThan(0);
      const expected = entry?.curatedSets?.includes("p2") ? ["BiS"] : undefined;
      expect(entry?.bisTags, `${id} BiS tag should follow its stage`).toEqual(
        expected
      );
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
      expect(hasZone(entry.source), `${id} ${name} source kind`).toBe(true);
      if (!hasZone(entry.source)) continue;
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
      const worldBoss = entry.sources
        .filter(hasZone)
        .filter((s) => s.zone === "World Bosses");
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
      if (entry.source.kind !== "token") continue;
      expect(entry.source.zone, `${id} ${entry.name}`).toBe(map!.zone);
      // Boss and token name too, not just zone. The raid *and* boss filters
      // are shipped ViewOptions controls, so a regeneration that scrambled
      // bosses within the right zone would silently answer the boss filter
      // wrongly — and zone-only attribution would not notice.
      expect(entry.source.boss, `${id} ${entry.name} boss`).toBe(map!.boss);
      expect(entry.source.token, `${id} ${entry.name} token`).toBe(
        map!.tokenName
      );
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

describe("an item's source does not depend on which tier is assembled", () => {
  // The universes are cumulative: a p3 build reads the p1-p2 Wowhead list as
  // well as the p3 one. When the two guides phrase the same item differently
  // and only the later phrasing parsed, the item shipped with a real `raid`
  // source at p3 and a zoneless `{kind:"unknown"}` at p2 — so `matchesZone`
  // dropped it from its own raid's view at the earlier tier, silently and with
  // no error. 30017 Telonicus's Pendant of Mayhem is a Kael'thas drop written
  // "Quest: … (Tempest Keep: The Eye)" on the feral p1-p2 page and "Drop: …"
  // on the p3 page; 30834 and 29119 are rep rewards written three different
  // ways across the ret guides.
  //
  // This asserts the property rather than those rows: any item in both tiers
  // must carry the same sources in both.
  for (const [lo, hi] of [
    ["data/universes/feral-p2.json", "data/universes/feral-p3.json"],
    ["data/universes/ret-p2.json", "data/universes/ret-p3.json"],
    ["data/universes/ret-p3.json", "data/universes/ret-p4.json"],
    ["data/universes/ret-p4.json", "data/universes/ret-p5.json"],
  ] as const) {
    it(`${lo} and ${hi} agree on every shared item`, () => {
      const a = loadUniverse(lo).raw.entries;
      const b = new Map(
        loadUniverse(hi).raw.entries.map((e) => [e.itemId, e] as const)
      );
      for (const e of a) {
        const other = b.get(e.itemId);
        if (!other) continue;
        // A later tier may *add* a source (a p3 boss drop for an item already
        // buyable at p2); what it must never do is disagree about the ones the
        // earlier tier already recorded.
        for (const s of e.sources) {
          expect(
            other.sources,
            `${e.itemId} ${e.name}: ${lo} has ${JSON.stringify(s)}, ${hi} has ${JSON.stringify(other.sources)}`
          ).toContainEqual(s);
        }
      }
    });
  }

  it("reserves kind:unknown for items no input mentions at all", () => {
    // `unknown` is an honest "origin not recorded", so it must never sit on an
    // item some input could actually place. If a Wowhead list names the item,
    // the parser is expected to have read it.
    const listed = new Set<number>();
    for (const rel of [
      "data/wowhead-lists/feral/p1-p2.json",
      "data/wowhead-lists/feral/p3.json",
    ]) {
      const doc = JSON.parse(readFileSync(join(root, rel), "utf8")) as {
        entries: { itemId: number }[];
      };
      for (const row of doc.entries) listed.add(row.itemId);
    }
    for (const e of loadUniverse("data/universes/feral-p3.json").raw.entries) {
      if (!e.sources.some((s) => s.kind === "unknown")) continue;
      expect(
        listed.has(e.itemId),
        `${e.itemId} ${e.name} is on a Wowhead list but shipped as kind:unknown — the parser dropped its prose`
      ).toBe(false);
    }
  });
});

describe("tier piece sources agree with the curated two-hop map", () => {
  // The ticket-37 guard reads `entry.source`, which `poolFromUniverse` fills
  // from `sources[0]`. The curated token row sorts first for every tier piece,
  // so that guard inspects the good row and never sees the rest of the array —
  // which is where tickets 48, 49 and 50 all lived. This walks *every* row.
  //
  // Verified by mutation, not just by passing: planting a junk boss/zone on a
  // non-first raid row of 30990 across ret-p3/p4/p5 (uniformly, so the
  // cross-tier consistency test above cannot fire) passed all 386 tests before
  // this existed, and fails here now.
  const specs = [
    { spec: "ret", map: "data/two-hop/ret-tokens.json" },
    { spec: "feral", map: "data/two-hop/feral-tokens.json" },
  ] as const;

  for (const { spec, map } of specs) {
    const twoHopEntries = (
      JSON.parse(readFileSync(join(root, map), "utf8")) as {
        entries: TwoHopEntry[];
      }
    ).entries;
    const byPiece = new Map(twoHopEntries.map((e) => [e.pieceId, e] as const));

    const universes = UNIVERSE_FILES.filter((f) =>
      f.startsWith(`data/universes/${spec}-p`)
    );

    for (const rel of universes) {
      it(`${rel}: every raid row of a tier piece names the map's zone and boss`, () => {
        for (const e of loadUniverse(rel).raw.entries) {
          const mapped = byPiece.get(e.itemId);
          if (!mapped) continue;
          for (const s of e.sources) {
            if (s.kind !== "raid") continue;
            expect(
              { zone: s.zone, boss: s.boss },
              `${e.itemId} ${e.name} raid row disagrees with ${map}`
            ).toEqual({ zone: mapped.zone, boss: mapped.boss });
          }
        }
      });
    }
  }
});

describe("a transcribed row agrees with its own raw text", () => {
  // The Wowhead lists carry both the raw prose (`wowheadSourceText`) and the
  // agent's structured reading of it (`viaTokenName`, `viaBoss`, `viaZone`).
  // `assemble_universe.py` reads only the prose, so the structured fields are
  // an unused second recording of the same claim — a free internal cross-check
  // that nothing was performing. It is also why nothing noticed when the
  // carry-forward 49/50/51 corrections updated the prose and left them stale.
  //
  // Disagreement means one of the two readings is wrong. It does not say which,
  // and that is the point: a prompt to go look, not an auto-fix.
  const listFiles = [
    "data/wowhead-lists/ret/p1-p2.json",
    "data/wowhead-lists/ret/p3.json",
    "data/wowhead-lists/ret/p4.json",
    "data/wowhead-lists/ret/p5.json",
    "data/wowhead-lists/ret/pre-raid.json",
    "data/wowhead-lists/feral/p1-p2.json",
    "data/wowhead-lists/feral/p3.json",
  ];

  type ListRow = {
    itemId: number;
    itemName: string;
    wowheadSourceText: string | null;
    viaTokenName?: string | null;
    viaBoss?: string | null;
    viaZone?: string | null;
  };

  for (const rel of listFiles) {
    it(`${rel}`, () => {
      const doc = JSON.parse(readFileSync(join(root, rel), "utf8")) as {
        entries: ListRow[];
      };
      for (const row of doc.entries) {
        const prose = row.wowheadSourceText ?? "";
        for (const field of ["viaTokenName", "viaBoss", "viaZone"] as const) {
          const value = row[field];
          if (!value) continue;
          expect(
            prose,
            `${row.itemId} ${row.itemName}: ${field} is ${JSON.stringify(value)} but the raw text it was read from does not contain it`
          ).toContain(value);
        }
      }
    });
  }
});

// A "rankLabel is copied, not paraphrased" gate stood here, capping one-off
// rank labels per file. Its premise was false: the P4 Rank column really does
// carry a long tail of author-written labels ("Optional - Human", "Undead Only
// & Demons", "Best - No Expertise", and the author's own "Optional - tier" /
// "Optional - Tier" inconsistency). Counting those as paraphrase inverted the
// gate — a faithful re-scrape restores the 40 labels we currently drop as null,
// which adds singletons and would fail it. Deleted with carry-forward 55.

describe("zone and boss claims have an independent witness", () => {
  // Every defect in carry-forward 48-53 arrived on the `wowhead` path (an
  // agent transcribing a rendered page) and every one was caught by
  // disagreeing with a machine-parsed or curated input. A transcription defect
  // is *well-formed* data — a real boss, a real zone, the wrong pairing — so
  // no schema or type check can see it. A second witness is the only detector.
  //
  // This pins the set of claims that have no second witness. It is not a bug
  // list: these are probably right. It exists so the set cannot grow silently,
  // because each addition is a claim nothing can ever contradict.
  const UNVERIFIED = new Set(["wowhead", "curated"]);

  /** Measured on the ticket 48-54 tip; see carry-forward 54 for the analysis. */
  const KNOWN_UNCORROBORATED: ReadonlyArray<[number, string]> = [
    // Wowhead is the only input naming a zone for this item, in all six universes.
    [30017, "Telonicus's Pendant of Mayhem"],
    // Druid T6 shoulders. The other Thunderheart pieces gained two-hop rows
    // once each token's Wowhead redemption list was read; this one's fetch was
    // rate-limited, so it stays here rather than being added on the pattern.
    [31048, "Thunderheart Pauldrons"],
  ];
  const allowed = new Set(KNOWN_UNCORROBORATED.map(([id]) => id));

  function unwitnessed(entry: UniverseEntry): boolean {
    for (const s of entry.sources) {
      const claimsPlace =
        ("boss" in s && s.boss) || (s.kind === "raid" && "zone" in s);
      if (!claimsPlace) continue;
      if (!UNVERIFIED.has(s.origin ?? "")) continue;
      const corroborated = entry.sources.some(
        (other) =>
          !UNVERIFIED.has(other.origin ?? "") &&
          "zone" in other &&
          "zone" in s &&
          other.zone === s.zone
      );
      if (!corroborated) return true;
    }
    return false;
  }

  for (const rel of UNIVERSE_FILES) {
    it(`${rel}`, () => {
      const offenders = new Set<string>();
      for (const e of loadUniverse(rel).raw.entries) {
        if (allowed.has(e.itemId)) continue;
        if (unwitnessed(e)) offenders.add(`${e.itemId} ${e.name}`);
      }
      expect(
        [...offenders].sort(),
        "a zone/boss claim rests on transcription alone. Either find a second witness (AtlasLoot, a two-hop map) or add it to KNOWN_UNCORROBORATED with a reason"
      ).toEqual([]);
    });
  }

  it("every known-uncorroborated item is still uncorroborated", () => {
    // The allowlist must shrink as coverage improves, not linger as a
    // permanent exemption that hides a regression behind a stale entry.
    const stillUnwitnessed = new Set<number>();
    for (const rel of UNIVERSE_FILES) {
      for (const e of loadUniverse(rel).raw.entries) {
        if (allowed.has(e.itemId) && unwitnessed(e))
          stillUnwitnessed.add(e.itemId);
      }
    }
    for (const [id, name] of KNOWN_UNCORROBORATED) {
      expect(
        stillUnwitnessed.has(id),
        `${id} ${name} now has an independent witness — remove it from KNOWN_UNCORROBORATED`
      ).toBe(true);
    }
  });
});

describe("a boss name is an encounter, not one unit of one", () => {
  // A TBC encounter can be several killable units — the Illidari Council is
  // four, M'uru becomes Entropius — and Wowhead sometimes credits a drop to
  // the unit where AtlasLoot always credits the encounter. Unfolded, one real
  // drop reaches the universe under two names and the shipped `boss` filter
  // offers a boss that is not an encounter.
  //
  // `scripts/check_boss_aliases.py` owns the alias table and checks it against
  // AtlasLoot's vocabulary. This states the user-visible half of the same
  // invariant: within one zone, an item names at most one boss.
  //
  // Karazhan's Opera slot is the deliberate exception — Romulo and Julianne /
  // The Big Bad Wolf / The Wizard of Oz are three distinct encounters that
  // AtlasLoot lists separately, and an item can drop from more than one.
  const OPERA = new Set([
    "Romulo and Julianne",
    "The Big Bad Wolf",
    "The Wizard of Oz",
  ]);

  for (const rel of UNIVERSE_FILES) {
    it(`${rel}`, () => {
      for (const e of loadUniverse(rel).raw.entries) {
        const byZone = new Map<string, Set<string>>();
        for (const s of e.sources) {
          if (!("zone" in s) || !("boss" in s) || typeof s.boss !== "string") {
            continue;
          }
          if (OPERA.has(s.boss)) continue;
          const bosses = byZone.get(s.zone) ?? new Set<string>();
          bosses.add(s.boss);
          byZone.set(s.zone, bosses);
        }
        for (const [zone, bosses] of byZone) {
          expect(
            [...bosses].sort(),
            `${e.itemId} ${e.name} names ${bosses.size} bosses in ${zone} — a sub-unit name is probably shadowing its encounter`
          ).toHaveLength(1);
        }
      }
    });
  }
});

describe("no boss field carries a spliced item name", () => {
  // Wowhead writes tier drops as `Drop: <Token> - <Boss> (<Zone>)`, and the
  // parser used to put that whole phrase into `boss`. `boss` is a shipped
  // ViewOptions filter control, so a token name there is a filter entry that
  // is not a boss.
  //
  // `" - "` is the discriminator because it is measurably absent from every
  // real boss name in this repo: of 74 distinct boss strings, the only hits
  // were the 10 defective rows. `Fathom-Lord Karathress` is why the check is
  // the spaced separator and not a bare hyphen.
  for (const rel of UNIVERSE_FILES) {
    it(`${rel}`, () => {
      for (const e of loadUniverse(rel).raw.entries) {
        for (const s of e.sources) {
          if (!("boss" in s) || typeof s.boss !== "string") continue;
          expect(
            s.boss,
            `${e.itemId} ${e.name} boss contains a token/item name`
          ).not.toContain(" - ");
        }
      }
    });
  }
});
