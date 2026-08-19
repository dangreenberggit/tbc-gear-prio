/**
 * rankUpgrades — the deep module interface (PLAN.md §4).
 * Stages sit behind this; callers only see RankInput → Ranking.
 */

import {
  fillEmptyCandidateGems,
  gemContext,
  metaSocketUnpriced,
  missingMetaPreferenceNote,
  type FillEmptyOpts,
  type GemContext,
} from "./candidate-gems.js";
import { orderCandidatesByEp } from "./candidate-order.js";
import { migrateGemsToItem } from "./migrate-gems.js";
import { promisePool } from "./promise-pool.js";
import {
  DEFAULT_PROMOTE_TOP_J,
  DEFAULT_PROMOTE_TOP_K,
  DEFAULT_SCREEN_ITERATIONS,
  promotionRule,
  type ScreeningResult,
} from "./promotion.js";
import { compose } from "./compose.js";
import {
  contentHashOf,
  ENGINE_VERSION,
  type HashedGearItem,
} from "./content-hash.js";
import {
  capStateFrom,
  hitRegression,
  isHitDriven,
  statDeltaBetween,
  type CapState,
} from "./caps.js";
import { cutoffForSpec, meetsCutoff, type Cutoff } from "./cutoff.js";
import {
  buildStandingAssumptions,
  substitutionsFromMetaRepair,
  type Assumptions,
  type Substitution,
} from "./disclosure.js";
import { findMetaGemId, gemsForPhase, getGem, type GemEntry } from "./gems.js";
import { enchantAppliesToItem } from "./enchants.js";
import {
  equipmentFromLoggedGear,
  socketedItemsFromLoggedGear,
} from "./logged-gear.js";
import {
  MetaRepairError,
  repairAndMinimize,
  type MetaRepairSwap,
  type SocketedItem,
} from "./meta-repair.js";
import { isKaelTempLegendary } from "./kael-temp.js";
import {
  filterPoolByPhase,
  simSlotsForPoolSlot,
  type ItemSource,
  type PoolEntry,
  type SimSlotName,
} from "./pool.js";
import type { FightSummary, GearSource } from "./seams/gear-source.js";
import {
  simCacheKey,
  type RaidSimRequest,
  type SimObservation,
  type SimRunOpts,
  type SimRunner,
} from "./seams/sim-runner.js";
import type { Store } from "./seams/store.js";
import {
  assertUsableSeeds,
  DegenerateSeedsError,
  pairedReplicateSe,
  PAIRED_REPLICATE_TOP_N,
  usesPairedReplication,
} from "./se.js";
import { setBreakNote } from "./set-bonus.js";
import {
  brokenSetBonuses,
  computeSynergy,
  isBonusImplemented,
  nextMeasurableThreshold,
  selectPackage,
  setCounts,
  setLabel,
  SET_THRESHOLDS,
  type BrokenSetBonus,
  type DpsSample,
  type IndividualDelta,
  type SelfSetConfound,
  type SetThreshold,
  type UnmeasuredReason,
} from "./set-value.js";
import {
  plausibilityWarnings,
  type PlausibilityWarning,
} from "./plausibility.js";
import type { WornUnrankableItem } from "./dead-slots.js";
import { getItem } from "./items.js";
import { classifySpec, matchesRequestedSpec, treeName } from "./spec.js";
import { SIM_ORDER, type SimItemSpec } from "./slots.js";
import type {
  CharacterRef,
  ContentPhase,
  DetectedSpecId,
  FightRef,
  Race,
  SpecId,
} from "./types.js";

export type RankInput = {
  character: CharacterRef;
  spec: SpecId;
  maxPhase: ContentPhase;
  fight?: FightRef;
  race?: Race;
  iterations?: number;
  seeds?: number[];
  /**
   * Pre-M2 (or `fullPool: true`): keeps the first N candidates of the EP
   * ordering, plus every owned row regardless of N (§5.1.1). Once racing is
   * active, the cap instead applies to the *promoted* set (§5.1.1 Dean Q2)
   * — the sim, not EP, picks what the cap keeps. `undefined` means "no cap"
   * — hashed identically to a cap equal to the relevant set's size
   * (content-hash.ts).
   */
  candidateCap?: number;
  /**
   * Iterations per candidate in the screening pass (candidate-pool.md §6).
   * §3.4.1 proposed 300 (the WASM point at `cost/cost(5000) = 0.102`) with
   * `promoteTopK = 35`, both measured against the E-W5 fixture
   * (`test/fixtures/slamaltman.raid-sim-request.json`), whose feral run had
   * only 16 above-cutoff rows. Ticket 204's held-out gating fixture
   * (`FERAL_SYNTHETIC_ROW`, §7.a) has **42** above-cutoff rows occupying
   * *every* global delta rank from 1 to 42 with no gaps — so any `K* < 42`
   * necessarily misses some of them even at zero noise, and 7.2's own
   * measurement (`npx vitest run packages/core/test/racing.test.ts -t 7.2`)
   * found 300/35 missed up to 18 of 42 rows across seeded noise draws.
   * Raised to 1000 (still `cost/cost(5000) = 0.235`, under the <0.25 gate —
   * §3.4.1's own table) because 1000 iterations' tighter per-candidate SE
   * is what let a much smaller `promoteTopK` recall reliably; 300 iterations
   * needed `promoteTopK` around 150 to reach the same zero-miss point,
   * which would have spent nearly as much on the promoted-cap full sims as
   * racing was meant to save. Ignored when `fullPool: true`.
   */
  screenIterations?: number;
  /**
   * How many top-screened candidates promote to a full-iteration sim
   * (candidate-pool.md §6.1). §3.4.1 proposed 35 = max(K*) + 10 from the
   * E-W5 fixture's measured K* (16 feral / 15 ret) — a fixture with only 16
   * above-cutoff feral rows. Ticket 204's held-out gating fixture then needed
   * `promoteTopK = 120` at `screenIterations = 1000` for zero misses across
   * 30 seeded noise draws, and 150 was that floor plus §3.4.1's +10-ish
   * margin.
   *
   * **150 was measured on a pool half the size of the one that ships.** K is
   * a fixed absolute budget, so the fraction of the pool it admits shrinks as
   * the pool grows: 150/246 ≈ 61% on the phase 2 fixture the number was tuned
   * on, but 150/398 ≈ 38% on the phase 3 pool every real feral run screens.
   * Ticket 221 measured that gap and it is real — at K=150 the phase 3 pool
   * loses **7 above-cutoff rows across 30 draws** (6 distinct items). Top-5
   * recall held throughout; the losses are mid-table above-cutoff rows, which
   * is exactly the "a slot's second-best row runs out of global budget"
   * mechanism the per-slot floor does not catch at j=1.
   *
   * Verified at zero misses across 30 seeded noise draws on **both** pools,
   * each with its own re-run command:
   *
   * - 246 eligible / 42 above cutoff (feral phase 2) —
   *   `npx vitest run packages/core/test/racing.test.ts -t 7.2`
   * - 398 eligible / 86 above cutoff (feral phase 3) —
   *   `npx vitest run packages/core/test/racing.test.ts -t 7.3`
   *
   * Re-measured K sweep on the phase 3 pool, 30 draws each
   * (`npx tsx packages/core/test/measure-feral-p3-recall.ts`); the phase 2
   * pool is at zero misses for every row in this table:
   *
   * ```
   *   K    misses  distinct
   *   150       7         6
   *   175       3         3
   *   190       1         1
   *   195       0         0   <- measured floor
   *   200       0         0
   *   210       0         0   <- shipped
   * ```
   *
   * 210 is the 195 floor plus the same +10-ish margin, rounded up for
   * legibility — the formula §3.4.1 used and ticket 204 reused.
   *
   * **What this costs.** Raising K buys recall with full-iteration sims, and
   * on a small pool it buys almost nothing else: full sims ÷ eligible is
   * 0.6457 on the phase 3 pool but 0.9837 on the phase 2 one, where K=210
   * admits nearly all 246 candidates and racing barely beats a full sweep.
   * That is the honest trade — the default is set by the pool the tool
   * actually ships against, and the phase 2 fixture is now the pool where
   * racing looks worst, not the pool the number is tuned to.
   *
   * Runtime-independent in the same sense §3.4.1 argued (a property of rank
   * correlation and cutoff density, not of CLI vs WASM cost) — but tied to
   * these fixtures' cutoff density, which is a fact about the gear pool, not
   * about the runtime. A materially larger pool than 398 is unmeasured
   * territory again. Ignored when `fullPool: true`.
   */
  promoteTopK?: number;
  /**
   * How many candidates promote from **each slot's own** screening ranking
   * (candidate-pool.md §6.4 option (a)). Generalizes the best-in-slot floor
   * from top-1 to top-`j`; `1` reproduces the pre-§6.4 rule exactly.
   *
   * Why a per-slot floor and not just a bigger `promoteTopK`: upgrade deltas
   * scale with how outdated the worn piece is, so one global ranking is not a
   * fair comparison across slots. A slot whose upgrades are all small (a
   * near-BiS cloak) falls below any global cutoff *as a block*, losing the
   * precision needed to order that slot at all — which is the clustered miss
   * M1.5 measured (ret: all six worst-ranked rows were cloaks; feral: belts
   * and necks). §6.4 recorded that no `promoteTopK` clearing the 7.2 recall
   * gate also reaches the ≤0.4 ratio target: recall and ratio pulled against
   * each other because a global K buys coverage only by buying volume. A
   * per-slot floor buys coverage directly, so `promoteTopK` no longer has to
   * carry it.
   *
   * **Defaults to 1 (the pre-§6.4 floor) because raising it does not pay
   * here.** §6.4 predicted j=5 would land the ratio ~0.354, under the ≤0.4
   * target. Measured on the gating feral fixture over 30 noise draws
   * (246 eligible, 42 above-cutoff, 14 slots), it does not:
   *
   * ```
   *   K    j   ratio   misses      K    j   ratio   misses
   * 150    1  0.7146     0        60    5  0.3768    53
   * 150    5  0.7232     0        40    5  0.3252   147
   * 120    5  0.5822     0         0    5  0.3084   218
   * 100    5  0.5123     1         0   10  0.5959    21
   *  80    5  0.4416     6
   * ```
   *
   * Three things that table settles. j=5 at the shipped K *raises* the ratio
   * (0.7146 → 0.7232) — the floor and a large K overlap rather than
   * substitute. No (K, j) reaches ≤0.4 at zero misses; the best zero-miss
   * point is K=120/j=5 at 0.5822. And a larger j cannot rescue a small K: at
   * K=0, j=10 still misses 21 rows at a *worse* ratio than K=120/j=5.
   *
   * Why the prediction missed: 42 above-cutoff rows over 14 slots averages 3
   * per slot but is not spread evenly, so a floor deep enough for the dense
   * slots promotes redundantly in the sparse ones — while the dense slots
   * still need K to reach past j. The clustered-miss mechanism M1.5 measured
   * is real; it just is not what binds the ratio on this fixture.
   *
   * Kept as a knob rather than reverted: the mechanism is fixture-dependent,
   * and a pool with more slots or a flatter cutoff would change the table.
   * Re-measure before changing the default — recall gate is `npx vitest run
   * packages/core/test/racing.test.ts -t 7.2`, and the ratio re-run command
   * is `npx tsx packages/core/test/measure-racing-ratio.ts`, which reports
   * 0.9708 (233 full-iteration sims of 240 eligible) at the shipped K=210.
   * That script ranks the **ret** tuning fixture, while the table above and
   * the 0.6457/0.9837 figures were measured on the **feral** fixture through
   * the 7.0 gate's `CountingSimRunner` (ticket 221 harness); the ret P2
   * number corroborates the feral P2 one — on both **P2 pre-raid** pools,
   * at K=210 racing barely beats a full sweep (ticket 223). Do not carry
   * that across tiers: the one P3 figure on record is 0.6457, where racing
   * does real work, because a P3 character already wears near-optimal gear
   * and most of the pool is an obvious loss. The shallow, flat pre-raid
   * pool is what makes K=210 admit nearly everything.
   *
   * ## The floor is inert on the shipped feral P3 pool (ticket 222)
   *
   * Measured over 30 noise draws: the floor promotes **zero additional rows
   * at K=210 and zero at K=150 alike**. The global top-K already takes every
   * slot's screening argmax, so `promotionRule`'s per-slot `slice(0, j)`
   * finds nothing left to add at either value.
   *
   * The cause is **cutoff density and slot count on this pool, not the value
   * of K**: 398 entries spread over 14 slots (largest weapon 91, smallest
   * ranged 2), with K admitting 38–53% of the pool. At that density every
   * slot's argmax clears the global cutoff on its own. Lowering K back to 150
   * would not reactivate the floor — the sweep runs both values so this is
   * re-runnable rather than asserted.
   *
   * What *would* change it, and should re-trigger this measurement: a
   * materially larger pool, more slots, or a much smaller K/pool ratio. Any
   * of those can put a slot's argmax outside the global top-K and give the
   * floor real work, at which point the depth question below reopens.
   *
   * ## Screening SE at 1,000 iterations, measured
   *
   * **5.128 DPS** mean (min 2.36, max 6.08) over the 461 recorded feral P3
   * candidates; the pairwise difference scale is `sqrt(2) * SE ≈ 7.25 DPS`.
   * This replaces the `1/sqrt(n)` extrapolation off F10's ~6.8 DPS at 300
   * iterations, which gives 3.72 DPS and sits 27% below the measured mean.
   * `stdev` is a per-iteration population sd with no `/sqrt(N)` applied
   * (`vendor/tbc-new-fork/sim/core/sim_concurrent.go:138`), so `SE =
   * stdev/sqrt(n)` is the correct shape rather than an inherited assumption.
   *
   * ## Ordering below the argmax
   *
   * Screened rows are not deleted: `rank.ts` orders them against each other
   * by screening delta. Within-slot ordering noise below the argmax is
   * bounded under the repo's own **independent-Gaussian noise model using
   * real per-candidate stdevs** — 6,306 inversions of 103,616 pairs (6.09%)
   * over 30 draws, maximum rank displacement 12; restricted to pairs whose
   * recorded truth separates them by more than the 7.25 DPS noise scale, 587
   * of 88,046 (0.67%). Slots with a high raw rate are packed inside the noise
   * rather than misordered: trinket inverts 43% of pairs raw, but **none** of
   * its 66 pairs are separated by more than the noise scale, so no achievable
   * ordering would do better.
   *
   * **No artifact of a real shipped ordering exists** — ticket 219 saved
   * aggregates only — so this is a distributional model, not a byte replay.
   * Real screening shares a seed across candidates, so real errors are
   * plausibly correlated, and correlated errors preserve order better than
   * independent ones: these counts are a **conservative upper bound** on
   * shipped disorder, not an unbiased estimate of it. On that basis the
   * ordering is accepted and documented.
   *
   * `sme-rank-review` judged this output **trust-with-caveats** (ticket 222,
   * 2026-08-18). It upheld the sort order and supplied the game reason the
   * measurement could not: feral item value within a slot keys off a small
   * stat set that scales with item level inside a tier, so true deltas spread
   * rather than cluster. It also confirmed the trinket/finger result is a game
   * fact rather than a precision failure — TBC itemises trinkets as an effect,
   * not a stat line, so more iterations cannot resolve them. Its one caveat is
   * about **presentation**, not ordering: a list in an order reads as a
   * ranking even with `rank: null` and separate tie groups. That is ticket 224
   * (tie-group by the measurement's own resolution), not a change here.
   *
   * Every figure in these three sections: `npx tsx
   * packages/core/test/measure-within-slot-ordering.ts`.
   *
   * Ignored when `fullPool: true`.
   */
  promoteTopJ?: number;
  /**
   * Skips screening entirely and full-iteration sims every eligible
   * candidate — ADR-0018's escape flag, now paired with the racing it
   * escapes (candidate-pool.md §6.1). `true` reproduces the pre-M2 flow
   * byte-for-byte (§6.4).
   */
  fullPool?: boolean;
};

export type Deps = {
  gear: GearSource;
  sim: SimRunner;
  store: Store;
  clock: () => Date;
  /** Golden RaidSimRequest skeleton for this spec/tier (CLI loads from disk). */
  raidSimSkeleton: RaidSimRequest;
  /** Sparse or dense EP weights for meta repair (PLAN.md §9). */
  epWeights: Readonly<Record<string, number>> | readonly number[];
  /** Optional override; defaults to gemsForPhase(input.maxPhase). */
  gemPalette?: readonly GemEntry[];
  /** Curated (or test) candidate pool — filtered by maxPhase inside. */
  pool?: readonly PoolEntry[];
  /**
   * Per-request item rows for the sim's database (ticket 212). Data, not a
   * port: synchronous, no I/O, nothing to record — same family as `pool` and
   * `epWeights` (PLAN.md §5 names the three seams; these are not among them).
   *
   * The browser needs it because its WASM sim is built without `with_db`, so
   * the registry is filled per request; a candidate is never worn, so the
   * skeleton's own database never describes it. CLI callers omit it —
   * `wowsimcli` is built `with_db` — and composed requests then stay
   * byte-identical to today's.
   */
  simDatabaseFor?: (
    equipment: readonly SimItemSpec[]
  ) => Readonly<Record<string, unknown>> | undefined;
  /**
   * How many candidate sims may be in flight at once (candidate-pool.md
   * §5.1.2). A plain scalar, not a ranking input — it changes how fast a
   * run goes, never what it returns, so it stays out of the content hash.
   * Defaults to 1 (today's serial behaviour) when omitted.
   */
  concurrency?: number;
  /**
   * Stop signal (candidate-pool.md §5.1.4). On abort, in-flight sims finish
   * and the run returns a `PartialRanking` (`complete: false`); no further
   * candidates are dispatched.
   */
  signal?: AbortSignal;
};

export type Progress =
  | { stage: "resolving" }
  | { stage: "reading-gear" }
  | { stage: "composing" }
  | { stage: "building-pool" }
  /**
   * M2 racing's screening pass (candidate-pool.md §6.2), which dispatches one
   * sim per eligible candidate before any full-iteration work begins. Distinct
   * from "simming" because the two count different budgets: screening runs at
   * `screenIterations` over the whole pool, "simming" at the caller's
   * `iterations` over the promoted set only.
   *
   * `failed` is the running count of candidates whose every slot attempt threw.
   * It exists because a screening pass that loses every candidate used to be
   * indistinguishable from one that found no upgrade (ticket 156) — a status
   * line with no failure channel showed a healthy run for 394 consecutive
   * engine failures.
   */
  | { stage: "screening"; done: number; total: number; failed: number }
  | { stage: "simming"; done: number; total: number }
  /**
   * A single candidate's row finished — fired as each sim lands, ahead of
   * the "ranking" stage, so a caller can fill a skeleton row incrementally
   * rather than waiting for the whole run (candidate-pool.md §5.1.5). No
   * `stage` field: this is a side channel alongside the stage sequence
   * above, not a replacement for the "simming" done/total updates.
   */
  | { kind: "row"; row: RankedItem }
  | { stage: "ranking" };

export type RankErrorKind =
  | "character-not-found"
  | "no-qualifying-fight"
  | "gear-unreadable"
  | "meta-unsolvable"
  /**
   * The resolved fight's talents classify as a spec other than the one asked
   * for — the character's off-spec night (carry-forward 61). Refusing beats
   * ranking it: the sim would run tank gear against ret's preset and EP
   * weights and return a confident, wrong list with no error anywhere.
   */
  | "spec-mismatch"
  | "sim-failed"
  | "wcl-budget-exhausted"
  | "not-implemented"
  /**
   * A fault in our own code or in a dependency, rather than in the character,
   * the log or the sim: a slot-mapping disagreement, a store write that
   * failed. Distinct because reporting these as `sim-failed` tells an operator
   * the sim is broken and sends them to the wrong place.
   */
  | "internal";

export class RankError extends Error {
  readonly kind: RankErrorKind;

  constructor(kind: RankErrorKind, message: string) {
    super(message);
    this.name = "RankError";
    this.kind = kind;
  }
}

export type RankedItem = {
  rank: number | null;
  itemId: number;
  name: string;
  slot: PoolEntry["slot"];
  /**
   * Which sim slot the best delta came from, for the paired slots — the
   * `finger1` / `trinket2` name from `simSlotsForPoolSlot`, not an "a"/"b"
   * that leaves the reader guessing which ring is meant. Absent for
   * single-slot items.
   */
  slotChoice?: SimSlotName;
  source: ItemSource;
  /** Full provenance when the pool row carried multiple sources. */
  sources?: ItemSource[];
  deltaDps: number;
  deltaPct: number;
  se: number;
  seMethod: "independent" | "paired-replicate";
  /**
   * `false` only on a row Stop left unsimmed (candidate-pool.md §5.1.4) —
   * absent otherwise, never `true`, so an ordinary complete run never
   * carries the field at all and a reader can tell "simmed" from "this
   * `Ranking` predates Stop" apart from "this row was skipped by Stop".
   * Such a row's `deltaDps`/`se`/etc. are placeholders, excluded from
   * cutoff classification and tie groups.
   */
  simmed?: false;
  /**
   * Present only when this run raced (candidate-pool.md §6): the row was
   * screened at `iterations` and the promotion rule did not promote it to a
   * full-iteration sim. `deltaDps`/`se` above are the *screening*
   * observation, not a full sim — a third view state, distinct from
   * `belowCutoff` ("measured and small") because a screened row was never
   * measured at full precision at all. `applyView` returns these as its
   * `ruledOut` set, ordered by slot and name rather than by delta, so the
   * disclosure carries no priority claim (ticket 224); the screening
   * ordering stays here, on `items`. Never deleted — a screened row keeps
   * its screening delta rather than being dropped from `items`.
   *
   * `promoted: true` never appears here: a promoted candidate goes on to a
   * full sim and this field is absent from its finished row, exactly like
   * `simmed` never carries `true` for a normally-simmed row.
   *
   * Every screened row carries a real screening measurement: a candidate
   * whose every slot attempt threw is dropped and disclosed instead (ticket
   * 156), so `deltaDps` here is never a sentinel standing in for one.
   */
  screened?: { iterations: number; promoted: false };
  bisTags: Array<"BiS" | "Alt" | "Realistic">;
  /** Every pinned upstream gear set equipping this item, any phase. */
  curatedSets?: string[];
  /**
   * The current-phase sets behind a `BiS` tag. Rendered instead of a bare
   * `BiS` pill so the badge names the phase it is BiS *for* — upstream scopes
   * BiS per phase and there is no absolute BiS (carry-forward 47 §1).
   */
  bisSets?: string[];
  /**
   * Most of this item's stat gain is hit rating, and the player is under the
   * hit cap. Not modelling stat combinations is correct per §2's scoping rule
   * (§4); this flag is here because correct-but-misleading is still
   * misleading — the item stops being an upgrade once the cap is crossed.
   */
  hitDriven?: boolean;
  /**
   * This item is an upgrade that nonetheless *loses* hit rating while the
   * player is under the cap — the mirror of `hitDriven`, and the case the
   * report used to flag a hit gap and then quietly widen it (carry-forward 47).
   * `lost` is the rating given up; `gapAfter` is the resulting distance to cap.
   */
  hitRegression?: { lost: number; gapAfter: number };
  setBonusNote?: string;
  /**
   * Gems meta repair recoloured on *other* worn items to activate this
   * candidate's meta — the per-row half of PLAN.md §9 policy item 5
   * (ticket 107). Absent, never an empty array, when the swap needed no
   * adjustment: a row carrying `[]` reads as a disclosure that was considered
   * and came back empty, which is a different claim from "nothing to
   * disclose" only when the field is present.
   */
  gemSubstitutions?: Array<{
    itemId: number;
    socketIndex: number;
    from: number;
    to: number;
  }>;
  /**
   * This row's delta was measured with the candidate's meta socket empty —
   * the ranked spec has no recorded meta preference (`SPEC_PREFERRED_METAS`),
   * so no gem was seated and the price omits a meta's stats and effect. The
   * per-row half of `missingMetaPreferenceNote`'s run-level disclosure.
   */
  emptyMetaSocket?: boolean;
  owned?: boolean;
  belowCutoff: boolean;
  /**
   * Present when this item's set has any measured/attempted `SetBonusValue`
   * (spec §3) — including the crossing case, so a renderer can say "completes
   * 2pc (included in delta)" instead of silently having nothing to say.
   */
  setContext?: SetContext;
};

export type SetContext = {
  setId: number;
  setName: string;
  piecesWornBefore: number;
  piecesAfterSwap: number;
  nextThreshold: SetThreshold | null;
  /** True ⇒ the bonus is already inside `deltaDps`; no `prospectiveBonusDps`. */
  crossesThreshold: boolean;
  prospectiveBonusDps?: number;
  /**
   * Other sets the measured package displaced, carried from the source
   * `SetBonusValue.breaks`. Non-empty ⇒ `prospectiveBonusDps` is confounded:
   * the lost bonus is charged once in `packageDelta` but k times across
   * `Σ singles`, inflating by `(k−1)·B` with no way to separate it after the
   * fact. Such a figure is disclosed but never ranked on — ticket 90.
   */
  prospectiveBonusBreaks?: BrokenSetBonus[];
  /**
   * The set's measured completion packages, one entry per measured threshold,
   * smallest first — present when the item's id appears in any of them
   * (owner decisions, 2026-08-10 and 2026-08-11; spec §4).
   *
   * Every measured threshold rides along, not just the largest. Ticket 118:
   * the largest-threshold-first rule meant a positive 2pc package reached no
   * row whenever the 4pc measured negative — on the ret artifact every
   * Lightbringer row carried -6.83 while +11.31 was visible only in the
   * panel. Both figures are data; the reader sees them side by side, and
   * package mode sorts by the best of them.
   *
   * Membership is keyed on `packageItemIds` rather than on `nextThreshold`
   * because the two disagree exactly where the feature matters: at 0 pieces
   * worn every single swap lands at `piecesAfterSwap === 1`, so
   * `nextThreshold` pins to an implemented 2pc and a threshold-keyed lookup
   * reaches only the 2pc package's members (ADR-0023's ticket-91 case). The
   * four-piece package's other members would carry nothing.
   *
   * `deltaDps` is `SetBonusValue.packageDeltaDps` — one sim of the assembled
   * package against the baseline, with any broken set's cost already inside the
   * measurement. It is deliberately **not** `bonusDps`, the derived
   * `packageDelta − Σ singles` split that carries the `(k−1)·B` inflation
   * ticket 90 suppresses from ranking.
   */
  packages?: SetPackageContext[];
};

export type SetPackageContext = {
  threshold: SetThreshold;
  /** `SetBonusValue.packageDeltaDps`: sim-measured, breaks netted in. */
  deltaDps: number;
  /** The package's members, canonical-slot order — this row among them. */
  itemIds: number[];
  /** How many pieces the package assembles, for the row's label. */
  piecesNeeded: number;
};

export type SetBonusValue = {
  setId: number;
  setName: string;
  threshold: SetThreshold;
  piecesWorn: number;
  packageItemIds: number[];
  packageDeltaDps: number;
  bonusDps?: number;
  se?: number;
  unmeasured?: UnmeasuredReason;
  /**
   * Other sets' implemented thresholds this package drops below. Present only
   * when non-empty. `bonusDps` nets the loss in and cannot separate it, so a
   * reader must see it rather than read the number as the bonus alone.
   */
  breaks?: BrokenSetBonus[];
  /**
   * Present when this bonus was computed with its own lower threshold's term
   * missing — the lower threshold was `unmeasurable-at-this-worn-count` for
   * the same set, so `computeSynergy` subtracted nothing where it should have
   * subtracted that bonus (ticket 119 anomaly A, disclosed per ticket 127).
   * The arithmetic is unchanged; this only names what `bonusDps` is missing.
   */
  selfConfound?: SelfSetConfound;
  /**
   * Gem swaps meta repair had to make on *other* worn items to price this
   * package, accumulated over every piece the package adds (ticket 144).
   *
   * The same disclosure `RankedItem.gemSubstitutions` carries for single-item
   * rows. PLAN.md §9 policy item 5 is written over adjustments generally, but
   * the package arm went through `equipmentForCandidateSwap`, which discards
   * the swap list, so these rows stayed silent where the policy says they
   * should speak. Absent, never an empty array, when the package needed no
   * adjustment — same reasoning as the per-row field.
   */
  gemSubstitutions?: Array<{
    itemId: number;
    /** Equipment-array position: two worn rings share an id but not this. */
    itemIndex: number;
    socketIndex: number;
    from: number;
    to: number;
  }>;
};

/**
 * Which fight answered this run, and by which route (PLAN.md §4).
 *
 * `route` is the part with teeth. A caller cannot otherwise tell a ranked
 * resolve from the report-events fallback, and the two carry different
 * confidence — the fallback walks a report's fights rather than a ranked
 * parse, so it can land on a fight the character performed unusually in.
 * Surfacing it is what lets a UI say which one it got.
 */
export type ResolvedFight = {
  reportCode: string;
  fightId: number;
  /** Absent when the source did not describe this fight — see `killedAt`. */
  encounterName?: string;
  /**
   * Absent when the capture cannot supply one. Optional rather than `""`,
   * because an empty string is indistinguishable from a real value that
   * failed to format, and a UI rendering it would print a blank where it
   * meant "unknown". A raw report carries fight times as offsets from the
   * report's own start, so deriving a wall clock needs a field
   * `wcl_probe.py --raw-out` does not persist — inventing one would put a
   * fabricated date on a fixture whose whole job is being real.
   */
  killedAt?: string;
  route: FightSummary["route"];
  /** Carried from `FightSummary` so the caller can disclose it (§5.4). */
  confidence?: number;
  /** Carried from `FightSummary`; absent means never measured, not zero. */
  salvationUptime?: number;
};

export type Ranking = {
  contentHash: string;
  cutoff: Cutoff;
  /** Which fight answered, and by which route. */
  fight: ResolvedFight;
  baseline: { dps: number; stdev: number; metaAdjusted: boolean };
  assumptions: Assumptions;
  substitutions: Substitution[];
  /** Required by §4 — a Ranking you can't audit is not a Ranking. */
  caps: CapState;
  items: RankedItem[];
  /** Completion-package synergy per (set, threshold) — spec §2.2. */
  setBonuses?: SetBonusValue[];
  /**
   * Sanity checks that fired on this run (ticket 98). Computed here rather
   * than at render time because both need the worn `equipment`, which a
   * `Ranking` does not carry. Present only when non-empty.
   */
  plausibilityWarnings?: PlausibilityWarning[];
  /**
   * `true` unless Stop cut this run short (candidate-pool.md §5.1.4).
   *
   * The literal type does real work at every consumer that names `Ranking`
   * in its signature — `applyView` (view.ts) will not accept a
   * `PartialRanking`, and `cli.ts` must assert rather than narrow. It does
   * **not** guard the ranking cache: `Store.put<T>` (seams/store.ts:39) is
   * generic, so `store.put(rankingCacheKey(hash), partial)` type-checks
   * fine. The only thing keeping a partial out of the cache is the
   * `if (aborted) return partial` branch below, which returns before the
   * write — a runtime check, so treat it as one and do not remove it on the
   * theory that the type covers you.
   */
  complete: true;
};

/**
 * What `rankUpgrades` returns when `Deps.signal` aborts mid-run
 * (candidate-pool.md §5.1.4). Rows Stop never reached carry
 * `simmed: false` and are excluded from `rank`/cutoff classification and
 * tie groups; per-sim cache rows for whatever did complete are still
 * written, so a re-run resumes cheaply. Never written to the ranking
 * cache — only a `complete: true` `Ranking` is.
 */
export type PartialRanking = Omit<Ranking, "complete"> & { complete: false };

/** The best of a candidate's slot attempts, before it becomes a `RankedItem`. */
type BestSwap = {
  deltaDps: number;
  stdev: number;
  /**
   * The winning slot's composed request, kept so paired replication can re-sim
   * *this* candidate under further seeds without recomposing the swap.
   * Recomposing is a second construction of the same object, and a chance for
   * the replicated arm to measure something the ranked delta never came from.
   */
  request: RaidSimRequest;
  slotChoice?: SimSlotName;
  /** The SIM_ORDER index the winning attempt swapped, for set-package selection. */
  slotIndex: number;
  setBonusNote?: string;
  hitDriven: boolean;
  hitRegression: { lost: number; gapAfter: number } | null;
  /** Repair swaps on other worn items, per the winning slot attempt (107). */
  repairSwaps: readonly MetaRepairSwap[];
  /**
   * The gems the winning attempt actually priced the candidate with, so a
   * disclosure can describe what was measured rather than what the socket
   * colours imply (ticket 139).
   */
  candidateGems: readonly number[];
};

const DEFAULT_ITERATIONS = 3000;
/**
 * Five distinct seeds, because `usesPairedReplication` is what switches §10
 * Stage 2 on and it keys off `seeds.length > 1` (`se.ts`). A single default
 * seed left the whole paired-replicate path implemented, tested and dead: no
 * caller passes `seeds`, so `replicateTopItems` returned at its first line on
 * every real run and the shortlist shipped the Stage 1 `independent` SE that
 * §10:705 records as overstating a shared-seed delta's variance.
 *
 * These are the five seed values `docs/five-seed-spread.json` measured
 * spread at — that file ran at 5000 iterations, not this module's 3000, so
 * only the seed values transfer, not the SE evidence at this configuration.
 */
const DEFAULT_SEEDS = [11, 22, 33, 44, 55];
/**
 * Hashed and disclosed from one place, so the two cannot drift apart. Now
 * per-spec, which keeps that property: both call sites read this one function,
 * so a spec added here reaches the content hash and the assumptions drawer
 * together or not at all.
 */
const PRESET_ID_BY_SPEC: Record<SpecId, string> = {
  ret: "ret/p2.raid-sim-skeleton",
  feral: "feral/p2.raid-sim-skeleton",
};

function presetIdFor(spec: SpecId): string {
  return PRESET_ID_BY_SPEC[spec];
}

export async function rankUpgrades(
  input: RankInput,
  deps: Deps,
  onProgress?: (p: Progress) => void
): Promise<Ranking | PartialRanking> {
  onProgress?.({ stage: "resolving" });
  const cutoff = cutoffForSpec(input.spec);
  const fights = await deps.gear.findFights(input.character, input.spec);
  const maybeResolved = resolveFight(fights, input.fight);
  if (!maybeResolved) {
    throw new RankError(
      "no-qualifying-fight",
      `no qualifying fights for ${input.character.name}`
    );
  }
  // Rebound non-optional: the guard above narrows `maybeResolved`, but that
  // narrowing does not reach the nested closure that builds the `Ranking`.
  const resolved: ResolvedFight = maybeResolved;
  const fight = { reportCode: resolved.reportCode, fightId: resolved.fightId };

  onProgress?.({ stage: "reading-gear" });
  // Never a cache read here — ADR-0019 hashes what this returns. The point
  // budget is defended one layer down; see CachingGearSource.
  const logged = await deps.gear.readGear(fight);

  // carry-forward 61: this is the check the resolution path was skipping.
  //
  // Refuse only on a *positive* reading that the fight is some other build.
  // Two shapes qualify, and the second is the one ticket 04 actually hit:
  // `matches: false` with a named `detected`, and `unsupported-spec` — where
  // the class is known and the favoured tree is known and simply is not this
  // spec's. A protection paladin classifies as `unsupported-spec`, not as a
  // named other spec (protection has no spec home today), so keying the
  // refusal on `detected` alone would never fire for the case that motivated
  // the ticket.
  //
  // Everything else ranks as before: no class from the source,
  // `unsupported-class`, an `ambiguous` split, or feral's
  // `needs-form-uptime` are all absence of evidence, not evidence against.
  if (logged.className !== undefined) {
    const classification = classifySpec(
      logged.className,
      logged.talentPointsByTree
    );
    const match = matchesRequestedSpec(classification, input.spec);
    const otherSpec =
      match.detected ??
      (!classification.ok && classification.reason === "unsupported-spec"
        ? `a ${treeName(logged.className, classification.treeIndex)} build`
        : undefined);
    if (!match.matches && otherSpec !== undefined) {
      throw new RankError(
        "spec-mismatch",
        `${input.character.name}'s ${resolved.encounterName} fight reads as ` +
          `${otherSpec}, not ${input.spec} (talents ` +
          `${logged.talentPointsByTree.join("/")}) — pick another fight with ` +
          `--fight, or rank the spec they actually played`
      );
    }
  }

  onProgress?.({ stage: "composing" });
  // PLAN.md §8.2 / race standing assumption: default to the preset skeleton's
  // race (ret P2 is Blood Elf), not a hardcoded Human — WCL does not carry race.
  const race = input.race ?? raceFromSkeleton(deps.raidSimSkeleton);
  // Captured before repairMeta so minimizeRegems has the player's actual
  // worn gems to restore — `socketed` below is reassigned to the repaired
  // layout in place, and once that happens the pre-repair state is gone.
  const preRepairSocketed = socketedItemsFromLoggedGear(logged);
  let socketed: SocketedItem[] = preRepairSocketed;
  let metaAdjusted = false;
  let metaSwaps: MetaRepairSwap[] = [];
  const gems = gemContext(
    deps.gemPalette ?? gemsForPhase(input.maxPhase),
    deps.epWeights,
    input.spec
  );
  try {
    const minimized = repairAndMinimize({
      items: preRepairSocketed,
      epWeights: deps.epWeights,
      palette: gems.fillPalette,
    });
    socketed = minimized.items;
    metaAdjusted = minimized.metaAdjusted;
    metaSwaps = minimized.swaps;
  } catch (err) {
    // The baseline gear is the character's own worn layout — there is no
    // fallback to fall through to, so both MetaRepairError subclasses abort
    // the whole ranking here (unlike the per-candidate path below, where a
    // repair failure on one candidate must not take the rest of the run
    // down with it).
    if (err instanceof MetaRepairError) {
      throw new RankError("meta-unsolvable", err.message);
    }
    throw err;
  }

  const equipment = applyRepairedGems(
    equipmentFromLoggedGear(logged),
    socketed
  );

  // Every request describes its own equipment in its own database, which is
  // upstream's invariant (ui/core/sim.ts:346-347). Without a resolver this is
  // exactly today's compose call, so CLI requests stay byte-identical.
  const composeFor = (forEquipment: readonly SimItemSpec[]) => {
    const database = deps.simDatabaseFor?.(forEquipment);
    return compose(deps.raidSimSkeleton, {
      name: input.character.name.toLowerCase(),
      race,
      equipment: forEquipment,
      // Spread rather than `database: undefined` — exactOptionalPropertyTypes
      // distinguishes an absent key from an explicit undefined, and compose
      // must see no key at all when there is no resolver.
      //
      // `!== undefined`, not truthiness: an empty database is a meaningful
      // answer ("this request needs no extra rows") and must be written
      // through, where `undefined` means no resolver at all — the CLI path.
      ...(database !== undefined ? { database } : {}),
    });
  };

  const request = composeFor(equipment);

  const iterations = input.iterations ?? DEFAULT_ITERATIONS;
  const seeds = input.seeds ?? DEFAULT_SEEDS;
  // Before the job row and before any sim: a caller's bad seeds are not worth
  // a stranded `running` row or a wasted baseline run.
  try {
    assertUsableSeeds(seeds);
  } catch (err) {
    if (err instanceof DegenerateSeedsError) {
      throw new RankError("internal", err.message);
    }
    throw err;
  }
  const seed = seeds[0] ?? DEFAULT_SEEDS[0]!;
  const runOpts = { seed, iterations };

  onProgress?.({ stage: "building-pool" });
  const equippedIds = new Set(
    equipment.map((s) => s.id).filter((id): id is number => !!id)
  );
  const eligible = filterPoolByPhase(deps.pool ?? [], input.maxPhase).filter(
    (e) => !isKaelTempLegendary(e.itemId)
  );
  // Ordering runs before any sim, from raw stats only, so it cannot fail on
  // a candidate the sim itself would later reject. Pre-M2 (or `fullPool`)
  // this order also decides which N the cap keeps (§5.1.1); once racing is
  // active it is a tie-break only — the sim decides the cap via screening.
  const ordered = orderCandidatesByEp(
    eligible,
    equipment,
    deps.epWeights,
    (itemId) => getItem(itemId)?.stats ?? []
  );
  const racing = input.fullPool !== true;
  const screenIterations = input.screenIterations ?? DEFAULT_SCREEN_ITERATIONS;
  const promoteTopK = input.promoteTopK ?? DEFAULT_PROMOTE_TOP_K;
  const promoteTopJ = input.promoteTopJ ?? DEFAULT_PROMOTE_TOP_J;

  // Read once and shared with the sim cache below, so the version a result is
  // filed under is always the version it was hashed with.
  const simVersion = await deps.sim.version();

  // Hashed on every *eligible* candidate, not the post-cap/post-promotion
  // set: which candidates are eligible is known before any sim runs, so this
  // is stable enough to gate the cache lookup before screening or full sims
  // start. `candidateCap` and the racing knobs are separate hashed fields
  // (below) that narrow the eligible set down to what actually gets a full
  // sim — hashing here rather than at entry because the logged gear is the
  // largest input to every delta, and it is not known until readGear
  // resolves. The check still lands before the sim loop, which is the
  // expensive part.
  const contentHash = contentHashOf({
    character: input.character,
    spec: input.spec,
    maxPhase: input.maxPhase,
    race,
    fight,
    gear: { items: logged.items as readonly HashedGearItem[] },
    candidates: ordered.map((e) => ({ itemId: e.itemId, slot: e.slot })),
    gemPaletteIds: gems.palette.map((g) => g.id),
    epWeights: deps.epWeights,
    presetId: presetIdFor(input.spec),
    skeleton: deps.raidSimSkeleton,
    iterations,
    seeds,
    simVersion,
    engineVersion: ENGINE_VERSION,
    ...(input.candidateCap !== undefined
      ? { candidateCap: input.candidateCap }
      : {}),
    ...(input.fullPool !== undefined ? { fullPool: input.fullPool } : {}),
    ...(racing
      ? {
          screenIterations,
          promoteTopK,
          promoteTopJ,
        }
      : {}),
  });

  const cached = await deps.store.get<Ranking>(rankingCacheKey(contentHash));
  if (cached) {
    // A hit runs no sim, and ends here so a caller that opened a progress view
    // always gets a terminal event (PLAN.md §4 as amended by ADR-0019 — the
    // original "fires once" assumed a hash computable before the gear read).
    onProgress?.({ stage: "ranking" });
    return cached;
  }

  /**
   * Sims completed so far. Shared by the candidate loop and the replication
   * pass, which are sibling closures — a second counter would let the two
   * halves of one progress bar disagree.
   */
  let simsDone = 0;
  let totalSimsForProgress = 0;

  // Dedupe handle for the job API (PLAN.md §7 payoff 2): the row is keyed by
  // the same hash, so a second caller can attach rather than start a rival run.
  const job = await deps.store.job.create({ contentHash, input });
  await deps.store.job.update(job.id, { status: "running" });

  // One catch for every exit after the row exists, rather than one per throw
  // site: a stranded `running` row is a job the Stage 2 API would attach to
  // and wait on forever, and per-site handling means the next throw added
  // below re-opens that hole silently (ticket 29).
  try {
    return await rankAfterJobCreated();
  } catch (err) {
    // Best-effort: if the store is the thing that is broken, this update fails
    // too. Swallowing its error keeps the original failure — the one that
    // explains what actually went wrong — as what the caller sees.
    try {
      await deps.store.job.update(job.id, {
        status: "error",
        errorKind: err instanceof RankError ? err.kind : "internal",
        errorDetail: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // deliberately ignored — see above
    }
    throw err;
  }

  async function rankAfterJobCreated(): Promise<Ranking | PartialRanking> {
    // Only `deps.sim.run` belongs inside this catch. A store read or write
    // that fails is an `internal` fault, and labelling it `sim-failed` sends
    // an operator to the wrong subsystem.
    let observation = await readCachedSim(deps, request, simVersion, runOpts);
    if (!observation) {
      try {
        observation = await deps.sim.run(request, runOpts);
      } catch (err) {
        throw new RankError(
          "sim-failed",
          err instanceof Error ? err.message : String(err)
        );
      }
      await cacheSimResult(deps, request, simVersion, runOpts, observation);
    }
    simsDone = 1;

    const baselineDps = observation.dps;
    const ranked: RankedItem[] = [];
    /**
     * The request behind each ranked row's delta, keyed by item id. Paired
     * replication re-runs exactly these under the remaining seeds; sorting
     * `ranked` reorders the rows but never this association.
     */
    const winningRequests = new Map<number, RaidSimRequest>();
    /**
     * Candidates dropped before they could be ranked. `kind` carries why:
     * `sim` means the sim panicked on the composed swap, `repair` means the
     * sim never ran at all because meta repair could not activate the gem
     * layout. The distinction is load-bearing in the disclosure text —
     * blaming the sim for a gem problem sends an operator to the wrong
     * subsystem — but it is one sentence's difference over an identical
     * shape, which is why these were two parallel arrays (ticket 136 item 3).
     */
    const candidateSkips: {
      kind: "sim" | "repair";
      itemId: number;
      name: string;
      slot: string;
      reason: string;
    }[] = [];
    /**
     * Screening-stage sim failures (ticket 156), kept apart from
     * `candidateSkips` rather than folded into it with a `stage` field: these
     * rows describe a candidate that never reached the full-iteration pass at
     * all, so "dropped from the ranking" — what `candidateSkips` renders — is
     * the wrong sentence. A screened-out candidate still appears, carrying a
     * screening delta the failure means it does not have.
     */
    const screeningSkips: {
      kind: "sim" | "repair";
      itemId: number;
      name: string;
      slot: string;
      reason: string;
    }[] = [];
    /**
     * Every candidate's winning single-swap delta, by item id — the input
     * `selectPackage` (set-value.ts §2.2 step 1) needs to rank same-set
     * candidates by their own measured `deltaDps`. Populated alongside `best`
     * in the candidate loop below.
     */
    const individualDeltasByItemId = new Map<number, IndividualDelta>();

    // From the repaired layout, which is what the sim actually ran. Hoisted
    // above the loop because `hitDriven` prices each candidate against it.
    const talentsString = talentsStringFromRequest(request);
    const caps = capStateFrom(equipment, socketed, {
      assumedRace: race,
      spec: input.spec,
      ...(talentsString !== undefined ? { talentsString } : {}),
    });

    /**
     * One candidate's best screening delta (candidate-pool.md §6.1/§6.2) —
     * every slot attempt at `screenIterations`, cheapest-delta-wins exactly
     * like `runCandidate`'s full-iteration loop, but with none of the
     * disclosure bookkeeping (hit caps, gem substitution notes, set-bonus
     * context) a screened candidate never carries: only promoted candidates
     * get a `RankedItem`'s full shape. A candidate whose every slot attempt
     * panics screens at `-Infinity`, which is a refusal the *promotion rule*
     * then honours by skipping non-finite screens (`promotion.ts`). The
     * sentinel never reaches a `RankedItem`: the screened-row builder clamps
     * it to 0, because `JSON.stringify(-Infinity)` is `null` and a
     * rehydrated `null` would poison the sort comparator.
     *
     * A failing slot attempt also records a `screeningSkips` row (ticket 156).
     * The sentinel alone was not disclosure: it stops a failure counting as a
     * *win*, but it renders as `~0.0` and reads as "measured, and no better",
     * so a run that lost every candidate to engine panics exited green as "no
     * upgrades found above the cutoff". The full-iteration loop has always
     * pushed a `candidateSkips` row for the same event; this is that rule
     * applied to the path racing actually takes in the browser.
     */
    async function screenCandidate(entry: PoolEntry): Promise<number> {
      const slotNames = simSlotsForPoolSlot(entry.slot);
      let best: number | undefined;
      const screenOpts = { seed, iterations: screenIterations };
      for (const slotName of slotNames) {
        const slotIndex = SIM_ORDER.indexOf(slotName);
        if (slotIndex < 0) continue;
        const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
        if (wornAt >= 0 && wornAt !== slotIndex) continue;
        let swapped: SimItemSpec[];
        try {
          swapped = candidateSwapWithRepairs(
            equipment,
            slotIndex,
            entry.itemId,
            gems
          ).equipment;
        } catch (err) {
          // Recorded for the same reason the sim failure below is: a repair
          // that cannot activate the meta drops the candidate, and the
          // screening stage must disclose that as loudly as the
          // full-iteration stage does (rank.ts's `candidateSkips` repair row).
          if (!(err instanceof MetaRepairError)) throw err;
          screeningSkips.push({
            kind: "repair",
            itemId: entry.itemId,
            name: entry.name,
            slot: slotName,
            reason: err.message,
          });
          continue;
        }
        const candReq = composeFor(swapped);
        let candObs = await readCachedSim(
          deps,
          candReq,
          simVersion,
          screenOpts
        );
        if (!candObs) {
          try {
            candObs = await deps.sim.run(candReq, screenOpts);
          } catch (err) {
            // Recorded, not swallowed — see this function's doc comment. Only
            // the *sim* call sits inside this catch: a failing store read
            // above would otherwise be disclosed as an engine panic.
            screeningSkips.push({
              kind: "sim",
              itemId: entry.itemId,
              name: entry.name,
              slot: slotName,
              reason: err instanceof Error ? err.message : String(err),
            });
            continue;
          }
          await cacheSimResult(deps, candReq, simVersion, screenOpts, candObs);
        }
        const deltaDps = candObs.dps - baselineDps;
        if (best === undefined || deltaDps > best) best = deltaDps;
      }
      return best ?? Number.NEGATIVE_INFINITY;
    }

    /**
     * One candidate's full slot-attempt loop, unchanged from the old serial
     * body except that it is now a `promisePool` task rather than one turn
     * of a `for` loop (candidate-pool.md §5.1.2) — every mutation below
     * still lands on the shared `ranked`/`candidateSkips`/
     * `individualDeltasByItemId`/`winningRequests` collections, which is
     * safe because JS interleaves at `await` points only, never inside a
     * synchronous stretch of code. Ordering downstream never depends on
     * which task finishes first: `ranked` is sorted by `deltaDps` right
     * after the pool drains, and `candidateSkips` is sorted by item id
     * before it feeds `substitutions` below — both so two runs at
     * different `concurrency` values produce byte-identical output (7.3).
     */
    async function runCandidate(entry: PoolEntry): Promise<void> {
      const owned = equippedIds.has(entry.itemId);
      const slotNames = simSlotsForPoolSlot(entry.slot);
      let best: BestSwap | null = null;

      for (let s = 0; s < slotNames.length; s++) {
        const slotName = slotNames[s]!;
        const slotIndex = SIM_ORDER.indexOf(slotName);
        // `continue` here would drop the candidate from the ranking silently —
        // the item just never appears, with no error and no substitution row.
        // Every ItemSlot resolves today, so reaching this means the mapping in
        // simSlotsForPoolSlot and slots-table.json disagree, which is a bug in
        // the table rather than anything about this character's gear.
        if (slotIndex < 0) {
          throw new Error(
            `slot mapping bug: ${entry.slot} -> ${slotName} is not in SIM_ORDER ` +
              `(item ${entry.itemId} ${entry.name})`
          );
        }
        // A paired slot tries both placements and keeps the better one, so
        // without this an item already worn in finger2 gets swapped over
        // finger1 as well — pricing a *second copy* the game will not equip,
        // and shipping it as an upgrade for gear the player already has on
        // (carry-forward 46). Skipping leaves the identity swap as the only
        // outcome for a worn item, which is what every unpaired slot already
        // does. Written against the equipment array rather than special-cased
        // to fingers so trinkets and any later paired slot inherit it.
        const wornAt = equipment.findIndex((spec) => spec.id === entry.itemId);
        if (wornAt >= 0 && wornAt !== slotIndex) continue;
        let swapped: SimItemSpec[];
        let repairSwaps: readonly MetaRepairSwap[];
        try {
          const outcome = candidateSwapWithRepairs(
            equipment,
            slotIndex,
            entry.itemId,
            gems
          );
          swapped = outcome.equipment;
          repairSwaps = outcome.swaps;
        } catch (err) {
          // A repair failure is a fact about this one candidate's gem layout,
          // not about the character or the rest of the pool — it must skip
          // this slot attempt exactly like a sim panic does below, not take
          // the whole ranking down (review-corrections.md item 4).
          if (!(err instanceof MetaRepairError)) throw err;
          candidateSkips.push({
            kind: "repair",
            itemId: entry.itemId,
            name: entry.name,
            slot: slotName,
            reason: err.message,
          });
          continue;
        }
        const candReq = composeFor(swapped);
        // Outside the catch below: only a failing *sim* may skip a candidate.
        // A failing store read routed in there would push a `sim`-kind skip
        // blaming the sim, drop the item, and return a ranking one place
        // short with no error anywhere.
        let candObs = await readCachedSim(deps, candReq, simVersion, runOpts);
        if (!candObs) {
          try {
            candObs = await deps.sim.run(candReq, runOpts);
          } catch (err) {
            // Class-locked item effects (e.g. hunter set bonuses on mail) can panic
            // wowsimcli when equipped on ret — skip this slot attempt. Recorded
            // rather than swallowed: a candidate that never simmed must not be
            // indistinguishable from one that simmed badly.
            candidateSkips.push({
              kind: "sim",
              itemId: entry.itemId,
              name: entry.name,
              slot: slotName,
              reason: err instanceof Error ? err.message : String(err),
            });
            continue;
          }
          await cacheSimResult(deps, candReq, simVersion, runOpts, candObs);
        }
        const deltaDps = candObs.dps - baselineDps;
        const note = setBreakNote(equipment, slotIndex, entry.itemId);
        if (!best || deltaDps > best.deltaDps) {
          const statDelta = statDeltaBetween(equipment, swapped);
          const next: BestSwap = {
            deltaDps,
            stdev: candObs.stdev,
            request: candReq,
            slotIndex,
            hitDriven: isHitDriven(statDelta, caps.hit, { deltaDps }),
            hitRegression: hitRegression(statDelta, caps.hit, { deltaDps }),
            repairSwaps,
            candidateGems: swapped[slotIndex]?.gems ?? [],
          };
          if (slotNames.length > 1) {
            next.slotChoice = slotName;
          }
          if (note) next.setBonusNote = note;
          best = next;
        }
      }

      simsDone += 1;
      onProgress?.({ stage: "simming", done: simsDone, total: totalSims });

      if (!best) return;

      // Recorded before the cutoff/rank logic below: package selection needs
      // every candidate's own measured delta, including below-cutoff rows —
      // a set piece that is individually a downgrade can still be the best
      // available filler for a completion package (V0b: all four Thunderheart
      // singles were negative, and the package was still worth +91.68 DPS).
      individualDeltasByItemId.set(entry.itemId, {
        itemId: entry.itemId,
        slotIndex: best.slotIndex,
        deltaDps: best.deltaDps,
        se: best.stdev / Math.sqrt(iterations),
      });

      const deltaPct =
        baselineDps === 0 ? 0 : (best.deltaDps / baselineDps) * 100;
      const belowCutoff = !meetsCutoff(best.deltaDps, deltaPct, cutoff);
      const item: RankedItem = {
        rank: null,
        itemId: entry.itemId,
        name: entry.name,
        slot: entry.slot,
        source: entry.source,
        deltaDps: best.deltaDps,
        deltaPct,
        // PLAN.md §10 Stage 1: independent SE of the mean = stdev / √n
        se: best.stdev / Math.sqrt(iterations),
        seMethod: "independent",
        bisTags: entry.bisTags ?? [],
        ...(entry.curatedSets ? { curatedSets: entry.curatedSets } : {}),
        ...(entry.bisSets ? { bisSets: entry.bisSets } : {}),
        belowCutoff,
      };
      if (entry.sources) item.sources = entry.sources;
      if (best.hitDriven) item.hitDriven = true;
      if (best.hitRegression) item.hitRegression = best.hitRegression;
      if (best.slotChoice) item.slotChoice = best.slotChoice;
      if (best.setBonusNote) item.setBonusNote = best.setBonusNote;
      if (best.repairSwaps.length > 0) {
        item.gemSubstitutions = best.repairSwaps.map((s) => ({
          itemId: s.itemId,
          socketIndex: s.socketIndex,
          from: s.from,
          to: s.to,
        }));
      }
      if (owned) item.owned = true;
      if (metaSocketUnpriced(entry.itemId, best.candidateGems, gems.spec)) {
        item.emptyMetaSocket = true;
      }
      ranked.push(item);
      winningRequests.set(entry.itemId, best.request);
      onProgress?.({ kind: "row", row: item });
    }

    // M2 racing (candidate-pool.md §6.2): screen all eligible, apply the
    // promotion rule, then cap the *promoted* set — the sim, not EP, picks
    // what a cap keeps once racing is active (§5.1.1 Dean Q2). Pre-M2 or
    // `fullPool: true` keeps today's flow: cap the EP order directly, no
    // screening pass, no screened rows.
    let simCandidates: PoolEntry[];
    const screenedRows: RankedItem[] = [];
    if (racing) {
      const screenSignal = deps.signal;
      // Screening's own progress channel (ticket 156). Counted here rather
      // than from `screeningSkips.length` because that collection counts slot
      // *attempts* — a ring or trinket contributes two — while this counts
      // candidates that ended with no finite screen at all, which is what a
      // status line means by "failed".
      let screensDone = 0;
      let screensFailed = 0;
      /**
       * Candidates that ran a screen and came back with nothing usable — as
       * opposed to ones a Stop meant never ran at all. Both return the
       * `-Infinity` sentinel, so the delta cannot tell them apart, and the
       * difference decides whether a row is dropped as failed (ticket 122's
       * rule) or kept as unsimmed (Stop's contract, §5.1.4).
       */
      const screenFailedIds = new Set<number>();
      const screenTasks = ordered.map((entry) => async () => {
        if (screenSignal?.aborted)
          return { itemId: entry.itemId, deltaDps: Number.NEGATIVE_INFINITY };
        const deltaDps = await screenCandidate(entry);
        screensDone += 1;
        if (!Number.isFinite(deltaDps)) {
          screensFailed += 1;
          screenFailedIds.add(entry.itemId);
        }
        onProgress?.({
          stage: "screening",
          done: screensDone,
          total: ordered.length,
          failed: screensFailed,
        });
        return { itemId: entry.itemId, deltaDps };
      });
      const screenResults: ScreeningResult[] = await promisePool(
        screenTasks,
        deps.concurrency ?? 1
      );
      // Zero real signal must never render as "nothing is an upgrade" (ticket
      // 156). Every screen non-finite means either every sim threw or the
      // pool was empty; the first is a broken engine and the second has
      // nothing to say, and both are refusals rather than empty shortlists.
      // Gated on an abort because a Stop that lands before the first screen
      // completes is a user decision, not an engine failure.
      const screenedAnything = screenResults.some((r) =>
        Number.isFinite(r.deltaDps)
      );
      if (!screenedAnything && !screenSignal?.aborted && ordered.length > 0) {
        const first = screeningSkips[0]?.reason ?? "no slot attempt succeeded";
        throw new RankError(
          "sim-failed",
          `every screening sim failed: ${screensFailed} of ${ordered.length} ` +
            `candidates lost every slot attempt at ${screenIterations} ` +
            `iterations. First failure: ${first}`
        );
      }
      // Set-package membership at screening time is judged the same way the
      // full-iteration pass judges it (buildSetBonuses below): any set with
      // a candidate present in the *eligible* pool is a set the promotion
      // rule must not starve of pieces, since selectPackage picks its best
      // pieces from whichever candidates got a full sim.
      const setPackageItemIds = new Set(
        ordered
          .filter((e) => getItem(e.itemId)?.setId != null)
          .map((e) => e.itemId)
      );
      const promotion = promotionRule({
        screened: screenResults,
        candidates: ordered,
        promoteTopK,
        promoteTopJ,
        ownedItemIds: equippedIds,
        setPackageItemIds,
      });
      // A Stop during screening leaves every unscreened candidate on the
      // `-Infinity` sentinel, which the promotion rule correctly refuses to
      // promote — it cannot tell a refusal from a measurement it never got.
      // But Stop's contract (§5.1.4) is that unreached candidates come back
      // as honest `simmed: false` rows, and only a *promoted* candidate ever
      // becomes one. So an aborted screening pass keeps the pre-screening
      // order and lets the full-iteration stage's own abort filter below
      // decide what actually runs, which is none of it.
      // Candidates that *did* screen and failed stay excluded either way:
      // they are drop-and-disclose rows (ticket 122), and re-admitting one
      // here would have the ranking both disclose it as dropped and show it
      // as unsimmed — the contradiction Stop's own test pins.
      const promotedIds = screenSignal?.aborted
        ? new Set(
            ordered
              .map((e) => e.itemId)
              .filter((itemId) => !screenFailedIds.has(itemId))
          )
        : new Set(promotion.filter((p) => p.promoted).map((p) => p.itemId));
      const deltaByItemId = new Map(
        screenResults.map((r) => [r.itemId, r.deltaDps])
      );
      const promotedOrdered = ordered.filter((e) => promotedIds.has(e.itemId));
      // Cap applies to the promoted set (Dean Q2): the first N of the EP
      // order *within the promoted set*, plus every owned row regardless of
      // N — same shape as the pre-M2 cap, just over a narrower input.
      const promotedCap = input.candidateCap ?? promotedOrdered.length;
      simCandidates = promotedOrdered.filter(
        (e, i) => i < promotedCap || equippedIds.has(e.itemId)
      );
      const simCandidateIds = new Set(simCandidates.map((e) => e.itemId));
      for (const entry of ordered) {
        if (simCandidateIds.has(entry.itemId)) continue;
        // A candidate whose every screening attempt threw is dropped from the
        // ranking and disclosed in `substitutions`, exactly as one that
        // crashes at full iterations is (ticket 122's accepted drop-and-
        // disclose). One rule, not two: which iteration count the engine
        // happened to panic at is not a distinction a reader should have to
        // reason about, and a row with no measurement has nothing to show —
        // its `deltaDps` would be the clamped sentinel, rendering as a
        // measured non-gain.
        if (screenFailedIds.has(entry.itemId)) continue;
        // Screened out: either the rule never promoted it, or the post-
        // promotion cap dropped it — either way it keeps its screening
        // delta and renders as the third view state (view.ts), never
        // interleaved with full-iteration rows.
        //
        // Still clamped, for the rows Stop skipped rather than screened: they
        // carry the same `-Infinity` sentinel, which `JSON.stringify` writes
        // as `null`. A cached ranking rehydrated with `deltaDps: null` makes
        // the sort comparator `b.deltaDps - a.deltaDps` return NaN, and
        // `Array.sort` with a NaN comparator orders arbitrarily — so the
        // byte-identical-output guarantee (7.3) would hold only until a run
        // was stopped.
        const screenDelta = deltaByItemId.get(entry.itemId);
        screenedRows.push({
          rank: null,
          itemId: entry.itemId,
          name: entry.name,
          slot: entry.slot,
          source: entry.source,
          deltaDps:
            screenDelta !== undefined && Number.isFinite(screenDelta)
              ? screenDelta
              : 0,
          deltaPct: 0,
          se: 0,
          seMethod: "independent",
          screened: { iterations: screenIterations, promoted: false },
          bisTags: entry.bisTags ?? [],
          ...(entry.curatedSets ? { curatedSets: entry.curatedSets } : {}),
          ...(entry.bisSets ? { bisSets: entry.bisSets } : {}),
          belowCutoff: false,
          ...(entry.sources ? { sources: entry.sources } : {}),
        });
      }
    } else {
      const cap = input.candidateCap ?? ordered.length;
      simCandidates = ordered.filter(
        (e, i) => i < cap || equippedIds.has(e.itemId)
      );
    }

    // Counted here, after screening/promotion decide the full-iteration set
    // — screening's own sims are accounted separately (screenCandidate does
    // not touch simsDone/totalSims, which describe the full-iteration
    // budget a progress bar promises).
    const replicaSims = usesPairedReplication(seeds)
      ? (seeds.length - 1) *
        (1 + Math.min(PAIRED_REPLICATE_TOP_N, simCandidates.length))
      : 0;
    const totalSims = 1 + simCandidates.length + replicaSims;
    totalSimsForProgress = totalSims;
    onProgress?.({ stage: "simming", done: simsDone, total: totalSims });

    // Stop (candidate-pool.md §5.1.4): candidates not yet dispatched when
    // `signal` aborts are simply never started — `promisePool` stops
    // pulling new tasks once it observes the abort, so this is a plain
    // pre-dispatch filter rather than cooperative cancellation of tasks
    // already in flight. Read once so an abort mid-dispatch is a clean cut
    // rather than a race between this check and the pool's own loop.
    const signal = deps.signal;
    const dispatchedCandidates = signal?.aborted ? [] : simCandidates;
    const tasks = dispatchedCandidates.map(
      (entry) => () => runCandidate(entry)
    );
    const concurrency = deps.concurrency ?? 1;
    let aborted = signal?.aborted ?? false;
    if (tasks.length > 0) {
      if (signal !== undefined) {
        // A cooperative check between dispatches, not preemption of a task
        // already running — promisePool's own dispatch loop calls this
        // between tasks, so nothing in flight is torn down mid-sim.
        await promisePool(
          tasks.map((task) => async () => {
            if (signal.aborted) {
              aborted = true;
              return;
            }
            await task();
          }),
          concurrency
        );
      } else {
        await promisePool(tasks, concurrency);
      }
    }
    // Re-read after the pool drains: an abort raised while the *last* task
    // was in flight skips nothing, so the loop above never sets the flag,
    // yet the run must still stop before replication and set packages
    // (§5.1.4 — completeness is "the whole flow ran", not "all candidates
    // ran").
    if (signal?.aborted) aborted = true;
    // A candidate the sim panicked on is already dropped and disclosed in
    // `substitutions` (ticket 122), and it never reaches
    // `individualDeltasByItemId` either — so filtering on that map alone
    // would re-add it here as a Stop placeholder, and the ranking would
    // both say it was dropped for a sim failure and show it as unsimmed.
    const skippedIds = new Set(candidateSkips.map((s) => s.itemId));
    const unsimmedCandidates = aborted
      ? simCandidates.filter(
          (c) =>
            !individualDeltasByItemId.has(c.itemId) && !skippedIds.has(c.itemId)
        )
      : [];
    for (const entry of unsimmedCandidates) {
      // A row Stop never reached — placeholder numbers so the shape stays a
      // RankedItem, but `simmed: false` pulls it out of cutoff
      // classification and tie groups below rather than letting a zeroed
      // deltaDps masquerade as a measured one.
      ranked.push({
        rank: null,
        itemId: entry.itemId,
        name: entry.name,
        slot: entry.slot,
        source: entry.source,
        deltaDps: 0,
        deltaPct: 0,
        se: 0,
        seMethod: "independent",
        simmed: false,
        bisTags: entry.bisTags ?? [],
        ...(entry.curatedSets ? { curatedSets: entry.curatedSets } : {}),
        ...(entry.bisSets ? { bisSets: entry.bisSets } : {}),
        belowCutoff: false,
        ...(entry.sources ? { sources: entry.sources } : {}),
        ...(equippedIds.has(entry.itemId) ? { owned: true } : {}),
      });
    }
    // Deterministic regardless of completion order, so `substitutions`
    // below reads the same on every run at every `concurrency` (7.3).
    candidateSkips.sort((a, b) => a.itemId - b.itemId);
    // Same guarantee for the screening rows, which the racing path fills from
    // a `promisePool` whose completion order is not the pool order. Tie-broken
    // on slot so a paired-slot candidate's two attempts keep a fixed order.
    screeningSkips.sort(
      (a, b) => a.itemId - b.itemId || a.slot.localeCompare(b.slot)
    );

    /**
     * Package-level sim failures (Finding 5): a whole completion package has
     * no single item to blame, and its `setId` must never masquerade as an
     * `itemId` in the per-candidate `candidateSkips` shape — so this is a
     * distinct collection, named by set + threshold, folded into
     * `substitutions` alongside it rather than forced into its shape.
     */
    const packageSimSkips: {
      setId: number;
      setName: string;
      threshold: SetThreshold;
      reason: string;
    }[] = [];

    // Set-bonus packages and paired replication both dispatch further sims
    // for refinement, not for coverage — Stop's contract is "finish
    // in-flight and stop", so once aborted, neither runs; what already
    // simmed stands, and the unsimmed rows stay honestly unsimmed rather
    // than pulling more work in behind the caller's back.
    const setBonuses = aborted
      ? []
      : await buildSetBonuses(
          deps,
          simCandidates,
          equipment,
          gems,
          race,
          input,
          composeFor,
          individualDeltasByItemId,
          { dps: baselineDps, se: observation.stdev / Math.sqrt(iterations) },
          simVersion,
          runOpts,
          packageSimSkips
        );
    if (setBonuses.length > 0) applySetContext(ranked, setBonuses, equipment);
    // Screened-out rows join after set-context (they belong to no set
    // package — a package member is promoted by construction) and after
    // replication's winning-request bookkeeping is built, since they were
    // never simmed at full iterations and have no winning request to
    // register (§6.1; `applyView` returns them as its `ruledOut` set rather
    // than placing them among the ranked rows — ticket 224).
    ranked.push(...screenedRows);

    onProgress?.({ stage: "ranking" });
    // Sorted first so replication can pick the contested top of the list, then
    // sorted again below — replication rewrites the very `deltaDps` this order
    // is built from, so ranking before it would freeze the ordering the
    // refinement exists to correct. Unsimmed rows sort last regardless of
    // their placeholder deltaDps (0), so an aborted run's honest-but-unsimmed
    // rows never crowd out real deltas at the top of the list. Screened rows
    // sort after every full-iteration row (simmed or not) and are ordered
    // only against each other — a screening delta and a full-iteration delta
    // are not the same quantity (§6.1), so they must never interleave.
    const bySimmedThenDelta = (a: RankedItem, b: RankedItem): number => {
      const aScreened = a.screened !== undefined;
      const bScreened = b.screened !== undefined;
      if (aScreened !== bScreened) return aScreened ? 1 : -1;
      if (aScreened && bScreened) return b.deltaDps - a.deltaDps;
      if (a.simmed === false && b.simmed !== false) return 1;
      if (b.simmed === false && a.simmed !== false) return -1;
      return b.deltaDps - a.deltaDps;
    };
    ranked.sort(bySimmedThenDelta);
    if (!aborted) await replicateTopItems(ranked, winningRequests, baselineDps);
    ranked.sort(bySimmedThenDelta);

    let rank = 1;
    for (const item of ranked) {
      // Screened out: never measured at full precision, so there is no
      // cutoff verdict to give it and no rank to assign (§6.1) — the same
      // treatment Stop's unsimmed rows get, for the same reason.
      if (item.screened !== undefined) {
        item.rank = null;
        continue;
      }
      // Stop left this row unsimmed — excluded from cutoff classification
      // and tie groups (candidate-pool.md §5.1.4): there is no measured
      // delta to classify or group.
      if (item.simmed === false) {
        item.rank = null;
        continue;
      }
      if (item.belowCutoff) {
        item.rank = null;
      } else {
        item.rank = rank;
        rank += 1;
      }
    }

    // Worn items that never became a row at all: absent from `candidates` for
    // their slot (ticket 163 — `assemble_universe.py`'s no-source rule can
    // exclude a D7-eligible item entirely, so it survives gear-fetch and
    // `data/items/index.json` but never reaches the pool). `equippedIds` was
    // built from the same `equipment` array `ranked` is scored against, so an
    // id present there but never seen in `ranked` did not skip ranking for
    // some other reason (belowCutoff rows are still in `ranked`) — it was
    // never a candidate to begin with. Resolved through `getItem`, the same
    // item index the pool itself is built from, so the slot named here is the
    // pool bucket the item would belong to if it were in the pool.
    const rankedItemIds = new Set(ranked.map((i) => i.itemId));
    const wornUnrankable: WornUnrankableItem[] = [];
    for (const id of equippedIds) {
      if (rankedItemIds.has(id)) continue;
      const item = getItem(id);
      // No index entry either: covered by `unknown-item`/`unidentified-worn-
      // item` already, not this — `worn-unrankable` states a slot for the
      // reader, and inventing one for an item this repo cannot identify at
      // all would assert more than is known.
      if (!item) continue;
      wornUnrankable.push({ itemId: id, itemName: item.name, slot: item.slot });
    }

    // Run over the finished rows and the final `setBonuses`, so a warning
    // describes what the report will actually show rather than an intermediate.
    const warnings = plausibilityWarnings({
      baselineDps: observation.dps,
      setBonuses,
      rows: ranked.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        slot: i.slot,
        deltaDps: i.deltaDps,
        ...(i.owned === true ? { owned: true } : {}),
      })),
      wornSetCounts: setCounts(equipment),
      ...(wornUnrankable.length > 0 ? { wornUnrankable } : {}),
    });

    const rankingBase = {
      contentHash,
      cutoff,
      fight: resolved,
      baseline: {
        dps: observation.dps,
        stdev: observation.stdev,
        metaAdjusted,
      },
      assumptions: {
        maxPhase: input.maxPhase,
        seeds,
        iterations,
        race,
        presetId: presetIdFor(input.spec),
        standing: buildStandingAssumptions(race),
      },
      caps,
      substitutions: [
        ...substitutionsFromMetaRepair(metaSwaps),
        ...metaPreferenceDisclosure(gems.spec),
        ...candidateSkips.map((s) => ({
          field: `candidate ${s.itemId} (${s.slot})`,
          detail:
            `${s.name} was dropped from the ranking: ` +
            (s.kind === "sim"
              ? `the sim failed on this swap — ${s.reason}`
              : `gem repair could not activate its meta — ${s.reason}`),
        })),
        // Same `candidate <id> (<slot>)` field and same "dropped from the
        // ranking" sentence as the full-iteration skips above: a reader
        // should not have to know which iteration count the engine panicked
        // at to understand that the item is gone and why (ticket 156). The
        // screening stage is named in the detail because it is the one thing
        // that differs, and because it tells an operator the failure is on
        // the path only the browser takes.
        ...screeningSkips.map((s) => ({
          field: `candidate ${s.itemId} (${s.slot})`,
          detail:
            `${s.name} was dropped from the ranking: ` +
            (s.kind === "sim"
              ? `the sim failed on this swap during screening at ` +
                `${screenIterations} iterations — ${s.reason}`
              : `gem repair could not activate its meta — ${s.reason}`),
        })),
        ...packageSimSkips.map((s) => ({
          field: `${s.setName} ${s.threshold}pc completion package`,
          detail:
            `the ${s.setName} ${s.threshold}pc completion package could not ` +
            `be measured: the sim failed — ${s.reason}`,
        })),
      ],
      items: ranked,
      ...(setBonuses.length > 0 ? { setBonuses } : {}),
      ...(warnings.length > 0 ? { plausibilityWarnings: warnings } : {}),
    };

    if (aborted) {
      // No ranking-cache row for a partial run (candidate-pool.md §5.1.4) —
      // the type only permits `complete: true` there, so this branch is the
      // enforcement, not a convention a future edit could quietly drop.
      // Per-sim rows already landed via `cacheSimResult` inside
      // `runCandidate`, so a re-run still resumes cheaply.
      const partial: PartialRanking = { ...rankingBase, complete: false };
      await deps.store.job.update(job.id, {
        status: "done",
        result: partial,
      });
      return partial;
    }

    const ranking: Ranking = { ...rankingBase, complete: true };
    await deps.store.put(rankingCacheKey(contentHash), ranking);
    await deps.store.job.update(job.id, {
      status: "done",
      result: ranking,
    });
    return ranking;
  }

  /**
   * PLAN.md §10 Stage 2, with the method's rationale in `se.ts`.
   *
   * Three constraints that are easy to break and silent when broken:
   *
   * - Each seed's baseline and candidate must share that seed; pairing across
   *   seeds folds baseline wobble into the spread.
   * - `deltaDps` becomes the replicated mean, because that is what this SE
   *   describes. The caller re-sorts afterwards.
   * - The top N comes from above-cutoff rows, not a positional slice, so the
   *   5× budget lands on the shortlist rather than on rows the cutoff hides.
   */
  async function replicateTopItems(
    ranked: RankedItem[],
    winningRequests: ReadonlyMap<number, RaidSimRequest>,
    baselineDps: number
  ): Promise<void> {
    if (!usesPairedReplication(seeds)) return;

    // Screened and unsimmed rows are excluded before the slice, not caught by
    // the throw below: neither was ever simmed at full iterations, so neither
    // has a `winningRequests` entry to re-sim, and both sit in `ranked` with
    // `belowCutoff` false (ticket 156). Selecting on `!belowCutoff` alone let
    // the slice run past a short promoted set into them and throw on a row
    // that was never a replication candidate in the first place.
    const top = ranked
      .filter(
        (item) =>
          !item.belowCutoff &&
          item.screened === undefined &&
          item.simmed !== false
      )
      .slice(0, PAIRED_REPLICATE_TOP_N);
    if (top.length === 0) return;
    // Baseline once per seed, shared by every replicated candidate under that
    // seed — the pairing, and also what keeps this 5×(8+1) sims rather than
    // 5×8 baselines on top.
    const baselineBySeed = new Map<number, number>();
    for (const s of seeds) {
      baselineBySeed.set(s, (await simFor(request, s)).dps);
      bumpProgress(s);
    }

    for (const item of top) {
      const candReq = winningRequests.get(item.itemId);
      // A ranked row always has a winning request; a missing one would mean
      // `ranked` and `winningRequests` fell out of step, which is our bug and
      // not something to paper over with an `independent` SE that reads as a
      // deliberate choice.
      if (!candReq) {
        throw new RankError(
          "internal",
          `no recorded request for ranked item ${item.itemId} (${item.name}); ` +
            `paired replication cannot re-sim it`
        );
      }
      const deltas: number[] = [];
      for (const s of seeds) {
        const obs = await simFor(candReq, s);
        deltas.push(obs.dps - baselineBySeed.get(s)!);
        bumpProgress(s);
      }
      item.se = pairedReplicateSe(deltas);
      item.seMethod = "paired-replicate";
      item.deltaDps = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
      item.deltaPct =
        baselineDps === 0 ? 0 : (item.deltaDps / baselineDps) * 100;
      // Re-evaluated against the mean rather than left at the first seed's
      // verdict: a row whose replicated estimate crosses the cutoff must not
      // keep a `belowCutoff` computed from a number no longer reported.
      item.belowCutoff = !meetsCutoff(item.deltaDps, item.deltaPct, cutoff);
    }
  }

  /**
   * The first seed's re-runs are cache hits the candidate loop already counted,
   * so only the additional seeds advance the bar — otherwise `done` overshoots
   * the `total` computed from `seeds.length - 1`.
   */
  function bumpProgress(seedForRun: number): void {
    if (seedForRun === seeds[0]) return;
    simsDone += 1;
    onProgress?.({
      stage: "simming",
      done: simsDone,
      total: totalSimsForProgress,
    });
  }

  /** One sim at one seed, through the same cache-then-run path as the loop. */
  async function simFor(
    req: RaidSimRequest,
    seedForRun: number
  ): Promise<SimObservation> {
    const opts = { seed: seedForRun, iterations };
    const cached = await readCachedSim(deps, req, simVersion, opts);
    if (cached) return cached;
    let obs: SimObservation;
    try {
      obs = await deps.sim.run(req, opts);
    } catch (err) {
      throw new RankError(
        "sim-failed",
        err instanceof Error ? err.message : String(err)
      );
    }
    await cacheSimResult(deps, req, simVersion, opts, obs);
    return obs;
  }
}

/**
 * Completion-package synergy (spec §2.2/§2.3): for every set with at least
 * one candidate present in this run's pool, and every threshold above the
 * pieces currently worn, build the completion package, sim it once through
 * the shared cache, and record `SetBonusValue`. Cost target §2.4: at most
 * ~4 extra sims per run — bounded by only building for sets with candidate
 * presence and skipping `not-implemented-in-sim` thresholds entirely.
 */
async function buildSetBonuses(
  deps: Deps,
  candidates: readonly PoolEntry[],
  equipment: readonly SimItemSpec[],
  gems: GemContext,
  race: Race,
  input: RankInput,
  /**
   * `rankUpgrades`'s own compose helper, passed in rather than rebuilt here:
   * a second copy drifts silently, since no test covers both call sites
   * (ticket 212 review). Every composed request must carry the database its
   * own equipment needs.
   */
  composeFor: (equipment: readonly SimItemSpec[]) => RaidSimRequest,
  individualDeltasByItemId: ReadonlyMap<number, IndividualDelta>,
  baseline: DpsSample,
  simVersion: string,
  runOpts: SimRunOpts,
  packageSimSkips: {
    setId: number;
    setName: string;
    threshold: SetThreshold;
    reason: string;
  }[]
): Promise<SetBonusValue[]> {
  // Which sets actually have a pool candidate this run — §2.4's "do not build
  // packages for sets with no candidate presence".
  const setIdsWithCandidates = new Set<number>();
  for (const entry of candidates) {
    const setId = getItem(entry.itemId)?.setId;
    if (setId != null) setIdsWithCandidates.add(setId);
  }
  if (setIdsWithCandidates.size === 0) return [];

  const wornCounts = setCounts(equipment);
  const slotIndexForPoolEntry = (entry: PoolEntry): number | undefined => {
    for (const slotName of simSlotsForPoolSlot(entry.slot)) {
      const idx = SIM_ORDER.indexOf(slotName);
      if (idx >= 0) return idx;
    }
    return undefined;
  };

  const results: SetBonusValue[] = [];
  for (const setId of setIdsWithCandidates) {
    const piecesWorn = wornCounts.get(setId) ?? 0;
    const label = setLabel(
      equipment,
      setId,
      candidates.map((entry) => entry.itemId)
    );
    let twoPieceBonus: number | undefined;
    // Set only when the 2pc row itself came back `unmeasurable-at-this-worn-
    // count` (ticket 119 anomaly B) — the specific case where `twoPieceBonus`
    // stays undefined not because no 2pc exists, but because it could not be
    // measured from here. Distinguishing this from "no 2pc bonus" (e.g.
    // not-implemented-in-sim) is the whole point: only this case means the
    // 4pc figure below is missing a real, non-zero term (ticket 127).
    let twoPieceUnmeasurableAtThisWornCount = false;

    for (const threshold of SET_THRESHOLDS) {
      if (threshold <= piecesWorn) continue;

      if (!isBonusImplemented(setId, threshold)) {
        // §2.3: never burn a sim measuring a bonus known to be absent.
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: [],
          packageDeltaDps: 0,
          unmeasured: "not-implemented-in-sim",
        });
        continue;
      }

      const selection = selectPackage(
        setId,
        threshold,
        equipment,
        candidates,
        [...individualDeltasByItemId.values()],
        slotIndexForPoolEntry
      );
      if (!selection.ok) {
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: [],
          packageDeltaDps: 0,
          unmeasured: "insufficient-pieces",
        });
        continue;
      }

      const addedPieces = selection.addedPieces;
      // One added piece means the "package" is that piece's own single swap:
      // identical equipment, so packageDelta − Σ singles is 0 by construction
      // and the real bonus is buried inside the single's delta where this
      // method cannot reach it. Reporting that 0 with an SE printed it as a
      // measurement (ticket 119 anomaly B); say it is unmeasurable instead,
      // and spend no sim. The completing piece is still named so a renderer
      // can say which item would finish the threshold.
      if (addedPieces.length === 1) {
        if (threshold === 2) twoPieceUnmeasurableAtThisWornCount = true;
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: addedPieces.map((p) => p.itemId),
          packageDeltaDps: 0,
          unmeasured: "unmeasurable-at-this-worn-count",
        });
        continue;
      }
      // Applied sequentially, one slot at a time, through the same helper
      // every single-candidate swap uses — spec §2.2 step 1's byte-identical
      // gem/enchant policy.
      let packageEquipment: SimItemSpec[] = [...equipment];
      // Accumulated across pieces, not per piece: the reader is being offered
      // the whole package, so the disclosure is every adjustment the package
      // cost. A later piece can re-swap a socket an earlier one touched, so
      // this is the sequence of swaps that happened, not a set.
      const packageRepairSwaps: MetaRepairSwap[] = [];
      try {
        for (const piece of addedPieces) {
          const outcome = candidateSwapWithRepairs(
            packageEquipment,
            piece.slotIndex,
            piece.itemId,
            gems
          );
          packageEquipment = outcome.equipment;
          // Swaps landing on a slot the package itself fills are the offer,
          // not an adjustment to gear the player keeps — the same exclusion
          // `candidateSwapWithRepairs` already applies to the swapped slot.
          const packageSlots = new Set(addedPieces.map((p) => p.slotIndex));
          packageRepairSwaps.push(
            ...outcome.swaps.filter((s) => !packageSlots.has(s.itemIndex))
          );
        }
      } catch (err) {
        // Same reasoning as the single-candidate loop above: a repair
        // failure on this package's gems must skip only this threshold row,
        // not the rest of the set-value pass or the ranking as a whole.
        if (!(err instanceof MetaRepairError)) throw err;
        packageSimSkips.push({
          setId,
          setName: label,
          threshold,
          reason: `gem repair could not activate its meta — ${err.message}`,
        });
        results.push({
          setId,
          setName: label,
          threshold,
          piecesWorn,
          packageItemIds: addedPieces.map((p) => p.itemId),
          packageDeltaDps: 0,
          unmeasured: "repair-failed",
        });
        continue;
      }
      const packageRequest = composeFor(packageEquipment);

      let packageObs = await readCachedSim(
        deps,
        packageRequest,
        simVersion,
        runOpts
      );
      if (!packageObs) {
        try {
          packageObs = await deps.sim.run(packageRequest, runOpts);
        } catch (err) {
          packageSimSkips.push({
            setId,
            setName: label,
            threshold,
            reason: err instanceof Error ? err.message : String(err),
          });
          results.push({
            setId,
            setName: label,
            threshold,
            piecesWorn,
            packageItemIds: addedPieces.map((p) => p.itemId),
            packageDeltaDps: 0,
            unmeasured: "sim-failed",
          });
          continue;
        }
        await cacheSimResult(
          deps,
          packageRequest,
          simVersion,
          runOpts,
          packageObs
        );
      }

      const addedPieceSamples = addedPieces.map((p) => {
        const individual = individualDeltasByItemId.get(p.itemId);
        return {
          deltaDps: individual?.deltaDps ?? 0,
          se: individual?.se ?? 0,
        };
      });
      const packageSample: DpsSample = {
        dps: packageObs.dps,
        se: packageObs.stdev / Math.sqrt(runOpts.iterations),
      };
      const synergy = computeSynergy({
        baseline,
        packageSample,
        addedPieceSamples,
        ...(threshold === 4 && twoPieceBonus !== undefined
          ? { twoPieceBonus }
          : {}),
      });
      if (threshold === 2) twoPieceBonus = synergy.bonusDps;

      const breaks = brokenSetBonuses(equipment, addedPieces, setId);
      // The 2pc term is missing from this 4pc figure exactly when the 2pc row
      // was `unmeasurable-at-this-worn-count` for the *same* set — not merely
      // whenever `twoPieceBonus` is undefined, which is also true (correctly,
      // with nothing missing) for `not-implemented-in-sim`.
      const selfConfound: SelfSetConfound | undefined =
        threshold === 4 && twoPieceUnmeasurableAtThisWornCount
          ? { threshold: 2 }
          : undefined;
      results.push({
        setId,
        setName: label,
        threshold,
        piecesWorn,
        packageItemIds: addedPieces.map((p) => p.itemId),
        packageDeltaDps: synergy.packageDeltaDps,
        bonusDps: synergy.bonusDps,
        se: synergy.se,
        ...(breaks.length > 0 ? { breaks } : {}),
        ...(selfConfound ? { selfConfound } : {}),
        ...(packageRepairSwaps.length > 0
          ? {
              gemSubstitutions: packageRepairSwaps.map((s) => ({
                itemId: s.itemId,
                // Carried, not dropped: the same item id can legally sit in
                // two slots (paired rings/trinkets), so counting distinct
                // items by id alone collapses two worn rings into one and
                // under-reports the disclosure. `MetaRepairSwap.itemIndex`
                // exists for exactly this (round-4 review, A2).
                itemIndex: s.itemIndex,
                socketIndex: s.socketIndex,
                from: s.from,
                to: s.to,
              })),
            }
          : {}),
      });
    }
  }
  return results;
}

/**
 * The completion packages a member row carries (ticket 118, owner decision
 * 2026-08-11). A row is a member when its item id appears in any of its set's
 * measured packages. A member carries EVERY measured threshold's package for
 * the set, smallest threshold first — both the 2pc and the 4pc figure reach
 * the row as data. The old rule kept only the largest threshold's package, so
 * on the ret artifact every Lightbringer row carried the negative 4pc figure
 * (-6.83) while the positive 2pc figure (+11.31) reached no row at all.
 *
 * Exported for direct testing against the committed report artifacts.
 */
export function memberPackages(
  itemId: number,
  bonusesForSet: readonly SetBonusValue[]
): SetPackageContext[] | undefined {
  const measured = bonusesForSet.filter((b) => b.unmeasured === undefined);
  if (!measured.some((b) => b.packageItemIds.includes(itemId))) {
    return undefined;
  }
  return measured
    .slice()
    .sort((a, b) => a.threshold - b.threshold)
    .map((b) => ({
      threshold: b.threshold,
      deltaDps: b.packageDeltaDps,
      itemIds: b.packageItemIds,
      piecesNeeded: b.packageItemIds.length,
    }));
}

/**
 * Populate `RankedItem.setContext` for every candidate whose item belongs to
 * a set with any attempted `SetBonusValue` (spec §3) — including the
 * crossing case, so a renderer can say "completes 2pc (included in delta)".
 */
function applySetContext(
  ranked: RankedItem[],
  setBonuses: readonly SetBonusValue[],
  equipment: readonly SimItemSpec[]
): void {
  const wornCounts = setCounts(equipment);
  const bonusesBySet = new Map<number, SetBonusValue[]>();
  for (const b of setBonuses) {
    const list = bonusesBySet.get(b.setId) ?? [];
    list.push(b);
    bonusesBySet.set(b.setId, list);
  }

  for (const item of ranked) {
    const setId = getItem(item.itemId)?.setId;
    if (setId == null) continue;
    const bonusesForSet = bonusesBySet.get(setId);
    if (!bonusesForSet) continue;

    const piecesWornBefore = wornCounts.get(setId) ?? 0;
    // The candidate's own item joins the set on this swap: worn count + 1,
    // unless it was already worn (then the count is unchanged).
    const piecesAfterSwap = item.owned
      ? piecesWornBefore
      : piecesWornBefore + 1;
    // Whether *this swap* crosses a threshold is judged against the nearest
    // measurable threshold from *before* the swap — that is the bonus the
    // swap could newly deliver. `nextThreshold` recorded on the context is
    // the forward-looking one from *after* the swap (spec §2.3/§3, finding
    // 3): the smallest implemented threshold still ahead, for a "needs N
    // more" prompt. The two are deliberately evaluated from different counts.
    const thresholdBeforeSwap = nextMeasurableThreshold(
      setId,
      piecesWornBefore
    );
    const crossesThreshold =
      thresholdBeforeSwap !== null && piecesAfterSwap >= thresholdBeforeSwap;
    const nextThreshold = nextMeasurableThreshold(setId, piecesAfterSwap);

    const setContext: SetContext = {
      setId,
      // The set's SetBonusValue rows already resolved this name against the
      // package pieces, which is the only place it is findable for a set the
      // player wears none of. Recomputing from worn gear alone regresses to
      // the bare `set <id>` fallback.
      setName:
        bonusesForSet[0]?.setName ?? setLabel(equipment, setId, [item.itemId]),
      piecesWornBefore,
      piecesAfterSwap,
      nextThreshold,
      crossesThreshold,
    };
    // A swap that leaves the piece count where it found it (re-equipping an
    // item already worn) advances nothing toward `nextThreshold`, so it has no
    // prospective bonus to offer even though its set does — ticket 95.
    const advancesPieceCount = piecesAfterSwap > piecesWornBefore;
    if (advancesPieceCount && !crossesThreshold && nextThreshold !== null) {
      const matching = bonusesForSet.find((b) => b.threshold === nextThreshold);
      if (matching?.bonusDps !== undefined) {
        setContext.prospectiveBonusDps = matching.bonusDps;
        if (matching.breaks && matching.breaks.length > 0) {
          setContext.prospectiveBonusBreaks = matching.breaks;
        }
      }
    }
    // Package membership is independent of everything above: it asks only
    // "is this item one of the pieces a measured package assembles", so it
    // reaches rows whose `nextThreshold` points elsewhere. Every measured
    // threshold's figure rides along (ticket 118) — see `memberPackages`.
    const pkgs = memberPackages(item.itemId, bonusesForSet);
    if (pkgs) setContext.packages = pkgs;
    item.setContext = setContext;
  }
}

/**
 * Which fight answers this run (PLAN.md §5.2, §10 fallback route).
 *
 * Ranked kills win when there are any: a ranked parse is a fight the character
 * was measured on, so it is the better sample of how they play. Only when
 * there is no ranked kill does the run fall through to a `report-events`
 * summary — gear read by walking a report's fights, which is how a character
 * who has never ranked gets an answer at all instead of
 * `RankError('no-qualifying-fight')`.
 *
 * That fallback is not hypothetical. `slamaltman` has ten kills on the SSC
 * encounters and **zero** `encounterRankings` entries, verified 2026-08-05
 * against the live API; the same query returns 19 ranks for a leaderboard
 * character, so the empty result is this character rather than a broken query.
 * Re-check with `.scratch/` probes recorded in docs/verification-log.md.
 *
 * An explicit `RankInput.fight` overrides both — a caller naming a fight has
 * already made this choice — and its route is reported as whatever the summary
 * list says about that fight, or `report-events` when the list does not
 * describe it. Exported for direct unit testing: the preference order is the
 * whole behaviour, and it is invisible from a `Ranking` that only ever holds
 * the winner.
 */
export function resolveFight(
  fights: readonly FightSummary[],
  requested?: FightRef
): ResolvedFight | undefined {
  if (requested) {
    const match = fights.find(
      (f) =>
        f.reportCode === requested.reportCode && f.fightId === requested.fightId
    );
    return match
      ? summaryToResolved(match)
      : {
          ...requested,
          // A caller-named fight the summary list does not describe was not
          // reached through a ranking, so calling it `ranked` would overstate
          // what we know about it.
          route: "report-events",
        };
  }
  const ranked = fights.find((f) => f.route === "ranked");
  const chosen = ranked ?? fights[0];
  return chosen ? summaryToResolved(chosen) : undefined;
}

function summaryToResolved(f: FightSummary): ResolvedFight {
  return {
    reportCode: f.reportCode,
    fightId: f.fightId,
    ...(f.encounterName ? { encounterName: f.encounterName } : {}),
    ...(f.killedAt ? { killedAt: f.killedAt } : {}),
    route: f.route,
    confidence: f.confidence,
    ...(f.salvationUptime === undefined
      ? {}
      : { salvationUptime: f.salvationUptime }),
  };
}

/** Namespaced so a ranking blob cannot collide with another content-addressed value. */
function rankingCacheKey(contentHash: string): string {
  return `ranking:${contentHash}`;
}

/**
 * PLAN.md §11: a sim result for a given request + version can never change.
 * simCacheKey already folds in seed and iterations, so two runs that differ
 * only in which candidates they consider share every request they have in
 * common — which is what makes a partial re-run cheap.
 */
async function readCachedSim(
  deps: Deps,
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts
): Promise<SimObservation | undefined> {
  return asInternal(() =>
    deps.store.get<SimObservation>(simStoreKey(req, simVersion, opts))
  );
}

/** Namespaced, and built in one place so the read and the write cannot drift. */
function simStoreKey(
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts
): string {
  return `sim:${simCacheKey(req, simVersion, opts)}`;
}

/**
 * Split from the read so the caller can keep `deps.sim.run` inside its
 * sim-failed catch while this stays outside it: a failing store write is an
 * `internal` fault, and reporting it as `sim-failed` sends an operator to the
 * wrong subsystem.
 */
async function cacheSimResult(
  deps: Deps,
  req: RaidSimRequest,
  simVersion: string,
  opts: SimRunOpts,
  observation: SimObservation
): Promise<void> {
  await asInternal(() =>
    deps.store.put(simStoreKey(req, simVersion, opts), observation)
  );
}

/**
 * The store is ours, not the character's, the log's or the sim's, so its
 * failures carry the one kind that says so. Without this they escape as bare
 * `Error`s, miss the CLI's `instanceof RankError` branch (`cli.ts`), and print
 * a stack trace where an operator expects `internal: …` — which is why the
 * kind was declared but never constructed.
 */
async function asInternal<T>(op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (err) {
    throw new RankError(
      "internal",
      err instanceof Error ? err.message : String(err)
    );
  }
}

function raceFromSkeleton(skeleton: RaidSimRequest): Race {
  const raw = (
    skeleton as {
      raid?: { parties?: Array<{ players?: Array<{ race?: string }> }> };
    }
  ).raid?.parties?.[0]?.players?.[0]?.race;
  if (raw && isRace(raw)) return raw;
  return "RaceHuman";
}

/**
 * `compose` copies race/name/equipment onto the skeleton's player slot but
 * leaves `talentsString` untouched (compose.ts), so the composed request
 * still carries whatever the pinned preset skeleton set — this reads that
 * same field back out for `capStateFrom` (carry-forward 33).
 */
function talentsStringFromRequest(request: RaidSimRequest): string | undefined {
  const raw = (
    request as {
      raid?: {
        parties?: Array<{ players?: Array<{ talentsString?: string }> }>;
      };
    }
  ).raid?.parties?.[0]?.players?.[0]?.talentsString;
  return typeof raw === "string" ? raw : undefined;
}

function isRace(value: string): value is Race {
  return (
    value === "RaceHuman" ||
    value === "RaceDwarf" ||
    value === "RaceNightElf" ||
    value === "RaceGnome" ||
    value === "RaceDraenei" ||
    value === "RaceOrc" ||
    value === "RaceUndead" ||
    value === "RaceTauren" ||
    value === "RaceTroll" ||
    value === "RaceBloodElf"
  );
}

/**
 * Exported for tests: they must exercise *this* function rather than a copy.
 * A hand-duplicated swap path in the test file silently dropped the
 * `fillOptsForSwap` argument and hid the whole unique/meta gem feature from
 * the suite — see `.scratch/carry-forward/issues/22-…`.
 */
export function equipmentForCandidateSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  gems: GemContext
): SimItemSpec[] {
  return candidateSwapWithRepairs(equipment, slotIndex, itemId, gems).equipment;
}

/**
 * The swap plus the gem swaps meta repair had to make on *other* worn items
 * to activate the candidate's meta.
 *
 * Those swaps are the disclosure PLAN.md §9 policy item 5 requires and
 * ticket 107 found missing: pricing a helm "given four changes to two other
 * items" without saying so misreports what the player is being offered.
 * `equipmentForCandidateSwap` discarded them, so only the *baseline* repair
 * ever reached the report.
 */
export function candidateSwapWithRepairs(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  gems: GemContext
): { equipment: SimItemSpec[]; swaps: readonly MetaRepairSwap[] } {
  const swapped = swapItemAt(equipment, slotIndex, itemId, gems);
  const socketed: SocketedItem[] = swapped.map((spec) => ({
    itemId: spec.id ?? 0,
    gems: [...spec.gems],
  }));
  // MetaRepairError propagates as-is rather than wrapping into RankError
  // here: a repair failure on one candidate must skip only that candidate
  // (both callers below catch it for exactly that), not abort the whole
  // ranking the way a baseline-gear repair failure legitimately does.
  const minimized = repairAndMinimize({
    items: socketed,
    epWeights: gems.weights,
    palette: gems.fillPalette,
  });
  return {
    equipment: applyRepairedGems(swapped, minimized.items),
    // The swapped-in candidate's own sockets are the offer itself, not an
    // adjustment to gear the player already had on.
    swaps: minimized.swaps.filter((s) => s.itemIndex !== slotIndex),
  };
}

function swapItemAt(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  itemId: number,
  gemCtx: GemContext
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    if (i !== slotIndex) return spec;
    const sameItem = spec.id === itemId;
    const gems = sameItem
      ? [...(spec.gems ?? [])]
      : fillEmptyCandidateGems(
          itemId,
          migrateGemsToItem(spec.gems ?? [], spec.id ?? 0, itemId),
          gemCtx.fillPalette,
          gemCtx.weightRecord,
          fillOptsForSwap(equipment, slotIndex, gemCtx.spec)
        );
    const out: SimItemSpec = { id: itemId, gems };
    // Bare worn slot → no enchant on the candidate (do not invent one), and
    // carry one only where the UI would: isEnchantable is slot-level, so on
    // its own it moves a 2H-only enchant onto a one-hander.
    if (spec.enchant && enchantAppliesToItem(spec.enchant, itemId)) {
      out.enchant = spec.enchant;
    }
    return out;
  });
}

/**
 * Fail loud when no meta preference is recorded for the ranked spec: an empty
 * meta socket otherwise looks identical to a palette that simply had no meta
 * gem, and seating another spec's meta would be silently wrong (the outcome
 * step6-meta-choice-spike.md rejected).
 */
function metaPreferenceDisclosure(
  spec: DetectedSpecId | undefined
): Substitution[] {
  const note = missingMetaPreferenceNote(spec);
  return note ? [{ field: "gems.meta-preference", detail: note }] : [];
}

function fillOptsForSwap(
  equipment: readonly SimItemSpec[],
  slotIndex: number,
  spec: DetectedSpecId | undefined
): FillEmptyOpts {
  const usedUnique = new Set<number>();
  const otherGemIds: number[] = [];
  for (let i = 0; i < equipment.length; i++) {
    if (i === slotIndex) continue;
    for (const id of equipment[i]?.gems ?? []) {
      if (!(id > 0)) continue;
      otherGemIds.push(id);
      if (getGem(id)?.unique) usedUnique.add(id);
    }
  }
  const wornGems = (equipment[slotIndex]?.gems ?? []).filter((id) => id > 0);
  const metaId = findMetaGemId([...otherGemIds, ...wornGems]);
  return {
    usedUnique,
    ...(metaId !== undefined ? { meta: { metaId, otherGemIds } } : {}),
    ...(spec !== undefined ? { spec } : {}),
  };
}

function applyRepairedGems(
  equipment: readonly SimItemSpec[],
  socketed: SocketedItem[]
): SimItemSpec[] {
  return equipment.map((spec, i) => {
    const repaired = socketed[i];
    if (!repaired || !spec.id) return spec;
    return { ...spec, gems: [...repaired.gems] };
  });
}
