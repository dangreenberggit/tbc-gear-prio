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
import type { RankedItem } from "./rank.js";

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
