# Handoff: restyle Upgrades results rows after the Gear-tab item-select table

**For a fresh session.** UI fix #6 in the owner's Upgrades-tab pass — the last
and biggest. Fixes #1–#5 are done and in the fork pin chain; see
`.scratch/handoffs/upgrades-tab-ui-backlog.md` for that context.

## Owner's intent (their words)

> line up styling of the [Upgrades results] table to potentially model the rows
> after the rows in the gear tab's item select table (and include the "add to
> favorites" and "add to batch sim" features that are in that table). this will
> be tough and will require some visual checks by subagents to look at both.

So: (1) restyle the Upgrades results rows to model the Gear tab's item-select
rows, and (2) add that table's "add to favorites" and "add to batch sim" per-row
affordances to the Upgrades rows. Owner expects real visual comparison of both
tables, not a source-only guess.

## Pointers

- Upgrades rows: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
  (`resultRow` ~:2934, `itemCell` ~:3280); styles in the sibling
  `ui/scss/.../_upgrades_tab.scss`.
- Gear-tab item-select table: elsewhere under `ui/core/components/` — find it.
- Likely data snag to check early: the Upgrades row is a `RankedItem` (name +
  itemId), maybe not a full `Item`; favoriting/batching may need more than the row
  carries. Confirm before assuming it's just a restyle.

## Process (same as fixes #1–#5)

- Fork clone only. Fix = fork commit + re-pin `data/wowsims-fork.lock.json` +
  `pnpm sim-implemented-effects:generate` + `pnpm verify`.
- Node 22: prepend `C:\Users\dgree\AppData\Roaming\fnm\node-versions\v22.17.1\installation`
  to PATH, use `corepack pnpm`; git standalone + `commit -F` (fnm footgun).
- Live-verify on **:5173** (vite HMR), NOT the :3333 harness (stale `dist/`).
  Rows render on the settled table after a completed run (~9 min feralcat WASM).
  Verify the render yourself before re-pinning.
- Branch `feat/tab-signoff-followups`; fork pin `aa9657e5`, main pin `74bb9910`;
  held for the owner's merge ask. Next free ticket: **472**.
- Owner called this tough and it has a real design fork (how far to converge) plus
  the data-plumbing risk — consider the `stage-gate` skill over a single worker.
