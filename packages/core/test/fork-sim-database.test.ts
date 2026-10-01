/**
 * The tab's per-request database carries the page's consumable rows
 * (ticket 522), on the fork's real resolver.
 *
 * The page's own sim request names the player's consumables and sends their
 * `consumables` and `spellEffects` rows beside the item rows. The tab's
 * requests are composed from a skeleton of that same request, but `compose()`
 * replaces `player.database` as a whole with the resolver's result. If the
 * resolver drops those rows, a backend that has not seen them sims without
 * consumables: Go skips a named consumable that has no row (a zero-value row
 * adds nothing, `sim/core/database.go` `GetConsumableByID`), and it panics on
 * a consumable row whose effect row is missing (`sim/core/consumes.go`, the
 * potion and conjured-item `GetSpellEffectByID` reads). So every case checks
 * the rows equal the skeleton's, and that every effect id has its row.
 *
 * The seams are the resolver (`simDatabaseResolverFor`, an adapter) and the
 * module interface `rankUpgrades` through the fork engine. Cases stand for
 * kinds of consumable mix, not for specs: neither the resolver nor
 * `extendPlayerProtoWithMissingEffects` branches on class or spec. Real item
 * ids are used as values; no type is derived from a JSON import.
 *
 * Skips when the fork clone is absent (`vendor/` is gitignored, main checkout
 * only), the same contract as the other fork-gated suites.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { beforeAll, describe, expect, it } from "vitest";

import {
  forkPresent,
  forkRoot,
  importForkUpgrades,
  loadForkEngineEnvironment,
} from "./fork-engine-harness.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const RET = join(root, "data/presets/ret/p2.raid-sim-skeleton.json");
const FERAL = join(root, "data/presets/feral/p2.raid-sim-skeleton.json");

type Json = Record<string, unknown>;
type RaidSimRequest = Readonly<Record<string, unknown>>;
type Row = { id?: number; effectIds?: number[] };
type DbJson = {
  items?: Row[];
  consumables?: Row[];
  spellEffects?: Row[];
};
type ItemSpecJson = { id?: number };
type Resolver = (equipment: readonly ItemSpecJson[]) => DbJson | undefined;
type StubPlayer = { itemSwapSettings: { getGear: () => unknown } };
type ResolverFactory = (
  player: StubPlayer,
  skeleton: RaidSimRequest
) => Resolver;

type ProtoMsg<T> = {
  fromJson(json: unknown, opts?: { ignoreUnknownFields: boolean }): T;
  toJson(msg: T): unknown;
  create(init?: Record<string, unknown>): T;
};
type PlayerProto = { database?: unknown };
type ForkDatabase = { lookupItemSpec(spec: unknown): unknown };

let PlayerMsg: ProtoMsg<PlayerProto>;
let SimDatabaseMsg: ProtoMsg<unknown>;
let ItemSpecMsg: ProtoMsg<unknown>;
let ItemSlotMainHand: number;
let ItemSwapGear: new (gear: Record<number, unknown>) => unknown;
let getDb: () => ForkDatabase;
let extendPlayerProtoWithMissingEffects: (
  player: PlayerProto,
  db: ForkDatabase
) => void;
let simDatabaseResolverFor: ResolverFactory;

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

/**
 * A committed skeleton as the page's own request would carry it: the player's
 * database holds the rows for its named consumables. This is the step
 * `ui/core/sim.ts:290` runs on the page's request.
 */
function pageSkeleton(file: string, consumes?: Json): RaidSimRequest {
  const skeleton = readJson(file);
  const playerJson = playerOf(skeleton);
  if (consumes !== undefined) playerJson.consumables = consumes;
  const player = PlayerMsg.fromJson(playerJson, { ignoreUnknownFields: true });
  player.database = SimDatabaseMsg.create();
  extendPlayerProtoWithMissingEffects(player, getDb());
  const raid = skeleton.raid as { parties: [{ players: [unknown] }] };
  raid.parties[0].players[0] = PlayerMsg.toJson(player);
  return skeleton;
}

function skeletonDb(skeleton: RaidSimRequest): DbJson {
  return (playerOf(skeleton).database ?? {}) as DbJson;
}

function equipmentOf(skeleton: RaidSimRequest): ItemSpecJson[] {
  const equipment = playerOf(skeleton).equipment as { items: ItemSpecJson[] };
  return equipment.items.map((item) => ({ ...item }));
}

function stubPlayer(swap?: unknown): StubPlayer {
  return {
    itemSwapSettings: { getGear: () => swap ?? new ItemSwapGear({}) },
  };
}

function ids(rows: readonly Row[] | undefined): number[] {
  return (rows ?? []).map((row) => row.id ?? 0).sort((a, b) => a - b);
}

/** Every effect id of every consumable row has a spell-effect row. */
function covered(db: DbJson): boolean {
  const effects = new Set(ids(db.spellEffects));
  return (db.consumables ?? []).every((row) =>
    (row.effectIds ?? []).every((id) => effects.has(id))
  );
}

function wornIds(skeleton: RaidSimRequest): number[] {
  return equipmentOf(skeleton)
    .map((item) => item.id ?? 0)
    .filter((id) => id !== 0);
}

/**
 * The assertions every consumable mix shares: the rows are the skeleton's,
 * not empty, include at least one consumable with effects, cover every
 * effect id, and sit beside a row for each worn item.
 */
function expectPageRows(
  db: DbJson | undefined,
  skeleton: RaidSimRequest,
  counts: { consumables: number; spellEffects: number }
): void {
  const want = skeletonDb(skeleton);
  expect(ids(db?.consumables)).toEqual(ids(want.consumables));
  expect(ids(db?.consumables)).toHaveLength(counts.consumables);
  expect(ids(db?.spellEffects)).toEqual(ids(want.spellEffects));
  expect(ids(db?.spellEffects)).toHaveLength(counts.spellEffects);
  expect(
    (db?.consumables ?? []).some((row) => (row.effectIds ?? []).length > 0)
  ).toBe(true);
  expect(covered(db ?? {})).toBe(true);
  const items = new Set(ids(db?.items));
  for (const id of wornIds(skeleton)) expect(items.has(id)).toBe(true);
}

describe.skipIf(!forkPresent)(
  "tab requests carry the page's consumables (ticket 522)",
  () => {
    beforeAll(async () => {
      await loadForkEngineEnvironment();
      ({ Player: PlayerMsg } = (await import(
        forkUrl("ui/core/proto/api.ts")
      )) as {
        Player: ProtoMsg<PlayerProto>;
      });
      ({ SimDatabase: SimDatabaseMsg } = (await import(
        forkUrl("ui/core/proto/db.ts")
      )) as { SimDatabase: ProtoMsg<unknown> });
      const common = (await import(forkUrl("ui/core/proto/common.ts"))) as {
        ItemSlot: { ItemSlotMainHand: number };
        ItemSpec: ProtoMsg<unknown>;
      };
      ItemSpecMsg = common.ItemSpec;
      ItemSlotMainHand = common.ItemSlot.ItemSlotMainHand;
      const database = (await import(
        forkUrl("ui/core/proto_utils/database.ts")
      )) as { Database: { getSync: () => ForkDatabase } };
      getDb = () => database.Database.getSync();
      ({ ItemSwapGear } = (await import(
        forkUrl("ui/core/proto_utils/gear.ts")
      )) as { ItemSwapGear: typeof ItemSwapGear });
      ({ extendPlayerProtoWithMissingEffects } = (await import(
        forkUrl("ui/core/proto_utils/utils.ts")
      )) as {
        extendPlayerProtoWithMissingEffects: typeof extendPlayerProtoWithMissingEffects;
      });
      ({ simDatabaseResolverFor } = await importForkUpgrades<{
        simDatabaseResolverFor: ResolverFactory;
      }>("adapters/sim_database.ts"));
    });

    it("522-A: an agility melee mix (feral P2 consumables on ret P2 gear) is sent with its rows", () => {
      // Scenario kind: battle and guardian elixirs, agility food, an imbue,
      // drums, and potion and conjured lists with multi-effect rows. Stands
      // for feral, rogue, enhancement and hunter. The feral skeleton has no
      // gear, so the ret gear carries the item rows.
      const feralConsumes = playerOf(readJson(FERAL)).consumables as Json;
      const skeleton = pageSkeleton(RET, feralConsumes);
      const db = simDatabaseResolverFor(
        stubPlayer(),
        skeleton
      )(equipmentOf(skeleton));
      expectPageRows(db, skeleton, { consumables: 18, spellEffects: 14 });
    });

    it("522-B: a strength melee mix with a flask and explosives (ret P2 skeleton) is sent with its rows", () => {
      // Scenario kind: ret and warrior.
      const skeleton = pageSkeleton(RET);
      const db = simDatabaseResolverFor(
        stubPlayer(),
        skeleton
      )(equipmentOf(skeleton));
      expectPageRows(db, skeleton, { consumables: 20, spellEffects: 14 });
    });

    it("522-C: a caster mix (ret P2 gear) is sent with the effect rows Go reads", () => {
      // Scenario kind: a spell flask, caster food, mana potions with effect
      // rows, Demonic Rune and a Healthstone. Stands for mage, warlock,
      // shadow, balance and elemental; the class does not matter here.
      const skeleton = pageSkeleton(RET, {
        flaskId: 22866,
        foodId: 27657,
        potId: 22839,
        conjuredId: 12662,
        potions: [22832, 31677, 22839],
        conjuredItems: [12662, 22105],
      });
      const db = simDatabaseResolverFor(
        stubPlayer(),
        skeleton
      )(equipmentOf(skeleton));
      const want = skeletonDb(skeleton);
      expectPageRows(db, skeleton, {
        consumables: ids(want.consumables).length,
        spellEffects: ids(want.spellEffects).length,
      });
      expect(ids(db?.consumables).length).toBeGreaterThan(0);
      // Super Mana, Fel Mana, Demonic Rune and Master Healthstone: the rows
      // the potion and conjured-item paths in consumes.go read.
      expect(ids(db?.spellEffects)).toEqual(
        expect.arrayContaining([847151, 858752, 858753, 858755, 694074, 846788])
      );
    });

    it("522-D: nothing selected (ret P2 gear) sends no consumable rows", () => {
      const skeleton = pageSkeleton(RET, {});
      const db = simDatabaseResolverFor(
        stubPlayer(),
        skeleton
      )(equipmentOf(skeleton));
      expect(ids(db?.consumables)).toEqual([]);
      expect(ids(db?.spellEffects)).toEqual([]);
      const items = new Set(ids(db?.items));
      expect(wornIds(skeleton)).toHaveLength(16);
      for (const id of wornIds(skeleton)) expect(items.has(id)).toBe(true);
    });

    it("522-E: the rows follow the skeleton, not the equipment (ret P2 skeleton)", () => {
      const skeleton = pageSkeleton(RET);
      const resolve = simDatabaseResolverFor(stubPlayer(), skeleton);
      const worn = equipmentOf(skeleton);
      expect(worn[0]?.id).toBe(29073); // Justicar Crown
      const swapped = worn.map((item, slot) =>
        slot === 0 ? { id: 30131 } : item
      ); // Crystalforge War-Helm
      const want = skeletonDb(skeleton);
      const results = [resolve(worn), resolve(swapped)];
      for (const db of results) {
        expect(ids(db?.consumables)).toEqual(ids(want.consumables));
        expect(ids(db?.consumables).length).toBeGreaterThan(0);
        expect(ids(db?.spellEffects)).toEqual(ids(want.spellEffects));
        expect(ids(db?.spellEffects).length).toBeGreaterThan(0);
      }
      const [wornItems, swappedItems] = results.map((db) => ids(db?.items));
      expect(wornItems).toContain(29073);
      expect(wornItems).not.toContain(30131);
      expect(swappedItems).toContain(30131);
      expect(swappedItems).not.toContain(29073);
    });

    it("522-F: item-swap rows are still merged (ticket 362 regression, ret P2 skeleton)", () => {
      const skeleton = pageSkeleton(RET);
      const gorehowl = getDb().lookupItemSpec(
        ItemSpecMsg.create({ id: 28773 })
      );
      expect(gorehowl).not.toBeNull();
      const swap = new ItemSwapGear({ [ItemSlotMainHand]: gorehowl });
      const db = simDatabaseResolverFor(
        stubPlayer(swap),
        skeleton
      )(equipmentOf(skeleton));
      expect(ids(db?.items)).toContain(28773);
    });

    it("522-G: every request of a ranking with a worn set, set-bonus copies included, carries the rows (feral P2 skeleton, worn Malorne)", async () => {
      // Scenario kind: the set-less and set-kept copy requests of tickets
      // 511/512. Only the feral skeleton's consumables matter: compose puts
      // the gear source's worn gear in place of its empty equipment.
      const skeleton = pageSkeleton(FERAL);
      const want = skeletonDb(skeleton);
      const recorded = await runRanking(skeleton);

      const equipped = recorded.requests.map((req) =>
        (
          (playerOf(req).equipment as { items?: ItemSpecJson[] }).items ?? []
        ).map((item) => item?.id ?? 0)
      );
      expect(
        equipped.some((list) =>
          list.some((id) => id >= 1_000_000 && id < 2_000_000)
        )
      ).toBe(true);
      expect(equipped.some((list) => list.some((id) => id >= 2_000_000))).toBe(
        true
      );

      for (const [i, req] of recorded.requests.entries()) {
        const db = (playerOf(req).database ?? {}) as DbJson;
        expect(ids(db.consumables)).toEqual(ids(want.consumables));
        expect(ids(db.consumables).length).toBeGreaterThan(0);
        expect(ids(db.spellEffects)).toEqual(ids(want.spellEffects));
        expect(ids(db.spellEffects).length).toBeGreaterThan(0);
        const items = new Set(ids(db.items));
        for (const id of (equipped[i] ?? []).filter((id) => id !== 0)) {
          expect(items.has(id)).toBe(true);
        }
      }

      expect(
        (recorded.ranking.wornSetLadder ?? []).filter(
          (rung) => rung.unmeasured === "sim-failed"
        )
      ).toEqual([]);
    });
  }
);

/* ------------------------------------------------------------------ *
 * 522-G's ranking, modelled on fork-set-net.test.ts `runScenario`
 * ------------------------------------------------------------------ */

const SIM_VERSION = "v0.0.101";
const ITERATIONS = 5000;

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

const WORN_MALORNE: Partial<Record<(typeof SIM_ORDER)[number], number>> = {
  head: 29098, // Stag-Helm of Malorne
  shoulder: 29100, // Mantle of Malorne
  hands: 29097, // Gauntlets of Malorne
};
const POOL = [
  { itemId: 31039, slot: "head" }, // Thunderheart Cover
  { itemId: 31048, slot: "shoulder" }, // Thunderheart Pauldrons
] as const;

const CHAR = { region: "US" as const, realm: "test", name: "consumables" };
const SUMMARY = {
  reportCode: "con522",
  fightId: 1,
  encounterName: "Test Dummy",
  killedAt: "2026-10-01T00:00:00.000Z",
  route: "ranked" as const,
  confidence: 1,
};

type Ranking = {
  wornSetLadder?: Array<{ unmeasured?: string }>;
};

async function runRanking(
  skeleton: RaidSimRequest
): Promise<{ ranking: Ranking; requests: RaidSimRequest[] }> {
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

  const fightRef = { reportCode: SUMMARY.reportCode, fightId: SUMMARY.fightId };
  const loggedGear = {
    items: SIM_ORDER.map((slot) => ({
      id: WORN_MALORNE[slot] ?? 0,
      slot,
      gems: [],
    })),
    talentPointsByTree: [0, 45, 16] as [number, number, number],
    provenance: { ...fightRef, sourceID: 1 },
  };
  const gearSource = new gearMod.RecordedGearSource({
    fights: new Map([[gearMod.characterFightKey(CHAR, "feral"), [SUMMARY]]]),
    gear: new Map([[gearMod.fightGearKey(fightRef), loggedGear]]),
  });

  const requests: RaidSimRequest[] = [];
  const sim = {
    version: () => Promise.resolve(SIM_VERSION),
    run: (req: RaidSimRequest, opts: { iterations: number }) => {
      requests.push(req);
      const equipped = (
        (playerOf(req).equipment as { items?: ItemSpecJson[] }).items ?? []
      ).filter((item) => (item?.id ?? 0) !== 0).length;
      return Promise.resolve({
        dps: 2000 + 10 * equipped,
        stdev: 30,
        iterationsDone: opts.iterations,
        simVersion: SIM_VERSION,
      });
    },
  };

  const weights = (
    readJson(join(root, "data/presets/feral/p1.ep-weights.json")) as {
      weights: Record<string, number>;
    }
  ).weights;

  const ranking = await rankMod.rankUpgrades(
    {
      character: CHAR,
      spec: "feral",
      maxPhase: 5,
      fight: fightRef,
      iterations: ITERATIONS,
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
      pool: POOL.map((p) => ({
        itemId: p.itemId,
        name: `item ${p.itemId}`,
        slot: p.slot,
        phase: 1,
        source: { kind: "badge" as const, cost: 1 },
      })),
      simDatabaseFor: simDatabaseResolverFor(stubPlayer(), skeleton),
      measureBrokenSetValue: true,
    }
  );
  return { ranking, requests };
}
