// Adapted from scripts/ew5_overhead_wasm.mjs. Same boot sequence, same
// per-player SimDatabase injection; the request is the P3 ret one.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const ROOT = "C:/Users/dgree/Code/lulz/tbc-gear-prio";
const SCRATCH = process.argv[2];
const GOROOT = execFileSync("go", ["env", "GOROOT"], { encoding: "utf8" }).trim();
const WASM_EXEC_PATH = resolve(GOROOT, "lib/wasm/wasm_exec.js");
const WASM_PATH = resolve(ROOT, "vendor/tbc-new-fork/dist/tbc/lib.wasm");
const DB_PATH = resolve(ROOT, "vendor/tbc-new-fork/assets/database/db.json");
const REQ_PATH = resolve(SCRATCH, "req_p3.json");

function loadGoShim() {
  (0, eval)(readFileSync(WASM_EXEC_PATH, "utf8"));
}

async function bootInstance() {
  const go = new globalThis.Go();
  const ready = new Promise((res) => { globalThis.wasmready = () => res(); });
  const { instance } = await WebAssembly.instantiate(readFileSync(WASM_PATH), go.importObject);
  go.run(instance);
  await ready;
}

async function buildDatabaseJson() {
  const { SimDatabase } = await import(
    pathToFileURL(resolve(ROOT, "vendor/tbc-new-fork/ui/core/proto/db.ts")).href
  );
  const raw = JSON.parse(readFileSync(DB_PATH, "utf8"));
  return SimDatabase.toJson(SimDatabase.fromJson(raw, { ignoreUnknownFields: true }));
}

function buildRequest(iterations, databaseJson) {
  const req = JSON.parse(readFileSync(REQ_PATH, "utf8"));
  // Preserve the committed seed; vary only iterations for the smoke run.
  req.simOptions = { ...req.simOptions, iterations };
  const real = req.raid.parties.flatMap((p) => p.players).find((p) => p && p.class);
  if (!real) throw new Error("no real player in request");
  real.database = databaseJson;
  return req;
}

async function runOnce(iterations, db) {
  const t0 = Date.now();
  const raw = globalThis.raidSimJson(JSON.stringify(buildRequest(iterations, db)));
  const res = JSON.parse(raw);
  if (res.error) throw new Error("sim error: " + JSON.stringify(res.error));
  return {
    iterationsDone: res.iterationsDone,
    avg: res.raidMetrics?.dps?.avg,
    stdev: res.raidMetrics?.dps?.stdev,
    wallS: (Date.now() - t0) / 1000,
  };
}

loadGoShim();
await bootInstance();
const db = await buildDatabaseJson();

// Smoke first (pre-registered outcome D): a missing/garbled database yields a
// plausible-looking wrong number rather than an error, so check magnitude
// against the native value before paying for 25000 iterations.
const smoke = await runOnce(1000, db);
console.log("SMOKE " + JSON.stringify(smoke));
if (smoke.iterationsDone !== 1000) throw new Error("smoke iterationsDone=" + smoke.iterationsDone);
if (!(Math.abs(smoke.avg - 2224.62) < 150)) {
  throw new Error("smoke DPS " + smoke.avg + " implausible vs native 2224.62 — check database injection");
}

const full = await runOnce(25000, db);
console.log("FULL " + JSON.stringify(full));
if (full.iterationsDone !== 25000) throw new Error("full iterationsDone=" + full.iterationsDone);
writeFileSync(resolve(SCRATCH, "out_wasm_p3.json"), JSON.stringify(full, null, 2));
