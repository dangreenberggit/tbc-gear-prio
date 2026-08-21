import { describe, expect, it } from "vitest";

import { canonicalJson, contentHashOf } from "../src/content-hash.js";

describe("canonicalJson", () => {
  it("orders keys so structurally equal objects serialize identically", () => {
    const a = { b: 1, a: 2, c: { z: 3, y: 4 } };
    const b = { c: { y: 4, z: 3 }, a: 2, b: 1 };
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(canonicalJson(a)).toBe('{"a":2,"b":1,"c":{"y":4,"z":3}}');
  });

  it("preserves array order, which is meaningful", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]");
    expect(canonicalJson([1, 2, 3])).not.toBe(canonicalJson([3, 1, 2]));
  });

  it("treats an explicit undefined as absent", () => {
    // `{ race: undefined }` and `{}` mean the same thing to the engine — both
    // fall through to the skeleton default — so they must not hash apart.
    expect(canonicalJson({ a: 1, race: undefined })).toBe(
      canonicalJson({ a: 1 })
    );
  });

  it("drops undefined array elements to null rather than omitting them", () => {
    // Omitting would shift every later index and silently change the meaning.
    expect(canonicalJson([1, undefined, 2])).toBe("[1,null,2]");
  });

  it("formats whole floats identically however they were written", () => {
    expect(canonicalJson({ n: 1.0 })).toBe(canonicalJson({ n: 1 }));
  });

  it("refuses non-finite numbers rather than emitting null", () => {
    // JSON.stringify turns these into `null`, so NaN and Infinity would
    // collide with each other and with a real null.
    expect(() => canonicalJson({ n: NaN })).toThrow(/finite/);
    expect(() => canonicalJson({ n: Infinity })).toThrow(/finite/);
  });
});

/**
 * The membership rule is "if this value changes, do the numbers change?"
 * (ADR-0019). Every field below gets a mutation assertion, because a field
 * that is hashed but never varied is indistinguishable from one that was
 * silently dropped from the payload.
 */
const BASE = {
  character: { region: "us", realm: "Whitemane", name: "Slamaltman" },
  spec: "ret" as const,
  maxPhase: 2 as const,
  race: "RaceBloodElf" as const,
  fight: { reportCode: "abc123", fightId: 7 },
  gear: {
    items: [{ id: 29996, slot: "head", enchant: 3004, gems: [24028, 24033] }],
  },
  candidates: [
    { itemId: 30101, slot: "chest" },
    { itemId: 29381, slot: "neck" },
  ],
  gemPaletteIds: [24028, 24033],
  epWeights: { sp: 1, crit: 0.7 },
  presetId: "ret/p2.raid-sim-skeleton",
  skeleton: {
    raid: { buffs: { bloodlust: true } },
    encounter: { duration: 180 },
  },
  iterations: 3000,
  seeds: [42],
  simVersion: "v0.0.101",
  engineVersion: 1,
  candidateCap: 2,
};

describe("contentHashOf", () => {
  it("is stable across runs and independent of key order", () => {
    const reordered = {
      engineVersion: BASE.engineVersion,
      simVersion: BASE.simVersion,
      seeds: BASE.seeds,
      iterations: BASE.iterations,
      skeleton: {
        encounter: { duration: 180 },
        raid: { buffs: { bloodlust: true } },
      },
      presetId: BASE.presetId,
      epWeights: { crit: 0.7, sp: 1 },
      gemPaletteIds: BASE.gemPaletteIds,
      candidates: BASE.candidates,
      gear: BASE.gear,
      fight: BASE.fight,
      race: BASE.race,
      maxPhase: BASE.maxPhase,
      spec: BASE.spec,
      character: BASE.character,
    };
    expect(contentHashOf(reordered)).toBe(contentHashOf(BASE));
  });

  it("is a sha256 hex digest", () => {
    expect(contentHashOf(BASE)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("still produces the key a pre-removal `fullPool: true` run produced", () => {
    // 7.4a. Racing is gone (ADR-0026) but `contentHashOf` keeps
    // `fullPool: true, screenIterations: null, promoteTopK: null,
    // promoteTopJ: null` frozen in the payload, because every cache key
    // already on disk was written with them. The CLI was the only caller and
    // always passed `fullPool: true`, so this digest — taken from the
    // pre-removal implementation against this same BASE — is the whole
    // evidence that no stored ranking silently re-sims. If a change to the
    // payload shape is deliberate, bump ENGINE_VERSION rather than editing
    // this constant.
    expect(contentHashOf(BASE)).toBe(
      "02f21d1f3020ba80eaadecd6c276745d315b6dad7ecb43373f055bfbf7d56ef0"
    );
  });

  it("normalizes the character ref, which is a lookup key and not a number", () => {
    // Same character, different capitalisation, must not re-sim.
    expect(
      contentHashOf({
        ...BASE,
        character: { region: "US", realm: "whitemane", name: "SLAMALTMAN" },
      })
    ).toBe(contentHashOf(BASE));
  });

  it.each([
    ["spec", { spec: "prot" as const }],
    ["maxPhase", { maxPhase: 3 as const }],
    ["race", { race: "RaceHuman" as const }],
    ["fight", { fight: { reportCode: "abc123", fightId: 8 } }],
    ["iterations", { iterations: 5000 }],
    ["seeds", { seeds: [42, 43] }],
    ["simVersion", { simVersion: "v0.0.102" }],
    ["engineVersion", { engineVersion: 2 }],
    ["presetId", { presetId: "ret/p3.raid-sim-skeleton" }],
    ["epWeights", { epWeights: { sp: 1, crit: 0.8 } }],
    ["candidates", { candidates: [{ itemId: 30101, slot: "chest" }] }],
    ["gemPaletteIds", { gemPaletteIds: [24028] }],
    ["candidateCap", { candidateCap: 1 }],
    [
      "gear",
      { gear: { items: [{ id: 30101, slot: "head", gems: [24028, 24033] }] } },
    ],
  ])("changes when %s changes", (_field, patch) => {
    expect(contentHashOf({ ...BASE, ...patch })).not.toBe(contentHashOf(BASE));
  });

  it("hashes an omitted candidateCap the same as one equal to eligible.length", () => {
    // plan §5.1.1: the Candidates control defaults to "all eligible", and
    // that default must not re-sim a ranking cached before the cap existed
    // — the two spellings of "no cap" have to collide.
    const noCapField = { ...BASE } as Partial<typeof BASE>;
    delete noCapField.candidateCap;
    const capAtEligibleCount = {
      ...BASE,
      candidateCap: BASE.candidates.length,
    };
    expect(contentHashOf(noCapField as typeof BASE)).toBe(
      contentHashOf(capAtEligibleCount)
    );
  });

  it("does not change when a Deps-only concurrency value is added", () => {
    // plan §5.1.2: concurrency is a Deps scalar, not a ranking input — it
    // changes how fast the run goes, never what it returns, so it must
    // never be part of the cache key. Not a real ContentHashInput field,
    // so this pins that passing it through anyway (a caller spreading Deps
    // into the hash payload by mistake) is still inert, the same way the
    // ViewOptions-shaped-field test above pins for view toggles.
    const withConcurrency = { ...BASE, concurrency: 4 };
    expect(contentHashOf(withConcurrency)).toBe(contentHashOf(BASE));
  });

  it.each([
    [
      "a raid buff is dropped",
      { raid: { buffs: {} }, encounter: { duration: 180 } },
    ],
    [
      "the encounter duration changes",
      { raid: { buffs: { bloodlust: true } }, encounter: { duration: 300 } },
    ],
  ])("changes when the sim skeleton changes — %s", (_case, skeleton) => {
    // The skeleton carries buffs, debuffs, talents, encounter and the APL
    // rotation, all under a presetId that never varies. Stripping
    // prepullActions measured 789.02 DPS against a 2042.85 baseline
    // (docs/verification-log.md, 2026-07-27), so hashing the label alone
    // would serve those pre-edit deltas from cache.
    expect(contentHashOf({ ...BASE, skeleton })).not.toBe(contentHashOf(BASE));
  });

  it("changes when a candidate is re-slotted but keeps its item id", () => {
    // `slot` picks the sim slots the swap is tried in (simSlotsForPoolSlot):
    // `finger` runs two comparisons, `neck` one, so the slot decides deltaDps
    // and slotChoice. A pool regeneration that corrects a mis-slotted item
    // must not be served the old, wrong deltas.
    expect(
      contentHashOf({
        ...BASE,
        candidates: [
          { itemId: 30101, slot: "chest" },
          { itemId: 29381, slot: "finger" },
        ],
      })
    ).not.toBe(contentHashOf(BASE));
  });

  it("changes when a logged gem changes but the item does not", () => {
    // The regression the cache exists to avoid: same items, re-gemmed, every
    // delta moves. A hash over item ids alone would serve the stale ranking.
    expect(
      contentHashOf({
        ...BASE,
        gear: {
          items: [
            { id: 29996, slot: "head", enchant: 3004, gems: [24028, 24054] },
          ],
        },
      })
    ).not.toBe(contentHashOf(BASE));
  });

  it("does not change when a ViewOptions-shaped field is added", () => {
    // PLAN.md §14 gate: toggling any ViewOptions field must not change
    // contentHash or trigger a sim. Pins that the payload is a fixed
    // allow-list rather than a spread of whatever it was handed.
    const withView = {
      ...BASE,
      pins: [29996],
      raidZone: "Karazhan",
      groupBySlot: true,
      hideOwned: true,
    };
    expect(contentHashOf(withView)).toBe(contentHashOf(BASE));
  });
});
