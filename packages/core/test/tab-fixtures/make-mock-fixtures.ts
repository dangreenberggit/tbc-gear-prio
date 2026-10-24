/**
 * Writes the made-up Upgrades-tab results under `data/tab-fixtures/` that the
 * tab's page checks render (layout gate, `pnpm tab-review`,
 * `pnpm tab-fixtures:smoke`). Each file covers one UI difference we expect
 * between specs and loads on one spec page that has it, so a page check never
 * needs a sim recording (stage tab-checks-without-sims).
 *
 * The figures are made up. The rows are real: every row is an (item id, slot)
 * pair read from the spec's own preset gear files, so icons and quality
 * colours resolve, and the gear is a copy of one preset file. Item names come
 * from the fork's item database. The output is deterministic.
 *
 *   pnpm tab-fixtures:mock            # write the six files
 *   pnpm tab-fixtures:mock --check    # exit 1 when a file differs or is missing
 *
 * Needs the fork clone (`vendor/` is gitignored); `--check` skips without it.
 * Run through `node --import tsx`: the `tsx` CLI cannot open its IPC pipe in
 * the agent sandbox.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import type { Cutoff } from "../../src/cutoff.js";
import type { Assumptions, Substitution } from "../../src/disclosure.js";
import {
  SIM_ORDER,
  type SimOrderName,
} from "../../src/slots-sim-order.generated.js";
import type { Race } from "../../src/types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const FORK = join(ROOT, "vendor/tbc-new-fork");
const SPECS_DIR = join(FORK, "ui/specs");
const DB_PATH = join(FORK, "assets/database/db.json");
const OUT_DIR = join(ROOT, "data/tab-fixtures");
const GENERATOR = "packages/core/test/tab-fixtures/make-mock-fixtures.ts";

// Local types for the fork-only fields the tab reads. packages/core's
// `Ranking` cannot express them, and the fork's own type cannot be imported
// here (CI has no fork). Source: the fork's
// `ui/features/upgrades/model/engine/rank.ts:303-343,604-675`; precedent:
// `packages/core/test/feral-rank-fixture.ts:60-85`.
type PoolSlot =
  | "head"
  | "neck"
  | "shoulder"
  | "back"
  | "chest"
  | "wrist"
  | "hands"
  | "waist"
  | "legs"
  | "feet"
  | "finger"
  | "trinket"
  | "weapon"
  | "ranged";

type MockSource =
  | { kind: "raid"; zone: string; boss?: string }
  | { kind: "crafted"; profession: string }
  | { kind: "rep"; faction: string; standing: string }
  | { kind: "heroic"; dungeon: string }
  | { kind: "pvp"; via: "arena" }
  | { kind: "unknown" };

type SetBreak = {
  setId: number;
  setName: string;
  threshold: number;
  dps?: number;
};

type MockSetContext = {
  setId: number;
  setName: string;
  piecesWornBefore: number;
  piecesAfterSwap: number;
  nextThreshold: number | null;
  crossesThreshold: boolean;
  singleDeltaDps?: number;
  singleBreaks?: SetBreak[];
};

type MockRow = {
  rank: number | null;
  itemId: number;
  name: string;
  slot: PoolSlot;
  slotChoice?: SimOrderName;
  source: MockSource;
  sources?: MockSource[];
  deltaDps: number;
  deltaPct: number;
  se: number;
  seMethod: "independent";
  bisTags: Array<"BiS" | "Alt">;
  belowCutoff: boolean;
  owned?: true;
  removedItems?: Array<{ itemId: number; slot: SimOrderName }>;
  setContext?: MockSetContext;
};

type MockRanking = {
  contentHash: string;
  cutoff: Cutoff;
  fight: {
    reportCode: string;
    fightId: number;
    encounterName: string;
    route: "report-events";
  };
  baseline: { dps: number; stdev: number; metaAdjusted: boolean };
  assumptions: Assumptions;
  substitutions: Substitution[];
  caps: {
    hit: {
      rating: number;
      capRating: number;
      gap: number;
      capUncertainty: number;
      assumedRace: Race;
      talentHitAssumed: { talent: string; points: number; maxPoints: number };
    };
    expertise: { rating: number; capRating: null; gap: null };
  };
  items: MockRow[];
  complete: true;
  durationMs: number;
};

type GearFile = { items: Array<{ id?: number }> };

type MockFixture = {
  schemaVersion: 1;
  forkSha: string;
  forkDirty: false;
  madeUp: true;
  generator: string;
  covers: string;
  spec: string;
  phase: 3;
  preset: string;
  gear: GearFile;
  recordedAt: string;
  iterations: 0;
  ranking: MockRanking;
};

type DbItem = { id: number; name: string; setId?: number; setName?: string };
type DbSource = {
  drop?: { zoneId?: number; npcId?: number };
  crafted?: { profession?: number };
  rep?: { repFactionId?: number; repLevel?: number };
};
type Db = {
  items: Array<DbItem & { sources?: DbSource[] }>;
  zones: Array<{ id: number; name: string }>;
  npcs: Array<{ id: number; name: string }>;
};

type Pair = {
  itemId: number;
  simSlot: SimOrderName;
  slot: PoolSlot;
  key: string;
};

type Spec = {
  name: string;
  spec: string;
  specDir: string;
  gearPreset: string;
  race: Race;
  baselineDps: number;
  covers: string;
  size: number | "all";
  belowCutoff: number;
};

const CUTOFF_DPS = 3;

const FIXTURES: Spec[] = [
  {
    name: "mock-offhand",
    spec: "rogue",
    specDir: "rogue/dps",
    gearPreset: "gear_sets/p2.gear.json",
    race: "RaceHuman",
    baselineDps: 1850,
    covers:
      "Off-hand rows: weapons ranked for the off-hand slot beside main-hand rows.",
    size: 24,
    belowCutoff: 4,
  },
  {
    name: "mock-ranged",
    spec: "hunter",
    specDir: "hunter/dps",
    gearPreset: "gear_sets/phase_2/bm/dw_6p.gear.json",
    race: "RaceDwarf",
    baselineDps: 1700,
    covers:
      "The ranged slot: bows, guns and crossbows ranked in their own slot.",
    size: 24,
    belowCutoff: 4,
  },
  {
    name: "mock-long-names",
    spec: "mage",
    specDir: "mage/dps",
    gearPreset: "gear_sets/p2Arcane.gear.json",
    race: "RaceGnome",
    baselineDps: 1600,
    covers:
      "Long item names (60-80 characters) that must wrap only between words, and a removes-worn-item line.",
    size: 24,
    belowCutoff: 4,
  },
  {
    name: "mock-set-bonus",
    spec: "feral",
    specDir: "druid/feralcat",
    gearPreset: "gear_sets/p2_6p.gear.json",
    race: "RaceNightElf",
    baselineDps: 1900,
    covers:
      "Set-bonus rows: pieces whose swap breaks a worn bonus, and one that completes a bonus.",
    size: 24,
    belowCutoff: 4,
  },
  {
    name: "mock-many-rows",
    spec: "warrior",
    specDir: "warrior/dps",
    gearPreset: "gear_sets/p2_fury.gear.json",
    race: "RaceHuman",
    baselineDps: 1800,
    covers:
      "Many rows: a table long enough that only part of it is rendered at once, and a long below-cutoff group.",
    size: "all",
    belowCutoff: 20,
  },
  {
    name: "mock-dropped-list",
    spec: "ret",
    specDir: "paladin/retribution",
    gearPreset: "gear_sets/p2.gear.json",
    race: "RaceBloodElf",
    baselineDps: 2050,
    covers:
      "A long 'Items left out and other notes' list: two headings and ten items that were not ranked.",
    size: 12,
    belowCutoff: 2,
  },
];

const PROFESSIONS: Record<number, string> = {
  1: "Alchemy",
  2: "Blacksmithing",
  3: "Enchanting",
  4: "Engineering",
  7: "Jewelcrafting",
  8: "Leatherworking",
  11: "Tailoring",
};
const STANDINGS: Record<number, string> = {
  4: "Friendly",
  5: "Honored",
  6: "Revered",
  7: "Exalted",
};

const LONG_WORDS = [
  "Sun-Forged",
  "Ancient",
  "Vanguard",
  "Eternal",
  "Watcher",
  "Crimson",
  "Legion",
  "Twilight",
  "Sentinel",
  "Ascendant",
  "Kingdom",
  "Starlight",
  "Warden",
];

const round2 = (x: number): number => Math.round(x * 100) / 100;

function poolSlotFor(simSlot: SimOrderName): PoolSlot {
  if (simSlot === "finger1" || simSlot === "finger2") return "finger";
  if (simSlot === "trinket1" || simSlot === "trinket2") return "trinket";
  if (simSlot === "mainhand" || simSlot === "offhand") return "weapon";
  return simSlot;
}

function gearFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".gear.json"))
    .filter((f) => {
      const base = f.split("/").pop() ?? f;
      return (
        base !== "blank.gear.json" &&
        base !== "simtest.gear.json" &&
        !base.endsWith(".itemswap.json")
      );
    })
    .sort()
    .map((f) => join(dir, f));
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

/** Every distinct (item id, slot) pair worn in the spec's preset files. */
function presetPairs(specDir: string): Pair[] {
  const seen = new Map<string, Pair>();
  for (const file of gearFiles(join(SPECS_DIR, specDir, "gear_sets"))) {
    const gear = readJson<GearFile>(file);
    gear.items.forEach((entry, i) => {
      const simSlot = SIM_ORDER[i];
      if (!entry.id || !simSlot) return;
      const slot = poolSlotFor(simSlot);
      const key = `${entry.id}:${slot}`;
      if (!seen.has(key))
        seen.set(key, { itemId: entry.id, simSlot, slot, key });
    });
  }
  return [...seen.values()].sort(
    (a, b) => a.itemId - b.itemId || a.key.localeCompare(b.key)
  );
}

/** A real name cut at a word boundary to at most 30 characters. */
function shortName(name: string): string {
  if (name.length <= 30) return name;
  const words = name.split(" ");
  while (words.length > 1 && words.join(" ").length > 30) words.pop();
  return words.join(" ").slice(0, 30);
}

/** A 60-80 character name of words of at most 12 letters, one hyphenated. */
function longName(name: string, index: number): string {
  const words = name.split(" ").filter((w) => w.length <= 12);
  words.push("of", "the", LONG_WORDS[0]!);
  let i = index;
  while (words.join(" ").length < 60) {
    words.push(LONG_WORDS[1 + (i % (LONG_WORDS.length - 1))]!);
    i += 1;
  }
  while (words.join(" ").length > 80) words.splice(words.length - 2, 1);
  return words.join(" ");
}

/** A fixed shuffle so required rows do not all rank first. */
const mixKey = (p: Pair): number => ((p.itemId * 2654435761) >>> 0) % 1000003;

class Builder {
  readonly errors: string[] = [];
  private readonly items: Map<number, DbItem & { sources?: DbSource[] }>;
  private readonly zones: Map<number, string>;
  private readonly npcs: Map<number, string>;

  constructor(db: Db) {
    this.items = new Map(db.items.map((i) => [i.id, i]));
    this.zones = new Map(db.zones.map((z) => [z.id, z.name]));
    this.npcs = new Map(db.npcs.map((n) => [n.id, n.name]));
  }

  item(id: number): DbItem & { sources?: DbSource[] } {
    return this.items.get(id) ?? { id, name: `Item ${id}` };
  }

  source(id: number): MockSource {
    const first = this.item(id).sources?.[0];
    if (first?.drop) {
      const zone =
        first.drop.zoneId === undefined
          ? undefined
          : this.zones.get(first.drop.zoneId);
      if (!zone) return { kind: "unknown" };
      const boss =
        first.drop.npcId === undefined
          ? undefined
          : this.npcs.get(first.drop.npcId);
      return boss ? { kind: "raid", zone, boss } : { kind: "raid", zone };
    }
    if (first?.crafted)
      return {
        kind: "crafted",
        profession: PROFESSIONS[first.crafted.profession ?? 0] ?? "Crafting",
      };
    if (first?.rep)
      return {
        kind: "rep",
        faction: `Faction ${first.rep.repFactionId ?? 0}`,
        standing: STANDINGS[first.rep.repLevel ?? 0] ?? "Friendly",
      };
    return { kind: "unknown" };
  }

  rule(fixture: string, ok: boolean, rule: string): void {
    if (!ok) this.errors.push(`${fixture}: ${rule}`);
  }

  build(spec: Spec): MockFixture {
    const gear = readJson<GearFile>(
      join(SPECS_DIR, spec.specDir, spec.gearPreset)
    );
    const pairs = presetPairs(spec.specDir);
    const required = this.requiredPairs(spec, pairs, gear);
    const rest = pairs.filter((p) => !required.includes(p));
    const size = spec.size === "all" ? pairs.length : spec.size;
    const chosen = [...required, ...rest].slice(0, size);

    const wornSet = this.mostWornSet(gear);
    const setRoles = this.setRoles(spec, chosen, wornSet);
    const mixed = [...chosen].sort(
      (a, b) => mixKey(a) - mixKey(b) || a.key.localeCompare(b.key)
    );
    const pinnedAbove = new Set([...setRoles.keys()]);
    const free = mixed.filter((p) => !pinnedAbove.has(p.key));
    const below = free.slice(free.length - spec.belowCutoff);
    const above = mixed.filter((p) => !below.includes(p));
    const removed = this.removedItemsPair(spec, chosen, gear);

    const rows: MockRow[] = [...above, ...below].map((p, i) => {
      const isBelow = i >= above.length;
      const deltaDps = isBelow
        ? round2(2.9 - (i - above.length) * (4 / Math.max(below.length - 1, 1)))
        : round2(
            3.5 + (above.length - 1 - i) * (36 / Math.max(above.length - 1, 1))
          );
      const realName = this.item(p.itemId).name;
      const row: MockRow = {
        rank: isBelow ? null : i + 1,
        itemId: p.itemId,
        name:
          spec.name === "mock-long-names"
            ? longName(realName, i)
            : shortName(realName),
        slot: p.slot,
        ...(p.simSlot !== p.slot ? { slotChoice: p.simSlot } : {}),
        source: this.source(p.itemId),
        deltaDps,
        deltaPct: round2((deltaDps / spec.baselineDps) * 100),
        se: round2(0.4 + (p.itemId % 7) * 0.1),
        seMethod: "independent",
        bisTags: [],
        belowCutoff: isBelow,
      };
      const ctx = setRoles.get(p.key);
      if (ctx) row.setContext = ctx(deltaDps);
      if (removed && removed.pair === p) row.removedItems = [removed.removes];
      return row;
    });
    this.assignFlags(rows, above.length, setRoles);

    const fixture: MockFixture = {
      schemaVersion: 1,
      forkSha: "0".repeat(40),
      forkDirty: false,
      madeUp: true,
      generator: GENERATOR,
      covers: spec.covers,
      spec: spec.spec,
      phase: 3,
      preset: `${spec.specDir}/${spec.gearPreset}`,
      gear,
      recordedAt: "1970-01-01T00:00:00.000Z",
      iterations: 0,
      ranking: {
        contentHash: `made-up:${spec.name}`,
        cutoff: { absDps: CUTOFF_DPS },
        fight: {
          reportCode: "made-up",
          fightId: 0,
          encounterName: "Made-up fixture",
          route: "report-events",
        },
        baseline: { dps: spec.baselineDps, stdev: 120, metaAdjusted: false },
        assumptions: {
          maxPhase: 3,
          seeds: [1, 2, 3],
          iterations: 0,
          race: spec.race,
          presetId: `${spec.spec}/made-up`,
          standing: [],
        },
        substitutions:
          spec.name === "mock-dropped-list"
            ? this.droppedList(pairs, chosen)
            : [],
        caps: {
          hit: {
            rating: 83.31,
            capRating: 141.92,
            gap: 58.61,
            capUncertainty: 15.77,
            assumedRace: spec.race,
            talentHitAssumed: { talent: "Precision", points: 3, maxPoints: 3 },
          },
          expertise: { rating: 95, capRating: null, gap: null },
        },
        items: rows,
        complete: true,
        durationMs: 60000,
      },
    };
    this.checkRules(spec, fixture);
    return fixture;
  }

  /** The pairs a fixture's own rule needs, taken before the fill (C31). */
  private requiredPairs(spec: Spec, pairs: Pair[], gear: GearFile): Pair[] {
    switch (spec.name) {
      case "mock-offhand":
        return [
          ...pairs.filter((p) => p.simSlot === "offhand"),
          ...pairs.filter((p) => p.simSlot === "mainhand").slice(0, 2),
        ];
      case "mock-ranged":
        return pairs.filter((p) => p.slot === "ranged");
      case "mock-long-names": {
        const removed = this.removedItemsPair(spec, pairs, gear);
        return removed ? [removed.pair] : [];
      }
      case "mock-set-bonus": {
        const worn = this.mostWornSet(gear);
        return pairs
          .filter((p) => {
            const setId = this.item(p.itemId).setId;
            return setId !== undefined && setId !== worn?.setId;
          })
          .slice(0, 4);
      }
      default:
        return [];
    }
  }

  private mostWornSet(
    gear: GearFile
  ): { setId: number; setName: string; count: number } | undefined {
    const counts = new Map<number, { setName: string; count: number }>();
    for (const entry of gear.items) {
      const item = entry.id ? this.item(entry.id) : undefined;
      if (item?.setId === undefined || !item.setName) continue;
      const c = counts.get(item.setId) ?? { setName: item.setName, count: 0 };
      c.count += 1;
      counts.set(item.setId, c);
    }
    let best: { setId: number; setName: string; count: number } | undefined;
    for (const [setId, c] of [...counts].sort((a, b) => a[0] - b[0]))
      if (!best || c.count > best.count) best = { setId, ...c };
    return best;
  }

  /**
   * The set rows, each in the shape of the fork's RANKING_FIXTURE row 10: a
   * measured break of the most-worn set, so check 17 has a popover on every
   * fixture. mock-set-bonus gets three of those and one crossing row.
   */
  private setRoles(
    spec: Spec,
    chosen: Pair[],
    worn: { setId: number; setName: string; count: number } | undefined
  ): Map<string, (deltaDps: number) => MockSetContext> {
    const roles = new Map<string, (deltaDps: number) => MockSetContext>();
    const ownSet = (p: Pair) => {
      const item = this.item(p.itemId);
      return item.setId !== undefined && item.setName
        ? { setId: item.setId, setName: item.setName }
        : undefined;
    };
    const candidates = [
      ...chosen.filter((p) => {
        const s = ownSet(p);
        return s !== undefined && s.setId !== worn?.setId;
      }),
      ...chosen.filter((p) => ownSet(p) === undefined),
    ];
    const broken: SetBreak = worn
      ? {
          setId: worn.setId,
          setName: worn.setName,
          threshold: worn.count >= 4 ? 4 : 2,
        }
      : { setId: 0, setName: "Made-up Set", threshold: 2 };
    const breakRows = spec.name === "mock-set-bonus" ? 3 : 1;
    candidates.slice(0, breakRows).forEach((p, k) => {
      const own = ownSet(p) ?? broken;
      roles.set(p.key, (deltaDps) => ({
        setId: own.setId,
        setName: own.setName,
        piecesWornBefore: 0,
        piecesAfterSwap: 1,
        nextThreshold: null,
        crossesThreshold: false,
        singleBreaks: [{ ...broken, dps: round2(8.5 + 2.25 * k) }],
        singleDeltaDps: deltaDps,
      }));
    });
    if (spec.name === "mock-set-bonus") {
      const p = candidates[breakRows];
      const own = p ? ownSet(p) : undefined;
      if (p && own)
        roles.set(p.key, () => ({
          setId: own.setId,
          setName: own.setName,
          piecesWornBefore: 1,
          piecesAfterSwap: 2,
          nextThreshold: 2,
          crossesThreshold: true,
        }));
    }
    return roles;
  }

  /** A row that removes a worn item: an off-hand over a worn two-hander, else a main hand over the worn off-hand. */
  private removedItemsPair(
    spec: Spec,
    pairs: Pair[],
    gear: GearFile
  ):
    | { pair: Pair; removes: { itemId: number; slot: SimOrderName } }
    | undefined {
    if (spec.name !== "mock-long-names") return undefined;
    const mainhand = gear.items[SIM_ORDER.indexOf("mainhand")]?.id;
    const offhand = gear.items[SIM_ORDER.indexOf("offhand")]?.id;
    if (!offhand && mainhand) {
      const pair = pairs.find((p) => p.simSlot === "offhand");
      if (pair)
        return { pair, removes: { itemId: mainhand, slot: "mainhand" } };
    }
    if (offhand) {
      const pair = pairs.find((p) => p.simSlot === "mainhand");
      if (pair) return { pair, removes: { itemId: offhand, slot: "offhand" } };
    }
    return undefined;
  }

  /** BiS, owned and three-source rows, kept off the set rows. */
  private assignFlags(
    rows: MockRow[],
    aboveCount: number,
    setRoles: Map<string, unknown>
  ): void {
    const free = (r: MockRow) =>
      !setRoles.has(`${r.itemId}:${r.slot}`) && r.removedItems === undefined;
    const taken = new Set<MockRow>();
    const pick = (from: MockRow[]) => {
      const r = from.find((x) => free(x) && !taken.has(x));
      if (r) taken.add(r);
      return r;
    };
    const above = rows.slice(0, aboveCount);
    const below = rows.slice(aboveCount);
    const bis = pick(above);
    if (bis) bis.bisTags = ["BiS"];
    const alt = pick(above.slice(3));
    if (alt) alt.bisTags = ["Alt"];
    const owned = pick(above.slice(2));
    if (owned) owned.owned = true;
    const multi = pick(above.slice(1));
    if (multi)
      multi.sources = [
        multi.source,
        { kind: "heroic", dungeon: "The Shattered Halls" },
        { kind: "pvp", via: "arena" },
      ];
    const bisBelow = pick(below);
    if (bisBelow) bisBelow.bisTags = ["BiS"];
  }

  /** Two 704 headings and ten item lines, every line's field and detail distinct (review R4). */
  private droppedList(pairs: Pair[], chosen: Pair[]): Substitution[] {
    const rowIds = new Set(chosen.map((p) => p.itemId));
    const seenIds = new Set<number>();
    const lines: Substitution[] = [
      {
        field: "One-handed weapons",
        detail:
          "14 one-handed weapons were not ranked, because you wear a two-handed weapon.",
      },
      {
        field: "Off-hand items",
        detail:
          "9 off-hand items were not ranked, because you wear a two-handed weapon.",
      },
    ];
    for (const p of pairs) {
      if (lines.length === 12) break;
      if (rowIds.has(p.itemId) || seenIds.has(p.itemId)) continue;
      seenIds.add(p.itemId);
      const sim = lines.length % 2 === 0;
      lines.push({
        field: shortName(this.item(p.itemId).name),
        slot: p.simSlot,
        detail:
          (sim
            ? "This item was not ranked in this slot, because its sim failed."
            : "This item was not ranked in this slot, because no gem swap could turn your meta gem on with it equipped.") +
          `\nitem ${p.itemId}, slot ${p.simSlot}: ${sim ? "made-up sim error" : "made-up meta gem rule"}`,
      });
    }
    return lines;
  }

  private checkRules(spec: Spec, fx: MockFixture): void {
    const n = spec.name;
    const rows = fx.ranking.items;
    const keys = rows.map((r) => `${r.itemId}:${r.slot}`);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    this.rule(n, dup === undefined, `row key ${dup} appears twice`);
    if (spec.size !== "all")
      this.rule(n, rows.length === spec.size, `has ${spec.size} rows`);
    this.rule(
      n,
      rows.every((r, i) => i === 0 || rows[i - 1]!.deltaDps >= r.deltaDps),
      "deltaDps descends"
    );
    this.rule(
      n,
      rows.every((r) => r.belowCutoff === r.deltaDps < CUTOFF_DPS),
      "belowCutoff matches the cutoff"
    );
    const measuredBreak = (r: MockRow) =>
      (r.setContext?.singleBreaks ?? []).some((b) => b.dps !== undefined) &&
      r.setContext?.singleDeltaDps !== undefined;
    this.rule(n, rows.some(measuredBreak), "has a set-bonus row (C19 shape)");
    this.rule(
      n,
      rows.some((r) => r.belowCutoff && r.bisTags.includes("BiS")),
      "has a BiS row below the cutoff"
    );
    this.rule(
      n,
      rows.some((r) => r.owned === true),
      "has an owned row"
    );
    this.rule(
      n,
      rows.some((r) => r.sources?.length === 3),
      "has a row with 3 sources"
    );
    if (n !== "mock-long-names")
      this.rule(
        n,
        rows.every((r) => r.name.length <= 30),
        "names are at most 30 characters"
      );
    switch (n) {
      case "mock-offhand":
        this.rule(
          n,
          rows.filter((r) => r.slotChoice === "offhand").length >= 2,
          "at least 2 off-hand rows"
        );
        this.rule(
          n,
          rows.filter((r) => r.slotChoice === "mainhand").length >= 2,
          "at least 2 main-hand rows"
        );
        break;
      case "mock-ranged":
        this.rule(
          n,
          rows.filter((r) => r.slot === "ranged").length >= 3,
          "at least 3 ranged rows"
        );
        break;
      case "mock-long-names":
        this.rule(
          n,
          rows.every((r) => r.name.length >= 60 && r.name.length <= 80),
          "every name is 60-80 characters"
        );
        this.rule(
          n,
          rows.every((r) => r.name.split(" ").every((w) => w.length <= 12)),
          "every word is at most 12 letters"
        );
        this.rule(
          n,
          rows.every((r) => /\S-\S/.test(r.name)),
          "every name has a hyphenated word"
        );
        this.rule(
          n,
          rows.some((r) => (r.removedItems ?? []).length > 0),
          "has a removes-worn-item row"
        );
        break;
      case "mock-set-bonus":
        this.rule(
          n,
          rows.filter(measuredBreak).length >= 3,
          "at least 3 measured-break rows"
        );
        this.rule(
          n,
          rows.some(
            (r) =>
              r.setContext?.crossesThreshold === true &&
              r.setContext.piecesAfterSwap > r.setContext.piecesWornBefore
          ),
          "has a crossing row"
        );
        break;
      case "mock-many-rows":
        this.rule(n, rows.length >= 60, "at least 60 rows");
        this.rule(
          n,
          rows.filter((r) => r.belowCutoff).length >= 15,
          "at least 15 below-cutoff rows"
        );
        break;
      case "mock-dropped-list": {
        const subs = fx.ranking.substitutions;
        this.rule(n, subs.length === 12, "has 12 substitutions");
        const lineKeys = subs.map((s) => `${s.field}|${s.detail}`);
        this.rule(
          n,
          new Set(lineKeys).size === lineKeys.length,
          "every substitution's field and detail pair differs"
        );
        const itemLines = subs.filter((s) => s.slot !== undefined);
        this.rule(n, itemLines.length === 10, "has 10 item lines with a slot");
        this.rule(
          n,
          new Set(itemLines.map((s) => s.field)).size === itemLines.length,
          "no item appears for two slots"
        );
        break;
      }
    }
  }
}

function render(fixture: MockFixture): string {
  return JSON.stringify(fixture, null, 2) + "\n";
}

function main(argv: string[]): number {
  const check = argv.includes("--check");
  if (!existsSync(SPECS_DIR)) {
    if (check) {
      console.log("mock fixtures: skipped -- fork absent");
      return 0;
    }
    console.error(
      "mock fixtures: FAILED -- vendor/tbc-new-fork is absent; the generator reads its preset gear files"
    );
    return 1;
  }
  const builder = new Builder(readJson<Db>(DB_PATH));
  const outputs = FIXTURES.map((spec) => ({
    path: join(OUT_DIR, `${spec.name}.json`),
    text: render(builder.build(spec)),
  }));
  if (builder.errors.length > 0) {
    for (const e of builder.errors)
      console.error(`mock fixtures: FAILED rule -- ${e}`);
    return 1;
  }
  if (!check) {
    for (const o of outputs) {
      writeFileSync(o.path, o.text);
      console.log(`mock fixtures: wrote ${relative(ROOT, o.path)}`);
    }
    return 0;
  }
  const problems: string[] = [];
  for (const o of outputs) {
    const rel = relative(ROOT, o.path);
    if (!existsSync(o.path)) problems.push(`${rel} is missing`);
    else if (readFileSync(o.path, "utf8") !== o.text)
      problems.push(`${rel} differs from the generator`);
  }
  const known = new Set(outputs.map((o) => o.path));
  for (const f of existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : [])
    if (f.endsWith(".json") && !known.has(join(OUT_DIR, f)))
      problems.push(`data/tab-fixtures/${f} is not made by the generator`);
  for (const p of problems)
    console.error(`mock fixtures: FAILED -- ${p} (run pnpm tab-fixtures:mock)`);
  if (problems.length === 0)
    console.log(`mock fixtures: ${outputs.length} files match the generator`);
  return problems.length === 0 ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
