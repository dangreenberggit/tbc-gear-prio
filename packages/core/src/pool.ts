/**
 * Candidate pool types and filters (PLAN.md §8.3).
 * Pool files are loaded by the CLI and injected via Deps — core stays pure.
 */

import type { ItemSourceKindName } from "./item-source-kinds.generated.js";
import type { ItemSlot } from "./items.js";
import type { SimOrderName } from "./slots-sim-order.generated.js";

export {
  ITEM_SOURCE_KINDS,
  type ItemSourceKindName,
} from "./item-source-kinds.generated.js";

/**
 * Which input asserted a source row.
 *
 * Orthogonal to `kind`, so it intersects the union rather than being repeated
 * on all nine variants. It matters because the inputs are not equally
 * trustworthy: `db`, `atlasloot` and `two-hop` are machine parses or curated
 * files with correction notes, while `wowhead` is an agent transcribing a
 * rendered page. Every defect in carry-forward 48-53 arrived on the `wowhead`
 * path, and each was caught only by disagreeing with one of the others — so
 * "how many independent witnesses does this claim have" is the question that
 * finds this class, and it is unanswerable without this field.
 */
export type ItemSourceOrigin =
  "db" | "atlasloot" | "two-hop" | "wowhead" | "curated" | "sunmote";

export type ItemSource = { origin?: ItemSourceOrigin } & (
  | { kind: "raid"; zone: string; boss?: string }
  | { kind: "token"; zone: string; boss?: string; token: string }
  | { kind: "badge"; cost: number }
  /**
   * `recipeZone` is set only when the recipe itself drops in a raid, so raid
   * views can attribute the craft to that raid's shopping list.
   *
   * `recipeFaction*` is the vendor-sold counterpart: the recipe is bought at a
   * standing rather than dropped, so there is no zone to claim and no raid
   * shopping list to join. A recipe can have both routes; they are recorded
   * independently rather than collapsed, because "drops in BT" and "costs
   * Honored with the Ashtongue" are different costs to the player
   * (ticket 65 step 4). `recipeFactionId` is the identity; the two strings are
   * display, exactly as on the `rep` variant.
   */
  | {
      kind: "crafted";
      profession: string;
      recipeZone?: string;
      recipeBoss?: string;
      recipeFaction?: string;
      recipeStanding?: string;
      recipeFactionId?: number;
    }
  /**
   * `factionId` is the game-canonical faction id (`Faction.dbc`), agreed
   * id-for-id by wowsims, `ui.proto` and AtlasLoot. It is the identity;
   * `faction` is a display string with one consumer (`formatItemSource`) and
   * must never be compared or joined on.
   *
   * Every faction has an id — Wowhead exposes it in the URL
   * (`wowhead.com/tbc/faction=1011/lower-city`). A prose row states the faction
   * in English, so `assemble_universe.rep_source` resolves that string against
   * `data/faction_ids.json` (AtlasLoot's 20 TBC factions) and attaches the id.
   *
   * Still optional, because resolution can miss: a spelling absent from that
   * table yields a row with no id rather than a dropped source, since the guide
   * is the only witness for some vendor items. An unresolved faction is a gap
   * in our extraction, not a faction without an id — see
   * .scratch/carry-forward/notes/65-faction-ids.md.
   */
  | { kind: "rep"; faction: string; standing: string; factionId?: number }
  | { kind: "heroic"; dungeon: string }
  | { kind: "pvp"; via: "arena" | "honor"; season?: number }
  | { kind: "world" }
  /**
   * Origin not recorded by any input. Membership came from the wowsims curated
   * gear sets, which equip the item on this spec without saying where it comes
   * from — mostly badge and reputation gear that persists across phases.
   *
   * Deliberately carries no fields: `badge` needs a cost and `rep` needs a
   * faction, and inventing either would be a false provenance claim. Having no
   * `zone` is what keeps these out of every raid and boss filter (`view.ts`
   * `matchesZone`), which is the behaviour we actually need from them.
   */
  | { kind: "unknown" }
);

export type ItemSourceKind = ItemSource["kind"];

/**
 * The union owns the per-kind *shape*; the JSON owns the list that crosses to
 * `assemble_universe.py`. These two lines are what keep them from drifting,
 * and they are a real check only because `ItemSourceKindName` comes from
 * generated `as const` code rather than the JSON import it replaced — that
 * import widened to `string[]`, so the same assertions passed vacuously.
 *
 * Adding a variant above without regenerating (or vice versa) is now a
 * compile error naming the missing kind. `pnpm verify` separately fails if the
 * generated file is stale against the JSON.
 */
type Assert<_ extends true> = true;
type Extends<A, B> = [A] extends [B] ? true : false;
type _JsonCoversUnion = Assert<Extends<ItemSourceKind, ItemSourceKindName>>;
type _UnionCoversJson = Assert<Extends<ItemSourceKindName, ItemSourceKind>>;

export type PoolEntry = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  phase: number;
  source: ItemSource;
  /** Full provenance when loaded from a universe row; raid view matches any. */
  sources?: ItemSource[];
  /**
   * Unvalidated ordering hint for curation scripts only — not a measured
   * quantity and not used by rankUpgrades. Libram values are hand-typed.
   */
  curationHint?: number;
  bisTags?: Array<"BiS" | "Alt" | "Realistic">;
  /**
   * Every pinned upstream gear set that equips this item (e.g. `["p1","p2"]`),
   * regardless of stage. Full provenance: an item curated only for an earlier
   * stage keeps this and loses `bisTags`.
   */
  curatedSets?: string[];
  /**
   * The current-stage sets behind `bisTags`. Present only alongside a `BiS`
   * tag — "BiS" is a claim about a stage, never absolute, so the row names
   * which one. See `bis_set_labels_for_max_phase` in
   * `scripts/assemble_universe.py`.
   */
  bisSets?: string[];
};

/** Row shape from `data/universes/ret-p*.json` before normalization. */
export type UniverseEntry = {
  itemId: number;
  name: string;
  slot: ItemSlot;
  phase: number;
  sources: ItemSource[];
  curationHint?: number;
  /** @deprecated JSON key from pre-rename generators; mapped to curationHint */
  ep?: number;
  bisTags?: Array<"BiS" | "Alt" | "Realistic">;
  curatedSets?: string[];
  bisSets?: string[];
};

export function poolEntryFromUniverse(entry: UniverseEntry): PoolEntry {
  const source = entry.sources[0];
  if (!source) {
    throw new Error(`universe row ${entry.itemId} has no sources`);
  }
  const curationHint = entry.curationHint ?? entry.ep;
  return {
    itemId: entry.itemId,
    name: entry.name,
    slot: entry.slot,
    phase: entry.phase,
    source,
    sources: [...entry.sources],
    ...(curationHint !== undefined ? { curationHint } : {}),
    ...(entry.bisTags !== undefined ? { bisTags: entry.bisTags } : {}),
    ...(entry.curatedSets !== undefined
      ? { curatedSets: [...entry.curatedSets] }
      : {}),
    ...(entry.bisSets !== undefined ? { bisSets: [...entry.bisSets] } : {}),
  };
}

export function poolFromUniverse(data: {
  entries: readonly UniverseEntry[];
}): PoolEntry[] {
  return data.entries.map(poolEntryFromUniverse);
}

/** Inclusive maxPhase filter (PLAN.md §4 / R2). */
export function filterPoolByPhase(
  pool: readonly PoolEntry[],
  maxPhase: number
): PoolEntry[] {
  return pool.filter((e) => e.phase <= maxPhase);
}

function sourceHasZone(source: ItemSource, zone: string): boolean {
  return "zone" in source && source.zone === zone;
}

export function filterByZone<
  T extends { source: ItemSource; sources?: readonly ItemSource[] },
>(entries: readonly T[], zone: string): T[] {
  return entries.filter(
    (e) =>
      sourceHasZone(e.source, zone) ||
      (e.sources?.some((s) => sourceHasZone(s, zone)) ?? false)
  );
}

export function filterPoolByZone(
  pool: readonly PoolEntry[],
  zone: string
): PoolEntry[] {
  return filterByZone(pool, zone);
}

export function zonesInPool(pool: readonly PoolEntry[]): string[] {
  const zones = new Set<string>();
  for (const e of pool) {
    if ("zone" in e.source) zones.add(e.source.zone);
    for (const s of e.sources ?? []) {
      if ("zone" in s) zones.add(s.zone);
    }
  }
  return [...zones].sort();
}

/**
 * A sim equipment slot name, as `SIM_ORDER` spells it.
 *
 * The comment that used to sit here said this had to be written out because
 * `slots-table.json` widens to `string` under `resolveJsonModule` — true of
 * the JSON import, but `SimOrderName` now comes from generated `as const`
 * code, so constraining against it is a real check. This stays a hand-written
 * union because it is a *subset*: `SIM_ORDER` also carries `offhand`, which
 * ret never fills and no pool slot maps onto.
 */
export type SimSlotName = Extract<
  SimOrderName,
  | Exclude<ItemSlot, "finger" | "trinket" | "weapon">
  | "finger1"
  | "finger2"
  | "trinket1"
  | "trinket2"
  | "mainhand"
>;

/**
 * `Extract` yields `never` for a member absent from `SIM_ORDER`, which would
 * turn a typo into a quietly-narrower type rather than an error. These pin the
 * two shapes that would go missing first; `pool.test.ts` still checks every
 * value against `SIM_ORDER` at runtime.
 */
type _SimSlotNameKeepsWeapon = Assert<Extends<"mainhand", SimSlotName>>;
type _SimSlotNameKeepsRings = Assert<Extends<"finger2", SimSlotName>>;

/**
 * Map pool slot → sim equipment slot name(s). Rings/trinkets try both; ret
 * two-handers land in mainhand.
 */
export function simSlotsForPoolSlot(slot: ItemSlot): readonly SimSlotName[] {
  switch (slot) {
    case "finger":
      return ["finger1", "finger2"];
    case "trinket":
      return ["trinket1", "trinket2"];
    case "weapon":
      return ["mainhand"];
    default:
      return [slot];
  }
}
