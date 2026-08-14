/**
 * E-W3 — the fixture-parity gate for the wowsims-tab engine port
 * (docs/plans/wowsims-tab/plan.md §8, §9 slice 2 "done when").
 *
 * The port copies packages/core's ranking engine into
 * vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/.
 * This test drives BOTH copies — this repo's `rankUpgrades` and the fork's
 * ported one, loaded from its actual file path — with the same slamaltman
 * fixture gear and the same recorded sim observations, and asserts they
 * produce the same ranked deltas. A behaviour-changing edit to either copy
 * fails this test; a text-only edit (renamed variable, reordered import)
 * does not, which is deliberate — PROVENANCE.md's hash gate is what catches
 * changes that never reach behaviour.
 *
 * Per plan §8's "E-W3 runs here, not in the fork" decision: the fork ships
 * no TypeScript test runner and stays that way, so this is the only place
 * the parity check can live. `vendor/` is gitignored in this repo (D1), so
 * the fork may be entirely absent in a fresh clone or in CI — this test
 * must skip with a clear message in that case, not fail confusingly.
 *
 * Design point owned here: importing the fork's engine also imports its
 * generated proto types (`ui/core/proto/*.ts`), which are themselves
 * gitignored INSIDE the fork's own repo (protoc output — confirmed via
 * `git check-ignore -v ui/core/proto/common.ts` in the clone, 2026-08-14).
 * So "the fork is present" and "the fork's protos are generated" are two
 * independent conditions, and both gate this test the same way: skip, don't
 * fail. `describeOrSkip` below handles both — see its comment.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { compose } from "../src/compose.js";
import { gemContext } from "../src/candidate-gems.js";
import { gemsForPhase } from "../src/gems.js";
import { equipmentForCandidateSwap, rankUpgrades } from "../src/rank.js";
import {
  RecordedGearSource,
  type FightSummary,
  type LoggedGear,
  type LoggedItem,
} from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { mapWclGearToSim, SIM_ORDER, type WclGearEntry } from "../src/slots.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const forkRoot = join(root, "vendor/tbc-new-fork");
const forkEngineDir = join(
  forkRoot,
  "ui/core/components/individual_sim_ui/upgrades/engine"
);
const forkProtoDir = join(forkRoot, "ui/core/proto");

const forkPresent = existsSync(forkEngineDir);
// protoc output — see this file's top comment. Checking one generated file
// stands in for "the proto pipeline has run"; `common.ts` is the one every
// ported engine module transitively imports.
const forkProtosGenerated = existsSync(join(forkProtoDir, "common.ts"));

const CHAR = {
  region: "US" as const,
  realm: "dreamscythe",
  name: "slamaltman",
};

const SUMMARY: FightSummary = {
  reportCode: "abc123",
  fightId: 7,
  encounterName: "Hydross the Unstable",
  killedAt: "2026-07-01T00:00:00.000Z",
  route: "ranked",
  confidence: 1,
};

const epWeights = (
  JSON.parse(
    readFileSync(join(root, "data/presets/ret/p2.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

const skeleton = JSON.parse(
  readFileSync(join(root, "data/presets/ret/p2.raid-sim-skeleton.json"), "utf8")
) as RaidSimRequest;

/**
 * The candidate pool is deliberately one item, not the full ret universe:
 * this test's job is proving the port preserves *behaviour*, not measuring a
 * real ranking (that is E-W1/E-W2, slice 3). A single, socketless candidate
 * (Fel-Steel Warhelm, 29983 — data/universes/ret-p2.json) keeps the
 * gem-migration/meta-repair path trivial (no sockets to fill or repair) so
 * the recorded-observation map below is small enough to read and audit by
 * hand, while still exercising the real candidate-swap/compose/cache-key
 * path both engines share.
 */
const CANDIDATE_ITEM_ID = 29983;
const CANDIDATE_NAME = "Fel-Steel Warhelm";

/**
 * The one enchant-applicability fact both engines' swap path needs: does
 * slamaltman's worn head enchant (`permanentEnchant: 3003`, "Glyph of
 * Ferocity" — data/enchants/index.json) carry onto the candidate head item?
 * Both are `itemType: 1` (head) in data/items/index.json, so the real
 * `enchantAppliesToItem` (this repo's src/enchants.ts, and upstream's own
 * `ui/core/proto_utils/utils.ts` the port bridges to) answers yes — pinned
 * here as data, not re-derived, since the fork-side mock (below) cannot
 * import upstream's real implementation. See that mock's comment for why.
 */
const ENCHANT_APPLIES = new Map<number, Set<number>>([
  [3003, new Set([32461, CANDIDATE_ITEM_ID])],
]);

function slamaltmanLoggedGear(): LoggedGear {
  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
  ) as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{ sourceID: number; gear: WclGearEntry[] }>;
  };
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    if (actors.get(ev.sourceID)?.name.toLowerCase() !== "slamaltman") continue;
    const mapped = mapWclGearToSim(ev.gear);
    return {
      items: mapped.map((spec, i) => {
        const item: LoggedItem = {
          id: spec.id ?? 0,
          slot: SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
      talentPointsByTree: [5, 11, 45],
      provenance: {
        reportCode: SUMMARY.reportCode,
        fightId: SUMMARY.fightId,
        sourceID: ev.sourceID,
      },
    };
  }
  throw new Error("slamaltman not found in raw fixture");
}

/**
 * Deterministic, hand-picked DPS observations — not real sim output. E-W3
 * asks "did the port preserve behaviour", which is a question about the
 * ranking *arithmetic*, and that question does not need real numbers to
 * answer: any two distinct, stable DPS values exercise the same delta/SE/
 * cutoff/rank code path a genuine sim result would. (Whether the *wasm* sim
 * agrees with native at all is E-W1, run once real observations exist —
 * slice 3, still unrun per slice 1's handoff.)
 */
const BASELINE_DPS = 2000;
const BASELINE_STDEV = 120;
const CANDIDATE_DPS = 2050;
const CANDIDATE_STDEV = 118;
const SIM_VERSION = "v0.0.101";
const RUN_OPTS = { seed: 11, iterations: 3000 };

function baselineObservation(): SimObservation {
  return {
    dps: BASELINE_DPS,
    stdev: BASELINE_STDEV,
    iterationsDone: RUN_OPTS.iterations,
    simVersion: SIM_VERSION,
  };
}

function candidateObservation(): SimObservation {
  return {
    dps: CANDIDATE_DPS,
    stdev: CANDIDATE_STDEV,
    iterationsDone: RUN_OPTS.iterations,
    simVersion: SIM_VERSION,
  };
}

/** This repo's own engine, run exactly like rank.test.ts's existing suite. */
async function rankWithThisRepo() {
  const logged = slamaltmanLoggedGear();
  const equipment = mapWclGearToSim(
    (
      JSON.parse(
        readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
      ) as {
        actors: Array<{ id: number; name: string }>;
        combatant_info_events: Array<{
          sourceID: number;
          gear: WclGearEntry[];
        }>;
      }
    ).combatant_info_events.find(
      (ev) => ev.sourceID === logged.provenance.sourceID
    )!.gear
  );
  const baselineRequest = compose(skeleton, {
    name: CHAR.name,
    race: "RaceBloodElf",
    equipment,
  });
  const candidateEquipment = equipmentForCandidateSwap(
    equipment,
    SIM_ORDER.indexOf("head"),
    CANDIDATE_ITEM_ID,
    gemContext(gemsForPhase(2), epWeights)
  );
  const candidateRequest = compose(skeleton, {
    name: CHAR.name,
    race: "RaceBloodElf",
    equipment: candidateEquipment,
  });

  const recordings = new Map<string, SimObservation>([
    [
      simCacheKey(baselineRequest, SIM_VERSION, RUN_OPTS),
      baselineObservation(),
    ],
    [
      simCacheKey(candidateRequest, SIM_VERSION, RUN_OPTS),
      candidateObservation(),
    ],
  ]);

  return rankUpgrades(
    { character: CHAR, spec: "ret", maxPhase: 2, seeds: [RUN_OPTS.seed] },
    {
      gear: new RecordedGearSource({
        fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
        gear: new Map([["abc123|7", logged]]),
      }),
      sim: new RecordedSimRunner(SIM_VERSION, recordings),
      store: new MemoryStore(),
      clock: () => new Date("2026-07-26T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool: [
        {
          itemId: CANDIDATE_ITEM_ID,
          name: CANDIDATE_NAME,
          slot: "head",
          phase: 2,
          source: { kind: "raid", zone: "Tempest Keep", boss: "Void Reaver" },
        },
      ],
    }
  );
}

/**
 * The stub `UIDatabase` the fork's `items.ts`/`gems.ts` adapters read
 * through `Database.getSync()`. Built from this repo's own committed
 * `data/items/index.json` / `data/gems/palette.json` entries for exactly
 * the ids slamaltman's fixture and the one test candidate touch — not
 * invented data, so both engines are pricing the same items from the same
 * ultimate source. Field names follow the fork's `UIItem`/`UIGem` proto
 * (camelCase, `gemSockets` not `sockets`) rather than packages/core's
 * `ItemEntry` shape.
 */
function buildForkDatabaseJson(): Record<string, unknown> {
  const items = JSON.parse(
    readFileSync(join(root, "data/items/index.json"), "utf8")
  ) as Record<
    string,
    {
      name: string;
      sockets: number[];
      stats: number[];
      socketBonus: number[];
      setId: number | null;
      setName: string | null;
      unique: boolean;
      itemType: number;
      handType: number | null;
      weaponType: number | null;
      rangedWeaponType: number | null;
    }
  >;
  const gems = JSON.parse(
    readFileSync(join(root, "data/gems/palette.json"), "utf8")
  ) as Array<{
    id: number;
    colour: number;
    stats: number[];
    phase: number;
    quality: number;
    unique: boolean;
  }>;

  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
  ) as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{ sourceID: number; gear: WclGearEntry[] }>;
  };
  // Scoped to slamaltman's own CombatantInfo event only — the raw fixture
  // carries every raider's gear (stage0-findings §11's "one fight holds
  // every raider's gear"), and other actors' items (e.g. a shirt at WCL
  // index 3, id 859, not in this repo's equippable-item index at all) are
  // never read by either engine, so they must not be required here either.
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  const slamEvent = raw.combatant_info_events.find(
    (ev) => actors.get(ev.sourceID)?.name.toLowerCase() === "slamaltman"
  );
  if (!slamEvent) throw new Error("slamaltman not found in raw fixture");
  // mapWclGearToSim (slots.ts) drops the SHIRT (index 3) and TABARD (index
  // 18) WCL positions before returning sim equipment — neither is an
  // equippable item and neither is in data/items/index.json. Mirroring that
  // same drop here, rather than trusting "is it in the index" as the
  // filter, keeps this fixture-building code honest about *why* an id is
  // excluded instead of masking a real missing-item bug as if it were a
  // shirt.
  const SHIRT_INDEX = 3;
  const TABARD_INDEX = 18;
  const wornItemIds = new Set<number>();
  const wornGemIds = new Set<number>();
  slamEvent.gear.forEach((g, i) => {
    if (i === SHIRT_INDEX || i === TABARD_INDEX) return;
    if (g?.id) wornItemIds.add(g.id);
    for (const gem of g?.gems ?? []) {
      if (gem?.id) wornGemIds.add(gem.id);
    }
  });
  wornItemIds.add(CANDIDATE_ITEM_ID);

  const itemsJson = [...wornItemIds].map((id) => {
    const item = items[String(id)];
    if (!item)
      throw new Error(`fixture item ${id} missing from data/items/index.json`);
    return {
      id,
      name: item.name,
      type: item.itemType,
      handType: item.handType ?? 0,
      weaponType: item.weaponType ?? 0,
      rangedWeaponType: item.rangedWeaponType ?? 0,
      stats: item.stats,
      gemSockets: item.sockets,
      socketBonus: item.socketBonus,
      setId: item.setId ?? 0,
      setName: item.setName ?? "",
      unique: item.unique,
      scalingOptions: {
        "0": {
          ilvl: 0,
          weaponDamageMin: 0,
          weaponDamageMax: 0,
          randPropPoints: 0,
          stats: Object.fromEntries(item.stats.map((v, i) => [String(i), v])),
        },
      },
    };
  });

  const gemsJson = [...wornGemIds].map((id) => {
    const gem = gems.find((g) => g.id === id);
    if (!gem)
      throw new Error(`fixture gem ${id} missing from data/gems/palette.json`);
    return {
      id: gem.id,
      color: gem.colour,
      stats: gem.stats,
      phase: gem.phase,
      quality: gem.quality,
      unique: gem.unique,
    };
  });

  return {
    items: itemsJson,
    gems: gemsJson,
    randomSuffixes: [],
    itemEffectRandPropPoints: [],
    enchants: [],
    npcs: [],
    zones: [],
    encounters: [],
    itemIcons: [],
    spellIcons: [],
    consumables: [],
    spellEffects: [],
  };
}

/**
 * Whether to run this suite at all. Two independent absence conditions
 * (fork clone absent; fork present but protos not generated) collapse to
 * one skip path, since both mean "cannot import the fork's engine" and
 * both are ordinary states — a fresh clone, or a clone before `protoc`
 * runs — not failures.
 */
const canRunForkSide = forkPresent && forkProtosGenerated;

describe.runIf(canRunForkSide)("wowsims-fork-parity (E-W3)", () => {
  it("the ported fork engine reproduces this repo's ranked deltas", async () => {
    const thisRepoRanking = await rankWithThisRepo();

    // The ported engine's items.ts/gems.ts adapters call
    // `Database.getSync().{getItemById,lookupGem,getGems}` — the only three
    // methods either module reads. Rather than import the fork's *real*
    // `Database` class (proto_utils/database.ts), this mocks that module
    // outright: the real class's import graph reaches
    // `ui/core/launched_sims.tsx` → `constants/other.ts` (module-scope
    // `window.location` read) and `ui/i18n/config.ts` (a Vite-only
    // `virtual:i18next-loader` specifier that only resolves inside the
    // fork's own `vite.config` — not under plain vitest transform).
    // Neither is a defect in the port; they are facts about how deep the
    // rest of the fork's UI bootstrap sits behind one import, confirmed by
    // running this suite without the mock and reading each successive
    // ReferenceError/resolution-error. A fake `Database` sidesteps both
    // without needing the fork's Vite pipeline in this repo's test runner.
    //
    // `enchants.ts` (this port's own bridge to the fork's upstream
    // `enchantAppliesToItem`, see its doc comment) imports
    // `proto_utils/utils.ts` directly — a second, independent path to the
    // same `constants/other.ts` module-scope `window.location` read, not
    // reachable through `database.ts` at all. A one-field stub is the
    // cheapest fix and is not a fake: this is exactly the `window` a real
    // page supplies, just not fetched through a browser here.
    // `player_specs/druid.ts` (reached transitively through
    // `proto_utils/utils.ts`'s module-scope `getSpecSiteUrl` static
    // initializers) additionally needs `protocol`/`host` to build a `new
    // URL(...)` — same reasoning as above, filled in as the errors named
    // them rather than guessed at up front.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window ??= {
      location: {
        pathname: "/tbc/",
        protocol: "https:",
        host: "localhost",
      },
    };
    const dbJson = buildForkDatabaseJson();
    const { UIDatabase } = await import(
      pathToFileURL(join(forkProtoDir, "ui.ts")).href
    );
    const uiDb = UIDatabase.fromJson(dbJson) as {
      items: Array<{
        id: number;
        setId: number;
        setName: string;
        gemSockets: number[];
        stats: number[];
        socketBonus: number[];
        unique: boolean;
        type: number;
        handType: number;
        weaponType: number;
        rangedWeaponType: number;
        name: string;
      }>;
      gems: Array<{
        id: number;
        color: number;
        stats: number[];
        phase: number;
        quality: number;
        unique: boolean;
      }>;
    };
    const itemsById = new Map(uiDb.items.map((i) => [i.id, i]));
    const gemsById = new Map(uiDb.gems.map((g) => [g.id, g]));
    const fakeDatabase = {
      getItemById: (id: number) => itemsById.get(id),
      lookupGem: (id: number) => gemsById.get(id) ?? null,
      getGems: () => [...gemsById.values()],
      // enchants.ts's bridge scans every slot's enchant list looking for a
      // matching effectId, then hands the record to the (also mocked, see
      // below) upstream `enchantAppliesToItem`. Since that mock decides
      // applicability from `effectId` alone via `ENCHANT_APPLIES`, one
      // synthetic record per known effectId — returned for every slot — is
      // enough to reach it; the fake never needs slot-shaped data of its own.
      getEnchants: () =>
        [...ENCHANT_APPLIES.keys()].map((effectId) => ({ effectId })),
    };

    vi.doMock(
      pathToFileURL(join(forkRoot, "ui/core/proto_utils/database.ts")).href,
      () => ({ Database: { getSync: () => fakeDatabase } })
    );

    // enchants.ts's bridge to the fork's real `proto_utils/utils.ts`
    // (its own doc comment explains why it delegates rather than
    // re-deriving) turns out to be unimportable outside the fork's own Vite
    // build: `utils.ts` reaches `ui/player_specs/*` → `ui/i18n/config.ts`,
    // which imports a Vite-generated `virtual:i18next-loader` specifier that
    // only resolves inside the fork's own `vite.config.mts` plugin chain —
    // confirmed by exhausting every `window`-stub fix first and hitting this
    // wall regardless. Mocked here to a small table covering exactly the
    // enchant effect ids the slamaltman fixture and this test's swap path
    // touch (see `ENCHANT_APPLIES` below) — this test's job is proving
    // rank.ts's ported *ranking arithmetic* matches, not exercising
    // upstream's enchant-slot eligibility machinery, which this port does
    // not modify and which stays covered by the fork's own eventual UI
    // testing (or lack of it — plan §8's "the fork has no TS test runner").
    vi.doMock(
      pathToFileURL(join(forkRoot, "ui/core/proto_utils/utils.ts")).href,
      () => ({
        enchantAppliesToItem: (
          enchant: { effectId: number },
          item: { id: number }
        ) => ENCHANT_APPLIES.get(enchant.effectId)?.has(item.id) ?? false,
        getEligibleItemSlots: () => [],
        getEligibleEnchantSlots: () => [],
      })
    );

    const forkRank = await import(
      pathToFileURL(join(forkEngineDir, "rank.ts")).href
    );
    const forkCompose = await import(
      pathToFileURL(join(forkEngineDir, "compose.ts")).href
    );
    const forkCandidateGems = await import(
      pathToFileURL(join(forkEngineDir, "candidate-gems.ts")).href
    );
    const forkGems = await import(
      pathToFileURL(join(forkEngineDir, "gems.ts")).href
    );
    const forkSlots = await import(
      pathToFileURL(join(forkEngineDir, "slots.ts")).href
    );
    const forkGearSource = await import(
      pathToFileURL(join(forkEngineDir, "seams/gear-source.ts")).href
    );
    const forkSimRunner = await import(
      pathToFileURL(join(forkEngineDir, "seams/sim-runner.ts")).href
    );
    const forkStore = await import(
      pathToFileURL(join(forkEngineDir, "seams/store.ts")).href
    );

    const logged = slamaltmanLoggedGear();
    const raw = JSON.parse(
      readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
    ) as {
      combatant_info_events: Array<{ sourceID: number; gear: WclGearEntry[] }>;
    };
    const equipment = mapWclGearToSim(
      raw.combatant_info_events.find(
        (ev) => ev.sourceID === logged.provenance.sourceID
      )!.gear
    );

    const baselineRequest = forkCompose.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment,
    });
    const candidateEquipment = forkRank.equipmentForCandidateSwap(
      equipment,
      forkSlots.SIM_ORDER.indexOf("head"),
      CANDIDATE_ITEM_ID,
      forkCandidateGems.gemContext(forkGems.gemsForPhase(2), epWeights)
    );
    const candidateRequest = forkCompose.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment: candidateEquipment,
    });

    const forkRecordings = new Map([
      [
        forkSimRunner.simCacheKey(baselineRequest, SIM_VERSION, RUN_OPTS),
        baselineObservation(),
      ],
      [
        forkSimRunner.simCacheKey(candidateRequest, SIM_VERSION, RUN_OPTS),
        candidateObservation(),
      ],
    ]);

    const forkRanking = await forkRank.rankUpgrades(
      { character: CHAR, spec: "ret", maxPhase: 2, seeds: [RUN_OPTS.seed] },
      {
        gear: new forkGearSource.RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim: new forkSimRunner.RecordedSimRunner(SIM_VERSION, forkRecordings),
        store: new forkStore.MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool: [
          {
            itemId: CANDIDATE_ITEM_ID,
            name: CANDIDATE_NAME,
            slot: "head",
            phase: 2,
            source: { kind: "raid", zone: "Tempest Keep", boss: "Void Reaver" },
          },
        ],
      }
    );

    // The assertion E-W3 exists for: same deltas, same SE, same rank — not
    // a deep-equal on the whole Ranking, since assumptions.presetId is
    // deliberately spelled differently between the two (rank.ts's doc
    // comment: the fork has no on-disk skeleton file to name).
    expect(thisRepoRanking.baseline.dps).toBe(forkRanking.baseline.dps);
    expect(
      thisRepoRanking.items.map((i) => ({
        itemId: i.itemId,
        deltaDps: i.deltaDps,
        deltaPct: i.deltaPct,
        se: i.se,
        seMethod: i.seMethod,
        rank: i.rank,
        belowCutoff: i.belowCutoff,
      }))
    ).toEqual(
      forkRanking.items.map((i: (typeof forkRanking.items)[number]) => ({
        itemId: i.itemId,
        deltaDps: i.deltaDps,
        deltaPct: i.deltaPct,
        se: i.se,
        seMethod: i.seMethod,
        rank: i.rank,
        belowCutoff: i.belowCutoff,
      }))
    );
  });
});

describe.skipIf(canRunForkSide)("wowsims-fork-parity (E-W3)", () => {
  it.skip(
    forkPresent
      ? "skipped: vendor/tbc-new-fork is present but its protos are not generated " +
          "(run protoc — see .scratch/handoffs/wowsims-tab/slice-1/HANDOFF.md's " +
          "'Both proto paths' section) — this is expected in most checkouts, " +
          "since vendor/ is gitignored and its build artifacts are gitignored again inside it"
      : "skipped: vendor/tbc-new-fork is absent (vendor/ is gitignored — D1) " +
          "— clone it and generate protos to run this test locally; CI does not " +
          "have the fork either, by design (plan §1: nothing pushed, no PR)",
    () => {
      // Intentionally empty — the skip reason is the point.
    }
  );
});
