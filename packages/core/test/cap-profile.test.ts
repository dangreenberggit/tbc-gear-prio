import { describe, expect, it } from "vitest";
import {
  PHYSICAL_HIT_CAP_PERCENT,
  PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
  SPELL_HIT_CAP_PERCENT,
  SPELL_HIT_RATING_PER_HIT_PERCENT,
  capProfileFor,
} from "../src/cap-profile.js";
import { HIT_CAP_RATING, capStateFrom, hitCapRatingFor } from "../src/caps.js";
import { gemFillWeights } from "../src/candidate-gems.js";
import { Stat } from "../src/stats.js";

describe("cap profile constants", () => {
  it("keeps the two hit conversions distinct", () => {
    // A caster cap built on the physical constant is wrong by ~3 rating per
    // percent, i.e. ~50 rating at a 16% cap — large enough to move a banner
    // from "capped" to "short" and never large enough to look like a bug.
    expect(PHYSICAL_HIT_RATING_PER_HIT_PERCENT).toBeCloseTo(15.769233, 6);
    expect(SPELL_HIT_RATING_PER_HIT_PERCENT).toBeCloseTo(12.615385, 6);
  });

  it("caps physical at 9% and spell at 16%", () => {
    // sim/core/target.go:393 models 17% base spell miss vs level 73, floored to
    // 1% residual at sim/core/spell_result.go:246-258 — so 16 is reachable and
    // the 17th percent buys nothing.
    expect(PHYSICAL_HIT_CAP_PERCENT).toBe(9);
    expect(SPELL_HIT_CAP_PERCENT).toBe(16);
  });
});

describe("capProfileFor", () => {
  it("gives an unspecified spec the melee profile, unchanged from before the table", () => {
    // Every call site predating the table passed no spec and read ret's melee
    // cap. Changing that default would silently move numbers on call sites
    // nobody touched.
    expect(capProfileFor(undefined)).toEqual(capProfileFor("ret"));
    expect(hitCapRatingFor(capProfileFor(undefined))).toBeCloseTo(
      HIT_CAP_RATING,
      6
    );
  });

  it("degrades to the default for a spec string that arrived through a cast", () => {
    // The Record is total, so this is unreachable from typed code — but gem
    // fill takes a DetectedSpecId at a module boundary and must not throw on a
    // value it does not recognise. `candidate-gems.test.ts` casts an unlisted
    // spec in exactly this way to prove the meta socket is left empty; before
    // this coalesce that test died on `undefined.hitStat`.
    const unlisted = "unlisted-future-spec" as unknown as Parameters<
      typeof capProfileFor
    >[0];
    expect(capProfileFor(unlisted)).toEqual(capProfileFor("ret"));
  });

  it("derives the cap in rating from the profile's own two numbers", () => {
    const ret = capProfileFor("ret");
    expect(hitCapRatingFor(ret)).toBeCloseTo(9 * 15.769233, 6);
    expect(Math.round(hitCapRatingFor(ret))).toBe(142);
  });
});

describe("capStateFrom reads the profile rather than hardcoding melee", () => {
  it("sums the profile's hit stat, so a melee spec reads melee hit off gear", () => {
    // Crystalforge Breastplate carries 23 melee hit and no spell hit.
    const caps = capStateFrom([{ id: 30129, gems: [] }], [], { spec: "ret" });
    expect(caps.hit.rating).toBe(23);
  });

  it("tracks expertise only where the profile says the spec has that cap", () => {
    expect(capProfileFor("ret").trackExpertise).toBe(true);
    expect(capProfileFor("feral").trackExpertise).toBe(true);
    const caps = capStateFrom([{ id: 30129, gems: [] }], [], { spec: "feral" });
    // Still null-capped: whether expertise is *tracked* is a different question
    // from whether an honest cap value exists for it (see CapEntry).
    expect(caps.expertise.capRating).toBeNull();
  });
});

describe("gemFillWeights zeroes exactly the spec's capped stats", () => {
  const base = {
    [String(Stat.StatMeleeHitRating)]: 1.2,
    [String(Stat.StatSpellHitRating)]: 1.4,
    [String(Stat.StatExpertiseRating)]: 1.1,
    [String(Stat.StatAttackPower)]: 0.5,
  };

  it("zeroes melee hit and expertise for a physical spec", () => {
    const out = gemFillWeights(base, "ret");
    expect(out[String(Stat.StatMeleeHitRating)]).toBe(0);
    expect(out[String(Stat.StatExpertiseRating)]).toBe(0);
    // Untouched: nothing about ret makes spell hit a softcap.
    expect(out[String(Stat.StatSpellHitRating)]).toBe(1.4);
    expect(out[String(Stat.StatAttackPower)]).toBe(0.5);
  });

  it("keeps the no-spec default identical to the pre-table behaviour", () => {
    const out = gemFillWeights(base);
    expect(out[String(Stat.StatMeleeHitRating)]).toBe(0);
    expect(out[String(Stat.StatExpertiseRating)]).toBe(0);
  });

  it("treats feral-tank as unrankable and falls back to the melee default", () => {
    // feral-tank is detectable but has no cap profile; it must not throw.
    const out = gemFillWeights(base, "feral-tank");
    expect(out[String(Stat.StatMeleeHitRating)]).toBe(0);
  });
});
