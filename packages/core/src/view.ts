/**
 * The view layer (PLAN.md §4.1). Pure: a re-render of a `Ranking` that already
 * exists. No seam, no I/O, no sim, and nothing here reaches `contentHash` —
 * that is the property the Stage 2 gate box asserts, and the reason this is the
 * module's second export rather than logic duplicated in the CLI and the web.
 */
import { meetsCutoff, type Cutoff } from "./cutoff.js";
import { sourceMatchesBoss, type ItemSource } from "./pool.js";
import { setPotentialIsConfounded, SLOT_ORDER } from "./rank-report-rules.js";
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
  /**
   * How many rows the shortlist hides, so a caller can label the expand.
   *
   * Full-iteration rows only — screened rows left `rows` for `ruledOut`
   * (ticket 224), so they are not counted here. The two counts are disjoint
   * (a row is screened xor full-iteration) and jointly exhaustive over the
   * rows the default display hides:
   * `shortlist.length + belowCutoffCount + ruledOut.length` equals the
   * filtered row total.
   */
  belowCutoffCount: number;
  /**
   * Candidates the screening pass ruled out (`RankedItem.screened !==
   * undefined`) and never promoted to a full-iteration measurement — a
   * disclosed **set**, not a ranking (ticket 224, option 1).
   *
   * Kept out of `rows`, `shortlist` and `groups` so no consumer can print a
   * screened row in a positional list. Ordered by `SLOT_ORDER`, then item
   * name, then `itemId`: an order that carries no priority claim and does not
   * move when the screening deltas move, which is what makes the disclosure a
   * set rather than a second, weaker ranking. `tieGroupId` is never assigned —
   * a screening delta and a full-iteration delta are not the same quantity,
   * so there is no SE window to group them by.
   *
   * The delta ordering is not lost: it stays on `Ranking.items`, which
   * `applyView` never mutates and which the measurement scripts read directly.
   *
   * "Hidden, never deleted" (§10) still holds — this is a projection of the
   * same filtered payload, so a caller that wants every row renders
   * `[...rows, ...ruledOut]`.
   */
  ruledOut: ViewRow[];
  /**
   * Whether a `pinBis` toggle has anything to act on. The Stage 3 gate box
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
 * This deliberately does not let Stage 2's resolution leak past the 8 rows that
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
/**
 * `groupId` starts from a shared counter passed in rather than always at 0,
 * so calling this once per screened/non-screened partition (§6.1: screened
 * rows are ranked only among themselves) cannot mint `tie-1` twice and
 * collide two unrelated groups under one id.
 */
function assignTieGroupsWithinPartition(
  rows: ViewRow[],
  sortKey: (r: ViewRow) => number,
  groupIdRef: { next: number }
): void {
  const byDelta = [...rows].sort((a, b) => sortKey(b) - sortKey(a));
  let groupStart = 0;

  const flush = (end: number) => {
    if (end - groupStart > 1) {
      const id = `tie-${groupIdRef.next}`;
      groupIdRef.next += 1;
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
 * Only full-iteration rows reach here: screened rows leave for `ruledOut`
 * before tie grouping (ticket 224). That is what the old two-partition split
 * was protecting against — a screening delta and a full-iteration delta are
 * not the same quantity, so the SE-window math must never span the boundary —
 * and removing the screened rows from `rows` enforces it upstream instead.
 */
function assignTieGroups(
  rows: ViewRow[],
  sortKey: (r: ViewRow) => number
): void {
  assignTieGroupsWithinPartition(rows, sortKey, { next: 1 });
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
 * Under `withSetPotential` the **bar is still the ranking's own absolute
 * cutoff** (per-spec since issue #1 step 0, carried on the `Ranking`);
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
  baselineDps: number,
  cutoff: Cutoff
): boolean {
  // Screened out (candidate-pool.md §6.1): never measured at full
  // precision, so there is no cutoff verdict to give it — the same
  // "excluded from the shortlist, present in rows" treatment a Stop-
  // unsimmed row gets, and for the same reason (view.ts has no ranking-
  // level `simmed` field to check, but `screened` carries the same idea).
  if (item.screened !== undefined) return true;
  if (!withSetPotential) return item.belowCutoff;
  const prospective = rankableSetPotential(item);
  if (prospective === 0) return item.belowCutoff;
  const effectiveDps = item.deltaDps + prospective;
  // Percentage arm scaled off the same baseline `rank.ts` used for `deltaPct`,
  // so both arms of the cutoff see the effective value.
  const effectivePct =
    baselineDps === 0 ? item.deltaPct : (effectiveDps / baselineDps) * 100;
  return !meetsCutoff(effectiveDps, effectivePct, cutoff);
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

/**
 * The ruled-out set's presentation order (ticket 224). Deliberately *not* the
 * screening delta: slot then name is stable under any change in the screening
 * measurement, so a reader cannot mistake the sequence for a priority claim.
 * `itemId` is the final tiebreak only so the order is total.
 */
function compareRuledOutRows(a: ViewRow, b: ViewRow): number {
  const slotDiff = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
  if (slotDiff !== 0) return slotDiff;
  const nameDiff = a.name.localeCompare(b.name, "en");
  if (nameDiff !== 0) return nameDiff;
  return a.itemId - b.itemId;
}

export function applyView(r: Ranking, v: ViewOptions = {}): ViewResult {
  const pinBis = v.pinBis ?? false;
  const zone = v.raid === undefined || v.raid === "all" ? undefined : v.raid;
  const boss = v.boss === undefined || v.boss === "all" ? undefined : v.boss;
  const sortKey = sortKeyFor(v.withSetPotential ?? false);

  const filtered: ViewRow[] = r.items
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
        r.baseline.dps,
        r.cutoff
      ),
    }));

  const rows = filtered.filter((row) => row.screened === undefined);
  const ruledOut = filtered.filter((row) => row.screened !== undefined);

  rows.sort((a, b) => compareRows(a, b, pinBis, sortKey));
  ruledOut.sort(compareRuledOutRows);

  assignTieGroups(rows, sortKey);

  const pinBisAvailable = r.items.some((i) => i.bisTags.includes("BiS"));
  const shortlist = rows.filter((row) => !row.belowCutoffInView);
  const result: ViewResult = {
    rows,
    shortlist,
    belowCutoffCount: rows.length - shortlist.length,
    ruledOut,
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
