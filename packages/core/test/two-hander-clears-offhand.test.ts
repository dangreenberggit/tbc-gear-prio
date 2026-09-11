/**
 * Ticket 350: a two-handed candidate for the main hand must clear the worn
 * off-hand item, and the row must say so.
 *
 * For a dual-wield spec wearing a one-hander plus an off-hand item, the ranker
 * offers two-handed candidates for `mainhand`. `swapItemAt` rewrites exactly
 * one index, so before this fix the composed request described a character
 * holding a two-hander *and* an off-hand item — gear the game cannot equip.
 *
 * Driven at the `rankUpgrades` seam through the recorded gear adapter and a
 * capturing `SimRunner`, never at a stage internal (AGENTS.md § Testing). The
 * one exception is T2, which calls the exported pure functions
 * `candidateSwapWithRepairs` and `statDeltaBetween` directly — they are the
 * composition and the stat-diff, and the delta arithmetic is the readable
 * statement of what the swap costs.
 *
 * The sim runner is synthetic rather than recorded: no recording exists for
 * warrior, and T4 sweeps the whole `warrior-p2` universe, so a recording map
 * could not be pre-built by key. DPS is a pure function of the equipped ids,
 * which is enough to make the ranker produce real rows; nothing here asserts
 * on a DPS number.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemContext } from "../src/candidate-gems.js";
import { statDeltaBetween } from "../src/caps.js";
import { gemsForPhase } from "../src/gems.js";
import { getItem } from "../src/items.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import {
  filterPoolByPhase,
  poolFromUniverse,
  type PoolEntry,
} from "../src/pool.js";
import { HandType } from "../src/proto/common_pb.js";
import {
  candidateSwapWithRepairs,
  rankUpgrades,
  type Ranking,
} from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import type {
  RaidSimRequest,
  SimObservation,
  SimRunner,
  SimRunOpts,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { SIM_ORDER } from "../src/slots.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { realPoolEntry } from "./real-source.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

const MAINHAND = SIM_ORDER.indexOf("mainhand");
const OFFHAND = SIM_ORDER.indexOf("offhand");

/** The fury preset: MH 28439 Dragonstrike (1H) + OH 30082 Talon of Azshara. */
const FURY_GEAR = "vendor/wowsims/warrior_p2_fury.gear.json";
/** The arms preset: MH 29993 Twinblade of the Phoenix (2H), off hand empty. */
const ARMS_GEAR = "vendor/wowsims/warrior_p2_arms.gear.json";

const GOREHOWL = 28773;
const TALON_OF_AZSHARA = 30082;
const FANG_OF_VASHJ = 30103;

/** One request's equipment items, as the sim sees them. */
type RequestItems = ReadonlyArray<{ id?: number } | undefined>;

function itemsOf(req: RaidSimRequest): RequestItems {
  const shaped = req as unknown as {
    raid?: {
      parties?: Array<{
        players?: Array<{ equipment?: { items?: RequestItems } }>;
      }>;
    };
  };
  return shaped.raid?.parties?.[0]?.players?.[0]?.equipment?.items ?? [];
}

/**
 * Deterministic stand-in for the sim that also keeps every request.
 *
 * The DPS synthesis is `archetype-specs.test.ts`'s: a pure function of the
 * equipped ids, so it is stable across runs and reacts to a swap. The capture
 * is `rank.test.ts`'s `CapturingSimRunner`, minus its recording map — which
 * cannot be pre-built for a whole-universe sweep.
 */
class CapturingSyntheticSimRunner implements SimRunner {
  readonly requests: RaidSimRequest[] = [];

  async version(): Promise<string> {
    return "synthetic-1";
  }

  async run(req: RaidSimRequest, _opts: SimRunOpts): Promise<SimObservation> {
    this.requests.push(req);
    const items = itemsOf(req);
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += ((items[i]?.id ?? 0) % 977) * (i + 1);
    }
    return {
      dps: 1000 + (acc % 5000) / 10,
      stdev: 1.5,
      iterationsDone: 3000,
      simVersion: "synthetic-1",
    };
  }
}

/** Shaped like what the fork tab supplies — see `archetype-specs.test.ts`. */
function skeletonFor(className: string, gear: PresetGearFile): RaidSimRequest {
  return {
    raid: {
      parties: [
        {
          players: [
            {
              name: "synthetic",
              class: className,
              talentsString: "0-0-0",
              equipment: { items: gear.items.map((i) => ({ ...i })) },
            },
          ],
        },
      ],
    },
    encounter: { duration: 180, targets: [{ level: 73 }] },
  } as unknown as RaidSimRequest;
}

async function rankWarrior(args: {
  gearFile: string;
  pool: readonly PoolEntry[];
  maxPhase?: ContentPhase;
}): Promise<{ ranking: Ranking; sim: CapturingSyntheticSimRunner }> {
  const spec: SpecId = "warrior";
  const maxPhase = args.maxPhase ?? 2;
  const gear = loadJson<PresetGearFile>(args.gearFile);
  const ref = {
    region: "US" as const,
    realm: "synthetic",
    name: "syn-warrior",
  };
  const fight = {
    reportCode: "synthetic-warrior",
    fightId: 1,
    encounterName: "Synthetic warrior",
  };
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/warrior/fallback.ep-weights.json"
  ).weights;
  const sim = new CapturingSyntheticSimRunner();

  const out = await rankUpgrades(
    { spec, character: ref, maxPhase },
    {
      gear: new RecordedGearSource(
        syntheticOfflineRecordings({ ref, spec, presetGear: gear, fight })
      ),
      sim,
      store: new MemoryStore(),
      clock: () => new Date("2026-09-10T00:00:00Z"),
      raidSimSkeleton: skeletonFor("ClassWarrior", gear),
      epWeights,
      pool: args.pool,
    }
  );
  if (!("items" in out)) throw new Error("expected a complete Ranking");
  return { ranking: out as Ranking, sim };
}

/**
 * The worn gear as `rankUpgrades` sees it, for the pure-function tests — built
 * through the same `syntheticOfflineRecordings` → `equipmentFromLoggedGear`
 * path the ranker uses, so this is the real baseline array rather than a
 * hand-written one.
 */
function wornEquipment(gearFile: string) {
  const gear = loadJson<PresetGearFile>(gearFile);
  const recordings = syntheticOfflineRecordings({
    ref: { region: "US", realm: "synthetic", name: "syn-warrior" },
    spec: "warrior",
    presetGear: gear,
    fight: { reportCode: "r", fightId: 1, encounterName: "e" },
  });
  const logged = [...recordings.gear.values()][0]!;
  return equipmentFromLoggedGear(logged);
}

describe("a two-handed candidate clears the worn off hand (ticket 350)", () => {
  it("T1 — composes the two-hander with an empty off hand and discloses it", async () => {
    // Pin the fixture's own shape first: if upstream ever re-gears this set,
    // the assertions below stop testing the 1H+OH case and this says so.
    const worn = loadJson<PresetGearFile>(FURY_GEAR);
    expect(worn.items[MAINHAND]?.id).toBe(28439);
    expect(worn.items[OFFHAND]?.id).toBe(TALON_OF_AZSHARA);
    expect(getItem(28439)?.handType).not.toBe(HandType.HandTypeTwoHand);
    expect(getItem(GOREHOWL)?.handType).toBe(HandType.HandTypeTwoHand);

    const { ranking, sim } = await rankWarrior({
      gearFile: FURY_GEAR,
      pool: [realPoolEntry(GOREHOWL, "warrior-p2")],
    });

    const candidate = sim.requests.find(
      (req) => itemsOf(req)[MAINHAND]?.id === GOREHOWL
    );
    expect(candidate).toBeDefined();
    // The whole point: a two-hander leaves no off hand.
    expect(itemsOf(candidate!)[OFFHAND]).toEqual({});

    const row = ranking.items.find((i) => i.itemId === GOREHOWL);
    expect(row).toBeDefined();
    expect(row!.removedItems).toEqual([
      { itemId: TALON_OF_AZSHARA, slot: "offhand" },
    ]);
  });

  it("T2 — the stat delta debits the removed off hand", () => {
    const equipment = wornEquipment(FURY_GEAR);
    const epWeights = loadJson<{ weights: Record<string, number> }>(
      "data/presets/warrior/fallback.ep-weights.json"
    ).weights;
    const gems = gemContext(gemsForPhase(2), epWeights, "warrior");

    const outcome = candidateSwapWithRepairs(
      equipment,
      MAINHAND,
      GOREHOWL,
      gems
    );
    const delta = statDeltaBetween(equipment, outcome.equipment);

    // The WHOLE sparse object, not two indices. `statDeltaBetween` returns
    // only the non-zero stats, so this literal is the complete statement of
    // "Gorehowl in, Dragonstrike and Talon out": Str +49 and Sta +32 (51-19)
    // come from the main-hand swap; Agi +28 (43-15), AP -40, RAP -40, melee
    // hit -20 and Armor -168 include the off-hand debit. Neither main-hander
    // carries AP or hit, which is why those two go strictly negative.
    expect(delta).toEqual({
      0: 49,
      1: 28,
      2: 32,
      17: -40,
      18: -40,
      20: -20,
      31: -168,
    });

    expect(outcome.removed).toEqual([
      { slotIndex: OFFHAND, itemId: TALON_OF_AZSHARA },
    ]);
  });

  it("T3a — a one-handed candidate leaves the off hand alone", async () => {
    const { ranking, sim } = await rankWarrior({
      gearFile: FURY_GEAR,
      pool: [realPoolEntry(FANG_OF_VASHJ, "warrior-p2")],
    });

    const candidate = sim.requests.find(
      (req) => itemsOf(req)[MAINHAND]?.id === FANG_OF_VASHJ
    );
    expect(candidate).toBeDefined();
    expect(itemsOf(candidate!)[OFFHAND]?.id).toBe(TALON_OF_AZSHARA);

    for (const row of ranking.items) {
      expect(row.removedItems).toBeUndefined();
    }
  });

  it("T3b — a two-hander already worn has no off hand to clear", async () => {
    // The existing guard's own case, unchanged by this fix: the off hand is
    // already empty, so nothing is removed and nothing is disclosed.
    const worn = loadJson<PresetGearFile>(ARMS_GEAR);
    expect(getItem(worn.items[MAINHAND]!.id!)?.handType).toBe(
      HandType.HandTypeTwoHand
    );
    expect(worn.items[OFFHAND]?.id).toBeUndefined();

    const { ranking, sim } = await rankWarrior({
      gearFile: ARMS_GEAR,
      pool: [realPoolEntry(GOREHOWL, "warrior-p2")],
    });

    const candidate = sim.requests.find(
      (req) => itemsOf(req)[MAINHAND]?.id === GOREHOWL
    );
    expect(candidate).toBeDefined();
    expect(itemsOf(candidate!)[OFFHAND]).toEqual({});

    for (const row of ranking.items) {
      expect(row.removedItems).toBeUndefined();
    }
  });

  it("T4 — every candidate request differs in one index, or two for a two-hander", async () => {
    const universe = loadJson<{ entries: unknown[] }>(
      "data/universes/warrior-p2.json"
    );
    const { sim } = await rankWarrior({
      gearFile: FURY_GEAR,
      pool: filterPoolByPhase(poolFromUniverse(universe as never), 2),
    });

    expect(sim.requests.length).toBeGreaterThan(1);
    const baseline = itemsOf(sim.requests[0]!);
    expect(baseline[OFFHAND]?.id).toBe(TALON_OF_AZSHARA);

    // A two-hander in the main hand must differ in exactly {mainhand, offhand}
    // with the off hand emptied; everything else in exactly one index. This is
    // the containment proof: no candidate may quietly move a third slot.
    let twoHanderAttempts = 0;
    for (const req of sim.requests.slice(1)) {
      const items = itemsOf(req);
      const differing = new Set<number>();
      for (let i = 0; i < SIM_ORDER.length; i++) {
        if (items[i]?.id !== baseline[i]?.id) differing.add(i);
      }
      const mainHandId = items[MAINHAND]?.id;
      const isTwoHander =
        mainHandId !== undefined &&
        getItem(mainHandId)?.handType === HandType.HandTypeTwoHand;
      if (isTwoHander && baseline[OFFHAND]?.id) {
        twoHanderAttempts++;
        expect(differing).toEqual(new Set([MAINHAND, OFFHAND]));
        expect(items[OFFHAND]).toEqual({});
      } else {
        expect(differing.size).toBe(1);
      }
    }
    // Guards the branch above against passing vacuously.
    expect(twoHanderAttempts).toBeGreaterThan(0);
  });
});
