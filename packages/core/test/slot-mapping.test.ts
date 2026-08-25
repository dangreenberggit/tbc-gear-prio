import { describe, expect, it } from "vitest";
import { simSlotsForPoolSlot } from "../src/pool.js";
import { getItem } from "../src/items.js";
import { HandType } from "../src/proto/common_pb.js";
import { SIM_ORDER } from "../src/slots.js";

/**
 * A head item, used to show the filter leaves non-weapon slots alone. Weapon
 * ids are found by hand type at run time (`findByHandType`) rather than
 * hardcoded, so these stay honest if the pinned index regenerates.
 */
const HEAD_ITEM = 32235; // Cursed Vision of Sargeras.

describe("simSlotsForPoolSlot placements", () => {
  it("keeps the paired slots unchanged", () => {
    expect(simSlotsForPoolSlot("finger")).toEqual(["finger1", "finger2"]);
    expect(simSlotsForPoolSlot("trinket")).toEqual(["trinket1", "trinket2"]);
  });

  it("maps an unpaired slot to itself", () => {
    expect(simSlotsForPoolSlot("head")).toEqual(["head"]);
    expect(simSlotsForPoolSlot("ranged")).toEqual(["ranged"]);
  });

  it("leaves ret and feral weapons in the main hand alone", () => {
    // The whole point of gating on spec: neither can hold an offhand, so their
    // rankings must be bit-for-bit what they were before offhand existed.
    expect(simSlotsForPoolSlot("weapon", "ret")).toEqual(["mainhand"]);
    expect(simSlotsForPoolSlot("weapon", "feral")).toEqual(["mainhand"]);
  });

  it("keeps the no-spec call mainhand-only", () => {
    // Callers that predate the spec argument must not silently gain offhand
    // placements they have no worn offhand to compare against.
    expect(simSlotsForPoolSlot("weapon")).toEqual(["mainhand"]);
  });

  it("offers both hands to a dual-wield spec", () => {
    for (const spec of ["rogue", "enh", "warrior", "hunter"] as const) {
      expect(simSlotsForPoolSlot("weapon", spec)).toEqual([
        "mainhand",
        "offhand",
      ]);
    }
  });

  it("only ever names slots that exist in SIM_ORDER", () => {
    // A name outside SIM_ORDER throws at rank time rather than being skipped,
    // so a typo here is a crash on a real run.
    for (const spec of ["ret", "rogue"] as const) {
      for (const name of simSlotsForPoolSlot("weapon", spec)) {
        expect(SIM_ORDER).toContain(name);
      }
    }
  });
});

describe("per-item hand-type filter", () => {
  it("keeps a two-hander out of the off hand", () => {
    // The load-bearing half of the filter: without it every two-hander in the
    // pool is priced as an offhand swap the game cannot equip, so the row
    // would advertise an upgrade the player is unable to take.
    const twoHanders = findByHandType(HandType.HandTypeTwoHand);
    expect(twoHanders.length).toBeGreaterThan(0);
    const id = twoHanders[0]!;
    expect(simSlotsForPoolSlot("weapon", "rogue", id)).toEqual(["mainhand"]);
  });

  it("keeps a main-hand-only weapon out of the off hand", () => {
    // Regression, found in the browser smoke rather than here: HandTypeMainHand
    // is a distinct value from HandTypeTwoHand, carried by 235 items in the
    // pinned db. The first version of this filter excluded only two-handers, so
    // a main-hand-only weapon reached the off hand and the fork's equip logic
    // rejected it with "No slots left to equip" -- which fails the whole
    // ranking run, not just that row. Talon of the Phoenix (32944) is the item
    // that actually broke it.
    expect(getItem(32944)?.handType).toBe(HandType.HandTypeMainHand);
    expect(simSlotsForPoolSlot("weapon", "rogue", 32944)).toEqual(["mainhand"]);

    // And not just that one id: no HandTypeMainHand item may reach the offhand.
    for (const id of findByHandType(HandType.HandTypeMainHand)) {
      expect(simSlotsForPoolSlot("weapon", "rogue", id)).toEqual(["mainhand"]);
    }
  });

  it("keeps an offhand-only item out of the main hand", () => {
    const offhandOnly = findByHandType(HandType.HandTypeOffHand);
    expect(offhandOnly.length).toBeGreaterThan(0);
    const id = offhandOnly[0]!;
    expect(simSlotsForPoolSlot("weapon", "rogue", id)).toEqual(["offhand"]);
  });

  it("lets a one-hander go in either hand for a dual-wield spec", () => {
    const oneHanders = findByHandType(HandType.HandTypeOneHand);
    expect(oneHanders.length).toBeGreaterThan(0);
    const id = oneHanders[0]!;
    expect(simSlotsForPoolSlot("weapon", "rogue", id)).toEqual([
      "mainhand",
      "offhand",
    ]);
    // Same item, non-dual-wield spec: still main hand only.
    expect(simSlotsForPoolSlot("weapon", "ret", id)).toEqual(["mainhand"]);
  });

  it("does not filter a non-weapon slot on hand type", () => {
    // Head items carry handType null; a missing field is not a restriction.
    expect(getItem(HEAD_ITEM)?.handType).toBeNull();
    expect(simSlotsForPoolSlot("head", "rogue", HEAD_ITEM)).toEqual(["head"]);
  });
});

/** Scan the pinned index for ids carrying a given hand type. */
function findByHandType(handType: HandType): number[] {
  const found: number[] = [];
  for (let id = 1; id < 40000 && found.length < 3; id++) {
    if (getItem(id)?.handType === handType) found.push(id);
  }
  return found;
}
