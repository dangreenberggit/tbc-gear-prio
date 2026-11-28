/**
 * Set-bonus NET value (ticket 467), on the fork's ported engine: the slow cases
 * kept here (476-A, 476-B, 476-D, 492-J, 497-A, 502-C, 511-L2, 512-N, 863-L,
 * 870-A, 872-L, 872-R). The rest of this suite lives in the fork under
 * `ui/features/upgrades/model/` (the `rank_set_*` tests and `engine/*.test.ts`).
 *
 * Drives `rankUpgrades` through the fork engine with a fully controlled sim
 * whose DPS is `BASE + Σ itemValue[id] + active implemented set bonuses by piece
 * count`, plus any interaction terms a case adds (ticket 511; set-less copies
 * are valued as their originals and count toward no set). Because that model is
 * exact, the corrected `bonusDpsNet`, the measured
 * broken-bonus value `B` (`brokenSetValues`), and the `applyView` credit/sort
 * are asserted against literals derived from the model by hand — not recomputed
 * the way the code does.
 *
 * The seam is the module interface (`rankUpgrades` + `applyView` /
 * `rankableSetPotential`) through the fork engine, plus the pure view functions
 * directly (PLAN.md §Testing). Real item ids are used as VALUES so `getItem`
 * resolves; no type is derived from a JSON import.
 *
 * Skips when the fork clone is absent (`vendor/` is gitignored, main checkout
 * only) — same contract as the other fork-gated suites.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { SIM_ORDER, type SimOrderName } from "../src/slots.js";
import {
  forkPresent,
  importForkUpgrades,
  statsOnlyItemEp,
  tracedRank,
  zeroHitStats,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

// Every feral run reads hit (ticket 830), so each meta repair searches with the
// hit term, and several cases run 15-27 s alone, near the 30 s default.
vi.setConfig({ testTimeout: 120_000 });

/* ------------------------------------------------------------------ *
 * The controlled fixture
 * ------------------------------------------------------------------ */

const SIM_VERSION = "v0.0.101";
const ITERATIONS = 5000;
const BASE_DPS = 3000;

// Real set-piece ids (Thunderheart Harness 676, Malorne Harness 640), each in a
// distinct SIM_ORDER slot so a package can add several at once.
const THUNDERHEART = {
  head: 31039, // Thunderheart Cover
  shoulder: 31048, // Thunderheart Pauldrons
  chest: 31042, // Thunderheart Chestguard
  hands: 31034, // Thunderheart Gauntlets
  legs: 31044, // Thunderheart Leggings
  wrist: 34444, // Thunderheart Wristguards
  waist: 34556, // Thunderheart Waistguard
  feet: 34573, // Thunderheart Treads
} as const;
const MALORNE = {
  head: 29098, // Stag-Helm of Malorne
  shoulder: 29100, // Mantle of Malorne
  hands: 29097, // Gauntlets of Malorne
  legs: 29099, // Greaves of Malorne
  chest: 29096, // Breastplate of Malorne
} as const;
// Nordrassil Harness 641: only its 4pc is implemented in the sim.
const NORDRASSIL = {
  chest: 30222, // Nordrassil Chestplate
  hands: 30223, // Nordrassil Handgrips
  head: 30228, // Nordrassil Headdress
  legs: 30229, // Nordrassil Feral-Kilt
  shoulder: 30230, // Nordrassil Feral-Mantle
} as const;
// Non-set items for the neutral vacate replacements, per slot.
const NEUTRAL = {
  head: [10150],
  shoulder: [10153],
  hands: [10140, 10149],
  legs: [8289, 8300],
  chest: [8283, 8290],
} as const;

// The DPS model's per-item values and per-set bonuses.
const V_TH = 100; // each Thunderheart candidate's own stat value
const B2_TH = 50; // Thunderheart 2pc bonus
const B4_TH = 80; // Thunderheart 4pc bonus
const V_NEUTRAL = 120; // each neutral candidate's own value
const B2_MAL = 40; // Malorne 2pc bonus == the broken-bonus value B under test
// Malorne 4pc. The eight original cases wear at most 3 Malorne, so it never
// fires there; the 476 cases wear 4 and 5.
const B4_MAL = 70;

/**
 * A set's model bonuses by piece count. `b3`, `b6` and `b8` are for the
 * ticket 512 cases (3-piece sets, and a set with bonuses above 4 pieces).
 */
type SetBonusTable = Record<
  number,
  { b2: number; b3?: number; b4: number; b6?: number; b8?: number }
>;

const SET_BONUSES: SetBonusTable = {
  676: { b2: B2_TH, b4: B4_TH },
  640: { b2: B2_MAL, b4: B4_MAL },
};
const ITEM_VALUE = new Map<number, number>([
  ...Object.values(THUNDERHEART).map((id) => [id, V_TH] as const),
  ...Object.values(NEUTRAL)
    .flat()
    .map((id) => [id, V_NEUTRAL] as const),
]);

type RaidSimRequest = Readonly<Record<string, unknown>>;
type SimObservation = {
  dps: number;
  stdev: number;
  iterationsDone: number;
  simVersion: string;
  allValues?: readonly number[];
};
type SimRunOpts = { seed: number; iterations: number; saveAllValues?: boolean };

const feralSkeleton = JSON.parse(
  readFileSync(
    join(root, "data/presets/feral/p2.raid-sim-skeleton.json"),
    "utf8"
  )
) as RaidSimRequest;
const feralWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/feral/p1.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

/** Equipped item ids of a composed request, in slot order. */
function equippedIds(req: RaidSimRequest): number[] {
  const raid = (req as { raid?: { parties?: unknown[] } }).raid;
  const party = raid?.parties?.[0] as { players?: unknown[] } | undefined;
  const player = party?.players?.[0] as
    { equipment?: { items?: Array<{ id?: number }> } } | undefined;
  return (player?.equipment?.items ?? []).map((i) => i?.id ?? 0);
}

/**
 * The fork's set-less copy id offset (`SET_LESS_ID_OFFSET`, ticket 511). A
 * literal here so the model does not read the code under test; the fork's
 * `ui/features/upgrades/model/engine/set-less-copies.test.ts` ("a copy swaps
 * the id, keeps the stats and drops the set") checks that the two agree.
 */
const COPY_OFFSET = 1_000_000;

/** The error a compose that `composeFailsWhen` matches throws (ticket 872). */
const MODEL_COMPOSE_ERROR = "the model compose failed on purpose";

/** The error every failed sim of `failWhen` gives (`runScenario`). */
const MODEL_SIM_ERROR = "the model sim failed on purpose";

/** The ranking's set-phase lines: a set bonus, or a set the screen kept. */
const setSkipLines = (ranking: ForkRanking) =>
  ranking.substitutions.filter((s) => /( set bonus| set)$/.test(s.field));

/**
 * The line for a worn-set ladder sim that failed (ticket 863), with any stack
 * trace after the error (`Scenario.failStack`).
 */
const wornSetFailedLine = {
  field: expect.stringMatching(/ set$/),
  detail: expect.stringMatching(
    new RegExp(
      `^The value of the .+ set on your gear was not fully measured, because its sim failed\\.$`
    )
  ),
  error: expect.stringMatching(
    new RegExp(`^${MODEL_SIM_ERROR}(\n[\\s\\S]*)?$`)
  ),
};

/**
 * The fork's set-kept copy id offset (`SET_KEPT_ID_OFFSET`, ticket 512): a copy
 * that keeps its set. A literal for the same reason as `COPY_OFFSET`; the
 * same fork test checks that the two agree.
 */
const SET_KEPT_OFFSET = 2_000_000;

/**
 * A term the model adds when every listed item is worn, standing in for stats
 * that are worth more together than apart. Keyed by original ids: a set-less
 * copy counts as its original here.
 */
type Interaction = { ids: readonly number[]; dps: number };

/**
 * The controlled DPS: base + own values + active set bonuses + interaction
 * terms + id effects. A set-less copy (id in [`COPY_OFFSET`,
 * `SET_KEPT_OFFSET`)) has its original's value and belongs to no set. A
 * set-kept copy (id at or above `SET_KEPT_OFFSET`) has its original's value
 * and set. An id effect stands in for a Go effect keyed by item id
 * (`itemEffects[eq.ID]`, `RegisterPvPGloveMod`): only the real id gets it,
 * never a copy.
 */
function modelDps(
  ids: readonly number[],
  getSetId: (id: number) => number | undefined,
  itemValue: ReadonlyMap<number, number> = ITEM_VALUE,
  setBonuses: SetBonusTable = SET_BONUSES,
  interactions: readonly Interaction[] = [],
  idEffects: ReadonlyMap<number, number> = new Map()
): number {
  let dps = BASE_DPS;
  const setCounts = new Map<number, number>();
  const worn = new Set<number>();
  for (const id of ids) {
    if (!id) continue;
    const setKept = id >= SET_KEPT_OFFSET;
    const setLess = !setKept && id >= COPY_OFFSET;
    const original = setKept
      ? id - SET_KEPT_OFFSET
      : setLess
        ? id - COPY_OFFSET
        : id;
    worn.add(original);
    dps += itemValue.get(original) ?? 0;
    if (!setKept && !setLess) dps += idEffects.get(id) ?? 0;
    const setId = setLess ? undefined : getSetId(original);
    if (setId != null) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
  }
  for (const [setId, count] of setCounts) {
    const bonus = setBonuses[setId];
    if (!bonus) continue;
    if (count >= 2) dps += bonus.b2;
    if (count >= 3) dps += bonus.b3 ?? 0;
    if (count >= 4) dps += bonus.b4;
    if (count >= 6) dps += bonus.b6 ?? 0;
    if (count >= 8) dps += bonus.b8 ?? 0;
  }
  for (const term of interactions) {
    if (term.ids.every((id) => worn.has(id))) dps += term.dps;
  }
  return dps;
}

/**
 * The model's active set bonuses in the sim's own form, `<set> (<n>pc)`
 * (`GetActiveSetBonusNames`, sim/core/item_sets.go): a count is a bonus when
 * the set's table names it, whatever its value. Real pieces and set-kept
 * copies count; set-less copies do not.
 */
function modelSetBonusNames(
  ids: readonly number[],
  getSetId: (id: number) => number | undefined,
  setBonuses: SetBonusTable = SET_BONUSES
): string[] {
  const setCounts = new Map<number, number>();
  for (const id of ids) {
    if (!id) continue;
    const setKept = id >= SET_KEPT_OFFSET;
    if (!setKept && id >= COPY_OFFSET) continue;
    const setId = getSetId(setKept ? id - SET_KEPT_OFFSET : id);
    if (setId != null) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
  }
  const names: string[] = [];
  for (const [setId, count] of [...setCounts].sort((a, b) => a[0] - b[0])) {
    const bonus = setBonuses[setId];
    if (!bonus) continue;
    for (const [n, value] of [
      [2, bonus.b2],
      [3, bonus.b3],
      [4, bonus.b4],
      [6, bonus.b6],
      [8, bonus.b8],
    ] as const) {
      if (value !== undefined && count >= n)
        names.push(`set ${setId} (${n}pc)`);
    }
  }
  return names;
}

const FERAL_CHAR = { region: "US" as const, realm: "test", name: "netcase" };
const FERAL_SUMMARY = {
  reportCode: "net001",
  fightId: 1,
  encounterName: "Test Dummy",
  killedAt: "2026-09-20T00:00:00.000Z",
  route: "ranked" as const,
  confidence: 1,
};

type WornSpec = { id: number; slot: SimOrderName };
type PoolSpec = {
  itemId: number;
  slot:
    | "finger"
    | "head"
    | "shoulder"
    | "chest"
    | "wrist"
    | "hands"
    | "waist"
    | "legs"
    | "feet";
};

type Scenario = {
  worn: WornSpec[];
  pool: PoolSpec[];
  measureSetBonuses?: boolean;
  /** Overrides the module's per-item values for this scenario only. */
  itemValue?: ReadonlyMap<number, number>;
  /** Overrides the module's per-set bonuses for this scenario only. */
  setBonuses?: SetBonusTable;
  /** Interaction terms for this scenario only (ticket 511). */
  interactions?: readonly Interaction[];
  /** Id effects for this scenario only (tickets 511 and 512, G2). */
  idEffects?: ReadonlyMap<number, number>;
  /** The fake sim throws for a request whose equipped ids (and options) match. */
  failWhen?: (ids: readonly number[], opts: SimRunOpts) => boolean;
  /**
   * Text after the thrown error, by sim call, as a Go panic's stack trace
   * differs from sim to sim (ticket 863).
   */
  failStack?: (call: number) => string;
  /** `Deps.setScreenMode` (ticket 511, K5ON): "on" or "off"; absent means off. */
  setScreenMode?: string;
  /** A store shared between runs, to see what the ranking cache serves. */
  store?: Record<string, unknown>;
  /** The 0-based fake sim call during which the run's Stop fires (ticket 533). */
  stopDuringCall?: number;
  /**
   * `RankInput.seeds`; absent means one seed, 11 (ticket 533).
   * `"engine-default"` sends no `seeds`, so the engine picks its default
   * (ticket 530).
   */
  seeds?: number[] | "engine-default";
  /** `RankInput.iterations`; absent means `ITERATIONS` (ticket 530). */
  iterations?: number;
  /**
   * The fake runner also answers `activeSetBonuses` from the scenario's set
   * table, as the worker runner answers it from the sim (ticket 644).
   */
  reportsSetBonuses?: boolean;
  /** The 0-based `activeSetBonuses` call during which the run's Stop fires. */
  stopDuringSetBonusRead?: number;
  /** The fake's `activeSetBonuses` rejects for gear whose equipped ids match. */
  failSetBonusReadWhen?: (ids: readonly number[]) => boolean;
  /**
   * Gives each request a database with a row for every worn item except
   * these, so a copy of one of them cannot be built (ticket 869).
   */
  databaseWithout?: readonly number[];
  /**
   * For gear whose equipped ids are given, the items whose database rows are
   * left out, so a copy of one of them cannot be built (ticket 872).
   */
  databaseOmits?: (ids: readonly number[]) => readonly number[];
  /** Composing a request for gear whose equipped ids match throws (ticket 872). */
  composeFailsWhen?: (ids: readonly number[]) => boolean;
  /**
   * `Deps.concurrency`. With it the fake sim answers a macrotask later, so
   * sims the engine sends together are in flight together.
   */
  concurrency?: number;
  /**
   * With `concurrency`, extra milliseconds before a sim answers, so a test
   * can make one set's sims finish after another's.
   */
  extraDelayMs?: (ids: number[]) => number;
};

type ForkRanking = {
  contentHash: string;
  complete?: boolean;
  substitutions: Array<{
    field: string;
    detail: string;
    slot?: string;
    error?: string;
  }>;
  assumptions: { seeds: number[]; iterations: number };
  items: Array<{
    itemId: number;
    deltaDps: number;
    seMethod?: string;
    owned?: boolean;
    setContext?: {
      setId: number;
      setName: string;
      piecesWornBefore: number;
      piecesAfterSwap: number;
      crossesThreshold: boolean;
      nextThreshold: number | null;
      usesBonusGear?: true;
      singleDeltaDps?: number;
      singleBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      futureBonuses?: Array<{
        threshold: number;
        piecesNeeded: number;
        dps?: number;
        sameGearDps?: number;
        sameGearSe?: number;
        belowNoise?: true;
        bonusGearDps?: number;
        bonusGearSe?: number;
        partnerUnmeasured?: string;
        partnerRule?: string;
        breaks?: Array<{ setId: number; threshold: number; dps?: number }>;
        pieces?: Array<{ itemId: number; name: string; dps?: number }>;
      }>;
      commitBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      commitPackageDeltaDps?: number;
      packages?: Array<{ threshold: number; deltaDps: number }>;
    };
  }>;
  baseline: { dps: number };
  bonusGearSims?: {
    partnerRule: string;
    gears: number;
    simmed: number;
    fromStore: number;
  };
  crossingChecks?: Array<{
    setId: number;
    count: number;
    itemId: number;
    dps?: number;
    cleared: boolean;
  }>;
  setBonuses?: Array<{
    setId: number;
    threshold: number;
    packageItemIds?: number[];
    packageDeltaDps?: number;
    bonusDps?: number;
    bonusDpsNet?: number;
    sameGearDps?: number;
    sameGearSe?: number;
    belowNoise?: true;
    unmeasured?: string;
    selfConfound?: { threshold: number; dps?: number };
    breaks?: Array<{ setId: number; threshold: number }>;
  }>;
  brokenSetValues?: Array<{
    setId: number;
    threshold: number;
    dps?: number;
    unmeasured?: string;
  }>;
  wornSetLadder?: Array<{
    setId: number;
    count: number;
    dps?: number;
    se?: number;
    unmeasured?: string;
    counted: boolean;
  }>;
  /** The set screen's "on" readings (`OnScreen`, below). */
  setScreen?: OnScreen;
};

async function runScenario(scenario: Scenario): Promise<{
  ranking: ForkRanking;
  runCount: number;
  /** The equipped ids of each request the fake sim ran, in call order. */
  calls: number[][];
  /** The options of each of those requests, in the same order. */
  callOpts: SimRunOpts[];
  /**
   * Each of those requests, as the fake sim received it (K6B). The case that
   * read it now lives in the fork's
   * `ui/features/upgrades/model/rank_set_break_split.test.ts` ("a first
   * increment's bonus-off request is the row's single-swap request with
   * copies").
   */
  requests: RaidSimRequest[];
  /** For each `activeSetBonuses` call, how many sims had run before it. */
  setBonusReadRuns: number[];
  /** For each fake sim call, how many sims were in flight once it started. */
  inFlightAtStart: number[];
  /** For each fake sim call, the stack it was made from. */
  stackAtStart: string[];
}> {
  // The fake sim answers in microtasks, so without this the file never gives
  // the event loop back. Since every feral run reads hit (ticket 830), the
  // file runs for minutes, and vitest's worker reported
  // `Timeout calling "onTaskUpdate"`. `setImmediate`, not `setTimeout`: only
  // the former lets the loop read the worker's pending messages first.
  await new Promise((resolve) => setImmediate(resolve));
  const rankMod = await importForkUpgrades<{
    rankUpgrades: (
      input: Record<string, unknown>,
      deps: Record<string, unknown>
    ) => Promise<ForkRanking>;
  }>("engine/rank.ts");
  const storeMod = await importForkUpgrades<{
    MemoryStore: new () => Record<string, unknown>;
  }>("engine/seams/store.ts");
  const gearMod = await importForkUpgrades<{
    RecordedGearSource: new (data: {
      fights: ReadonlyMap<string, unknown[]>;
      gear: ReadonlyMap<string, unknown>;
    }) => unknown;
    characterFightKey: (c: unknown, spec: string) => string;
    fightGearKey: (f: unknown) => string;
  }>("../testing/recorded_gear_source.ts");
  const itemsMod = await importForkUpgrades<{
    getItem: (id: number) => { setId?: number } | undefined;
  }>("engine/items.ts");
  const seamMod = await importForkUpgrades<{
    simCacheKey: (
      req: RaidSimRequest,
      simVersion: string,
      opts: SimRunOpts
    ) => string;
  }>("engine/seams/sim-runner.ts");

  const getSetId = (id: number): number | undefined =>
    itemsMod.getItem(id)?.setId;

  const loggedGear = {
    items: scenario.worn.map((w) => ({ id: w.id, slot: w.slot, gems: [] })),
    talentPointsByTree: [0, 45, 16] as [number, number, number],
    provenance: {
      reportCode: FERAL_SUMMARY.reportCode,
      fightId: FERAL_SUMMARY.fightId,
      sourceID: 1,
    },
  };
  const fightRef = {
    reportCode: FERAL_SUMMARY.reportCode,
    fightId: FERAL_SUMMARY.fightId,
  };
  const gearSource = new gearMod.RecordedGearSource({
    fights: new Map([
      [gearMod.characterFightKey(FERAL_CHAR, "feral"), [FERAL_SUMMARY]],
    ]),
    gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
  });

  const pool = scenario.pool.map((p) => ({
    itemId: p.itemId,
    name: `item ${p.itemId}`,
    slot: p.slot,
    phase: 1,
    source: { kind: "badge" as const, cost: 1 },
  }));

  let runCount = 0;
  let inFlight = 0;
  const inFlightAtStart: number[] = [];
  const stackAtStart: string[] = [];
  const calls: number[][] = [];
  const callOpts: SimRunOpts[] = [];
  const requests: RaidSimRequest[] = [];
  const { simCacheKey } = seamMod;
  /** For each `activeSetBonuses` call, how many sims had run before it. */
  const setBonusReadRuns: number[] = [];
  const controller =
    scenario.stopDuringCall === undefined &&
    scenario.stopDuringSetBonusRead === undefined
      ? undefined
      : new AbortController();
  const sim = {
    version: () => Promise.resolve(SIM_VERSION),
    computeStats: zeroHitStats,
    run: (req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> => {
      runCount += 1;
      if (scenario.concurrency !== undefined) {
        inFlight += 1;
        inFlightAtStart.push(inFlight);
        // Which engine step sent the sim: its async callers are in the
        // stack, below more frames than the default limit of 10 keeps.
        const limit = Error.stackTraceLimit;
        Error.stackTraceLimit = 100;
        stackAtStart.push(new Error().stack ?? "");
        Error.stackTraceLimit = limit;
      }
      const ids = equippedIds(req);
      calls.push(ids);
      callOpts.push({ ...opts });
      requests.push(structuredClone(req));
      if (runCount - 1 === scenario.stopDuringCall) controller?.abort();
      // Of each five sims, a later one answers sooner, so sims finish in a
      // different order than they started, as browser workers can.
      const delayMs =
        2 * (5 - (runCount % 5)) + (scenario.extraDelayMs?.(ids) ?? 0);
      const answer = <T>(settle: () => T): Promise<T> =>
        scenario.concurrency === undefined
          ? new Promise((resolve) => resolve(settle()))
          : new Promise((resolve, reject) =>
              setTimeout(() => {
                inFlight -= 1;
                try {
                  resolve(settle());
                } catch (err) {
                  reject(err);
                }
              }, delayMs)
            );
      if (scenario.failWhen?.(ids, opts)) {
        const error = new Error(
          MODEL_SIM_ERROR + (scenario.failStack?.(runCount) ?? "")
        );
        return answer(() => {
          throw error;
        });
      }
      const dps = modelDps(
        ids,
        getSetId,
        scenario.itemValue,
        scenario.setBonuses,
        scenario.interactions,
        scenario.idEffects
      );
      // Per-iteration values only when asked, as the worker runner does: the
      // model is exact, so every iteration reads the model DPS.
      const observation = {
        dps,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
        ...(opts.saveAllValues === true
          ? { allValues: new Array<number>(opts.iterations).fill(dps) }
          : {}),
      };
      return answer(() => observation);
    },
    ...(scenario.reportsSetBonuses
      ? {
          activeSetBonuses: (req: RaidSimRequest): Promise<string[]> => {
            const ids = equippedIds(req);
            setBonusReadRuns.push(runCount);
            if (setBonusReadRuns.length - 1 === scenario.stopDuringSetBonusRead)
              controller?.abort();
            if (scenario.failSetBonusReadWhen?.(ids)) {
              return Promise.reject(
                new Error("the set-bonus read failed on purpose")
              );
            }
            return Promise.resolve(
              modelSetBonusNames(ids, getSetId, scenario.setBonuses)
            );
          },
        }
      : {}),
  };
  void simCacheKey;

  const input = {
    character: FERAL_CHAR,
    spec: "feral",
    maxPhase: 5,
    fight: fightRef,
    iterations: scenario.iterations ?? ITERATIONS,
    ...(scenario.seeds === "engine-default"
      ? {}
      : { seeds: scenario.seeds ?? [11] }),
    candidateCap: 100,
  };

  const ranking = await tracedRank(rankMod.rankUpgrades)(input, {
    gear: gearSource,
    sim,
    store: scenario.store ?? new storeMod.MemoryStore(),
    clock: () => new Date("2026-09-20T12:00:00.000Z"),
    raidSimSkeleton: feralSkeleton,
    epWeights: feralWeights,
    itemEp: await statsOnlyItemEp(feralWeights),
    pool,
    ...(scenario.measureSetBonuses ? { measureSetBonuses: true } : {}),
    ...(scenario.setScreenMode
      ? { setScreenMode: scenario.setScreenMode }
      : {}),
    ...(controller ? { signal: controller.signal } : {}),
    ...(scenario.concurrency === undefined
      ? {}
      : { concurrency: scenario.concurrency }),
    ...(scenario.databaseWithout ||
    scenario.databaseOmits ||
    scenario.composeFailsWhen
      ? {
          simDatabaseFor: (equipment: ReadonlyArray<{ id?: number }>) => {
            const ids = equipment.map((spec) => spec.id ?? 0);
            if (scenario.composeFailsWhen?.(ids)) {
              throw new Error(MODEL_COMPOSE_ERROR);
            }
            const left = [
              ...(scenario.databaseWithout ?? []),
              ...(scenario.databaseOmits?.(ids) ?? []),
            ];
            return {
              items: equipment
                .filter((spec) => spec.id && !left.includes(spec.id))
                .map((spec) => ({ id: spec.id })),
            };
          },
        }
      : {}),
  });

  return {
    ranking,
    runCount,
    calls,
    callOpts,
    requests,
    setBonusReadRuns,
    inFlightAtStart,
    stackAtStart,
  };
}

/** A full 17-slot worn set, some slots filled by the given specs. */
function wornGear(filled: Partial<Record<SimOrderName, number>>): WornSpec[] {
  return SIM_ORDER.map((slot) => ({ id: filled[slot] ?? 0, slot }));
}

/** The Thunderheart pool candidates for the five slots this fixture uses. */
const TH_POOL: PoolSpec[] = [
  { itemId: THUNDERHEART.head, slot: "head" },
  { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
  { itemId: THUNDERHEART.chest, slot: "chest" },
  { itemId: THUNDERHEART.hands, slot: "hands" },
  { itemId: THUNDERHEART.legs, slot: "legs" },
];

const near = (a: number, b: number, tol = 0.01): boolean =>
  Math.abs(a - b) <= tol;

function thRow(ranking: ForkRanking, itemId: number) {
  const row = ranking.items.find((i) => i.itemId === itemId);
  if (!row) throw new Error(`row ${itemId} not found`);
  return row;
}

/* ------------------------------------------------------------------ *
 * Tickets 476, 477, 478: every lost threshold, the solved B, the
 * inflation sign, the commit-break fallback and the owned-row guard.
 * Every literal is derived by hand from the controlled model in
 * docs/set-bonus-fixture-derivations.md.
 * ------------------------------------------------------------------ */

/**
 * The cutoff these cases pass the view. A bonus-gear ranking's figures are checked against
 * its bar, 5; a flag-off bonus at √2 × 5 ≈ 7.07 (ticket 623).
 */
const FLOOR = { absDps: 5 };

type SetPotentialMod = {
  rankableSetPotential: (
    item: { setContext?: unknown },
    cutoff: { absDps: number }
  ) => number;
};

async function setPotentialModule(): Promise<SetPotentialMod> {
  return importForkUpgrades<SetPotentialMod>("engine/set-potential.ts");
}

/** Runs a scenario with the B flag off and on, for the sim-count invariant. */
async function runOffOn(scenario: Omit<Scenario, "measureSetBonuses">) {
  const off = await runScenario(scenario);
  const on = await runScenario({ ...scenario, measureSetBonuses: true });
  return { off, on };
}

function bsvDps(
  ranking: ForkRanking,
  setId: number,
  threshold: number
): number | undefined {
  return (ranking.brokenSetValues ?? []).find(
    (b) => b.setId === setId && b.threshold === threshold
  )?.dps;
}

function netOf(
  ranking: ForkRanking,
  setId: number,
  threshold: number
): number | undefined {
  return (ranking.setBonuses ?? []).find(
    (b) => b.setId === setId && b.threshold === threshold
  )?.bonusDpsNet;
}

const brk = (b: { setId: number; threshold: number; dps?: number }) => ({
  setId: b.setId,
  threshold: b.threshold,
  dps: b.dps === undefined ? undefined : Math.round(b.dps),
});

const fut = (f: { threshold: number; piecesNeeded: number; dps?: number }) => ({
  threshold: f.threshold,
  piecesNeeded: f.piecesNeeded,
  dps: f.dps === undefined ? undefined : Math.round(f.dps),
});

// Worn Malorne head, shoulder, chest, hands; Thunderheart and neutral
// candidates in exactly those four slots (D1, D2).
const MALORNE_4 = {
  head: MALORNE.head,
  shoulder: MALORNE.shoulder,
  chest: MALORNE.chest,
  hands: MALORNE.hands,
} as const;
const TH_OVER_MALORNE_POOL: PoolSpec[] = [
  { itemId: THUNDERHEART.head, slot: "head" },
  { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
  { itemId: THUNDERHEART.chest, slot: "chest" },
  { itemId: THUNDERHEART.hands, slot: "hands" },
  { itemId: NEUTRAL.head[0], slot: "head" },
  { itemId: NEUTRAL.shoulder[0], slot: "shoulder" },
  { itemId: NEUTRAL.chest[0], slot: "chest" },
  { itemId: NEUTRAL.hands[0], slot: "hands" },
];
const TH_FOUR_IDS = [
  THUNDERHEART.head,
  THUNDERHEART.shoulder,
  THUNDERHEART.chest,
  THUNDERHEART.hands,
];

describe.skipIf(!forkPresent)("every lost set threshold (476-478)", () => {
  it("476-A: worn Malorne 4 — both thresholds measured, B_2 solved exactly", async () => {
    const view = await setPotentialModule();
    const { off, on } = await runOffOn({
      worn: wornGear(MALORNE_4),
      pool: TH_OVER_MALORNE_POOL,
    });
    const r = on.ranking;
    // B_4 from the worn = t vacate; B_2 solved from the 3-slot vacate, where
    // the naive Σs − Δ is B_2 − 2·B_4 = −100.
    expect(near(bsvDps(r, 640, 4)!, 70, 0.5)).toBe(true);
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect(near(netOf(r, 676, 2)!, 50, 0.5)).toBe(true);
    expect(near(netOf(r, 676, 4)!, 80, 0.5)).toBe(true);
    for (const id of TH_FOUR_IDS) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 30, 0.5)).toBe(true);
      const ctx = row.setContext!;
      expect((ctx.singleBreaks ?? []).map(brk)).toEqual([
        { setId: 640, threshold: 4, dps: 70 },
      ]);
      expect((ctx.commitBreaks ?? []).map(brk)).toEqual([
        { setId: 640, threshold: 2, dps: 40 },
      ]);
      // K5: count 3 has no model bonus, so it is a within-noise future.
      expect((ctx.futureBonuses ?? []).map(fut)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: 50 },
        { threshold: 3, piecesNeeded: 3, dps: undefined },
        { threshold: 4, piecesNeeded: 4, dps: 80 },
      ]);
      // 502: each row shows the whole 4pc swap, 30 + 390 = pkgΔ4 420.
      expect(near(view.rankableSetPotential(row, FLOOR), 390, 0.5)).toBe(true);
    }
    // One ladder rung per worn Malorne piece (4), two check sims for each of
    // the counts 2, 3 and 4 (tickets 511 and 512), and the bonus gears no
    // package covers: every pair but the 2pc package, since each row's three
    // 2pc partner sets are close calls (K5S).
    // K6B: three bonus-off sims, one per distinct gear before a 4pc increment
    // that newly loses Malorne 2pc (Gauntlets + Cover, shared by those two
    // rows; Gauntlets + Chestguard; Gauntlets + Pauldrons).
    expect(on.runCount - off.runCount).toBe(4 + 6 + 5 + 3);
    // C31 / ADR-0034: rows are not additive. Each row shows the whole swap;
    // four rows sum to 1560.
    const rows = TH_FOUR_IDS.map((id) => thRow(r, id));
    const fullSum = rows.reduce(
      (s, row) => s + view.rankableSetPotential(row, FLOOR),
      0
    );
    expect(near(fullSum, 1560, 2)).toBe(true);
  });

  it("476-B: worn Malorne 5 — both thresholds lost by the package, net4 sign fixed", async () => {
    const view = await setPotentialModule();
    const { ranking: r } = await runScenario({
      worn: wornGear({ ...MALORNE_4, legs: MALORNE.legs }),
      pool: TH_OVER_MALORNE_POOL,
      measureSetBonuses: true,
    });
    // Naive Σs − Δ for (640,2) is B_2 + B_4 = 110.
    expect(near(bsvDps(r, 640, 4)!, 70, 0.5)).toBe(true);
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect(near(netOf(r, 676, 2)!, 50, 0.5)).toBe(true);
    // The pre-476 correction gives 180; every-threshold with the old sign
    // gives 220.
    expect(near(netOf(r, 676, 4)!, 80, 0.5)).toBe(true);
    const row = thRow(r, THUNDERHEART.head);
    expect(near(row.deltaDps, 100, 0.5)).toBe(true);
    expect(row.setContext?.singleBreaks ?? []).toEqual([]);
    expect((row.setContext?.commitBreaks ?? []).map(brk)).toEqual([
      { setId: 640, threshold: 4, dps: 70 },
      { setId: 640, threshold: 2, dps: 40 },
    ]);
    // 502: 50 + 100 − 70, then + 80 + 200 − 40.
    expect(near(view.rankableSetPotential(row, FLOOR), 320, 0.5)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Tickets 490-493: breaks charged along each future's own path, one
 * credited bonus chosen on full values, the "not counted" rule, and the
 * worn-1 4pc recovered with one pair sim. Every literal is derived by hand
 * from the controlled model in docs/set-bonus-fixture-derivations.md.
 * ------------------------------------------------------------------ */

/** Item values with the given set pieces at the Thunderheart value (100). */
function withSetValues(ids: readonly number[]): Map<number, number> {
  return withValues(ids.map((id) => [id, V_TH] as const));
}

const futB = (f: {
  threshold: number;
  piecesNeeded: number;
  dps?: number;
  breaks?: Array<{ setId: number; threshold: number; dps?: number }>;
}) => ({ ...fut(f), breaks: (f.breaks ?? []).map(brk) });

const sortedIds = (ids: readonly number[] | undefined) =>
  [...(ids ?? [])].sort((a, b) => a - b);

function bonusOf(ranking: ForkRanking, setId: number, threshold: number) {
  return (ranking.setBonuses ?? []).find(
    (b) => b.setId === setId && b.threshold === threshold
  );
}

type SubLineMod = SetPotentialMod & {
  setPotentialCredit: (ctx: unknown, cutoff: { absDps: number }) => number;
  setCreditUnmeasured: (ctx: unknown) => boolean;
  setPotentialTerms: (
    ctx: unknown,
    cutoff: { absDps: number }
  ) => {
    credit: number;
    creditedThreshold: number;
    terms: Array<
      | {
          kind: "bonus";
          setName: string;
          threshold: number;
          worn: number;
          dps: number;
        }
      | { kind: "piece"; itemId: number; name: string; dps: number }
      | { kind: "break"; setName: string; threshold: number; dps: number }
    >;
  };
  setBonusSubLine: (
    ctx: unknown,
    on: boolean
  ) => "not_counted" | "hover_hint" | null;
};
const setPool = (set: Readonly<Partial<Record<PoolSpec["slot"], number>>>) =>
  (Object.entries(set) as Array<[PoolSpec["slot"], number]>).map(
    ([slot, itemId]) => ({ itemId, slot })
  );

/* ------------------------------------------------------------------ *
 * Targeted engine review of 2026-09-25 (findings A1, A2, A4): a 492 pair
 * that breaks another worn set only together, the worn-1 4pc with no
 * usable pair, and a lower B that needs an unmeasured higher B. Every
 * literal is derived by hand in docs/set-bonus-fixture-derivations.md. The
 * A2 case (492-N) now lives in the fork's
 * `ui/features/upgrades/model/rank_set_unmeasured_breaks.test.ts`.
 * ------------------------------------------------------------------ */

describe.skipIf(!forkPresent)("engine review fixes (A1, A2, A4)", () => {
  it("492-J: a pair that breaks a worn set only together is not used for B2", async () => {
    const view = await importForkUpgrades<SubLineMod>(
      "engine/set-potential.ts"
    );
    const { off, on } = await runOffOn({
      worn: wornGear({
        hands: THUNDERHEART.hands,
        head: MALORNE.head,
        shoulder: MALORNE.shoulder,
        chest: MALORNE.chest,
      }),
      pool: [
        { itemId: THUNDERHEART.head, slot: "head" },
        { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.legs, slot: "legs" },
        { itemId: NEUTRAL.head[0], slot: "head" },
        { itemId: NEUTRAL.shoulder[0], slot: "shoulder" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
      ],
    });
    const r = on.ranking;
    expect(near(r.baseline.dps, 3140, 0.5)).toBe(true);
    const th4 = bonusOf(r, 676, 4);
    expect(sortedIds(th4?.packageItemIds)).toEqual([31039, 31042, 31044]);
    // Head + chest together take Malorne 3 -> 1; head + legs keep it at 2.
    expect(th4!.selfConfound?.threshold).toBe(2);
    expect(near(th4!.selfConfound?.dps ?? NaN, 50, 0.5)).toBe(true);
    expect(near(th4!.bonusDps!, 40, 0.5)).toBe(true);
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect(near(th4!.bonusDpsNet!, 80, 0.5)).toBe(true);
    // Three ladder rungs (Malorne worn 3; Thunderheart worn 1 has no
    // ladder), the crossing check's two sims, and two check sims for each of
    // the counts 3, 4 and 5. The 2pc is one piece at worn 1, so it is not
    // measured and has no check. Three bonus gears no package covers: every
    // 4pc partner set ties, so each is a close call (K5S).
    // K6B: four bonus-off sims, because each row's 4pc increment newly loses
    // Malorne 2pc from its own single swap, a different gear before each.
    expect(on.runCount - off.runCount).toBe(3 + 2 + 6 + 3 + 4);
    for (const id of [
      THUNDERHEART.head,
      THUNDERHEART.shoulder,
      THUNDERHEART.chest,
      THUNDERHEART.legs,
    ]) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 150, 0.5)).toBe(true);
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        { threshold: 3, piecesNeeded: 2, dps: undefined, breaks: [] },
        {
          threshold: 4,
          piecesNeeded: 3,
          dps: 80,
          breaks: [{ setId: 640, threshold: 2, dps: 40 }],
        },
        { threshold: 5, piecesNeeded: 4, dps: undefined, breaks: [] },
      ]);
      // 502: 80 + two other pieces at 150 − 50 = 100 each − 40. K5: the
      // credited gear's sim, 3530 − 3140 = 390, less the row's 150.
      expect(near(view.rankableSetPotential(row, FLOOR), 240, 0.5)).toBe(true);
    }
  });

  it("476-D: a failed ladder sim leaves that break unmeasured and the row not counted", async () => {
    const view = await importForkUpgrades<SubLineMod>(
      "engine/set-potential.ts"
    );
    // 476-A's worn Malorne 4 with the model sim failing on the one ladder
    // rung that sends the Malorne hands as a set-kept copy: R(4). Before
    // ticket 512 this case pinned the vacate's dependent-unmeasured rule;
    // the ladder has no dependency between counts, so a failed sim is the
    // way a break is left unmeasured now.
    const { off, on } = await runOffOn({
      worn: wornGear(MALORNE_4),
      pool: [
        { itemId: THUNDERHEART.head, slot: "head" },
        { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.hands, slot: "hands" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
        { itemId: NEUTRAL.hands[0], slot: "hands" },
      ],
      failWhen: (ids) => ids.includes(SET_KEPT_OFFSET + MALORNE.hands),
    });
    const r = on.ranking;
    const bsv = (threshold: number) =>
      (r.brokenSetValues ?? []).find(
        (b) => b.setId === 640 && b.threshold === threshold
      );
    expect(bsv(4)?.unmeasured).toBe("sim-failed");
    expect(bsv(4)?.dps).toBeUndefined();
    expect(near(bsv(2)!.dps!, 40, 0.5)).toBe(true);
    expect(bsv(3)).toBeUndefined();
    expect(
      (r.wornSetLadder ?? [])
        .filter((e) => e.setId === 640)
        .map((e) => [e.count, e.counted, e.unmeasured ?? null])
    ).toEqual([
      [2, true, null],
      [3, false, null],
      [4, true, "sim-failed"],
    ]);
    // Ticket 863: the failed rung's error reaches the player.
    expect(setSkipLines(r)).toEqual([wornSetFailedLine]);
    // Four ladder rungs (one fails) and two check sims for each of the
    // Thunderheart counts 2, 3 and 4 (tickets 511 and 512). No bonus gear:
    // every partner choice needs the unmeasured (640, 4) (K5, W-Z1).
    expect(on.runCount - off.runCount).toBe(4 + 6);
    expect(r.bonusGearSims?.gears).toBe(0);
    expect(netOf(r, 676, 2)).toBeUndefined();
    expect(netOf(r, 676, 4)).toBeUndefined();
    for (const id of TH_FOUR_IDS) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 30, 0.5)).toBe(true);
      expect((row.setContext?.singleBreaks ?? []).map(brk)).toEqual([
        { setId: 640, threshold: 4, dps: undefined },
      ]);
      const futures = row.setContext?.futureBonuses ?? [];
      expect(futures.map(fut)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: undefined },
        { threshold: 3, piecesNeeded: 3, dps: undefined },
        { threshold: 4, piecesNeeded: 4, dps: undefined },
      ]);
      expect(
        futures.map((f) => [f.threshold, f.partnerUnmeasured ?? null])
      ).toEqual([
        [2, "break-unmeasured"],
        [3, null],
        [4, "break-unmeasured"],
      ]);
      expect(futures.every((f) => f.bonusGearDps === undefined)).toBe(true);
      expect(view.rankableSetPotential(row, FLOOR)).toBe(0);
      expect(view.setBonusSubLine(row.setContext, true)).toBe("not_counted");
    }
  });

  it("863-L: failed ladder rungs give one line that names the set and no piece count", async () => {
    // 476-D's gear with the model sim failing on R(1), the rung that sends
    // the Malorne shoulder, chest and hands set-less, and on R(3), the one
    // that sends the chest set-kept and the hands set-less. Counts 2, 3 and
    // 4 use them. Malorne has no 3pc, and R(1) counts one piece, so a line
    // per rung or per count would name a count or a bonus that means nothing
    // to the player. Each failure's stack differs, as a Go panic's does.
    const { ranking: r } = await runScenario({
      worn: wornGear(MALORNE_4),
      pool: TH_OVER_MALORNE_POOL,
      measureSetBonuses: true,
      failWhen: (ids) =>
        (ids.includes(COPY_OFFSET + MALORNE.shoulder) &&
          ids.includes(COPY_OFFSET + MALORNE.chest) &&
          ids.includes(COPY_OFFSET + MALORNE.hands)) ||
        (ids.includes(SET_KEPT_OFFSET + MALORNE.chest) &&
          ids.includes(COPY_OFFSET + MALORNE.hands)),
      failStack: (call) => `\nStack Trace:\ngoroutine ${call} [running]:`,
    });
    expect(
      (r.wornSetLadder ?? [])
        .filter((e) => e.setId === 640)
        .map((e) => [e.count, e.unmeasured ?? null])
    ).toEqual([
      [2, "sim-failed"],
      [3, "sim-failed"],
      [4, "sim-failed"],
    ]);
    expect(setSkipLines(r)).toEqual([wornSetFailedLine]);
  });

  /** 476-D's gear and pool with R(3) failing: counts 3 and 4 go unmeasured. */
  const rungThreeFails: Scenario = {
    worn: wornGear(MALORNE_4),
    pool: [
      { itemId: THUNDERHEART.head, slot: "head" },
      { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
      { itemId: THUNDERHEART.chest, slot: "chest" },
      { itemId: THUNDERHEART.hands, slot: "hands" },
      { itemId: NEUTRAL.chest[0], slot: "chest" },
      { itemId: NEUTRAL.hands[0], slot: "hands" },
    ],
    measureSetBonuses: true,
    reportsSetBonuses: true,
    failWhen: (ids) =>
      ids.includes(SET_KEPT_OFFSET + MALORNE.chest) &&
      ids.includes(COPY_OFFSET + MALORNE.hands),
  };
  /** Every Malorne count a row or the run lists as broken. */
  const malorneBreakCounts = (r: ForkRanking): number[] => {
    const counts = new Set<number>();
    for (const b of r.brokenSetValues ?? []) {
      if (b.setId === 640) counts.add(b.threshold);
    }
    for (const row of r.items) {
      const ctx = row.setContext;
      for (const b of [
        ...(ctx?.singleBreaks ?? []),
        ...(ctx?.commitBreaks ?? []),
        ...(ctx?.futureBonuses ?? []).flatMap((f) => f.breaks ?? []),
      ]) {
        if (b.setId === 640) counts.add(b.threshold);
      }
    }
    return [...counts].sort((a, b) => a - b);
  };

  it("870-A: a failed ladder rung lists breaks only at counts where the set has a bonus", async () => {
    // Malorne has bonuses at 2 and 4 only. A Thunderheart pair takes it from
    // 4 to 2 pieces, so before ticket 870 the unmeasured count 3 was listed
    // as a break ("Breaks Malorne Harness 3pc").
    const { ranking: r } = await runScenario(rungThreeFails);
    expect(malorneBreakCounts(r)).toEqual([2, 4]);
    expect(
      (r.wornSetLadder ?? [])
        .filter((e) => e.setId === 640)
        .map((e) => [e.count, e.counted, e.unmeasured ?? null])
    ).toEqual([
      [2, true, null],
      [3, false, "sim-failed"],
      [4, true, "sim-failed"],
    ]);
    expect(setSkipLines(r)).toEqual([wornSetFailedLine]);
  });
});

describe.skipIf(!forkPresent)("other set pieces' own stats (502)", () => {
  it("502-C: a path piece's own stats are its single plus what it breaks alone, less a 2pc it crosses alone", async () => {
    // Worn 1: each other piece crosses the Thunderheart 2pc alone.
    const worn1 = await runScenario({
      worn: wornGear({ hands: THUNDERHEART.hands }),
      pool: TH_POOL.filter((p) => p.slot !== "hands"),
    });
    const head1 = thRow(worn1.ranking, THUNDERHEART.head);
    const f4 = head1.setContext?.futureBonuses ?? [];
    expect(f4.map((f) => f.threshold)).toEqual([4]);
    expect((f4[0]?.pieces ?? []).map((p) => p.itemId)).toEqual([
      THUNDERHEART.chest,
      THUNDERHEART.legs,
    ]);
    expect((f4[0]?.pieces ?? []).map((p) => p.name)).toEqual([
      `item ${THUNDERHEART.chest}`,
      `item ${THUNDERHEART.legs}`,
    ]);
    for (const p of f4[0]?.pieces ?? [])
      expect(near(p.dps ?? NaN, 100, 0.5)).toBe(true);

    // Worn break: each other Thunderheart piece breaks Malorne 4pc alone.
    const { ranking: r } = await runScenario({
      worn: wornGear(MALORNE_4),
      pool: TH_OVER_MALORNE_POOL,
      measureSetBonuses: true,
    });
    // K5: with the flag the ranking is a bonus-gear ranking, so each eligible
    // future's pieces are its partner choice, in slot order, and carry no
    // own-stat figure (the credited gear's sim holds them); count 3 is below the
    // check and has none.
    const hands = thRow(r, THUNDERHEART.hands);
    const future = hands.setContext?.futureBonuses ?? [];
    expect(future.map((f) => f.threshold)).toEqual([2, 3, 4]);
    expect((future[0]?.pieces ?? []).map((p) => p.itemId)).toEqual([
      THUNDERHEART.head,
    ]);
    expect(future[1]?.pieces).toBeUndefined();
    expect((future[2]?.pieces ?? []).map((p) => p.itemId)).toEqual([
      THUNDERHEART.head,
      THUNDERHEART.shoulder,
      THUNDERHEART.chest,
    ]);
    for (const f of future)
      for (const p of f.pieces ?? []) expect(p.dps).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ *
 * Ticket 512: set breaks with no list. Under the flag the break side
 * measures every count of every worn set with the ladder and charges a
 * count only when it clears the noise check. Each case stands for a kind
 * of situation; its set is the example. Every literal is derived by hand
 * in docs/set-bonus-fixture-derivations.md, "Ticket 512".
 * ------------------------------------------------------------------ */

// Wastewalker Armor 659 (leather; Go bonuses at 2 and 4).
const WASTEWALKER = {
  shoulder: 27797,
  chest: 28264,
  hands: 27531,
  legs: 27837,
} as const;
// Primal Intent 619 (leather; one Go bonus, at 3).
const PRIMAL_INTENT = { chest: 29525, wrist: 29527, waist: 29526 } as const;

/** One worn set's counts as [count, rounded dps, counted]. */
const wornSetCountsOf = (ranking: ForkRanking, setId: number) =>
  (ranking.wornSetLadder ?? [])
    .filter((e) => e.setId === setId)
    .map((e) => [
      e.count,
      e.dps === undefined ? undefined : Math.round(e.dps),
      e.counted,
    ]);

/** Every break entry a row lists for `setId`, from any of its fields. */
function rowBreaksOf(
  row: ForkRanking["items"][number],
  setId: number
): Array<{ setId: number; threshold: number; dps?: number }> {
  const ctx = row.setContext;
  return [
    ...(ctx?.singleBreaks ?? []),
    ...(ctx?.commitBreaks ?? []),
    ...(ctx?.futureBonuses ?? []).flatMap((f) => f.breaks ?? []),
  ].filter((b) => b.setId === setId);
}

describe.skipIf(!forkPresent)("set breaks with no list (512)", () => {
  it("512-N: a swap that removes a piece but no bonus is charged nothing", async () => {
    // Scenario kind: a worn count past the highest bonus, or between two
    // bonuses, or a set with no bonus at all. The swap removes one piece and
    // the set keeps every bonus it had.
    // (a) Past the highest bonus, w = 5 -> 4: Malorne 640 worn 5/5, model
    // 2pc 40 and 4pc 70; each Thunderheart single takes it to 4.
    const five = await runScenario({
      worn: wornGear({ ...MALORNE_4, legs: MALORNE.legs }),
      pool: TH_OVER_MALORNE_POOL,
      measureSetBonuses: true,
    });
    expect(wornSetCountsOf(five.ranking, 640)).toEqual([
      [2, 40, true],
      [3, 0, false],
      [4, 70, true],
      [5, 0, false],
    ]);
    expect(bsvDps(five.ranking, 640, 5)).toBeUndefined();
    const head = thRow(five.ranking, THUNDERHEART.head);
    expect(head.setContext?.singleBreaks ?? []).toEqual([]);
    for (const b of rowBreaksOf(head, 640)) {
      expect([2, 4]).toContain(b.threshold);
    }

    // (b) Between bonuses, w = 3 -> 2: Wastewalker 659 worn 3/4, model 2pc
    // 30 and 4pc 20; a Malorne chest and the neutral chest 8283 as
    // candidates.
    const three = await runScenario({
      worn: wornGear({
        shoulder: WASTEWALKER.shoulder,
        chest: WASTEWALKER.chest,
        hands: WASTEWALKER.hands,
      }),
      pool: [
        { itemId: MALORNE.chest, slot: "chest" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
      ],
      itemValue: withSetValues([MALORNE.chest]),
      setBonuses: { ...SET_BONUSES, 659: { b2: 30, b4: 20 } },
      measureSetBonuses: true,
    });
    expect(wornSetCountsOf(three.ranking, 659)).toEqual([
      [2, 30, true],
      [3, 0, false],
    ]);
    const malChest = thRow(three.ranking, MALORNE.chest);
    expect(near(malChest.deltaDps, 100, 0.5)).toBe(true);
    expect(rowBreaksOf(malChest, 659)).toEqual([]);

    // (c) No bonus at all: Primal Intent 619 worn 3/3 with no model bonus.
    const none = await runScenario({
      worn: wornGear(PRIMAL_INTENT),
      pool: [{ itemId: THUNDERHEART.chest, slot: "chest" }],
      measureSetBonuses: true,
    });
    expect(wornSetCountsOf(none.ranking, 619)).toEqual([
      [2, 0, false],
      [3, 0, false],
    ]);
    expect(rowBreaksOf(thRow(none.ranking, THUNDERHEART.chest), 619)).toEqual(
      []
    );
    expect(none.ranking.brokenSetValues ?? []).toEqual([]);
  });
});

/* ------------------------------------------------------------------ *
 * Ticket 511, K5: set rows valued by simmed gear (option A). With the
 * flag, the gain side tries every count the pool reaches with no list, the
 * check runs before the package sim, and a row is credited from the sim of
 * its credited gear: the current gear plus the row plus the partner pieces
 * `choosePartners` picks. Each case stands for a kind of situation; its
 * set is the example. Every literal is derived by hand in
 * docs/set-bonus-fixture-derivations.md, "Ticket 511: set rows valued by
 * simmed gear".
 * ------------------------------------------------------------------ */

type OutcomeTerm = {
  kind: "outcome";
  threshold: number;
  setName: string;
  pieces: Array<{ itemId: number; name: string }>;
  broken: Array<{ setId: number; threshold: number; dps?: number }>;
  bonusGearDps: number;
  isCredited: boolean;
};

/** One increment of the "increments that add up" popover (K6). */
type IncrementTerm = {
  kind: "increment";
  threshold: number;
  setName: string;
  pieces: Array<{ itemId: number; name: string }>;
  broken: Array<{ setId: number; threshold: number; dps?: number }>;
  dps: number;
  isCredited: boolean;
};

type BonusGearViewMod = SetPotentialMod & {
  setPotentialTerms: (
    ctx: unknown,
    cutoff: { absDps: number }
  ) => {
    credit: number;
    creditedThreshold: number;
    terms: Array<OutcomeTerm | { kind: "bonus" | "piece" | "break" }>;
  };
  setPotentialIncrements: (
    ctx: unknown,
    cutoff: { absDps: number }
  ) => IncrementTerm[] | null;
  setCreditUnmeasured: (ctx: unknown) => boolean;
  setBonusSubLine: (
    ctx: unknown,
    on: boolean
  ) => "not_counted" | "hover_hint" | null;
  crossingLabelCount: (ctx: unknown) => number | null;
  canBeCredited: (future: unknown, cutoff: { absDps: number }) => boolean;
};

async function bonusGearView(): Promise<BonusGearViewMod> {
  return importForkUpgrades<BonusGearViewMod>("engine/set-potential.ts");
}

/** Item values with the listed overrides. */
function withValues(pairs: ReadonlyArray<readonly [number, number]>) {
  const values = new Map(ITEM_VALUE);
  for (const [id, v] of pairs) values.set(id, v);
  return values;
}

const futureOf = (row: ForkRanking["items"][number], threshold: number) =>
  (row.setContext?.futureBonuses ?? []).find((f) => f.threshold === threshold);

/** A worn gear's equipped ids in slot order, as the fake sim records them. */
const idsOf = (filled: Partial<Record<SimOrderName, number>>): number[] =>
  SIM_ORDER.map((slot) => filled[slot] ?? 0);

/* ------------------------------------------------------------------ *
 * The set screen's on mode (ticket 511, stage K5ON). Literals are derived
 * in docs/set-bonus-fixture-derivations.md, "The set screen's on mode".
 * ------------------------------------------------------------------ */

/** `Ranking.setScreen` when its mode is "on". */
type OnScreen = {
  mode: string;
  seed: number;
  iterations: number;
  rule: Record<string, unknown>;
  sigma?: number;
  sets: Array<{
    setId: number;
    worn: number;
    reach: number;
    packageItemIds: number[];
    pair: { dps?: number; pairedSe?: number };
    bestStats?: number;
    measure?: number;
    kept: boolean;
    reason: string;
  }>;
  simmed: number;
  fromStore: number;
};

/* ------------------------------------------------------------------ *
 * The popover's split break lines (511, K6B)
 * ------------------------------------------------------------------ */

/** A K6 increment with the two line values a breaking increment splits into (K6B). */
type SplitIncrementTerm = IncrementTerm & {
  breaksLineDps?: number;
  piecesLineDps?: number;
};

/** The K6B fields of a bonus-gear ranking's future, read through a cast. */
type BonusOffFields = {
  bonusOffDps?: number;
  bonusOffSe?: number;
  bonusOff?: Array<{ setId: number; threshold: number }>;
};

type SetBonusOffSims = {
  gears: number;
  simmed: number;
  fromStore: number;
  failedGears: number;
  skippedIncrements: number;
  beforeInStore: number;
};

const bonusOffOf = (row: ForkRanking["items"][number], threshold: number) =>
  futureOf(row, threshold) as BonusOffFields | undefined;

const bonusOffSimsOf = (ranking: ForkRanking) =>
  (ranking as { setBonusOffSims?: SetBonusOffSims }).setBonusOffSims;

const nineOrNull = (v: number | undefined) =>
  v === undefined ? null : Number(v.toFixed(9));

/**
 * A row's increments as [count, added piece ids, dps, Breaks line, pieces line,
 * newly broken]; a line value is null when the increment is not split.
 */
function splitIncrementsOf(
  view: BonusGearViewMod,
  row: { setContext?: unknown }
) {
  return (
    view.setPotentialIncrements(row.setContext, FLOOR) as
      SplitIncrementTerm[] | null
  )?.map((s) => [
    s.threshold,
    s.pieces.map((p) => p.itemId),
    Number(s.dps.toFixed(9)),
    nineOrNull(s.breaksLineDps),
    nineOrNull(s.piecesLineDps),
    s.broken.map((b) => [b.setId, b.threshold]),
  ]);
}

/**
 * Checks that every split increment of the ranking's rows adds up to its increment
 * value (W-L1), and returns how many split increments there are.
 */
function expectSplitLinesAddUp(view: BonusGearViewMod, ranking: ForkRanking) {
  let split = 0;
  for (const row of ranking.items) {
    const increments = view.setPotentialIncrements(row.setContext, FLOOR) as
      SplitIncrementTerm[] | null;
    for (const s of increments ?? []) {
      if (s.breaksLineDps === undefined) continue;
      split += 1;
      expect(
        Math.abs(s.breaksLineDps + s.piecesLineDps! - s.dps)
      ).toBeLessThanOrEqual(1e-9);
    }
  }
  return split;
}

// 511-L2: worn Malorne 4 (head, shoulder, chest, hands); only the
// Thunderheart 4pc pays, so it is every row's only future above noise.
const L2_SCENARIO: Scenario = {
  worn: wornGear(MALORNE_4),
  pool: [
    { itemId: THUNDERHEART.head, slot: "head" },
    { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
    { itemId: THUNDERHEART.chest, slot: "chest" },
    { itemId: THUNDERHEART.legs, slot: "legs" },
  ],
  setBonuses: {
    ...SET_BONUSES,
    640: { b2: 40, b4: 70 },
    676: { b2: 0, b4: 80 },
  },
  itemValue: withValues([
    [THUNDERHEART.head, 20],
    [THUNDERHEART.shoulder, 20],
    [THUNDERHEART.chest, 20],
    [THUNDERHEART.legs, 10],
  ]),
  measureSetBonuses: true,
};

describe.skipIf(!forkPresent)(
  "the popover's split break lines (511, K6B)",
  () => {
    it("511-L2: an increment that loses two bonuses gets one Breaks line valued by one sim", async () => {
      // Scenario kind: a worn 4-piece set whose 2pc and 4pc are both lost
      // by one increment. Example: worn Malorne 4, the Thunderheart Leggings row
      // taking the Cover, Pauldrons and Chestguard.
      const view = await bonusGearView();
      const run = await runScenario(L2_SCENARIO);
      const r = run.ranking;
      expect(r.baseline.dps).toBeCloseTo(3110, 9);
      // Leggings: 4pc gear 10 + 60 + 80 − 110 = +40, an increment of 30. With the
      // Malorne head, shoulder and chest set-less: 10 − 110 = −100.
      // Breaks −100 − 10 = −110 (40 + 70 together); pieces 40 + 100 = 140.
      const legs = thRow(r, THUNDERHEART.legs);
      expect(splitIncrementsOf(view, legs)).toEqual([
        [
          4,
          [THUNDERHEART.head, THUNDERHEART.shoulder, THUNDERHEART.chest],
          30,
          -110,
          140,
          [
            [640, 4],
            [640, 2],
          ],
        ],
      ]);
      expect(bonusOffOf(legs, 4)?.bonusOff).toEqual([
        { setId: 640, threshold: 4 },
        { setId: 640, threshold: 2 },
      ]);
      // Cover, Pauldrons, Chestguard: single 20 − 70 = −50 (own break 4pc);
      // the 4pc increment is 40 + 50 = 90 and newly loses the 2pc. The bonus-off
      // gear copies the two Malorne pieces the increment replaces: 20 − 110 = −90.
      const others = [
        THUNDERHEART.head,
        THUNDERHEART.shoulder,
        THUNDERHEART.chest,
      ];
      for (const id of others) {
        const row = thRow(r, id);
        expect(row.deltaDps).toBeCloseTo(-50, 9);
        expect(splitIncrementsOf(view, row)).toEqual([
          [
            4,
            [...others.filter((o) => o !== id), THUNDERHEART.legs],
            90,
            -40,
            130,
            [[640, 2]],
          ],
        ]);
      }
      expect(bonusOffSimsOf(r)).toEqual({
        gears: 4,
        simmed: 4,
        fromStore: 0,
        failedGears: 0,
        skippedIncrements: 0,
        beforeInStore: 4,
      });
      // The Leggings row's request: head, shoulder and chest are copies, the
      // Malorne hands stays real.
      expect(run.calls).toContainEqual(
        idsOf({
          head: COPY_OFFSET + MALORNE.head,
          shoulder: COPY_OFFSET + MALORNE.shoulder,
          chest: COPY_OFFSET + MALORNE.chest,
          hands: MALORNE.hands,
          legs: THUNDERHEART.legs,
        })
      );
      expect(expectSplitLinesAddUp(view, r)).toBe(4);
    });
  }
);

/* ------------------------------------------------------------------ *
 * Ticket 497: the printed 4pc lines as worn Thunderheart goes 0 to 4
 * ------------------------------------------------------------------ */

type SweepSlot = "head" | "shoulder" | "chest" | "hands" | "legs";

// Thunderheart is added in the order of the live sweep's gear (hands, legs,
// chest, shoulders); every other slot of the five wears a neutral piece.
const SWEEP_TH_ORDER: readonly SweepSlot[] = [
  "hands",
  "legs",
  "chest",
  "shoulder",
];
const SWEEP_SLOTS: readonly SweepSlot[] = [
  "head",
  "shoulder",
  "chest",
  "hands",
  "legs",
];

// The Malorne and Nordrassil 4pc are worth far more than any 2pc (40) or any
// break (at most 50 + 80), so the 4pc is the credited bonus at every worn count
// and each row's 4pc increment is printed.
const MALORNE_2PC_DPS = 40;
const MALORNE_4PC_DPS = 400;
const NORDRASSIL_4PC_DPS = 400;
const SWEEP_BONUSES: SetBonusTable = {
  676: { b2: B2_TH, b4: B4_TH },
  640: { b2: MALORNE_2PC_DPS, b4: MALORNE_4PC_DPS },
  641: { b2: 0, b4: NORDRASSIL_4PC_DPS },
};

function sweepWorn(k: number): Record<SweepSlot, number> {
  const worn: Record<SweepSlot, number> = {
    head: NEUTRAL.head[0],
    shoulder: NEUTRAL.shoulder[0],
    chest: NEUTRAL.chest[0],
    hands: NEUTRAL.hands[0],
    legs: NEUTRAL.legs[0],
  };
  for (const slot of SWEEP_TH_ORDER.slice(0, k)) {
    worn[slot] = THUNDERHEART[slot];
  }
  return worn;
}

const SWEEP_SLOT_OF = new Map<number, SweepSlot>(
  [MALORNE, NORDRASSIL].flatMap((set) =>
    (Object.entries(set) as Array<[SweepSlot, number]>).map(
      ([slot, id]) => [id, slot] as const
    )
  )
);
const isTh = (id: number) =>
  (Object.values(THUNDERHEART) as number[]).includes(id);

/**
 * The model's value of one increment of a row's popover: the Breaks line is the
 * Thunderheart bonuses the increment newly loses, at their model value; the pieces
 * line is the added pieces' own values minus the pieces they replace, plus
 * the bonuses of the row's set the increment newly reaches. The gear before the
 * increment is the worn gear with the row's slot and every earlier increment's slots
 * replaced.
 */
function modelIncrementLines(opts: {
  worn: Record<SweepSlot, number>;
  rowId: number;
  setId: number;
  setIds: readonly number[];
  earlier: readonly number[];
  added: readonly number[];
  values: ReadonlyMap<number, number>;
}): { breaks: number; pieces: number } {
  const { worn, rowId, setId, setIds, earlier, added, values } = opts;
  const before: Record<SweepSlot, number> = { ...worn };
  for (const id of [rowId, ...earlier]) before[SWEEP_SLOT_OF.get(id)!] = id;
  const after: Record<SweepSlot, number> = { ...before };
  for (const id of added) after[SWEEP_SLOT_OF.get(id)!] = id;
  const count = (g: Record<SweepSlot, number>, pred: (id: number) => boolean) =>
    SWEEP_SLOTS.filter((s) => pred(g[s])).length;
  const th0 = count(before, isTh);
  const th1 = count(after, isTh);
  const own = (id: number) => setIds.includes(id);
  const set0 = count(before, own);
  const set1 = count(after, own);
  const b = SWEEP_BONUSES[setId]!;
  const lost =
    (th0 >= 2 && th1 < 2 ? B2_TH : 0) + (th0 >= 4 && th1 < 4 ? B4_TH : 0);
  const gained =
    (set0 < 2 && set1 >= 2 ? b.b2 : 0) + (set0 < 4 && set1 >= 4 ? b.b4 : 0);
  let pieces = gained;
  for (const id of added) {
    const slot = SWEEP_SLOT_OF.get(id)!;
    pieces += (values.get(id) ?? 0) - (values.get(before[slot]) ?? 0);
  }
  return { breaks: -lost, pieces };
}

describe.skipIf(!forkPresent)(
  "497: worn Thunderheart sweep, the printed 4pc lines",
  () => {
    // Screen off: the scenarios send no `setScreenMode`, so every set is measured
    // and the live run's Nordrassil drop (ADR-0035 band rule) is not
    // reproduced here; the live sweep examines that drop.

    it("497-A: at worn Thunderheart 0-4 the 4pc Breaks line is the Thunderheart bonuses the increment loses and the pieces line is pieces plus the bonus", async () => {
      // Scenario kind: worn Malorne 0, worn Thunderheart k in the live
      // sweep's order, Malorne and Nordrassil candidates whose 4pc pays far
      // more than any break. A leak of Thunderheart loss into the 4pc lines
      // moves one of them off the model value by a fixed amount.
      //
      // Hand-derived 4pc increment (set pieces 100, neutral 120, Thunderheart 100;
      // Breaks / pieces). Replacing a neutral piece is -20 a piece, a
      // Thunderheart piece 0, plus 400 for the 4pc:
      //   k=0 Malorne: 2 neutral added               ->  none / 360
      //       Nordrassil chest: 3 neutral added      ->  none / 340
      //   k=1 Malorne: 2 neutral, or Th hands + 1    ->  none / 360 or 380
      //       Nordrassil chest: Th hands + 2 neutral ->  none / 360
      //   k=2 head/shoulder/chest: Th hands + legs   ->   -50 / 400
      //       hands/legs (own swap broke the 2pc)    ->  none / 360
      //       Nordrassil chest: Th hands, legs + 1   ->   -50 / 380
      //   k=3 every Malorne row: 2 Thunderheart      ->   -50 / 400
      //       Nordrassil chest: 2 Th + 1 neutral     ->   -50 / 380
      //   k=4 head: 2pc increment -80 (the 4pc) / 40; 4pc increment -50 / 400
      //       a Thunderheart slot's row (own swap broke the 4pc): -50 / 400
      // Which pieces an increment adds is the engine's partner choice (ties, and
      // the close-calls estimate); the assertions price the pieces the
      // engine printed with the model, so a different partner moves the
      // expected value with it and only a leak fails.
      const view = await bonusGearView();
      const values = withSetValues([
        ...Object.values(MALORNE),
        ...Object.values(NORDRASSIL),
      ]);
      const rows = [
        ...Object.values(MALORNE).map((id) => ({ id, setId: 640 })),
        { id: NORDRASSIL.chest, setId: 641 },
      ];
      let fourPcIncrementsWithBreaks = 0;
      for (let k = 0; k <= 4; k += 1) {
        const worn = sweepWorn(k);
        const { ranking: r } = await runScenario({
          worn: wornGear(worn),
          pool: [
            ...setPool(MALORNE),
            ...setPool(NORDRASSIL),
            ...SWEEP_TH_ORDER.map((slot) => ({
              itemId: NEUTRAL[slot][0],
              slot,
            })),
          ],
          itemValue: values,
          setBonuses: SWEEP_BONUSES,
          measureSetBonuses: true,
        });
        // At k = 0 the engine drops both head candidates (Malorne 29098,
        // Nordrassil 30228); the ranking's substitutions say gem repair found
        // no recolor that activates their meta (32409: 2 red, 2 yellow,
        // 2 blue) over this gemless gear, as in the fork's
        // `ui/features/upgrades/model/rank_set_unlisted_breaks.test.ts` ("a set
        // with bonuses above 4 pieces is measured at every worn count"). From
        // k = 1 both rank
        // (hypothesis: the worn Thunderheart pieces add the sockets the
        // repair needs). It is the fixture's gear, not a set-bonus path, so
        // the head row is checked where it is ranked.
        const ranked = rows.filter(({ id }) => k > 0 || id !== MALORNE.head);
        for (const { id, setId } of ranked) {
          const row = thRow(r, id);
          const where = `k=${k} row ${id}`;
          expect(futureOf(row, 4)?.sameGearDps, where).toBeCloseTo(
            setId === 640 ? MALORNE_4PC_DPS : NORDRASSIL_4PC_DPS,
            9
          );
          const increments = view.setPotentialIncrements(
            row.setContext,
            FLOOR
          ) as SplitIncrementTerm[] | null;
          expect(increments, `${where}: increments nest`).not.toBeNull();
          const increment4 = increments!.find((s) => s.threshold === 4);
          expect(increment4, `${where}: 4pc increment`).toBeDefined();
          const setIds = Object.values(setId === 640 ? MALORNE : NORDRASSIL);
          const earlier: number[] = [];
          for (const s of increments!) {
            const added = s.pieces.map((p) => p.itemId);
            const want = modelIncrementLines({
              worn,
              rowId: id,
              setId,
              setIds,
              earlier,
              added,
              values,
            });
            const at = `${where} increment ${s.threshold}`;
            if (want.breaks === 0) {
              expect(s.breaksLineDps, at).toBeUndefined();
              expect(s.dps, at).toBeCloseTo(want.pieces, 9);
            } else {
              expect(s.breaksLineDps, at).toBeCloseTo(want.breaks, 9);
              expect(s.piecesLineDps, at).toBeCloseTo(want.pieces, 9);
              if (s.threshold === 4) fourPcIncrementsWithBreaks += 1;
            }
            earlier.push(...added);
          }
        }
        expectSplitLinesAddUp(view, r);
      }
      // The sweep reaches a 4pc increment that breaks Thunderheart (k >= 2).
      expect(fourPcIncrementsWithBreaks).toBeGreaterThan(0);
      // Every feral run reads hit (ticket 830), so each repair searches with
      // the hit term; alone, this sweep took 57 s on 2026-11-09.
    }, 180_000);
  }
);

/* ------------------------------------------------------------------ *
 * Ticket 872: six more set-phase requests that cannot be built give a line
 * that ends in the caught error and does not say a sim failed.
 * ------------------------------------------------------------------ */

const noRowError = (itemId: number) =>
  `the request database has no row for item ${itemId}`;

describe.skipIf(!forkPresent)(
  "more set requests that cannot be built (872)",
  () => {
    const quiet = () => vi.spyOn(console, "warn").mockImplementation(() => {});

    /** Worn Malorne 4 whose Gauntlets have no row, so no ladder rung can be built. */
    const noGauntletRow: Scenario = {
      worn: wornGear(MALORNE_4),
      pool: [
        { itemId: THUNDERHEART.head, slot: "head" },
        { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.hands, slot: "hands" },
      ],
      measureSetBonuses: true,
      databaseWithout: [MALORNE.hands],
    };

    it("872-L: a worn-set ladder rung that cannot be built names the error, not a failed sim", async () => {
      const warn = quiet();
      try {
        const { ranking } = await runScenario(noGauntletRow);
        const malorne = setSkipLines(ranking).filter(
          (l) => l.field === "Malorne Harness set"
        );
        expect(malorne).toEqual([
          {
            field: "Malorne Harness set",
            detail:
              "The value of the Malorne Harness set on your gear was not fully measured, because its sim could not be built.",
            error: noRowError(MALORNE.hands),
          },
        ]);
      } finally {
        warn.mockRestore();
      }
    });

    it("872-R: a bonus-list request that cannot be built names the error, and no failed count is a break", async () => {
      const warn = quiet();
      try {
        const { ranking } = await runScenario({
          ...noGauntletRow,
          reportsSetBonuses: true,
        });
        expect(setSkipLines(ranking)).toContainEqual({
          field: "Malorne Harness set",
          detail:
            "The Malorne Harness set bonuses were not all measured, because the check that lists the set's bonuses could not be built.",
          error: noRowError(MALORNE.hands),
        });
        expect(
          (ranking.wornSetLadder ?? [])
            .filter((e) => e.setId === 640)
            .map((e) => e.counted)
        ).toEqual([false, false, false]);
      } finally {
        warn.mockRestore();
      }
    });
  }
);
