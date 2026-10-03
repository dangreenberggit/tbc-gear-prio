Status: closed
Type: bug
Origin: a11y baseline seed run, 2026-09-19 (stage visual-a11y-reviewer)
Resolution: fixed in fork commit 93f402bce (2026-09-19), re-pinned. The
  result-row item icon takes alt="" — decorative, since the item name follows as
  text in the same link — so axe image-alt no longer fires. Baseline entries
  removed (re-seeded from a dump run); the layout gate passed 53 assertions with
  0 stale-baseline WARNs. Review round 7.
Blocks: none
Blocked by: none
Related: data/wowsims-fork-a11y-baseline.json

# Result-row item icons have no alt text (image-alt, critical)

axe rule `image-alt` (impact **critical**, WCAG 2 A) fires on every result
row's item icon in the Upgrades tab. The seed run at fork `9b407a5f3` reported
it on rows 1-6 at every width; it is one defect, not six -- every row renders
the same `<img>` with no alternative text.

- **rule:** image-alt -- https://dequeuniversity.com/rules/axe/4.13/image-alt
- **impact:** critical
- **selector(s):** `tr:nth-child(N) > td:nth-child(2) > .upgrades-item-cell > .upgrades-item-link[data-whtticon="false"] > .upgrades-item-icon` for N = 1..6 (one per rendered result row)
- **failing node:** `<img className="upgrades-item-icon" ref={iconElem} />`
  (vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:2919)
- **failureSummary:** "Element does not have an alt attribute; aria-label
  attribute does not exist or is empty; aria-labelledby ... " (a screen reader
  announces nothing for the item).

## What would close this

Give the icon an accessible name at the one render site (upgrades_tab.tsx:2919):
an `alt` set to the item name, or `aria-hidden="true"` if the adjacent
`.upgrades-item-name` text already names the item to assistive tech (the icon is
then decorative). Re-seed the a11y baseline (`TBC_A11Y_DUMP=<path> pnpm
layout-gate:check`, rebuild data/wowsims-fork-a11y-baseline.json) so the six
entries drop out as stale, and remove this ticket's rows from the baseline.
