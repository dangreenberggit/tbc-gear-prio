/**
 * §6.4's ratio, on demand: full-iteration sims issued at defaults ÷
 * eligible, on ret `maxPhase 2` (the tuning fixture), Node, `concurrency 1`.
 *
 * Screening asks for sims at `DEFAULT_SCREEN_ITERATIONS`, which the recorded
 * fixture (3000-iteration keys only) cannot answer, so lookups go through
 * `DerivedNoiseSimRunner` — the same derivation the racing tests use. This
 * ranks the **ret tuning fixture**; `racing.test.ts` 7.0 gates on the
 * **feral** fixture, so the number printed here is not 7.0's number. Noise
 * seed 1 is a convention borrowed from those tests, not a correspondence.
 *
 * Not a vitest test — a measurement script, per §7.12 ("E-W5 / M1.5
 * harnesses ... not tests — record numbers"). Named without a `.test.ts`
 * suffix so vitest does not pick it up as a suite. Not a gate: nothing in
 * `pnpm verify` runs it (ticket 223 AC4). Run with:
 *
 *   npx tsx packages/core/test/measure-racing-ratio.ts
 *
 * Requires: vendor/wowsims/ret_preraid.gear.json (gitignored — a fresh
 * checkout must sync vendor/ before this script can run).
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

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows.ret!;
const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/ret/p2.ep-weights.json"
).weights;
const skeleton = loadJson<RaidSimRequest>(
  "data/presets/ret/p2.raid-sim-skeleton.json"
);
const presetGear = loadJson<PresetGearFile>(
  "vendor/wowsims/ret_preraid.gear.json"
);
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/ret-p2.json"
    )
  ),
  RET_SYNTHETIC_ROW.maxPhase
);
const gearData = syntheticOfflineRecordings({
  ref: RET_SYNTHETIC_REF,
  spec: RET_SYNTHETIC_ROW.spec,
  presetGear,
  fight: RET_SYNTHETIC_FIGHT,
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
    character: RET_SYNTHETIC_REF,
    spec: RET_SYNTHETIC_ROW.spec,
    maxPhase: RET_SYNTHETIC_ROW.maxPhase,
    iterations: recorded.iterations,
    seeds: [recorded.seed],
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
const aboveCutoff = ranking.items.filter((i) => !i.belowCutoff).length;
const screenedOut = ranking.items.filter(
  (i) => i.screened !== undefined
).length;
const promoted = ranking.items.length - screenedOut;

console.log(`eligible: ${eligibleCount}`);
console.log(`full-iteration sims issued: ${fullIterationRuns}`);
console.log(`screening sims issued: ${screeningRuns}`);
console.log(`promoted rows: ${promoted}`);
console.log(`screened-out rows: ${screenedOut}`);
console.log(`above-cutoff rows: ${aboveCutoff}`);
console.log(`ratio: ${ratio.toFixed(4)}`);

// A printed ratio is only evidence if the counts behind it are sane: one
// baseline sim plus at least one full sim per promoted candidate is the
// floor (paired-slot items can add more), and a racing pass that issued as
// many full sims as there are eligible candidates did no racing at all.
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
