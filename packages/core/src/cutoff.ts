/**
 * Cutoff derived from the Phase 1 five-seed spread experiment
 * (docs/five-seed-spread.json, PLAN.md §10): max(3.0, 2× mean reported SE 1.678).
 *
 * That 1.678 is an `independent` SE, and it stays one now that paired
 * replication ships — the bar is intentionally on the coarse scale rather than
 * an oversight (ADR-0021). The cutoff runs *before* replication and selects
 * which rows get replicated, so deriving it from paired SEs would be circular;
 * and it asks whether a delta is distinguishable from zero at the precision the
 * whole pool was ranked at, which is the independent one.
 */
export const CUTOFF = { absDps: 3.4, pct: 0.15 } as const;

export type Cutoff = typeof CUTOFF;

/**
 * Lives here rather than in `rank.ts` so that `CUTOFF` and the predicate that
 * reads it stay one definition. `rank.ts` is the only caller: the cutoff is
 * absolute, so the view carries `belowCutoff` rather than re-deriving it
 * (ADR-0020).
 */
export function meetsCutoff(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): boolean {
  return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
}
