/**
 * The view layer (PLAN.md §4.1). Pure: a re-render of a `Ranking` that already
 * exists. No seam, no I/O, no sim, and nothing here reaches `contentHash` —
 * that is the property the Phase 2 gate box asserts, and the reason this is the
 * module's second export rather than logic duplicated in the CLI and the web.
 */
import { CUTOFF, meetsCutoff } from "./cutoff.js";
import { sourceMatchesBoss, type ItemSource } from "./pool.js";
import { setPotentialIsConfounded } from "./rank-report-rules.js";
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
  /**
   * Sort by `deltaDps + (setContext?.prospectiveBonusDps ?? 0)` instead of
   * `deltaDps` alone (spec §4). Default off, so the default view is exactly
   * today's. Pure: `rank` is never renumbered by this toggle (§12) — a row
   * keeps the absolute rank `rankUpgrades` assigned it, even though the
   * toggle can move it to a different position in `rows`.
   */
  withSetPotential?: boolean;
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
   * Whether the cutoff hides this row, as this view values it. Carried from
   * `belowCutoff` for every view except `withSetPotential`.
   *
   * The cutoff is absolute and no view moves it (ADR-0020, amending §12).
   * "Filter first, then apply the cutoff within the filtered view" fixes the
   * *ordering* of the two hiding mechanisms, and the ordering is what matters:
   * filtering never *deletes* a row, so a 2 DPS gain that is the best thing in
   * one raid still appears under that raid's filter — flagged, not absent.
   *
   * `withSetPotential` re-derives this against the **same absolute `CUTOFF`**,
   * substituting only the quantity measured — the effective value the toggle
   * displays. ADR-0020 forbids a threshold that depends on the row *set*; this
   * changes the row's own value, not the bar, so the filtered-relative
   * alternative that ADR rejected stays rejected.
   *
   * The field stays because the shortlist is a property of the view, so
   * `ViewResult` and the CLI read a row's own display verdict rather than
   * reaching back into the `Ranking`.
   */
  belowCutoffInView: boolean;
};

export type ViewResult = {
  rows: ViewRow[];
  /**
   * `rows` without the ones the cutoff hides — the default display, and the
   * below-cutoff expand's "collapsed" half (§10, ticket 04).
   *
   * A second projection rather than a filter over `rows`, because §10's
   * constraint is **hidden, never deleted**: `rows` stays whole and stays the
   * payload, so an expand is a choice of which array to render and never a
   * re-run. Measured on `belowCutoffInView` — the view's own answer — so the
   * shortlist stays a view concern rather than the `Ranking`'s.
   */
  shortlist: ViewRow[];
  /** How many rows the shortlist hides, so a caller can label the expand. */
  belowCutoffCount: number;
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
  return sourcesOf(item).some((s) => sourceMatchesBoss(s, boss, zone));
}

// Zone-less ItemSource kinds, ticket 45 §3: `--group-by raid` used to fall
// through to `item.source.kind` verbatim, so an unrecorded-origin item
// rendered a bucket literally titled "unknown" — honest but not a zone name a
// player would recognise. Every kind lacking `zone` gets a reader-facing
// label here instead.
const ZONELESS_SOURCE_LABELS: Record<string, string> = {
  badge: "Badge vendor",
  crafted: "Crafted",
  rep: "Reputation vendor",
  pvp: "PvP vendor",
  world: "World drop",
  unknown: "Source not recorded",
};

function zoneKeyOf(item: RankedItem): string {
  for (const s of sourcesOf(item)) {
    if ("zone" in s) return s.zone;
  }
  return ZONELESS_SOURCE_LABELS[item.source.kind] ?? item.source.kind;
}

/**
 * Half-width of the interval within which two rows read as tied, in DPS.
 *
 * Two `seMethod`s ship at once — paired replication rewrites the top 8
 * above-cutoff rows and everything below stays `independent` — and they are not
 * the same quantity. Measured on the ret P2 ranking (240 rows, 3,000 iterations,
 * seeds 11/22/33/44/55) with the command below — full reasoning in ADR-0021:
 *
 *   independent      232 rows, mean SE 2.149 DPS  → window 4.30
 *   paired-replicate   8 rows, mean SE 0.016 DPS  → window 0.031
 *
 * ~139x apart. So the comparison that spans the two — row 8 against row 9 — has
 * no single scale to be measured on, and `Math.min` silently picked the paired
 * one. On that run rows 8 and 9 sit 0.440 DPS apart: the paired window calls
 * that a real ordering, the independent window calls it a tie, and the honest
 * answer is that **only one of the two rows was ever measured precisely enough
 * to tell**. Row 9 carries a ±2.18 DPS interval; no amount of precision on row 8
 * shrinks it.
 *
 * So a mixed pair is judged on the **coarser** SE, which is the only scale both
 * rows were actually measured on. `Math.min` is kept **within** a method, where
 * point 2 above still applies and both figures mean the same thing.
 *
 * This deliberately does not let Phase 2's resolution leak past the 8 rows that
 * paid for it: §10 buys "resolution, not correctness", and a tighter tie at the
 * boundary would be resolution row 9 never bought. Re-measure with:
 *
 *   pnpm rank --region US --realm dreamscythe --character slamaltman \
 *     --offline --max-phase 2 --report <path>.html
 *
 * then read `se` and `seMethod` per row from the emitted `.json`. Note `--raid`
 * filters the emitted rows, so omit it or the replicated rows may not appear.
 */
function tieWindow(a: ViewRow, b: ViewRow): number {
  const se =
    a.seMethod === b.seMethod ? Math.min(a.se, b.se) : Math.max(a.se, b.se);
  return se * 2;
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
 * 2. **Membership is measured on the *narrower* of the two SEs**, within one
 *    `seMethod`. Testing only `row.high >= leader.low` lets one wide-SE row
 *    bridge a gap its partner's own interval never spans — with SEs of 0.01 and
 *    60, deltas 100 and 50 came out tied while 50 and 49 did not. That argument
 *    assumed two SEs of the same kind; `tieWindow` handles the mixed case.
 * 3. **Anchored to the leader, not to the running union.** Chaining on the
 *    union is the obvious implementation and collapses the whole list at the
 *    SE scale this tool actually reports — §10's "reads as broken" failure.
 *    Observed on the ret P2 ranking at 3,000 iterations, where `independent`
 *    SE measures 2.149 DPS while adjacent deltas differ by far less; §10
 *    records 1.678 DPS at 5,000 iterations, and SE grows as iterations fall.
 */
function assignTieGroups(
  rows: ViewRow[],
  sortKey: (r: ViewRow) => number
): void {
  const byDelta = [...rows].sort((a, b) => sortKey(b) - sortKey(a));
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
    const overlapsLeader =
      row !== undefined &&
      sortKey(leader) - sortKey(row) <= tieWindow(row, leader);
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
/**
 * `deltaDps` alone by default; with `withSetPotential` on, add the
 * prospective bonus a below-threshold candidate would unlock (spec §4). A
 * candidate that already crosses its threshold carries no
 * `prospectiveBonusDps` — that value is already inside `deltaDps` (§2.1) —
 * so `?? 0` never double-counts it.
 */
/**
 * The cutoff verdict for a row as this view values it.
 *
 * Default: carried from the `Ranking`, which is all ADR-0020 permits — a filter
 * selects rows and never moves the bar.
 *
 * Under `withSetPotential` the **bar is still the same absolute `CUTOFF`**;
 * what changes is the quantity measured against it, from `deltaDps` to the
 * effective value the toggle exists to display. Carrying the default verdict
 * here would have the shortlist hide exactly the rows the toggle surfaces: a
 * first tier piece is normally below cutoff *on its own stats* — V0b's
 * Thunderheart singles are all negative — and its whole point is the bonus it
 * unlocks. That is not a per-view threshold, so ADR-0020's rejected
 * "derive the bar from the filtered set" alternative is untouched.
 */
function belowCutoffUnderView(
  item: RankedItem,
  withSetPotential: boolean,
  baselineDps: number
): boolean {
  if (!withSetPotential) return item.belowCutoff;
  const prospective = rankableSetPotential(item);
  if (prospective === 0) return item.belowCutoff;
  const effectiveDps = item.deltaDps + prospective;
  // Percentage arm scaled off the same baseline `rank.ts` used for `deltaPct`,
  // so both arms of the cutoff see the effective value.
  const effectivePct =
    baselineDps === 0 ? item.deltaPct : (effectiveDps / baselineDps) * 100;
  return !meetsCutoff(effectiveDps, effectivePct, CUTOFF);
}

/**
 * The prospective bonus this view is allowed to rank on. A figure whose package
 * breaks another worn set is inflated by an amount no sim can separate after
 * the fact, so it contributes nothing here — it is still disclosed on the row
 * and in the Set potential panel (ticket 90).
 */
function rankableSetPotential(item: Pick<RankedItem, "setContext">): number {
  if (setPotentialIsConfounded(item)) return 0;
  return item.setContext?.prospectiveBonusDps ?? 0;
}

function sortKeyFor(withSetPotential: boolean): (r: ViewRow) => number {
  return withSetPotential
    ? (r) => r.deltaDps + rankableSetPotential(r)
    : (r) => r.deltaDps;
}

function compareRows(
  a: ViewRow,
  b: ViewRow,
  pinBis: boolean,
  sortKey: (r: ViewRow) => number
): number {
  if (pinBis) {
    const ap = a.bisTags.includes("BiS") ? 0 : 1;
    const bp = b.bisTags.includes("BiS") ? 0 : 1;
    if (ap !== bp) return ap - bp;
  }
  const ak = sortKey(a);
  const bk = sortKey(b);
  if (ak !== bk) return bk - ak;
  const richness = b.bisTags.length - a.bisTags.length;
  if (richness !== 0) return richness;
  return a.itemId - b.itemId;
}

export function applyView(r: Ranking, v: ViewOptions = {}): ViewResult {
  const pinBis = v.pinBis ?? false;
  const zone = v.raid === undefined || v.raid === "all" ? undefined : v.raid;
  const boss = v.boss === undefined || v.boss === "all" ? undefined : v.boss;
  const sortKey = sortKeyFor(v.withSetPotential ?? false);

  const rows: ViewRow[] = r.items
    .filter((item) => {
      if (v.hideOwned === true && item.owned === true) return false;
      if (zone !== undefined && !matchesZone(item, zone)) return false;
      if (boss !== undefined && !matchesBoss(item, zone, boss)) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      belowCutoffInView: belowCutoffUnderView(
        item,
        v.withSetPotential ?? false,
        r.baseline.dps
      ),
    }));

  rows.sort((a, b) => compareRows(a, b, pinBis, sortKey));

  assignTieGroups(rows, sortKey);

  const pinBisAvailable = r.items.some((i) => i.bisTags.includes("BiS"));
  const shortlist = rows.filter((row) => !row.belowCutoffInView);
  const result: ViewResult = {
    rows,
    shortlist,
    belowCutoffCount: rows.length - shortlist.length,
    pinBisAvailable,
  };

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
