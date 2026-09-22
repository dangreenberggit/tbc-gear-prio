Status: closed
Type: task
Origin: owner walkthrough, Upgrades-tab UI pass, 2026-09-20
Blocks: none
Blocked by: none
Related: 468, 469, 470, 471, 473, 474, 475

# Restyle Upgrades results rows after the Gear tab's item-select list

Owner's intent, verbatim:

> line up styling of the [Upgrades results] table to potentially model the
> rows after the rows in the gear tab's item select table (and include the
> "add to favorites" and "add to batch sim" features that are in that table).
> this will be tough and will require some visual checks by subagents to look
> at both.

## Decisions made with the owner, 2026-09-21

- **Option A**: keep the Upgrades results `<table>` element; adopt the Gear
  tab item list's visual idioms on top of it — 3rem icon, larger name, zebra
  striping, hover background, spacing.
- Add favorite-star and add-to-batch-sim columns to the Upgrades rows.
- Extract the Gear list's private favorite/batch toggle logic
  (`ui/core/components/gear_picker/item_list.tsx:510-597`) into a shared
  module used by both tables, rather than duplicating it.
- Keep rank order as-is — do NOT sort favorites first.
- No edits under `upgrades/engine/`. `RankedItem` already carries `itemId`;
  favorites need only an id via `sim.getFilters()`, batch needs
  `ItemSpec.create({id})` plus `simUI.bt`.
- New icon-only buttons need aria-labels.
- Verify with a real side-by-side render of both tables, not a source-only
  comparison.

To be executed via the `stage-gate` skill, slug `upgrades-rowstyle`.

## What would close this

Both tables render from shared toggle code and shared row styles; the owner
accepts a side-by-side render; `pnpm verify` is green; the fork is re-pinned.

## Built 2026-09-21, awaiting two owner decisions — NOT closed

Executed via `stage-gate` slug `upgrades-rowstyle` (plan rev 2, reviewer verdict
proceed). Fork `feat/upgrades-tab` commits `218736090`, `4f3488482`,
`7d1055784`, `88773696a`, `15665779c`, `162a907df`; main repo re-pinned to
`162a907df`; `pnpm verify` rc=0. `gate-visual` handoff:
`.scratch/stage-gate/upgrades-rowstyle/gate-visual-472.md`, verdict **pass** on
all three acceptance sentences.

Every item under "What would close this" except the owner's acceptance is met:
both tables render from `gear_picker/item_toggles.tsx` and
`scss/core/components/_item_row.scss`, rank order is untouched, nothing under
`upgrades/engine/` changed, both new buttons carry an `aria-label`, and the
comparison is a real captured render of both tables rather than a source read.

Measured at 1280, Upgrades row against Gear row by the same script: icon 42px =
42px, name 15.75px = 15.75px, odd row rgb(34,35,40) = rgb(34,35,40), hovered row
rgb(52,58,64) = rgb(52,58,64). The Gear list's own capture is byte-identical
before and after (sha256 `ec418f7112337d3f`, 102187 bytes).

### Decision 1 — the new contrast failures

Giving the rows a background makes axe measure the epic-quality item-name colour
(`#a335ee`) against it. 6 serious `color-contrast` nodes per width, 24 across the
four widths the layout gate measures, at ratios 2.35-3.59. The pre-change row was
transparent, so axe had no pair to measure and reported one node
(`.btn-outline-danger`, the single accepted baseline entry).

This is the Gear list's own rendering reproduced faithfully: that list reports
the identical colour on the identical backgrounds at the identical ratios (13
`color-contrast` nodes, plus 31 critical `image-alt` nodes on its icons that this
change did not import). `gate-visual` judged the render acceptable and advisory.

The layout gate blocks on it (`0 layout failures, 24 a11y failures`). Options:
baseline it as inherited theme debt the way `.btn-outline-danger` is; file a
follow-up ticket; or give up the 1.125rem name size. Note axe names these per
item (`span[title="Choker of Endless Nightmares"]`), so there is no stable
`(ruleId, selector)` pair to add to the baseline as it stands.
`data/wowsims-fork-a11y-baseline.json` is untouched.

### Decision 2 — the owner's side-by-side acceptance

The captures are at `.scratch/stage-gate/upgrades-rowstyle/captures/`:
`after-gear-final/472-gear-pre-run-1280-0.png` (the Gear reference) against
`after-upgrades/472-post-run-1280-1.png` (the restyled table), plus
`before-upgrades/` for the pre-change state and `after-upgrades/`'s 375 pair.

### Not measured

`pnpm desktop-gate:check` did not run. `make wowsimtbc` needs a POSIX shell (it
fails under PowerShell); under Git Bash the build succeeded, but the gate refused
because port 3333 was held by a stray `wowsimtbc.exe` (pid 17212, started 09:20,
predating this work) and stopping that process was denied by the permission
system. Check (h)'s golden readback is therefore unmeasured. It is predicted
unchanged — the readback parses `tds[0..4]` and the two new cells are 5 and 6,
which is why they are appended rather than inserted — but that is a prediction.
`data/desktop-gate/golden-ret-p5-cap40.json` is untouched.

## Comments

2026-09-22 — Owner: closes when the change is done INCLUDING tied tickets
473, 474, 475. Desktop gate passed 2026-09-22 (all (a)-(h), golden
unchanged). Stage artifacts: .scratch/stage-gate/upgrades-rowstyle/.

2026-09-22: CLOSED. Tied tickets 473/474/475 closed; locale schema follow-up
re-pinned (fork 7965a7d8, main 3b9979a2). Live verification on :5173 (vite
live tree + Go backend on :3333; the feralcat run took 165 s, 401
candidates, 338 settled rows):
- View options row reads "Set potential / BiS only / Phase" — no "Set credit",
  "Full set" or "Split share" text anywhere on the page (475).
- Tagged row (Tsunami Talisman, "BiS 6% BiS 9% (Owned)"): icon 382-424 px,
  name left 431 (right of the icon), name bottom 755, tags top 758 (below the
  name) (474). Slot font-size 12.25 px, name 15.75 px at the 1280 emulation.
- Header: Rank, Item, Slot, DPS, Source, Favorite, Batch sim; every settled
  row has a star and a visible batch button (2 + 336 rows) (472).
- Set-bonus tooltip first line: "breaks Thunderheart Harness 4pc: -76.9"; no
  "This piece alone" anywhere (475). Inline hint "hover for set detail" intact.
- Favorite cross-over: star on Everbloom Idol lit from the Upgrades row, still
  lit after the stale re-render, lit in the Gear tab's Idol picker (sorted
  first), cleared afterwards (472).
- Simulate disabled after the run until a setting changes: by design (465).
Two observations for the owner, not defects of the tickets: (a) at the 1280
emulation the results host is ~606 px wide, so the seven-column table
(642/753 px) scrolls horizontally and long item names wrap to three lines in
the shortlist; (b) favoriting an item marks the ranking stale ("settings
changed since this ranking") because favorites live in sim filters —
pre-existing Gear-modal behaviour, listed out of scope in the plan.
