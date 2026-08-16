#!/usr/bin/env node
/**
 * record_synthetic_fixtures.mjs — candidate-pool.md §7.a.
 *
 * Runs `rankUpgrades` live (real `CliSimRunner`, pinned wowsimcli) against
 * both synthetic roster fixtures — the pre-raid preset gear for ret and
 * feral, worn as-is, at maxPhase 2 — and writes each row's full-iteration
 * per-candidate `SimObservation`s to a committed JSON keyed by
 * `simCacheKey`. `packages/core/test/synthetic-fixtures.test.ts` replays
 * that file through a `RecordedSimRunner`, so the pinned binary is a
 * recording-time dependency only — CI and every other run replay the
 * committed observations deterministically.
 *
 * Single seed (42), matching scripts/ew5_rank.mjs's pattern for the same
 * reason: `usesPairedReplication` (se.ts) keys off `seeds.length > 1`, and
 * this fixture only needs to demonstrate the >=10-above-cutoff property, not
 * carry replication SE. 3000 iterations — the same probe depth
 * compose_slamaltman_raid_sim.py and compose_feral_raid_sim.py use.
 *
 * Run: npx tsx scripts/record_synthetic_fixtures.mjs — NOT bare `node`,
 *   same NodeNext/.ts-via-tsx-loader reason as ew5_rank.mjs.
 * Requires: vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe
 *   (gitignored — fetch with `python scripts/fetch_wowsimcli.py --platform win32-x64`)
 *   and vendor/wowsims/*.gear.json (gitignored — fetch with
 *   `python scripts/sync_wowsims.py --restore`). The binary path below is
 *   win32-x64 only; another OS needs it edited.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { rankUpgrades } from "../packages/core/src/rank.js";
import {
  poolFromUniverse,
  filterPoolByPhase,
} from "../packages/core/src/pool.js";
import { CliSimRunner } from "../packages/core/src/seams/cli-sim-runner.js";
import { RecordedGearSource } from "../packages/core/src/seams/gear-source.js";
import { simCacheKey } from "../packages/core/src/seams/sim-runner.js";
import { MemoryStore } from "../packages/core/src/seams/store.js";
import {
  syntheticOfflineRecordings,
  RET_SYNTHETIC_REF,
  FERAL_SYNTHETIC_REF,
  RET_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_FIGHT,
} from "../packages/core/src/fixtures/synthetic-offline.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const BIN = join(
  ROOT,
  "vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe"
);
const ITERATIONS = 3000;
const SEED = 42;

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

const ROWS = {
  ret: {
    ref: RET_SYNTHETIC_REF,
    spec: "ret",
    maxPhase: 2,
    fight: RET_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/ret_preraid.gear.json",
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    universePath: "data/universes/ret-p2.json",
    race: undefined, // defaults from skeleton (Blood Elf)
  },
  feral: {
    ref: FERAL_SYNTHETIC_REF,
    spec: "feral",
    maxPhase: 2,
    fight: FERAL_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    universePath: "data/universes/feral-p2.json",
    race: "RaceTauren",
  },
};

async function recordRow(name, cfg) {
  const epWeights = readJson(cfg.epWeightsPath).weights;
  const skeleton = readJson(cfg.skeletonPath);
  const presetGear = readJson(cfg.presetGearPath);
  const pool = filterPoolByPhase(
    poolFromUniverse(readJson(cfg.universePath)),
    cfg.maxPhase
  );
  console.error(
    `[${name}] eligible pool at maxPhase ${cfg.maxPhase}: ${pool.length}`
  );

  const gearData = syntheticOfflineRecordings({
    ref: cfg.ref,
    spec: cfg.spec,
    presetGear,
    fight: cfg.fight,
  });

  const sim = new CliSimRunner(BIN);
  const recordedRequests = [];
  // Wrap the real runner so every request/observation pair this rankUpgrades
  // pass actually issues gets captured under the *exact* key rank.ts will
  // look it up with on replay (simCacheKey hashes the composed request, so
  // hand-recomposing it here would risk drifting from what rank.ts sends).
  const capturing = {
    version: () => sim.version(),
    run: async (req, opts) => {
      const obs = await sim.run(req, opts);
      recordedRequests.push({ req, opts, obs });
      return obs;
    },
  };

  const t0 = Date.now();
  const ranking = await rankUpgrades(
    {
      character: cfg.ref,
      spec: cfg.spec,
      maxPhase: cfg.maxPhase,
      iterations: ITERATIONS,
      seeds: [SEED],
      ...(cfg.race ? { race: cfg.race } : {}),
    },
    {
      gear: new RecordedGearSource(gearData),
      sim: capturing,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );
  const wallMs = Date.now() - t0;

  const version = await sim.version();
  const recordings = {};
  for (const { req, opts, obs } of recordedRequests) {
    recordings[simCacheKey(req, version, opts)] = obs;
  }

  const aboveCutoffCount = ranking.items.filter((i) => !i.belowCutoff).length;
  console.error(
    `[${name}] wallMs=${wallMs} items=${ranking.items.length} ` +
      `aboveCutoff=${aboveCutoffCount} baseline=${ranking.baseline.dps.toFixed(1)} ` +
      `simVersion=${version} requestsCaptured=${recordedRequests.length}`
  );

  return {
    row: {
      spec: cfg.spec,
      presetPhase: 1,
      maxPhase: cfg.maxPhase,
      poolSize: pool.length,
      aboveCutoffCount,
      baselineDps: ranking.baseline.dps,
      iterations: ITERATIONS,
      seed: SEED,
      simVersion: version,
    },
    recordings,
  };
}

async function main() {
  const out = {
    simVersion: null,
    seed: SEED,
    iterations: ITERATIONS,
    rows: {},
  };
  for (const [name, cfg] of Object.entries(ROWS)) {
    const { row, recordings } = await recordRow(name, cfg);
    out.simVersion = row.simVersion;
    out.rows[name] = { ...row, recordings };
  }
  const outPath = join(
    ROOT,
    "packages/core/test/fixtures/synthetic-roster-recordings.json"
  );
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.error(`wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
