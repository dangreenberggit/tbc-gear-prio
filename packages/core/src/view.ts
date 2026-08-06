/**
 * The view layer (PLAN.md §4.1). Pure: a re-render of a `Ranking` that already
 * exists. No seam, no I/O, no sim, and nothing here reaches `contentHash` —
 * that is the property the Phase 2 gate box asserts, and the reason this is the
 * module's second export rather than logic duplicated in the CLI and the web.
 */
import { meetsCutoff } from "./cutoff.js";
import type { ItemSource } from "./pool.js";
import type { RankedItem, Ranking } from "./rank.js";

export type ViewOptions = {
  /** Pin curated-BiS members to the top. Default off. */
  pinBis?: boolean;
  /** `'all'` or an `ItemSource` zone key (§8.3). */
  raid?: string;
  /** `'all'` or a boss name, scoped to the selected raid. */
  boss?: string;
  groupBy?: "rank" | "slot" | "raid";
  hideOwned?: boolean;
};

/**
 * A row as displayed, which is a `RankedItem` plus the two facts that are
 * properties of the *view* rather than of the ranking: which tie group it fell
 * into, and whether the cutoff hides it within this filter.
 *
 * `rank` is inherited untouched and stays absolute (§12) — renumbering inside a
 * filter would show "rank 1" for an item that is 12th overall, misleading on
 * exactly the question the tool answers.
 */
export type ViewRow = RankedItem & {
  /**
   * Shared by rows whose SE intervals overlap (§10). Rows in one group are
   * displayed as a tie rather than as a false ordering; the ordering within the
   * group is only a stable presentation order, not a claim of priority.
   */
  tieGroupId?: string;
  /**
   * Whether the cutoff hides this row, evaluated after filtering.
   *
   * §12's rule is "filter first, then apply the cutoff within the filtered
   * view", and this branch implements the ordering but not a *relative*
   * cutoff: `CUTOFF` is absolute, so this always equals `belowCutoff` today.
   * The value of the ordering is that filtering never *deletes* a row — a 2
   * DPS gain that is the best thing in one raid still appears there, flagged,
   * rather than the view answering "nothing". Whether §12 also wants the
   * threshold itself recomputed per filter is
   * `.scratch/carry-forward/issues/36-relative-cutoff-within-a-filtered-view.md`.
   */
  belowCutoffInView: boolean;
};

export type ViewResult = {
  rows: ViewRow[];
  /**
   * Whether a `pinBis` toggle has anything to act on. The Phase 3 gate box
   * "the pin control is hidden, not inert, where no curated set exists" needs
   * this answerable here — ret's curated sets stop at P2, so above
   * `maxPhase: 2` there is nothing to pin and the control must degrade to
   * disabled rather than silently do nothing (§4.1).
   */
  pinBisAvailable: boolean;
  /** Present only for `groupBy: 'slot' | 'raid'`, in display order. */
  groups?: Array<{ key: string; rows: ViewRow[] }>;
};

function sourcesOf(item: RankedItem): ItemSource[] {
  return item.sources ?? [item.source];
}

/**
 * Zone reaches a tier piece through `kind: 'token'` as well as `kind: 'raid'`
 * (§8.3.2). That two-hop is the quiet failure in §15's risk table — a
 * "Karazhan" filter that omits every T4 piece — so it is matched over every
 * source the row carries, not just the primary one.
 */
function matchesZone(item: RankedItem, zone: string): boolean {
  return sourcesOf(item).some((s) => "zone" in s && s.zone === zone);
}

function matchesBoss(item: RankedItem, zone: string | undefined, boss: string) {
  return sourcesOf(item).some(
    (s) =>
      "boss" in s &&
      s.boss === boss &&
      (zone === undefined || ("zone" in s && s.zone === zone))
  );
}

function zoneKeyOf(item: RankedItem): string {
  for (const s of sourcesOf(item)) {
    if ("zone" in s) return s.zone;
  }
  return item.source.kind;
}

/**
 * Rows whose SE intervals overlap are one tie group (§10).
 *
 * Three things here are each a bug someone already shipped:
 *
 * 1. **Grouped on delta order, never on display order.** A tie is a claim
 *    about two numbers, so it cannot depend on how the list is sorted. Doing
 *    this on the pinned order let a pinned −8 DPS row lead the list and swallow
 *    every positive row behind it, displaying a downgrade as tied with a +40
 *    upgrade.
 * 2. **Membership is measured on the *narrower* of the two SEs.** Testing only
 *    `row.high >= leader.low` lets one wide-SE row bridge a gap its partner's
 *    own interval never spans — with SEs of 0.01 and 60, deltas 100 and 50 came
 *    out tied while 50 and 49 did not.
 * 3. **Anchored to the leader, not to the running union.** Chaining on the
 *    union is the obvious implementation and collapses the whole list at the
 *    SE scale this tool actually reports — §10's "reads as broken" failure.
 *    Observed on the ret P2 Karazhan ranking at 3,000 iterations, where
 *    reported SE runs a little over 2 DPS while adjacent deltas differ by far
 *    less; §10 records 1.678 DPS at 5,000 iterations, and SE grows as
 *    iterations fall. Re-measure with:
 *
 *      pnpm rank --region US --realm dreamscythe --character slamaltman \
 *        --offline --max-phase 2 --raid Karazhan --report <path>.html
 *
 *    then read `se` from the emitted `.json`. The conclusion needs only
 *    SE ≳ adjacent-delta spacing, not the exact figure.
 */
function assignTieGroups(rows: ViewRow[]): void {
  const byDelta = [...rows].sort((a, b) => b.deltaDps - a.deltaDps);
  let groupStart = 0;
  let groupId = 0;

  const flush = (end: number) => {
    if (end - groupStart > 1) {
      groupId += 1;
      const id = `tie-${groupId}`;
      for (let i = groupStart; i < end; i += 1) byDelta[i]!.tieGroupId = id;
    }
  };

  for (let i = 1; i <= byDelta.length; i += 1) {
    const leader = byDelta[groupStart]!;
    const row = byDelta[i];
    // The narrower of the two SEs, so one wide-SE row cannot reach across a
    // gap its partner's own interval never spans.
    const overlapsLeader =
      row !== undefined &&
      leader.deltaDps - row.deltaDps <= Math.min(row.se, leader.se) * 2;
    if (!overlapsLeader) {
      flush(i);
      groupStart = i;
    }
  }
}

/**
 * The pinned group stays `deltaDps`-ordered: wowsims' curated sets are 17
 * entries in fixed *slot* order carrying no ranking information, so slot order
 * is membership data and must never leak into display order (§4.1). Pinned
 * rows will sometimes show negative deltas and that is correct — an item is
 * BiS as a member of a whole optimized set, and `setBonusNote` explains the
 * common case. Ties break on BiS-tag richness then item id, so the order is
 * total and stable rather than dependent on the input's order.
 */
function compareRows(a: ViewRow, b: ViewRow, pinBis: boolean): number {
  if (pinBis) {
    const ap = a.bisTags.includes("BiS") ? 0 : 1;
    const bp = b.bisTags.includes("BiS") ? 0 : 1;
    if (ap !== bp) return ap - bp;
  }
  if (a.deltaDps !== b.deltaDps) return b.deltaDps - a.deltaDps;
  const richness = b.bisTags.length - a.bisTags.length;
  if (richness !== 0) return richness;
  return a.itemId - b.itemId;
}

export function applyView(r: Ranking, v: ViewOptions = {}): ViewResult {
  const pinBis = v.pinBis ?? false;
  const zone = v.raid === undefined || v.raid === "all" ? undefined : v.raid;
  const boss = v.boss === undefined || v.boss === "all" ? undefined : v.boss;

  const rows: ViewRow[] = r.items
    .filter((item) => {
      if (v.hideOwned === true && item.owned === true) return false;
      if (zone !== undefined && !matchesZone(item, zone)) return false;
      if (boss !== undefined && !matchesBoss(item, zone, boss)) return false;
      return true;
    })
    .map((item) => ({ ...item, belowCutoffInView: item.belowCutoff }));

  rows.sort((a, b) => compareRows(a, b, pinBis));

  // Filter first, then the cutoff within the filtered view (§12).
  for (const row of rows) {
    row.belowCutoffInView = !meetsCutoff(row.deltaDps, row.deltaPct, r.cutoff);
  }

  assignTieGroups(rows);

  const pinBisAvailable = r.items.some((i) => i.bisTags.includes("BiS"));
  const result: ViewResult = { rows, pinBisAvailable };

  if (v.groupBy === "slot" || v.groupBy === "raid") {
    const keyOf = v.groupBy === "slot" ? (i: ViewRow) => i.slot : zoneKeyOf;
    const groups = new Map<string, ViewRow[]>();
    for (const row of rows) {
      const key = keyOf(row);
      const bucket = groups.get(key);
      if (bucket) bucket.push(row);
      else groups.set(key, [row]);
    }
    result.groups = [...groups].map(([key, groupRows]) => ({
      key,
      rows: groupRows,
    }));
  }

  return result;
}
