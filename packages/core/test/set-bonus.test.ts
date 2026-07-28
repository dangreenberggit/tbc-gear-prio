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
    expect(note).toMatch(/breaks 2-piece set 629/);
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
