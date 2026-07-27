/**
 * CliSimRunner — spawn pinned wowsimcli (PLAN.md §5.3).
 * Lives in seams/ so core stages stay pure.
 */

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type {
  RaidSimRequest,
  SimObservation,
  SimRunOpts,
  SimRunner,
} from "./sim-runner.js";

type RawSimResult = {
  error?: { type?: string } | null;
  iterationsDone?: number;
  raidMetrics?: { dps?: { avg?: number; stdev?: number } };
};

export class CliSimRunner implements SimRunner {
  constructor(
    private readonly binaryPath: string,
    private readonly timeoutMs = 120_000
  ) {}

  async version(): Promise<string> {
    const { stdout } = await runProcess(this.binaryPath, ["version"], {
      timeoutMs: 10_000,
    });
    return stdout.trim();
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    // Hash/cache keys use the pre-injection request (PLAN.md §7 / R6).
    // Inject seed + iterations only into the file we spawn.
    const injected: RaidSimRequest = {
      ...req,
      simOptions: {
        iterations: opts.iterations,
        randomSeed: String(opts.seed),
        debugFirstIteration: false,
      },
    };

    const dir = await mkdtemp(join(tmpdir(), "tbc-sim-"));
    const infile = join(dir, "req.json");
    const outfile = join(dir, "res.json");
    try {
      await writeFile(infile, `${JSON.stringify(injected)}\n`, "utf8");
      await runProcess(
        this.binaryPath,
        ["sim", "--infile", infile, "--outfile", outfile],
        { timeoutMs: this.timeoutMs }
      );
      const raw = JSON.parse(await readFile(outfile, "utf8")) as RawSimResult;
      const err = raw.error;
      if (
        err &&
        typeof err === "object" &&
        err.type &&
        err.type !== "ErrorOutcomeNone"
      ) {
        throw new Error(`sim error: ${JSON.stringify(err)}`);
      }
      if (raw.iterationsDone !== opts.iterations) {
        throw new Error(
          `iterationsDone=${raw.iterationsDone}, expected ${opts.iterations}`
        );
      }
      const dps = raw.raidMetrics?.dps?.avg;
      const stdev = raw.raidMetrics?.dps?.stdev;
      if (typeof dps !== "number" || typeof stdev !== "number") {
        throw new Error("missing raidMetrics.dps.avg/stdev");
      }
      const simVersion = await this.version();
      return {
        dps,
        stdev,
        iterationsDone: opts.iterations,
        simVersion,
      };
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
}

function runProcess(
  command: string,
  args: string[],
  opts: { timeoutMs: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`timed out after ${opts.timeoutMs}ms: ${command}`));
    }, opts.timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `${command} exited ${code}\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}
