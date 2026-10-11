Status: open
Serves: .scratch/plans/upgrades-tab-finish-line.md, Chunk 3b
Type: task
Origin: Chunk 3b step 7 regression check (commit c5741e2c)
Blocks: none
Blocked by: none
Related: 328 (closed; view toggles), 310 (closed; table layout)

# Line wrapping in the view toggles and the Source column

Two wrapping issues seen in the Chunk 3b capture set (main checkout,
gitignored, `.scratch/tab-scope-refresh/review/`; that folder's
`manifest.json` is gitignored too, so a re-check from another checkout
needs a new `pnpm tab-review` manifest), fork `316326a95`.
Both are layout polish; nothing is hidden or overlapped.

## 1. At 375 px "BiS only" wraps under the "View options" legend

`328-toggles-post-run-375-0.png`: "View options" and "Set potential" share
the first line; "BiS only" starts a second line at the left edge, under
the legend, so it reads as a separate group. The fieldset is a wrapping
flex row with the legend floated left
(`ui/features/upgrades/components/ViewToggles/ViewToggles.tsx:41-42`).

## 2. In the Source column "(N)" wraps to its own line, and row heights vary

`310-post-run-768-1.png` and `310-post-run-1280-1.png`, row 16 (Twinblade
of the Phoenix): the Source cell reads "Tempest Keep" / "(N)" / "Kael'thas
Sunstrider" on three lines, with "(N)" alone on the second. On other rows
"(N)" stays on the zone's line ("Black Temple (N)"), so the same marker
wraps differently by zone-name length. Rows are one, two or three lines
tall depending on the source text, so the table's row heights vary
(rows 4 and 9 are one line; rows 1, 3, 8, 10, 11 and 16 are three).

The Source cell renders upstream's `ItemSource` component
(`components/ResultsTable/SourceCell.tsx:1`, from `@features/gear`), which
is an upstream wowsims file; a fix should change the tab's own cell or
column width, not that component, unless the owner approves the exact
upstream edit.

## What would close this

- At 375 px both toggles sit on one line after the legend, or the legend
  sits on its own line above both toggles.
- At 653, 768 and 1280 px "(N)" never sits alone on a line in the Source
  column.
- A `pnpm tab-review` capture of each, at the four widths.
