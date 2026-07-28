/**
 * Legacy curated EP pool fixtures — not the rank membership path.
 * Rank loads data/universes/ret-p*.json. These tests only guard leftover
 * data/pools/ret.json integrity and the maxPhase↔gem-palette pairing.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemsForPhase } from "../src/gems.js";
import {
  filterPoolByPhase,
  poolFromUniverse,
  type PoolEntry,
} from "../src/pool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const curated = JSON.parse(
  readFileSync(join(root, "data/pools/ret.json"), "utf8")
) as { entries: Array<PoolEntry & { ep?: number }> };

const curatedEntries: PoolEntry[] = curated.entries.map((e) => ({
  itemId: e.itemId,
  name: e.name,
  slot: e.slot,
  phase: e.phase,
  source: e.source,
  curationHint: e.curationHint ?? e.ep,
  bisTags: e.bisTags,
}));

const universeP2 = poolFromUniverse(
  JSON.parse(
    readFileSync(join(root, "data/universes/ret-p2.json"), "utf8")
  ) as Parameters<typeof poolFromUniverse>[0]
);

describe("data/pools/ret.json (legacy — not rank membership)", () => {
  it("ships no null sources if the file is still present", () => {
    expect(curatedEntries.length).toBeGreaterThan(0);
    for (const e of curatedEntries) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
  });
});

describe("maxPhase filters universe pool and gem palette together", () => {
  it("raises maxPhase to admit higher-phase universe rows and gems", () => {
    const at1 = filterPoolByPhase(universeP2, 1);
    const at2 = filterPoolByPhase(universeP2, 2);
    expect(at2.length).toBeGreaterThan(at1.length);
    expect(at1.every((e) => e.phase <= 1)).toBe(true);
    expect(at2.every((e) => e.phase <= 2)).toBe(true);

    const gems1 = gemsForPhase(1);
    const gems2 = gemsForPhase(2);
    expect(gems2.length).toBeGreaterThanOrEqual(gems1.length);
    expect(gems1.every((g) => g.phase <= 1)).toBe(true);
    expect(gems2.every((g) => g.phase <= 2)).toBe(true);
  });
});
