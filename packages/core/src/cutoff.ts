/**
 * Cutoff derived from the Phase 1 five-seed spread experiment
 * (docs/five-seed-spread.json, PLAN.md §10): max(3.0, 2× mean reported SE 1.678).
 */
export const CUTOFF = { absDps: 3.4, pct: 0.15 } as const;

export type Cutoff = typeof CUTOFF;

/**
 * Lives here rather than in `rank.ts` because `applyView` re-applies it within
 * a filtered view (§12, filter composes before the cutoff). Two callers, one
 * definition — a copy is how the two altitudes drift apart.
 */
export function meetsCutoff(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): boolean {
  return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
}
