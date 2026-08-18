/**
 * `promoteTopK` sweep on both feral pools, for ticket 221.
 *
 * The 7.2 gate measures screening recall at 246 eligible candidates; every
 * real feral run screens the phase 3 pool at 398. `promoteTopK` is a fixed
 * absolute budget, so the fraction of the pool it admits falls from ~61% to
 * ~38% as the pool grows, and the shipped K=150 misses above-cutoff rows at
 * the larger size. This script finds the smallest K that recalls every
 * above-cutoff row on **both** pools, which is what the default has to clear.
 *
 * Not a vitest test — a measurement script, same convention as
 * `measure-racing-ratio.ts` (§7.12: "record numbers"). Named without a
 * `.test.ts` suffix so vitest does not collect it. Run with:
 *
 *   npx tsx packages/core/test/measure-feral-p3-recall.ts
 *
 * It reads the committed recordings and replays them, so it needs no sim
 * binary and no network — but it does run 30 noise draws per K per pool, so
 * expect a few minutes.
 *
 * A sibling of `measure-racing-ratio.ts` rather than an extension of it:
 * that script ranks **ret** (the tuning fixture) and reports the §6.4 cost
 * ratio. This one ranks feral (the gating fixture) and reports recall. The
 * shapes rhyme; the subjects do not.
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
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_ROW,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { DerivedNoiseSimRunner } from "./racing-support.js";

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
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
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

const NOISE_DRAWS = 30;
/**
 * Coarse rungs plus the fine band that located the floor. 150 is the old
 * default (kept so the regression it caused stays visible in the output);
 * 195 is the measured zero-miss floor on P3; 210 is the shipped default,
 * that floor plus the same ~+10 margin the previous default used, rounded up.
 */
const SWEEP: readonly number[] = [150, 175, 190, 195, 200, 210, 250];

type PoolCase = {
  label: string;
  rowKey: string;
  maxPhase: ContentPhase;
  universePath: string;
};

const CASES: readonly PoolCase[] = [
  {
    label: "feral P2",
    rowKey: "feral",
    maxPhase: FERAL_SYNTHETIC_ROW.maxPhase,
    universePath: "data/universes/feral-p2.json",
  },
  {
    label: "feral P3",
    rowKey: "feral-p3",
    maxPhase: FERAL_P3_SYNTHETIC_ROW.maxPhase,
    universePath: "data/universes/feral-p3.json",
  },
];

async function measure(c: PoolCase) {
  const recorded = recordingsFile.rows[c.rowKey]!;
  const pool = filterPoolByPhase(
    poolFromUniverse(
      loadJson<Parameters<typeof poolFromUniverse>[0]>(c.universePath)
    ),
    c.maxPhase
  );
  const baseInput = () => ({
    character: FERAL_SYNTHETIC_REF,
    spec: "feral" as const,
    maxPhase: c.maxPhase,
    iterations: recorded.iterations,
    seeds: [recorded.seed],
    race: "RaceTauren" as const,
  });
  const deps = (sim: unknown) => ({
    gear: new RecordedGearSource(gearData),
    sim: sim as never,
    store: new MemoryStore(),
    clock: () => new Date("2026-08-15T12:00:00.000Z"),
    raidSimSkeleton: skeleton,
    epWeights,
    pool,
  });

  const truth = await rankUpgrades(
    { ...baseInput(), fullPool: true },
    deps(
      new RecordedSimRunner(
        recorded.simVersion,
        new Map(Object.entries(recorded.recordings))
      )
    )
  );
  const aboveCutoffIds = new Set(
    truth.items.filter((i) => !i.belowCutoff).map((i) => i.itemId)
  );
  const top5Ids = new Set(
    truth.items
      .filter((i) => i.rank !== null)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
      .slice(0, 5)
      .map((i) => i.itemId)
  );

  console.log(
    `\n${c.label}: ${pool.length} eligible, ${aboveCutoffIds.size} above cutoff, ` +
      `${NOISE_DRAWS} noise draws`
  );
  console.log("    K   misses  distinct  top5Misses");

  const results: Array<{ k: number; misses: number }> = [];
  for (const k of SWEEP) {
    const missed: Array<{ draw: number; itemId: number }> = [];
    const top5Missed: Array<{ draw: number; itemId: number }> = [];
    for (let draw = 0; draw < NOISE_DRAWS; draw++) {
      const sim = new DerivedNoiseSimRunner(
        recorded.simVersion,
        new Map(Object.entries(recorded.recordings)),
        recorded.seed,
        draw
      );
      const ranking = await rankUpgrades(
        { ...baseInput(), promoteTopK: k },
        deps(sim)
      );
      const screenedOut = new Set(
        ranking.items
          .filter((i) => i.screened?.promoted === false)
          .map((i) => i.itemId)
      );
      for (const itemId of aboveCutoffIds) {
        if (screenedOut.has(itemId)) missed.push({ draw, itemId });
      }
      for (const itemId of top5Ids) {
        if (screenedOut.has(itemId)) top5Missed.push({ draw, itemId });
      }
    }
    const distinct = new Set(missed.map((m) => m.itemId)).size;
    console.log(
      `  ${String(k).padStart(3)}   ${String(missed.length).padStart(6)}  ` +
        `${String(distinct).padStart(8)}  ${String(top5Missed.length).padStart(10)}`
    );
    results.push({ k, misses: missed.length });
  }
  return results;
}

async function main() {
  const byCase: Array<{
    label: string;
    results: Awaited<ReturnType<typeof measure>>;
  }> = [];
  for (const c of CASES) {
    byCase.push({ label: c.label, results: await measure(c) });
  }

  const zeroOnAll = SWEEP.filter((k) =>
    byCase.every((b) => b.results.find((r) => r.k === k)?.misses === 0)
  );
  console.log(
    `\nsmallest swept K with zero misses on every pool: ` +
      `${zeroOnAll.length > 0 ? zeroOnAll[0] : "none in sweep"}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
