/**
 * Hit / expertise cap state (PLAN.md §4 R8).
 *
 * §4 makes `caps` a required field on `Ranking` — "a Ranking you can't audit
 * is not a Ranking". This module is pure: it sums the rating the player's
 * *gear* carries, adds any talent-granted hit it can decode from the
 * composed request's `talentsString`, and compares the total to the cap.
 *
 * What this still does not know: raid buffs, consumes. Nothing the sim
 * returns carries them — `RaidSimResult` (proto/api.proto) has no stats field,
 * and the pinned wowsimcli exposes only `sim`, not the `ComputeStats` RPC
 * whose `PlayerStats.final_stats` would have been the right number. Talent
 * hit does not need that RPC: `talentsString` is already in the composed
 * `RaidSimRequest`, so `talentHitRatingFromString` decodes it directly
 * (carry-forward 33).
 *
 * The talent half of the original gap was measurable and large: the pinned
 * ret P2 preset's talent string (`5-053201-…`) takes **3/3 Precision** — a
 * Protection talent this build cross-specs into, worth 3% hit ≈ 47 rating
 * (Precision grants flat `PhysicalHitPercent`, not rating — see
 * sim/paladin/talents.go `applyPrecision` in the pinned wowsims-tbc-new
 * source). The Retribution tree itself (paladin.proto 43-64) has no hit
 * talent at all, so Precision was the whole talent contribution: the
 * slamaltman fixture character read 72 from gear against a 142 cap, gear
 * alone, but sits near 119 once Precision is counted.
 *
 * `talentHitRatingFromString` is a hand-maintained per-spec table (only
 * "ret" → Precision is populated); an unrecognised spec or a talent string
 * with no points in the mapped slot contributes 0 rather than guessing, so
 * feral (no hit talent in druid.proto — see carry-forward 05 for its own gap)
 * is unaffected.
 *
 * No TBC raid buff grants melee hit; Heroic Presence (Draenei, party-scoped,
 * +1%) is the only other source and is unreadable from WCL, which is what
 * HIT_CAP_UNCERTAINTY stands for. It only ever *reduces* the shortfall — so
 * the banner must state the direction rather than dress a one-sided gap up as
 * symmetric noise.
 */

import { getItem } from "./items.js";
import { getGem } from "./gems.js";
import type { SimItemSpec } from "./slots.js";
import type { SocketedItem } from "./meta-repair.js";
import { Stat, statAt } from "./stats.js";
import type { Race, SpecId } from "./types.js";

/**
 * ui/core/constants/mechanics.ts @ wowsims/tbc-new
 * 8aa378b3671a0923fd11fb34b4b3753e53f20c9b (data/wowsims.lock.json).
 * Copied rather than imported: the vendor tree is a build input, never a
 * runtime dependency (PLAN.md §8.3 [P0]).
 *
 * Must be the PHYSICAL constant. `SPELL_HIT_RATING_PER_HIT_PERCENT` is
 * 12.615385 and a melee hit cap built on it is wrong by ~28 rating.
 */
export const PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233;

/** Yellow-attack hit cap vs a boss (level 73): 9% missing. */
export const HIT_CAP_PERCENT = 9;

/** ~142 rating. */
export const HIT_CAP_RATING =
  HIT_CAP_PERCENT * PHYSICAL_HIT_RATING_PER_HIT_PERCENT;

/**
 * One percent of hit — the Heroic Presence band. Whether a Draenei is in the
 * party is not readable from WCL, so the cap is only ever known to ±1%.
 */
export const HIT_CAP_UNCERTAINTY = PHYSICAL_HIT_RATING_PER_HIT_PERCENT;

export type CapEntry = {
  rating: number;
  /**
   * `null` when no honest cap can be stated. Not 0: a consumer applying the
   * natural `gap <= 0 ? "capped" : "under"` test would report a player with
   * zero expertise as *at cap*, which is the most confident possible reading
   * of the least known number.
   */
  capRating: number | null;
  /** Positive when under the cap, negative when over. `null` with no cap. */
  gap: number | null;
};

/** Hit always has a known cap, so it narrows both nullable fields back out. */
export type HitCapEntry = CapEntry & {
  capRating: number;
  gap: number;
  assumedRace?: Race;
  /**
   * Set when `rating` includes talent hit taken from the *preset's* build
   * rather than the logged character's (carry-forward 60). Absent means
   * nothing was assumed — either no talent string was supplied, or the spec
   * has no hit talent to assume.
   */
  talentHitAssumed?: { talent: string; points: number; maxPoints: number };
  capUncertainty: number;
};

export type CapState = {
  hit: HitCapEntry;
  expertise: CapEntry;
};

/**
 * Sum a stat across equipped items and their socketed gems.
 *
 * `socketed` is passed separately rather than read off `equipment[].gems`
 * because meta repair rewrites gems after the equipment list is built, and the
 * repaired layout is the one the sim ran. When it is empty the equipment's own
 * gems are used.
 *
 * Both arrays are indexed **positionally** by SIM_ORDER slot, which is how
 * `applyRepairedGems` reads `socketed[i]`. Keying gems by item id instead
 * looks equivalent and is not: two identical rings or trinkets collapse to one
 * map entry, so the last one wins and is then applied to both slots. Measured
 * on two Bands of Accuria with one +8 hit gem, ground truth 48 — the id-keyed
 * version returned 40 or 56 depending purely on array order.
 */
function sumStat(
  equipment: readonly SimItemSpec[],
  socketed: readonly SocketedItem[],
  stat: Stat
): number {
  let total = 0;

  for (let i = 0; i < equipment.length; i++) {
    const spec = equipment[i]!;
    if (!spec.id) continue;
    total += statAt(getItem(spec.id)?.stats ?? [], stat);

    const repaired = socketed[i];
    const gems =
      repaired && repaired.itemId === spec.id ? repaired.gems : spec.gems;
    for (const gemId of gems) {
      if (!gemId) continue;
      total += statAt(getGem(gemId)?.stats ?? [], stat);
    }
  }
  return total;
}

/**
 * Talent-string tree segment index (`str.split("-")[treeIndex]`) and
 * in-tree talent index (`segment.charAt(talentIndex)`) that carry hit for a
 * spec, plus the percent-per-point the talent grants.
 *
 * Layout order is the tree's UI order (ui/core/talents/trees/paladin.json in
 * the pinned wowsims-tbc-new source), which matches proto declaration order
 * here but is not guaranteed to in general — do not assume it holds for a
 * spec added later without checking that spec's tree json.
 *
 * Ret's entry: paladin.proto's Protection block is talentIndex 21-40
 * (`precision = 23` is local index 2); wowsims-tbc-new's talent-string
 * encoder writes trees in Holy(0)/Protection(1)/Retribution(2) order, so
 * `5-053201-…` splits to Holy `"5"` / Protection `"053201"` / Retribution
 * `"0523005120033125331051"`. The segments sum to 5/11/45 — the same
 * Holy/Prot/Ret point split asserted for this fixture at `spec.test.ts:16`
 * and `rank.test.ts:103`, which is what confirms the alignment. Segment 1 is
 * therefore Protection.
 */
const TALENT_HIT_BY_SPEC: Readonly<
  Record<
    SpecId,
    | {
        treeSegment: number;
        talentIndex: number;
        percentPerPoint: number;
        talent: string;
        maxPoints: number;
      }
    | undefined
  >
> = {
  ret: {
    treeSegment: 1,
    talentIndex: 2,
    percentPerPoint: 1,
    talent: "Precision",
    maxPoints: 3,
  },
  feral: undefined,
};

/**
 * Talent-granted physical hit rating from a wowhead-format `talentsString`
 * (proto.Player.talents_string), decoded per `TALENT_HIT_BY_SPEC`.
 *
 * Returns 0 rather than throwing for a spec with no mapped hit talent, a
 * string with fewer segments/characters than the mapped position, or a
 * non-digit at that position — an unreadable or absent talent contributes
 * nothing rather than crashing the cap computation over a preset detail.
 */
export function talentHitRatingFromString(
  talentsString: string,
  spec: SpecId
): number {
  return talentHitFromString(talentsString, spec).rating;
}

/**
 * The rating plus what it was read from, so callers that must disclose the
 * assumption (carry-forward 60) do not re-decode the string themselves.
 * `points` is absent whenever `rating` is 0 — nothing was assumed.
 */
function talentHitFromString(
  talentsString: string,
  spec: SpecId
): {
  rating: number;
  assumed?: { talent: string; points: number; maxPoints: number };
} {
  const entry = TALENT_HIT_BY_SPEC[spec];
  if (!entry) return { rating: 0 };

  const segment = talentsString.split("-")[entry.treeSegment];
  if (segment === undefined) return { rating: 0 };

  const points = Number(segment.charAt(entry.talentIndex));
  if (!Number.isFinite(points) || points <= 0) return { rating: 0 };

  return {
    rating:
      points * entry.percentPerPoint * PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
    assumed: { talent: entry.talent, points, maxPoints: entry.maxPoints },
  };
}

export function capStateFrom(
  equipment: readonly SimItemSpec[],
  socketed: readonly SocketedItem[],
  opts: { assumedRace?: Race; talentsString?: string; spec?: SpecId } = {}
): CapState {
  const gearHitRating = sumStat(equipment, socketed, Stat.StatMeleeHitRating);
  const talentHit =
    opts.talentsString !== undefined && opts.spec !== undefined
      ? talentHitFromString(opts.talentsString, opts.spec)
      : { rating: 0 };
  const hitRating = gearHitRating + talentHit.rating;
  const expertiseRating = sumStat(
    equipment,
    socketed,
    Stat.StatExpertiseRating
  );

  const hit: HitCapEntry = {
    rating: hitRating,
    capRating: HIT_CAP_RATING,
    gap: HIT_CAP_RATING - hitRating,
    capUncertainty: HIT_CAP_UNCERTAINTY,
  };
  if (opts.assumedRace !== undefined) hit.assumedRace = opts.assumedRace;
  if (talentHit.assumed !== undefined) hit.talentHitAssumed = talentHit.assumed;

  return {
    hit,
    expertise: {
      rating: expertiseRating,
      // The dodge cap is ~410 rating (6.5% boss dodge ÷ 0.25% per expertise
      // point × 3.942308 rating per point), but the requirement moves with
      // weapon skill — Human/Dwarf racials give +5 skill on specific weapon
      // types — and neither weapon skill nor the equipped weapon's type is
      // readable from a log. Stating a cap we cannot compute per character is
      // worse than declining to; see CapEntry on why this is null, not 0.
      capRating: null,
      gap: null,
    },
  };
}

/**
 * Per-stat delta between two equipment layouts, keyed by proto.Stat.
 *
 * Gems come from the specs themselves here rather than from a repaired layout:
 * both sides are candidate-swap equipment built by the same code path, so the
 * comparison stays like-for-like.
 */
export function statDeltaBetween(
  before: readonly SimItemSpec[],
  after: readonly SimItemSpec[]
): Record<number, number> {
  const delta: Record<number, number> = {};
  for (let stat = 0; stat < STAT_COUNT; stat++) {
    const diff = sumStat(after, [], stat) - sumStat(before, [], stat);
    if (diff !== 0) delta[stat] = diff;
  }
  return delta;
}

/**
 * Dense stat-array width, derived from the generated `Stat` enum rather than
 * hardcoded. `scripts/generate_item_gem_index.py` parses `NextIndex` out of
 * common.proto and refuses to run if the enum grew; hardcoding 42 here would
 * re-introduce on the TS side exactly the drift the generator now rejects —
 * a grown enum would fail loudly in Python and silently truncate this loop.
 */
const STAT_COUNT =
  Math.max(
    ...Object.values(Stat).filter((v): v is Stat => typeof v === "number")
  ) + 1;

/**
 * Simple majority. Nothing in TBC makes 0.5 special — it is the threshold that
 * needs no defending, and the flag is advisory rather than load-bearing on the
 * ranking, so a sharper number would imply precision this does not have.
 */
const HIT_DRIVEN_SHARE = 0.5;

/**
 * Survival stats are excluded from the share, not merely down-weighted.
 *
 * Armour dwarfs every damage stat on an armoured slot: Crystalforge
 * Breastplate's delta is `{str 56, sta 40, int 20, hit 23, crit 21, armor
 * 1668}`, so counting armour puts hit at 1.3% of the "gain" and the flag can
 * never fire outside a zero-armour trinket. Excluding it puts hit at 14%,
 * which is a number about damage — the only thing this flag claims to describe.
 */
const SURVIVAL_STATS = new Set<number>([
  Stat.StatStamina,
  Stat.StatArmor,
  Stat.StatBonusArmor,
  Stat.StatHealth,
  Stat.StatDefenseRating,
  Stat.StatDodgeRating,
  Stat.StatParryRating,
  Stat.StatBlockRating,
  Stat.StatBlockValue,
  Stat.StatResilienceRating,
]);

const CONTRIBUTES_TO_DAMAGE = (stat: number): boolean =>
  !SURVIVAL_STATS.has(stat);

/**
 * §4 is explicit that not modelling stat combinations is *correct* per §2's
 * scoping rule. This flag exists because correct-but-misleading is still
 * misleading: an item that ranks purely on hit stops being an upgrade the
 * moment the player crosses the cap by any other means.
 */
export function isHitDriven(
  statDelta: Readonly<Record<number, number>>,
  hit: { gap: number },
  candidate: { deltaDps: number }
): boolean {
  // A loss has no gain to be driven by, and the warning this flag gives —
  // "this stops being an upgrade past the cap" — says nothing about an item
  // that is not an upgrade now. Without this, below-cutoff items with negative
  // deltas get labelled as hit-driven gains.
  if (candidate.deltaDps <= 0) return false;
  if (hit.gap <= 0) return false;
  let hitGain = 0;
  let totalGain = 0;
  for (const [index, value] of Object.entries(statDelta)) {
    if (value <= 0) continue;
    if (!CONTRIBUTES_TO_DAMAGE(Number(index))) continue;
    totalGain += value;
    if (Number(index) === Stat.StatMeleeHitRating) hitGain += value;
  }
  if (totalGain <= 0) return false;
  return hitGain / totalGain > HIT_DRIVEN_SHARE;
}

/**
 * The mirror of `isHitDriven`: a recommendation that *reduces* hit while the
 * report is telling the player they are short of the cap.
 *
 * `isHitDriven` cannot express this — it sums only positive deltas, so an item
 * carrying no hit over a worn item carrying some scores zero hit gain and is
 * simply unflagged. That left the shortlist widening the very gap the hit
 * banner above it had just called the player's main problem, with nothing on
 * the row saying so (carry-forward 47 §2).
 *
 * Advisory only, exactly like `isHitDriven`: the sim result stands, and a
 * hit-losing item can still be the biggest throughput win. The claim is about
 * a trade the page was making silently, not about the ranking being wrong.
 */
export function hitRegression(
  statDelta: Readonly<Record<number, number>>,
  hit: { gap: number },
  candidate: { deltaDps: number }
): { lost: number; gapAfter: number } | null {
  if (candidate.deltaDps <= 0) return null;
  if (hit.gap <= 0) return null;
  const delta = statDelta[Stat.StatMeleeHitRating] ?? 0;
  if (delta >= 0) return null;
  const lost = -delta;
  return { lost, gapAfter: hit.gap + lost };
}
