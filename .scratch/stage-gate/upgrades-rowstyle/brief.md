# Brief: Upgrades results rows restyled after the Gear-tab item list (ticket 472)

Ticket: `.scratch/carry-forward/issues/472-restyle-rows-after-gear-item-list.md`
(read it first; it quotes the owner's intent verbatim and records the decisions
below). Origin handoff: `.scratch/handoffs/upgrades-tab-rowstyle-HANDOFF.md`.
Prior fixes #1–#5 and their verify notes:
`.scratch/handoffs/upgrades-tab-ui-backlog.md`.

## Goal

Make the Upgrades tab's settled results rows look like the Gear tab's
item-select rows, and give them that table's two per-row affordances:
add/remove favorite and add/remove from Batch sim.

Owner decision, 2026-09-21: **Option A.** Keep the results `<table>`; converge
on look and affordances; do not replace the rows with the Gear list's `<li>`
markup.

## Facts established (read-only investigation, 2026-09-21)

- Gear-tab row: `vendor/tbc-new-fork/ui/core/components/gear_picker/item_list.tsx:469-507`
  (flex `<li class="selector-modal-list-item">`: ilvl, 3rem icon + 1.125rem
  name, source, EP, favorite star, batch "compare" button). Styles:
  `ui/scss/core/components/gear_picker/_item_list.scss` (row padding 0.5rem,
  gap `--spacer-3`, zebra `--bs-table-row-*-bg`, hover `--bs-gray-800`,
  `.active` icon outline). Its line-78 TODO says these classes should move to
  a shared file.
- Favorite toggle: private closure `item_list.tsx:510-563`; needs only an
  item id; state = `sim.getFilters().favoriteItems` via `setFilters`; renders
  `text-brand` + `fas`/`far` star; tippy "Add/Remove from favorites".
- Batch toggle: private closure `item_list.tsx:569-597`; needs
  `ItemSpec.create({ id })` and `simUI.bt` (`BulkTab.hasItem/addItem/removeItem`,
  `bulk_tab.tsx:300-411`); re-subscribes to `bt.itemsChangedEmitter`; hidden
  when `bt` is absent.
- Upgrades row: `resultRow` `upgrades_tab.tsx:2958-3016` (`<tr>`: Rank, Item,
  Slot, DPS with set-bonus tippy, Source); `itemCell` `:3292-3346` already
  resolves `Database.getSync().getItemById(row.itemId)`. `RankedItem`
  (`upgrades/engine/rank.ts:237-275`) carries `itemId` + `name`. Styles:
  `ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (1.5rem
  icon, no hover rule, `.upgrades-row-owned` muted text, separate provisional
  mid-run table with fixed layout `:1027-1110`).
- `getSourceInfo` is already exported from `item_list.tsx` for the Upgrades
  tab's use — precedent for sharing.

## Constraints

- Fork clone only (`vendor/tbc-new-fork`, branch `feat/upgrades-tab`, tip
  `aa9657e5a`; lock `data/wowsims-fork.lock.json` pins `aa9657e5af…`). Main
  repo tree stays clean except stage artifacts until the re-pin.
- **No edits under `ui/core/components/individual_sim_ui/upgrades/engine/`**
  (PROVENANCE cycle). `RankedItem` already has what the affordances need.
- Extract the favorite and batch toggles (and `isItemFavorited`) from
  `item_list.tsx` into one shared module that both tables call. The Gear list
  must keep behaving identically (same classes, same tippy copy, same
  analytics `trackEvent`, same `itemsChangedEmitter` re-subscription).
- Row classes that both tables use move to a shared SCSS partial (honouring
  the item_list.scss TODO) rather than being duplicated.
- **Keep rank order.** The Gear list sorts favorites first; the Upgrades
  table is a ranking and must not re-sort on favorite.
- Batch button hidden when `simUI.bt` is absent, as in the Gear list.
- New icon-only buttons carry `aria-label`s; the a11y ratchet
  (`TBC_A11Y_BASELINE`, run by `pnpm tab-review`) must not regress.
- Preserve fixes #1–#5: item-name wrap during simming (468), table flush
  with the controls and header/body alignment (469), View-options heading
  (470), set-bonus hover/tooltip (471). Preserve the mobile (`< md`) rules and
  the provisional mid-run table's behaviour.
- The layout gate (`scripts/check_layout_gate.py`, assertions 6–8 on row
  legibility) is not in `pnpm verify` but runs on merge; the plan predicts
  its outcome and the executor runs it.
- Verification: rows exist only on the settled table after a completed run.
  Drive **:5173** (vite HMR = live tree), never :3333 (stale `dist/`). One
  feralcat WASM run ≈ 9 min; budget one run per unit, not per edit.
- Node 22 PATH pin and `corepack pnpm`; git standalone with `commit -F`
  (`docs/agents/known-traps.md`).

## Open questions (each needs a candidate, a pre-stated win condition, and a measurement)

1. **Which item-list classes move to the shared SCSS partial**, and does the
   Upgrades row adopt them by class name or by mixin? Candidate must state the
   resulting computed values (icon size, name font-size, row padding, hover
   background) that both tables must share, measured with `pnpm tab-review`
   `style:` facts on the Upgrades row and a browser-measured value on a Gear
   list row.
2. **Does the provisional mid-run table also get the two new columns**, or
   only the settled table? State what a mid-run row shows and why; measure by
   a `pre-run`/mid-run capture or state why the capture script cannot.
3. **How is the Gear-tab item list photographed for the side-by-side.** The
   capture script (`vendor/tbc-new-fork/test-review.mjs`) always captures
   `#upgrades-tab` and supports `click` interactions plus extra `capture`
   selectors on the same page. Candidate A: manifest clicks a gear slot and
   captures `.selector-modal-list`. Candidate B: executor drives :5173 in the
   built-in browser and screenshots both tables at the same width. Win
   condition: a PNG of each table at 1280 wide exists and `gate-visual` cites
   both by filename.

## What exists when this is done

- Settled Upgrades rows render with the Gear list's visual idioms and two new
  per-row controls (favorite, batch), driven by shared toggle code and shared
  row styles; the Gear list is unchanged in behaviour.
- Toggling favorite on an Upgrades row is reflected on the Gear list for the
  same item, and vice versa; toggling batch on an Upgrades row adds the item
  to the Batch tab's list (and the Batch tab's own removal updates the row).
- A `gate-visual` handoff with a pass verdict citing a side-by-side of both
  tables at 1280 and a mobile width, plus a11y counts not above baseline.
- Layout gate green (or its expected change documented and accepted at Gate C).
- One or more fork commits on `feat/upgrades-tab`; main repo re-pinned
  (`data/wowsims-fork.lock.json`, `pnpm sim-implemented-effects:generate`,
  `pnpm verify` green) in a commit citing ticket 472. Branch
  `feat/tab-signoff-followups` stays held for the owner's merge ask.
