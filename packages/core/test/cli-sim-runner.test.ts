import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CliSimRunner } from "../src/seams/cli-sim-runner.js";
import type { RaidSimRequest } from "../src/seams/sim-runner.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const lock = JSON.parse(
  readFileSync(join(root, "data/wowsims.lock.json"), "utf8")
) as { tag: string; commit: string };

const platform = process.platform.startsWith("win") ? "win32-x64" : "linux-x64";
const binaryName =
  platform === "win32-x64" ? "wowsimcli-windows.exe" : "wowsimcli";
const binaryPath = join(
  root,
  "vendor",
  `wowsimcli-${lock.tag}-${platform}`,
  binaryName
);

// The only test that needs the real wowsimcli. vendor/ is gitignored and CI
// fetches nothing, so this must skip there rather than fail — the recorded
// SimRunner adapter is what keeps the seam covered offline (PLAN.md §5).
describe.skipIf(!existsSync(binaryPath))("CliSimRunner", () => {
  // Asserted against the lockfile rather than a version literal. The string
  // the binary reports is whatever it was built or released as: a release tag
  // on a --tag pin, but the build's `main.Version` on a --ref pin, which this
  // repo sets to the pinned commit (ticket 244). Either way it must identify
  // the pin, or the vendored binary is not the one the lockfile claims.
  it("reports a version identifying the pinned engine", async () => {
    const sim = new CliSimRunner(binaryPath);
    expect([lock.tag, lock.commit]).toContain(await sim.version());
  });

  it("sims the slamaltman request and returns a DPS observation", async () => {
    const req = JSON.parse(
      readFileSync(
        join(root, "test/fixtures/slamaltman.raid-sim-request.json"),
        "utf8"
      )
    ) as RaidSimRequest;
    const sim = new CliSimRunner(binaryPath);
    const obs = await sim.run(req, { seed: 42, iterations: 500 });
    expect(obs.iterationsDone).toBe(500);
    expect([lock.tag, lock.commit]).toContain(obs.simVersion);
    expect(obs.dps).toBeGreaterThan(1500);
    expect(obs.dps).toBeLessThan(2500);
    expect(obs.stdev).toBeGreaterThan(0);
  }, 60_000);
});
