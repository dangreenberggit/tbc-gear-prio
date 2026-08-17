import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { compose } from "../src/compose.js";
import { mapWclGearToSim, type WclGearEntry } from "../src/slots.js";
import type { RaidSimRequest } from "../src/seams/sim-runner.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson(rel: string): unknown {
  return JSON.parse(readFileSync(join(root, rel), "utf8"));
}

function slamaltmanGear(): WclGearEntry[] {
  const raw = loadJson("test/fixtures/slamaltman.raw.json") as {
    actors: Array<{ id: number; name: string }>;
    combatant_info_events: Array<{
      sourceID: number;
      gear: WclGearEntry[];
    }>;
  };
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    const actor = actors.get(ev.sourceID);
    if (actor?.name.toLowerCase() === "slamaltman") return ev.gear;
  }
  throw new Error("slamaltman not found in fixture");
}

describe("compose", () => {
  it("matches the Stage 0 slamaltman RaidSimRequest minus simOptions", () => {
    const skeleton = loadJson(
      "data/presets/ret/p2.raid-sim-skeleton.json"
    ) as RaidSimRequest;
    const expectedFull = loadJson(
      "test/fixtures/slamaltman.raid-sim-request.json"
    ) as Record<string, unknown>;
    const expected = { ...expectedFull };
    delete expected.simOptions;

    const got = compose(skeleton, {
      name: "slamaltman",
      race: "RaceHuman",
      equipment: mapWclGearToSim(slamaltmanGear()),
    });

    expect(got).toEqual(expected);
    expect(got).not.toHaveProperty("simOptions");
    expect(got).not.toHaveProperty("requestId");
  });

  // Ticket 14 supposed a bare worn slot could still sim *with* an enchant,
  // via the skeleton's own. It cannot: compose replaces equipment wholesale
  // rather than merging into it. The skeleton really does carry enchants in
  // nine slots, so this asserts the replacement, not a vacuous case.
  it("does not leak the skeleton's enchants onto bare worn slots", () => {
    const skeleton = loadJson(
      "data/presets/ret/p2.raid-sim-skeleton.json"
    ) as RaidSimRequest;
    const skeletonItems = (
      skeleton as unknown as {
        raid: {
          parties: Array<{
            players: Array<{
              equipment: { items: Array<{ enchant?: number }> };
            }>;
          }>;
        };
      }
    ).raid.parties[0]!.players[0]!.equipment.items;

    const enchantedSlots = skeletonItems
      .map((it, i) => (it?.enchant ? i : -1))
      .filter((i) => i >= 0);
    expect(enchantedSlots.length).toBeGreaterThan(0);

    const worn = skeletonItems.map((_, i) =>
      i === enchantedSlots[0] ? { id: 28430, gems: [] } : { gems: [] }
    );

    const got = compose(skeleton, {
      name: "probe",
      race: "RaceHuman",
      equipment: worn,
    }) as unknown as {
      raid: {
        parties: Array<{
          players: Array<{ equipment: { items: Array<{ enchant?: number }> } }>;
        }>;
      };
    };

    const composed = got.raid.parties[0]!.players[0]!.equipment.items;
    expect(composed.filter((it) => it?.enchant)).toEqual([]);
    expect(composed[enchantedSlots[0]!]).toEqual({ id: 28430 });
  });
});

// Ticket 212: the WASM sim is built without with_db, so its item registry is
// filled per request from player.database. compose never wrote that field, so
// every candidate — never worn, never in the skeleton's database — panicked
// before iterating. compose stays pure: it writes rows it is handed.
describe("compose — player.database (ticket 212)", () => {
  const DB = {
    items: [{ id: 30129, name: "Marker" }],
  } as const;

  function playerSlot(req: RaidSimRequest): Record<string, unknown> {
    return (
      req as unknown as {
        raid: { parties: Array<{ players: Array<Record<string, unknown>> }> };
      }
    ).raid.parties[0]!.players[0]!;
  }

  function bareSkeleton(withDatabase: boolean): RaidSimRequest {
    const player: Record<string, unknown> = {
      name: "seed",
      race: "RaceHuman",
      equipment: { items: [{ id: 28430 }] },
    };
    if (withDatabase) player.database = { items: [{ id: 1, name: "Worn" }] };
    return {
      raid: { parties: [{ players: [player] }] },
    } as unknown as RaidSimRequest;
  }

  it("writes the database it is handed onto the player slot", () => {
    const got = compose(bareSkeleton(false), {
      name: "probe",
      race: "RaceHuman",
      equipment: [{ id: 30129, gems: [] }],
      database: DB,
    });

    expect(playerSlot(got).database).toEqual(DB);
  });

  it("leaves the skeleton's database untouched when handed none", () => {
    const got = compose(bareSkeleton(true), {
      name: "probe",
      race: "RaceHuman",
      equipment: [{ id: 28430, gems: [] }],
    });

    expect(playerSlot(got).database).toEqual({
      items: [{ id: 1, name: "Worn" }],
    });
  });

  it("adds no database field when neither skeleton nor player has one", () => {
    const got = compose(bareSkeleton(false), {
      name: "probe",
      race: "RaceHuman",
      equipment: [{ id: 28430, gems: [] }],
    });

    expect(playerSlot(got)).not.toHaveProperty("database");
  });
});

describe("ret P2 preset ↔ skeleton mappings", () => {
  // Four fields are byte-identical between IndividualSimSettings and the
  // golden RaidSimRequest skeleton. player is deliberately unchecked — the
  // delta is APL merge + inert consumable menus (compose handoff §3).
  it("keeps raidBuffs, debuffs, partyBuffs, and encounter identical", () => {
    const preset = loadJson(
      "data/presets/ret/p2.individual-sim-settings.json"
    ) as Record<string, unknown>;
    const skeleton = loadJson("data/presets/ret/p2.raid-sim-skeleton.json") as {
      raid: {
        buffs: unknown;
        debuffs: unknown;
        parties: Array<{ buffs: unknown }>;
      };
      encounter: unknown;
    };

    expect(skeleton.raid.buffs).toEqual(preset.raidBuffs);
    expect(skeleton.raid.debuffs).toEqual(preset.debuffs);
    expect(skeleton.raid.parties[0]?.buffs).toEqual(preset.partyBuffs);
    expect(skeleton.encounter).toEqual(preset.encounter);
  });

  it("has bare finger1/finger2 (symmetry invariant — PLAN.md §9)", () => {
    const skeleton = loadJson("data/presets/ret/p2.raid-sim-skeleton.json") as {
      raid: {
        parties: Array<{
          players: Array<{
            equipment?: { items?: Array<{ enchant?: number }> };
          }>;
        }>;
      };
    };
    const items = skeleton.raid.parties[0]?.players[0]?.equipment?.items ?? [];
    // SIM_ORDER: finger1=10, finger2=11
    expect(items[10]?.enchant).toBeUndefined();
    expect(items[11]?.enchant).toBeUndefined();
  });
});
