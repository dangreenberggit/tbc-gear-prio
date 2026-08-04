/**
 * rankUpgrades — the deep module interface (PLAN.md §4).
 * Stages land behind this; callers only see RankInput → Ranking.
 */

import {
  fillEmptyCandidateGems,
  gemContext,
  type FillEmptyOpts,
  type GemContext,
} from "./candidate-gems.js";
import { migrateGemsToItem } from "./migrate-gems.js";
import { compose } from "./compose.js";
import {
  contentHashOf,
  ENGINE_VERSION,
  type HashedGearItem,
} from "./content-hash.js";
import { CUTOFF, type Cutoff } from "./cutoff.js";
import {
  buildStandingAssumptions,
  substitutionsFromMetaRepair,
  type Assumptions,
  type Substitution,
} from "./disclosure.js";
import { findMetaGemId, gemsForPhase, getGem, type GemEntry } from "./gems.js";
import { enchantAppliesToItem } from "./enchants.js";
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
  type SimSlotName,
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
  | "not-implemented"
  /**
   * A fault in our own code or in a dependency, rather than in the character,
   * the log or the sim: a slot-mapping disagreement, a store write that
   * failed. Distinct because reporting these as `sim-failed` tells an operator
   * the sim is broken and sends them to the wrong place.
   */
  | "internal";

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
  /**
   * Which sim slot the best delta came from, for the paired slots — the
   * `finger1` / `trinket2` name from `simSlotsForPoolSlot`, not an "a"/"b"
   * that leaves the reader guessing which ring is meant. Absent for
   * single-slot items.
   */
  slotChoice?: SimSlotName;
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
/** Hashed and disclosed from one place, so the two cannot drift apart. */
const PRESET_ID = "ret/p2.raid-sim-skeleton";

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
  // PLAN.md §8.2 / race standing assumption: default to the preset skeleton's
  // race (ret P2 is Blood Elf), not a hardcoded Human — WCL does not carry race.
  const race = input.race ?? raceFromSkeleton(deps.raidSimSkeleton);
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

  const gems = gemContext(
    deps.gemPalette ?? gemsForPhase(input.maxPhase),
    deps.epWeights
  );

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

  // Hashed here rather than at entry because the logged gear is the largest
  // input to every delta, and it is not known until readGear resolves. The
  // check still lands before the sim loop, which is the expensive part.
  const contentHash = contentHashOf({
    character: input.character,
    spec: input.spec,
    maxPhase: input.maxPhase,
    race,
    fight,
    gear: { items: logged.items as readonly HashedGearItem[] },
    candidates: candidates.map((e) => ({ itemId: e.itemId, slot: e.slot })),
    gemPaletteIds: gems.palette.map((g) => g.id),
    epWeights: deps.epWeights,
    presetId: PRESET_ID,
    skeleton: deps.raidSimSkeleton,
    iterations,
    seeds,
    simVersion: await deps.sim.version(),
    engineVersion: ENGINE_VERSION,
  });

  const cached = await deps.store.get<Ranking>(rankingCacheKey(contentHash));
  if (cached) {
    // A hit runs no sim, and ends here so a caller that opened a progress view
    // always gets a terminal event (PLAN.md §4 as amended by ADR-0019 — the
    // original "fires once" assumed a hash computable before the gear read).
    onProgress?.({ stage: "ranking" });
    return cached;
  }

  // Dedupe handle for the job API (PLAN.md §7 payoff 2): the row is keyed by
  // the same hash, so a second caller can attach rather than start a rival run.
  const job = await deps.store.job.create({ contentHash, input });
  await deps.store.job.update(job.id, { status: "running" });

  // One catch for every exit after the row exists, rather than one per throw
  // site: a stranded `running` row is a job the Phase 2 API would attach to
  // and wait on forever, and per-site handling means the next throw added
  // below re-opens that hole silently (ticket 29).
  try {
    return await rankAfterJobCreated();
  } catch (err) {
    // Best-effort: if the store is the thing that is broken, this update fails
    // too. Swallowing its error keeps the original failure — the one that
    // explains what actually went wrong — as what the caller sees.
    try {
      await deps.store.job.update(job.id, {
        status: "error",
        errorKind: err instanceof RankError ? err.kind : "internal",
        errorDetail: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // deliberately ignored — see above
    }
    throw err;
  }

  async function rankAfterJobCreated(): Promise<Ranking> {
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
    const simSkips: {
      itemId: number;
      name: string;
      slot: string;
      reason: string;
    }[] = [];
    let done = 1;

    for (const entry of candidates) {
      const owned = equippedIds.has(entry.itemId);
      const slotNames = simSlotsForPoolSlot(entry.slot);
      let best: {
        deltaDps: number;
        stdev: number;
        slotChoice?: SimSlotName;
        setBonusNote?: string;
      } | null = null;

      for (let s = 0; s < slotNames.length; s++) {
        const slotName = slotNames[s]!;
        const slotIndex = SIM_ORDER.indexOf(slotName);
        // `continue` here would drop the candidate from the ranking silently —
        // the item just never appears, with no error and no substitution row.
        // Every ItemSlot resolves today, so reaching this means the mapping in
        // simSlotsForPoolSlot and slots-table.json disagree, which is a bug in
        // the table rather than anything about this character's gear.
        if (slotIndex < 0) {
          throw new Error(
            `slot mapping bug: ${entry.slot} -> ${slotName} is not in SIM_ORDER ` +
              `(item ${entry.itemId} ${entry.name})`
          );
        }
        const swapped = equipmentForCandidateSwap(
          equipment,
          slotIndex,
          entry.itemId,
          gems
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
          // Class-locked item effects (e.g. hunter set bonuses on mail) can panic
          // wowsimcli when equipped on ret — skip this slot attempt. Recorded
          // rather than swallowed: a candidate that never simmed must not be
          // indistinguishable from one that simmed badly.
          simSkips.push({
            itemId: entry.itemId,
            name: entry.name,
            slot: slotName,
            reason: err instanceof Error ? err.message : String(err),
          });
          continue;
        }
        const deltaDps = candObs.dps - baselineDps;
        const note = setBreakNote(equipment, slotIndex, entry.itemId);
        if (!best || deltaDps > best.deltaDps) {
          const next: {
            deltaDps: number;
            stdev: number;
            slotChoice?: SimSlotName;
            setBonusNote?: string;
          } = {
            deltaDps,
            stdev: candObs.stdev,
          };
          if (slotNames.length > 1) {
            next.slotChoice = slotName;
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

    const ranking: Ranking = {
      contentHash,
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
        presetId: PRESET_ID,
        standing: buildStandingAssumptions(race),
      },
      substitutions: [
        ...substitutionsFromMetaRepair(metaSwaps),
        ...simSkips.map((s) => ({
          field: `candidate ${s.itemId} (${s.slot})`,
          detail: `${s.name} was dropped from the ranking: the sim failed on this swap — ${s.reason}`,
        })),
      ],
      items: ranked,
    };

    await deps.store.put(rankingCacheKey(contentHash), ranking);
    await deps.store.job.update(job.id, {
      status: "done",
      result: ranking,
    });
    return ranking;
  }
}

/** Namespaced so a ranking blob cannot collide with another content-addressed value. */
function rankingCacheKey(contentHash: string): string {
  return `ranking:${contentHash}`;
}

function raceFromSkeleton(skeleton: RaidSimRequest): Race {
  const raw = (
    skeleton as {
      raid?: { parties?: Array<{ players?: Array<{ race?: string }> }> };
    }
  ).raid?.parties?.[0]?.players?.[0]?.race;
  if (raw && isRace(raw)) return raw;
  return "RaceHuman";
}

function isRace(value: string): value is Race {
  return (
    value === "RaceHuman" ||
    value === "RaceDwarf" ||
    value === "RaceNightElf" ||
    value === "RaceGnome" ||
    value === "RaceDraenei" ||
    value === "RaceOrc" ||
    value === "RaceUndead" ||
    value === "RaceTauren" ||
    value === "RaceTroll" ||
    value === "RaceBloodElf"
  );
}

function meetsCutoff(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): boolean {
  return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
}

/**
 * Exported for tests: they must exercise *this* function rather than a copy.
 * A hand-duplicated swap path in the test file silently dropped the
 * `fillOptsForSwap` argument and hid the whole unique/meta gem feature from
 * the suite — see `.scratch/carry-forward/issues/22-…`.
 */
export function equipmentForCandidateSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  gems: GemContext
): SimItemSpec[] {
  const swapped = swapItemAt(equipment, slotIndex, itemId, gems);
  const socketed: SocketedItem[] = swapped.map((spec) => ({
    itemId: spec.id ?? 0,
    gems: [...spec.gems],
  }));
  let repaired;
  try {
    repaired = repairMeta({
      items: socketed,
      epWeights: gems.weights,
      palette: gems.palette,
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
  gemCtx: GemContext
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    if (i !== slotIndex) return spec;
    const sameItem = spec.id === itemId;
    const gems = sameItem
      ? [...(spec.gems ?? [])]
      : fillEmptyCandidateGems(
          itemId,
          migrateGemsToItem(spec.gems ?? [], spec.id ?? 0, itemId),
          gemCtx.palette,
          gemCtx.weightRecord,
          fillOptsForSwap(equipment, slotIndex)
        );
    const out: SimItemSpec = { id: itemId, gems };
    // Bare worn slot → no enchant on the candidate (do not invent one), and
    // carry one only where the UI would: isEnchantable is slot-level, so on
    // its own it moves a 2H-only enchant onto a one-hander.
    if (spec.enchant && enchantAppliesToItem(spec.enchant, itemId)) {
      out.enchant = spec.enchant;
    }
    return out;
  });
}

function fillOptsForSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number
): FillEmptyOpts {
  const usedUnique = new Set<number>();
  const otherGemIds: number[] = [];
  for (let i = 0; i < equipment.length; i++) {
    if (i === slotIndex) continue;
    for (const id of equipment[i]?.gems ?? []) {
      if (!(id > 0)) continue;
      otherGemIds.push(id);
      if (getGem(id)?.unique) usedUnique.add(id);
    }
  }
  const wornGems = (equipment[slotIndex]?.gems ?? []).filter((id) => id > 0);
  const metaId = findMetaGemId([...otherGemIds, ...wornGems]);
  return {
    usedUnique,
    ...(metaId !== undefined ? { meta: { metaId, otherGemIds } } : {}),
  };
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
