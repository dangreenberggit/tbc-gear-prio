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
import {
  capStateFrom,
  hitRegression,
  isHitDriven,
  statDeltaBetween,
  type CapState,
} from "./caps.js";
import { CUTOFF, meetsCutoff, type Cutoff } from "./cutoff.js";
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
import type { FightSummary, GearSource } from "./seams/gear-source.js";
import {
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
} from "./seams/sim-runner.js";
import type { Store } from "./seams/store.js";
import {
  assertUsableSeeds,
  DegenerateSeedsError,
  pairedReplicateSe,
  PAIRED_REPLICATE_TOP_N,
  usesPairedReplication,
} from "./se.js";
import { setBreakNote } from "./set-bonus.js";
import {
  computeSynergy,
  isBonusImplemented,
  nextMeasurableThreshold,
  selectPackage,
  setCounts,
  setLabel,
  SET_THRESHOLDS,
  type DpsSample,
  type IndividualDelta,
  type SetThreshold,
} from "./set-value.js";
import { getItem } from "./items.js";
import { classifySpec, matchesRequestedSpec, treeName } from "./spec.js";
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
  /**
   * The resolved fight's talents classify as a spec other than the one asked
   * for — the character's off-spec night (carry-forward 61). Refusing beats
   * ranking it: the sim would run tank gear against ret's preset and EP
   * weights and return a confident, wrong list with no error anywhere.
   */
  | "spec-mismatch"
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
  /** Every pinned upstream gear set equipping this item, any stage. */
  curatedSets?: string[];
  /**
   * The current-stage sets behind a `BiS` tag. Rendered instead of a bare
   * `BiS` pill so the badge names the stage it is BiS *for* — upstream scopes
   * BiS per stage and there is no absolute BiS (carry-forward 47 §1).
   */
  bisSets?: string[];
  /**
   * Most of this item's stat gain is hit rating, and the player is under the
   * hit cap. Not modelling stat combinations is correct per §2's scoping rule
   * (§4); this flag is here because correct-but-misleading is still
   * misleading — the item stops being an upgrade once the cap is crossed.
   */
  hitDriven?: boolean;
  /**
   * This item is an upgrade that nonetheless *loses* hit rating while the
   * player is under the cap — the mirror of `hitDriven`, and the case the
   * report used to flag a hit gap and then quietly widen it (carry-forward 47).
   * `lost` is the rating given up; `gapAfter` is the resulting distance to cap.
   */
  hitRegression?: { lost: number; gapAfter: number };
  setBonusNote?: string;
  owned?: boolean;
  belowCutoff: boolean;
  /**
   * Present when this item's set has any measured/attempted `SetBonusValue`
   * (spec §3) — including the crossing case, so a renderer can say "completes
   * 2pc (included in delta)" instead of silently having nothing to say.
   */
  setContext?: SetContext;
};

export type SetContext = {
  setId: number;
  setName: string;
  piecesWornBefore: number;
  piecesAfterSwap: number;
  nextThreshold: SetThreshold | null;
  /** True ⇒ the bonus is already inside `deltaDps`; no `prospectiveBonusDps`. */
  crossesThreshold: boolean;
  prospectiveBonusDps?: number;
};

export type SetBonusValue = {
  setId: number;
  setName: string;
  threshold: SetThreshold;
  /** Pieces of this set worn in the logged baseline. */
  piecesWorn: number;
  /** The added pieces, canonical-slot order. */
  packageItemIds: number[];
  packageDeltaDps: number;
  bonusDps?: number;
  se?: number;
  unmeasured?: "not-implemented-in-sim" | "insufficient-pieces" | "sim-failed";
};

/**
 * Which fight answered this run, and by which route (PLAN.md §4).
 *
 * `route` is the part with teeth. A caller cannot otherwise tell a ranked
 * resolve from the report-events fallback, and the two carry different
 * confidence — the fallback walks a report's fights rather than a ranked
 * parse, so it can land on a fight the character performed unusually in.
 * Surfacing it is what lets a UI say which one it got.
 */
export type ResolvedFight = {
  reportCode: string;
  fightId: number;
  /** Absent when the source did not describe this fight — see `killedAt`. */
  encounterName?: string;
  /**
   * Absent when the capture cannot supply one. Optional rather than `""`,
   * because an empty string is indistinguishable from a real value that
   * failed to format, and a UI rendering it would print a blank where it
   * meant "unknown". A raw report carries fight times as offsets from the
   * report's own start, so deriving a wall clock needs a field
   * `wcl_probe.py --raw-out` does not persist — inventing one would put a
   * fabricated date on a fixture whose whole job is being real.
   */
  killedAt?: string;
  route: FightSummary["route"];
  /** Carried from `FightSummary` so the caller can disclose it (§5.4). */
  confidence?: number;
  /** Carried from `FightSummary`; absent means never measured, not zero. */
  salvationUptime?: number;
};

export type Ranking = {
  contentHash: string;
  cutoff: Cutoff;
  /** Which fight answered, and by which route. */
  fight: ResolvedFight;
  baseline: { dps: number; stdev: number; metaAdjusted: boolean };
  assumptions: Assumptions;
  substitutions: Substitution[];
  /** Required by §4 — a Ranking you can't audit is not a Ranking. */
  caps: CapState;
  items: RankedItem[];
  /** Completion-package synergy per (set, threshold) — spec §2.2. */
  setBonuses?: SetBonusValue[];
};

/** The best of a candidate's slot attempts, before it becomes a `RankedItem`. */
type BestSwap = {
  deltaDps: number;
  stdev: number;
  /**
   * The winning slot's composed request, kept so paired replication can re-sim
   * *this* candidate under further seeds without recomposing the swap.
   * Recomposing is a second construction of the same object, and a chance for
   * the replicated arm to measure something the ranked delta never came from.
   */
  request: RaidSimRequest;
  slotChoice?: SimSlotName;
  /** The SIM_ORDER index the winning attempt swapped, for set-package selection. */
  slotIndex: number;
  setBonusNote?: string;
  hitDriven: boolean;
  hitRegression: { lost: number; gapAfter: number } | null;
};

const DEFAULT_ITERATIONS = 3000;
/**
 * Five distinct seeds, because `usesPairedReplication` is what switches §10
 * Phase 2 on and it keys off `seeds.length > 1` (`se.ts`). A single default
 * seed left the whole paired-replicate path implemented, tested and dead: no
 * caller passes `seeds`, so `replicateTopItems` returned at its first line on
 * every real run and the shortlist shipped the Phase 1 `independent` SE that
 * §10:705 records as overstating a shared-seed delta's variance.
 *
 * These are the five seed values `docs/five-seed-spread.json` measured
 * spread at — that file ran at 5000 iterations, not this module's 3000, so
 * only the seed values transfer, not the SE evidence at this configuration.
 */
const DEFAULT_SEEDS = [11, 22, 33, 44, 55];
/**
 * Hashed and disclosed from one place, so the two cannot drift apart. Now
 * per-spec, which keeps that property: both call sites read this one function,
 * so a spec added here reaches the content hash and the assumptions drawer
 * together or not at all.
 */
const PRESET_ID_BY_SPEC: Record<SpecId, string> = {
  ret: "ret/p2.raid-sim-skeleton",
  feral: "feral/p2.raid-sim-skeleton",
};

function presetIdFor(spec: SpecId): string {
  return PRESET_ID_BY_SPEC[spec];
}

export async function rankUpgrades(
  input: RankInput,
  deps: Deps,
  onProgress?: (p: Progress) => void
): Promise<Ranking> {
  onProgress?.({ stage: "resolving" });
  const fights = await deps.gear.findFights(input.character, input.spec);
  const maybeResolved = resolveFight(fights, input.fight);
  if (!maybeResolved) {
    throw new RankError(
      "no-qualifying-fight",
      `no qualifying fights for ${input.character.name}`
    );
  }
  // Rebound non-optional: the guard above narrows `maybeResolved`, but that
  // narrowing does not reach the nested closure that builds the `Ranking`.
  const resolved: ResolvedFight = maybeResolved;
  const fight = { reportCode: resolved.reportCode, fightId: resolved.fightId };

  onProgress?.({ stage: "reading-gear" });
  // Never a cache read here — ADR-0019 hashes what this returns. The point
  // budget is defended one layer down; see CachingGearSource.
  const logged = await deps.gear.readGear(fight);

  // carry-forward 61: this is the check the resolution path was skipping.
  //
  // Refuse only on a *positive* reading that the fight is some other build.
  // Two shapes qualify, and the second is the one ticket 04 actually hit:
  // `matches: false` with a named `detected`, and `unsupported-spec` — where
  // the class is known and the favoured tree is known and simply is not this
  // spec's. A protection paladin classifies as `unsupported-spec`, not as a
  // named other spec (protection has no spec home today), so keying the
  // refusal on `detected` alone would never fire for the case that motivated
  // the ticket.
  //
  // Everything else ranks as before: no class from the source,
  // `unsupported-class`, an `ambiguous` split, or feral's
  // `needs-form-uptime` are all absence of evidence, not evidence against.
  if (logged.className !== undefined) {
    const classification = classifySpec(
      logged.className,
      logged.talentPointsByTree
    );
    const match = matchesRequestedSpec(classification, input.spec);
    const otherSpec =
      match.detected ??
      (!classification.ok && classification.reason === "unsupported-spec"
        ? `a ${treeName(logged.className, classification.treeIndex)} build`
        : undefined);
    if (!match.matches && otherSpec !== undefined) {
      throw new RankError(
        "spec-mismatch",
        `${input.character.name}'s ${resolved.encounterName} fight reads as ` +
          `${otherSpec}, not ${input.spec} (talents ` +
          `${logged.talentPointsByTree.join("/")}) — pick another fight with ` +
          `--fight, or rank the spec they actually played`
      );
    }
  }

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
  // Before the job row and before any sim: a caller's bad seeds are not worth
  // a stranded `running` row or a wasted baseline run.
  try {
    assertUsableSeeds(seeds);
  } catch (err) {
    if (err instanceof DegenerateSeedsError) {
      throw new RankError("internal", err.message);
    }
    throw err;
  }
  const seed = seeds[0] ?? DEFAULT_SEEDS[0]!;
  const runOpts = { seed, iterations };

  onProgress?.({ stage: "building-pool" });
  const equippedIds = new Set(
    equipment.map((s) => s.id).filter((id): id is number => !!id)
  );
  const candidates = filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter(
    (e) => !isKaelTempLegendary(e.itemId)
  );

  // Read once and shared with the sim cache below, so the version a result is
  // filed under is always the version it was hashed with.
  const simVersion = await deps.sim.version();

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
    presetId: presetIdFor(input.spec),
    skeleton: deps.raidSimSkeleton,
    iterations,
    seeds,
    simVersion,
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

  /**
   * Sims completed so far. Shared by the candidate loop and the replication
   * pass, which are sibling closures — a second counter would let the two
   * halves of one progress bar disagree.
   */
  let simsDone = 0;
  let totalSimsForProgress = 0;

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
    // Counted here rather than left to run past a progress bar that already
    // said "done". The extra seeds re-sim the top N *and* the baseline; the
    // first seed's runs are cache hits, which is why it is `seeds.length - 1`.
    const replicaSims = usesPairedReplication(seeds)
      ? (seeds.length - 1) *
        (1 + Math.min(PAIRED_REPLICATE_TOP_N, candidates.length))
      : 0;
    const totalSims = 1 + candidates.length + replicaSims;
    totalSimsForProgress = totalSims;
    onProgress?.({ stage: "simming", done: 0, total: totalSims });
    // Only `deps.sim.run` belongs inside this catch. A store read or write
    // that fails is an `internal` fault, and labelling it `sim-failed` sends
    // an operator to the wrong subsystem.
    let observation = await readCachedSim(deps, request, simVersion, runOpts);
    if (!observation) {
      try {
        observation = await deps.sim.run(request, runOpts);
      } catch (err) {
        throw new RankError(
          "sim-failed",
          err instanceof Error ? err.message : String(err)
        );
      }
      await cacheSimResult(deps, request, simVersion, runOpts, observation);
    }
    simsDone = 1;
    onProgress?.({ stage: "simming", done: simsDone, total: totalSims });

    const baselineDps = observation.dps;
    const ranked: RankedItem[] = [];
    /**
     * The request behind each ranked row's delta, keyed by item id. Paired
     * replication re-runs exactly these under the remaining seeds; sorting
     * `ranked` reorders the rows but never this association.
     */
    const winningRequests = new Map<number, RaidSimRequest>();
    const simSkips: {
      itemId: number;
      name: string;
      slot: string;
      reason: string;
    }[] = [];
    /**
     * Every candidate's winning single-swap delta, by item id — the input
     * `selectPackage` (set-value.ts §2.2 step 1) needs to rank same-set
     * candidates by their own measured `deltaDps`. Populated alongside `best`
     * in the candidate loop below.
     */
    const individualDeltasByItemId = new Map<number, IndividualDelta>();

    // From the repaired layout, which is what the sim actually ran. Hoisted
    // above the loop because `hitDriven` prices each candidate against it.
    const talentsString = talentsStringFromRequest(request);
    const caps = capStateFrom(equipment, socketed, {
      assumedRace: race,
      spec: input.spec,
      ...(talentsString !== undefined ? { talentsString } : {}),
    });

    for (const entry of candidates) {
      const owned = equippedIds.has(entry.itemId);
      const slotNames = simSlotsForPoolSlot(entry.slot);
      let best: BestSwap | null = null;

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
        // A paired slot tries both placements and keeps the better one, so
        // without this an item already worn in finger2 gets swapped over
        // finger1 as well — pricing a *second copy* the game will not equip,
        // and shipping it as an upgrade for gear the player already has on
        // (carry-forward 46). Skipping leaves the identity swap as the only
        // outcome for a worn item, which is what every unpaired slot already
        // does. Written against the equipment array rather than special-cased
        // to fingers so trinkets and any later paired slot inherit it.
        const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
        if (wornAt >= 0 && wornAt !== slotIndex) continue;
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
        // Outside the catch below: only a failing *sim* may skip a candidate.
        // A failing store read routed in there would push a simSkips row
        // blaming the sim, drop the item, and return a ranking one place
        // short with no error anywhere.
        let candObs = await readCachedSim(deps, candReq, simVersion, runOpts);
        if (!candObs) {
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
          await cacheSimResult(deps, candReq, simVersion, runOpts, candObs);
        }
        const deltaDps = candObs.dps - baselineDps;
        const note = setBreakNote(equipment, slotIndex, entry.itemId);
        if (!best || deltaDps > best.deltaDps) {
          const statDelta = statDeltaBetween(equipment, swapped);
          const next: BestSwap = {
            deltaDps,
            stdev: candObs.stdev,
            request: candReq,
            slotIndex,
            hitDriven: isHitDriven(statDelta, caps.hit, { deltaDps }),
            hitRegression: hitRegression(statDelta, caps.hit, { deltaDps }),
          };
          if (slotNames.length > 1) {
            next.slotChoice = slotName;
          }
          if (note) next.setBonusNote = note;
          best = next;
        }
      }

      simsDone += 1;
      onProgress?.({ stage: "simming", done: simsDone, total: totalSims });

      if (!best) continue;

      // Recorded before the cutoff/rank logic below: package selection needs
      // every candidate's own measured delta, including below-cutoff rows —
      // a set piece that is individually a downgrade can still be the best
      // available filler for a completion package (V0b: all four Thunderheart
      // singles were negative, and the package was still worth +91.68 DPS).
      individualDeltasByItemId.set(entry.itemId, {
        itemId: entry.itemId,
        slotIndex: best.slotIndex,
        deltaDps: best.deltaDps,
        se: best.stdev / Math.sqrt(iterations),
      });

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
        ...(entry.curatedSets ? { curatedSets: entry.curatedSets } : {}),
        ...(entry.bisSets ? { bisSets: entry.bisSets } : {}),
        belowCutoff,
      };
      if (entry.sources) item.sources = entry.sources;
      if (best.hitDriven) item.hitDriven = true;
      if (best.hitRegression) item.hitRegression = best.hitRegression;
      if (best.slotChoice) item.slotChoice = best.slotChoice;
      if (best.setBonusNote) item.setBonusNote = best.setBonusNote;
      if (owned) item.owned = true;
      ranked.push(item);
      winningRequests.set(entry.itemId, best.request);
    }

    /**
     * Package-level sim failures (Finding 5): a whole completion package has
     * no single item to blame, and its `setId` must never masquerade as an
     * `itemId` in the per-candidate `simSkips` shape — so this is a distinct
     * collection, named by set + threshold, folded into `substitutions`
     * alongside `simSkips` below rather than forced into its shape.
     */
    const packageSimSkips: {
      setId: number;
      setName: string;
      threshold: SetThreshold;
      reason: string;
    }[] = [];

    const setBonuses = await buildSetBonuses(
      deps,
      candidates,
      equipment,
      gems,
      race,
      input,
      individualDeltasByItemId,
      { dps: baselineDps, se: observation.stdev / Math.sqrt(iterations) },
      simVersion,
      runOpts,
      packageSimSkips
    );
    if (setBonuses.length > 0) applySetContext(ranked, setBonuses, equipment);

    onProgress?.({ stage: "ranking" });
    // Sorted first so replication can pick the contested top of the list, then
    // sorted again below — replication rewrites the very `deltaDps` this order
    // is built from, so ranking before it would freeze the ordering the
    // refinement exists to correct.
    ranked.sort((a, b) => b.deltaDps - a.deltaDps);
    await replicateTopItems(ranked, winningRequests, baselineDps);
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
      fight: resolved,
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
        presetId: presetIdFor(input.spec),
        standing: buildStandingAssumptions(race),
      },
      caps,
      substitutions: [
        ...substitutionsFromMetaRepair(metaSwaps),
        ...simSkips.map((s) => ({
          field: `candidate ${s.itemId} (${s.slot})`,
          detail: `${s.name} was dropped from the ranking: the sim failed on this swap — ${s.reason}`,
        })),
        ...packageSimSkips.map((s) => ({
          field: `${s.setName} ${s.threshold}pc completion package`,
          detail:
            `the ${s.setName} ${s.threshold}pc completion package could not ` +
            `be measured: the sim failed — ${s.reason}`,
        })),
      ],
      items: ranked,
      ...(setBonuses.length > 0 ? { setBonuses } : {}),
    };

    await deps.store.put(rankingCacheKey(contentHash), ranking);
    await deps.store.job.update(job.id, {
      status: "done",
      result: ranking,
    });
    return ranking;
  }

  /**
   * PLAN.md §10 Phase 2, with the method's rationale in `se.ts`.
   *
   * Three constraints that are easy to break and silent when broken:
   *
   * - Each seed's baseline and candidate must share that seed; pairing across
   *   seeds folds baseline wobble into the spread.
   * - `deltaDps` becomes the replicated mean, because that is what this SE
   *   describes. The caller re-sorts afterwards.
   * - The top N comes from above-cutoff rows, not a positional slice, so the
   *   5× budget lands on the shortlist rather than on rows the cutoff hides.
   */
  async function replicateTopItems(
    ranked: RankedItem[],
    winningRequests: ReadonlyMap<number, RaidSimRequest>,
    baselineDps: number
  ): Promise<void> {
    if (!usesPairedReplication(seeds)) return;

    const top = ranked
      .filter((item) => !item.belowCutoff)
      .slice(0, PAIRED_REPLICATE_TOP_N);
    if (top.length === 0) return;
    // Baseline once per seed, shared by every replicated candidate under that
    // seed — the pairing, and also what keeps this 5×(8+1) sims rather than
    // 5×8 baselines on top.
    const baselineBySeed = new Map<number, number>();
    for (const s of seeds) {
      baselineBySeed.set(s, (await simFor(request, s)).dps);
      bumpProgress(s);
    }

    for (const item of top) {
      const candReq = winningRequests.get(item.itemId);
      // A ranked row always has a winning request; a missing one would mean
      // `ranked` and `winningRequests` fell out of step, which is our bug and
      // not something to paper over with an `independent` SE that reads as a
      // deliberate choice.
      if (!candReq) {
        throw new RankError(
          "internal",
          `no recorded request for ranked item ${item.itemId} (${item.name}); ` +
            `paired replication cannot re-sim it`
        );
      }
      const deltas: number[] = [];
      for (const s of seeds) {
        const obs = await simFor(candReq, s);
        deltas.push(obs.dps - baselineBySeed.get(s)!);
        bumpProgress(s);
      }
      item.se = pairedReplicateSe(deltas);
      item.seMethod = "paired-replicate";
      item.deltaDps = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
      item.deltaPct =
        baselineDps === 0 ? 0 : (item.deltaDps / baselineDps) * 100;
      // Re-evaluated against the mean rather than left at the first seed's
      // verdict: a row whose replicated estimate crosses the cutoff must not
      // keep a `belowCutoff` computed from a number no longer reported.
      item.belowCutoff = !meetsCutoff(item.deltaDps, item.deltaPct, CUTOFF);
    }
  }

  /**
   * The first seed's re-runs are cache hits the candidate loop already counted,
   * so only the additional seeds advance the bar — otherwise `done` overshoots
   * the `total` computed from `seeds.length - 1`.
   */
  function bumpProgress(seedForRun: number): void {
    if (seedForRun === seeds[0]) return;
    simsDone += 1;
    onProgress?.({
      stage: "simming",
      done: simsDone,
      total: totalSimsForProgress,
    });
  }

  /** One sim at one seed, through the same cache-then-run path as the loop. */
  async function simFor(
    req: RaidSimRequest,
    seedForRun: number
  ): Promise<SimObservation> {
    const opts = { seed: seedForRun, iterations };
    const cached = await readCachedSim(deps, req, simVersion, opts);
    if (cached) return cached;
    let obs: SimObservation;
    try {
      obs = await deps.sim.run(req, opts);
    } catch (err) {
      throw new RankError(
        "sim-failed",
        err instanceof Error ? err.message : String(err)
      );
    }
    await cacheSimResult(deps, req, simVersion, opts, obs);
    return obs;
  }
}

/**
 * Completion-package synergy (spec §2.2/§2.3): for every set with at least
 * one candidate present in this run's pool, and every threshold above the
 * pieces currently worn, build the completion package, sim it once through
 * the shared cache, and record `SetBonusValue`. Cost target §2.4: at most
 * ~4 extra sims per run — bounded by only building for sets with candidate
 * presence and skipping `not-implemented-in-sim` thresholds entirely.
 */
async function buildSetBonuses(
  deps: Deps,
  candidates: readonly PoolEntry[],
  equipment: readonly SimItemSpec[],
  gems: GemContext,
  race: Race,
  input: RankInput,
  individualDeltasByItemId: ReadonlyMap<number, IndividualDelta>,
  baseline: DpsSample,
  simVersion: string,
  runOpts: SimRunOpts,
  packageSimSkips: {
    setId: number;
    setName: string;
    threshold: SetThreshold;
    reason: string;
  }[]
): Promise<SetBonusValue[]> {
  // Which sets actually have a pool candidate this run — §2.4's "do not build
  // packages for sets with no candidate presence".
  const setIdsWithCandidates = new Set<number>();
  for (const entry of candidates) {
    const setId = getItem(entry.itemId)?.setId;
    if (setId != null) setIdsWithCandidates.add(setId);
  }
  if (setIdsWithCandidates.size === 0) return [];

  const wornCounts = setCounts(equipment);
  const slotIndexForPoolEntry = (entry: PoolEntry): number | undefined => {
    for (const slotName of simSlotsForPoolSlot(entry.slot)) {
      const idx = SIM_ORDER.indexOf(slotName);
      if (idx >= 0) return idx;
    }
    return undefined;
  };

  const results: SetBonusValue[] = [];
  for (const setId of setIdsWithCandidates) {
    const piecesWorn = wornCounts.get(setId) ?? 0;
    const label = setLabel(
      equipment,
      setId,
      candidates.map((entry) => entry.itemId)
    );
    let twoPieceBonus: number | undefined;

    for (const threshold of SET_THRESHOLDS) {
      if (threshold <= piecesWorn) continue;

      if (!isBonusImplemented(setId, threshold)) {
        // §2.3: never burn a sim measuring a bonus known to be absent.
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: [],
          packageDeltaDps: 0,
          unmeasured: "not-implemented-in-sim",
        });
        continue;
      }

      const selection = selectPackage(
        setId,
        threshold,
        equipment,
        candidates,
        [...individualDeltasByItemId.values()],
        slotIndexForPoolEntry
      );
      if (!selection.ok) {
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: [],
          packageDeltaDps: 0,
          unmeasured: "insufficient-pieces",
        });
        continue;
      }

      const addedPieces = selection.addedPieces;
      // Applied sequentially, one slot at a time, through the same helper
      // every single-candidate swap uses — spec §2.2 step 1's byte-identical
      // gem/enchant policy.
      let packageEquipment: SimItemSpec[] = [...equipment];
      for (const piece of addedPieces) {
        packageEquipment = equipmentForCandidateSwap(
          packageEquipment,
          piece.slotIndex,
          piece.itemId,
          gems
        );
      }
      const packageRequest = compose(deps.raidSimSkeleton, {
        name: input.character.name.toLowerCase(),
        race,
        equipment: packageEquipment,
      });

      let packageObs = await readCachedSim(
        deps,
        packageRequest,
        simVersion,
        runOpts
      );
      if (!packageObs) {
        try {
          packageObs = await deps.sim.run(packageRequest, runOpts);
        } catch (err) {
          packageSimSkips.push({
            setId,
            setName: label,
            threshold,
            reason: err instanceof Error ? err.message : String(err),
          });
          results.push({
            setId,
            setName: label,
            threshold,
            piecesWorn,
            packageItemIds: addedPieces.map((p) => p.itemId),
            packageDeltaDps: 0,
            unmeasured: "sim-failed",
          });
          continue;
        }
        await cacheSimResult(
          deps,
          packageRequest,
          simVersion,
          runOpts,
          packageObs
        );
      }

      const addedPieceSamples = addedPieces.map((p) => {
        const individual = individualDeltasByItemId.get(p.itemId);
        return {
          deltaDps: individual?.deltaDps ?? 0,
          se: individual?.se ?? 0,
        };
      });
      const packageSample: DpsSample = {
        dps: packageObs.dps,
        se: packageObs.stdev / Math.sqrt(runOpts.iterations),
      };
      const synergy = computeSynergy({
        baseline,
        packageSample,
        addedPieceSamples,
        ...(threshold === 4 && twoPieceBonus !== undefined
          ? { twoPieceBonus }
          : {}),
      });
      if (threshold === 2) twoPieceBonus = synergy.bonusDps;

      results.push({
        setId,
        setName: label,
        threshold,
        piecesWorn,
        packageItemIds: addedPieces.map((p) => p.itemId),
        packageDeltaDps: synergy.packageDeltaDps,
        bonusDps: synergy.bonusDps,
        se: synergy.se,
      });
    }
  }
  return results;
}

/**
 * Populate `RankedItem.setContext` for every candidate whose item belongs to
 * a set with any attempted `SetBonusValue` (spec §3) — including the
 * crossing case, so a renderer can say "completes 2pc (included in delta)".
 */
function applySetContext(
  ranked: RankedItem[],
  setBonuses: readonly SetBonusValue[],
  equipment: readonly SimItemSpec[]
): void {
  const wornCounts = setCounts(equipment);
  const bonusesBySet = new Map<number, SetBonusValue[]>();
  for (const b of setBonuses) {
    const list = bonusesBySet.get(b.setId) ?? [];
    list.push(b);
    bonusesBySet.set(b.setId, list);
  }

  for (const item of ranked) {
    const setId = getItem(item.itemId)?.setId;
    if (setId == null) continue;
    const bonusesForSet = bonusesBySet.get(setId);
    if (!bonusesForSet) continue;

    const piecesWornBefore = wornCounts.get(setId) ?? 0;
    // The candidate's own item joins the set on this swap: worn count + 1,
    // unless it was already worn (then the count is unchanged).
    const piecesAfterSwap = item.owned
      ? piecesWornBefore
      : piecesWornBefore + 1;
    // Whether *this swap* crosses a threshold is judged against the nearest
    // measurable threshold from *before* the swap — that is the bonus the
    // swap could newly deliver. `nextThreshold` recorded on the context is
    // the forward-looking one from *after* the swap (spec §2.3/§3, finding
    // 3): the smallest implemented threshold still ahead, for a "needs N
    // more" prompt. The two are deliberately evaluated from different counts.
    const thresholdBeforeSwap = nextMeasurableThreshold(
      setId,
      piecesWornBefore
    );
    const crossesThreshold =
      thresholdBeforeSwap !== null && piecesAfterSwap >= thresholdBeforeSwap;
    const nextThreshold = nextMeasurableThreshold(setId, piecesAfterSwap);

    const setContext: SetContext = {
      setId,
      // The set's SetBonusValue rows already resolved this name against the
      // package pieces, which is the only place it is findable for a set the
      // player wears none of. Recomputing from worn gear alone regresses to
      // the bare `set <id>` fallback.
      setName:
        bonusesForSet[0]?.setName ?? setLabel(equipment, setId, [item.itemId]),
      piecesWornBefore,
      piecesAfterSwap,
      nextThreshold,
      crossesThreshold,
    };
    if (!crossesThreshold && nextThreshold !== null) {
      const matching = bonusesForSet.find((b) => b.threshold === nextThreshold);
      if (matching?.bonusDps !== undefined) {
        setContext.prospectiveBonusDps = matching.bonusDps;
      }
    }
    item.setContext = setContext;
  }
}

/**
 * Which fight answers this run (PLAN.md §5.2, §10 fallback route).
 *
 * Ranked kills win when there are any: a ranked parse is a fight the character
 * was measured on, so it is the better sample of how they play. Only when
 * there is no ranked kill does the run fall through to a `report-events`
 * summary — gear read by walking a report's fights, which is how a character
 * who has never ranked gets an answer at all instead of
 * `RankError('no-qualifying-fight')`.
 *
 * That fallback is not hypothetical. `slamaltman` has ten kills on the SSC
 * encounters and **zero** `encounterRankings` entries, verified 2026-08-05
 * against the live API; the same query returns 19 ranks for a leaderboard
 * character, so the empty result is this character rather than a broken query.
 * Re-check with `.scratch/` probes recorded in docs/verification-log.md.
 *
 * An explicit `RankInput.fight` overrides both — a caller naming a fight has
 * already made this choice — and its route is reported as whatever the summary
 * list says about that fight, or `report-events` when the list does not
 * describe it. Exported for direct unit testing: the preference order is the
 * whole behaviour, and it is invisible from a `Ranking` that only ever holds
 * the winner.
 */
export function resolveFight(
  fights: readonly FightSummary[],
  requested?: FightRef
): ResolvedFight | undefined {
  if (requested) {
    const match = fights.find(
      (f) =>
        f.reportCode === requested.reportCode && f.fightId === requested.fightId
    );
    return match
      ? summaryToResolved(match)
      : {
          ...requested,
          // A caller-named fight the summary list does not describe was not
          // reached through a ranking, so calling it `ranked` would overstate
          // what we know about it.
          route: "report-events",
        };
  }
  const ranked = fights.find((f) => f.route === "ranked");
  const chosen = ranked ?? fights[0];
  return chosen ? summaryToResolved(chosen) : undefined;
}

function summaryToResolved(f: FightSummary): ResolvedFight {
  return {
    reportCode: f.reportCode,
    fightId: f.fightId,
    ...(f.encounterName ? { encounterName: f.encounterName } : {}),
    ...(f.killedAt ? { killedAt: f.killedAt } : {}),
    route: f.route,
    confidence: f.confidence,
    ...(f.salvationUptime === undefined
      ? {}
      : { salvationUptime: f.salvationUptime }),
  };
}

/** Namespaced so a ranking blob cannot collide with another content-addressed value. */
function rankingCacheKey(contentHash: string): string {
  return `ranking:${contentHash}`;
}

/**
 * PLAN.md §11: a sim result for a given request + version can never change.
 * simCacheKey already folds in seed and iterations, so two runs that differ
 * only in which candidates they consider share every request they have in
 * common — which is what makes a partial re-run cheap.
 */
async function readCachedSim(
  deps: Deps,
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts
): Promise<SimObservation | undefined> {
  return asInternal(() =>
    deps.store.get<SimObservation>(simStoreKey(req, simVersion, opts))
  );
}

/** Namespaced, and built in one place so the read and the write cannot drift. */
function simStoreKey(
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts
): string {
  return `sim:${simCacheKey(req, simVersion, opts)}`;
}

/**
 * Split from the read so the caller can keep `deps.sim.run` inside its
 * sim-failed catch while this stays outside it: a failing store write is an
 * `internal` fault, and reporting it as `sim-failed` sends an operator to the
 * wrong subsystem.
 */
async function cacheSimResult(
  deps: Deps,
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts,
  observation: SimObservation
): Promise<void> {
  await asInternal(() =>
    deps.store.put(simStoreKey(req, simVersion, opts), observation)
  );
}

/**
 * The store is ours, not the character's, the log's or the sim's, so its
 * failures carry the one kind that says so. Without this they escape as bare
 * `Error`s, miss the CLI's `instanceof RankError` branch (`cli.ts`), and print
 * a stack trace where an operator expects `internal: …` — which is why the
 * kind was declared but never constructed.
 */
async function asInternal<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw new RankError(
      "internal",
      err instanceof Error ? err.message : String(err)
    );
  }
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

/**
 * `compose` copies race/name/equipment onto the skeleton's player slot but
 * leaves `talentsString` untouched (compose.ts), so the composed request
 * still carries whatever the pinned preset skeleton set — this reads that
 * same field back out for `capStateFrom` (carry-forward 33).
 */
function talentsStringFromRequest(request: RaidSimRequest): string | undefined {
  const raw = (
    request as {
      raid?: {
        parties?: Array<{ players?: Array<{ talentsString?: string }> }>;
      };
    }
  ).raid?.parties?.[0]?.players?.[0]?.talentsString;
  return typeof raw === "string" ? raw : undefined;
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
