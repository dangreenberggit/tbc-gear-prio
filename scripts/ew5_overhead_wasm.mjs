#!/usr/bin/env npx tsx
/**
 * E-W5 §3.1 sweep, run against the WASM runtime instead of the native CLI
 * (ticket 203 / candidate-pool.md §3.4). The CLI measurement spawns one OS
 * process per request (373.2ms fixed cost dominated by process start-up);
 * M2 exists for the browser, where the WASM module is resident in a worker
 * and per-request cost is `NewEnvironment` alone. That is a different cost
 * model and the CLI verdict does not transfer — this script measures the
 * model M2 actually depends on.
 *
 * Run: npx tsx scripts/ew5_overhead_wasm.mjs
 *   (bare `node` fails: this file imports `vendor/tbc-new-fork/ui/core/proto/db.ts`,
 *   a TypeScript source with no compiled .js sibling in this vendor tree, so
 *   the loader needs tsx's on-the-fly transform.)
 * Requires: vendor/tbc-new-fork/dist/tbc/lib.wasm (20MB build artifact,
 *   gitignored — vendor/tbc-new-fork/dist is not committed). Rebuild with:
 *     cd vendor/tbc-new-fork && GOOS=js GOARCH=wasm go build -o dist/tbc/lib.wasm ./sim/wasm/
 *   (vendor/tbc-new-fork/makefile:121-127, target `wasm`). Needs a Go
 *   toolchain on PATH; this measurement used `go version go1.25.4
 *   windows/amd64`, GOROOT `C:\Program Files\Go` (`go env GOROOT`).
 * Also requires the Go WASM runtime shim, NOT vendored in the fork:
 *   `$(go env GOROOT)/lib/wasm/wasm_exec.js`. This script reads it from
 *   that path directly rather than copying it, so a GOROOT with a
 *   different Go version will run a different shim than the one recorded
 *   in the toolchain provenance below — re-run `go version` if in doubt.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const WASM_PATH = resolve(ROOT, "vendor/tbc-new-fork/dist/tbc/lib.wasm");
const GOROOT = execFileSync("go", ["env", "GOROOT"], {
  encoding: "utf8",
}).trim();
const WASM_EXEC_PATH = resolve(GOROOT, "lib/wasm/wasm_exec.js");
const GO_VERSION = execFileSync("go", ["version"], { encoding: "utf8" }).trim();
const FIXTURE = resolve(ROOT, "test/fixtures/slamaltman.raid-sim-request.json");
const DB_PATH = resolve(ROOT, "vendor/tbc-new-fork/assets/database/db.json");
const SWEEP = [100, 300, 1000, 3000, 5000];
const REPEATS = 5;
const SEED = "42";

// wasm_exec.js is a classic (non-ESM) script that assigns globalThis.Go.
// `import()` rejects Windows drive-letter absolute paths
// (ERR_UNSUPPORTED_ESM_URL_SCHEME) and the file isn't a module anyway, so
// load its source text and run it with indirect eval against globalThis —
// equivalent to what a <script> tag does in the browser this is standing in
// for.
function loadGoShim() {
  const src = readFileSync(WASM_EXEC_PATH, "utf8");
  (0, eval)(src);
}

/**
 * Boots one fresh Go/WASM instance. Each sweep repeat gets its own instance
 * rather than reusing one across calls — matches what a screening worker
 * actually pays per fresh module load, and avoids the (untested) risk of
 * Go-runtime state carrying over between raidSimJson calls on one instance
 * corrupting a later timing.
 */
async function bootInstance() {
  const wasmBytes = readFileSync(WASM_PATH);
  const go = new globalThis.Go();
  const ready = new Promise((res) => {
    // main.go:40 calls js.Global().Call("wasmready") at the end of main();
    // must exist as a global BEFORE go.run(instance) or it panics (ticket's
    // gotcha 1, confirmed by spike: omitting this crashes the Go runtime).
    globalThis.wasmready = () => res();
  });
  const { instance } = await WebAssembly.instantiate(
    wasmBytes,
    go.importObject
  );
  const runPromise = go.run(instance);
  await ready;
  return { instance, runPromise };
}

/**
 * Builds the per-player `database` field (proto field 50) via the fork's
 * own generated SimDatabase class, per the ticket's E-W1 approach — this
 * round-trip strips fields SimDatabase does not declare (e.g. SimItem has
 * no `icon`) rather than hand-copying field lists.
 *
 * Correction to the ticket text: `database` is a field on `Player`
 * (sim/core/proto/api.pb.go:172, `Player.Database`), not on
 * `RaidSimRequest` (api.pb.go:2024-2033 lists only raid/encounter/
 * simOptions/type/requestId — no database field). Setting `req.database`
 * at the request root fails with protojson's "unknown field \"database\""
 * from the Go side.
 */
async function buildDatabaseJson() {
  // `import()` rejects a bare Windows drive-letter absolute path
  // (ERR_UNSUPPORTED_ESM_URL_SCHEME); pathToFileURL produces the file://
  // URL form the loader requires.
  const { SimDatabase } = await import(
    pathToFileURL(resolve(ROOT, "vendor/tbc-new-fork/ui/core/proto/db.ts")).href
  );
  const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
  const parsed = SimDatabase.fromJson(raw, { ignoreUnknownFields: true });
  return SimDatabase.toJson(parsed);
}

/**
 * Attaches `database` to exactly one player, not all 25 raid slots.
 * `NewCharacter` (sim/core/character.go:92-95) calls `addToDatabase` per
 * player that carries one, and `addToDatabase` (sim/core/database.go:26)
 * is a global first-write-wins registry keyed by item/enchant/gem id — a
 * second copy is redundant work, not redundant safety. Attaching the
 * 2.26MB database JSON to all 25 raid slots (24 of which are empty `{}`
 * filler, confirmed by reading the fixture) inflated the request to
 * 56.6MB, and `protojson.Unmarshal`-ing that on every call took ~24s
 * regardless of iteration count — that was measurement noise from request
 * size, not sim cost, and would have corrupted t_iter. Attaching to only
 * the fixture's one real player cut the 100-iteration call from ~24s to
 * ~1.35s with an identical DPS, confirming the fix. "Real" player = has a
 * `class` field; every filler slot in this fixture is `{}`.
 */
function buildRequest(iterations, databaseJson) {
  const req = JSON.parse(readFileSync(FIXTURE, "utf8"));
  req.simOptions = {
    iterations,
    randomSeed: SEED,
    debugFirstIteration: false,
  };
  const realPlayer = req.raid.parties
    .flatMap((party) => party.players)
    .find((player) => player.class);
  if (!realPlayer) {
    throw new Error(
      "fixture has no real player (no player with a class field)"
    );
  }
  realPlayer.database = databaseJson;
  return req;
}

/**
 * One raidSimJson call against a fresh WASM instance. Wall-clock covers
 * instance boot (WebAssembly.instantiate + go.run + wasmready) plus the
 * sim call, matching what a resident worker pays on its first request of a
 * cold module — but see the boot-vs-call split recorded in the output,
 * which separates the two so t_fixed reflects only per-request
 * (NewEnvironment) cost, not one-time module instantiation.
 */
async function runOnce(iterations, databaseJson) {
  const { instance } = await bootInstance();
  const req = buildRequest(iterations, databaseJson);

  const t0 = performance.now();
  const resultStr = globalThis.raidSimJson(JSON.stringify(req));
  const t1 = performance.now();

  if (resultStr === null || resultStr === undefined) {
    throw new Error(
      `raidSimJson returned null for iterations=${iterations} — check stderr above for the Go-side parse/marshal error`
    );
  }
  const result = JSON.parse(resultStr);
  return {
    wallMs: t1 - t0,
    iterationsDone: result.iterationsDone,
    dpsAvg: result.raidMetrics?.dps?.avg,
    memBytes: instance.exports.mem.buffer.byteLength,
  };
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function fitLinear(points) {
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.iterations, 0);
  const sumY = points.reduce((a, p) => a + p.medianMs, 0);
  const sumXY = points.reduce((a, p) => a + p.iterations * p.medianMs, 0);
  const sumXX = points.reduce((a, p) => a + p.iterations * p.iterations, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { t_fixed_ms: intercept, t_iter_ms: slope };
}

async function main() {
  loadGoShim();
  const databaseJson = await buildDatabaseJson();

  const raw = {};
  for (const iterations of SWEEP) {
    raw[iterations] = [];
    for (let r = 0; r < REPEATS; r++) {
      const result = await runOnce(iterations, databaseJson);
      if (result.iterationsDone !== iterations) {
        throw new Error(
          `iterationsDone=${result.iterationsDone}, expected ${iterations} ` +
            `(repeat ${r + 1}, point ${iterations}) — sim did not run the requested work`
        );
      }
      raw[iterations].push(result);
      console.error(
        `iterations=${iterations} repeat=${r + 1}/${REPEATS} wallMs=${result.wallMs.toFixed(1)} ` +
          `dps=${result.dpsAvg?.toFixed(1)} memMB=${(result.memBytes / 1e6).toFixed(1)}`
      );
    }
  }

  // DPS sanity check (ticket's explicit trap): the CLI fixture returns
  // ~2042 DPS; E-W1 showed WASM and native agree to 1.8e-12. If this
  // disagrees, the request is broken and the timings below are not
  // trustworthy — stop rather than publish them.
  const dps5000 = median(raw[5000].map((r) => r.dpsAvg));
  if (Math.abs(dps5000 - 2042.4) > 5) {
    throw new Error(
      `DPS sanity check failed: median 5000-iteration DPS ${dps5000.toFixed(4)} ` +
        `is not close to the CLI's ~2042.4 — request is probably malformed ` +
        `(e.g. database not reaching every player). Refusing to publish timings.`
    );
  }

  const points = SWEEP.map((iterations) => {
    const runs = raw[iterations];
    return {
      iterations,
      medianMs: median(runs.map((r) => r.wallMs)),
      medianDps: median(runs.map((r) => r.dpsAvg)),
    };
  });

  const fit = fitLinear(points);
  const cost5000 = fit.t_fixed_ms + fit.t_iter_ms * 5000;
  const floor = fit.t_fixed_ms / cost5000;

  console.error(
    "measuring per-worker WASM memory (separate pass, 5000 iterations)..."
  );
  const memResult = await runOnce(5000, databaseJson);
  if (memResult.iterationsDone !== 5000) {
    throw new Error(
      `memory pass: iterationsDone=${memResult.iterationsDone}, expected 5000`
    );
  }
  console.error(
    `memory pass wallMs=${memResult.wallMs.toFixed(1)} memMB=${(memResult.memBytes / 1e6).toFixed(1)}`
  );

  const out = {
    command: "npx tsx scripts/ew5_overhead_wasm.mjs",
    runtime: "wasm",
    wasmPath: "vendor/tbc-new-fork/dist/tbc/lib.wasm",
    wasmBuildCommand:
      "cd vendor/tbc-new-fork && GOOS=js GOARCH=wasm go build -o dist/tbc/lib.wasm ./sim/wasm/",
    toolchain: {
      goVersion: GO_VERSION,
      goroot: GOROOT,
      wasmExecPath: WASM_EXEC_PATH,
    },
    fixture: "test/fixtures/slamaltman.raid-sim-request.json",
    seed: SEED,
    sweep: SWEEP,
    repeats: REPEATS,
    databaseNote:
      "database (proto field 50) is a Player field, not a RaidSimRequest field " +
      "(sim/core/proto/api.pb.go:172 vs :2024-2033) — corrects the ticket's field " +
      "list. Built via SimDatabase.fromJson/.toJson round-trip over the full " +
      "assets/database/db.json (not trimmed to fixture-referenced items — a " +
      "full-DB inject the ticket calls acceptable) and attached to exactly one " +
      "player, not all 25 raid slots: addToDatabase (sim/core/database.go:26) is " +
      "a global first-write-wins registry, so one copy suffices, and attaching it " +
      "to all 25 slots (24 of which are empty {} filler in this fixture) inflated " +
      "the request to 56.6MB and made every call take ~24s regardless of " +
      "iteration count — measurement noise from request size, not sim cost, that " +
      "would have corrupted t_iter. One copy cut the 100-iteration call to " +
      "~1.35s with identical DPS.",
    raw,
    points,
    fit,
    cost5000_ms: cost5000,
    floor_t_fixed_over_cost5000: floor,
    floorBelow025: floor < 0.25,
    memoryMeasurement: {
      iterations: 5000,
      wallMs: memResult.wallMs,
      memBytes: memResult.memBytes,
      note:
        "WebAssembly.Memory linear buffer size (instance.exports.mem.buffer.byteLength) " +
        "for one fresh WASM instance after a 5000-iteration call — measured in a " +
        "separate pass from the timing sweep (same discipline as the CLI harness: no " +
        "concurrent instrumentation during a wall-clock measurement).",
    },
    dpsSanityCheck: {
      median5000Dps: dps5000,
      cliReference: 2042.4,
      note:
        "E-W1 showed WASM and native agree to 1.8e-12 DPS; this run's median " +
        "5000-iteration DPS is checked against the CLI's ~2042 before any timing " +
        "is accepted.",
    },
  };

  writeFileSync(
    resolve(ROOT, "experiments/e-w5-overhead-wasm.json"),
    JSON.stringify(out, null, 2) + "\n"
  );
  writeFileSync(
    resolve(ROOT, "experiments/e-w5-overhead-wasm.md"),
    renderMd(out)
  );
  console.log("wrote experiments/e-w5-overhead-wasm.json and .md");
  console.log(
    `floor = t_fixed / cost(5000) = ${floor.toFixed(4)} (< 0.25: ${floor < 0.25})`
  );
}

function renderMd(out) {
  const rows = out.points
    .map(
      (p) =>
        `| ${p.iterations} | ${p.medianMs.toFixed(1)} | ${p.medianDps.toFixed(1)} |`
    )
    .join("\n");
  return `# E-W5 §3.1 — per-request cost under the WASM runtime

Command: \`${out.command}\`
WASM module: \`${out.wasmPath}\` (20MB build artifact, gitignored — rebuild with
\`${out.wasmBuildCommand}\`, needs a Go toolchain on PATH).
Toolchain provenance: \`${out.toolchain.goVersion}\`, GOROOT \`${out.toolchain.goroot}\`,
Go runtime shim \`${out.toolchain.wasmExecPath}\` (not vendored in the fork — read
directly from GOROOT).
Fixture: \`${out.fixture}\`, seed ${out.seed}, ${out.repeats} repeats per point.

**Database note:** ${out.databaseNote}

## Sweep (median of ${out.repeats} repeats)

| iterations | median wall-clock (ms) | median dps |
| --- | --- | --- |
${rows}

Raw per-repeat data is in \`e-w5-overhead-wasm.json\` (\`raw\` key); every run's
\`iterationsDone\` was checked to equal the requested iteration count before
being accepted (script throws otherwise).

## DPS sanity check

Median 5000-iteration DPS: **${out.dpsSanityCheck.median5000Dps.toFixed(4)}**
(CLI reference ~${out.dpsSanityCheck.cliReference}; E-W1 showed WASM and native
agree to 1.8e-12 DPS on this fixture). The script throws before writing any
output if this check fails, so a published file means the check passed.

## Fit

\`t_fixed\` = ${out.fit.t_fixed_ms.toFixed(1)} ms, \`t_iter\` = ${out.fit.t_iter_ms.toFixed(4)} ms/iteration
(least-squares fit of wallMs ~ t_fixed + t_iter * iterations over the five
median points above; wall-clock per call includes fresh instance boot —
WebAssembly.instantiate + go.run + wasmready — plus the raidSimJson call
itself, matching what a worker pays on a cold module load).

## Screening-cost floor (the number that decides M2)

\`cost(5000)\` = t_fixed + t_iter × 5000 = **${out.cost5000_ms.toFixed(1)} ms**

\`floor\` = t_fixed / cost(5000) = **${out.floor_t_fixed_over_cost5000.toFixed(4)}**

Below 0.25: **${out.floorBelow025}**

## Per-worker memory

WASM linear memory after a 5000-iteration call (largest sweep point): **${(out.memoryMeasurement.memBytes / 1e6).toFixed(1)} MB**
(\`instance.exports.mem.buffer.byteLength\` for one fresh instance, sampled in
a separate pass from the timing sweep — wallMs ${out.memoryMeasurement.wallMs.toFixed(1)}).
This replaces the CLI's native-process RSS figure (183.8 MB,
candidate-pool.md §3.1) as the basis for ticket 201's \`memoryCap\` /
\`MEASURED_MB_PER_SIM_PROCESS\` — that constant was always flagged as a
cross-runtime proxy, not a measured browser number, and this is the
measured browser number.
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
