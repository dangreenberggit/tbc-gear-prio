import { describe, expect, it } from "vitest";
import { forkSpecIdsFrom, pageCoverage } from "./page-coverage.mjs";

const RUN_TS = `
const SPEC_ID_BY_PROTO_SPEC: Partial<Record<Spec, SpecId>> = {
	[Spec.SpecRetributionPaladin]: 'ret',
	[Spec.SpecMage]: 'mage',
};

export const specIdFor = (spec: Spec): SpecId | undefined => SPEC_ID_BY_PROTO_SPEC[spec];
`;
const PAGES = { ret: "/tbc/paladin/retribution/", mage: "/tbc/mage/dps/" };
const fork = forkSpecIdsFrom(RUN_TS);

describe("forkSpecIdsFrom", () => {
  it("reads the map's values", () => {
    expect(fork).toEqual({ ids: ["ret", "mage"] });
  });

  it("is an error when the map is missing", () => {
    expect(forkSpecIdsFrom("export const x = 1;").error).toBeDefined();
  });

  it("is an error when the map holds no ids", () => {
    const empty =
      "const SPEC_ID_BY_PROTO_SPEC: Partial<Record<Spec, SpecId>> = {};";
    expect(forkSpecIdsFrom(empty).error).toBeDefined();
  });
});

describe("pageCoverage", () => {
  it("passes when every page was measured and every fork spec has a page", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
    ];
    expect(pageCoverage({ pagePathBySpec: PAGES, fork, fixtures })).toEqual({
      ok: true,
      pagesWithout: [],
      specsWithoutPage: [],
    });
  });

  it("fails a page with no fixture", () => {
    const fixtures = [{ spec: "ret", measured: true }];
    const c = pageCoverage({ pagePathBySpec: PAGES, fork, fixtures });
    expect(c.ok).toBe(false);
    expect(c.pagesWithout).toEqual(["mage"]);
  });

  it("fails a page whose only fixture was not measured", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: false },
    ];
    const c = pageCoverage({ pagePathBySpec: PAGES, fork, fixtures });
    expect(c.ok).toBe(false);
    expect(c.pagesWithout).toEqual(["mage"]);
  });

  it("passes a page with one measured fixture and one unmeasured", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
      { spec: "mage", measured: false },
    ];
    expect(pageCoverage({ pagePathBySpec: PAGES, fork, fixtures }).ok).toBe(
      true
    );
  });

  it("fails a spec the fork ranks that has no page path", () => {
    const withShadow = forkSpecIdsFrom(
      RUN_TS.replace("'mage',", "'mage',\n\t[Spec.SpecDpsPriest]: 'shadow',")
    );
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
    ];
    const c = pageCoverage({
      pagePathBySpec: PAGES,
      fork: withShadow,
      fixtures,
    });
    expect(c.ok).toBe(false);
    expect(c.specsWithoutPage).toEqual(["shadow"]);
  });

  it("fails when the fork's spec ids could not be read", () => {
    const fixtures = [
      { spec: "ret", measured: true },
      { spec: "mage", measured: true },
    ];
    const c = pageCoverage({
      pagePathBySpec: PAGES,
      fork: forkSpecIdsFrom(""),
      fixtures,
    });
    expect(c.ok).toBe(false);
    expect(c.forkSpecError).toBeDefined();
  });
});
