import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemsForPhase, gemsForQuality, getGem } from "../src/gems.js";
import { getItem } from "../src/items.js";
import { gemColorCounts, metaStatus } from "../src/meta.js";
import {
  MetaInfeasibleError,
  MetaRepairError,
  minimizeRegems,
  repairMeta,
  socketsMatch,
  type MetaRepairSwap,
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

  // Exorcist's Plate Helm (28559): sockets [meta] only. With no coloured
  // socket to gate on, an unconditional meta-skip credits the bonus with the
  // socket empty (round-4 review, D1) — the one socket must be filled.
  it("requires a meta-only item's socket filled before crediting its bonus", () => {
    expect(socketsMatch(28559, [0])).toBe(false);
    expect(socketsMatch(28559, [25897])).toBe(true);
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

  it("throws MetaInfeasibleError, not a generic MetaUnsolvableError, when no palette gem can ever help", () => {
    // Same stripped-yellow layout as above, but an empty palette means no
    // recolour exists — genuinely unsolvable, distinct from "gave up
    // searching" (review-corrections.md item 4 / investigation2-comment
    // finding 3: the two were previously the same error class).
    const items = slamaltmanItems();
    const chest = items.find((it) => it.itemId === 30129)!;
    chest.gems = [24027, 24027, 24027];

    let threw: unknown;
    try {
      repairMeta({ items, epWeights: retP2Ep, palette: [] });
    } catch (err) {
      threw = err;
    }
    expect(threw).toBeInstanceOf(MetaInfeasibleError);
    expect(threw).toBeInstanceOf(MetaRepairError);
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

describe("minimizeRegems", () => {
  // 25897 = "more red than blue" (compare-colour meta). Head (28559, meta-only
  // socket) plus three single-socket items (23542 red-socket, 23506
  // blue-socket ×2 roles reused here as generic recolourable slots) — hand-
  // built rather than driven through repairMeta, because the bug this guards
  // is repair leaving *more* swaps than the final layout needs, which needs a
  // fixture with deliberate slack (repairMeta's own greedy loop only ever
  // makes swaps that were individually necessary at the time, so it never
  // manufactures the redundant case on its own; the redundancy investigation2
  // describes arises from restoring a *different* piece's original gem after
  // the fact, which is exactly what this pass does).
  const headId = 28559;
  const itemD = 30001; // stand-in id, only meta-repair.ts's socket lookups matter
  const itemE = 30002;
  const itemF = 30003;
  const redGem = 24027;
  const blueGem = 23118;

  it("restores an original gem when the repair over-corrected past what the meta needs", () => {
    const original: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [blueGem] },
      { itemId: itemE, gems: [blueGem] },
      { itemId: itemF, gems: [blueGem] },
    ];
    // Repair recoloured all three blue sockets to red (red 3 / blue 0) when
    // two would have sufficed (red 2 / blue 1 already satisfies red > blue).
    const repaired: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [redGem] },
      { itemId: itemE, gems: [redGem] },
      { itemId: itemF, gems: [redGem] },
    ];
    const swaps: MetaRepairSwap[] = [
      {
        itemId: itemD,
        itemIndex: 1,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
      {
        itemId: itemE,
        itemIndex: 2,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
      {
        itemId: itemF,
        itemIndex: 3,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
    ];

    const result = minimizeRegems({ original, repaired, swaps });

    expect(
      metaStatus(getItem(headId)!.sockets, allGems(result.items)).kind
    ).toBe("active");
    // Exactly one of the three redundant swaps reverts to the player's
    // original blue gem; the other two stay, since dropping either of them
    // would break red > blue again.
    const revertedCount = result.items.filter(
      (it) => it.itemId !== headId && it.gems[0] === blueGem
    ).length;
    expect(revertedCount).toBe(1);
    // The report drops the reverted swap rather than listing a swap that no
    // longer describes the final layout.
    expect(result.swaps).toHaveLength(2);
    expect(result.swaps.every((s) => s.to === redGem)).toBe(true);
  });

  it("never touches the meta socket itself", () => {
    // If the meta gem were (hypothetically) listed as a "swap" candidate, the
    // pass must refuse to revert it — the meta gem is never optional.
    const original: SocketedItem[] = [{ itemId: headId, gems: [0] }];
    const repaired: SocketedItem[] = [{ itemId: headId, gems: [25897] }];
    const swaps: MetaRepairSwap[] = [
      {
        itemId: headId,
        itemIndex: 0,
        socketIndex: 0,
        from: 0,
        to: 25897,
        cost: 0,
      },
    ];

    const result = minimizeRegems({ original, repaired, swaps });
    expect(result.items[0]!.gems[0]).toBe(25897);
    expect(result.swaps).toEqual(swaps);
  });

  it("is a no-op when every swap is load-bearing", () => {
    const items: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [redGem] },
    ];
    const swaps: MetaRepairSwap[] = [
      {
        itemId: itemD,
        itemIndex: 1,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
    ];
    const original: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [blueGem] },
    ];

    const result = minimizeRegems({
      original,
      repaired: items,
      swaps,
    });
    expect(result.items).toEqual(items);
    expect(result.swaps).toEqual(swaps);
  });

  it("never re-empties a socket the repair filled, even when the meta would survive", () => {
    // Repair filled an originally-empty socket. With red 2 / blue 0 the meta
    // (red > blue) survives removing either red gem, so an unguarded revert
    // would empty the socket again — silently losing the gem's EP and any
    // socket bonus, with the swap gone from the disclosure report (round-4
    // review, A1).
    const original: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [redGem] },
      { itemId: itemE, gems: [0] },
    ];
    const repaired: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [redGem] },
      { itemId: itemE, gems: [redGem] },
    ];
    const swaps: MetaRepairSwap[] = [
      {
        itemId: itemE,
        itemIndex: 2,
        socketIndex: 0,
        from: 0,
        to: redGem,
        cost: 0,
      },
    ];

    const result = minimizeRegems({ original, repaired, swaps });
    expect(result.items[2]!.gems[0]).toBe(redGem);
    expect(result.swaps).toEqual(swaps);
  });

  it("resolves swaps by item index, not item id, when the same id is worn twice", () => {
    // Two copies of one ring id, each repaired blue→red. An id-keyed lookup
    // collapses both swaps onto the first copy (round-4 review, A2). With
    // red 2 / blue 0 one revert survives the meta check; it must land on the
    // copy its swap names.
    const original: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [blueGem] },
      { itemId: itemD, gems: [blueGem] },
      { itemId: itemE, gems: [redGem] },
    ];
    // red 3 / blue 0 after repair: exactly one revert can survive (red 2 /
    // blue 1 keeps red > blue), and the first swap examined names index 2 —
    // so the revert must land there. An id-keyed lookup would revert index 1
    // instead.
    const repaired: SocketedItem[] = [
      { itemId: headId, gems: [25897] },
      { itemId: itemD, gems: [redGem] },
      { itemId: itemD, gems: [redGem] },
      { itemId: itemE, gems: [redGem] },
    ];
    const swaps: MetaRepairSwap[] = [
      {
        itemId: itemD,
        itemIndex: 2,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
      {
        itemId: itemD,
        itemIndex: 1,
        socketIndex: 0,
        from: blueGem,
        to: redGem,
        cost: 0,
      },
    ];

    const result = minimizeRegems({ original, repaired, swaps });
    expect(result.items[2]!.gems[0]).toBe(blueGem);
    expect(result.items[1]!.gems[0]).toBe(redGem);
    expect(result.swaps).toEqual([swaps[1]]);
  });
});
