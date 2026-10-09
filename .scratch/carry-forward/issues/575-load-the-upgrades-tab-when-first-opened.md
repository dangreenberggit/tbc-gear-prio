Status: closed
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

## Comments

### 2026-10-08, cleanup stage cleanup-upstream-footprint, chunk F — closed

- Fork `d983e0fbe` "Load the Upgrades tab when it is first opened":
  `ui/app/tabs/UpgradesTabBody.tsx` is now a shell that watches its tab
  panel's `hidden` attribute and lazily imports the body, which moved to
  `ui/features/upgrades/app/UpgradesTabBodyInner.tsx`. No existing wowsims
  file changed; `git -C vendor/tbc-new-fork diff --numstat --diff-filter=M
  42c75dc9 HEAD` still prints only `6 0 ui/app/SimTabsSection.tsx`. While
  the body loads, the pane shows wowsims' own `Spinner`.
- Sizes, production build from the fork root
  (`node node_modules/vite/bin/vite.js build --outDir <dir> --emptyOutDir`,
  the build command of `make dist/tbc/bundle/.dirstamp`), `gzip -9`:

  | | before (`c122cf73b`) | after (`d983e0fbe`) |
  | --- | --- | --- |
  | spec entry script | 7,380,483 B, 1,048,766 B gzipped | 818,650 B, 227,264 B gzipped |
  | entry plus its static imports | 9,039,888 B | 2,624,962 B |
  | lazy chunk `UpgradesTabBodyInner-*.chunk.js` | none | 6,420,680 B, 774,177 B gzipped |
  | `grep -o -F carryoverPolicy <entry> \| wc -l` | 44 | 0 |

  After the change, `carryoverPolicy` and the tab's test ids
  (`upgrades-run-button`, `upgrades-tab-root`) appear only in the lazy chunk.
- On `:5173` (`WASM_WORKER=1`, feral page): before the first click the dev
  server had transformed no module under `ui/features/upgrades/` (its
  `vite:transform` log), so the run-staleness subscription in
  `useRunStale.ts` had not started; the click loaded the body in about
  1.5 s. A 200-iteration ranking ran to the end, Stop ended a second run,
  and the result and settings were the same after switching to Gear and
  back. `?upgrades-fixture=feral-p3-p2bis` autoloaded (16 rows).
- Port `d0761630` re-pins and makes the fixture autoload script click the
  tab before it waits for `window.__upgradesFixture`. `pnpm verify` rc 0
  (1517 gates); `pnpm tab-fixtures:smoke` 5/5 ok; `pnpm layout-gate:check`
  measured pass, 36 PASS, baseline advanced by the gate to `ed6d57fe8a95`.
- The tab's text strings stay in the first download, because wowsims' i18n
  loader loads every locale file at startup (`vite.config.mts`).
