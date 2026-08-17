/**
 * E-W3 — the fixture-parity gate for the wowsims-tab engine port
 * (docs/plans/wowsims-tab/plan.md §8, §9 slice 2 "done when").
 *
 * The port copies packages/core's ranking engine into
 * vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades/engine/.
 * This test drives BOTH copies — this repo's `rankUpgrades` and the fork's
 * ported one, loaded from its actual file path — with the same slamaltman
 * fixture gear and the same recorded sim observations, and asserts they
 * produce the same ranked deltas — and, since ticket 165, the same composed
 * sim requests.
 *
 * What this test does and does not gate (the header used to claim "a
 * behaviour-changing edit to either copy fails this test", which was false
 * for roughly half the ported modules — ticket 165):
 *
 * - Ranked deltas, SE, rank, cutoff and set-bonus synergy are compared, so a
 *   mutation in the arithmetic downstream of a sim observation fails here.
 * - Composed requests are compared, so a mutation confined to request
 *   *composition* also fails here. That covers `compose` itself, gem fill,
 *   meta repair, enchant carry-over and stat computation. Before ticket 165
 *   these were invisible: the harness keys every recording by the engine's
 *   own composed request, so a broken compose moved the key and the lookup
 *   together and the ranking came out identical.
 * - A text-only edit (renamed variable, reordered import) does not fail this
 *   test, which is deliberate — PROVENANCE.md's hash gate catches changes
 *   that never reach behaviour.
 * - Still NOT gated: anything below the mocked boundary. `Database` and
 *   `proto_utils/utils` are mocked (see the mock's own comment), so the
 *   fork's real adapters and the Vite build are outside this test.
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
 * The candidate pool covers three cases (ticket 155): a socketless swap
 * (kept from the original test, below), a socketed swap that exercises
 * gem-fill/meta-repair, and a two-item set-bonus completion package. Not the
 * full ret universe — this test's job is proving the port preserves
 * *behaviour*, not measuring a real ranking (that is E-W1/E-W2, slice 3).
 */
const CANDIDATE_ITEM_ID = 29983;
const CANDIDATE_NAME = "Fel-Steel Warhelm";

/**
 * Lightbringer Battlegear (setId 680 — packages/core/src/set-value.ts's
 * IMPLEMENTED_IN_SIM has both 2pc and 4pc measurable). slamaltman wears zero
 * Lightbringer pieces (test/fixtures/slamaltman.raw.json), so `selectPackage`
 * needs two pool candidates — one per open slot — to reach the 2pc threshold;
 * a single-item swap only reaches 0→1 and never crosses it
 * ("unmeasurable-at-this-worn-count", set-value.ts). Both items carry real
 * sockets (data/items/index.json: head [4,1], shoulder [4,4]), so this same
 * pair also exercises gem-fill/meta-repair on a socketed candidate — ticket
 * 155's other uncovered path — without a third item.
 *
 * Both items are `phase: 3` in data/items/index.json; the pool entry's own
 * `phase: 2` field below is test metadata for `filterPoolByPhase`, matching
 * how the existing Fel-Steel Warhelm entry already labels itself, not a claim
 * about the item's real drop phase.
 */
const SET_CANDIDATE_HEAD_ID = 30989;
const SET_CANDIDATE_HEAD_NAME = "Lightbringer War-Helm";
const SET_CANDIDATE_SHOULDER_ID = 30997;
const SET_CANDIDATE_SHOULDER_NAME = "Lightbringer Shoulderbraces";

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
  // Head enchant onto head items. 30989 (Lightbringer War-Helm) is itemType 1
  // in data/items/index.json, exactly like 32461 and 29983, so the real
  // `enchantAppliesToItem` carries 3003 onto it too.
  [3003, new Set([32461, CANDIDATE_ITEM_ID, SET_CANDIDATE_HEAD_ID])],
  // Shoulder enchant onto the shoulder candidate: worn shoulder 30022 carries
  // permanentEnchant 2986, and 30997 is itemType 3 (shoulder).
  //
  // Both set-candidate entries were missing until ticket 165 added the
  // composed-request assertion, which caught it immediately: the fork's
  // mocked lookup said "does not apply" while this repo's real one said it
  // does, so the two engines composed different equipment. The rankings still
  // matched — the harness keys each recording by its own engine's request —
  // which is precisely the blindness ticket 165 exists to close.
  [2986, new Set([30022, SET_CANDIDATE_SHOULDER_ID])],
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
 *
 * Per-seed, per-role offsets, not one flat value: `pairedReplicateSe` (se.ts)
 * needs a real spread of *deltas* (candidate DPS minus baseline DPS) across
 * seeds to distinguish it from a bug that returns 0 on <2 deltas but a wrong
 * constant on ≥2. A single offset shared by baseline and candidate at each
 * seed was tried first and rejected: it shifts both sides by the same
 * amount, so it cancels out of `candidate − baseline` and every delta comes
 * back identical across seeds — `sd(deltas) = 0` by construction, which
 * would make `pairedReplicateSe`'s own `+ 0.001` mutation invisible (it adds
 * to a `0` the test never learns is a coincidence rather than a checked
 * value). `SEED_OFFSET_BY_ROLE` gives baseline and each candidate a
 * *different* per-seed shift instead, so `candidate − baseline` itself
 * varies by seed and the standard deviation `pairedReplicateSe` computes is
 * genuinely nonzero — verified by adding `+ 0.001` to the fork's
 * `pairedReplicateSe` (`vendor/tbc-new-fork/…/engine/se.ts`) and reading the
 * failing diff: `se: 3.0009999999999994` (mutant) vs `2.9999999999999996`
 * (real) on item 29983, and similarly `1.001`/`1` and `0.501`/`0.5` on the
 * other two rows — never `0`/`0.001`, which is what a shared per-seed offset
 * produced before this fix (`.scratch/handoffs/wowsims-tab/slice-2/
 * HANDOFF.md`'s mutation table records both re-runs).
 */
const BASELINE_DPS = 2000;
const BASELINE_STDEV = 120;
const CANDIDATE_DPS = 2050;
const CANDIDATE_STDEV = 118;
const SET_HEAD_DPS = 2040;
const SET_HEAD_STDEV = 119;
const SET_SHOULDER_DPS = 2015;
const SET_SHOULDER_STDEV = 121;
const SET_PACKAGE_DPS = 2075;
const SET_PACKAGE_STDEV = 117;
const SIM_VERSION = "v0.0.101";
const ITERATIONS = 3000;
/**
 * Two distinct seeds — `usesPairedReplication` (se.ts) keys off
 * `seeds.length > 1`. `assertUsableSeeds` (se.ts) rejects repeats, so these
 * must differ; the values themselves are arbitrary the way the original
 * single seed (11) was.
 */
const SEEDS = [11, 22];

/**
 * `role` keys the five DPS series above (`"baseline"`, `"felSteel"`,
 * `"setHead"`, `"setShoulder"`, `"setPackage"`) so each gets its own
 * per-seed shift — see the block comment above for why a shift shared across
 * roles would cancel out of every delta.
 */
const SEED_OFFSET_BY_ROLE: Record<string, Record<number, number>> = {
  baseline: { 11: 0, 22: 3 },
  felSteel: { 11: 0, 22: 9 },
  setHead: { 11: 0, 22: 5 },
  setShoulder: { 11: 0, 22: 2 },
  setPackage: { 11: 0, 22: 11 },
};

function observationFor(
  role: keyof typeof SEED_OFFSET_BY_ROLE,
  seed: number,
  dps: number,
  stdev: number
): SimObservation {
  const offset = SEED_OFFSET_BY_ROLE[role]?.[seed] ?? 0;
  return {
    dps: dps + offset,
    stdev: stdev + offset,
    iterationsDone: ITERATIONS,
    simVersion: SIM_VERSION,
  };
}

/**
 * The engine-agnostic half of both `rankWithThisRepo` and the fork's mirror
 * below: compose every request this test's pool needs (baseline, the
 * socketless swap, each set-completion piece, and the assembled 2pc
 * package) across both `SEEDS`, and record a distinct observation for each.
 * A function of the engine's own module set rather than two independent
 * ~80-line copies, so the two engines' recordings cannot silently drift
 * apart from each other — the one property this whole test exists to check.
 */
async function buildRecordingsAndRun<TRanking>(engine: {
  compose: typeof compose;
  equipmentForCandidateSwap: typeof equipmentForCandidateSwap;
  gemContext: typeof gemContext;
  gemsForPhase: typeof gemsForPhase;
  SIM_ORDER: typeof SIM_ORDER;
  rankUpgrades: (
    input: Parameters<typeof rankUpgrades>[0],
    deps: Parameters<typeof rankUpgrades>[1]
  ) => Promise<TRanking>;
  RecordedGearSource: typeof RecordedGearSource;
  RecordedSimRunner: typeof RecordedSimRunner;
  MemoryStore: typeof MemoryStore;
  simCacheKey: typeof simCacheKey;
}): Promise<{ ranking: TRanking; composedRequests: unknown[] }> {
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

  const gems = engine.gemContext(engine.gemsForPhase(2), epWeights);
  const headIdx = engine.SIM_ORDER.indexOf("head");
  const shoulderIdx = engine.SIM_ORDER.indexOf("shoulder");

  const felSteelEquipment = engine.equipmentForCandidateSwap(
    equipment,
    headIdx,
    CANDIDATE_ITEM_ID,
    gems
  );
  const setHeadEquipment = engine.equipmentForCandidateSwap(
    equipment,
    headIdx,
    SET_CANDIDATE_HEAD_ID,
    gems
  );
  // The assembled 2pc package: both set slots swapped, same sequential
  // apply-one-slot-at-a-time policy `set-value.ts`'s `buildSetBonuses`
  // documents for the real (non-test) path — swap the shoulder first so the
  // head swap below shares its gem-repair starting point with what
  // `selectPackage`/`buildSetBonuses` actually assembles at runtime.
  const setShoulderEquipment = engine.equipmentForCandidateSwap(
    equipment,
    shoulderIdx,
    SET_CANDIDATE_SHOULDER_ID,
    gems
  );
  const setPackageEquipment = engine.equipmentForCandidateSwap(
    setShoulderEquipment,
    headIdx,
    SET_CANDIDATE_HEAD_ID,
    gems
  );

  const recordings = new Map<string, SimObservation>();
  const composedRequests: unknown[] = [];
  for (const seed of SEEDS) {
    const runOpts = { seed, iterations: ITERATIONS };
    const baselineRequest = engine.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment,
    });
    const felSteelRequest = engine.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment: felSteelEquipment,
    });
    const setHeadRequest = engine.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment: setHeadEquipment,
    });
    const setShoulderRequest = engine.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment: setShoulderEquipment,
    });
    const setPackageRequest = engine.compose(skeleton, {
      name: CHAR.name,
      race: "RaceBloodElf",
      equipment: setPackageEquipment,
    });

    // Ticket 165: every recording below is keyed by the engine's OWN
    // composed request, so a mutation inside compose moves the key and the
    // lookup together and cancels out. Capturing the requests here is what
    // lets the caller compare them across engines instead of only comparing
    // rankings that a broken compose can still produce identically.
    composedRequests.push(
      baselineRequest,
      felSteelRequest,
      setHeadRequest,
      setShoulderRequest,
      setPackageRequest
    );

    recordings.set(
      engine.simCacheKey(baselineRequest, SIM_VERSION, runOpts),
      observationFor("baseline", seed, BASELINE_DPS, BASELINE_STDEV)
    );
    recordings.set(
      engine.simCacheKey(felSteelRequest, SIM_VERSION, runOpts),
      observationFor("felSteel", seed, CANDIDATE_DPS, CANDIDATE_STDEV)
    );
    recordings.set(
      engine.simCacheKey(setHeadRequest, SIM_VERSION, runOpts),
      observationFor("setHead", seed, SET_HEAD_DPS, SET_HEAD_STDEV)
    );
    recordings.set(
      engine.simCacheKey(setShoulderRequest, SIM_VERSION, runOpts),
      observationFor("setShoulder", seed, SET_SHOULDER_DPS, SET_SHOULDER_STDEV)
    );
    recordings.set(
      engine.simCacheKey(setPackageRequest, SIM_VERSION, runOpts),
      observationFor("setPackage", seed, SET_PACKAGE_DPS, SET_PACKAGE_STDEV)
    );
  }

  const ranking = await engine.rankUpgrades(
    {
      character: CHAR,
      spec: "ret",
      maxPhase: 2,
      seeds: SEEDS,
      // Parity of the ranked deltas, not of racing: the recordings above are
      // pinned at ITERATIONS only, and a screening pass would ask this runner
      // for keys at DEFAULT_SCREEN_ITERATIONS that it rejects. Both engines
      // take the same path, so the comparison is unaffected — and the port's
      // screening code is covered by its own tests either side.
      fullPool: true,
    },
    {
      gear: new engine.RecordedGearSource({
        fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
        gear: new Map([["abc123|7", logged]]),
      }),
      sim: new engine.RecordedSimRunner(SIM_VERSION, recordings),
      store: new engine.MemoryStore(),
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
        {
          itemId: SET_CANDIDATE_HEAD_ID,
          name: SET_CANDIDATE_HEAD_NAME,
          slot: "head",
          phase: 2,
          source: { kind: "raid", zone: "Karazhan", boss: "Prince Malchezaar" },
        },
        {
          itemId: SET_CANDIDATE_SHOULDER_ID,
          name: SET_CANDIDATE_SHOULDER_NAME,
          slot: "shoulder",
          phase: 2,
          source: { kind: "raid", zone: "Karazhan", boss: "Prince Malchezaar" },
        },
      ],
    }
  );

  return { ranking, composedRequests };
}

/** This repo's own engine, run exactly like rank.test.ts's existing suite. */
async function rankWithThisRepo() {
  return buildRecordingsAndRun({
    compose,
    equipmentForCandidateSwap,
    gemContext,
    gemsForPhase,
    SIM_ORDER,
    rankUpgrades,
    RecordedGearSource,
    RecordedSimRunner,
    MemoryStore,
    simCacheKey,
  });
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
  wornItemIds.add(SET_CANDIDATE_HEAD_ID);
  wornItemIds.add(SET_CANDIDATE_SHOULDER_ID);

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

  // Worn gems union the full phase<=2 palette, not worn gems alone: the set
  // candidates' sockets (data/items/index.json: head [4,1], shoulder [4,4])
  // are empty on the fixture item and must be auto-filled by
  // candidate-gems.ts's real fill logic, which chooses from
  // `gemsForPhase(2)` — the original socketless candidate never exercised
  // this path, so `wornGemIds` alone was enough before ticket 155.
  for (const gem of gems) {
    if (gem.phase <= 2) wornGemIds.add(gem.id);
  }
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
    const { ranking: thisRepoRanking, composedRequests: thisRepoRequests } =
      await rankWithThisRepo();

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

    const { ranking: forkRanking, composedRequests: forkRequests } =
      await buildRecordingsAndRun<Awaited<ReturnType<typeof rankUpgrades>>>({
        compose: forkCompose.compose,
        equipmentForCandidateSwap: forkRank.equipmentForCandidateSwap,
        gemContext: forkCandidateGems.gemContext,
        gemsForPhase: forkGems.gemsForPhase,
        SIM_ORDER: forkSlots.SIM_ORDER,
        rankUpgrades: forkRank.rankUpgrades,
        RecordedGearSource: forkGearSource.RecordedGearSource,
        RecordedSimRunner: forkSimRunner.RecordedSimRunner,
        MemoryStore: forkStore.MemoryStore,
        simCacheKey: forkSimRunner.simCacheKey,
      });

    // Ticket 165: assert the composed requests themselves, BEFORE comparing
    // rankings. Every recording in the harness is keyed by the engine's own
    // composed request, so a mutation confined to composition moves the key
    // and the lookup together and leaves the ranking identical — gem fill,
    // meta repair, enchant carry-over, stat computation and `compose` itself
    // were all invisible here. Comparing the requests is what closes that:
    // it is the only assertion in this file that reads composition directly
    // rather than through an observation the harness chose by role.
    //
    // Verified to bite: truncating the fork compose's equipment to five of
    // seventeen slots passes every other assertion in this file and fails
    // only this one.
    expect(forkRequests.length).toBe(thisRepoRequests.length);
    expect(forkRequests.length).toBeGreaterThan(0);
    expect(forkRequests).toEqual(thisRepoRequests);

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
    // At least one row must actually take the paired-replicate path — a
    // silent fallback to `independent` SE on both engines would still pass
    // the equality checks above (they'd agree on the wrong method) and
    // defeat the reason `SEEDS` has two entries at all.
    expect(
      thisRepoRanking.items.some((i) => i.seMethod === "paired-replicate")
    ).toBe(true);

    // setBonuses: same completion-package synergy on both engines — the
    // uncovered path ticket 155 names (set-bonus.ts, set-value.ts). Proves
    // the 2pc Lightbringer package is actually measured, not merely present.
    expect(thisRepoRanking.setBonuses?.length).toBeGreaterThan(0);
    expect(
      thisRepoRanking.setBonuses?.map((b) => ({
        setId: b.setId,
        threshold: b.threshold,
        packageItemIds: b.packageItemIds,
        packageDeltaDps: b.packageDeltaDps,
        bonusDps: b.bonusDps,
        se: b.se,
        unmeasured: b.unmeasured,
      }))
    ).toEqual(
      forkRanking.setBonuses?.map(
        (b: NonNullable<typeof forkRanking.setBonuses>[number]) => ({
          setId: b.setId,
          threshold: b.threshold,
          packageItemIds: b.packageItemIds,
          packageDeltaDps: b.packageDeltaDps,
          bonusDps: b.bonusDps,
          se: b.se,
          unmeasured: b.unmeasured,
        })
      )
    );
    // Standing assumptions: the disclosure surface is what tells a reader
    // which weights and which omissions produced a shortlist, so a port that
    // drops one is a silent honesty regression, not a cosmetic diff. Compared
    // by id (not detail text) because rank.ts deliberately spells presetId
    // differently on each side. Without this, gutting disclosure.ts entirely
    // still passed E-W3 — found by the adversarial pre-merge review of
    // feat/sweep-tab-tickets, 2026-08-14.
    expect(
      thisRepoRanking.assumptions.standing.map((a) => a.id).sort()
    ).toEqual(
      forkRanking.assumptions.standing.map((a: { id: string }) => a.id).sort()
    );
    expect(thisRepoRanking.assumptions.standing.length).toBeGreaterThan(0);

    // Broadening the pool and seed count (ticket 155) pushed real elapsed
    // time for both engines' dynamic-imported dependency graphs past
    // vitest's 5s default; this is wall-clock reality, not slow test logic.
  }, 30000);
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
