Status: resolved
Type: bug
Origin: owner report, 2026-08-28
Blocks: none
Blocked by: none

# Upgrades controls and TMB export box don't match wowsims styling

Owner report — three related presentation problems on the Upgrades tab, all
pointing at the tab not matching how wowsims styles its own pages:

1. **The ThatsMyBis export button "looks disabled"**, and the export box copy is
   embarrassing: "A ranked list of candidates, not a 17-slot gear set — it will
   not reconstruct a character on import." The owner: "nobody said it would
   reconstruct a character, let alone 'on import' which doesn't even make sense
   and is clankerbrain." (Copy rework tracked as its own item — see below.)
2. **The "Set potential" and "BiS only" checkboxes look too big.**
3. **The "Content" dropdown looks too big.**
4. **The set-potential toggle needs a tooltip** — a plain-English, reviewed
   explanation of what the toggle actually does (owner note, 2026-08-28).
   Dependency: the *precise* wording waits on ticket 331's open question being
   settled (does a noise-level set bonus move the ranking, or only show as gated
   extra info — see `.scratch/set-bonus-value/README-set-bonus-truth.md`). Once
   331 resolves what the toggle does, write the tooltip to match it, in plain
   English, and have it reviewed (writing-for-agents / plain-English rules).
   Until then the tooltip text is not final. Match wowsims' native tooltip idiom
   (tippy.js is already a dependency; see how other controls attach tooltips).

## Owner direction

Use **wowsims' native styling presumptively**. Find the native button /
checkbox / select components used elsewhere on the site (the Simulate button,
settings-tab checkboxes, the phase selector) and match their sizing and classes,
rather than the tab's own oversized controls. Research + direct observation per
component (a research pass on 2026-08-28 catalogs the native patterns).

## Copy

The TMB export blurb rewrite is part of this — plain English, may use terms
often and observably used elsewhere on wowsims, keep it simple, and do not
defend against claims nobody made. Candidate replacements from the copy pass
(2026-08-28); owner picks before it lands. (The set-bonus line wording is a
separate, engine-touching issue — ticket 330.)

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`,
`_upgrades_tab.scss`, and `assets/locales/en/translation.json` (the export
blurb string).

## 2026-08-29 — styling landed, owner-checklist-pending (Execution B split)

This ticket splits into a **styling half** (this executor's scope) and a **copy
half** (tooltip wording + export blurb — normally the ticket-330 writing pass).
Both were found already landed on the fork before base SHA `43f460c`. This
executor verified the styling; it did not draft or alter copy.

**Styling half — verified landed (fork commits `4ae6afe98` "Match Upgrades
controls to native wowsims styling", `f17b77db7` "Build Upgrades view checkboxes
on native BooleanPicker"):**

- **Item 1 — copy button no longer "looks disabled".** Now a filled native
  `CopyButton`: classes `btn btn-secondary upgrades-export-copy copy-button`,
  computed background `rgb(108,117,125)` (solid secondary grey, not transparent),
  opacity 1, `fa-copy` icon present, text "Copy JSON"
  (`upgrades_tab.tsx:793-797`; DOM readback in
  `.scratch/.../layout-evidence/ranking-stage-evidence.json`).
- **Item 2 — checkboxes not oversized.** The view toggles are native
  `BooleanPicker`s (`.boolean-picker-input.form-check-input`) and are
  deliberately NOT floored to 40px (`_upgrades_tab.scss:324-344` records this),
  so they render at wowsims' native ~28px, matching their siblings.
- **Item 3 — Content dropdown not oversized.** `.upgrades-raid-filter` is a
  native `.form-select`; the phase `EnumPicker` select measures h≈28.3px at
  1280px (native `.form-select`, no floor).

**Copy half — landed, DEFERRED to the 330 pass (NOT touched by this executor):**

- **Item 1 blurb / Item 4 tooltip WORDING.** The export blurb was reworded to
  "Copy these raid-drop upgrades as JSON to import into a loot-priority tool."
  and the set-potential tooltip to "When on, a row's DPS gain includes a set
  bonus the swap would earn. Bonuses too small to change the ranking are
  ignored." (both fork commit `2f992cc29` "Reword the three Upgrades copy
  strings"; `translation.json:882,892`). The tooltip is attached via the site's
  tippy idiom (`labelTooltip`, `upgrades_tab.tsx:759`; verified `_tippy` prop +
  content in the DOM readback). This wording is copy; it is left exactly as it
  landed. Any further wording change belongs to the held 330 review, not here.

State: **styling landed, owner-checklist-pending.** Closes on owner sign-off.

## 2026-09-18 — re-verified on the post-Chunk-1 fork tip (Chunk 3, styling half only)

Re-proven on fork tip `d754ac1b`. The styling half is confirmed from source on
the current tip (copy is untouched — that stays with the 330 pass):

- **Copy button** is the native filled `CopyButton` with the `fa-copy` icon and
  `btn-secondary` weighting, not the hand-rolled transparent control
  (`upgrades_tab.tsx:833-837`).
- **View toggles** (set-potential, BiS-only) are native `ViewToggle`/
  `BooleanPicker` instances (`upgrades_tab.tsx:793-799`). The one raw
  `<input type="checkbox">` still in the file is the export flavour toggle
  (`upgrades_tab.tsx:754`), a deliberate plain checkbox for the export format,
  not a styled-control regression — see the 312 note for why the
  `<input type="checkbox"` grep reads 0.
- The redesigned control layout renders correctly at all four widths — 37/37
  layout-gate assertions green against a real WASM run.

Verified by: `sed -n '793,837p' vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
and `cd vendor/tbc-new-fork && node test-layout.mjs` (log at
`.scratch/stage-gate/chunk3-tab-layout-verify/evidence/test-layout-run.log`).
Status unchanged — closes on owner sign-off; copy half remains with 330.

## 2026-09-18 — owner sign-off (resolved, styling half)

Owner viewed the controls and the Copy JSON button on the live tab and approved:
the checkboxes/dropdown are native-sized, the copy button reads as a real filled
button. The styling half is resolved. Follow-ups the owner raised — the export
tooltip should trigger on hover over the checkbox itself (not only the label),
"use raid-drop ids" → "use tier token ids" with more space from the checkbox,
and the "JSON export" header/parenthetical rewording — are filed as a separate
export/controls-polish ticket. The copy-wording half remains with the 330 family.

Verified by: owner observation on the live tab, 2026-09-18.
