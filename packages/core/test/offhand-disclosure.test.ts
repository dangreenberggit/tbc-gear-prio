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
 * universe rows and a synthetic sim (AGENTS.md § Testing). Nothing here asserts
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

function pool(extra: readonly number[] = []): PoolEntry[] {
  return [...HELD, ...ONE_HANDERS, TWO_HANDER, ...OTHERS, ...extra].map((id) =>
    realPoolEntry(id, "mage-p3")
  );
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

function skeletonFor(gear: PresetGearFile): RaidSimRequest {
  return {
    raid: {
      parties: [
        {
          players: [
            {
              name: "synthetic",
              class: "ClassMage",
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
}): Promise<Ranking | PartialRanking> {
  const gear = loadJson<PresetGearFile>(args.gearFile);
  const ref = { region: "US" as const, realm: "synthetic", name: "syn-mage" };
  const fight = {
    reportCode: "synthetic-mage",
    fightId: 1,
    encounterName: "Synthetic mage",
  };
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/mage/fallback.ep-weights.json"
  ).weights;
  return rankUpgrades(
    {
      spec: "mage",
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
          spec: "mage",
          presetGear: gear,
          fight,
        })
      ),
      sim: args.sim ?? new SyntheticSimRunner(),
      store: new MemoryStore(),
      clock: () => new Date("2026-10-19T00:00:00Z"),
      raidSimSkeleton: skeletonFor(gear),
      epWeights,
      pool: pool(args.extraPool),
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
    r.substitutions.filter((s) => s.field === "off-hand candidates");

  it("ranks none of them and says how many in one line", async () => {
    const ranking = await rankMage({ gearFile: TWO_HAND_GEAR });

    expect(ranking.items.filter((i) => isOffHandOnly(i.itemId))).toEqual([]);
    expect(ranking.items.length).toBeGreaterThan(0);
    const lines = disclosures(ranking);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.detail.startsWith(`${HELD.length} off-hand items`)).toBe(
      true
    );
  });

  it("spends no candidate-cap places on them", async () => {
    // The pool holds 5 items that can be placed; a cap of 3 must sim 3 of
    // them. Were the blocked items still in the EP order, they would sort
    // near the top (priced against an empty off hand) and take the places.
    const cap = 3;
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

describe("one-hand weapons while a two-hander is worn (ticket 700)", () => {
  // Each one-hander is priced alone in the main hand, so the off hand stays
  // empty in its sim; one line says so.
  const lines = (r: Ranking | PartialRanking) =>
    r.substitutions.filter((s) => s.field === "one-hand candidates");

  it("says how many one-hand weapons were priced with the off hand empty", async () => {
    const ranking = await rankMage({ gearFile: TWO_HAND_GEAR });

    const oneHanderRows = ranking.items.filter((i) =>
      ONE_HANDERS.includes(i.itemId)
    );
    expect(oneHanderRows).toHaveLength(ONE_HANDERS.length);
    expect(lines(ranking)).toEqual([
      {
        field: "one-hand candidates",
        detail:
          `${ONE_HANDERS.length} one-hand weapons were priced in the main hand ` +
          `with the off hand empty: the worn main hand is a two-hander, and ` +
          `this run prices one item at a time.`,
      },
    ]);
  });

  it("counts only the one-hand weapons a capped run priced", async () => {
    // A cap of 4 keeps one of the two one-handers (EP order over this pool).
    const ranking = await rankMage({
      gearFile: TWO_HAND_GEAR,
      candidateCap: 4,
    });

    const priced = ranking.items.filter((i) =>
      ONE_HANDERS.includes(i.itemId)
    ).length;
    expect(priced).toBe(1);
    expect(lines(ranking)).toHaveLength(1);
    expect(lines(ranking)[0]!.detail.startsWith("1 one-hand weapons")).toBe(
      true
    );
  });

  it("has no line beside a worn one-hander", async () => {
    const ranking = await rankMage({ gearFile: ONE_HAND_GEAR });
    expect(lines(ranking)).toEqual([]);
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
