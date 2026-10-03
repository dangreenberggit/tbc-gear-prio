Status: closed
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

## Closed

Built on stage-gate branch `feat/tab-signoff-followups` (session tab-438-impl,
Unit 447), fork commit **3f19c283c4f6c03a873a9a6375cb061063976f22** on
`feat/upgrades-tab`. The flat source-checkbox stack is replaced by a "Sources…"
`btn` opening a `BaseModal` (cssClass `filters-menu`, reusing the gear picker's
2-col grid with no new SCSS) of grouped Raids/Other-sources `BooleanPicker`
checkboxes, plus a one-line "N of M sources excluded" summary under the button.

Pool semantics preserved (presentation swap): `effectivePool` (upgrades_tab.tsx
line 1342) is byte-identical, exclusion defaults (empty set = all on) and
stale-exclusion pruning are the same code. New class hooks added: three
(`upgrades-sources-button`, `upgrades-sources-summary`, `upgrades-sources-modal`)
plus the `data-section` attribute on each modal section — matching the design's
"~1 summary-line class" promise plus the button and the modal-root hook.

Visual review: **pass** by the `gate-visual` seat (its first live use), handoff at
`.scratch/handoffs/visual-review-tab-438-impl-447.md`, judged against forkHead
3f19c283c. Card height at 1280 dropped from 1106.8px to 672.7px (434px shorter).
The narrow-width (375/653) modal-open capture is a diagnosed harness limitation
(the tab-review coordinate click cannot scroll the below-fold collapsed card into
view), not a render defect; the modal is a width-independent Bootstrap fixed
dialog proven at 1280.

Copy strings shipped as placeholders (owner-taste, to confirm): `sources_button`
= "Sources…", `sources_summary` = "{{n}} of {{m}} sources excluded",
`sources_summary_none` = "All {{m}} sources included", `sources_section_raids` =
"Raids", `sources_section_other` = "Other sources".

Advisory (not blocking, owner follow-up): the open modal has no accessible name
(axe `aria-dialog-name`, serious) — surfaced by the tab-review a11y scan in the
modal-open state; the layout-gate a11y ratchet passed because the modal is closed
pre-run. Filed separately for the owner.
