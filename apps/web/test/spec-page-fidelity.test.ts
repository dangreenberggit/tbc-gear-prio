/**
 * Temporary: proves the registry's `sitePath` rebuilds exactly the URL the
 * `SPEC_PAGE` table held, for every spec, while both shapes are alive.
 *
 * The template here is the one `specPageFor` will use once the table is gone,
 * so this compares the future implementation against the present data rather
 * than against a hand-typed URL.
 *
 * Deleted in the commit that deletes `SPEC_PAGE`.
 */

import { describe, expect, it } from "vitest";
import { SPEC_IDS, SPEC_REGISTRY } from "@tbc-gear-prio/core";
import { specPageFor } from "../server/exports.js";

describe("the registry rebuilds every spec page URL", () => {
  for (const id of SPEC_IDS) {
    it(`rebuilds ${id}'s page`, () => {
      expect(specPageFor(id)).toBe(
        `https://www.wowsims.com/tbc/${SPEC_REGISTRY[id].sitePath}/`
      );
    });
  }
});
