/**
 * Meta repair with a hit budget and an exact search (ticket 535), on the
 * fork's ported engine.
 *
 * The fork's repair picks, by exact search, the best set of recolours that
 * switches the meta back on, counting every socket bonus the recolours switch
 * on or off. On ret and feral, when the runner can read character stats, hit
 * counts only up to the character's remaining hit cap. These cases check that
 * against literals from the `/computeStats` readings and probe results in
 * ticket 535's comment of 2026-10-03
 * (`.scratch/carry-forward/issues/535-meta-repair-may-add-dead-hit-gems-to-set-gear.md`),
 * and against a brute force written in test code (`meta-repair-oracle.ts`).
 *
 * Each case names its ticket 535 test id. Skips when the fork clone is absent
 * (`vendor/` is gitignored), like the other fork-gated suites.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import { SIM_ORDER } from "../src/slots.js";
import {
  forkPresent,
  forkRoot,
  forkUpgradesDir,
  importForkUpgrades,
} from "./fork-engine-harness.js";
import {
  bruteForceBestValue,
  type OracleFork,
  type OracleOpts,
  repairValue,
} from "./meta-repair-oracle.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** `Stat.StatMeleeHitRating` in the fork's proto (`proto/common.ts`). */
const MELEE_HIT = 20;

/**
 * The ret-p3-p2 baseline's `meleeHitPercent_final` against level 73 with no
 * set bonus (ticket 535's comment, from the 511-512 set-credit stats log).
 */
const BASELINE_HIT_PERCENT = 6.297560509125587;

type HitCapBudget = { stat: number; remaining: number };
type CapProfileMod = {
  capProfileFor: (spec: string) => unknown;
  hitCapBudgetFrom: (
    profile: unknown,
    request: unknown,
    pseudoStats: readonly number[]
  ) => HitCapBudget | undefined;
};

/** A pseudo-stat array whose `PseudoStatMeleeHitPercent` (12) is `percent`. */
function pseudoStatsWithHit(percent: number): number[] {
  const out = new Array<number>(13).fill(0);
  out[12] = percent;
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

describe.skipIf(!forkPresent)("repair hit budget (535)", () => {
  const load = () => importForkUpgrades<CapProfileMod>("engine/cap-profile.ts");

  it("535-B1: ret with Improved Faerie Fire and one level-73 target is 4.69 rating over the cap", async () => {
    // 52 rating is 3.30% hit plus Precision's 3%; the cap with Improved
    // Faerie Fire is 6%, 47.31 rating after Precision.
    const m = await load();
    const budget = m.hitCapBudgetFrom(
      m.capProfileFor("ret"),
      budgetRequest("TristateEffectImproved"),
      pseudoStatsWithHit(BASELINE_HIT_PERCENT)
    );
    expect(budget?.stat).toBe(MELEE_HIT);
    expect(budget?.remaining).toBeCloseTo(-4.69, 2);
  });

  it("535-B2: without Improved Faerie Fire the budget is the readout's cap minus the gear and Precision", async () => {
    // 141.92 (`ranking.caps.hit.capRating` in data/tab-fixtures/ret-p3-p2.json)
    // − 52 − 47.31 = 42.62.
    const m = await load();
    for (const ff of [undefined, "TristateEffectRegular"]) {
      const budget = m.hitCapBudgetFrom(
        m.capProfileFor("ret"),
        budgetRequest(ff),
        pseudoStatsWithHit(BASELINE_HIT_PERCENT)
      );
      expect(budget?.remaining).toBeCloseTo(42.62, 2);
    }
  });

  it("535-B3: the debuff's enum value 2 counts as Improved", async () => {
    const m = await load();
    const budget = m.hitCapBudgetFrom(
      m.capProfileFor("ret"),
      budgetRequest(2),
      pseudoStatsWithHit(BASELINE_HIT_PERCENT)
    );
    expect(budget?.remaining).toBeCloseTo(-4.69, 2);
  });

  it("535-B4: a spec without a repair cap (rogue, mage) gets no budget", async () => {
    const m = await load();
    for (const spec of ["rogue", "mage"]) {
      expect(
        m.hitCapBudgetFrom(
          m.capProfileFor(spec),
          budgetRequest("TristateEffectImproved"),
          pseudoStatsWithHit(BASELINE_HIT_PERCENT)
        )
      ).toBeUndefined();
    }
  });

  it("535-B5: any target that is not level 73 withholds the budget", async () => {
    const m = await load();
    for (const levels of [[72], [73, 72]]) {
      expect(
        m.hitCapBudgetFrom(
          m.capProfileFor("ret"),
          budgetRequest("TristateEffectImproved", levels),
          pseudoStatsWithHit(BASELINE_HIT_PERCENT)
        )
      ).toBeUndefined();
    }
  });
});

/* ------------------------------------------------------------------ *
 * Shared inputs: the tab fixtures' gear, built as the engine builds it
 * ------------------------------------------------------------------ */

type SimItemSpec = { id?: number; enchant?: number; gems: number[] };
type GemEntry = {
  id: number;
  colour: number;
  stats: number[];
  unique: boolean;
  quality: number;
};
type GemContext = {
  readonly fillPalette: readonly GemEntry[];
  readonly weights: Readonly<Record<string, number>>;
  readonly spec?: string;
  readonly repairHitCap?: {
    readonly stat: number;
    readonly baselineRemaining: number;
    readonly baselineGearHit: number;
  };
};
type RepairSwap = {
  itemId: number;
  itemIndex: number;
  socketIndex: number;
  from: number;
  to: number;
};
type SwapOutcome = {
  equipment: SimItemSpec[];
  swaps: readonly RepairSwap[];
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
  rank: {
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
      palette: readonly GemEntry[],
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
  changes: RepairSwap[];
  value: number;
  work: number;
};
type MetaRepairMod = {
  REPAIR_SEARCH_WORK_LIMIT: number;
  bestMinimalRepair: (opts: {
    items: readonly SocketedItem[];
    weights: Readonly<Record<string, number>>;
    palette: readonly GemEntry[];
    hitCap?: HitCapBudget;
    maxChanges: number;
    workLimit?: number;
  }) => RepairLayout | { overLimit: true; work: number } | undefined;
  repairAndMinimize: (opts: {
    items: readonly SocketedItem[];
    epWeights: Readonly<Record<string, number>>;
    palette: readonly GemEntry[];
    hitCap?: HitCapBudget;
    workLimit?: number;
  }) => { items: SocketedItem[]; metaAdjusted: boolean; swaps: RepairSwap[] };
};
type ColourCounts = { red: number; yellow: number; blue: number };
type MetaMod = {
  metaStatus: (
    headSockets: readonly number[],
    gemIds: readonly number[]
  ) => { kind: string; metaId?: number; counts?: ColourCounts };
  metaDeficit: (metaId: number, counts: ColourCounts) => number;
  gemColorCounts: (gemIds: readonly number[]) => ColourCounts;
  isMetaConditionMet: (metaId: number, counts: ColourCounts) => boolean;
  socketBonusActive: (
    sockets: readonly number[],
    gemIds: readonly number[]
  ) => boolean;
};

async function engine(): Promise<Engine> {
  return {
    rank: await importForkUpgrades<Engine["rank"]>("engine/rank.ts"),
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

const socketedOf = (equipment: readonly SimItemSpec[]): SocketedItem[] =>
  equipment.map((spec) => ({ itemId: spec.id ?? 0, gems: [...spec.gems] }));

/**
 * The sockets whose gem differs between two gears, outside `swappedSlot`, as
 * `[itemId, socket, from, to]`.
 */
function changesBetween(
  before: readonly SimItemSpec[],
  after: readonly SimItemSpec[],
  swappedSlot: number
): Array<[number, number, number, number]> {
  const out: Array<[number, number, number, number]> = [];
  for (let i = 0; i < before.length; i++) {
    if (i === swappedSlot) continue;
    const a = before[i]!.gems;
    const b = after[i]!.gems;
    for (let s = 0; s < Math.max(a.length, b.length); s++) {
      if ((a[s] ?? 0) !== (b[s] ?? 0)) {
        out.push([after[i]!.id ?? 0, s, a[s] ?? 0, b[s] ?? 0]);
      }
    }
  }
  return out;
}

/** The (from, to) pairs of a change list, sorted, for multiset equality. */
const pairsOf = (changes: ReadonlyArray<readonly number[]>) =>
  changes.map((c) => `${c[2]}->${c[3]}`).sort();

const holdsGem = (equipment: readonly SimItemSpec[], gemId: number) =>
  equipment.some((spec) => spec.gems.includes(gemId));

function loadFixture(name: string): Fixture {
  return JSON.parse(
    readFileSync(join(root, "data/tab-fixtures", `${name}.json`), "utf8")
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

/**
 * The fork's ret P2 weights, read from the file the tab ships. Empty without
 * the fork: this runs at import, so reading it then would fail the whole file
 * instead of letting the `forkPresent` suites skip.
 */
const retWeights: Record<string, number> = forkPresent
  ? (
      JSON.parse(
        readFileSync(
          join(forkUpgradesDir, "data/ret-p2.ep-weights.json"),
          "utf8"
        )
      ) as { weights: Record<string, number> }
    ).weights
  : {};

const CHEST = SIM_ORDER.indexOf("chest");
const SHOULDER = SIM_ORDER.indexOf("shoulder");

/** The 4 ret-p3-p2 chest rows whose gear is over the hit cap. */
const CAPPED_CHESTS = [
  { itemId: 32365, asBuilt: 75 }, // Heartshatter Breastplate
  { itemId: 30102, asBuilt: 75 }, // Krakken-Heart Breastplate
  { itemId: 28601, asBuilt: 67 }, // Chestguard of the Conniver
  { itemId: 30896, asBuilt: 79 }, // Glory of the Defender
] as const;

/** The 19 other ret-p3-p2 chest rows (requests 181–516 of the measurement). */
const UNCAPPED_CHESTS = [
  30907, 32334, 23522, 28599, 30913, 32592, 32327, 30075, 30887, 30899, 32340,
  30904, 28602, 28578, 28662, 28735, 29921, 28600, 30065,
] as const;

const RAGESTEEL_SHOULDERS = 33173;
const RAGESTEEL_BREASTPLATE = 23522;

async function retInputs() {
  const e = await engine();
  const fx = loadFixture("ret-p3-p2");
  const equipment = equipmentOf(fx);
  const gems = e.cg.gemContext(e.gems.gemsForPhase(3), retWeights, "ret");
  return { e, fx, equipment, gems };
}

describe.skipIf(!forkPresent)("socket bonus follows the sim (541)", () => {
  // Gladiator's Plate Helm's sockets: [Meta, Yellow] (GemColor 1 and 4).
  const META_YELLOW = [1, 4];

  it("541-F: the fork's socketBonusActive withholds the bonus for an empty meta socket beside a matched yellow socket", async () => {
    const { meta } = await engine();
    expect(meta.socketBonusActive(META_YELLOW, [0, 23113])).toBe(false);
    expect(meta.socketBonusActive(META_YELLOW, [32409, 23113])).toBe(true);
  });
});

describe.skipIf(!forkPresent)("gear hit matches the sim (535)", () => {
  it("535-L0: the ret-p3-p2 baseline sums to the sim's 52 gear hit rating, head enchant included", async () => {
    const { e, equipment } = await retInputs();
    expect(retWeights["20"]).toBe(2.15);
    expect(retWeights["0"]).toBe(1.0);
    expect(e.caps.gearHitRating(equipment, MELEE_HIT)).toBe(52);
  });

  it("535-L1: each chest row's as-built gear sums to the sim's reading of it", async () => {
    const { e, equipment, gems } = await retInputs();
    const asBuilt = (itemId: number) =>
      e.caps.gearHitRating(
        e.rank.candidateSwapWithRepairs(equipment, CHEST, itemId, gems)
          .equipment,
        MELEE_HIT
      );
    for (const { itemId, asBuilt: rating } of CAPPED_CHESTS) {
      expect([itemId, asBuilt(itemId)]).toEqual([itemId, rating]);
    }
    for (const itemId of UNCAPPED_CHESTS) {
      expect([itemId, asBuilt(itemId)]).toEqual([itemId, 45]);
    }
  });

  it("535-L2: the Burning Rage package sums to the set-less reading, 54; the set-kept 74 is out of reach because set-bonus hit is in Go code", async () => {
    const { e, equipment, gems } = await retInputs();
    const shoulders = e.rank.candidateSwapWithRepairs(
      equipment,
      SHOULDER,
      RAGESTEEL_SHOULDERS,
      gems
    ).equipment;
    const pkg = e.rank.candidateSwapWithRepairs(
      shoulders,
      CHEST,
      RAGESTEEL_BREASTPLATE,
      gems
    ).equipment;
    expect(e.caps.gearHitRating(pkg, MELEE_HIT)).toBe(54);
  });
});

/* ------------------------------------------------------------------ *
 * Cycle 3: the exact repair
 * ------------------------------------------------------------------ */

const BOLD = 24027; // Bold Living Ruby, 8 Str
const RIGID = 24051; // Rigid Dawnstone, 8 Hit
const INSCRIBED = 24058; // Inscribed Noble Topaz, 4 Str 4 Crit
const NIGHTSEYE = 24054; // Sovereign Nightseye, purple
const BOOTS = 30104;
const BELT = 30106;
const SHOULDER_30055 = 30055;
const WRIST = SIM_ORDER.indexOf("wrist");

/** `gems` with the ret-p3-p2 baseline's budget, as `rankUpgrades` sets it. */
async function retCapped() {
  const inputs = await retInputs();
  const { e, gems } = inputs;
  const budget = e.cap.hitCapBudgetFrom(
    e.cap.capProfileFor("ret"),
    budgetRequest("TristateEffectImproved"),
    pseudoStatsWithHit(BASELINE_HIT_PERCENT)
  )!;
  const capped: GemContext = {
    ...gems,
    repairHitCap: {
      stat: MELEE_HIT,
      baselineRemaining: budget.remaining,
      baselineGearHit: 52,
    },
  };
  return { ...inputs, capped };
}

/**
 * The fork's rogue P2 preset gear with coloured gems removed in slot order,
 * then socket order, skipping a removal that would take the meta's deficit
 * past `target`, until the deficit is `target`.
 */
async function rogueAtDeficit(e: Engine, target: number) {
  const gear = (
    JSON.parse(
      readFileSync(
        join(forkRoot, "ui/specs/rogue/dps/gear_sets/p2.gear.json"),
        "utf8"
      )
    ) as { items: Array<{ id?: number; gems?: number[] }> }
  ).items;
  const items: SocketedItem[] = gear.map((it) => ({
    itemId: it.id ?? 0,
    gems: [...(it.gems ?? [])],
  }));
  let removed = 0;
  outer: for (const it of items) {
    const item = e.items.getItem(it.itemId);
    if (!item) continue;
    for (let s = 0; s < it.gems.length; s++) {
      if (item.sockets[s] === 1 || !it.gems[s]) continue;
      if (metaOf(e, items).deficit === target) break outer;
      const kept = it.gems[s]!;
      it.gems[s] = 0;
      if (metaOf(e, items).deficit > target) it.gems[s] = kept;
      else removed += 1;
    }
  }
  return { items, removed, deficit: metaOf(e, items).deficit };
}

describe.skipIf(!forkPresent)("exact repair (535)", () => {
  it("535-R1: a chest row over the cap gets two Inscribed Noble Topaz and no Rigid Dawnstone", async () => {
    // Oracle: Inscribed was the best measured alternative on all four rows
    // (ticket 535's measurement §4), and the credited optimum.
    const { e, equipment, capped } = await retCapped();
    for (const { itemId } of CAPPED_CHESTS) {
      const out = e.rank.candidateSwapWithRepairs(
        equipment,
        CHEST,
        itemId,
        capped
      ).equipment;
      const changes = changesBetween(equipment, out, CHEST);
      expect([itemId, pairsOf(changes)]).toEqual([
        itemId,
        [`${BOLD}->${INSCRIBED}`, `${BOLD}->${INSCRIBED}`],
      ]);
      expect(holdsGem(out, RIGID)).toBe(false);
    }
  });

  it("535-R2: a chest row under the cap keeps two Rigid Dawnstones", async () => {
    // Oracle: Rigid beat every alternative by 17.1–19.8 DPS on these rows.
    const { e, equipment, capped } = await retCapped();
    for (const itemId of UNCAPPED_CHESTS) {
      const out = e.rank.candidateSwapWithRepairs(
        equipment,
        CHEST,
        itemId,
        capped
      ).equipment;
      expect([itemId, pairsOf(changesBetween(equipment, out, CHEST))]).toEqual([
        itemId,
        [`${BOLD}->${RIGID}`, `${BOLD}->${RIGID}`],
      ]);
    }
  });

  it("535-R3: with no budget, Heartshatter's repair is two Rigid Dawnstones", async () => {
    // Oracle: at full weight Rigid gains 9.2 EP over Bold, more than any other
    // rare gem that adds yellow.
    const { e, equipment, gems } = await retInputs();
    const out = e.rank.candidateSwapWithRepairs(
      equipment,
      CHEST,
      32365,
      gems
    ).equipment;
    expect(pairsOf(changesBetween(equipment, out, CHEST))).toEqual([
      `${BOLD}->${RIGID}`,
      `${BOLD}->${RIGID}`,
    ]);
  });

  it("535-R4: the budget caps the layout's total hit: Burning Rage's package gets one Rigid and one Inscribed", async () => {
    // remaining = −4.69 − (38 − 52) = 9.31: two Rigid score 4.02, one of each
    // 8.28, two Inscribed −1.84 (V, as `meta-repair-oracle.ts` defines it).
    // One of each was also the
    // best measured set-less layout.
    const { e, equipment, capped } = await retCapped();
    const shoulders = e.rank.candidateSwapWithRepairs(
      equipment,
      SHOULDER,
      RAGESTEEL_SHOULDERS,
      capped
    ).equipment;
    expect(changesBetween(equipment, shoulders, SHOULDER)).toEqual([]);
    const pkg = e.rank.candidateSwapWithRepairs(
      shoulders,
      CHEST,
      RAGESTEEL_BREASTPLATE,
      capped
    ).equipment;
    expect(pairsOf(changesBetween(shoulders, pkg, CHEST))).toEqual([
      `${BOLD}->${RIGID}`,
      `${BOLD}->${INSCRIBED}`,
    ]);
  });

  it("535-C1: a recolour that switches a socket bonus on earns it: the Nightseye goes to the boots or the belt, not the shoulder", async () => {
    // Oracle: Sovereign Nightseye is purple, so in boots 30104 socket 0 or
    // belt 30106 socket 1 it switches on that item's +3 Agility bonus.
    // Today's greedy puts it in 30055.
    const { e, equipment, capped } = await retCapped();
    const out = e.rank.candidateSwapWithRepairs(
      equipment,
      WRIST,
      32574,
      capped
    ).equipment;
    const changes = changesBetween(equipment, out, WRIST);
    expect(pairsOf(changes)).toEqual([`${BOLD}->${NIGHTSEYE}`]);
    const where = `${changes[0]![0]}:${changes[0]![1]}`;
    expect([`${BOOTS}:0`, `${BELT}:1`]).toContain(where);
    expect(where.startsWith(`${SHOULDER_30055}:`)).toBe(false);
  });

  it("535-T1: a deficit of 6 stays under the work limit, and past a small limit repair falls back to greedy with one warning", async () => {
    // Oracle: the 2/2/2 probe removed 12 gems to reach deficit 6, counted
    // 546,669 work there, and greedy with the credit activated the meta.
    const e = await engine();
    const { items, deficit } = await rogueAtDeficit(e, 6);
    expect(deficit).toBe(6);
    const ctx = e.cg.gemContext(
      e.gems.gemsForPhase(2),
      e.data.epWeightsFor("rogue"),
      "rogue"
    );
    const t0 = performance.now();
    const found = e.mr.bestMinimalRepair({
      items,
      weights: ctx.weights,
      palette: ctx.fillPalette,
      maxChanges: 7,
    });
    const ms = performance.now() - t0;
    expect(found).toBeDefined();
    expect(found && "overLimit" in found).toBe(false);
    expect(found!.work).toBeLessThanOrEqual(e.mr.REPAIR_SEARCH_WORK_LIMIT);
    console.log(`[535-T1] deficit 6: work ${found!.work}, ${ms.toFixed(1)} ms`);

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const repaired = e.mr.repairAndMinimize({
        items,
        epWeights: ctx.weights,
        palette: ctx.fillPalette,
        workLimit: 1000,
      });
      expect(metaOf(e, repaired.items).status.kind).toBe("active");
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]![0])).toMatch(
        /^\[upgrades\] meta repair: exact search passed its work limit/
      );
    } finally {
      warn.mockRestore();
    }
  }, 30_000);
});

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
 * Row repairs per fixture, as the probes counted them (ticket 535, § The
 * probes).
 */
const O1_ROW_REPAIRS: Record<(typeof O1_FIXTURES)[number], number> = {
  "ret-p3-p2": 54,
  "feral-p2-malorne4": 2,
  "feral-p3-nordrassil4": 8,
  "feral-p3-p2bis": 8,
  "feral-p3-th-hands-legs": 8,
};

/**
 * The package repairs the probes found, as (set id, piece number): Burning
 * Rage's second piece on ret-p3-p2, and the first piece of four sets on
 * feral-p3-p2bis. Nothing was repaired before them in their jobs.
 */
const O1_PACKAGE_REPAIRS: Record<(typeof O1_FIXTURES)[number], string[]> = {
  "ret-p3-p2": ["566:2"],
  "feral-p2-malorne4": [],
  "feral-p3-nordrassil4": [],
  "feral-p3-p2bis": ["584:1", "640:1", "641:1", "676:1"],
  "feral-p3-th-hands-legs": [],
};

/**
 * Deficit counts over each fixture's row repairs plus its named package
 * repairs (ticket 535, § The probes).
 */
const O1_DEFICITS: Record<
  (typeof O1_FIXTURES)[number],
  Record<number, number>
> = {
  "ret-p3-p2": { 1: 31, 2: 24 },
  "feral-p2-malorne4": { 2: 1, 3: 1 },
  "feral-p3-nordrassil4": { 2: 1, 3: 7 },
  "feral-p3-p2bis": { 2: 2, 3: 10 },
  "feral-p3-th-hands-legs": { 2: 1, 3: 7 },
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
    // Oracle: the brute force for the search; the probes for the counts
    // (ticket 535, § The probes); probe 222 for the work (at most
    // 1,343,593, under the limit of 5,000,000).
    const e = await engine();
    const fork = oracleFork(e);
    const t0 = performance.now();
    const budget = e.cap.hitCapBudgetFrom(
      e.cap.capProfileFor("ret"),
      budgetRequest("TristateEffectImproved"),
      pseudoStatsWithHit(BASELINE_HIT_PERCENT)
    )!;
    const otherPackageRepairs: string[] = [];
    let measured = 0;
    let deficitOne = 0;

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
        repairHitCap: {
          stat: MELEE_HIT,
          baselineRemaining: rBase,
          baselineGearHit: gBase,
        },
      };

      let rowRepairs = 0;
      const packageRepairs: string[] = [];
      const deficits: Record<number, number> = {};
      for (const job of o1Jobs(e, fx)) {
        let cur = equipment;
        for (let k = 0; k < job.steps.length; k++) {
          const { idx, id } = job.steps[k]!;
          const where = `${name} ${job.label} piece ${k + 1} (${id}@${idx})`;
          const pre = e.rank.candidateSwapPreRepair(cur, idx, id, cappedFx);
          const { status, deficit: d } = metaOf(e, pre.socketed);
          let out: SimItemSpec[];
          try {
            out = e.rank.candidateSwapWithRepairs(
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
              palette: gemsFx.fillPalette,
              hitCap: { stat: MELEE_HIT, remaining },
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
                  layoutD.changes.map((c) => [
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
                `${where}: search ${layoutD.value}, full-palette brute force ${full}`
              ).toBe(true);
            }
          }
          cur = out;
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
    expect(measured).toBe(85);
    expect(deficitOne).toBe(31);
    console.log(
      `[535-O1] other package repairs: ${otherPackageRepairs.length === 0 ? "none" : otherPackageRepairs.join("; ")}`
    );
    console.log(
      `[535-O1] wall ${((performance.now() - t0) / 1000).toFixed(1)} s`
    );
  }, 180_000);

  it("535-O2: the search places only changes the meta needs", async () => {
    // Oracle: a third Bold → Rigid would add 9.2 EP at full weight, but the
    // meta does not need it, so a minimal set excludes it.
    const { e, equipment, gems } = await retInputs();
    const pre = e.rank.candidateSwapPreRepair(equipment, CHEST, 32365, gems);
    const found = e.mr.bestMinimalRepair({
      items: pre.socketed,
      weights: gems.weights,
      palette: gems.fillPalette,
      hitCap: { stat: MELEE_HIT, remaining: 93 },
      maxChanges: 3,
    });
    expect(isLayout(found)).toBe(true);
    const changes = (found as RepairLayout).changes;
    expect(changes.map((c) => `${c.from}->${c.to}`).sort()).toEqual([
      `${BOLD}->${RIGID}`,
      `${BOLD}->${RIGID}`,
    ]);
  });
});

/* ------------------------------------------------------------------ *
 * Cycle 4: the run's stats reads, through `rankUpgrades`
 * ------------------------------------------------------------------ */

type RaidSimRequest = Record<string, unknown>;
type SimRunOpts = { seed: number; iterations: number; saveAllValues?: boolean };
type StatsObservation = { stats: number[]; pseudoStats: number[] };
type RankedRow = {
  itemId: number;
  deltaDps: number;
  setContext?: {
    futureBonuses?: Array<{
      threshold: number;
      bonusOffDps?: number;
      stepGearDps?: number;
    }>;
  };
};
type RunRanking = {
  complete?: boolean;
  items: RankedRow[];
  setBonusOffSims?: { skippedSteps: number; gears: number };
  setScreen?: { sets: Array<{ setId: number; pair: { dps?: number } }> };
  substitutions: Array<{ field: string; detail: string }>;
};

const retSkeleton = JSON.parse(
  readFileSync(join(root, "data/presets/ret/p2.raid-sim-skeleton.json"), "utf8")
) as RaidSimRequest;

const RET_CHAR = { region: "US" as const, realm: "test", name: "repaircase" };
const RET_FIGHT = {
  reportCode: "rep535",
  fightId: 1,
  encounterName: "Test Dummy",
  killedAt: "2026-10-03T00:00:00.000Z",
  route: "ranked" as const,
  confidence: 1,
};

/** The first player's equipment items of a composed request. */
function requestItems(req: RaidSimRequest): SimItemSpec[] {
  const raid = req.raid as {
    parties?: Array<{ players?: Array<{ equipment?: { items?: unknown[] } }> }>;
  };
  return (raid.parties?.[0]?.players?.[0]?.equipment?.items ?? []).map(
    (raw) => {
      const it = raw as { id?: number; enchant?: number; gems?: number[] };
      return {
        ...(it.id ? { id: it.id } : {}),
        ...(it.enchant ? { enchant: it.enchant } : {}),
        gems: [...(it.gems ?? [])],
      };
    }
  );
}

type RetRun = {
  /** The worn gear; defaults to the ret-p3-p2 fixture's. */
  worn?: SimItemSpec[];
  pool: Array<{ itemId: number; slot: string }>;
  computeStats?: (req: RaidSimRequest) => Promise<StatsObservation>;
  /** The DPS of a request; defaults to a flat model. */
  dps?: (req: RaidSimRequest) => number;
  store?: unknown;
  measureBrokenSetValue?: boolean;
  setScreen?: string;
  controller?: AbortController;
  /** The raid sim skeleton; defaults to the ret P2 preset's. */
  skeleton?: RaidSimRequest;
  /** Called with each request `run` receives, before it answers. */
  onRun?: (req: RaidSimRequest) => void;
};

async function runRet(o: RetRun) {
  const rankMod = await importForkUpgrades<{
    rankUpgrades: (
      input: Record<string, unknown>,
      deps: Record<string, unknown>
    ) => Promise<RunRanking>;
  }>("engine/rank.ts");
  const storeMod = await importForkUpgrades<{
    MemoryStore: new () => unknown;
  }>("engine/seams/store.ts");
  const gearMod = await importForkUpgrades<{
    RecordedGearSource: new (data: {
      fights: ReadonlyMap<string, unknown[]>;
      gear: ReadonlyMap<string, unknown>;
    }) => unknown;
    characterFightKey: (c: unknown, spec: string) => string;
    fightGearKey: (f: unknown) => string;
  }>("engine/seams/gear-source.ts");

  const worn = o.worn ?? equipmentOf(loadFixture("ret-p3-p2"));
  const fightRef = {
    reportCode: RET_FIGHT.reportCode,
    fightId: RET_FIGHT.fightId,
  };
  const loggedGear = {
    items: worn.map((spec, i) => ({
      ...(spec.id ? { id: spec.id } : {}),
      slot: SIM_ORDER[i],
      ...(spec.enchant ? { enchant: spec.enchant } : {}),
      gems: [...spec.gems],
    })),
    talentPointsByTree: [5, 11, 45] as [number, number, number],
    provenance: { ...fightRef, sourceID: 1 },
  };
  const gear = new gearMod.RecordedGearSource({
    fights: new Map([
      [gearMod.characterFightKey(RET_CHAR, "ret"), [RET_FIGHT]],
    ]),
    gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
  });
  const pool = o.pool.map((p) => ({
    itemId: p.itemId,
    name: `item ${p.itemId}`,
    slot: p.slot,
    phase: 1,
    source: { kind: "badge" as const, cost: 1 },
  }));

  const requests: RaidSimRequest[] = [];
  const statsRequests: RaidSimRequest[] = [];
  const sim: Record<string, unknown> = {
    version: () => Promise.resolve("v0.0.535"),
    run: (req: RaidSimRequest, opts: SimRunOpts) => {
      requests.push(structuredClone(req));
      o.onRun?.(req);
      const dps = o.dps ? o.dps(req) : 2000;
      return Promise.resolve({
        dps,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: "v0.0.535",
        ...(opts.saveAllValues === true
          ? { allValues: new Array<number>(opts.iterations).fill(dps) }
          : {}),
      });
    },
  };
  if (o.computeStats) {
    const read = o.computeStats;
    sim.computeStats = (req: RaidSimRequest) => {
      statsRequests.push(structuredClone(req));
      return read(req);
    };
  }

  const ranking = await rankMod.rankUpgrades(
    {
      character: RET_CHAR,
      spec: "ret",
      maxPhase: 3,
      fight: fightRef,
      iterations: 1000,
      seeds: [11],
      candidateCap: 100,
    },
    {
      gear,
      sim,
      store: o.store ?? new storeMod.MemoryStore(),
      clock: () => new Date("2026-10-03T12:00:00.000Z"),
      raidSimSkeleton: o.skeleton ?? retSkeleton,
      epWeights: retWeights,
      pool,
      ...(o.measureBrokenSetValue ? { measureBrokenSetValue: true } : {}),
      ...(o.setScreen ? { setScreen: o.setScreen } : {}),
      ...(o.controller ? { signal: o.controller.signal } : {}),
    }
  );
  return { ranking, requests, statsRequests, worn };
}

async function newStore(): Promise<unknown> {
  const storeMod = await importForkUpgrades<{
    MemoryStore: new () => unknown;
  }>("engine/seams/store.ts");
  return new storeMod.MemoryStore();
}

/** A `computeStats` that reads the baseline's hit once and fails a second call. */
function baselineReadOnce(): (
  req: RaidSimRequest
) => Promise<StatsObservation> {
  let calls = 0;
  return () => {
    calls += 1;
    if (calls > 1) {
      return Promise.reject(new Error("computeStats called twice in one run"));
    }
    return Promise.resolve({
      stats: [],
      pseudoStats: pseudoStatsWithHit(BASELINE_HIT_PERCENT),
    });
  };
}

/** The (from, to) pairs of every request whose chest is `chestId`. */
function chestRequestChanges(
  requests: readonly RaidSimRequest[],
  baseline: readonly SimItemSpec[],
  chestId: number
): string[][] {
  return requests
    .map(requestItems)
    .filter((items) => items[CHEST]?.id === chestId)
    .map((items) => pairsOf(changesBetween(baseline, items, CHEST)));
}

const S_POOL = [
  { itemId: 32365, slot: "chest" }, // Heartshatter Breastplate, over the cap
  { itemId: 30907, slot: "chest" }, // Mail of Fevered Pursuit, under it
];

/** The `substitutions` fields that say repair could not use the hit cap. */
const HIT_CAP_NOTE = "gems.meta-repair-hit-cap";
const SET_VERSION_NOTE = "gems.meta-repair-set-versions";

describe.skipIf(!forkPresent)(
  "rankUpgrades reads the baseline hit (535)",
  () => {
    it("535-S1: with the baseline's hit read, the capped row gets two Inscribed and the uncapped row two Rigid", async () => {
      const run = await runRet({
        pool: S_POOL,
        computeStats: baselineReadOnce(),
      });
      const capped = chestRequestChanges(run.requests, run.worn, 32365);
      expect(capped.length).toBeGreaterThan(0);
      for (const c of capped) {
        expect(c).toEqual([`${BOLD}->${INSCRIBED}`, `${BOLD}->${INSCRIBED}`]);
      }
      for (const req of run.requests) {
        const items = requestItems(req);
        if (items[CHEST]?.id === 32365)
          expect(holdsGem(items, RIGID)).toBe(false);
      }
      const uncapped = chestRequestChanges(run.requests, run.worn, 30907);
      expect(uncapped.length).toBeGreaterThan(0);
      for (const c of uncapped) {
        expect(c).toEqual([`${BOLD}->${RIGID}`, `${BOLD}->${RIGID}`]);
      }
    });

    it("535-S2: a runner with no computeStats repairs at full weight: two Rigid on both rows", async () => {
      const run = await runRet({ pool: S_POOL });
      for (const chestId of [32365, 30907]) {
        const changes = chestRequestChanges(run.requests, run.worn, chestId);
        expect(changes.length).toBeGreaterThan(0);
        for (const c of changes) {
          expect(c).toEqual([`${BOLD}->${RIGID}`, `${BOLD}->${RIGID}`]);
        }
      }
    });

    it("535-S3: a failed read completes the run at full weight, warns once, and caches no ranking", async () => {
      const store = await newStore();
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let failed;
      try {
        failed = await runRet({
          pool: S_POOL,
          store,
          computeStats: () => Promise.reject(new Error("worker died")),
        });
        const repairWarnings = warn.mock.calls.filter((args) =>
          String(args[0]).startsWith("[upgrades] meta repair:")
        );
        expect(repairWarnings).toHaveLength(1);
      } finally {
        warn.mockRestore();
      }
      expect(failed.ranking.complete).toBe(true);
      for (const chestId of [32365, 30907]) {
        for (const c of chestRequestChanges(
          failed.requests,
          failed.worn,
          chestId
        )) {
          expect(c).toEqual([`${BOLD}->${RIGID}`, `${BOLD}->${RIGID}`]);
        }
      }
      const again = await runRet({
        pool: S_POOL,
        store,
        computeStats: baselineReadOnce(),
      });
      const capped = chestRequestChanges(again.requests, again.worn, 32365);
      expect(capped.length).toBeGreaterThan(0);
      for (const c of capped) {
        expect(c).toEqual([`${BOLD}->${INSCRIBED}`, `${BOLD}->${INSCRIBED}`]);
      }
    });

    it("535-S4: a failed read tells the ranking that repair used full weight; a good read does not", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let failed;
      try {
        failed = await runRet({
          pool: S_POOL,
          computeStats: () => Promise.reject(new Error("worker died")),
        });
      } finally {
        warn.mockRestore();
      }
      const notes = failed.ranking.substitutions.filter(
        (s) => s.field === HIT_CAP_NOTE
      );
      expect(notes).toHaveLength(1);
      expect(notes[0]!.detail).toMatch(/full weight/);
      expect(notes[0]!.detail).toMatch(/worker died/);

      const good = await runRet({
        pool: S_POOL,
        computeStats: baselineReadOnce(),
      });
      expect(
        good.ranking.substitutions.filter((s) => s.field === HIT_CAP_NOTE)
      ).toEqual([]);
    });

    it("535-S5: a target that is not level 73 gives no budget, and the ranking says repair used full weight", async () => {
      const skeleton = structuredClone(retSkeleton) as {
        encounter: { targets: Array<{ level: number }> };
      };
      for (const t of skeleton.encounter.targets) t.level = 72;
      const run = await runRet({
        pool: S_POOL,
        skeleton,
        computeStats: baselineReadOnce(),
      });
      for (const chestId of [32365, 30907]) {
        const changes = chestRequestChanges(run.requests, run.worn, chestId);
        expect(changes.length).toBeGreaterThan(0);
        for (const c of changes) {
          expect(c).toEqual([`${BOLD}->${RIGID}`, `${BOLD}->${RIGID}`]);
        }
      }
      const notes = run.ranking.substitutions.filter(
        (s) => s.field === HIT_CAP_NOTE
      );
      expect(notes).toHaveLength(1);
      expect(notes[0]!.detail).toMatch(/full weight/);
      expect(notes[0]!.detail).toMatch(/level 73/);
    });
  }
);

/* ------------------------------------------------------------------ *
 * Cycle 4, Part B: each set version's own budget
 * ------------------------------------------------------------------ */

const SET_LESS_OFFSET = 1_000_000;
const SET_KEPT_OFFSET = 2_000_000;
const RATING_PER_HIT_PERCENT = 15.769233;

/** The real item id behind a set-less or set-kept copy id. */
const realId = (id: number) => id % SET_LESS_OFFSET;

/**
 * A scripted `computeStats`: the request's gear hit by `gearHitRating`, with
 * copies mapped back to their items, plus `bonusHit[setId]` for each set
 * that counts at least two pieces (a real piece or a set-kept copy; a
 * set-less copy counts toward no set). The baseline reads
 * `baselineHitPercent`, so the hit percent moves with the gear from there.
 */
async function scriptedStats(o: {
  baselineGearHit: number;
  baselineHitPercent: number;
  bonusHit: Readonly<Record<number, number>>;
}) {
  const e = await engine();
  return (req: RaidSimRequest): StatsObservation => {
    const items = requestItems(req);
    const mapped = items.map((spec) =>
      spec.id ? { ...spec, id: realId(spec.id) } : spec
    );
    const counts = new Map<number, number>();
    for (const spec of items) {
      if (!spec.id) continue;
      if (spec.id >= SET_LESS_OFFSET && spec.id < SET_KEPT_OFFSET) continue;
      const setId = e.items.getItem(realId(spec.id))?.setId;
      if (setId) counts.set(setId, (counts.get(setId) ?? 0) + 1);
    }
    let bonus = 0;
    for (const [setId, n] of counts) {
      if (n >= 2) bonus += o.bonusHit[setId] ?? 0;
    }
    const hit = e.caps.gearHitRating(mapped, MELEE_HIT) + bonus;
    return {
      stats: [],
      pseudoStats: pseudoStatsWithHit(
        (hit - o.baselineGearHit) / RATING_PER_HIT_PERCENT +
          o.baselineHitPercent
      ),
    };
  };
}

const BURNING_RAGE = 566;
const BR_POOL = [
  { itemId: RAGESTEEL_SHOULDERS, slot: "shoulder" },
  { itemId: RAGESTEEL_BREASTPLATE, slot: "chest" },
];

/**
 * DPS for the Burning Rage scenarios: 2000, plus 5 per Ragesteel piece worn
 * (a copy counts), plus 30 when Burning Rage counts two pieces, so its gate
 * clears and the screen keeps the set.
 */
function brDps(req: RaidSimRequest): number {
  const items = requestItems(req);
  let dps = 2000;
  let counted = 0;
  for (const spec of items) {
    if (!spec.id) continue;
    const id = realId(spec.id);
    if (id === RAGESTEEL_SHOULDERS || id === RAGESTEEL_BREASTPLATE) {
      dps += 5;
      if (spec.id < SET_LESS_OFFSET || spec.id >= SET_KEPT_OFFSET) counted += 1;
    }
  }
  return counted >= 2 ? dps + 30 : dps;
}

/** The gems of every slot, as a sorted multiset. */
const gemMultiset = (items: readonly SimItemSpec[]) =>
  items.flatMap((spec) => spec.gems.filter((g) => g > 0)).sort((a, b) => a - b);

function multisetMinus(a: readonly number[], b: readonly number[]): number[] {
  const rest = [...b];
  const out: number[] = [];
  for (const x of a) {
    const i = rest.indexOf(x);
    if (i >= 0) rest.splice(i, 1);
    else out.push(x);
  }
  return out;
}

/** The received requests that are the screen's top (set-kept) and bottom (set-less) rungs. */
function brVersions(requests: readonly RaidSimRequest[]) {
  const all = requests.map(requestItems);
  const kept = all.filter(
    (items) =>
      items[SHOULDER]?.id === SET_KEPT_OFFSET + RAGESTEEL_SHOULDERS &&
      items[CHEST]?.id === SET_KEPT_OFFSET + RAGESTEEL_BREASTPLATE
  );
  const setLess = all.filter(
    (items) =>
      items[SHOULDER]?.id === SET_LESS_OFFSET + RAGESTEEL_SHOULDERS &&
      items[CHEST]?.id === SET_LESS_OFFSET + RAGESTEEL_BREASTPLATE
  );
  return { kept, setLess };
}

/** A stats request's item ids, enchants and gems in every slot. */
const gearKey = (req: RaidSimRequest) =>
  JSON.stringify(
    requestItems(req).map((s) => [s.id ?? 0, s.enchant ?? 0, s.gems])
  );

async function brRun(
  bonusHit: number,
  extra: Partial<RetRun> = {},
  read?: (req: RaidSimRequest, call: number) => Promise<StatsObservation>
) {
  const stats = await scriptedStats({
    baselineGearHit: 52,
    baselineHitPercent: BASELINE_HIT_PERCENT,
    bonusHit: { [BURNING_RAGE]: bonusHit },
  });
  let call = 0;
  return runRet({
    pool: BR_POOL,
    measureBrokenSetValue: true,
    setScreen: "on",
    dps: brDps,
    controller: new AbortController(),
    computeStats: (req) => {
      call += 1;
      return read ? read(req, call) : Promise.resolve(stats(req));
    },
    ...extra,
  });
}

/** V1's checks: the kept version holds no Rigid; the set-less one holds one. */
function expectOwnLayouts(requests: readonly RaidSimRequest[]) {
  const { kept, setLess } = brVersions(requests);
  expect(kept.length).toBeGreaterThan(0);
  expect(setLess.length).toBeGreaterThan(0);
  for (const k of kept) expect(holdsGem(k, RIGID)).toBe(false);
  for (const s of setLess) {
    expect(gemMultiset(s).filter((g) => g === RIGID)).toHaveLength(1);
  }
  expect(
    multisetMinus(gemMultiset(setLess[0]!), gemMultiset(kept[0]!))
  ).toEqual([RIGID]);
  expect(
    multisetMinus(gemMultiset(kept[0]!), gemMultiset(setLess[0]!))
  ).toEqual([INSCRIBED]);
}

describe.skipIf(!forkPresent)("Stop ends a stats read (538)", () => {
  it("538-H: a Stop during a never-answering stats read returns a PartialRanking", async () => {
    // The abort fires inside the read, before it returns its promise, so a
    // race that attached its listener after calling the read would miss it.
    const store = await newStore();
    const controller = new AbortController();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let stopped;
    try {
      stopped = await runRet({
        pool: S_POOL,
        store,
        controller,
        computeStats: () => {
          controller.abort();
          return new Promise<StatsObservation>(() => {});
        },
      });
      const upgradesWarnings = warn.mock.calls.filter((args) =>
        String(args[0]).startsWith("[upgrades]")
      );
      expect(upgradesWarnings).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
    expect(stopped.ranking.complete).toBe(false);
    // No ranking was cached: a second run on the same store reads the hit
    // again instead of returning a stored ranking.
    const again = await runRet({
      pool: S_POOL,
      store,
      computeStats: baselineReadOnce(),
    });
    expect(again.statsRequests).toHaveLength(1);
    expect(again.ranking.complete).toBe(true);
  });
});

describe.skipIf(!forkPresent)("set versions get their own repair (535)", () => {
  it("535-V1: the set-kept version drops the dead Rigid; the set-less version keeps one", async () => {
    // Oracle: the kept budget is 9.31 − 20 = −10.69, where two Inscribed win;
    // the set-less budget is 9.31, where one Rigid and one Inscribed win
    // (535-R4's scores); both were the best measured layouts.
    const run = await brRun(20);
    expectOwnLayouts(run.requests);
  });

  it("535-V2: a set bonus with no hit leaves both versions one layout", async () => {
    // Oracle: equal missed hit gives equal budgets, which keeps the screen's
    // exact 0.
    const run = await brRun(0);
    const { kept, setLess } = brVersions(run.requests);
    expect(kept.length).toBeGreaterThan(0);
    expect(setLess.length).toBeGreaterThan(0);
    for (const k of kept) {
      for (const s of setLess) {
        expect(k.map((spec) => spec.gems)).toEqual(s.map((spec) => spec.gems));
      }
    }
  });

  it("535-V3: one stats read per distinct request", async () => {
    // Oracle: the set phase reads each distinct request's stats once and
    // reuses the read for a repeat of the same request. V6's
    // run is checked in 535-V6, which builds a step's version twice.
    const run = await brRun(20);
    const keys = run.statsRequests.map(gearKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("535-V4: the first failed version read ends version budgets and caches no ranking", async () => {
    // Oracle: the first failed version read turns version budgets off for
    // the rest of the run, so every later version uses the shared layout,
    // and the ranking is not cached.
    const store = await newStore();
    const stats = await scriptedStats({
      baselineGearHit: 52,
      baselineHitPercent: BASELINE_HIT_PERCENT,
      bonusHit: { [BURNING_RAGE]: 20 },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let failed;
    try {
      failed = await brRun(20, { store }, (req, call) =>
        call === 2
          ? Promise.reject(new Error("worker died"))
          : Promise.resolve(stats(req))
      );
      const versionWarnings = warn.mock.calls.filter((args) =>
        String(args[0]).startsWith("[upgrades] meta repair: set version")
      );
      expect(versionWarnings).toHaveLength(1);
    } finally {
      warn.mockRestore();
    }
    expect(failed.ranking.complete).toBe(true);
    expect(failed.statsRequests).toHaveLength(2);
    const notes = failed.ranking.substitutions.filter(
      (s) => s.field === SET_VERSION_NOTE
    );
    expect(notes).toHaveLength(1);
    expect(notes[0]!.detail).toMatch(/worker died/);
    expect(
      failed.ranking.substitutions.filter((s) => s.field === HIT_CAP_NOTE)
    ).toEqual([]);
    const { kept, setLess } = brVersions(failed.requests);
    expect(kept.length).toBeGreaterThan(0);
    for (const k of kept) {
      expect(k.map((spec) => spec.gems)).toEqual(
        setLess[0]!.map((spec) => spec.gems)
      );
    }
    // The set-less version is the same request in both runs, so the store
    // answers it; the kept version is new, and wears V1's gems.
    const again = await brRun(20, { store });
    const keptAgain = brVersions(again.requests).kept;
    expect(keptAgain.length).toBeGreaterThan(0);
    for (const k of keptAgain) expect(holdsGem(k, RIGID)).toBe(false);
  });

  it("535-V5: a Stop during a set-phase sim stops the version reads, with no warning", async () => {
    // Oracle: after Stop the guard refuses each version read, and a refused
    // read is no failure to warn about.
    const controller = new AbortController();
    let readsAfterAbort = 0;
    const stats = await scriptedStats({
      baselineGearHit: 52,
      baselineHitPercent: BASELINE_HIT_PERCENT,
      bonusHit: { [BURNING_RAGE]: 20 },
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let run;
    try {
      run = await brRun(
        20,
        {
          controller,
          onRun: (req) => {
            const holdsCopy = requestItems(req).some(
              (s) => (s.id ?? 0) >= SET_LESS_OFFSET
            );
            if (holdsCopy && !controller.signal.aborted) controller.abort();
          },
        },
        (req) => {
          if (controller.signal.aborted) readsAfterAbort += 1;
          return Promise.resolve(stats(req));
        }
      );
      const versionWarnings = warn.mock.calls.filter((args) =>
        String(args[0]).startsWith("[upgrades] meta repair: set version")
      );
      expect(versionWarnings).toHaveLength(0);
    } finally {
      warn.mockRestore();
    }
    expect(controller.signal.aborted).toBe(true);
    expect(readsAfterAbort).toBe(0);
    expect(run.ranking.complete).toBe(false);
  });

  it("535-V6: the step after a rebuilt step keeps its break split", async () => {
    // Oracle: the step break split keeps its pairing: `plain` is the
    // request the first step simmed, so the store holds it.
    const s = await stepScenario("V6");
    const e = s.e;
    const hands = SIM_ORDER.indexOf("hands");
    const legs = SIM_ORDER.indexOf("legs");
    // Check 1: the first step's gear (the Gauntlets row plus the Greaves)
    // needs a meta repair.
    const afterRow = e.rank.candidateSwapWithRepairs(
      s.worn,
      hands,
      JUSTICAR.hands,
      s.gems
    ).equipment;
    const pre = e.rank.candidateSwapPreRepair(
      afterRow,
      legs,
      JUSTICAR.legs,
      s.gems
    );
    expect(metaOf(e, pre.socketed).status.kind).toBe("inactive");
    // Check 2: the first step's simmed request differs in gems from the
    // default build, so the per-version rebuild ran.
    const defaultStep = e.rank.candidateSwapWithRepairs(
      afterRow,
      legs,
      JUSTICAR.legs,
      s.gems
    ).equipment;
    const stepRequests = s.run.requests
      .map(requestItems)
      .filter(
        (items) =>
          items[hands]?.id === JUSTICAR.hands &&
          items[legs]?.id === JUSTICAR.legs &&
          items[SHOULDER]?.id === RAGESTEEL_SHOULDERS &&
          items[CHEST]?.id === RAGESTEEL_BREASTPLATE
      );
    expect(stepRequests.length).toBeGreaterThan(0);
    for (const items of stepRequests) {
      expect(items.map((spec) => spec.gems)).not.toEqual(
        defaultStep.map((spec) => spec.gems)
      );
    }
    // Check 3: the steps cleared their gates, so the 4pc step is split.
    const row = s.run.ranking.items.find((r) => r.itemId === JUSTICAR.hands)!;
    const four = row.setContext?.futureBonuses?.find((f) => f.threshold === 4);
    expect(four?.stepGearDps).toBeDefined();
    expect(four?.bonusOffDps).toBeDefined();
    expect(s.run.ranking.setBonusOffSims?.skippedSteps).toBe(0);
    // 535-V3 on this run: the first step's version is built for its own sim
    // and again as the 4pc step's `plain`, and read once.
    const keys = s.run.statsRequests.map(gearKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("535-V7: a first step whose gear before has set hit the candidate loop missed is skipped, not mismeasured", async () => {
    // Oracle: a first step's split pairs with the candidate loop's sim.
    // Here the row's single swap completes Justicar 2pc, whose hit the
    // candidate loop's budget missed, so `versionGears`' entry 0 is a
    // rebuild the candidate loop never simmed, and the split is skipped.
    const s = await stepScenario("V7");
    const e = s.e;
    const legs = SIM_ORDER.indexOf("legs");
    const hands = SIM_ORDER.indexOf("hands");
    // The row's single swap needs a repair, and its rebuild for the set's
    // hit changes a gem.
    const pre = e.rank.candidateSwapPreRepair(
      s.worn,
      legs,
      JUSTICAR.legs,
      s.gems
    );
    expect(metaOf(e, pre.socketed).status.kind).toBe("inactive");
    const cap = s.gems.repairHitCap!;
    const rebuilt = e.rank.candidateSwapWithRepairs(
      s.worn,
      legs,
      JUSTICAR.legs,
      {
        ...s.gems,
        repairHitCap: {
          ...cap,
          baselineRemaining: cap.baselineRemaining - V_BONUS_HIT,
        },
      }
    ).equipment;
    const single = e.rank.candidateSwapWithRepairs(
      s.worn,
      legs,
      JUSTICAR.legs,
      s.gems
    ).equipment;
    expect(rebuilt.map((x) => x.gems)).not.toEqual(single.map((x) => x.gems));
    // No request is the first step's bonus-off version: the row's gear with
    // the Burning Rage pieces set-less.
    const bonusOff = s.run.requests
      .map(requestItems)
      .filter(
        (items) =>
          items[legs]?.id === JUSTICAR.legs &&
          items[hands]?.id === JUSTICAR.hands &&
          items[SHOULDER]?.id === SET_LESS_OFFSET + RAGESTEEL_SHOULDERS &&
          items[CHEST]?.id === SET_LESS_OFFSET + RAGESTEEL_BREASTPLATE
      );
    expect(bonusOff).toEqual([]);
    const row = s.run.ranking.items.find((r) => r.itemId === JUSTICAR.legs)!;
    const four = row.setContext?.futureBonuses?.find((f) => f.threshold === 4);
    expect(four?.stepGearDps).toBeDefined();
    expect(four?.bonusOffDps).toBeUndefined();
    expect(s.run.ranking.setBonusOffSims?.skippedSteps).toBe(1);
  });
});

/* ------------------------------------------------------------------ *
 * The step scenarios of 535-V6 and 535-V7
 * ------------------------------------------------------------------ */

// Justicar Battlegear 626 (ret plate), Burning Rage 566's worn pieces, and
// Crystalforge Greaves (629) holding a yellow the meta needs.
const JUSTICAR = {
  shoulder: 29075,
  chest: 29071,
  hands: 29072,
  legs: 29074,
} as const;
const CRYSTALFORGE_GREAVES = 30132;
const ENSCRIBED_FIRE_OPAL = 30584; // orange, counts yellow
const INSCRIBED_ORNATE_TOPAZ = 28363; // orange, counts yellow
const JUSTICAR_SET = 626;

/** Justicar 2pc's scripted hit, large enough that a rebuild changes a gem. */
const V_BONUS_HIT = 40;

/**
 * The set phase's DPS: 2000, each piece's own value (a copy counts as its
 * item), and each set's bonus by counted pieces (a real piece or a set-kept
 * copy): Justicar 2pc 50 and 4pc 80, Burning Rage 2pc 90. The pieces' own
 * values are 511-PS's (Pauldrons 8, Chestguard 12, Gauntlets 6, Leggings −12).
 */
async function stepDps() {
  const e = await engine();
  const value = new Map<number, number>([
    [JUSTICAR.shoulder, 8],
    [JUSTICAR.chest, 12],
    [JUSTICAR.hands, 6],
    [JUSTICAR.legs, -12],
  ]);
  const bonuses: Record<number, Record<number, number>> = {
    [JUSTICAR_SET]: { 2: 50, 4: 80 },
    [BURNING_RAGE]: { 2: 90 },
  };
  return (req: RaidSimRequest): number => {
    let dps = 2000;
    const counts = new Map<number, number>();
    for (const spec of requestItems(req)) {
      if (!spec.id) continue;
      dps += value.get(realId(spec.id)) ?? 0;
      if (spec.id >= SET_LESS_OFFSET && spec.id < SET_KEPT_OFFSET) continue;
      const setId = e.items.getItem(realId(spec.id))?.setId;
      if (setId) counts.set(setId, (counts.get(setId) ?? 0) + 1);
    }
    for (const [setId, n] of counts) {
      for (const [at, bonus] of Object.entries(bonuses[setId] ?? {})) {
        if (n >= Number(at)) dps += bonus;
      }
    }
    return dps;
  };
}

/**
 * The ret-p3-p2 gear with Burning Rage 2pc worn (Ragesteel Shoulders holding
 * the Fire Opal, the Breastplate) and Crystalforge Greaves holding the Ornate
 * Topaz, so the meta's two yellows sit in the shoulder and legs. V6 ranks all
 * four Justicar pieces; V7 also wears the Justicar Gauntlets, so the Greaves
 * row completes Justicar 2pc. The baseline reads 31.5 rating under the cap,
 * so a default repair places Rigid where the Justicar 2pc rebuild does not.
 */
async function stepScenario(kind: "V6" | "V7") {
  const e = await engine();
  const fx = loadFixture("ret-p3-p2");
  const worn = equipmentOf(fx);
  worn[SHOULDER] = {
    id: RAGESTEEL_SHOULDERS,
    gems: [ENSCRIBED_FIRE_OPAL, BOLD],
  };
  worn[CHEST] = { id: RAGESTEEL_BREASTPLATE, gems: [] };
  worn[SIM_ORDER.indexOf("legs")] = {
    id: CRYSTALFORGE_GREAVES,
    gems: [INSCRIBED_ORNATE_TOPAZ],
  };
  if (kind === "V7")
    worn[SIM_ORDER.indexOf("hands")] = { id: JUSTICAR.hands, gems: [] };
  expect(metaOf(e, socketedOf(worn)).status.kind).toBe("active");

  const baselineGearHit = e.caps.gearHitRating(worn, MELEE_HIT);
  const baselineHitPercent = 4;
  const stats = await scriptedStats({
    baselineGearHit,
    baselineHitPercent,
    bonusHit: { [JUSTICAR_SET]: V_BONUS_HIT },
  });
  const budget = e.cap.hitCapBudgetFrom(
    e.cap.capProfileFor("ret"),
    budgetRequest("TristateEffectImproved"),
    pseudoStatsWithHit(baselineHitPercent)
  )!;
  const gems: GemContext = {
    ...e.cg.gemContext(e.gems.gemsForPhase(3), retWeights, "ret"),
    repairHitCap: {
      stat: MELEE_HIT,
      baselineRemaining: budget.remaining,
      baselineGearHit,
    },
  };
  const pool = [
    { itemId: JUSTICAR.shoulder, slot: "shoulder" },
    { itemId: JUSTICAR.chest, slot: "chest" },
    ...(kind === "V6" ? [{ itemId: JUSTICAR.hands, slot: "hands" }] : []),
    { itemId: JUSTICAR.legs, slot: "legs" },
  ];
  const run = await runRet({
    worn,
    pool,
    measureBrokenSetValue: true,
    dps: await stepDps(),
    controller: new AbortController(),
    computeStats: (req) => Promise.resolve(stats(req)),
  });
  return { e, worn, gems, run };
}
