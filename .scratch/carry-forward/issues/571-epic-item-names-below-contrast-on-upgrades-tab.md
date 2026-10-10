Status: open
Type: task
Origin: visual review of ticket 560, final round (stage 558-p3-settings-gates, round B2b), finding F1
Blocks: none
Blocked by: none
Related: 560, 568

# Epic item names are below 4.5:1 contrast on the Upgrades tab

## What happens today

The Upgrades tab shows each epic item name in the site's shared epic quality colour, `#a335ee` (`--color-quality-epic`, `ui/styles/theme/colors.css:85` in the fork, applied as the class `text-quality-epic` through `ui/ui-kit/utils/colors.ts:10`). Both files are upstream-owned: `git -C vendor/tbc-new-fork cat-file -e 42c75dc9:ui/styles/theme/colors.css` succeeds, and the fork has not changed either file since `42c75dc9`.

The final `gate-visual` run for ticket 560, at fork `d52c8e91e`, recorded these results (handoff `C:/Users/dgree/Code/lulz/tbc-gear-prio/.scratch/stage-gate/558-p3-settings-gates/visual-final.md`, gitignored, owner's checkout, section "The axe colour-contrast result"):

- Axe reports 7 `color-contrast` failures, impact serious, in the capture `560-group-columns/375` only (`a11y.json` in `review-560-final/`). All 7 are epic item names (`[data-testid="upgrades-item-name"].text-quality-epic`), ranks 12 to 18 of the shortlist.
- The reviewer sampled the text and background pixels in three clips (`560-group-columns-post-run-375-0.png`, `560-group-columns-post-run-768-0.png`, `560-view-post-run-375-4.png`). Every epic item name measured about 3.3 to 3.9 : 1, in the rows axe flagged, the rows it did not flag, and the states where axe reported no failure. WCAG AA asks for 4.5 : 1 for normal-size text.
- The same colour is in the earlier captures at fork `a4367497` (`review-560/`), where axe reported no failure. `#a335ee` on pure black is about 4.3 : 1, so it is below 4.5 : 1 on any dark background.

So the low contrast comes from the site's shared colour, not from the tab's layout or from ticket 560's work.

Why axe flags only that one capture: hypothesis, untested. Axe may return "incomplete" instead of a failure where it cannot settle the background colour, for example over the page's background image, and the capture script records only failures and warnings.

## What fixing it costs

- The colour is upstream's. A tab-only override (a lighter epic colour inside `ui/features/upgrades`) adds fork code that every upstream catch-up has to carry; an edit to `colors.css` grows the fork's footprint in upstream files, which ticket 568 is shrinking.
- Raising it upstream changes the colour for the whole site, which is upstream's call.
- Any change re-measures in the layout gate only if text size changes; a colour change alone should not move it (hypothesis, untested).

## Done when

A decision is recorded: either epic item names on the tab reach 4.5 : 1 against the tab's background (measured, with the command or capture named), or the ticket is closed `wontfix` with the reason that the colour belongs to upstream.
