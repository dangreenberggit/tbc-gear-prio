Status: open
Type: task
Origin: docs/reviews/feat-upstream-react-port.md (pre-merge review round 1, S1, S2, the deferred parts of S6, S9 and S12)
Blocks: none
Blocked by: none
Related: 558, 560

# Shrink the fork's edits to shared upstream files, and bring the ledger up to date

## Owner's rule this serves

> keep a clean footprint in wowsims shared files if you use them

## What is there today

At fork `feat/upgrades-tab-react` `43e3963d` (on upstream `42c75dc9`), 19 files that upstream also has are modified: `git -C vendor/tbc-new-fork diff --name-only --diff-filter=M 42c75dc9 43e3963d | wc -l`. The pre-merge review's footprint table (`docs/reviews/feat-upstream-react-port.md`, Standards) lists each one. Most Go edits are minimal carried fixes. These are not:

1. **Locale strings (S1).** The tab's strings are appended to the shared `assets/locales/en/translation.json` (+158 lines) and `schemas/translation.schema.json` (+491/-1). The schema hunk also adds `"upgrades_tab"` to the top-level `required` array, so upstream's file fails its own validation without our block (`docs/fork-upstream-touchpoints.md` lines 240-245 already warned about this). The fork's loader is `i18nextLoader({ namespaceResolution: 'basename', paths: ['assets/locales'] })` (`vite.config.mts:154`), and `test-locales.mjs` pairs each `schemas/<name>.schema.json` with `<name>.json`. A separate `upgrades.json` + `upgrades.schema.json` pair may therefore need no shared-file edit (hypothesis, untested; every `i18n.t('upgrades_tab.…')` call would move to the new namespace, and `ui/i18n` tests must still pass).
2. **`vite.config.mts` (S6).** The `__TBC_TAB_FIXTURES__` define and the hard-coded `../../data/tab-fixtures` path could move into the fork-only plugin `tools/vite/tab_fixtures.mts` through its `config()` hook (hypothesis, untested). The production check (the `dist` grep for the dev-only names) must still print nothing.
3. **Root gate scripts and `package.json` (S6, S12).** `test-layout.mjs`, `test-review.mjs`, `test-stop.mjs` and `test-tab-harness.mjs` sit at the fork root, and `package.json` gains three script lines for them. `docs/fork-upstream-touchpoints.md` §4 says moving them under `ui/features/upgrades/tools/` removes the `package.json` lines. When they move, share the CDP helpers that `test-tab-harness.mjs` and `tools/run-tab-cdp.mjs` each define (`freePort`, `findChromium`, `launchChrome`, `cdp`, `evaluate`; S9). The main repo's `scripts/check_layout_gate.py`, `check_desktop_tab.py` and `tab-fixtures/*.mjs` name these paths and move with them.
4. **The ledger (S2).** `docs/fork-upstream-touchpoints.md` is the owner's list of every upstream file the fork edits (its lines 7-11). It names 13 files under old `ui/core/...` paths; the old pin `cb561067` already had 34 modified (`git diff --name-only --diff-filter=M 17a8fb28 cb561067 | wc -l`), and this pin has 19 different ones. Rewrite it from the command above, after items 1-3 land.

## Done when

The command above lists only files the ledger names, each with a one-line reason; the locale and schema files are unmodified or the ledger says why they must be; the fork's `lint:js`, unit tests (including `ui/i18n`) and the layout gate pass; and the fork is re-pinned with `pnpm verify` rc=0.
