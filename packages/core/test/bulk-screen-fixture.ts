/**
 * The shared feral-P2 fixture the bulk-screening seam tests drive `rankUpgrades`
 * with.
 *
 * Extracted from `bulk-screen-branch.test.ts` when `bulk-screen-fallback.test.ts`
 * needed the same setup (ticket 347's rider). Everything here is fixture
 * construction — real committed gear, EP weights, raid-sim skeleton and
 * candidate universe, plus a deterministic stand-in for the simulator. No
 * assertion lives in this file; what each test asserts stays in that test.
 *
 * The synthetic DPS is a function of the GEAR rather than of the whole request,
 * because that is the only way the two routes are comparable at all: the loop
 * hands its runner a fully composed `RaidSimRequest` while the bulk route hands
 * its runner an `EquipmentSpec` per candidate against one shared base request.
 * Reducing both to the equipped items makes "same gear, same DPS" true by
 * construction, which is the property a real simulator has.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { importForkUpgrades } from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

export type SimObservation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
};

export type RaidSimRequest = Readonly<Record<string, unknown>>;

export type BulkScreenCandidate = {
  index: number;
  gear: Readonly<Record<string, unknown>>;
};

export type BulkScreenRequest = {
  baseRequest: RaidSimRequest;
  candidates: readonly BulkScreenCandidate[];
  iterations: number;
  seed: number;
  signal?: AbortSignal;
};

export type BulkScreenResult = {
  baseline: SimObservation;
  rows: ReadonlyArray<{ index: number; observation: SimObservation }>;
  failures?: ReadonlyArray<{ indices: readonly number[]; reason: string }>;
};

export type SimRunOpts = { seed: number; iterations: number };

export type FightSummary = {
  reportCode: string;
  fightId: number;
  encounterName: string;
  killedAt?: string;
  route: "ranked" | "report-events";
  confidence: number;
};

export const SIM_VERSION = "v0.0.101";
export const ITERATIONS = 5000;

/**
 * The measured baseline gap, applied to the synthetic fixture so the two routes
 * disagree about the baseline exactly the way the real ones did. Loop baseline
 * 2246.99, screening probe 2181.67 (execution-ledger-local.md).
 */
export const LOOP_BASELINE_DPS = 2246.99;
export const BULK_BASELINE_DPS = 2181.67;
export const BASELINE_OFFSET = LOOP_BASELINE_DPS - BULK_BASELINE_DPS;

export const FERAL_CHAR = {
  region: "US" as const,
  realm: "dreamscythe",
  name: "shredzepelin",
};

export const FERAL_SUMMARY: FightSummary = {
  reportCode: "def456",
  fightId: 3,
  encounterName: "Hydross the Unstable",
  killedAt: "2026-07-01T00:00:00.000Z",
  route: "ranked",
  confidence: 1,
};

export const feralWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/feral/p1.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

export const feralSkeleton = JSON.parse(
  readFileSync(
    join(root, "data/presets/feral/p2.raid-sim-skeleton.json"),
    "utf8"
  )
) as RaidSimRequest;

/** The gear a request equips, as a stable string. */
export function gearFingerprint(items: unknown): string {
  const list = Array.isArray(items) ? items : [];
  return JSON.stringify(
    list.map((item) => {
      const spec = (item ?? {}) as {
        id?: number;
        gems?: number[];
        enchant?: number;
      };
      return [spec.id ?? 0, spec.enchant ?? 0, [...(spec.gems ?? [])]];
    })
  );
}

/** Pulls the equipped items out of a composed raid-sim request. */
export function equipmentOf(req: RaidSimRequest): unknown {
  const raid = (req as { raid?: { parties?: unknown[] } }).raid;
  const party = raid?.parties?.[0] as { players?: unknown[] } | undefined;
  const player = party?.players?.[0] as
    { equipment?: { items?: unknown[] } } | undefined;
  return player?.equipment?.items ?? [];
}

/**
 * A deterministic stand-in for the simulator: the same gear always prices the
 * same, so two runs of the same fixture are comparable by construction. Spread
 * is wide enough that rows land on both sides of the cutoff.
 */
export function syntheticDps(items: unknown, baseline: number): number {
  const canonical = gearFingerprint(items);
  let hash = 0;
  for (let i = 0; i < canonical.length; i++) {
    hash = (hash * 31 + canonical.charCodeAt(i)) | 0;
  }
  return baseline + ((hash >>> 0) % 20_000) / 100 - 40;
}

export type RankModule = {
  rankUpgrades: (
    input: Record<string, unknown>,
    deps: Record<string, unknown>
  ) => Promise<{
    complete: boolean;
    items: Array<{
      itemId: number;
      rank: number | null;
      deltaDps: number;
      belowCutoff: boolean;
      simmed?: boolean;
      setContext?: { rankableSetPotential?: number };
    }>;
    baseline: { dps: number };
    screeningFallbacks?: ReadonlyArray<{ candidates: number; reason: string }>;
    setBonuses?: Array<{
      setId: number;
      setName: string;
      threshold: number;
      packageItemIds: number[];
      packageDeltaDps: number;
      bonusDps?: number;
      unmeasured?: string;
    }>;
  }>;
};

export type SeamModule = {
  bulkScreenCacheKey: (req: BulkScreenRequest, simVersion: string) => string;
  simCacheKey: (
    req: RaidSimRequest,
    simVersion: string,
    opts: SimRunOpts
  ) => string;
  BulkScreenAbortedError: new () => Error;
  BulkScreenIntegrityError: new (message: string) => Error;
  RecordedSimRunner: new (
    simVersion: string,
    recordings: ReadonlyMap<string, SimObservation>,
    bulkRecordings?: ReadonlyMap<string, BulkScreenResult>
  ) => {
    version(): Promise<string>;
    run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation>;
    runBulkScreen?: (req: BulkScreenRequest) => Promise<BulkScreenResult>;
  };
};

export const loadSeam = () =>
  importForkUpgrades<SeamModule>("engine/seams/sim-runner.ts");

export const loadRank = () => importForkUpgrades<RankModule>("engine/rank.ts");

export const loadStore = () =>
  importForkUpgrades<{ MemoryStore: new () => Record<string, unknown> }>(
    "engine/seams/store.ts"
  );

/**
 * Everything `rankUpgrades` needs beyond a runner: the recorded gear source, the
 * committed candidate pool and the `input` the tests rank.
 */
export async function buildRankFixture(): Promise<{
  input: Record<string, unknown>;
  makeGearSource: () => unknown;
  pool: unknown;
}> {
  const gearMod = await importForkUpgrades<{
    RecordedGearSource: new (data: {
      fights: ReadonlyMap<string, FightSummary[]>;
      gear: ReadonlyMap<string, unknown>;
    }) => unknown;
    characterFightKey: (c: unknown, spec: string) => string;
    fightGearKey: (f: unknown) => string;
  }>("engine/seams/gear-source.ts");
  // The WCL mapping comes from `packages/core`, not the fork: the fork's engine
  // reads the page rather than a log, so its `slots.ts` carries `SIM_ORDER` but
  // no WCL mapper. Both sides share the same slot order, and this is fixture
  // construction — the mapper is not under test.
  const slotsMod = await import("../src/slots.js");
  const poolMod = await import("../src/pool.js");

  // The real committed feral P2 universe. `deps.pool` defaults to empty, so
  // without this a run completes honestly with zero rows and asserts nothing.
  const pool = poolMod.poolFromUniverse(
    JSON.parse(
      readFileSync(join(root, "data/universes/feral-p2.json"), "utf8")
    ) as Parameters<typeof poolMod.poolFromUniverse>[0]
  );

  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures/shredzepelin-cat.raw.json"), "utf8")
  ) as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{ sourceID: number; gear: unknown[] }>;
  };
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  const event = raw.combatant_info_events.find(
    (ev) => actors.get(ev.sourceID)?.name.toLowerCase() === "shredzepelin"
  );
  if (!event) throw new Error("shredzepelin not found in fixture");
  const mapped = slotsMod.mapWclGearToSim(
    event.gear as Parameters<typeof slotsMod.mapWclGearToSim>[0]
  );
  const loggedGear = {
    items: mapped.map((spec, i) => {
      const item: Record<string, unknown> = {
        id: spec.id ?? 0,
        slot: slotsMod.SIM_ORDER[i]!,
        gems: spec.gems,
      };
      if (spec.enchant) item.enchant = spec.enchant;
      return item;
    }),
    talentPointsByTree: [0, 45, 16] as [number, number, number],
    provenance: {
      reportCode: FERAL_SUMMARY.reportCode,
      fightId: FERAL_SUMMARY.fightId,
      sourceID: event.sourceID,
    },
  };

  const fightRef = {
    reportCode: FERAL_SUMMARY.reportCode,
    fightId: FERAL_SUMMARY.fightId,
  };
  const makeGearSource = () =>
    new gearMod.RecordedGearSource({
      fights: new Map([
        [gearMod.characterFightKey(FERAL_CHAR, "feral"), [FERAL_SUMMARY]],
      ]),
      gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
    });

  const input = {
    character: FERAL_CHAR,
    spec: "feral",
    maxPhase: 2,
    fight: fightRef,
    iterations: ITERATIONS,
    // One seed: paired replication re-sims through `deps.sim.run`, and these
    // tests are about the screening route, not the final pass.
    seeds: [11],
    // Wide enough that the set pieces reach the candidate set.
    candidateCap: 60,
  };

  return { input, makeGearSource, pool };
}

/** The stock deps every test passes, minus the runner. */
export async function baseDeps(): Promise<Record<string, unknown>> {
  const storeMod = await loadStore();
  return {
    store: new storeMod.MemoryStore(),
    clock: () => new Date("2026-07-26T12:00:00.000Z"),
    raidSimSkeleton: feralSkeleton,
    epWeights: feralWeights,
  };
}
