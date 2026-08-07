import { describe, expect, it } from "vitest";
import {
  HIT_CAP_RATING,
  HIT_CAP_UNCERTAINTY,
  PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
  capStateFrom,
  hitRegression,
  isHitDriven,
} from "../src/caps.js";
import { getGem } from "../src/gems.js";
import { getItem } from "../src/items.js";
import { Stat } from "../src/stats.js";

describe("cap constants", () => {
  it("uses the physical hit conversion, not the spell one", () => {
    // ui/core/constants/mechanics.ts @ wowsims/tbc-new
    // 8aa378b3671a0923fd11fb34b4b3753e53f20c9b. The spell constant is
    // 12.615385 and a ret hit cap built on it is silently wrong.
    expect(PHYSICAL_HIT_RATING_PER_HIT_PERCENT).toBeCloseTo(15.769233, 6);
    expect(PHYSICAL_HIT_RATING_PER_HIT_PERCENT).not.toBeCloseTo(12.615385, 3);
  });

  it("puts the 9% yellow-hit cap at ~142 rating", () => {
    expect(HIT_CAP_RATING).toBeCloseTo(9 * 15.769233, 4);
    expect(Math.round(HIT_CAP_RATING)).toBe(142);
  });

  it("carries the Heroic Presence band as ~1% of hit", () => {
    expect(Math.round(HIT_CAP_UNCERTAINTY)).toBe(16);
  });

  it("keeps the dense stat width agreeing with the generated index", () => {
    // The generator derives this width from common.proto's NextIndex and
    // refuses to run if the enum grew. If the TS side ever disagrees,
    // statDeltaBetween silently stops looking at the top stats instead of
    // failing, so pin the two together against a real generated array.
    const chest = getItem(30129)!;
    const widest = Math.max(
      ...Object.values(Stat).filter((v): v is Stat => typeof v === "number")
    );
    expect(chest.stats).toHaveLength(widest + 1);
    expect(getGem(24051)!.stats).toHaveLength(widest + 1);
  });
});

describe("capStateFrom", () => {
  it("sums melee hit and expertise rating across equipped items", () => {
    // Crystalforge Breastplate carries 23 melee hit (index 20) in the pinned
    // db; anchoring on a real item keeps this honest if the index regenerates.
    const chest = getItem(30129)!;
    expect(chest.stats[Stat.StatMeleeHitRating]).toBe(23);

    const caps = capStateFrom([{ id: 30129, gems: [] }], []);
    expect(caps.hit.rating).toBe(23);
    expect(caps.hit.capRating).toBeCloseTo(HIT_CAP_RATING, 4);
    expect(caps.hit.gap).toBeCloseTo(HIT_CAP_RATING - 23, 4);
    expect(caps.hit.capUncertainty).toBeCloseTo(HIT_CAP_UNCERTAINTY, 4);
  });

  it("counts socketed gems toward the totals", () => {
    // 24051 is a +8 melee hit gem. Without the gem term a gemmed-to-cap
    // player reads as under cap, so this must be 23 + 8 and not 23.
    expect(getGem(24051)!.stats[Stat.StatMeleeHitRating]).toBe(8);

    const withGems = capStateFrom(
      [{ id: 30129, gems: [24051, 24051] }],
      [{ itemId: 30129, gems: [24051, 24051] }]
    );
    expect(withGems.hit.rating).toBe(23 + 16);
  });

  it("prefers the repaired gem layout over the equipment's own gems", () => {
    // Meta repair rewrites gems after equipment is built, and the repaired
    // layout is what the sim ran — the cap must describe that same layout.
    const repaired = capStateFrom(
      [{ id: 30129, gems: [24051, 24051] }],
      [{ itemId: 30129, gems: [] }]
    );
    expect(repaired.hit.rating).toBe(23);
  });

  it("reports the full cap as the gap when nothing is equipped", () => {
    const caps = capStateFrom([], []);
    expect(caps.hit.rating).toBe(0);
    expect(caps.hit.gap).toBeCloseTo(HIT_CAP_RATING, 6);
  });

  it("reports a negative gap once gear carries past the cap", () => {
    // The over-cap branch was previously uncovered at the computation level:
    // the old test with this name passed empty gear and asserted a *positive*
    // gap, so nothing exercised gap < 0 outside a hand-built banner object.
    // 32338 is a +8 hit gem; 20 of them clear the ~142 cap on their own.
    const overCapped = capStateFrom(
      [{ id: 30129, gems: Array.from({ length: 20 }, () => 24051) }],
      []
    );
    expect(overCapped.hit.rating).toBeGreaterThan(HIT_CAP_RATING);
    expect(overCapped.hit.gap).toBeLessThan(0);
  });

  it("names the race the cap assumed, since WCL cannot report it", () => {
    const caps = capStateFrom([], [], { assumedRace: "RaceBloodElf" });
    expect(caps.hit.assumedRace).toBe("RaceBloodElf");
  });

  it("declines to claim an expertise cap rather than reporting zero", () => {
    // `gap: 0` is exactly what an at-cap entry looks like, so a consumer doing
    // `gap <= 0 ? "capped" : "under"` would call a player with no expertise
    // capped. Null forces that consumer to handle "unknown" explicitly.
    const caps = capStateFrom([{ id: 30129, gems: [] }], []);
    expect(caps.expertise.capRating).toBeNull();
    expect(caps.expertise.gap).toBeNull();
    expect(caps.expertise.rating).toBeGreaterThanOrEqual(0);
  });

  it("keeps two identical rings apart instead of collapsing them by id", () => {
    // Regression: sumStat keyed gems by item id while applyRepairedGems reads
    // socketed[i] positionally. Two Bands of Accuria (20 hit each) with one +8
    // gem is ground truth 48, but the id-keyed version returned 40 or 56
    // depending only on which array slot carried the gem.
    const ring = 17063;
    expect(getItem(ring)!.stats[Stat.StatMeleeHitRating]).toBe(20);

    const equipment = [
      { id: ring, gems: [24051] },
      { id: ring, gems: [] },
    ];
    const gemFirst = capStateFrom(equipment, [
      { itemId: ring, gems: [24051] },
      { itemId: ring, gems: [] },
    ]);
    const gemLast = capStateFrom(equipment, [
      { itemId: ring, gems: [] },
      { itemId: ring, gems: [24051] },
    ]);

    expect(gemFirst.hit.rating).toBe(48);
    expect(gemLast.hit.rating).toBe(48);
    expect(gemFirst.hit.rating).toBe(gemLast.hit.rating);
  });

  it("skips empty slots without throwing", () => {
    const caps = capStateFrom([{ gems: [] }, { id: 30129, gems: [] }], []);
    expect(caps.hit.rating).toBe(23);
  });
});

describe("isHitDriven", () => {
  it("flags a gain that is mostly hit while under the cap", () => {
    const under = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(isHitDriven(under, { gap: 40 }, { deltaDps: 12 })).toBe(true);
  });

  it("does not flag once the player is at or over the cap", () => {
    const under = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(isHitDriven(under, { gap: 0 }, { deltaDps: 12 })).toBe(false);
  });

  it("does not flag an item that is a DPS loss", () => {
    // Observed on a real run: two below-cutoff items with negative deltas were
    // labelled "most of this gain is hit rating". A loss has no gain to be
    // driven by, and the warning the flag exists to give — this stops being an
    // upgrade past the cap — is meaningless for something that is not one.
    const under = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(isHitDriven(under, { gap: 40 }, { deltaDps: -3.56 })).toBe(false);
    expect(isHitDriven(under, { gap: 40 }, { deltaDps: 0 })).toBe(false);
    expect(isHitDriven(under, { gap: 40 }, { deltaDps: 12 })).toBe(true);
  });

  it("ignores armour and stamina when weighing the share", () => {
    // Crystalforge Breastplate's real delta. Armour is 1668 of 1828, so
    // counting survival stats puts hit at 1.3% and the flag can never fire on
    // an armoured slot — which is why the only integration fixture that ever
    // exercised it was a zero-armour trinket.
    const chestLike = {
      [Stat.StatStrength]: 56,
      [Stat.StatStamina]: 40,
      [Stat.StatIntellect]: 20,
      [Stat.StatMeleeHitRating]: 23,
      [Stat.StatMeleeCritRating]: 21,
      [Stat.StatArmor]: 1668,
    };
    // 23 hit against 56+20+23+21 damage stats is still a minority — correct.
    expect(isHitDriven(chestLike, { gap: 40 }, { deltaDps: 12 })).toBe(false);

    // But a mostly-hit armoured piece must now be reachable at all.
    const hitPlate = {
      [Stat.StatMeleeHitRating]: 30,
      [Stat.StatStrength]: 5,
      [Stat.StatStamina]: 40,
      [Stat.StatArmor]: 1668,
    };
    expect(isHitDriven(hitPlate, { gap: 40 }, { deltaDps: 12 })).toBe(true);
  });

  it("does not flag a gain that is mostly not hit", () => {
    const mixed = {
      ...zero(),
      [Stat.StatMeleeHitRating]: 2,
      [Stat.StatAttackPower]: 60,
    };
    expect(isHitDriven(mixed, { gap: 40 }, { deltaDps: 12 })).toBe(false);
  });
});

describe("hitRegression", () => {
  it("reports the loss when a recommendation drops hit while under the cap", () => {
    // slamaltman's real case (carry-forward 47): the run banners a ~70 rating
    // gap, then recommends Razor-Scale Battlecloak, which carries no hit, over
    // a worn cloak carrying 17. `isHitDriven` cannot describe this — it only
    // counts positive hit deltas — so the page flagged the gap and then widened
    // it silently.
    const dropsHit = { ...zero(), [Stat.StatMeleeHitRating]: -17 };
    expect(hitRegression(dropsHit, { gap: 70 }, { deltaDps: 12 })).toEqual({
      lost: 17,
      gapAfter: 87,
    });
  });

  it("stays silent once the player is at or over the cap", () => {
    // Past the cap, dropping hit costs nothing the player needs, so the note
    // would be noise rather than a warning.
    const dropsHit = { ...zero(), [Stat.StatMeleeHitRating]: -17 };
    expect(hitRegression(dropsHit, { gap: 0 }, { deltaDps: 12 })).toBeNull();
  });

  it("stays silent when the item does not reduce hit", () => {
    const gainsHit = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(hitRegression(gainsHit, { gap: 70 }, { deltaDps: 12 })).toBeNull();
    expect(hitRegression(zero(), { gap: 70 }, { deltaDps: 12 })).toBeNull();
  });

  it("stays silent for an item that is not an upgrade", () => {
    // Mirrors the isHitDriven rule above: the warning is about a trade the
    // player is being advised to make, and a loss is not being advised.
    const dropsHit = { ...zero(), [Stat.StatMeleeHitRating]: -17 };
    expect(hitRegression(dropsHit, { gap: 70 }, { deltaDps: -3.5 })).toBeNull();
  });
});

function zero(): Record<number, number> {
  return {};
}
