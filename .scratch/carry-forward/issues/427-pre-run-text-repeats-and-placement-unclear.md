Status: open
Type: bug
Origin: owner screenshot review, 2026-09-18
Blocks: none
Blocked by: none
Related: 415 (pre-run headings), the pre-run empty state

# Pre-run tab: explanation text repeats the empty-state text, and placement is unclear

Owner report from the pre-run screenshot. The Upgrades tab, before a run, shows
TWO pieces of near-identical explanatory prose:

- a status/explanation line: "Ranks upgrades against your current gear and
  settings on this page." / "This tab ranks gear upgrades against the character
  and settings on this page. Press Run to start."
- the empty-state block saying essentially the same thing again.

Owner: "there's obvious repetition text between the explanation text and the empty
state text." And separately: "it's not clear that the non-empty-state text is in a
sensible place, putting aside the repetition problem" — i.e. even if the
repetition were removed, where the remaining copy sits doesn't obviously make
sense.

## What would close this

- The pre-run state shows the tab's purpose ONCE, not two overlapping restatements.
- The remaining explanatory text sits somewhere that reads as intentional (near
  the Run affordance, or as a single empty-state, not scattered).
- Owner eyeballs the pre-run state: one clear "what this does + press Run" message,
  sensibly placed.

## Where

`vendor/tbc-new-fork/ui/core/components/individual_sim_ui/upgrades_tab.tsx` (the
status line vs the empty-state/no-ranking block; `statusContent()` and the
"No ranking yet" block) and the relevant `translation.json` strings.

## Notes

New from the owner's screenshot review of the built feat/tab-signoff-followups
batch. Not a defect in 415 (415 correctly hid the empty group headings); this is
the duplicated explanatory copy that remains.
