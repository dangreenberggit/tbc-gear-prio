/**
 * Shared test runners for M2 racing (candidate-pool.md §7 preamble).
 *
 * `DerivedNoiseSimRunner` avoids a second recorded fixture per
 * `screenIterations` value: it looks up the *full-iteration* recorded truth
 * for a request (ignoring the caller's `opts.iterations`/`opts.seed`) and
 * adds deterministic seeded noise scaled by `1/sqrt(iterations)` — the same
 * shape independent SE takes in rank.ts (`stdev / Math.sqrt(iterations)`).
 * So `screenIterations` can change freely without re-recording, and 7.2's
 * recall test can run over many draws by varying only the noise seed.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunner,
  type SimRunOpts,
} from "../src/seams/sim-runner.js";
import type { ContentPhase, SpecId } from "../src/types.js";

/** Counts runs so "racing does less work" (7.0) is asserted, not assumed. */
export class CountingSimRunner implements SimRunner {
  runs = 0;
  runsByIterations = new Map<number, number>();
  constructor(private readonly inner: SimRunner) {}
  version(): Promise<string> {
    return this.inner.version();
  }
  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    this.runs += 1;
    this.runsByIterations.set(
      opts.iterations,
      (this.runsByIterations.get(opts.iterations) ?? 0) + 1
    );
    return this.inner.run(req, opts);
  }
}

/**
 * A splitmix32-style PRNG: small, dependency-free, and — unlike
 * `Math.random` — reproducible from an integer seed, which is what lets
 * 7.2 draw K independent noise samples deterministically.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box-Muller, drawn from the given PRNG. */
function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), Number.EPSILON);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Wraps a recorded full-iteration `SimRunner` (`recordedIterations`,
 * `recordedSeed` — the truth every draw perturbs) and answers *any*
 * `opts.iterations` by adding noise scaled `stdev / sqrt(iterations)` to the
 * recorded dps — the same independent-SE shape rank.ts reports, so a
 * screening pass at 300 iterations looks statistically like what a real
 * 300-iteration sim would report relative to the 3000-iteration truth.
 *
 * `noiseSeed` selects the draw: two runners built with different seeds
 * perturb the same truth differently, which is what 7.2's "K seeded noise
 * draws" needs. The seed is mixed with the request's own cache key so two
 * different candidates in the same draw get independent noise rather than
 * identical offsets.
 */
export class DerivedNoiseSimRunner implements SimRunner {
  constructor(
    private readonly recordedSimVersion: string,
    private readonly recordings: ReadonlyMap<string, SimObservation>,
    private readonly recordedSeed: number,
    private readonly noiseSeed: number
  ) {}

  async version(): Promise<string> {
    return this.recordedSimVersion;
  }

  async run(req: RaidSimRequest, opts: SimRunOpts): Promise<SimObservation> {
    // The recorded key always uses the *recorded* seed/iterations — the
    // request body itself carries no iteration count (compose.ts never
    // writes one), so this is the same request the full sweep recorded,
    // looked up at its own truth rather than at the caller's opts.
    const lookupKey = simCacheKey(req, this.recordedSimVersion, {
      seed: this.recordedSeed,
      iterations: recordedIterationsFor(
        this.recordings,
        req,
        this.recordedSimVersion,
        this.recordedSeed
      ),
    });
    const truth = this.recordings.get(lookupKey);
    if (!truth) {
      throw new Error(
        `no recorded full-iteration truth for sim key ${lookupKey}`
      );
    }
    // Request hash folded into the noise seed so distinct candidates in one
    // draw get independent perturbations rather than a shared offset.
    const requestSeed = hashToUint32(
      simCacheKey(req, this.recordedSimVersion, opts) + `:${this.noiseSeed}`
    );
    const rand = mulberry32(requestSeed);
    const se = truth.stdev / Math.sqrt(opts.iterations);
    const dps = truth.dps + gaussian(rand) * se;
    return {
      dps,
      stdev: truth.stdev,
      iterationsDone: opts.iterations,
      simVersion: this.recordedSimVersion,
    };
  }
}

/**
 * The recordings map is keyed by the *recorded* iterations, which the caller
 * knows externally (`recordingsFile.rows[spec].iterations`) but a single
 * request lookup here does not carry — so this probes the map for the one
 * iteration count actually present, rather than requiring the caller to
 * thread it through every call site.
 */
function recordedIterationsFor(
  recordings: ReadonlyMap<string, SimObservation>,
  req: RaidSimRequest,
  simVersion: string,
  seed: number
): number {
  // Recorded observations all share one iteration count in this roster
  // (synthetic-roster-recordings.json's per-row `iterations` field) — take
  // it from any entry rather than re-deriving it per request.
  const any = recordings.values().next().value as SimObservation | undefined;
  if (any) return any.iterationsDone;
  throw new Error(
    `cannot resolve recorded iterations: no recordings present for lookup of ${simCacheKey(req, simVersion, { seed, iterations: 0 })}`
  );
}

function hashToUint32(text: string): number {
  // FNV-1a: fast, dependency-free, and deterministic across runs — this only
  // needs to scatter distinct strings across the PRNG's seed space, not
  // resist adversarial input.
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// --- shared fixture prologue (ticket 229) --------------------------------
//
// `loadJson` and `RosterRecordingsFile` were copied near-verbatim into each
// of the four `measure-*.ts` scripts. The type is the sharp case: it
// describes one committed fixture file, so independent copies can drift from
// it and from each other. `racing.test.ts` and `synthetic-fixtures.test.ts`
// keep their own copies by design — they are vitest-collected and the
// duplication there is out of ticket 229's scope.

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

/** Reads a repo-relative JSON file. Paths are from the repo root, not cwd. */
export function loadJson<T>(rel: string): T {
  return JSON.parse(readFileSync(join(repoRoot, rel), "utf8")) as T;
}

export type RosterRecordingsFile = {
  simVersion: string;
  seed: number;
  iterations: number;
  rows: Record<
    string,
    {
      spec: SpecId;
      presetPhase: ContentPhase;
      maxPhase: ContentPhase;
      poolSize: number;
      aboveCutoffCount: number;
      baselineDps: number;
      iterations: number;
      seed: number;
      simVersion: string;
      recordings: Record<string, SimObservation>;
    }
  >;
};

/** The iteration count screening runs at, and the one SE is quoted against. */
export const SCREEN_ITERATIONS = 1000;

/**
 * Mean per-candidate screening SE, derived from the recordings.
 *
 * Derived rather than a constant on purpose (ticket 229). `5.128` was
 * hard-coded in `measure-cutoff-band.ts` and went stale the moment the feral
 * P3 fixture was re-recorded in `57ec814`: the tip figure is 5.162194. A
 * constant makes a re-record silently wrong; deriving it makes drift loud.
 *
 * wowsims reports a per-iteration population sd with no /sqrt(N) applied
 * (vendor/tbc-new-fork/sim/core/sim_concurrent.go:138), so SE of the mean is
 * stdev/sqrt(iterations) — the same shape rank.ts reports.
 */
export function derivedScreeningSe(
  recordings: Record<string, SimObservation>
): number {
  const ses = Object.values(recordings).map(
    (o) => o.stdev / Math.sqrt(SCREEN_ITERATIONS)
  );
  return ses.reduce((a, b) => a + b, 0) / ses.length;
}
