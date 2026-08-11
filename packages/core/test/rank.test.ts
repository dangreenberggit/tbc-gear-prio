import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemContext } from "../src/candidate-gems.js";
import { compose } from "../src/compose.js";
import { CUTOFF } from "../src/cutoff.js";
import { gemsForPhase, getGem } from "../src/gems.js";
import { Stat } from "../src/stats.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import {
  equipmentForCandidateSwap,
  RankError,
  rankUpgrades,
} from "../src/rank.js";
import { pairedReplicateSe } from "../src/se.js";
import { applyView } from "../src/view.js";
import { realPoolEntry } from "./real-source.js";
import {
  CachingGearSource,
  RecordedGearSource,
  type FightSummary,
  type GearSource,
  type LoggedGear,
  type LoggedItem,
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

  it("refuses to rank a fight whose talents classify as another spec", async () => {
    // carry-forward 61 / ticket 04's first capture: slamaltman has a
    // protection night (0/44/17) in the same report. Ranking it as ret sims
    // tank gear against ret's preset and EP weights and returns a confident,
    // wrong list — PLAN.md's stated worst case. Refuse instead.
    const logged = slamaltmanLoggedGear();
    logged.className = "Paladin";
    logged.talentPointsByTree = [0, 44, 17];

    await expect(
      rankUpgrades(
        { character: CHAR, spec: "ret", maxPhase: 2 },
        {
          gear: new RecordedGearSource({
            fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
            gear: new Map([["abc123|7", logged]]),
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
      kind: "spec-mismatch",
    } satisfies Partial<RankError>);
  });

  it("names the tree it read rather than leaking a raw index", async () => {
    // A player reading "reads as tree 1" learns nothing. Holy also covers the
    // treeIndex-0 arm, which the protection test above does not reach.
    const logged = slamaltmanLoggedGear();
    logged.className = "Paladin";
    logged.talentPointsByTree = [45, 11, 5];

    await expect(
      rankUpgrades(
        { character: CHAR, spec: "ret", maxPhase: 2 },
        {
          gear: new RecordedGearSource({
            fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
            gear: new Map([["abc123|7", logged]]),
          }),
          sim: new RecordedSimRunner("v0.0.101", new Map()),
          store: new MemoryStore(),
          clock: () => new Date("2026-07-26T12:00:00.000Z"),
          raidSimSkeleton: skeleton,
          epWeights,
        }
      )
    ).rejects.toThrow(/Holy build, not ret \(talents 45\/11\/5\)/);
  });

  it("does not refuse a feral druid, whose tree cannot name a spec by talents alone", async () => {
    // Feral cat and feral tank are the same 45-point tree, so classifySpec
    // returns needs-form-uptime. That is undecided, not a mismatch — refusing
    // here would make the guard reject every druid it was never meant to
    // judge. Guards against the obvious over-strict reading of ticket 61.
    const logged = slamaltmanLoggedGear();
    logged.className = "Druid";
    logged.talentPointsByTree = [0, 45, 16];

    const equipment = equipmentFromLoggedGear(logged);
    const request = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const key = simCacheKey(request, "v0.0.101", {
      seed: 42,
      iterations: 3000,
    });

    await expect(
      rankUpgrades(
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
                  dps: 1000,
                  stdev: 10,
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
      )
    ).resolves.toBeDefined();
  });

  it("ranks when the class is unknown rather than refusing on missing data", async () => {
    // A source that cannot supply a class must degrade to "cannot classify",
    // not to "mismatch" — treating absent data as a mismatch would refuse
    // every character on any adapter that omits subType.
    const logged = slamaltmanLoggedGear();
    delete logged.className;
    logged.talentPointsByTree = [0, 44, 17];

    const equipment = equipmentFromLoggedGear(logged);
    const request = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment,
    });
    const opts = { seed: 42, iterations: 3000 };
    const key = simCacheKey(request, "v0.0.101", opts);

    await expect(
      rankUpgrades(
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
                  dps: 1000,
                  stdev: 10,
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
      )
    ).resolves.toBeDefined();
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

    // carry-forward 33's third criterion, finally pinned end to end (it was
    // closed on a synthetic additivity test): slamaltman's gear alone reads
    // 72, and the preset's 3/3 Precision carries the total to ~119 of the
    // ~142 cap. Independent source of truth: 72 is the ticket's own measured
    // gear figure, 47.31 = 3 × PHYSICAL_HIT_RATING_PER_HIT_PERCENT.
    expect(ranking.caps.hit.rating).toBeCloseTo(119.31, 1);
    // carry-forward 60: and that 3/3 is the *preset's*, not slamaltman's, so
    // the cap must say it assumed rather than read it.
    expect(ranking.caps.hit.talentHitAssumed).toEqual({
      talent: "Precision",
      points: 3,
      maxPoints: 3,
    });
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

    const pool = [realPoolEntry(29381)];

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
    expect(top.source).toEqual(pool[0]!.source);
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

    const pool = [realPoolEntry(28579)];

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

  it("flags an upgrade that costs hit while under the cap", async () => {
    // carry-forward 47 §2, from slamaltman's real run: the report banners a
    // hit gap, then recommends Razor-Scale Battlecloak (33 str / 23 agi / 22
    // sta, no hit) over Drape of the Dark Reavers (which carries 17), moving
    // him further from the cap the same page just flagged. `isHitDriven` sums
    // only positive deltas, so it could never describe this — driven through
    // rankUpgrades to prove the annotation is wired to a real stat delta and
    // not just to the predicate.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const backIndex = SIM_ORDER.indexOf("back");
    const wornBack = equipment[backIndex]!.id;
    const opts = { seed: 42, iterations: 3000 };
    const sims = new Map([
      [
        simCacheKey(
          compose(skeleton, {
            name: "slamaltman",
            race: "RaceHuman",
            equipment,
          }),
          "v0.0.101",
          opts
        ),
        { dps: 2000, stdev: 90, iterationsDone: 3000, simVersion: "v0.0.101" },
      ],
    ]);
    // Built through the engine's own swap so the cache key matches: a
    // hand-built layout skips gem fill and meta repair, and the recorded sim
    // is then never found.
    const swapped = candidateEquipmentForTest(
      equipment,
      "back",
      30098,
      2,
      epWeights
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
      { dps: 2050, stdev: 90, iterationsDone: 3000, simVersion: "v0.0.101" }
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
        sim: new RecordedSimRunner("v0.0.101", sims),
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool: [realPoolEntry(30098)],
      }
    );

    // The fixture only means anything if the worn cloak really carries hit and
    // the candidate really does not — otherwise this would pass vacuously.
    expect(wornBack).not.toBe(30098);
    const row = ranking.items[0]!;
    expect(ranking.caps.hit.gap).toBeGreaterThan(0);
    expect(row.deltaDps).toBeGreaterThan(0);
    expect(row.hitDriven).toBeUndefined();
    expect(row.hitRegression?.lost).toBeGreaterThan(0);
    expect(row.hitRegression?.gapAfter).toBe(
      ranking.caps.hit.gap + row.hitRegression!.lost
    );
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
    const pool = [realPoolEntry(29381), realPoolEntry(30102)];
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

  it("never ranks a worn ring as a gain by duplicating it into the other finger", async () => {
    // Carry-forward 46, found by sme-rank-review on two characters at once.
    // slamaltman wears Ring of a Thousand Marks (28757) in finger1 and the
    // stronger Shapeshifter's Signet (30834) in finger2. Both fingers are
    // tried and the best swap wins, so the engine happily placed a *second*
    // copy of 30834 over the weaker finger1 ring and sold the result as a
    // +22.40 DPS upgrade for a ring already on his hand. The game does not
    // allow two copies; the only honest number for a worn item is 0.
    //
    // The recordings below deliberately make the duplicate lucrative: if the
    // engine ever swaps into finger1 again, it scores +50 and this fails.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(
      compose(skeleton, { name: "slamaltman", race: "RaceHuman", equipment }),
      "v0.0.101",
      opts
    );

    const sims = new Map([
      [
        baselineKey,
        { dps: 2000, stdev: 90, iterationsDone: 3000, simVersion: "v0.0.101" },
      ],
    ]);
    for (const slot of ["finger1", "finger2"] as const) {
      const swapped = candidateEquipmentForTest(
        equipment,
        slot,
        30834,
        2,
        epWeights
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
          // finger2 is where he already wears it: an identity swap, so 0.
          // finger1 is the duplicate the engine must never price.
          dps: slot === "finger2" ? 2000 : 2050,
          stdev: 90,
          iterationsDone: 3000,
          simVersion: "v0.0.101",
        }
      );
    }

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
        sim: new RecordedSimRunner("v0.0.101", sims),
        store: new MemoryStore(),
        clock: () => new Date("2026-07-26T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool: [
          {
            itemId: 30834,
            name: "Shapeshifter's Signet",
            slot: "finger" as const,
            phase: 2,
            source: {
              kind: "rep" as const,
              faction: "The Sha'tar",
              standing: "Exalted",
            },
          },
        ],
      }
    );

    const worn = ranking.items.find((i) => i.itemId === 30834);
    expect(worn).toBeDefined();
    expect(worn!.owned).toBe(true);
    expect(worn!.deltaDps).toBe(0);
    expect(worn!.slotChoice).toBe("finger2");
    expect(worn!.belowCutoff).toBe(true);
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
          // Synthetic id (999999): only the slot and run-count matter here,
          // and 28530 is a real neck item (carry-forward 37) — a fixture
          // naming a real id must match its universe row or use one that
          // names nothing real, not invent a badge ring the pipeline never
          // produced.
          {
            itemId: 999999,
            name: "Test Ring",
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

    const pool = [realPoolEntry(neckId), realPoolEntry(chestId)];

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

  it("maxPhase 3 leaves auto-filled gems rare-capped in the sim request (ticket 111)", async () => {
    // This test used to assert the opposite: that phase 3's epic gems win the
    // fill, making maxPhase observable end to end. That behaviour WAS ticket
    // 111's defect — the unconstrained fill priced epics the player owns
    // nowhere. Under the rarity cap, phase 3 unlocks only epic gems
    // ((quality,phase) counts: the sole (3,x>2) rares are phase 5), so the P2
    // and P3 fills must now be identical, and every auto-filled gem rare or
    // below — asserted here at the seam, on the request the engine sims.
    //
    // The candidate must leave the fill something to do: the rank path is
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

    const pool = [realPoolEntry(bootId, "ret-p3")];

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
    // Same item, same character, same seed — raising maxPhase to 3 no longer
    // changes the fill, because its only unlocks are epics the cap refuses.
    expect(gems3).toEqual(gems2);

    const palette2 = gemsForPhase(2).map((g) => g.id);
    for (const id of gems3) {
      expect(id).toBeGreaterThan(0);
      expect(palette2).toContain(id);
      expect(getGem(id)?.quality).toBeLessThanOrEqual(3);
    }
  });

  it("maxPhase still reaches the fill: phase-5 rares appear only at maxPhase 5 (ticket 111)", async () => {
    // Compensates for the rare-cap test above, whose fills are identical at 2
    // and 3 by design — alone it would also pass if the engine ignored
    // maxPhase entirely. The palette's only rares above phase 2 are the three
    // phase-5 jewels (35315/35316/35318), and 35315 is the sole gem of any
    // rarity carrying spell haste (stat 14), so under haste-leaning weights a
    // maxPhase 5 run must fill it where a maxPhase 2 run cannot — proving the
    // input's maxPhase flows through gemContext into the simmed request.
    const hasteWeights = {
      [String(Stat.StatSpellHasteRating)]: 1,
      [String(Stat.StatStrength)]: 0.01,
    };
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const opts = { seed: 42, iterations: 3000 };
    const baselineKey = simCacheKey(
      compose(skeleton, { name: "slamaltman", race: "RaceHuman", equipment }),
      "v0.0.101",
      opts
    );
    const bootId = 30104;
    const bootIdx = SIM_ORDER.indexOf("feet");
    const gemsAt = (maxPhase: 2 | 5) =>
      simCacheKey(
        compose(skeleton, {
          name: "slamaltman",
          race: "RaceHuman",
          equipment: candidateEquipmentForTest(
            equipment,
            "feet",
            bootId,
            maxPhase,
            hasteWeights
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
    const pool = [realPoolEntry(bootId, "ret-p3")];

    const socketedBootGems = async (maxPhase: 2 | 5) => {
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
          epWeights: hasteWeights,
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
    const gems5 = await socketedBootGems(5);

    expect(gems2.length).toBeGreaterThan(0);
    expect(gems5).not.toEqual(gems2);
    expect(gems5).toContain(35315);
    expect(gems2).not.toContain(35315);
    // Both sides stay under the rarity cap — maxPhase widens the phase axis
    // only, never the quality one.
    for (const id of [...gems2, ...gems5]) {
      expect(getGem(id)?.quality).toBeLessThanOrEqual(3);
    }
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

    const pool = [realPoolEntry(beltId)];

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
        pool: [realPoolEntry(headId)],
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

/**
 * Paired-replicate SE (PLAN.md §10, Phase 2).
 *
 * Driven through `rankUpgrades` rather than only against `pairedReplicateSe`,
 * because the arithmetic passing says nothing about the two things that make
 * the method correct here: that each seed's baseline and candidate are simmed
 * under *that same seed*, and that only the top 8 pay the 5× cost.
 */
describe("rankUpgrades paired-replicate SE", () => {
  const SEEDS = [11, 22, 33, 44, 55];

  /**
   * DPS as a function of (which item sits in `neck`, seed). Deterministic and
   * seed-dependent, which is what lets the test assert a *specific* SE: a
   * runner that ignored the seed would return sd = 0 and pass a weaker
   * assertion while hiding the pairing bug this exists to catch.
   */
  function neckIdOf(req: RaidSimRequest): number {
    const items = (
      req.raid as {
        parties: Array<{
          players: Array<{
            equipment: { items: Array<{ id?: number }> };
          }>;
        }>;
      }
    ).parties[0]?.players[0]?.equipment.items;
    return items?.[SIM_ORDER.indexOf("neck")]?.id ?? 0;
  }

  /** Baseline DPS wobbles per seed; each candidate adds its own fixed gain. */
  const BASELINE_BY_SEED: Record<number, number> = {
    11: 2000,
    22: 2010,
    33: 1990,
    44: 2020,
    55: 1980,
  };

  /** Slamaltman's worn neck in the fixture — the baseline's own item. */
  const WORN_NECK_ID = 30022;

  /**
   * Per-seed gain for the item under test, so sd(deltas) is non-zero.
   *
   * The mean (36) is deliberately *not* seed 11's draw (40). An earlier
   * version of this fixture averaged to exactly the first seed's value, which
   * made `deltaDps: firstSeedDraw` and `deltaDps: mean(deltas)` numerically
   * identical — the test passed either way and hid a real defect.
   */
  const NECK_GAIN_BY_SEED: Record<number, number> = {
    11: 40,
    22: 44,
    33: 26,
    44: 50,
    55: 20,
  };

  class SeedAwareSimRunner implements SimRunner {
    readonly calls: Array<{ neckId: number; seed: number }> = [];

    async version(): Promise<string> {
      return "v0.0.101";
    }

    async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
      const neckId = neckIdOf(req);
      const seed = opts.seed;
      this.calls.push({ neckId, seed });
      const base = BASELINE_BY_SEED[seed] ?? 2000;
      // Every pool candidate must clear the cutoff (3.4 DPS), because
      // replication is spent on the top of the *shortlist* — a pool of
      // below-cutoff rows would correctly get no replication at all and the
      // top-8 boundary would go untested. Descending by id so the ordering is
      // determinate, with 29381 (the item under test) on top and seed-varying.
      // The worn neck composes the baseline request and must gain nothing —
      // it is the reference every delta is measured against.
      const gain =
        neckId === 29381
          ? (NECK_GAIN_BY_SEED[seed] ?? 0)
          : neckId >= 900001 && neckId <= 900008
            ? 25 - (neckId - 900001)
            : 0;
      return {
        dps: base + gain,
        stdev: 90,
        iterationsDone: 3000,
        simVersion: "v0.0.101",
      };
    }
  }

  /**
   * Nine neck candidates, so "top 8 only" has a ninth row to exclude. 29381
   * is real (Choker of Vile Intent) and mechanically significant — it is
   * "the item under test" the seed-varying gain above keys off. The other
   * eight only need to be distinct neck candidates that are not the worn
   * item, so they use a synthetic id block (900001-900008) rather than real
   * ids with an invented source (carry-forward 37) — none of 30017-30025
   * used previously named a neck item that could plausibly share this fake
   * "Karazhan / Nightbane" source anyway.
   *
   * None may be slamaltman's worn neck (30022): a candidate sharing the worn
   * id composes the same request as the baseline, which would make the two
   * indistinguishable in `sim.calls` and quietly weaken the pairing test below.
   */
  function neckPool() {
    const synthetic = [
      900001, 900002, 900003, 900004, 900005, 900006, 900007, 900008,
    ];
    return [
      realPoolEntry(29381),
      ...synthetic.map((itemId, i) => ({
        itemId,
        name: `neck-${i}`,
        slot: "neck" as const,
        phase: 1,
        source: { kind: "raid" as const, zone: "Karazhan", boss: "Nightbane" },
      })),
    ];
  }

  async function rankWithSeeds(seeds: number[], sim: SimRunner) {
    const logged = slamaltmanLoggedGear();
    return rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
        seeds,
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
        pool: neckPool(),
      }
    );
  }

  it("marks the top 8 paired-replicate and leaves the rest independent", async () => {
    const ranking = await rankWithSeeds(SEEDS, new SeedAwareSimRunner());

    expect(ranking.items).toHaveLength(9);
    const methods = ranking.items.map((i) => i.seMethod);
    expect(methods.slice(0, 8)).toEqual(Array(8).fill("paired-replicate"));
    expect(methods[8]).toBe("independent");
  });

  it("derives the top item's SE from sd(deltas) over the five seeds", async () => {
    const ranking = await rankWithSeeds(SEEDS, new SeedAwareSimRunner());

    const top = ranking.items.find((i) => i.itemId === 29381)!;
    expect(top.seMethod).toBe("paired-replicate");

    // The deltas the engine must have measured: candidate minus baseline at
    // the *same* seed. Pairing across different seeds would fold the baseline
    // wobble into the spread and give a visibly larger SE.
    const deltas = SEEDS.map((s) => NECK_GAIN_BY_SEED[s]!);
    expect(top.se).toBeCloseTo(pairedReplicateSe(deltas), 10);
    expect(top.se).toBeGreaterThan(0);
  });

  it("sims each replicated candidate against a baseline sharing its seed", async () => {
    const sim = new SeedAwareSimRunner();
    await rankWithSeeds(SEEDS, sim);

    // For every seed a replicated candidate was run under, the *baseline* was
    // run under that same seed too. This is the property that makes the deltas
    // paired rather than two independent draws.
    //
    // The baseline is identified as the worn neck — not as "anything that is
    // not the candidate". The nine pool candidates are all `neckId !== 29381`
    // too, so that weaker test would pass even if the baseline were never
    // re-simmed at all, as long as some other candidate happened to run.
    const poolIds = new Set(neckPool().map((e) => e.itemId));
    const candidateSeeds = new Set(
      sim.calls.filter((c) => c.neckId === 29381).map((c) => c.seed)
    );
    const baselineSeeds = new Set(
      sim.calls.filter((c) => !poolIds.has(c.neckId)).map((c) => c.seed)
    );
    expect([...candidateSeeds].sort((a, b) => a - b)).toEqual(SEEDS);
    expect(baselineSeeds.size).toBeGreaterThan(0);
    for (const seed of candidateSeeds) {
      expect(baselineSeeds.has(seed)).toBe(true);
    }
  });

  it("keeps independent SE and one seed's worth of sims for a single seed", async () => {
    const sim = new SeedAwareSimRunner();
    const ranking = await rankWithSeeds([42], sim);

    expect(ranking.items.every((i) => i.seMethod === "independent")).toBe(true);
    expect(new Set(sim.calls.map((c) => c.seed))).toEqual(new Set([42]));
    const top = ranking.items.find((i) => i.itemId === 29381)!;
    expect(top.se).toBeCloseTo(90 / Math.sqrt(3000), 10);
  });

  /**
   * §10 Phase 2 is only a real method if a caller who passes no seeds gets it.
   * It shipped implemented, tested and *unreachable*: `DEFAULT_SEEDS` was a
   * single seed, so `usesPairedReplication` was false on every production run
   * and `replicateTopItems` returned at its first line. Every other test in
   * this block passes `seeds` explicitly and so could not see that. This one
   * omits `seeds` on purpose — that is the whole point of it.
   */
  it("replicates the top items when the caller passes no seeds", async () => {
    const sim = new SeedAwareSimRunner();
    const logged = slamaltmanLoggedGear();
    const ranking = await rankUpgrades(
      {
        character: CHAR,
        spec: "ret",
        maxPhase: 2,
        iterations: 3000,
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
        pool: neckPool(),
      }
    );

    const top = ranking.items.find((i) => i.itemId === 29381)!;
    expect(top.seMethod).toBe("paired-replicate");
    expect(ranking.assumptions.seeds.length).toBeGreaterThan(1);
    expect(new Set(ranking.assumptions.seeds).size).toBe(
      ranking.assumptions.seeds.length
    );
  });

  /**
   * The point estimate and its error bar must describe the same thing. An SE
   * built from five deltas describes the *mean* of those five, so leaving
   * `deltaDps` at the first seed's draw would attach a confidence interval to
   * a number centred somewhere else.
   */
  it("reports the replicated mean as deltaDps, not the first seed's draw", async () => {
    const ranking = await rankWithSeeds(SEEDS, new SeedAwareSimRunner());
    const top = ranking.items.find((i) => i.itemId === 29381)!;

    const deltas = SEEDS.map((s) => NECK_GAIN_BY_SEED[s]!);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    expect(top.deltaDps).toBeCloseTo(mean, 10);
    // 40 is seed 11's draw. The fixture is chosen so the two differ.
    expect(mean).not.toBe(NECK_GAIN_BY_SEED[11]);
    expect(top.deltaPct).toBeCloseTo((mean / ranking.baseline.dps) * 100, 10);
  });

  it("orders and ranks on the replicated deltas, not the pre-replication ones", async () => {
    const ranking = await rankWithSeeds(SEEDS, new SeedAwareSimRunner());
    const deltas = ranking.items.map((i) => i.deltaDps);
    expect([...deltas].sort((a, b) => b - a)).toEqual(deltas);

    const above = ranking.items.filter((i) => !i.belowCutoff);
    expect(above.map((i) => i.rank)).toEqual(above.map((_, idx) => idx + 1));
  });

  /**
   * §10 spends replication on the contested top of the *shortlist*. A
   * positional slice over the whole sorted list would burn the entire 5×
   * budget on rows the cutoff hides and the default CLI view never prints.
   */
  it("does not spend replication on below-cutoff rows", async () => {
    class FlatRunner extends SeedAwareSimRunner {
      override async run(
        req: RaidSimRequest,
        opts: SimRunOpts
      ): Promise<SimObservation> {
        await super.run(req, opts);
        // Every candidate lands 1 DPS up — under the 3.4 cutoff.
        const neckId = neckIdOf(req);
        const base = BASELINE_BY_SEED[opts.seed] ?? 2000;
        const isCandidate =
          neckId !== WORN_NECK_ID && neckId > 0 && neckId !== 0;
        return {
          dps: base + (isCandidate ? 1 : 0),
          stdev: 90,
          iterationsDone: 3000,
          simVersion: "v0.0.101",
        };
      }
    }

    const ranking = await rankWithSeeds(SEEDS, new FlatRunner());
    expect(ranking.items.every((i) => i.belowCutoff)).toBe(true);
    expect(ranking.items.every((i) => i.seMethod === "independent")).toBe(true);
  });

  it("rejects five identical seeds as internal rather than reporting SE 0", async () => {
    // The artifact this guards: a shared seed repeats bit-identical, so
    // sd(deltas) is 0 and the SE reads as precision that was never measured.
    await expect(
      rankWithSeeds([42, 42, 42, 42, 42], new SeedAwareSimRunner())
    ).rejects.toMatchObject({
      name: "RankError",
      kind: "internal",
    } satisfies Partial<RankError>);

    await expect(
      rankWithSeeds([42, 42, 42, 42, 42], new SeedAwareSimRunner())
    ).rejects.toThrow(/42/);
  });

  /**
   * Ticket 39 (`.scratch/carry-forward/issues/39-belowcutoff-derived-twice-untested.md`):
   * `rank.ts` sets `RankedItem.belowCutoff` and `applyView` copies it onto
   * `ViewRow.belowCutoffInView` (ADR-0020 settled that the view carries rather
   * than re-derives it). Nothing had driven a `Ranking` through `rankUpgrades`
   * itself and checked the two still agree — the view.test.ts coverage for
   * this builds `Ranking` fixtures by hand, so it never touches the one place
   * `belowCutoff` gets written twice: once from the first seed's delta, again
   * from the paired-replicate mean.
   */
  it("keeps belowCutoffInView equal to the ranking's own belowCutoff through paired replication", async () => {
    // Seed 11 (seeds[0]) drives the pre-replication belowCutoff. The rest of
    // the neck pool (see `neckPool`/`SeedAwareSimRunner`) gains 17-25 DPS at
    // every seed, so 29381 needs a seed-11 gain above the pool's floor (17) to
    // land in the replicated top 8 at all; 26 clears both that floor and
    // CUTOFF.absDps (3.4), so this item starts life above cutoff. The other
    // four seeds draw a small gain whose 5-seed mean falls back under 3.4 —
    // this is the row ticket 39 asks for, one that crosses the cutoff
    // *because of* replication rather than agreeing with it by construction.
    const SEED11_GAIN = 26;
    const OTHER_SEED_GAIN = -5.0;
    class CrossingRunner extends SeedAwareSimRunner {
      override async run(
        req: RaidSimRequest,
        opts: SimRunOpts
      ): Promise<SimObservation> {
        const neckId = neckIdOf(req);
        if (neckId !== 29381) return super.run(req, opts);
        this.calls.push({ neckId, seed: opts.seed });
        const base = BASELINE_BY_SEED[opts.seed] ?? 2000;
        const gain = opts.seed === 11 ? SEED11_GAIN : OTHER_SEED_GAIN;
        return {
          dps: base + gain,
          stdev: 90,
          iterationsDone: 3000,
          simVersion: "v0.0.101",
        };
      }
    }

    const ranking = await rankWithSeeds(SEEDS, new CrossingRunner());
    const crossed = ranking.items.find((i) => i.itemId === 29381)!;

    // Prove the fixture actually exercises the crossing this test is named
    // for, not just "some row is below cutoff somewhere".
    expect(crossed.seMethod).toBe("paired-replicate");
    const mean =
      [
        SEED11_GAIN,
        OTHER_SEED_GAIN,
        OTHER_SEED_GAIN,
        OTHER_SEED_GAIN,
        OTHER_SEED_GAIN,
      ].reduce((a, b) => a + b, 0) / 5;
    expect(crossed.deltaDps).toBeCloseTo(mean, 10);
    expect(crossed.deltaDps).toBeLessThan(CUTOFF.absDps);
    expect(crossed.belowCutoff).toBe(true);

    const byId = new Map(ranking.items.map((i) => [i.itemId, i.belowCutoff]));
    const { rows } = applyView(ranking);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.belowCutoffInView).toBe(byId.get(row.itemId));
    }
  });
});

describe("rankUpgrades — set-bonus prospective value (Slice B)", () => {
  // Justicar Battlegear (setId 626): 2pc is not-implemented-in-sim, 4pc is
  // implemented (verification.md V1). Four pieces, all in data/universes/ret-p2.
  const HEAD_ID = 29073;
  const SHOULDER_ID = 29075;
  const HANDS_ID = 29072;
  const LEGS_ID = 29074;
  const SET_BONUS_X = 40; // synthetic 4pc bonus magnitude

  /**
   * Responds to every sim request with `baseline + individual item deltas
   * (via a per-item table) + X when equipment holds >=4 Justicar pieces`.
   * Deterministic and self-contained: no recordings to key, so the same
   * fixture works across seeds/iterations without a keyed map.
   */
  function justicarRespondingSim(opts?: {
    perItemDelta?: Record<number, number>;
    failOnPackage?: boolean;
  }): SimRunner {
    const perItemDelta = opts?.perItemDelta ?? {};
    return {
      version: async () => "v0.0.101",
      run: async (req: RaidSimRequest, runOpts: SimRunOpts) => {
        const items =
          (
            req.raid as {
              parties: Array<{
                players: Array<{
                  equipment: { items: Array<{ id: number }> };
                }>;
              }>;
            }
          ).parties[0]?.players[0]?.equipment.items ?? [];
        const ids = items.map((i) => i.id);
        const justicarCount = [HEAD_ID, SHOULDER_ID, HANDS_ID, LEGS_ID].filter(
          (id) => ids.includes(id)
        ).length;

        let dps = 2000;
        for (const id of ids) {
          dps += perItemDelta[id] ?? 0;
        }
        if (justicarCount >= 4) {
          if (opts?.failOnPackage) {
            throw new Error("synthetic package sim failure");
          }
          dps += SET_BONUS_X;
        }
        return {
          dps,
          stdev: 90,
          iterationsDone: runOpts.iterations,
          simVersion: "v0.0.101",
        };
      },
    };
  }

  const justicarPool = [
    realPoolEntry(HEAD_ID),
    realPoolEntry(SHOULDER_ID),
    realPoolEntry(HANDS_ID),
    realPoolEntry(LEGS_ID),
  ];

  const input = {
    character: CHAR,
    spec: "ret" as const,
    maxPhase: 2 as const,
    iterations: 3000,
    seeds: [42],
    race: "RaceHuman" as const,
  };

  function depsWith(sim: SimRunner, pool = justicarPool) {
    const logged = slamaltmanLoggedGear();
    return {
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
    };
  }

  // Finding 7: with every candidate's individual delta at 0, Σ singles is 0
  // and bonusDps collapses to packageDeltaDps — the subtraction the whole
  // feature rests on is never exercised. Nonzero per-item deltas force it.
  const PER_ITEM_DELTAS = {
    [HEAD_ID]: 5,
    [SHOULDER_ID]: 3,
    [HANDS_ID]: 2,
    [LEGS_ID]: 4,
  };
  const SUM_SINGLES = Object.values(PER_ITEM_DELTAS).reduce((a, b) => a + b, 0);

  it("records a measured SetBonusValue whose bonusDps equals packageDelta minus the singles", async () => {
    const ranking = await rankUpgrades(
      input,
      depsWith(justicarRespondingSim({ perItemDelta: PER_ITEM_DELTAS }))
    );

    expect(ranking.setBonuses).toBeDefined();
    const fourPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 4
    );
    expect(fourPc).toBeDefined();
    expect(fourPc!.unmeasured).toBeUndefined();
    // packageDeltaDps = Σ singles + SET_BONUS_X (the synthetic fixture adds
    // both); bonusDps must subtract Σ singles back out, proving the
    // subtraction actually ran rather than netting to packageDeltaDps.
    expect(fourPc!.packageDeltaDps).toBeCloseTo(SUM_SINGLES + SET_BONUS_X, 6);
    expect(fourPc!.bonusDps).toBeCloseTo(SET_BONUS_X, 6);
    expect(fourPc!.bonusDps).not.toBeCloseTo(fourPc!.packageDeltaDps, 6);
    expect(fourPc!.bonusDps).toBeCloseTo(
      fourPc!.packageDeltaDps - SUM_SINGLES,
      6
    );
    expect(fourPc!.packageItemIds.sort()).toEqual(
      [HEAD_ID, SHOULDER_ID, HANDS_ID, LEGS_ID].sort()
    );

    const twoPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 2
    );
    expect(twoPc).toBeDefined();
    expect(twoPc!.unmeasured).toBe("not-implemented-in-sim");
    expect(twoPc!.bonusDps).toBeUndefined();
  });

  it("gives a crossing candidate crossesThreshold true and no prospective bonus", async () => {
    // Player already wears 3 Justicar pieces; the 4th candidate's own swap
    // crosses the 4pc threshold, so its deltaDps already includes the bonus.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const wornEquipment = candidateEquipmentForTest(
      candidateEquipmentForTest(
        candidateEquipmentForTest(equipment, "head", HEAD_ID, 2, epWeights),
        "shoulder",
        SHOULDER_ID,
        2,
        epWeights
      ),
      "hands",
      HANDS_ID,
      2,
      epWeights
    );
    const wornLogged: LoggedGear = {
      ...logged,
      items: wornEquipment.map((spec, i) => {
        const item: LoggedItem = {
          id: spec.id ?? 0,
          slot: SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
    };

    const gear = new RecordedGearSource({
      fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
      gear: new Map([["abc123|7", wornLogged]]),
    });

    const ranking = await rankUpgrades(input, {
      ...depsWith(justicarRespondingSim()),
      gear,
      pool: [realPoolEntry(LEGS_ID)],
    });

    const legsRow = ranking.items.find((i) => i.itemId === LEGS_ID);
    expect(legsRow).toBeDefined();
    expect(legsRow!.setContext).toBeDefined();
    expect(legsRow!.setContext!.crossesThreshold).toBe(true);
    expect(legsRow!.setContext!.prospectiveBonusDps).toBeUndefined();
    // The crossing swap's own deltaDps already carries the bonus.
    expect(legsRow!.deltaDps).toBeGreaterThan(SET_BONUS_X - 1);
  });

  it("gives a below-threshold candidate a prospectiveBonusDps equal to the matching SetBonusValue", async () => {
    // Full pool so the package can actually be built (4 pieces needed for
    // 4pc); the head candidate alone still only reaches 1 piece worn, well
    // below the 4pc threshold, so it should carry the prospective value
    // rather than cross it.
    const ranking = await rankUpgrades(
      input,
      depsWith(justicarRespondingSim())
    );

    const fourPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 4
    );
    expect(fourPc?.bonusDps).toBeDefined();

    const headRow = ranking.items.find((i) => i.itemId === HEAD_ID);
    expect(headRow).toBeDefined();
    expect(headRow!.setContext).toBeDefined();
    expect(headRow!.setContext!.crossesThreshold).toBe(false);
    expect(headRow!.setContext!.prospectiveBonusDps).toBeCloseTo(
      fourPc!.bonusDps!,
      6
    );
  });

  it("computes nextThreshold from piecesAfterSwap, not piecesWornBefore (finding 3)", async () => {
    // Player wears 1 Justicar piece (head); the shoulder candidate's swap
    // takes them to 2 worn. 2pc is not-implemented-in-sim, so the nearest
    // *measurable* threshold above piecesAfterSwap=2 is 4pc, not 2pc — using
    // piecesWornBefore=1 would wrongly land on 2pc (still unimplemented) or
    // otherwise mis-point the "needs N more" arithmetic.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const wornEquipment = candidateEquipmentForTest(
      equipment,
      "head",
      HEAD_ID,
      2,
      epWeights
    );
    const wornLogged: LoggedGear = {
      ...logged,
      items: wornEquipment.map((spec, i) => {
        const item: LoggedItem = {
          id: spec.id ?? 0,
          slot: SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
    };
    const gear = new RecordedGearSource({
      fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
      gear: new Map([["abc123|7", wornLogged]]),
    });

    const ranking = await rankUpgrades(input, {
      ...depsWith(justicarRespondingSim()),
      gear,
      pool: [
        realPoolEntry(SHOULDER_ID),
        realPoolEntry(HANDS_ID),
        realPoolEntry(LEGS_ID),
      ],
    });

    const shoulderRow = ranking.items.find((i) => i.itemId === SHOULDER_ID);
    expect(shoulderRow).toBeDefined();
    expect(shoulderRow!.setContext).toBeDefined();
    expect(shoulderRow!.setContext!.piecesWornBefore).toBe(1);
    expect(shoulderRow!.setContext!.piecesAfterSwap).toBe(2);
    expect(shoulderRow!.setContext!.nextThreshold).toBe(4);
  });

  it("gives an already-worn set piece no prospectiveBonusDps (its swap advances nothing)", async () => {
    // Player wears the Justicar head; offering that same head back as a
    // candidate is a swap for itself — piecesAfterSwap === piecesWornBefore,
    // so it moves the player no closer to the 4pc it would otherwise advertise.
    const logged = slamaltmanLoggedGear();
    const equipment = equipmentFromLoggedGear(logged);
    const wornEquipment = candidateEquipmentForTest(
      equipment,
      "head",
      HEAD_ID,
      2,
      epWeights
    );
    const wornLogged: LoggedGear = {
      ...logged,
      items: wornEquipment.map((spec, i) => {
        const item: LoggedItem = {
          id: spec.id ?? 0,
          slot: SIM_ORDER[i]!,
          gems: spec.gems,
        };
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
    };
    const gear = new RecordedGearSource({
      fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
      gear: new Map([["abc123|7", wornLogged]]),
    });

    const ranking = await rankUpgrades(input, {
      ...depsWith(justicarRespondingSim()),
      gear,
      pool: [
        realPoolEntry(HEAD_ID),
        realPoolEntry(SHOULDER_ID),
        realPoolEntry(HANDS_ID),
        realPoolEntry(LEGS_ID),
      ],
    });

    const headRow = ranking.items.find((i) => i.itemId === HEAD_ID);
    expect(headRow).toBeDefined();
    expect(headRow!.owned).toBe(true);
    expect(headRow!.setContext).toBeDefined();
    expect(headRow!.setContext!.piecesAfterSwap).toBe(
      headRow!.setContext!.piecesWornBefore
    );
    expect(headRow!.setContext!.prospectiveBonusDps).toBeUndefined();

    // A not-yet-worn piece of the same set still gets its prospective value —
    // the gate is about advancing the count, not about the set.
    const shoulderRow = ranking.items.find((i) => i.itemId === SHOULDER_ID);
    expect(shoulderRow!.setContext!.prospectiveBonusDps).toBeDefined();
  });

  it("reports insufficient-pieces when the pool cannot supply enough Justicar pieces", async () => {
    // Only two of the four pieces are offered — 4pc cannot be built.
    const ranking = await rankUpgrades(
      input,
      depsWith(justicarRespondingSim(), [
        realPoolEntry(HEAD_ID),
        realPoolEntry(SHOULDER_ID),
      ])
    );

    const fourPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 4
    );
    expect(fourPc).toBeDefined();
    expect(fourPc!.unmeasured).toBe("insufficient-pieces");
    expect(fourPc!.bonusDps).toBeUndefined();
    // Never a zero standing in for the missing reason.
    expect(fourPc!.packageDeltaDps).toBe(0);
  });

  it("reports not-implemented-in-sim for Justicar 2pc with no sim spent on it", async () => {
    let packageSimCalls = 0;
    const base = justicarRespondingSim();
    const counting: SimRunner = {
      version: () => base.version(),
      run: async (req, opts) => {
        const items =
          (
            req.raid as {
              parties: Array<{
                players: Array<{
                  equipment: { items: Array<{ id: number }> };
                }>;
              }>;
            }
          ).parties[0]?.players[0]?.equipment.items ?? [];
        const ids = items.map((i) => i.id);
        const justicarCount = [HEAD_ID, SHOULDER_ID, HANDS_ID, LEGS_ID].filter(
          (id) => ids.includes(id)
        ).length;
        // A 2pc-only package (exactly 2 Justicar pieces, below the 4pc
        // package built by this same run) would prove a sim was spent
        // measuring the unimplemented bonus.
        if (justicarCount === 2) packageSimCalls++;
        return base.run(req, opts);
      },
    };

    const ranking = await rankUpgrades(input, depsWith(counting));
    const twoPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 2
    );
    expect(twoPc!.unmeasured).toBe("not-implemented-in-sim");
    expect(packageSimCalls).toBe(0);
  });

  it("surfaces a package sim failure as unmeasured sim-failed, not silently", async () => {
    const ranking = await rankUpgrades(
      input,
      depsWith(justicarRespondingSim({ failOnPackage: true }))
    );

    const fourPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 4
    );
    expect(fourPc).toBeDefined();
    expect(fourPc!.unmeasured).toBe("sim-failed");
    expect(fourPc!.bonusDps).toBeUndefined();

    // Recorded in the substitutions surface, the existing simSkips pattern —
    // never a silent drop.
    const sub = ranking.substitutions.find((s) =>
      s.detail.includes("synthetic package sim failure")
    );
    expect(sub).toBeDefined();
    // Finding 5: the failure names the whole package (set + threshold), not
    // one arbitrary added piece, and no field carries a raw set id where an
    // item id would be expected.
    expect(sub!.field).toContain("4pc");
    expect(sub!.field).not.toBe(String(626));
  });

  it("names the whole package on failure, never a set id standing in for an item id (finding 5)", async () => {
    // An empty pool with only enough candidates to attempt the package but
    // fail it — the failure path historically fell back to `setId` when
    // `addedPieces[0]` was empty, landing a set id in an item-id field.
    const ranking = await rankUpgrades(
      input,
      depsWith(justicarRespondingSim({ failOnPackage: true }))
    );

    const fourPc = ranking.setBonuses!.find(
      (b) => b.setId === 626 && b.threshold === 4
    );
    expect(fourPc!.unmeasured).toBe("sim-failed");

    for (const sub of ranking.substitutions) {
      // The set id (626) must never appear as a bare numeric field value
      // standing in for an item id.
      expect(sub.field).not.toBe("626");
      expect(sub.field).not.toMatch(/^candidate 626\b/);
    }
    const packageSub = ranking.substitutions.find((s) =>
      s.field.includes("Justicar Battlegear 4pc")
    );
    expect(packageSub).toBeDefined();
  });

  it("is deterministic: same input, same seeds, two runs deep-equal setBonuses (V2)", async () => {
    const deps = depsWith(justicarRespondingSim());
    const a = await rankUpgrades(input, deps);
    const b = await rankUpgrades(input, deps);
    expect(a.setBonuses).toEqual(b.setBonuses);
  });
});
