/**
 * Synthetic-character fixture roster (candidate-pool.md §7.a).
 *
 * Unlike `slamaltman-offline.ts` / `feral-offline.ts`, this builder has no
 * WCL capture to walk: it turns a preset gear file — upstream's own
 * pre-raid/tier gear list, already in sim equipment order — directly into
 * `RecordedGearSourceData`. There is no ambiguity to measure (no form
 * uptime, no talent capture to trust), so `confidence` is always 1 and
 * `route` is `"ranked"` — the strongest signal, because the "signal" here is
 * that the caller chose the preset on purpose.
 *
 * Preset gear files (`vendor/wowsims/<spec>_*.gear.json`, pinned by
 * `scripts/sync_wowsims.py`) are already a `{items: SimItemSpec[]}` list of
 * 17 entries in `SIM_ORDER` — the same shape `data/presets/<spec>/p2.raid-sim-skeleton.json`
 * carries as its player's `equipment.items`. No WCL 19→17 slot mapping runs
 * here because there is no WCL 19-slot array to begin with.
 */

import {
  characterFightKey,
  fightGearKey,
  type FightSummary,
  type LoggedGear,
  type RecordedGearSourceData,
} from "../seams/gear-source.js";
import { SIM_ORDER } from "../slots.js";
import type { CharacterRef, ContentPhase, SpecId } from "../types.js";

export type PresetGearFile = {
  items: ReadonlyArray<{
    id?: number;
    enchant?: number;
    gems?: number[];
  }>;
};

/**
 * Tree index carrying the spec's points, so `classifySpec` (packages/core/src/spec.ts)
 * lands on the right tree without needing a real talent string parsed.
 * Paladin tree 2 is Retribution, Druid tree 1 is Feral Combat (spec.ts:35-46).
 */
const SPEC_TREE_INDEX: Record<SpecId, 0 | 1 | 2> = {
  ret: 2,
  feral: 1,
};

const SPEC_CLASS_NAME: Record<SpecId, string> = {
  ret: "Paladin",
  feral: "Druid",
};

/**
 * A round number safely above any real talent build's point total (max
 * spendable in one TBC tree is 51) — the exact value is never read, only its
 * position as the tree maximum, so classifySpec's plurality check picks it
 * unambiguously (spec.ts:91-98).
 */
const SYNTHETIC_TREE_POINTS = 51;

function talentPointsFor(spec: SpecId): [number, number, number] {
  const points: [number, number, number] = [0, 0, 0];
  points[SPEC_TREE_INDEX[spec]] = SYNTHETIC_TREE_POINTS;
  return points;
}

/**
 * Builds `RecordedGearSourceData` for a synthetic character wearing a
 * preset's gear untouched. `presetPhase` and `maxPhase` are not read here —
 * they are the caller's bookkeeping (candidate-pool.md §7.a: "record the
 * triple per row") for which preset file was loaded and what pool it was
 * ranked against; this function only turns gear into the recorded shape.
 */
export function syntheticOfflineRecordings(args: {
  ref: CharacterRef;
  spec: SpecId;
  presetGear: PresetGearFile;
  fight: { reportCode: string; fightId: number; encounterName: string };
}): RecordedGearSourceData {
  const { ref, spec, presetGear, fight } = args;
  if (presetGear.items.length !== SIM_ORDER.length) {
    throw new Error(
      `expected ${SIM_ORDER.length} preset gear items, got ${presetGear.items.length}`
    );
  }

  const logged: LoggedGear = {
    items: presetGear.items.map((slot, i) => {
      const item: LoggedGear["items"][number] = {
        id: slot.id ?? 0,
        slot: SIM_ORDER[i]!,
        gems: slot.gems ?? [],
      };
      if (slot.enchant) item.enchant = slot.enchant;
      return item;
    }),
    talentPointsByTree: talentPointsFor(spec),
    className: SPEC_CLASS_NAME[spec],
    provenance: {
      reportCode: fight.reportCode,
      fightId: fight.fightId,
      sourceID: -1,
    },
  };

  const summary: FightSummary = {
    reportCode: fight.reportCode,
    fightId: fight.fightId,
    encounterName: fight.encounterName,
    route: "ranked",
    confidence: 1,
  };

  return {
    fights: new Map([[characterFightKey(ref, spec), [summary]]]),
    gear: new Map([[fightGearKey(summary), logged]]),
  };
}

/** Documents the (spec, preset phase, maxPhase) triple a roster row was built at. */
export type RosterRow = {
  spec: SpecId;
  ref: CharacterRef;
  presetPhase: ContentPhase;
  maxPhase: ContentPhase;
};

/**
 * Roster per candidate-pool.md §7.a: one synthetic character per DPS spec
 * with a committed universe and EP weights (plan.md §2.5) — today ret and
 * feral. Pre-raid preset gear at maxPhase 2, per §7.a's default: a character
 * already in the phase-N BiS set at maxPhase N has nothing left to upgrade
 * to and cannot exercise recall.
 */
export const RET_SYNTHETIC_REF: CharacterRef = {
  region: "US",
  realm: "synthetic",
  name: "synthetic-ret",
};

export const FERAL_SYNTHETIC_REF: CharacterRef = {
  region: "US",
  realm: "synthetic",
  name: "synthetic-feral",
};

export const RET_SYNTHETIC_ROW: RosterRow = {
  spec: "ret",
  ref: RET_SYNTHETIC_REF,
  presetPhase: 1,
  maxPhase: 2,
};

export const FERAL_SYNTHETIC_ROW: RosterRow = {
  spec: "feral",
  ref: FERAL_SYNTHETIC_REF,
  presetPhase: 1,
  maxPhase: 2,
};

export const RET_SYNTHETIC_FIGHT = {
  reportCode: "synthetic-ret-preraid",
  fightId: 1,
  encounterName: "Synthetic fixture (ret pre-raid preset)",
};

export const FERAL_SYNTHETIC_FIGHT = {
  reportCode: "synthetic-feral-preraid",
  fightId: 1,
  encounterName: "Synthetic fixture (feral pre-raid preset)",
};
