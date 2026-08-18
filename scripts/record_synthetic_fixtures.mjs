#!/usr/bin/env node
/**
 * record_synthetic_fixtures.mjs — candidate-pool.md §7.a.
 *
 * Runs `rankUpgrades` live (real `CliSimRunner`, pinned wowsimcli) against
 * the synthetic roster fixtures — the pre-raid preset gear for ret and
 * feral, worn as-is — and writes each row's full-iteration per-candidate
 * `SimObservation`s to a committed JSON keyed by `simCacheKey`.
 * `packages/core/test/synthetic-fixtures.test.ts` replays that file through
 * a `RecordedSimRunner`, so the pinned binary is a recording-time dependency
 * only — CI and every other run replay the committed observations
 * deterministically.
 *
 * Rows: `ret` and `feral` at maxPhase 2, `feral-p3` at maxPhase 3. Every row
 * is recorded with `fullPool: true` — the committed fixture is a *full sweep*
 * truth (one full-iteration sim per eligible candidate, no screening), which
 * is what the 7.2/7.3 recall gates in racing.test.ts compare racing's
 * promotions against. A raced recording would carry screening observations
 * and miss most candidates' full-iteration rows.
 *
 * Usage: pass row names to record a subset; with no names, all rows are
 * recorded. The fixture file is *merged*, not overwritten, so recording one
 * row leaves the others byte-identical.
 *
 *   npx tsx scripts/record_synthetic_fixtures.mjs                 # all rows
 *   npx tsx scripts/record_synthetic_fixtures.mjs feral-p3        # one row
 *   npx tsx scripts/record_synthetic_fixtures.mjs --dry-run feral-p3
 *
 * `--dry-run` prints the eligible pool size and the expected seeded-cache
 * hit/miss split, then exits before invoking the sim binary even once.
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
  gemsForPhase,
  gemsForQuality,
  FILL_MAX_QUALITY,
} from "../packages/core/src/gems.js";
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
    seedFrom: "ret",
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
    seedFrom: "feral",
  },
  // Feral's phase-3 pool is a strict superset of its phase-2 pool (246 shared
  // candidates, 152 P3-only), and `simCacheKey` hashes the composed request
  // rather than the pool — so every shared candidate's key here is identical
  // to the one already committed under `rows.feral`. `seedFrom` exploits that
  // to reuse those 246 recordings and sim only the P3-only remainder.
  // `assertSeedablePalette` guards the one thing that identity depends on;
  // read its comment before changing `maxPhase` or the gem palette.
  "feral-p3": {
    ref: FERAL_SYNTHETIC_REF,
    spec: "feral",
    maxPhase: 3,
    fight: FERAL_SYNTHETIC_FIGHT,
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    // Feral has no P3-specific presets (`ls data/presets/feral/` shows
    // buff-defaults, p1.ep-weights, p2.raid-sim-skeleton), so the P3 row
    // reuses the P2 row's — same precedent as the P2 row already using P1
    // ep-weights.
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    universePath: "data/universes/feral-p3.json",
    race: "RaceTauren",
    seedFrom: "feral",
  },
};

/**
 * Guards the invariant that makes `seedFrom` sound across a maxPhase change.
 *
 * `maxPhase` does not only select the candidate pool — it independently
 * drives gem selection: `rank.ts` builds its `gemContext` from
 * `gemsForPhase(input.maxPhase)`, and gems are written into the equipment
 * array that `simCacheKey` hashes. Raising maxPhase 2 -> 3 grows the palette
 * from 162 entries to 201. If any of those 39 additions could be *written*,
 * every shared candidate's composed request would differ from the seed row's
 * and the copied recordings would be silently wrong — a corrupt fixture that
 * still replays green.
 *
 * Seeding survives only because every gem-writing path draws from the
 * quality-capped `fillPalette` (`FILL_MAX_QUALITY = 3`) and all 39 additions
 * are quality 4, so none of them can reach the request. That is a fact about
 * today's `data/gems/palette.json`, not a structural guarantee: one quality-3
 * phase-3 gem added upstream would invalidate every seeded recording. So this
 * asserts it at record time and refuses to seed rather than emit a wrong
 * fixture.
 */
function assertSeedablePalette(rowName, seedName, seedMaxPhase, maxPhase) {
  if (seedMaxPhase === maxPhase) return;
  const seedIds = new Set(gemsForPhase(seedMaxPhase).map((g) => g.id));
  const added = gemsForPhase(maxPhase).filter((g) => !seedIds.has(g.id));
  const writable = gemsForQuality(added, FILL_MAX_QUALITY);
  if (writable.length > 0) {
    throw new Error(
      `refusing to seed ${rowName} from ${seedName}: raising maxPhase ` +
        `${seedMaxPhase} -> ${maxPhase} admits ${writable.length} gem(s) at ` +
        `quality <= FILL_MAX_QUALITY (${FILL_MAX_QUALITY}) — ` +
        `${writable.map((g) => `${g.id}(q${g.quality},p${g.phase})`).join(", ")}. ` +
        "These are writable into the equipment array simCacheKey hashes, so " +
        "the seed row's recordings are no longer key-identical and copying " +
        "them would commit a silently wrong fixture. Record this row without " +
        "seeding (drop its `seedFrom`) and re-sim the full pool."
    );
  }
  console.error(
    `[${rowName}] seed guard ok: maxPhase ${seedMaxPhase} -> ${maxPhase} adds ` +
      `${added.length} gem(s), all above the fill cap (quality > ${FILL_MAX_QUALITY})`
  );
}

async function recordRow(name, cfg, seedRecordings) {
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
  let hits = 0;
  let misses = 0;
  // Wrap the real runner so every request/observation pair this rankUpgrades
  // pass actually issues gets captured under the *exact* key rank.ts will
  // look it up with on replay (simCacheKey hashes the composed request, so
  // hand-recomposing it here would risk drifting from what rank.ts sends).
  //
  // The same key is what makes seeding work: when the seed row already holds
  // an observation under this exact key, the sim would return the same
  // numbers, so the recording is copied and the binary is never invoked.
  // `assertSeedablePalette` has already established that key identity holds
  // across this row's maxPhase.
  let seedVersion = null;
  const capturing = {
    version: () => sim.version(),
    run: async (req, opts) => {
      if (seedRecordings) {
        seedVersion ??= await sim.version();
        const key = simCacheKey(req, seedVersion, opts);
        const seeded = seedRecordings[key];
        if (seeded) {
          hits++;
          recordedRequests.push({ req, opts, obs: seeded });
          return seeded;
        }
      }
      misses++;
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
      // The committed fixture is a full-sweep truth. Without this the run
      // races: it screens at 1000 iterations and full-sims only the promoted
      // rows, so most eligible candidates would have no full-iteration
      // observation and the recall gates replaying this file would have
      // nothing to check racing against.
      fullPool: true,
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
      `simVersion=${version} requestsCaptured=${recordedRequests.length} ` +
      `cacheHits=${hits} cacheMisses=${misses}`
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

const OUT_PATH = join(
  ROOT,
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);

function readExistingFixture() {
  try {
    return JSON.parse(readFileSync(OUT_PATH, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Reports what a seeded run would spend, without invoking the sim binary.
 *
 * The split is a set operation on the pool, not on sim requests: the seed row
 * holds a recording for each of its own eligible candidates, so this row's
 * hits are the candidates the two pools share and its misses are the ones
 * only this pool has. Deriving it that way is what lets `--dry-run` answer
 * before any spend — asking the runner would mean composing requests, which
 * means simming.
 *
 * The printed numbers are the *pool-level* split. A real run reports slightly
 * more of both: the baseline sim, and paired-slot retries that issue a second
 * request for one candidate.
 */
function dryRunRow(name, cfg, seedRow) {
  const pool = filterPoolByPhase(
    poolFromUniverse(readJson(cfg.universePath)),
    cfg.maxPhase
  );
  console.error(
    `[${name}] eligible pool at maxPhase ${cfg.maxPhase}: ${pool.length}`
  );
  if (!seedRow) {
    console.error(
      `[${name}] no seed row available — expect ~${pool.length} sims (no reuse)`
    );
    return;
  }
  assertSeedablePalette(name, cfg.seedFrom, seedRow.maxPhase, cfg.maxPhase);
  const seedPool = filterPoolByPhase(
    poolFromUniverse(readJson(ROWS[cfg.seedFrom].universePath)),
    seedRow.maxPhase
  );
  const seedIds = new Set(seedPool.map((c) => c.itemId));
  const shared = pool.filter((c) => seedIds.has(c.itemId)).length;
  console.error(
    `[${name}] seeded from '${cfg.seedFrom}' (${seedPool.length} eligible, ` +
      `${Object.keys(seedRow.recordings).length} recordings): ` +
      `expect ~${shared + 1} cache hits (${shared} shared candidates + baseline) ` +
      `and ~${pool.length - shared} sims`
  );
}

async function main() {
  const argv = process.argv.slice(2);
  // Partition flags out *before* the row filter. Sharing one argv between the
  // two would make a bare `--dry-run` match no row name, which under "no
  // names means all rows" would silently select every row.
  const flags = argv.filter((a) => a.startsWith("--"));
  const names = argv.filter((a) => !a.startsWith("--"));
  for (const flag of flags) {
    if (flag !== "--dry-run") {
      throw new Error(`unknown flag ${flag} (supported: --dry-run)`);
    }
  }
  for (const name of names) {
    if (!(name in ROWS)) {
      throw new Error(
        `unknown row '${name}' (known: ${Object.keys(ROWS).join(", ")})`
      );
    }
  }
  const dryRun = flags.includes("--dry-run");
  // Empty *after* stripping flags means all rows.
  const selected = names.length > 0 ? names : Object.keys(ROWS);

  const existing = readExistingFixture();

  if (dryRun) {
    for (const name of selected) {
      dryRunRow(name, ROWS[name], existing?.rows?.[ROWS[name].seedFrom]);
    }
    console.error("--dry-run: no sims issued, nothing written");
    return;
  }

  // Merge into the existing file rather than rebuilding it, so recording one
  // row leaves every other row byte-identical — the whole point of being able
  // to name rows on the command line.
  const out = existing ?? {
    simVersion: null,
    seed: SEED,
    iterations: ITERATIONS,
    rows: {},
  };
  for (const name of selected) {
    const cfg = ROWS[name];
    const seedRow = existing?.rows?.[cfg.seedFrom];
    let seedRecordings;
    if (seedRow) {
      // Seeding across a maxPhase change is only sound under the gem-palette
      // invariant; a row seeded from itself is a pure reproduction check and
      // the guard is a no-op for it.
      assertSeedablePalette(name, cfg.seedFrom, seedRow.maxPhase, cfg.maxPhase);
      seedRecordings = seedRow.recordings;
    }
    const { row, recordings } = await recordRow(name, cfg, seedRecordings);
    if (out.simVersion !== null && out.simVersion !== row.simVersion) {
      throw new Error(
        `simVersion mismatch: file has ${out.simVersion}, ${name} recorded ` +
          `${row.simVersion} — re-record every row against one binary rather ` +
          "than committing a file whose rows disagree"
      );
    }
    out.simVersion = row.simVersion;
    out.rows[name] = { ...row, recordings };
  }
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + "\n", "utf8");
  console.error(
    `wrote ${OUT_PATH} (rows: ${Object.keys(out.rows).join(", ")})`
  );
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
