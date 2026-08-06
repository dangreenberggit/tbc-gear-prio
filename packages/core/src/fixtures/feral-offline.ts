/**
 * Build RecordedGearSourceData from a feral cat raw capture
 * (scripts/capture_fixture.py). Pure — callers load the JSON.
 *
 * Unlike the slamaltman fixture this reads talents and form uptime out of the
 * capture rather than carrying them as constants, because feral is the case
 * where those two disagree: the talents are identical on a cat night and a
 * bear night, and only the form uptime separates them. `confidence` is
 * therefore measured here rather than asserted as 1.
 */

import { classifyFeralForm, talentPointsFromWclTalents } from "../spec.js";
import {
  characterFightKey,
  fightGearKey,
  type FightSummary,
  type LoggedGear,
  type RecordedGearSourceData,
} from "../seams/gear-source.js";
import { mapWclGearToSim, SIM_ORDER, type WclGearEntry } from "../slots.js";
import type { CharacterRef } from "../types.js";

export type FeralRawFixture = {
  report_code: string;
  fight: { id: number; name: string };
  actors: Array<{ id: number; name: string; subType?: string }>;
  combatant_info_events: Array<{
    sourceID: number;
    gear: WclGearEntry[];
    talents?: Array<{ id: number }>;
  }>;
  buffs_table?: {
    data?: {
      totalTime?: number;
      auras?: Array<{ name: string; totalUptime?: number }>;
    };
  };
};

const CAT_FORM = "Cat Form";
const BEAR_FORMS = new Set(["Dire Bear Form", "Bear Form"]);

export const SHREDZEPELIN_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "shredzepelin",
};

export const NEXESS_REF: CharacterRef = {
  region: "US",
  realm: "dreamscythe",
  name: "nexess",
};

function formUptimeOf(raw: FeralRawFixture): {
  catMs: number;
  bearMs: number;
} {
  let catMs = 0;
  let bearMs = 0;
  for (const aura of raw.buffs_table?.data?.auras ?? []) {
    const ms = aura.totalUptime ?? 0;
    if (aura.name === CAT_FORM) catMs += ms;
    else if (BEAR_FORMS.has(aura.name)) bearMs += ms;
  }
  return { catMs, bearMs };
}

export function feralOfflineRecordings(
  raw: FeralRawFixture,
  ref: CharacterRef
): RecordedGearSourceData {
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  let logged: LoggedGear | undefined;

  for (const ev of raw.combatant_info_events) {
    if (
      actors.get(ev.sourceID)?.name.toLowerCase() !== ref.name.toLowerCase()
    ) {
      continue;
    }
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
      talentPointsByTree: [...talentPointsFromWclTalents(ev.talents ?? [])],
      provenance: {
        reportCode: raw.report_code,
        fightId: raw.fight.id,
        sourceID: ev.sourceID,
      },
    };
    break;
  }

  if (!logged) {
    throw new Error(`${ref.name} not found in raw fixture`);
  }

  const form = classifyFeralForm(formUptimeOf(raw));

  const summary: FightSummary = {
    reportCode: raw.report_code,
    fightId: raw.fight.id,
    encounterName: raw.fight.name,
    route: "ranked",
    confidence: form.confidence,
  };

  return {
    fights: new Map([[characterFightKey(ref, "feral"), [summary]]]),
    gear: new Map([[fightGearKey(summary), logged]]),
  };
}
