/**
 * One entry per spec this engine can rank, and the only place a per-spec fact
 * is written down.
 *
 * Before this file the same eleven specs were spelled out in seven separate
 * tables — cap profile, cutoff, preferred metas, preset id, tree index, class
 * name, site page — each total over `SpecId` and each its own edit. Adding a
 * spec meant finding all of them. Here it means one entry, and the compiler
 * names the entry you have not finished.
 *
 * ## Adding a spec
 *
 * 1. Add the id and its fork proto `Spec` name to `spec-registry.json`.
 * 2. Run `pnpm codegen:json-types`, which regenerates `spec-ids.generated.ts`.
 *    `SpecId` now includes the new id, and `SPEC_REGISTRY` below stops
 *    compiling until it has an entry.
 * 3. Add that entry. Every field is required, so none can be filled by
 *    omission — and each is a game fact with no safe default.
 * 4. Add the spec's row to `data/presets/ep-weights-by-phase.json`.
 * 5. Add its `SPEC_PROFILES` entry in `scripts/assemble_universe.py`.
 *
 * ## Why there is no derived table
 *
 * A helper that projects this registry into a `Record<SpecId, T>` cannot return
 * that type without a cast: iterating and indexing yields `Partial<Record<…>>`
 * (TS2322). Once laundered through the cast the `Partial` shape overlaps the
 * target, so a registry **missing a spec entirely** compiled clean — the check
 * read as rigour and proved nothing. A direct `as` on this literal is caught
 * (TS2352, the types do not sufficiently overlap), so the no-`as`/no-`satisfies
 * rule here is defence in depth against the derived-table and double-cast
 * shapes rather than the mechanism itself. The mechanism is the annotation on
 * `SPEC_REGISTRY` plus required fields on `SpecEntry`.
 *
 * ## Why accessors index directly
 *
 * Readers of this registry write `SPEC_REGISTRY[spec].field` — no `?.`, no
 * `??`. Indexing an exact `Record<SpecId, …>` with a `SpecId` is non-optional
 * under `noUncheckedIndexedAccess`, so neither operator is needed to compile,
 * and both would be harmful: with an entry genuinely absent at runtime (a stale
 * build, a JS caller) `?.` silently returns ret's numbers while a direct index
 * throws. Silently inheriting ret's numbers is the failure this registry
 * exists to prevent, so it must fail loudly.
 *
 * The genuinely untyped boundary — a `DetectedSpecId` such as `feral-tank`, or
 * a string cast through at a module edge — is a different question, and is
 * filtered by `isSpecId` below rather than by an operator. An id *outside*
 * `SPEC_IDS` degrades to a documented default, exactly as before; an id
 * *inside* `SPEC_IDS` whose entry is missing throws.
 */

import { SPEC_IDS, type SpecId } from "./spec-ids.generated.js";
import { Stat } from "./stats.js";

// The id list travels with the registry keyed by it: a caller iterating the
// specs and a caller reading one spec's facts should not import from two
// different modules.
export { SPEC_IDS, type SpecId } from "./spec-ids.generated.js";
import type { CapProfile } from "./cap-profile.js";
import type { Cutoff } from "./cutoff.js";

/**
 * ui/core/constants/mechanics.ts @ wowsims/tbc-new
 * 8aa378b3671a0923fd11fb34b4b3753e53f20c9b (data/wowsims.lock.json), and
 * sim/core/base_stats_auto_gen.go. Copied rather than imported: the vendor tree
 * is a build input, never a runtime dependency (PLAN.md §8.3 [S0]).
 */
export const PHYSICAL_HIT_RATING_PER_HIT_PERCENT = 15.769233;
export const SPELL_HIT_RATING_PER_HIT_PERCENT = 12.615385;

/**
 * Yellow-attack hit cap vs a level-73 boss: 9% missing. A special (yellow)
 * attack against a target three levels above the attacker misses 9% of the
 * time before hit rating.
 */
export const PHYSICAL_HIT_CAP_PERCENT = 9;

/**
 * Spell hit cap vs a level-73 boss: 16%.
 *
 * The sim models 17% base spell miss against a +3-level target
 * (`sim/core/target.go:393`, `BaseSpellMissChance` = 0.17 for level 73+ via
 * `UnitLevelFloat64`), but clamps the result to a 1% floor —
 * `math.Max(0.01, 1-hitChance)` at `sim/core/spell_result.go:246-258`. So the
 * 17th percent buys nothing and the reachable cap is 16, which is why 16 is the
 * number quoted for TBC casters. Unlike physical, there is no `HitSuppression`
 * term on spells; the 0.01 at `target.go:401` is physical-only.
 *
 * One exception the descriptor deliberately does not model: for
 * `SpellFlagBinary` spells, hit past the cap still counteracts partial resists
 * (`spell_result.go:253-255`). That is a per-spell property, not a per-spec one,
 * and this table is per-spec.
 */
export const SPELL_HIT_CAP_PERCENT = 16;

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
 * Stat EP cannot rank meta gems: their headline effects are not stats. Nine of
 * the eighteen TBC metas score exactly 0.00 against ret weights, and the two
 * that matter here invert — Swift Skyfire's flat +24 AP scores 9.84 while
 * Relentless scores 9.00 on +12 Agi alone, because its +3% critical damage is
 * a multiplier (`CritDamageMultiplier *= 1.03` in wowsims
 * `sim/core/item_effects.go`) and additive EP cannot see it.
 *
 * The effect enters average damage as `crit * (critDmgMult - 1)`
 * (`sim/core/spell_outcome.go`), so its absolute value scales with crit and is
 * **not** a constant — roughly 0.6% of damage at 10% crit up to 2.4% at 40%.
 * The *ordering* is what is durable: against Swift Skyfire's +24 AP,
 * Relentless leads by ~7x at 10% crit and ~28x at 40%, so it never flips in
 * any realistic ret range.
 *
 * Ret's meta is Relentless Earthstorm Diamond in all three upstream wowsims
 * ret gear presets (preraid, p1, p2 under
 * `ui/paladin/retribution/gear_sets/`), which carry no other meta.
 *
 * Activation is deliberately not checked. Relentless requires 2 red / 2 yellow
 * / 2 blue elsewhere, and a player who slots a meta arranges their other gems
 * to switch it on. Gating on the colours they happen to wear today would
 * understate a genuine upgrade.
 */
export const PREFERRED_META_IDS: readonly number[] = [32409];

/**
 * Everything this engine knows about one spec, as facts rather than tables.
 *
 * Every field is required. That is the whole mechanism: a spec added to
 * `spec-registry.json` cannot reach a ranking until someone has answered all
 * six questions for it, and no field can be filled by omission.
 */
export type SpecEntry = {
  /** The character class, as the sim and the gear source name it. */
  readonly className: string;
  /**
   * Tree index carrying the spec's points, so `classifySpec` (spec.ts) lands
   * on the right tree without needing a real talent string parsed. Paladin
   * tree 2 is Retribution, Druid tree 1 is Feral Combat (spec.ts:35-46).
   */
  readonly treeIndex: 0 | 1 | 2;
  /**
   * Path segment of the spec's page on the public wowsims.com TBC site — note
   * `druid/feral` for cat and `priest/shadow` for the DPS priest, neither of
   * which matches this repo's `SpecId` spelling. These are the public routes,
   * not the fork's `ui/` directory names: the fork ships `ui/druid/feralcat`,
   * so deriving a path from the source tree would be wrong for cat.
   */
  readonly sitePath: string;
  /** What the cap computation needs: which hit school, and its numbers. */
  readonly capProfile: CapProfile;
  /** The noise floor below which a delta is indistinguishable from zero. */
  readonly cutoff: Cutoff;
  /** Which meta gem to seat on a candidate, read from upstream's presets. */
  readonly preferredMetas: readonly number[];
};

export const SPEC_REGISTRY: Readonly<Record<SpecId, SpecEntry>> = {
  balance: {
    className: "Druid",
    treeIndex: 0,
    sitePath: "druid/balance",
    /**
     * Balance of Power, Balance tree (segment 0) index 15, 2% per point to 2
     * points (`sim/druid/talents.go:128-130`).
     *
     * Scope caveat carried for the SME gate: the sim applies it as a
     * `SpellMod_BonusHit_Percent` masked to Wrath/Starfire/Moonfire, explicitly
     * not Insect Swarm (`sim/druid/talents.go:127-128`). This entry is per-spec
     * and cannot express a per-spell mask, so the cap figure treats it as global
     * — which is what the fork's own stat-weight path does too, faking a flat +4
     * `SpellHitPercent` while `Env.MeasuringStats` (`talents.go:132-137`).
     */
    capProfile: {
      hitStat: Stat.StatSpellHitRating,
      hitCapPercent: SPELL_HIT_CAP_PERCENT,
      ratingPerPercent: SPELL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 0,
        talentIndex: 15,
        percentPerPoint: 2,
        talent: "Balance of Power",
        maxPoints: 2,
      },
    },
    cutoff: CUTOFF,
    // Chaotic Skyfire Diamond — the caster crit meta.
    // ui/druid/balance/gear_sets/p5.gear.json, head 34403.
    preferredMetas: [34220],
  },

  feral: {
    className: "Druid",
    treeIndex: 1,
    sitePath: "druid/feral",
    /**
     * Feral cat's trees carry no physical hit talent: a search of `sim/druid/`
     * finds no `PhysicalHitPercent` grant. See carry-forward ticket 05.
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: true,
    },
    cutoff: CUTOFF_FERAL,
    preferredMetas: PREFERRED_META_IDS,
  },

  hunter: {
    className: "Hunter",
    // Survival — the tree a hunter's talent-string plurality lands in
    treeIndex: 2,
    sitePath: "hunter",
    /**
     * Hunters read **melee** hit rating, not a ranged one: this sim has no
     * `StatRangedHitRating`, and `sim/core/unit.go:676-677` declares only two
     * hit-rating dependencies — `MeleeHitRating → PhysicalHitPercent` and
     * `SpellHitRating → SpellHitPercent`. Ranged attacks read
     * `PhysicalHitPercent` and add a flat `RangedHitPercent` on top
     * (`sim/core/spell_result.go:176-180`), which is a percent-only channel with
     * no rating behind it.
     *
     * Surefooted, Survival tree (segment 2) index 11, 1% per point to 3
     * (`sim/hunter/talents.go:521-526`). Animal Handler is deliberately not here:
     * its 2%/point goes to the pet, not the hunter (`talents.go:149-151`).
     *
     * No expertise: nothing a hunter fires can be dodged or parried.
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 2,
        talentIndex: 11,
        percentPerPoint: 1,
        talent: "Surefooted",
        maxPoints: 3,
      },
    },
    cutoff: CUTOFF,
    // Relentless Earthstorm Diamond — the same melee meta ret and feral use.
    // ui/hunter/dps/gear_sets/phase_4/bm/2h_6p.gear.json, head 32235.
    preferredMetas: PREFERRED_META_IDS,
  },

  mage: {
    className: "Mage",
    // Arcane, matching the Arcane-only gear sets this repo vendors
    treeIndex: 0,
    sitePath: "mage",
    /**
     * Arcane Focus, Arcane tree (segment 0) index 1, 2% per point to 5
     * (`sim/mage/talents.go:112`).
     *
     * Arcane rather than Elemental Precision because every gear set this repo
     * vendors for mage is an Arcane set (`preBisArcane`/`p1Arcane`/`p2Arcane`) and
     * the fork's default EP preset is `P1 - Arcane` (`ui/mage/dps/sim.tsx:96`).
     * Elemental Precision exists at `sim/mage/talents.go:521-535` and is
     * deliberately bug-compatible — 2%/point for frost, 1%/point for fire — but a
     * per-spec entry cannot hold both, and choosing the one matching the shipped
     * sets is the honest pick. Flagged to the SME gate as part of mage's stacked
     * degradations.
     */
    capProfile: {
      hitStat: Stat.StatSpellHitRating,
      hitCapPercent: SPELL_HIT_CAP_PERCENT,
      ratingPerPercent: SPELL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 0,
        talentIndex: 1,
        percentPerPoint: 2,
        talent: "Arcane Focus",
        maxPoints: 5,
      },
    },
    cutoff: CUTOFF,
    // ui/mage/dps/gear_sets/p2Arcane.gear.json, head 30206.
    preferredMetas: [34220],
  },

  ret: {
    className: "Paladin",
    treeIndex: 2,
    sitePath: "paladin/retribution",
    /**
     * Ret's Precision is a Protection-tree talent this build cross-specs into,
     * worth 1% hit per point. paladin.proto's Protection block is talent index
     * 21-40 (`precision = 23` is local index 2); the encoder writes trees in
     * Holy(0)/Protection(1)/Retribution(2) order, so `5-053201-…` splits to Holy
     * "5" / Protection "053201" / Retribution "0523005120033125331051". Those
     * segments sum to 5/11/45, the same split asserted for this fixture at
     * `spec.test.ts:16` and `rank.test.ts:103`, which is what confirms the
     * alignment. Precision grants flat `PhysicalHitPercent`, not rating
     * (sim/paladin/talents.go applyPrecision), so the conversion goes through the
     * physical rating-per-percent.
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: true,
      talentHit: {
        treeSegment: 1,
        talentIndex: 2,
        percentPerPoint: 1,
        talent: "Precision",
        maxPoints: 3,
      },
    },
    cutoff: CUTOFF,
    preferredMetas: PREFERRED_META_IDS,
  },

  shadow: {
    className: "Priest",
    treeIndex: 2,
    sitePath: "priest/shadow",
    /**
     * Shadow Focus, Shadow tree (segment 2) index 4, 2% per point to 5
     * (`sim/priest/talents.go:322-327`).
     */
    capProfile: {
      hitStat: Stat.StatSpellHitRating,
      hitCapPercent: SPELL_HIT_CAP_PERCENT,
      ratingPerPercent: SPELL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 2,
        talentIndex: 4,
        percentPerPoint: 2,
        talent: "Shadow Focus",
        maxPoints: 5,
      },
    },
    cutoff: CUTOFF,
    // Mystical Skyfire Diamond. Shadow is the one caster here not on 34220:
    // ui/priest/dps/gear_sets/p3.gear.json, head 31064, seats 25893.
    preferredMetas: [25893],
  },

  rogue: {
    className: "Rogue",
    // Combat
    treeIndex: 1,
    sitePath: "rogue",
    /**
     * Precision, Combat tree (segment 1) index 5, 1% per point to 5
     * (`sim/rogue/talents_combat.go:85-90`). The rogue `dualWieldSpecialization`
     * talent is off-hand *damage*, not hit, so it is not a hit source.
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: true,
      talentHit: {
        treeSegment: 1,
        talentIndex: 5,
        percentPerPoint: 1,
        talent: "Precision",
        maxPoints: 5,
      },
    },
    cutoff: CUTOFF,
    // ui/rogue/dps/gear_sets/p3.gear.json, head 32235.
    preferredMetas: PREFERRED_META_IDS,
  },

  ele: {
    className: "Shaman",
    treeIndex: 0,
    sitePath: "shaman/elemental",
    /**
     * Elemental Precision, Elemental tree (segment 0) index 14, 2% per point to 3
     * (`sim/shaman/talents_elemental.go:195-202`). Scoped to fire/frost/nature,
     * which is every school an elemental shaman casts — so unlike balance's and
     * warlock's masks, treating it as global is exact here.
     */
    capProfile: {
      hitStat: Stat.StatSpellHitRating,
      hitCapPercent: SPELL_HIT_CAP_PERCENT,
      ratingPerPercent: SPELL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 0,
        talentIndex: 14,
        percentPerPoint: 2,
        talent: "Elemental Precision",
        maxPoints: 3,
      },
    },
    cutoff: CUTOFF,
    // ui/shaman/elemental/gear_sets/p5.gear.json, head 34332 (meta second).
    preferredMetas: [34220],
  },

  enh: {
    className: "Shaman",
    treeIndex: 1,
    sitePath: "shaman/enhancement",
    /**
     * Dual Wield Specialization, Enhancement tree (segment 1) index 16, 2% per
     * point to 3 (`sim/shaman/talents_enhancement.go:44-72`).
     *
     * Conditional in a way this entry cannot express: the sim gates it on
     * `AutoAttacks.IsDualWielding` (`:57` and `:70`), so an enhancement shaman
     * holding a two-hander gets none of it. Counting it unconditionally
     * over-credits that build by up to 6% hit. Recorded here and flagged to the
     * SME gate rather than silently dropped, because the dual-wield build is the
     * one every vendored enhancement gear set uses.
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: true,
      talentHit: {
        treeSegment: 1,
        talentIndex: 16,
        percentPerPoint: 2,
        talent: "Dual Wield Specialization",
        maxPoints: 3,
      },
    },
    cutoff: CUTOFF,
    // ui/shaman/enhancement/gear_sets/p5.gear.json, head 34333 (meta second).
    preferredMetas: PREFERRED_META_IDS,
  },

  warlock: {
    className: "Warlock",
    // Affliction, matching the fork's default Affli/Demo/Destro EP
    treeIndex: 0,
    sitePath: "warlock",
    /**
     * Suppression, Affliction tree (segment 0) index 0, 2% per point to 5
     * (`sim/warlock/talents.go:74-83`).
     *
     * Masked to `WarlockAfflictionSpells` (`talents.go:82`), so a destruction
     * build gets no hit from it at all. Same limitation as balance's Balance of
     * Power; the fork's default EP preset is the Affli/Demo/Destro one
     * (`ui/warlock/dps/sim.ts:60`), which is the build this credits. Flagged to
     * the SME gate.
     */
    capProfile: {
      hitStat: Stat.StatSpellHitRating,
      hitCapPercent: SPELL_HIT_CAP_PERCENT,
      ratingPerPercent: SPELL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: false,
      talentHit: {
        treeSegment: 0,
        talentIndex: 0,
        percentPerPoint: 2,
        talent: "Suppression",
        maxPoints: 5,
      },
    },
    cutoff: CUTOFF,
    // ui/warlock/dps/gear_sets/swp.gear.json, head 34340.
    preferredMetas: [34220],
  },

  warrior: {
    className: "Warrior",
    // Fury, the fork's default warrior variant
    treeIndex: 1,
    sitePath: "warrior",
    /**
     * Precision, Fury tree (segment 1) index 16, 1% per point to 3
     * (`sim/warrior/talents_fury.go:320-325`). Fury is the fork's default warrior
     * variant (`ui/warrior/dps/sim.ts:63` wires `P2_FURY_EP_PRESET`).
     */
    capProfile: {
      hitStat: Stat.StatMeleeHitRating,
      hitCapPercent: PHYSICAL_HIT_CAP_PERCENT,
      ratingPerPercent: PHYSICAL_HIT_RATING_PER_HIT_PERCENT,
      trackExpertise: true,
      talentHit: {
        treeSegment: 1,
        talentIndex: 16,
        percentPerPoint: 1,
        talent: "Precision",
        maxPoints: 3,
      },
    },
    cutoff: CUTOFF,
    // ui/warrior/dps/gear_sets/p5_fury.gear.json, head 34333 (meta second);
    // p5_arms.gear.json seats the same one.
    preferredMetas: PREFERRED_META_IDS,
  },
};

/**
 * The committed raid-sim skeleton a spec's CLI harness run reads.
 *
 * Derived from the slug rather than tabulated: all eleven follow the same
 * `<spec>/p2.raid-sim-skeleton` convention, so a table would only be a place
 * for one row to disagree. The skeleton is a CLI-harness input, not a product
 * input (ADR-0031) — the tab reads the user's live page state instead.
 */
export function skeletonPresetIdFor(spec: SpecId): string {
  return `${spec}/p2.raid-sim-skeleton`;
}

const SPEC_ID_SET: ReadonlySet<string> = new Set<string>(SPEC_IDS);

/**
 * Whether a string is a spec this engine can rank.
 *
 * The guard at the untyped boundary. Callers that receive a `DetectedSpecId`
 * or a string cast through a module edge use this to separate "not a rankable
 * spec, degrade to the documented default" from "a registered spec whose entry
 * is missing", which must throw rather than quietly inherit ret's numbers.
 */
export function isSpecId(x: string): x is SpecId {
  return SPEC_ID_SET.has(x);
}
