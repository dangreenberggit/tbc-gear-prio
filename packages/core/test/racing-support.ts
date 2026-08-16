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
import {
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunner,
  type SimRunOpts,
} from "../src/seams/sim-runner.js";

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
