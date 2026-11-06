Status: open
Type: task
Origin: .scratch/carry-forward/issues/801-axe-and-visual-review-on-every-spec-page.md (the 11-page `pnpm tab-review` run, 2026-11-06)
Serves: .scratch/carry-forward/issues/452-end-ret-feralcat-tunnel-vision-support-all-dps-specs.md
Blocks: none
Blocked by: none
Related: 452, 801, 473, 480

# Epic item names in the results table fail colour contrast

## What happens today

In the Upgrades tab's results table, an epic item's name is purple
`#a335ee` (`--color-quality-epic`, the fork's
`ui/styles/theme/colors.css:85` at `b603564ee`) on the page background
`#15171e` (`--color-background`, `colors.css:12`). axe measures that
pair at 3.66:1; WCAG AA asks 4.5:1 for 14 px normal text (axe rule
`color-contrast`, impact serious).

Ticket 801's `pnpm tab-review` run reported it on four item names of
the made-up `mock-many-rows` result on the feral page at 375 px
(`a11y.json` key `801-many-rows/375` in the run's output folder,
`.scratch/agent-reports/801-runs/tab-review/`, gitignored). The layout
gate's axe pass at 653 px did not report it on any of the 11 spec pages.

axe reports a contrast pair only where it can work out the background.
For about 117 nodes on that page it could not, and it marked them
"incomplete". So whether the violation shows depends on what is in view
when axe runs. A probe reproduced it only after it copied the review's
pane clip (a tall viewport, the pane scrolled to the centre, then the
viewport set back to 900 px). Without that step it did not reproduce at
375 or 653 px (`.scratch/agent-reports/801-runs/axe-contrast-probe*.txt`,
`axe-contrast-probe.mjs`). Hypothesis, untested: every epic name on
every spec page has the same contrast, because the colour pair does not
depend on the page.

The rare colour `#0070dd` (`colors.css:84`) on the same background
works out at 3.72:1 from the WCAG formula. axe did not report a rare
name in this run.

## The baseline entry

`data/wowsims-fork-a11y-baseline.json` now accepts this violation: rule
`color-contrast` on `[data-testid="upgrades-item-name"].text-quality-epic`,
`match: css`, `mayNotFire: true` (the gate's own capture does not show
it). A baseline entry matches on rule and selector, not on page or
width, so it accepts this violation on every spec page and at every
width, in both the layout gate and `pnpm tab-review`. Remove the entry
when a fix closes this ticket.

## What to decide

The item-quality colours are WoW's own and come from upstream's theme
file, so changing them is an edit to a wowsims file, which needs the
owner's OK of that exact edit. The choices include: a lighter epic and
rare shade only inside the tab; or wontfix, with the reason in the
baseline entry. A darker background alone cannot reach 4.5:1: on pure
black, epic `#a335ee` gives 4.30:1 and rare `#0070dd` gives 4.36:1.
The owner picks one of these.

Until then, the baseline entry accepts every contrast failure on an
epic item name, on every page, at every width and on any background.
Because it has `mayNotFire: true`, no stale-baseline warning will show
after a fix, so the entry stays until someone removes it.

## Done when

On a tab-review run that shows an epic and a rare item name in the
results table, axe lists both names under passes, not incomplete, and
the baseline entry is gone; or the owner rules wontfix and the baseline
entry gives that reason. No fixture is known to show a rare item name,
so the fixer may need to add one.
