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
import { isEnchantable } from "./items.js";
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
import { isKaelTempLegendary } from "./kael-temp.js";
import {
  filterPoolByPhase,
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

export type RankedItem = {
  rank: number | null;
  itemId: number;
  name: string;
  slot: PoolEntry["slot"];
  slotChoice?: "a" | "b";
  source: ItemSource;
  /** Full provenance when the pool row carried multiple sources. */
  sources?: ItemSource[];
  deltaDps: number;
  deltaPct: number;
  se: number;
  seMethod: "independent" | "paired-replicate";
  bisTags: Array<"BiS" | "Alt" | "Realistic">;
  setBonusNote?: string;
  owned?: boolean;
  belowCutoff: boolean;
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
  const candidates = filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter(
    (e) => !isKaelTempLegendary(e.itemId)
  );

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
    let best: {
      deltaDps: number;
      stdev: number;
      slotChoice?: "a" | "b";
      setBonusNote?: string;
    } | null = null;

    for (let s = 0; s < slotNames.length; s++) {
      const slotName = slotNames[s]!;
      const slotIndex = SIM_ORDER.indexOf(slotName);
      if (slotIndex < 0) continue;
      const swapped = equipmentForCandidateSwap(
        equipment,
        slotIndex,
        entry.itemId,
        palette,
        epWeightRecord,
        deps.epWeights
      );
      const candReq = compose(deps.raidSimSkeleton, {
        name: input.character.name.toLowerCase(),
        race,
        equipment: swapped,
      });
      let candObs;
      try {
        candObs = await deps.sim.run(candReq, runOpts);
      } catch {
        // Class-locked item effects (e.g. hunter set bonuses on mail) can panic
        // wowsimcli when equipped on ret — skip this slot attempt.
        continue;
      }
      const deltaDps = candObs.dps - baselineDps;
      const note = setBreakNote(equipment, slotIndex, entry.itemId);
      if (!best || deltaDps > best.deltaDps) {
        const next: {
          deltaDps: number;
          stdev: number;
          slotChoice?: "a" | "b";
          setBonusNote?: string;
        } = {
          deltaDps,
          stdev: candObs.stdev,
        };
        if (slotNames.length > 1) {
          next.slotChoice = s === 0 ? "a" : "b";
        }
        if (note) next.setBonusNote = note;
        best = next;
      }
    }

    done += 1;
    onProgress?.({ stage: "simming", done, total: totalSims });

    if (!best) continue;

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
      // PLAN.md §10 Phase 1: independent SE of the mean = stdev / √n
      se: best.stdev / Math.sqrt(iterations),
      seMethod: "independent",
      bisTags: entry.bisTags ?? [],
      belowCutoff,
    };
    if (entry.sources) item.sources = entry.sources;
    if (best.slotChoice) item.slotChoice = best.slotChoice;
    if (best.setBonusNote) item.setBonusNote = best.setBonusNote;
    if (owned) item.owned = true;
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

function equipmentForCandidateSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  palette: readonly GemEntry[],
  epWeightRecord: Readonly<Record<string, number>>,
  epWeights: Readonly<Record<string, number>> | readonly number[]
): SimItemSpec[] {
  const swapped = swapItemAt(
    equipment,
    slotIndex,
    itemId,
    palette,
    epWeightRecord
  );
  const socketed: SocketedItem[] = swapped.map((spec) => ({
    itemId: spec.id ?? 0,
    gems: [...spec.gems],
  }));
  let repaired;
  try {
    repaired = repairMeta({
      items: socketed,
      epWeights,
      palette,
    });
  } catch (err) {
    if (err instanceof MetaUnsolvableError) {
      throw new RankError("meta-unsolvable", err.message);
    }
    throw err;
  }
  return applyRepairedGems(swapped, repaired.items);
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
    const sameItem = spec.id === itemId;
    const out: SimItemSpec = {
      id: itemId,
      gems: sameItem
        ? [...(spec.gems ?? [])]
        : fillCandidateGems(itemId, palette, epWeights),
    };
    if (spec.enchant && isEnchantable(itemId)) {
      out.enchant = spec.enchant;
    }
    return out;
  });
}

function applyRepairedGems(
  equipment: readonly SimItemSpec[],
  socketed: SocketedItem[]
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    const repaired = socketed[i];
    if (!repaired || !spec.id) return spec;
    return { ...spec, gems: [...repaired.gems] };
  });
}
