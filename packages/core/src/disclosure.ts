/**
 * Standing assumptions vs this-run substitutions (PLAN.md §9 R7).
 * Standing = always true, collapsed in the drawer. Run = rare, expanded.
 */

import type { ContentPhase, Race } from "./types.js";
import type { MetaRepairSwap } from "./meta-repair.js";
import type { TalentHitAssumption } from "./caps.js";

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
 * `hit.rating`/`hit.gap` already fold in talent-granted hit where
 * `capStateFrom` was given a `talentsString` and `spec` it recognises (the
 * pinned ret preset's 3/3 Precision, ~47 rating — carry-forward 33; a
 * recognised spec with no mapped hit talent, e.g. feral, contributes 0 rather
 * than being silently assumed away).
 *
 * That talent figure is **assumed, not read** (carry-forward 60): the string
 * comes off the composed request, which `compose` never writes from the log,
 * so it is always the preset's build. Pass `talentHitAssumed` to say so.
 * Without it the reader would take the preset's Precision for their own.
 *
 * The assumption makes the error two-sided — a character who skipped
 * Precision reads ~47 rating high, one who took it reads true — so the
 * "at least this much" floor only holds when nothing was assumed. Heroic
 * Presence remains one-sided (unreadable from WCL, party-scoped, only ever
 * *lowers* the cap), which is why this still renders no ± band: a symmetric
 * band would dress a one-sided overstatement up as noise.
 */
export function hitCapBanner(hit: {
  rating: number;
  gap: number;
  capUncertainty: number;
  talentHitAssumed?: TalentHitAssumption;
}): string {
  const rounded = Math.round(Math.abs(hit.gap));
  const band = Math.round(hit.capUncertainty);
  const assumed = hit.talentHitAssumed;
  const assumption = assumed
    ? ` Assumes ${assumed.points}/${assumed.maxPoints} ${assumed.talent} — ` +
      `your logged build is not read for talents yet.`
    : "";

  if (hit.gap > 0) {
    // Direction, not a band. With nothing assumed the only uncounted source
    // is Heroic Presence, which lowers the cap, so the shortfall can only
    // shrink. With an assumed talent it can run *either* way — a character
    // who skipped Precision is credited ~47 rating they do not have, making
    // the real shortfall LARGER — so claiming "smaller" would be the same
    // confidently-wrong direction this disclosure exists to prevent.
    const direction = assumed
      ? `The real shortfall could run either way.`
      : `The real shortfall may be smaller than this.`;
    return (
      `~${rounded} rating under the hit cap — ` +
      `Heroic Presence in your party would lower the cap by ~${band}. ` +
      `${direction}${assumption}`
    );
  }
  const floor = assumed
    ? `Heroic Presence would lower the cap further.`
    : `You are over by at least this much.`;
  return (
    `~${rounded} rating over the hit cap — ` +
    `Heroic Presence in your party would lower the cap by ~${band}. ` +
    `${floor}${assumption}`
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
