/**
 * Spec classification (PLAN.md §5.2). WCL has no spec-name field at actor
 * level, and CombatantInfo.specID is 0 for every combatant on TBC
 * Anniversary logs seen so far (ticket 01) — talent-tree plurality is the
 * only trusted signal. Paladin-only until other classes have a verified
 * fixture.
 */

import type { SpecId } from "./types.js";

export type TalentPointsByTree = readonly [number, number, number];

export type SpecClassification =
  | { ok: true; spec: SpecId; treeIndex: number }
  | { ok: false; reason: "ambiguous" | "unsupported-class" };

const PALADIN_TREE_SPEC: Record<number, SpecId> = {
  2: "ret",
};

/**
 * WCL's CombatantInfo.talents is a three-entry array where `id` is points
 * spent in that tree (not a talent identifier) — R18.
 */
export function talentPointsFromWclTalents(
  talents: readonly { id: number }[]
): TalentPointsByTree {
  if (talents.length !== 3) {
    throw new Error(`expected 3 talent trees, got ${talents.length}`);
  }
  return [talents[0]!.id, talents[1]!.id, talents[2]!.id];
}

export function classifySpec(
  className: string,
  talentPointsByTree: TalentPointsByTree
): SpecClassification {
  if (className !== "Paladin") {
    return { ok: false, reason: "unsupported-class" };
  }

  const max = Math.max(...talentPointsByTree);
  const topTrees = talentPointsByTree
    .map((points, index) => ({ points, index }))
    .filter((tree) => tree.points === max);

  if (topTrees.length !== 1) {
    return { ok: false, reason: "ambiguous" };
  }

  const treeIndex = topTrees[0]!.index;
  const spec = PALADIN_TREE_SPEC[treeIndex];
  if (!spec) {
    return { ok: false, reason: "unsupported-class" };
  }

  return { ok: true, spec, treeIndex };
}
