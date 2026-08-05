/**
 * Hit / expertise cap state (PLAN.md §4, §4.3).
 *
 * §4 makes `caps` a required field on `Ranking` — "a Ranking you can't audit
 * is not a Ranking". This module is pure: it sums the rating the player's
 * *gear* carries and compares it to the cap.
 *
 * What this deliberately does not know: talents, raid buffs, consumes. The sim
 * knows all three, but nothing it returns carries them — `RaidSimResult`
 * (proto/api.proto) has no stats field, and the pinned wowsimcli exposes only
 * `sim`, not the `ComputeStats` RPC whose `PlayerStats.final_stats` would have
 * been the right number. So this is a gear-only floor and reads low for any
 * spec with talent hit. That is why §4.3 forbids presenting a precise figure
 * and requires the uncertainty band to be spoken aloud.
 */

import { getItem } from "./items.js";
import { getGem } from "./gems.js";
import type { SimItemSpec } from "./slots.js";
import type { SocketedItem } from "./meta-repair.js";
import { Stat } from "./stats.js";
import type { Race } from "./types.js";

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

/**
 * Expertise is reported in rating here rather than converted to dodge/parry
 * reduction: the useful cap depends on weapon skill and racial weapon bonuses,
 * neither of which is readable from a log. Surfacing the raw rating with no
 * cap claim is honest; inventing a cap is not.
 */
export type CapEntry = {
  rating: number;
  capRating: number;
  /** Positive when under the cap, negative when over. */
  gap: number;
};

export type HitCapEntry = CapEntry & {
  assumedRace?: Race;
  capUncertainty: number;
};

export type CapState = {
  hit: HitCapEntry;
  expertise: CapEntry;
};

function statFrom(stats: readonly number[] | undefined, stat: Stat): number {
  return stats?.[stat] ?? 0;
}

/**
 * Sum a stat across equipped items and their socketed gems.
 *
 * `socketed` is passed separately rather than read off `equipment[].gems`
 * because meta repair rewrites gems after the equipment list is built, and the
 * repaired layout is the one the sim ran. When it is empty the equipment's own
 * gems are used.
 */
function sumStat(
  equipment: readonly SimItemSpec[],
  socketed: readonly SocketedItem[],
  stat: Stat
): number {
  let total = 0;
  const gemsByItem = new Map<number, readonly number[]>();
  for (const it of socketed) {
    if (it.itemId) gemsByItem.set(it.itemId, it.gems);
  }

  for (const spec of equipment) {
    if (!spec.id) continue;
    total += statFrom(getItem(spec.id)?.stats, stat);
    for (const gemId of gemsByItem.get(spec.id) ?? spec.gems) {
      if (!gemId) continue;
      total += statFrom(getGem(gemId)?.stats, stat);
    }
  }
  return total;
}

export function capStateFrom(
  equipment: readonly SimItemSpec[],
  socketed: readonly SocketedItem[],
  opts: { assumedRace?: Race } = {}
): CapState {
  const hitRating = sumStat(equipment, socketed, Stat.StatMeleeHitRating);
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

  return {
    hit,
    expertise: {
      rating: expertiseRating,
      // No honest expertise cap without weapon skill; see CapEntry.
      capRating: 0,
      gap: 0,
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

/** Dense stat-array width; see scripts/generate_item_gem_index.py. */
const STAT_COUNT = 42;

/** A gain is hit-driven when most of it is hit rating and the player is under cap. */
const HIT_DRIVEN_SHARE = 0.5;

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
    totalGain += value;
    if (Number(index) === Stat.StatMeleeHitRating) hitGain += value;
  }
  if (totalGain <= 0) return false;
  return hitGain / totalGain > HIT_DRIVEN_SHARE;
}
