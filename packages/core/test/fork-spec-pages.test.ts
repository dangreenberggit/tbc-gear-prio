/**
 * Every spec the fork's Upgrades tab ranks has a page in the layout gate's
 * PAGE_PATH_BY_SPEC, so no ranked spec goes without a page the gate measures
 * (ticket 801). The test asks the tab's own `specIdFor` (`model/run.ts`) for
 * every proto `Spec`, so the answer is the tab's, not a reading of its source.
 *
 * The fork is gitignored (`vendor/`), so the suite skips when it is absent.
 */

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";

import {
  forkPresent,
  forkRoot,
  importForkUpgrades,
} from "./fork-engine-harness.js";

describe.skipIf(!forkPresent)("spec pages for the fork's ranked specs", () => {
  let rankedSpecIds: string[];
  let pagePathBySpec: Record<string, string>;

  beforeAll(async () => {
    // A runtime URL, like the fork imports: the harness is untyped JavaScript.
    ({ PAGE_PATH_BY_SPEC: pagePathBySpec } = (await import(
      new URL(
        "../../../scripts/tab-harness/test-tab-harness.mjs",
        import.meta.url
      ).href
    )) as { PAGE_PATH_BY_SPEC: Record<string, string> });
    const { specIdFor } = await importForkUpgrades<{
      specIdFor: (spec: number) => string | undefined;
    }>("run.ts");
    const { Spec } = (await import(
      pathToFileURL(join(forkRoot, "ui/generated/proto/common.ts")).href
    )) as { Spec: Record<string, string | number> };
    const protoSpecs = Object.values(Spec).filter(
      (v): v is number => typeof v === "number"
    );
    rankedSpecIds = [
      ...new Set(
        protoSpecs
          .map((spec) => specIdFor(spec))
          .filter((id): id is string => id !== undefined)
      ),
    ];
  });

  it("reads at least one ranked spec from the tab", () => {
    expect(rankedSpecIds.length).toBeGreaterThan(0);
  });

  it("has a page path for every ranked spec", () => {
    const withoutPage = rankedSpecIds.filter((id) => !(id in pagePathBySpec));
    expect(withoutPage).toEqual([]);
  });
});
