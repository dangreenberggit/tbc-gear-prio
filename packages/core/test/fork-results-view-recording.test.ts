/**
 * The Upgrades tab's results view over a recorded run, on the fork.
 *
 * The recording lives in this repo, not the fork, so the check lives here too:
 * in the fork it could only ever skip. It drives the fork's `resultsViewFor`
 * and `paneRows` (`model/results_view.ts`) over `ret-p3-p2.json`, a ret P3 run
 * from P2 gear (`fixtures/tab-recordings/README.md`).
 *
 * The fork is gitignored (`vendor/`), so this skips when it is absent, which
 * includes every CI run.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { forkPresent, importForkUpgrades } from "./fork-engine-harness.js";

const RECORDING = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/tab-recordings/ret-p3-p2.json"
);

type Pane = { main: unknown[]; emptyReason?: string };
type ResultsView = {
  ALL_SLOTS_PANE: string;
  NO_VIEW_TOGGLES: Record<string, unknown>;
  resultsViewFor(run: unknown, toggles: unknown): unknown;
  paneRows(view: unknown, pane: string): Pane;
};

describe.skipIf(!forkPresent)(
  "results view over the ret-p3-p2 recording",
  () => {
    it("under BiS only, empties the panes with no BiS-list upgrade, the trinket pane's one row included, and says no upgrades there", async () => {
      const rv = await importForkUpgrades<ResultsView>("results_view.ts");
      const { ranking } = JSON.parse(readFileSync(RECORDING, "utf8")) as {
        ranking: unknown;
      };
      const viewWith = (onlyBis: boolean) =>
        rv.resultsViewFor(
          { status: "done", runId: 1, result: ranking },
          { ...rv.NO_VIEW_TOGGLES, onlyBis }
        );
      const all = viewWith(false);
      const bis = viewWith(true);
      // The recording's one trinket row is not on the BiS list, so the BiS
      // filter is what empties its pane.
      expect(rv.paneRows(all, "trinket1").main).toHaveLength(1);
      expect(rv.paneRows(bis, "trinket1")).toMatchObject({
        main: [],
        emptyReason: "no-upgrades",
      });
      // The neck pane's BiS-list item is worn, so it has no row either way.
      expect(rv.paneRows(bis, "neck")).toMatchObject({
        main: [],
        emptyReason: "no-upgrades",
      });
      expect(rv.paneRows(all, rv.ALL_SLOTS_PANE).main).toHaveLength(24);
      expect(rv.paneRows(bis, rv.ALL_SLOTS_PANE).main).toHaveLength(9);
    });
  }
);
