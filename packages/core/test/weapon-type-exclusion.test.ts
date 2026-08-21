/**
 * Every supported spec's weapon-type exclusion rule, asserted from committed
 * data only (ticket 228, box 4).
 *
 * This file deliberately lives outside pool-hardening.test.ts and carries no
 * vendor guard of any kind. The closure this replaces discharged the ret half
 * against `it.skipIf(!hasWowsimsVendor)` in that file, which reads the
 * gitignored vendor/wowsims/db.json: on a fresh clone or in CI it skips rather
 * than fails, and vitest reports the file as passing. Any `skipIf` added here
 * reintroduces exactly that hole, so there is none.
 *
 * The join is over two committed files. Universe rows carry no `weaponType`,
 * but they carry `itemId`, and data/items/index.json is committed and keyed by
 * item id with `weaponType` on every row.
 *
 * The set of specs under test comes from data/weapon-type-exclusions.json,
 * which the generator emits from SPEC_PROFILES as a whole rather than from its
 * --spec argument. A third spec is therefore covered the moment its universe
 * artifact is committed, with no edit here: nothing in this file names ret or
 * feral as the complete list, and no assertion counts the specs.
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

interface IndexItem {
  readonly name: string;
  readonly weaponType: number | null;
}

/**
 * Throws rather than returning a default when a file is missing. A missing
 * manifest must turn this suite red; falling back to `{}` would make every
 * assertion below pass over an empty spec list.
 */
function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(join(root, relativePath), "utf8")) as T;
}

const exclusions = readJson<Record<string, number[]>>(
  "data/weapon-type-exclusions.json"
);
const itemIndex = readJson<Record<string, IndexItem>>("data/items/index.json");

const UNIVERSE_FILES: readonly string[] = readdirSync(
  join(root, "data/universes")
)
  .filter((f) => f.endsWith(".json") && !f.endsWith(".report.json"))
  .sort();

interface UniverseEntry {
  readonly itemId: number;
  readonly name: string;
}

interface Universe {
  readonly spec: string;
  readonly entries: readonly UniverseEntry[];
}

/** Spec comes from the payload; the filename is asserted to agree with it. */
const universes = UNIVERSE_FILES.map((file) => ({
  file,
  universe: readJson<Universe>(`data/universes/${file}`),
}));

const WEAPON_AXE = 1;
const WEAPON_STAFF = 8;
const WEAPON_SWORD = 9;

describe("weapon-type exclusions are covered for every supported spec", () => {
  it("ships at least one universe to check", () => {
    expect(universes.length).toBeGreaterThan(0);
  });

  it("names at least one spec in the manifest", () => {
    expect(Object.keys(exclusions).length).toBeGreaterThan(0);
  });

  /**
   * The coverage guard. Deliberately not a count: asserting "two entries"
   * would stop covering the moment a third spec lands, which is the failure
   * this ticket exists to prevent. A spec with no manifest entry is a
   * failure, never a skip.
   */
  it("has a manifest entry for every spec that ships a universe", () => {
    const specsWithUniverses = [
      ...new Set(universes.map(({ universe }) => universe.spec)),
    ].sort();
    const specsInManifest = Object.keys(exclusions).sort();
    const missing = specsWithUniverses.filter((s) => !(s in exclusions));
    expect(
      missing,
      `specs shipping a universe but absent from exclusions.json: ${missing.join(", ")}`
    ).toEqual([]);
    expect(specsInManifest).toEqual(expect.arrayContaining(specsWithUniverses));
  });

  it("gives every manifest spec a non-empty exclusion set", () => {
    for (const [spec, types] of Object.entries(exclusions)) {
      expect(
        Array.isArray(types),
        `${spec} exclusion set is not an array`
      ).toBe(true);
      expect(types.length, `${spec} excludes nothing`).toBeGreaterThan(0);
    }
  });

  it("derives the same spec from the filename as the payload declares", () => {
    for (const { file, universe } of universes) {
      const match = /^(.+)-p\d+\.json$/.exec(file);
      expect(match, `${file} does not match <spec>-p<N>.json`).not.toBeNull();
      expect(match?.[1], `${file} filename disagrees with payload spec`).toBe(
        universe.spec
      );
    }
  });
});

describe.each(universes)(
  "data/universes/$file admits no excluded weapon type",
  ({ file, universe }) => {
    it("has a manifest entry for its spec", () => {
      expect(
        exclusions[universe.spec],
        `${file} declares spec "${universe.spec}", which exclusions.json does not cover`
      ).toBeDefined();
    });

    it("contains no item whose weapon type its spec excludes", () => {
      const excluded = new Set(exclusions[universe.spec] ?? []);
      const offenders = universe.entries
        .map((entry) => {
          const item = itemIndex[String(entry.itemId)];
          return { entry, weaponType: item?.weaponType ?? null };
        })
        .filter(
          ({ weaponType }) => weaponType !== null && excluded.has(weaponType)
        )
        .map(
          ({ entry, weaponType }) =>
            `${entry.itemId} ${entry.name} (weaponType ${weaponType})`
        );
      expect(offenders, `${file} admits excluded weapon types`).toEqual([]);
    });
  }
);

/**
 * Concrete canaries, so a bug in manifest generation cannot pass vacuously.
 * The paired presence in ret is the point: a pure-absence assertion would
 * still pass if the item had vanished from every universe for an unrelated
 * reason, so ret's presence is what proves the exclusion is spec-specific.
 */
describe("canaries from the original finding", () => {
  function idsIn(file: string): Set<number> {
    return new Set(
      readJson<Universe>(`data/universes/${file}`).entries.map((e) => e.itemId)
    );
  }

  it("keeps Cataclysm's Edge (30902, sword) out of feral and in ret", () => {
    expect(itemIndex["30902"]?.weaponType).toBe(WEAPON_SWORD);
    expect(idsIn("feral-p3.json").has(30902)).toBe(false);
    expect(idsIn("ret-p3.json").has(30902)).toBe(true);
  });

  it("keeps Soul Cleaver (32348, axe) out of the feral pool", () => {
    expect(itemIndex["32348"]?.weaponType).toBe(WEAPON_AXE);
    expect(idsIn("feral-p3.json").has(32348)).toBe(false);
  });

  it("excludes swords for feral and staves for ret in the manifest", () => {
    expect(exclusions["feral"]).toContain(WEAPON_SWORD);
    expect(exclusions["ret"]).toContain(WEAPON_STAFF);
  });
});
