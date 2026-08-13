import type { SpecId } from "./types.js";

/**
 * Cutoff derived from the Stage 1 five-seed spread experiment
 * (docs/five-seed-spread.json, PLAN.md §10): max(3.0, 2× mean reported SE 1.678).
 *
 * That 1.678 is an `independent` SE, and it stays one now that paired
 * replication ships — the bar is intentionally on the coarse scale rather than
 * an oversight (ADR-0021). The cutoff runs *before* replication and selects
 * which rows get replicated, so deriving it from paired SEs would be circular;
 * and it asks whether a delta is distinguishable from zero at the precision the
 * whole pool was ranked at, which is the independent one.
 */
export type Cutoff = { readonly absDps: number; readonly pct: number };

export const CUTOFF: Cutoff = { absDps: 3.4, pct: 0.15 };

/**
 * Feral cutoff derived from its own five-seed spread
 * (docs/five-seed-spread-feral.json, issue #1 README step 0), following the
 * same method as ret's above: max(3.0, 2× mean reported SE 1.774) → 3.6.
 * Feral's rotation is noisier than ret's (mean reported SE 1.774 vs ret's
 * 1.678 at the same 5000 iterations, same fixture-derivation method), so
 * applying ret's 3.4 cutoff to feral would under-count noise as a real
 * upgrade. `CUTOFF` above is intentionally left unchanged; this is additive.
 */
export const CUTOFF_FERAL: Cutoff = { absDps: 3.6, pct: 0.15 };

/**
 * Per-spec cutoff lookup. Only `ret` and `feral` have their own derived
 * spread experiment; every other `SpecId` falls back to the ret-derived
 * `CUTOFF` until it gets its own five-seed spread (mirrors how `CUTOFF` was
 * applied to every spec before this file existed).
 */
const CUTOFF_BY_SPEC: Partial<Record<SpecId, Cutoff>> = {
  ret: CUTOFF,
  feral: CUTOFF_FERAL,
};

export function cutoffForSpec(spec: SpecId): Cutoff {
  return CUTOFF_BY_SPEC[spec] ?? CUTOFF;
}

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
