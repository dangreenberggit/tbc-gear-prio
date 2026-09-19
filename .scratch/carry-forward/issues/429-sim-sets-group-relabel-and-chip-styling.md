Status: open
Type: design
Origin: owner screenshot review, 2026-09-18
Blocks: none
Blocked by: none
Related: 424 (the set-guarantee control this refines), 430 (the result-tag label, same "name too long" root)

# "Always sim these sets" group: relabel to "Sim sets", quieter explainer, fix chip styling

Owner report from the run-settings screenshot, on the 424 set-guarantee control:

1. **Group label too heavy.** "Always sim these sets" with its full caption is
   more than the control needs. Owner wants **"Sim sets"** as the label, with a
   **less noticeable explainer** (quieter/smaller, not the current prominent
   caption sentence).
2. **Chips look ugly and may not match the gear tab.** The chips carry too much
   text (see also 430 on the label length) and "it's not clear if they match the
   styling of those pills in the gear tab set selection but they look ugly."
   Confirm the chips actually match the gear-tab set-selection pill styling, and
   if they don't, make them match; if they do and still look bad, the length
   (430) is the cause.

## What would close this

- Group label reads "Sim sets" (or the owner's confirmed wording), with a quieter,
  smaller explainer rather than the current prominent caption.
- The chips visually match the gear tab's set-selection pills (same component/
  class/size), verified against the gear tab side by side — not just "reuse the
  class name" but actually look the same.
- Owner eyeballs the control: compact, matches the gear tab, reads cleanly.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx`
(the `.upgrades-set-guarantee` group title + caption + chip rendering),
`_upgrades_tab.scss` (chip styling / explainer prominence), and the
`settings.sets_title` / `settings.sets_caption` strings in `translation.json`.
Cross-check the gear tab's own set-selection pill component for exact styling.

## Notes

New from the owner's screenshot review. The chip TEXT length is ticket 430 (same
root as the result-tag length); this ticket is the group label + explainer + chip
visual match. Copy strings are owner-facing — the exact "Sim sets" wording is the
owner's to confirm.
