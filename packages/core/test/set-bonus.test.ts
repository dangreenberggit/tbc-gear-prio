import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { setBreakNote } from "../src/set-bonus.js";
import { SIM_ORDER, type SimItemSpec } from "../src/slots.js";

function blank(): SimItemSpec[] {
  return SIM_ORDER.map(() => ({ gems: [] }));
}

describe("setBreakNote", () => {
  it("flags dropping below a 2-piece Crystalforge bonus", () => {
    const gear = blank();
    const chest = SIM_ORDER.indexOf("chest");
    const hands = SIM_ORDER.indexOf("hands");
    gear[chest] = { id: 30129, gems: [] }; // Crystalforge Breastplate
    gear[hands] = { id: 30130, gems: [] }; // Crystalforge Gauntlets

    const note = setBreakNote(gear, chest, 30102); // Krakken-Heart (no set)
    expect(note).toBe("breaks 2-piece Crystalforge Battlegear (below 2)");
  });

  it("names every set it can currently report on", () => {
    // The `set <id>` fallback in setLabel is unreachable today: all 1957 set
    // items in the generated index carry a setName. Pinned so a future sync
    // that drops the field surfaces here rather than in report text.
    const index = JSON.parse(
      readFileSync(
        new URL("../../../data/items/index.json", import.meta.url),
        "utf8"
      )
    ) as Record<string, { setId: number | null; setName: string | null }>;
    const named = Object.values(index).filter((e) => e.setId != null);
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((e) => !e.setName)).toHaveLength(0);
  });

  it("is silent when the swap keeps the 2-piece", () => {
    const gear = blank();
    const chest = SIM_ORDER.indexOf("chest");
    const hands = SIM_ORDER.indexOf("hands");
    const legs = SIM_ORDER.indexOf("legs");
    gear[chest] = { id: 30129, gems: [] };
    gear[hands] = { id: 30130, gems: [] };
    gear[legs] = { id: 30132, gems: [] };

    // Replace chest with another Crystalforge piece — still 3 pieces.
    expect(setBreakNote(gear, chest, 30131)).toBeUndefined();
  });
});
