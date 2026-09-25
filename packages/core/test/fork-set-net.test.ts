/**
 * Set-bonus NET value (ticket 467), on the fork's ported engine.
 *
 * Drives `rankUpgrades` through the fork engine with a fully controlled sim
 * whose DPS is `BASE + Σ itemValue[id] + active implemented set bonuses by piece
 * count`. Because that model is exact, the corrected `bonusDpsNet`, the measured
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

type SetBonusTable = Record<number, { b2: number; b4: number }>;

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
};
type SimRunOpts = { seed: number; iterations: number };

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

/** The controlled DPS: base + own values + active implemented set bonuses. */
function modelDps(
  ids: readonly number[],
  getSetId: (id: number) => number | undefined,
  itemValue: ReadonlyMap<number, number> = ITEM_VALUE,
  setBonuses: SetBonusTable = SET_BONUSES
): number {
  let dps = BASE_DPS;
  const setCounts = new Map<number, number>();
  for (const id of ids) {
    if (!id) continue;
    dps += itemValue.get(id) ?? 0;
    const setId = getSetId(id);
    if (setId != null) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
  }
  for (const [setId, count] of setCounts) {
    const bonus = setBonuses[setId];
    if (!bonus) continue;
    if (count >= 2) dps += bonus.b2;
    if (count >= 4) dps += bonus.b4;
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
};

type ForkRanking = {
  items: Array<{
    itemId: number;
    deltaDps: number;
    owned?: boolean;
    setContext?: {
      setId: number;
      piecesWornBefore: number;
      piecesAfterSwap: number;
      crossesThreshold: boolean;
      singleBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      futureBonuses?: Array<{
        threshold: number;
        piecesNeeded: number;
        dps?: number;
        breaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      }>;
      commitBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      commitPackageDeltaDps?: number;
    };
  }>;
  baseline: { dps: number };
  setBonuses?: Array<{
    setId: number;
    threshold: number;
    packageItemIds?: number[];
    bonusDps?: number;
    bonusDpsNet?: number;
    unmeasured?: string;
    selfConfound?: { threshold: number; dps?: number };
  }>;
  brokenSetValues?: Array<{
    setId: number;
    threshold: number;
    dps?: number;
    unmeasured?: string;
  }>;
};

async function runScenario(
  scenario: Scenario
): Promise<{ ranking: ForkRanking; runCount: number }> {
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
  const { simCacheKey } = seamMod;
  const sim = {
    version: () => Promise.resolve(SIM_VERSION),
    run: (req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> => {
      runCount += 1;
      return Promise.resolve({
        dps: modelDps(
          equippedIds(req),
          getSetId,
          scenario.itemValue,
          scenario.setBonuses
        ),
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
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
    store: new storeMod.MemoryStore(),
    clock: () => new Date("2026-09-20T12:00:00.000Z"),
    raidSimSkeleton: feralSkeleton,
    epWeights: feralWeights,
    pool,
    ...(scenario.measureBrokenSetValue ? { measureBrokenSetValue: true } : {}),
  });

  return { ranking, runCount };
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
    const fut1 = row1?.setContext?.futureBonuses ?? [];
    expect(fut1.map((f) => f.threshold)).toEqual([4]);
    expect(fut1[0]?.piecesNeeded).toBe(3);

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

  it("case 7: no neutral replacement — unmeasured, net absent, credit 0", async () => {
    const viewMod = await importForkUpgrades<{
      rankableSetPotential: (
        item: { setContext?: unknown },
        noiseFloorDps: number,
        setCredit?: "full" | "split"
      ) => number;
    }>("engine/view.ts");
    // Malorne 2pc worn in hands+legs, Thunderheart pool in those slots, but NO
    // neutral candidate to vacate to -> B unmeasured.
    const { ranking } = await runScenario({
      worn: wornGear({ hands: MALORNE.hands, legs: MALORNE.legs }),
      pool: TH_POOL, // only Thunderheart, no neutrals
      measureBrokenSetValue: true,
    });
    const bsv = (ranking.brokenSetValues ?? []).find(
      (b) => b.setId === 640 && b.threshold === 2
    );
    expect(bsv?.unmeasured).toBe("no-neutral-candidates");
    // The 4pc that breaks Malorne has no net (B unmeasured).
    const th4 = (ranking.setBonuses ?? []).find(
      (b) => b.setId === 676 && b.threshold === 4
    );
    expect(th4?.bonusDpsNet).toBeUndefined();
    // A row whose future lacks a measured net -> credit 0 in both views.
    const breakingRow = ranking.items.find(
      (i) =>
        i.setContext?.setId === 676 &&
        (i.setContext.futureBonuses ?? []).some((f) => f.dps === undefined)
    );
    expect(breakingRow).toBeDefined();
    expect(viewMod.rankableSetPotential(breakingRow!, 5, "full")).toBe(0);
    expect(viewMod.rankableSetPotential(breakingRow!, 5, "split")).toBe(0);
  });

  it("case 8: flag absent — no brokenSetValues, only the B sims are added", async () => {
    const worn = wornGear({ hands: MALORNE.hands, legs: MALORNE.legs });
    const pool = [
      ...TH_POOL,
      { itemId: NEUTRAL.hands[0], slot: "hands" as const },
      { itemId: NEUTRAL.legs[0], slot: "legs" as const },
    ];
    const off = await runScenario({ worn, pool });
    const on = await runScenario({ worn, pool, measureBrokenSetValue: true });
    expect(off.ranking.brokenSetValues ?? []).toHaveLength(0);
    // The flag adds exactly the B sims and nothing else.
    expect(on.runCount).toBeGreaterThan(off.runCount);
    const bCount = (on.ranking.brokenSetValues ?? []).filter(
      (b) => b.dps !== undefined
    ).length;
    expect(on.runCount - off.runCount).toBe(bCount);
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
      expect((ctx.futureBonuses ?? []).map(fut)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: 50 },
        { threshold: 4, piecesNeeded: 4, dps: 80 },
      ]);
      expect(near(view.rankableSetPotential(row, FLOOR, "full"), 90, 0.5)).toBe(
        true
      );
      expect(near(view.rankableSetPotential(row, FLOOR, "split"), 5, 0.5)).toBe(
        true
      );
    }
    // One vacate sim per target, (640,4) and (640,2).
    expect(on.runCount - off.runCount).toBe(2);
    // C31 / ADR-0034: rows are not additive in either credit view. The package
    // net is 90; four rows sum to 360 under full and 20 under split.
    const rows = TH_FOUR_IDS.map((id) => thRow(r, id));
    const fullSum = rows.reduce(
      (s, row) => s + view.rankableSetPotential(row, FLOOR, "full"),
      0
    );
    const splitSum = rows.reduce(
      (s, row) => s + view.rankableSetPotential(row, FLOOR, "split"),
      0
    );
    expect(near(fullSum, 360, 2)).toBe(true);
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
    expect(near(view.rankableSetPotential(row, FLOOR, "full"), 20, 0.5)).toBe(
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
      { threshold: 4, piecesNeeded: 4, dps: 80 },
    ]);
    // The top package with legs substituted breaks Malorne 2pc, so it is a
    // measurement target and disclosed. The legs row's own path to each future
    // (legs plus the best remaining package pieces) keeps Malorne chest and
    // hands, so it breaks nothing and the row keeps 50 + 80 = 130 (490, C27).
    expect(near(bsvDps(r, 640, 2)!, 40, 0.5)).toBe(true);
    expect((legs.setContext?.commitBreaks ?? []).map(brk)).toEqual([
      { setId: 640, threshold: 2, dps: 40 },
    ]);
    for (const f of legs.setContext?.futureBonuses ?? []) {
      expect(f.breaks ?? []).toEqual([]);
    }
    expect(near(view.rankableSetPotential(legs, FLOOR, "full"), 130, 0.5)).toBe(
      true
    );
    // Discovery is bounded by distinct keys, not rows (the case-8 invariant).
    const measured = (r.brokenSetValues ?? []).filter(
      (b) => b.dps !== undefined
    ).length;
    expect(on.runCount - off.runCount).toBe(measured);
    expect(measured).toBe(1);
    // The package's own members break nothing and keep the full 50 + 80.
    for (const id of [
      THUNDERHEART.wrist,
      THUNDERHEART.waist,
      THUNDERHEART.feet,
      THUNDERHEART.hands,
    ]) {
      const row = thRow(r, id);
      expect(row.setContext?.commitBreaks ?? []).toEqual([]);
      expect(
        near(view.rankableSetPotential(row, FLOOR, "full"), 130, 0.5)
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
    ]);
    expect(near(view.rankableSetPotential(head, FLOOR, "full"), 80, 0.5)).toBe(
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
    expect(on.runCount - off.runCount).toBe(1);
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
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: 40, breaks: [] },
        { threshold: 4, piecesNeeded: 4, dps: 0, breaks: [TH2_BREAK] },
      ]);
      expect((row.setContext?.commitBreaks ?? []).map(brk)).toEqual([
        TH2_BREAK,
      ]);
      expect(near(view.rankableSetPotential(row, FLOOR, "full"), 40, 0.5)).toBe(
        true
      );
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
      for (const f of row.setContext?.futureBonuses ?? []) {
        expect(f.breaks ?? []).toEqual([]);
      }
      expect(near(view.rankableSetPotential(row, FLOOR, "full"), 40, 0.5)).toBe(
        true
      );
    }
    const top3 = view
      .applyView(r, { withSetPotential: true })
      .rows.slice(0, 3)
      .map((row) => row.itemId);
    expect(sortedIds(top3)).toEqual([29096, 29098, 29100]);
  });

  it("490-B: a real 4pc worth less than the break it needs (rule discriminator)", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    const { on } = await run490({
      676: { b2: B2_TH, b4: B4_TH },
      640: { b2: 40, b4: 30 },
    });
    const chest = thRow(on.ranking, MALORNE.chest);
    expect((chest.setContext?.futureBonuses ?? []).map(futB)).toEqual([
      { threshold: 2, piecesNeeded: 2, dps: 40, breaks: [] },
      { threshold: 4, piecesNeeded: 4, dps: 30, breaks: [TH2_BREAK] },
    ]);
    // Each rule on this row directly, so the rule the engine does not ship
    // still runs: full-path is 40 + 30 − 50 = 20 and 20 + 7.5 − 50 = −22.5.
    const ctx = chest.setContext;
    expect(
      near(view.setPotentialCredit(ctx, FLOOR, "full", "full-path"), 20, 0.5)
    ).toBe(true);
    expect(
      near(
        view.setPotentialCredit(ctx, FLOOR, "split", "full-path"),
        -22.5,
        0.5
      )
    ).toBe(true);
    expect(
      near(view.setPotentialCredit(ctx, FLOOR, "full", "best-stop"), 40, 0.5)
    ).toBe(true);
    expect(
      near(view.setPotentialCredit(ctx, FLOOR, "split", "best-stop"), 20, 0.5)
    ).toBe(true);
    const full = view.rankableSetPotential(chest, FLOOR, "full");
    const split = view.rankableSetPotential(chest, FLOOR, "split");
    if (view.RULE_490 === "best-stop") {
      // R_2 = 40, R_4 = 40 + 30 − 50 = 20: stop at the 2pc.
      expect(near(full, 40, 0.5)).toBe(true);
      expect(near(split, 20, 0.5)).toBe(true);
    } else {
      expect(near(full, 20, 0.5)).toBe(true);
      expect(near(split, -22.5, 0.5)).toBe(true);
    }
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
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        { threshold: 4, piecesNeeded: 4, dps: 0, breaks: [TH2_BREAK] },
      ]);
      expect(near(row.setContext!.commitPackageDeltaDps!, 250, 0.5)).toBe(true);
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
    expect(near(view.rankableSetPotential(head, FLOOR, "full"), 80, 0.5)).toBe(
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
    expect(on.runCount - off.runCount).toBe(1);
    for (const id of [
      THUNDERHEART.head,
      THUNDERHEART.shoulder,
      THUNDERHEART.chest,
      THUNDERHEART.legs,
    ]) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 150, 0.5)).toBe(true);
      expect((row.setContext?.futureBonuses ?? []).map(futB)).toEqual([
        {
          threshold: 4,
          piecesNeeded: 3,
          dps: 80,
          breaks: [{ setId: 640, threshold: 2, dps: 40 }],
        },
      ]);
      expect(near(view.rankableSetPotential(row, FLOOR, "full"), 40, 0.5)).toBe(
        true
      );
    }
  });

  it("492-N: with no break-free pair the worn-1 4pc net stays unset and the row says not counted", async () => {
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
    for (const id of [
      THUNDERHEART.head,
      THUNDERHEART.chest,
      THUNDERHEART.legs,
    ]) {
      const row = thRow(r, id);
      const future = row.setContext?.futureBonuses ?? [];
      expect(future.map((f) => f.threshold)).toEqual([4]);
      expect(future[0]!.dps).toBeUndefined();
      expect(view.rankableSetPotential(row, FLOOR, "full")).toBe(0);
      expect(view.setBonusSubLine(row.setContext, true)).toBe("not_counted");
    }
  });

  it("476-D: a lower B that needs an unmeasured higher B is dependent-unmeasured", async () => {
    const view = await importForkUpgrades<SubLineMod>("engine/view.ts");
    // 476-A without the neutral head and shoulder: the (640,4) vacate of head
    // + shoulder finds no replacement that crosses no threshold.
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
    });
    const r = on.ranking;
    const bsv = (threshold: number) =>
      (r.brokenSetValues ?? []).find(
        (b) => b.setId === 640 && b.threshold === threshold
      );
    expect(bsv(4)?.unmeasured).toBe("no-neutral-candidates");
    expect(bsv(2)?.unmeasured).toBe("dependent-unmeasured");
    expect(bsv(4)?.dps).toBeUndefined();
    expect(bsv(2)?.dps).toBeUndefined();
    // Both failures are found before any sim.
    expect(on.runCount - off.runCount).toBe(0);
    expect(netOf(r, 676, 2)).toBeUndefined();
    expect(netOf(r, 676, 4)).toBeUndefined();
    for (const id of TH_FOUR_IDS) {
      const row = thRow(r, id);
      expect(near(row.deltaDps, 30, 0.5)).toBe(true);
      expect((row.setContext?.singleBreaks ?? []).map(brk)).toEqual([
        { setId: 640, threshold: 4, dps: undefined },
      ]);
      expect((row.setContext?.futureBonuses ?? []).map(fut)).toEqual([
        { threshold: 2, piecesNeeded: 2, dps: undefined },
        { threshold: 4, piecesNeeded: 4, dps: undefined },
      ]);
      expect(view.rankableSetPotential(row, FLOOR, "full")).toBe(0);
      expect(view.setBonusSubLine(row.setContext, true)).toBe("not_counted");
    }
  });
});
