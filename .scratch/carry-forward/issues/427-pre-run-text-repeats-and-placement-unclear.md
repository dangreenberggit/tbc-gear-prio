Status: closed
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

## Closed

Closed by fork commit eb83a1583 (tab-ui-refinements, on feat/upgrades-tab;
re-pinned in main commit 23d35e94). The idle and unsupported-spec top status
line now returns `<></>`, so the pre-run purpose and the Run CTA appear ONCE, in
the centred "No ranking yet" empty state. The top `.upgrades-status` slot is
blank pre-run; its min-height reserves the row so nothing shifts when a run
fills it. `renderAnnouncement` was moved after `renderSubTabs` and now reads the
idle/unsupported text from the empty state, so the live region still announces
the purpose. `status.idle` is kept in locale and schema (unrendered) pending
ticket 432. Observable: pre-run, `.upgrades-status` innerText is empty and there
is exactly one `.upgrades-empty-state` with a Run button. Owner taste sign-off
of the pre-run layout is part of the Step 8 pack.
