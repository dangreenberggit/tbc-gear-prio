/**
 * Spec classification (PLAN.md §5.2). WCL has no spec-name field at actor
 * level, and CombatantInfo.specID is 0 for every combatant on TBC
 * Anniversary logs seen so far (ticket 01) — talent-tree plurality is the
 * only trusted signal for picking a tree.
 *
 * Plurality is not always enough to pick a *spec*. Druid's feral tree carries
 * both cat and tank, so this module classifies in two steps: the tree from
 * talents, then — only where the tree is ambiguous — the spec from form
 * uptime, which is fight-scoped rather than character-scoped.
 */

import type { DetectedSpecId, SpecId } from "./types.js";

export type TalentPointsByTree = readonly [number, number, number];

export type SpecClassification =
  | { ok: true; spec: SpecId; treeIndex: number }
  | { ok: false; reason: "ambiguous" | "unsupported-class" }
  | { ok: false; reason: "unsupported-spec"; treeIndex: number }
  /**
   * The tree is known and it maps to more than one spec. Talents cannot go
   * further — feral cat and feral tank are the same 45-point tree, measured
   * byte-identical across a cat kill and a bear kill by the same character on
   * one night (test/fixtures/shredzepelin{,-bear}.raw.json). Resolving this
   * needs `classifyFeralForm` and a fight to measure.
   */
  | {
      ok: false;
      reason: "needs-form-uptime";
      candidates: readonly DetectedSpecId[];
      treeIndex: number;
    };

const PALADIN_TREE_SPEC: Record<number, SpecId> = {
  2: "ret",
};

/**
 * Druid tree 1 (feral) is deliberately absent: it maps to two specs, so
 * `classifySpec` reports `needs-form-uptime` for it rather than choosing.
 */
const DRUID_TREE_SPEC: Record<number, SpecId> = {};

const DRUID_FERAL_TREE_INDEX = 1;
const FERAL_CANDIDATES: readonly DetectedSpecId[] = ["feral", "feral-tank"];

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

const CLASS_TREE_SPEC: Record<string, Record<number, SpecId>> = {
  Paladin: PALADIN_TREE_SPEC,
  Druid: DRUID_TREE_SPEC,
};

export function classifySpec(
  className: string,
  talentPointsByTree: TalentPointsByTree
): SpecClassification {
  const treeSpec = CLASS_TREE_SPEC[className];
  if (!treeSpec) {
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

  if (className === "Druid" && treeIndex === DRUID_FERAL_TREE_INDEX) {
    return {
      ok: false,
      reason: "needs-form-uptime",
      candidates: FERAL_CANDIDATES,
      treeIndex,
    };
  }

  const spec = treeSpec[treeIndex];
  if (!spec) {
    return { ok: false, reason: "unsupported-spec", treeIndex };
  }

  return { ok: true, spec, treeIndex };
}

export type FormUptime = {
  /** Milliseconds in Cat Form. */
  catMs: number;
  /** Milliseconds in Dire Bear Form or Bear Form, summed. */
  bearMs: number;
};

export type FeralFormClassification = {
  /** Absent when there is no form time to judge — never defaulted to cat. */
  spec?: DetectedSpecId;
  /**
   * 0–1, feeding `FightSummary.confidence`. This is the share of formed time
   * spent in the winning form, so a mixed fight reports a middling number
   * rather than certainty: the Karathress kill is 69% bear and says 0.69.
   */
  confidence: number;
};

/**
 * Resolve feral cat from feral tank on what the character actually did.
 *
 * Deliberately not thresholded. A rule like "≥80% cat means cat" would have to
 * invent an answer for the 69%-bear Karathress kill, and inventing one is the
 * failure mode §5.4 is guarding against — the caller gets the ratio and
 * decides what is good enough.
 */
export function classifyFeralForm(uptime: FormUptime): FeralFormClassification {
  const formed = uptime.catMs + uptime.bearMs;
  if (formed <= 0) return { confidence: 0 };

  const cat = uptime.catMs >= uptime.bearMs;
  const winning = cat ? uptime.catMs : uptime.bearMs;
  return {
    spec: cat ? "feral" : "feral-tank",
    confidence: winning / formed,
  };
}
