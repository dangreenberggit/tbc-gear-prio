/**
 * Does replaying a captured request reproduce the recorded number?
 *
 * Everything the ticket 226 / 227 diagnostics conclude rests on one
 * assumption: that the requests `rank.ts` builds, replayed through the pinned
 * `wowsimcli` at the same seed and iteration count, return what the fixture
 * recorded. If they do, a direct sim at 30,000 iterations is measuring the
 * same thing the recording measured, only more precisely, and "exact"
 * comparisons are meaningful. If they do not, every later comparison has to
 * be read as |Δ| against SE instead, and this script is where that is found
 * out rather than three diagnostics later.
 *
 * It also times one geared sim at 30,000 iterations, because the diagnostic
 * scripts budget their runtime from that figure.
 *
 * **Requires the pinned binary, which is gitignored** (`vendor/`):
 *
 *   pnpm fetch:wowsimcli      # must report v0.0.101
 *
 * Run with:
 *
 *   npx tsx packages/core/test/measure-direct-sim-sanity.ts
 */
import {
  captureFeralP3,
  equippedIds,
  simDirect,
  binaryPath,
} from "./direct-sim-support.js";

function fmt(n: number, digits = 4) {
  return n.toFixed(digits);
}

async function main() {
  console.log("measure-direct-sim-sanity — tickets 226/227 precondition\n");
  console.log(`  binary  ${binaryPath()}`);

  const cap = await captureFeralP3();
  const { recorded } = cap;
  console.log(
    `  fixture feral-p3: pool ${recorded.poolSize}, above cutoff ` +
      `${recorded.aboveCutoffCount}, ${recorded.iterations} iters, seed ` +
      `${recorded.seed}, ${Object.keys(recorded.recordings).length} recordings`
  );
  console.log(`  captured ${cap.calls.length} requests from the full sweep`);
  console.log(
    `  baseline equips ${equippedIds(cap.baselineReq).filter((v) => v !== undefined).length} items\n`
  );

  // --- 1. replay the baseline at the recorded seed and iterations ---------
  console.log("=== 1. baseline replay at the recorded seed/iterations ===");
  console.log(`  recorded baseline DPS   ${recorded.baselineDps}`);

  const replay = await simDirect(cap.baselineReq, {
    iterations: recorded.iterations,
    seed: recorded.seed,
  });
  console.log(`  direct   baseline DPS   ${replay.dps}`);
  console.log(
    `  stdev ${fmt(replay.stdev)}   iterationsDone ${replay.iterationsDone}` +
      `   wall ${replay.wallMs} ms`
  );

  const delta = replay.dps - recorded.baselineDps;
  const se = replay.stdev / Math.sqrt(replay.iterationsDone || 1);
  const exact = replay.dps === recorded.baselineDps;
  console.log(
    `  Δ ${fmt(delta)} DPS  (SE ${fmt(se, 4)}; ` +
      `${se === 0 ? "n/a" : fmt(Math.abs(delta) / se, 2)} SE)`
  );
  console.log(
    exact
      ? "  MATCH — exact to the decimal. Direct comparisons are exact.\n"
      : "  NO EXACT MATCH — report later comparisons as |Δ| against SE.\n"
  );

  // --- 2. cost of one geared sim at 30,000 iterations ---------------------
  console.log("=== 2. cost of one geared sim at 30,000 iterations ===");
  const big = await simDirect(cap.baselineReq, {
    iterations: 30_000,
    seed: recorded.seed,
  });
  console.log(
    `  DPS ${fmt(big.dps)}  stdev ${fmt(big.stdev)}  ` +
      `SE ${fmt(big.stdev / Math.sqrt(big.iterationsDone || 1), 4)}`
  );
  console.log(
    `  iterationsDone ${big.iterationsDone}   wall ${big.wallMs} ms\n`
  );
}

await main();
