import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ItemSlot } from "../src/items.js";
import {
  bossesInPool,
  filterByZone,
  filterPoolByPhase,
  filterPoolByZone,
  ITEM_SOURCE_KINDS,
  poolFromUniverse,
  simSlotsForPoolSlot,
  sourceMatchesBoss,
  validateViewFilter,
  viewFilterValue,
  zonesInPool,
  type ItemSourceKind,
  type PoolEntry,
} from "../src/pool.js";
import { realPoolEntry } from "./real-source.js";
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
    // 32590 Nethervoid Cloak is a T6-era trash drop that genuinely drops in
    // both Hyjal Summit and Black Temple, so the real universe row exercises
    // a secondary-source zone without inventing anything. Its sources[0] is
    // Hyjal Summit, so a Black Temple match can only come from sources[1..].
    //
    // This used to use 30129 and its Serpentshrine Cavern row, which was not a
    // second true zone but the transcription bug in carry-forward 50 — the
    // test was pinning the defect in place.
    const multi: PoolEntry[] = [realPoolEntry(32590, "ret-p3")];
    expect(
      filterPoolByZone(multi, "Black Temple").map((e) => e.itemId)
    ).toEqual([32590]);
    expect(
      filterPoolByZone(multi, "Hyjal Summit").map((e) => e.itemId)
    ).toEqual([32590]);
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

describe("bossesInPool", () => {
  // Deliberately covers what `zonesInPool`'s fixture cannot: a boss on a
  // secondary `sources` entry, a zoneless kind, a bossless raid source, and
  // one name shared by two zones.
  const bossPool: PoolEntry[] = [
    {
      itemId: 1,
      name: "Kara drop",
      slot: "neck",
      phase: 1,
      curationHint: 1,
      source: { kind: "raid", zone: "Karazhan", boss: "Prince Malchezaar" },
    },
    {
      itemId: 2,
      name: "Kara trash",
      slot: "neck",
      phase: 1,
      curationHint: 1,
      source: { kind: "raid", zone: "Karazhan" },
    },
    {
      itemId: 3,
      name: "Badge, also a BT drop",
      slot: "finger",
      phase: 1,
      curationHint: 1,
      source: { kind: "badge", cost: 25 },
      sources: [
        { kind: "badge", cost: 25 },
        { kind: "raid", zone: "Black Temple", boss: "Illidan Stormrage" },
      ],
    },
    {
      itemId: 4,
      name: "Shared name",
      slot: "neck",
      phase: 1,
      curationHint: 1,
      source: { kind: "raid", zone: "Black Temple", boss: "Prince Malchezaar" },
    },
  ];

  it("returns sorted unique boss names, including from secondary sources", () => {
    expect(bossesInPool(bossPool)).toEqual([
      "Illidan Stormrage",
      "Prince Malchezaar",
    ]);
  });

  it("scopes to one zone when given", () => {
    expect(bossesInPool(bossPool, "Karazhan")).toEqual(["Prince Malchezaar"]);
    expect(bossesInPool(bossPool, "Black Temple")).toEqual([
      "Illidan Stormrage",
      "Prince Malchezaar",
    ]);
  });

  it("returns nothing for a zone with no bosses in the pool", () => {
    expect(bossesInPool(bossPool, "Zul'Aman")).toEqual([]);
  });

  // A name listed as known must actually filter to something, or the
  // validation would reject spellings the filter accepts and vice versa.
  // Through `sourceMatchesBoss` — the same predicate `view.ts`'s `matchesBoss`
  // calls — rather than a fourth hand-rolled copy of the condition. A test
  // that re-implements the filter can agree with itself while `applyView`
  // disagrees, which is the failure it is supposed to catch.
  it("only lists names applyView's boss filter would actually keep", () => {
    for (const zone of [undefined, "Karazhan", "Black Temple"]) {
      const listed = bossesInPool(bossPool, zone);
      expect(listed.length).toBeGreaterThan(0);
      for (const boss of listed) {
        const matched = bossPool.filter((e) =>
          (e.sources ?? [e.source]).some((s) =>
            sourceMatchesBoss(s, boss, zone)
          )
        );
        expect(
          matched.length,
          `${boss} in ${zone ?? "any zone"}`
        ).toBeGreaterThan(0);
      }
    }
  });
});

// The CLI shells out to `wowsimcli`, so `main()` has no test — which is
// exactly how `--boss all` came to exit 2 while `applyView` treated "all" as
// "no filter" (carry-forward 75 review, A1). The decision lives here, pure,
// so the sentinel is pinned even though the wiring is not.
describe("validateViewFilter", () => {
  const known = ["Karazhan", "Black Temple"];

  it("passes the documented 'all' sentinel through unvalidated", () => {
    expect(validateViewFilter("all", known).ok).toBe(true);
    // "all" is never a real zone or boss name, so validating it literally
    // would reject it — the regression this pins.
    expect(known).not.toContain("all");
  });

  it("passes an absent filter", () => {
    expect(validateViewFilter(undefined, known).ok).toBe(true);
  });

  it("passes a known name and rejects a typo", () => {
    expect(validateViewFilter("Karazhan", known).ok).toBe(true);
    const bad = validateViewFilter("Karazan", known);
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.known).toEqual(known);
  });

  it("agrees with applyView on what counts as no filter", () => {
    expect(viewFilterValue("all")).toBeUndefined();
    expect(viewFilterValue(undefined)).toBeUndefined();
    expect(viewFilterValue("Karazhan")).toBe("Karazhan");
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

describe("realPoolEntry (test helper, carry-forward 37)", () => {
  it("returns the item's real source from the committed universe", () => {
    const entry = realPoolEntry(29381);
    expect(entry.name).toBe("Choker of Vile Intent");
    // `origin` is part of the real row: the helper's whole purpose is to hand
    // back what actually shipped, so asserting it here keeps the helper honest
    // rather than letting it drift from the committed data (carry-forward 54).
    expect(entry.source).toEqual({
      kind: "badge",
      cost: 25,
      origin: "wowhead",
    });
  });

  it("throws rather than silently returning a fixture for an id not in the universe", () => {
    expect(() => realPoolEntry(999999)).toThrow(/999999/);
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
      unknown: true,
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
    // 230 -> 235: the wowsims curated gear sets now grant membership rather
    // than only labelling rows that got in some other way, admitting the 5
    // curated ret items with no recorded origin (ticket 41). They carry
    // `{kind: "unknown"}` and so are filtered out of every raid view.
    // 235 -> 236: `{kind: "world"}` (ticket 45 §1) now counts as list-driven
    // membership, the same way badge/pvp/crafted/rep already did, admitting
    // 23203 Libram of Fervor via its "World Drop - Azeroth" Wowhead text.
    // 236 -> 240: a curated item can carry a *real* db source that is still
    // list-only shaped (no zone) -- `curated_list_only` in
    // assemble_universe.py now grants membership for that shape the same way
    // `curated_unsourced` already did for no source at all (ticket 41
    // remainder). +23522 Ragesteel Breastplate, +28429 Lionheart Champion,
    // +28430 Lionheart Executioner, +33173 Ragesteel Shoulders — all
    // `{kind: "crafted"}`, all wowsims-curated, none independently a member
    // because their own Wowhead row uses "Crafting:" prose the parser does
    // not read (ticket 45 leaves that prose unmodeled by design).
    // 240 -> 241: ret_p3.gear.json (slice 6b, 5c7491899) widens the curated
    // union, admitting +33122 Cloak of Darkness (phase 1, so it clears the
    // phase guard curated_unsourced/curated_list_only now enforce -- see
    // assemble_universe.py's `curated` check). A second new member,
    // 32574 Bindings of Lightning Reflexes, is phase 3 and correctly does
    // NOT appear here: that same guard is what excludes it from a p2
    // universe. Before the guard existed it leaked through regardless of its
    // own phase (pool-file.test.ts caught it -- cli.ts's loadUniversePool
    // trusts a universe file's own membership as already phase-scoped and
    // never re-applies filterPoolByPhase).
    expect(entries.length).toBe(241);
    for (const e of entries) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
  });
});
