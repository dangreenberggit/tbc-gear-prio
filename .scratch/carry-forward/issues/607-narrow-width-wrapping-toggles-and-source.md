Status: closed
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

## Closed (2026-11-03)

Fixed on branch `fix/narrow-width-607-603` by fork commit
`tbc-new-fork@2bedbf6b7`, pinned in `data/wowsims-fork.lock.json`. No
upstream file changed.

1. The two toggles and "Filter by source" are one wrapping group after the
   "View options" title (`ViewToggles.tsx`). At 375 px the title sits on
   its own line and both toggles share the next line.
2. The Source cell draws every boss drop itself, as it already did for
   overrun npc names, and joins the zone and its difficulty mark with a
   no-break space (`SourceCell.tsx`, `zoneWithMark` and `keepMarkWithZone`
   in `utils/format.ts`). A narrow cell now breaks "Tempest Keep (N)" as
   "Tempest" / "Keep (N)". Row heights still vary with the source text;
   the acceptance did not ask for equal heights.

The layout gate now checks both: check 20 (both toggles on one line) and
check 21 (no Source line holds only a mark), at all four widths. Against
the unfixed fork `13a980cf3` check 20 failed at 375 px on all six
fixtures, and check 21 failed on four of them; the other two
(`mock-dropped-list`, `mock-set-bonus`) had no mark that wrapped alone
(`.scratch/agent-reports/2026-11-03-layout-red-unfixed-fork.txt`,
gitignored).

Verified by:

```
PATH=/tmp/claude-1000/shim:$PATH PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-1000/pwb pnpm layout-gate:check
PATH=/tmp/claude-1000/shim:$PATH PLAYWRIGHT_BROWSERS_PATH=/tmp/claude-1000/pwb pnpm tab-review .scratch/agent-reports/2026-11-03-tab-review/manifest.json
```

Both run from the pair's main worktree. The layout gate passed with exit 0
on 2026-11-03. The captures `607-toggles-post-run-<w>-0.png`,
`607-source-offhand-post-run-<w>-0.png` and
`607-source-many-post-run-<w>-0.png` for w = 375, 653, 768 and 1280 are
in that gitignored folder. The `manifest.json` the second command reads
is gitignored too, so another checkout needs a new `pnpm tab-review`
manifest to rebuild them.
