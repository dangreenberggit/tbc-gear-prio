/**
 * Build RecordedGearSourceData from the Phase 0 slamaltman raw fixture.
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
import type { CharacterRef } from "../types.js";

export type SlamaltmanRawFixture = {
  report_code: string;
  fight: { id: number; name: string };
  actors: Array<{ id: number; name: string }>;
  combatant_info_events: Array<{
    sourceID: number;
    gear: WclGearEntry[];
  }>;
};

export const SLAMALTMAN_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "slamaltman",
};

export function slamaltmanOfflineRecordings(
  raw: SlamaltmanRawFixture
): RecordedGearSourceData {
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  let logged: LoggedGear | undefined;
  for (const ev of raw.combatant_info_events) {
    if (actors.get(ev.sourceID)?.name.toLowerCase() !== "slamaltman") continue;
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
      talentPointsByTree: [5, 11, 45],
      provenance: {
        reportCode: raw.report_code,
        fightId: raw.fight.id,
        sourceID: ev.sourceID,
      },
    };
    break;
  }
  if (!logged) {
    throw new Error("slamaltman not found in raw fixture");
  }

  const summary: FightSummary = {
    reportCode: raw.report_code,
    fightId: raw.fight.id,
    encounterName: raw.fight.name,
    killedAt: "2026-07-01T00:00:00.000Z",
    route: "ranked",
    confidence: 1,
  };

  return {
    fights: new Map([[characterFightKey(SLAMALTMAN_REF, "ret"), [summary]]]),
    gear: new Map([[fightGearKey(summary), logged]]),
  };
}
