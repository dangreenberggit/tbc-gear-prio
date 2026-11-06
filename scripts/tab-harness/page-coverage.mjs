// Check 23 of the layout gate (test-layout.mjs): every spec page was measured
// with a fixture. That every spec the fork's tab ranks has a page is tested
// against the tab's own code in packages/core/test/fork-spec-pages.test.ts.
// Pure, so page-coverage.test.mjs can test the decision without a browser.

// `fixtures`: [{ spec, measured }], one per fixture the run tried. A page
// counts only when a fixture on it was measured, so a page whose fixture
// failed to load fails here instead of leaving the run "unmeasured", which the
// gate reads as a skip.
export function pageCoverage({ pagePathBySpec, fixtures }) {
  const measured = new Set(
    fixtures.filter((f) => f.measured).map((f) => f.spec)
  );
  const pagesWithout = Object.keys(pagePathBySpec).filter(
    (spec) => !measured.has(spec)
  );
  return { ok: pagesWithout.length === 0, pagesWithout };
}
