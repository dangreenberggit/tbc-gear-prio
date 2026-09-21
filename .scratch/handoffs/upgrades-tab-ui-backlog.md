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
