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
  rejectUnwitnessedLocus(entry, universe);
  return poolEntryFromUniverse(entry);
}

/** Origins that are one agent's reading of a page rather than a machine parse. */
const TRANSCRIBED = new Set(["wowhead", "curated"]);

/**
 * A fixture picked *because* it has an interesting shape pins whatever produced
 * that shape. Item 30129 was chosen twice as the multi-zone fixture — by
 * `pool.test.ts` and `view.test.ts`, each asserting it "really does carry" both
 * zones — and its second zone was the carry-forward 50 defect. The tests made
 * the bad data look correct and the eventual fix look like a regression.
 *
 * So a fixture may not rest a zone or boss claim on transcription alone. This
 * is narrower than "must have a machine source": badge and reputation items
 * legitimately have only a `wowhead` origin, because `vendor/atlasloot/` holds
 * only the addon's instance loot tables — its badge, reputation, PvP and crafted
 * modules were never vendored — but they name no place, so nothing about them
 * can be misattributed. Only a locus claim needs a second witness.
 */
function rejectUnwitnessedLocus(entry: UniverseEntry, universe: string): void {
  for (const source of entry.sources) {
    const claimsPlace =
      ("boss" in source && source.boss) ||
      (source.kind === "raid" && "zone" in source);
    if (!claimsPlace) continue;
    if (!TRANSCRIBED.has(source.origin ?? "")) continue;
    const corroborated = entry.sources.some(
      (other) =>
        !TRANSCRIBED.has(other.origin ?? "") &&
        "zone" in other &&
        "zone" in source &&
        other.zone === source.zone
    );
    if (corroborated) continue;
    throw new Error(
      `${itemLabel(entry)} in ${universe} rests a zone/boss claim on transcription alone, ` +
        `so a fixture built from it would pin whatever that claim gets wrong. ` +
        `Pick an item a machine input covers, or construct the shape by hand.`
    );
  }
}

function itemLabel(entry: UniverseEntry): string {
  return `${entry.itemId} ${entry.name}`;
}
