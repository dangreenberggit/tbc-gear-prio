/**
 * Interface tests for the three spec archetypes the all-DPS-specs pass added
 * (plan step 9): a caster (`shadow`), a dual-wielding melee (`rogue`), and a
 * ranged physical spec (`hunter`).
 *
 * Driven at the `rankUpgrades` seam, never at a stage internal — the eight
 * stages must stay reorganisable without touching a test (AGENTS.md
 * § Testing). What is asserted is structural: which sim slots a spec's
 * candidates can occupy, which stat its cap reads, and which stats the gem
 * fill zeroes. None of it depends on a DPS number, which is why a synthetic
 * `SimRunner` is the right adapter here rather than a recorded one: no
 * recording exists for these nine specs, and recording one would pin
 * arithmetic these tests are not about.
 *
 * The synthetic runner returns a deterministic DPS derived from the request's
 * own equipment, so a candidate that changes gear changes the number, and two
 * runs over the same input agree. That is enough to make the ranker produce
 * real rows to assert against.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades, type Ranking } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import type {
  RaidSimRequest,
  SimObservation,
  SimRunner,
  SimRunOpts,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { CAP_PROFILE_BY_SPEC } from "../src/cap-profile.js";
import { Stat } from "../src/stats.js";
import { SIM_ORDER } from "../src/slots.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

/**
 * Deterministic stand-in for the sim.
 *
 * DPS is a pure function of the equipped item ids, so it is stable across
 * runs and reacts to a swap. The exact value is meaningless and nothing here
 * asserts on it.
 */
class SyntheticSimRunner implements SimRunner {
  calls = 0;
  async version(): Promise<string> {
    return "synthetic-1";
  }
  async run(req: RaidSimRequest, _opts: SimRunOpts): Promise<SimObservation> {
    this.calls++;
    const shaped = req as unknown as {
      raid?: {
        parties?: Array<{
          players?: Array<{ equipment?: { items?: Array<{ id?: number }> } }>;
        }>;
      };
    };
    const items =
      shaped.raid?.parties?.[0]?.players?.[0]?.equipment?.items ?? [];
    let acc = 0;
    for (let i = 0; i < items.length; i++) {
      acc += ((items[i]?.id ?? 0) % 977) * (i + 1);
    }
    return {
      dps: 1000 + (acc % 5000) / 10,
      stdev: 1.5,
      iterationsDone: 3000,
      simVersion: "synthetic-1",
    };
  }
}

/**
 * A skeleton shaped like what the fork tab supplies.
 *
 * The tab builds its skeleton from the live page (`currentPageSkeleton` →
 * `Sim.makeRaidSimRequest`), not from a committed per-spec file, so a
 * minimal request carrying this spec's class and equipment is a faithful
 * stand-in for what `rankUpgrades` actually receives in the product.
 */
function skeletonFor(className: string, gear: PresetGearFile): RaidSimRequest {
  return {
    raid: {
      parties: [
        {
          players: [
            {
              name: "synthetic",
              class: className,
              talentsString: "0-0-0",
              equipment: { items: gear.items.map((i) => ({ ...i })) },
            },
          ],
        },
      ],
    },
    encounter: { duration: 180, targets: [{ level: 73 }] },
  } as unknown as RaidSimRequest;
}

async function rankSpec(args: {
  spec: SpecId;
  className: string;
  gearFile: string;
  maxPhase: ContentPhase;
}): Promise<Ranking> {
  const { spec, className, gearFile, maxPhase } = args;
  const gear = loadJson<PresetGearFile>(gearFile);
  const ref = {
    region: "US" as const,
    realm: "synthetic",
    name: `syn-${spec}`,
  };
  const fight = {
    reportCode: `synthetic-${spec}`,
    fightId: 1,
    encounterName: `Synthetic ${spec}`,
  };
  const universe = loadJson<{ entries: unknown[] }>(
    `data/universes/${spec}-p${maxPhase}.json`
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    `data/presets/${spec}/fallback.ep-weights.json`
  ).weights;

  const out = await rankUpgrades(
    { spec, character: ref, maxPhase },
    {
      gear: new RecordedGearSource(
        syntheticOfflineRecordings({ ref, spec, presetGear: gear, fight })
      ),
      sim: new SyntheticSimRunner(),
      store: new MemoryStore(),
      clock: () => new Date("2026-08-25T00:00:00Z"),
      raidSimSkeleton: skeletonFor(className, gear),
      epWeights,
      pool: filterPoolByPhase(poolFromUniverse(universe as never), maxPhase),
    }
  );
  if (!("items" in out)) throw new Error("expected a complete Ranking");
  return out as Ranking;
}

/** Every sim slot any ranked row chose. */
function slotsChosen(ranking: Ranking): Set<string> {
  const out = new Set<string>();
  for (const item of ranking.items) {
    if (item.slotChoice) out.add(item.slotChoice);
  }
  return out;
}

describe("shadow — a caster archetype", () => {
  it("reads spell hit, not melee hit, and tracks no expertise", () => {
    // The descriptor is what the cap computation reads; asserting it here
    // keeps the archetype's defining fact next to the run that depends on it.
    const p = CAP_PROFILE_BY_SPEC.shadow;
    expect(p.hitStat).toBe(Stat.StatSpellHitRating);
    expect(p.trackExpertise).toBe(false);
    expect(p.hitCapPercent).toBe(16);
  });

  it("ranks against its own universe and reports a spell-hit cap", async () => {
    const ranking = await rankSpec({
      spec: "shadow",
      className: "ClassPriest",
      gearFile: "vendor/wowsims/shadow_p3.gear.json",
      maxPhase: 3,
    });
    expect(ranking.items.length).toBeGreaterThan(0);
    // A caster's cap is 16% of spell hit, ~202 rating — distinguishable from
    // the ~142 a melee cap would give, so this fails loudly if the spec fell
    // back to the physical profile.
    expect(ranking.caps.hit.capRating).toBeCloseTo(16 * 12.615385, 3);
    expect(ranking.caps.expertise.rating).toBe(0);
  });

  it("never places a candidate in the off hand", async () => {
    // Shadow is not a dual-wield spec, so "weapon" must map to mainhand
    // alone however many one-handers the universe carries.
    const ranking = await rankSpec({
      spec: "shadow",
      className: "ClassPriest",
      gearFile: "vendor/wowsims/shadow_p3.gear.json",
      maxPhase: 3,
    });
    expect(slotsChosen(ranking).has("offhand")).toBe(false);
  });
});

describe("rogue — a dual-wield melee archetype", () => {
  it("reads melee hit and tracks expertise", () => {
    const p = CAP_PROFILE_BY_SPEC.rogue;
    expect(p.hitStat).toBe(Stat.StatMeleeHitRating);
    expect(p.trackExpertise).toBe(true);
    expect(p.hitCapPercent).toBe(9);
  });

  it("places candidates in the off hand and never a two-hander there", async () => {
    const ranking = await rankSpec({
      spec: "rogue",
      className: "ClassRogue",
      gearFile: "vendor/wowsims/rogue_p3.gear.json",
      maxPhase: 3,
    });
    expect(ranking.items.length).toBeGreaterThan(0);

    // The off hand must actually be reachable — otherwise the two-hander
    // assertion below would pass vacuously.
    const offhandRows = ranking.items.filter((i) => i.slotChoice === "offhand");
    expect(offhandRows.length).toBeGreaterThan(0);

    // Everything placed there must be something the game will actually put
    // in an off hand: a one-hander or a dedicated off-hand item. Asserting
    // only "not a two-hander" was too weak — it passed while
    // HandTypeMainHand items were reaching the slot (review A3).
    const itemIndex = loadJson<
      Record<string, { name: string; handType: number | null }>
    >("data/items/index.json");
    const HAND_TYPE_ONE_HAND = 2;
    const HAND_TYPE_OFF_HAND = 3;
    const offenders = offhandRows
      .filter((i) => {
        const handType = itemIndex[String(i.itemId)]?.handType;
        return (
          handType !== HAND_TYPE_ONE_HAND && handType !== HAND_TYPE_OFF_HAND
        );
      })
      .map(
        (i) =>
          `${i.itemId} ${i.name} (handType ${itemIndex[String(i.itemId)]?.handType})`
      );
    expect(offenders).toEqual([]);
  });

  it("offers no off-hand candidate while a two-hander is worn", async () => {
    // Review A2. simSlotsForPoolSlot filters the *candidate's* hand type and
    // knows nothing about what is worn, so before this guard the ranker simmed
    // one-handers into an empty off hand while a two-hander sat in the main
    // hand — a pairing the game cannot equip, priced as an upgrade.
    //
    // warrior_p5_arms is a real such baseline: it wears 34247 Apolyon, the
    // Soul-Render (handType 4) with the off hand empty.
    const worn = loadJson<PresetGearFile>(
      "vendor/wowsims/warrior_p5_arms.gear.json"
    );
    const itemIndex = loadJson<
      Record<string, { name: string; handType: number | null }>
    >("data/items/index.json");
    const mainHandId = worn.items[SIM_ORDER.indexOf("mainhand")]?.id;
    // Pin the fixture's own shape first: if upstream ever re-gears this set
    // with a one-hander, the assertion below stops testing anything and this
    // line is what says so.
    expect(mainHandId).toBe(34247);
    expect(itemIndex[String(mainHandId)]?.handType).toBe(4);

    const ranking = await rankSpec({
      spec: "warrior",
      className: "ClassWarrior",
      gearFile: "vendor/wowsims/warrior_p5_arms.gear.json",
      maxPhase: 5,
    });
    expect(ranking.items.length).toBeGreaterThan(0);
    expect(slotsChosen(ranking).has("offhand")).toBe(false);
  });
});

describe("hunter — a ranged physical archetype", () => {
  it("reads melee hit rating for ranged attacks and tracks no expertise", () => {
    // TBC has no StatRangedHitRating: sim/core/unit.go declares only
    // MeleeHitRating -> PhysicalHitPercent and SpellHitRating ->
    // SpellHitPercent. Nothing a hunter fires can be dodged or parried, so
    // expertise is not a cap this spec has.
    const p = CAP_PROFILE_BY_SPEC.hunter;
    expect(p.hitStat).toBe(Stat.StatMeleeHitRating);
    expect(p.trackExpertise).toBe(false);
    expect(p.hitCapPercent).toBe(9);
  });

  it("populates the ranged slot and reports no expertise", async () => {
    const ranking = await rankSpec({
      spec: "hunter",
      className: "ClassHunter",
      gearFile: "vendor/wowsims/hunter_p4_bm_2h_9p.gear.json",
      maxPhase: 4,
    });
    expect(ranking.items.length).toBeGreaterThan(0);
    expect(SIM_ORDER).toContain("ranged");
    // A hunter's weapon is its bow, so the ranged slot must carry rows.
    const ranged = ranking.items.filter((i) => i.slot === "ranged");
    expect(ranged.length).toBeGreaterThan(0);
    expect(ranking.caps.expertise.rating).toBe(0);
  });
});
