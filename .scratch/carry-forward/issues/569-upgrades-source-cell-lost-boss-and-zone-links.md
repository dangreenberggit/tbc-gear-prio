Status: open
Type: task
Origin: docs/reviews/feat-upstream-react-port.md (pre-merge review round 1, SP1)
Blocks: none
Blocked by: none
Related: 559, 560

# Upgrades tab: the Source cell lost the old tab's linked boss and zone

## What happens today

On the React tab (fork `feat/upgrades-tab-react` `43e3963d`), the results table's Source cell shows only a zone or a plain kind label: `ui/features/upgrades/components/ResultsTable/ResultRow.tsx:54` renders `rowSourceLabel(row)` (`utils/format.ts:71`).

The old tab rendered the site's `getSourceInfo`, which gives linked zone and boss text, and fell back to a plain label only when that rendered nothing (`git -C vendor/tbc-new-fork show cb561067:ui/core/components/individual_sim_ui/upgrades_tab.tsx`, lines 3771-3781). The P3 `desktop-gate.md` (gitignored, owner's checkout, `.scratch/stage-gate/558-p3-settings-gates/`) records that the old cell "also showed "(N)" and the boss name".

Ticket 559's spec line said "source cell (`item.sources`, since `getSourceInfo` is gone)" (559:32). Upstream has a successor: `ItemSource` at `42c75dc9:ui/features/gear/components/SelectorModal/ItemSource.tsx:27`, used by `ItemListRow.tsx:89`. No stage decision log records a ruling on dropping the link (spec axis grep of the P2 and P3 plans and decision logs for "boss", "source cell" and "second line").

## What fixing it costs

- Render the cell through `ItemSource` (or the same data it reads). Whether `ui/features/upgrades` may import a `features/gear` component under `.oxlintrc.json`'s layer rules is a hypothesis, untested; if not, the shared piece moves through a `ui/sim` or `ui-kit` facade.
- The desktop golden keys rows on `(item, slot, source)` (`scripts/check_desktop_tab.py:293-307`), so `data/desktop-gate/golden-ret-p4-cap40.json` must be regenerated with `--update-golden` and the hand-run desktop gate re-run (`docs/agents/upstream-catch-up.md`).
- The layout gate re-measures the row; the tab fixtures' recorded rows may need the source shape the cell reads.

## Done when

The Source cell shows the same linked source text the old tab showed for a raid drop (boss and zone), falls back to the plain label otherwise, the layout gate and desktop gate pass with the regenerated golden, and the fork is re-pinned with `pnpm verify` rc=0.
