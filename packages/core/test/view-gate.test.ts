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
      items: mapped.map((spec, i) => {
        const item: LoggedGear["items"][number] = {
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
 * Every `source` below is copied verbatim from `data/universes/ret-p2.json` —
 * a fixture that invents a boss or a zone can pass while proving nothing about
 * the data that ships. Re-check with:
 *
 *   python -c "
 *   import json
 *   d=json.load(open('data/universes/ret-p2.json'))
 *   print([ (e['itemId'], e['sources']) for e in d['entries']
 *           if e['itemId'] in (29072,30129,28530) ])"
 *
 * 29072 Justicar Gauntlets is token-sourced *only*, which is what makes it the
 * §15 risk-table case: a Karazhan filter that follows just the `raid` hop
 * returns nothing here. 30129 puts a second token piece in a different zone so
 * the filter has to discriminate rather than pass everything through.
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
      boss: "The Curator",
      token: "Gloves of the Fallen Champion",
    },
  },
  {
    itemId: 30129,
    name: "Crystalforge Breastplate",
    slot: "chest",
    phase: 1,
    source: {
      kind: "token",
      zone: "Tempest Keep",
      boss: "Kael'thas Sunstrider",
      token: "Chestguard of the Vanquished Champion",
    },
  },
  {
    itemId: 28530,
    name: "Brooch of Unquenchable Fury",
    slot: "neck",
    phase: 1,
    source: { kind: "raid", zone: "Karazhan", boss: "Moroes" },
  },
];

const INPUT = {
  character: CHAR,
  spec: "ret" as const,
  maxPhase: 2 as const,
  iterations: 3000,
  seeds: [42],
  race: "RaceHuman" as const,
};

/**
 * Counts entries into the engine, which a sim counter cannot do.
 *
 * `rankUpgrades` caches sim results through the `Store`, so a caller that
 * re-ranked identical input would run **zero** extra sims and leave a sim
 * counter untouched — the caching is correct and it is exactly what makes the
 * sim count blind to the regression this box is about. `findFights` is
 * deliberately uncached (`gear-source.ts:78`) and is the engine's first call,
 * so counting it counts entries.
 */
function newGearSource(): CountingGearSource {
  return new CountingGearSource({
    fights: new Map([["US|dreamscythe|slamaltman|ret", [SUMMARY]]]),
    gear: new Map([["abc123|7", slamaltmanLoggedGear()]]),
  });
}

class CountingGearSource extends RecordedGearSource {
  entries = 0;

  override findFights(
    c: Parameters<RecordedGearSource["findFights"]>[0],
    spec: Parameters<RecordedGearSource["findFights"]>[1]
  ) {
    this.entries += 1;
    return super.findFights(c, spec);
  }
}

function depsFor(sim: CountingSimRunner, gear = newGearSource()) {
  return {
    gear,
    sim,
    store: new MemoryStore(),
    clock: () => new Date("2026-07-26T12:00:00.000Z"),
    raidSimSkeleton: skeleton,
    epWeights,
    pool: POOL,
  };
}

async function rankOnce() {
  const sim = new CountingSimRunner();
  const ranking = await rankUpgrades(INPUT, depsFor(sim));
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
  { raid: "Karazhan", boss: "Moroes" },
  { boss: "Kael'thas Sunstrider" },
  { groupBy: "rank" },
  { groupBy: "slot" },
  { groupBy: "raid" },
  { hideOwned: true },
  { hideOwned: false },
  { withSetPotential: true },
  { withSetPotential: false },
  {
    pinBis: true,
    raid: "Karazhan",
    boss: "Moroes",
    groupBy: "slot",
    hideOwned: true,
    withSetPotential: true,
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
      // Note this half cannot fail while `applyView` holds no SimRunner — see
      // the caller-loop test below, which is what actually closes "or trigger
      // a sim". Kept as a tripwire on a future `applyView(r, v, deps)`.
      expect(sim.runs).toBe(runsAfterRank);
    }
  });

  /**
   * The "or trigger a sim" half of the gate box, at the only altitude where it
   * can fail.
   *
   * `applyView` is pure and never receives a `SimRunner`, so asserting on the
   * counter *inside* the view call is trivially true. The claim the box makes
   * is about the **caller's** loop: one `rankUpgrades`, then N re-renders. A
   * caller that re-ranked to serve a view change would satisfy every
   * pure-function test in this file and still violate the box, so the sim
   * budget has to be observed across the whole session.
   */
  it("serves every view change from one ranking, without re-entering the engine", async () => {
    const sim = new CountingSimRunner();
    const gear = newGearSource();

    // The session: rank once, then answer fourteen view requests.
    const ranking = await rankUpgrades(INPUT, depsFor(sim, gear));
    expect(sim.runs).toBeGreaterThan(0);
    expect(gear.entries).toBe(1);

    const rendered = VIEWS.map((view) => applyView(ranking, view));
    expect(rendered).toHaveLength(VIEWS.length);

    // Fourteen views served, still one entry into the engine. A caller that
    // re-ranked per view change would read 15 here — and would *not* be caught
    // by the sim counter, because identical input hits the result cache and
    // costs zero sims.
    expect(gear.entries).toBe(1);
    expect(sim.runs).toBeGreaterThan(0);
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
    // 28530 is the ordinary Karazhan drop; 29072 reaches the zone only through
    // the token hop, and it is the one that would go missing.
    expect(rows.map((i) => i.itemId).sort()).toEqual([28530, 29072]);
    expect(rows.find((i) => i.itemId === 29072)!.source.kind).toBe("token");
  });

  it("scopes a boss filter through the token hop too", async () => {
    const { ranking } = await rankOnce();
    const { rows } = applyView(ranking, {
      raid: "Karazhan",
      boss: "The Curator",
    });
    // The Curator drops the gloves token, so the boss filter has to follow the
    // token source's own boss — and must not sweep in Moroes' neck.
    expect(rows.map((i) => i.itemId)).toEqual([29072]);
  });

  it("does not return the tier piece under a different raid's filter", async () => {
    const { ranking } = await rankOnce();
    const { rows } = applyView(ranking, { raid: "Tempest Keep" });
    expect(rows.map((i) => i.itemId)).not.toContain(29072);
    // Tempest Keep has its own token piece, so this is a discriminating
    // filter rather than an empty one.
    expect(rows.map((i) => i.itemId)).toEqual([30129]);
  });
});
