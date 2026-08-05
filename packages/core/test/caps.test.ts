import { describe, expect, it } from "vitest";
import {
  HIT_CAP_RATING,
  HIT_CAP_UNCERTAINTY,
  PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
  capStateFrom,
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

  it("reports a negative gap once over the cap", () => {
    const caps = capStateFrom([], []);
    expect(caps.hit.rating).toBe(0);
    expect(caps.hit.gap).toBeGreaterThan(0);
  });

  it("names the race the cap assumed, since WCL cannot report it", () => {
    const caps = capStateFrom([], [], { assumedRace: "BloodElf" });
    expect(caps.hit.assumedRace).toBe("BloodElf");
  });

  it("skips empty slots without throwing", () => {
    const caps = capStateFrom([{ gems: [] }, { id: 30129, gems: [] }], []);
    expect(caps.hit.rating).toBe(23);
  });
});

describe("isHitDriven", () => {
  it("flags a gain that is mostly hit while under the cap", () => {
    const under = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(isHitDriven(under, { gap: 40 })).toBe(true);
  });

  it("does not flag once the player is at or over the cap", () => {
    const under = { ...zero(), [Stat.StatMeleeHitRating]: 20 };
    expect(isHitDriven(under, { gap: 0 })).toBe(false);
  });

  it("does not flag a gain that is mostly not hit", () => {
    const mixed = {
      ...zero(),
      [Stat.StatMeleeHitRating]: 2,
      [Stat.StatAttackPower]: 60,
    };
    expect(isHitDriven(mixed, { gap: 40 })).toBe(false);
  });
});

function zero(): Record<number, number> {
  return {};
}
