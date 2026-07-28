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

describe("data/pools/ret.json", () => {
  it("ships no null sources and stays dense (~12/slot)", () => {
    expect(curatedEntries.length).toBeGreaterThanOrEqual(112); // 14×8
    for (const e of curatedEntries) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
    const bySlot = new Map<string, number>();
    for (const e of curatedEntries) {
      bySlot.set(e.slot, (bySlot.get(e.slot) ?? 0) + 1);
    }
    for (const [slot, n] of bySlot) {
      expect(n, slot).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("maxPhase filters pool and gem palette together", () => {
  it("raises maxPhase to admit higher-phase pool rows and gems", () => {
    const at1 = filterPoolByPhase(curatedEntries, 1);
    const at2 = filterPoolByPhase(curatedEntries, 2);
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
