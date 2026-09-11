/**
 * Temporary: proves the registry carries exactly what the old per-spec tables
 * carried, for every spec, while both shapes are alive.
 *
 * No expected value is written by hand here — each assertion compares the
 * registry against the table it replaces. That is the point: the registry rows
 * and a hand-typed expectation would be the same person copying the same source
 * twice, and would agree with each other while both being wrong.
 *
 * This file dies with the tables it reads. The commit that deletes the last old
 * table deletes this too; the registry it proved equal is then byte-unchanged
 * through every consumer flip, which is what carries the proof forward.
 */

import { describe, expect, it } from "vitest";
import { SPEC_IDS } from "../src/spec-ids.generated.js";
import { SPEC_REGISTRY } from "../src/spec-registry.js";
import {
  SPEC_CLASS_NAME,
  SPEC_TREE_INDEX,
} from "../src/fixtures/synthetic-offline.js";

describe("the registry matches every table it replaces", () => {
  it("covers exactly the generated spec ids", () => {
    expect(Object.keys(SPEC_REGISTRY).sort()).toEqual([...SPEC_IDS].sort());
  });

  for (const id of SPEC_IDS) {
    it(`carries ${id}'s facts unchanged`, () => {
      expect(SPEC_REGISTRY[id].treeIndex).toBe(SPEC_TREE_INDEX[id]);
      expect(SPEC_REGISTRY[id].className).toBe(SPEC_CLASS_NAME[id]);
    });
  }
});
