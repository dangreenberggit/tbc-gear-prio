import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  SIM_ORDER,
  WCL_ORDER,
  mapWclGearToSim,
  type WclGearEntry,
} from "../src/slots.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function slamaltmanGear(): WclGearEntry[] {
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
    const actor = actors.get(ev.sourceID);
    if (actor?.name.toLowerCase() === "slamaltman") return ev.gear;
  }
  throw new Error("slamaltman not found in fixture");
}

describe("slot table", () => {
  it("drops shirt and tabard and keeps 17 sim slots", () => {
    expect(WCL_ORDER).toHaveLength(19);
    expect(SIM_ORDER).toHaveLength(17);
    expect(WCL_ORDER).toContain("SHIRT");
    expect(WCL_ORDER).toContain("TABARD");
    expect(SIM_ORDER).not.toContain("SHIRT");
    expect(SIM_ORDER).not.toContain("TABARD");
  });

  it("is the single source of truth shared with Python scripts", () => {
    const table = JSON.parse(
      readFileSync(join(root, "packages/core/src/slots-table.json"), "utf8")
    ) as { wclOrder: string[]; simOrder: string[] };
    expect(table.wclOrder).toEqual([...WCL_ORDER]);
    expect(table.simOrder).toEqual([...SIM_ORDER]);
  });
});

describe("mapWclGearToSim", () => {
  it("maps all 17 slamaltman slots (drop-and-reorder, not filter-only)", () => {
    const mapped = mapWclGearToSim(slamaltmanGear());
    // Full expected ids in SIM_ORDER — back must be WCL[14]=28672, not chest.
    expect(mapped.map((item) => item.id ?? 0)).toEqual([
      32461, // head
      30022, // neck
      30055, // shoulder
      28672, // back  ← WCL index 14
      30129, // chest
      28795, // wrist
      29947, // hands
      28779, // waist
      30257, // legs
      30081, // feet
      28757, // finger1
      30834, // finger2
      28830, // trinket1
      29383, // trinket2
      28430, // mainhand
      0, // offhand empty
      27484, // ranged
    ]);
  });

  it("preserves enchant and gems on the reordered back slot", () => {
    const mapped = mapWclGearToSim(slamaltmanGear());
    const back = mapped[3];
    expect(back).toEqual({
      id: 28672,
      enchant: 368,
      gems: [],
    });
  });

  it("rejects gear that is not 19 WCL slots", () => {
    expect(() => mapWclGearToSim([])).toThrow(/19/);
  });
});
