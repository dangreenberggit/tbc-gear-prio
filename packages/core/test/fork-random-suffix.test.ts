/**
 * A worn item's random suffix ("of the Beast" and the like) reaches the tab's
 * sim requests, on the fork's real adapters.
 *
 * The page sends `ItemSpec.random_suffix` (`proto/common.proto`) with each worn
 * item that has one, and its database carries that suffix's
 * `randomSuffixes` row (`Gear.toDatabase`, `ui/sim/proto/gear.ts`). Without
 * both, the sim gives the item only its base stats (armor, for the Karazhan
 * trash epics), so the baseline and every row's change would be wrong for a
 * player wearing one.
 *
 * The seams are the page gear adapter (`PlayerGearSource`), the module
 * interface `rankUpgrades` with the real per-request database resolver, and
 * the candidate-order score (`itemEpFor`). Real ids from db.json are used as
 * values: Ravager's Bracers (30687) "of the Beast" (-41: strength, agility,
 * stamina).
 *
 * Skips when the fork clone is absent, as the other fork-gated suites do.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import { SIM_ORDER } from "../src/slots.js";
import {
  forkPresent,
  forkRoot,
  importForkUpgrades,
  loadForkEngineEnvironment,
  statsOnlyItemEp,
  zeroHitStats,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const RET = join(root, "data/presets/ret/p2.raid-sim-skeleton.json");

const RAVAGERS_BRACERS = 30687;
const OF_THE_BEAST = -41;
const WRIST = SIM_ORDER.indexOf("wrist");
const SIM_VERSION = "v0.0.101";

type Json = Record<string, unknown>;
type RaidSimRequest = Readonly<Record<string, unknown>>;
type ItemSpecJson = {
  id?: number;
  randomSuffix?: number;
  enchant?: number;
  gems?: number[];
};
type DbJson = { randomSuffixes?: Array<{ id?: number }> };
type Ranking = { items: Array<{ itemId: number; deltaDps: number }> };
type ProtoMsg<T> = {
  fromJson(json: unknown, opts?: { ignoreUnknownFields: boolean }): T;
  toJson(msg: T): unknown;
  create(init?: Record<string, unknown>): T;
};
type ForkDatabase = {
  lookupItemSpec(spec: unknown): unknown;
  getItemById(id: number): unknown;
};
type StubPlayer = { itemSwapSettings: { getGear: () => unknown } };

let ItemSpecMsg: ProtoMsg<unknown>;
let getDb: () => ForkDatabase;
let ItemSwapGear: new (gear: Record<number, unknown>) => unknown;
let simDatabaseResolverFor: (
  player: StubPlayer,
  skeleton: RaidSimRequest
) => (equipment: readonly ItemSpecJson[]) => DbJson | undefined;

function forkUrl(relative: string): string {
  return pathToFileURL(join(forkRoot, relative)).href;
}

function readJson(file: string): Json {
  return JSON.parse(readFileSync(file, "utf8")) as Json;
}

function playerOf(request: Json | RaidSimRequest): Json {
  const raid = request.raid as { parties: [{ players: [Json] }] };
  return raid.parties[0].players[0];
}

function equipmentOf(request: RaidSimRequest): ItemSpecJson[] {
  return (
    (playerOf(request).equipment as { items?: ItemSpecJson[] }).items ?? []
  ).map((item) => ({ ...item }));
}

function stubPlayer(): StubPlayer {
  return { itemSwapSettings: { getGear: () => new ItemSwapGear({}) } };
}

/** The page's equipped item for a spec, as `Database.lookupItemSpec` builds it. */
function equipped(spec: ItemSpecJson): unknown {
  const item = getDb().lookupItemSpec(ItemSpecMsg.create(spec));
  expect(item).not.toBeNull();
  return item;
}

describe.skipIf(!forkPresent)("a worn random suffix reaches the sim", () => {
  beforeAll(async () => {
    await loadForkEngineEnvironment();
    ({ ItemSpec: ItemSpecMsg } = (await import(
      forkUrl("ui/generated/proto/common.ts")
    )) as { ItemSpec: ProtoMsg<unknown> });
    const database = (await import(forkUrl("ui/sim/proto/database.ts"))) as {
      Database: { getSync: () => ForkDatabase };
    };
    getDb = () => database.Database.getSync();
    ({ ItemSwapGear } = (await import(forkUrl("ui/sim/proto/gear.ts"))) as {
      ItemSwapGear: typeof ItemSwapGear;
    });
    ({ simDatabaseResolverFor } = await importForkUpgrades<{
      simDatabaseResolverFor: typeof simDatabaseResolverFor;
    }>("adapters/sim_database.ts"));
  });

  it("RS-1: the page gear adapter reads the worn item's suffix, and gives an item without one no suffix field", async () => {
    const { PlayerGearSource, CURRENT_PAGE_FIGHT } = await importForkUpgrades<{
      PlayerGearSource: new (simUI: unknown) => {
        readGear(fight: unknown): Promise<{ items: Json[] }>;
      };
      CURRENT_PAGE_FIGHT: unknown;
    }>("adapters/player_gear_source.ts");
    const gear = SIM_ORDER.map((_, i) =>
      i === WRIST
        ? equipped({
            id: RAVAGERS_BRACERS,
            randomSuffix: OF_THE_BEAST,
            enchant: 2647,
          })
        : i === 0
          ? equipped({ id: 29073, enchant: 3003, gems: [24027, 32409] })
          : null
    );
    const simUI = {
      player: {
        getGear: () => ({ getEquippedItems: () => gear }),
        getTalentTreePoints: () => [5, 11, 45],
      },
    };

    const logged = await new PlayerGearSource(simUI).readGear(
      CURRENT_PAGE_FIGHT
    );

    expect(logged.items[WRIST]).toEqual({
      id: RAVAGERS_BRACERS,
      slot: "wrist",
      randomSuffix: OF_THE_BEAST,
      enchant: 2647,
    });
    // No suffix, no field: logged gear without suffixes keeps its old shape,
    // and with it the ranking cache key.
    expect(logged.items[0]).toEqual({
      id: 29073,
      slot: "head",
      enchant: 3003,
      gems: [24027, 32409],
    });
  });

  it("RS-2: every request that keeps the worn suffix item sends its suffix and the suffix's database row; a candidate in that slot sends none", async () => {
    const skeleton = readJson(RET);
    const presetWrist = equipmentOf(skeleton)[WRIST]!;
    expect(presetWrist.id).toBe(28795); // Bladespire Warbands, the candidate
    const { requests, ranking } = await runRanking(skeleton, presetWrist.id!);

    const keeps = requests.filter(
      (req) => equipmentOf(req)[WRIST]?.id === RAVAGERS_BRACERS
    );
    const swaps = requests.filter(
      (req) => equipmentOf(req)[WRIST]?.id === presetWrist.id
    );
    // The baseline and the head candidate keep the bracers.
    expect(keeps.length).toBeGreaterThanOrEqual(2);
    expect(swaps.length).toBeGreaterThanOrEqual(1);

    for (const req of keeps) {
      expect(equipmentOf(req)[WRIST]).toEqual({
        id: RAVAGERS_BRACERS,
        randomSuffix: OF_THE_BEAST,
        enchant: 2647,
      });
      const db = (playerOf(req).database ?? {}) as DbJson;
      expect((db.randomSuffixes ?? []).map((row) => row.id)).toEqual([
        OF_THE_BEAST,
      ]);
    }
    for (const req of swaps) {
      expect(equipmentOf(req)[WRIST]).not.toHaveProperty("randomSuffix");
      const db = (playerOf(req).database ?? {}) as DbJson;
      expect(db.randomSuffixes ?? []).toEqual([]);
    }
    // The bracers' own row puts the same item back in its own slot: with the
    // suffix kept, that is the baseline request, so the store answers it and
    // the change is exactly 0.
    const wornRow = ranking.items.find(
      (row) => row.itemId === RAVAGERS_BRACERS
    );
    expect(wornRow?.deltaDps).toBe(0);
  });

  it("RS-3: the candidate order scores the worn item with its suffix's stats", async () => {
    const { itemEpFor } = await importForkUpgrades<{
      itemEpFor: (weights: {
        weights: Record<string, number>;
        pseudoWeights: Record<string, number>;
      }) => (itemId: number, slot: string, randomSuffix?: number) => number;
    }>("item_ep.ts");
    // Strength only: the base bracers have none, "of the Beast" adds some.
    const itemEp = itemEpFor({ weights: { "0": 1 }, pseudoWeights: {} });
    expect(itemEp(RAVAGERS_BRACERS, "wrist")).toBe(0);
    // 5259 per 10000 of the item's 41 random property points, rounded down
    // (`EquippedItem.withDynamicStats`, ui/sim/proto/equipped_item.ts).
    expect(itemEp(RAVAGERS_BRACERS, "wrist", OF_THE_BEAST)).toBe(
      Math.floor((5259 * 41) / 10000)
    );
  });
});

/** Ranks ret P2 gear with Ravager's Bracers of the Beast on the wrist, and returns every request. */
async function runRanking(
  skeleton: Json,
  wristCandidate: number
): Promise<{ requests: RaidSimRequest[]; ranking: Ranking }> {
  const rankMod = await importForkUpgrades<{
    rankUpgrades: (input: Json, deps: Json) => Promise<Ranking>;
  }>("engine/rank.ts");
  const storeMod = await importForkUpgrades<{
    MemoryStore: new () => Json;
  }>("engine/seams/store.ts");
  const gearMod = await importForkUpgrades<{
    RecordedGearSource: new (data: {
      fights: ReadonlyMap<string, unknown[]>;
      gear: ReadonlyMap<string, unknown>;
    }) => unknown;
    characterFightKey: (c: unknown, spec: string) => string;
    fightGearKey: (f: unknown) => string;
  }>("engine/seams/gear-source.ts");

  const character = { region: "US" as const, realm: "test", name: "suffix" };
  const summary = {
    reportCode: "suffix1",
    fightId: 1,
    encounterName: "Test Dummy",
    killedAt: "2026-10-01T00:00:00.000Z",
    route: "ranked" as const,
    confidence: 1,
  };
  const fightRef = { reportCode: summary.reportCode, fightId: summary.fightId };
  const worn = equipmentOf(skeleton);
  const loggedGear = {
    items: SIM_ORDER.map((slot, i) =>
      i === WRIST
        ? {
            id: RAVAGERS_BRACERS,
            slot,
            randomSuffix: OF_THE_BEAST,
            enchant: 2647,
          }
        : {
            id: worn[i]?.id ?? 0,
            slot,
            ...(worn[i]?.enchant ? { enchant: worn[i]!.enchant } : {}),
            gems: worn[i]?.gems ?? [],
          }
    ),
    talentPointsByTree: [5, 11, 45] as [number, number, number],
    provenance: { ...fightRef, sourceID: 1 },
  };
  const gearSource = new gearMod.RecordedGearSource({
    fights: new Map([[gearMod.characterFightKey(character, "ret"), [summary]]]),
    gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
  });

  const requests: RaidSimRequest[] = [];
  const sim = {
    version: () => Promise.resolve(SIM_VERSION),
    computeStats: zeroHitStats,
    run: (req: RaidSimRequest, opts: { iterations: number }) => {
      requests.push(req);
      return Promise.resolve({
        dps: 2000 + requests.length,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
      });
    },
  };
  const weights = (
    readJson(join(root, "data/presets/ret/p2.ep-weights.json")) as {
      weights: Record<string, number>;
    }
  ).weights;

  const ranking = await rankMod.rankUpgrades(
    {
      character,
      spec: "ret",
      maxPhase: 5,
      fight: fightRef,
      iterations: 5000,
      seeds: [11],
      candidateCap: 100,
    },
    {
      gear: gearSource,
      sim,
      store: new storeMod.MemoryStore(),
      clock: () => new Date("2026-10-01T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights: weights,
      itemEp: await statsOnlyItemEp(weights),
      pool: [
        { itemId: wristCandidate, slot: "wrist" },
        { itemId: 30131, slot: "head" }, // Crystalforge War-Helm
        { itemId: RAVAGERS_BRACERS, slot: "wrist" }, // worn: the pool holds it
      ].map((p) => ({
        ...p,
        name: `item ${p.itemId}`,
        phase: 1,
        source: { kind: "badge" as const, cost: 1 },
      })),
      simDatabaseFor: simDatabaseResolverFor(stubPlayer(), skeleton),
    }
  );
  return { requests, ranking };
}
