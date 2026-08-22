/**
 * The view controls (PLAN.md §12), in TMB's vocabulary since we export into
 * TMB's workflow.
 *
 * Wording is §12's table (plan deviation 3): TMB's exact control labels could
 * not be confirmed from its public pages without a login, so this ships the
 * plan's wording and renaming later is a string change.
 *
 * Every control here is a `ViewOptions` change. The caller recomputes
 * `applyView` in the browser — no re-sim, no request. The two pure rules
 * behind the controls live in `../view-options.js` so they can be tested
 * without a DOM.
 */
import type { RankedItem } from "@tbc-gear-prio/core";
import type { ViewOptions } from "@tbc-gear-prio/core/view";
import { zonesOf, type UiViewOptions } from "../view-options.js";

type Props = {
  items: readonly RankedItem[];
  value: UiViewOptions;
  onChange: (next: UiViewOptions) => void;
  /** Absent, not disabled, when the ranking has no curated BiS to pin. */
  showPinBis: boolean;
};

export function ViewControls({ items, value, onChange, showPinBis }: Props) {
  const zones = zonesOf(items);
  const selectedZone = zones.find((z) => z.zone === value.raid);

  return (
    <div className="controls">
      <label className="field">
        <span>Raid</span>
        <select
          value={value.raid ?? "all"}
          onChange={(e) => {
            const raid = e.target.value;
            // A boss from the old raid cannot survive a raid change: it would
            // filter to nothing and read as "no upgrades here".
            onChange(
              raid === "all"
                ? { ...value, raid: "all", boss: "all" }
                : { ...value, raid, boss: "all" }
            );
          }}
        >
          <option value="all">All raids</option>
          {zones.map((z) => (
            <option key={z.zone} value={z.zone}>
              {z.zone}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Boss</span>
        <select
          value={value.boss ?? "all"}
          disabled={selectedZone === undefined}
          onChange={(e) => {
            onChange({ ...value, boss: e.target.value });
          }}
        >
          <option value="all">All bosses</option>
          {(selectedZone?.bosses ?? []).map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Group by</span>
        <select
          value={value.groupBy ?? "rank"}
          onChange={(e) => {
            onChange({
              ...value,
              groupBy: e.target.value as NonNullable<ViewOptions["groupBy"]>,
            });
          }}
        >
          <option value="rank">Rank</option>
          <option value="slot">Slot</option>
          <option value="raid">Raid</option>
        </select>
      </label>

      <label className="toggle">
        <input
          type="checkbox"
          checked={value.greyOwned ?? true}
          onChange={(e) => {
            onChange({ ...value, greyOwned: e.target.checked });
          }}
        />
        <span>Already have it</span>
      </label>

      {showPinBis && (
        <label className="toggle">
          <input
            type="checkbox"
            checked={value.pinBis ?? false}
            onChange={(e) => {
              onChange({ ...value, pinBis: e.target.checked });
            }}
          />
          <span>Pin BiS</span>
        </label>
      )}
    </div>
  );
}
