Status: closed
Type: design
Origin: owner screenshot review, 2026-09-18
Blocks: none
Blocked by: none
Related: 417 (the content-source checkbox group this refines)

# Content source checkboxes are a loose pile, not a contained/organized element

Owner report from the run-settings screenshot. The 417 content-source filter
renders as "a bunch of checkbox options just sitting there" — the checkboxes are
present and functional, but they are not visually a contained, organized element
(no card/box grouping, no clear boundary marking them as one control group).
Owner: "there are boxes but it's not a contained organized element or anything
like that."

## What would close this

- The content-source checkboxes read as ONE grouped control — contained in a
  card/section with a clear boundary, the way wowsims groups its own settings —
  not a free-floating list of checkboxes.
- Consistent with the native wowsims settings/filters idiom (the same
  "borrow-native" direction as 417/312/328). Look at how the gear-tab filters
  menu or the settings tab groups its checkbox clusters and match that
  containment.
- Owner eyeballs the run-settings area: the Content group looks like a deliberate
  contained element.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(`.upgrades-source-filter` markup) and
`ui/scss/core/components/individual_sim_ui/_upgrades_tab.scss` (its layout/
containment). This is presentation only — the filter behaviour (417) is correct
and unchanged.

## Notes

New from the owner's screenshot review. 417 delivered the functional multi-select;
this is the visual grouping/containment refinement. Likely shares a solution with
the "Sim sets" group (ticket 429) — both should read as contained sections.

## Closed

Closed by fork commit eb83a1583 (tab-ui-refinements; re-pinned in main 23d35e94).
The Content source-filter group is now wrapped in the site's own `.content-block`
markup — `<div class="content-block-header"><h6 class="content-block-title">` over
a `.content-block-body` — the same structure `resultsBlock` uses. The bare
`.content-block-header` span had no `.content-block` ancestor, so its bold title
and bottom-border rule never applied. Observable: the group's
`.content-block-header` now has a non-zero `borderBottomWidth` (0px before) and
the title is an `h6.content-block-title`; the checkboxes still change the eligible
count. Layout gate green (45 assertions).
