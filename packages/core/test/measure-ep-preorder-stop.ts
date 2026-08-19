/**
 * Can the EP pre-order do the screening work? Ticket 225 Q3.
 * **This is a measurement script, not a gate** — nothing here runs under
 * `pnpm verify`.
 *
 *   npx tsx packages/core/test/measure-ep-preorder-stop.ts
 *
 * Needs `vendor/wowsims/*.gear.json` (gitignored — `python
 * scripts/sync_wowsims.py --restore`). Replays the committed fixture
 * `packages/core/test/fixtures/synthetic-roster-recordings.json`; no sim
 * binary.
 *
 * ## The question
 *
 * `candidate-order.ts` already orders each slot's candidates by EP delta
 * against the worn item. If that order were good enough, ranking could walk
 * a slot from the top and stop early — no screening pass at all. This script
 * measures how good it actually is, three ways:
 *
 *   - **Spearman(EP delta, truth delta DPS)** — is the order even correlated?
 *   - **Oracle lower bound L** — sum over slots of the deepest position
 *     holding an above-cutoff row. Any per-slot prefix rule must sim at
 *     least this many candidates, whatever its stopping condition. This is
 *     the ceiling on the whole family, read off the answer.
 *   - **Two concrete stop rules**: `S(m)` stops a slot after `m` consecutive
 *     below-cutoff rows; `G(x)` stops once EP delta falls below `x`.
 *
 * A miss is an above-cutoff row the rule never simmed.
 *
 * ## What this script is not
 *
 * The bound-based variant of Q3 — stop when `slope * EP + B` cannot reach
 * the cutoff, with `B` a residual quantile — lives in section [D] of
 * `measure-screening-alternatives.ts`, together with the per-slot top-3
 * output contract it is compared against (Q2). It is a different rule shape
 * and shares that script's truth-loading, so it is not duplicated here.
 *
 * ## Oracle warning
 *
 * `L`, the smallest zero-miss `m`, and the EP floor are all read off the
 * truth. They bound the best case of the shape; none is a shippable
 * parameter.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { orderCandidatesByEp } from "../src/candidate-order.js";
import {
  FERAL_P3_SYNTHETIC_ROW,
  FERAL_SYNTHETIC_FIGHT,
  FERAL_SYNTHETIC_REF,
  FERAL_SYNTHETIC_ROW,
  RET_SYNTHETIC_FIGHT,
  RET_SYNTHETIC_REF,
  RET_SYNTHETIC_ROW,
  syntheticOfflineRecordings,
  type PresetGearFile,
} from "../src/fixtures/synthetic-offline.js";
import { getItem } from "../src/items.js";
import { equipmentFromLoggedGear } from "../src/logged-gear.js";
import {
  filterPoolByPhase,
  poolFromUniverse,
  simSlotsForPoolSlot,
  type PoolEntry,
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

function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8")) as T;
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
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

type Case = {
  rowKey: string;
  ref: typeof RET_SYNTHETIC_REF;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight: typeof RET_SYNTHETIC_FIGHT;
  epWeightsPath: string;
  skeletonPath: string;
  presetGearPath: string;
  universePath: string;
  race?: "RaceTauren";
  /** Full-iteration sims racing issues today, from measure-racing-ratio.ts (C2). */
  fullSimsToday: number;
};

const CASES: Record<string, Case> = {
  ret: {
    rowKey: "ret",
    ref: RET_SYNTHETIC_REF,
    spec: RET_SYNTHETIC_ROW.spec,
    maxPhase: RET_SYNTHETIC_ROW.maxPhase,
    fight: RET_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/ret/p2.ep-weights.json",
    skeletonPath: "data/presets/ret/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/ret_preraid.gear.json",
    universePath: "data/universes/ret-p2.json",
    fullSimsToday: 233,
  },
  feral: {
    rowKey: "feral",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p2.json",
    race: "RaceTauren",
    fullSimsToday: 242,
  },
  "feral-p3": {
    rowKey: "feral-p3",
    ref: FERAL_SYNTHETIC_REF,
    spec: FERAL_P3_SYNTHETIC_ROW.spec,
    maxPhase: FERAL_P3_SYNTHETIC_ROW.maxPhase,
    fight: FERAL_SYNTHETIC_FIGHT,
    epWeightsPath: "data/presets/feral/p1.ep-weights.json",
    skeletonPath: "data/presets/feral/p2.raid-sim-skeleton.json",
    presetGearPath: "vendor/wowsims/feral_preraid.gear.json",
    universePath: "data/universes/feral-p3.json",
    race: "RaceTauren",
    fullSimsToday: 257,
  },
};

/** Spearman rank correlation with average ranks for ties. */
function spearman(xs: number[], ys: number[]): number {
  const n = xs.length;
  const ranks = (values: number[]) => {
    const order = values
      .map((_, i) => i)
      .sort((a, b) => values[a]! - values[b]!);
    const out = new Array<number>(n).fill(0);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j + 1 < n && values[order[j + 1]!] === values[order[i]!]) j++;
      const average = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) out[order[k]!] = average;
      i = j + 1;
    }
    return out;
  };
  const rx = ranks(xs);
  const ry = ranks(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n;
  const my = ry.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i]! - mx;
    const dy = ry[i]! - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  return num / Math.sqrt(dx2 * dy2);
}

async function runFixture(key: string): Promise<void> {
  const c = CASES[key]!;
  const recordingsFile = loadJson<RosterRecordingsFile>(
    "packages/core/test/fixtures/synthetic-roster-recordings.json"
  );
  const recorded = recordingsFile.rows[c.rowKey]!;
  const epWeights = loadJson<{ weights: Record<string, number> }>(
    c.epWeightsPath
  ).weights;
  const skeleton = loadJson<RaidSimRequest>(c.skeletonPath);
  const presetGear = loadJson<PresetGearFile>(c.presetGearPath);
  const pool = filterPoolByPhase(
    poolFromUniverse(
      loadJson<Parameters<typeof poolFromUniverse>[0]>(c.universePath)
    ),
    c.maxPhase
  );
  const gearData = syntheticOfflineRecordings({
    ref: c.ref,
    spec: c.spec,
    presetGear,
    fight: c.fight,
  });

  const recordings = new Map(Object.entries(recorded.recordings));
  const sim = new RecordedSimRunner(recorded.simVersion, recordings);
  const truth = await rankUpgrades(
    {
      character: c.ref,
      spec: c.spec,
      maxPhase: c.maxPhase,
      iterations: recorded.iterations,
      seeds: [recorded.seed],
      ...(c.race === undefined ? {} : { race: c.race }),
      // Removed with racing in Step 4 of the ticket-225 plan; until then the
      // default path screens at 1000 iterations and RecordedSimRunner throws,
      // because the committed fixture holds full-iteration rows only (C23).
      fullPool: true,
    },
    {
      gear: new RecordedGearSource(gearData),
      sim: sim as never,
      store: new MemoryStore(),
      clock: () => new Date("2026-08-15T12:00:00.000Z"),
      raidSimSkeleton: skeleton,
      epWeights,
      pool,
    }
  );
  const items = truth.items;
  const truthByItemId = new Map(items.map((i) => [i.itemId, i]));

  const logged = await new RecordedGearSource(gearData).readGear(c.fight);
  const equipment = equipmentFromLoggedGear(logged);
  const wornIds = new Set(
    equipment.map((s) => s.id).filter((id): id is number => Boolean(id))
  );

  console.log(`\n=== fixture: ${key} ===`);
  console.log(
    `N eligible rows: ${items.length}; full sweep = N+1 sims = ${items.length + 1}`
  );
  console.log(`full-iteration sims racing issues today: ${c.fullSimsToday}`);
  const aboveCutoff = items.filter((i) => !i.belowCutoff);
  console.log(`A (above-cutoff rows): ${aboveCutoff.length}`);

  const slots = [...new Set(items.map((i) => String(i.slot)))].sort();
  const entriesForSlot = (slot: string) =>
    (pool as readonly PoolEntry[]).filter((e) => String(e.slot) === slot);
  const orderedForSlot = (slot: string) =>
    orderCandidatesByEp(
      entriesForSlot(slot),
      equipment,
      epWeights,
      (id) => getItem(id)?.stats ?? []
    );

  const epDeltaByItem = new Map<number, number>();
  for (const entry of pool as readonly PoolEntry[]) {
    const candidateEp = epScore(getItem(entry.itemId)?.stats ?? [], epWeights);
    let best: number | undefined;
    for (const slotName of simSlotsForPoolSlot(entry.slot)) {
      const index = SIM_ORDER.indexOf(slotName);
      if (index < 0) continue;
      const wornId = equipment[index]?.id;
      const wornEp =
        wornId === undefined
          ? 0
          : epScore(getItem(wornId)?.stats ?? [], epWeights);
      const delta = candidateEp - wornEp;
      if (best === undefined || delta > best) best = delta;
    }
    epDeltaByItem.set(entry.itemId, best ?? 0);
  }

  const xs: number[] = [];
  const ys: number[] = [];
  for (const item of items) {
    if (wornIds.has(item.itemId)) continue;
    const delta = epDeltaByItem.get(item.itemId);
    if (delta === undefined) continue;
    xs.push(delta);
    ys.push(item.deltaDps);
  }
  console.log(
    `Spearman(EP delta, truth delta DPS), n=${xs.length}: ${spearman(xs, ys).toFixed(4)}`
  );

  let oracleLowerBound = 0;
  console.log("slot            rows  above  deepestAbovePos");
  for (const slot of slots) {
    const rows = items.filter((i) => String(i.slot) === slot);
    const above = rows.filter((i) => !i.belowCutoff);
    let deepest = 0;
    orderedForSlot(slot).forEach((entry, index) => {
      const t = truthByItemId.get(entry.itemId);
      if (t && !t.belowCutoff) deepest = Math.max(deepest, index + 1);
    });
    oracleLowerBound += deepest;
    console.log(
      `${slot.padEnd(15)} ${String(rows.length).padStart(4)}  ` +
        `${String(above.length).padStart(5)}  ${String(deepest).padStart(15)}`
    );
  }
  console.log(
    `oracle lower bound L (sum of deepest above-cutoff positions): ${oracleLowerBound}`
  );

  // S(m): stop a slot after m consecutive below-cutoff rows.
  console.log("S(m) consecutive-below stop:  m  sims  misses");
  const mResults: { m: number; sims: number; misses: number }[] = [];
  for (const m of [1, 2, 3, 4, 5, 8]) {
    let sims = 0;
    let misses = 0;
    for (const slot of slots) {
      const ordered = orderedForSlot(slot);
      let consecutiveBelow = 0;
      const simmed = new Set<number>();
      for (const entry of ordered) {
        sims++;
        simmed.add(entry.itemId);
        const t = truthByItemId.get(entry.itemId);
        if (t ? t.belowCutoff : true) consecutiveBelow++;
        else consecutiveBelow = 0;
        if (consecutiveBelow >= m) break;
      }
      for (const entry of ordered) {
        const t = truthByItemId.get(entry.itemId);
        if (t && !t.belowCutoff && !simmed.has(entry.itemId)) misses++;
      }
    }
    mResults.push({ m, sims, misses });
    console.log(
      `                              ${String(m).padStart(2)}  ` +
        `${String(sims).padStart(4)}  ${String(misses).padStart(6)}`
    );
  }
  const zeroMiss = mResults.find((r) => r.misses === 0);
  console.log(
    zeroMiss
      ? `smallest zero-miss m (oracle): ${zeroMiss.m}, sims=${zeroMiss.sims}`
      : "no zero-miss m up to 8"
  );

  // G(x): stop once EP delta drops below x.
  console.log("G(x) EP-floor stop:            x  sims  misses");
  for (const x of [0, -5, -10, -20, -40]) {
    let sims = 0;
    let misses = 0;
    for (const slot of slots) {
      const ordered = orderedForSlot(slot);
      const simmed = new Set<number>();
      for (const entry of ordered) {
        if ((epDeltaByItem.get(entry.itemId) ?? 0) < x) break;
        simmed.add(entry.itemId);
        sims++;
      }
      for (const entry of ordered) {
        const t = truthByItemId.get(entry.itemId);
        if (t && !t.belowCutoff && !simmed.has(entry.itemId)) misses++;
      }
    }
    console.log(
      `                             ${String(x).padStart(3)}  ` +
        `${String(sims).padStart(4)}  ${String(misses).padStart(6)}`
    );
  }
  const minEpAmongAbove = Math.min(
    ...aboveCutoff.map((i) => epDeltaByItem.get(i.itemId) ?? Infinity)
  );
  const countAtOrAbove = [...epDeltaByItem.values()].filter(
    (v) => v >= minEpAmongAbove
  ).length;
  console.log(
    `min EP delta among above-cutoff rows (oracle): ` +
      `${Number.isFinite(minEpAmongAbove) ? minEpAmongAbove.toFixed(3) : "n/a"}; ` +
      `candidates at or above it: ${countAtOrAbove}`
  );
}

async function main(): Promise<void> {
  for (const key of ["ret", "feral", "feral-p3"]) {
    await runFixture(key);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
