#!/usr/bin/env node
/**
 * E-W5 §3.2 — screening rank vs full rank.
 *
 * For both roster fixtures (ret, feral) runs the full eligible set at
 * maxPhase 2 through the real `rankUpgrades` seam (packages/core/src/rank.ts)
 * at every §3.1 sweep point and at 5,000 iterations, live against the pinned
 * CLI binary via `CliSimRunner` — the same production candidate-swap, gem-fill
 * and meta-repair pipeline the app runs, not a reimplementation of it.
 *
 * `seeds: [42]` (single seed) disables paired replication (`usesPairedReplication`
 * keys off `seeds.length > 1` in se.ts), so each run costs 1 baseline + 1 sim
 * per eligible candidate + a handful of set-completion sims — matching §1.1's
 * "n_screened / n_full" term, not the full production run's replication cost.
 *
 * Run: node scripts/ew5_rank.mjs
 * Cost: ~20 minutes total sim time across both fixtures and all 6 points
 *   (5 sweep points + 5000), estimated from the §3.1 fit before running.
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
import { MemoryStore } from "../packages/core/src/seams/store.js";
import { mapWclGearToSim, SIM_ORDER } from "../packages/core/src/slots.js";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const BIN = join(
  ROOT,
  "vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe"
);
const SWEEP = [100, 300, 1000, 3000, 5000];
const SEED = 42;
// F10 / plan §3.2: fixed cutoff for both specs for the go/no-go, not each
// spec's own cutoffForSpec() value — feral's own cutoff is {absDps:3.6,
// pct:0.15} (packages/core/src/cutoff.ts:27), different from the {3.4,0.15}
// this plan specifies. Both numbers are reported in the output; the go/no-go
// uses the plan's {3.4, 0.15} as instructed.
const CUTOFF = { absDps: 3.4, pct: 0.15 };

function readJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function loggedGearFromRaw(
  rawPath,
  playerName,
  talentPointsByTree,
  provenance
) {
  const raw = readJson(rawPath);
  const actors = new Map(raw.actors.map((a) => [a.id, a]));
  for (const ev of raw.combatant_info_events) {
    if (
      actors.get(ev.sourceID)?.name.toLowerCase() !== playerName.toLowerCase()
    )
      continue;
    const mapped = mapWclGearToSim(ev.gear);
    return {
      items: mapped.map((spec, i) => {
        const item = { id: spec.id ?? 0, slot: SIM_ORDER[i] };
        if (spec.gems) item.gems = spec.gems;
        if (spec.enchant) item.enchant = spec.enchant;
        return item;
      }),
      talentPointsByTree,
      provenance,
    };
  }
  throw new Error(`${playerName} not found in ${rawPath}`);
}

/**
 * Universe reconciliation (must-report per the task): ret-p2.json has 240
 * entries (already generated at maxPhase 2), but ret-p5.json filtered to
 * phase<=2 gives 246 — a 6-row gap between the two universe files for the
 * same nominal (spec, maxPhase) pair. This harness reads ret-p5.json and
 * filters to phase<=2, per the corrected counts given for this task; the two
 * universes are not reconciled here (out of scope, stated explicitly in the
 * task).
 */
function eligiblePool(universePath, maxPhase) {
  const data = readJson(universePath);
  const pool = poolFromUniverse(data);
  return filterPoolByPhase(pool, maxPhase);
}

const FIXTURES = {
  ret: {
    universePath: "data/universes/ret-p5.json",
    universeNote:
      "ret-p2.json has 240 entries; ret-p5.json filtered to phase<=2 has 246 " +
      "(this script uses ret-p5.json, per the task's corrected counts) — 6-row gap, unreconciled",
    maxPhase: 2,
    character: { region: "US", realm: "dreamscythe", name: "slamaltman" },
    summary: {
      reportCode: "abc123",
      fightId: 7,
      encounterName: "Hydross the Unstable",
      killedAt: "2026-07-01T00:00:00.000Z",
      route: "ranked",
      confidence: 1,
    },
    loggedGear: () =>
      loggedGearFromRaw(
        "test/fixtures/slamaltman.raw.json",
        "slamaltman",
        [5, 11, 45],
        { reportCode: "abc123", fightId: 7, sourceID: -1 }
      ),
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    spec: "ret",
    race: undefined, // defaults from skeleton (Blood Elf), matching rank.test.ts
  },
  feral: {
    universePath: "data/universes/feral-p2.json",
    universeNote:
      "feral-p2.json filtered to phase<=2 has 246 entries, feral-p3.json filtered " +
      "to phase<=2 has 251 — this script uses feral-p2.json (matches its own maxPhase 2 pin)",
    maxPhase: 2,
    character: { region: "US", realm: "dreamscythe", name: "shredzepelin" },
    summary: {
      reportCode: "def456",
      fightId: 3,
      encounterName: "Hydross the Unstable",
      killedAt: "2026-07-01T00:00:00.000Z",
      route: "ranked",
      confidence: 1,
    },
    loggedGear: () =>
      loggedGearFromRaw(
        "test/fixtures/shredzepelin-cat.raw.json",
        "shredzepelin",
        [0, 45, 16],
        { reportCode: "def456", fightId: 3, sourceID: -1 }
      ),
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    spec: "feral",
    race: "RaceTauren",
  },
};

async function runFixture(name, cfg) {
  const epWeights = readJson(cfg.epWeightsPath).weights;
  const skeleton = readJson(cfg.skeletonPath);
  const pool = eligiblePool(cfg.universePath, cfg.maxPhase);
  console.error(
    `[${name}] eligible pool size at maxPhase ${cfg.maxPhase}: ${pool.length} (${cfg.universeNote})`
  );

  const gearKey = `${cfg.character.region}|${cfg.character.realm}|${cfg.character.name}|${cfg.spec}`;
  const fightKey = `${cfg.summary.reportCode}|${cfg.summary.fightId}`;

  const points = {};
  const allPoints = [...SWEEP, 5000].filter((v, i, a) => a.indexOf(v) === i);
  for (const iterations of allPoints) {
    console.error(
      `[${name}] running rankUpgrades at iterations=${iterations}...`
    );
    const sim = new CliSimRunner(BIN);
    const gear = new RecordedGearSource({
      fights: new Map([[gearKey, [cfg.summary]]]),
      gear: new Map([[fightKey, cfg.loggedGear()]]),
    });
    const t0 = Date.now();
    const ranking = await rankUpgrades(
      {
        character: cfg.character,
        spec: cfg.spec,
        maxPhase: cfg.maxPhase,
        iterations,
        seeds: [SEED],
        ...(cfg.race ? { race: cfg.race } : {}),
      },
      {
        gear,
        sim,
        store: new MemoryStore(),
        clock: () => new Date("2026-08-15T12:00:00.000Z"),
        raidSimSkeleton: skeleton,
        epWeights,
        pool,
      }
    );
    const wallMs = Date.now() - t0;
    console.error(
      `[${name}] iterations=${iterations} wallMs=${wallMs} items=${ranking.items.length} baseline=${ranking.baseline.dps.toFixed(1)}`
    );
    points[iterations] = {
      wallMs,
      baselineDps: ranking.baseline.dps,
      // itemId -> deltaDps, for every ranked row this pass produced.
      deltas: Object.fromEntries(
        ranking.items.map((r) => [r.itemId, r.deltaDps])
      ),
    };
  }

  return { poolSize: pool.length, points };
}

// Spearman rank correlation between two itemId->value maps, over their
// shared itemId set (both runs rank the same eligible pool, so the sets
// should already agree; intersecting is defensive).
function spearman(a, b) {
  const ids = Object.keys(a).filter((id) => id in b);
  const rank = (obj, ids) => {
    const sorted = [...ids].sort((x, y) => obj[y] - obj[x]);
    const r = {};
    sorted.forEach((id, i) => {
      r[id] = i + 1;
    });
    return r;
  };
  const ra = rank(a, ids);
  const rb = rank(b, ids);
  const n = ids.length;
  const dSquaredSum = ids.reduce((acc, id) => acc + (ra[id] - rb[id]) ** 2, 0);
  return 1 - (6 * dSquaredSum) / (n * (n * n - 1));
}

// K* = smallest global top-K by screening rank that contains every
// 5000-iteration above-cutoff row.
function kStar(screenDeltas, fullDeltas, baselineDps5000, cutoff) {
  const aboveCutoff = Object.entries(fullDeltas)
    .filter(
      ([, d]) => d >= cutoff.absDps || d / baselineDps5000 >= cutoff.pct / 100
    )
    .map(([id]) => id);
  const screenRanked = Object.entries(screenDeltas)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);
  const screenRankIndex = new Map(screenRanked.map((id, i) => [id, i + 1]));
  let worst = 0;
  for (const id of aboveCutoff) {
    const r = screenRankIndex.get(id);
    if (r === undefined) {
      // Above-cutoff row missing from the screening pass entirely (should not
      // happen — same pool both passes) — treat as worst-case: whole pool.
      worst = Math.max(worst, screenRanked.length);
    } else {
      worst = Math.max(worst, r);
    }
  }
  return { kStar: worst, aboveCutoffCount: aboveCutoff.length };
}

async function main() {
  const results = {};
  for (const [name, cfg] of Object.entries(FIXTURES)) {
    results[name] = await runFixture(name, cfg);
  }

  const report = {};
  for (const [name, r] of Object.entries(results)) {
    const full = r.points[5000];
    report[name] = { poolSize: r.poolSize, points: {} };
    for (const iterations of SWEEP) {
      const screen = r.points[iterations];
      const rho = spearman(screen.deltas, full.deltas);
      const { kStar: k, aboveCutoffCount } = kStar(
        screen.deltas,
        full.deltas,
        full.baselineDps,
        CUTOFF
      );
      report[name].points[iterations] = {
        spearman: rho,
        kStar: k,
        aboveCutoffCount,
        costRatio: screen.wallMs / full.wallMs,
      };
    }
  }

  const outJson = {
    command: "node scripts/ew5_rank.mjs",
    cutoffUsedForGoNoGo: CUTOFF,
    note:
      "feral's own cutoffForSpec() value is {absDps:3.6, pct:0.15} " +
      "(packages/core/src/cutoff.ts:27), different from the fixed {3.4,0.15} " +
      "used here for both specs per the task instructions (F10) — reported for " +
      "transparency, not applied",
    seed: SEED,
    sweep: SWEEP,
    fixtures: {
      ret: FIXTURES.ret.universeNote,
      feral: FIXTURES.feral.universeNote,
    },
    raw: results,
    report,
  };
  writeFileSync(
    join(ROOT, "experiments/e-w5-rank.json"),
    JSON.stringify(outJson, null, 2) + "\n"
  );
  writeFileSync(join(ROOT, "experiments/e-w5-rank.md"), renderMd(outJson));
  console.log("wrote experiments/e-w5-rank.json and .md");
}

function renderMd(out) {
  let md = `# E-W5 §3.2 — screening rank vs full rank

Command: \`${out.command}\`
Seed: ${out.seed}. Cutoff used for the go/no-go: \`${JSON.stringify(out.cutoffUsedForGoNoGo)}\` (F10).
${out.note}

Universe notes:
- ret: ${out.fixtures.ret}
- feral: ${out.fixtures.feral}

`;
  for (const [spec, data] of Object.entries(out.report)) {
    md += `## ${spec} (eligible pool: ${out.raw[spec].poolSize})\n\n`;
    md += `| iterations | Spearman rho vs 5000 | K* | above-cutoff rows | cost(point)/cost(5000) |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    for (const [iterations, p] of Object.entries(data.points)) {
      md += `| ${iterations} | ${p.spearman.toFixed(4)} | ${p.kStar} | ${p.aboveCutoffCount} | ${p.costRatio.toFixed(3)} |\n`;
    }
    md += "\n";
  }
  return md;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
