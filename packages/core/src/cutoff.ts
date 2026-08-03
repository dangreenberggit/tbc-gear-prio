/**
 * Cutoff derived from the Phase 1 five-seed spread experiment
 * (docs/five-seed-spread.json, PLAN.md §10): max(3.0, 2× mean reported SE 1.678).
 */
export const CUTOFF = { absDps: 3.4, pct: 0.15 } as const;

export type Cutoff = typeof CUTOFF;
