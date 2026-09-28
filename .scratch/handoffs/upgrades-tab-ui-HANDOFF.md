# Upgrades-tab UI — handoff for future tweaks

The Upgrades tab is in the gitignored fork clone `vendor/tbc-new-fork` (main
checkout only). Changes land via fork commit + re-pin of `data/wowsims-fork.lock.json`
(pattern: `git log --oneline` for "Re-pin fork to …" commits). Read
`docs/agents/known-traps.md` before editing a ported engine file, moving the pin,
or starting dev servers. `pnpm verify` gates lint/parity; the DOM/width **layout
gate runs only under `pnpm merge-to-dev`, NOT `pnpm verify`** — use gate-visual /
live for width checks.

## Where things live (all under `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/`)

- **Tab UI, tooltips, controls, presentation:** `upgrades_tab.tsx`
  - Set-bonus display + tooltip: `setBonusPresentation` (~:3001+)
  - Result row / DPS cell + sort key: `resultRow` (~:2828), `deltaSortKey` (~:2444), `viewOptions()` (~:2428)
  - View controls (Set-potential toggle, Full/Split credit radio): search `setPotentialControl`, `setCreditControl`; toggles are `() => this.render()`, **not persisted**, disabled-with-reason via the 441 `ViewToggle`/`enableWhen` idiom.
  - Pre-run description + "(New)" nav label: locale `upgrades_tab.description` / `upgrades_tab.title`.
- **Ranking math (BYTE-GATED engine — PROVENANCE re-pin required):** `upgrades/engine/rank.ts` (net totals, `applySetContext`, `buildSetBonuses`, the broken-set `B` sim behind `measureBrokenSetValue`), `view.ts` (sort key, `rankableSetPotential`, `setCredit`), `set-value.ts` (thresholds, `computeSynergy`).
- **Styling:** `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (tab-specific). NOT `_sim_tab.scss` (shared, don't edit).
- **Strings + schema:** `assets/locales/en/translation.json` + `schemas/translation.schema.json` (value-only = locale only; new key = both, schema forbids unknown keys).

## Live-verify / visual gotchas

- The frozen `test-review.mjs` harness hardcodes the **ret** page with **no gear
  injection**, so set-bonus rows are empty there. To exercise set/credit/tooltip
  UI, drive the **feralcat** page on `:3333` and inject gear via
  `localStorage['__tbc_new_feral_cat_druid__currentSettings__']` before navigation
  (see `.scratch/stage-gate/set-bonus-net-value-467/live-harness.mjs`).
- Git Bash mangles a leading-slash `--page /tbc/...` into a Windows path — use
  `MSYS_NO_PATHCONV=1` + native `C:/` paths.
- fnm/Node shell footgun: run git standalone, `commit -F`, absolute `C:/` node paths.

## Open UI items on set-bonus (ticket 467, not blocking, owner-aware)

1. **Full vs Split credit views.** Full = each set row shows *this piece + the full
   set-bonus value* (never other pieces' stats); Split = bonus ÷ full piece count
   (4pc÷4). Full floats badly-itemised set pieces up the list — SME says **don't
   show Full as a standalone per-item ranking without the Split control adjacent**.
   Any layout tweak should keep them together. 2026-09-27: "never other pieces' stats" is superseded by ticket 502 — Full now also counts the other path pieces' own stats (ADR-0034, ticket 502 paragraph).
2. Broken-set-loss tooltip line ("breaks X 2pc: −N") works (seen in live malorne2
   captures) but the gate-visual fixture didn't exercise a breaking case.
3. No `a11y.json` in the last visual capture set — a11y counts unavailable there.

## Recent branch state

On `feat/tab-signoff-followups`: walkthrough tickets 453–466 + description rewrite
+ 467 (set-bonus net value) all landed, reviewed, **not yet merged to dev**. Stage
artifacts: `.scratch/stage-gate/set-bonus-net-value-467/` (plan, decision-log,
execution-report, live/). Next free ticket number: 468.
