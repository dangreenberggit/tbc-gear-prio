/**
 * §6.4's ratio, on demand: full-iteration sims issued at defaults ÷
 * eligible, Node, `concurrency 1`.
 *
 * Takes an optional fixture selector as argv[2]:
 *
 *   npx tsx packages/core/test/measure-racing-ratio.ts          # ret (default)
 *   npx tsx packages/core/test/measure-racing-ratio.ts feral    # feral P2
 *   npx tsx packages/core/test/measure-racing-ratio.ts feral-p3 # feral P3
 *
 * `ret` ranks the **tuning** fixture at `maxPhase 2`; the two feral
 * selectors rank the **gating** fixture (`racing.test.ts` 7.0/7.2), whose
 * numbers rank.ts quotes. The ret output is unchanged from before the
 * selector existed.
 *
 * Screening asks for sims at `DEFAULT_SCREEN_ITERATIONS`, which the recorded
 * fixture (3000-iteration keys only) cannot answer, so lookups go through
 * `DerivedNoiseSimRunner` — the same derivation the racing tests use. Noise
 * seed 1 is a convention borrowed from those tests, not a correspondence.
 *
 * Not a vitest test — a measurement script, per §7.12 ("E-W5 / M1.5
 * harnesses ... not tests — record numbers"). Named without a `.test.ts`
 * suffix so vitest does not pick it up as a suite. Not a gate: nothing in
 * `pnpm verify` runs it (ticket 223 AC4).
 *
 * Requires: vendor/wowsims/ret_preraid.gear.json (for `ret`) or
 * vendor/wowsims/feral_preraid.gear.json (for the feral selectors) — both
 * gitignored, so a fresh checkout must sync vendor/ before this script can
 * run.
 *
 * Lives under `packages/core/test/` rather than the repo's top-level
 * `scripts/` because this slice's `pathsAllowed` is `packages/core/src/**`,
 * `packages/core/test/**`, and candidate-pool.md §6 only.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import { DEFAULT_SCREEN_ITERATIONS } from "../src/promotion.js";
import type {
  RaidSimRequest,
  SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  RET_SYNTHETIC_REF,
  RET_SYNTHETIC_FIGHT,
  RET_SYNTHETIC_ROW,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_ROW,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { CountingSimRunner, DerivedNoiseSimRunner } from "./racing-support.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

type FixtureCase = {
  rowKey: string;
  ref: typeof RET_SYNTHETIC_REF;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight: typeof RET_SYNTHETIC_FIGHT;
  epWeightsPath: string;
  skeletonPath: string;
  presetGearPath: string;
  universePath: string;
  /**
   * `racing.test.ts` passes an explicit race on the feral runs; ret's
   * fixture carries its own. Kept per-case so each selector reproduces the
   * wiring of the harness whose numbers it is meant to reproduce.
   */
  race?: "RaceTauren";
};

const CASES: Record<string, FixtureCase> = {
  ret: {
    rowKey: "ret",
    ref: RET_SYNTHETIC_REF,
    spec: RET_SYNTHETIC_ROW.spec,
    maxPhase: RET_SYNTHETIC_ROW.maxPhase,
    fight: RET_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/ret_preraid.gear.json",
    universePath: "data/universes/ret-p2.json",
  },
  feral: {
    rowKey: "feral",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p2.json",
    race: "RaceTauren",
  },
  "feral-p3": {
    rowKey: "feral-p3",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_P3_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_P3_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p3.json",
    race: "RaceTauren",
  },
};

const selector = process.argv[2] ?? "ret";
const chosen = CASES[selector];
if (chosen === undefined) {
  console.error(
    `unknown fixture selector ${JSON.stringify(selector)}; ` +
      `expected one of ${Object.keys(CASES).join(", ")}`
  );
  process.exit(1);
}

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows[chosen.rowKey]!;
const epWeights = loadJson<{ weights: Record<string, number> }>(
  chosen.epWeightsPath
).weights;
const skeleton = loadJson<RaidSimRequest>(chosen.skeletonPath);
const presetGear = loadJson<PresetGearFile>(chosen.presetGearPath);
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(chosen.universePath)
  ),
  chosen.maxPhase
);
const gearData = syntheticOfflineRecordings({
  ref: chosen.ref,
  spec: chosen.spec,
  presetGear,
  fight: chosen.fight,
});

const recordings = new Map(Object.entries(recorded.recordings));
const inner = new DerivedNoiseSimRunner(
  recorded.simVersion,
  recordings,
  recorded.seed,
  1
);
const sim = new CountingSimRunner(inner);

const ranking = await rankUpgrades(
  {
    character: chosen.ref,
    spec: chosen.spec,
    maxPhase: chosen.maxPhase,
    iterations: recorded.iterations,
    seeds: [recorded.seed],
    ...(chosen.race === undefined ? {} : { race: chosen.race }),
  },
  {
    gear: new RecordedGearSource(gearData),
    sim,
    store: new MemoryStore(),
    clock: () => new Date("2026-08-15T12:00:00.000Z"),
    raidSimSkeleton: skeleton,
    epWeights,
    pool,
    concurrency: 1,
  }
);

const eligibleCount = pool.length;
const fullIterationRuns = sim.runsByIterations.get(recorded.iterations) ?? 0;
const screeningRuns = sim.runsByIterations.get(DEFAULT_SCREEN_ITERATIONS) ?? 0;
const ratio = fullIterationRuns / eligibleCount;
// `belowCutoff` is false on screened rows by design (rank.ts's `screened`
// doc: a screened row is a third view state, "never measured at full
// precision", not "measured and small"), so `!belowCutoff` alone counts all
// 30 screened losses as upgrades. view.ts's `belowCutoffUnderView` answers
// the game-facing question by treating any screened row as below cutoff;
// this mirrors that rule rather than the raw field.
const aboveCutoff = ranking.items.filter(
  (i) => !i.belowCutoff && i.screened === undefined
).length;
const screenedOut = ranking.items.filter(
  (i) => i.screened !== undefined
).length;
const promoted = ranking.items.length - screenedOut;

console.log(`fixture: ${selector}`);
console.log(`eligible: ${eligibleCount}`);
console.log(`full-iteration sims issued: ${fullIterationRuns}`);
console.log(`screening sims issued: ${screeningRuns}`);
console.log(`promoted rows: ${promoted}`);
console.log(`screened-out rows: ${screenedOut}`);
console.log(`above-cutoff rows: ${aboveCutoff}`);
console.log(`ratio: ${ratio.toFixed(4)}`);

// A printed ratio is only evidence if the counts behind it are sane: one
// baseline sim plus at least one full sim per promoted candidate is the
// floor (paired-slot items can add more). The upper check is weak on
// purpose — it catches only "no racing happened at all", not "racing
// achieved anything worthwhile"; a ratio just under 1.0 passes it and is
// still a near-total sweep, which is exactly what 0.9708 reports.
if (fullIterationRuns < promoted + 1) {
  throw new Error(
    `full-iteration sims (${fullIterationRuns}) below the baseline-plus-promoted floor (${promoted + 1})`
  );
}
if (fullIterationRuns >= eligibleCount) {
  throw new Error(
    `full-iteration sims (${fullIterationRuns}) did not beat a full sweep of ${eligibleCount} eligible candidates`
  );
}
