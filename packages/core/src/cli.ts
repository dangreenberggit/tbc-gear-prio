/**
 * `pnpm rank` — thin CLI over rankUpgrades (PLAN.md §5.1).
 * I/O lives here; the core module stays pure.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CUTOFF } from "./cutoff.js";
import { RankError, rankUpgrades, type RankInput } from "./rank.js";
import { RecordedGearSource } from "./seams/gear-source.js";
import { RecordedSimRunner, type RaidSimRequest } from "./seams/sim-runner.js";
import { MemoryStore } from "./seams/store.js";
import type { Region } from "./types.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function usage(): never {
  console.error(
    "usage: pnpm rank --region US --realm <realm> --character <name> [--offline]"
  );
  process.exit(2);
  throw new Error("unreachable");
}

function parseArgs(argv: string[]): {
  region: Region;
  realm: string;
  character: string;
  offline: boolean;
} {
  const out: {
    region?: Region;
    realm?: string;
    character?: string;
    offline: boolean;
  } = { offline: false };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--offline") {
      out.offline = true;
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
    usage();
  }

  if (!out.region || !out.realm || !out.character) usage();
  return {
    region: out.region,
    realm: out.realm,
    character: out.character,
    offline: out.offline,
  };
}

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
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
    maxPhase: 2,
  };

  const skeleton = loadJson<RaidSimRequest>(
    "data/presets/ret/p2.raid-sim-skeleton.json"
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/ret/p2.ep-weights.json"
  ).weights;

  console.log(
    `rank ${args.character}@${args.realm}-${args.region} (offline) cutoff=${CUTOFF.absDps} DPS / ${CUTOFF.pct}%`
  );

  try {
    const ranking = await rankUpgrades(input, {
      // Empty recordings until Phase 1 wires fixture packs into the CLI.
      gear: new RecordedGearSource({ fights: new Map(), gear: new Map() }),
      sim: new RecordedSimRunner("v0.0.101", new Map()),
      store: new MemoryStore(),
      clock: () => new Date(),
      raidSimSkeleton: skeleton,
      epWeights,
    });
    console.log(
      `baseline ${ranking.baseline.dps.toFixed(2)} ± ${ranking.baseline.stdev.toFixed(2)} (metaAdjusted=${ranking.baseline.metaAdjusted})`
    );
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
