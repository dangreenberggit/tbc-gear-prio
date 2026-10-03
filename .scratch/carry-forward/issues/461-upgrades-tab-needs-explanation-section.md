Status: closed
Type: task
Origin: owner viewing session, 2026-09-20
Blocks: none
Blocked by: none
Related: 462 ((New) label), Batch tab as reference
Resolution: Fixed in fork commit 7cc65f572 (re-pin da82e4c4), grid track fix in
  af421fa53 (re-pin 348a380c). A new upgrades_tab.description key (schema-mirrored)
  renders as a first-child <p className="mb-0"> of .upgrades-tab-left in the Batch
  tab's idiom, hidden by render() once state leaves 'idle'. It shares grid-row 1
  with the view-controls host so the tab-left grid stays two tracks. Verified live:
  the paragraph shows pre-run and is d-none once a run starts (live-verify 5d/5f;
  tab-review descExistsVisible / descHiddenPost facts).

# Upgrades tab needs a pre-sim explanation section like the Batch tab has

Owner report, 2026-09-20. Before a sim is run, the Upgrades tab should show an
explanation section similar to the one the Batch tab presents, telling the user
what the tab does.

## What would close this

- Add a pre-run explanation block to the Upgrades tab, modelled on the Batch
  tab's. Reuse the Batch tab's idiom/markup where possible (borrow-native) rather
  than inventing a new look.
- Content: what the tab ranks and how to use it. Owner-taste on the exact copy.
- Look at the Batch tab's explanation section first for structure and styling.
