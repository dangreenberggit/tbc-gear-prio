/**
 * Build RecordedGearSourceData from a raw fixture captured through the
 * **report-events** route (PLAN.md §5.2, §10 fallback).
 *
 * The route is the whole point of this module. `slamaltman-offline.ts` builds
 * a `route: "ranked"` summary; this one builds `route: "report-events"`, so
 * the fallback can be exercised through `rankUpgrades` against a real payload
 * rather than a hand-written one.
 *
 * Pure — callers load the JSON (CLI / tests), same contract as the ranked
 * builder.
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
  }>;
};

/**
 * Slamaltman resolves through this route, and not for a contrived reason:
 * he has ten kills on the SSC encounters and **zero** `encounterRankings`
 * entries. "No ranked kills" is about a ranked parse, not about whether the
 * boss died — this fixture's own fight is a Magtheridon *kill*.
 */
export const REPORT_EVENTS_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

/**
 * Talent plurality for the captured character. Read from the fixture's own
 * talents payload would be better, but `wcl_probe.py --raw-out` does not
 * persist the parsed tree points — only the gear array it printed. Stated
 * here rather than silently defaulted, and it is ret's 5/11/45 either way.
 */
const TALENT_POINTS: LoggedGear["talentPointsByTree"] = [5, 11, 45];

export function reportEventsOfflineRecordings(
  raw: ReportEventsRawFixture,
  character: CharacterRef = REPORT_EVENTS_REF,
  spec: SpecId = "ret"
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
      talentPointsByTree: TALENT_POINTS,
      provenance: {
        reportCode: raw.report_code,
        fightId: raw.fight.id,
        sourceID: ev.sourceID,
      },
    };
    break;
  }
  // One fight holds every raider's gear (phase0-findings §11), so a fixture
  // that does not contain *this* character is a mis-capture rather than a
  // character with no gear — say so instead of returning an empty recording
  // that would surface later as an unrelated `no-qualifying-fight`.
  if (!logged) {
    throw new Error(
      `${character.name} not found in report-events fixture ${raw.report_code}`
    );
  }

  const summary: FightSummary = {
    reportCode: raw.report_code,
    fightId: raw.fight.id,
    encounterName: raw.fight.name,
    // The capture does not carry a wall-clock kill time, and inventing one
    // would be a fabricated field in a fixture whose whole job is being real.
    killedAt: "",
    route: "report-events",
    /**
     * Below the ranked route's 1. §5.4 ties confidence to how sure we are
     * that this fight is representative of the character's spec and play,
     * and a fight reached by walking a report is a weaker signal than a
     * ranked parse: nothing measured it against anything.
     */
    confidence: 0.5,
  };

  return {
    fights: new Map([[characterFightKey(character, spec), [summary]]]),
    gear: new Map([[fightGearKey(summary), logged]]),
  };
}
