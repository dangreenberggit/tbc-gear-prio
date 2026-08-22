/**
 * Whether a set-potential figure is confounded by a broken worn set.
 *
 * Split out of `rank-report-rules.ts` so `view.ts` can reach it without
 * pulling that module's `items.js` import — and with it the 6.8 MB item
 * index — into the browser bundle. `applyView` runs client-side (PLAN.md
 * §14 Stage 3, gate box 4: filters and pins re-render with no network round
 * trip), so its runtime closure has to stay free of the item data.
 */

import type { RankedItem } from "./rank.js";

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
