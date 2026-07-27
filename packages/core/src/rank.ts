/**
 * rankUpgrades — the deep module interface (PLAN.md §4).
 * Stages land behind this; callers only see RankInput → Ranking.
 */

import { compose } from "./compose.js";
import { CUTOFF, type Cutoff } from "./cutoff.js";
import { gemsForPhase, type GemEntry } from "./gems.js";
import {
  equipmentFromLoggedGear,
  socketedItemsFromLoggedGear,
} from "./logged-gear.js";
import {
  MetaUnsolvableError,
  repairMeta,
  type SocketedItem,
} from "./meta-repair.js";
import type { GearSource } from "./seams/gear-source.js";
import type { RaidSimRequest, SimRunner } from "./seams/sim-runner.js";
import type { Store } from "./seams/store.js";
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

export type Ranking = {
  contentHash: string;
  cutoff: Cutoff;
  baseline: { dps: number; stdev: number; metaAdjusted: boolean };
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
  try {
    const repaired = repairMeta({
      items: socketed,
      epWeights: deps.epWeights,
      palette: deps.gemPalette ?? gemsForPhase(input.maxPhase),
    });
    socketed = repaired.items;
    metaAdjusted = repaired.metaAdjusted;
  } catch (err) {
    if (err instanceof MetaUnsolvableError) {
      throw new RankError("meta-unsolvable", err.message);
    }
    throw err;
  }

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

  onProgress?.({ stage: "simming", done: 0, total: 1 });
  let observation;
  try {
    observation = await deps.sim.run(request, { seed, iterations });
  } catch (err) {
    throw new RankError(
      "sim-failed",
      err instanceof Error ? err.message : String(err)
    );
  }
  onProgress?.({ stage: "simming", done: 1, total: 1 });
  onProgress?.({ stage: "ranking" });

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
  };
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
