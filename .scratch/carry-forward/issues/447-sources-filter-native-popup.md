Status: open
Type: feature
Origin: ticket 438 design exploration, owner-confirmed pick 2026-09-19 (Q1 = popup)
Blocks: none
Blocked by: none
Related: 438 (the design exploration), 428 (the shipped content-block this replaces), 321 (tall-card height)

# Sources filter → native "Sources…" popup (BaseModal)

Implementation ticket for ticket 438's Part A, owner-confirmed pick (2026-09-19):
replace the flat checkbox pile with the native wowsims Filters-modal idiom.

The design exploration (`.scratch/handoffs/438-sources-sim-sets-design-HANDOFF.md`)
compared four candidates; the owner picked **(A) the native "Sources…" popup** over
a multi-select dropdown (B, rejected — it surfaced EXCLUSIONS not inclusions, and the
chip rail crowds). Do not revive the dropdown.

## What to build

Replace `.upgrades-source-filter-group content-block`
(`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx:795-800`,
the `sourcesGroupRef` vertical checkbox stack) with:
- a `btn` "Sources…" in the settings card that opens a `BaseModal`
  (`ui/core/components/base_modal.tsx`) of grouped checkboxes: a "Raids" section and
  an "Other sources" section, each a 2-col grid, borrowing the native
  `ui/core/components/gear_picker/filters_menu.tsx` `menu-section` idiom and the grid
  from `ui/scss/core/components/gear_picker/_filters_menu.scss` (NOTE: the scss lives
  in the `ui/scss/` tree, not beside the tsx — the 438 handoff's path cite is stale).
- a one-line summary under the button so filter state stays visible without opening
  ("N of M sources excluded", or similar — plain per the copy rule).

The source set + the include/exclude semantics are unchanged from today's
`sourcesGroupRef` checkboxes (`effectivePool` composition, exclusion defaults, stale
pruning) — this is a presentation swap onto a native idiom, not a semantics change.
Borrow-native: read filters_menu.tsx + base_modal.tsx before writing; add as few
new `.upgrades-*` selectors as the design table promised (~1, the summary line).

## What would close this

- The Sources filter is a "Sources…" button + BaseModal of grouped 2-col checkboxes,
  reusing the native filters-menu components; the tall checkbox stack is gone; a
  summary line shows current exclusion state; the pool composition is unchanged.
- Visual acceptance (session-3 gate-visual seat): the settings card is materially
  shorter pre-run at 375/653/1280; the modal opens and shows both sections; the
  summary line reads correctly for 0 and N exclusions.

## Where

`upgrades_tab.tsx` (`.upgrades-source-filter` group, ~line 795) + the tab scss.
Native idioms: `filters_menu.tsx`, `base_modal.tsx`, `ui/scss/.../_filters_menu.scss`.
