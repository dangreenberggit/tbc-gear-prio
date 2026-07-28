/**
 * rankUpgrades — the deep module interface (PLAN.md §4).
 * Stages land behind this; callers only see RankInput → Ranking.
 */

import { fillCandidateGems } from "./candidate-gems.js";
import { compose } from "./compose.js";
import { CUTOFF, type Cutoff } from "./cutoff.js";
import {
  buildStandingAssumptions,
  substitutionsFromMetaRepair,
  type Assumptions,
  type Substitution,
} from "./disclosure.js";
import { gemsForPhase, type GemEntry } from "./gems.js";
import { getItem, isEnchantable } from "./items.js";
import { isKaelTempLegendary } from "./kael-temp.js";
import {
  equipmentFromLoggedGear,
  socketedItemsFromLoggedGear,
} from "./logged-gear.js";
import {
  MetaUnsolvableError,
  repairMeta,
  type MetaRepairSwap,
  type SocketedItem,
} from "./meta-repair.js";
import {
  filterPoolByPhase,
  prefilterPool,
  simSlotsForPoolSlot,
  type ItemSource,
  type PoolEntry,
} from "./pool.js";
import type { GearSource } from "./seams/gear-source.js";
import type { RaidSimRequest, SimRunner } from "./seams/sim-runner.js";
import type { Store } from "./seams/store.js";
import { setBreakNote } from "./set-bonus.js";
import { SIM_ORDER, type SimItemSpec } from "./slots.js";
import type {
  CharacterRef,
  ContentPhase,
  FightRef,
  Race,
  SpecId,
} from "./types.js";

export type RankInput = {
  character: CharacterRef;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight?: FightRef;
  race?: Race;
  iterations?: number;
  seeds?: number[];
  fullPool?: boolean;
};

export type Deps = {
  gear: GearSource;
  sim: SimRunner;
  store: Store;
  clock: () => Date;
  /** Golden RaidSimRequest skeleton for this spec/tier (CLI loads from disk). */
  raidSimSkeleton: RaidSimRequest;
  /** Sparse or dense EP weights for meta repair (PLAN.md §9). */
  epWeights: Readonly<Record<string, number>> | readonly number[];
  /** Optional override; defaults to gemsForPhase(input.maxPhase). */
  gemPalette?: readonly GemEntry[];
  /** Curated (or test) candidate pool — filtered by maxPhase inside. */
  pool?: readonly PoolEntry[];
};

export type Progress =
  | { stage: "resolving" }
  | { stage: "reading-gear" }
  | { stage: "composing" }
  | { stage: "building-pool" }
  | { stage: "simming"; done: number; total: number }
  | { stage: "ranking" };

export type RankErrorKind =
  | "character-not-found"
  | "no-qualifying-fight"
  | "gear-unreadable"
  | "meta-unsolvable"
  | "sim-failed"
  | "wcl-budget-exhausted"
  | "not-implemented";

export class RankError extends Error {
  readonly kind: RankErrorKind;

  constructor(kind: RankErrorKind, message: string) {
    super(message);
    this.name = "RankError";
    this.kind = kind;
  }
}

export type DualEquipSlot = "finger1" | "finger2" | "trinket1" | "trinket2";

export type RankedItem = {
  rank: number | null;
  itemId: number;
  name: string;
  slot: PoolEntry["slot"];
  slotChoice?: "a" | "b";
  replacesEquipped?: {
    slot: DualEquipSlot;
    itemId: number;
    name: string;
  };
  alternateSlot?: {
    choice: "a" | "b";
    deltaDps: number;
    deltaPct: number;
    replacesName: string;
  };
  source: ItemSource;
  deltaDps: number;
  deltaPct: number;
  se: number;
  seMethod: "independent" | "paired-replicate";
  bisTags: Array<"BiS" | "Alt" | "Realistic">;
  setBonusNote?: string;
  owned?: boolean;
  belowCutoff: boolean;
  magnitudeWarning?: boolean;
};

export type Ranking = {
  contentHash: string;
  cutoff: Cutoff;
  baseline: { dps: number; stdev: number; metaAdjusted: boolean };
  assumptions: Assumptions;
  substitutions: Substitution[];
  items: RankedItem[];
};

const DEFAULT_ITERATIONS = 3000;
const DEFAULT_SEEDS = [42];
/** Flag weapon downgrades whose sim loss exceeds this share of baseline DPS. */
export const MAGNITUDE_LOSS_PCT = 0.025;

export async function rankUpgrades(
  input: RankInput,
  deps: Deps,
  onProgress?: (p: Progress) => void
): Promise<Ranking> {
  onProgress?.({ stage: "resolving" });
  const fights = await deps.gear.findFights(input.character, input.spec);
  const fight =
    input.fight ??
    (fights[0]
      ? { reportCode: fights[0].reportCode, fightId: fights[0].fightId }
      : undefined);
  if (!fight) {
    throw new RankError(
      "no-qualifying-fight",
      `no qualifying fights for ${input.character.name}`
    );
  }

  onProgress?.({ stage: "reading-gear" });
  const logged = await deps.gear.readGear(fight);

  onProgress?.({ stage: "composing" });
  const race = input.race ?? "RaceHuman";
  let socketed: SocketedItem[] = socketedItemsFromLoggedGear(logged);
  let metaAdjusted = false;
  let metaSwaps: MetaRepairSwap[] = [];
  try {
    const repaired = repairMeta({
      items: socketed,
      epWeights: deps.epWeights,
      palette: deps.gemPalette ?? gemsForPhase(input.maxPhase),
    });
    socketed = repaired.items;
    metaAdjusted = repaired.metaAdjusted;
    metaSwaps = repaired.swaps;
  } catch (err) {
    if (err instanceof MetaUnsolvableError) {
      throw new RankError("meta-unsolvable", err.message);
    }
    throw err;
  }

  const palette = deps.gemPalette ?? gemsForPhase(input.maxPhase);
  const epWeightRecord = weightRecord(deps.epWeights);

  const equipment = applyRepairedGems(
    equipmentFromLoggedGear(logged),
    socketed
  );
  const request = compose(deps.raidSimSkeleton, {
    name: input.character.name.toLowerCase(),
    race,
    equipment,
  });

  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const seeds = input.seeds ?? DEFAULT_SEEDS;
  const seed = seeds[0] ?? DEFAULT_SEEDS[0]!;
  const runOpts = { seed, iterations };

  onProgress?.({ stage: "building-pool" });
  const equippedIds = new Set(
    equipment.map((s) => s.id).filter((id): id is number => !!id)
  );
  const candidates = prefilterPool(
    filterPoolByPhase(deps.pool ?? [], input.maxPhase),
    input.fullPool ? { fullPool: true } : {}
  ).filter((e) => !isKaelTempLegendary(e.itemId));

  const totalSims = 1 + candidates.length;
  onProgress?.({ stage: "simming", done: 0, total: totalSims });
  let observation;
  try {
    observation = await deps.sim.run(request, runOpts);
  } catch (err) {
    throw new RankError(
      "sim-failed",
      err instanceof Error ? err.message : String(err)
    );
  }
  onProgress?.({ stage: "simming", done: 1, total: totalSims });

  const baselineDps = observation.dps;
  const ranked: RankedItem[] = [];
  let done = 1;

  for (const entry of candidates) {
    const owned = equippedIds.has(entry.itemId);
    const slotNames = simSlotsForPoolSlot(entry.slot);
    type SlotSim = {
      deltaDps: number;
      stdev: number;
      slotIndex: number;
      slotChoice?: "a" | "b";
      setBonusNote?: string;
    };
    const slotResults: SlotSim[] = [];

    for (let s = 0; s < slotNames.length; s++) {
      const slotName = slotNames[s]!;
      const slotIndex = SIM_ORDER.indexOf(slotName);
      if (slotIndex < 0) continue;

      // Same item already in this slot: identity. Do not gem-strip and re-sim
      // (that falsely reports large losses on socketed owned gear).
      if (equipment[slotIndex]?.id === entry.itemId) {
        const next: SlotSim = {
          deltaDps: 0,
          stdev: observation.stdev,
          slotIndex: s,
        };
        if (slotNames.length > 1) {
          next.slotChoice = s === 0 ? "a" : "b";
        }
        slotResults.push(next);
        continue;
      }

      const swapped = swapItemAt(
        equipment,
        slotIndex,
        entry.itemId,
        palette,
        epWeightRecord
      );
      const candReq = compose(deps.raidSimSkeleton, {
        name: input.character.name.toLowerCase(),
        race,
        equipment: swapped,
      });
      let candObs;
      try {
        candObs = await deps.sim.run(candReq, runOpts);
      } catch (err) {
        throw new RankError(
          "sim-failed",
          err instanceof Error ? err.message : String(err)
        );
      }
      const deltaDps = candObs.dps - baselineDps;
      const note = setBreakNote(equipment, slotIndex, entry.itemId);
      const next: SlotSim = {
        deltaDps,
        stdev: candObs.stdev,
        slotIndex: s,
      };
      if (slotNames.length > 1) {
        next.slotChoice = s === 0 ? "a" : "b";
      }
      if (note) next.setBonusNote = note;
      slotResults.push(next);
    }

    done += 1;
    onProgress?.({ stage: "simming", done, total: totalSims });

    if (slotResults.length === 0) continue;

    const best = slotResults.reduce((a, b) =>
      b.deltaDps > a.deltaDps ? b : a
    );

    const deltaPct =
      baselineDps === 0 ? 0 : (best.deltaDps / baselineDps) * 100;
    const belowCutoff = !meetsCutoff(best.deltaDps, deltaPct, CUTOFF);
    const item: RankedItem = {
      rank: null,
      itemId: entry.itemId,
      name: entry.name,
      slot: entry.slot,
      source: entry.source,
      deltaDps: best.deltaDps,
      deltaPct,
      se: best.stdev,
      seMethod: "independent",
      bisTags: entry.bisTags ?? [],
      belowCutoff,
    };
    if (best.slotChoice) item.slotChoice = best.slotChoice;
    if (best.setBonusNote) item.setBonusNote = best.setBonusNote;
    if (owned) item.owned = true;
    if (weaponMagnitudeWarning(best.deltaDps, baselineDps, entry.slot)) {
      item.magnitudeWarning = true;
    }

    if (slotNames.length > 1) {
      const winSlotName = slotNames[best.slotIndex]!;
      const winEqIdx = SIM_ORDER.indexOf(winSlotName);
      const winEqId = equipment[winEqIdx]?.id;
      if (winEqId) {
        item.replacesEquipped = {
          slot: winSlotName as DualEquipSlot,
          itemId: winEqId,
          name: getItem(winEqId)?.name ?? String(winEqId),
        };
      }

      if (slotResults.length === 2) {
        const runnerUp = slotResults.find((r) => r !== best)!;
        const gap = Math.abs(best.deltaDps - runnerUp.deltaDps);
        const runnerUpPct =
          baselineDps === 0 ? 0 : (runnerUp.deltaDps / baselineDps) * 100;
        const runnerUpRelevant =
          meetsCutoff(runnerUp.deltaDps, runnerUpPct, CUTOFF) ||
          gap <= observation.stdev;
        if (gap >= CUTOFF.absDps && runnerUpRelevant && runnerUp.slotChoice) {
          const altSlotName = slotNames[runnerUp.slotIndex]!;
          const altEqIdx = SIM_ORDER.indexOf(altSlotName);
          const altEqId = equipment[altEqIdx]?.id;
          item.alternateSlot = {
            choice: runnerUp.slotChoice,
            deltaDps: runnerUp.deltaDps,
            deltaPct: runnerUpPct,
            replacesName: altEqId
              ? (getItem(altEqId)?.name ?? String(altEqId))
              : altSlotName,
          };
        }
      }
    }

    ranked.push(item);
  }

  onProgress?.({ stage: "ranking" });
  ranked.sort((a, b) => b.deltaDps - a.deltaDps);
  let rank = 1;
  for (const item of ranked) {
    if (item.belowCutoff) {
      item.rank = null;
    } else {
      item.rank = rank;
      rank += 1;
    }
  }

  void deps.store;
  void deps.clock;

  return {
    contentHash: `phase1-baseline:${input.character.name.toLowerCase()}`,
    cutoff: CUTOFF,
    baseline: {
      dps: observation.dps,
      stdev: observation.stdev,
      metaAdjusted,
    },
    assumptions: {
      maxPhase: input.maxPhase,
      seeds,
      iterations,
      race,
      presetId: "ret/p2.raid-sim-skeleton",
      standing: buildStandingAssumptions(race),
    },
    substitutions: substitutionsFromMetaRepair(metaSwaps),
    items: ranked,
  };
}

function weightRecord(
  weights: Readonly<Record<string, number>> | readonly number[]
): Readonly<Record<string, number>> {
  if (Array.isArray(weights)) {
    const out: Record<string, number> = {};
    for (let i = 0; i < weights.length; i++) {
      out[String(i)] = weights[i] ?? 0;
    }
    return out;
  }
  return weights as Readonly<Record<string, number>>;
}

function meetsCutoff(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): boolean {
  return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
}

export function weaponMagnitudeWarning(
  deltaDps: number,
  baselineDps: number,
  slot: PoolEntry["slot"]
): boolean {
  if (slot !== "weapon" || deltaDps >= 0 || baselineDps <= 0) return false;
  return Math.abs(deltaDps) > baselineDps * MAGNITUDE_LOSS_PCT;
}

function swapItemAt(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  palette: readonly GemEntry[],
  epWeights: Readonly<Record<string, number>>
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    if (i !== slotIndex) return spec;
    const out: SimItemSpec = {
      id: itemId,
      gems: fillCandidateGems(itemId, palette, epWeights),
    };
    if (spec.enchant && isEnchantable(itemId)) {
      out.enchant = spec.enchant;
    }
    return out;
  });
}

function applyRepairedGems(
  equipment: ReturnType<typeof equipmentFromLoggedGear>,
  socketed: SocketedItem[]
): ReturnType<typeof equipmentFromLoggedGear> {
  return equipment.map((spec, i) => {
    const repaired = socketed[i];
    if (!repaired || !spec.id) return spec;
    return { ...spec, gems: [...repaired.gems] };
  });
}
