import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

// Each fixture is written only into the temp checkout below, so the main
// suite never runs it.
const HANGING_HOOK = `import { beforeAll, describe, it } from "vitest";
describe("a describe whose setup hangs", () => {
  beforeAll(() => new Promise(() => {}), 50);
  it("never runs", () => {});
});
`;

const HOOK_AND_TEST_FAIL = `import { beforeAll, describe, expect, it } from "vitest";
describe("A", () => {
  beforeAll(() => { throw new Error("MIXED HOOK ERROR"); });
  it("a", () => {});
});
describe("B", () => {
  it("fails", () => { expect(1).toBe(2); });
});
`;

const NON_ERROR_THROW = `import { beforeAll, describe, it } from "vitest";
describe("a describe whose setup throws a plain object", () => {
  beforeAll(() => { throw { code: 42 }; });
  it("never runs", () => {});
});
`;

/**
 * Runs the real run_verify.mjs and vitest in a temp checkout whose only
 * test file is `fixture`, and returns its result and the JSON report it
 * kept.
 */
function runVerifyOn(fixture) {
  const root = mkdtempSync(join(tmpdir(), "tbc-hook-error-"));
  const modules = join(root, "node_modules");
  try {
    mkdirSync(join(root, "scripts"));
    for (const f of [
      "run_verify.mjs",
      "verify_fork_guard.mjs",
      "verify_summary.mjs",
      "vitest_json_reporter.mjs",
    ]) {
      copyFileSync(join(SCRIPTS, f), join(root, "scripts", f));
    }
    mkdirSync(join(root, "vendor", "tbc-new-fork"), { recursive: true });
    symlinkSync(join(SCRIPTS, "..", "node_modules"), modules, "junction");
    writeFileSync(join(root, "hook.test.mjs"), fixture);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        type: "module",
        scripts: { "verify:steps": "pnpm run test" },
      })
    );

    // run_verify.mjs keeps a failed run's report under the OS temp dir;
    // pointing that at `root` lets the finally block remove it.
    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "run_verify.mjs")],
      {
        cwd: root,
        env: { ...process.env, TMPDIR: root, TEMP: root, TMP: root },
        encoding: "utf8",
      }
    );
    const reportPath = result.stderr.match(/^Full JSON report: (.+)$/m)?.[1];
    const report = reportPath
      ? JSON.parse(readFileSync(reportPath, "utf8"))
      : null;
    return { result, report };
  } finally {
    rmSync(modules, { force: true });
    rmSync(root, { recursive: true, force: true });
  }
}

describe("pnpm verify's test step", () => {
  it("prints a failed describe-level beforeAll's error under the file's path", () => {
    const { result } = runVerifyOn(HANGING_HOOK);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "  FAIL hook.test.mjs\n    Hook timed out in 50ms."
    );
  });

  it("prints the hook's error when another describe in the file has a failed test", () => {
    const { result } = runVerifyOn(HOOK_AND_TEST_FAIL);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("  FAIL hook.test.mjs > B fails");
    expect(result.stderr).toContain(
      "  FAIL hook.test.mjs\n    MIXED HOOK ERROR"
    );
  });

  it("keeps the report's empty message when the hook throws a non-Error", () => {
    const { result, report } = runVerifyOn(NON_ERROR_THROW);
    expect(result.status).toBe(1);
    expect(report.testResults[0].message).toBe("");
  });
});
