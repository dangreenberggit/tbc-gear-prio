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
import { forkGuard, OPT_OUT } from "./verify_fork_guard.mjs";

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

// The unit tests above pass even if run_verify.mjs never calls forkGuard.
// This runs the real driver in a checkout with no vendor/ and a stub step.
describe("run_verify.mjs with no fork", () => {
  it("exits 1 naming pnpm wt:pair before any step runs", () => {
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
      const marker = join(root, "step-ran.txt");
      writeFileSync(
        join(root, "package.json"),
        JSON.stringify({
          type: "module",
          scripts: {
            "verify:steps": "pnpm run marker",
            marker: `node -e "require('fs').writeFileSync('step-ran.txt','')"`,
          },
        })
      );
      const env = { ...process.env };
      delete env.GITHUB_ACTIONS;
      delete env[OPT_OUT];

      const result = spawnSync(
        process.execPath,
        [join(root, "scripts", "run_verify.mjs")],
        { cwd: root, env, encoding: "utf8" }
      );

      expect(result.status).toBe(1);
      expect(result.stderr).toContain("pnpm wt:pair");
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
