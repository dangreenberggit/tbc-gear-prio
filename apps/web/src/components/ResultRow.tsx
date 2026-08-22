/**
 * One ranked row, and the fixed-height skeleton that stands in for it.
 *
 * Both render at exactly `--row-height`, which is what lets a skeleton become
 * a row with no layout shift.
 */
import type { RankedItem } from "@tbc-gear-prio/core";

export function RowSkeleton() {
  return (
    <div className="row skeleton" aria-hidden="true">
      <span className="row__rank">0</span>
      <span className="row__name">loading</span>
      <span className="row__delta">0.0</span>
    </div>
  );
}

export function ResultRow({
  row,
  belowCutoff = false,
  greyOwned = true,
}: {
  row: RankedItem;
  /** The view's own verdict (`belowCutoffInView`), not the ranking's. */
  belowCutoff?: boolean;
  /**
   * Whether the "Already have it" control is on. It changes only how an owned
   * row is painted — the row is present either way (§8.3.3), so this is a
   * display flag and never a filter.
   */
  greyOwned?: boolean;
}) {
  const classes = ["row"];
  if (row.owned === true && greyOwned) classes.push("row--owned");
  if (belowCutoff) classes.push("row--below");

  return (
    <div className={classes.join(" ")} data-item-id={row.itemId}>
      <span className="row__rank">{row.rank ?? "—"}</span>
      <span className="row__name">
        {row.name}
        {row.owned === true && greyOwned && (
          <span className="pill">have it</span>
        )}
        {row.hitDriven === true && <span className="pill">hit-driven</span>}
        {row.bisTags.includes("BiS") && <span className="pill">BiS</span>}
        {row.slotChoice !== undefined && (
          <span className="pill">{row.slotChoice}</span>
        )}
      </span>
      <span className="row__delta">
        {row.deltaDps >= 0 ? "+" : ""}
        {row.deltaDps.toFixed(1)} dps
        <span className="muted"> ±{row.se.toFixed(1)}</span>
      </span>
    </div>
  );
}
