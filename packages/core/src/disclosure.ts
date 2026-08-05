/**
 * Standing assumptions vs this-run substitutions (PLAN.md §9 R7).
 * Standing = always true, collapsed in the drawer. Run = rare, expanded.
 */

import type { ContentPhase, Race } from "./types.js";
import type { MetaRepairSwap } from "./meta-repair.js";

export type StandingAssumptionId =
  | "race"
  | "talents-apl-buffs-consumes-encounter"
  | "professions-excluded"
  | "weapon-imbue-omitted";

export type StandingAssumption = {
  id: StandingAssumptionId;
  detail: string;
};

export type Assumptions = {
  maxPhase: ContentPhase;
  seeds: number[];
  iterations: number;
  race: Race;
  /** Preset / skeleton id used for compose (e.g. ret P2 raid skeleton). */
  presetId: string;
  standing: StandingAssumption[];
};

export type Substitution = {
  field: string;
  detail: string;
};

export function buildStandingAssumptions(race: Race): StandingAssumption[] {
  return [
    {
      id: "race",
      detail: `Race assumed ${race} from the pinned preset (not readable from WCL); override via RankInput.race.`,
    },
    {
      id: "talents-apl-buffs-consumes-encounter",
      detail:
        "Talents, APL, raid buffs, consumes, and encounter come from the pinned preset/skeleton — not from the log.",
    },
    {
      id: "professions-excluded",
      detail:
        "Profession-locked gems and items are excluded; professions are not modelled from combatant info.",
    },
    {
      id: "weapon-imbue-omitted",
      detail:
        "WCL temporaryEnchant (effect id) is omitted: no effectId→itemId imbue table in db.json. Constant across baseline and candidates, so deltas survive.",
    },
  ];
}

/**
 * The hit-cap line (§4, R8).
 *
 * Never states a precise figure: §4's shape is "~20 rating under the cap,
 * assuming no Heroic Presence in your party", not "you are 20 under".
 *
 * Both unknowns point the **same way**, which is why this does not render a ±
 * band. Talent hit is uncounted and only ever adds (the pinned ret preset
 * takes 3/3 Precision, ~47 rating — see carry-forward ticket 33), and Heroic
 * Presence, unreadable from WCL, only ever lowers the cap. A symmetric ±
 * dressed a one-sided overstatement up as noise; saying which direction the
 * error runs is the honest version and costs nothing.
 */
export function hitCapBanner(hit: {
  rating: number;
  gap: number;
  capUncertainty: number;
}): string {
  const rounded = Math.round(Math.abs(hit.gap));
  const band = Math.round(hit.capUncertainty);
  if (hit.gap > 0) {
    return (
      `~${rounded} rating under the hit cap counting gear alone — ` +
      `talents and raid buffs are not counted and only ever add hit, and ` +
      `Heroic Presence in your party would lower the cap by ~${band}. ` +
      `The real shortfall is smaller than this, likely much smaller.`
    );
  }
  return (
    `~${rounded} rating over the hit cap counting gear alone — ` +
    `talents and raid buffs are not counted and only ever add hit, and ` +
    `Heroic Presence in your party would lower the cap by ~${band}. ` +
    `You are over by at least this much.`
  );
}

/**
 * §9 R7's two tiers. Standing assumptions are always true and collapse behind
 * a count; this-run substitutions are rare and are always expanded — a run
 * that silently substituted five things must not look like a clean one.
 */
export function renderDisclosure(opts: {
  standing: readonly StandingAssumption[];
  substitutions: readonly Substitution[];
  expandStanding?: boolean;
}): string[] {
  const lines: string[] = [];
  const { standing, substitutions } = opts;

  if (opts.expandStanding) {
    lines.push(`assumptions (${standing.length}):`);
    for (const a of standing) lines.push(`  - [${a.id}] ${a.detail}`);
  } else if (standing.length > 0) {
    lines.push(
      `assumptions: ${standing.length} standing (--assumptions to expand)`
    );
  }

  if (substitutions.length > 0) {
    lines.push(`substitutions this run (${substitutions.length}):`);
    for (const s of substitutions) lines.push(`  - ${s.field}: ${s.detail}`);
  }
  return lines;
}

export function substitutionsFromMetaRepair(
  swaps: readonly MetaRepairSwap[]
): Substitution[] {
  if (swaps.length === 0) return [];
  return [
    {
      field: "gems.meta-repair",
      detail: `Meta inactive — repaired with ${swaps.length} min-EP gem swap(s): ${swaps
        .map((s) => `${s.from}→${s.to}@item ${s.itemId}`)
        .join(", ")}.`,
    },
  ];
}
