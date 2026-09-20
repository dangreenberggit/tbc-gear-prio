Status: closed
Type: bug
Origin: a11y baseline seed run, 2026-09-19 (stage visual-a11y-reviewer)
Resolution: fixed in fork commit 93f402bce (2026-09-19), re-pinned. The run
  progress bar gets aria-label from a new upgrades_tab.progress.aria_label
  ("Ranking progress"); the stage text beside it changes each tick, so the bar
  needs a stable name of its own. axe aria-progressbar-name no longer fires; the
  layout gate passed 53 assertions with 0 stale-baseline WARNs. Review round 7.
Blocks: none
Blocked by: none
Related: data/wowsims-fork-a11y-baseline.json

# Run progress bar has no accessible name (aria-progressbar-name, serious)

axe rule `aria-progressbar-name` (impact **serious**, WCAG 4.1.2) fires on the
Upgrades tab's run progress bar. The seed run at fork `9b407a5f3` reported it in
the post-run states across widths.

- **rule:** aria-progressbar-name -- https://dequeuniversity.com/rules/axe/4.13/aria-progressbar-name
- **impact:** serious
- **selector:** `div[aria-valuemin="0"]`
- **failing node:** the `.progress-bar` with `role="progressbar"` in the tab's
  run-status markup (vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:1726-1734,
  the tab's own Bootstrap progress markup)
- **failureSummary:** "aria-label attribute does not exist or is empty;
  aria-labelledby ...; Element has no title attribute" -- the progressbar's
  role is announced with no name.

## What would close this

Add an accessible name to the `role="progressbar"` element at the render site
(upgrades_tab.tsx:1726-1734): an `aria-label` such as "Sim progress", or an
`aria-labelledby` pointing at the adjacent status text. Re-seed the a11y
baseline and remove the `div[aria-valuemin="0"]` entry.
