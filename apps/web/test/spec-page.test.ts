/**
 * A smoke test for the share-link URL template, not the fidelity proof.
 *
 * What proved the registry's `sitePath` rebuilds every one of the eleven URLs
 * the old `SPEC_PAGE` table held is `spec-page-fidelity.test.ts`, which ran
 * against both shapes at once and was deleted with the table. These two cases
 * cover the template's shape: a nested path and a bare one.
 */

import { describe, expect, it } from "vitest";
import { specPageFor } from "../server/exports.js";

describe("specPageFor", () => {
  it("builds a nested class/spec page", () => {
    expect(specPageFor("ret")).toBe(
      "https://www.wowsims.com/tbc/paladin/retribution/"
    );
  });

  it("builds a page for a spec whose path is the class alone", () => {
    expect(specPageFor("warlock")).toBe("https://www.wowsims.com/tbc/warlock/");
  });
});
