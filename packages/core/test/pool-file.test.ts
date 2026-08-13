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

/**
 * cli.ts builds `ret-p${maxPhase}` for whatever tier it is given, so every
 * tier phase_raids.json advertises needs a file or the run dies at load with
 * "missing universe file". p4/p5 were advertised and absent (ticket 23).
 *
 * Stage 1 is deliberately out of scope: assemble_universe.py only accepts
 * --max-phase 2..5, because the Wowhead list stages start at "p1-p2".
 */
describe("every advertised tier has a universe", () => {
  const advertised = [
    ...new Set(
      (
        JSON.parse(
          readFileSync(join(root, "data/phase_raids.json"), "utf8")
        ) as { zones: Array<{ phase: number }> }
      ).zones.map((z) => z.phase)
    ),
  ]
    .filter((p) => p >= 2)
    .sort((a, b) => a - b);

  it.each(advertised)("loads ret-p%i.json", (phase) => {
    const raw = JSON.parse(
      readFileSync(join(root, `data/universes/ret-p${phase}.json`), "utf8")
    ) as Parameters<typeof poolFromUniverse>[0];
    const pool = poolFromUniverse(raw);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((e) => e.phase <= phase)).toBe(true);
  });

  // R2's rule: tier is a user input, filtered *inclusively*. A higher tier
  // must never drop an item a lower one admitted.
  it("keeps each tier a superset of the one below", () => {
    const ids = advertised.map(
      (phase) =>
        new Set(
          poolFromUniverse(
            JSON.parse(
              readFileSync(
                join(root, `data/universes/ret-p${phase}.json`),
                "utf8"
              )
            ) as Parameters<typeof poolFromUniverse>[0]
          ).map((e) => e.itemId)
        )
    );
    for (let i = 1; i < ids.length; i++) {
      const missing = [...ids[i - 1]!].filter((id) => !ids[i]!.has(id));
      expect(
        missing,
        `p${advertised[i]} drops items p${advertised[i - 1]} admitted`
      ).toEqual([]);
    }
  });
});
