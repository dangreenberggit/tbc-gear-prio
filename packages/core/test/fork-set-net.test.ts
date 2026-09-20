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
} as const;
const MALORNE = {
  hands: 29097, // Gauntlets of Malorne
  legs: 29099, // Greaves of Malorne
  chest: 29096, // Breastplate of Malorne
} as const;
// Non-set leather items for the neutral vacate replacements, per slot.
const NEUTRAL = {
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

const SET_BONUSES: Record<number, { b2: number; b4: number }> = {
  676: { b2: B2_TH, b4: B4_TH },
  640: { b2: B2_MAL, b4: 0 },
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
  getSetId: (id: number) => number | undefined
): number {
  let dps = BASE_DPS;
  const setCounts = new Map<number, number>();
  for (const id of ids) {
    if (!id) continue;
    dps += ITEM_VALUE.get(id) ?? 0;
    const setId = getSetId(id);
    if (setId != null) setCounts.set(setId, (setCounts.get(setId) ?? 0) + 1);
  }
  for (const [setId, count] of setCounts) {
    const bonus = SET_BONUSES[setId];
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
  slot: "head" | "shoulder" | "chest" | "hands" | "legs";
};

type Scenario = {
  worn: WornSpec[];
  pool: PoolSpec[];
  measureBrokenSetValue?: boolean;
};

type ForkRanking = {
  items: Array<{
    itemId: number;
    deltaDps: number;
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
      }>;
      commitBreaks?: Array<{ setId: number; threshold: number; dps?: number }>;
      commitPackageDeltaDps?: number;
    };
  }>;
  baseline: { dps: number };
  setBonuses?: Array<{
    setId: number;
    threshold: number;
    bonusDps?: number;
    bonusDpsNet?: number;
    unmeasured?: string;
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
        dps: modelDps(equippedIds(req), getSetId),
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

  it("case 8: flag absent — no brokenSetValues, run count equals today's", async () => {
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

    // commit break subtracts.
    const withBreak = {
      setContext: {
        futureBonuses: [{ threshold: 4, piecesNeeded: 4, dps: 80 }],
        commitBreaks: [{ setId: 640, threshold: 2, dps: 40 }],
      },
    };
    expect(rankableSetPotential(withBreak, floor, "full")).toBe(40);

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
