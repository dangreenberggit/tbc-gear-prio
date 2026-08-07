/**
 * A fixture naming a real item id but hand-writing its `ItemSource` can pass
 * while proving nothing about the data that ships — 45 such literals were
 * found across the suite (carry-forward ticket 37), two of them outright
 * wrong (29381 written as a Karazhan raid drop when it is a badge reward;
 * 28530 reused as a different item's id with an invented name and source).
 * Reading the real row from the committed universe removes the whole class:
 * the fixture can no longer diverge from what the pipeline actually emits.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  poolEntryFromUniverse,
  type PoolEntry,
  type UniverseEntry,
} from "../src/pool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Reads `data/universes/<universe>.json` once per call; universes are small
 * (hundreds of rows), so no caching is worth the staleness risk. */
function loadUniverseEntries(universe: string): UniverseEntry[] {
  const raw = JSON.parse(
    readFileSync(join(root, "data/universes", `${universe}.json`), "utf8")
  ) as { entries: UniverseEntry[] };
  return raw.entries;
}

/**
 * The real `PoolEntry` for `itemId` as shipped in `data/universes/<universe>.json`
 * (e.g. `"ret-p2"`). Throws if the id is not a member of that universe —
 * fixtures should name a real item id or a synthetic one, never a real id
 * that happens not to be in the universe being tested against.
 */
export function realPoolEntry(itemId: number, universe = "ret-p2"): PoolEntry {
  const entry = loadUniverseEntries(universe).find((e) => e.itemId === itemId);
  if (!entry) {
    throw new Error(`${itemId} is not in data/universes/${universe}.json`);
  }
  return poolEntryFromUniverse(entry);
}
