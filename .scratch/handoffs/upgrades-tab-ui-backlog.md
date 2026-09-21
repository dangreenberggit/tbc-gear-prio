# Upgrades-tab UI fix backlog

Owner is running a sequence of UI fixes on the Upgrades tab, one at a time, in
priority order. Overseer (this session) delegates each to a sonnet/haiku worker
in the fork clone `vendor/tbc-new-fork`, verifies visually, then re-pins.

Setup facts (from `upgrades-tab-ui-HANDOFF.md`):
- Tab code: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
- Styles: `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`
- Tooltip / set-bonus display: `setBonusPresentation` (~:3001+)
- Fix = fork commit + re-pin `data/wowsims-fork.lock.json` + `pnpm verify`.
- Width/layout gate is NOT in `pnpm verify` — verify width live on `:3333`.

## Queue

### 1. Cramped item names during simming  — DONE (re-pinned)
Provisional table (`landedRowsTable`) forced `table-layout: fixed` + a `<colgroup>`
giving Item only 30%; name starved and broke mid-word. Fix: item cell now wraps —
name on its own full-width first line (single line + ellipsis + title), badges /
"(Owned)" wrap below at full width, Source opts out of `overflow-wrap: anywhere`
and wraps at spaces; colgroup rebalanced 9/38/15/18/20. Fork commit `55333be88`,
lock re-pinned, `pnpm sim-implemented-effects:generate` + `pnpm verify` green
(rc=0, 1350 gates). Owner accepted the render. Ticket 468.

### 2. Table starts too far right; headers not aligned — DONE (re-pinned)
Left offset: table wrapper carried shared `.p-gap` (padding-left 1.5rem) that the
controls above lack → cancelled left padding on `.upgrades-shopping-list` +
`.upgrades-slot-pane` only (owner: table flush with controls). Headers: desktop
sort-button padding didn't match body-cell padding, DPS header lacked right-align;
fixes existed only in the mobile block → added desktop counterparts. Verified
flush + aligned numerically (getBoundingClientRect) and visually, both states,
mobile unregressed. Fork `07099cb1e`, main pin `8acc6b96`, verify green. Ticket 469.

### 3. "View options" checkbox grouping unclear — DONE (re-pinned)
Root cause: heading was a flex sibling with a `--spacer-2` gap (NARROWER than the
`--spacer-3` control-to-control gap), and never got bold weight (the
`.content-block-header` idiom puts bold on a nested `.content-block-title` the
markup omits). Owner chose "keep inline, add space". Fix: `.upgrades-view-controls-title`
gets `font-weight: bold` + `padding-right: --spacer-3` + `border-right` divider,
divider dropped below md (767px) where the row wraps. Verified: gap flip (heading
22px > control 14px), bold 700, divider suppressed on wrap (worker live numbers +
isolated render). Fork `204193631`, main pin `29f3add5`, verify green. Ticket 470.
Residual polish on ticket 312's landed "View options" group (312 stays closed).

### 4 + 5. Set-bonus hover always-on + tooltip trim — DONE (combined, re-pinned)
Combined per owner (both edit `setBonusPresentation`). #4: hover was gated on the
Set-potential toggle; a prospective-only row got no hover when off, though engine
computes setContext unconditionally → take future/commit terms from ctx regardless
of toggle (toggle still ranking-only, NO engine edit / no PROVENANCE). #5 trims all
applied: dropped "Set credit" mode line + full/split totals + "(ranked)" (credit
data kept for ranking, commented not-shown); "completing breaks…"→"breaks…"; dropped
"DPS" from tooltip figures only (tooltip-local `tipDelta`, results column untouched);
"N more (share…)"→"{pc} ({have}/{pc})" (have=threshold−piecesNeeded, verified vs
rank.ts:2255); "hover for detail"→"hover for set detail". VERIFIED LIVE on :5173 via
a real WASM run: 30 hover hints with toggle OFF incl. prospective rows, tooltip text
matches every trim (proof: scratchpad/out4/live-proof-toggle-off.json). Fork
`aa9657e5`, main pin `74bb9910`, verify green. Ticket 471.

VERIFY NOTE for future fixes: the :3333 Go backend serves a STALE pre-built `dist/`,
so its live-harness scrape shows OLD code — DON'T trust it for uncommitted changes.
Drive :5173 (vite HMR = live working tree) instead; click `.upgrades-run-button`,
wait for the WASM run (~9 min for feralcat 401 candidates), scrape `.upgrades-set-bonus`
+ tippy `_tippy.props.content`. `make dist`/PowerShell-make no-op or fail (Unix Makefile).

### 6. Restyle rows after the Gear tab's item-select table  (biggest; last)
Line up the results-table row styling to model the Gear tab's item-select table
rows, AND add that table's "add to favorites" and "add to batch sim" affordances
to the Upgrades results rows. Requires subagents to visually compare both tables.
Expect this to be the hard one.

### 6. Restyle rows after the Gear tab's item-select table — BUILT, NOT CLOSED
Built via `stage-gate` slug `upgrades-rowstyle` (plan rev 2, reviewer verdict
proceed). Fork `162a907df`, main pin below, `pnpm verify` rc=0.

What landed. The favorite star and add-to-Batch-Sim button moved out of
`item_list.tsx`'s two private closures into a shared
`gear_picker/item_toggles.tsx` both tables build from — class names, tippy copy
and the single `trackEvent` preserved, plus an `aria-label` on each button. The
row look (3rem icon, 1.125rem name, zebra, hover) moved into a shared
`scss/core/components/_item_row.scss` both tables include, retiring that file's
line-78 TODO. Each results row gained two trailing action cells, appended after
Source one `<td>` each because `upgrades/tools/run-tab-cdp.mjs` reads a row
positionally (`tds[0..4]`). No engine edit, no schema change, rank order
untouched.

Measured at 1280, Upgrades row vs Gear row, same script: icon 42px = 42px, name
15.75px = 15.75px, odd row rgb(34,35,40) = rgb(34,35,40), hovered row
rgb(52,58,64) = rgb(52,58,64). The Gear list's own capture is byte-identical
before and after (sha256 `ec418f7112337d3f`). `gate-visual` verdict: **pass** on
all three acceptance sentences (round 2), handoff at
`.scratch/stage-gate/upgrades-rowstyle/gate-visual-472.md`.

TWO CLAIMS IN THE PLAN MEASURED FALSE, both fixed in place:
- The rows were to drive `--bs-table-bg` so Bootstrap's cell paint would pick
  the colour up. This app does not import `bootstrap/scss/tables` at all
  (`ui/scss/index.scss` enumerates the partials it takes), so `table table-sm`
  are inert names, a cell's `box-shadow` reads `none`, and nothing paints over
  the row. The mixin uses plain `background`.
- The layout gate was predicted green. The two new columns push the settled
  table past its panel at desktop too (624px of table in a 613px host at 1280),
  and assertion 7b requires a table wider than `.upgrades-results` to scroll
  rather than clip. `overflow-x: auto` moved out of the `<md` block to every
  width. Layout gate now: 49 passed, **0 layout failures**.

WHY THIS IS NOT CLOSED — two owner decisions:
1. **New a11y failures block the layout gate.** Giving the rows a background
   makes axe measure the epic-quality name colour (`#a335ee`) against it: 6
   serious `color-contrast` nodes per width at 2.35-3.59, 24 in total, where the
   pre-change transparent row offered no pair. The Gear list being copied reports
   the identical failures at the identical ratios (13 nodes, plus 31 critical
   `image-alt` on its icons), so this is inherited theme debt of the kind
   `data/wowsims-fork-a11y-baseline.json` already records as `wontfix: inherited
   site theme`. `gate-visual` judged the render acceptable and advisory. The
   choice — baseline the debt, file a ticket, or give up the larger name — is the
   owner's, and axe names these per item (`span[title="Choker of Endless
   Nightmares"]`) so there is no stable `(ruleId, selector)` to baseline anyway.
   `data/wowsims-fork-a11y-baseline.json` is untouched.
2. **The ticket's own closing condition is an owner side-by-side acceptance.**

DESKTOP GATE NOT RUN — blocked, not passed. `make wowsimtbc` needs a POSIX
shell: it fails under PowerShell ("build was unexpected at this time") and
succeeds under Git Bash without `cd` (`python scripts/check_desktop_tab.py`).
The build then succeeded but the gate refused because port 3333 was held by a
stray `wowsimtbc.exe` (pid 17212, started 09:20, predating this work), and
`Stop-Process -Id 17212 -Force` was denied by the permission system. So check
(h)'s golden readback is UNMEASURED here. It is predicted unchanged because the
readback reads `tds[0..4]` and the new cells are 5 and 6, but that is a
prediction, not a result. `data/desktop-gate/golden-ret-p5-cap40.json` is
untouched.

VERIFY NOTE, adding to the one above: `pnpm tab-review` cannot photograph the
Gear list at 375 (the gear tab's nav button measures 0x0 at that width, so the
coordinate click never activates it) and cannot hover a row at a re-emulated
width (the pointer coordinate is computed before the width changes). Measure a
narrow-width overflow arithmetically instead — `rect:` on the table and on its
scroll host plus `style:...:overflow-x` — rather than asking a clipped PNG to
show it.
