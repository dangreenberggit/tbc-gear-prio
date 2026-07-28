import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemsForPhase } from "../src/gems.js";
import { filterPoolByPhase, type PoolEntry } from "../src/pool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const curated = JSON.parse(
  readFileSync(join(root, "data/pools/ret.json"), "utf8")
) as { entries: PoolEntry[] };

describe("data/pools/ret.json", () => {
  it("ships no null sources and stays dense (~12/slot)", () => {
    expect(curated.entries.length).toBeGreaterThanOrEqual(112); // 14×8
    for (const e of curated.entries) {
      expect(e.source, `${e.itemId} ${e.name}`).toBeTruthy();
      expect(e.source.kind).toBeTruthy();
    }
    const bySlot = new Map<string, number>();
    for (const e of curated.entries) {
      bySlot.set(e.slot, (bySlot.get(e.slot) ?? 0) + 1);
    }
    for (const [slot, n] of bySlot) {
      expect(n, slot).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("maxPhase filters pool and gem palette together", () => {
  it("raises maxPhase to admit higher-phase pool rows and gems", () => {
    const at1 = filterPoolByPhase(curated.entries, 1);
    const at2 = filterPoolByPhase(curated.entries, 2);
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
