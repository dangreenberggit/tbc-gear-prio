#!/usr/bin/env node
/**
 * Runs `pnpm verify`'s step chain and prints a tail summary counting how many
 * gates actually ran versus skipped (ticket 400).
 *
 * The problem: CI never restores `vendor/tbc-new-fork` (gitignored), so seven
 * of verify's python steps and several vitest test files skip cleanly (exit 0
 * / a "skipped" assertion) when it's absent. A CI run that tested none of the
 * ported engine emitted the same green tick as a full local run — nothing
 * counted the difference. This script is that count.
 *
 * Deliberately step-generic: it reads the step list out of package.json's own
 * `verify` script rather than hardcoding which steps are fork-gated, and
 * detects a skip by the "<name>: skipped -- <reason>" line each fork-gated
 * python script already prints (verified against every one of the seven by
 * hand — see the handoff for this ticket). A step gaining or losing a fork
 * guard needs no edit here.
 *
 * `preflight:node` is excluded from the step list: it is a version guard, not
 * a gate, and this script already requires Node to run at all.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  extractPythonSkips,
  extractVitestSkips,
  formatSummary,
  formatVitestFailures,
} from "./verify_summary.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

/**
 * @returns {string[]} `pnpm run <script>` names, in order, from package.json's
 *   `verify:steps` chain.
 *
 * `verify` itself is just `preflight:node && node scripts/run_verify.mjs` (the
 * preflight check runs outside this script, before Node's own version could
 * be the reason a step fails oddly) -- the real step list lives in
 * `verify:steps` so both `pnpm run verify:steps` (the old plain chain, kept as
 * an escape hatch) and this driver read one definition.
 */
function verifySteps() {
  return pkg.scripts["verify:steps"]
    .split("&&")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      const m = s.match(/^pnpm run (\S+)$/);
      if (!m) {
        throw new Error(`run_verify.mjs: could not parse verify step "${s}"`);
      }
      return m[1];
    });
}

/**
 * Runs a command and captures its combined stdout+stderr.
 *
 * Always goes around `pnpm run <script> -- <args>`: on this pnpm/Windows
 * combination that form forwards the literal `--` into the child's own argv
 * instead of stripping it (broke both `layout-gate:check --preview-skip` and
 * `vitest run --reporter=json`, the latter silently -- vitest fell back to
 * its default reporter and left no file for extractVitestSkips to read,
 * which was caught only by grepping a full verify log for "ENOENT", not by
 * any exit code). Callers pass the underlying binary directly instead of a
 * `pnpm run` script name.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {{stream?: boolean}} [options] `stream: true` echoes output live, for
 *   the steps a human watches a `pnpm verify` run for progress.
 * @returns {Promise<{code: number, output: string}>}
 */
function run(command, args, { stream = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      // Windows resolves a bare `pnpm` only through a shell -- spawn()
      // without shell:true throws EINVAL there instead of ENOENT, which is
      // easy to misread as a broken script rather than a platform quirk.
      shell: process.platform === "win32" && command === "pnpm",
    });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d.toString();
      if (stream) process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      output += d.toString();
      if (stream) process.stderr.write(d);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, output }));
  });
}

async function main() {
  const steps = verifySteps();
  const pythonSkips = [];
  let stepsRan = 0;
  let vitestSkips = { ran: 0, skipped: 0, reasons: [] };

  const tmpDir = mkdtempSync(join(tmpdir(), "tbc-verify-"));
  const vitestJsonPath = join(tmpDir, "vitest-report.json");
  let keepReport = false;

  try {
    for (const step of steps) {
      const isTest = step === "test";
      const { code, output } = isTest
        ? // "test" resolves to `vitest run` (package.json); called directly
          // here, not via `pnpm run test --`, per run()'s doc comment.
          await run(
            "pnpm",
            [
              "exec",
              "vitest",
              "run",
              "--reporter=json",
              `--outputFile=${vitestJsonPath}`,
            ],
            { stream: true }
          )
        : await run("pnpm", ["run", step], { stream: true });

      if (code !== 0) {
        // Matches the `&&` chain's own semantics: stop on first failure.
        // No summary on a failed run -- the failure itself is the report.
        // The test step's only reporter is JSON, so its failure is printed
        // from the report, and the report is kept for the full messages.
        if (isTest) reportVitestFailure(vitestJsonPath);
        keepReport = isTest && existsSync(vitestJsonPath);
        process.exitCode = code;
        return;
      }

      if (isTest) {
        try {
          const report = JSON.parse(readFileSync(vitestJsonPath, "utf8"));
          vitestSkips = extractVitestSkips(report);
        } catch (err) {
          console.error(
            `run_verify.mjs: could not read vitest's JSON report at ${vitestJsonPath}: ${err}`
          );
        }
        stepsRan += 1;
      } else {
        const skips = extractPythonSkips(output);
        if (skips.length > 0) {
          pythonSkips.push(...skips);
        } else {
          stepsRan += 1;
        }
      }
    }

    let layout = null;
    try {
      const { output } = await run("python", [
        "scripts/check_layout_gate.py",
        "--preview-skip",
      ]);
      const line = output
        .split("\n")
        .find((l) => l.trim().startsWith("layout:"));
      if (line) layout = line.trim();
    } catch (err) {
      console.error(
        `run_verify.mjs: could not preview the layout gate: ${err}`
      );
    }

    console.log(
      "\n" +
        formatSummary({
          pythonSkips,
          vitest: {
            ran: stepsRan + vitestSkips.ran,
            skipped: vitestSkips.skipped,
            reasons: vitestSkips.reasons,
          },
          layout,
        })
    );
  } finally {
    if (!keepReport) rmSync(tmpDir, { recursive: true, force: true });
  }
}

/** Prints the failed tests from vitest's JSON report, and where it is. */
function reportVitestFailure(jsonPath) {
  let failures = "";
  try {
    const report = JSON.parse(readFileSync(jsonPath, "utf8"));
    failures = formatVitestFailures(report, ROOT);
  } catch (err) {
    console.error(
      `\nrun_verify.mjs: vitest failed and its JSON report at ${jsonPath} could not be read: ${err}`
    );
    return;
  }
  console.error(
    `\n${failures || "vitest exited nonzero, but its JSON report lists no failed test or file."}\nFull JSON report: ${jsonPath}`
  );
}

main();
