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
 * The repo-relative path to the EP-weights file for `spec` at `maxPhase`.
 *
 * Picks the highest key in `byPhase` that is <= maxPhase, falling back to
 * `fallback` when byPhase is empty or has no entry at or below maxPhase —
 * the same rule as Python's `ep_weights_path_for`.
 */
export function resolveEpWeightsPath(
  mapping: EpWeightsByPhaseFile,
  spec: SpecId,
  maxPhase: ContentPhase
): string {
  const entry = mapping[spec];
  if (!entry) {
    throw new Error(`no EP-weights mapping for spec "${spec}"`);
  }
  const candidatePhases = Object.keys(entry.byPhase)
    .map(Number)
    .filter((phase) => phase <= maxPhase);
  if (candidatePhases.length === 0) {
    return entry.fallback;
  }
  const bestPhase = Math.max(...candidatePhases);
  const resolved = entry.byPhase[String(bestPhase)];
  if (resolved === undefined) {
    // Unreachable: bestPhase was derived from entry.byPhase's own keys.
    throw new Error(`internal error: no byPhase entry for phase ${bestPhase}`);
  }
  return resolved;
}
