Status: open
Type: task
Origin: owner review of the 472 render (screenshot .scratch/handoffs/owner-screens/2026-09-22-upgrades-header-glitch.png), 2026-09-22
Blocks: none
Blocked by: none
Related: 472, 481, 469, 470

# Drop "Upgrades" heading, rename "Shopping List" tab

Owner: no need for the "Upgrades" label and its horizontal rule above the
table, since the table already sits under the "Shopping List" selector.
Rename the "Shopping List" tab to "Upgrades" and make that word bigger.

## What would close this

- `upgrades_tab.results.heading` element and its rule removed from the
  shortlist section (keep any aria/heading semantics the a11y gate needs —
  check `test-layout.mjs` probes on the heading before removing; if the
  gate asserts on it, adjust the gate's probe with a reason).
- `upgrades_tab.shopping_list` renamed to "Upgrades".
- That tab label rendered larger than the slot tabs.
- Layout gate failed:0, a11yFailed:0.
- Re-pin.

Pointers: `vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`vendor/tbc-new-fork/ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss`,
`vendor/tbc-new-fork/assets/locales/en/translation.json`
(`upgrades_tab.shopping_list` :851 "Shopping List",
`upgrades_tab.results.heading` :948 "Upgrades").
