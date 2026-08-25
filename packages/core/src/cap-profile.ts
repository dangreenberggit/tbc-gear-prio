/**
 * Per-spec cap descriptor — the table that lets one cap implementation serve
 * both hit schools.
 *
 * Before this file, `caps.ts` was physical-only: it summed
 * `StatMeleeHitRating`, compared it to a melee cap, and decoded ret's Precision
 * from a table living inside the module. A caster spec cannot be expressed that
 * way at all — it needs a different stat key, a different rating-per-percent
 * conversion, a different cap percentage, and no expertise line. Rather than
 * branch on the spec inside every function, each spec names its numbers here
 * once and the cap code reads them.
 *
 * The `Record<SpecId, CapProfile>` is deliberately **total**: a spec added to
 * `SpecId` without a cap profile is a compile error, which is the only thing
 * that stops a new spec silently inheriting ret's melee cap. The pre-existing
 * failure mode this replaces was quieter than a wrong number — it was a *right*
 * number for the wrong school.
 *
 * The cap percentages are game-rule constants, the same category as the melee
 * `HIT_CAP_PERCENT = 9` this repo already shipped. The sim hardcodes neither
 * (it derives miss chance from level difference), so they live here as
 * engine-owned facts with the reasoning attached rather than being read out of
 * the vendored sim at runtime.
 */

import { Stat } from "./stats.js";
import type { SpecId } from "./types.js";

/**
 * Talent-string position of a hit-granting talent, plus what it grants.
 *
 * `treeSegment` indexes `talentsString.split("-")`; `talentIndex` indexes the
 * characters within that segment. Both follow the UI tree order that
 * wowsims-tbc-new's talent-string encoder writes, which is the tree json's
 * order — *not* necessarily the proto declaration order. Do not add an entry
 * for a new spec without reading that spec's tree json; the two orders agree
 * for ret by inspection, and that agreement is a coincidence rather than a
 * rule.
 */
export type TalentHitDescriptor = {
  readonly treeSegment: number;
  readonly talentIndex: number;
  readonly percentPerPoint: number;
  readonly talent: string;
  readonly maxPoints: number;
};

/**
 * Everything the cap computation needs to know about one spec.
 *
 * `hitStat` is a real `Stat` for both schools — casters carry
 * `StatSpellHitRating` on gear, so the pseudo-stat vocabulary the fork uses for
 * EP *display* (`PseudoStatSchoolHitPercentShadow` and neighbours) never enters
 * here.
 */
export type CapProfile = {
  /** The rating stat the spec's gear carries for hit. */
  readonly hitStat: Stat;
  /** Percent of hit needed against a raid boss (level 73). */
  readonly hitCapPercent: number;
  /** Rating per one percent of hit, for this school. */
  readonly ratingPerPercent: number;
  /**
   * Whether expertise belongs in this spec's cap state. False for casters and
   * for hunters: nothing they do can be dodged or parried, so an expertise line
   * would be a field about a mechanic the spec does not have.
   */
  readonly trackExpertise: boolean;
  /** Absent when the spec's trees carry no hit talent at all. */
  readonly talentHit?: TalentHitDescriptor;
};

/**
 * ui/core/constants/mechanics.ts @ wowsims/tbc-new
 * 8aa378b3671a0923fd11fb34b4b3753e53f20c9b (data/wowsims.lock.json), and
 * sim/core/base_stats_auto_gen.go. Copied rather than imported: the vendor tree
 * is a build input, never a runtime dependency (PLAN.md §8.3 [S0]).
 */
export const PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233;
export const SPELL_HIT_RATING_PER_HIT_PERCENT = 12.615385;

/**
 * Yellow-attack hit cap vs a level-73 boss: 9% missing. A special (yellow)
 * attack against a target three levels above the attacker misses 9% of the
 * time before hit rating.
 */
export const PHYSICAL_HIT_CAP_PERCENT = 9;

/**
 * Spell hit cap vs a level-73 boss: 16%.
 *
 * The sim models 17% base spell miss against a +3-level target
 * (`sim/core/target.go:393`, `BaseSpellMissChance` = 0.17 for level 73+ via
 * `UnitLevelFloat64`), but clamps the result to a 1% floor —
 * `math.Max(0.01, 1-hitChance)` at `sim/core/spell_result.go:246-258`. So the
 * 17th percent buys nothing and the reachable cap is 16, which is why 16 is the
 * number quoted for TBC casters. Unlike physical, there is no `HitSuppression`
 * term on spells; the 0.01 at `target.go:401` is physical-only.
 *
 * One exception the descriptor deliberately does not model: for
 * `SpellFlagBinary` spells, hit past the cap still counteracts partial resists
 * (`spell_result.go:253-255`). That is a per-spell property, not a per-spec one,
 * and this table is per-spec.
 */
export const SPELL_HIT_CAP_PERCENT = 16;

/**
 * Per-spec cap descriptors. Total over `SpecId` by construction — see the file
 * comment on why that totality is the point.
 */
export const CAP_PROFILE_BY_SPEC: Readonly<Record<SpecId, CapProfile>> = {
  /**
   * Ret's Precision is a Protection-tree talent this build cross-specs into,
   * worth 1% hit per point. paladin.proto's Protection block is talent index
   * 21-40 (`precision = 23` is local index 2); the encoder writes trees in
   * Holy(0)/Protection(1)/Retribution(2) order, so `5-053201-…` splits to Holy
   * "5" / Protection "053201" / Retribution "0523005120033125331051". Those
   * segments sum to 5/11/45, the same split asserted for this fixture at
   * `spec.test.ts:16` and `rank.test.ts:103`, which is what confirms the
   * alignment. Precision grants flat `PhysicalHitPercent`, not rating
   * (sim/paladin/talents.go applyPrecision), so the conversion goes through the
   * physical rating-per-percent.
   */
  ret: {
    hitStat: Stat.StatMeleeHitRating,
    hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
    ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
    trackExpertise: true,
    talentHit: {
      treeSegment: 1,
      talentIndex: 2,
      percentPerPoint: 1,
      talent: "Precision",
      maxPoints: 3,
    },
  },
  /** Druid's trees carry no hit talent at all — see carry-forward ticket 05. */
  feral: {
    hitStat: Stat.StatMeleeHitRating,
    hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
    ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
    trackExpertise: true,
  },
};

/**
 * The profile a caller with no spec in hand gets.
 *
 * Ret's, deliberately: every call site that predates this table passed no spec
 * and read the melee cap, so this keeps those readings identical rather than
 * inventing a neutral profile that would change numbers nobody asked to change.
 */
export const DEFAULT_CAP_PROFILE: CapProfile = CAP_PROFILE_BY_SPEC.ret;

/**
 * The `?? DEFAULT_CAP_PROFILE` is not the `Partial`-shaped fallback this design
 * set out to delete. The Record is total, so a *typed* `SpecId` always hits a
 * row and the compiler is still the thing that forces new specs to be filled.
 * The coalesce covers the untyped path only: `DetectedSpecId` values that are
 * not rankable, and strings that reach here through a cast at a module boundary
 * — `candidate-gems.test.ts` exercises exactly that, because gem fill must
 * degrade rather than throw on a spec it does not recognise. Returning the
 * melee default there matches what that code did before this table existed.
 */
export function capProfileFor(spec: SpecId | undefined): CapProfile {
  if (spec === undefined) return DEFAULT_CAP_PROFILE;
  return CAP_PROFILE_BY_SPEC[spec] ?? DEFAULT_CAP_PROFILE;
}
