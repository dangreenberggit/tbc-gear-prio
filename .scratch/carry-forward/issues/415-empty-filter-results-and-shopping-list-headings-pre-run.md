Status: open
Type: bug
Origin: owner report, 2026-09-18 (viewing the running tab, pre-run state)
Blocks: none
Blocked by: none
Related: 312 (the toolbar/filter redesign these headings came in with)

# Empty "Filter results" and "Shopping List" headings show before a run

Owner report, viewing the Upgrades tab in its initial (pre-run) state on
`http://localhost:5173/tbc/paladin/retribution/`: the tab renders a
**"Filter results"** heading and a **"Shopping List"** heading (with its
underline) while there is nothing beneath either — no filters, no results, no
shopping list. They are labels for content that does not exist yet.

Two distinct complaints:

1. **Empty headings before Run.** "Filter results" and "Shopping List" should
   not be visible until there is something under them (after a run produces
   rows). Right now they are chrome with no content.
2. **"Filter results" is unclear wording.** Even once populated, "Filter
   results" reads ambiguously — is it an instruction to filter the results? At
   the moment there are no filters shown and no results, so the label describes
   nothing. Whatever this group is, its label should say what it does.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the view-controls / "Filter results" group and the Shopping List / results
host) and `_upgrades_tab.scss`. The view-controls group was moved above the
results in ticket 312; this is the pre-run visibility of that group plus its
label wording.

## What would close this

- Before a run, neither the "Filter results" group nor the "Shopping List"
  heading is shown (or they are shown only once they have content). Verify by
  loading the tab and looking at the initial state — the empty headings are
  gone.
- The "Filter results" label is reworded to something that names what the
  group does, or is dropped if the group is self-evident once populated. Owner
  picks the wording (standing copy rule: short and plain).

## Notes

Copy-wording half overlaps the 330/copy pass discipline (owner picks strings).
The visibility half (hide empty headings pre-run) is a straightforward
markup/SCSS change on the tab surface, in the Chunk 3 layout family — but it is
a **new** defect found after the Chunk 3 re-verification, not part of the five
Chunk 3 tickets (327/310/312/328/314), so it is tracked here rather than
reopening those.
