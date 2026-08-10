import { describe, expect, it } from "vitest";

import {
  enchantAppliesToItem,
  getEnchant,
  getEnchants,
} from "../src/enchants.js";
import { getItem, isEnchantable, type ItemEntry } from "../src/items.js";
import { RangedWeaponType } from "../src/proto/common_pb.js";
import enchantIndex from "../../../data/enchants/index.json" with { type: "json" };
import rawItemIndex from "../../../data/items/index.json" with { type: "json" };

const itemIndex = rawItemIndex as Record<string, ItemEntry>;

/** The TBC relics — the ranged-slot items that are not shootable or wands. */
const RELIC_RANGED_TYPES = new Set([
  RangedWeaponType.RangedWeaponTypeIdol,
  RangedWeaponType.RangedWeaponTypeLibram,
  RangedWeaponType.RangedWeaponTypeTotem,
]);

/**
 * Real ids from the committed indexes, chosen so each branch of the UI rule
 * has a case. Named here rather than inline so a failure says what broke.
 */
const SAVAGERY_2H = 2667; // "Enchant 2H Weapon - Savagery", enchantType 1
const MAJOR_AGILITY_2H = 2670; // also enchantType 1
const CRUSADER = 1900; // "Enchant Weapon - Crusader", enchantType 0
const CLOAK_GREATER_AGILITY = 368; // type 4 (back)
const ADAMANTITE_SCOPE = 2722; // type 14 (ranged), for bows/guns/crossbows

const LIONHEART_EXECUTIONER = 28430; // 2H sword
const CATACLYSMS_EDGE = 30902; // 2H sword
const SYPHON_OF_THE_NATHREZIM = 32262; // 1H mace
const LIBRAM_OF_HOPE = 22401; // ranged slot, rangedWeaponType 7
const MASTERS_CLOAK = 10249; // back

/** effectId 2564 is BOTH "Gloves - Superior Agility" and "Weapon - Agility". */
const AGILITY_COLLIDING = 2564;
/** effectId 2617 is both "Bracer - Superior Healing" and "Gloves - Healing Power". */
const HEALING_COLLIDING = 2617;
const DEATHMANTLE_HANDGUARDS = 30145; // gloves, worn in the fixture
const BRACERS_OF_JUSTICE = 28512; // wrist, worn in the fixture

/** type 1 (head) with extraTypes [3, 5, 7, 9, 10] — a standard ret kit. */
const HEAVY_KNOTHIDE_KIT = 2841;
const HIGH_COUNCILLORS_GLOVES = 10140; // hands (type 7), an extraType
const HIGH_COUNCILLORS_PANTS = 10141; // legs (type 9), an extraType
const HIGH_COUNCILLORS_MANTLE = 10142; // shoulder (type 3), an extraType
const MIGHTY_ARMSPLINTS = 10147; // wrist (type 6), NOT in extraTypes

describe("enchantAppliesToItem", () => {
  it("keeps a 2H enchant on a two-hander", () => {
    expect(enchantAppliesToItem(SAVAGERY_2H, LIONHEART_EXECUTIONER)).toBe(true);
    expect(enchantAppliesToItem(MAJOR_AGILITY_2H, CATACLYSMS_EDGE)).toBe(true);
  });

  // The defect this ticket exists for: both are weapon-slot and enchantable,
  // so the old slot-level gate carried Savagery straight onto a one-hander.
  it("does not move a 2H enchant onto a one-hander", () => {
    expect(enchantAppliesToItem(SAVAGERY_2H, SYPHON_OF_THE_NATHREZIM)).toBe(
      false
    );
  });

  it("is not what isEnchantable would have answered", () => {
    expect(isEnchantable(SYPHON_OF_THE_NATHREZIM)).toBe(true);
    expect(enchantAppliesToItem(SAVAGERY_2H, SYPHON_OF_THE_NATHREZIM)).toBe(
      false
    );
  });

  it("keeps a normal weapon enchant on either hand type", () => {
    expect(enchantAppliesToItem(CRUSADER, LIONHEART_EXECUTIONER)).toBe(true);
    expect(enchantAppliesToItem(CRUSADER, SYPHON_OF_THE_NATHREZIM)).toBe(true);
  });

  it("does not cross slots", () => {
    expect(enchantAppliesToItem(CLOAK_GREATER_AGILITY, MASTERS_CLOAK)).toBe(
      true
    );
    expect(
      enchantAppliesToItem(CLOAK_GREATER_AGILITY, LIONHEART_EXECUTIONER)
    ).toBe(false);
    expect(enchantAppliesToItem(CRUSADER, MASTERS_CLOAK)).toBe(false);
  });

  // A libram sits in the ranged slot but is not shootable, so a scope must
  // not land on it — the branch that keeps ret's ranged slot bare.
  it("does not put a scope on a libram", () => {
    expect(enchantAppliesToItem(ADAMANTITE_SCOPE, LIBRAM_OF_HOPE)).toBe(false);
  });

  // `enchantable` is slot-level, and the ranged slot mixes shootables with
  // relics, so every idol/libram/totem claims `enchantable: true` while no
  // relic takes an enchant in TBC. This pins the gap rather than the wish:
  // the flag stays true (it is a true statement about the *slot*) and
  // `enchantAppliesToItem` is what has to say no (carry-forward 81).
  it("says no for every relic, though `enchantable` says yes", () => {
    const relicIds = Object.entries(itemIndex)
      .filter(([, e]) => RELIC_RANGED_TYPES.has(e.rangedWeaponType ?? -1))
      .map(([id]) => Number(id));
    expect(relicIds).toHaveLength(104);

    const effectIds = Object.keys(enchantIndex).map(Number);
    for (const itemId of relicIds) {
      expect(isEnchantable(itemId)).toBe(true);
      for (const effectId of effectIds) {
        expect(enchantAppliesToItem(effectId, itemId)).toBe(false);
      }
    }
  });

  // The relic case above passes under either the right or the off-by-one
  // RangedWeaponType constants, because relics sit outside both shootable
  // sets — so it could not have caught carry-forward 83. Pinning each item's
  // type against real index data is what keeps this from passing by
  // construction: a coherently shifted enum still fails the first assertion.
  it("puts a scope on shootables and nothing else, by rangedWeaponType", () => {
    const cases: Array<[number, string, number, boolean]> = [
      [RangedWeaponType.RangedWeaponTypeBow, "Polished Shortbow", 2505, true],
      [RangedWeaponType.RangedWeaponTypeCrossbow, "Stoneshatter", 18388, true],
      [
        RangedWeaponType.RangedWeaponTypeGun,
        "Willey's Portable Howitzer",
        13380,
        true,
      ],
      [
        RangedWeaponType.RangedWeaponTypeThrown,
        "Standard Thrown Weapon",
        25871,
        false,
      ],
      [RangedWeaponType.RangedWeaponTypeWand, "Banshee Finger", 13534, false],
      [
        RangedWeaponType.RangedWeaponTypeIdol,
        "Idol of Rejuvenation",
        22398,
        false,
      ],
      [RangedWeaponType.RangedWeaponTypeLibram, "Libram of Hope", 22401, false],
      [
        RangedWeaponType.RangedWeaponTypeTotem,
        "Communal Totem of Lightning",
        186071,
        false,
      ],
    ];

    for (const [rangedWeaponType, name, itemId, applies] of cases) {
      expect({ name, type: getItem(itemId)?.rangedWeaponType }).toEqual({
        name,
        type: rangedWeaponType,
      });
      expect({
        name,
        applies: enchantAppliesToItem(ADAMANTITE_SCOPE, itemId),
      }).toEqual({ name, applies });
    }
  });

  it("returns false for ids absent from either index", () => {
    expect(enchantAppliesToItem(999999, LIONHEART_EXECUTIONER)).toBe(false);
    expect(enchantAppliesToItem(SAVAGERY_2H, 999999)).toBe(false);
  });

  // effectId is not unique. Keying the index one-to-one kept whichever record
  // came last, so a worn glove enchant resolved to the *weapon* record, failed
  // the slot test, and was silently dropped on every glove swap — worse than
  // the isEnchantable gate this replaced. Three such ids are worn in
  // test/fixtures/slamaltman.raw.json.
  describe("colliding effectIds resolve by the item's slot", () => {
    it("keeps a glove enchant on gloves when the id also names a weapon enchant", () => {
      expect(
        enchantAppliesToItem(AGILITY_COLLIDING, DEATHMANTLE_HANDGUARDS)
      ).toBe(true);
    });

    it("keeps the same id on a weapon too", () => {
      expect(
        enchantAppliesToItem(AGILITY_COLLIDING, LIONHEART_EXECUTIONER)
      ).toBe(true);
    });

    it("still rejects a slot neither record covers", () => {
      expect(enchantAppliesToItem(AGILITY_COLLIDING, MASTERS_CLOAK)).toBe(
        false
      );
    });

    it("resolves a bracer/glove collision on both of its slots", () => {
      expect(enchantAppliesToItem(HEALING_COLLIDING, BRACERS_OF_JUSTICE)).toBe(
        true
      );
      expect(
        enchantAppliesToItem(HEALING_COLLIDING, DEATHMANTLE_HANDGUARDS)
      ).toBe(true);
    });

    it("keeps every colliding record rather than the last one written", () => {
      expect(getEnchants(AGILITY_COLLIDING)).toHaveLength(2);
      expect(
        getEnchants(AGILITY_COLLIDING)
          .map((e) => e.type)
          .sort((a, b) => (a ?? 0) - (b ?? 0))
      ).toEqual([7, 13]);
    });
  });

  // Upstream's getEligibleEnchantSlots unions `type` with `extraTypes`, so an
  // armor kit applies well beyond the one slot `type` names. Testing `type`
  // alone stripped Heavy Knothide off every slot but head.
  describe("extraTypes widen an enchant beyond its `type` slot", () => {
    it("applies an armor kit to its extraTypes slots", () => {
      expect(
        enchantAppliesToItem(HEAVY_KNOTHIDE_KIT, HIGH_COUNCILLORS_GLOVES)
      ).toBe(true);
      expect(
        enchantAppliesToItem(HEAVY_KNOTHIDE_KIT, HIGH_COUNCILLORS_PANTS)
      ).toBe(true);
      expect(
        enchantAppliesToItem(HEAVY_KNOTHIDE_KIT, HIGH_COUNCILLORS_MANTLE)
      ).toBe(true);
    });

    it("still rejects a slot outside type and extraTypes", () => {
      // wrist (6) is in neither, so the union must not be a blanket pass.
      expect(enchantAppliesToItem(HEAVY_KNOTHIDE_KIT, MIGHTY_ARMSPLINTS)).toBe(
        false
      );
    });

    it("carries extraTypes through the generated index", () => {
      expect(getEnchant(HEAVY_KNOTHIDE_KIT)?.extraTypes).toEqual([
        3, 5, 7, 9, 10,
      ]);
    });
  });
});

describe("data/enchants/index.json", () => {
  it("carries the enchantType the rule depends on", () => {
    expect(getEnchant(SAVAGERY_2H)).toMatchObject({
      enchantType: 1,
      type: 13,
    });
    // Absent upstream on 127 of 137 records; normalized to 0, not undefined,
    // so the comparisons above never read a missing field.
    expect(getEnchant(CRUSADER)?.enchantType).toBe(0);
  });

  it("carries the item-side fields the rule depends on", () => {
    expect(getItem(LIONHEART_EXECUTIONER)).toMatchObject({
      itemType: 13,
      handType: 4,
    });
    expect(getItem(SYPHON_OF_THE_NATHREZIM)?.handType).toBe(2);
    expect(getItem(LIBRAM_OF_HOPE)).toMatchObject({
      itemType: 14,
      rangedWeaponType: 7,
    });
  });
});
