import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compose } from "../src/compose.js";
import { CUTOFF } from "../src/cutoff.js";
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
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { mapWclGearToSim, SIM_ORDER, type WclGearEntry } from "../src/slots.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";

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

    const stages: string[] = [];
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
      },
      (p) => stages.push(p.stage)
    );

    expect(ranking.baseline).toEqual({
      dps: 2042.85,
      stdev: 91.9,
      metaAdjusted: false,
    });
    expect(ranking.cutoff).toEqual(CUTOFF);
    expect(ranking.items).toEqual([]);
    expect(stages).toEqual([
      "resolving",
      "reading-gear",
      "composing",
      "building-pool",
      "simming",
      "simming",
      "ranking",
    ]);
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
    expect(top.source).toEqual({
      kind: "raid",
      zone: "Karazhan",
      boss: "Nightbane",
    });
  });
});
