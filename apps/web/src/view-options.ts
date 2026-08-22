/**
 * The pure half of the view controls: what the browser may hand `applyView`,
 * and which raid/boss options the current rows actually support.
 *
 * Separate from `components/ViewControls.tsx` so both rules are unit-testable
 * without a DOM — there is no jsdom in this plan.
 */
import type { RankedItem } from "@tbc-gear-prio/core";
import type { ViewOptions } from "@tbc-gear-prio/core/view";

export type UiViewOptions = ViewOptions & {
  /**
   * "Already have it" is a *display* toggle, not core's `hideOwned`.
   *
   * §12 and §8.3.3 say owned rows are greyed, never removed, and core's
   * `hideOwned` filters them out of `rows` entirely. Passing it through would
   * silently delete rows the plan requires visible, so this flag stays on the
   * UI side of the boundary and never reaches `applyView`.
   */
  greyOwned?: boolean;
};

/**
 * What `applyView` may see — `greyOwned` is stripped.
 *
 * Built field by field rather than by rest-spreading the flag away, so a new
 * UI-only option is a compile error here rather than something that silently
 * leaks into a core call.
 */
export function toViewOptions(v: UiViewOptions): ViewOptions {
  const out: ViewOptions = {};
  if (v.pinBis !== undefined) out.pinBis = v.pinBis;
  if (v.raid !== undefined) out.raid = v.raid;
  if (v.boss !== undefined) out.boss = v.boss;
  if (v.groupBy !== undefined) out.groupBy = v.groupBy;
  if (v.hideOwned !== undefined) out.hideOwned = v.hideOwned;
  if (v.withSetPotential !== undefined) {
    out.withSetPotential = v.withSetPotential;
  }
  return out;
}

export type Zone = { zone: string; bosses: string[] };

/**
 * Raid and boss options, read off the rows themselves so a filter can never
 * offer a zone with nothing behind it.
 *
 * A tier token reaches its zone through `kind: "token"` as well as
 * `kind: "raid"` (§8.3.2) — both carry `zone`, so matching on the field rather
 * than the kind is what keeps T4 pieces under "Karazhan".
 */
export function zonesOf(items: readonly RankedItem[]): Zone[] {
  const byZone = new Map<string, Set<string>>();

  for (const item of items) {
    for (const source of item.sources ?? [item.source]) {
      if (!("zone" in source)) continue;
      const bosses = byZone.get(source.zone) ?? new Set<string>();
      if ("boss" in source && source.boss !== undefined) {
        bosses.add(source.boss);
      }
      byZone.set(source.zone, bosses);
    }
  }

  return [...byZone.entries()]
    .map(([zone, bosses]) => ({ zone, bosses: [...bosses].sort() }))
    .sort((a, b) => a.zone.localeCompare(b.zone));
}
