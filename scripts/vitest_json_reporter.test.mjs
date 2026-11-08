import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SCRIPTS = dirname(fileURLToPath(import.meta.url));

// Written only into the temp checkout below, so the main suite never runs it.
const FIXTURE = `import { beforeAll, describe, it } from "vitest";
describe("a describe whose setup hangs", () => {
  beforeAll(() => new Promise(() => {}), 50);
  it("never runs", () => {});
});
`;

describe("pnpm verify's test step", () => {
  it("prints a failed describe-level beforeAll's error under the file's path", () => {
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
      writeFileSync(join(root, "hook.test.mjs"), FIXTURE);
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

      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        "  FAIL hook.test.mjs\n    Hook timed out in 50ms."
      );
    } finally {
      rmSync(modules, { force: true });
      rmSync(root, { recursive: true, force: true });
    }
  });
});
