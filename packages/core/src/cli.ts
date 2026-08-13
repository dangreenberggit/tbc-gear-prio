/**
 * `pnpm rank` — thin CLI over rankUpgrades (PLAN.md §5.1).
 * I/O lives here; the core module stays pure.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { platform } from "node:os";
import { cutoffForSpec } from "./cutoff.js";
import {
  fightProvenanceLines,
  hitCapBanner,
  renderDisclosure,
  setPotentialDisclosureLine,
} from "./disclosure.js";
import {
  slamaltmanOfflineRecordings,
  SLAMALTMAN_REF,
  type SlamaltmanRawFixture,
} from "./fixtures/slamaltman-offline.js";
import {
  reportEventsOfflineRecordings,
  type ReportEventsRawFixture,
} from "./fixtures/report-events-offline.js";
import {
  feralOfflineRecordings,
  NEXESS_REF,
  SHREDZEPELIN_REF,
  type FeralRawFixture,
} from "./fixtures/feral-offline.js";
import { renderRankHtml } from "./rank-report.js";
import {
  formatSetBonusLine,
  formatSetPotentialLine,
} from "./rank-report-rules.js";
import { RankError, rankUpgrades, type RankInput } from "./rank.js";
import {
  bossesInPool,
  poolFromUniverse,
  validateViewFilter,
  viewFilterValue,
  zonesInPool,
  type PoolEntry,
  type UniverseEntry,
} from "./pool.js";
import { applyView, type ViewOptions } from "./view.js";
import { CliSimRunner } from "./seams/cli-sim-runner.js";
import { RecordedGearSource } from "./seams/gear-source.js";
import type { RaidSimRequest, SimRunner } from "./seams/sim-runner.js";
import { MemoryStore } from "./seams/store.js";
import type { CharacterRef, ContentPhase, Region, SpecId } from "./types.js";

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
    "usage: pnpm rank --region US --realm <realm> --character <name> [--offline] [--spec ret|feral] [--max-phase N] [--raid <zone>] [--boss <name>] [--group-by rank|slot|raid] [--pin-bis] [--hide-owned] [--show-below-cutoff] [--with-set-potential] [--report-events] [--assumptions] [--report [<path.html>]]"
  );
  process.exit(2);
  throw new Error("unreachable");
}

function parseArgs(argv: string[]): {
  region: Region;
  realm: string;
  character: string;
  offline: boolean;
  spec: SpecId;
  maxPhase: ContentPhase;
  assumptions: boolean;
  showBelowCutoff: boolean;
  reportEvents: boolean;
  raid?: string;
  report?: string;
  view: ViewOptions;
} {
  const out: {
    region?: Region;
    realm?: string;
    character?: string;
    offline: boolean;
    spec: SpecId;
    maxPhase: ContentPhase;
    assumptions: boolean;
    showBelowCutoff: boolean;
    reportEvents: boolean;
    raid?: string;
    report?: string;
    view: ViewOptions;
  } = {
    offline: false,
    spec: "ret",
    assumptions: false,
    showBelowCutoff: false,
    reportEvents: false,
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
    if (arg === "--show-below-cutoff") {
      out.showBelowCutoff = true;
      continue;
    }
    if (arg === "--with-set-potential") {
      out.view.withSetPotential = true;
      continue;
    }
    if (arg === "--report-events") {
      out.reportEvents = true;
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
    if (arg === "--spec" && next) {
      if (next !== "ret" && next !== "feral") {
        console.error(`unknown spec: ${next} (known: ret, feral)`);
        process.exit(2);
      }
      out.spec = next;
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
    spec: out.spec,
    maxPhase: out.maxPhase,
    assumptions: out.assumptions,
    showBelowCutoff: out.showBelowCutoff,
    reportEvents: out.reportEvents,
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

function loadUniversePool(maxPhase: ContentPhase, spec: SpecId): PoolEntry[] {
  const rel = `data/universes/${spec}-p${maxPhase}.json`;
  const path = join(root, rel);
  if (!existsSync(path)) {
    console.error(`missing universe file ${rel}`);
    console.error(
      `generate: python scripts/assemble_universe.py --max-phase ${maxPhase} --spec ${spec}`
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
    spec: args.spec,
    maxPhase: args.maxPhase,
  };

  // Feral's EP preset is named p1 because upstream ships no p2 one for it;
  // data/presets/feral/p1.ep-weights.json records why.
  const skeleton = loadJson<RaidSimRequest>(
    `data/presets/${args.spec}/p2.raid-sim-skeleton.json`
  );
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    args.spec === "feral"
      ? "data/presets/feral/p1.ep-weights.json"
      : "data/presets/ret/p2.ep-weights.json"
  ).weights;
  const pool = loadUniversePool(args.maxPhase, args.spec);

  const raidFilter = viewFilterValue(args.raid);

  const raidCheck = validateViewFilter(args.raid, zonesInPool(pool));
  if (!raidCheck.ok) {
    console.error(`unknown raid zone: ${args.raid}`);
    console.error("known zones:");
    for (const zone of raidCheck.known) {
      console.error(`  ${zone}`);
    }
    return 2;
  }

  // Without this a misspelled boss filters every row out and the run exits 0
  // having printed a baseline, a hit banner and nothing else — indistinguishable
  // from "this boss drops no upgrades for you" (carry-forward 75). Scoped to
  // `--raid` when given so the suggestion list is the bosses of the raid the
  // player named, not all of them.
  const bossCheck = validateViewFilter(
    args.view.boss,
    bossesInPool(pool, raidFilter)
  );
  if (!bossCheck.ok) {
    const scope = raidFilter ? ` in ${raidFilter}` : "";
    console.error(`unknown boss: ${args.view.boss}`);
    console.error(`known bosses${scope}:`);
    for (const boss of bossCheck.known) {
      console.error(`  ${boss}`);
    }
    return 2;
  }

  const isSlamaltman =
    args.spec === "ret" &&
    args.region === SLAMALTMAN_REF.region &&
    args.realm.toLowerCase() === SLAMALTMAN_REF.realm &&
    args.character.toLowerCase() === SLAMALTMAN_REF.name;

  // Two recordings of the same character, differing in the route that reached
  // his gear. Slamaltman has ten SSC kills and zero encounterRankings, so the
  // fallback capture is a real resolve rather than a simulated one — see
  // docs/verification-log.md, 2026-08-05.
  // Feral captures, keyed by character. Each is one kill from one raid night;
  // `confidence` is measured from form uptime by feralOfflineRecordings rather
  // than assumed, because cat and bear are the same talents.
  const FERAL_FIXTURES: ReadonlyArray<readonly [CharacterRef, string]> = [
    // Void Reaver, not the Morogrim kill: on Morogrim he was backup tank and
    // wore tank gear in cat form, so form uptime read 99.1% cat while nine of
    // seventeen slots were a tanking set (ticket 06). Void Reaver is 98.8% cat
    // with 100% Blessing of Salvation — same form, never on a tank assignment.
    [SHREDZEPELIN_REF, "test/fixtures/shredzepelin-cat.raw.json"],
    [NEXESS_REF, "test/fixtures/nexess.raw.json"],
  ];
  const feralMatch =
    args.spec === "feral"
      ? FERAL_FIXTURES.find(
          ([ref]) =>
            args.region === ref.region &&
            args.realm.toLowerCase() === ref.realm &&
            args.character.toLowerCase() === ref.name
        )
      : undefined;

  const gearData = isSlamaltman
    ? args.reportEvents
      ? reportEventsOfflineRecordings(
          loadJson<ReportEventsRawFixture>(
            "test/fixtures/slamaltman-report-events.raw.json"
          )
        )
      : slamaltmanOfflineRecordings(
          loadJson<SlamaltmanRawFixture>("test/fixtures/slamaltman.raw.json")
        )
    : feralMatch
      ? feralOfflineRecordings(
          loadJson<FeralRawFixture>(feralMatch[1]),
          feralMatch[0]
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
    `rank ${args.character}@${args.realm}-${args.region} (offline) maxPhase=${args.maxPhase} universe=${pool.length}${raidNote} cutoff=${cutoffForSpec(args.spec).absDps} DPS / ${cutoffForSpec(args.spec).pct}%`
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
    // layer lands in Stage 2 rather than in the web shell.
    // Every run names its source fight (ticket 06) — the route note below is
    // the older, narrower case of the same idea.
    for (const line of fightProvenanceLines(ranking.fight)) {
      console.log(line);
    }
    if (ranking.fight.route === "report-events") {
      // §5.2: the fallback walks a report's fights rather than a ranked parse,
      // so it can land on a fight the character performed unusually in. Said
      // out loud rather than left to look identical to a ranked resolve.
      console.log(
        `note: no ranked kill for this character; gear read through the report-events route (${ranking.fight.reportCode} fight ${ranking.fight.fightId})`
      );
    }
    const view = applyView(ranking, args.view);
    // The default run is the shortlist (§10, ticket 04). `view.rows` still
    // holds every row and the report below still writes them, so this hides
    // rather than deletes — `--show-below-cutoff` is the expand.
    const items = args.showBelowCutoff ? view.rows : view.shortlist;

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
    // Unconditional, unlike the set-potential block below: a warning qualifies
    // figures the reader sees whether or not they asked for the set lens.
    if (ranking.plausibilityWarnings?.length) {
      console.log(
        `plausibility warnings (${ranking.plausibilityWarnings.length}):`
      );
      for (const w of ranking.plausibilityWarnings) {
        console.log(`  ${w.message}`);
      }
    }
    if (args.view.withSetPotential === true && ranking.setBonuses) {
      console.log(`assumption: ${setPotentialDisclosureLine()}`);
      console.log(`set potential (${ranking.setBonuses.length}):`);
      for (const b of ranking.setBonuses) {
        console.log(`  ${formatSetBonusLine(b)}`);
      }
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
      if (item.hitRegression) {
        console.log(
          `${indent}    costs hit: -${item.hitRegression.lost} hit rating, ` +
            `widening the gap above to ${item.hitRegression.gapAfter}`
        );
      }
      if (item.setBonusNote) {
        console.log(`${indent}    set: ${item.setBonusNote}`);
      }
      if (item.emptyMetaSocket) {
        console.log(
          `${indent}    meta: priced with an empty meta socket (no meta gem preference recorded for this spec)`
        );
      }
      if (args.view.withSetPotential === true) {
        const potential = formatSetPotentialLine(item);
        if (potential) console.log(`${indent}    ${potential}`);
      }
    };

    if (view.groups) {
      // Grouped output takes the same shortlist default as the flat listing,
      // read off each row's own `belowCutoffInView` — `applyView` owns that
      // answer, and reconstructing it here from an id set would be a second
      // implementation of the cutoff to keep in step.
      for (const group of view.groups) {
        const rows = args.showBelowCutoff
          ? group.rows
          : group.rows.filter((r) => !r.belowCutoffInView);
        if (rows.length === 0) continue;
        console.log(`${group.key} (${rows.length})`);
        for (const item of rows) printRow(item, "  ");
      }
    } else {
      for (const item of items) printRow(item, "");
    }

    if (!args.showBelowCutoff && view.belowCutoffCount > 0) {
      // Hidden, never deleted (§10) — and the user is told where they went,
      // rather than being left to wonder why the list is short.
      console.log(
        `${view.belowCutoffCount} row(s) below cutoff hidden; --show-below-cutoff to list them`
      );
    }

    if (args.report !== undefined) {
      const reportPath =
        args.report === "" ? defaultReportPath(args) : args.report;
      // The report carries every row the *filters* left, so `meta` has to name
      // every filter that shaped them — reporting only `raid` while `--boss`
      // or `--hide-owned` had also cut rows is a quietly wrong artifact, and
      // these files get read long after the command is forgotten.
      //
      // `view.rows` rather than the terminal's `items`: `--show-below-cutoff`
      // is a terminal display choice, and the report already partitions
      // below-cutoff itself (`partitionShortlist`, the noise note). Handing it
      // the shortlist would delete from the artifact rows the renderer expects
      // to hold — the opposite of §10's "hidden, never deleted".
      const viewed = Object.keys(args.view).length > 0;
      const reportRanking = viewed ? { ...ranking, items: view.rows } : ranking;
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
        ...(viewed ? { view: args.view } : {}),
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

// Only when run as the program. Without this the module cannot be imported —
// importing it would run a full ranking and then exit the process — which is
// why the CLI's own output rules had no test.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const code = await main();
  process.exit(code);
}
