import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemContext } from "../src/candidate-gems.js";
import { compose } from "../src/compose.js";
import { CUTOFF } from "../src/cutoff.js";
import { gemsForPhase } from "../src/gems.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import {
  equipmentForCandidateSwap,
  RankError,
  rankUpgrades,
} from "../src/rank.js";
import {
  CachingGearSource,
  RecordedGearSource,
  type FightSummary,
  type GearSource,
  type LoggedGear,
} from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
} from "../src/seams/sim-runner.js";
import { MemoryStore, type Store } from "../src/seams/store.js";
import {
  mapWclGearToSim,
  SIM_ORDER,
  type SimItemSpec,
  type WclGearEntry,
} from "../src/slots.js";
import type { CharacterRef, FightRef, SpecId } from "../src/types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Accepts writes and forgets them, so every sim request reaches the runner.
 * For tests that inspect the requests rankUpgrades composes; the job half is
 * untouched, so job-row behaviour stays real.
 */
class NonRetainingStore extends MemoryStore {
  override async put(): Promise<void> {}
}

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

function slamaltmanLoggedGear(): LoggedGear {
  const raw = JSON.parse(
    readFileSync(join(root, "test/fixtures/slamaltman.raw.json"), "utf8")
  ) as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{
      sourceID: number;
      gear: WclGearEntry[];
    }>;
  };
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    if (actors.get(ev.sourceID)?.name.toLowerCase() !== "slamaltman") continue;
    const mapped = mapWclGearToSim(ev.gear);
    return {
      items: mapped.map((spec, i) => ({
        id: spec.id ?? 0,
        slot: SIM_ORDER[i]!,
        enchant: spec.enchant,
        gems: spec.gems,
      })),
      talentPointsByTree: [5, 11, 45],
      provenance: {
        reportCode: SUMMARY.reportCode,
        fightId: SUMMARY.fightId,
        sourceID: ev.sourceID,
      },
    };
  }
  throw new Error("slamaltman not found");
}

class CapturingSimRunner implements SimRunner {
  readonly requests: RaidSimRequest[] = [];

  constructor(
    private readonly simVersion: string,
    private readonly recordings: ReadonlyMap<string, SimObservation>
  ) {}

  async version(): Promise<string> {
    return this.simVersion;
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    this.requests.push(req);
    const key = simCacheKey(req, this.simVersion, opts);
    const hit = this.recordings.get(key);
    if (!hit) {
      throw new Error(`no recording for sim key ${key}`);
    }
    return hit;
  }
}

/** Mirror rank.ts candidate swap: migrate gems, fill empties, repair meta. */
/**
 * Thin wrapper over the production swap path — never a reimplementation of it.
 * The previous hand-copy drifted: it called `fillEmptyCandidateGems` without
 * `fillOptsForSwap`, so no test exercised set-wide uniques or meta-aware fill
 * through `rankUpgrades`. Delegating means the expected sim key is derived from
 * the same code the engine runs, so that class of drift cannot recur.
 */
function candidateEquipmentForTest(
  equipment: SimItemSpec[],
  slotName: (typeof SIM_ORDER)[number],
  itemId: number,
  maxPhase: 1 | 2 | 3 | 4 | 5,
  epWeights: Record<string, number>
): SimItemSpec[] {
  return equipmentForCandidateSwap(
    equipment,
    SIM_ORDER.indexOf(slotName),
    itemId,
    gemContext(gemsForPhase(maxPhase), epWeights)
  );
}

describe("CUTOFF", () => {
  it("pins the five-seed derived constant", () => {
    expect(CUTOFF).toEqual({ absDps: 3.4, pct: 0.15 });
  });
});

describe("rankUpgrades", () => {
  it("throws no-qualifying-fight when nothing is recorded", async () => {
    await expect(
      rankUpgrades(
        { character: CHAR, spec: "ret", maxPhase: 2 },
        {
          gear: new RecordedGearSource({
            fights: new Map(),
            gear: new Map(),
          }),
          sim: new RecordedSimRunner("v0.0.101", new Map()),
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
        }
      )
    ).rejects.toMatchObject({
      name: "RankError",
      kind: "no-qualifying-fight",
    } satisfies Partial<RankError>);
  });

  it("sims the composed slamaltman baseline and reports metaAdjusted", async () => {
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const request = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const key = simCacheKey(request, "v0.0.101", opts);

    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceHuman",
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim: new RecordedSimRunner(
          "v0.0.101",
          new Map([
            [
              key,
              {
                dps: 2042.85,
                stdev: 91.9,
                iterationsDone: 3000,
                simVersion: "v0.0.101",
              },
            ],
          ])
        ),
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
      }
    );

    expect(ranking.baseline).toEqual({
      dps: 2042.85,
      stdev: 91.9,
      metaAdjusted: false,
    });
    expect(ranking.cutoff).toEqual(CUTOFF);
    expect(ranking.items).toEqual([]);
    expect(ranking.assumptions.standing.map((s) => s.id)).toEqual([
      "race",
      "talents-apl-buffs-consumes-encounter",
      "professions-excluded",
      "weapon-imbue-omitted",
    ]);
    expect(ranking.assumptions.race).toBe("RaceHuman");
    expect(ranking.substitutions).toEqual([]);

    // §4 makes caps required, and it must describe the gear that was actually
    // simmed — a real geared ret carries hit, so a 0 here means the sum never
    // reached the item stats rather than that this player has no hit.
    expect(ranking.caps.hit.rating).toBeGreaterThan(0);
    expect(Math.round(ranking.caps.hit.capRating)).toBe(142);
    expect(ranking.caps.hit.gap).toBeCloseTo(
      ranking.caps.hit.capRating - ranking.caps.hit.rating,
      6
    );
    expect(ranking.caps.hit.assumedRace).toBe("RaceHuman");
    expect(ranking.caps.expertise.rating).toBeGreaterThanOrEqual(0);
  });

  it("defaults race from the raid-sim skeleton when RankInput.race is omitted", async () => {
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const request = compose(skeleton, {
      name: "slamaltman",
      race: "RaceBloodElf",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const key = simCacheKey(request, "v0.0.101", opts);

    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim: new RecordedSimRunner(
          "v0.0.101",
          new Map([
            [
              key,
              {
                dps: 2003.26,
                stdev: 91.9,
                iterationsDone: 3000,
                simVersion: "v0.0.101",
              },
            ],
          ])
        ),
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
      }
    );

    expect(ranking.assumptions.race).toBe("RaceBloodElf");
    expect(ranking.baseline.dps).toBe(2003.26);
  });

  it("ranks a single-item neck swap by deltaDps against the baseline", async () => {
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const baselineReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(baselineReq, "v0.0.101", opts);

    const upgradedEquipment = equipment.map((spec, i) =>
      SIM_ORDER[i] === "neck" ? { id: 29381, gems: [] as number[] } : spec
    );
    const upgradedReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment: upgradedEquipment,
    });
    const upgradedKey = simCacheKey(upgradedReq, "v0.0.101", opts);

    const pool = [
      {
        itemId: 29381,
        name: "Choker of Vile Intent",
        slot: "neck" as const,
        phase: 1,
        source: { kind: "raid" as const, zone: "Karazhan", boss: "Nightbane" },
      },
    ];

    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceHuman",
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim: new RecordedSimRunner(
          "v0.0.101",
          new Map([
            [
              baselineKey,
              {
                dps: 2042.85,
                stdev: 91.9,
                iterationsDone: 3000,
                simVersion: "v0.0.101",
              },
            ],
            [
              upgradedKey,
              {
                dps: 2050.0,
                stdev: 92.0,
                iterationsDone: 3000,
                simVersion: "v0.0.101",
              },
            ],
          ])
        ),
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool,
      }
    );

    expect(ranking.items).toHaveLength(1);
    const top = ranking.items[0]!;
    expect(top.itemId).toBe(29381);
    expect(top.deltaDps).toBeCloseTo(7.15, 5);
    expect(top.rank).toBe(1);
    expect(top.belowCutoff).toBe(false);
    expect(top.seMethod).toBe("independent");
    expect(top.se).toBeCloseTo(92.0 / Math.sqrt(3000), 5);
    expect(top.source).toEqual({
      kind: "raid",
      zone: "Karazhan",
      boss: "Nightbane",
    });
  });

  it("auto-repairs an inactive meta and discloses it as a run substitution", async () => {
    // The gate box wants the repair *and* its disclosure proven through
    // rankUpgrades. repairMeta and substitutionsFromMetaRepair are each unit
    // tested, but that pair passing says nothing about whether the engine
    // actually wires one to the other.
    //
    // Same lever as meta-repair.test.ts: the chest's two orange gems are the
    // whole yellow count, so recolouring them red makes the meta inactive.
    const logged = slamaltmanLoggedGear();
    const chest = logged.items.find((it) => it.id === 30129)!;
    expect(chest.gems).toEqual([24027, 24058, 24058]);
    chest.gems = [24027, 24027, 24027];

    // The composed request is whatever the repair produces, so the recorded
    // runner is keyed off the request rankUpgrades builds rather than one
    // guessed here — an AnySimRunner keeps the test about disclosure.
    let composed: RaidSimRequest | undefined;
    const sim: SimRunner = {
      version: async () => "v0.0.101",
      run: async (req) => {
        composed = req;
        return {
          dps: 2000,
          stdev: 90,
          iterationsDone: 3000,
          simVersion: "v0.0.101",
        };
      },
    };

    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceHuman",
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
      }
    );

    expect(composed).toBeDefined();
    expect(ranking.baseline.metaAdjusted).toBe(true);

    // Disclosed as a this-run substitution, not silently swallowed.
    const repair = ranking.substitutions.find(
      (s) => s.field === "gems.meta-repair"
    );
    expect(repair).toBeDefined();
    expect(repair!.detail).toContain("Meta inactive");
    expect(repair!.detail).toMatch(/\d+→\d+@item \d+/);

    // And it is a run substitution rather than a standing assumption — the
    // two tiers must not blur (§9 R7).
    expect(ranking.assumptions.standing.map((s) => s.id)).not.toContain(
      "gems.meta-repair"
    );
  });

  it("flags a hit-only gain as hitDriven, and never a loss", async () => {
    // Romulo's Poison Vial is the only item in the P2 universe whose stats are
    // 100% melee hit rating, which makes it the honest fixture for this flag.
    // Driven through rankUpgrades rather than asserted on isHitDriven alone:
    // the unit test proves the predicate, this proves it is actually wired to
    // a real stat delta. A first cut flagged this same item at Δ-44.70 as a
    // "gain", so both directions are asserted here.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(
      compose(skeleton, { name: "slamaltman", race: "RaceHuman", equipment }),
      "v0.0.101",
      opts
    );

    const pool = [
      {
        itemId: 28579,
        name: "Romulo's Poison Vial",
        slot: "trinket" as const,
        phase: 2,
        source: { kind: "raid" as const, zone: "Karazhan", boss: "Opera" },
      },
    ];

    async function rankWith(candidateDps: number) {
      const sims = new Map([
        [
          baselineKey,
          {
            dps: 2000,
            stdev: 90,
            iterationsDone: 3000,
            simVersion: "v0.0.101",
          },
        ],
      ]);
      // Trinket is a paired slot: key both placements so whichever the engine
      // picks is recorded, rather than depending on which one it tries first.
      for (const slot of ["trinket1", "trinket2"] as const) {
        const swapped = equipment.map((spec, i) =>
          SIM_ORDER[i] === slot ? { id: 28579, gems: [] as number[] } : spec
        );
        sims.set(
          simCacheKey(
            compose(skeleton, {
              name: "slamaltman",
              race: "RaceHuman",
              equipment: swapped,
            }),
            "v0.0.101",
            opts
          ),
          {
            dps: candidateDps,
            stdev: 90,
            iterationsDone: 3000,
            simVersion: "v0.0.101",
          }
        );
      }
      return rankUpgrades(
        {
          character: CHAR,
          spec: "ret",
          maxPhase: 2,
          iterations: 3000,
          seeds: [42],
          race: "RaceHuman",
        },
        {
          gear: new RecordedGearSource({
            fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
            gear: new Map([["abc123|7", logged]]),
          }),
          sim: new RecordedSimRunner("v0.0.101", sims),
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
          pool,
        }
      );
    }

    // slamaltman sits well under the cap, so a pure-hit gain must be flagged.
    const gain = await rankWith(2050);
    expect(gain.caps.hit.gap).toBeGreaterThan(0);
    expect(gain.items[0]!.deltaDps).toBeGreaterThan(0);
    expect(gain.items[0]!.hitDriven).toBe(true);

    const loss = await rankWith(1955.3);
    expect(loss.items[0]!.deltaDps).toBeLessThan(0);
    expect(loss.items[0]!.hitDriven).toBeUndefined();
  });

  it("returns identical deltas for the same seed and recordings", async () => {
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const baselineReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(baselineReq, "v0.0.101", opts);
    const upgradedEquipment = equipment.map((spec, i) =>
      SIM_ORDER[i] === "neck" ? { id: 29381, gems: [] as number[] } : spec
    );
    const upgradedKey = simCacheKey(
      compose(skeleton, {
        name: "slamaltman",
        race: "RaceHuman",
        equipment: upgradedEquipment,
      }),
      "v0.0.101",
      opts
    );
    const pool = [
      {
        itemId: 29381,
        name: "Choker of Vile Intent",
        slot: "neck" as const,
        phase: 1,
        source: { kind: "badge" as const, cost: 25 },
      },
      {
        itemId: 30102,
        name: "Krakken-Heart Breastplate",
        slot: "chest" as const,
        phase: 2,
        source: {
          kind: "raid" as const,
          zone: "Magtheridon's Lair",
          boss: "Magtheridon",
        },
      },
    ];
    const deps = {
      gear: new RecordedGearSource({
        fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
        gear: new Map([["abc123|7", logged]]),
      }),
      sim: new RecordedSimRunner(
        "v0.0.101",
        new Map([
          [
            baselineKey,
            {
              dps: 2042.85,
              stdev: 91.9,
              iterationsDone: 3000,
              simVersion: "v0.0.101",
            },
          ],
          [
            upgradedKey,
            {
              dps: 2050.0,
              stdev: 92.0,
              iterationsDone: 3000,
              simVersion: "v0.0.101",
            },
          ],
        ])
      ),
      store: new MemoryStore(),
      clock: () => new Date("2026-07-26T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    };
    const input = {
      character: CHAR,
      spec: "ret" as const,
      maxPhase: 1 as const,
      iterations: 3000,
      seeds: [42],
      race: "RaceHuman" as const,
    };

    const a = await rankUpgrades(input, deps);
    const b = await rankUpgrades(input, deps);
    expect(a.items.map((i) => [i.itemId, i.deltaDps])).toEqual(
      b.items.map((i) => [i.itemId, i.deltaDps])
    );
    // maxPhase 1 must drop the phase-2 chest even though it is in the pool file.
    expect(a.items.map((i) => i.itemId)).toEqual([29381]);
  });

  describe("the ranking cache", () => {
    /** Counts runs so "without spawning a sim" is asserted, not assumed. */
    class CountingSimRunner implements SimRunner {
      runs = 0;
      constructor(private readonly inner: SimRunner) {}
      version(): Promise<string> {
        return this.inner.version();
      }
      run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
        this.runs += 1;
        return this.inner.run(req, opts);
      }
    }

    /** Counts WCL gear reads so "zero reads" is asserted, not assumed. */
    class CountingGearSource implements GearSource {
      reads = 0;
      constructor(private readonly inner: GearSource) {}
      findFights(c: CharacterRef, spec: SpecId): Promise<FightSummary[]> {
        return this.inner.findFights(c, spec);
      }
      readGear(f: FightRef): Promise<LoggedGear> {
        this.reads += 1;
        return this.inner.readGear(f);
      }
    }

    const cachePool = [
      {
        itemId: 29381,
        name: "Choker of Vile Intent",
        slot: "neck" as const,
        phase: 1,
        source: { kind: "badge" as const, cost: 25 },
      },
    ];

    /**
     * Answers any request rather than replaying pinned keys: these tests vary
     * gear and iterations on purpose, so a key-matched recording would fail
     * for the wrong reason. Deltas are irrelevant here — only the run count is
     * asserted.
     */
    function respondingSim(): SimRunner {
      return {
        version: async () => "v0.0.101",
        run: async (_req: RaidSimRequest, opts: SimRunOpts) => ({
          dps: 2042.85,
          stdev: 91.9,
          iterationsDone: opts.iterations,
          simVersion: "v0.0.101",
        }),
      };
    }

    function cacheDeps(gear: LoggedGear = slamaltmanLoggedGear()) {
      const sim = new CountingSimRunner(respondingSim());
      return {
        sim,
        deps: {
          gear: new RecordedGearSource({
            fights: new Map([
              ["US|dreamscythe|slamaltman|ret", [SUMMARY]],
              ["US|dreamscythe|someoneelse|ret", [SUMMARY]],
            ]),
            gear: new Map([["abc123|7", gear]]),
          }),
          sim: sim as SimRunner,
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
          pool: cachePool,
        },
      };
    }

    const input = {
      character: CHAR,
      spec: "ret" as const,
      maxPhase: 1 as const,
      iterations: 3000,
      seeds: [42],
      race: "RaceHuman" as const,
    };

    it("serves the second identical call from the store without simming", async () => {
      const { sim, deps } = cacheDeps();

      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;
      expect(afterFirst).toBeGreaterThan(0);

      const second = await rankUpgrades(input, deps);
      expect(sim.runs).toBe(afterFirst);
      expect(second).toEqual(first);
      expect(second.contentHash).toBe(first.contentHash);
    });

    it("reports no simming stage on a cache hit and ends on ranking", async () => {
      // PLAN.md §4 line 161 says a hit fires onProgress *once*. That assumed a
      // hash computable before any I/O; hashing the logged gear (ADR-0019)
      // means a hit still resolves and reads gear, so those stages fire. What
      // the caller is actually promised — no sim, and a terminal event to
      // close a progress view — is what this asserts. Amended in ADR-0019.
      const { deps } = cacheDeps();
      await rankUpgrades(input, deps);

      const stages: string[] = [];
      await rankUpgrades(input, deps, (p) => stages.push(p.stage));
      expect(stages).not.toContain("simming");
      expect(stages.at(-1)).toBe("ranking");
    });

    it("re-sims when a hashed input changes", async () => {
      const { sim, deps } = cacheDeps();
      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;

      const second = await rankUpgrades({ ...input, iterations: 2000 }, deps);
      expect(sim.runs).toBeGreaterThan(afterFirst);
      expect(second.contentHash).not.toBe(first.contentHash);
    });

    it("re-sims when the logged gear changes but the character does not", async () => {
      // The stale-ranking regression: same character and same request, a
      // re-gemmed set. A hash that missed gear would serve the old numbers.
      const { sim, deps } = cacheDeps();
      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;

      const base = slamaltmanLoggedGear();
      const regemmed: LoggedGear = {
        ...base,
        items: base.items.map((item, i) =>
          i === 0 ? { ...item, gems: [24028, 24028] } : item
        ),
      };
      // Same store and same counting runner — only the gear differs, so a
      // hash that ignored gems would hit the first entry and run nothing.
      const regemmedDeps = {
        ...deps,
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", regemmed]]),
        }),
      };

      const second = await rankUpgrades(input, regemmedDeps);
      expect(sim.runs).toBeGreaterThan(afterFirst);
      expect(second.contentHash).not.toBe(first.contentHash);
    });

    it("re-sims when the sim skeleton changes under an unchanged presetId", async () => {
      // presetId is a module constant, so an edited skeleton — buffs,
      // encounter duration, APL — would otherwise hash identically. This
      // repo measured stripping prepullActions at 789.02 DPS against a
      // 2042.85 baseline (docs/verification-log.md), so a stale hit here
      // serves a 61%-wrong answer with no error anywhere.
      const { sim, deps } = cacheDeps();
      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;

      const edited = {
        ...deps,
        raidSimSkeleton: {
          ...skeleton,
          encounter: { ...(skeleton.encounter ?? {}), duration: 999 },
        },
      };
      const second = await rankUpgrades(input, edited);
      expect(sim.runs).toBeGreaterThan(afterFirst);
      expect(second.contentHash).not.toBe(first.contentHash);
    });

    it("re-sims when a candidate is re-slotted but keeps its item id", async () => {
      // `slot` picks the sim slots the swap is tried in, so it changes the
      // deltas. A pool regeneration that corrects a mis-slotted item must
      // not be served the old numbers.
      const { sim, deps } = cacheDeps();
      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;

      const reslotted = {
        ...deps,
        pool: cachePool.map((e) => ({ ...e, slot: "finger" as const })),
      };
      const second = await rankUpgrades(input, reslotted);
      expect(sim.runs).toBeGreaterThan(afterFirst);
      expect(second.contentHash).not.toBe(first.contentHash);
    });

    it("fetches gear once across runs whose ranking hash differs", async () => {
      // The gate box's "hits cache" half, at the level where WCL points are
      // actually spent (ticket 01 scope 1). The identical-re-run case above
      // returns at the ranking cache before gear is consulted, so it passes
      // with no gear cache at all — only a *hash miss* reaches the gear read
      // and can tell the two apart. maxPhase moves the hash while leaving the
      // resolved fight, and so the snapshot, identical.
      const { deps } = cacheDeps();
      const fetches = new CountingGearSource(deps.gear);
      const counted = {
        ...deps,
        gear: new CachingGearSource(fetches, deps.store, CHAR, "ret"),
      };

      await rankUpgrades(input, counted);
      expect(fetches.reads).toBe(1);

      await rankUpgrades({ ...input, maxPhase: 2 as const }, counted);
      expect(fetches.reads).toBe(1);
    });

    it("reuses a cached sim result when only the candidate pool grows", async () => {
      // The sim-result cache (ticket 01 scope 2, PLAN.md §11's "a sim result
      // for a given request + version can never change"). Adding a candidate
      // changes the ranking hash, so the whole run re-executes — but the
      // baseline request and the first candidate's request are byte-identical
      // to the first run's, and must be served from kv rather than re-simmed.
      const { sim, deps } = cacheDeps();
      const first = await rankUpgrades(input, deps);
      const afterFirst = sim.runs;

      const grown = {
        ...deps,
        pool: [
          ...cachePool,
          {
            itemId: 28530,
            name: "Mithril Band of the Unscarred",
            slot: "finger" as const,
            phase: 1,
            source: { kind: "badge" as const, cost: 25 },
          },
        ],
      };
      const second = await rankUpgrades(input, grown);

      // Two new sims: the added ring is tried in finger1 and finger2. The
      // baseline and the neck candidate are cache hits. Without the sim
      // cache this is afterFirst + 4.
      expect(sim.runs).toBe(afterFirst + 2);

      // The "deltas stable" half of the gate box, and the half with teeth: the
      // neck candidate was served from kv rather than re-simmed, so if the
      // cache returned a mismatched observation — a key collision, a lossy
      // round-trip — every number on this row would move and the run-count
      // assertion above would still pass.
      const before = first.items.find((i) => i.itemId === 29381);
      const after = second.items.find((i) => i.itemId === 29381);
      expect(after).toEqual(before);
    });

    it("reports a failing cache read as internal, not as a sim failure", async () => {
      // A failing kv read is not a failing sim. Inside the wowsimcli-panic
      // catch it would push a simSkips row blaming the sim, drop the item, and
      // return a ranking one place short with no error at all; inside the
      // baseline's catch it would surface as `sim-failed` and send an operator
      // to the wrong subsystem.
      class UnreadableStore extends MemoryStore {
        override async get<T>(key: string): Promise<T | undefined> {
          if (key.startsWith("sim:")) throw new Error("kv read exploded");
          return super.get<T>(key);
        }
      }
      const { deps } = cacheDeps();
      await expect(
        rankUpgrades(input, { ...deps, store: new UnreadableStore() })
      ).rejects.toMatchObject({
        name: "RankError",
        kind: "internal",
      } satisfies Partial<RankError>);
    });

    it("errors the job row when the run throws after the row is created", async () => {
      // Ticket 29: once the Phase 2 job API attaches to a `running` row, a
      // stranded one is a job that never finishes and never fails, so the
      // caller waits forever. `equipmentForCandidateSwap`'s meta-unsolvable
      // throw escapes by this same route.
      class ExplodingBlobStore extends MemoryStore {
        override async put(): Promise<void> {
          throw new Error("blob write exploded");
        }
      }
      const store = new ExplodingBlobStore();
      const deps = { ...cacheDeps().deps, store };

      // The original failure must survive, not be replaced by whatever the
      // error path does on its way out.
      await expect(rankUpgrades(input, deps)).rejects.toThrow(
        "blob write exploded"
      );

      const row = await store.job.read("job_1");
      expect(row?.status).toBe("error");
      expect(row?.errorDetail).toBe("blob write exploded");
      // A store fault is not a sim fault. Labelling it `sim-failed` sends an
      // operator to the wrong subsystem.
      expect(row?.errorKind).toBe("internal");
    });

    it("keeps the original error when the store cannot record the failure", async () => {
      // The invariant is best-effort, not absolute: if the store itself is
      // broken it cannot write its own tombstone. What must not happen is the
      // bookkeeping error masking the real one.
      // Only the *error-path* update fails. The `running` update before the
      // try must still succeed, or the run never reaches the code under test.
      const inner = new MemoryStore();
      let updates = 0;
      const store: Store = {
        get: (k) => inner.get(k),
        put: async () => {
          throw new Error("blob write exploded");
        },
        job: {
          create: (i) => inner.job.create(i),
          read: (id) => inner.job.read(id),
          update: async (id, patch) => {
            updates += 1;
            if (updates > 1) throw new Error("job table is on fire");
            return inner.job.update(id, patch);
          },
        },
      };
      const deps = { ...cacheDeps().deps, store };

      await expect(rankUpgrades(input, deps)).rejects.toThrow(
        "blob write exploded"
      );
    });

    it("does not collide across characters", async () => {
      const { deps } = cacheDeps();
      const mine = await rankUpgrades(input, deps);
      const theirs = await rankUpgrades(
        { ...input, character: { ...CHAR, name: "someoneelse" } },
        deps
      );
      expect(theirs.contentHash).not.toBe(mine.contentHash);
    });
  });

  it("maxPhase changes the candidate set and the gem palette together", async () => {
    // PLAN.md §14 Phase 1 gate: one character, two maxPhase values, both axes
    // diffed in one place. Gem axis note — every gem phase 2 adds (32634-32639)
    // is EP-dominated by a phase-1 gem of its colour under ret P2 weights, so
    // no socketed item in data/items/index.json fills differently at 1 vs 2.
    // The palette move is therefore asserted on gemsForPhase directly, and the
    // socketed candidate below pins what the palette actually produced.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(
      compose(skeleton, {
        name: "slamaltman",
        race: "RaceHuman",
        equipment,
      }),
      "v0.0.101",
      opts
    );

    const neckId = 29381; // phase 1 — in the candidate set at both maxPhases
    const chestId = 30101; // phase 2 — only survives filterPoolByPhase at 2
    const chestIdx = SIM_ORDER.indexOf("chest");

    const neckKey = simCacheKey(
      compose(skeleton, {
        name: "slamaltman",
        race: "RaceHuman",
        equipment: equipment.map((spec, i) =>
          SIM_ORDER[i] === "neck" ? { id: neckId, gems: [] as number[] } : spec
        ),
      }),
      "v0.0.101",
      opts
    );
    const chestKey = simCacheKey(
      compose(skeleton, {
        name: "slamaltman",
        race: "RaceHuman",
        equipment: candidateEquipmentForTest(
          equipment,
          "chest",
          chestId,
          2,
          epWeights
        ),
      }),
      "v0.0.101",
      opts
    );

    const obs = (dps: number) => ({
      dps,
      stdev: 92.0,
      iterationsDone: 3000,
      simVersion: "v0.0.101",
    });

    const pool = [
      {
        itemId: neckId,
        name: "Choker of Vile Intent",
        slot: "neck" as const,
        phase: 1,
        source: { kind: "badge" as const, cost: 25 },
      },
      {
        itemId: chestId,
        name: "Bloodsea Brigand's Vest",
        slot: "chest" as const,
        phase: 2,
        source: {
          kind: "raid" as const,
          zone: "Serpentshrine Cavern",
          boss: "Lady Vashj",
        },
      },
    ];

    const runAt = async (maxPhase: 1 | 2) => {
      const sim = new CapturingSimRunner(
        "v0.0.101",
        new Map([
          [baselineKey, obs(2042.85)],
          [neckKey, obs(2050.0)],
          [chestKey, obs(2075.0)],
        ])
      );
      const ranking = await rankUpgrades(
        {
          character: CHAR,
          spec: "ret",
          maxPhase,
          iterations: 3000,
          seeds: [42],
          race: "RaceHuman",
        },
        {
          gear: new RecordedGearSource({
            fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
            gear: new Map([["abc123|7", logged]]),
          }),
          sim,
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
          pool,
        }
      );
      return { ranking, sim };
    };

    const at1 = await runAt(1);
    const at2 = await runAt(2);

    // Axis 1 — candidate set.
    const ids1 = at1.ranking.items.map((i) => i.itemId);
    const ids2 = at2.ranking.items.map((i) => i.itemId);
    expect(ids1).not.toEqual(ids2);
    expect(ids1).toEqual([neckId]);
    expect(ids2).toEqual([chestId, neckId]);
    expect(ids1).not.toContain(chestId);
    expect(ids2).toContain(chestId);

    // Axis 2 — gem palette. Phase 2 admits six gems phase 1 does not.
    const palette1 = gemsForPhase(1).map((g) => g.id);
    const palette2 = gemsForPhase(2).map((g) => g.id);
    expect(palette2).not.toEqual(palette1);
    expect(palette2.filter((id) => !palette1.includes(id))).toEqual([
      32634, 32635, 32636, 32637, 32638, 32639,
    ]);
    for (const id of [32634, 32635, 32636, 32637, 32638, 32639]) {
      expect(palette1).not.toContain(id);
    }

    // The maxPhase-2 palette is what socketed the phase-2 candidate: every gem
    // the fill placed must be admissible at 2 and none may be a later phase.
    const chestReq = at2.sim.requests.find((req) => {
      const items =
        (
          req.raid as {
            parties: Array<{
              players: Array<{
                equipment: { items: Array<{ id: number; gems: number[] }> };
              }>;
            }>;
          }
        ).parties[0]?.players[0]?.equipment.items ?? [];
      return items[chestIdx]?.id === chestId;
    });
    expect(chestReq).toBeDefined();
    const chestGems =
      (
        chestReq!.raid as {
          parties: Array<{
            players: Array<{
              equipment: { items: Array<{ id: number; gems: number[] }> };
            }>;
          }>;
        }
      ).parties[0]?.players[0]?.equipment.items[chestIdx]?.gems ?? [];
    expect(chestGems.length).toBeGreaterThan(0);
    for (const id of chestGems) {
      expect(palette2).toContain(id);
    }
  });

  it("maxPhase 2 vs 3 moves the palette all the way into the sim request", async () => {
    // The 1->2 case above proves the two axes are wired to the same maxPhase,
    // but phase 2's six additions are all EP-dominated by phase-1 gems, so the
    // fill output is identical and the palette move never reaches the request.
    // Phase 3's epic gems do win, so this is where "the gem palette changed"
    // is observable end to end rather than asserted on gemsForPhase alone.
    //
    // The candidate must also leave the fill something to do: the rank path is
    // migrate-then-fill-empties, so a candidate whose sockets the worn gems
    // fully cover never consults the palette. Slamaltman's worn boots (30081)
    // are ungemmed, so every socket on the candidate arrives empty.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(
      compose(skeleton, { name: "slamaltman", race: "RaceHuman", equipment }),
      "v0.0.101",
      opts
    );

    const bootId = 30104; // phase 2 — in the candidate set at both 2 and 3
    const bootIdx = SIM_ORDER.indexOf("feet");
    expect(equipment[bootIdx]!.gems ?? []).toEqual([]);
    const gemsAt = (maxPhase: 2 | 3) =>
      simCacheKey(
        compose(skeleton, {
          name: "slamaltman",
          race: "RaceHuman",
          equipment: candidateEquipmentForTest(
            equipment,
            "feet",
            bootId,
            maxPhase,
            epWeights
          ),
        }),
        "v0.0.101",
        opts
      );

    const obs = (dps: number) => ({
      dps,
      stdev: 92.0,
      iterationsDone: 3000,
      simVersion: "v0.0.101",
    });

    const pool = [
      {
        itemId: bootId,
        name: "Cobra-Lash Boots",
        slot: "feet" as const,
        phase: 2,
        source: {
          kind: "raid" as const,
          zone: "Serpentshrine Cavern",
          boss: "Lady Vashj",
        },
      },
    ];

    const socketedBootGems = async (maxPhase: 2 | 3) => {
      const sim = new CapturingSimRunner(
        "v0.0.101",
        new Map([
          [baselineKey, obs(2042.85)],
          [gemsAt(maxPhase), obs(2075.0)],
        ])
      );
      await rankUpgrades(
        {
          character: CHAR,
          spec: "ret",
          maxPhase,
          iterations: 3000,
          seeds: [42],
          race: "RaceHuman",
        },
        {
          gear: new RecordedGearSource({
            fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
            gear: new Map([["abc123|7", logged]]),
          }),
          sim,
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
          pool,
        }
      );
      const req = sim.requests.find((r) => {
        const items =
          (
            r.raid as {
              parties: Array<{
                players: Array<{
                  equipment: { items: Array<{ id: number; gems: number[] }> };
                }>;
              }>;
            }
          ).parties[0]?.players[0]?.equipment.items ?? [];
        return items[bootIdx]?.id === bootId;
      });
      expect(req).toBeDefined();
      return (
        (
          req!.raid as {
            parties: Array<{
              players: Array<{
                equipment: { items: Array<{ id: number; gems: number[] }> };
              }>;
            }>;
          }
        ).parties[0]?.players[0]?.equipment.items[bootIdx]?.gems ?? []
      );
    };

    const gems2 = await socketedBootGems(2);
    const gems3 = await socketedBootGems(3);

    expect(gems2.length).toBeGreaterThan(0);
    expect(gems3.length).toBe(gems2.length);
    // Same item, same character, same seed — only maxPhase differs, and the
    // gems the engine actually sent to the sim are different.
    expect(gems3).not.toEqual(gems2);

    const palette2 = gemsForPhase(2).map((g) => g.id);
    const palette3 = gemsForPhase(3).map((g) => g.id);
    for (const id of gems2) expect(palette2).toContain(id);
    for (const id of gems3) expect(palette3).toContain(id);
    // At least one placed gem is one phase 3 unlocked.
    expect(gems3.some((id) => !palette2.includes(id))).toBe(true);
  });

  it("migrates worn gems onto socketed candidates before simming", async () => {
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    // Not currently worn — waist is Endless Pit with gems that should migrate.
    const beltId = 30106; // Belt of One-Hundred Deaths
    const waistIdx = SIM_ORDER.indexOf("waist");
    const wornWaistGems = [...(equipment[waistIdx]!.gems ?? [])];
    expect(wornWaistGems.some((id) => id > 0)).toBe(true);

    const upgradedEquipment = candidateEquipmentForTest(
      equipment,
      "waist",
      beltId,
      3,
      epWeights
    );
    expect(upgradedEquipment[waistIdx]!.gems.length).toBeGreaterThan(0);
    expect(upgradedEquipment[waistIdx]!.gems.every((id) => id > 0)).toBe(true);
    // At least one worn gem should survive onto the new belt (UI-style migrate).
    expect(
      upgradedEquipment[waistIdx]!.gems.some((id) => wornWaistGems.includes(id))
    ).toBe(true);

    const baselineReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const upgradedReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment: upgradedEquipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(baselineReq, "v0.0.101", opts);
    const upgradedKey = simCacheKey(upgradedReq, "v0.0.101", opts);

    const sim = new CapturingSimRunner(
      "v0.0.101",
      new Map([
        [
          baselineKey,
          {
            dps: 2042.85,
            stdev: 91.9,
            iterationsDone: 3000,
            simVersion: "v0.0.101",
          },
        ],
        [
          upgradedKey,
          {
            dps: 2060.0,
            stdev: 93.0,
            iterationsDone: 3000,
            simVersion: "v0.0.101",
          },
        ],
      ])
    );

    const pool = [
      {
        itemId: beltId,
        name: "Belt of One-Hundred Deaths",
        slot: "waist" as const,
        phase: 2,
        source: {
          kind: "raid" as const,
          zone: "Serpentshrine Cavern",
          boss: "Lady Vashj",
        },
      },
    ];

    await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 3,
        iterations: 3000,
        seeds: [42],
        race: "RaceHuman",
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool,
      }
    );

    expect(sim.requests).toHaveLength(2);
    const candidateReq = sim.requests[1]!;
    const items =
      (
        candidateReq.raid as {
          parties: Array<{
            players: Array<{
              equipment: { items: Array<{ id: number; gems: number[] }> };
            }>;
          }>;
        }
      ).parties[0]?.players[0]?.equipment.items ?? [];
    const waistItem = items[waistIdx]!;
    expect(waistItem.id).toBe(beltId);
    expect(waistItem.gems.length).toBeGreaterThan(0);
    expect(waistItem.gems.every((id) => id > 0)).toBe(true);
  });

  it("preserves worn gems when ranking an already-equipped item", async () => {
    // Diagnosis: .scratch/handoffs/same-item-delta-diagnosis.md —
    // re-filling Gizmatic wiped Relentless Earthstorm and simmed −35 DPS.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const headIdx = SIM_ORDER.indexOf("head");
    const headId = equipment[headIdx]!.id!;
    const wornGems = [...(equipment[headIdx]!.gems ?? [])];
    expect(headId).toBe(32461);
    expect(wornGems).toEqual([32409, 24054]);

    const baselineReq = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(baselineReq, "v0.0.101", opts);
    const obs = {
      dps: 2042.85,
      stdev: 91.9,
      iterationsDone: 3000,
      simVersion: "v0.0.101",
    };

    const sim = new CapturingSimRunner(
      "v0.0.101",
      new Map([[baselineKey, obs]])
    );

    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds: [42],
        race: "RaceHuman",
      },
      {
        gear: new RecordedGearSource({
          fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
          gear: new Map([["abc123|7", logged]]),
        }),
        sim,
        // This candidate is byte-identical to the baseline (asserted below),
        // so the sim cache would serve it and leave the runner nothing to
        // inspect. Under test here is what rankUpgrades composes, not caching.
        store: new NonRetainingStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool: [
          {
            itemId: headId,
            name: "Furious Gizmatic Goggles",
            slot: "head",
            phase: 2,
            source: {
              kind: "raid",
              zone: "Tempest Keep",
              boss: "Void Reaver",
            },
          },
        ],
      }
    );

    // Same-item candidate must reuse the baseline request (identical gems).
    expect(sim.requests).toHaveLength(2);
    expect(simCacheKey(sim.requests[1]!, "v0.0.101", opts)).toBe(baselineKey);
    const items =
      (
        sim.requests[1]!.raid as {
          parties: Array<{
            players: Array<{
              equipment: { items: Array<{ id: number; gems: number[] }> };
            }>;
          }>;
        }
      ).parties[0]?.players[0]?.equipment.items ?? [];
    expect(items[headIdx]!.gems).toEqual(wornGems);
    expect(ranking.items).toHaveLength(1);
    expect(ranking.items[0]!.owned).toBe(true);
    expect(ranking.items[0]!.deltaDps).toBe(0);
  });
});
