/**
 * Ticket 226 diagnostics — are the head / idol / trinket cliffs real?
 *
 * Ticket 226 reports three slots on the `feral-p3` fixture where every
 * non-worn candidate loses by a margin no game fact supports: eighteen helms
 * at -174 to -254 DPS, the Phase 3 idol 21 DPS behind the worn badge idol,
 * and eleven unrelated trinkets sharing exactly -31.33 DPS. The question each
 * criterion asks is the same one: is the fork's arithmetic producing this, or
 * is it an artifact of what this repo sends over the wall?
 *
 * The recordings cannot answer that — they are one number per candidate at
 * one iteration count. This script replays the *actual requests the ranker
 * built* (captured via `direct-sim-support.ts`) through the pinned
 * `wowsimcli` at higher iteration counts, and where a criterion asks what a
 * single item contributes, sims the same request with that slot emptied.
 *
 * `measure-direct-sim-sanity.ts` establishes the precondition this rests on:
 * a captured request replayed at the recorded seed and iteration count
 * reproduces the recorded DPS exactly. So the figures below are comparable to
 * the recorded deltas, not merely of the same shape.
 *
 * **Requires the pinned binary, which is gitignored** (`vendor/`):
 *
 *   pnpm fetch:wowsimcli      # must report v0.0.101
 *
 * Run one part at a time; each prints a self-contained block:
 *
 *   npx tsx packages/core/test/measure-ticket-226-direct.ts --part a
 *   npx tsx packages/core/test/measure-ticket-226-direct.ts --part b
 *   npx tsx packages/core/test/measure-ticket-226-direct.ts --part c
 *   npx tsx packages/core/test/measure-ticket-226-direct.ts --part d
 *   npx tsx packages/core/test/measure-ticket-226-direct.ts --part e
 *
 * At roughly 2.5 s per 30,000-iteration sim, parts a-d are a few minutes
 * each. Part e reads the committed `ret` (P2) recording and runs no sims.
 */
import {
  captureFeralP3,
  captureRow,
  simDirect,
  withSlotEmptied,
  equippedIds,
  equipmentOf,
  type RowCapture,
} from "./direct-sim-support.js";
import { SIM_ORDER } from "../src/slots.js";
import { loadJson, type RosterRecordingsFile } from "./racing-support.js";
import type { RankedItem } from "../src/rank.js";

const HEAD = SIM_ORDER.indexOf("head");
const RANGED = SIM_ORDER.indexOf("ranged");

/** Ticket 226's three shapes, by the item ids the ticket names. */
const THUNDERHEART_COVER = 31039;
const CURSED_VISION = 32235;
const EVERBLOOM_IDOL = 29390;
const WHITE_STAG_IDOL = 32257;
/** The three the ticket asks to re-sim from the eleven sharing -31.33. */
const TIED_TRINKETS = [28528, 32486, 32496] as const;
const ROMULOS = 28579;

const SEED = 42;
const SCREEN = 3000;
const DEEP = 30_000;

function fmt(n: number, digits = 2) {
  return n.toFixed(digits);
}

function se(obs: { stdev: number; iterationsDone: number }) {
  return obs.stdev / Math.sqrt(obs.iterationsDone || 1);
}

function itemsById(cap: RowCapture): Map<number, RankedItem> {
  return new Map(cap.ranking.items.map((it) => [it.itemId, it]));
}

/**
 * Runs one arm and prints it against the baseline.
 *
 * The delta is arm minus baseline at the same seed and iteration count, which
 * is the same quantity `rank.ts` records. SE of the difference is reported as
 * the independent combination; same-seed arms are correlated, so this is an
 * upper bound on the true uncertainty of the difference, not an estimate.
 */
async function arm(
  label: string,
  req: Parameters<typeof simDirect>[0],
  baseline: { dps: number; stdev: number; iterationsDone: number },
  iterations: number
) {
  const obs = await simDirect(req, { iterations, seed: SEED });
  const delta = obs.dps - baseline.dps;
  const seDiff = Math.sqrt(se(obs) ** 2 + se(baseline) ** 2);
  console.log(
    `    ${label.padEnd(38)} ${fmt(obs.dps).padStart(10)} DPS  ` +
      `Δ ${fmt(delta).padStart(9)}  SE(arm) ${fmt(se(obs), 3)}  ` +
      `SE(Δ)<=${fmt(seDiff, 3)}  ${obs.wallMs} ms`
  );
  return { obs, delta, seDiff };
}

async function baselineAt(cap: RowCapture, iterations: number) {
  const obs = await simDirect(cap.baselineReq, { iterations, seed: SEED });
  console.log(
    `    ${"baseline (worn, Wolfshead 8345)".padEnd(38)} ` +
      `${fmt(obs.dps).padStart(10)} DPS  ${"".padStart(11)}  ` +
      `SE(arm) ${fmt(se(obs), 3)}  ${"".padStart(13)}  ${obs.wallMs} ms`
  );
  return obs;
}

function recordedDelta(cap: RowCapture, itemId: number): string {
  const it = itemsById(cap).get(itemId);
  return it ? `${fmt(it.deltaDps)} DPS` : "not in ranking";
}

function requireReq(cap: RowCapture, itemId: number) {
  const req = cap.requestByItemId.get(itemId);
  if (!req) throw new Error(`no captured request for item ${itemId}`);
  return req;
}

// --- 4a: is the incumbent inflated, or the candidates undervalued? --------

async function partA(cap: RowCapture) {
  console.log("=== 4a. head slot: does the ~200 DPS gap reproduce? ===\n");
  console.log(
    "  Recorded deltas on the tip fixture (RecordedSimRunner, 3000 it):"
  );
  console.log(`    31039 Thunderheart Cover   ${recordedDelta(cap, 31039)}`);
  console.log(`    32235 Cursed Vision        ${recordedDelta(cap, 32235)}\n`);

  for (const iterations of [SCREEN, DEEP]) {
    console.log(`  --- direct sims at ${iterations} iterations, seed ${SEED}`);
    const base = await baselineAt(cap, iterations);
    await arm(
      `31039 Thunderheart Cover`,
      requireReq(cap, THUNDERHEART_COVER),
      base,
      iterations
    );
    await arm(
      `32235 Cursed Vision of Sargeras`,
      requireReq(cap, CURSED_VISION),
      base,
      iterations
    );
    console.log("");
  }
  console.log(
    "  Read: if the gap reproduces here it is the fork's arithmetic, since\n" +
      "  these are the ranker's own requests run against the pinned binary.\n" +
      "  If it collapses, the defect is on our side of the wall.\n"
  );
}

// --- 4b: what inflates it? ------------------------------------------------

async function partB(cap: RowCapture) {
  console.log("=== 4b. head slot: what does the incumbent contribute? ===\n");

  console.log("  (i) baseline with the head slot emptied — Wolfshead's whole");
  console.log("      contribution, effect and stats together.\n");
  const base = await baselineAt(cap, DEEP);
  const empty = await arm(
    "baseline, head slot emptied",
    withSlotEmptied(cap.baselineReq, HEAD),
    base,
    DEEP
  );

  console.log("\n  (ii) equipment diff, Thunderheart vs baseline, by slot:");
  const baseItems = equipmentOf(cap.baselineReq).items ?? [];
  const candItems =
    equipmentOf(requireReq(cap, THUNDERHEART_COVER)).items ?? [];
  let differing = 0;
  for (let i = 0; i < Math.max(baseItems.length, candItems.length); i++) {
    const a = JSON.stringify(baseItems[i] ?? {});
    const b = JSON.stringify(candItems[i] ?? {});
    if (a !== b) {
      differing++;
      console.log(`      ${SIM_ORDER[i] ?? `slot${i}`}`);
      console.log(`        baseline  ${a}`);
      console.log(`        candidate ${b}`);
    }
  }
  console.log(
    `      ${differing} slot(s) differ — if only 'head', no gem or set\n` +
      `      side-effect rides along with the swap.\n`
  );

  console.log("  (iii) reading:");
  console.log(
    `      Wolfshead's whole contribution = ${fmt(-empty.delta)} DPS.\n` +
      `      Ticket 226's candidate deltas span -173.97 to -253.60 DPS.\n` +
      `      If those sit at or below the whole-helm figure, the candidates\n` +
      `      are not being charged something extra: the incumbent's effect is\n` +
      `      simply worth that much and is counted correctly.\n` +
      `      Wolfshead's energy-on-shift is implemented at\n` +
      `      vendor/tbc-new-fork/sim/druid/forms.go:92,147 via HasItemEquipped(8345),\n` +
      `      not core.NewItemEffect — which is why the effects classifier\n` +
      `      labels it 'stub'. That is a classifier blind spot, not a sim gap.\n`
  );
}

// --- 4c: the eleven trinkets at -31.33 -----------------------------------

async function partC(cap: RowCapture) {
  console.log(
    "=== 4c. trinkets: is -31.33 the worn trinket's own value? ===\n"
  );

  console.log("  Re-derived on the tip fixture (the ticket's dump predates");
  console.log(
    "  the 57ec814 re-record, so its figures are not quoted here):\n"
  );

  const byId = itemsById(cap);
  const trinkets = cap.ranking.items
    .filter((it) => it.slot === "trinket")
    .sort((a, b) => b.deltaDps - a.deltaDps);
  const counts = new Map<string, number>();
  for (const t of trinkets) {
    const k = fmt(t.deltaDps);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const t of trinkets) {
    const k = fmt(t.deltaDps);
    const tie =
      (counts.get(k) ?? 0) > 1 ? `  <-- shared by ${counts.get(k)}` : "";
    console.log(
      `    ${fmt(t.deltaDps).padStart(9)}  ${String(t.itemId).padEnd(7)}` +
        `${(t.slotChoice ?? "").padEnd(9)} ${t.name}${tie}`
    );
  }

  const shared = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
  console.log(
    `\n  Largest tie group on tip: ${
      shared[0] ? `${shared[0][1]} items at ${shared[0][0]} DPS` : "none"
    }\n`
  );

  console.log("  Worn trinkets and what emptying each slot costs:\n");
  const base = await baselineAt(cap, DEEP);
  for (const idx of [
    SIM_ORDER.indexOf("trinket1"),
    SIM_ORDER.indexOf("trinket2"),
  ]) {
    const wornId = equippedIds(cap.baselineReq)[idx];
    await arm(
      `${SIM_ORDER[idx]} emptied (was ${wornId})`,
      withSlotEmptied(cap.baselineReq, idx),
      base,
      DEEP
    );
  }

  console.log("\n  Three of the tied eleven, plus Romulo's just outside it:\n");
  for (const id of [...TIED_TRINKETS, ROMULOS]) {
    const it = byId.get(id);
    await arm(
      `${id} ${it?.name ?? "?"} (rec ${recordedDelta(cap, id)})`,
      requireReq(cap, id),
      base,
      DEEP
    );
  }
  console.log(
    "\n  Read: if a tied trinket's direct delta equals the cost of emptying\n" +
      "  the slot it replaces, those items contribute literally nothing and\n" +
      "  the shared value is the incumbent's loss showing through.\n"
  );
}

// --- 4d: the idol gap -----------------------------------------------------

async function partD(cap: RowCapture) {
  console.log("=== 4d. ranged: Everbloom Idol vs Idol of the White Stag ===\n");
  console.log(`  Recorded: 32257 ${recordedDelta(cap, WHITE_STAG_IDOL)}`);
  console.log(`  Worn:     ${EVERBLOOM_IDOL} Everbloom Idol\n`);

  for (const iterations of [SCREEN, DEEP]) {
    console.log(`  --- direct sims at ${iterations} iterations, seed ${SEED}`);
    const base = await baselineAt(cap, iterations);
    await arm(
      "32257 Idol of the White Stag",
      requireReq(cap, WHITE_STAG_IDOL),
      base,
      iterations
    );
    await arm(
      "ranged slot emptied (no idol at all)",
      withSlotEmptied(cap.baselineReq, RANGED),
      base,
      iterations
    );
    console.log("");
  }
  console.log(
    "  Read: an idol carries no stat line, so any gap is effect or rotation.\n" +
      "  The emptied-slot arm bounds it — it is what wearing no idol costs, so\n" +
      "  a candidate idol scoring at that figure is contributing nothing.\n"
  );
}

// --- 4e: feral-only, or ret too? -----------------------------------------

/**
 * Prints one row's per-slot truth deltas and flags shared-value groups.
 *
 * The shape ticket 171 and ticket 226 both turn on is a group of unrelated
 * items landing on one delta to many decimal places. Grouping on the full
 * float (not a rounded string) is what makes that visible: two items that
 * merely round the same are not the same finding.
 */
function slotTruth(cap: RowCapture, label: string, slots: readonly string[]) {
  console.log(`  --- ${label}`);
  for (const slot of slots) {
    const rows = cap.ranking.items
      .filter((it) => it.slot === slot)
      .sort((a, b) => b.deltaDps - a.deltaDps);
    if (rows.length === 0) {
      console.log(`    ${slot}: no candidates\n`);
      continue;
    }
    const exact = new Map<number, number>();
    for (const r of rows)
      exact.set(r.deltaDps, (exact.get(r.deltaDps) ?? 0) + 1);
    const biggest = [...exact.entries()].sort((a, b) => b[1] - a[1])[0];
    console.log(
      `    ${slot}: ${rows.length} rows, span ${fmt(rows[rows.length - 1]!.deltaDps)}` +
        ` .. ${fmt(rows[0]!.deltaDps)} DPS; largest exact tie group ` +
        `${biggest ? `${biggest[1]} item(s)` : "none"}`
    );
    for (const r of rows) {
      const n = exact.get(r.deltaDps) ?? 1;
      const tie = n > 1 ? `  <-- ${n} share this exact value` : "";
      console.log(
        `      ${fmt(r.deltaDps).padStart(9)}  ${String(r.itemId).padEnd(7)}${r.name}${tie}`
      );
    }
    console.log("");
  }
}

async function partE() {
  console.log("=== 4e. does ret show the same shapes? ===\n");
  console.log(
    "  There is NO recorded ret-p3 row. The committed fixture holds three\n" +
      "  rows: ret (maxPhase 2), feral (maxPhase 2), feral-p3 (maxPhase 3).\n" +
      "  `data/universes/ret-p3.json` exists as a universe, but no recorded\n" +
      "  truth was ever made for it, so this part reads the ret P2 row and\n" +
      "  live ret-p3 sims stay out of scope (ticket 226 forbids re-recording).\n"
  );

  const file = loadJson<RosterRecordingsFile>(
    "packages/core/test/fixtures/synthetic-roster-recordings.json"
  );
  for (const [name, row] of Object.entries(file.rows)) {
    console.log(
      `    ${name.padEnd(10)} spec ${row.spec.padEnd(6)} maxPhase ${row.maxPhase}` +
        `  pool ${String(row.poolSize).padStart(4)}  above ${String(
          row.aboveCutoffCount
        ).padStart(3)}  recordings ${Object.keys(row.recordings).length}`
    );
  }
  console.log("");

  const ret = await captureRow("ret");
  slotTruth(ret, "ret (P2) — the slots ticket 226 flags on feral", [
    "head",
    "trinket",
    "ranged",
  ]);

  const feral = await captureFeralP3();
  slotTruth(feral, "feral-p3 — for side-by-side comparison", [
    "head",
    "trinket",
    "ranged",
  ]);

  console.log(
    "  Read: a shared exact value across unrelated items is the ticket 171 /\n" +
      "  ticket 226 signature. Compare whether ret's slots show it too — if\n" +
      "  they do, the mechanism is spec-independent; if only feral does, the\n" +
      "  cause is in feral's own item handling.\n"
  );
}

async function main() {
  const part = (process.argv[process.argv.indexOf("--part") + 1] ?? "").trim();
  if (!["a", "b", "c", "d", "e"].includes(part)) {
    console.error(
      "usage: npx tsx packages/core/test/measure-ticket-226-direct.ts --part a|b|c|d|e"
    );
    process.exit(2);
  }

  console.log(`measure-ticket-226-direct --part ${part}\n`);

  if (part === "e") {
    await partE();
    return;
  }

  const cap = await captureFeralP3();
  console.log(
    `  captured ${cap.calls.length} requests; fixture pool ` +
      `${cap.recorded.poolSize}, above cutoff ${cap.recorded.aboveCutoffCount}, ` +
      `baseline ${cap.recorded.baselineDps}\n`
  );

  if (part === "a") await partA(cap);
  if (part === "b") await partB(cap);
  if (part === "c") await partC(cap);
  if (part === "d") await partD(cap);
}

await main();
