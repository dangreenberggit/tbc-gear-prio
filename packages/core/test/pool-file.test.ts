/**
 * Universe membership pairing — maxPhase filters pool rows and gem palette
 * together. Legacy data/pools/ret.json was removed (not the rank path).
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { gemsForPhase } from "../src/gems.js";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const universeP2 = poolFromUniverse(
  JSON.parse(
    readFileSync(join(root, "data/universes/ret-p2.json"), "utf8")
  ) as Parameters<typeof poolFromUniverse>[0]
);

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
