/**
 * Meta repair against a brute force (ticket 535, test O1), on the fork's
 * ported engine: the one slow meta-repair case kept here. The other
 * meta-repair tests, and the brute force itself
 * (`ui/features/upgrades/testing/meta_repair_oracle.ts`), live in the fork
 * under `ui/features/upgrades/`.
 *
 * The fork's repair picks, by exact search, the best set of recolors that
 * switches the meta back on, counting every socket bonus the recolors switch
 * on or off. For a spec with a hit budget, hit counts only up to the
 * character's remaining hit cap. O1 checks every repair the tab measures on
 * five recorded rankings against that brute force.
 *
 * Skips when the fork clone is absent (`vendor/` is gitignored), like the
 * other fork-gated suites.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { forkPresent, importForkUpgrades } from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** `Stat.StatMeleeHitRating` in the fork's proto (`proto/common.ts`). */
const MELEE_HIT = 20;

/**
 * The ret-p3-p2 baseline's `meleeHitPercent_final` against level 73 with no
 * set bonus (ticket 535's comment, from the 511-512 set-credit stats log).
 */
const BASELINE_HIT_PERCENT = 6.297560509125587;

type HitCapBudget = {
  stat: number;
  remaining: number;
  groups?: Array<{ offset: number; share: number }>;
};
/** Damage by the sim's `SpellSchool` bit, the fork's `SpellDamageBySchool`. */
type SpellDamageBySchool = Readonly<Record<number, number>>;

type CapProfileMod = {
  capProfileFor: (spec: string) => unknown;
  hitCapBudgetFrom: (
    profile: unknown,
    request: unknown,
    pseudoStats: readonly number[],
    spellDamageBySchool?: SpellDamageBySchool
  ) => HitCapBudget | undefined;
};

/**
 * A pseudo-stat array whose `slot` is `percent`: 12 is
 * `PseudoStatMeleeHitPercent`, 13 `PseudoStatSpellHitPercent`.
 */
function pseudoStatsWithHit(percent: number, slot = 12): number[] {
  const out = new Array<number>(25).fill(0);
  out[slot] = percent;
  return out;
}

/** The two request fields the budget reads: the debuff and the targets. */
function budgetRequest(
  faerieFire: string | number | undefined,
  levels: readonly number[] = [73]
) {
  return {
    raid: { debuffs: faerieFire === undefined ? {} : { faerieFire } },
    encounter: { targets: levels.map((level) => ({ level })) },
  };
}

/* ------------------------------------------------------------------ *
 * Shared inputs: the tab fixtures' gear, built as the engine builds it
 * ------------------------------------------------------------------ */

type SimItemSpec = { id?: number; enchant?: number; gems: number[] };
type GemEntry = {
  id: number;
  color: number;
  stats: number[];
  unique: boolean;
  quality: number;
};
type GemContext = {
  readonly fillGems: readonly GemEntry[];
  readonly weights: Readonly<Record<string, number>>;
  readonly spec?: string;
  readonly repairHitBudget?: {
    readonly stat: number;
    readonly baselineRemaining: number;
    readonly baselineGearHit: number;
  };
};
type GemRecolor = {
  itemId: number;
  itemIndex: number;
  socketIndex: number;
  from: number;
  to: number;
};
type SwapOutcome = {
  equipment: SimItemSpec[];
  recolors: readonly GemRecolor[];
};
type FixtureRow = {
  itemId: number;
  slot: string;
  gemSubstitutions?: unknown[];
};
type Fixture = {
  spec: string;
  phase: number;
  gear: {
    items: Array<{ id?: number; enchant?: number; gems?: number[] }>;
  };
  ranking: {
    items: FixtureRow[];
    setScreen?: { sets: Array<{ setId: number; packageItemIds?: number[] }> };
  };
};

type Engine = {
  gearSwap: {
    candidateSwapWithRepairs: (
      equipment: readonly SimItemSpec[],
      slotIndex: number,
      itemId: number,
      gems: GemContext
    ) => SwapOutcome;
    candidateSwapPreRepair: (
      equipment: readonly SimItemSpec[],
      slotIndex: number,
      itemId: number,
      gems: GemContext
    ) => { swapped: SimItemSpec[]; socketed: SocketedItem[] };
  };
  caps: {
    gearHitRating: (equipment: readonly SimItemSpec[], stat: number) => number;
  };
  cg: {
    gemContext: (
      phaseGems: readonly GemEntry[],
      weights: Readonly<Record<string, number>>,
      spec?: string
    ) => GemContext;
  };
  gems: {
    gemsForPhase: (phase: number) => GemEntry[];
    getGem: (id: number) => GemEntry | undefined;
  };
  data: { epWeightsFor: (spec: string) => Readonly<Record<string, number>> };
  mr: MetaRepairMod;
  meta: MetaMod;
  items: {
    getItem: (id: number) =>
      | {
          sockets: number[];
          socketBonus: number[];
          setId?: number | null;
          itemType: number;
        }
      | undefined;
  };
  cap: CapProfileMod;
};

type SocketedItem = { itemId: number; gems: number[] };
type RepairLayout = {
  items: SocketedItem[];
  recolors: GemRecolor[];
  value: number;
  work: number;
};
type MetaRepairMod = {
  REPAIR_SEARCH_WORK_LIMIT: number;
  bestMinimalRepair: (opts: {
    items: readonly SocketedItem[];
    weights: Readonly<Record<string, number>>;
    allowedGems: readonly GemEntry[];
    hitBudget?: HitCapBudget;
    maxChanges: number;
    workLimit?: number;
  }) => RepairLayout | { overLimit: true; work: number } | undefined;
  repairMetaGems: (opts: {
    items: readonly SocketedItem[];
    epWeights: Readonly<Record<string, number>>;
    allowedGems: readonly GemEntry[];
    hitBudget?: HitCapBudget;
    workLimit?: number;
  }) => {
    items: SocketedItem[];
    metaAdjusted: boolean;
    recolors: GemRecolor[];
  };
};
type GemColorCounts = { red: number; yellow: number; blue: number };
type MetaMod = {
  metaStatus: (
    headSockets: readonly number[],
    gemIds: readonly number[]
  ) => { kind: string; metaId?: number; counts?: GemColorCounts };
  metaDeficit: (metaId: number, counts: GemColorCounts) => number;
  gemColorCounts: (gemIds: readonly number[]) => GemColorCounts;
  isMetaConditionMet: (metaId: number, counts: GemColorCounts) => boolean;
  socketBonusActive: (
    sockets: readonly number[],
    gemIds: readonly number[]
  ) => boolean;
};

async function engine(): Promise<Engine> {
  return {
    gearSwap: await importForkUpgrades<Engine["gearSwap"]>(
      "engine/gear-swap.ts"
    ),
    caps: await importForkUpgrades<Engine["caps"]>("engine/caps.ts"),
    cg: await importForkUpgrades<Engine["cg"]>("engine/candidate-gems.ts"),
    gems: await importForkUpgrades<Engine["gems"]>("engine/gems.ts"),
    data: await importForkUpgrades<Engine["data"]>("data/data.ts"),
    mr: await importForkUpgrades<MetaRepairMod>("engine/meta-repair.ts"),
    meta: await importForkUpgrades<MetaMod>("engine/meta.ts"),
    items: await importForkUpgrades<Engine["items"]>("engine/items.ts"),
    cap: await importForkUpgrades<CapProfileMod>("engine/cap-profile.ts"),
  };
}

/** The meta's status and deficit on a socketed list whose head is index 0. */
function metaOf(e: Engine, items: readonly SocketedItem[]) {
  const head = e.items.getItem(items[0]?.itemId ?? 0);
  const status = e.meta.metaStatus(
    head?.sockets ?? [],
    items.flatMap((it) => it.gems.filter((g) => g > 0))
  );
  const deficit =
    status.kind === "inactive"
      ? e.meta.metaDeficit(status.metaId!, status.counts!)
      : 0;
  return { status, deficit };
}

function loadFixture(name: string): Fixture {
  return JSON.parse(
    readFileSync(
      join(root, "packages/core/test/fixtures/tab-recordings", `${name}.json`),
      "utf8"
    )
  ) as Fixture;
}

/**
 * The fixture's `gear.items`, which is the 17-slot SIM_ORDER vector with no
 * `slot` keys, as the engine's equipment.
 */
function equipmentOf(fx: Fixture): SimItemSpec[] {
  return fx.gear.items.map((it) => ({
    ...(it.id ? { id: it.id } : {}),
    ...(it.enchant ? { enchant: it.enchant } : {}),
    gems: [...(it.gems ?? [])],
  }));
}

/* ------------------------------------------------------------------ *
 * Cycle 3, Part B: the search against a brute force
 * ------------------------------------------------------------------ */

/** The SIM_ORDER indices a ranking row's slot covers (the probes' table). */
const SLOT_INDICES: Record<string, number[]> = {
  head: [0],
  neck: [1],
  shoulder: [2],
  back: [3],
  chest: [4],
  wrist: [5],
  hands: [6],
  waist: [7],
  legs: [8],
  feet: [9],
  finger: [10, 11],
  trinket: [12, 13],
  weapon: [14],
  ranged: [16],
};

/** SIM_ORDER indices for a wowsims ItemType, for a package piece with no row. */
function indicesForItemType(itemType: number): number[] {
  if (itemType >= 1 && itemType <= 10) return [itemType - 1];
  if (itemType === 11) return [10, 11];
  if (itemType === 12) return [12, 13];
  if (itemType === 13) return [14];
  if (itemType === 14) return [16];
  return [];
}

/** The fixtures in the order ticket 535's probe table lists them. */
const O1_FIXTURES = [
  "ret-p3-p2",
  "feral-p2-malorne4",
  "feral-p3-nordrassil4",
  "feral-p3-p2bis",
  "feral-p3-th-hands-legs",
] as const;

/**
 * Each fixture's baseline gear hit (ticket 535, § Baseline and swapped-gear
 * hit).
 */
const O1_BASE_HIT: Record<(typeof O1_FIXTURES)[number], number> = {
  "ret-p3-p2": 52,
  "feral-p2-malorne4": 96,
  "feral-p3-nordrassil4": 94,
  "feral-p3-p2bis": 94,
  "feral-p3-th-hands-legs": 148,
};

/**
 * Row repairs per fixture, as this test counts them on the committed
 * fixtures (ticket 535, § The probes, gives the method). Pinned so that a
 * re-record which changes them is a deliberate edit; every repair is still
 * checked against the brute force above.
 */
const O1_ROW_REPAIRS: Record<(typeof O1_FIXTURES)[number], number> = {
  "ret-p3-p2": 78,
  "feral-p2-malorne4": 25,
  "feral-p3-nordrassil4": 35,
  "feral-p3-p2bis": 35,
  "feral-p3-th-hands-legs": 35,
};

/**
 * The named package repairs, as (set id, piece number): Burning Rage's
 * second piece on ret-p3-p2, and the first piece of three sets on
 * feral-p3-p2bis. Nothing was repaired before them in their jobs. The arena
 * sets' repairs (584, 585, 685) are checked like every other package repair
 * and logged as "other package repairs", not named.
 */
const O1_PACKAGE_REPAIRS: Record<(typeof O1_FIXTURES)[number], string[]> = {
  "ret-p3-p2": ["566:2"],
  "feral-p2-malorne4": [],
  "feral-p3-nordrassil4": [],
  "feral-p3-p2bis": ["640:1", "641:1", "676:1"],
  "feral-p3-th-hands-legs": [],
};

/**
 * Deficit counts over each fixture's row repairs plus its named package
 * repairs, pinned for the same reason as O1_ROW_REPAIRS.
 */
const O1_DEFICITS: Record<
  (typeof O1_FIXTURES)[number],
  Record<number, number>
> = {
  "ret-p3-p2": { 1: 45, 2: 34 },
  "feral-p2-malorne4": { 2: 4, 3: 21 },
  "feral-p3-nordrassil4": { 2: 4, 3: 31 },
  "feral-p3-p2bis": { 2: 5, 3: 33 },
  "feral-p3-th-hands-legs": { 2: 4, 3: 31 },
};

/** `6 × 15.769233`: feral's 9% cap minus Improved Faerie Fire's 3%, in rating. */
const FERAL_CAP_RATING = 6 * 15.769233;

type O1Job = {
  label: string;
  kind: "row" | "package";
  setId?: number;
  steps: Array<{ idx: number; id: number }>;
};

function o1Jobs(e: Engine, fx: Fixture): O1Job[] {
  const jobs: O1Job[] = [];
  const rowSlot = new Map<number, string>();
  for (const row of fx.ranking.items) {
    rowSlot.set(row.itemId, row.slot);
    for (const idx of SLOT_INDICES[row.slot] ?? []) {
      jobs.push({
        label: `row ${row.itemId}@${idx}`,
        kind: "row",
        steps: [{ idx, id: row.itemId }],
      });
    }
  }
  for (const set of fx.ranking.setScreen?.sets ?? []) {
    const steps: Array<{ idx: number; id: number }> = [];
    for (const pid of set.packageItemIds ?? []) {
      const slot = rowSlot.get(pid);
      const idxs = slot
        ? SLOT_INDICES[slot]
        : indicesForItemType(e.items.getItem(pid)?.itemType ?? 0);
      if (idxs && idxs.length > 0) steps.push({ idx: idxs[0]!, id: pid });
    }
    jobs.push({
      label: `set ${set.setId}`,
      kind: "package",
      setId: set.setId,
      steps,
    });
  }
  return jobs;
}

// Ticket 683: vitest's worker sends `onTaskUpdate` to the main process as a
// request with a fixed 60 s timer and reads the reply only between event-loop
// turns. A synchronous stretch longer than that fails the whole run with
// `Timeout calling "onTaskUpdate"` although every test passes, so 535-O1
// yields once per job.
function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/** The engine lookups the fork's brute force calls, passed in by the test. */
type OracleFork = {
  getItem(
    itemId: number
  ): { sockets: readonly number[]; socketBonus: readonly number[] } | undefined;
  getGem(gemId: number): GemEntry | undefined;
  socketBonusActive(
    sockets: readonly number[],
    gemIds: readonly number[]
  ): boolean;
  gemColorCounts(gemIds: readonly number[]): GemColorCounts;
  isMetaConditionMet(metaId: number, counts: GemColorCounts): boolean;
};

type OracleOpts = {
  /** The gear before repair, in SIM_ORDER; the head (index 0) holds the meta. */
  items: readonly SocketedItem[];
  weights: Readonly<Record<string, number>>;
  allowedGems: readonly GemEntry[];
  hitBudget?: { stat: number; remaining: number };
  maxChanges: number;
};

/**
 * The fork's brute force (`ui/features/upgrades/testing/meta_repair_oracle.ts`).
 * It is loaded through the harness, not imported, because it imports the
 * fork's engine by `@generated` alias and extensionless paths, which this
 * package's type check cannot resolve.
 */
type OracleMod = {
  repairValue(
    fork: OracleFork,
    opts: OracleOpts,
    layout: readonly SocketedItem[]
  ): number;
  bruteForceBestValue(
    fork: OracleFork,
    opts: OracleOpts,
    pool: "reduced" | "full"
  ): number | undefined;
};

function oracleFork(e: Engine): OracleFork {
  return {
    getItem: (id) => e.items.getItem(id),
    getGem: (id) => e.gems.getGem(id),
    socketBonusActive: (s, g) => e.meta.socketBonusActive(s, g),
    gemColorCounts: (ids) => e.meta.gemColorCounts(ids),
    isMetaConditionMet: (m, c) => e.meta.isMetaConditionMet(m, c),
  };
}

const isLayout = (
  r: ReturnType<MetaRepairMod["bestMinimalRepair"]>
): r is RepairLayout => r !== undefined && !("overLimit" in r);

describe.skipIf(!forkPresent)("repair matches brute force (535)", () => {
  it("535-O1: every measured repair, through the tab's own swap path, is the best minimal set", async () => {
    // Oracle: the brute force for the search; the pinned counts (see
    // O1_ROW_REPAIRS); probe 222 for the work (at most 1,343,593, under the
    // limit of 5,000,000).
    const e = await engine();
    const fork = oracleFork(e);
    const { repairValue, bruteForceBestValue } =
      await importForkUpgrades<OracleMod>("../testing/meta_repair_oracle.ts");
    const t0 = performance.now();
    const budget = e.cap.hitCapBudgetFrom(
      e.cap.capProfileFor("ret"),
      budgetRequest("TristateEffectImproved"),
      pseudoStatsWithHit(BASELINE_HIT_PERCENT)
    )!;
    const otherPackageRepairs: string[] = [];
    let measured = 0;
    let deficitOne = 0;
    let longestJobMs = 0;
    let longestJobLabel = "";

    for (const name of O1_FIXTURES) {
      const fx = loadFixture(name);
      const equipment = equipmentOf(fx);
      const gemsFx = e.cg.gemContext(
        e.gems.gemsForPhase(fx.phase),
        e.data.epWeightsFor(fx.spec),
        fx.spec
      );
      const gBase = e.caps.gearHitRating(equipment, MELEE_HIT);
      expect([name, gBase]).toEqual([name, O1_BASE_HIT[name]]);
      const rBase =
        fx.spec === "ret" ? budget.remaining : FERAL_CAP_RATING - gBase;
      const cappedFx: GemContext = {
        ...gemsFx,
        repairHitBudget: {
          stat: MELEE_HIT,
          baselineRemaining: rBase,
          baselineGearHit: gBase,
        },
      };

      let rowRepairs = 0;
      const packageRepairs: string[] = [];
      const deficits: Record<number, number> = {};
      for (const job of o1Jobs(e, fx)) {
        await yieldToEventLoop();
        const jobStart = performance.now();
        let cur = equipment;
        for (let k = 0; k < job.steps.length; k++) {
          const { idx, id } = job.steps[k]!;
          const where = `${name} ${job.label} piece ${k + 1} (${id}@${idx})`;
          const pre = e.gearSwap.candidateSwapPreRepair(cur, idx, id, cappedFx);
          const { status, deficit: d } = metaOf(e, pre.socketed);
          let out: SimItemSpec[];
          try {
            out = e.gearSwap.candidateSwapWithRepairs(
              cur,
              idx,
              id,
              cappedFx
            ).equipment;
          } catch (err) {
            // The probes' jobs stop at a piece whose repair fails.
            expect(status.kind, `${where}: ${String(err)}`).toBe("inactive");
            break;
          }
          if (status.kind === "inactive") {
            const remaining =
              rBase - (e.caps.gearHitRating(pre.swapped, MELEE_HIT) - gBase);
            const opts = {
              items: pre.socketed,
              weights: gemsFx.weights,
              allowedGems: gemsFx.fillGems,
              hitBudget: { stat: MELEE_HIT, remaining },
            };
            const atD = e.mr.bestMinimalRepair({ ...opts, maxChanges: d });
            const atD1 = e.mr.bestMinimalRepair({ ...opts, maxChanges: d + 1 });
            // Assertion 6: no search passes the work limit.
            expect(atD && "overLimit" in atD, where).toBeFalsy();
            expect(atD1 && "overLimit" in atD1, where).toBeFalsy();
            expect(isLayout(atD1), where).toBe(true);
            const layout1 = atD1 as RepairLayout;
            // Assertion 1: the tab's swap path wears the search's layout.
            out.forEach((spec, i) => {
              if (!spec.id) return;
              expect([where, i, spec.gems]).toEqual([
                where,
                i,
                layout1.items[i]!.gems,
              ]);
            });

            const pieceKey = `${job.setId}:${k + 1}`;
            const named =
              job.kind === "row" || O1_PACKAGE_REPAIRS[name].includes(pieceKey);
            if (job.kind === "row") rowRepairs += 1;
            else if (named) packageRepairs.push(pieceKey);
            else otherPackageRepairs.push(`${where} d=${d}`);
            if (named) {
              deficits[d] = (deficits[d] ?? 0) + 1;
              measured += 1;
            }

            const oracleOpts = (maxChanges: number): OracleOpts => ({
              ...opts,
              maxChanges,
            });
            // Assertion 4: d + 1 changes find nothing better than d.
            expect(isLayout(atD), where).toBe(true);
            const layoutD = atD as RepairLayout;
            if (named) {
              expect(
                Math.abs(layout1.value - layoutD.value),
                `${where}: ${layout1.value} at d + 1, ${layoutD.value} at d`
              ).toBeLessThanOrEqual(1e-9);
            } else {
              expect(layout1.value, where).toBeGreaterThanOrEqual(
                layoutD.value - 1e-9
              );
            }
            // Assertion 3: on d ≤ 2, the search's best is the brute force's.
            if (d <= 2) {
              const own = repairValue(fork, oracleOpts(d), layoutD.items);
              expect(
                Math.abs(own - layoutD.value),
                `${where}: production value ${layoutD.value}, oracle V ${own}`
              ).toBeLessThanOrEqual(1e-9);
              const brute = bruteForceBestValue(fork, oracleOpts(d), "reduced");
              expect(
                brute !== undefined && Math.abs(own - brute) <= 1e-9,
                `${where}: search ${own}, brute force ${brute}, layout ${JSON.stringify(
                  layoutD.recolors.map((c) => [
                    c.itemId,
                    c.socketIndex,
                    c.from,
                    c.to,
                  ])
                )}`
              ).toBe(true);
            }
            // Assertion 5: on d = 1, the reduced pool loses nothing.
            if (d === 1) {
              deficitOne += 1;
              const full = bruteForceBestValue(fork, oracleOpts(1), "full");
              expect(
                full !== undefined && Math.abs(full - layoutD.value) <= 1e-9,
                `${where}: search ${layoutD.value}, full gem list brute force ${full}`
              ).toBe(true);
            }
          }
          cur = out;
        }
        const jobMs = performance.now() - jobStart;
        if (jobMs > longestJobMs) {
          longestJobMs = jobMs;
          longestJobLabel = `${name} ${job.label}`;
        }
      }
      // Assertion 2: the counts the probes found.
      expect([name, rowRepairs]).toEqual([name, O1_ROW_REPAIRS[name]]);
      expect([name, packageRepairs.sort()]).toEqual([
        name,
        [...O1_PACKAGE_REPAIRS[name]].sort(),
      ]);
      expect([name, deficits]).toEqual([name, O1_DEFICITS[name]]);
    }
    // The row repairs plus the four named package repairs.
    expect(measured).toBe(212);
    // 45 named d = 1 repairs (ret-p3-p2's rows), 5 unnamed package repairs
    // on ret-p3-p2 (crafted sets the run-time pool admits: piece 1 of 552,
    // piece 2 of 553 and 554, pieces 2 and 3 of 619) and 4 on
    // feral-p3-th-hands-legs (piece 4 of sets 640, 584, 585 and 685; the
    // last three are arena sets). The feral files are bonus-gear rankings, so their
    // set packages are jobs of their own.
    expect(deficitOne).toBe(54);
    console.log(
      `[535-O1] other package repairs: ${otherPackageRepairs.length === 0 ? "none" : otherPackageRepairs.join("; ")}`
    );
    console.log(
      `[535-O1] wall ${((performance.now() - t0) / 1000).toFixed(1)} s`
    );
    console.log(
      `[535-O1] longest job ${longestJobLabel} ${(longestJobMs / 1000).toFixed(1)} s`
    );
  }, 180_000);
});
