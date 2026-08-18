/**
 * Within-slot ordering below the per-slot promotion floor, for ticket 222.
 *
 * The per-slot floor promotes `promoteTopJ` candidates from each slot's own
 * screening ranking — at the shipped j=1, exactly the slot's screening
 * argmax. Every other candidate in that slot finishes as a `screened` row
 * carrying its 1,000-iteration screening delta, and `rank.ts` orders those
 * rows against each other by that delta. The 7.2 recall gate is a set
 * membership assertion and says nothing about that ordering. This script
 * measures it.
 *
 * Three sections:
 *
 *   1. Screening SE at 1,000 iterations, from the recorded per-candidate
 *      stdevs — replacing the untested `1/sqrt(n)` extrapolation off F10's
 *      ~6.8 DPS at 300 iterations.
 *   2. Floor-activity: does the floor promote any row the global top-K did
 *      not already take? Swept at the shipped K and at the pre-ticket-221
 *      K=150, so the K-independence of the answer is re-runnable rather
 *      than asserted. Prints the per-slot pool histogram, which is the
 *      mechanism behind the answer.
 *   3. Ordering: screening order vs recorded full-iteration truth within
 *      each slot's screened-out partition — pairwise inversions and maximum
 *      rank displacement, over 30 noise draws.
 *
 * **What section 3 measures, exactly.** The truth side is real: recorded
 * 3,000-iteration sims of every eligible candidate. The screening side is a
 * *model* — `DerivedNoiseSimRunner` perturbs that recorded truth with
 * seeded Gaussian noise scaled `stdev / sqrt(iterations)`, independent
 * across candidates. No artifact of a real shipped screening ordering
 * exists (ticket 219 saved aggregate figures only), so no byte replay is
 * possible. Real screening shares one seed across candidates, so real
 * errors are plausibly correlated, and correlated errors preserve order
 * better than independent ones. The inversion counts below are therefore a
 * **conservative upper bound** on shipped disorder, not an unbiased
 * estimate of it. What is real throughout: per-candidate truth and
 * per-candidate variance, both from sims. What is modelled: the Gaussian
 * shape and the independence.
 *
 * Not a vitest test — a measurement script, same convention as
 * `measure-feral-p3-recall.ts` (§7.12: "record numbers"). Named without a
 * `.test.ts` suffix so vitest does not collect it. Run with:
 *
 *   npx tsx packages/core/test/measure-within-slot-ordering.ts
 *
 * It reads the committed recordings and replays them, so it needs no sim
 * binary and no network — but it runs 30 noise draws across two K values
 * plus the ordering sweep, so expect a few minutes. Output is deterministic:
 * two consecutive runs produce identical text.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { filterPoolByPhase, poolFromUniverse } from "../src/pool.js";
import { rankUpgrades, type RankedItem } from "../src/rank.js";
import { RecordedGearSource } from "../src/seams/gear-source.js";
import {
  RecordedSimRunner,
  type RaidSimRequest,
  type SimObservation,
} from "../src/seams/sim-runner.js";
import { MemoryStore } from "../src/seams/store.js";
import type { ContentPhase, SpecId } from "../src/types.js";
import {
  syntheticOfflineRecordings,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_P3_SYNTHETIC_ROW,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { DerivedNoiseSimRunner } from "./racing-support.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(root, rel), "utf8")) as T;
}

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

const recordingsFile = loadJson<RosterRecordingsFile>(
  "packages/core/test/fixtures/synthetic-roster-recordings.json"
);
const recorded = recordingsFile.rows["feral-p3"]!;

const epWeights = loadJson<{ weights: Record<string, number> }>(
  "data/presets/feral/p1.ep-weights.json"
).weights;
const skeleton = loadJson<RaidSimRequest>(
  "data/presets/feral/p2.raid-sim-skeleton.json"
);
const presetGear = loadJson<PresetGearFile>(
  "vendor/wowsims/feral_preraid.gear.json"
);
const gearData = syntheticOfflineRecordings({
  ref: FERAL_SYNTHETIC_REF,
  spec: "feral",
  presetGear,
  fight: FERAL_SYNTHETIC_FIGHT,
});

const maxPhase = FERAL_P3_SYNTHETIC_ROW.maxPhase;
const pool = filterPoolByPhase(
  poolFromUniverse(
    loadJson<Parameters<typeof poolFromUniverse>[0]>(
      "data/universes/feral-p3.json"
    )
  ),
  maxPhase
);

const NOISE_DRAWS = 30;
const SCREEN_ITERATIONS = 1000;
/** Shipped default and the pre-ticket-221 value, to show K-independence. */
const K_VALUES: readonly number[] = [210, 150];
/** Named in the report body; the rest roll up into the all-slots summary. */
const FEATURED_SLOTS: readonly string[] = ["weapon", "head", "trinket"];

const baseInput = () => ({
  character: FERAL_SYNTHETIC_REF,
  spec: "feral" as const,
  maxPhase,
  iterations: recorded.iterations,
  seeds: [recorded.seed],
  race: "RaceTauren" as const,
});

const deps = (sim: unknown) => ({
  gear: new RecordedGearSource(gearData),
  sim: sim as never,
  store: new MemoryStore(),
  clock: () => new Date("2026-08-15T12:00:00.000Z"),
  raidSimSkeleton: skeleton,
  epWeights,
  pool,
});

function noiseRunner(draw: number) {
  return new DerivedNoiseSimRunner(
    recorded.simVersion,
    new Map(Object.entries(recorded.recordings)),
    recorded.seed,
    draw
  );
}

function truthRunner() {
  return new RecordedSimRunner(
    recorded.simVersion,
    new Map(Object.entries(recorded.recordings))
  );
}

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

// --- section 1: screening SE at 1,000 iterations -------------------------

function reportScreeningSe() {
  const stdevs = Object.values(recorded.recordings).map((o) => o.stdev);
  const ses = stdevs.map((s) => s / Math.sqrt(SCREEN_ITERATIONS));
  const mean = ses.reduce((a, b) => a + b, 0) / ses.length;
  const meanStdev = stdevs.reduce((a, b) => a + b, 0) / stdevs.length;

  console.log(
    `\n=== 1. screening SE at ${SCREEN_ITERATIONS} iterations ` +
      `(n=${ses.length} recorded candidates) ===`
  );
  console.log(
    "  wowsims reports a per-iteration population sd with no /sqrt(N) applied\n" +
      "  (vendor/tbc-new-fork/sim/core/sim_concurrent.go:138), so SE of the mean\n" +
      "  = stdev/sqrt(n) is the correct shape — the same one rank.ts reports."
  );
  console.log(
    `  mean per-sim stdev  ${fmt(meanStdev)} DPS  (over ${stdevs.length} recordings)`
  );
  console.log(
    `  SE@${SCREEN_ITERATIONS}          mean ${fmt(mean, 3)} DPS   ` +
      `min ${fmt(Math.min(...ses))}   max ${fmt(Math.max(...ses))}`
  );
  console.log(
    `  pairwise difference scale  sqrt(2) * SE = ${fmt(Math.SQRT2 * mean)} DPS`
  );
  const f10 = 6.8 * Math.sqrt(300 / SCREEN_ITERATIONS);
  console.log(
    `  F10's 1/sqrt(n) extrapolation off ~6.8 DPS at 300 iterations gives ` +
      `${fmt(f10)} DPS:\n  ${fmt((100 * (mean - f10)) / mean, 0)}% below the measured mean, ` +
      `equivalently the measured mean is ${fmt((100 * (mean - f10)) / f10, 0)}% above it.\n` +
      `  The extrapolation understates because the feral P3 per-sim stdev is larger\n` +
      `  than the one behind F10's 300-iteration figure.`
  );
  return { mean, min: Math.min(...ses), max: Math.max(...ses) };
}

// --- section 2: floor activity + pool shape ------------------------------

function slotHistogram() {
  const counts = new Map<string, number>();
  for (const entry of pool) {
    counts.set(entry.slot, (counts.get(entry.slot) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function perSlotFullSimCounts(items: RankedItem[]) {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (item.screened?.promoted === false) continue;
    counts.set(item.slot, (counts.get(item.slot) ?? 0) + 1);
  }
  return counts;
}

async function reportFloorActivity() {
  console.log(`\n=== 2. floor activity: does promoteTopJ add any row? ===`);

  const histogram = slotHistogram();
  const total = histogram.reduce((a, [, n]) => a + n, 0);
  console.log(
    `  pool shape: ${histogram.length} slots over ${total} eligible entries`
  );
  console.log("  " + histogram.map(([slot, n]) => `${slot} ${n}`).join(", "));
  console.log(
    `  smallest slot ${histogram[histogram.length - 1]![1]}; ` +
      `K admits ${fmt((100 * 150) / total, 0)}-${fmt((100 * 210) / total, 0)}% of the pool at K=150-210.`
  );

  const summary: Array<{ k: number; drawsWithAddedRows: number }> = [];
  for (const k of K_VALUES) {
    let drawsWithAddedRows = 0;
    const addedDetail: string[] = [];
    for (let draw = 0; draw < NOISE_DRAWS; draw++) {
      const j0 = await rankUpgrades(
        { ...baseInput(), promoteTopK: k, promoteTopJ: 0 },
        deps(noiseRunner(draw))
      );
      const j1 = await rankUpgrades(
        { ...baseInput(), promoteTopK: k, promoteTopJ: 1 },
        deps(noiseRunner(draw))
      );
      const c0 = perSlotFullSimCounts(j0.items);
      const c1 = perSlotFullSimCounts(j1.items);
      const added: string[] = [];
      for (const [slot, n1] of c1) {
        const n0 = c0.get(slot) ?? 0;
        if (n1 > n0) added.push(`${slot} +${n1 - n0}`);
      }
      if (added.length > 0) {
        drawsWithAddedRows++;
        addedDetail.push(`draw ${draw}: ${added.join(", ")}`);
      }
    }
    summary.push({ k, drawsWithAddedRows });
    console.log(
      `  K=${k}: floor added rows in ${drawsWithAddedRows}/${NOISE_DRAWS} draws`
    );
    for (const line of addedDetail) console.log(`      ${line}`);
  }

  if (summary.every((s) => s.drawsWithAddedRows === 0)) {
    console.log(
      `  floor added rows in 0/${NOISE_DRAWS} draws (K=210) and 0/${NOISE_DRAWS} (K=150).\n` +
        "  Mechanism: with this many slots over this pool and a K admitting this\n" +
        "  fraction of it, every slot's screening argmax already clears the global\n" +
        "  top-K, so the floor has nothing left to add. This is a fact about cutoff\n" +
        "  density and slot count on THIS pool, not about the value of K — a\n" +
        "  materially larger pool, more slots, or a much smaller K/pool ratio could\n" +
        "  reactivate the floor, and would make this measurement worth re-running."
    );
  }
  return summary;
}

// --- section 3: within-slot ordering vs recorded truth -------------------

/**
 * Pairwise inversions between two orderings of the same id set, counted
 * twice: over all pairs, and over only those pairs the truth separates by
 * more than `resolveBand` DPS (see `SlotStat.resolvableInversions`).
 */
function inversions(
  screenOrder: number[],
  truthRank: Map<number, number>,
  truthDelta: Map<number, number>,
  resolveBand: number
) {
  let count = 0;
  let pairs = 0;
  let resolvableCount = 0;
  let resolvablePairs = 0;
  for (let i = 0; i < screenOrder.length; i++) {
    for (let j = i + 1; j < screenOrder.length; j++) {
      const a = screenOrder[i]!;
      const b = screenOrder[j]!;
      pairs++;
      const inverted = truthRank.get(a)! > truthRank.get(b)!;
      if (inverted) count++;
      if (Math.abs(truthDelta.get(a)! - truthDelta.get(b)!) > resolveBand) {
        resolvablePairs++;
        if (inverted) resolvableCount++;
      }
    }
  }
  return { count, pairs, resolvableCount, resolvablePairs };
}

function maxDisplacement(
  screenOrder: number[],
  truthRank: Map<number, number>
) {
  // Truth ranks restricted to this partition, compacted to 0..n-1 so a
  // displacement is measured within the shown list rather than against
  // global truth positions.
  const localTruth = [...screenOrder].sort(
    (a, b) => truthRank.get(a)! - truthRank.get(b)!
  );
  const localRank = new Map(localTruth.map((id, i) => [id, i]));
  let max = 0;
  for (let i = 0; i < screenOrder.length; i++) {
    max = Math.max(max, Math.abs(i - localRank.get(screenOrder[i]!)!));
  }
  return max;
}

type SlotStat = {
  inversions: number[];
  pairs: number[];
  displacements: number[];
  sizes: number[];
  /**
   * Inversions restricted to pairs whose *recorded truth* deltas differ by
   * more than the pairwise noise scale. An inversion between two candidates
   * separated by less than the noise cannot be called an error: the two are
   * not distinguishable at screening precision, and any order between them
   * is as defensible as any other. Slots where nearly every pair is inside
   * that band report a high raw inversion rate that says nothing about
   * whether the shown list misleads.
   */
  resolvableInversions: number[];
  resolvablePairs: number[];
};

async function reportOrdering(seMean: number) {
  console.log(`\n=== 3. within-slot ordering: screening vs recorded truth ===`);
  console.log(
    "  MODEL CAVEAT: the truth side is real recorded full-iteration sims; the\n" +
      "  screening side is an independent-Gaussian noise model over real\n" +
      "  per-candidate stdevs, not a byte replay — no artifact of a real shipped\n" +
      "  screening ordering exists. Real screening shares a seed across\n" +
      "  candidates, so real errors are plausibly correlated, and correlated\n" +
      "  errors preserve order better than independent ones. These counts are a\n" +
      "  CONSERVATIVE UPPER BOUND on shipped disorder, not an estimate of it."
  );

  const resolveBand = Math.SQRT2 * seMean;
  console.log(
    `\n  Pairs whose recorded-truth deltas differ by more than the pairwise\n` +
      `  noise scale (sqrt(2) * SE = ${fmt(resolveBand)} DPS) are reported\n` +
      `  separately as "resolvable": an inversion inside that band is not an\n` +
      `  error anyone could have avoided at screening precision, because the two\n` +
      `  candidates are not distinguishable there.`
  );

  const truth = await rankUpgrades(
    { ...baseInput(), fullPool: true },
    deps(truthRunner())
  );
  const truthOrdered = [...truth.items].sort((a, b) => b.deltaDps - a.deltaDps);
  const truthRank = new Map(truthOrdered.map((i, idx) => [i.itemId, idx]));
  const truthDelta = new Map(truthOrdered.map((i) => [i.itemId, i.deltaDps]));

  const stats = new Map<string, SlotStat>();
  for (let draw = 0; draw < NOISE_DRAWS; draw++) {
    const ranking = await rankUpgrades(baseInput(), deps(noiseRunner(draw)));
    const screenedBySlot = new Map<string, RankedItem[]>();
    for (const item of ranking.items) {
      if (item.screened?.promoted !== false) continue;
      const bucket = screenedBySlot.get(item.slot);
      if (bucket) bucket.push(item);
      else screenedBySlot.set(item.slot, [item]);
    }
    for (const [slot, rows] of screenedBySlot) {
      if (rows.length < 2) continue;
      // The shipped screened-partition ordering: by screening delta, desc.
      const order = [...rows]
        .sort((a, b) => b.deltaDps - a.deltaDps)
        .map((r) => r.itemId)
        .filter((id) => truthRank.has(id));
      if (order.length < 2) continue;
      const inv = inversions(order, truthRank, truthDelta, resolveBand);
      const stat = stats.get(slot) ?? {
        inversions: [],
        pairs: [],
        displacements: [],
        sizes: [],
        resolvableInversions: [],
        resolvablePairs: [],
      };
      stat.inversions.push(inv.count);
      stat.pairs.push(inv.pairs);
      stat.resolvableInversions.push(inv.resolvableCount);
      stat.resolvablePairs.push(inv.resolvablePairs);
      stat.displacements.push(maxDisplacement(order, truthRank));
      stat.sizes.push(order.length);
      stats.set(slot, stat);
    }
  }

  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const ordered = [...stats.entries()].sort(
    (a, b) => mean(b[1].sizes) - mean(a[1].sizes)
  );

  console.log(
    "\n  slot         rows  pairs   inv(mean/max)  inv%   resolvable  rInv%  maxDisp(mean/max)"
  );
  for (const [slot, s] of ordered) {
    const label = FEATURED_SLOTS.includes(slot) ? `${slot} *` : slot;
    const invPct = (100 * mean(s.inversions)) / mean(s.pairs);
    const rPairs = mean(s.resolvablePairs);
    const rInvPct =
      rPairs > 0 ? (100 * mean(s.resolvableInversions)) / rPairs : 0;
    console.log(
      `  ${label.padEnd(12)} ${fmt(mean(s.sizes), 1).padStart(4)}  ` +
        `${fmt(mean(s.pairs), 0).padStart(5)}  ` +
        `${fmt(mean(s.inversions), 1).padStart(6)} / ${String(Math.max(...s.inversions)).padStart(4)}  ` +
        `${fmt(invPct, 1).padStart(5)}%  ` +
        `${fmt(rPairs, 0).padStart(6)} pr  ` +
        `${(rPairs > 0 ? `${fmt(rInvPct, 1)}%` : "n/a").padStart(6)}  ` +
        `${fmt(mean(s.displacements), 1).padStart(7)} / ${String(Math.max(...s.displacements)).padStart(3)}`
    );
  }

  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const totalInv = sum([...stats.values()].flatMap((s) => s.inversions));
  const totalPairs = sum([...stats.values()].flatMap((s) => s.pairs));
  const totalRInv = sum(
    [...stats.values()].flatMap((s) => s.resolvableInversions)
  );
  const totalRPairs = sum(
    [...stats.values()].flatMap((s) => s.resolvablePairs)
  );
  const allDisp = [...stats.values()].flatMap((s) => s.displacements);
  console.log(
    `\n  all slots, ${NOISE_DRAWS} draws: ${totalInv} inversions of ${totalPairs} pairs ` +
      `(${fmt((100 * totalInv) / totalPairs, 2)}%), ` +
      `max displacement ${Math.max(...allDisp)} (* = named in the ticket report)`
  );
  console.log(
    `  restricted to truth-resolvable pairs: ${totalRInv} of ${totalRPairs} ` +
      `(${fmt((100 * totalRInv) / totalRPairs, 2)}%) — ` +
      `${fmt((100 * totalRPairs) / totalPairs, 0)}% of all pairs are resolvable.`
  );
  return { stats, truthRank, truthOrdered, truthDelta };
}

async function main() {
  console.log(
    "within-slot ordering measurement — ticket 222 — feral P3 recording " +
      `(${recorded.simVersion}, ${recorded.iterations} iterations, seed ${recorded.seed})`
  );
  const se = reportScreeningSe();
  await reportFloorActivity();
  await reportOrdering(se.mean);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
