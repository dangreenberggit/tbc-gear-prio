import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ItemSlot } from "../src/items.js";
import {
  filterByZone,
  filterPoolByPhase,
  filterPoolByZone,
  ITEM_SOURCE_KINDS,
  poolFromUniverse,
  simSlotsForPoolSlot,
  zonesInPool,
  type ItemSourceKind,
  type PoolEntry,
} from "../src/pool.js";
import { SIM_ORDER } from "../src/slots.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const pool: PoolEntry[] = [
  {
    itemId: 1,
    name: "P1",
    slot: "neck",
    phase: 1,
    curationHint: 10,
    source: { kind: "raid", zone: "Karazhan" },
  },
  {
    itemId: 2,
    name: "P2",
    slot: "neck",
    phase: 2,
    curationHint: 50,
    source: { kind: "raid", zone: "Serpentshrine Cavern" },
  },
  {
    itemId: 3,
    name: "P3",
    slot: "neck",
    phase: 3,
    curationHint: 100,
    source: { kind: "raid", zone: "Black Temple" },
  },
  {
    itemId: 4,
    name: "Badge",
    slot: "finger",
    phase: 1,
    source: { kind: "badge", cost: 25 },
  },
];

describe("filterPoolByPhase", () => {
  it("keeps entries with phase <= maxPhase (inclusive)", () => {
    expect(filterPoolByPhase(pool, 1).map((e) => e.itemId)).toEqual([1, 4]);
    expect(filterPoolByPhase(pool, 2).map((e) => e.itemId)).toEqual([1, 2, 4]);
    expect(filterPoolByPhase(pool, 3).map((e) => e.itemId)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("gates the shipping universe, not just a hand-built pool", () => {
    // rank.test.ts's maxPhase gate injects a two-item pool through deps.pool,
    // so it proves the filter works on a fixture and says nothing about the
    // artifact that ships. This pins the real one (ticket 23 item 3).
    const universe = poolFromUniverse(
      JSON.parse(
        readFileSync(join(root, "data/universes/ret-p2.json"), "utf8")
      ) as Parameters<typeof poolFromUniverse>[0]
    );
    const atOne = filterPoolByPhase(universe, 1);
    const atTwo = filterPoolByPhase(universe, 2);

    expect(atOne.length).toBeGreaterThan(0);
    expect(atTwo.length).toBeGreaterThan(atOne.length);
    expect(atTwo.length).toBe(universe.length);
    expect(atOne.every((e) => e.phase <= 1)).toBe(true);

    // Inclusive means a phase-1 item survives maxPhase 2 — the property R2
    // called load-bearing, since a per-tier gate would strand Karazhan gear.
    const chokerOfVileIntent = 29381; // phase 1
    const bloodseaBrigandsVest = 30101; // phase 2
    expect(atOne.some((e) => e.itemId === chokerOfVileIntent)).toBe(true);
    expect(atTwo.some((e) => e.itemId === chokerOfVileIntent)).toBe(true);
    expect(atOne.some((e) => e.itemId === bloodseaBrigandsVest)).toBe(false);
    expect(atTwo.some((e) => e.itemId === bloodseaBrigandsVest)).toBe(true);
  });
});

describe("simSlotsForPoolSlot", () => {
  it("maps every ItemSlot onto slots the sim actually has", () => {
    // rank.ts looks each name up with SIM_ORDER.indexOf. A name that is not
    // there used to `continue`, dropping the candidate from the ranking with
    // no error and no substitution row — an item silently missing from the
    // shortlist. rank.ts now throws instead; this pins that the throw is
    // unreachable, which is the part that actually protects the ranking.
    const allSlots: ItemSlot[] = [
      "head",
      "neck",
      "shoulder",
      "back",
      "chest",
      "wrist",
      "hands",
      "waist",
      "legs",
      "feet",
      "finger",
      "trinket",
      "weapon",
      "ranged",
    ];
    for (const slot of allSlots) {
      const names = simSlotsForPoolSlot(slot);
      expect(names.length, `${slot} maps to nothing`).toBeGreaterThan(0);
      for (const name of names) {
        expect(SIM_ORDER, `${slot} -> ${name}`).toContain(name);
      }
    }
  });

  it("sends paired slots to both positions and two-handers to mainhand", () => {
    expect(simSlotsForPoolSlot("finger")).toEqual(["finger1", "finger2"]);
    expect(simSlotsForPoolSlot("trinket")).toEqual(["trinket1", "trinket2"]);
    expect(simSlotsForPoolSlot("weapon")).toEqual(["mainhand"]);
  });
});

describe("filterPoolByZone", () => {
  it("keeps only entries whose source carries the requested zone", () => {
    expect(filterPoolByZone(pool, "Karazhan").map((e) => e.itemId)).toEqual([
      1,
    ]);
    expect(filterPoolByZone(pool, "Black Temple").map((e) => e.itemId)).toEqual(
      [3]
    );
    expect(filterPoolByZone(pool, "Serpentshrine Cavern")).toHaveLength(1);
  });

  it("drops entries without a zone on the source (badge, pvp, etc.)", () => {
    expect(filterPoolByZone(pool, "Karazhan")).not.toContainEqual(
      expect.objectContaining({ itemId: 4 })
    );
  });

  it("matches any zone in sources[], not only the primary source", () => {
    const multi: PoolEntry[] = [
      {
        itemId: 30129,
        name: "Crystalforge Breastplate",
        slot: "chest",
        phase: 2,
        source: {
          kind: "token",
          zone: "Tempest Keep",
          token: "Chestguard of the Forgotten Conqueror",
        },
        sources: [
          {
            kind: "token",
            zone: "Tempest Keep",
            token: "Chestguard of the Forgotten Conqueror",
          },
          { kind: "raid", zone: "Serpentshrine Cavern", boss: "Lady Vashj" },
        ],
      },
    ];
    expect(
      filterPoolByZone(multi, "Serpentshrine Cavern").map((e) => e.itemId)
    ).toEqual([30129]);
    expect(
      filterPoolByZone(multi, "Tempest Keep").map((e) => e.itemId)
    ).toEqual([30129]);
  });
});

describe("filterByZone", () => {
  it("works on any object with a source field", () => {
    const ranked = pool.map((e) => ({ ...e, deltaDps: 1 }));
    expect(filterByZone(ranked, "Karazhan")).toHaveLength(1);
  });
});

describe("zonesInPool", () => {
  it("returns sorted unique zone names from pool sources", () => {
    expect(zonesInPool(pool)).toEqual([
      "Black Temple",
      "Karazhan",
      "Serpentshrine Cavern",
    ]);
  });
});

describe("poolFromUniverse", () => {
  it("maps universe rows to PoolEntry with a primary source", () => {
    const entries = poolFromUniverse({
      entries: [
        {
          itemId: 28672,
          name: "Drape of the Dark Reavers",
          slot: "back",
          phase: 1,
          curationHint: 68.49,
          sources: [{ kind: "raid", zone: "Karazhan", boss: "Shade of Aran" }],
        },
      ],
    });
    expect(entries[0]).toMatchObject({
      itemId: 28672,
      source: { kind: "raid", zone: "Karazhan", boss: "Shade of Aran" },
      curationHint: 68.49,
      sources: [{ kind: "raid", zone: "Karazhan", boss: "Shade of Aran" }],
    });
  });

  it("accepts legacy ep key from assembled universe JSON", () => {
    const entries = poolFromUniverse({
      entries: [
        {
          itemId: 1,
          name: "Legacy",
          slot: "neck",
          phase: 1,
          ep: 42,
          sources: [{ kind: "raid", zone: "Karazhan" }],
        },
      ],
    });
    expect(entries[0]!.curationHint).toBe(42);
  });
});

describe("item-source-kinds.json", () => {
  // The union/generated-list agreement is enforced at compile time in pool.ts
  // (`_JsonCoversUnion` / `_UnionCoversJson`), which is possible now that the
  // list comes from generated `as const` code rather than a JSON import.
  //
  // This stays as a second, independent check because the compile-time one
  // compares the union against the *generated file*, while Python reads the
  // *JSON*. `pnpm codegen:json-types:check` ties those two together, so this
  // test is what fails loudly if someone regenerates from a JSON that no
  // longer says what the union says.
  it("matches the ItemSource union exactly", () => {
    // Exhaustive by construction: this object is typed by the union, so
    // adding a variant to ItemSource without adding it here fails typecheck,
    // and the assertion below then catches a JSON that was not updated too.
    const everyUnionKind: Record<ItemSourceKind, true> = {
      raid: true,
      token: true,
      badge: true,
      crafted: true,
      rep: true,
      heroic: true,
      pvp: true,
      world: true,
    };
    // Read the JSON off disk rather than the generated re-export: that is the
    // file Python opens, and checking the generated copy would only prove the
    // generator is self-consistent.
    const fromJson = (
      JSON.parse(
        readFileSync(
          join(root, "packages/core/src/item-source-kinds.json"),
          "utf8"
        )
      ) as { kinds: string[] }
    ).kinds;
    expect([...fromJson].sort()).toEqual(Object.keys(everyUnionKind).sort());
    expect([...ITEM_SOURCE_KINDS].sort()).toEqual([...fromJson].sort());
  });

  it("is the list assemble_universe.py validates against", () => {
    const py = readFileSync(join(root, "scripts/assemble_universe.py"), "utf8");
    expect(py).toContain("item-source-kinds.json");
  });
});

describe("data/universes/ret-p2.json", () => {
  it("loads as a non-empty pool with resolvable sources", () => {
    const data = JSON.parse(
      readFileSync(join(root, "data/universes/ret-p2.json"), "utf8")
    ) as { entries: unknown[] };
    const entries = poolFromUniverse(
      data as Parameters<typeof poolFromUniverse>[0]
    );
    // 224 -> 238: +28774 Glaive of the Pit (polearms are paladin-equippable,
    // the D7 rule used to reject them alongside staves) and the 13 Doomwalker /
    // Doom Lord Kazzak drops now resolving through AtlasLoot's WorldBossesBC.
    // 238 -> 230: classAllowlist is enforced, evicting 8 class-specific SSC/TK
    // trinkets a paladin cannot equip (ticket 25).
    expect(entries.length).toBe(230);
    for (const e of entries) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
  });
});
