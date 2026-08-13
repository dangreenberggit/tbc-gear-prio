/**
 * Paired-replicate standard error (PLAN.md §10, Stage 2).
 *
 * Pure and separate from `rank.ts` because §10's claim is a statistical one
 * that stands or falls on its own: replicate a delta across distinct seeds and
 * report `sd(deltas) / sqrt(n)`. Correct by construction, no distributional
 * assumptions. This buys **resolution, not correctness** — a refinement of how
 * finely the top of the list can be ordered, not a fix to any number below it.
 */

/** §10: "for the top ~8 items only" — 5× sims on 8 items rather than on 180. */
export const PAIRED_REPLICATE_TOP_N = 8;

/**
 * A caller passed seeds that cannot produce a spread. Its own class so
 * `rank.ts` can map it to `RankError` kind `internal` without string-matching:
 * the other kinds fault the character, the log or the sim, and this is bad
 * input from the caller.
 */
export class DegenerateSeedsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DegenerateSeedsError";
  }
}

/**
 * §4: `RankInput.seeds` is the switch — "`>1` enables paired replication".
 * Honoured here rather than by a second flag, so the two cannot disagree.
 */
export function usesPairedReplication(seeds: readonly number[]): boolean {
  return seeds.length > 1;
}

/**
 * Every seed must be distinct, and the reason is measured rather than assumed:
 * the shared-seed arm of the §10 five-seed experiment repeated
 * **bit-identical** — 0.00 spread, recorded in `docs/verification-log.md` and
 * `docs/five-seed-spread.json`. So replicating one seed five times yields
 * `sd(deltas) = 0` and an SE of zero — a plausible-looking number that is
 * entirely an artifact, and worse than no number at all because it reads as
 * precision. Fail loudly instead of reporting it.
 */
export function assertUsableSeeds(seeds: readonly number[]): void {
  if (!usesPairedReplication(seeds)) return;
  const seen = new Set<number>();
  const repeated = new Set<number>();
  for (const seed of seeds) {
    if (seen.has(seed)) repeated.add(seed);
    seen.add(seed);
  }
  if (repeated.size > 0) {
    const list = [...repeated].sort((a, b) => a - b).join(", ");
    throw new DegenerateSeedsError(
      `seeds must be distinct to measure a spread: ${list} repeated in [${seeds.join(", ")}]. ` +
        `A shared seed repeats bit-identical, so a repeated seed contributes no ` +
        `variance and drives the paired-replicate SE toward a false zero (PLAN.md §10).`
    );
  }
}

/**
 * `SE = sd(deltas) / sqrt(n)`, with `sd` the sample standard deviation.
 *
 * Sample (`n - 1`) rather than population: the five seeds are a sample of the
 * seed space, not the whole of it, and the population form would understate
 * the spread — biased toward exactly the false precision this method exists to
 * avoid.
 */
export function pairedReplicateSe(deltas: readonly number[]): number {
  if (deltas.length < 2) {
    throw new Error(
      `paired-replicate SE needs at least two deltas, got ${deltas.length}`
    );
  }
  const n = deltas.length;
  const mean = deltas.reduce((sum, d) => sum + d, 0) / n;
  const variance =
    deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance) / Math.sqrt(n);
}
