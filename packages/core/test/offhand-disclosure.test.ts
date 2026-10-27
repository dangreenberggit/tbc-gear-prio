/**
 * Off-hand items for specs that cannot dual-wield (ticket 365's tab half).
 *
 * A caster, ret or feral can still wear a shield or a held-in-off-hand item.
 * Those items must be ranked in the off hand when the worn main hand is a
 * one-hander, and disclosed — not silently dropped, not left as Stop
 * placeholders, not spending candidate-cap places — when a two-hander is worn,
 * because placing one then means a two-item swap.
 *
 * The last block checks the same Stop placeholder rule for rings and trinkets
 * (ticket 701): a placeholder for an item worn in its second slot names that
 * slot, as its simmed row would.
 *
 * Driven at the `rankUpgrades` seam with a hand-built pool of real mage-p3
 * universe rows and a synthetic sim (docs/workflow.md § Testing: seams and where tests go). Nothing here asserts
 * on a DPS number.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getItem } from "../src/items.js";
import { simSlotsForPoolSlot, type PoolEntry } from "../src/pool.js";
import { HandType } from "../src/proto/common_pb.js";
import {
  rankUpgrades,
  type PartialRanking,
  type Ranking,
} from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import type {
  RaidSimRequest,
  SimObservation,
  SimRunner,
  SimRunOpts,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import {
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { realPoolEntry } from "./real-source.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

/** Main hand 30910 Tempest of Chaos (a main-hand one-hander), off hand 30872. */
const ONE_HAND_GEAR = "vendor/wowsims/mage_p3_sword.gear.json";
/** Main hand 32374 Zhar'doom (a two-hander), off hand empty. */
const TWO_HAND_GEAR = "vendor/wowsims/mage_p3_staff.gear.json";

const HELD = [32361, 28734, 30911]; // Blind-Seers Icon, Jewel, Scepter
const ONE_HANDERS = [28524, 29182]; // Emerald Ripper, Riftmaker
const TWO_HANDER = 29988; // The Nexus Key
const OTHERS = [31056, 32349]; // a head and a neck

function pool(
  extra: readonly number[] = [],
  omit: readonly number[] = []
): PoolEntry[] {
  return [...HELD, ...ONE_HANDERS, TWO_HANDER, ...OTHERS, ...extra]
    .filter((id) => !omit.includes(id))
    .map((id) => realPoolEntry(id, "mage-p3"));
}

const isOffHandOnly = (itemId: number): boolean =>
  getItem(itemId)?.handType === HandType.HandTypeOffHand;

class SyntheticSimRunner implements SimRunner {
  calls = 0;
  constructor(private readonly onRun?: (calls: number) => void) {}
  async version(): Promise<string> {
    return "synthetic-1";
  }
  async run(req: RaidSimRequest, _opts: SimRunOpts): Promise<SimObservation> {
    this.calls++;
    this.onRun?.(this.calls);
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

function skeletonFor(
  gear: PresetGearFile,
  className = "ClassMage"
): RaidSimRequest {
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

async function rankMage(args: {
  gearFile: string;
  candidateCap?: number;
  sim?: SimRunner;
  signal?: AbortSignal;
  extraPool?: readonly number[];
  omitFromPool?: readonly number[];
  /** Another spec: its class for the skeleton and the whole pool to rank. */
  other?: { spec: "hunter"; className: string; pool: PoolEntry[] };
}): Promise<Ranking | PartialRanking> {
  const spec = args.other?.spec ?? "mage";
  const gear = loadJson<PresetGearFile>(args.gearFile);
  const ref = { region: "US" as const, realm: "synthetic", name: "syn-mage" };
  const fight = {
    reportCode: "synthetic-mage",
    fightId: 1,
    encounterName: "Synthetic mage",
  };
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    `data/presets/${spec}/fallback.ep-weights.json`
  ).weights;
  return rankUpgrades(
    {
      spec,
      character: ref,
      maxPhase: 3,
      ...(args.candidateCap !== undefined
        ? { candidateCap: args.candidateCap }
        : {}),
    },
    {
      gear: new RecordedGearSource(
        syntheticOfflineRecordings({
          ref,
          spec,
          presetGear: gear,
          fight,
        })
      ),
      sim: args.sim ?? new SyntheticSimRunner(),
      store: new MemoryStore(),
      clock: () => new Date("2026-10-19T00:00:00Z"),
      raidSimSkeleton: skeletonFor(gear, args.other?.className),
      epWeights,
      pool: args.other?.pool ?? pool(args.extraPool, args.omitFromPool),
      ...(args.signal ? { concurrency: 1, signal: args.signal } : {}),
    }
  );
}

describe("off-hand items for a spec that cannot dual-wield", () => {
  it("ranks held items in the off hand beside a one-hand main hand", async () => {
    const ranking = await rankMage({ gearFile: ONE_HAND_GEAR });

    const offHandRows = ranking.items.filter((i) => i.slotChoice === "offhand");
    expect(offHandRows.length).toBeGreaterThan(0);
    expect(offHandRows.filter((i) => !isOffHandOnly(i.itemId))).toEqual([]);

    // A one-hander is in the pool and lands in the main hand, so the
    // assertion above is not vacuous about one-handers.
    const oneHanderRows = ranking.items.filter((i) =>
      ONE_HANDERS.includes(i.itemId)
    );
    expect(oneHanderRows.length).toBeGreaterThan(0);
    for (const row of oneHanderRows) expect(row.slotChoice).toBe("mainhand");
  });

  it("files a Stop placeholder for a held item in the off hand", async () => {
    // Without a slotChoice, readers fall back to the weapon slot's first
    // placement and show an unsimmed held item as a main-hand row.
    const controller = new AbortController();
    const sim = new SyntheticSimRunner((calls) => {
      if (calls === 2) controller.abort();
    });
    const ranking = await rankMage({
      gearFile: ONE_HAND_GEAR,
      sim,
      signal: controller.signal,
    });
    expect(ranking.complete).toBe(false);
    const heldPlaceholders = ranking.items.filter(
      (i) => i.simmed === false && isOffHandOnly(i.itemId)
    );
    expect(heldPlaceholders.length).toBeGreaterThan(0);
    for (const row of heldPlaceholders) expect(row.slotChoice).toBe("offhand");
  });
});

describe("off-hand items while a two-hander is worn", () => {
  const disclosures = (r: Ranking | PartialRanking) =>
    r.substitutions.filter((s) => s.field === "Off-hand items");

  it("ranks none of them and says how many in one line", async () => {
    const ranking = await rankMage({ gearFile: TWO_HAND_GEAR });

    expect(ranking.items.filter((i) => isOffHandOnly(i.itemId))).toEqual([]);
    expect(ranking.items.length).toBeGreaterThan(0);
    const lines = disclosures(ranking);
    expect(lines.map((l) => l.detail)).toEqual([
      "3 off-hand items were not ranked, because you wear a two-handed weapon.",
    ]);
  });

  it("says item, not items, for one", async () => {
    const ranking = await rankMage({
      gearFile: TWO_HAND_GEAR,
      omitFromPool: HELD.slice(1),
    });
    expect(disclosures(ranking).map((l) => l.detail)).toEqual([
      "1 off-hand item was not ranked, because you wear a two-handed weapon.",
    ]);
  });

  it("spends no candidate-cap places on them", async () => {
    // Beside the two-hander the pool holds 3 items that can be placed (the
    // one-handers are held out too); a cap of 2 must sim 2 of them. Were the
    // blocked items still in the EP order, they would sort near the top
    // (priced against an empty off hand) and take the places.
    const cap = 2;
    const ranking = await rankMage({
      gearFile: TWO_HAND_GEAR,
      candidateCap: cap,
    });
    expect(ranking.items).toHaveLength(cap);
    expect(ranking.items.filter((i) => isOffHandOnly(i.itemId))).toEqual([]);
    expect(disclosures(ranking)).toHaveLength(1);
  });

  it("leaves no Stop placeholder for them", async () => {
    const controller = new AbortController();
    // Run 1 is the baseline; aborting on run 2 lets one candidate land and
    // leaves the rest unsimmed.
    const sim = new SyntheticSimRunner((calls) => {
      if (calls === 2) controller.abort();
    });
    const ranking = await rankMage({
      gearFile: TWO_HAND_GEAR,
      sim,
      signal: controller.signal,
    });
    expect(ranking.complete).toBe(false);
    const placeholders = ranking.items.filter((i) => i.simmed === false);
    expect(placeholders.length).toBeGreaterThan(0);
    expect(placeholders.filter((i) => isOffHandOnly(i.itemId))).toEqual([]);
    expect(disclosures(ranking)).toHaveLength(1);
  });
});

describe("one-handed weapons while a two-hander is worn (ticket 700)", () => {
  // Priced alone, a one-hander would leave the off hand empty, so the run
  // holds them out before ordering and says how many in one line.
  const lines = (r: Ranking | PartialRanking) =>
    r.substitutions.filter((s) => s.field === "One-handed weapons");
  const oneHanderRows = (r: Ranking | PartialRanking) =>
    r.items.filter((i) => ONE_HANDERS.includes(i.itemId));

  it("ranks none of them, still ranks the two-hander, and says how many", async () => {
    const ranking = await rankMage({ gearFile: TWO_HAND_GEAR });

    expect(oneHanderRows(ranking)).toEqual([]);
    expect(ranking.items.some((i) => i.itemId === TWO_HANDER)).toBe(true);
    expect(lines(ranking)).toEqual([
      {
        field: "One-handed weapons",
        detail:
          "2 one-handed weapons were not ranked, because you wear a two-handed weapon.",
      },
    ]);
  });

  it("says weapon, not weapons, for one", async () => {
    const ranking = await rankMage({
      gearFile: TWO_HAND_GEAR,
      omitFromPool: [ONE_HANDERS[1]!],
    });
    expect(lines(ranking).map((l) => l.detail)).toEqual([
      "1 one-handed weapon was not ranked, because you wear a two-handed weapon.",
    ]);
  });

  it("spends no candidate-cap places and leaves no Stop placeholder on them", async () => {
    // Over this pool a cap of 4 kept Emerald Ripper before the hold-out (EP
    // order: the head, the neck, the two-hander, then the one-handers). Now
    // only 3 items can be placed, so the cap is not reached.
    const capped = await rankMage({ gearFile: TWO_HAND_GEAR, candidateCap: 4 });
    expect(capped.items).toHaveLength(3);
    expect(oneHanderRows(capped)).toEqual([]);

    const controller = new AbortController();
    const sim = new SyntheticSimRunner((calls) => {
      if (calls === 2) controller.abort();
    });
    const stopped = await rankMage({
      gearFile: TWO_HAND_GEAR,
      sim,
      signal: controller.signal,
    });
    expect(stopped.complete).toBe(false);
    expect(stopped.items.some((i) => i.simmed === false)).toBe(true);
    expect(oneHanderRows(stopped)).toEqual([]);
    expect(lines(stopped)).toHaveLength(1);
  });

  it("ranks them with no line beside a worn one-hander", async () => {
    const ranking = await rankMage({ gearFile: ONE_HAND_GEAR });
    expect(oneHanderRows(ranking)).toHaveLength(ONE_HANDERS.length);
    expect(lines(ranking)).toEqual([]);
  });
});

describe("one-handed weapons for a dual-wield spec wearing a two-hander (ticket 700)", () => {
  // Hunter can dual-wield (DUAL_WIELD_SPECS), so a one-hander has two
  // placements; a main-hand-only weapon has one. Both are held out beside a
  // worn two-hander, and the two-hander candidate is still ranked.
  const MAIN_HAND_ONLY = 32944; // Talon of the Phoenix
  const ONE_HAND = 30881; // Blade of Infamy
  const OFF_HAND_ONLY = 33734; // Vengeful Gladiator's Quickblade
  const TWO_HAND = 32248; // Halberd of Desolation
  const NECK = 32349;

  it("holds out main-hand-only and one-hand weapons, and counts them in one line", async () => {
    const ranking = await rankMage({
      // Main hand 29993 Twinblade of the Phoenix (a two-hander), off hand empty.
      gearFile: "vendor/wowsims/hunter_p2_bm_2h_6p.gear.json",
      other: {
        spec: "hunter",
        className: "ClassHunter",
        pool: [MAIN_HAND_ONLY, ONE_HAND, OFF_HAND_ONLY, TWO_HAND, NECK].map(
          (id) => realPoolEntry(id, "hunter-p3")
        ),
      },
    });

    const ids = ranking.items.map((i) => i.itemId);
    expect(ids).not.toContain(MAIN_HAND_ONLY);
    expect(ids).not.toContain(ONE_HAND);
    expect(ids).not.toContain(OFF_HAND_ONLY);
    expect(ids).toContain(TWO_HAND);
    expect(
      ranking.substitutions
        .filter((s) =>
          ["Off-hand items", "One-handed weapons"].includes(s.field)
        )
        .map((s) => s.detail)
    ).toEqual([
      "1 off-hand item was not ranked, because you wear a two-handed weapon.",
      "2 one-handed weapons were not ranked, because you wear a two-handed weapon.",
    ]);
  });
});

describe("Stop placeholders for rings and trinkets", () => {
  // ONE_HAND_GEAR wears these in finger1, finger2, trinket1 and trinket2.
  const WORN = {
    29305: "finger1",
    32527: "finger2",
    30720: "trinket1",
    29370: "trinket2",
  } as const;

  it("name the slot the item is worn in, as its simmed row would", async () => {
    // A worn ring or trinket may only be placed in the slot it is worn in, so
    // a simmed row names that slot. Without the same on a placeholder,
    // readers fall back to the first slot and file a finger2 ring under
    // finger1.
    const controller = new AbortController();
    const sim = new SyntheticSimRunner((calls) => {
      if (calls === 2) controller.abort();
    });
    const ranking = await rankMage({
      gearFile: ONE_HAND_GEAR,
      sim,
      signal: controller.signal,
      extraPool: Object.keys(WORN).map(Number),
    });
    expect(ranking.complete).toBe(false);
    const rows = Object.keys(WORN).map((id) =>
      ranking.items.find((i) => i.itemId === Number(id))
    );
    expect(rows.map((row) => row?.simmed)).toEqual(rows.map(() => false));
    // The slot each row names, read as the tab reads it (fork
    // `results_view.ts` `effectiveSlot`, `utils/format.ts` `slotLabel`).
    const named = Object.fromEntries(
      rows.map((row) => [
        row!.itemId,
        row!.slotChoice ?? simSlotsForPoolSlot(row!.slot)[0],
      ])
    );
    expect(named).toEqual(WORN);
  });
});
