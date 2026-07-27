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
  it("matches the Phase 0 slamaltman RaidSimRequest minus simOptions", () => {
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
