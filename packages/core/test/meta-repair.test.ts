import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemsForPhase, gemsForQuality, getGem } from "../src/gems.js";
import { getItem } from "../src/items.js";
import { gemColorCounts, metaStatus } from "../src/meta.js";
import {
  repairMeta,
  socketsMatch,
  type SocketedItem,
} from "../src/meta-repair.js";
import { mapWclGearToSim, type WclGearEntry } from "../src/slots.js";
import { epScore, Stat } from "../src/stats.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const retP2Ep = (
  JSON.parse(
    readFileSync(join(root, "data/presets/ret/p2.ep-weights.json"), "utf8")
  ) as { weights: Record<string, number> }
).weights;

function slamaltmanItems(): SocketedItem[] {
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
  let gear: WclGearEntry[] | undefined;
  for (const ev of raw.combatant_info_events) {
    if (actors.get(ev.sourceID)?.name.toLowerCase() === "slamaltman") {
      gear = ev.gear;
      break;
    }
  }
  if (!gear) throw new Error("slamaltman not found");
  return mapWclGearToSim(gear).map((spec) => ({
    itemId: spec.id ?? 0,
    gems: [...spec.gems],
  }));
}

function allGems(items: readonly SocketedItem[]): number[] {
  return items.flatMap((it) => it.gems.filter((g) => g > 0));
}

describe("epScore", () => {
  it("scores ret P2 sparse weights", () => {
    const stats = Array.from({ length: 42 }, () => 0);
    stats[Stat.StatStrength] = 10;
    stats[Stat.StatAttackPower] = 100;
    expect(epScore(stats, retP2Ep)).toBeCloseTo(10 * 1.0 + 100 * 0.41);
  });
});

describe("socketsMatch", () => {
  // Gladiator's Plate Helm (24545): sockets [meta, yellow]. The game only
  // requires the coloured sockets to match for the socket bonus — an
  // unfilled meta socket does not forfeit it (upstream gear.go
  // socketBonusActive skips non-coloured sockets the same way).
  it("is satisfied by a matching yellow socket even with the meta socket empty", () => {
    expect(socketsMatch(24545, [0, 23113])).toBe(true);
  });

  it("still fails when the coloured socket itself does not match", () => {
    const red = 24027; // Bold Living Ruby, red
    expect(socketsMatch(24545, [0, red])).toBe(false);
  });
});

describe("repairMeta", () => {
  it("leaves an already-active slamaltman layout alone", () => {
    const items = slamaltmanItems();
    const head = getItem(items[0]!.itemId)!;
    expect(metaStatus(head.sockets, allGems(items)).kind).toBe("active");

    const result = repairMeta({
      items,
      epWeights: retP2Ep,
      palette: gemsForPhase(2),
    });
    expect(result.metaAdjusted).toBe(false);
    expect(result.swaps).toEqual([]);
  });

  it("repairs slamaltman when yellow contribution is stripped", () => {
    const items = slamaltmanItems();
    // Chest Crystalforge Breastplate — two orange gems are the yellow count.
    const chest = items.find((it) => it.itemId === 30129)!;
    expect(chest.gems).toEqual([24027, 24058, 24058]);
    chest.gems = [24027, 24027, 24027];

    const head = getItem(items[0]!.itemId)!;
    expect(metaStatus(head.sockets, allGems(items)).kind).toBe("inactive");
    expect(gemColorCounts(allGems(items)).yellow).toBe(0);

    const result = repairMeta({
      items,
      epWeights: retP2Ep,
      palette: gemsForPhase(2),
    });
    expect(result.metaAdjusted).toBe(true);
    expect(result.swaps.length).toBeGreaterThan(0);
    expect(metaStatus(head.sockets, allGems(result.items)).kind).toBe("active");
  });

  it("still solves from the rare-capped palette (ticket 117)", () => {
    // Production now hands repairMeta the same rare-capped list the auto-fill
    // uses. That must not make any repair unsolvable: every gem colour exists
    // at rare quality, so the smaller list loses options, never colours.
    const items = slamaltmanItems();
    const chest = items.find((it) => it.itemId === 30129)!;
    chest.gems = [24027, 24027, 24027];

    const head = getItem(items[0]!.itemId)!;
    expect(metaStatus(head.sockets, allGems(items)).kind).toBe("inactive");

    const capped = gemsForQuality(gemsForPhase(2), 3);
    expect(capped.length).toBeLessThan(gemsForPhase(2).length);

    const result = repairMeta({
      items,
      epWeights: retP2Ep,
      palette: capped,
    });
    expect(result.metaAdjusted).toBe(true);
    expect(metaStatus(head.sockets, allGems(result.items)).kind).toBe("active");
    for (const swap of result.swaps) {
      expect(getGem(swap.to)?.quality).toBeLessThanOrEqual(3);
    }
  });

  it("prices socket-bonus forfeiture inside the cost (PLAN.md §9 R4)", () => {
    // Strength-only weights: chest socket bonus is +4 str. Yellow and blue/green
    // gems score 0, so gem-only cost ties at 0 for yellow→green vs yellow→blue;
    // the bonus forfeit is what makes breaking more expensive.
    const strOnly = { "0": 1.0 };
    const items: SocketedItem[] = [
      { itemId: 32461, gems: [32409, 24054] }, // meta + purple → R1 B1
      {
        itemId: 30129,
        gems: [24027, 23113, 23113], // red + 2 yellow, matched, +4 str bonus
      },
    ];
    const head = getItem(32461)!;
    expect(gemColorCounts(allGems(items))).toEqual({
      red: 2,
      yellow: 2,
      blue: 1,
    });
    expect(metaStatus(head.sockets, allGems(items)).kind).toBe("inactive");

    const result = repairMeta({
      items,
      epWeights: strOnly,
      palette: gemsForPhase(2),
    });
    expect(result.metaAdjusted).toBe(true);
    expect(metaStatus(head.sockets, allGems(result.items)).kind).toBe("active");

    const chestSwap = result.swaps.find((s) => s.itemId === 30129);
    expect(chestSwap).toBeDefined();
    // Must recolour a yellow socket to a yellow-matching gem that also
    // contributes blue (green or prismatic) — not a pure blue that would
    // forfeit the +4 str socket bonus.
    expect([1, 2]).toContain(chestSwap!.socketIndex);
    const newGem = gemsForPhase(2).find((g) => g.id === chestSwap!.to);
    expect([5, 8]).toContain(newGem?.colour); // Green or Prismatic
  });
});
