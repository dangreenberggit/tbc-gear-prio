/**
 * `pnpm rank` — thin CLI over rankUpgrades (PLAN.md §5.1).
 * I/O lives here; the core module stays pure.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { CUTOFF } from "./cutoff.js";
import { hitCapBanner, renderDisclosure } from "./disclosure.js";
import {
  slamaltmanOfflineRecordings,
  SLAMALTMAN_REF,
  type SlamaltmanRawFixture,
} from "./fixtures/slamaltman-offline.js";
import { renderRankHtml } from "./rank-report.js";
import { RankError, rankUpgrades, type RankInput } from "./rank.js";
import {
  poolFromUniverse,
  zonesInPool,
  type PoolEntry,
  type UniverseEntry,
} from "./pool.js";
import { applyView, type ViewOptions } from "./view.js";
import { CliSimRunner } from "./seams/cli-sim-runner.js";
import { RecordedGearSource } from "./seams/gear-source.js";
import type { RaidSimRequest, SimRunner } from "./seams/sim-runner.js";
import { MemoryStore } from "./seams/store.js";
import type { ContentPhase, Region } from "./types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

/** DEFAULT_MAX_PHASE from the wowsims lock — never a second hardcoded tier. */
function defaultMaxPhaseFromLock(): ContentPhase {
  const lock = loadJson<{
    defaultMaxPhase?: number;
    currentPhase?: number;
  }>("data/wowsims.lock.json");
  const n = lock.defaultMaxPhase ?? lock.currentPhase;
  if (n !== 1 && n !== 2 && n !== 3 && n !== 4 && n !== 5) {
    console.error(
      `wowsims.lock.json missing usable defaultMaxPhase/currentPhase (got ${String(n)})`
    );
    process.exit(2);
    throw new Error("unreachable");
  }
  return n;
}

function usage(): never {
  console.error(
    "usage: pnpm rank --region US --realm <realm> --character <name> [--offline] [--max-phase N] [--raid <zone>] [--boss <name>] [--group-by rank|slot|raid] [--pin-bis] [--hide-owned] [--assumptions] [--report [<path.html>]]"
  );
  process.exit(2);
  throw new Error("unreachable");
}

function parseArgs(argv: string[]): {
  region: Region;
  realm: string;
  character: string;
  offline: boolean;
  maxPhase: ContentPhase;
  assumptions: boolean;
  raid?: string;
  report?: string;
  view: ViewOptions;
} {
  const out: {
    region?: Region;
    realm?: string;
    character?: string;
    offline: boolean;
    maxPhase: ContentPhase;
    assumptions: boolean;
    raid?: string;
    report?: string;
    view: ViewOptions;
  } = {
    offline: false,
    assumptions: false,
    maxPhase: defaultMaxPhaseFromLock(),
    view: {},
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--offline") {
      out.offline = true;
      continue;
    }
    if (arg === "--assumptions") {
      out.assumptions = true;
      continue;
    }
    if (arg === "--pin-bis") {
      out.view.pinBis = true;
      continue;
    }
    if (arg === "--hide-owned") {
      out.view.hideOwned = true;
      continue;
    }
    const next = argv[i + 1];
    if (arg === "--region" && next) {
      out.region = next as Region;
      i++;
      continue;
    }
    if (arg === "--realm" && next) {
      out.realm = next;
      i++;
      continue;
    }
    if (arg === "--character" && next) {
      out.character = next;
      i++;
      continue;
    }
    if (arg === "--max-phase" && next) {
      out.maxPhase = Number(next) as ContentPhase;
      i++;
      continue;
    }
    if (arg === "--raid" && next) {
      out.raid = next;
      out.view.raid = next;
      i++;
      continue;
    }
    if (arg === "--boss" && next) {
      out.view.boss = next;
      i++;
      continue;
    }
    if (arg === "--group-by" && next) {
      if (next !== "rank" && next !== "slot" && next !== "raid") usage();
      out.view.groupBy = next;
      i++;
      continue;
    }
    if (arg === "--report") {
      if (next && !next.startsWith("-")) {
        out.report = next;
        i++;
      } else {
        out.report = "";
      }
      continue;
    }
    usage();
  }

  if (!out.region || !out.realm || !out.character) usage();
  return {
    region: out.region,
    realm: out.realm,
    character: out.character,
    offline: out.offline,
    maxPhase: out.maxPhase,
    assumptions: out.assumptions,
    view: out.view,
    ...(out.raid !== undefined ? { raid: out.raid } : {}),
    ...(out.report !== undefined ? { report: out.report } : {}),
  };
}

function defaultReportPath(args: {
  character: string;
  realm: string;
  region: string;
}): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const name = `${args.character}@${args.realm}-${args.region}-${stamp}.html`;
  return join(root, ".scratch", "rank-reports", name);
}

function loadUniversePool(maxPhase: ContentPhase): PoolEntry[] {
  const rel = `data/universes/ret-p${maxPhase}.json`;
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error(`missing universe file ${rel}`);
    console.error(
      "generate: python scripts/assemble_universe.py --max-phase N"
    );
    process.exit(2);
    throw new Error("unreachable");
  }
  const data = loadJson<{ entries: UniverseEntry[] }>(rel);
  return poolFromUniverse(data);
}

function resolveWowsimcli(): string {
  const tag = loadJson<{ tag: string }>("data/wowsims.lock.json").tag;
  const plat = platform().startsWith("win") ? "win32-x64" : "linux-x64";
  const binary = plat === "win32-x64" ? "wowsimcli-windows.exe" : "wowsimcli";
  return join(root, "vendor", `wowsimcli-${tag}-${plat}`, binary);
}

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  if (!args.offline) {
    console.error(
      "live WCL path is not wired yet; pass --offline (recorded adapters)"
    );
    return 2;
  }

  const input: RankInput = {
    character: {
      region: args.region,
      realm: args.realm,
      name: args.character,
    },
    spec: "ret",
    maxPhase: args.maxPhase,
  };

  const skeleton = loadJson<RaidSimRequest>(
    "data/presets/ret/p2.raid-sim-skeleton.json"
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/ret/p2.ep-weights.json"
  ).weights;
  const pool = loadUniversePool(args.maxPhase);

  if (args.raid) {
    const known = zonesInPool(pool);
    if (!known.includes(args.raid)) {
      console.error(`unknown raid zone: ${args.raid}`);
      console.error("known zones:");
      for (const zone of known) {
        console.error(`  ${zone}`);
      }
      return 2;
    }
  }

  const isSlamaltman =
    args.region === SLAMALTMAN_REF.region &&
    args.realm.toLowerCase() === SLAMALTMAN_REF.realm &&
    args.character.toLowerCase() === SLAMALTMAN_REF.name;

  const gearData = isSlamaltman
    ? slamaltmanOfflineRecordings(
        loadJson<SlamaltmanRawFixture>("test/fixtures/slamaltman.raw.json")
      )
    : { fights: new Map(), gear: new Map() };

  const binary = resolveWowsimcli();
  if (!existsSync(binary)) {
    console.error(`missing wowsimcli at ${binary}`);
    console.error("fetch: pnpm fetch:wowsimcli");
    return 2;
  }
  const sim: SimRunner = new CliSimRunner(binary);

  const raidNote = args.raid ? ` raid=${args.raid}` : "";
  console.log(
    `rank ${args.character}@${args.realm}-${args.region} (offline) maxPhase=${args.maxPhase} universe=${pool.length}${raidNote} cutoff=${CUTOFF.absDps} DPS / ${CUTOFF.pct}%`
  );

  // One time source for the run: the store's job rows, the engine and the
  // report footer should not be able to disagree about when this happened.
  const clock = () => new Date();

  try {
    const ranking = await rankUpgrades(
      input,
      {
        gear: new RecordedGearSource(gearData),
        sim,
        store: new MemoryStore(clock),
        clock,
        raidSimSkeleton: skeleton,
        epWeights,
        pool,
      },
      (p) => {
        if (p.stage === "simming") {
          console.log(`simming ${p.done}/${p.total}`);
        }
      }
    );
    // Through applyView (§4.1) rather than a second filter implementation —
    // the CLI exercising every ViewOptions field is the stated reason the view
    // layer lands in Phase 2 rather than in the web shell.
    const view = applyView(ranking, args.view);
    const items = view.rows;

    console.log(
      `baseline ${ranking.baseline.dps.toFixed(2)} ± ${ranking.baseline.stdev.toFixed(2)} (metaAdjusted=${ranking.baseline.metaAdjusted})`
    );
    console.log(hitCapBanner(ranking.caps.hit));
    for (const line of renderDisclosure({
      standing: ranking.assumptions.standing,
      substitutions: ranking.substitutions,
      expandStanding: args.assumptions,
    })) {
      console.log(line);
    }
    if (args.view.pinBis === true && !view.pinBisAvailable) {
      // Disabled, not silently inert (§4.1): ret's curated sets stop at P2.
      console.log(
        `note: --pin-bis has no curated BiS data at maxPhase=${args.maxPhase}; showing the unpinned order`
      );
    }

    const printRow = (item: (typeof items)[number], indent: string) => {
      const mark = item.belowCutoffInView ? "  (below cutoff)" : "";
      const tie = item.tieGroupId ? "  (tied)" : "";
      const rankLabel = item.rank == null ? "-" : String(item.rank);
      console.log(
        `${indent}#${rankLabel} ${item.name} (${item.slot}) Δ${item.deltaDps.toFixed(2)} (${item.deltaPct.toFixed(2)}%)${mark}${tie}`
      );
      if (item.hitDriven) {
        console.log(
          `${indent}    hit-driven: most of this gain is hit rating, and you are under the cap`
        );
      }
      if (item.setBonusNote) {
        console.log(`${indent}    set: ${item.setBonusNote}`);
      }
    };

    if (view.groups) {
      for (const group of view.groups) {
        console.log(`${group.key} (${group.rows.length})`);
        for (const item of group.rows) printRow(item, "  ");
      }
    } else {
      for (const item of items) printRow(item, "");
    }

    if (args.report !== undefined) {
      const reportPath =
        args.report === "" ? defaultReportPath(args) : args.report;
      const reportRanking = args.raid ? { ...ranking, items } : ranking;
      mkdirSync(dirname(reportPath), { recursive: true });
      const meta = {
        character: args.character,
        realm: args.realm,
        region: args.region,
        spec: input.spec,
        maxPhase: input.maxPhase,
        poolSize: pool.length,
        generatedAt: new Date().toISOString(),
        ...(args.raid !== undefined ? { raid: args.raid } : {}),
      };
      writeFileSync(reportPath, renderRankHtml(reportRanking, meta), "utf8");
      const jsonPath = reportPath.replace(/\.html$/i, ".json");
      writeFileSync(
        jsonPath,
        JSON.stringify({ meta, ranking: reportRanking }, null, 2),
        "utf8"
      );
      console.log(`report ${reportPath}`);
      console.log(`report-json ${jsonPath}`);
    }
  } catch (err) {
    if (err instanceof RankError) {
      console.error(`${err.kind}: ${err.message}`);
      return 1;
    }
    throw err;
  }
  return 0;
}

const code = await main();
process.exit(code);
