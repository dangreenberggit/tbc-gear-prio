import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { fillEmptyCandidateGems } from "../src/candidate-gems.js";
import { migrateGemsToItem } from "../src/migrate-gems.js";
import { compose } from "../src/compose.js";
import { CUTOFF } from "../src/cutoff.js";
import { gemsForPhase } from "../src/gems.js";
import { isEnchantable } from "../src/items.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import { repairMeta } from "../src/meta-repair.js";
import { RankError, rankUpgrades } from "../src/rank.js";
import {
  RecordedGearSource,
  type FightSummary,
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
import { MemoryStore } from "../src/seams/store.js";
import {
  mapWclGearToSim,
  SIM_ORDER,
  type SimItemSpec,
  type WclGearEntry,
} from "../src/slots.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

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
function candidateEquipmentForTest(
  equipment: SimItemSpec[],
  slotName: (typeof SIM_ORDER)[number],
  itemId: number,
  maxPhase: 1 | 2 | 3 | 4 | 5,
  epWeights: Record<string, number>
): SimItemSpec[] {
  const slotIndex = SIM_ORDER.indexOf(slotName);
  const palette = gemsForPhase(maxPhase);
  const swapped = equipment.map((spec, i) => {
    if (i !== slotIndex) return spec;
    const sameItem = spec.id === itemId;
    const gems = sameItem
      ? [...(spec.gems ?? [])]
      : fillEmptyCandidateGems(
          itemId,
          migrateGemsToItem(spec.gems ?? [], spec.id ?? 0, itemId),
          palette,
          epWeights
        );
    const out: SimItemSpec = { id: itemId, gems };
    if (spec.enchant && isEnchantable(itemId)) {
      out.enchant = spec.enchant;
    }
    return out;
  });
  const socketed = swapped.map((spec) => ({
    itemId: spec.id ?? 0,
    gems: [...spec.gems],
  }));
  const repaired = repairMeta({ items: socketed, epWeights, palette });
  return swapped.map((spec, i) => {
    const row = repaired.items[i];
    if (!row || !spec.id) return spec;
    return { ...spec, gems: [...row.gems] };
  });
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
        store: new MemoryStore(),
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
