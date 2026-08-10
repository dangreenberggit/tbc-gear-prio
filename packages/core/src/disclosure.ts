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

/**
 * Above this, the fight reads as a clean parse of the spec asked for, so a
 * missing salvation is surprising rather than expected. Below it the low
 * confidence is already saying "this fight is not what you asked for" and a
 * second line about salvation adds nothing.
 */
const CONFIDENT_PARSE = 0.9;

/**
 * Which fight the gear came from, printed on every run (ticket 06).
 *
 * Unconditional on purpose. Shredzepelin's Morogrim kill was a backup-tank
 * fight — 99% cat form, tank gear, and a confident classification, because
 * form uptime measures the form and not the job. Nothing in the output named
 * the fight, so there was nothing for the one person who knew the raid
 * assignment to disagree with.
 *
 * The salvation line is a **question, not a verdict**. Salv is stripped from
 * anyone who might tank, but it is also lost on death, dropped by high-threat
 * DPS, and absent entirely from a raid with no paladin — and
 * `capture_fixture.py` scopes the buffs table to a single player, so we cannot
 * check the roster to tell those apart.
 */
export function fightProvenanceLines(fight: {
  reportCode: string;
  fightId: number;
  encounterName?: string;
  route: "ranked" | "report-events";
  confidence?: number;
  salvationUptime?: number;
}): string[] {
  const where = fight.encounterName ?? `fight ${fight.fightId}`;
  const lines = [
    `gear read from ${where} (${fight.reportCode} fight ${fight.fightId}, ${fight.route} route)` +
      (fight.confidence === undefined
        ? ""
        : `, spec confidence ${(fight.confidence * 100).toFixed(0)}%`),
  ];

  const salv = fight.salvationUptime;
  const confident = (fight.confidence ?? 0) >= CONFIDENT_PARSE;
  if (salv !== undefined && salv === 0 && confident) {
    lines.push(
      `  no Blessing of Salvation on this fight — were you off-tanking, or was there no paladin? ` +
        `If you were covering a tank slot, this gear is not your DPS set and the numbers below are measured against the wrong baseline. ` +
        `Pick another fight if so.`
    );
  }
  return lines;
}

/**
 * The set-potential disclosure line (spec §4, PLAN.md §9 R7's honesty rule).
 *
 * Not a `StandingAssumption`: it names how `setBonuses`/`setContext` numbers
 * were measured, and those fields only exist under the `--with-set-potential`
 * view toggle. Folding it into `Ranking.assumptions.standing` unconditionally
 * would change the default ranking's own object — the thing acceptance §8.2
 * pins byte-for-byte against `dev` — so it renders at the CLI/report layer
 * instead, gated the same way the numbers themselves are.
 */
export function setPotentialDisclosureLine(): string {
  return "set potential is measured with the completion-package synergy method, shared seeds — see .scratch/set-bonus-value/spec.md §2.2";
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
