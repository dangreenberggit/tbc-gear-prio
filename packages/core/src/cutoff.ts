import { CUTOFF, SPEC_REGISTRY, isSpecId } from "./spec-registry.js";
import type { SpecId } from "./types.js";

// The two cutoffs live with the per-spec entries that reference them, in
// `spec-registry.js`. Re-exported here because this module is where callers
// have always read them from; `CUTOFF` is also imported above as the value
// `cutoffForSpec` degrades to at the untyped boundary.
export { CUTOFF, CUTOFF_FERAL } from "./spec-registry.js";

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

/**
 * Per-spec noise floor for a prospective set bonus, in DPS, derived from the
 * ranking's own per-spec cutoff. A set-bonus figure near zero is
 * indistinguishable from sim noise; only a figure strictly above this floor may
 * move anything.
 *
 * The display gate (the fork tab) and the ranking gate (`rankableSetPotential`,
 * view.ts) both obtain the floor by calling this function on the SAME frozen
 * per-spec `Cutoff` — the one carried on the `Ranking` the rows came from,
 * threaded to the row renderer as a parameter, never a live picker lookup and
 * never a state field a mid-run render lacks — so for any displayed row the two
 * layers read the same number and can never disagree: no row sorts on a bonus
 * the display hides, even while a stale ranking is on screen. A mid-run
 * skeleton row has no ranking and shows no prospective line at all.
 *
 * Derivation: `absDps` is already the per-spec 2×SE bar (`CUTOFF.absDps` = 3.4
 * ret from 2×1.678 rounded up, `CUTOFF_FERAL.absDps` = 3.6 feral from 2×1.774).
 * The `√2` factor is the **2pc** bar specifically: a 2pc prospective bonus folds
 * four sims (base + package + two singles), so its combined SE `sqrt(Σ se_i²)`
 * (see `combineSe`, set-value.ts) is ≈ 2×1.678 ≈ √2 × the single-delta SE. `√2 ×
 * absDps` is that combined 2×SE bar per spec: ≈4.81 ret, ≈5.09 feral.
 *
 * This flat `√2` bar is applied to **every** prospective bonus, 2pc and 4pc
 * alike, and that is deliberate — it is a conservative-low ranking bar, not a
 * per-piece-count-tuned one. A 4pc bonus folds six sims (base + package + four
 * singles, one sample per added piece; see rank.ts where `prospectiveBonusDps`
 * is set from the threshold's measured bonus), so its own noise is ≈ √6×1.678 —
 * a √3-vs-single ratio, ~1.22× this floor (≈5.9 ret). Holding 4pc bonuses to the
 * lower 2pc bar therefore *under*-filters 4pc noise in a narrow window (≈4.8–5.9
 * ret). This is the intended direction for a bar whose job is to admit rather
 * than hide: raising it would filter more real bonuses out, and the cutoff runs
 * before replication precisely to be coarse-and-inclusive (ADR-0021). Measured:
 * across every committed fixture carrying `prospectiveBonusDps`, no 4pc bonus
 * (and no bonus of any threshold) falls in the (4.81, 5.89) under-filtered band —
 * distinct 4pc values are ≤ −3.88 or ≥ 17.14 — so the flat floor changes no
 * observed row's tier today (ticket 335, re-runnable via the band scan in that
 * ticket over the six `.scratch/**` fixtures with `prospectiveBonusDps`).
 *
 * The nine untested specs inherit ret's floor through their registry entries
 * (see `cutoffForSpec`), so the untested-spec debt stays annotated in one place.
 * See tickets 331, 332, and 335, and
 * .scratch/stage-gate/ticket-332-per-spec-ranking-floor/plan.md.
 */
export function setBonusNoiseFloorDps(cutoff: Cutoff): number {
  return Math.SQRT2 * cutoff.absDps;
}

/**
 * The guard here covers the untyped boundary only, and deliberately not the
 * typed one.
 *
 * `DetectedSpecId` values like `feral-tank` are identifiable but not rankable,
 * and `cutoff.test.ts` passes one through a cast; throwing there would turn a
 * detection edge case into a crash, so an id outside `SPEC_IDS` degrades to
 * ret's derived cutoff exactly as it always has.
 *
 * A *registered* spec whose entry is missing is the opposite case and must
 * throw. That is why the registry is indexed directly rather than through `?.`
 * — an optional chain would hand back ret's noise floor for a spec nobody
 * measured, which is the silent inheritance this registry exists to prevent.
 */
export function cutoffForSpec(spec: SpecId): Cutoff {
  if (!isSpecId(spec)) return CUTOFF;
  return SPEC_REGISTRY[spec].cutoff;
}

/**
 * Lives here rather than in `rank.ts` so that `CUTOFF` and the predicate that
 * reads it stay one definition. `rank.ts` is the only caller: the cutoff is
 * absolute, so the view stores `belowCutoff` rather than re-deriving it
 * (ADR-0020).
 */
export function meetsCutoff(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): boolean {
  return deltaDps >= cutoff.absDps || deltaPct >= cutoff.pct;
}

/**
 * Which arm of the OR cutoff admitted a row (ticket 254). `meetsCutoff` returns
 * only the boolean, so a boundary row that clears the percentage arm while its
 * absolute DPS sits below `absDps` reads, in the report, as if it broke the
 * absolute rule — an SME flagged exactly that. This names the arm so the report
 * can annotate such a row instead of leaving the reader to infer an
 * inconsistency. `"none"` iff `!meetsCutoff` on the same inputs.
 */
export type CutoffArm = "abs" | "pct" | "both" | "none";

export function cutoffAdmittingArm(
  deltaDps: number,
  deltaPct: number,
  cutoff: Cutoff
): CutoffArm {
  const abs = deltaDps >= cutoff.absDps;
  const pct = deltaPct >= cutoff.pct;
  if (abs && pct) return "both";
  if (abs) return "abs";
  if (pct) return "pct";
  return "none";
}
