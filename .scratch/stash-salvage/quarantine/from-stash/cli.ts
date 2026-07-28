/**
 * `pnpm rank` — thin CLI over rankUpgrades (PLAN.md §5.1).
 * I/O lives here; the core module stays pure.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { CUTOFF } from "./cutoff.js";
import {
  slamaltmanOfflineRecordings,
  SLAMALTMAN_REF,
  type SlamaltmanRawFixture,
} from "./fixtures/slamaltman-offline.js";
import { RankError, rankUpgrades, type RankInput } from "./rank.js";
import { renderRankHtml } from "./rank-report.js";
import type { PoolEntry } from "./pool.js";
import { CliSimRunner } from "./seams/cli-sim-runner.js";
import { RecordedGearSource } from "./seams/gear-source.js";
import type { RaidSimRequest, SimRunner } from "./seams/sim-runner.js";
import { MemoryStore } from "./seams/store.js";
import type { ContentPhase, Region } from "./types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function usage(): never {
  console.error(
    "usage: pnpm rank --region US --realm <realm> --character <name> [--offline] [--full-pool] [--max-phase 1-5] [--report <path>]"
  );
  process.exit(2);
  throw new Error("unreachable");
}

function parseArgs(argv: string[]): {
  region: Region;
  realm: string;
  character: string;
  offline: boolean;
  fullPool: boolean;
  maxPhase?: ContentPhase;
  report?: string;
} {
  const out: {
    region?: Region;
    realm?: string;
    character?: string;
    offline: boolean;
    fullPool: boolean;
    maxPhase?: ContentPhase;
    report?: string;
  } = { offline: false, fullPool: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--offline") {
      out.offline = true;
      continue;
    }
    if (arg === "--full-pool") {
      out.fullPool = true;
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
      const n = Number(next);
      if (![1, 2, 3, 4, 5].includes(n)) usage();
      out.maxPhase = n as ContentPhase;
      i++;
      continue;
    }
    if (arg === "--report" && next) {
      out.report = next;
      i++;
      continue;
    }
    usage();
  }

  if (!out.region || !out.realm || !out.character) usage();
  const parsed: {
    region: Region;
    realm: string;
    character: string;
    offline: boolean;
    fullPool: boolean;
    maxPhase?: ContentPhase;
    report?: string;
  } = {
    region: out.region,
    realm: out.realm,
    character: out.character,
    offline: out.offline,
    fullPool: out.fullPool,
  };
  if (out.maxPhase !== undefined) parsed.maxPhase = out.maxPhase;
  if (out.report !== undefined) parsed.report = out.report;
  return parsed;
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

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
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

  const lock = loadJson<{ defaultMaxPhase: ContentPhase }>(
    "data/wowsims.lock.json"
  );
  const maxPhase = args.maxPhase ?? lock.defaultMaxPhase;

  const input: RankInput = {
    character: {
      region: args.region,
      realm: args.realm,
      name: args.character,
    },
    spec: "ret",
    maxPhase,
  };
  if (args.fullPool) input.fullPool = true;

  const skeleton = loadJson<RaidSimRequest>(
    "data/presets/ret/p2.raid-sim-skeleton.json"
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/ret/p2.ep-weights.json"
  ).weights;
  const poolFile = loadJson<{ entries: PoolEntry[] }>("data/pools/ret.json");
  const pool = poolFile.entries;

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

  console.log(
    `rank ${args.character}@${args.realm}-${args.region} (offline) maxPhase=${maxPhase} cutoff=${CUTOFF.absDps} DPS / ${CUTOFF.pct}% pool=${pool.length}${args.fullPool ? " fullPool" : ""}`
  );

  try {
    const ranking = await rankUpgrades(
      input,
      {
        gear: new RecordedGearSource(gearData),
        sim,
        store: new MemoryStore(),
        clock: () => new Date(),
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
    console.log(
      `baseline ${ranking.baseline.dps.toFixed(2)} ± ${ranking.baseline.stdev.toFixed(2)} (metaAdjusted=${ranking.baseline.metaAdjusted})`
    );
    console.log("assumptions:");
    for (const a of ranking.assumptions.standing) {
      console.log(`  - [${a.id}] ${a.detail}`);
    }
    if (ranking.substitutions.length > 0) {
      console.log("substitutions:");
      for (const s of ranking.substitutions) {
        console.log(`  - ${s.field}: ${s.detail}`);
      }
    }
    for (const item of ranking.items) {
      const mark = item.belowCutoff ? "  (below cutoff)" : "";
      const rankLabel = item.rank == null ? "-" : String(item.rank);
      console.log(
        `#${rankLabel} ${item.name} (${item.slot}) Δ${item.deltaDps.toFixed(2)} (${item.deltaPct.toFixed(2)}%)${mark}`
      );
      if (item.setBonusNote) {
        console.log(`    set: ${item.setBonusNote}`);
      }
    }

    const reportPath = args.report ?? defaultReportPath(args);
    mkdirSync(dirname(reportPath), { recursive: true });
    const meta = {
      character: args.character,
      realm: args.realm,
      region: args.region,
      spec: input.spec,
      maxPhase: input.maxPhase,
      fullPool: !!args.fullPool,
      poolSize: pool.length,
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(reportPath, renderRankHtml(ranking, meta), "utf8");
    const jsonPath = reportPath.replace(/\.html$/i, ".json");
    writeFileSync(jsonPath, JSON.stringify({ meta, ranking }, null, 2), "utf8");
    console.log(`report ${reportPath}`);
    console.log(`report-json ${jsonPath}`);
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
