// Check 23 of the layout gate (test-layout.mjs): every spec page was measured
// with a fixture, and every spec the fork's tab ranks has a page to measure.
// Pure, so page-coverage.test.mjs can test the decision without a browser.

// The spec ids the fork's tab ranks: the values of `SPEC_ID_BY_PROTO_SPEC` in
// ui/features/upgrades/model/run.ts. That map is not exported and the module
// imports the generated protos, so the harness reads the source text. Returns
// { ids } or { error }; no ids read is an error, never an empty list.
export function forkSpecIdsFrom(runTsText) {
  const block = /const SPEC_ID_BY_PROTO_SPEC\b[^=]*=\s*\{([^}]*)\}/.exec(
    runTsText
  );
  if (!block)
    return { error: "run.ts has no `const SPEC_ID_BY_PROTO_SPEC = { ... }`" };
  const ids = [...block[1].matchAll(/:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
  if (ids.length === 0)
    return { error: "read no spec ids from SPEC_ID_BY_PROTO_SPEC in run.ts" };
  return { ids };
}

// `fixtures`: [{ spec, measured }], one per fixture the run tried. `fork`: the
// result of forkSpecIdsFrom. A page counts only when a fixture on it was
// measured, so a page whose fixture failed to load fails here instead of
// leaving the run "unmeasured", which the gate reads as a skip.
export function pageCoverage({ pagePathBySpec, fork, fixtures }) {
  const measured = new Set(
    fixtures.filter((f) => f.measured).map((f) => f.spec)
  );
  const pagesWithout = Object.keys(pagePathBySpec).filter(
    (spec) => !measured.has(spec)
  );
  if (fork.error) return { ok: false, pagesWithout, forkSpecError: fork.error };
  const specsWithoutPage = fork.ids.filter((id) => !(id in pagePathBySpec));
  return {
    ok: pagesWithout.length === 0 && specsWithoutPage.length === 0,
    pagesWithout,
    specsWithoutPage,
  };
}
