/**
 * What the rank report shows and in what order — the decisions, with no
 * markup in sight (ticket 24: `rank-report.ts` mixed these with the HTML
 * template and the stylesheet, so changing a shortlist rule and restyling the
 * page edited one file for unrelated reasons).
 *
 * Everything here is pure and directly unit-tested. The renderer next door
 * consumes these and owns escaping, formatting and structure.
 */

import type { ItemSlot } from "./items.js";
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
 */
export function formatSetBonusLine(b: SetBonusValue): string {
  const sign = b.bonusDps !== undefined && b.bonusDps > 0 ? "+" : "";
  const measured =
    b.unmeasured !== undefined
      ? UNMEASURED_REASON_TEXT[b.unmeasured]
      : `${sign}${(b.bonusDps ?? 0).toFixed(2)} DPS`;
  return `${b.setName} ${b.threshold}pc (${b.piecesWorn} worn) — ${measured}${formatBreaksSuffix(b)}`;
}

/**
 * Names the other-set bonuses a package breaks. The measured number nets that
 * loss in and cannot separate it (see verification.md V0b vs V0c), so leaving
 * this off would present a confounded figure as the bonus alone.
 */
export function formatBreaksSuffix(b: SetBonusValue): string {
  if (!b.breaks || b.breaks.length === 0) return "";
  const parts = b.breaks.map(
    (x) => `${x.setName} ${x.threshold}pc (${x.piecesBefore}→${x.piecesAfter})`
  );
  return ` [breaks ${parts.join("; ")}; measured value nets this in]`;
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
 * A row's value with prospective set potential weighted in — the quantity the
 * report's client-side toggle sorts and displays on.
 *
 * Falls back to plain `deltaDps` whenever there is no prospective bonus to
 * weight: no `setContext`, a candidate that already crosses its threshold (the
 * bonus is inside `deltaDps` already, §2.1, so weighting it would double-count),
 * or a threshold whose bonus the sim never measured.
 */
export function weightedSetPotentialDps(
  item: Pick<RankedItem, "deltaDps" | "setContext">
): number {
  const ctx = item.setContext;
  if (
    !ctx ||
    ctx.crossesThreshold ||
    ctx.nextThreshold === null ||
    ctx.prospectiveBonusDps === undefined
  ) {
    return item.deltaDps;
  }
  return (
    item.deltaDps +
    ctx.prospectiveBonusDps * SET_POTENTIAL_WEIGHTS[ctx.nextThreshold]
  );
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
  return `${sign}${ctx.prospectiveBonusDps.toFixed(2)} set potential (needs ${needed} more piece${needed === 1 ? "" : "s"})`;
}
