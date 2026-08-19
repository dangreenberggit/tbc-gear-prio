/**
 * Screening alternatives for ticket 225, measured against the committed
 * full-sweep truth. **This is a measurement script, not a gate** — nothing
 * here runs under `pnpm verify`, and its numbers are quoted in ticket 225's
 * "Reopened scope — answers (2026-08-19)" section and in ADR-0026.
 *
 *   npx tsx packages/core/test/measure-screening-alternatives.ts
 *
 * Needs `vendor/wowsims/*.gear.json` (gitignored — `python
 * scripts/sync_wowsims.py --restore`). It replays the committed fixture
 * `packages/core/test/fixtures/synthetic-roster-recordings.json`, so it needs
 * no sim binary.
 *
 * ## What the criterion is
 *
 * Ticket 225's removal criterion (C1), stated before these numbers were
 * measured and written against the ticket's pre-existing sim-count ratios
 * 1.06/0.70/0.97: a screening mechanism earns its place only if, at zero
 * recall misses over 30 noise draws on every committed gating fixture, it
 * costs at least 20 % less WASM wall-clock than a full sweep — with its
 * decision rule and parameters **fixed in advance**, not tuned per fixture
 * on the truth. Hence `WALL_MS` below and the `z = 3` marking in [B/C].
 *
 * ## Cost model
 *
 * `cost(it) = 748.4 + 3.2446 * it` ms per sim call (candidate-pool.md
 * §3.4.1). The fixed 748.4 ms term is why an iteration-count ratio is not a
 * wall-clock ratio: a rule that splits one 3000-iteration call into three
 * 1000-iteration calls pays that term three times. Ratios below are always
 * wall-clock against a full sweep of `N` candidates at 3000 iterations
 * unless the line says `iterRatio`.
 *
 * ## Noise model
 *
 * `truth.dps + gaussian * stdev/sqrt(iterations)`, seeded per (fixture,
 * item, draw) — the same model `DerivedNoiseSimRunner` uses in
 * `measure-support.ts`, reimplemented here over the truth rows directly so
 * a draw costs no `rankUpgrades` call. 30 draws per configuration.
 *
 * ## Oracle rows are labelled
 *
 * Two quantities here are fitted on the answer and can never be a shipping
 * parameter: the smallest zero-miss `K` in [A], and the per-fixture smallest
 * zero-miss `z` in [B/C]. They are printed because they bound the *best
 * case* of a mechanism — if the shape loses even at its oracle setting, no
 * tuning rescues it. Every such line is tagged `(oracle)`.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { orderCandidatesByEp } from "../src/candidate-order.js";
import { CUTOFF, CUTOFF_FERAL } from "../src/cutoff.js";
import {
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_REF,
  RET_SYNTHETIC_FIGHT,
  RET_SYNTHETIC_REF,
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { getItem } from "../src/items.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import {
  filterPoolByPhase,
  poolFromUniverse,
  simSlotsForPoolSlot,
} from "../src/pool.js";
import { rankUpgrades } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import { SIM_ORDER } from "../src/slots.js";
import { epScore } from "../src/stats.js";
import type { ContentPhase, SpecId } from "../src/types.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const FULL_ITERATIONS = 3000;
const SCREEN_ITERATIONS = 1000;
const DRAWS = 30;
/** candidate-pool.md §3.4.1: per-call fixed cost + per-iteration cost, ms. */
const WALL_FIXED_MS = 748.4;
const WALL_PER_ITERATION_MS = 3.2446;
/** The z fixed in advance for the C1 comparison; 1 and 2 print for context. */
const FIXED_Z = 3;

const loadJson = <T>(rel: string): T =>
  JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;

const wallMs = (calls: number, iterations: number) =>
  calls * WALL_FIXED_MS + iterations * WALL_PER_ITERATION_MS;
const oneCall = (it: number) => wallMs(1, it);

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussian = (rand: () => number) =>
  Math.sqrt(-2 * Math.log(Math.max(rand(), Number.EPSILON))) *
  Math.cos(2 * Math.PI * rand());

/** FNV-1a, as `measure-support.ts` — scatters seed strings, not a hash. */
function hashToUint32(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const f = (n: number, digits = 3) => n.toFixed(digits);

type Row = {
  itemId: number;
  slot: string;
  deltaDps: number;
  above: boolean;
  stdev: number;
  ep: number;
};

type RowKey = "ret" | "feral" | "feral-p3";

type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

const UNIVERSE: Record<RowKey, string> = {
  ret: "ret-p2.json",
  feral: "feral-p2.json",
  "feral-p3": "feral-p3.json",
};

/**
 * The full-sweep truth for one fixture row, plus the per-row inputs every
 * alternative needs: the recorded `stdev` (the noise scale), and the EP
 * delta against the worn item (the pre-order signal Q3 tests).
 *
 * `stdev` is matched back to a row by nearest recorded `dps`: `RankedItem`
 * carries the delta but not the observation it came from, and this script
 * only needs the noise scale, not provenance.
 */
async function truthFor(key: RowKey) {
  const recordingsFile = loadJson<RosterRecordingsFile>(
    "packages/core/test/fixtures/synthetic-roster-recordings.json"
  );
  const rec = recordingsFile.rows[key]!;
  const spec = rec.spec;
  const isFeral = spec === "feral";

  const epWeights = loadJson<{ weights: Record<string, number> }>(
    isFeral
      ? "data/presets/feral/p1.ep-weights.json"
      : "data/presets/ret/p2.ep-weights.json"
  ).weights;
  const skeleton = loadJson<RaidSimRequest>(
    isFeral
      ? "data/presets/feral/p2.raid-sim-skeleton.json"
      : "data/presets/ret/p2.raid-sim-skeleton.json"
  );
  const presetGear = loadJson<PresetGearFile>(
    isFeral
      ? "vendor/wowsims/feral_preraid.gear.json"
      : "vendor/wowsims/ret_preraid.gear.json"
  );
  const ref = isFeral ? FERAL_SYNTHETIC_REF : RET_SYNTHETIC_REF;
  const fight = isFeral ? FERAL_SYNTHETIC_FIGHT : RET_SYNTHETIC_FIGHT;
  const gearData = syntheticOfflineRecordings({
    ref,
    spec,
    presetGear,
    fight,
  });
  const pool = filterPoolByPhase(
    poolFromUniverse(
      loadJson<Parameters<typeof poolFromUniverse>[0]>(
        `data/universes/${UNIVERSE[key]}`
      )
    ),
    rec.maxPhase
  );
  const recordings = new Map(Object.entries(rec.recordings));

  const truth = await rankUpgrades(
    {
      character: ref,
      spec,
      maxPhase: rec.maxPhase,
      iterations: rec.iterations,
      seeds: [rec.seed],
      ...(isFeral ? { race: "RaceTauren" as const } : {}),
      // Removed with racing in Step 4 of the ticket-225 plan; until then the
      // default path screens at 1000 iterations and RecordedSimRunner throws,
      // because the committed fixture holds full-iteration rows only (C23).
      fullPool: true,
    },
    {
      gear: new RecordedGearSource(gearData),
      sim: new RecordedSimRunner(rec.simVersion, recordings) as never,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );

  const cutoff = isFeral ? CUTOFF_FERAL : CUTOFF;
  const baseline = rec.baselineDps;
  // Both cutoff arms are live; the pct arm binds below absDps on these
  // baselines, so the effective boundary is the smaller. See cutoff.ts.
  const boundary = Math.min(cutoff.absDps, (cutoff.pct * baseline) / 100);

  const recordedValues = [...recordings.values()];
  const stdevForDelta = (delta: number) => {
    let bestDistance = Infinity;
    let bestStdev = NaN;
    for (const observation of recordedValues) {
      const distance = Math.abs(observation.dps - baseline - delta);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestStdev = observation.stdev;
      }
    }
    return bestStdev;
  };

  const logged = await new RecordedGearSource(gearData).readGear(fight);
  const equipment = equipmentFromLoggedGear(logged);
  const epDelta = new Map<number, number>();
  for (const entry of pool) {
    const candidateEp = epScore(getItem(entry.itemId)?.stats ?? [], epWeights);
    let best: number | undefined;
    for (const simSlot of simSlotsForPoolSlot(entry.slot)) {
      const index = SIM_ORDER.indexOf(simSlot);
      if (index < 0) continue;
      const wornId = equipment[index]?.id;
      const wornEp =
        wornId === undefined
          ? 0
          : epScore(getItem(wornId)?.stats ?? [], epWeights);
      const delta = candidateEp - wornEp;
      if (best === undefined || delta > best) best = delta;
    }
    epDelta.set(entry.itemId, best ?? 0);
  }

  const rows: Row[] = truth.items
    .filter((item) => !item.owned)
    .map((item) => ({
      itemId: item.itemId,
      slot: String(item.slot),
      deltaDps: item.deltaDps,
      above: !item.belowCutoff,
      stdev: stdevForDelta(item.deltaDps),
      ep: epDelta.get(item.itemId) ?? 0,
    }));

  const slots = [...new Set(rows.map((r) => r.slot))].sort();
  const slotOrder = new Map<string, number[]>();
  for (const slot of slots) {
    const entries = pool.filter((e) => String(e.slot) === slot);
    const ordered = orderCandidatesByEp(
      entries,
      equipment,
      epWeights,
      (id) => getItem(id)?.stats ?? []
    );
    slotOrder.set(
      slot,
      ordered.map((e) => e.itemId)
    );
  }

  return {
    key,
    rows,
    boundary,
    slots,
    slotOrder,
    total: rows.length,
    aboveCount: rows.filter((r) => r.above).length,
  };
}

type Truth = Awaited<ReturnType<typeof truthFor>>;

/** Paired SE of a delta at `iterations`: two noisy runs, so the sqrt(2). */
const pairedSe = (stdev: number, iterations: number) =>
  (stdev / Math.sqrt(iterations)) * Math.SQRT2;

const noiseFor = (key: string, itemId: number, tag: string | number) =>
  gaussian(mulberry32(hashToUint32(`${key}:${itemId}:${tag}`)));

/**
 * [A] Racing's own shape at its best case: screen every candidate at 1000
 * iterations, promote the top K by noisy delta, full-sim those. K is the
 * smallest value that loses no above-cutoff row in any of 30 draws — an
 * **oracle**, since it is read off the truth.
 *
 * Top-K only, so this is a lower bound on the shipped K+J rule's cost: the
 * real rule also promotes J per slot, which can only add sims.
 */
function racingAtOracleK(truth: Truth) {
  const perDraw: number[] = [];
  for (let draw = 1; draw <= DRAWS; draw++) {
    const noisy = truth.rows.map((row) => ({
      row,
      value:
        row.deltaDps +
        noiseFor(truth.key, row.itemId, `${draw}:scr`) *
          (row.stdev / Math.sqrt(SCREEN_ITERATIONS)),
    }));
    noisy.sort((a, b) => b.value - a.value);
    let deepest = 0;
    noisy.forEach((entry, index) => {
      if (entry.row.above) deepest = Math.max(deepest, index + 1);
    });
    perDraw.push(deepest);
  }
  const k = Math.max(...perDraw);
  const ratios: string[] = [];
  for (const full of [3000, 5000]) {
    const racing = truth.total * oneCall(SCREEN_ITERATIONS) + k * oneCall(full);
    ratios.push(
      `full=${full}: wallRatio=${f(racing / (truth.total * oneCall(full)))}`
    );
  }
  const sorted = [...perDraw].sort((a, b) => a - b);
  console.log(
    `  [A] racing at smallest zero-miss K (oracle): K=${k} ` +
      `K/N=${f(k / truth.total)} N=${truth.total} above=${truth.aboveCount}; ` +
      `${ratios.join("  ")}; per-draw K median=${sorted[Math.floor(sorted.length / 2)]}`
  );
}

/**
 * [B]/[C] Sequential screening: start at 1000 iterations and add 1000 until
 * the noisy delta is more than `z` paired SE clear of the boundary, or 3000
 * is reached (then promote — undecided at full depth means keep it).
 *
 * Two settlements of the same walk:
 *   B — a promoted row is re-simmed at 3000 from scratch (a screening pass
 *       that keeps the full sim as the reported number).
 *   C — a promoted row keeps the **pooled** estimate from the iterations it
 *       already spent (adaptive; no separate sim).
 *
 * C is cheaper precisely because it reports a coarser number for rows that
 * settled early. `coarsePromoted` and `pooledError` measure that cost —
 * ticket 225's Q4 win condition carries an output-precision term, and this
 * is its baseline.
 */
function sequential(truth: Truth, z: number, draw: number) {
  let iterationsB = 0;
  let callsB = 0;
  let iterationsC = 0;
  let callsC = 0;
  let coarsePromoted = 0;
  let pooledAbsError = 0;
  let promoted = 0;
  let misses = 0;

  for (const row of truth.rows) {
    let iterations = SCREEN_ITERATIONS;
    let calls = 1;
    let noise =
      noiseFor(truth.key, row.itemId, draw) *
      (row.stdev / Math.sqrt(SCREEN_ITERATIONS));
    let decision: "promote" | "drop" | undefined;

    while (decision === undefined) {
      const value = row.deltaDps + noise;
      const margin = z * pairedSe(row.stdev, iterations);
      if (value - truth.boundary > margin) decision = "promote";
      else if (truth.boundary - value > margin) decision = "drop";
      else if (iterations >= FULL_ITERATIONS) decision = "promote";
      else {
        // Pooling by iteration weight: the extra block is an independent
        // draw at 1000 iterations, so the combined estimate's noise is the
        // iteration-weighted mean of the two.
        const extra =
          noiseFor(truth.key, row.itemId, `${draw}:${iterations}`) *
          (row.stdev / Math.sqrt(SCREEN_ITERATIONS));
        noise =
          (noise * iterations + extra * SCREEN_ITERATIONS) /
          (iterations + SCREEN_ITERATIONS);
        iterations += SCREEN_ITERATIONS;
        calls++;
      }
    }

    iterationsB += iterations;
    callsB += calls;
    iterationsC += iterations;
    callsC += calls;

    if (decision === "promote") {
      iterationsB += FULL_ITERATIONS;
      callsB += 1;
      promoted++;
      pooledAbsError += Math.abs(noise);
      if (iterations < FULL_ITERATIONS) coarsePromoted++;
    }
    if (row.above && decision === "drop") misses++;
  }

  return {
    wallB: wallMs(callsB, iterationsB),
    wallC: wallMs(callsC, iterationsC),
    iterationsB,
    iterationsC,
    coarsePromoted,
    misses,
    // Mean |pooled - truth| over promoted rows: C's precision penalty. B
    // re-sims at 3000, so its error is the full-sweep error by construction.
    pooledError: promoted === 0 ? 0 : pooledAbsError / promoted,
  };
}

function sequentialReport(truth: Truth) {
  const sweepWall = truth.total * oneCall(FULL_ITERATIONS);
  const sweepIterations = truth.total * FULL_ITERATIONS;
  for (const z of [1, 2, 3]) {
    const runs = Array.from({ length: DRAWS }, (_, i) =>
      sequential(truth, z, i + 1)
    );
    const mean = (pick: (r: ReturnType<typeof sequential>) => number) =>
      runs.reduce((acc, r) => acc + pick(r), 0) / runs.length;
    const marker = z === FIXED_Z ? " <- fixed in advance (C1)" : "";
    console.log(
      `  [B/C] z=${z}: ` +
        `B(separate full sim) iterRatio=${f(mean((r) => r.iterationsB) / sweepIterations)} ` +
        `wallRatio=${f(mean((r) => r.wallB) / sweepWall)} | ` +
        `C(adaptive, pooled) iterRatio=${f(mean((r) => r.iterationsC) / sweepIterations)} ` +
        `wallRatio=${f(mean((r) => r.wallC) / sweepWall)} ` +
        `coarsePromoted=${f(
          mean((r) => r.coarsePromoted),
          1
        )} ` +
        `pooledErrDps=${f(
          mean((r) => r.pooledError),
          2
        )} | ` +
        `misses max=${Math.max(...runs.map((r) => r.misses))} ` +
        `mean=${f(
          mean((r) => r.misses),
          2
        )}${marker}`
    );
  }
}

/**
 * [D] Q3's EP-gap stop: walk each slot in EP order and stop once even the
 * most favourable overturn — `slope * EP + B` — cannot reach the boundary.
 *
 * `slope` is least squares through the origin on the truth and `B` is a
 * residual quantile of the truth, so **both are oracles**: a shipping rule
 * would have to fit them beforehand on other data. Printed because if the
 * shape loses with the answer in hand, it loses.
 */
function epGapStop(truth: Truth) {
  const xs = truth.rows.map((r) => r.ep);
  const ys = truth.rows.map((r) => r.deltaDps);
  const slope =
    xs.reduce((acc, x, i) => acc + x * ys[i]!, 0) /
    xs.reduce((acc, x) => acc + x * x, 0);
  const residuals = truth.rows
    .map((r) => Math.abs(r.deltaDps - slope * r.ep))
    .sort((a, b) => a - b);
  const quantile = (p: number) =>
    residuals[
      Math.min(residuals.length - 1, Math.floor(p * residuals.length))
    ]!;
  console.log(
    `  [D] slope DPS/EP=${f(slope, 4)} (oracle) |resid| ` +
      `p50=${f(quantile(0.5), 2)} p90=${f(quantile(0.9), 2)} ` +
      `p95=${f(quantile(0.95), 2)} max=${f(residuals[residuals.length - 1]!, 2)}`
  );

  const byId = new Map(truth.rows.map((r) => [r.itemId, r]));
  const bounds = [
    ["p90", quantile(0.9)],
    ["p95", quantile(0.95)],
    ["max", residuals[residuals.length - 1]!],
  ] as const;

  for (const [label, bound] of bounds) {
    let setSims = 0;
    let setMisses = 0;
    let topSims = 0;
    let topMisses = 0;

    for (const slot of truth.slots) {
      const order = (truth.slotOrder.get(slot) ?? [])
        .map((id) => byId.get(id))
        .filter((r): r is Row => r !== undefined);

      // Set-recall contract: stop when no remaining row could clear the
      // cutoff even at the bound.
      const simmed = new Set<number>();
      for (const row of order) {
        if (slope * row.ep + bound < truth.boundary) break;
        setSims++;
        simmed.add(row.itemId);
      }
      for (const row of order) {
        if (row.above && !simmed.has(row.itemId)) setMisses++;
      }

      // Per-slot top-3 contract: the bar rises to the third-best measured
      // value once three are in hand, so the stop can fire earlier.
      const best: number[] = [];
      const simmedTop = new Set<number>();
      for (const row of order) {
        const third = best.length >= 3 ? best[2]! : -Infinity;
        if (slope * row.ep + bound < Math.max(third, truth.boundary)) break;
        topSims++;
        simmedTop.add(row.itemId);
        best.push(row.deltaDps);
        best.sort((a, b) => b - a);
      }
      const truthTop3 = order
        .filter((r) => r.above)
        .sort((a, b) => b.deltaDps - a.deltaDps)
        .slice(0, 3);
      for (const row of truthTop3) {
        if (!simmedTop.has(row.itemId)) topMisses++;
      }
    }

    console.log(
      `      B=${label}(${f(bound, 2)}): ` +
        `set-recall sims=${setSims}/${truth.total} (${f(setSims / truth.total)}) ` +
        `misses=${setMisses}/${truth.aboveCount} | ` +
        `per-slot top-3 sims=${topSims}/${truth.total} (${f(topSims / truth.total)}) ` +
        `top-3 misses=${topMisses}`
    );
  }
}

async function main() {
  console.log(
    `cost model ${WALL_FIXED_MS} + ${WALL_PER_ITERATION_MS}*it ms/call; ` +
      `${DRAWS} draws; screen=${SCREEN_ITERATIONS} full=${FULL_ITERATIONS}`
  );
  for (const key of ["ret", "feral", "feral-p3"] as const) {
    const truth = await truthFor(key);
    console.log(
      `\n[${key}] N=${truth.total} above=${truth.aboveCount} ` +
        `boundary=${f(truth.boundary)} DPS`
    );
    racingAtOracleK(truth);
    sequentialReport(truth);
    epGapStop(truth);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
