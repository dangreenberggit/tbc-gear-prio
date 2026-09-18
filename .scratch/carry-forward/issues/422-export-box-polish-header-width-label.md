Status: open
Type: design
Origin: owner report, 2026-09-18 (viewing the running tab, export box)
Blocks: none
Blocked by: none
Related: 314 (the export box itself, resolved), 328 (control styling), 126 (token ids, resolved)

# Export box polish: header, width, token-id label and spacing

Owner report on the Upgrades tab export box. Four cosmetic/copy fixes, all on the
"ThatsMyBis export" box that ticket 314 shipped:

1. **Subheader wording.** "ThatsMyBis export" → **"JSON export"**. Do not name a
   specific third-party tool in the header.
2. **Text box width.** The JSON textarea is wider than it needs to be — narrow it
   so it is not unnecessarily wide.
3. **Token-id checkbox label.** "use raid-drop ids" → **"use tier token ids"**.
   Also the label sits too close to the checkbox — add spacing so the checkbox
   and its label read as a unit with breathing room.
4. **Move the loot-tool blurb into the checkbox parenthetical.** The description
   sentence currently reads "…to import into a loot-priority tool" (and mentions
   ThatsMyBis). Move the "to import into a loot-priority tool, e.g. ThatsMyBis"
   context into the **parenthetical of the checkbox label** rather than a separate
   description line, so the naming of the external tool lives next to the control
   it explains, not in the header.

## What would close this

- Header reads "JSON export".
- The textarea is a sensible width (not spanning more than the content needs).
- The token-id toggle label reads "use tier token ids" with clear spacing from
  the checkbox.
- The "loot-priority tool, e.g. ThatsMyBis" phrasing lives in the checkbox label
  parenthetical; the standalone blurb is trimmed accordingly.
- Owner eyeballs the result.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(export box markup, `:725-739` region and the flavour toggle at `:754`),
`_upgrades_tab.scss` (textarea width), `assets/locales/en/translation.json`
(the export header, caption, and flavour-toggle label strings).

## Notes

New from the owner's sign-off pass, 2026-09-18. 314 (box exists + correct payload)
and 126 (token ids emitted) are resolved; this is pure presentation/copy on top of
them. Copy strings are owner-facing — keep plain per the standing copy rule.
