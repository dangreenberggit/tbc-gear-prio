/**
 * Set-bonus NET value (ticket 467), on the fork's ported engine.
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

import { describe, expect, it } from "vitest";

import { forkPresent, importForkUpgrades } from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

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

const SIM_ORDER = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger1",
  "finger2",
  "trinket1",
  "trinket2",
  "mainhand",
  "offhand",
  "ranged",
] as const;

type SimOrderName = (typeof SIM_ORDER)[number];
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
 * literal here so the model does not read the code under test; case 511-C
 * checks that the two agree.
 */
const COPY_OFFSET = 1_000_000;

/**
 * The fork's set-kept copy id offset (`SET_KEPT_ID_OFFSET`, ticket 512): a copy
 * that keeps its set. A literal for the same reason as `COPY_OFFSET`; 511-C
 * checks that the two agree.
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
  measureBrokenSetValue?: boolean;
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
  /** `Deps.partnerRule` (ticket 511); absent means the engine's default. */
  partnerRule?: string;
  /** `Deps.setScreen` (ticket 511, K5R); absent means off. */
  setScreen?: string;
  /** A store shared between runs, to see what the ranking cache serves. */
  store?: Record<string, unknown>;
};

type ForkRanking = {
  contentHash: string;
  items: Array<{
    itemId: number;
    deltaDps: number;
    owned?: boolean;
    setContext?: {
      setId: number;
      setName: string;
      piecesWornBefore: number;
      piecesAfterSwap: number;
      crossesThreshold: boolean;
      nextThreshold: number | null;
      stepRanking?: true;
      singleDeltaDps?: number;
      singleBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      futureBonuses?: Array<{
        threshold: number;
        piecesNeeded: number;
        dps?: number;
        sameGearDps?: number;
        sameGearSe?: number;
        belowGate?: true;
        stepGearDps?: number;
        stepGearSe?: number;
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
  setStepSims?: {
    partnerRule: string;
    gears: number;
    simmed: number;
    fromStore: number;
  };
  crossingGates?: Array<{
    setId: number;
    count: number;
    itemId: number;
    dps?: number;
    cleared: boolean;
  }>;
  partnerAudit?: Array<{
    itemId: number;
    setId: number;
    count: number;
    audit: {
      sets: Array<{
        itemIds: number[];
        totalDps: number | null;
        estimateZ: number | null;
        estimateZ0: number | null;
      }>;
      chosen: { itemIds: number[]; totalDps: number };
    };
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
    belowGate?: true;
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
  setScreen?: {
    mode: string;
    seed: number;
    pairIterations: number[];
    ladderIterations: number[];
    sets: Array<{
      setId: number;
      worn: number;
      reach: number;
      packageItemIds: number[];
      pairs: Array<{ iterations: number; dps?: number; pairedSe?: number }>;
      rungs: Array<{
        iterations: number;
        count: number;
        dps?: number;
        se?: number;
        pairedSeToPrev?: number;
      }>;
    }>;
    simmed: number;
    fromStore: number;
  };
};

async function runScenario(scenario: Scenario): Promise<{
  ranking: ForkRanking;
  runCount: number;
  /** The equipped ids of each request the fake sim ran, in call order. */
  calls: number[][];
  /** The options of each of those requests, in the same order. */
  callOpts: SimRunOpts[];
}> {
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
  }>("engine/seams/gear-source.ts");
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
  const calls: number[][] = [];
  const callOpts: SimRunOpts[] = [];
  const { simCacheKey } = seamMod;
  const sim = {
    version: () => Promise.resolve(SIM_VERSION),
    run: (req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> => {
      runCount += 1;
      const ids = equippedIds(req);
      calls.push(ids);
      callOpts.push({ ...opts });
      if (scenario.failWhen?.(ids, opts)) {
        return Promise.reject(new Error("the model sim failed on purpose"));
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
      return Promise.resolve({
        dps,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
        ...(opts.saveAllValues === true
          ? { allValues: new Array<number>(opts.iterations).fill(dps) }
          : {}),
      });
    },
  };
  void simCacheKey;

  const input = {
    character: FERAL_CHAR,
    spec: "feral",
    maxPhase: 5,
    fight: fightRef,
    iterations: ITERATIONS,
    seeds: [11],
    candidateCap: 100,
  };

  const ranking = await rankMod.rankUpgrades(input, {
    gear: gearSource,
    sim,
    store: scenario.store ?? new storeMod.MemoryStore(),
    clock: () => new Date("2026-09-20T12:00:00.000Z"),
    raidSimSkeleton: feralSkeleton,
    epWeights: feralWeights,
    pool,
    ...(scenario.measureBrokenSetValue ? { measureBrokenSetValue: true } : {}),
    ...(scenario.partnerRule ? { partnerRule: scenario.partnerRule } : {}),
    ...(scenario.setScreen ? { setScreen: scenario.setScreen } : {}),
  });

  return { ranking, runCount, calls, callOpts };
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

describe.skipIf(!forkPresent)("fork set-bonus net value (467)", () => {
  it("case 1: worn 0, no other set — bonusDpsNet = raw b2/b4, no B sims", async () => {
    const { ranking, runCount } = await runScenario({
      worn: wornGear({}),
      pool: TH_POOL,
      measureBrokenSetValue: true,
    });
    const bonuses = ranking.setBonuses ?? [];
    const b2 = bonuses.find((b) => b.setId === 676 && b.threshold === 2);
    const b4 = bonuses.find((b) => b.setId === 676 && b.threshold === 4);
    expect(b2?.bonusDps).toBeDefined();
    expect(near(b2!.bonusDps!, B2_TH)).toBe(true);
    // No worn set breaks, so bonusDpsNet == raw and no brokenSetValues sims ran.
    expect(near(b2!.bonusDpsNet!, B2_TH)).toBe(true);
    expect(near(b4!.bonusDpsNet!, B4_TH)).toBe(true);
    expect(ranking.brokenSetValues ?? []).toHaveLength(0);
    // Row credit: full = b2+b4; split = b2/2 + b4/4.
    const row = thRow(ranking, THUNDERHEART.hands);
    const fut = row.setContext?.futureBonuses ?? [];
    const f2 = fut.find((f) => f.threshold === 2);
    const f4 = fut.find((f) => f.threshold === 4);
    expect(near(f2!.dps!, B2_TH)).toBe(true);
    expect(near(f4!.dps!, B4_TH)).toBe(true);
    void runCount;
  });

  it("case 4: Malorne 2pc worn in two Thunderheart slots — one B sim, nets exact", async () => {
    // Worn: Malorne in hands + legs (2pc active). Thunderheart worn 0.
    const { ranking } = await runScenario({
      worn: wornGear({ hands: MALORNE.hands, legs: MALORNE.legs }),
      pool: [
        ...TH_POOL,
        // Neutral candidates so the vacate has non-set replacements.
        { itemId: NEUTRAL.hands[0], slot: "hands" },
        { itemId: NEUTRAL.legs[0], slot: "legs" },
      ],
      measureBrokenSetValue: true,
    });
    // Exactly one B sim: Malorne 2pc.
    const bsv = ranking.brokenSetValues ?? [];
    const mal = bsv.filter((b) => b.setId === 640 && b.threshold === 2);
    expect(mal).toHaveLength(1);
    expect(mal[0]!.dps).toBeDefined();
    expect(near(mal[0]!.dps!, B2_MAL, 0.5)).toBe(true);
    // 2pc net = b2 (k=2, c=1 -> raw - B); 4pc net = b4 (k=2, c=2 -> raw).
    const bonuses = ranking.setBonuses ?? [];
    const th2 = bonuses.find((b) => b.setId === 676 && b.threshold === 2);
    const th4 = bonuses.find((b) => b.setId === 676 && b.threshold === 4);
    expect(near(th2!.bonusDpsNet!, B2_TH, 0.5)).toBe(true);
    expect(near(th4!.bonusDpsNet!, B4_TH, 0.5)).toBe(true);
    // The loss is disclosed on every Thunderheart row: breaking rows carry it as
    // a singleBreak (inside deltaDps), non-breaking rows as a commitBreak.
    for (const row of ranking.items.filter(
      (i) => i.setContext?.setId === 676
    )) {
      const single = row.setContext?.singleBreaks ?? [];
      const commit = row.setContext?.commitBreaks ?? [];
      const hasMalorne = [...single, ...commit].some(
        (b) => b.setId === 640 && near(b.dps ?? -1, B2_MAL, 0.5)
      );
      expect(hasMalorne).toBe(true);
    }
  });

  it("cases 2/3: worn 1/2/3 futures shrink; worn 3 has none", async () => {
    // worn 1 Thunderheart (hands): future = [4pc, 3 needed]; crossesThreshold.
    const worn1 = await runScenario({
      worn: wornGear({ hands: THUNDERHEART.hands }),
      pool: TH_POOL.filter((p) => p.slot !== "hands"),
      measureBrokenSetValue: true,
    });
    const row1 = worn1.ranking.items.find((i) => i.setContext?.setId === 676);
    expect(row1?.setContext?.piecesWornBefore).toBe(1);
    // Ticket 511 (K5): every count above the swap's count is a future. The
    // model has no bonus at 3 or 5, so those two are below the gate.
    const fut1 = row1?.setContext?.futureBonuses ?? [];
    expect(fut1.map((f) => [f.threshold, f.belowGate ?? false])).toEqual([
      [3, true],
      [4, false],
      [5, true],
    ]);
    expect(fut1.find((f) => f.threshold === 4)?.piecesNeeded).toBe(3);

    // worn 3 Thunderheart: past 2pc, only 4pc could remain; with 3 worn and one
    // more swapped that is 4 -> crosses, no future above.
    const worn3 = await runScenario({
      worn: wornGear({
        hands: THUNDERHEART.hands,
        legs: THUNDERHEART.legs,
        chest: THUNDERHEART.chest,
      }),
      pool: [{ itemId: THUNDERHEART.shoulder, slot: "shoulder" }],
      measureBrokenSetValue: true,
    });
    const row3 = worn3.ranking.items.find((i) => i.setContext?.setId === 676);
    expect(row3?.setContext?.piecesWornBefore).toBe(3);
    // swapping the shoulder makes 4 -> crosses the 4pc, so no future threshold.
    expect(row3?.setContext?.futureBonuses ?? []).toHaveLength(0);
    expect(row3?.setContext?.crossesThreshold).toBe(true);
  });

  it("case 6: worn Malorne 3 pieces broken to below 2pc — Σown − Δ branch", async () => {
    // Malorne 3 worn (hands, legs, chest); Thunderheart pool includes hands+legs
    // so a 4pc Thunderheart package vacates 2 Malorne (3 -> 1, breaks 2pc).
    const { ranking } = await runScenario({
      worn: wornGear({
        hands: MALORNE.hands,
        legs: MALORNE.legs,
        chest: MALORNE.chest,
      }),
      pool: [
        ...TH_POOL,
        { itemId: NEUTRAL.hands[0], slot: "hands" },
        { itemId: NEUTRAL.legs[0], slot: "legs" },
      ],
      measureBrokenSetValue: true,
    });
    const bsv = (ranking.brokenSetValues ?? []).filter(
      (b) => b.setId === 640 && b.threshold === 2
    );
    expect(bsv).toHaveLength(1);
    // B recovered via the worn>t branch (Σown − Δ), same value.
    expect(near(bsv[0]!.dps!, B2_MAL, 0.5)).toBe(true);
  });

  it("case 7: no neutral replacement is needed — the ladder measures B on the worn gear", async () => {
    const viewMod = await importForkUpgrades<{
      rankableSetPotential: (
        item: { setContext?: unknown },
        noiseFloorDps: number,
        setCredit?: "full" | "split"
      ) => number;
    }>("engine/view.ts");
    // Malorne 2pc worn in hands+legs, Thunderheart pool in those slots, and
    // NO neutral candidate. Before ticket 512 the vacate had nothing to
    // vacate to and B was unmeasured; the ladder needs no replacement.
    const { ranking } = await runScenario({
      worn: wornGear({ hands: MALORNE.hands, legs: MALORNE.legs }),
      pool: TH_POOL, // only Thunderheart, no neutrals
      measureBrokenSetValue: true,
    });
    const bsv = (ranking.brokenSetValues ?? []).find(
      (b) => b.setId === 640 && b.threshold === 2
    );
    expect(bsv?.unmeasured).toBeUndefined();
    expect(near(bsv!.dps!, B2_MAL, 0.5)).toBe(true);
    const th4 = (ranking.setBonuses ?? []).find(
      (b) => b.setId === 676 && b.threshold === 4
    );
    expect(near(th4!.bonusDpsNet!, B4_TH, 0.5)).toBe(true);
    // The hands row breaks the Malorne 2pc alone; its path adds head, chest
    // and shoulder: 50 + 100, then + 80 + 200 = 430, and 60 + 430 = pkgΔ4.
    const hands = thRow(ranking, THUNDERHEART.hands);
    expect((hands.setContext?.singleBreaks ?? []).map(brk)).toEqual([
      { setId: 640, threshold: 2, dps: 40 },
    ]);
    expect(near(hands.deltaDps, 60, 0.5)).toBe(true);
    expect(
      near(viewMod.rankableSetPotential(hands, FLOOR, "full"), 430, 0.5)
    ).toBe(true);
  });

  it("case 8: flag absent — no brokenSetValues; the flag adds only the ladder, gate and step-gear sims", async () => {
    const worn = wornGear({ hands: MALORNE.hands, legs: MALORNE.legs });
    const pool = [
      ...TH_POOL,
      { itemId: NEUTRAL.hands[0], slot: "hands" as const },
      { itemId: NEUTRAL.legs[0], slot: "legs" as const },
    ];
    const off = await runScenario({ worn, pool });
    const on = await runScenario({ worn, pool, measureBrokenSetValue: true });
    expect(off.ranking.brokenSetValues ?? []).toHaveLength(0);
    // The flag adds one ladder rung per worn Malorne piece (2), two gate sims
    // for each count the pool reaches (2, 3 and 4: 6) and the step gears no
    // package sim already covers, the close calls' included (5), and nothing
    // else (tickets 511 and 512; derivations "Ticket 511 (K5)" and "The
    // close-calls partner rule", case 8).
    expect(on.runCount).toBeGreaterThan(off.runCount);
    const bCount = (on.ranking.brokenSetValues ?? []).filter(
      (b) => b.dps !== undefined
    ).length;
    expect(bCount).toBe(1);
    expect(on.runCount - off.runCount).toBe(2 + 6 + 5);
  });

  it("case 9: split credit reorders via applyView", async () => {
    const viewMod = await importForkUpgrades<{
      applyView: (
        r: unknown,
        v: { withSetPotential?: boolean; setCredit?: "full" | "split" }
      ) => { rows: Array<{ itemId: number }> };
    }>("engine/view.ts");
    // A Ranking with two set rows whose full vs split ordering differs, plus a
    // non-set row that sits between them under split.
    const ranking = {
      baseline: { dps: 3000 },
      cutoff: { absDps: 3.4, absPct: 0.1 },
      items: [
        {
          itemId: 1,
          deltaDps: 10,
          se: 1,
          seMethod: "independent",
          bisTags: [],
          belowCutoff: false,
          setContext: {
            setId: 676,
            setName: "S",
            piecesWornBefore: 0,
            piecesAfterSwap: 1,
            nextThreshold: 4,
            crossesThreshold: false,
            futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 200 }],
          },
        },
        {
          itemId: 2,
          deltaDps: 65,
          se: 1,
          seMethod: "independent",
          bisTags: [],
          belowCutoff: false,
        },
      ],
    };
    // full: row1 = 10 + 200 = 210 > row2 = 65 -> [1, 2].
    const full = viewMod.applyView(ranking, {
      withSetPotential: true,
      setCredit: "full",
    });
    expect(full.rows.map((r) => r.itemId)).toEqual([1, 2]);
    // split: row1 = 10 + 200/4 = 60 < row2 = 65 -> reorders to [2, 1].
    const split = viewMod.applyView(ranking, {
      withSetPotential: true,
      setCredit: "split",
    });
    expect(split.rows.map((r) => r.itemId)).toEqual([2, 1]);
    // omitted setCredit behaves as full.
    const dflt = viewMod.applyView(ranking, { withSetPotential: true });
    expect(dflt.rows.map((r) => r.itemId)).toEqual([1, 2]);
  });
});

/* ------------------------------------------------------------------ *
 * Pure view functions (no adapter): credit views and the fallback rule.
 * ------------------------------------------------------------------ */

describe.skipIf(!forkPresent)("rankableSetPotential credit views (467)", () => {
  it("full and split credit; commit-break subtraction; missing-dps fallback", async () => {
    const viewMod = await importForkUpgrades<{
      rankableSetPotential: (
        item: { setContext?: unknown },
        noiseFloorDps: number,
        setCredit?: "full" | "split"
      ) => number;
    }>("engine/view.ts");
    const { rankableSetPotential } = viewMod;
    const floor = 5;

    const ctx = {
      setContext: {
        futureBonuses: [
          { threshold: 2, piecesNeeded: 2, dps: 50 },
          { threshold: 4, piecesNeeded: 4, dps: 80 },
        ],
      },
    };
    // full = 50 + 80 = 130; split = 50/2 + 80/4 = 25 + 20 = 45.
    expect(rankableSetPotential(ctx, floor, "full")).toBe(130);
    expect(rankableSetPotential(ctx, floor, "split")).toBe(45);
    // Default is full.
    expect(rankableSetPotential(ctx, floor)).toBe(130);

    // A break on the future's own path subtracts (490).
    const withBreak = {
      setContext: {
        futureBonuses: [
          {
            threshold: 4,
            piecesNeeded: 4,
            dps: 80,
            breaks: [{ setId: 640, threshold: 2, dps: 40 }],
          },
        ],
      },
    };
    expect(rankableSetPotential(withBreak, floor, "full")).toBe(40);
    // A measured break on the top package alone is disclosure, not charged:
    // the row's own path may not need it (490).
    const topPackageOnly = {
      setContext: {
        futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 80 }],
        commitBreaks: [{ setId: 640, threshold: 2, dps: 40 }],
      },
    };
    expect(rankableSetPotential(topPackageOnly, floor, "full")).toBe(80);

    // Fallback: any future bonus lacking dps -> whole credit 0.
    const unmeasured = {
      setContext: {
        futureBonuses: [{ threshold: 4, piecesNeeded: 4 }],
      },
    };
    expect(rankableSetPotential(unmeasured, floor, "full")).toBe(0);
    expect(rankableSetPotential(unmeasured, floor, "split")).toBe(0);

    // Below-floor component is dropped.
    const tiny = {
      setContext: {
        futureBonuses: [{ threshold: 2, piecesNeeded: 2, dps: 4 }],
      },
    };
    expect(rankableSetPotential(tiny, floor, "full")).toBe(0);
  });
});

/* ------------------------------------------------------------------ *
 * Tickets 476, 477, 478: every lost threshold, the solved B, the
 * inflation sign, the commit-break fallback and the owned-row guard.
 * Every literal is derived by hand from the controlled model in
 * docs/set-bonus-fixture-derivations.md.
 * ------------------------------------------------------------------ */

const FLOOR = 5;

type ViewMod = {
  rankableSetPotential: (
    item: { setContext?: unknown },
    noiseFloorDps: number,
    setCredit?: "full" | "split"
  ) => number;
};

async function viewModule(): Promise<ViewMod> {
  return importForkUpgrades<ViewMod>("engine/view.ts");
}

/** Runs a scenario with the B flag off and on, for the sim-count invariant. */
async function runOffOn(scenario: Omit<Scenario, "measureBrokenSetValue">) {
  const off = await runScenario(scenario);
  const on = await runScenario({ ...scenario, measureBrokenSetValue: true });
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
    const view = await viewModule();
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
      // K5: count 3 has no model bonus, so it is a below-gate future.
      expect((ctx.futureBonuses ?? []).map(fut)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: 50 },
        { threshold: 3, piecesNeeded: 3, dps: undefined },
        { threshold: 4, piecesNeeded: 4, dps: 80 },
      ]);
      // 502: each row shows the whole 4pc swap, 30 + 390 = pkgΔ4 420.
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), 390, 0.5)
      ).toBe(true);
      expect(near(view.rankableSetPotential(row, FLOOR, "split"), 5, 0.5)).toBe(
        true
      );
    }
    // One ladder rung per worn Malorne piece (4), two gate sims for each of
    // the counts 2, 3 and 4 (tickets 511 and 512), and the step gears no
    // package covers: every pair but the 2pc package, since each row's three
    // 2pc partner sets are close calls (K5S).
    expect(on.runCount - off.runCount).toBe(4 + 6 + 5);
    // C31 / ADR-0034: rows are not additive in either credit view. Each row
    // shows the whole swap; four rows sum to 1560 under full and 20 under split.
    const rows = TH_FOUR_IDS.map((id) => thRow(r, id));
    const fullSum = rows.reduce(
      (s, row) => s + view.rankableSetPotential(row, FLOOR, "full"),
      0
    );
    const splitSum = rows.reduce(
      (s, row) => s + view.rankableSetPotential(row, FLOOR, "split"),
      0
    );
    expect(near(fullSum, 1560, 2)).toBe(true);
    expect(near(splitSum, 20, 2)).toBe(true);
  });

  it("476-B: worn Malorne 5 — both thresholds lost by the package, net4 sign fixed", async () => {
    const view = await viewModule();
    const { ranking: r } = await runScenario({
      worn: wornGear({ ...MALORNE_4, legs: MALORNE.legs }),
      pool: TH_OVER_MALORNE_POOL,
      measureBrokenSetValue: true,
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
    expect(near(view.rankableSetPotential(row, FLOOR, "full"), 320, 0.5)).toBe(
      true
    );
  });

  it("477-P: a commit break without a measured B zeroes the credit", async () => {
    const view = await viewModule();
    const item = {
      setContext: {
        futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 80 }],
        commitBreaks: [{ setId: 640, threshold: 2 }],
      },
    };
    expect(view.rankableSetPotential(item, FLOOR, "full")).toBe(0);
    expect(view.rankableSetPotential(item, FLOOR, "split")).toBe(0);
  });

  it("477-T: the legs row's substituted package breaks Malorne 2pc — measured, net shown", async () => {
    // D3: Malorne chest, hands, legs worn (2pc active). Thunderheart wrist,
    // waist, feet at 150 let the 4pc package avoid all but one Malorne slot, so
    // only the legs row's substituted package breaks the 2pc.
    const view = await viewModule();
    const itemValue = new Map(ITEM_VALUE);
    for (const id of [
      THUNDERHEART.wrist,
      THUNDERHEART.waist,
      THUNDERHEART.feet,
    ])
      itemValue.set(id, 150);
    const { off, on } = await runOffOn({
      worn: wornGear({
        chest: MALORNE.chest,
        hands: MALORNE.hands,
        legs: MALORNE.legs,
      }),
      pool: [
        { itemId: THUNDERHEART.wrist, slot: "wrist" },
        { itemId: THUNDERHEART.waist, slot: "waist" },
        { itemId: THUNDERHEART.feet, slot: "feet" },
        { itemId: THUNDERHEART.hands, slot: "hands" },
        { itemId: THUNDERHEART.legs, slot: "legs" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
        { itemId: NEUTRAL.hands[0], slot: "hands" },
      ],
      itemValue,
    });
    const r = on.ranking;
    const legs = thRow(r, THUNDERHEART.legs);
    expect(near(legs.deltaDps, 100, 0.5)).toBe(true);
    expect(legs.setContext?.singleBreaks ?? []).toEqual([]);
    expect((legs.setContext?.futureBonuses ?? []).map(fut)).toEqual([
      { threshold: 2, piecesNeeded: 2, dps: 50 },
      { threshold: 3, piecesNeeded: 3, dps: undefined },
      { threshold: 4, piecesNeeded: 4, dps: 80 },
      { threshold: 5, piecesNeeded: 5, dps: undefined },
    ]);
    // The top package with legs substituted breaks Malorne 2pc, so it is a
    // measurement target and disclosed. The legs row's own path to each future
    // (legs plus the best remaining package pieces) keeps Malorne chest and
    // hands, so it breaks nothing (490, C27). Since 502 the path pieces'
    // own stats count too: 50 + 150 (wrist), then + 80 + 150 + 150 = 580.
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect((legs.setContext?.commitBreaks ?? []).map(brk)).toEqual([
      { setId: 640, threshold: 2, dps: 40 },
    ]);
    for (const f of legs.setContext?.futureBonuses ?? []) {
      expect(f.breaks ?? []).toEqual([]);
    }
    expect(near(view.rankableSetPotential(legs, FLOOR, "full"), 580, 0.5)).toBe(
      true
    );
    // The ladder sims one rung per worn Malorne piece (3), however many rows
    // share a break; (640,3) reads 0 and is not counted, so one B is kept.
    // The others are the gates of counts 2 to 5 (8, ticket 511) and the
    // nine step gears no package covers, the close calls' included (K5S).
    const measured = (r.brokenSetValues ?? []).filter(
      (b) => b.dps !== undefined
    ).length;
    expect(on.runCount - off.runCount).toBe(3 + 8 + 9);
    expect(measured).toBe(1);
    // The package's own members break nothing. Since 502 each shows the
    // package delta 680: wrist, waist and feet 150 + 530, hands 100 + 580.
    for (const [id, credit] of [
      [THUNDERHEART.wrist, 530],
      [THUNDERHEART.waist, 530],
      [THUNDERHEART.feet, 530],
      [THUNDERHEART.hands, 580],
    ] as const) {
      const row = thRow(r, id);
      expect(row.setContext?.commitBreaks ?? []).toEqual([]);
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), credit, 0.5)
      ).toBe(true);
    }
  });

  it("A3-U: netInflation adds back a break only the 2pc package's end state has", async () => {
    const setValue = await importForkUpgrades<{
      netInflation: (
        keys: ReadonlyArray<{
          setId: number;
          threshold: number;
          membersPkg: number;
          members2pc: number;
          pkgEnd: number;
          twoPcEnd: number;
          B: number;
        }>
      ) => number;
    }>("engine/set-value.ts");
    // I = (membersPkg − members2pc − pkgEnd + twoPcEnd)·B = (0 − 0 − 0 + 1)·40.
    const raw = 100;
    const inflation = setValue.netInflation([
      {
        setId: 999,
        threshold: 2,
        membersPkg: 0,
        members2pc: 0,
        pkgEnd: 0,
        twoPcEnd: 1,
        B: 40,
      },
    ]);
    expect(raw - inflation).toBe(60);
  });

  it("A3-R: no implemented-set member is a ring or trinket (478 wontfix pin)", async () => {
    // 478 A3's ring/trinket half is wontfix because no member of an
    // IMPLEMENTED_IN_SIM set sits in a two-slot item type (11 finger, 12
    // trinket), so a set piece never has two candidate slots. This pins it.
    const setValue = await importForkUpgrades<{
      IMPLEMENTED_SET_IDS: readonly number[];
    }>("engine/set-value.ts");
    const db = JSON.parse(
      readFileSync(
        join(root, "vendor/tbc-new-fork/assets/database/db.json"),
        "utf8"
      )
    ) as { items: Array<{ id: number; type: number; setId?: number }> };
    // Read from the engine so a set added to the table is covered too; an
    // empty list would make the check below pass vacuously.
    const implemented = new Set(setValue.IMPLEMENTED_SET_IDS);
    expect(implemented.size).toBeGreaterThan(0);
    const twoSlot = db.items.filter(
      (i) =>
        i.setId !== undefined &&
        implemented.has(i.setId) &&
        (i.type === 11 || i.type === 12)
    );
    expect(twoSlot).toEqual([]);
  });

  it("A4: an owned row's swap adds no piece, so it gets no future credit", async () => {
    // D4: Thunderheart hands + legs worn; the pool holds the worn hands (owned).
    const view = await viewModule();
    const { ranking: r } = await runScenario({
      worn: wornGear({ hands: THUNDERHEART.hands, legs: THUNDERHEART.legs }),
      pool: [
        { itemId: THUNDERHEART.hands, slot: "hands" },
        { itemId: THUNDERHEART.head, slot: "head" },
        { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
      ],
      measureBrokenSetValue: true,
    });
    // At worn 2 the 2pc package loop skips threshold 2 before pushing anything.
    expect(
      (r.setBonuses ?? []).filter((b) => b.setId === 676 && b.threshold === 2)
    ).toEqual([]);
    const owned = thRow(r, THUNDERHEART.hands);
    expect(owned.owned).toBe(true);
    expect(owned.setContext?.piecesWornBefore).toBe(2);
    expect(owned.setContext?.piecesAfterSwap).toBe(2);
    expect(owned.setContext?.futureBonuses).toBeUndefined();
    expect(view.rankableSetPotential(owned, FLOOR, "full")).toBe(0);
    expect(view.rankableSetPotential(owned, FLOOR, "split")).toBe(0);
    const head = thRow(r, THUNDERHEART.head);
    expect((head.setContext?.futureBonuses ?? []).map(fut)).toEqual([
      { threshold: 4, piecesNeeded: 2, dps: 80 },
      { threshold: 5, piecesNeeded: 3, dps: undefined },
    ]);
    // 502: 80 + the chest's own 100.
    expect(near(view.rankableSetPotential(head, FLOOR, "full"), 180, 0.5)).toBe(
      true
    );
  });
});

/* ------------------------------------------------------------------ *
 * Tickets 490-493: breaks charged along each future's own path, one
 * stopping point chosen on full values, the "not counted" rule, and the
 * worn-1 4pc recovered with one pair sim. Every literal is derived by hand
 * from the controlled model in docs/set-bonus-fixture-derivations.md.
 * ------------------------------------------------------------------ */

/** Item values with the given set pieces at the Thunderheart value (100). */
function withSetValues(ids: readonly number[]): Map<number, number> {
  const values = new Map(ITEM_VALUE);
  for (const id of ids) values.set(id, V_TH);
  return values;
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

type SetCreditRule = "best-stop" | "full-path";

type SubLineMod = ViewMod & {
  /**
   * The 490 stopping rule the engine applies. "best-stop": stop at the
   * threshold where committing pays best on full values, or not at all.
   * "full-path": charge every break on the path to every credited future.
   * An owner preference, not a game fact; only 490-B separates them.
   */
  RULE_490: SetCreditRule;
  setPotentialCredit: (
    ctx: unknown,
    noiseFloorDps: number,
    setCredit?: "full" | "split",
    rule?: SetCreditRule
  ) => number;
  setCreditUnmeasured: (ctx: unknown) => boolean;
  setPotentialTerms: (
    ctx: unknown,
    noiseFloorDps: number,
    rule?: SetCreditRule
  ) => {
    credit: number;
    stopThreshold: number;
    terms: Array<
      | {
          kind: "bonus";
          setName: string;
          threshold: number;
          have: number;
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
  applyView: (
    r: unknown,
    v: { withSetPotential?: boolean; setCredit?: "full" | "split" }
  ) => { rows: Array<{ itemId: number }> };
};

// D-490: Thunderheart hands + legs worn (676 at 2); neutral hands and legs so
// B(676,2) can be measured.
const TH_HANDS_LEGS = wornGear({
  hands: THUNDERHEART.hands,
  legs: THUNDERHEART.legs,
});
const NEUTRAL_HANDS_LEGS: PoolSpec[] = [
  { itemId: NEUTRAL.hands[0], slot: "hands" },
  { itemId: NEUTRAL.legs[0], slot: "legs" },
];
const setPool = (set: Readonly<Partial<Record<PoolSpec["slot"], number>>>) =>
  (Object.entries(set) as Array<[PoolSpec["slot"], number]>).map(
    ([slot, itemId]) => ({ itemId, slot })
  );

async function run490(setBonuses?: SetBonusTable) {
  return runOffOn({
    worn: TH_HANDS_LEGS,
    pool: [...setPool(MALORNE), ...NEUTRAL_HANDS_LEGS],
    itemValue: withSetValues(Object.values(MALORNE)),
    ...(setBonuses ? { setBonuses } : {}),
  });
}

const TH2_BREAK = { setId: 676, threshold: 2, dps: 50 };

describe.skipIf(!forkPresent)("commit breaks per future (490-493)", () => {
  it("490-A: a Malorne head/shoulder/chest row is not charged the Thunderheart 2pc its 2pc does not need", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { off, on } = await run490({
      676: { b2: B2_TH, b4: B4_TH },
      640: { b2: 40, b4: 0 },
    });
    const r = on.ranking;
    expect(near(r.baseline.dps, 3250, 0.5)).toBe(true);
    expect(near(bsvDps(r, 676, 2)!, 50, 0.5)).toBe(true);
    // Two ladder rungs (Thunderheart worn 2), two gate sims for each of the
    // Malorne counts 2 to 5 (8), eight step gears no package covers (the
    // close calls' included, K5S), and one package sim fewer: the 4pc, worth
    // 0 here, is below the gate (K5).
    expect(on.runCount - off.runCount).toBe(2 + 8 + 8 - 1);
    expect(sortedIds(bonusOf(r, 640, 2)?.packageItemIds)).toEqual([
      29096, 29098,
    ]);
    expect(sortedIds(bonusOf(r, 640, 4)?.packageItemIds)).toEqual([
      29096, 29097, 29098, 29100,
    ]);
    for (const id of [MALORNE.chest, MALORNE.head, MALORNE.shoulder]) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 100, 0.5)).toBe(true);
      expect(row.setContext?.singleBreaks ?? []).toEqual([]);
      // K5: the Malorne 4pc is worth 0 here, so it is below the gate, has no
      // package and no path, and the top measured package is the 2pc, which
      // breaks nothing.
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: 40, breaks: [] },
        { threshold: 3, piecesNeeded: 3, dps: undefined, breaks: [] },
        { threshold: 4, piecesNeeded: 4, dps: undefined, breaks: [] },
        { threshold: 5, piecesNeeded: 5, dps: undefined, breaks: [] },
      ]);
      expect(row.setContext?.commitBreaks ?? []).toEqual([]);
      // 502: 40 + the 2pc partner's own 100; the 4pc floors to 0.
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), 140, 0.5)
      ).toBe(true);
      expect(
        near(view.rankableSetPotential(row, FLOOR, "split"), 20, 0.5)
      ).toBe(true);
    }
    for (const id of [MALORNE.hands, MALORNE.legs]) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, -50, 0.5)).toBe(true);
      expect((row.setContext?.singleBreaks ?? []).map(brk)).toEqual([
        TH2_BREAK,
      ]);
      // K5: a step future names every worn bonus its step gear loses, so the
      // 2pc names the row's own Thunderheart 2pc break; the rest are below
      // the gate.
      expect(
        (row.setContext?.futureBonuses ?? []).map((f) => [
          f.threshold,
          (f.breaks ?? []).map(brk),
        ])
      ).toEqual([
        [2, [TH2_BREAK]],
        [3, []],
        [4, []],
        [5, []],
      ]);
      // 502: 40 + the chest's own 100.
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), 140, 0.5)
      ).toBe(true);
    }
    const top3 = view
      .applyView(r, { withSetPotential: true })
      .rows.slice(0, 3)
      .map((row) => row.itemId);
    expect(sortedIds(top3)).toEqual([29096, 29098, 29100]);
  });

  it("490-B: a real 4pc worth less than the break it needs", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { on } = await run490({
      676: { b2: B2_TH, b4: B4_TH },
      640: { b2: 40, b4: 30 },
    });
    const chest = thRow(on.ranking, MALORNE.chest);
    expect((chest.setContext?.futureBonuses ?? []).map(futB)).toEqual([
      { threshold: 2, piecesNeeded: 2, dps: 40, breaks: [] },
      { threshold: 3, piecesNeeded: 3, dps: undefined, breaks: [] },
      { threshold: 4, piecesNeeded: 4, dps: 30, breaks: [TH2_BREAK] },
      { threshold: 5, piecesNeeded: 5, dps: undefined, breaks: [] },
    ]);
    // Each rule on this row directly, so the rule the engine does not ship
    // still runs. Since 502 the path pieces' own stats count: R_2 = 40 + 100,
    // R_4 = 140 + 30 + 100 + 0 − 50 = 220, so both rules stop at the 4pc
    // (full 220, split 20 + 7.5 − 50 = −22.5). 502-B separates the rules.
    const ctx = chest.setContext;
    expect(
      near(view.setPotentialCredit(ctx, FLOOR, "full", "full-path"), 220, 0.5)
    ).toBe(true);
    expect(
      near(
        view.setPotentialCredit(ctx, FLOOR, "split", "full-path"),
        -22.5,
        0.5
      )
    ).toBe(true);
    expect(
      near(view.setPotentialCredit(ctx, FLOOR, "full", "best-stop"), 220, 0.5)
    ).toBe(true);
    expect(
      near(
        view.setPotentialCredit(ctx, FLOOR, "split", "best-stop"),
        -22.5,
        0.5
      )
    ).toBe(true);
    const full = view.rankableSetPotential(chest, FLOOR, "full");
    const split = view.rankableSetPotential(chest, FLOOR, "split");
    expect(near(full, 220, 0.5)).toBe(true);
    expect(near(split, -22.5, 0.5)).toBe(true);
  });

  it("490-C: a Nordrassil row whose only bonus needs the Thunderheart 2pc break gets ON = OFF", async () => {
    const view = await viewModule();
    const { ranking: r } = await runScenario({
      worn: TH_HANDS_LEGS,
      pool: [...setPool(NORDRASSIL), ...NEUTRAL_HANDS_LEGS],
      itemValue: withSetValues(Object.values(NORDRASSIL)),
      measureBrokenSetValue: true,
    });
    for (const id of [NORDRASSIL.chest, NORDRASSIL.head, NORDRASSIL.shoulder]) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 100, 0.5)).toBe(true);
      // K5: the model gives Nordrassil no bonus, so every count it can reach
      // is below the gate: no package, no path, no top package (W-S3).
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: undefined, breaks: [] },
        { threshold: 3, piecesNeeded: 3, dps: undefined, breaks: [] },
        { threshold: 4, piecesNeeded: 4, dps: undefined, breaks: [] },
        { threshold: 5, piecesNeeded: 5, dps: undefined, breaks: [] },
      ]);
      expect(row.setContext!.commitPackageDeltaDps).toBeUndefined();
      expect(view.rankableSetPotential(row, FLOOR, "full")).toBe(0);
      expect(view.rankableSetPotential(row, FLOOR, "split")).toBe(0);
    }
  });

  it("491-P: setCreditUnmeasured covers future breaks and commit breaks", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const first = {
      futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 80 }],
      commitBreaks: [{ setId: 640, threshold: 2 }],
    };
    expect(view.setCreditUnmeasured(first)).toBe(true);
    expect(
      view.setCreditUnmeasured({
        ...first,
        commitBreaks: [{ setId: 640, threshold: 2, dps: 40 }],
      })
    ).toBe(false);
    expect(
      view.setCreditUnmeasured({
        futureBonuses: [
          {
            threshold: 4,
            piecesNeeded: 4,
            dps: 80,
            breaks: [{ setId: 640, threshold: 2 }],
          },
        ],
      })
    ).toBe(true);
    // No futures: nothing is credited, so nothing is "not counted".
    expect(
      view.setCreditUnmeasured({ commitBreaks: [{ setId: 640, threshold: 2 }] })
    ).toBe(false);
    expect(view.rankableSetPotential({ setContext: first }, FLOOR)).toBe(0);
  });

  it("491-L: the tab's sub-line choice follows the view's zero rule", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const first = {
      futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 80 }],
      commitBreaks: [{ setId: 640, threshold: 2 }],
    };
    expect(view.setBonusSubLine(first, true)).toBe("not_counted");
    expect(view.setBonusSubLine(first, false)).toBe("hover_hint");
    expect(view.setBonusSubLine({}, true)).toBeNull();
    expect(view.setBonusSubLine({ crossesThreshold: true }, true)).toBe(
      "hover_hint"
    );
  });

  it("492-F: at worn 1 the 4pc value is recovered with one pair sim", async () => {
    // Run count before the 492 fix, recorded from the red run
    // (docs/set-bonus-fixture-derivations.md, 492-F: 6).
    const PRE_FIX_492_RUNS = 6;
    const view = await viewModule();
    const { ranking: r, runCount } = await runScenario({
      worn: wornGear({ hands: THUNDERHEART.hands }),
      pool: TH_POOL.filter((p) => p.slot !== "hands"),
    });
    expect(near(r.baseline.dps, 3100, 0.5)).toBe(true);
    const th4 = bonusOf(r, 676, 4);
    // raw4 = B4 − (n−1)·B2 = 80 − 2·50 = −20; the pair sim recovers B2 = 50.
    expect(near(th4!.bonusDps!, 80, 0.5)).toBe(true);
    expect(near(th4!.bonusDpsNet!, 80, 0.5)).toBe(true);
    expect(th4!.selfConfound?.threshold).toBe(2);
    expect(near(th4!.selfConfound?.dps ?? NaN, 50, 0.5)).toBe(true);
    const head = thRow(r, THUNDERHEART.head);
    expect(near(head.deltaDps, 150, 0.5)).toBe(true);
    expect(head.setContext?.crossesThreshold).toBe(true);
    expect((head.setContext?.futureBonuses ?? []).map(fut)).toEqual([
      { threshold: 4, piecesNeeded: 3, dps: 80 },
    ]);
    // 502: 80 + chest and legs, each 150 − 50 = 100 of own stats.
    expect(near(view.rankableSetPotential(head, FLOOR, "full"), 280, 0.5)).toBe(
      true
    );
    expect(near(view.rankableSetPotential(head, FLOOR, "split"), 20, 0.5)).toBe(
      true
    );
    expect(runCount).toBe(PRE_FIX_492_RUNS + 1);
  });
});

/* ------------------------------------------------------------------ *
 * Targeted engine review of 2026-09-25 (findings A1, A2, A4): a 492 pair
 * that breaks another worn set only together, the worn-1 4pc with no
 * usable pair, and a lower B that needs an unmeasured higher B. Every
 * literal is derived by hand in docs/set-bonus-fixture-derivations.md.
 * ------------------------------------------------------------------ */

describe.skipIf(!forkPresent)("engine review fixes (A1, A2, A4)", () => {
  it("492-J: a pair that breaks a worn set only together is not used for B2", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
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
    // ladder), the crossing gate's two sims, and two gate sims for each of
    // the counts 3, 4 and 5. The 2pc is one piece at worn 1, so it is not
    // measured and has no gate. Three step gears no package covers: every
    // 4pc partner set ties, so each is a close call (K5S).
    expect(on.runCount - off.runCount).toBe(3 + 2 + 6 + 3);
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
      // stop gear's sim, 3530 − 3140 = 390, less the row's 150.
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), 240, 0.5)
      ).toBe(true);
    }
  });

  it("492-N: with no break-free pair the worn-1 4pc net stays unset; the step rule credits the rows from their step gear", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { ranking: r } = await runScenario({
      worn: wornGear({
        hands: THUNDERHEART.hands,
        head: MALORNE.head,
        chest: MALORNE.chest,
      }),
      pool: [
        { itemId: THUNDERHEART.head, slot: "head" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.legs, slot: "legs" },
        { itemId: NEUTRAL.head[0], slot: "head" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
      ],
      measureBrokenSetValue: true,
    });
    expect(near(r.baseline.dps, 3140, 0.5)).toBe(true);
    const th4 = bonusOf(r, 676, 4);
    // Head and chest each break Malorne 2pc alone, so only legs is
    // break-free and no pair sim runs. The raw value keeps its confound.
    expect(th4!.selfConfound).toEqual({ threshold: 2 });
    expect(near(th4!.bonusDps!, 20, 0.5)).toBe(true);
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    // The confounded net would be 20 − (2 − 0 − 1 + 0)·40 = −20; true is 80.
    expect(th4!.bonusDpsNet).toBeUndefined();
    // K5: a step ranking reads no `bonusDpsNet` (C120). The 4pc's gate
    // cleared, so each row is credited from the sim of its stop gear, the
    // worn TH hands plus head, chest and legs: 3530 − 3140 = 390. The head
    // and chest rows break the Malorne 2pc alone: d = 100 + 50 − 40 = 110.
    for (const [id, d, credit] of [
      [THUNDERHEART.head, 110, 280],
      [THUNDERHEART.chest, 110, 280],
      [THUNDERHEART.legs, 150, 240],
    ] as const) {
      const row = thRow(r, id);
      const future = row.setContext?.futureBonuses ?? [];
      expect(future.map((f) => [f.threshold, f.belowGate ?? false])).toEqual([
        [3, true],
        [4, false],
      ]);
      expect(future[1]!.dps).toBeUndefined();
      expect(future[1]!.stepGearDps).toBeCloseTo(390, 9);
      expect(row.deltaDps).toBeCloseTo(d, 9);
      expect(view.rankableSetPotential(row, FLOOR, "full")).toBeCloseTo(
        credit,
        9
      );
      expect(view.setBonusSubLine(row.setContext, true)).toBe("hover_hint");
    }
  });

  it("476-D: a failed ladder sim leaves that break unmeasured and the row not counted", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
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
    // Four ladder rungs (one fails) and two gate sims for each of the
    // Thunderheart counts 2, 3 and 4 (tickets 511 and 512). No step gear:
    // every partner choice needs the unmeasured (640, 4) (K5, W-Z1).
    expect(on.runCount - off.runCount).toBe(4 + 6);
    expect(r.setStepSims?.gears).toBe(0);
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
      expect(futures.every((f) => f.stepGearDps === undefined)).toBe(true);
      expect(view.rankableSetPotential(row, FLOOR, "full")).toBe(0);
      expect(view.setBonusSubLine(row.setContext, true)).toBe("not_counted");
    }
  });
});

/* ------------------------------------------------------------------ *
 * Ticket 502: the ON credit counts the other path pieces' own stats
 * (rule R1, ADR-0034). Every literal is derived by hand in
 * docs/set-bonus-fixture-derivations.md, "Ticket 502".
 * ------------------------------------------------------------------ */

const piece = (itemId: number, name: string, dps?: number) => ({
  itemId,
  name,
  ...(dps !== undefined ? { dps } : {}),
});

describe.skipIf(!forkPresent)("other set pieces' own stats (502)", () => {
  it("502-A: a package member's ON figure equals the measured package delta", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { on } = await run490({
      676: { b2: B2_TH, b4: B4_TH },
      640: { b2: 40, b4: 30 },
    });
    const r = on.ranking;
    const p4 = bonusOf(r, 640, 4);
    expect(sortedIds(p4?.packageItemIds)).toEqual([29096, 29097, 29098, 29100]);
    expect(p4!.packageDeltaDps!).toBeCloseTo(320, 9);
    for (const id of p4!.packageItemIds!) {
      const row = thRow(r, id);
      expect(
        row.deltaDps + view.rankableSetPotential(row, FLOOR, "full")
      ).toBeCloseTo(p4!.packageDeltaDps!, 9);
    }
  });

  it("502-B: a step whose bonus floors to 0 is never the stop, but its pieces still count", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const allFloored = {
      setContext: {
        futureBonuses: [
          {
            threshold: 2,
            piecesNeeded: 2,
            dps: 4,
            pieces: [piece(1, "A", 30)],
          },
          {
            threshold: 4,
            piecesNeeded: 4,
            dps: 3,
            pieces: [piece(1, "A", 30), piece(2, "B", 20), piece(3, "C", 10)],
          },
        ],
      },
    };
    expect(view.rankableSetPotential(allFloored, FLOOR, "full")).toBe(0);

    const twoFloored = {
      futureBonuses: [
        { threshold: 2, piecesNeeded: 2, dps: 4, pieces: [piece(1, "A", 10)] },
        {
          threshold: 4,
          piecesNeeded: 4,
          dps: 80,
          pieces: [piece(1, "A", 10), piece(2, "B", 20), piece(3, "C", -5)],
        },
      ],
    };
    expect(
      view.rankableSetPotential({ setContext: twoFloored }, FLOOR, "full")
    ).toBeCloseTo(105, 9);
    expect(view.setPotentialTerms(twoFloored, FLOOR).stopThreshold).toBe(4);

    // The rules differ when a later eligible step lowers the total.
    const discriminator = {
      futureBonuses: [
        {
          threshold: 2,
          piecesNeeded: 2,
          dps: 40,
          pieces: [piece(1, "A", 100)],
        },
        {
          threshold: 4,
          piecesNeeded: 4,
          dps: 30,
          pieces: [piece(1, "A", 100), piece(2, "B", 0), piece(3, "C", 0)],
          breaks: [{ setId: 640, setName: "M", threshold: 2, dps: 200 }],
        },
      ],
    };
    expect(
      view.setPotentialCredit(discriminator, FLOOR, "full", "best-stop")
    ).toBeCloseTo(140, 9);
    expect(
      view.setPotentialCredit(discriminator, FLOOR, "split", "best-stop")
    ).toBeCloseTo(20, 9);
    expect(
      view.setPotentialCredit(discriminator, FLOOR, "full", "full-path")
    ).toBeCloseTo(-30, 9);
    expect(
      view.setPotentialCredit(discriminator, FLOOR, "split", "full-path")
    ).toBeCloseTo(-172.5, 9);
  });

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
      measureBrokenSetValue: true,
    });
    // K5: with the flag the ranking is a step ranking, so each eligible
    // future's pieces are its partner choice, in slot order, and carry no
    // own-stat figure (the stop gear's sim holds them); count 3 is below the
    // gate and has none.
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

  it("502-D: the terms are itemised by step, add up to the credit and end at the stop", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const M = "Malorne Harness";
    const ctx = (bDps: number) => ({
      setName: "Thunderheart Harness",
      piecesWornBefore: 0,
      futureBonuses: [
        {
          threshold: 2,
          piecesNeeded: 2,
          dps: 50,
          pieces: [piece(1, "A", 100)],
          breaks: [{ setId: 640, setName: M, threshold: 4, dps: 70 }],
        },
        {
          threshold: 4,
          piecesNeeded: 4,
          dps: 80,
          pieces: [piece(1, "A", 100), piece(2, "B", bDps), piece(3, "C", -10)],
          breaks: [
            { setId: 640, setName: M, threshold: 4, dps: 70 },
            { setId: 640, setName: M, threshold: 2, dps: 40 },
          ],
        },
      ],
    });
    const full = view.setPotentialTerms(ctx(20), FLOOR);
    expect(full.credit).toBeCloseTo(130, 9);
    expect(full.stopThreshold).toBe(4);
    expect(full.terms).toEqual([
      {
        kind: "bonus",
        setName: "Thunderheart Harness",
        threshold: 2,
        have: 0,
        dps: 50,
      },
      { kind: "piece", itemId: 1, name: "A", dps: 100 },
      { kind: "break", setName: M, threshold: 4, dps: -70 },
      {
        kind: "bonus",
        setName: "Thunderheart Harness",
        threshold: 4,
        have: 0,
        dps: 80,
      },
      { kind: "piece", itemId: 2, name: "B", dps: 20 },
      { kind: "piece", itemId: 3, name: "C", dps: -10 },
      { kind: "break", setName: M, threshold: 2, dps: -40 },
    ]);
    const sum = full.terms.reduce((s, t) => s + t.dps, 0);
    expect(Math.abs(sum - full.credit)).toBeLessThan(1e-9);

    const early = view.setPotentialTerms(ctx(-100), FLOOR);
    expect(early.credit).toBeCloseTo(80, 9);
    expect(early.stopThreshold).toBe(2);
    expect(early.terms.map((t) => t.kind)).toEqual(["bonus", "piece", "break"]);

    const floored = view.setPotentialTerms(
      {
        setName: "S",
        piecesWornBefore: 0,
        futureBonuses: [
          {
            threshold: 2,
            piecesNeeded: 2,
            dps: 4,
            pieces: [piece(1, "A", 10)],
          },
          {
            threshold: 4,
            piecesNeeded: 4,
            dps: 80,
            pieces: [piece(1, "A", 10), piece(2, "B", 20), piece(3, "C", -5)],
          },
        ],
      },
      FLOOR
    );
    expect(floored.terms.map((t) => [t.kind, t.dps])).toEqual([
      ["piece", 10],
      ["bonus", 80],
      ["piece", 20],
      ["piece", -5],
    ]);
  });

  it("502-E: a piece without a figure zeroes the credit; a future with no pieces field is credited as before", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const noFigure = {
      futureBonuses: [
        { threshold: 4, piecesNeeded: 4, dps: 80, pieces: [piece(1, "A")] },
      ],
    };
    expect(view.setCreditUnmeasured(noFigure)).toBe(true);
    expect(view.rankableSetPotential({ setContext: noFigure }, FLOOR)).toBe(0);

    const noPieces = {
      futureBonuses: [
        {
          threshold: 2,
          piecesNeeded: 2,
          dps: 50,
          breaks: [{ setId: 640, setName: "M", threshold: 2, dps: 20 }],
        },
      ],
    };
    expect(view.setCreditUnmeasured(noPieces)).toBe(false);
    expect(
      view.rankableSetPotential({ setContext: noPieces }, FLOOR)
    ).toBeCloseTo(30, 9);
  });

  it("502-F: with Set potential off, set rows sort on deltaDps alone", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { on } = await run490({
      676: { b2: B2_TH, b4: B4_TH },
      640: { b2: 40, b4: 30 },
    });
    const off = view.applyView(on.ranking, { withSetPotential: false });
    expect(off.rows.map((row) => row.itemId)).toEqual([
      29096, 29098, 29100, 8289, 10140, 29097, 29099,
    ]);
  });

  it("502-G: a worn bonus below the gate is not a break; the pieces' own stats still hold it", async () => {
    // Ticket 512 replaced "a path break below the floor is charged at its
    // measured value": on the flag path a worn bonus that measures at or
    // below the noise gate is not a break at all, so no line charges it and
    // no piece adds it back. The chest row still ends at pkgΔ4, because the
    // hands piece's own stats (its single, −4) hold the loss.
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { on } = await run490({
      676: { b2: 4, b4: B4_TH },
      640: { b2: 40, b4: 30 },
    });
    const r = on.ranking;
    const th2 = (r.wornSetLadder ?? []).find(
      (e) => e.setId === 676 && e.count === 2
    );
    expect(th2?.dps).toBeCloseTo(4, 9);
    expect(th2?.counted).toBe(false);
    expect(bsvDps(r, 676, 2)).toBeUndefined();
    const p4 = bonusOf(r, 640, 4);
    expect(p4!.packageDeltaDps!).toBeCloseTo(366, 9);
    expect(p4!.breaks ?? []).toEqual([]);
    const chest = thRow(r, MALORNE.chest);
    const f4 = (chest.setContext?.futureBonuses ?? []).find(
      (f) => f.threshold === 4
    );
    // K5: the pieces are the 4pc's partner choice, and the stop gear's sim,
    // not the pieces' own stats, holds the hands' −4 (3570 − 3204 = 366).
    expect((f4?.pieces ?? []).map((p) => p.itemId)).toEqual([
      MALORNE.head,
      MALORNE.shoulder,
      MALORNE.hands,
    ]);
    expect(f4?.stepGearDps).toBeCloseTo(366, 9);
    const res = view.setPotentialTerms(chest.setContext, FLOOR);
    expect(res.stopThreshold).toBe(4);
    expect(res.terms.filter((t) => t.kind === "break")).toEqual([]);
    expect(view.rankableSetPotential(chest, FLOOR, "full")).toBeCloseTo(266, 9);
    expect(
      chest.deltaDps + view.rankableSetPotential(chest, FLOOR, "full")
    ).toBeCloseTo(p4!.packageDeltaDps!, 9);
  });
});

/* ------------------------------------------------------------------ *
 * Set-less copies and the same-gear gate (ticket 511)
 * ------------------------------------------------------------------ */

type CopiesMod = {
  SET_LESS_ID_OFFSET: number;
  SET_KEPT_ID_OFFSET: number;
  applySetLessCopies: (
    request: RaidSimRequest,
    slots: readonly number[]
  ) => RaidSimRequest;
  applyCopies: (
    request: RaidSimRequest,
    copies: { setLess?: readonly number[]; setKept?: readonly number[] }
  ) => RaidSimRequest;
};

/** A composed 17-slot request wearing `filled`, with an optional database. */
async function composedRequest(
  filled: Partial<Record<SimOrderName, number>>,
  database?: Record<string, unknown>
): Promise<RaidSimRequest> {
  const composeMod = await importForkUpgrades<{
    compose: (
      skeleton: RaidSimRequest,
      player: Record<string, unknown>
    ) => RaidSimRequest;
  }>("engine/compose.ts");
  return composeMod.compose(feralSkeleton, {
    name: "netcase",
    race: "RaceTauren",
    equipment: wornGear(filled).map((w) => ({ id: w.id, gems: [] })),
    ...(database ? { database } : {}),
  });
}

function playerDatabase(
  req: RaidSimRequest
): { items: Array<Record<string, unknown>> } | undefined {
  const raid = (req as { raid: { parties: Array<{ players: unknown[] }> } })
    .raid;
  const player = raid.parties[0]?.players[0] as {
    database?: { items: Array<Record<string, unknown>> };
  };
  return player.database;
}

const HANDS_SLOT = SIM_ORDER.indexOf("hands");
const LEGS_SLOT = SIM_ORDER.indexOf("legs");
const TH_HANDS_LEGS_POOL: PoolSpec[] = [
  { itemId: THUNDERHEART.hands, slot: "hands" },
  { itemId: THUNDERHEART.legs, slot: "legs" },
];

describe.skipIf(!forkPresent)(
  "set-less copies and the same-gear gate (511)",
  () => {
    it("511-C: a copy swaps the id, keeps the stats and drops the set", async () => {
      const copies = await importForkUpgrades<CopiesMod>(
        "engine/set-less-copies.ts"
      );
      expect(copies.SET_LESS_ID_OFFSET).toBe(COPY_OFFSET);
      const seam = await importForkUpgrades<{
        simCacheKey: (
          req: RaidSimRequest,
          simVersion: string,
          opts: SimRunOpts
        ) => string;
      }>("engine/seams/sim-runner.ts");
      const items = await importForkUpgrades<{
        getItem: (id: number) => { setId?: number } | undefined;
      }>("engine/items.ts");
      const getSetId = (id: number) => items.getItem(id)?.setId;

      // No database, as in this file's own runs (C41): the ids swap only.
      const plain = await composedRequest({
        hands: THUNDERHEART.hands,
        legs: NEUTRAL.legs[0],
      });
      const before = JSON.stringify(plain);
      const copied = copies.applySetLessCopies(plain, [HANDS_SLOT, LEGS_SLOT]);
      expect(JSON.stringify(plain)).toBe(before);
      expect(equippedIds(copied)[HANDS_SLOT]).toBe(
        COPY_OFFSET + THUNDERHEART.hands
      );
      expect(equippedIds(copied)[LEGS_SLOT]).toBe(
        COPY_OFFSET + NEUTRAL.legs[0]
      );
      expect(playerDatabase(copied)).toBeUndefined();
      // C39: a request with copies is its own cache entry.
      const opts = { seed: 11, iterations: ITERATIONS };
      expect(seam.simCacheKey(copied, SIM_VERSION, opts)).not.toBe(
        seam.simCacheKey(plain, SIM_VERSION, opts)
      );
      // A copy of a non-set item is worth what the item is: 3000 + 120.
      const neutralOnly = await composedRequest({ legs: NEUTRAL.legs[0] });
      const neutralCopy = copies.applySetLessCopies(neutralOnly, [LEGS_SLOT]);
      expect(modelDps(equippedIds(neutralOnly), getSetId)).toBe(3120);
      expect(modelDps(equippedIds(neutralCopy), getSetId)).toBe(3120);

      // With a database: one row per copy, from the real row, set fields
      // blanked, everything else kept.
      const realRow = {
        id: THUNDERHEART.hands,
        name: "Thunderheart Gauntlets",
        setName: "Thunderheart Harness",
        setId: 676,
        scalingOptions: { "0": { ilvl: 120 } },
      };
      const withDb = await composedRequest(
        { hands: THUNDERHEART.hands },
        { items: [realRow], gems: [] }
      );
      const copiedDb = copies.applySetLessCopies(withDb, [HANDS_SLOT]);
      expect(playerDatabase(copiedDb)?.items).toEqual([
        realRow,
        {
          ...realRow,
          id: COPY_OFFSET + THUNDERHEART.hands,
          setName: "",
          setId: 0,
        },
      ]);
      expect(playerDatabase(withDb)?.items).toEqual([realRow]);

      // A set-kept copy (ticket 512, G2): the real row with only `id`
      // changed, so the copy still counts toward its set.
      expect(copies.SET_KEPT_ID_OFFSET).toBe(SET_KEPT_OFFSET);
      const keptDb = copies.applyCopies(withDb, { setKept: [HANDS_SLOT] });
      expect(equippedIds(keptDb)[HANDS_SLOT]).toBe(
        SET_KEPT_OFFSET + THUNDERHEART.hands
      );
      expect(playerDatabase(keptDb)?.items).toEqual([
        realRow,
        { ...realRow, id: SET_KEPT_OFFSET + THUNDERHEART.hands },
      ]);
      // Without a database only the ids swap; both kinds in one request.
      const both = copies.applyCopies(plain, {
        setLess: [LEGS_SLOT],
        setKept: [HANDS_SLOT],
      });
      expect(equippedIds(both)[HANDS_SLOT]).toBe(
        SET_KEPT_OFFSET + THUNDERHEART.hands
      );
      expect(equippedIds(both)[LEGS_SLOT]).toBe(COPY_OFFSET + NEUTRAL.legs[0]);
      expect(playerDatabase(both)).toBeUndefined();
      // The model counts a set-kept copy toward its set: 3000 + 100 + 120.
      expect(modelDps(equippedIds(both), getSetId)).toBe(3220);
    });

    it("511-I: an interaction term needs every listed id worn; a copy counts as its original", () => {
      const setOf = (id: number) =>
        id === THUNDERHEART.hands || id === THUNDERHEART.legs ? 676 : undefined;
      const term = [{ ids: [THUNDERHEART.hands, THUNDERHEART.legs], dps: 9 }];
      const dps = (ids: number[]) =>
        modelDps(ids, setOf, ITEM_VALUE, SET_BONUSES, term);
      // Both worn: 3000 + 100 + 100 + 2pc 50 + 9.
      expect(dps([THUNDERHEART.hands, THUNDERHEART.legs])).toBe(3259);
      // One worn: no 2pc and no term.
      expect(dps([THUNDERHEART.hands])).toBe(3100);
      // The hands as a copy: the term stays and the 2pc goes.
      expect(dps([COPY_OFFSET + THUNDERHEART.hands, THUNDERHEART.legs])).toBe(
        3209
      );
    });

    it("511-G: the 2pc same-gear bonus is the bonus alone, for two new sims", async () => {
      const off = await runScenario({
        worn: wornGear({}),
        pool: TH_HANDS_LEGS_POOL,
      });
      const on = await runScenario({
        worn: wornGear({}),
        pool: TH_HANDS_LEGS_POOL,
        measureBrokenSetValue: true,
      });
      // Only the 2pc package is measured (two pieces cannot reach the 4pc),
      // and nothing worn is broken, so the flag adds the gate's two sims and
      // nothing else.
      expect(on.runCount - off.runCount).toBe(2);
      const copyCalls = on.calls.filter((ids) =>
        ids.some((id) => id >= COPY_OFFSET)
      );
      expect(copyCalls).toHaveLength(2);
      // The first set piece in slot order, the hands, is the copy, in both
      // requests: set kept in the "on" sim, set-less in the "off" sim (G2).
      expect(copyCalls.map((ids) => ids[HANDS_SLOT])).toEqual([
        SET_KEPT_OFFSET + THUNDERHEART.hands,
        COPY_OFFSET + THUNDERHEART.hands,
      ]);
      for (const ids of copyCalls) {
        expect(ids[LEGS_SLOT]).toBe(THUNDERHEART.legs);
      }
      // The package request is simmed once.
      const packageCalls = on.calls.filter(
        (ids) =>
          ids[HANDS_SLOT] === THUNDERHEART.hands &&
          ids[LEGS_SLOT] === THUNDERHEART.legs
      );
      expect(packageCalls).toHaveLength(1);

      // on 3000 + 200 + 50 (the set-kept copy counts toward the set), off
      // 3000 + 200: 50. se = √2 · 30 / √5000 = 0.6.
      const b2 = bonusOf(on.ranking, 676, 2);
      expect(b2?.sameGearDps).toBeCloseTo(50, 9);
      expect(b2?.sameGearSe).toBeCloseTo(0.6, 9);
      expect(bonusOf(on.ranking, 676, 4)?.sameGearDps).toBeUndefined();
      // Copied onto the futures of that entry, and only those.
      const futures =
        thRow(on.ranking, THUNDERHEART.hands).setContext?.futureBonuses ?? [];
      const f2 = futures.find((f) => f.threshold === 2);
      expect(f2?.sameGearDps).toBeCloseTo(50, 9);
      expect(f2?.sameGearSe).toBeCloseTo(0.6, 9);
      expect(
        futures.find((f) => f.threshold === 4)?.sameGearDps
      ).toBeUndefined();
      // Without the flag there is no gate.
      expect(bonusOf(off.ranking, 676, 2)?.sameGearDps).toBeUndefined();
    });

    it("511-G2: the gate leaves out stats worth more together; package minus singles keeps them", async () => {
      const { ranking } = await runScenario({
        worn: wornGear({}),
        pool: TH_HANDS_LEGS_POOL,
        measureBrokenSetValue: true,
        interactions: [
          { ids: [THUNDERHEART.hands, THUNDERHEART.legs], dps: 9 },
        ],
      });
      const b2 = bonusOf(ranking, 676, 2);
      // Package 3000 + 200 + 50 + 9, singles +100 each: 259 − 200 = 59.
      expect(b2?.bonusDps).toBeCloseTo(59, 9);
      // Both copies keep the term: 3259 − (3000 + 200 + 9) = 50.
      expect(b2?.sameGearDps).toBeCloseTo(50, 9);
    });

    it("511-H: a set piece with an id-keyed effect changes no same-gear bonus", async () => {
      // Scenario kind: a set package in which a piece with a Go effect keyed
      // by its item id (hunter and warrior PvP gloves, `RegisterPvPGloveMod`;
      // any `itemEffects[eq.ID]` entry) is among the pieces the gate changes.
      // Until ticket 511's gain side leaves the six-set table, only a set in
      // that table has a package to gate, so the example is a druid set
      // piece given a model id effect: Thunderheart Gauntlets 31034, effect
      // 15, Thunderheart 2pc 50. 512-H covers the PvP gloves on the break
      // side.
      const scenario = (pool: PoolSpec[]) =>
        runScenario({
          worn: wornGear({}),
          pool,
          measureBrokenSetValue: true,
          idEffects: new Map([[THUNDERHEART.hands, 15]]),
        });
      // (i) chest and gloves: the gloves are last in slot order.
      const first = await scenario([
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.hands, slot: "hands" },
      ]);
      // (ii) gloves and legs: the gloves are first in slot order, so they are
      // the piece the gate copies. Copied on one side only they would add 15.
      const second = await scenario([
        { itemId: THUNDERHEART.hands, slot: "hands" },
        { itemId: THUNDERHEART.legs, slot: "legs" },
      ]);
      expect(sortedIds(bonusOf(first.ranking, 676, 2)?.packageItemIds)).toEqual(
        [THUNDERHEART.hands, THUNDERHEART.chest]
      );
      expect(
        sortedIds(bonusOf(second.ranking, 676, 2)?.packageItemIds)
      ).toEqual([THUNDERHEART.hands, THUNDERHEART.legs]);
      for (const { ranking } of [first, second]) {
        expect(bonusOf(ranking, 676, 2)?.sameGearDps).toBeCloseTo(50, 9);
      }
    });
  }
);

/* ------------------------------------------------------------------ *
 * Ticket 512: set breaks with no list. Under the flag the break side
 * measures every count of every worn set with the ladder and charges a
 * count only when it clears the noise gate. Each case stands for a kind
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
// Gladiator's Pursuit 586 (hunter PvP); 28335 is in `pvpGloveItemIDs`.
const PURSUIT = { chest: 28334, hands: 28335 } as const;
// Cryptstalker Armor 530 (hunter T3; Go bonuses at 2, 4, 6 and 8).
const CRYPTSTALKER = {
  head: 22438,
  shoulder: 22439,
  chest: 22436,
  wrist: 22443,
  hands: 22441,
  waist: 22442,
  legs: 22437,
  feet: 22440,
} as const;

/** One worn set's ladder as [count, rounded dps, counted]. */
const ladderOf = (ranking: ForkRanking, setId: number) =>
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

const pkgBreaks = (ranking: ForkRanking, setId: number, threshold: number) =>
  (bonusOf(ranking, setId, threshold)?.breaks ?? []).map((b) => [
    b.setId,
    b.threshold,
  ]);

describe.skipIf(!forkPresent)("set breaks with no list (512)", () => {
  it("512-W: a worn bonus from a set no hand-kept table lists is measured and charged", async () => {
    // Scenario kind: the player wears a non-tier set with bonuses at 2 and 4
    // (dungeon, crafted, other classes' sets), and an upgrade package takes
    // some of its pieces. Example: Wastewalker 659 worn 4/4, model 2pc 30 and
    // 4pc 20, broken by a Malorne package.
    const view = await viewModule();
    const { ranking: r } = await runScenario({
      worn: wornGear(WASTEWALKER),
      pool: setPool({
        shoulder: MALORNE.shoulder,
        chest: MALORNE.chest,
        hands: MALORNE.hands,
        legs: MALORNE.legs,
      }),
      itemValue: withSetValues(Object.values(MALORNE)),
      setBonuses: { ...SET_BONUSES, 659: { b2: 30, b4: 20 } },
      measureBrokenSetValue: true,
    });
    expect(near(r.baseline.dps, 3050, 0.5)).toBe(true);
    expect(ladderOf(r, 659)).toEqual([
      [2, 30, true],
      [3, 0, false],
      [4, 20, true],
    ]);
    expect(near(bsvDps(r, 659, 4)!, 20, 0.5)).toBe(true);
    expect(near(bsvDps(r, 659, 2)!, 30, 0.5)).toBe(true);
    expect(bsvDps(r, 659, 3)).toBeUndefined();
    // The 2pc package takes Wastewalker 4 -> 2: the 4pc only. The 4pc
    // package takes it to 0: both.
    expect(pkgBreaks(r, 640, 2)).toEqual([[659, 4]]);
    expect(pkgBreaks(r, 640, 4)).toEqual([
      [659, 4],
      [659, 2],
    ]);
    expect(near(netOf(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect(near(netOf(r, 640, 4)!, 70, 0.5)).toBe(true);
    // The Mantle row breaks the 4pc alone (20, inside its deltaDps). K5: each
    // eligible future names every worn bonus its step gear loses against the
    // current gear, the row's own break included; count 3 has no model bonus
    // and is below the gate.
    const mantle = thRow(r, MALORNE.shoulder);
    expect(near(mantle.deltaDps, 80, 0.5)).toBe(true);
    expect((mantle.setContext?.singleBreaks ?? []).map(brk)).toEqual([
      { setId: 659, threshold: 4, dps: 20 },
    ]);
    expect((mantle.setContext?.futureBonuses ?? []).map(futB)).toEqual([
      {
        threshold: 2,
        piecesNeeded: 2,
        dps: 40,
        breaks: [{ setId: 659, threshold: 4, dps: 20 }],
      },
      { threshold: 3, piecesNeeded: 3, dps: undefined, breaks: [] },
      {
        threshold: 4,
        piecesNeeded: 4,
        dps: 70,
        breaks: [
          { setId: 659, threshold: 4, dps: 20 },
          { setId: 659, threshold: 2, dps: 30 },
        ],
      },
    ]);
    const credit = view.rankableSetPotential(mantle, FLOOR, "full");
    expect(credit).toBeCloseTo(380, 9);
    expect(mantle.deltaDps + credit).toBeCloseTo(
      bonusOf(r, 640, 4)!.packageDeltaDps!,
      9
    );
    // K5 (step rule): the stop is the 4pc, and its term names the
    // Wastewalker bonuses its gear loses. ON = model(stop gear) − model(G):
    // four Malorne pieces 400 + 40 + 70 and no Wastewalker, 3510 − 3050.
    const stepView = await importForkUpgrades<StepViewMod>("engine/view.ts");
    const stops = stepView
      .setPotentialTerms(mantle.setContext, FLOOR)
      .terms.filter((t) => t.kind === "stop");
    expect(stops.map((t) => [t.threshold, t.isStop])).toEqual([
      [2, false],
      [4, true],
    ]);
    expect(stops[1]!.broken.map((b) => [b.setId, b.threshold])).toEqual([
      [659, 4],
      [659, 2],
    ]);
    expect(mantle.deltaDps + credit).toBeCloseTo(460, 9);
  });

  it("512-P: a set whose only bonus needs 3 pieces is measured and charged", async () => {
    // Scenario kind: a three-piece crafted set (cloth, leather, mail), which
    // a `2 | 4` count type could not hold. Example: Primal Intent 619 worn
    // 3/3, model 3pc 25, with a Thunderheart chest and the neutral chest 8283
    // as candidates.
    const { ranking: r } = await runScenario({
      worn: wornGear(PRIMAL_INTENT),
      pool: [
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
      ],
      setBonuses: { ...SET_BONUSES, 619: { b2: 0, b3: 25, b4: 0 } },
      measureBrokenSetValue: true,
    });
    expect(near(r.baseline.dps, 3025, 0.5)).toBe(true);
    expect(ladderOf(r, 619)).toEqual([
      [2, 0, false],
      [3, 25, true],
    ]);
    expect(near(bsvDps(r, 619, 3)!, 25, 0.5)).toBe(true);
    const chest = thRow(r, THUNDERHEART.chest);
    expect(near(chest.deltaDps, 75, 0.5)).toBe(true);
    expect((chest.setContext?.singleBreaks ?? []).map(brk)).toEqual([
      { setId: 619, threshold: 3, dps: 25 },
    ]);
    // The neutral chest pays the same loss inside its own sim: 120 − 25.
    expect(near(thRow(r, NEUTRAL.chest[0]).deltaDps, 95, 0.5)).toBe(true);
  });

  it("512-N: a swap that removes a piece but no bonus is charged nothing", async () => {
    // Scenario kind: a worn count past the highest bonus, or between two
    // bonuses, or a set with no bonus at all. The swap removes one piece and
    // the set keeps every bonus it had.
    // (a) Past the highest bonus, w = 5 -> 4: Malorne 640 worn 5/5, model
    // 2pc 40 and 4pc 70; each Thunderheart single takes it to 4.
    const five = await runScenario({
      worn: wornGear({ ...MALORNE_4, legs: MALORNE.legs }),
      pool: TH_OVER_MALORNE_POOL,
      measureBrokenSetValue: true,
    });
    expect(ladderOf(five.ranking, 640)).toEqual([
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
      measureBrokenSetValue: true,
    });
    expect(ladderOf(three.ranking, 659)).toEqual([
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
      measureBrokenSetValue: true,
    });
    expect(ladderOf(none.ranking, 619)).toEqual([
      [2, 0, false],
      [3, 0, false],
    ]);
    expect(rowBreaksOf(thRow(none.ranking, THUNDERHEART.chest), 619)).toEqual(
      []
    );
    expect(none.ranking.brokenSetValues ?? []).toEqual([]);
  });

  it("512-H: a set piece with its own id-keyed effect adds nothing to the charged break", async () => {
    // Scenario kind: a worn set piece that the sim also gives an effect by
    // its item id (hunter and warrior PvP gloves, `RegisterPvPGloveMod`; any
    // `itemEffects[eq.ID]` entry). Example: Gladiator's Pursuit 586 worn as
    // chest 28334 and gloves 28335, model 2pc 40 and a model id effect of 15
    // on the gloves; a Thunderheart chest breaks the 2pc.
    const { ranking: r } = await runScenario({
      worn: wornGear(PURSUIT),
      pool: [
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: NEUTRAL.chest[0], slot: "chest" },
      ],
      setBonuses: { ...SET_BONUSES, 586: { b2: 40, b4: 0 } },
      idEffects: new Map([[PURSUIT.hands, 15]]),
      measureBrokenSetValue: true,
    });
    expect(near(r.baseline.dps, 3055, 0.5)).toBe(true);
    // The gloves are the second piece in slot order, so the ladder changes
    // their set membership; they are a copy in both rungs, so the 15 is in
    // neither. A rung with the real gloves would read 55.
    expect(ladderOf(r, 586)).toEqual([[2, 40, true]]);
    expect(near(bsvDps(r, 586, 2)!, 40, 0.5)).toBe(true);
    const chest = thRow(r, THUNDERHEART.chest);
    expect(near(chest.deltaDps, 60, 0.5)).toBe(true);
    expect((chest.setContext?.singleBreaks ?? []).map(brk)).toEqual([
      { setId: 586, threshold: 2, dps: 40 },
    ]);
  });

  it("512-C: a set with bonuses above 4 pieces is measured at every worn count", async () => {
    // Scenario kind: a set with bonuses at 6 or 8 pieces, which a count type
    // or a ladder that stops at 4 would drop. Example: Cryptstalker 530 worn
    // 8/8, model 2pc 10, 4pc 20, 6pc 30, 8pc 40, with Thunderheart shoulder,
    // chest, hands and legs as candidates. (Not the head: its meta socket
    // cannot be activated over this gemless gear, so the engine drops it.)
    const candidates = [
      THUNDERHEART.shoulder,
      THUNDERHEART.chest,
      THUNDERHEART.hands,
      THUNDERHEART.legs,
    ];
    const { ranking: r } = await runScenario({
      worn: wornGear(CRYPTSTALKER),
      pool: [
        { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
        { itemId: THUNDERHEART.chest, slot: "chest" },
        { itemId: THUNDERHEART.hands, slot: "hands" },
        { itemId: THUNDERHEART.legs, slot: "legs" },
      ],
      setBonuses: {
        ...SET_BONUSES,
        530: { b2: 10, b4: 20, b6: 30, b8: 40 },
      },
      measureBrokenSetValue: true,
    });
    expect(near(r.baseline.dps, 3100, 0.5)).toBe(true);
    expect(ladderOf(r, 530)).toEqual([
      [2, 10, true],
      [3, 0, false],
      [4, 20, true],
      [5, 0, false],
      [6, 30, true],
      [7, 0, false],
      [8, 40, true],
    ]);
    // Each single takes the set 8 -> 7 and is charged the 8pc only.
    for (const id of candidates) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 60, 0.5)).toBe(true);
      expect((row.setContext?.singleBreaks ?? []).map(brk)).toEqual([
        { setId: 530, threshold: 8, dps: 40 },
      ]);
    }
    // The 2pc package takes it 8 -> 6 (the 8pc); the 4pc package 8 -> 4 (the
    // 8pc and the 6pc, nothing for 7 and 5).
    expect(pkgBreaks(r, 676, 2)).toEqual([[530, 8]]);
    expect(pkgBreaks(r, 676, 4)).toEqual([
      [530, 8],
      [530, 6],
    ]);
    expect(near(netOf(r, 676, 2)!, 50, 0.5)).toBe(true);
    expect(near(netOf(r, 676, 4)!, 80, 0.5)).toBe(true);
  });
});

/* ------------------------------------------------------------------ *
 * Ticket 511, K5: set rows valued by simmed gear (option A). With the
 * flag, the gain side tries every count the pool reaches with no list, the
 * gate runs before the package sim, and a row is credited from the sim of
 * its stop gear: the current gear plus the row plus the partner pieces
 * `choosePartnerSet` picks. Each case stands for a kind of situation; its
 * set is the example. Every literal is derived by hand in
 * docs/set-bonus-fixture-derivations.md, "Ticket 511: set rows valued by
 * simmed gear".
 * ------------------------------------------------------------------ */

type StopTerm = {
  kind: "stop";
  threshold: number;
  setName: string;
  pieces: Array<{ itemId: number; name: string }>;
  broken: Array<{ setId: number; threshold: number; dps?: number }>;
  totalDps: number;
  isStop: boolean;
};

type StepViewMod = ViewMod & {
  setPotentialTerms: (
    ctx: unknown,
    noiseFloorDps: number
  ) => {
    credit: number;
    stopThreshold: number;
    terms: Array<StopTerm | { kind: "bonus" | "piece" | "break" }>;
  };
  setCreditUnmeasured: (ctx: unknown) => boolean;
  setBonusSubLine: (
    ctx: unknown,
    on: boolean
  ) => "not_counted" | "hover_hint" | null;
  crossingLabelCount: (ctx: unknown) => number | null;
  stepEligible: (future: unknown, noiseFloorDps: number) => boolean;
};

async function stepView(): Promise<StepViewMod> {
  return importForkUpgrades<StepViewMod>("engine/view.ts");
}

/** The `"stop"` terms of a step ranking's row, in count order. */
function stopTerms(view: StepViewMod, row: { setContext?: unknown }) {
  return view
    .setPotentialTerms(row.setContext, FLOOR)
    .terms.filter((t): t is StopTerm => t.kind === "stop");
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

// Thunderheart in four slots the meta gem does not touch (the Cover's meta
// socket cannot be activated over this gemless gear, so the engine can drop
// it; see 512-C).
const TH_FOUR_POOL: PoolSpec[] = [
  { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
  { itemId: THUNDERHEART.chest, slot: "chest" },
  { itemId: THUNDERHEART.hands, slot: "hands" },
  { itemId: THUNDERHEART.legs, slot: "legs" },
];
const TH_FOUR = [
  THUNDERHEART.shoulder,
  THUNDERHEART.chest,
  THUNDERHEART.hands,
  THUNDERHEART.legs,
];
// Justicar Battlegear 626 (ret plate). The Breastplate stands in for the
// Crown, whose meta socket the engine cannot fill over gemless gear.
const JUSTICAR = {
  chest: 29071,
  shoulder: 29075,
  hands: 29072,
  legs: 29074,
} as const;
// Crystalforge Battlegear 629 (ret plate).
const CRYSTALFORGE = { chest: 30129, hands: 30130, legs: 30132 } as const;
const SHOULDER_SLOT = SIM_ORDER.indexOf("shoulder");
const CHEST_SLOT = SIM_ORDER.indexOf("chest");
const WRIST_SLOT = SIM_ORDER.indexOf("wrist");

/** 511-R's scenario: Thunderheart 2pc 50 and 4pc 80, four pieces worn −40. */
const R_SCENARIO: Scenario = {
  worn: wornGear({}),
  pool: TH_FOUR_POOL,
  interactions: [{ ids: TH_FOUR, dps: -40 }],
  measureBrokenSetValue: true,
};

// 511-PS: worn Malorne shoulder and chest, model 2pc 90. Own values chosen so
// the singles are the feral P2 BiS figures: Gauntlets +6, Leggings −12,
// Pauldrons 8 − 90 = −82, Chestguard 12 − 90 = −78.
const PS_SCENARIO: Scenario = {
  worn: wornGear({ shoulder: MALORNE.shoulder, chest: MALORNE.chest }),
  pool: TH_FOUR_POOL,
  setBonuses: { ...SET_BONUSES, 640: { b2: 90, b4: 0 } },
  itemValue: withValues([
    [THUNDERHEART.shoulder, 8],
    [THUNDERHEART.chest, 12],
    [THUNDERHEART.hands, 6],
    [THUNDERHEART.legs, -12],
  ]),
  measureBrokenSetValue: true,
};

describe.skipIf(!forkPresent)(
  "set rows valued by simmed gear (511, K5)",
  () => {
    it("511-M: a bonus that measures 0 on identical gear although its pieces combine earns nothing", async () => {
      // Scenario kind: a set whose bonuses do nothing for this spec's rotation
      // (a ret set's Judgement and healing bonuses), while its pieces' stats
      // are worth more worn together. Example: Justicar 626, own value −30
      // each, model bonuses 0, +17 when all four are worn.
      const view = await stepView();
      const scenario: Scenario = {
        worn: wornGear({}),
        pool: setPool(JUSTICAR),
        itemValue: withValues(
          Object.values(JUSTICAR).map((id) => [id, -30] as const)
        ),
        setBonuses: { ...SET_BONUSES, 626: { b2: 0, b4: 0 } },
        interactions: [{ ids: Object.values(JUSTICAR), dps: 17 }],
      };
      const off = await runScenario(scenario);
      const on = await runScenario({
        ...scenario,
        measureBrokenSetValue: true,
      });
      // Without the flag, the table's 4pc package minus its singles reads the
      // +17 as a bonus: −103 − (−120).
      expect(bonusOf(off.ranking, 626, 4)?.bonusDps).toBeCloseTo(17, 9);
      for (const t of [2, 3, 4]) {
        const b = bonusOf(on.ranking, 626, t);
        expect(b?.sameGearDps).toBe(0);
        expect(b?.belowGate).toBe(true);
        expect(b?.bonusDps).toBeUndefined();
      }
      // No package, pair or step sim: no request wears two real Justicar
      // pieces without a copy among them. Base, four singles, three gates.
      const justicarIds = new Set<number>(Object.values(JUSTICAR));
      expect(
        on.calls.filter(
          (ids) =>
            !ids.some((id) => id >= COPY_OFFSET) &&
            ids.filter((id) => justicarIds.has(id)).length >= 2
        )
      ).toEqual([]);
      expect(on.runCount).toBe(1 + 4 + 6);
      expect(on.ranking.setStepSims).toEqual({
        partnerRule: "close-calls",
        gears: 0,
        simmed: 0,
        fromStore: 0,
      });
      // W-S3: ON = OFF.
      for (const id of Object.values(JUSTICAR)) {
        expect(view.rankableSetPotential(thRow(on.ranking, id), FLOOR)).toBe(0);
      }
    });

    it("511-R: a row inside the 4-piece group is credited from its stop gear's sim, interaction included", async () => {
      // Scenario kind: a tier set whose pieces' stats interact (here they lose
      // 40 worn together), with a count that has no bonus between the two
      // that do. Example: Thunderheart 676, model 2pc 50 and 4pc 80.
      const view = await stepView();
      const { ranking: r } = await runScenario(R_SCENARIO);
      expect(bonusOf(r, 676, 2)?.sameGearDps).toBeCloseTo(50, 9);
      expect(bonusOf(r, 676, 4)?.sameGearDps).toBeCloseTo(80, 9);
      expect(bonusOf(r, 676, 3)?.belowGate).toBe(true);
      const hands = thRow(r, THUNDERHEART.hands);
      expect(hands.setContext?.stepRanking).toBe(true);
      expect(hands.setContext?.singleDeltaDps).toBeCloseTo(100, 9);
      // The stop gear wears all four: 400 + 50 + 80 − 40 = 490 over 3000.
      expect(futureOf(hands, 4)?.stepGearDps).toBeCloseTo(490, 9);
      // G10-4: a below-gate count among the futures does not zero the row.
      expect(futureOf(hands, 3)?.belowGate).toBe(true);
      expect(view.setCreditUnmeasured(hands.setContext)).toBe(false);
      const credit = view.rankableSetPotential(hands, FLOOR, "full");
      expect(credit).toBeCloseTo(390, 9);
      // W-S1: ON = the stop gear's sim = the 4-piece package delta.
      expect(hands.deltaDps + credit).toBeCloseTo(490, 9);
      expect(bonusOf(r, 676, 4)?.packageDeltaDps).toBeCloseTo(490, 9);
      expect(
        stopTerms(view, hands).map((t) => [t.threshold, t.isStop])
      ).toEqual([
        [2, false],
        [4, true],
      ]);
      // Every row's three 2pc partner sets tie on estimate, so all are close
      // calls: the choices sim the six pairs (12 calls; the 2pc package,
      // hands + chest, from the store), then the four distinct step gears
      // come from the store (K5S).
      expect(r.setStepSims).toEqual({
        partnerRule: "close-calls",
        gears: 4,
        simmed: 5,
        fromStore: 11,
      });
      // W-S1 on every row.
      for (const id of TH_FOUR) {
        const row = thRow(r, id);
        const c = view.rankableSetPotential(row, FLOOR, "full");
        const stop = stopTerms(view, row).find((t) => t.isStop)!;
        expect(row.deltaDps + c).toBeCloseTo(stop.totalDps, 6);
      }
    });

    it("511-S2: a row whose 4pc does not pay stops at the 2pc", async () => {
      // Scenario kind: a 4pc worth less than what its extra pieces cost. As
      // 511-R with model 4pc 10, and own value −40 for the two pieces only the
      // 4-piece set adds (Pauldrons and Leggings).
      const view = await stepView();
      const { ranking: r } = await runScenario({
        ...R_SCENARIO,
        setBonuses: { ...SET_BONUSES, 676: { b2: 50, b4: 10 } },
        itemValue: withValues([
          [THUNDERHEART.shoulder, -40],
          [THUNDERHEART.legs, -40],
        ]),
      });
      const hands = thRow(r, THUNDERHEART.hands);
      expect(
        stopTerms(view, hands).map((t) => [t.threshold, t.isStop])
      ).toEqual([
        [2, true],
        [4, false],
      ]);
      // ON = model(G + Gauntlets + Chestguard) − model(G) = 200 + 50.
      const credit = view.rankableSetPotential(hands, FLOOR, "full");
      expect(hands.deltaDps + credit).toBeCloseTo(250, 9);
      expect(futureOf(hands, 2)?.pieces?.map((p) => p.itemId)).toEqual([
        THUNDERHEART.chest,
      ]);
    });

    it("511-P4: a row in the 4-piece group only keeps its own break and is credited at its stop gear", async () => {
      // Scenario kind: a set piece outside the best 2-piece package, whose own
      // swap breaks a worn bonus. Example: worn Malorne hands and legs (2pc
      // 40); the Thunderheart Gauntlets replace the Malorne hands.
      const view = await stepView();
      const { ranking: r } = await runScenario({
        worn: wornGear({ hands: MALORNE.hands, legs: MALORNE.legs }),
        pool: TH_FOUR_POOL,
        measureBrokenSetValue: true,
      });
      expect(sortedIds(bonusOf(r, 676, 2)?.packageItemIds)).toEqual([
        THUNDERHEART.chest,
        THUNDERHEART.shoulder,
      ]);
      const hands = thRow(r, THUNDERHEART.hands);
      expect((hands.setContext?.singleBreaks ?? []).map(brk)).toEqual([
        { setId: 640, threshold: 2, dps: 40 },
      ]);
      // Stop gear: four Thunderheart, Malorne at 0: 3530 − 3040 = 490.
      const credit = view.rankableSetPotential(hands, FLOOR, "full");
      expect(credit).toBeCloseTo(430, 9);
      expect(hands.deltaDps + credit).toBeCloseTo(490, 9);
      expect(stopTerms(view, hands).find((t) => t.isStop)?.threshold).toBe(4);
    });

    it("511-O: a row outside the groups moves one for one with its own value", async () => {
      // Scenario kind: a set piece weaker than every package piece. As 511-R
      // plus the Thunderheart Wristguards at own value v, run at v = 10 and 35.
      const view = await stepView();
      const on = async (v: number) => {
        const { ranking } = await runScenario({
          ...R_SCENARIO,
          pool: [
            ...TH_FOUR_POOL,
            { itemId: THUNDERHEART.wrist, slot: "wrist" },
          ],
          itemValue: withValues([[THUNDERHEART.wrist, v]]),
        });
        const row = thRow(ranking, THUNDERHEART.wrist);
        return row.deltaDps + view.rankableSetPotential(row, FLOOR, "full");
      };
      const at10 = await on(10);
      // W-S4: the stop gear is wrist + Gauntlets + Chestguard + Leggings:
      // 10 + 300 + 50 + 80 (the four-piece interaction needs the Pauldrons).
      expect(at10).toBeCloseTo(440, 9);
      expect((await on(35)) - at10).toBeCloseTo(25, 9);
    });

    it("511-U: a failed gate sim makes the set's rows unmeasured; a failed step sim, only its row", async () => {
      // Scenario kind: a sim that fails mid-run. Example: 511-R's pool, model
      // with no interaction.
      const view = await stepView();
      const base: Scenario = {
        worn: wornGear({}),
        pool: TH_FOUR_POOL,
        measureBrokenSetValue: true,
      };
      // The (676, 4) gate's "off" sim is the only request with a set-less
      // Pauldrons: the 4-piece package copies its first piece in slot order.
      const gate = await runScenario({
        ...base,
        failWhen: (ids) => ids.includes(COPY_OFFSET + THUNDERHEART.shoulder),
      });
      expect(bonusOf(gate.ranking, 676, 4)?.unmeasured).toBe("sim-failed");
      expect(bonusOf(gate.ranking, 676, 4)?.sameGearDps).toBeUndefined();
      for (const id of TH_FOUR) {
        const row = thRow(gate.ranking, id);
        expect(view.setCreditUnmeasured(row.setContext)).toBe(true);
        expect(view.rankableSetPotential(row, FLOOR)).toBe(0);
        expect(view.setBonusSubLine(row.setContext, true)).toBe("not_counted");
      }
      // W-S7: every 2pc gear of the Pauldrons row (the Pauldrons and one
      // other real Thunderheart piece) fails. Its three partner sets are close
      // calls, so one failure alone would only skip that set (K5S); with all
      // three failed the row keeps Z's choice, whose step sim fails too.
      const thSlots = [SHOULDER_SLOT, CHEST_SLOT, HANDS_SLOT, LEGS_SLOT];
      const step = await runScenario({
        ...base,
        failWhen: (ids) =>
          ids[SHOULDER_SLOT] === THUNDERHEART.shoulder &&
          thSlots.filter((slot) => ids[slot] !== 0).length === 2,
      });
      const pauldrons = thRow(step.ranking, THUNDERHEART.shoulder);
      expect(futureOf(pauldrons, 2)?.stepGearDps).toBeUndefined();
      expect(view.rankableSetPotential(pauldrons, FLOOR)).toBe(0);
      expect(view.setCreditUnmeasured(pauldrons.setContext)).toBe(true);
      // The others stop at the 4pc: 400 + 130 − 100.
      for (const id of [
        THUNDERHEART.chest,
        THUNDERHEART.hands,
        THUNDERHEART.legs,
      ]) {
        expect(
          view.rankableSetPotential(thRow(step.ranking, id), FLOOR)
        ).toBeCloseTo(430, 9);
      }
    });

    it("511-K: a count with no bonus runs its two gate sims and nothing else, and is never a package", async () => {
      // Scenario kind: a count between two bonuses (every tier set at 3).
      // Example: worn Malorne hands and legs, Thunderheart pool of five; the
      // model has b2 and b4 only.
      const view = await stepView();
      const { ranking: r, calls } = await runScenario({
        worn: wornGear({ hands: MALORNE.hands, legs: MALORNE.legs }),
        pool: [...TH_FOUR_POOL, { itemId: THUNDERHEART.wrist, slot: "wrist" }],
        measureBrokenSetValue: true,
      });
      const three = bonusOf(r, 676, 3);
      expect(three?.sameGearDps).toBe(0);
      expect(three?.belowGate).toBe(true);
      expect(sortedIds(three?.packageItemIds)).toEqual([
        THUNDERHEART.chest,
        THUNDERHEART.shoulder,
        THUNDERHEART.wrist,
      ]);
      // W-G1: the 3-piece package keeps both worn Malorne pieces; its gate
      // copies the Pauldrons (first in slot order) and nothing else wears it.
      const onThreeGear = (ids: readonly number[]) =>
        ids[CHEST_SLOT] === THUNDERHEART.chest &&
        ids[WRIST_SLOT] === THUNDERHEART.wrist &&
        ids[HANDS_SLOT] === MALORNE.hands &&
        ids[LEGS_SLOT] === MALORNE.legs;
      const threeGear = calls.filter(onThreeGear);
      expect(
        threeGear
          .map((ids) => ids[SHOULDER_SLOT]!)
          .filter((id) => id >= COPY_OFFSET)
          .sort((a, b) => a - b)
      ).toEqual([
        COPY_OFFSET + THUNDERHEART.shoulder,
        SET_KEPT_OFFSET + THUNDERHEART.shoulder,
      ]);
      expect(
        threeGear.filter((ids) => ids[SHOULDER_SLOT] === THUNDERHEART.shoulder)
      ).toEqual([]);
      // W-K1 (F7): no row takes its top package or packages from a below-gate
      // entry. The top measured package is the 4pc (3530 − 3040 = 490), not
      // the below-gate 5pc.
      for (const id of [
        THUNDERHEART.shoulder,
        THUNDERHEART.chest,
        THUNDERHEART.wrist,
        THUNDERHEART.hands,
      ]) {
        const row = thRow(r, id);
        expect(row.setContext?.commitPackageDeltaDps).toBeCloseTo(490, 9);
        expect(
          (row.setContext?.packages ?? []).map((p) => p.threshold)
        ).toEqual([2, 4]);
        // Never a stop.
        expect(stopTerms(view, row).map((t) => t.threshold)).toEqual([2, 4]);
      }
    });

    it("511-T: a set whose only bonus needs 3 pieces is a step", async () => {
      // Scenario kind: a three-piece crafted set (cloth, leather, mail).
      // Example: Primal Intent 619, own value 100 each, model 3pc 25 only.
      const view = await stepView();
      const { ranking: r } = await runScenario({
        worn: wornGear({}),
        pool: setPool(PRIMAL_INTENT),
        itemValue: withValues(
          Object.values(PRIMAL_INTENT).map((id) => [id, 100] as const)
        ),
        setBonuses: { ...SET_BONUSES, 619: { b2: 0, b3: 25, b4: 0 } },
        measureBrokenSetValue: true,
      });
      const chest = thRow(r, PRIMAL_INTENT.chest);
      expect(futureOf(chest, 2)?.belowGate).toBe(true);
      expect(view.stepEligible(futureOf(chest, 3), FLOOR)).toBe(true);
      // Stop gear: all three, 300 + 25.
      expect(futureOf(chest, 3)?.stepGearDps).toBeCloseTo(325, 9);
      expect(stopTerms(view, chest).find((t) => t.isStop)?.threshold).toBe(3);
      expect(view.rankableSetPotential(chest, FLOOR)).toBeCloseTo(225, 9);
    });

    it("511-X: one added piece crosses a bonus only when that count's crossing gate clears", async () => {
      // Scenario kind: a set worn one short of a bonus, with a candidate in a
      // free slot. Examples: Crystalforge 629 worn at 1 (chest) with model 2pc
      // 30, then 0; Primal Intent 619 worn at 2 with model 3pc 25.
      const view = await stepView();
      const crystalforge = (b2: number) =>
        runScenario({
          worn: wornGear({ chest: CRYSTALFORGE.chest }),
          pool: [
            { itemId: CRYSTALFORGE.hands, slot: "hands" },
            { itemId: CRYSTALFORGE.legs, slot: "legs" },
          ],
          itemValue: withValues(
            Object.values(CRYSTALFORGE).map((id) => [id, 100] as const)
          ),
          setBonuses: { ...SET_BONUSES, 629: { b2, b4: 0 } },
          measureBrokenSetValue: true,
        });
      const yes = (await crystalforge(30)).ranking;
      expect(yes.crossingGates).toEqual([
        {
          setId: 629,
          count: 2,
          itemId: CRYSTALFORGE.hands,
          dps: 30,
          se: expect.any(Number),
          cleared: true,
        },
      ]);
      const hands = thRow(yes, CRYSTALFORGE.hands);
      expect(hands.setContext?.crossesThreshold).toBe(true);
      expect(view.crossingLabelCount(hands.setContext)).toBe(2);
      const no = (await crystalforge(0)).ranking;
      expect(no.crossingGates?.map((g) => [g.count, g.dps, g.cleared])).toEqual(
        [[2, 0, false]]
      );
      const handsNo = thRow(no, CRYSTALFORGE.hands);
      expect(handsNo.setContext?.crossesThreshold).toBe(false);
      expect(view.crossingLabelCount(handsNo.setContext)).toBeNull();

      const { ranking: pi } = await runScenario({
        worn: wornGear({
          chest: PRIMAL_INTENT.chest,
          wrist: PRIMAL_INTENT.wrist,
        }),
        pool: [{ itemId: PRIMAL_INTENT.waist, slot: "waist" }],
        itemValue: withValues(
          Object.values(PRIMAL_INTENT).map((id) => [id, 100] as const)
        ),
        setBonuses: { ...SET_BONUSES, 619: { b2: 0, b3: 25, b4: 0 } },
        measureBrokenSetValue: true,
      });
      const waist = thRow(pi, PRIMAL_INTENT.waist);
      expect(waist.setContext?.crossesThreshold).toBe(true);
      expect(view.crossingLabelCount(waist.setContext)).toBe(3);
    });

    it("511-E: a set with bonuses above 4 pieces gets every count, and a row can stop at 8", async () => {
      // Scenario kind: a set with bonuses at 6 or 8 pieces. Example:
      // Cryptstalker 530, own value 100 each, model 2pc 10, 4pc 20, 6pc 30,
      // 8pc 40, nothing worn, all eight pieces in the pool.
      const view = await stepView();
      const { ranking: r } = await runScenario({
        worn: wornGear({}),
        pool: setPool(CRYPTSTALKER),
        itemValue: withValues(
          Object.values(CRYPTSTALKER).map((id) => [id, 100] as const)
        ),
        setBonuses: { ...SET_BONUSES, 530: { b2: 10, b4: 20, b6: 30, b8: 40 } },
        measureBrokenSetValue: true,
      });
      expect(
        (r.setBonuses ?? [])
          .filter((b) => b.setId === 530)
          .map((b) => [b.threshold, b.belowGate ?? false, b.sameGearDps])
      ).toEqual([
        [2, false, 10],
        [3, true, 0],
        [4, false, 20],
        [5, true, 0],
        [6, false, 30],
        [7, true, 0],
        [8, false, 40],
      ]);
      // W-E1: the stop gear wears all eight, 800 + 100, less the row's 100.
      const hands = thRow(r, CRYPTSTALKER.hands);
      expect(stopTerms(view, hands).find((t) => t.isStop)?.threshold).toBe(8);
      expect(view.rankableSetPotential(hands, FLOOR)).toBeCloseTo(800, 9);
    });

    it("511-PS: two partners that share a worn-bonus loss pair best with each other", async () => {
      // Scenario kind: two set pieces that each break the same worn bonus
      // alone, so together they lose it once. Example: feral P2 BiS, worn
      // Malorne 2pc in the shoulder and chest slots (PS_SCENARIO).
      const { ranking: z } = await runScenario(PS_SCENARIO);
      const pauldrons = thRow(z, THUNDERHEART.shoulder);
      expect(pauldrons.deltaDps).toBeCloseTo(-82, 9);
      expect(futureOf(pauldrons, 2)?.pieces?.map((p) => p.itemId)).toEqual([
        THUNDERHEART.chest,
      ]);
      // model(G + Pauldrons + Chestguard) − model(G) = 3070 − 3090.
      expect(futureOf(pauldrons, 2)?.stepGearDps).toBeCloseTo(-20, 9);
      const { ranking: t } = await runScenario({
        ...PS_SCENARIO,
        partnerRule: "single-swap",
      });
      const todays = thRow(t, THUNDERHEART.shoulder);
      expect(futureOf(todays, 2)?.pieces?.map((p) => p.itemId)).toEqual([
        THUNDERHEART.hands,
      ]);
      // Pauldrons + Gauntlets keep the Malorne chest: 3064 − 3090.
      expect(futureOf(todays, 2)?.stepGearDps).toBeCloseTo(-26, 9);
    });

    it("511-PB: a partner set that loses a worn bonus no single swap loses is charged for it", async () => {
      // Scenario kind: a worn set with one piece more than its bonus needs;
      // any one swap keeps the bonus, two together lose it. Example:
      // Wastewalker 659 worn 3 (shoulder, chest, hands), model 2pc 30; the
      // Thunderheart Leggings row's 4pc partners from the Pauldrons and
      // Chestguard (110 each, both replace Wastewalker) and the Wristguards
      // and Waistguard (100 each, replace nothing).
      const scenario: Scenario = {
        worn: wornGear({
          shoulder: WASTEWALKER.shoulder,
          chest: WASTEWALKER.chest,
          hands: WASTEWALKER.hands,
        }),
        pool: [
          { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
          { itemId: THUNDERHEART.chest, slot: "chest" },
          { itemId: THUNDERHEART.wrist, slot: "wrist" },
          { itemId: THUNDERHEART.waist, slot: "waist" },
          { itemId: THUNDERHEART.legs, slot: "legs" },
        ],
        setBonuses: { ...SET_BONUSES, 659: { b2: 30, b4: 0 } },
        itemValue: withValues([
          [THUNDERHEART.shoulder, 110],
          [THUNDERHEART.chest, 110],
        ]),
        measureBrokenSetValue: true,
      };
      const z = thRow((await runScenario(scenario)).ranking, THUNDERHEART.legs);
      const z0 = thRow(
        (
          await runScenario({
            ...scenario,
            partnerRule: "sum-of-singles-plain",
          })
        ).ranking,
        THUNDERHEART.legs
      );
      // Z keeps the Wastewalker 2pc (one replacer): 100 + 310 + 130 = 540.
      expect(futureOf(z, 4)?.pieces?.map((p) => p.itemId)).toEqual([
        THUNDERHEART.chest,
        THUNDERHEART.wrist,
        THUNDERHEART.waist,
      ]);
      expect(futureOf(z, 4)?.breaks ?? []).toEqual([]);
      expect(futureOf(z, 4)?.stepGearDps).toBeCloseTo(540, 9);
      // Z0 takes both replacers and loses it: 100 + 320 + 130 − 30 = 520.
      expect(futureOf(z0, 4)?.pieces?.map((p) => p.itemId)).toEqual([
        THUNDERHEART.shoulder,
        THUNDERHEART.chest,
        THUNDERHEART.wrist,
      ]);
      expect((futureOf(z0, 4)?.breaks ?? []).map(brk)).toEqual([
        { setId: 659, threshold: 2, dps: 30 },
      ]);
      expect(futureOf(z0, 4)?.stepGearDps).toBeCloseTo(520, 9);
    });

    it("511-PR: the partner rule is swapped in one place, and each rule has its own cache key", async () => {
      // Scenario kind: the check hook scoring the rules on one character.
      // Example: PS_SCENARIO on one shared store.
      const storeMod = await importForkUpgrades<{
        MemoryStore: new () => Record<string, unknown>;
      }>("engine/seams/store.ts");
      const store = new storeMod.MemoryStore();
      const unset = await runScenario({ ...PS_SCENARIO, store });
      expect(unset.ranking.setStepSims?.partnerRule).toBe("close-calls");
      // W-H1: unset, the hashed object has no partnerRule key, as before K5.
      expect(unset.ranking.contentHash).not.toContain('"partnerRule"');
      const again = await runScenario({ ...PS_SCENARIO, store });
      expect(again.runCount).toBe(0);
      expect(again.ranking.contentHash).toBe(unset.ranking.contentHash);
      // Another rule on the same store is not served the cached ranking.
      const single = await runScenario({
        ...PS_SCENARIO,
        store,
        partnerRule: "single-swap",
      });
      expect(single.ranking.contentHash).toContain(
        '"partnerRule":"single-swap"'
      );
      expect(single.ranking.setStepSims?.partnerRule).toBe("single-swap");
      // pathToThreshold's pieces: the 2pc package is Gauntlets + Leggings, so
      // the Pauldrons row adds the better of the two.
      expect(
        sortedIds(bonusOf(single.ranking, 676, 2)?.packageItemIds)
      ).toEqual([THUNDERHEART.hands, THUNDERHEART.legs]);
      expect(
        futureOf(thRow(single.ranking, THUNDERHEART.shoulder), 2)?.pieces?.map(
          (p) => p.itemId
        )
      ).toEqual([THUNDERHEART.hands]);

      const every = await runScenario({
        ...PS_SCENARIO,
        partnerRule: "every-combination",
      });
      const audit = every.ranking.partnerAudit ?? [];
      // One entry per row and eligible bonus: four rows, counts 2 and 4.
      expect(audit).toHaveLength(8);
      for (const entry of audit) {
        expect(entry.audit.sets).toHaveLength(entry.count === 2 ? 3 : 1);
        for (const set of entry.audit.sets) expect(set.totalDps).not.toBeNull();
      }
      const p2 = audit.find(
        (e) => e.itemId === THUNDERHEART.shoulder && e.count === 2
      )!;
      // Each partner's total over 3090: Chestguard 3070, Gauntlets 3064,
      // Leggings 3046 (Malorne chest kept in the last two); Z's estimates
      // −82 + d_p, plus 90 back for the shared Malorne loss.
      expect(
        p2.audit.sets.map((s) => [s.itemIds[0], s.totalDps, s.estimateZ])
      ).toEqual([
        [THUNDERHEART.chest, -20, -70],
        [THUNDERHEART.hands, -26, -76],
        [THUNDERHEART.legs, -44, -94],
      ]);
      expect(p2.audit.chosen.itemIds).toEqual([THUNDERHEART.chest]);
      // Every partner set of that row is simmed once.
      for (const partner of [
        { chest: THUNDERHEART.chest },
        { chest: MALORNE.chest, hands: THUNDERHEART.hands },
        { chest: MALORNE.chest, legs: THUNDERHEART.legs },
      ]) {
        const gear = JSON.stringify(
          idsOf({ shoulder: THUNDERHEART.shoulder, ...partner })
        );
        expect(
          every.calls.filter((ids) => JSON.stringify(ids) === gear)
        ).toHaveLength(1);
      }
    });

    it("511-PN: partner sets that do not nest are each valued by their own total", async () => {
      // Scenario kind: the best 2pc partner is not in the best 4pc partner
      // set. Example: worn Primal Intent 619 at 3 (model 2pc 50, 3pc 30); the
      // Thunderheart Leggings row (100); the Gauntlets (110) replace nothing,
      // the Chestguard, Wristguards and Waistguard (120 each) each replace a
      // Primal Intent piece.
      const view = await stepView();
      const { ranking: r } = await runScenario({
        worn: wornGear(PRIMAL_INTENT),
        pool: [
          { itemId: THUNDERHEART.chest, slot: "chest" },
          { itemId: THUNDERHEART.wrist, slot: "wrist" },
          { itemId: THUNDERHEART.hands, slot: "hands" },
          { itemId: THUNDERHEART.waist, slot: "waist" },
          { itemId: THUNDERHEART.legs, slot: "legs" },
        ],
        setBonuses: { ...SET_BONUSES, 619: { b2: 50, b3: 30, b4: 0 } },
        itemValue: withValues([
          [THUNDERHEART.chest, 120],
          [THUNDERHEART.wrist, 120],
          [THUNDERHEART.waist, 120],
          [THUNDERHEART.hands, 110],
        ]),
        measureBrokenSetValue: true,
      });
      const legs = thRow(r, THUNDERHEART.legs);
      const stops = stopTerms(view, legs);
      expect(
        stops.map((t) => [t.threshold, t.pieces.map((p) => p.itemId)])
      ).toEqual([
        [2, [THUNDERHEART.hands]],
        [4, [THUNDERHEART.chest, THUNDERHEART.wrist, THUNDERHEART.waist]],
      ]);
      // Totals over 3080: 2pc 100 + 110 + 50 (Primal Intent kept) = 260; 4pc
      // 100 + 360 + 130, Primal Intent at 0, = 510.
      expect(stops.map((t) => t.totalDps)).toEqual([260, 510]);
      expect(stops.map((t) => t.isStop)).toEqual([false, true]);
      expect(view.rankableSetPotential(legs, FLOOR)).toBeCloseTo(510 - 100, 9);
    });

    it("511-CB: a step ranking's credit and disclosure do not read the top package's breaks", async () => {
      // Scenario kind: the top package breaks a worn bonus that the row's own
      // stop gear keeps, and that bonus's value is unmeasured. Before K5 it
      // zeroed the row (477-P); a step ranking never reads `commitBreaks`.
      const view = await stepView();
      const ctx = {
        stepRanking: true,
        setName: "Thunderheart Harness",
        piecesWornBefore: 0,
        singleDeltaDps: 30,
        futureBonuses: [
          {
            threshold: 2,
            piecesNeeded: 2,
            sameGearDps: 50,
            sameGearSe: 0.6,
            stepGearDps: 170,
            pieces: [piece(2, "B")],
          },
        ],
      };
      const commitBreaks = [
        { setId: 640, setName: "Malorne Harness", threshold: 2 },
      ];
      const withCommit = { ...ctx, commitBreaks };
      expect(view.setCreditUnmeasured(withCommit)).toBe(false);
      expect(view.rankableSetPotential({ setContext: withCommit }, FLOOR)).toBe(
        view.rankableSetPotential({ setContext: ctx }, FLOOR)
      );
      expect(view.rankableSetPotential({ setContext: withCommit }, FLOOR)).toBe(
        140
      );
      expect(view.setBonusSubLine(withCommit, true)).toBe("hover_hint");
      expect(
        view.setBonusSubLine({ stepRanking: true, commitBreaks }, true)
      ).toBeNull();
      const terms = view.setPotentialTerms(withCommit, FLOOR).terms;
      expect(terms.map((t) => t.kind)).toEqual(["stop"]);
      expect((terms[0] as StopTerm).broken).toEqual([]);
    });

    it("511-A3R: two set rings key to one slot, so their 2pc is out of reach (known limit d)", async () => {
      // Scenario kind: a set with two pieces of a two-slot item type (rings,
      // trinkets, one-hand weapons). `selectPackage` keys each candidate to
      // its first sim slot (C138), so both rings fight over finger1 and the
      // set never reaches 2. Example: Zanzil's Concentration 462 (19893 and
      // 19905), model 2pc 40. This pins today's limit; ADR-0035 records it.
      const { ranking: r } = await runScenario({
        worn: wornGear({}),
        pool: [
          { itemId: 19893, slot: "finger" },
          { itemId: 19905, slot: "finger" },
        ],
        itemValue: withValues([
          [19893, 100],
          [19905, 100],
        ]),
        setBonuses: { ...SET_BONUSES, 462: { b2: 40, b4: 0 } },
        measureBrokenSetValue: true,
      });
      expect(
        (r.setBonuses ?? []).map((b) => [b.setId, b.threshold, b.unmeasured])
      ).toEqual([[462, 2, "insufficient-pieces"]]);
      expect(r.setStepSims?.gears).toBe(0);
    });
  }
);

/* ------------------------------------------------------------------ *
 * The set screen in record mode (ticket 511, stage K5R). Literals are
 * derived in docs/set-bonus-fixture-derivations.md, "The set screen in
 * record mode".
 * ------------------------------------------------------------------ */

// Worn: Thunderheart Gauntlets (Thunderheart at 1) and Malorne shoulder and
// chest (Malorne 2pc, so the worn-set ladder runs). Pool: the Thunderheart
// Pauldrons, Chestguard and Leggings, so Thunderheart reaches 4 and has a
// crossing gate (the Leggings fill a slot Thunderheart does not).
const SR_SCENARIO: Scenario = {
  worn: wornGear({
    hands: THUNDERHEART.hands,
    shoulder: MALORNE.shoulder,
    chest: MALORNE.chest,
  }),
  pool: [
    { itemId: THUNDERHEART.shoulder, slot: "shoulder" },
    { itemId: THUNDERHEART.chest, slot: "chest" },
    { itemId: THUNDERHEART.legs, slot: "legs" },
  ],
  measureBrokenSetValue: true,
};

const SCREEN_PAIR_N = [10, 100, 300, 1000];
const SCREEN_LADDER_N = [100, 300, 1000];

/** Everything the screen must leave alone, from one run. */
async function screenFreeParts(ranking: ForkRanking) {
  const view = await stepView();
  return {
    setBonuses: ranking.setBonuses,
    brokenSetValues: ranking.brokenSetValues,
    wornSetLadder: ranking.wornSetLadder,
    crossingGates: ranking.crossingGates,
    setStepSims: ranking.setStepSims,
    rows: ranking.items.map((row) => ({
      itemId: row.itemId,
      deltaDps: row.deltaDps,
      setContext: row.setContext,
      on: row.deltaDps + view.rankableSetPotential(row, FLOOR, "full"),
    })),
  };
}

describe.skipIf(!forkPresent)(
  "the set screen in record mode (511, K5R)",
  () => {
    it("511-SR: record mode filters nothing, and records each reading with its paired error", async () => {
      // Scenario kind: a check run with the screen in record mode, on gear
      // that has a worn-set ladder, a crossing gate and a set to collect.
      const off = await runScenario(SR_SCENARIO);
      const on = await runScenario({ ...SR_SCENARIO, setScreen: "record" });
      expect(off.ranking.setScreen).toBeUndefined();
      expect(off.ranking.wornSetLadder?.length).toBeGreaterThan(0);
      expect(off.ranking.crossingGates?.length).toBeGreaterThan(0);
      // W-SR1: the screen changes nothing else in the ranking.
      expect(await screenFreeParts(on.ranking)).toEqual(
        await screenFreeParts(off.ranking)
      );
      // Only screen sims ask for per-iteration values, and every other
      // request, with its options, is the run without the screen.
      expect(off.callOpts.some((o) => "saveAllValues" in o)).toBe(false);
      const screenCalls = on.callOpts.filter((o) => o.saveAllValues === true);
      expect(
        on.calls.filter((_, i) => on.callOpts[i]!.saveAllValues !== true)
      ).toEqual(off.calls);
      expect(on.callOpts.filter((o) => o.saveAllValues !== true)).toEqual(
        off.callOpts
      );
      // W-H1: the two runs have different hashes.
      expect(off.ranking.contentHash).not.toContain('"setScreen"');
      expect(on.ranking.contentHash).toContain('"setScreen":"record"');
      // W-SR4, store keys: only a run that asks for per-iteration values gets
      // a new key; every other key is as before.
      const { simCacheKey } = await importForkUpgrades<{
        simCacheKey: (
          req: RaidSimRequest,
          simVersion: string,
          opts: SimRunOpts
        ) => string;
      }>("engine/seams/sim-runner.ts");
      const req = { raid: {} };
      const plainKey = `${JSON.stringify(req)}:${SIM_VERSION}:11:300`;
      expect(simCacheKey(req, SIM_VERSION, { seed: 11, iterations: 300 })).toBe(
        plainKey
      );
      expect(
        simCacheKey(req, SIM_VERSION, {
          seed: 11,
          iterations: 300,
          saveAllValues: false,
        })
      ).toBe(plainKey);
      expect(
        simCacheKey(req, SIM_VERSION, {
          seed: 11,
          iterations: 300,
          saveAllValues: true,
        })
      ).toBe(`${plainKey}:all`);

      const screen = on.ranking.setScreen!;
      expect(screen.mode).toBe("record");
      expect(screen.seed).toBe(11);
      expect(screen.pairIterations).toEqual(SCREEN_PAIR_N);
      expect(screen.ladderIterations).toEqual(SCREEN_LADDER_N);
      expect(
        screen.sets.map((s) => [s.setId, s.worn, s.reach, s.packageItemIds])
      ).toEqual([
        [
          676,
          1,
          4,
          [THUNDERHEART.shoulder, THUNDERHEART.chest, THUNDERHEART.legs],
        ],
      ]);
      const set = screen.sets[0]!;
      // The pair: count 4 against count 1 on the 4-piece gear, 50 + 80.
      expect(set.pairs).toEqual(
        SCREEN_PAIR_N.map((n) => ({ iterations: n, dps: 130, pairedSe: 0 }))
      );
      // Rungs at counts 1 … 4: 3000 + four pieces' 400, plus the bonuses on.
      expect(
        set.rungs.map((r) => [r.iterations, r.count, r.dps, r.pairedSeToPrev])
      ).toEqual(
        SCREEN_LADDER_N.flatMap((n) => [
          [n, 1, 3400, undefined],
          [n, 2, 3450, 0],
          [n, 3, 3450, 0],
          [n, 4, 3530, 0],
        ])
      );
      for (const rung of set.rungs) {
        expect(rung.se).toBeCloseTo(30 / Math.sqrt(rung.iterations), 9);
      }
      // 8 + 3·(R − w − 1) sims; the ladder's rungs 1 and 4 at each of its
      // three counts come from the store.
      expect(screen.simmed).toBe(8 + 3 * (4 - 1 - 1));
      expect(screen.fromStore).toBe(6);
      expect(screenCalls).toHaveLength(screen.simmed);
      for (const o of screenCalls) {
        expect(o.seed).toBe(11);
        expect(SCREEN_PAIR_N).toContain(o.iterations);
      }
    });

    it("511-SZ: a set with no bonus in reach reads exactly 0 at every N", async () => {
      // Scenario kind: a set whose bonuses do nothing for this spec, whose
      // pieces' stats are worth more worn together (511-M's Justicar: model
      // bonuses 0, +17 when all four are worn).
      const { ranking: r } = await runScenario({
        worn: wornGear({}),
        pool: setPool(JUSTICAR),
        itemValue: withValues(
          Object.values(JUSTICAR).map((id) => [id, -30] as const)
        ),
        setBonuses: { ...SET_BONUSES, 626: { b2: 0, b4: 0 } },
        interactions: [{ ids: Object.values(JUSTICAR), dps: 17 }],
        measureBrokenSetValue: true,
        setScreen: "record",
      });
      const screen = r.setScreen!;
      expect(screen.sets.map((s) => [s.setId, s.worn, s.reach])).toEqual([
        [626, 0, 4],
      ]);
      const set = screen.sets[0]!;
      // W-SR2: every rung wears the same four stats (copies count as their
      // originals in the interaction): 3000 − 120 + 17.
      expect(set.pairs.map((p) => [p.iterations, p.dps])).toEqual(
        SCREEN_PAIR_N.map((n) => [n, 0])
      );
      expect(new Set(set.rungs.map((rung) => rung.dps))).toEqual(
        new Set([2897])
      );
      expect(screen.simmed).toBe(8 + 3 * (4 - 0 - 1));
    });

    it("511-SF: a failed screen sim loses only that one reading", async () => {
      // Scenario kind: a sim that fails mid-screen. Example: 511-SR's gear;
      // the rung at count 2 (Pauldrons set-kept, Chestguard and Leggings
      // set-less) fails at N = 300.
      const off = await runScenario(SR_SCENARIO);
      const on = await runScenario({
        ...SR_SCENARIO,
        setScreen: "record",
        failWhen: (ids, opts) =>
          opts.saveAllValues === true &&
          opts.iterations === 300 &&
          ids[SHOULDER_SLOT] === SET_KEPT_OFFSET + THUNDERHEART.shoulder &&
          ids[CHEST_SLOT] === COPY_OFFSET + THUNDERHEART.chest,
      });
      expect(await screenFreeParts(on.ranking)).toEqual(
        await screenFreeParts(off.ranking)
      );
      const set = on.ranking.setScreen!.sets[0]!;
      // W-SR3: only that rung's reading is lost; its two paired errors need it.
      expect(
        set.rungs
          .filter((r) => r.dps === undefined)
          .map((r) => [r.iterations, r.count, r.se])
      ).toEqual([[300, 2, undefined]]);
      expect(
        set.rungs
          .filter((r) => r.count > 1 && r.pairedSeToPrev === undefined)
          .map((r) => [r.iterations, r.count])
      ).toEqual([
        [300, 2],
        [300, 3],
      ]);
      expect(set.pairs.map((p) => p.dps)).toEqual([130, 130, 130, 130]);
      // The failed sim was sent, so it counts as simmed.
      expect(on.ranking.setScreen!.simmed).toBe(14);
      expect(on.ranking.setScreen!.fromStore).toBe(6);
    });
  }
);

/* ------------------------------------------------------------------ *
 * The close-calls partner rule (ticket 511, stage K5S). Literals are
 * derived in docs/set-bonus-fixture-derivations.md, "The close-calls
 * partner rule".
 * ------------------------------------------------------------------ */

// Nothing worn; Thunderheart Chestguard 110, Gauntlets 100, Leggings 100;
// +20 when the Gauntlets and Leggings are worn together. Z's estimate for the
// Gauntlets row's 2pc prefers the Chestguard (210 against 200), but the
// Leggings gear sims higher (270 against 260).
const PC_SCENARIO: Scenario = {
  worn: wornGear({}),
  pool: [
    { itemId: THUNDERHEART.chest, slot: "chest" },
    { itemId: THUNDERHEART.hands, slot: "hands" },
    { itemId: THUNDERHEART.legs, slot: "legs" },
  ],
  itemValue: withValues([[THUNDERHEART.chest, 110]]),
  interactions: [{ ids: [THUNDERHEART.hands, THUNDERHEART.legs], dps: 20 }],
  measureBrokenSetValue: true,
};

describe.skipIf(!forkPresent)("the close-calls partner rule (511, K5S)", () => {
  it("511-PC: two partner sets within the margin are both simmed, and the better sim wins", async () => {
    // Scenario kind: a row whose partner sets' estimates are close, while
    // their pieces' stats interact so that the estimate's order is wrong.
    // Example: PC_SCENARIO, the Thunderheart Gauntlets row's 2pc.
    const view = await stepView();
    const { ranking: r } = await runScenario(PC_SCENARIO);
    const hands = thRow(r, THUNDERHEART.hands);
    expect(futureOf(hands, 2)?.partnerRule).toBe("close-calls");
    expect(futureOf(hands, 2)?.pieces?.map((p) => p.itemId)).toEqual([
      THUNDERHEART.legs,
    ]);
    // model(G + Gauntlets + Leggings) − model(G) = 200 + 50 + 20.
    expect(futureOf(hands, 2)?.stepGearDps).toBeCloseTo(270, 9);
    expect(view.rankableSetPotential(hands, FLOOR)).toBeCloseTo(170, 9);
    // The Chestguard row's two sets tie on estimate and on sim (260 each):
    // Z's order, the lower id.
    expect(
      futureOf(thRow(r, THUNDERHEART.chest), 2)?.pieces?.map((p) => p.itemId)
    ).toEqual([THUNDERHEART.hands]);
    // Choices sim chest + hands (the 2pc package, from the store), chest +
    // legs and hands + legs once each, then the two chosen gears come from
    // the store.
    expect(r.setStepSims).toEqual({
      partnerRule: "close-calls",
      gears: 2,
      simmed: 2,
      fromStore: 6,
    });

    // Rule Z alone keeps its estimate's choice: 100 + 110 + 50.
    const { ranking: z } = await runScenario({
      ...PC_SCENARIO,
      partnerRule: "sum-of-singles",
    });
    const zHands = thRow(z, THUNDERHEART.hands);
    expect(futureOf(zHands, 2)?.pieces?.map((p) => p.itemId)).toEqual([
      THUNDERHEART.chest,
    ]);
    expect(futureOf(zHands, 2)?.stepGearDps).toBeCloseTo(260, 9);
    expect(z.setStepSims).toEqual({
      partnerRule: "sum-of-singles",
      gears: 2,
      simmed: 1,
      fromStore: 1,
    });
  });

  it("511-PC: only a set within 31.87 of the best estimate is simmed", async () => {
    // The margin's edge: Leggings at 79 (estimate 31 below the
    // Chestguard's) or 78 (32 below), +40 with the Gauntlets, so the
    // Leggings gear sims 269 or 268 against the Chestguard's 260.
    const handsPieces = async (legs: number) => {
      const { ranking } = await runScenario({
        ...PC_SCENARIO,
        itemValue: withValues([
          [THUNDERHEART.chest, 110],
          [THUNDERHEART.legs, legs],
        ]),
        interactions: [
          { ids: [THUNDERHEART.hands, THUNDERHEART.legs], dps: 40 },
        ],
      });
      const f = futureOf(thRow(ranking, THUNDERHEART.hands), 2);
      return [f?.pieces?.map((p) => p.itemId), f?.stepGearDps];
    };
    expect(await handsPieces(79)).toEqual([[THUNDERHEART.legs], 269]);
    expect(await handsPieces(78)).toEqual([[THUNDERHEART.chest], 260]);
  });

  it("511-PC: a candidate whose sim fails is skipped; when every one fails, Z's choice stands", async () => {
    const view = await stepView();
    // Real (not copied) Thunderheart pieces worn, in slot order.
    const realTh = (ids: readonly number[]) =>
      [CHEST_SLOT, HANDS_SLOT, LEGS_SLOT]
        .map((slot) => ids[slot]!)
        .filter((id) => id !== 0 && id < COPY_OFFSET);
    const isGear = (ids: readonly number[], want: readonly number[]) =>
      JSON.stringify(realTh(ids)) === JSON.stringify(want);
    // Only the Gauntlets + Leggings gear fails: the Chestguard wins.
    const one = await runScenario({
      ...PC_SCENARIO,
      failWhen: (ids) => isGear(ids, [THUNDERHEART.hands, THUNDERHEART.legs]),
    });
    const oneHands = thRow(one.ranking, THUNDERHEART.hands);
    expect(futureOf(oneHands, 2)?.pieces?.map((p) => p.itemId)).toEqual([
      THUNDERHEART.chest,
    ]);
    expect(futureOf(oneHands, 2)?.stepGearDps).toBeCloseTo(260, 9);
    // Both of the Gauntlets row's gears fail: the row keeps Z's choice, the
    // Chestguard, whose step sim fails again, so the row is unmeasured.
    const both = await runScenario({
      ...PC_SCENARIO,
      failWhen: (ids) =>
        isGear(ids, [THUNDERHEART.hands, THUNDERHEART.legs]) ||
        isGear(ids, [THUNDERHEART.chest, THUNDERHEART.hands]),
    });
    const bothHands = thRow(both.ranking, THUNDERHEART.hands);
    expect(futureOf(bothHands, 2)?.pieces?.map((p) => p.itemId)).toEqual([
      THUNDERHEART.chest,
    ]);
    expect(futureOf(bothHands, 2)?.stepGearDps).toBeUndefined();
    expect(view.setCreditUnmeasured(bothHands.setContext)).toBe(true);
  });
});
