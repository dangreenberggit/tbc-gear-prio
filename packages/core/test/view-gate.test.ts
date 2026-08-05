/**
 * The two Phase 2 gate boxes owned by `.scratch/phase-2/issues/03-apply-view.md`,
 * asserted at the altitude those tickets name.
 *
 * `packages/core/test/view.test.ts` covers `applyView` as a pure function.
 * That is the wrong altitude for "does not trigger a sim": a pure function
 * trivially cannot run one. Carry-forward ticket 30 is explicit that the box
 * needs a `Ranking` produced through `rankUpgrades` with a **counting**
 * `SimRunner`, so that the sim count is a real observation of the engine
 * rather than a property of the view helper.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { PoolEntry } from "../src/pool.js";
import { rankUpgrades } from "../src/rank.js";
import {
  RecordedGearSource,
  type FightSummary,
  type LoggedGear,
} from "../src/seams/gear-source.js";
import {
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { mapWclGearToSim, SIM_ORDER, type WclGearEntry } from "../src/slots.js";
import { applyView, type ViewOptions } from "../src/view.js";

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
    combatant_info_events: Array<{ sourceID: number; gear: WclGearEntry[] }>;
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

/** Counts every run that reaches the seam. The gate box is about this number. */
class CountingSimRunner implements SimRunner {
  runs = 0;

  async version(): Promise<string> {
    return "v0.0.101";
  }

  async run(_req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    this.runs += 1;
    return {
      dps: 2000 + this.runs * 7,
      stdev: 90,
      iterationsDone: opts.iterations,
      simVersion: "v0.0.101",
    };
  }
}

/**
 * A Karazhan T4 piece reachable *only* through `kind: 'token'`, alongside two
 * ordinary raid drops in another zone. 29072 is token-sourced only in
 * `data/universes/ret-p2.json`, which is what makes it the §15 risk-table case:
 * a Karazhan filter that follows just the `raid` hop returns nothing here.
 */
const POOL: PoolEntry[] = [
  {
    itemId: 29072,
    name: "Justicar Gauntlets",
    slot: "hands",
    phase: 1,
    source: {
      kind: "token",
      zone: "Karazhan",
      boss: "Prince Malchezaar",
      token: "Gloves of the Fallen Champion",
    },
  },
  {
    itemId: 29381,
    name: "Choker of Vile Intent",
    slot: "neck",
    phase: 1,
    source: { kind: "raid", zone: "Tempest Keep", boss: "Void Reaver" },
  },
  {
    itemId: 28530,
    name: "Brooch of Unquenchable Fury",
    slot: "neck",
    phase: 1,
    source: { kind: "raid", zone: "Tempest Keep", boss: "Al'ar" },
  },
];

async function rankOnce() {
  const logged = slamaltmanLoggedGear();
  const sim = new CountingSimRunner();
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
      pool: POOL,
    }
  );
  return { ranking, sim };
}

/** Every field of `ViewOptions`, each exercised at least once. */
const VIEWS: ViewOptions[] = [
  {},
  { pinBis: true },
  { pinBis: false },
  { raid: "Karazhan" },
  { raid: "Tempest Keep" },
  { raid: "all" },
  { raid: "Tempest Keep", boss: "Al'ar" },
  { boss: "Void Reaver" },
  { groupBy: "rank" },
  { groupBy: "slot" },
  { groupBy: "raid" },
  { hideOwned: true },
  { hideOwned: false },
  {
    pinBis: true,
    raid: "Tempest Keep",
    boss: "Al'ar",
    groupBy: "slot",
    hideOwned: true,
  },
];

describe("Phase 2 gate: ViewOptions never changes a number", () => {
  it("toggling any ViewOptions field changes neither contentHash nor the sim count", async () => {
    const { ranking, sim } = await rankOnce();

    const hashAfterRank = ranking.contentHash;
    const runsAfterRank = sim.runs;
    // The ranking has to have actually simmed, or "count unchanged" is vacuous.
    expect(runsAfterRank).toBeGreaterThan(0);

    for (const view of VIEWS) {
      applyView(ranking, view);
      expect(ranking.contentHash).toBe(hashAfterRank);
      expect(sim.runs).toBe(runsAfterRank);
    }
  });

  it("keeps the ranking's own rows and deltas intact across every view", async () => {
    const { ranking } = await rankOnce();
    const before = structuredClone(ranking.items);
    for (const view of VIEWS) applyView(ranking, view);
    expect(ranking.items).toEqual(before);
  });
});

describe("Phase 2 gate: a raid filter on a tier-token slot returns the tier piece", () => {
  it("returns the token-sourced T4 piece under a Karazhan filter", async () => {
    const { ranking } = await rankOnce();
    // Guard the premise: 29072 must be in the ranking at all, or the filter
    // assertion below would pass for the wrong reason.
    expect(ranking.items.map((i) => i.itemId)).toContain(29072);

    const { rows } = applyView(ranking, { raid: "Karazhan" });
    expect(rows.map((i) => i.itemId)).toEqual([29072]);
    expect(rows[0]!.source.kind).toBe("token");
  });

  it("scopes a boss filter through the token hop too", async () => {
    const { ranking } = await rankOnce();
    const { rows } = applyView(ranking, {
      raid: "Karazhan",
      boss: "Prince Malchezaar",
    });
    expect(rows.map((i) => i.itemId)).toEqual([29072]);
  });

  it("does not return the tier piece under a different raid's filter", async () => {
    const { ranking } = await rankOnce();
    const { rows } = applyView(ranking, { raid: "Tempest Keep" });
    expect(rows.map((i) => i.itemId)).not.toContain(29072);
  });
});
