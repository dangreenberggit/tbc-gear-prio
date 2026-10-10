import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { forkGuard, OPT_OUT, skipGuard } from "./verify_fork_guard.mjs";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

describe("forkGuard", () => {
  it("lets verify run when the fork is present", () => {
    expect(forkGuard({ forkPresent: true, env: {} })).toBeNull();
  });

  it("refuses a local checkout with no fork and names pnpm wt:pair", () => {
    const refusal = forkGuard({ forkPresent: false, env: {} });
    expect(refusal).toContain("pnpm wt:pair");
    expect(refusal).toContain(OPT_OUT);
  });

  it("lets GitHub Actions run without the fork", () => {
    expect(
      forkGuard({ forkPresent: false, env: { GITHUB_ACTIONS: "true" } })
    ).toBeNull();
  });

  it("lets the opt-out run without the fork", () => {
    expect(
      forkGuard({ forkPresent: false, env: { [OPT_OUT]: "1" } })
    ).toBeNull();
  });

  it("treats CI=true alone as a local run", () => {
    expect(
      forkGuard({ forkPresent: false, env: { CI: "true" } })
    ).not.toBeNull();
  });

  it("accepts only 1 as the opt-out value", () => {
    expect(
      forkGuard({ forkPresent: false, env: { [OPT_OUT]: "0" } })
    ).not.toBeNull();
  });
});

describe("skipGuard", () => {
  it("passes a local run with no skips", () => {
    expect(
      skipGuard({ pythonSkipCount: 0, vitestSkipCount: 0, env: {} })
    ).toBeNull();
  });

  it("fails a local run with a gate skip and names pnpm wt:pair", () => {
    const failure = skipGuard({
      pythonSkipCount: 2,
      vitestSkipCount: 0,
      env: {},
    });
    expect(failure).toContain("2 gate(s)");
    expect(failure).toContain("pnpm wt:pair");
  });

  it("fails a local run whose only skips are vitest tests", () => {
    expect(
      skipGuard({ pythonSkipCount: 0, vitestSkipCount: 1, env: {} })
    ).toContain("1 gate(s)");
  });

  it("lets GitHub Actions and the opt-out skip", () => {
    const skips = { pythonSkipCount: 1, vitestSkipCount: 2 };
    expect(skipGuard({ ...skips, env: { GITHUB_ACTIONS: "true" } })).toBeNull();
    expect(skipGuard({ ...skips, env: { [OPT_OUT]: "1" } })).toBeNull();
  });
});

// The unit tests above pass even if run_verify.mjs never calls the guards.
// These run the real driver in a temp checkout with a stub step.
// Stands in for vitest so the driver's `test` step runs without an install:
// it writes a JSON report with one skipped test, or no report at all.
const FAKE_VITEST = `import { writeFileSync } from "node:fs";
const arg = process.argv.find((a) => a.startsWith("--outputFile="));
if (process.env.FAKE_VITEST_MODE !== "no-report") {
  writeFileSync(arg.slice("--outputFile=".length), JSON.stringify({
    testResults: [{ name: "fake.test.ts", assertionResults: [
      { status: "skipped", fullName: "fake suite needs the fork" },
    ] }],
  }));
}
`;

function installFakeVitest(root) {
  const bin = join(root, "node_modules", ".bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, "fake-vitest.mjs"), FAKE_VITEST);
  writeFileSync(join(bin, "vitest.cmd"), '@node "%~dp0fake-vitest.mjs" %*\r\n');
  writeFileSync(
    join(bin, "vitest"),
    '#!/bin/sh\nexec node "$(dirname "$0")/fake-vitest.mjs" "$@"\n',
    { mode: 0o755 }
  );
}

function runDriver({ withFork, step, steps, env: extraEnv = {} }) {
  const root = mkdtempSync(join(tmpdir(), "tbc-fork-guard-"));
  try {
    mkdirSync(join(root, "scripts"));
    for (const f of [
      "run_verify.mjs",
      "verify_fork_guard.mjs",
      "verify_summary.mjs",
    ]) {
      copyFileSync(join(SCRIPTS, f), join(root, "scripts", f));
    }
    if (withFork)
      mkdirSync(join(root, "vendor", "tbc-new-fork"), { recursive: true });
    if (steps === "test") installFakeVitest(root);
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        type: "module",
        scripts:
          steps === "test"
            ? { "verify:steps": "pnpm run test" }
            : { "verify:steps": "pnpm run stub", stub: step },
      })
    );
    const env = { ...process.env, ...extraEnv };
    delete env.GITHUB_ACTIONS;
    if (!(OPT_OUT in extraEnv)) delete env[OPT_OUT];

    const result = spawnSync(
      process.execPath,
      [join(root, "scripts", "run_verify.mjs")],
      { cwd: root, env, encoding: "utf8" }
    );
    return { ...result, stepRan: existsSync(join(root, "step-ran.txt")) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const MARK_STEP = `node -e "require('fs').writeFileSync('step-ran.txt','')"`;
// Split so pnpm's echo of the command line is not itself a skip line.
const SKIPPING_STEP = `node -e "console.log('stub check: skip' + 'ped -- no input')"`;

describe("run_verify.mjs", () => {
  it("exits 1 naming pnpm wt:pair before any step runs when the fork is absent", () => {
    const result = runDriver({ withFork: false, step: MARK_STEP });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pnpm wt:pair");
    expect(result.stepRan).toBe(false);
  });

  it("exits 1 when a gate skips although the fork folder is present", () => {
    const result = runDriver({ withFork: true, step: SKIPPING_STEP });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1 gate(s)");
  });

  it("exits 1 when only a vitest test skips", () => {
    const result = runDriver({ withFork: true, steps: "test" });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1 gate(s)");
  });

  it("exits 1 when vitest leaves no readable report, even under the opt-out", () => {
    const result = runDriver({
      withFork: true,
      steps: "test",
      env: { [OPT_OUT]: "1", FAKE_VITEST_MODE: "no-report" },
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("could not read vitest's JSON report");
  });

  it("passes a skipping gate under the opt-out", () => {
    const result = runDriver({
      withFork: true,
      step: SKIPPING_STEP,
      env: { [OPT_OUT]: "1" },
    });
    expect(result.status).toBe(0);
  });
});
