#!/usr/bin/env node
/**
 * E-W5 §3.1 — per-request cost under Node.
 *
 * Sweeps iterations {100,300,1000,3000,5000} against the pinned CLI binary,
 * same fixture gear and seed 42, five repeats each, and reports the median
 * wall-clock per point. Also samples RSS of one sim process mid-run and
 * confirms whether the ret fixture triggers the Go-side presim loop (F8) by
 * reading `sim/core/presim.go`'s branch conditions rather than guessing from
 * timing alone (timing alone cannot distinguish "no presim" from "a fast,
 * cheap presim round").
 *
 * Run: node scripts/ew5_overhead.mjs
 * Requires: vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe
 *   (fetch with: python scripts/fetch_wowsimcli.py --platform win32-x64)
 *
 * Windows-native `node` cannot read a Git Bash mktemp path — this script
 * always uses `os.tmpdir()`, which resolves to a real Windows path when run
 * under Windows-native node (verified: `node -e "console.log(os.tmpdir())"`
 * printed `C:\Users\dgree\AppData\Local\Temp` on this machine).
 */

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const BIN = join(
  ROOT,
  "vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe"
);
const FIXTURE = join(ROOT, "test/fixtures/slamaltman.raid-sim-request.json");
const SWEEP = [100, 300, 1000, 3000, 5000];
const REPEATS = 5;
const SEED = "42";

/**
 * Timing runs with no concurrent polling — a first attempt that spawned a
 * PowerShell Get-Process poll every 50ms alongside the sim inflated 100-
 * iteration wall-clock from a ~450ms baseline (matches the reference table)
 * up to 1.5s and 300-iteration up to 19s, pure measurement noise from CPU/IO
 * contention with the poller. RSS is measured in a separate pass
 * (measureRss) with no timing claims attached to it.
 */
function runOnce(iterations, { measureRss = false } = {}) {
  const req = JSON.parse(readFileSync(FIXTURE, "utf8"));
  req.simOptions = {
    iterations,
    randomSeed: SEED,
    debugFirstIteration: false,
  };
  const dir = mkdtempSync(join(tmpdir(), "ew5-overhead-"));
  const infile = join(dir, "req.json");
  const outfile = join(dir, "res.json");
  writeFileSync(infile, JSON.stringify(req));

  return new Promise((resolvePromise, reject) => {
    const start = process.hrtime.bigint();
    let peakRssBytes = 0;
    let rssTimer;
    const child = spawn(
      BIN,
      ["sim", "--infile", infile, "--outfile", outfile],
      {
        windowsHide: true,
      }
    );
    if (measureRss) {
      // Sampling has a real timing cost (see comment above) — only enabled
      // for the dedicated RSS pass, never during the median-timing sweep.
      rssTimer = setInterval(() => {
        const ps = spawn("powershell.exe", [
          "-NoProfile",
          "-NonInteractive",
          "-Command",
          `(Get-Process -Id ${child.pid} -ErrorAction SilentlyContinue).WorkingSet64`,
        ]);
        let out = "";
        ps.stdout.on("data", (c) => (out += c.toString()));
        ps.on("close", () => {
          const v = parseInt(out.trim(), 10);
          if (Number.isFinite(v) && v > peakRssBytes) peakRssBytes = v;
        });
      }, 100);
    }

    let stderr = "";
    child.stderr.on("data", (c) => (stderr += c.toString()));
    child.on("error", (err) => {
      if (rssTimer) clearInterval(rssTimer);
      reject(err);
    });
    child.on("close", (code) => {
      if (rssTimer) clearInterval(rssTimer);
      const end = process.hrtime.bigint();
      const wallMs = Number(end - start) / 1e6;
      if (code !== 0) {
        rmSync(dir, { recursive: true, force: true });
        reject(new Error(`wowsimcli exited ${code}\n${stderr}`));
        return;
      }
      let raw;
      try {
        raw = JSON.parse(readFileSync(outfile, "utf8"));
      } catch (e) {
        rmSync(dir, { recursive: true, force: true });
        reject(e);
        return;
      }
      rmSync(dir, { recursive: true, force: true });
      resolvePromise({
        wallMs,
        iterationsDone: raw.iterationsDone,
        dpsAvg: raw.raidMetrics?.dps?.avg,
        peakRssBytes,
      });
    });
  });
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// Least-squares fit of wallMs ~ t_fixed + t_iter * iterations over the
// per-point medians (F8/§3.1: fit from medians, not raw repeats).
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
  const raw = {}; // iterations -> [ {wallMs, iterationsDone, dpsAvg} ]
  for (const iterations of SWEEP) {
    raw[iterations] = [];
    for (let r = 0; r < REPEATS; r++) {
      const result = await runOnce(iterations);
      if (result.iterationsDone !== iterations) {
        throw new Error(
          `iterationsDone=${result.iterationsDone}, expected ${iterations} ` +
            `(repeat ${r + 1}, point ${iterations}) — sim did not run the requested work`
        );
      }
      raw[iterations].push(result);
      console.error(
        `iterations=${iterations} repeat=${r + 1}/${REPEATS} wallMs=${result.wallMs.toFixed(1)} ` +
          `dps=${result.dpsAvg?.toFixed(1)}`
      );
    }
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

  // Separate RSS pass: one in-flight run at the largest sweep point (5000
  // iterations — longest-lived process, most representative of a worker's
  // peak footprint), polled without a concurrent timing claim so the poll's
  // own overhead cannot corrupt a wall-clock number (see runOnce comment).
  console.error("measuring RSS at 5000 iterations (separate pass)...");
  const rssResult = await runOnce(5000, { measureRss: true });
  if (rssResult.iterationsDone !== 5000) {
    throw new Error(
      `RSS pass: iterationsDone=${rssResult.iterationsDone}, expected 5000`
    );
  }
  const peakRssBytesAnyRun = rssResult.peakRssBytes;
  console.error(
    `RSS pass wallMs=${rssResult.wallMs.toFixed(1)} peakRssMB=${(peakRssBytesAnyRun / 1e6).toFixed(1)}`
  );

  const out = {
    command:
      "node scripts/ew5_overhead.mjs (spawns vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe sim --infile ... --outfile ... against test/fixtures/slamaltman.raid-sim-request.json, seed 42, 5 repeats per sweep point; RSS measured in a separate single run at 5000 iterations to avoid polling overhead corrupting the timing sweep)",
    binary: "vendor/wowsimcli-v0.0.101-win32-x64/wowsimcli-windows.exe",
    fixture: "test/fixtures/slamaltman.raid-sim-request.json",
    seed: SEED,
    sweep: SWEEP,
    repeats: REPEATS,
    raw,
    points,
    fit,
    rssMeasurement: {
      iterations: 5000,
      wallMs: rssResult.wallMs,
      peakRssBytes: peakRssBytesAnyRun,
      pollIntervalMs: 100,
      note:
        "measured in isolation, not concurrently with the timing sweep above — " +
        "the 50ms-interval poll used in a first attempt of this script inflated " +
        "wall-clock times by 2-40x (100 iters went from ~450ms to up to 1.5s; " +
        "300 iters up to 19s) from CPU/IO contention between the poller and the " +
        "sim process, so timing and RSS are never sampled in the same run here",
    },
    presim: {
      claim:
        "no presim round executes for this fixture: runPresims (sim/core/presim.go:34) " +
        "only loops when remainingAgents>0 or EndFightAtHealth>0; remainingAgents comes " +
        "from Presimmer.GetPresimOptions, implemented only by Character (health.go:272), " +
        "which returns nil unless HealingModel.Hps==0 && HealingModel.CadenceSeconds!=0. " +
        "The fixture's player has healingModel:{} (Hps=0, CadenceSeconds=0), so " +
        "GetPresimOptions returns nil; the fixture's encounter has a fixed duration " +
        "(no EndFightAtHealth field), so doOne is also false. runPresims's for-loop body " +
        "never executes and it returns immediately.",
      verifiedBy: [
        "read vendor/tbc-new-fork/sim/core/sim.go:114-188 (runSim always calls " +
          "sim.runPresims(rsr) on the CLI path — sim/lib/library.go:40 calls " +
          "core.RunSim(input, nil, signals), which sets skipPresim=false)",
        "read vendor/tbc-new-fork/sim/core/presim.go:34-122 (loop guard: " +
          "`for doOne || remainingAgents > 0`)",
        "read vendor/tbc-new-fork/sim/core/health.go:272-291 (the only " +
          "Presimmer implementation in the fork; condition quoted above)",
        "python -c \"import json; d=json.load(open('test/fixtures/slamaltman.raid-sim-request.json')); " +
          "print(d['raid']['parties'][0]['players'][0].get('healingModel')); " +
          "print('endFightAtHealth' in d['encounter'])\" " +
          "-> {} and False",
      ],
      separable:
        "Not separable on the CLI --outfile path: RaidSimResult (proto/api.proto:384-398) " +
        "carries no PresimRunning or presim-duration field, only the streaming " +
        "ProgressMetrics channel does (which --outfile does not use). Reported as one " +
        "t_fixed number for that reason (F8), but since the presim loop body provably " +
        "never executes for this fixture (see claim above), t_fixed here is pure setup " +
        "cost with zero presim rounds mixed in — not an unresolved mix, a resolved zero.",
    },
  };

  writeFileSync(
    join(ROOT, "experiments/e-w5-overhead.json"),
    JSON.stringify(out, null, 2) + "\n"
  );

  const md = renderMd(out);
  writeFileSync(join(ROOT, "experiments/e-w5-overhead.md"), md);
  console.log("wrote experiments/e-w5-overhead.json and .md");
}

function renderMd(out) {
  const rows = out.points
    .map(
      (p) =>
        `| ${p.iterations} | ${p.medianMs.toFixed(1)} | ${p.medianDps.toFixed(1)} |`
    )
    .join("\n");
  return `# E-W5 §3.1 — per-request cost under Node

Command: \`${out.command}\`
Binary: \`${out.binary}\` (pinned tag v0.0.101, matches \`data/wowsims.lock.json\`)
Fixture: \`${out.fixture}\`, seed ${out.seed}, ${out.repeats} repeats per point.

## Sweep (median of ${out.repeats} repeats)

| iterations | median wall-clock (ms) | median dps |
| --- | --- | --- |
${rows}

Raw per-repeat data is in \`e-w5-overhead.json\` (\`raw\` key); every run's
\`iterationsDone\` was checked to equal the requested iteration count before
being accepted (script throws otherwise).

## Fit

\`t_fixed\` = ${out.fit.t_fixed_ms.toFixed(1)} ms, \`t_iter\` = ${out.fit.t_iter_ms.toFixed(4)} ms/iteration
(least-squares fit of wallMs ~ t_fixed + t_iter * iterations over the five
median points above).

## Presim status (F8)

${out.presim.claim}

Verified by:
${out.presim.verifiedBy.map((v) => `- ${v}`).join("\n")}

**Separability:** ${out.presim.separable}

## Per-worker memory

Peak RSS at 5000 iterations (largest sweep point, longest-lived process): **${(out.rssMeasurement.peakRssBytes / 1e6).toFixed(1)} MB**
(sampled every ${out.rssMeasurement.pollIntervalMs}ms via \`Get-Process -Id <pid> | .WorkingSet64\`
while one sim process was in flight, run **separately** from the timing sweep — ${out.rssMeasurement.note}).
`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
