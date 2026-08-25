# Handoff: Upgrades tab UI fit-and-finish

Mission: make the Upgrades tab's UI consistent with the rest of the sim site
and usable on mobile, in five serial work packages plus one environment
package. Findings below were measured on a served page 2026-08-23/24; re-run
the measurement commands rather than trusting the numbers if the fork tip has
moved.

## Ground rules

- All UI code lives in the **gitignored fork checkout** `vendor/tbc-new-fork`
  (main checkout only). Commit in the fork, then re-pin in this repo — same
  workflow as repo commit `4c819e5` ("Re-pin the fork for the DPS unit fix").
  `pnpm verify` does not gate fork edits; served-page measurement is the
  coverage (the fork has no test harness — plan C6).
- **Serial, not fan-out**: nearly every package edits
  `ui/core/components/individual_sim_ui/upgrades_tab.tsx` and
  `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`, so
  parallel-phase's disjointness test fails. One fork branch, one package at a
  time, a fork commit per package.
- Lanes: Sonnet-class implements; Opus at effort medium reviews each package
  before its fork commit. WP2 goes through the `stage-gate` skill (see WP2).
- After WP5: re-pin, then run `pre-merge-review` on the repo branch and
  **stop — do not merge**. The merge ask is the user's.

## Dev environment (needed before any verification)

The vite dev server (`.claude/launch.json` entry `wowsims-fork`, port 5173)
serves only the frontend. In dev mode sim calls are HTTP-proxied to a Go
backend hardcoded at `localhost:3333` (`ui/worker/local_worker.ts`); with no
backend, every Simulate/Run fails with "Failed to fetch". Start the backend:

    cd vendor/tbc-new-fork
    mkdir -p binary_dist/tbc && touch binary_dist/tbc/embedded && cp sim/web/dist.go.tmpl binary_dist/dist.go
    go build -o wowsimtbc.exe ./sim/web
    ./wowsimtbc.exe --usefs=true --launch=false --host=":3333"

Verified working with Go 1.25.4 (matches the fork's `go.mod`). `binary_dist/`
is gitignored by the fork. Verify the backend with a Gear-tab Simulate before
blaming your own change for a fetch error.

Verification method for every package: drive the served page at
http://localhost:5173/tbc/paladin/retribution/ (Upgrades renders only for
ret and feral cat) with the browser tools — read_page, javascript_tool
(getBoundingClientRect / scrollWidth vs clientWidth), console/network reads —
at desktop 1280x800 **and** mobile 375x812 (reload after resizing). A package
is done when its listed criteria measure true on both viewports with Run
exercised end-to-end.

## WP0 — launch.json backend entry

Add a `wowsims-backend` entry to `.claude/launch.json` (repo file, not fork)
that runs the build-and-serve above on port 3333, so later packages start it
by name. Done when: `preview_start {name: "wowsims-backend"}` plus the
existing `wowsims-fork` entry yields a working Gear-tab Simulate.

## WP1 — mobile unbreak (SCSS/layout only, no behavior)

Measured defects, all at 375px unless noted:

1. `.upgrades-run-row` is `flex-wrap: nowrap` with ~10 controls: 618px of
   content in 319px, forcing horizontal scroll of the whole `.sim-ui` body.
   Make it wrap/stack.
2. `.upgrades-iterations-input` / `.upgrades-candidates-input` flex-shrink to
   16–18px wide (desktop too): "3000" is clipped and the "all N eligible"
   placeholder can't render. Give them explicit widths.
3. Tab strip (`.sim-header-container`, `overflow-x: scroll`) hides Upgrades
   off-screen (tablist 597px in a 361px parent) with no scroll cue. Add a
   fade-edge or equivalent affordance; benefits all tabs.
4. Touch targets under 40px: checkboxes 28px, inputs 27px tall. Meet a 40px
   minimum on mobile.
5. "Import gear from log" wraps to 3 lines beside single-line Run/Stop;
   shorten or truncate the label at narrow widths.

Done when: no element forces `.sim-ui` horizontal scroll at 375px, both
number inputs render their placeholder/value untruncated, the tab strip
signals scrollability, and interactive controls measure ≥40px on mobile.

## WP2 — toolbar restructure (stage-gated)

Run this package through the `stage-gate` skill: it moves DOM that the tab's
`render()` methods target, and a wrong structure makes every later package
fight the layout.

Scope: split the single run row into run inputs (Run/Stop/Import, Iterations,
Candidates, BiS-prune, phase selector) vs view options (set-potential,
BiS-only, content filter) — already semantically distinct in the code (run
inputs vs view options, see the class doc comments in `upgrades_tab.tsx`);
move status/stale/stopped rendering out of the control row into one status
area with one idiom (today: `alert alert-warning` banners inline for
stale/stopped, bare spans for done/idle); label the phase selector the way
the Gear tab presents phase. Preserve the existing control semantics —
`ToggleControl` visibility gating, `pruneEffective()`, view-option re-render
without re-run.

Done when: the stage-gate executor's plan criteria hold on the served page,
and every RunState (idle, running, done, done+stale, stopped, error,
unsupported-spec) renders in the new structure — exercise Run and Stop for
real.

## WP3 — item-cell fidelity

The results tables render items as plain text; the rest of the site renders
icon + quality-colored name + wowhead link. Reuse, do not reinvent:
`setItemQualityCssClass` (`ui/core/css_utils.ts`), `ActionId.fromItemId` /
`makeItemUrl`, and the source-anchor rendering in
`ui/core/components/gear_picker/item_list.tsx` (~line 658). Also: render the
Source column as links the way item_list does, and replace the inline
"★ BiS"/"Alt" text with badges consistent with the site's badge styling (the
Batch tab's "New" pill is the precedent).

Done when: every row in the shopping list, slot panes, below-cutoff group and
mid-run table shows icon, quality color and wowhead tooltip link; Source
cells link where item_list would link.

## WP4 — ticketed features (one mini-loop each, close each ticket)

- `.scratch/carry-forward/issues/279-rank-numbers-disagree-with-row-order-in-ties.md`
- `.scratch/carry-forward/issues/280-upgrades-tab-sortable-column-headers.md`
- `.scratch/carry-forward/issues/281-upgrades-tab-progress-bar-during-run.md`
- `.scratch/carry-forward/issues/282-upgrades-tab-content-filter-option-grouping.md`

Each ticket carries its own "Done when". Update ticket status on close.

## WP5 — sweep (minor)

- Disabled Stop button keeps `cursor: pointer`; use the disabled cursor.
- View controls appear/disappear (`d-none`) with no affordance they exist;
  decide with the reviewer whether an affordance is worth it or wontfix, and
  record the call.

## Provenance of findings

Desktop/mobile measurements: Sonnet scan, this session, on the served dev
page. Source claims: `upgrades_tab.tsx` / `_upgrades_tab.scss` at fork tip as
of repo pin `4c819e5`. Backend diagnosis: verified live (Gear Simulate and
Upgrades Run both green after starting the backend). Prior review context:
`docs/reviews/feat-upgrades-ui-pass.md`.
