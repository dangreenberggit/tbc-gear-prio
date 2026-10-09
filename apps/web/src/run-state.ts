/**
 * The pure half of `/run/$id` (PLAN.md §12): how a poll becomes a label, how
 * incoming rows merge without reshuffling, and what the completed order is.
 *
 * Kept out of the component so the run page's rules are testable without a
 * DOM. `applyView` is imported through the `@tbc-gear-prio/core/view` subpath,
 * whose closure carries no item index, so the browser bundle stays small.
 */
import type { RankedItem, Ranking } from "@tbc-gear-prio/core";
import {
  applyView,
  type ViewOptions,
  type ViewResult,
  type ViewRow,
} from "@tbc-gear-prio/core/view";

/**
 * The flattened progress the server stores, not core's `Progress` union: the
 * server folds the `{kind:"row"}` side channel into `rows` and keeps the last
 * stage, so a poll sees one object rather than an event stream.
 */
export type JobProgress = {
  stage:
    | "resolving"
    | "reading-gear"
    | "composing"
    | "building-pool"
    | "simming"
    | "ranking";
  done: number;
  total: number;
  /** Sims that will run; see `skeletonCount`. */
  candidates?: number;
  rows?: RankedItem[];
};

const STAGE_LABELS: Record<JobProgress["stage"], string> = {
  resolving: "resolving",
  "reading-gear": "reading gear",
  composing: "composing",
  "building-pool": "building pool",
  simming: "simming",
  ranking: "ranking",
};

export function progressLabel(p: JobProgress): string {
  if (p.stage === "simming") return `simming ${p.done}/${p.total}`;
  return STAGE_LABELS[p.stage] ?? p.stage;
}

/**
 * How many skeleton rows to render, or `undefined` while the list must stay a
 * fixed-height empty container.
 *
 * Deviation 4: `progress.total` counts sims (baseline + candidates + paired
 * replicas), not rows, so sizing the list from it would render the wrong
 * number and then shift. `rank.ts` emits `simming` from four sites and only
 * the first carries `candidates`, so the trigger is "the field is defined",
 * not "the stage is simming".
 */
export function skeletonCount(p: JobProgress): number | undefined {
  return p.candidates;
}

/**
 * A row's identity for merging. Two worn rings share an item id but not a
 * `slotChoice`, so an id-keyed merge would collapse the pair into one row.
 */
function rowKey(r: RankedItem): string {
  return `${r.itemId}|${r.slot}|${r.slotChoice ?? ""}`;
}

/**
 * Fold a poll's rows into the displayed list **in arrival order**.
 *
 * PLAN.md §12: no re-sorting during the run. The server sends the whole row
 * set each poll, so this keeps the position a row first appeared at and only
 * refreshes its payload; new rows append. The single re-sort happens at
 * completion, through `finalOrder`.
 */
export function mergeRows(
  prev: readonly RankedItem[],
  incoming: readonly RankedItem[]
): RankedItem[] {
  if (incoming.length === 0) return [...prev];

  const byKey = new Map(incoming.map((r) => [rowKey(r), r]));
  const merged: RankedItem[] = [];
  const seen = new Set<string>();

  for (const old of prev) {
    const key = rowKey(old);
    seen.add(key);
    merged.push(byKey.get(key) ?? old);
  }
  for (const r of incoming) {
    const key = rowKey(r);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(r);
    }
  }
  return merged;
}

/** The completed order — the one animated re-sort's destination. */
export function finalOrder(r: Ranking, v: ViewOptions = {}): ViewRow[] {
  return applyView(r, v).rows;
}

/**
 * Whether to render the Pin BiS control at all. The gate box wants it
 * **absent** where no curated set exists, not present and inert.
 */
export function showPinControl(view: ViewResult): boolean {
  return view.pinBisAvailable;
}
