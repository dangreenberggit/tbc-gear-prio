/**
 * §6.4's ratio, on demand: full-iteration sims issued at defaults ÷
 * eligible, on ret `maxPhase 2` (the tuning fixture), Node, `concurrency 1`.
 *
 * Not a vitest test — a measurement script, per §7.12 ("E-W5 / M1.5
 * harnesses ... not tests — record numbers"). Named without a `.test.ts`
 * suffix so vitest does not pick it up as a suite. Run with:
 *
 *   npx tsx packages/core/test/measure-racing-ratio.ts
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
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
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

class CountingSimRunner implements SimRunner {
  runs = 0;
  runsByIterations = new Map<number, number>();
  constructor(private readonly inner: SimRunner) {}
  version(): Promise<string> {
    return this.inner.version();
  }
  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    this.runs += 1;
    this.runsByIterations.set(
      opts.iterations,
      (this.runsByIterations.get(opts.iterations) ?? 0) + 1
    );
    return this.inner.run(req, opts);
  }
}

const recordings = new Map(Object.entries(recorded.recordings));
const inner = new RecordedSimRunner(recorded.simVersion, recordings);
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
const ratio = fullIterationRuns / eligibleCount;

console.log(`eligible: ${eligibleCount}`);
console.log(`full-iteration sims issued: ${fullIterationRuns}`);
console.log(`ratio: ${ratio.toFixed(4)}`);
console.log(
  `above-cutoff rows: ${ranking.items.filter((i) => !i.belowCutoff).length}`
);
console.log(
  `screened-out rows: ${ranking.items.filter((i) => i.screened !== undefined).length}`
);
