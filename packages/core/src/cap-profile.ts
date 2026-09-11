/**
 * The cap descriptor — what lets one cap implementation serve both hit schools.
 *
 * Before this file, `caps.ts` was physical-only: it summed
 * `StatMeleeHitRating`, compared it to a melee cap, and decoded ret's Precision
 * from a table living inside the module. A caster spec cannot be expressed that
 * way at all — it needs a different stat key, a different rating-per-percent
 * conversion, a different cap percentage, and no expertise line. Rather than
 * branch on the spec inside every function, each spec names its numbers once
 * and the cap code reads them.
 *
 * The numbers themselves live on each spec's registry entry (`spec-registry.ts`)
 * rather than in this module, so a spec cannot reach a ranking without one. This
 * file owns the shape and the readers. The failure mode that buys is quieter
 * than a wrong number — it is a *right* number for the wrong school.
 */

import { SPEC_REGISTRY, isSpecId } from "./spec-registry.js";
import type { Stat } from "./stats.js";
import type { SpecId } from "./types.js";

// The hit constants live with the per-spec entries that reference them, in
// `spec-registry.js`. Re-exported here because this module is where callers
// have always read them from.
export {
  PHYSICAL_HIT_CAP_PERCENT,
  PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
  SPELL_HIT_CAP_PERCENT,
  SPELL_HIT_RATING_PER_HIT_PERCENT,
} from "./spec-registry.js";

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
 * The profile a caller with no spec in hand gets.
 *
 * Ret's, deliberately: every call site that predates the per-spec table passed
 * no spec and read the melee cap, so this keeps those readings identical rather
 * than inventing a neutral profile that would change numbers nobody asked to
 * change.
 */
export const DEFAULT_CAP_PROFILE: CapProfile = SPEC_REGISTRY.ret.capProfile;

/**
 * The guard here covers the untyped boundary only, and deliberately not the
 * typed one.
 *
 * Gem fill takes a `DetectedSpecId` at a module boundary and must degrade
 * rather than throw on a spec it does not recognise — `candidate-gems.test.ts`
 * and `cap-profile.test.ts` both cast an unlisted spec through to prove it. An
 * id outside `SPEC_IDS` therefore reads the melee default, which is what this
 * code did before any per-spec table existed.
 *
 * A *registered* spec whose entry is missing is the opposite case and must
 * throw. That is why the registry is indexed directly rather than through `?.`
 * — an optional chain would silently hand back ret's melee cap for a caster,
 * which is a right number for the wrong school and the quietest failure this
 * table was built to stop.
 */
export function capProfileFor(spec: SpecId | undefined): CapProfile {
  if (spec === undefined || !isSpecId(spec)) return DEFAULT_CAP_PROFILE;
  return SPEC_REGISTRY[spec].capProfile;
}
