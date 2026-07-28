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
      detail: `Race assumed ${race} (not readable from WCL); override via RankInput.race.`,
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
