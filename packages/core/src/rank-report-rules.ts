/**
 * What the rank report shows and in what order — the decisions, with no
 * markup in sight (ticket 24: `rank-report.ts` mixed these with the HTML
 * template and the stylesheet, so changing a shortlist rule and restyling the
 * page edited one file for unrelated reasons).
 *
 * Everything here is pure and directly unit-tested. The renderer next door
 * consumes these and owns escaping, formatting and structure.
 */

import { getItem, type ItemSlot } from "./items.js";
import type { SimSlotName } from "./pool.js";
import type { ViewOptions } from "./view.js";
import type { RankedItem, SetBonusValue } from "./rank.js";
import type { SetThreshold } from "./set-value.js";

/** Display order for slot sections; also seeds `groupBySlot`'s empty buckets. */
export const SLOT_ORDER: readonly ItemSlot[] = [
  "head",
  "neck",
  "shoulder",
  "back",
  "chest",
  "wrist",
  "hands",
  "waist",
  "legs",
  "feet",
  "finger",
  "trinket",
  "weapon",
  "ranged",
] as const;

/** Optional enrichments the renderer understands when present on ranked items. */
export type ReportItem = RankedItem & {
  magnitudeWarning?: boolean;
  replacesEquipped?: {
    slot: string;
    itemId: number;
    name: string;
  };
  alternateSlot?: {
    /** Sim slot name, same vocabulary as `RankedItem.slotChoice`. */
    choice: SimSlotName;
    deltaDps: number;
    deltaPct: number;
    replacesName: string;
  };
};

export type RankReportMeta = {
  character: string;
  realm: string;
  region: string;
  spec: string;
  maxPhase: number;
  poolSize: number;
  generatedAt: string;
  /** Report-time zone filter (CLI `--raid`); not applied during rank. */
  raid?: string;
  /**
   * Every view control that shaped the rows in this report (§4.1). Recorded
   * because the rows are a filtered re-render: a report that names only
   * `raid` while `--boss` or `--hide-owned` also cut rows misdescribes itself,
   * and these files outlive the command that made them.
   */
  view?: ViewOptions;
};

/**
 * Split the above-cutoff items into the two shortlists.
 *
 * PvP is separated because it is not lootable tonight, and
 * `magnitudeWarning` items are dropped from both: a weapon whose sim delta is
 * implausible should not head a list captioned "act on tonight".
 */
export function partitionShortlist(items: RankedItem[]): {
  raid: RankedItem[];
  pvp: RankedItem[];
} {
  const reportItems = items as ReportItem[];
  const above = reportItems.filter(
    (i) => !i.belowCutoff && !i.magnitudeWarning
  );
  return {
    raid: above.filter((i) => i.source.kind !== "pvp"),
    pvp: above.filter((i) => i.source.kind === "pvp"),
  };
}

/**
 * Bucket by slot in `SLOT_ORDER`, best delta first within each.
 *
 * Every slot gets a bucket even when empty, so the renderer can decide
 * whether to show an empty section rather than inferring it from a gap.
 */
export function groupBySlot(items: RankedItem[]): Map<ItemSlot, RankedItem[]> {
  const map = new Map<ItemSlot, RankedItem[]>();
  for (const slot of SLOT_ORDER) map.set(slot, []);
  for (const item of items) {
    const list = map.get(item.slot);
    if (list) list.push(item);
    else map.set(item.slot, [item]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => b.deltaDps - a.deltaDps);
  }
  return map;
}

/**
 * Human-readable reason a `SetBonusValue` shows no `bonusDps` (spec §2.3,
 * acceptance §8.5). Every `unmeasured` value must render as a reason here —
 * never a blank and never a `0`, which would read as "measured, worth
 * nothing" when the truth is "we don't know".
 */
const UNMEASURED_REASON_TEXT: Record<
  NonNullable<SetBonusValue["unmeasured"]>,
  string
> = {
  "not-implemented-in-sim": "not implemented in the pinned sim",
  "insufficient-pieces": "not enough pieces in the pool to build the package",
  "sim-failed": "the package sim failed",
};

/**
 * One line per `SetBonusValue`: set, threshold, pieces worn, and either the
 * measured bonus or the reason it could not be measured (§4). A measured
 * ≈0 bonus (e.g. Crystalforge, a mana/heal effect) renders as a number, not
 * as unmeasured — §2.3 draws that line and this function preserves it.
 *
 * This panel is the *only* surface some bonuses reach. At 0 worn pieces every
 * single-swap candidate lands at `piecesAfterSwap === 1`, so
 * `nextMeasurableThreshold` stops at an implemented 2pc and the 4pc figure is
 * credited to no row in any display mode (ticket 91). Rather than smear a
 * fraction of it across member rows — which would put a break-confounded
 * number into the sort, and the confound is large: the engine reports 193.89
 * for the Thunderheart 4pc where an isolated measurement gives 73.5 ± 6.3 DPS
 * (`.scratch/set-bonus-value/measurements-2026-08-10.md`) — set completion is
 * surfaced here as its own thing, named by the items that would complete it.
 */
export function formatSetBonusLine(b: SetBonusValue): string {
  const sign = b.bonusDps !== undefined && b.bonusDps > 0 ? "+" : "";
  const measured =
    b.unmeasured !== undefined
      ? UNMEASURED_REASON_TEXT[b.unmeasured]
      : `${sign}${(b.bonusDps ?? 0).toFixed(2)} DPS`;
  const head = `${b.setName} ${b.threshold}pc (${b.piecesWorn} worn) — ${formatBreaksPrefix(b)}${measured}`;
  return `${head}${formatPackageContents(b)}`;
}

/**
 * Qualifies the figure *before* it is read, not after. A break inflates the
 * measured number by `(k−1)·B` with no way to separate it after the fact (see
 * the closed form on `brokenSetBonuses` in `set-value.ts`), so a trailing
 * suffix let a reader take the number away before reaching the caveat.
 */
export function formatBreaksPrefix(b: SetBonusValue): string {
  if (!b.breaks || b.breaks.length === 0) return "";
  const parts = b.breaks.map(
    (x) => `${x.setName} ${x.threshold}pc (${x.piecesBefore}→${x.piecesAfter})`
  );
  return `[breaks ${parts.join("; ")}; nets this in] `;
}

/**
 * Names the items that would complete the package. Without this the panel
 * states a bonus with no way to act on it — and for a threshold no row carries,
 * "which items" is the whole of the actionable information.
 */
export function formatPackageContents(b: SetBonusValue): string {
  // An unmeasured bonus has no value to chase, so naming the items that would
  // assemble it would invite acting on a number that does not exist.
  if (b.unmeasured !== undefined) return "";
  if (b.packageItemIds.length === 0) return "";
  const names = b.packageItemIds.map((id) => getItem(id)?.name ?? `item ${id}`);
  return ` — add ${names.join(", ")}`;
}

/**
 * The visible upgrade list as wowsims-shaped JSON: `{"items":[{"id":N}, ...]}`,
 * the same envelope as `vendor/wowsims/*.gear.json` and what its importer
 * accepts.
 *
 * One deliberate difference from a gear-set file, and it matters: a gear set is
 * **positional** — 17 slots in `SIM_ORDER`, `{}` for empty — whereas this is a
 * *list of upgrades* in the order the page displays them, which is neither 17
 * long nor slot-indexed. Two rows here can share a slot (both rings, several
 * legs candidates), so it cannot be read as an equipment set, and pasting it
 * where a full set is expected will not reconstruct a character.
 *
 * Ids only. Enchants and gems belong to the *worn* item; a ranked candidate is
 * an item the player does not have yet, so emitting either would invent gear
 * the sim never measured.
 */
export function wowsimsItemIdsJson(
  items: ReadonlyArray<Pick<RankedItem, "itemId">>
): string {
  return JSON.stringify(
    { items: items.map((i) => ({ id: i.itemId })) },
    null,
    2
  );
}

/**
 * The phase a curated gear-set label is BiS *for*, or `null` if unrecognised.
 *
 * Mirrors `CURATED_SET_PHASE` / `curated_set_phase` in
 * `scripts/assemble_universe.py` — **that file is the source of truth**; the
 * labels are produced there, and this only reads them back to decide whether to
 * warn that a list is stale. Pre-raid is phase 1: it is the set you take *into*
 * a phase-1 raid.
 *
 * Do not edit this map alone. `scripts/check_curated_set_phase.py` re-derives it
 * from this file and fails `pnpm verify` on any divergence — it exists because
 * the mirror drifted once and failed *silently*, suppressing the staleness
 * warning rather than erroring (carry-forward 102).
 *
 * The suffix on a variant label (`p2_6p`, `p2_9p`) is not part of the phase, so
 * only the leading `pN` is read. That suffix is a hit percentage rather than a
 * piece count — see carry-forward 88.
 */
const CURATED_SET_PHASE: Record<string, number> = {
  preraid: 1,
  p1: 1,
  p2: 2,
  p3: 3,
};

export function curatedSetPhase(label: string): number | null {
  return CURATED_SET_PHASE[label.split("_", 1)[0] ?? ""] ?? null;
}

/**
 * Is this row on a curated BiS list for the ranked phase?
 *
 * Reads `bisTags`, which `assemble_universe.py` scopes to the *current* stage
 * — an item BiS for an earlier stage keeps `curatedSets` and loses its tag, so
 * this never badges "was BiS two phases ago" as a recommendation
 * (carry-forward 47 §1).
 *
 * Deliberately not `curatedSets`: on feral P2 that field also carries five
 * `preraid` rows, and "in the pre-raid set" is a different claim from "BiS
 * now" — the opposite one, mostly.
 */
export function isCuratedBis(item: Pick<RankedItem, "bisTags">): boolean {
  return (item.bisTags ?? []).includes("BiS");
}

/**
 * Reconciles the one row that asserts two true things at once: a "BiS" badge
 * and a large negative delta. Both are right — the swap really does forfeit the
 * worn set's bonus, and the completed package really is upstream's pick — so
 * this is a framing mismatch between a single swap and a package, not a wrong
 * number (carry-forward 96).
 *
 * A pointer, never a recomputed number: the value of the package lives in the
 * Set potential panel, whose figure is break-confounded and deliberately kept
 * out of the sort (carry-forward 90). Restating any part of it here would put
 * that number back where a reader takes it for a ranking.
 */
export function formatCuratedPackagePointer(
  item: Pick<RankedItem, "bisTags" | "belowCutoff" | "setContext">
): string {
  if (!isCuratedBis(item) || !item.belowCutoff) return "";
  const setName = item.setContext?.setName;
  if (setName === undefined) return "";
  return `BiS as part of ${setName}, not as this swap alone — see Set potential`;
}

/**
 * How much of a prospective bonus counts toward a row's displayed value, by
 * the threshold that would unlock it. A 2pc is nearer and cheaper than a 4pc,
 * so it is discounted less.
 *
 * Flat per threshold, deliberately: the weight does not scale by how many
 * pieces are still missing. A row three pieces short of 4pc therefore carries
 * the same 0.25x credit as one that is a single piece away. That was chosen
 * over a pieces-remaining divisor, so the toggle stays the arithmetic the
 * reader can do in their head against `formatSetPotentialLine`'s number.
 */
export const SET_POTENTIAL_WEIGHTS: Record<SetThreshold, number> = {
  2: 0.5,
  4: 0.25,
};

/**
 * How much of a prospective bonus a row's displayed value credits.
 *
 * - `weighted` — `SET_POTENTIAL_WEIGHTS`, discounting by threshold.
 * - `full` — the whole bonus, no discount. Answers a different question than
 *   `weighted`: not "what fraction of this bonus does this piece deliver" but
 *   "what is this piece worth *if* I end up completing the set anyway", which
 *   is the realistic case when the remaining pieces are upgrades on their own
 *   merits. It over-credits every row of the set equally, so it reads as an
 *   upper bound rather than an estimate.
 *
 * The two are alternatives, never combined — `full` is not `weighted` with a
 * different constant, it is a different question.
 */
export type SetPotentialCredit = "weighted" | "full";

/**
 * A row's value with prospective set potential credited in — the quantity the
 * report's client-side toggle sorts and displays on.
 *
 * Falls back to plain `deltaDps` whenever there is no prospective bonus to
 * credit: no `setContext`, a candidate that already crosses its threshold (the
 * bonus is inside `deltaDps` already, §2.1, so crediting it would double-count),
 * or a threshold whose bonus the sim never measured.
 */
/**
 * Is this row's prospective bonus too confounded to rank on (ticket 90)?
 *
 * `bonus = packageDelta − Σ singles` charges a displaced set's lost bonus once
 * inside `packageDelta` but k times across the singles, so a figure whose
 * package breaks another worn set reads as `true + (k−1)·B`. `B` is not known
 * to within a factor of 4, so the figure is suppressed from ranking rather than
 * corrected — it stays visible in the Set potential panel, qualified by what it
 * breaks.
 */
export function setPotentialIsConfounded(
  item: Pick<RankedItem, "setContext">
): boolean {
  const breaks = item.setContext?.prospectiveBonusBreaks;
  return breaks !== undefined && breaks.length > 0;
}

export function weightedSetPotentialDps(
  item: Pick<RankedItem, "deltaDps" | "setContext">,
  credit: SetPotentialCredit = "weighted"
): number {
  const ctx = item.setContext;
  if (
    !ctx ||
    ctx.crossesThreshold ||
    ctx.nextThreshold === null ||
    ctx.prospectiveBonusDps === undefined ||
    setPotentialIsConfounded(item)
  ) {
    return item.deltaDps;
  }
  const factor =
    credit === "full" ? 1 : SET_POTENTIAL_WEIGHTS[ctx.nextThreshold];
  return item.deltaDps + ctx.prospectiveBonusDps * factor;
}

/**
 * The per-item annotation under `--with-set-potential` (§4): "+X set
 * potential (needs N more pieces)". Absent when the row has no prospective
 * value to show — already at/above the top threshold, already crossing one,
 * or the relevant bonus is unmeasured (nothing numeric to add).
 */
export function formatSetPotentialLine(
  item: Pick<RankedItem, "setContext">
): string | undefined {
  const ctx = item.setContext;
  if (!ctx || ctx.crossesThreshold || ctx.prospectiveBonusDps === undefined) {
    return undefined;
  }
  const needed =
    ctx.nextThreshold === null ? 0 : ctx.nextThreshold - ctx.piecesAfterSwap;
  // `nextThreshold` (§2.3) is always strictly above `piecesAfterSwap`, so
  // `needed` should always be positive here; a non-positive value means the
  // caller passed a `setContext` that does not match its own invariant
  // (e.g. crossesThreshold mis-set) rather than a real "0 more" state.
  if (needed <= 0) return undefined;
  const sign = ctx.prospectiveBonusDps >= 0 ? "+" : "";
  const base = `${sign}${ctx.prospectiveBonusDps.toFixed(2)} set potential (needs ${needed} more piece${needed === 1 ? "" : "s"})`;
  const breaks = ctx.prospectiveBonusBreaks;
  if (breaks === undefined || breaks.length === 0) return base;
  // Suppress-and-disclose: the figure is inflated by an unseparable break, so
  // it is shown with its cause but excluded from the sort key and cutoff. No
  // numeric correction is applied — the `(k−1)·B` inflation is not subtracted
  // here or anywhere, because `B` is gear-dependent (see `brokenSetBonuses` in
  // `set-value.ts`). "Correct" would promise arithmetic this does not do.
  const names = breaks.map((b) => `${b.setName} ${b.threshold}pc`).join("; ");
  return `${base} — inflated by breaking ${names}, not counted in ranking`;
}
