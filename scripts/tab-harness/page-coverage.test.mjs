import { describe, expect, it } from "vitest";
import { pageCoverage } from "./page-coverage.mjs";

const PAGES = { ret: "/tbc/paladin/retribution/", mage: "/tbc/mage/dps/" };

describe("pageCoverage", () => {
  it("passes when every page was measured", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
    ];
    expect(pageCoverage({ pagePathBySpec: PAGES, fixtures })).toEqual({
      ok: true,
      pagesWithout: [],
    });
  });

  it("fails a page with no fixture", () => {
    const fixtures = [{ spec: "ret", measured: true }];
    const c = pageCoverage({ pagePathBySpec: PAGES, fixtures });
    expect(c.ok).toBe(false);
    expect(c.pagesWithout).toEqual(["mage"]);
  });

  it("fails a page whose only fixture was not measured", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: false },
    ];
    const c = pageCoverage({ pagePathBySpec: PAGES, fixtures });
    expect(c.ok).toBe(false);
    expect(c.pagesWithout).toEqual(["mage"]);
  });

  it("passes a page with one measured fixture and one unmeasured", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
      { spec: "mage", measured: false },
    ];
    expect(pageCoverage({ pagePathBySpec: PAGES, fixtures }).ok).toBe(true);
  });
});
