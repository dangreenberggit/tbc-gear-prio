/**
 * Pure logic behind `pnpm verify`'s tail summary line.
 *
 * The problem this exists to fix: CI never clones `vendor/tbc-new-fork`
 * (gitignored, main checkout only), so seven `pnpm verify` steps and several
 * vitest test files skip cleanly (exit 0 / a "skipped" assertion) rather than
 * fail when it is absent. A CI run that tested none of the ported engine
 * emits the same green tick as a full local run — nothing counted the
 * difference. This module counts it: `run_verify.mjs` collects each step's
 * captured output and vitest's JSON report, and these functions turn that
 * into one summary line plus one line per skip reason.
 *
 * Deliberately has no knowledge of *which* scripts are fork-gated — it only
 * recognizes the "<name>: skipped -- <reason>" shape those scripts already
 * print (all seven use it; verified by hand against each script's source).
 * A verify step gaining or losing a fork guard needs no edit here.
 */

/**
 * @param {string} output combined stdout+stderr of one verify step
 * @returns {string[]} every line containing "skipped -- <reason>", in order
 *
 * The shared shape across all seven fork-gated scripts is the substring
 * "skipped -- <reason>", not a fixed "<name>: skipped" prefix --
 * check_equip_eligibility.py:239 reads "...Fork diff skipped -- vendor/..."
 * with prose ahead of "skipped", not a bare name. Matching on the substring
 * rather than anchoring at the line start catches that shape too.
 */
export function extractPythonSkips(output) {
  const matches = output.matchAll(/^.*\bskipped\s*--\s*.+$/gm);
  return Array.from(matches, (m) => m[0].trim());
}

/**
 * @param {{numTotalTests?: number, numPendingTests?: number, testResults?: Array<{assertionResults?: Array<{status: string, fullName: string}>}>}} report
 *   vitest's `--reporter=json` output
 * @returns {{ran: number, skipped: number, reasons: string[]}}
 */
export function extractVitestSkips(report) {
  const results = report.testResults ?? [];
  let ran = 0;
  let skipped = 0;
  /** @type {string[]} */
  const reasons = [];
  for (const file of results) {
    for (const assertion of file.assertionResults ?? []) {
      if (assertion.status === "skipped") {
        skipped += 1;
        // vitest's JSON reporter carries no separate reason field for a
        // skipped assertion. This repo's convention (wowsims-fork-parity.
        // test.ts) is a paired describe.skipIf whose body is a single it()
        // that does nothing but name why — so the fullName IS the reason.
        reasons.push(assertion.fullName);
      } else {
        ran += 1;
      }
    }
  }
  return { ran, skipped, reasons };
}

/**
 * @param {{
 *   pythonSkips: string[],
 *   vitest: {ran: number, skipped: number, reasons: string[]},
 *   layout: string | null,
 * }} input
 *   `vitest.ran`/`vitest.skipped` already fold in every non-fork-gated
 *   verify step as "ran 1" each — see run_verify.mjs's call site, which adds
 *   the step-level count before calling this function.
 * @returns {string}
 */
export function formatSummary({ pythonSkips, vitest, layout }) {
  const skippedCount = pythonSkips.length + vitest.skipped;
  const lines = [`gates: ${vitest.ran} ran, ${skippedCount} skipped`];
  if (skippedCount > 0) {
    lines.push("skip reasons:");
    for (const reason of pythonSkips) lines.push(`  ${reason}`);
    for (const reason of vitest.reasons) lines.push(`  ${reason}`);
  }
  if (layout) {
    lines.push(layout);
  }
  return lines.join("\n");
}

const FAILURE_MESSAGE_LINES = 4;

/**
 * @param {{testResults?: Array<{name: string, status?: string, message?: string, assertionResults?: Array<{status: string, fullName: string, failureMessages?: string[]}>}>}} report
 *   vitest's `--reporter=json` output
 * @param {string} root prefix stripped from each test file path
 * @returns {string} one entry per failed test, or per failed file with no
 *   failed test (an import error), each with the start of its message; ""
 *   when nothing failed
 *
 * `pnpm verify` runs vitest with only the JSON reporter, so without this a
 * red test step printed no test name at all.
 */
export function formatVitestFailures(report, root) {
  const rel = (file) => {
    const f = file.replaceAll("\\", "/");
    const r = root.replaceAll("\\", "/").replace(/\/?$/, "/");
    return f.toLowerCase().startsWith(r.toLowerCase()) ? f.slice(r.length) : f;
  };
  const excerpt = (message) => {
    const lines = message.trimEnd().split("\n");
    const kept = lines.slice(0, FAILURE_MESSAGE_LINES).map((l) => `    ${l}`);
    if (lines.length > FAILURE_MESSAGE_LINES)
      kept.push(
        `    ... (${lines.length - FAILURE_MESSAGE_LINES} more lines in the JSON report)`
      );
    return kept;
  };
  const entries = [];
  for (const file of report.testResults ?? []) {
    const failed = (file.assertionResults ?? []).filter(
      (a) => a.status === "failed"
    );
    for (const a of failed)
      entries.push([
        `  FAIL ${rel(file.name)} > ${a.fullName}`,
        ...excerpt((a.failureMessages ?? []).join("\n")),
      ]);
    if (failed.length === 0 && file.status === "failed")
      entries.push([
        `  FAIL ${rel(file.name)}`,
        ...excerpt(file.message ?? ""),
      ]);
  }
  if (entries.length === 0) return "";
  return [`vitest failures (${entries.length}):`, ...entries.flat()].join("\n");
}
