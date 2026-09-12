/**
 * The registry's own surface: totality, the two derived readers, and the guard
 * at the untyped boundary.
 *
 * Pure functions and one object — no adapter, no fixture. That the *ranking*
 * still produces identical output through these facts is proven by the existing
 * suite through the recorded adapters (`rank.test.ts`, `archetype-specs.test.ts`).
 */

import { describe, expect, it } from "vitest";
import { SPEC_IDS } from "../src/spec-ids.generated.js";
import {
  SPEC_REGISTRY,
  isSpecId,
  skeletonPresetIdFor,
  type SpecEntry,
} from "../src/spec-registry.js";
import { capProfileFor } from "../src/cap-profile.js";

const SPEC_ENTRY_KEYS: ReadonlyArray<keyof SpecEntry> = [
  "capProfile",
  "className",
  "cutoff",
  "preferredMetas",
  "sitePath",
  "treeIndex",
];

describe("SPEC_REGISTRY", () => {
  it("is keyed by exactly the generated spec ids", () => {
    expect(Object.keys(SPEC_REGISTRY).sort()).toEqual([...SPEC_IDS].sort());
    expect(SPEC_IDS.length).toBe(11);
  });

  it("gives every spec every field, with nothing left undefined", () => {
    // The compiler already refuses an incomplete entry. This is the runtime
    // half of the same claim: constraint 5 asks that a spec never reads a
    // missing fact as a usable one, and a field present but `undefined` would
    // do exactly that.
    for (const id of SPEC_IDS) {
      const entry = SPEC_REGISTRY[id];
      expect(Object.keys(entry).sort()).toEqual([...SPEC_ENTRY_KEYS]);
      for (const key of SPEC_ENTRY_KEYS) {
        expect(entry[key]).toBeDefined();
      }
    }
  });

  it("carries ret's class and tree", () => {
    expect(SPEC_REGISTRY.ret.treeIndex).toBe(2);
    expect(SPEC_REGISTRY.ret.className).toBe("Paladin");
  });
});

describe("skeletonPresetIdFor", () => {
  it("builds the id from the slug", () => {
    expect(skeletonPresetIdFor("ret")).toBe("ret/p2.raid-sim-skeleton");
  });
});

describe("isSpecId", () => {
  it("admits a rankable spec", () => {
    expect(isSpecId("ret")).toBe(true);
  });

  it("rejects a spec that is detectable but not rankable", () => {
    expect(isSpecId("feral-tank")).toBe(false);
  });

  it("rejects the empty string", () => {
    expect(isSpecId("")).toBe(false);
  });
});

describe("the untyped boundary", () => {
  it("degrades to the default for a spec string that is not registered", () => {
    // The other half of constraint 5, and the reason the guard exists rather
    // than a `?.`: a string from outside the type system degrades, while a
    // registered id with no entry would throw instead of quietly reading as
    // ret's numbers.
    const unlisted = "unlisted-future-spec" as unknown as Parameters<
      typeof capProfileFor
    >[0];
    expect(capProfileFor(unlisted)).toEqual(capProfileFor("ret"));
  });
});
