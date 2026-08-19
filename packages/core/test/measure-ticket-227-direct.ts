/**
 * Ticket 227 diagnostics — are the healer rows noise, or a scoring path?
 *
 * Ticket 227 reports ten healer-statted items (intellect, healing power,
 * spellpower, spirit, mp5, and no melee stat at all) scoring +4.61 to +7.80
 * DPS for a feral druid and clearing the cutoff. It offers a hypothesis it
 * explicitly marks untested: that these are noise-positives, because the
 * fixture's own SE at 3,000 iterations is about the same size as the cutoff
 * being applied to it.
 *
 * That hypothesis makes a falsifiable prediction — re-sim at materially more
 * iterations and the deltas collapse toward zero. This script runs it. Each
 * arm is the ranker's own captured request replayed through the pinned
 * `wowsimcli`, so the comparison is against the same quantity `rank.ts`
 * recorded (`measure-direct-sim-sanity.ts` establishes that a replay
 * reproduces the recording exactly).
 *
 * **Requires the pinned binary, which is gitignored** (`vendor/`):
 *
 *   pnpm fetch:wowsimcli      # must report v0.0.101
 *
 * Run with:
 *
 *   npx tsx packages/core/test/measure-ticket-227-direct.ts
 *
 * Roughly 2.5 s per 30,000-iteration sim; the ten items plus the seed sweep
 * put this in the few-minutes range.
 */
import {
  captureFeralP3,
  simDirect,
  type RowCapture,
} from "./direct-sim-support.js";
import { CUTOFF_FERAL, meetsCutoff } from "../src/cutoff.js";
import { loadJson } from "./racing-support.js";
import type { RankedItem } from "../src/rank.js";

/** The ten ids ticket 227 lists, in the order the ticket's table gives them. */
const HEALER_IDS = [
  29308, 29309, 32609, 32516, 29920, 29984, 29989, 28822, 29307, 28661,
] as const;

/** Two of the ten, re-run across seeds for an empirical SE of the delta. */
const SEED_SWEEP_IDS = [29308, 28822] as const;
const SWEEP_SEEDS = [11, 22, 33, 44, 55] as const;

const SEED = 42;
const SCREEN = 3000;
const DEEP = 30_000;

type ItemIndex = Record<string, { name: string; stats: number[] } | undefined>;

/** `enum Stat` indices, from `data/proto/common.proto`. */
const STAT_NAMES: Record<number, string> = {
  0: "str",
  1: "agi",
  2: "sta",
  3: "int",
  4: "healing",
  5: "spellpower",
  16: "spirit",
  17: "AP",
  20: "melee-hit",
  21: "melee-crit",
  35: "mp5",
};

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

function seOf(obs: { stdev: number; iterationsDone: number }) {
  return obs.stdev / Math.sqrt(obs.iterationsDone || 1);
}

function statLine(idx: ItemIndex, itemId: number): string {
  const entry = idx[String(itemId)];
  if (!entry) return "not in data/items/index.json";
  const parts = entry.stats
    .map((v, i) => (v ? `${STAT_NAMES[i] ?? `stat${i}`} ${v}` : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "(empty stat map)";
}

/**
 * The fixture's own error bar, per row and pooled.
 *
 * `stdev` is a per-iteration population sd with no `/sqrt(N)` applied
 * (`vendor/tbc-new-fork/sim/core/sim_concurrent.go:138`), so SE of the mean
 * is `stdev/sqrt(iterationsDone)`.
 */
function fixtureSe(cap: RowCapture) {
  const obs = Object.values(cap.recorded.recordings);
  const meanStdev = obs.reduce((a, o) => a + o.stdev, 0) / obs.length;
  return {
    meanStdev,
    se: meanStdev / Math.sqrt(cap.recorded.iterations),
    n: obs.length,
  };
}

function boundary(cap: RowCapture) {
  const pctArm = (CUTOFF_FERAL.pct / 100) * cap.recorded.baselineDps;
  return {
    pctArm,
    absArm: CUTOFF_FERAL.absDps,
    effective: Math.min(pctArm, CUTOFF_FERAL.absDps),
  };
}

function byId(cap: RowCapture): Map<number, RankedItem> {
  return new Map(cap.ranking.items.map((it) => [it.itemId, it]));
}

// --- the re-derived table -------------------------------------------------

function reDerivedTable(cap: RowCapture, idx: ItemIndex) {
  console.log("=== The ticket's table, re-derived on the tip fixture ===\n");
  console.log(
    "  Ticket 227's own figures (86 above cutoff, pool 398, SE 2.9605) come\n" +
      "  from the fixture as it stood BEFORE the re-record in `57ec814`. The\n" +
      "  numbers below replace them; the ticket's are not quoted as current.\n"
  );

  const f = fixtureSe(cap);
  const b = boundary(cap);
  console.log(
    `  pool ${cap.recorded.poolSize}   above cutoff ${cap.recorded.aboveCutoffCount}   ` +
      `recordings ${f.n}   iterations ${cap.recorded.iterations}   seed ${cap.recorded.seed}`
  );
  console.log(`  baseline ${cap.recorded.baselineDps}`);
  console.log(
    `  mean stdev ${fmt(f.meanStdev, 4)}   SE@${cap.recorded.iterations} = ${fmt(f.se, 4)} DPS`
  );
  console.log(
    `  cutoff: absDps arm ${fmt(b.absArm)} DPS, pct arm ${fmt(b.pctArm, 4)} DPS ` +
      `(${CUTOFF_FERAL.pct}% of baseline) -> effective ${fmt(b.effective, 4)} DPS`
  );
  console.log(
    `  SE is ${f.se > b.effective ? "LARGER" : "smaller"} than the effective cutoff ` +
      `(${fmt(f.se, 4)} vs ${fmt(b.effective, 4)}) — the ticket's central point.\n`
  );

  const items = byId(cap);
  console.log(
    "  id      slot     delta    ownSE   sigma  clears  name / stat line"
  );
  for (const id of HEALER_IDS) {
    const it = items.get(id);
    if (!it) {
      console.log(`  ${id}  NOT IN THE TIP RANKING`);
      continue;
    }
    const sigma = it.deltaDps / f.se;
    const clears = meetsCutoff(it.deltaDps, it.deltaPct, CUTOFF_FERAL);
    console.log(
      `  ${String(id).padEnd(7)} ${it.slot.padEnd(8)} ${fmt(it.deltaDps).padStart(6)}  ` +
        `${fmt(it.se, 3).padStart(6)}  ${fmt(sigma).padStart(5)}  ${
          clears ? "yes" : "NO "
        }     ${it.name}`
    );
    console.log(`  ${"".padEnd(38)}${statLine(idx, id)}`);
  }
  const stillAbove = HEALER_IDS.filter((id) => {
    const it = items.get(id);
    return it && meetsCutoff(it.deltaDps, it.deltaPct, CUTOFF_FERAL);
  });
  console.log(
    `\n  ${stillAbove.length} of the ten still clear the cutoff on tip.\n`
  );
  return f;
}

// --- 5a: do they survive more iterations? --------------------------------

async function partA(cap: RowCapture) {
  console.log("=== 5a. do the healer rows survive 30,000 iterations? ===\n");
  const items = byId(cap);

  const base = await simDirect(cap.baselineReq, {
    iterations: DEEP,
    seed: SEED,
  });
  console.log(
    `  baseline @${DEEP}, seed ${SEED}: ${fmt(base.dps, 4)} DPS ` +
      `(SE ${fmt(seOf(base), 4)})\n`
  );

  console.log(
    "  id      recorded@3000   direct@30000     ownSE   SE(Δ)<=  clears  name"
  );
  const results: { id: number; recorded: number; deep: number }[] = [];
  for (const id of HEALER_IDS) {
    const it = items.get(id);
    const req = cap.requestByItemId.get(id);
    if (!it || !req) {
      console.log(`  ${id}  no captured request — skipped`);
      continue;
    }
    const obs = await simDirect(req, { iterations: DEEP, seed: SEED });
    const delta = obs.dps - base.dps;
    const seDiff = Math.sqrt(seOf(obs) ** 2 + seOf(base) ** 2);
    const deltaPct = (delta / base.dps) * 100;
    const clears = meetsCutoff(delta, deltaPct, CUTOFF_FERAL);
    results.push({ id, recorded: it.deltaDps, deep: delta });
    console.log(
      `  ${String(id).padEnd(7)} ${fmt(it.deltaDps).padStart(8)}      ` +
        `${fmt(delta).padStart(8)}      ${fmt(seOf(obs), 3).padStart(6)}  ` +
        `${fmt(seDiff, 3).padStart(6)}   ${clears ? "yes" : "NO "}    ${it.name}`
    );
  }

  const collapsed = results.filter(
    (r) => Math.abs(r.deep) < Math.abs(r.recorded)
  );
  console.log(
    `\n  ${collapsed.length} of ${results.length} moved toward zero at 10x the\n` +
      `  iterations. The hypothesis predicts they collapse below the cutoff;\n` +
      `  holding at +5..+8 DPS would refute it and mean healing stats are\n` +
      `  genuinely reaching the DPS calculation.\n`
  );

  // --- empirical SE of the delta across seeds ---------------------------
  console.log("  --- empirical SE of the delta, seeds 11/22/33/44/55 @3000\n");
  console.log(
    "  Same-seed arms share the random stream, so their difference is\n" +
      "  correlated and its spread across seeds is the honest error bar —\n" +
      "  smaller than combining two independent per-arm SEs would suggest.\n"
  );
  for (const id of SEED_SWEEP_IDS) {
    const req = cap.requestByItemId.get(id);
    if (!req) continue;
    const deltas: number[] = [];
    for (const seed of SWEEP_SEEDS) {
      const b = await simDirect(cap.baselineReq, {
        iterations: SCREEN,
        seed,
      });
      const a = await simDirect(req, { iterations: SCREEN, seed });
      deltas.push(a.dps - b.dps);
    }
    const mean = deltas.reduce((x, y) => x + y, 0) / deltas.length;
    const sd = Math.sqrt(
      deltas.reduce((acc, d) => acc + (d - mean) ** 2, 0) / (deltas.length - 1)
    );
    console.log(
      `    ${id}  deltas ${deltas.map((d) => fmt(d)).join(", ")}\n` +
        `           mean ${fmt(mean)}  sd ${fmt(sd, 3)}  ` +
        `SE(mean of 5) ${fmt(sd / Math.sqrt(deltas.length), 3)}`
    );
  }
  console.log("");
}

// --- 5b: is any healer stat reaching the DPS calculation? ----------------

function partB() {
  console.log("=== 5b. do healer stats carry EP weight for feral? ===\n");
  const weights = loadJson<{ weights: Record<string, number> }>(
    "data/presets/feral/p1.ep-weights.json"
  ).weights;
  const keys = Object.keys(weights)
    .map(Number)
    .sort((a, b) => a - b);
  console.log("  data/presets/feral/p1.ep-weights.json keys:\n");
  for (const k of keys) {
    console.log(
      `    ${String(k).padStart(3)}  ${(STAT_NAMES[k] ?? "?").padEnd(12)} ${weights[String(k)]}`
    );
  }
  const healerStats = [3, 4, 5, 16, 35];
  const present = healerStats.filter((s) => keys.includes(s));
  console.log(
    `\n  Healer stat indices (int 3, healing 4, spellpower 5, spirit 16,\n` +
      `  mp5 35) present in the weights: ${present.length ? present.join(", ") : "NONE"}.\n`
  );
  console.log(
    "  What EP does and does not do. `orderCandidatesByEp` (rank.ts) uses\n" +
      "  these weights to ORDER the pool, which decides what gets simmed\n" +
      "  first and, under racing, what gets promoted. The delta itself comes\n" +
      "  from the sim, not from EP. So a non-zero weight would explain pool\n" +
      "  membership and ordering; it could not by itself produce a positive\n" +
      "  DPS delta. With no healer stat weighted at all, EP is not even the\n" +
      "  membership explanation here — pool membership comes from the\n" +
      "  universe and the phase filter.\n"
  );
}

// --- 5c: per-item variance from the recordings ---------------------------

function partC(cap: RowCapture) {
  console.log("=== 5c. per-item variance, not the pool mean ===\n");
  console.log(
    "  The sigma column above uses one fixture-wide mean stdev. Each row's\n" +
      "  own recorded `stdev` and `iterationsDone` are what its own sigma\n" +
      "  should rest on. They are joined back through the captured request's\n" +
      "  `simCacheKey` — the same identity the recorder wrote them under, so\n" +
      "  this is that row's variance and not a lookup by name.\n"
  );
  const items = byId(cap);
  const f = fixtureSe(cap);
  const b = boundary(cap);
  console.log(
    "  id      delta   ownStdev  iters   ownSE   d/ownSE  (d-cut)/ownSE  name"
  );
  for (const id of HEALER_IDS) {
    const it = items.get(id);
    if (!it) continue;
    const call = cap.requestByItemId.get(id)
      ? [...cap.byKey.values()].find(
          (c) => c.req === cap.requestByItemId.get(id)
        )
      : undefined;
    const rec = call ? cap.recorded.recordings[call.key] : undefined;
    const ownSe = rec ? rec.stdev / Math.sqrt(rec.iterationsDone) : it.se;
    console.log(
      `  ${String(id).padEnd(7)} ${fmt(it.deltaDps).padStart(6)}  ` +
        `${rec ? fmt(rec.stdev, 2).padStart(8) : "  (n/a)"}  ` +
        `${String(rec?.iterationsDone ?? cap.recorded.iterations).padStart(5)}  ` +
        `${fmt(ownSe, 3).padStart(6)}  ${fmt(it.deltaDps / ownSe).padStart(7)}  ` +
        `${fmt((it.deltaDps - b.effective) / ownSe).padStart(13)}   ${it.name}`
    );
  }
  console.log(
    `\n  Pool-wide mean SE for comparison: ${fmt(f.se, 4)} DPS. A row whose own\n` +
      `  SE is close to that is fairly described by the pooled sigma; one that\n` +
      `  is not needs its own. The last column is the one that matters for\n` +
      `  "is this row really above the line": distance past the cutoff\n` +
      `  measured in that row's own error bars.\n`
  );
}

// --- 5d: how many above-cutoff rows are near the boundary? ---------------

function partD(cap: RowCapture) {
  console.log(
    "=== 5d. how much of the above-cutoff set is boundary noise? ===\n"
  );
  const b = boundary(cap);
  const above = cap.ranking.items.filter((it) =>
    meetsCutoff(it.deltaDps, it.deltaPct, CUTOFF_FERAL)
  );
  const within1 = above.filter((it) => it.deltaDps - b.effective < 1 * it.se);
  const within2 = above.filter((it) => it.deltaDps - b.effective < 2 * it.se);
  console.log(
    `  rows clearing the cutoff:            ${above.length}\n` +
      `  of those, delta - cutoff < 1x ownSE: ${within1.length}\n` +
      `  of those, delta - cutoff < 2x ownSE: ${within2.length}\n` +
      `  effective cutoff ${fmt(b.effective, 4)} DPS\n`
  );
  console.log(
    "  Consequences, stated as consequences and not acted on here:\n\n" +
      "  - `synthetic-fixtures.test.ts` asserts an aboveCutoffCount on this\n" +
      "    fixture. If a large share of that count sits within its own error\n" +
      "    bar of the boundary, the assertion is pinning a number that a\n" +
      "    re-record at a different seed would move — it is a change detector,\n" +
      "    not a correctness gate. Changing it is out of scope here.\n" +
      "  - Ticket 225 closed on the band-above rows. Those rows carry ordinary\n" +
      "    stat-driven deltas, so this does not reopen it, but the count it\n" +
      "    reasoned over has the same error bar.\n"
  );
}

// --- 5e: the product question --------------------------------------------

function partE() {
  console.log(
    "=== 5e. should role-inappropriate items be pooled at all? ===\n"
  );
  console.log(
    "  THIS IS A PRODUCT QUESTION AND IS NOT ANSWERED HERE. The executor\n" +
      "  cannot rule on it; it is recorded with options and a recommendation\n" +
      "  so the owner can. Ticket 227's checkbox stays open.\n"
  );
  console.log(
    "  Option 1 — exclude, as ticket 171 did. Precedent: ticket 171's\n" +
      "  resolution (2026-08-15) excludes stub-only items from the pool. That\n" +
      "  is precedent for excluding on a 'this cannot help you' basis, but it\n" +
      "  is not the same test: 171 excluded on an implementation gap, and a\n" +
      "  healer ring is correctly simulated, it just does nothing.\n\n" +
      "  Option 2 — keep and caveat. Keeps the pool honest about what was\n" +
      "  considered and lets the noise floor stay visible, but the report must\n" +
      "  not present these rows as upgrades without saying why they are there.\n\n" +
      "  Option 3 — keep as-is. Cheapest, and defensible only if the reader is\n" +
      "  assumed to know that a sub-2-sigma row is not a recommendation.\n\n" +
      "  Recommendation: option 2, because 5a's measurement decides whether\n" +
      "  these rows are noise or signal, and a caveat is correct under either\n" +
      "  answer, whereas exclusion bakes in a judgment about role relevance\n" +
      "  that the sim does not make.\n"
  );
}

async function main() {
  console.log(
    "measure-ticket-227-direct — healer rows above the feral cutoff\n"
  );
  const cap = await captureFeralP3();
  const idx = loadJson<ItemIndex>("data/items/index.json");
  console.log(`  captured ${cap.calls.length} requests from the full sweep\n`);

  reDerivedTable(cap, idx);
  await partA(cap);
  partB();
  partC(cap);
  partD(cap);
  partE();
}

await main();
