/**
 * Resolves which EP-weights file scores a spec at a given max phase.
 *
 * Reads data/presets/ep-weights-by-phase.json — the same file
 * scripts/assemble_universe.py's `_ep_weights_map` reads — so the "which
 * weights file applies at phase N for spec S" fact has exactly one source
 * (ticket 159; ticket 102 is the failure mode of hand-copying a Python map
 * into TypeScript instead). Loading that file is I/O, so it happens in
 * cli.ts (the only src/ file exempt from the purity lint rule) — this
 * module only resolves an already-loaded mapping, keeping packages/core
 * pure per PLAN.md §4.
 */

import type { ContentPhase, SpecId } from "./types.js";

export interface EpWeightsByPhaseEntry {
  fallback: string;
  byPhase: Record<string, string>;
}

// JSON imports widen every string to `string` (AGENTS.md "Types from JSON"),
// so this is read as a plain value, never as a type source.
export type EpWeightsByPhaseFile = Record<string, EpWeightsByPhaseEntry>;

/**
 * Which EP-weights file applies, and which phase it was actually written for.
 *
 * `weightsPhase` is `undefined` when the resolution fell through to
 * `fallback`, because a fallback file is not a claim about any phase — ele's
 * single preset is labelled "Default" and carries no phase at all.
 */
export interface ResolvedEpWeights {
  readonly path: string;
  readonly requestedPhase: ContentPhase;
  readonly weightsPhase: number | undefined;
}

/**
 * Resolve the EP-weights file for `spec` at `maxPhase`, keeping the phase the
 * chosen weights were written for.
 *
 * Picks the highest key in `byPhase` that is <= maxPhase, falling back to
 * `fallback` when byPhase is empty or has no entry at or below maxPhase —
 * the same rule as Python's `ep_weights_path_for`.
 *
 * The degradation this exposes is real and unavoidable: five of the eleven
 * specs ship only P1-era weights, and one (ele) ships a single unphased set,
 * while universes go to p5. Those weights still drive only the candidate
 * prefilter and the gem fill — every ranking number comes from the sim — but
 * "still approximately right" is not the same as "silent", and the brief bans
 * the second. Callers render the mismatch in the Assumptions block.
 */
export function resolveEpWeights(
  mapping: EpWeightsByPhaseFile,
  spec: SpecId,
  maxPhase: ContentPhase
): ResolvedEpWeights {
  const entry = mapping[spec];
  if (!entry) {
    throw new Error(`no EP-weights mapping for spec "${spec}"`);
  }
  const candidatePhases = Object.keys(entry.byPhase)
    .map(Number)
    .filter((phase) => phase <= maxPhase);
  if (candidatePhases.length === 0) {
    return {
      path: entry.fallback,
      requestedPhase: maxPhase,
      weightsPhase: undefined,
    };
  }
  const bestPhase = Math.max(...candidatePhases);
  const resolved = entry.byPhase[String(bestPhase)];
  if (resolved === undefined) {
    // Unreachable: bestPhase was derived from entry.byPhase's own keys.
    throw new Error(`internal error: no byPhase entry for phase ${bestPhase}`);
  }
  return { path: resolved, requestedPhase: maxPhase, weightsPhase: bestPhase };
}

/**
 * The repo-relative path alone. Retained because most callers only need the
 * path; the disclosure fields come from `resolveEpWeights`.
 */
export function resolveEpWeightsPath(
  mapping: EpWeightsByPhaseFile,
  spec: SpecId,
  maxPhase: ContentPhase
): string {
  return resolveEpWeights(mapping, spec, maxPhase).path;
}

/**
 * The disclosure line for a run whose EP weights were not written for the
 * phase it ranked, or `undefined` when there is nothing to disclose.
 *
 * An unphased fallback still discloses: "Default" weights against a p5
 * universe is exactly the case a reader needs told, and saying nothing
 * because the file carries no phase number would be the silent-degradation
 * failure wearing a different hat.
 */
export function epWeightsPhaseNote(
  resolved: ResolvedEpWeights
): string | undefined {
  if (resolved.weightsPhase === resolved.requestedPhase) return undefined;
  const from =
    resolved.weightsPhase === undefined
      ? "unphased default"
      : `P${resolved.weightsPhase}`;
  return `EP weights: ${from} (requested: P${resolved.requestedPhase})`;
}
