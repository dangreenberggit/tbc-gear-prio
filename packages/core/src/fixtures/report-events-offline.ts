/**
 * Build RecordedGearSourceData from a raw WCL capture, for either offline
 * route (PLAN.md §5.2, §10 fallback).
 *
 * `slamaltman-offline.ts` and this module used to be two near-identical
 * builders that differed in `route`, `confidence`, and (until the fix
 * recorded in carry-forward ticket 38) whether `talentPointsByTree` was read
 * from the capture or hardcoded. That last difference was not a design
 * choice, it was a bug: the ranked builder's hardcoded `[5, 11, 45]` happened
 * to match slamaltman's own ret capture, but nothing would have caught it
 * silently scoring the wrong build the way the report-events builder's
 * hardcode once did (docs/verification-log.md, 2026-08-05). Both routes now
 * share `buildOfflineRecordings` below and always read talents from the
 * payload — see ticket 38's Closed section for the reproduction.
 *
 * Pure — callers load the JSON (CLI / tests).
 */

import {
  characterFightKey,
  fightGearKey,
  type FightSummary,
  type LoggedGear,
  type RecordedGearSourceData,
} from "../seams/gear-source.js";
import { mapWclGearToSim, SIM_ORDER, type WclGearEntry } from "../slots.js";
import type { CharacterRef, SpecId } from "../types.js";

export type ReportEventsRawFixture = {
  report_code: string;
  fight: { id: number; name: string; kill?: boolean };
  actors: Array<{ id: number; name: string }>;
  combatant_info_events: Array<{
    sourceID: number;
    gear: WclGearEntry[];
    /** Points spent per tree, in WCL's order — never a talent id (R18). */
    talents?: Array<{ id: number }>;
  }>;
};

/**
 * Slamaltman resolves through this route, and not for a contrived reason:
 * he has ten kills on the SSC encounters and **zero** `encounterRankings`
 * entries. "No ranked kills" is about a ranked parse, not about whether the
 * boss died — this fixture's own fight is a Hydross *kill*.
 */
export const REPORT_EVENTS_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

/**
 * Points spent per tree, read from the capture rather than assumed.
 *
 * An earlier version of the report-events builder hardcoded ret's
 * `[5, 11, 45]` on the claim that `--raw-out` does not persist tree points.
 * That claim was false — the raw payload carries `talents` verbatim — and the
 * first capture it was applied to was a **protection** set (0/44/17, 17k
 * armour, an off-hand shield), so the fixture asserted a ret build the
 * payload contradicted. Reading the real value is what makes that class of
 * mislabelling impossible rather than merely unlikely.
 *
 * `talents[].id` is points spent, not a talent id (PLAN.md §5.2 / R18).
 */
function talentPointsFrom(
  ev: { talents?: Array<{ id: number }> },
  character: CharacterRef
): LoggedGear["talentPointsByTree"] {
  const points = (ev.talents ?? []).map((t) => t.id);
  if (points.length !== 3) {
    throw new Error(
      `${character.name}'s CombatantInfo carries ${points.length} talent trees, ` +
        `expected 3 — the capture cannot classify a spec`
    );
  }
  return [points[0]!, points[1]!, points[2]!];
}

type OfflineRawFixture = {
  report_code: string;
  fight: { id: number; name: string };
  actors: Array<{ id: number; name: string }>;
  combatant_info_events: Array<{
    sourceID: number;
    gear: WclGearEntry[];
    talents?: Array<{ id: number }>;
  }>;
};

/**
 * Shared body of both offline recording builders. `route` and `confidence`
 * are the one real remaining difference between the ranked and report-events
 * fixtures (PLAN.md §5.4); everything else — walking `combatant_info_events`,
 * matching the character through `actors`, mapping gear, and reading
 * talents — is identical between them.
 */
export function buildOfflineRecordings(
  raw: OfflineRawFixture,
  character: CharacterRef,
  spec: SpecId,
  route: FightSummary["route"],
  confidence: number,
  notFoundMessage: (character: CharacterRef, raw: OfflineRawFixture) => string,
  killedAt?: string
): RecordedGearSourceData {
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  const wanted = character.name.toLowerCase();
  let logged: LoggedGear | undefined;
  for (const ev of raw.combatant_info_events) {
    if (actors.get(ev.sourceID)?.name.toLowerCase() !== wanted) continue;
    const mapped = mapWclGearToSim(ev.gear);
    logged = {
      items: mapped.map((spec, i) => {
        const item: LoggedGear["items"][number] = {
          id: spec.id ?? 0,
          slot: SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
      talentPointsByTree: talentPointsFrom(ev, character),
      provenance: {
        reportCode: raw.report_code,
        fightId: raw.fight.id,
        sourceID: ev.sourceID,
      },
    };
    break;
  }
  if (!logged) {
    throw new Error(notFoundMessage(character, raw));
  }

  const summary: FightSummary = {
    reportCode: raw.report_code,
    fightId: raw.fight.id,
    encounterName: raw.fight.name,
    route,
    confidence,
    ...(killedAt ? { killedAt } : {}),
  };

  return {
    fights: new Map([[characterFightKey(character, spec), [summary]]]),
    gear: new Map([[fightGearKey(summary), logged]]),
  };
}

export function reportEventsOfflineRecordings(
  raw: ReportEventsRawFixture,
  character: CharacterRef = REPORT_EVENTS_REF,
  spec: SpecId = "ret"
): RecordedGearSourceData {
  return buildOfflineRecordings(
    raw,
    character,
    spec,
    "report-events",
    /**
     * Below the ranked route's 1. §5.4 ties confidence to how sure we are
     * that this fight is representative of the character's spec and play,
     * and a fight reached by walking a report is a weaker signal than a
     * ranked parse: nothing measured it against anything.
     */
    0.5,
    // One fight holds every raider's gear (phase0-findings §11), so a
    // fixture that does not contain *this* character is a mis-capture rather
    // than a character with no gear — say so instead of returning an empty
    // recording that would surface later as an unrelated
    // `no-qualifying-fight`.
    (c, r) => `${c.name} not found in report-events fixture ${r.report_code}`
  );
}
