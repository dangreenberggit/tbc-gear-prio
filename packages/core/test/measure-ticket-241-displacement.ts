/**
 * PROVENANCE DISCLAIMER — read before trusting any number this produces.
 *
 * Written during the 2026-08-20 session on ticket 241. In that session the
 * orchestrating agent stated at least five facts that were false, three of
 * them by relaying a subagent's claim without checking it, two by reading
 * part of an artifact and asserting a conclusion about the rest. Two plan
 * reviews were fed those false inputs, so the reviews that vetted this
 * script's design are themselves suspect.
 *
 * This file is committed for its MECHANICS, not its CONCLUSIONS:
 *
 *   - the two output-parsing traps documented below, which silently return
 *     zero rather than erroring, and
 *   - the ablation harness (clone the request, drop one priority entry,
 *     re-measure), which is reusable.
 *
 * Every headline number this prints is UNCONFIRMED. Re-derive before citing.
 * See `.scratch/carry-forward/issues/241-*.md` for the failure record.
 */

/**
 * Does the mana artifact displace real upgrades today? — ticket 241, Q1.
 *
 * Ticket 241 asks the question first because it sizes everything else, and
 * the owner's acceptance bar (quoted in the ticket, 2026-08-20) is narrow:
 * mana-statted rows appearing in the pool is acceptable, being slightly
 * slower is acceptable, **displacing real upgrades is not**. So this script
 * does not ask "is there mana gear in the pool" — ticket 234 already
 * answered that, ten rows, +4.61 to +7.80 DPS. It asks whether the ordering
 * of *genuine* upgrades survives.
 *
 * **The classification rules are pre-registered.** They are written in
 * `.scratch/stage-gate/ticket-241/findings.md` (plan step 1) and were
 * committed before this script was run, precisely so they could not be
 * retrofitted to a preferred answer. Round 0 of the plan review caught a
 * rule that counted stamina and armor as feral stats; because 8 of the 10
 * known mana rows carry stamina and 4 carry armor, that rule classified the
 * mana rows as genuine upgrades and returned "no displacement" by
 * construction. Stamina, armor, bonus armor, resilience and sockets
 * therefore discriminate for neither side here.
 *
 * **Mixed rows count as genuine-upgrade candidates under the primary rule,
 * unconditionally.** 18 of the 85 above-cutoff rows are feral tier gear
 * carrying trace intellect (Thunderheart Leggings 31044 = str 53 / agi 41 /
 * int 12). A rule that set them aside would blind the displacement test to
 * the pool's most valuable 21%. The cost is that the primary rule may
 * over-count genuine upgrades, which biases *toward* finding displacement —
 * the conservative direction, since a false "no displacement" is the costly
 * error under the owner's bar.
 *
 * The alternative rule, which is the one that can demote a mixed row,
 * subtracts an imported DPS/int slope from each row's delta and asks whether
 * the residual still clears 2x SE. Its slope comes from a different gear arm
 * (ticket 241's six-arm table, transplanted gear), which is why it is the
 * alternative and not the headline. Per the pre-registered tie-break,
 * displacement under *either* rule counts as displacement.
 *
 * Deltas are not stored per item in the fixture — the recordings are keyed
 * by sha256 of the sim request. So this replays the full-sweep rank through
 * `RecordedSimRunner` exactly as `measure-cutoff-band.ts` and `racing.test.ts`
 * do, which needs no sim binary and no network.
 *
 * Not a vitest test — a measurement script, same convention as
 * `measure-cutoff-band.ts`. Named without a `.test.ts` suffix so vitest's
 * default include glob does not collect it. Run with:
 *
 *   npx tsx packages/core/test/measure-ticket-241-displacement.ts
 *
 * One caveat on reproducibility, stated because the durable-claims rule
 * requires it: this reads `vendor/wowsims/feral_preraid.gear.json`, which is
 * **not git-tracked**. On a fresh clone it must be restored before this
 * script runs. Everything else it reads is committed.
 */
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades, type RankedItem } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  type RaidSimRequest,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { loadJson, type RosterRecordingsFile } from "./measure-support.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { CUTOFF_FERAL } from "../src/cutoff.js";

/**
 * Positions in an item's `stats` array in `data/items/index.json`, indexed by
 * `enum Stat` in `data/proto/common.proto`.
 */
const STAT = {
  strength: 0,
  agility: 1,
  stamina: 2,
  intellect: 3,
  healingPower: 4,
  spellDamage: 5,
  spirit: 16,
  attackPower: 17,
  feralAttackPower: 19,
  meleeHitRating: 20,
  meleeCritRating: 21,
  meleeHasteRating: 22,
  armorPenetration: 23,
  expertiseRating: 24,
  armor: 31,
  mp5: 35,
} as const;

const MANA_STATS = [
  STAT.intellect,
  STAT.spirit,
  STAT.mp5,
  STAT.healingPower,
  STAT.spellDamage,
] as const;

/**
 * Stamina and armor are deliberately absent: they are near-universal on TBC
 * items and cannot tell feral gear from healer gear. Weapon damage is absent
 * because no such field exists in the item index — feral weapons classify
 * via `feralAttackPower` instead (e.g. Wildfury Greatstaff 30021).
 */
const FERAL_DISCRIMINATORS = [
  STAT.strength,
  STAT.agility,
  STAT.attackPower,
  STAT.feralAttackPower,
  STAT.meleeCritRating,
  STAT.meleeHitRating,
  STAT.expertiseRating,
  STAT.armorPenetration,
  STAT.meleeHasteRating,
] as const;

/**
 * The ten rows ticket 234 established as healer-statted, for calibration.
 * Transcribed from the measured table in
 * `.scratch/handoffs/ticket-227-healer-noise.md:121-143`, not from memory.
 */
const TICKET_234_ROWS = [
  29308, 29309, 32609, 32516, 29920, 29984, 29989, 28822, 29307, 28661,
] as const;

/**
 * DPS gained per point of intellect, for the alternative rule. Ticket 241's
 * six-arm table measured 0.22 on the owner's gear and 0.57 on the repo
 * environment, both on the pinned APL. The steeper slope is used because it
 * demotes the most rows, which is the alternative rule's whole purpose.
 */
const DPS_PER_INT = 0.57;

/**
 * DPS per point of MP5, from ticket 234's stat-isolation table: mp5 10 was
 * worth +13.17 DPS at 30,000 iterations on the committed feral-P3 fixture.
 */
const DPS_PER_MP5 = 13.17 / 10;

type ItemIndex = Record<string, { name: string; stats: number[] } | undefined>;

type RowClass = "MANA" | "FERAL" | "MIXED" | "NEITHER";

const items = loadJson<ItemIndex>("data/items/index.json");

function statsOf(itemId: number): number[] | null {
  return items[String(itemId)]?.stats ?? null;
}

function hasAny(stats: number[], indices: readonly number[]): boolean {
  return indices.some((i) => (stats[i] ?? 0) > 0);
}

function classify(itemId: number): RowClass {
  const stats = statsOf(itemId);
  if (!stats) return "NEITHER";
  const mana = hasAny(stats, MANA_STATS);
  const feral = hasAny(stats, FERAL_DISCRIMINATORS);
  if (mana && feral) return "MIXED";
  if (mana) return "MANA";
  if (feral) return "FERAL";
  return "NEITHER";
}

/** Pre-registered: >= 1 mana stat and zero feral discriminators. */
function isManaStatted(itemId: number): boolean {
  return classify(itemId) === "MANA";
}

/**
 * Pre-registered primary rule: >= 1 feral discriminator and delta > 2x SE.
 * Mixed rows qualify unconditionally.
 */
function isGenuineUpgradePrimary(row: RankedItem): boolean {
  const cls = classify(row.itemId);
  if (cls !== "FERAL" && cls !== "MIXED") return false;
  return row.deltaDps > 2 * row.se;
}

/**
 * Pre-registered alternative rule: subtract the mana-attributable DPS, then
 * ask whether the residual still clears 2x SE.
 */
function isGenuineUpgradeAlternative(row: RankedItem): boolean {
  const cls = classify(row.itemId);
  if (cls !== "FERAL" && cls !== "MIXED") return false;
  const stats = statsOf(row.itemId);
  if (!stats) return false;
  const manaDps =
    (stats[STAT.intellect] ?? 0) * DPS_PER_INT +
    (stats[STAT.mp5] ?? 0) * DPS_PER_MP5;
  return row.deltaDps - manaDps > 2 * row.se;
}

/**
 * The shared `RosterRecordingsFile` in `measure-support.ts` omits
 * `aboveCutoffItemIds`, which the committed fixture does carry — verified
 * with `node -e` over the file. Widened locally rather than in
 * `measure-support.ts`, which is outside this investigation's paths manifest;
 * the missing field is recorded as a deviation for the orchestrator.
 */
type RosterRecordingsFileWithIds = Omit<RosterRecordingsFile, "rows"> & {
  rows: Record<
    string,
    RosterRecordingsFile["rows"][string] & { aboveCutoffItemIds: number[] }
  >;
};

const recordingsFile = loadJson<RosterRecordingsFileWithIds>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows["feral-p3"]!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const skeleton = loadJson<RaidSimRequest>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);
const presetGear = loadJson<PresetGearFile>(
  "vendor/wowsims/feral_preraid.gear.json"
);
const gearData = syntheticOfflineRecordings({
  ref: FERAL_SYNTHETIC_REF,
  spec: "feral",
  presetGear,
  fight: FERAL_SYNTHETIC_FIGHT,
});

const maxPhase = FERAL_P3_SYNTHETIC_ROW.maxPhase;
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/feral-p3.json"
    )
  ),
  maxPhase
);

/** Rebuilds the recorded full-sweep truth exactly as `racing.test.ts` does. */
async function fullSweepTruthP3(): Promise<{ items: RankedItem[] }> {
  const recordings = new Map(Object.entries(recorded.recordings));
  const sim = new RecordedSimRunner(recorded.simVersion, recordings);
  return rankUpgrades(
    {
      character: FERAL_SYNTHETIC_REF,
      spec: "feral" as const,
      maxPhase,
      iterations: recorded.iterations,
      seeds: [recorded.seed],
      race: "RaceTauren" as const,
    },
    {
      gear: new RecordedGearSource(gearData),
      sim: sim as never,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );
}

function fmt(n: number, places = 2): string {
  return n.toFixed(places);
}

function pad(s: string, width: number): string {
  return s.length >= width ? s : s + " ".repeat(width - s.length);
}

function padLeft(s: string, width: number): string {
  return s.length >= width ? s : " ".repeat(width - s.length) + s;
}

/**
 * The cutoff's pct arm binds below its absDps arm on this fixture's
 * baseline, exactly as `measure-cutoff-band.ts` documents, so the effective
 * boundary is computed rather than assumed to be 3.6.
 */
function cutoffBoundary(baselineDps: number): number {
  return Math.min(CUTOFF_FERAL.absDps, (CUTOFF_FERAL.pct * baselineDps) / 100);
}

async function main(): Promise<void> {
  const truth = await fullSweepTruthP3();
  const aboveIds = new Set(recorded.aboveCutoffItemIds);
  const boundary = cutoffBoundary(recorded.baselineDps);

  /**
   * Every scored row, including the ones the cutoff rejected. `rankUpgrades`
   * sets `rank = null` on a below-cutoff row but leaves it in `items`
   * (`rank.ts:1174-1180`), so filtering on `rank !== null` would silently
   * drop all 280 below-cutoff rows and make the "genuine upgrade below the
   * cutoff" test vacuous — the same by-construction null the round-0 plan
   * review caught in the classification rule. Unsimmed rows carry
   * placeholder deltas and are excluded from cutoff classification by the
   * engine, so they are excluded here too.
   */
  const ranked = truth.items.filter((r) => r.simmed !== false);
  const above = ranked.filter((r) => aboveIds.has(r.itemId));

  console.log("=== ticket 241 Q1 — displacement measurement ===");
  console.log(
    `fixture packages/core/test/fixtures/synthetic-roster-recordings.json rows["feral-p3"]`
  );
  console.log(
    `poolSize ${recorded.poolSize}  aboveCutoffCount ${recorded.aboveCutoffCount}  baselineDps ${fmt(recorded.baselineDps, 4)}`
  );
  console.log(
    `CUTOFF_FERAL absDps ${CUTOFF_FERAL.absDps} pct ${CUTOFF_FERAL.pct} -> effective boundary ${fmt(boundary, 4)} DPS`
  );
  console.log(
    `ranked rows ${ranked.length}  above-cutoff rows ${above.length}`
  );
  console.log("");

  // --- class census, the broader guard on the pre-registered rules ---
  const census: Record<RowClass, RankedItem[]> = {
    MANA: [],
    FERAL: [],
    MIXED: [],
    NEITHER: [],
  };
  for (const r of above) census[classify(r.itemId)].push(r);

  console.log("--- class census over the above-cutoff rows ---");
  for (const cls of ["MANA", "FERAL", "MIXED", "NEITHER"] as const) {
    console.log(`${pad(cls, 8)} ${padLeft(String(census[cls].length), 3)}`);
  }
  const candidates = census.FERAL.length + census.MIXED.length;
  console.log(
    `genuine-upgrade candidates (FERAL + MIXED) ${candidates} = ${census.FERAL.length} + ${census.MIXED.length}`
  );
  console.log(
    `expected per plan C14: MANA 27, candidates 58 (40 feral + 18 mixed), NEITHER 0`
  );
  const censusMatches =
    census.MANA.length === 27 &&
    census.FERAL.length === 40 &&
    census.MIXED.length === 18 &&
    census.NEITHER.length === 0;
  console.log(
    censusMatches
      ? "census MATCHES the pre-registered expectation"
      : "census DEVIATES from the pre-registered expectation — must be explained before any verdict"
  );
  console.log("");

  // --- calibration: the ten known ticket-234 rows ---
  console.log("--- calibration: ticket 234's ten healer rows ---");
  console.log(
    "(a sanity check on rows whose nature is already established, not a falsifier for the other 75)"
  );
  let calibrationPasses = 0;
  for (const id of TICKET_234_ROWS) {
    const row = ranked.find((r) => r.itemId === id);
    const cls = classify(id);
    const ok = cls === "MANA";
    if (ok) calibrationPasses += 1;
    const where = row
      ? `rank ${padLeft(String(row.rank), 3)} delta ${padLeft(fmt(row.deltaDps), 7)} se ${fmt(row.se)}`
      : "not in ranked set";
    console.log(
      `${padLeft(String(id), 6)} ${pad(items[String(id)]?.name ?? "?", 30)} ${pad(cls, 8)} ${ok ? "ok " : "MISS"} ${where}`
    );
  }
  console.log(
    `calibration: ${calibrationPasses}/${TICKET_234_ROWS.length} classify MANA`
  );
  console.log("");

  // --- every mana-statted row above the cutoff, with rank and delta ---
  const manaRows = above
    .filter((r) => isManaStatted(r.itemId))
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  console.log("--- mana-statted rows above the cutoff ---");
  for (const r of manaRows) {
    console.log(
      `rank ${padLeft(String(r.rank), 3)} ${padLeft(String(r.itemId), 6)} ${pad(r.name, 34)} delta ${padLeft(fmt(r.deltaDps), 7)} se ${fmt(r.se)}`
    );
  }
  const worstManaRank = manaRows.reduce(
    (acc, r) => Math.max(acc, r.rank ?? 0),
    0
  );
  console.log(
    `mana-statted above cutoff: ${manaRows.length}; deepest rank ${worstManaRank}`
  );
  console.log("");

  // --- the displacement test, under both pre-registered rules ---
  for (const [label, isGenuine] of [
    ["PRIMARY", isGenuineUpgradePrimary],
    ["ALTERNATIVE", isGenuineUpgradeAlternative],
  ] as const) {
    console.log(`--- displacement test, ${label} rule ---`);
    const genuine = ranked.filter((r) => isGenuine(r));
    const genuineAbove = genuine.filter((r) => !r.belowCutoff);

    // Condition 1: a genuine upgrade sitting below the cutoff. Uses the
    // engine's own `belowCutoff` flag, which is what actually decides
    // presentation, rather than membership of `aboveCutoffItemIds`.
    const belowCutoff = genuine.filter((r) => r.belowCutoff);

    // Condition 2: a genuine upgrade ranked below any mana-statted row.
    const displacedByMana = genuineAbove.filter(
      (r) => !r.belowCutoff && (r.rank ?? 0) > worstManaRank
    );

    console.log(
      `genuine upgrades: ${genuine.length} total, ${genuineAbove.length} above cutoff`
    );
    console.log(
      `condition 1 — genuine upgrades below the cutoff: ${belowCutoff.length}`
    );
    // Condition 1 can be structurally unreachable on a fixture where the
    // significance bar is stricter than the cutoff: a row needs
    // `delta > 2 x se` to be a genuine upgrade, and if the smallest 2 x se in
    // the pool already exceeds the cutoff boundary then no genuine upgrade
    // can sit below it, whatever the data says. Reported so a zero here is
    // not read as independent evidence alongside condition 2.
    const twoSeAll = ranked
      .filter((r) => {
        const c = classify(r.itemId);
        return c === "FERAL" || c === "MIXED";
      })
      .map((r) => 2 * r.se);
    const minTwoSe = twoSeAll.length > 0 ? Math.min(...twoSeAll) : NaN;
    const reachable = twoSeAll.filter((v) => v <= boundary).length;
    console.log(
      `    reachability of condition 1: smallest 2xSE among feral/mixed rows ${fmt(minTwoSe)} DPS vs cutoff boundary ${fmt(boundary, 4)} DPS; ${reachable} row(s) could in principle be a genuine upgrade sitting below the cutoff`
    );
    if (reachable === 0) {
      console.log(
        `    NOTE: condition 1 is structurally unreachable on this fixture — the significance bar (2xSE) is stricter than the cutoff everywhere, so this zero is uninformative and condition 2 carries the verdict.`
      );
    }
    for (const r of belowCutoff.slice(0, 20)) {
      console.log(
        `    ${padLeft(String(r.itemId), 6)} ${pad(r.name, 34)} delta ${padLeft(fmt(r.deltaDps), 7)} se ${fmt(r.se)}`
      );
    }
    if (belowCutoff.length > 20) {
      console.log(`    ... and ${belowCutoff.length - 20} more`);
    }
    console.log(
      `condition 2 — genuine upgrades ranked below a mana-statted row: ${displacedByMana.length}`
    );
    for (const r of displacedByMana) {
      console.log(
        `    rank ${padLeft(String(r.rank), 3)} ${padLeft(String(r.itemId), 6)} ${pad(r.name, 34)} delta ${padLeft(fmt(r.deltaDps), 7)}`
      );
    }
    const displaced = belowCutoff.length + displacedByMana.length;
    console.log(
      `${label} VERDICT: ${displaced === 0 ? "NO DISPLACEMENT" : `DISPLACEMENT (${displaced} rows)`}`
    );
    console.log("");
  }

  // --- combined verdict, per the pre-registered tie-break ---
  const displacedUnder = (isGenuine: (r: RankedItem) => boolean): number => {
    const genuine = ranked.filter((r) => isGenuine(r));
    const below = genuine.filter((r) => r.belowCutoff).length;
    const under = genuine.filter(
      (r) => !r.belowCutoff && (r.rank ?? 0) > worstManaRank
    ).length;
    return below + under;
  };
  const primaryCount = displacedUnder(isGenuineUpgradePrimary);
  const altCount = displacedUnder(isGenuineUpgradeAlternative);
  console.log("--- combined verdict (tie-break: either rule counts) ---");
  console.log(`primary ${primaryCount}, alternative ${altCount}`);
  console.log(
    primaryCount === 0 && altCount === 0
      ? "COMBINED: NO DISPLACEMENT under either rule — the owner's bar is met today"
      : "COMBINED: DISPLACEMENT under at least one rule"
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
