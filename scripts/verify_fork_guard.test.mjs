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
    expect(skipGuard({ skipped: 0, env: {} })).toBeNull();
  });

  it("fails a local run with a skip and names pnpm wt:pair", () => {
    const failure = skipGuard({ skipped: 2, env: {} });
    expect(failure).toContain("2 gate(s)");
    expect(failure).toContain("pnpm wt:pair");
  });

  it("lets GitHub Actions and the opt-out skip", () => {
    expect(
      skipGuard({ skipped: 3, env: { GITHUB_ACTIONS: "true" } })
    ).toBeNull();
    expect(skipGuard({ skipped: 3, env: { [OPT_OUT]: "1" } })).toBeNull();
  });
});

// The unit tests above pass even if run_verify.mjs never calls the guards.
// These run the real driver in a temp checkout with a stub step.
function runDriver({ withFork, step, env: extraEnv = {} }) {
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
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({
        type: "module",
        scripts: { "verify:steps": "pnpm run stub", stub: step },
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

const MARK = `node -e "require('fs').writeFileSync('step-ran.txt','')"`;
// Split so pnpm's echo of the command line is not itself a skip line.
const SKIP = `node -e "console.log('stub check: skip' + 'ped -- no input')"`;

describe("run_verify.mjs", () => {
  it("exits 1 naming pnpm wt:pair before any step runs when the fork is absent", () => {
    const result = runDriver({ withFork: false, step: MARK });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("pnpm wt:pair");
    expect(result.stepRan).toBe(false);
  });

  it("exits 1 when a gate skips although the fork folder is present", () => {
    const result = runDriver({ withFork: true, step: SKIP });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("1 gate(s)");
  });

  it("passes a skipping gate under the opt-out", () => {
    const result = runDriver({
      withFork: true,
      step: SKIP,
      env: { [OPT_OUT]: "1" },
    });
    expect(result.status).toBe(0);
  });
});
