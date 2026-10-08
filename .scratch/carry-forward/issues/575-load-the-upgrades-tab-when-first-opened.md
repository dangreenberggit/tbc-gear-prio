Status: open
Type: task
Origin: stage-gate cleanup-upstream-footprint, plan revision 4, step D3 (work in chunk F), 2026-10-08 (`.scratch/stage-gate/cleanup-upstream-footprint/plan.md`; gitignored, owner's checkout)
Blocks: none
Blocked by: none
Related: 558

# Load the Upgrades tab's code and item data only when the tab is first opened

## Owner's words (2026-10-08)

> "7m: sounds good. A ticket for this branch then but we need to stay organized
> and clean"

> "Lazy load branch: correct"

So this runs on the tab branch (`feat/upgrades-tab-react` in
`vendor/tbc-new-fork`, `feat/upstream-react-port` here), as its own commits.

## What is wrong

Every wowsims sim page loads the tab's code and its bundled item data whether
or not the visitor opens the tab. The "7m" in the owner's words is the
session's estimate of that weight (about 7 MB, unverified; the plan below
measures it). The bundled data is 12,595,279
bytes in 66 files (`git -C vendor/tbc-new-fork ls-tree -r -l HEAD ui/features/upgrades/model/data`).
A wowsims maintainer is unlikely to accept that weight on every visitor.

## Plan (cleanup plan, chunk F)

- `ui/app/tabs/UpgradesTabBody.tsx` becomes a small shell. It finds its
  `closest('[role="tabpanel"]')` and watches that element's `hidden`
  attribute; the first time the panel is shown it renders
  `React.lazy(() => import('@features/upgrades/app/UpgradesTabBodyInner'))`
  inside `Suspense`. If no panel is found, it renders the body at once.
- No existing wowsims file changes. `ui/app/SimTabsSection.tsx` stays at its
  6 approved lines. If the change needs any other wowsims edit, stop and ask
  the owner.
- The fixture plugin's autoload script (`scripts/tab-harness/tab_fixtures.mjs`)
  clicks the tab first, then waits for `window.__upgradesFixture`.
- Measure before and after with `make dist/tbc/bundle/.dirstamp` from the
  fork root: the spec entry script's bytes and gzipped bytes, the new lazy
  chunk's size, and `grep -o -F carryoverPolicy <entry script> | wc -l`, which
  must go to 0.

## Done when

The entry script no longer holds the tab's code (the `carryoverPolicy` count
is 0), the fixtures still autoload on `:5173`, `pnpm tab-fixtures:smoke` and
`pnpm verify` pass after the re-pin, and this ticket records the numbers.
